import threading
import time
import json
from pathlib import Path
from typing import Dict, Optional
import cv2
import numpy as np
import shutil
from app.core.config import BASE_DIR
from app.core.logger import logger
from app.services.secret_store import secret_store


CAMERAS_FILE = Path(BASE_DIR) / "data" / "runtime" / "cameras.json"
BACKUP_FILE = Path(BASE_DIR) / "data" / "runtime" / "cameras.json.bak"
FIRST_FRAME_TIMEOUT_SECONDS = 10


class CameraManager:
    def __init__(self):
        self.cameras: Dict[str, dict] = {}
        self.captures: Dict[str, cv2.VideoCapture] = {}
        self.frames: Dict[str, Optional[np.ndarray]] = {}
        self.threads: Dict[str, threading.Thread] = {}
        self.locks: Dict[str, threading.RLock] = {}
        self.running = False
        CAMERAS_FILE.parent.mkdir(parents=True, exist_ok=True)
        self._load()

    def _load(self):
        backup_file = BACKUP_FILE

        try:
            if CAMERAS_FILE.exists():
                with open(CAMERAS_FILE, "r", encoding="utf-8") as fh:
                    data = json.load(fh)

                self.cameras = {c["id"]: c for c in data}
                logger.info(
                    f"Loaded {len(self.cameras)} cameras "
                    f"from primary configuration."
                )

            else:
                self.cameras = {}
                return

        except Exception:
            logger.exception(
                "Failed to load primary cameras file. "
                "Attempting recovery from backup."
            )

            try:
                if backup_file.exists():
                    with open(backup_file, "r", encoding="utf-8") as fh:
                        data = json.load(fh)

                    self.cameras = {c["id"]: c for c in data}

                    logger.warning(
                        f"Recovered {len(self.cameras)} cameras "
                        f"from backup configuration."
                    )

                    # Restore recovered configuration back to primary
                    self._save()

                else:
                    logger.warning(
                        "Camera backup file not found. "
                        "Starting with empty camera list."
                    )
                    self.cameras = {}

            except Exception:
                logger.exception(
                    "Backup recovery failed. "
                    "Starting with empty camera list."
                )
                self.cameras = {}

        # Existing encryption migration logic
        try:
            if secret_store:
                changed = False

                for cid, c in list(self.cameras.items()):
                    src = c.get("source")

                    if (
                        isinstance(src, str)
                        and '@' in src
                        and '://' in src
                    ):
                        try:
                            enc = secret_store.encrypt(src)
                            c["_encrypted_source"] = enc

                            def mask(s: str):
                                try:
                                    proto, rest = s.split('://', 1)

                                    if '@' in rest:
                                        auth, tail = rest.split('@', 1)

                                        return (
                                            f"{proto}://"
                                            f"{auth.split(':')[0]}"
                                            f":*****@{tail}"
                                        )
                                except Exception:
                                    pass

                                return s

                            c["source"] = mask(src)
                            changed = True

                        except Exception:
                            logger.exception(
                                "Failed to encrypt camera source on load"
                            )

                if changed:
                    self._save()

        except Exception:
            logger.exception(
                "Camera migration step failed"
            )

    def _save(self):
        backup_file = CAMERAS_FILE.with_suffix(".json.bak")

        try:
            if CAMERAS_FILE.exists():
                shutil.copy2(
                    CAMERAS_FILE,
                    backup_file
                )

            with open(
                CAMERAS_FILE,
                "w",
                encoding="utf-8"
            ) as fh:
                json.dump(
                    list(self.cameras.values()),
                    fh,
                    indent=2,
                    ensure_ascii=False
                )

        except Exception:
            logger.exception(
                "Failed to save camera configuration."
            )

    def list_cameras(self):
        # Return a sanitized copy of cameras for API responses (mask credentials)
        def mask_source(src: str):
            try:
                # mask user:pass@ in URLs
                if '@' in src and '://' in src:
                    parts = src.split('://', 1)
                    proto, rest = parts[0], parts[1]
                    if '@' in rest:
                        auth, tail = rest.split('@', 1)
                        return f"{proto}://{auth.split(':')[0]}:*****@{tail}"
                return src
            except Exception:
                return src

        out = []
        for c in list(self.cameras.values()):
            copy = c.copy()
            # Never return encrypted source field to clients
            if "_encrypted_source" in copy:
                del copy["_encrypted_source"]
            src = copy.get('source')
            if isinstance(src, str):
                copy['source'] = mask_source(src)
            out.append(copy)
        return out

    def get_camera(self, camera_id: str):
        return self.cameras.get(camera_id)

    def add_camera(self, camera: dict):
        cid = camera.get("id")
        if not cid:
            raise ValueError("Camera must have an id")
        if not camera.get("source"):
            raise ValueError("Camera must have a source")
        camera.setdefault("status", "offline")
        # If source contains credentials and secret_store is available, encrypt it before saving
        src = camera.get("source")
        if isinstance(src, str) and '@' in src and '://' in src and secret_store:
            try:
                enc = secret_store.encrypt(src)
                camera["_encrypted_source"] = enc
                # Replace source with masked version
                camera["source"] = camera["source"].split('://', 1)[0] + '://' + camera["source"].split('://', 1)[1].split('@', 1)[0].split(':', 1)[0] + ':*****@' + camera["source"].split('@', 1)[1]
            except Exception:
                logger.exception("Failed to encrypt camera source on add")
        self.cameras[cid] = camera
        self._save()
        if camera.get("enabled", True):
            self.start_capture(cid)

    def update_camera(self, camera_id: str, updates: dict):
        if camera_id not in self.cameras:
            return None
        # If updating source with credentials, encrypt
        src = updates.get("source")
        if isinstance(src, str) and '@' in src and '://' in src and secret_store:
            try:
                enc = secret_store.encrypt(src)
                updates["_encrypted_source"] = enc
                updates["source"] = src.split('://', 1)[0] + '://' + src.split('://', 1)[1].split('@', 1)[0].split(':', 1)[0] + ':*****@' + src.split('@', 1)[1]
            except Exception:
                logger.exception("Failed to encrypt camera source on update")
        self.cameras[camera_id].update(updates)
        self._save()
        if self.cameras[camera_id].get("enabled", True):
            self.start_capture(camera_id)
        else:
            self.stop_capture(camera_id)
        return self.cameras[camera_id]

    def remove_camera(self, camera_id: str):
        self.stop_capture(camera_id)
        if camera_id in self.cameras:
            del self.cameras[camera_id]
            self._save()

    def start_capture(self, camera_id: str):
        cam = self.cameras.get(camera_id)
        if not cam:
            return
        if camera_id in self.threads and self.threads[camera_id].is_alive():
            return

        self.locks[camera_id] = threading.RLock()
        self.frames[camera_id] = None

        def run():
            backoff = 1

            while True:
                cam = self.cameras.get(camera_id)

                if cam is None:
                    logger.info(
                        f"Camera {camera_id} removed, stopping thread"
                    )
                    break

                if not cam.get("enabled", True):
                    logger.info(
                        f"Camera {camera_id} disabled, stopping thread"
                    )
                    break

                source = None

                # Prefer decrypted source when available
                enc = cam.get("_encrypted_source")
                if enc and secret_store:
                    try:
                        dec = secret_store.decrypt(enc)
                        if dec:
                            source = dec
                    except Exception:
                        logger.exception(
                            "Failed to decrypt camera source for capture"
                        )

                if not source:
                    source = cam.get("source")

                try:
                    logger.info(
                        f"Opening camera {camera_id}: {source}"
                    )

                    cam["status"] = "connecting"
                    self._save()

                    cap = cv2.VideoCapture(
                        str(source),
                        cv2.CAP_FFMPEG
                    )

                    cap.set(
                        cv2.CAP_PROP_BUFFERSIZE,
                        1
                    )

                    # Wait for first frame
                    frame_received = False
                    first_frame = None
                    start_time = time.time()

                    while time.time() - start_time < FIRST_FRAME_TIMEOUT_SECONDS:
                        ret, frame = cap.read()

                        if ret:
                            frame_received = True
                            first_frame = frame
                            break

                        time.sleep(0.25)

                    self.captures[camera_id] = cap

                    if not frame_received:
                        logger.warning(
                            f"Camera {camera_id} unable to receive frames"
                        )

                        cam["status"] = "offline"
                        self._save()

                        try:
                            cap.release()
                        except Exception:
                            pass

                        time.sleep(backoff)
                        backoff = min(backoff * 2, 30)
                        continue

                    logger.info(
                        f"First frame received from {camera_id}"
                    )

                    backoff = 1

                    cam["status"] = "online"
                    self._save()

                    with self.locks[camera_id]:
                        self.frames[camera_id] = first_frame.copy()

                    failed_reads = 0

                    while True:

                        cam = self.cameras.get(camera_id)

                        if cam is None:
                            logger.info(
                                f"Camera {camera_id} removed during capture"
                            )
                            break

                        if not cam.get("enabled", True):
                            logger.info(
                                f"Camera {camera_id} disabled during capture"
                            )
                            break

                        ret, frame = cap.read()

                        if not ret:
                            failed_reads += 1

                            if failed_reads >= 100:
                                logger.warning(
                                    f"Camera {camera_id} lost stream"
                                )

                                cam["status"] = "offline"
                                self._save()

                                break

                            time.sleep(0.05)
                            continue

                        failed_reads = 0

                        with self.locks[camera_id]:
                            self.frames[camera_id] = frame.copy()

                    try:
                        cap.release()
                    except Exception:
                        pass

                    time.sleep(1)

                except Exception:
                    logger.exception(
                        f"Camera capture loop failed for {camera_id}"
                    )
                    time.sleep(2)

        t = threading.Thread(target=run, daemon=True)
        self.threads[camera_id] = t
        t.start()

    def stop_capture(self, camera_id: str):
        try:
            if camera_id in self.captures:
                cap = self.captures[camera_id]
                try:
                    cap.release()
                except Exception:
                    pass
                del self.captures[camera_id]
        except Exception:
            logger.exception("Error stopping capture")

    def get_latest_frame(self, camera_id: str):
        if camera_id not in self.frames:
            return None
        lock = self.locks.get(camera_id)
        if lock:
            with lock:
                frame = self.frames.get(camera_id)
                return frame.copy() if frame is not None else None
        frame = self.frames.get(camera_id)
        return frame.copy() if frame is not None else None

    def get_frame(self, camera_id: str):
        return self.get_latest_frame(camera_id)

    def wait_for_latest_frame(
        self,
        camera_id: str,
        timeout: float = FIRST_FRAME_TIMEOUT_SECONDS,
        poll_interval: float = 0.1,
    ):
        deadline = time.time() + timeout
        while time.time() < deadline:
            frame = self.get_latest_frame(camera_id)
            if frame is not None:
                return frame

            cam = self.cameras.get(camera_id)
            if cam is None or not cam.get("enabled", True):
                return None

            time.sleep(poll_interval)

        return None


camera_manager = CameraManager()
