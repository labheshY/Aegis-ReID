import threading
import time
import cv2
from app.core.logger import logger
from app.services.camera_manager import camera_manager
from app.core.config import PREVIEWS_DIR
from app.reid.reid_model import generate_embedding
from app.utils.similarity import cosine_similarity

class TrackerWorker:
    def __init__(self, camera_id: str, tracker_service):
        self.camera_id = camera_id
        self.tracker_service = tracker_service

        self.is_running = False
        self.frame_count = 0
        self.latest_frame = None
        self.active_tracks = {}
        self.track_memory = {}
        self.search_matches = {}
        self.reset_tracker_on_next_frame = False
        self.thread = None
        self.lock = threading.RLock()
        
        self.width = 640
        self.height = 360

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()
        logger.info(f"TrackerWorker started for camera {self.camera_id}")

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=2.0)
        logger.info(f"TrackerWorker stopped for camera {self.camera_id}")

    def get_latest_frame(self):
        with self.lock:
            if self.latest_frame is None:
                return None
            return self.latest_frame.copy()

    def get_active_tracks(self):
        with self.lock:
            return {
                str(track_id): dict(data)
                for track_id, data in self.active_tracks.items()
            }

    def run(self):
        while self.is_running:
            frame = camera_manager.get_latest_frame(self.camera_id)
            if frame is None:
                time.sleep(0.05)
                continue
                
            with self.lock:
                self.frame_count += 1
                reset_tracker = self.reset_tracker_on_next_frame
                if reset_tracker:
                    self.reset_tracker_on_next_frame = False
            
            frame_start = time.perf_counter()
            yolo_ms = 0.0
            reid_ms = 0.0
            frame = cv2.resize(frame, (self.width, self.height))
            
            with self.tracker_service.lock:
                mode = self.tracker_service.mode
                settings = self.tracker_service.settings.copy()
                acquisition_target_id = self.tracker_service.acquisition_target_id
                search_target_id = self.tracker_service.current_search_target

            yolo_start = time.perf_counter()
            
            with self.tracker_service.model_lock:
                results = self.tracker_service.model.track(
                    frame,
                    persist=not reset_tracker,
                    tracker="runtime/bytetrack_runtime.yaml",
                    conf=float(settings["min_box_confidence"]),
                    verbose=False
                )
            yolo_ms = (time.perf_counter() - yolo_start) * 1000

            frame_tracks = {}
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    if box.id is None:
                        continue

                    cls = int(box.cls[0])
                    if cls != 0:
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    track_id = int(box.id[0])
                    box_width = x2 - x1
                    box_height = y2 - y1

                    frame_tracks[track_id] = {
                        "bbox": [x1, y1, x2, y2],
                        "confidence": conf,
                        "camera_id": self.camera_id
                    }
                    
                    if mode == "acquisition" and acquisition_target_id == track_id:
                        self.tracker_service.acquisition_last_seen = time.time()
                        if (
                            conf > float(settings["min_box_confidence"])
                            and box_width > int(settings["min_box_width"])
                            and box_height > int(settings["min_box_height"])
                        ):
                            perf = {"reid_ms": 0.0}
                            self._collect_acquisition_embedding(
                                frame, x1, y1, x2, y2, conf, track_id, settings, perf=perf
                            )
                            reid_ms += perf["reid_ms"]

                    if mode == "search" and search_target_id:
                        if (
                            conf > settings["min_box_confidence"] and
                            box_width > settings["min_box_width"] and
                            box_height > settings["min_box_height"]
                        ):
                            perf = {"reid_ms": 0.0}
                            self._run_reid_search(
                                frame, x1, y1, x2, y2, track_id, settings, perf=perf
                            )
                            reid_ms += perf["reid_ms"]

            with self.lock:
                self.active_tracks = frame_tracks
                self.latest_frame = frame.copy()
                
                # Cleanup stale search matches
                active_track_ids = set(frame_tracks.keys())
                stale_matches = []
                for t_id in self.search_matches.keys():
                    if t_id not in active_track_ids or self.track_memory.get(t_id, 0) <= int(settings["target_confirmation"]):
                        stale_matches.append(t_id)
                for t_id in stale_matches:
                    del self.search_matches[t_id]
            
            self.tracker_service.check_acquisition_timeout()
            
            frame_ms = (time.perf_counter() - frame_start) * 1000
            if self.frame_count % 100 == 0:
                logger.info(
                    f"[Worker {self.camera_id}] YOLO={yolo_ms:.1f} ms REID={reid_ms:.1f} ms FRAME={frame_ms:.1f} ms"
                )

    def _collect_acquisition_embedding(self, frame, x1, y1, x2, y2, conf, track_id, settings, perf=None):
        self.tracker_service.acquisition_last_seen = time.time()
        if self.tracker_service.acquisition_manager.acquisition_complete:
            with self.tracker_service.lock:
                self.tracker_service.acquisition_target_id = None
                self.tracker_service.mode = "idle"
            logger.info(f"Target creation complete for track {track_id}")
            return

        with self.lock:
            frame_count = self.frame_count
            
        if frame_count % int(settings["acquisition_frame_interval"]) != 0:
            return

        crop = frame[y1:y2, x1:x2]

        if conf > self.tracker_service.acquisition_manager.best_preview_confidence:
            PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)
            preview_path = PREVIEWS_DIR / f"preview_{track_id}.jpg"
            self.tracker_service.acquisition_manager.payload["preview_image_path"] = str(preview_path)
            cv2.imwrite(str(preview_path), crop)
            self.tracker_service.acquisition_manager.best_preview_confidence = conf

        embed_start = time.perf_counter()
        embedding = generate_embedding(crop)
        embedding_ms = (
            time.perf_counter() - embed_start
        ) * 1000

        logger.info(
            f"Embedding generation: "
            f"{embedding_ms:.1f} ms"
        )
        if perf is not None:
            perf["reid_ms"] += (time.perf_counter() - embed_start) * 1000
        self.tracker_service.acquisition_manager.add_embedding(embedding)

    def _run_reid_search(self, frame, x1, y1, x2, y2, track_id, settings, perf=None):
        with self.lock:
            frame_count = self.frame_count
            
        if frame_count % int(settings["reid_frame_interval"]) != 0:
            return None, None

        crop = frame[y1:y2, x1:x2]
        tracking_mode = settings.get("tracking_mode", "person")
        embed_start = time.perf_counter()

        if tracking_mode == "face":
            try:
                from app.services.face_models import get_face_model
                face_model = get_face_model()
                detected_embedding = face_model.generate(crop)
            except Exception:
                logger.exception("Face model failed in search, falling back to ReID")
                detected_embedding = generate_embedding(crop)
        else:
            detected_embedding = generate_embedding(crop)

        if perf is not None:
            perf["reid_ms"] += (time.perf_counter() - embed_start) * 1000

        target_embeddings = self.tracker_service.acquisition_manager.get_embeddings()
        similarities = [
            cosine_similarity(detected_embedding, target_embedding)
            for target_embedding in target_embeddings
        ]
        body_score = max(similarities) if similarities else 0.0

        if tracking_mode == "hybrid":
            try:
                from app.services.face_models import get_face_model
                face_model = get_face_model()
                face_emb = face_model.generate(crop)
                face_sims = [
                    cosine_similarity(face_emb, te)
                    for te in target_embeddings
                ]
                face_score = max(face_sims) if face_sims else 0.0
            except Exception:
                logger.exception("Face model failed in hybrid mode, using body-only score")
                face_score = body_score

            w = float(settings.get("hybrid_face_weight", 0.5))
            similarity_score = (1.0 - w) * body_score + w * face_score
        else:
            similarity_score = body_score

        threshold = float(settings["similarity_threshold"])
        if tracking_mode == "face":
            threshold = float(settings.get("face_threshold", settings["similarity_threshold"]))

        with self.lock:
            if similarity_score > threshold:
                self.track_memory[track_id] = self.track_memory.get(track_id, 0) + 1
                logger.info(
                    f"[{tracking_mode.upper()}] Track {track_id} matched "
                    f"score={similarity_score:.2f} hits={self.track_memory[track_id]}"
                )
                
                if self.track_memory[track_id] > int(settings["target_confirmation"]):
                    alias = self.tracker_service.acquisition_manager.payload.get("alias", "Unknown")
                    self.search_matches[track_id] = {
                        "track_id": track_id,
                        "camera_id": self.camera_id,
                        "bbox": [x1, y1, x2, y2],
                        "alias": alias,
                        "similarity": similarity_score,
                        "status": "confirmed",
                        "updated_at": time.time()
                    }
            elif settings["use_soft_decay"]:
                self.track_memory[track_id] = max(
                    0,
                    self.track_memory.get(track_id, 0) - float(settings["soft_decay_rate"])
                )

        mode_label = {"face": "FACE", "hybrid": "FUSION", "person": "BODY"}.get(tracking_mode, "BODY")
        return f"[{mode_label}_LOCK] {similarity_score:.2f}", similarity_score