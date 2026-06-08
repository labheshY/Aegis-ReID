from app.core.config import DEFAULT_TRACKER_SETTINGS
from app.services.settings_service import settings_service
from app.core.config import EMBEDDINGS_DIR
from app.core.config import OUTPUTS_DIR
from app.core.config import PREVIEWS_DIR
from app.core.config import YOLO_MODEL_PATH
from app.core.logger import logger
from app.reid.reid_model import generate_embedding
from app.reid.target_acquisition import TargetAcquisitionManager
from app.utils.similarity import cosine_similarity
from ultralytics import YOLO
import cv2
import threading
import time
import numpy as np
from app.services.camera_manager import camera_manager


class TrackerService:
    def __init__(self):
        self.settings = DEFAULT_TRACKER_SETTINGS.copy()
        self.acquisition_manager = TargetAcquisitionManager(
            max_embeddings=self.settings["max_embeddings"],
            payload_dir=EMBEDDINGS_DIR
        )
        self.model = YOLO(str(YOLO_MODEL_PATH), task="detect")
        self.latest_frame = None
        self.is_running = False
        self.stream_started_at = None

        self.frame_count = 0
        self.track_memory = {}
        self.width = 640
        self.height = 360
        self.mode = "idle"

        self.camera_id = None

        self.active_tracks = {}
        self.current_search_target = None
        self.loaded_target_id = None
        self.acquisition_target_id = None

        self.lock = threading.RLock()

    def start(self, video_path: str, camera_id: str | None = None):
        if self.is_running:
            logger.warning("TrackerService is already running")
            return
        self.is_running = True
        self.stream_started_at = time.time()
        logger.info(f"Stream startup for source {video_path}")
        if camera_id is not None:
            self.camera_id = camera_id
        with self.lock:
            self.video_path = video_path
        threading.Thread(
            target=self.process_video,
            args=(video_path,),
            daemon=True
        ).start()

    def stop(self):
        logger.info("TrackerService stopping")
        self.is_running = False

    def set_mode(self, mode: str):
        if mode not in {"idle", "acquisition", "search"}:
            raise ValueError(f"Invalid runtime mode: {mode}")
        with self.lock:
            if mode != self.mode:
                logger.info(f"Runtime mode changed from {self.mode} to {mode}")
            self.mode = mode
        return {"mode": mode}

    def get_mode(self):
        with self.lock:
            return self.mode

    def get_latest_frame(self):
        with self.lock:
            if self.latest_frame is None:
                return None
            return self.latest_frame.copy()

    def get_active_tracks(self):
        with self.lock:
            return {
                str(track_id): data.copy()
                for track_id, data in self.active_tracks.items()
            }

    def get_settings(self):
        with self.lock:
            # merge persisted settings
            persisted = settings_service.get()
            merged = self.settings.copy()
            merged.update(persisted)
            return merged

    def update_settings(self, updates: dict):
        allowed_keys = set(DEFAULT_TRACKER_SETTINGS.keys())
        with self.lock:
            for key, value in updates.items():
                if key in allowed_keys and value is not None:
                    self.settings[key] = value
            # persist
            settings_service.update(self.settings)
            self.acquisition_manager.max_embeddings = int(self.settings["max_embeddings"])
            return self.settings.copy()

    def process_video(self, video_path: str):
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        cap = None
        out = None

        while self.is_running:
            # Determine current input source: live camera frames or file capture
            with self.lock:
                current_camera = getattr(self, 'camera_id', None)
                current_video = getattr(self, 'video_path', video_path)

            frame = None

            if current_camera:
                # fetch latest JPEG buffer from camera manager
                buffer = camera_manager.get_frame(current_camera)
                if buffer is None:
                    time.sleep(0.05)
                    continue
                arr = np.frombuffer(buffer, dtype='uint8')
                frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if frame is None:
                    time.sleep(0.05)
                    continue

                # ensure out writer exists for diagnostics
                if out is None:
                    fps = 20
                    out = cv2.VideoWriter(
                        str(OUTPUTS_DIR / f"output_{current_camera}.mp4"),
                        cv2.VideoWriter_fourcc(*"mp4v"),
                        fps,
                        (self.width, self.height)
                    )

            else:
                # use file capture
                if cap is None:
                    cap = cv2.VideoCapture(str(current_video))
                    if not cap.isOpened():
                        logger.warning(f"Unable to open video source {current_video}")
                        # wait before retrying
                        time.sleep(1)
                        cap = None
                        continue
                ret, frame = cap.read()
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                if out is None:
                    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
                    out = cv2.VideoWriter(
                        str(OUTPUTS_DIR / "output.mp4"),
                        cv2.VideoWriter_fourcc(*"mp4v"),
                        fps,
                        (self.width, self.height)
                    )

            self.frame_count += 1
            frame = cv2.resize(frame, (self.width, self.height))
            results = self.model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                conf=0.5,
                verbose=False
            )

            frame_tracks = {}
            with self.lock:
                mode = self.mode
                settings = self.settings.copy()
                acquisition_target_id = self.acquisition_target_id
                search_target_id = self.current_search_target

            for result in results:
                boxes = result.boxes
                for box in boxes:
                    target_label = None
                    similarity_score = None
                    if box.id is None:
                        continue

                    cls = int(box.cls[0])
                    if cls != 0:
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    track_id = int(box.id[0])
                    label = f"ID {track_id} {conf:.2f}"
                    box_width = x2 - x1
                    box_height = y2 - y1

                    frame_tracks[track_id] = {
                        "bbox": [x1, y1, x2, y2],
                        "confidence": conf,
                        "camera_id": self.camera_id
                    }

                    if (
                        conf > float(settings["min_box_confidence"])
                        and box_width > int(settings["min_box_width"])
                        and box_height > int(settings["min_box_height"])
                    ):
                        if mode == "acquisition" and acquisition_target_id == track_id:
                            self._collect_acquisition_embedding(
                                frame,
                                x1,
                                y1,
                                x2,
                                y2,
                                conf,
                                track_id,
                                settings
                            )

                        if mode == "search" and search_target_id:
                            target_label, similarity_score = self._run_reid_search(
                                frame,
                                x1,
                                y1,
                                x2,
                                y2,
                                track_id,
                                settings
                            )

                    # if track_id in self.track_memory and self.track_memory[track_id] > int(settings["target_confirmation"]):
                    #     display_label = target_label if target_label is not None else "Target"
                    #     cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    #     cv2.putText(frame, display_label, (x1, y1 - 10), cv2.FONT_HERSHEY_COMPLEX, 0.5, (0, 0, 255), 2)
                    # else:
                    #     cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    #     cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_COMPLEX, 0.5, (0, 255, 0), 2)

            with self.lock:
                self.active_tracks = frame_tracks
                self.latest_frame = frame.copy()
            out.write(frame)

        self.is_running = False
        cap.release()
        out.release()
        cv2.destroyAllWindows()

    def _collect_acquisition_embedding(self, frame, x1, y1, x2, y2, conf, track_id, settings):
        if self.acquisition_manager.acquisition_complete:
            with self.lock:
                self.acquisition_target_id = None
                self.mode = "idle"
            logger.info(f"Target creation complete for track {track_id}")
            return

        if self.frame_count % int(settings["acquisition_frame_interval"]) != 0:
            return

        crop = frame[y1:y2, x1:x2]

        if conf > self.acquisition_manager.best_preview_confidence:
            PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)
            preview_path = PREVIEWS_DIR / f"preview_{track_id}.jpg"
            self.acquisition_manager.payload["preview_image_path"] = str(preview_path)
            cv2.imwrite(str(preview_path), crop)
            self.acquisition_manager.best_preview_confidence = conf

        self.acquisition_manager.add_embedding(generate_embedding(crop))

    def _run_reid_search(self, frame, x1, y1, x2, y2, track_id, settings):
        if self.frame_count % int(settings["reid_frame_interval"]) != 0:
            return None, None

        crop = frame[y1:y2, x1:x2]
        detected_embedding = generate_embedding(crop)
        target_embeddings = self.acquisition_manager.get_embeddings()
        similarities = [
            cosine_similarity(detected_embedding, target_embedding)
            for target_embedding in target_embeddings
        ]
        similarity_score = max(similarities) if similarities else 0

        if similarity_score > float(settings["similarity_threshold"]):
            self.track_memory[track_id] = self.track_memory.get(track_id, 0) + 1
            logger.info(
                f"Track ID {track_id} hit similarity check with score "
                f"{similarity_score:.2f} ({self.track_memory[track_id]} hits)"
            )
        elif settings["use_soft_decay"]:
            self.track_memory[track_id] = max(
                0,
                self.track_memory.get(track_id, 0) - float(settings["soft_decay_rate"])
            )

        return f"Target {similarity_score:.2f}", similarity_score

    def set_search_target(self, target_id: str):
        with self.lock:
            if target_id == self.loaded_target_id:
                self.mode = "search"
                self.current_search_target = target_id
                return

        logger.info(f"Search start for target ID {target_id}")
        self.acquisition_manager.load_payload(target_id)
        with self.lock:
            self.loaded_target_id = target_id
            self.current_search_target = target_id
            self.track_memory = {}
            self.mode = "search"
        logger.info(f"Successfully loaded payload for target {target_id}")

    def clear_search_target(self):
        with self.lock:
            target_id = self.current_search_target
            self.current_search_target = None
            self.loaded_target_id = None
            self.track_memory = {}
            if self.mode == "search":
                self.mode = "idle"
        logger.info(f"Search stop for target ID {target_id}")

    def set_acquisition_target(self, track_id: int, alias: str | None = None):
        with self.lock:
            logger.info(f"Requested track_id: {track_id}")
            logger.info(f"Active tracks: {list(self.active_tracks.keys())}")

            if track_id not in self.active_tracks:
                logger.warning(
                f"Track {track_id} not found. Available: "
                f"{list(self.active_tracks.keys())}"
                )
                return None
            self.acquisition_target_id = track_id
            self.mode = "acquisition"

        logger.info(f"Acquisition start for track ID {track_id}")
        self.acquisition_manager.start_acquisition(track_id, alias=alias)
        return self.get_acquisition_status()

    def set_acquisition_target_from_point(self, x: int, y: int, alias: str | None = None):
        track_id = self.find_track_at_point(x, y)
        if track_id is None:
            return None
        return self.set_acquisition_target(track_id, alias=alias)

    def switch_camera(self, camera_id: str | None):
        """Switch the tracker input to the given camera_id (or None to use file)."""
        with self.lock:
            if camera_id == getattr(self, 'camera_id', None):
                return
            self.camera_id = camera_id
            logger.info(f"TrackerService switching to camera {camera_id}")
            if camera_id:
                # ensure camera capture is started
                camera_manager.start_capture(camera_id)
            # reset some state when switching
            self.track_memory = {}
            self.active_tracks = {}

    def find_track_at_point(self, x: int, y: int):
        with self.lock:
            for track_id, data in self.active_tracks.items():
                x1, y1, x2, y2 = data["bbox"]
                if x1 <= x <= x2 and y1 <= y <= y2:
                    return track_id
        return None

    def stop_acquisition(self):
        with self.lock:
            target_id = self.acquisition_target_id
        if self.acquisition_manager.has_minimum_embeddings():
            self.acquisition_manager.finalize_acquisition()
        else:
            logger.warning("Acquisition stopped without enough embeddings")
        with self.lock:
            self.acquisition_target_id = None
            if self.mode == "acquisition":
                self.mode = "idle"
        logger.info(f"Acquisition stop for track ID {target_id}")
        return self.get_acquisition_status()

    def get_acquisition_status(self):
        with self.lock:
            embeddings_count = len(self.acquisition_manager.get_embeddings())
            return {
                "active": self.mode == "acquisition" and self.acquisition_target_id is not None,
                "track_id": self.acquisition_target_id,
                "embeddings_count": embeddings_count,
                "required_embeddings": self.acquisition_manager.max_embeddings,
                "complete": self.acquisition_manager.acquisition_complete,
                "payload": self.acquisition_manager.get_payload()
            }

    def get_search_status(self):
        with self.lock:
            return {
                "active": self.mode == "search" and self.current_search_target is not None,
                "target_id": self.current_search_target,
                "confirmed_tracks": [
                    track_id
                    for track_id, hits in self.track_memory.items()
                    if hits > int(self.settings["target_confirmation"])
                ]
            }

    def get_status(self):
        with self.lock:
            return {
                "running": self.is_running,
                "mode": self.mode,
                "frame_count": self.frame_count,
                "active_tracks_count": len(self.active_tracks),
                "camera_id": self.camera_id,
                "search_target": self.current_search_target,
                "acquisition_target": self.acquisition_target_id
            }

    def get_stream_health(self):
        with self.lock:
            return {
                "running": self.is_running,
                "has_frame": self.latest_frame is not None,
                "started_at": self.stream_started_at,
                "frame_count": self.frame_count
            }


tracker_service = TrackerService()
