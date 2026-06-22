from app.core.config import DEFAULT_TRACKER_SETTINGS
from app.services.settings_service import settings_service
from app.core.config import EMBEDDINGS_DIR
from app.core.config import OUTPUTS_DIR
from app.core.config import PREVIEWS_DIR
from app.core.config import YOLO_MODEL_PATH
from app.core.logger import logger
from app.reid.target_acquisition import TargetAcquisitionManager
from app.utils.tracker_yaml import save_bytetrack_yaml
from ultralytics import YOLO
import onnxruntime as ort
import threading
import time
from typing import Optional, Dict

# Patch onnxruntime to force DML Execution Provider for AMD GPUs
_original_init = ort.InferenceSession.__init__
def _patched_init(self, path_or_bytes, sess_options=None, providers=None, provider_options=None, **kwargs):
    providers = ['DmlExecutionProvider', 'CPUExecutionProvider']
    _original_init(self, path_or_bytes, sess_options, providers, provider_options, **kwargs)
ort.InferenceSession.__init__ = _patched_init
from app.services.camera_manager import camera_manager
from app.services.tracker_worker import TrackerWorker

class TrackerService:
    def __init__(self):
        self.settings = DEFAULT_TRACKER_SETTINGS.copy()
        from app.services.settings_service import settings_service
        self.settings.update(settings_service.get())
        self.acquisition_manager = TargetAcquisitionManager(
            max_embeddings=self.settings["max_embeddings"],
            payload_dir=EMBEDDINGS_DIR
        )
        self.model = YOLO(str(YOLO_MODEL_PATH), task="detect")
        self.model_lock = threading.RLock()
        self.lock = threading.RLock()
        
        self.workers: Dict[str, TrackerWorker] = {}
        
        self.mode = "idle"
        self.camera_id = None

        self.acquisition_target_id = None
        self.acquisition_last_seen = None
        self.acquisition_timeout = 5  # seconds  

        self.tracking_mode = "person"
        self.search_camera_ids = set()
        self.current_search_target = None
        self.loaded_target_id = None

    def start_worker(self, camera_id: str):
        with self.lock:
            if camera_id not in self.workers:
                worker = TrackerWorker(camera_id, self)
                self.workers[camera_id] = worker
                worker.start()

    def stop_worker(self, camera_id: str):
        with self.lock:
            if camera_id in self.workers:
                worker = self.workers.pop(camera_id)
                worker.stop()

    def stop_all_workers(self):
        with self.lock:
            for camera_id in list(self.workers.keys()):
                self.stop_worker(camera_id)

    def get_worker(self, camera_id: str):
        with self.lock:
            return self.workers.get(camera_id)

    def set_mode(self, mode: str):
        if mode not in {"idle", "preview", "acquisition", "search"}:
            raise ValueError(f"Invalid runtime mode: {mode}")
        with self.lock:
            if mode != self.mode:
                logger.info(f"Runtime mode changed from {self.mode} to {mode}")
            self.mode = mode
        return {"mode": mode}

    def get_mode(self):
        with self.lock:
            return self.mode

    def get_latest_frame(self, camera_id: str | None = None):
        with self.lock:
            if camera_id:
                worker = self.workers.get(camera_id)
                return worker.get_latest_frame() if worker else None
            # Return any worker's frame if camera_id is not specified
            for worker in self.workers.values():
                frame = worker.get_latest_frame()
                if frame is not None:
                    return frame
            return None

    def get_active_tracks(self, camera_id: str | None = None):
        with self.lock:
            if camera_id:
                worker = self.workers.get(camera_id)
                return worker.get_active_tracks() if worker else {}
            merged = {}
            for worker in self.workers.values():
                merged.update(worker.get_active_tracks())
            return merged

    def get_settings(self):
        with self.lock:
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
            settings_service.update(self.settings)
            save_bytetrack_yaml(self.settings)
            self.acquisition_manager.max_embeddings = int(self.settings["max_embeddings"])
            return self.settings.copy()

    def set_search_target(self, target_id: str, tracking_mode: Optional[str] = None, camera_ids: Optional[list[str]] = None):
        if tracking_mode and tracking_mode in {"person", "face", "hybrid"}:
            with self.lock:
                self.tracking_mode = tracking_mode
            logger.info(f"Tracking mode set to '{tracking_mode}' for search")

        with self.lock:
            if camera_ids:
                self.search_camera_ids = set(camera_ids)
            if target_id == self.loaded_target_id:
                self.mode = "search"
                self.current_search_target = target_id
                self._start_search_workers()
                return

        logger.info(f"Search start for target ID {target_id}")
        self.acquisition_manager.load_payload(target_id)
        with self.lock:
            self.loaded_target_id = target_id
            self.current_search_target = target_id
            for worker in self.workers.values():
                with worker.lock:
                    worker.track_memory = {}
            self.mode = "search"
            self._start_search_workers()
        logger.info(f"Successfully loaded payload for target {target_id}")

    def _start_search_workers(self):
        # Start workers for all selected search cameras
        for cid in self.search_camera_ids:
            camera_manager.start_capture(cid)
            self.start_worker(cid)

    def clear_search_target(self):
        with self.lock:
            target_id = self.current_search_target
            self.current_search_target = None
            self.loaded_target_id = None
            for worker in self.workers.values():
                with worker.lock:
                    worker.search_matches.clear()
            if self.mode == "search":
                self.mode = "idle"
                self.stop_all_workers()
        logger.info(f"Search stop for target ID {target_id}")

    def set_acquisition_target(self, track_id: int, alias: str | None = None):
        with self.lock:
            logger.info(f"Requested track_id: {track_id}")
            active_tracks = self.get_active_tracks()
            logger.info(f"Active tracks: {list(active_tracks.keys())}")

            if str(track_id) not in active_tracks and track_id not in active_tracks:
                logger.warning(
                    f"Track {track_id} not found. Available: {list(active_tracks.keys())}"
                )
                return None
            self.acquisition_target_id = track_id
            self.acquisition_last_seen = time.time()
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
            if camera_id == self.camera_id:
                return
            
            old_camera_id = self.camera_id
            self.camera_id = camera_id
            logger.info(f"TrackerService switching to camera {camera_id}")
            
            if camera_id:
                camera_manager.start_capture(camera_id)
                self.start_worker(camera_id)
                self.mode = self.mode if self.mode in ("acquisition", "preview", "search") else "preview"
                
                # Stop the worker for the old camera if we're not in search mode
                if self.mode != "search" and old_camera_id:
                    self.stop_worker(old_camera_id)

    def find_track_at_point(self, x: int, y: int):
        with self.lock:
            active_tracks = self.get_active_tracks()
            for track_id, data in active_tracks.items():
                x1, y1, x2, y2 = data["bbox"]
                if x1 <= x <= x2 and y1 <= y <= y2:
                    return int(track_id)
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
                self.mode = "preview"
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
            confirmed_tracks = []
            for worker in self.workers.values():
                for track_id, hits in worker.track_memory.items():
                    if hits > int(self.settings["target_confirmation"]):
                        confirmed_tracks.append(track_id)
                        
            return {
                "active": self.mode == "search" and self.current_search_target is not None,
                "target_id": self.current_search_target,
                "tracking_mode": self.tracking_mode,
                "confirmed_tracks": list(set(confirmed_tracks))
            }

    def get_search_matches(self):
        matches = []
        with self.lock:
            for worker in self.workers.values():
                with worker.lock:
                    matches.extend(worker.search_matches.values())
        return matches

    def get_status(self):
        with self.lock:
            return {
                "running": len(self.workers) > 0,
                "mode": self.mode,
                "active_tracks_count": len(self.get_active_tracks()),
                "camera_id": self.camera_id,
                "search_target": self.current_search_target,
                "acquisition_target": self.acquisition_target_id,
                "workers": list(self.workers.keys())
            }

    def get_stream_health(self):
        with self.lock:
            return {
                "running": len(self.workers) > 0,
                "has_frame": self.get_latest_frame() is not None
            }

    def check_acquisition_timeout(self):
        should_stop = False
        with self.lock:
            if self.mode != "acquisition" or self.acquisition_target_id is None:
                return
            if self.acquisition_last_seen is None:
                self.acquisition_last_seen = time.time()
                return
            if time.time() - self.acquisition_last_seen > self.acquisition_timeout:
                logger.warning(
                    f"Acquisition for track {self.acquisition_target_id} timed out"
                )
                if self.acquisition_manager.has_minimum_embeddings():
                    logger.info(
                        f"Auto saving acquisition "
                        f"{len(self.acquisition_manager.get_embeddings())} embeddings collected"
                    )
                else:
                    logger.warning(
                        "Not enough embeddings collected to finalize acquisition"
                    )
                should_stop = True
        if should_stop:
            self.stop_acquisition()

    def reset_settings(self):
        with self.lock:
            self.settings = DEFAULT_TRACKER_SETTINGS.copy()
            settings_service.update(self.settings)
            self.acquisition_manager.max_embeddings = int(
                self.settings["max_embeddings"]
            )
            return self.settings.copy()

tracker_service = TrackerService()
