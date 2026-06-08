import threading
import time
import json
from pathlib import Path
from typing import Dict, Optional
import cv2
from app.core.config import BASE_DIR
from app.core.logger import logger
from app.services.secret_store import secret_store


CAMERAS_FILE = Path(BASE_DIR) / "data" / "runtime" / "cameras.json"


class CameraManager:
    def __init__(self):
        self.cameras: Dict[str, dict] = {}
        self.captures: Dict[str, cv2.VideoCapture] = {}
        self.frames: Dict[str, Optional[bytes]] = {}
        self.threads: Dict[str, threading.Thread] = {}
        self.locks: Dict[str, threading.RLock] = {}
        self.running = False
        CAMERAS_FILE.parent.mkdir(parents=True, exist_ok=True)
        self._load()

    def _load(self):
        if CAMERAS_FILE.exists():
            try:
                with open(CAMERAS_FILE, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                    self.cameras = {c["id"]: c for c in data}
                    # If secret_store available, migrate any plaintext sources containing credentials
                    if secret_store:
                        changed = False
                        for cid, c in list(self.cameras.items()):
                            src = c.get("source")
                            if isinstance(src, str) and '@' in src and '://' in src:
                                try:
                                    enc = secret_store.encrypt(src)
                                    c["_encrypted_source"] = enc
                                    # Replace stored source with masked value for safety
                                    def mask(s: str):
                                        try:
                                            parts = s.split('://', 1)
                                            proto, rest = parts[0], parts[1]
                                            if '@' in rest:
                                                auth, tail = rest.split('@', 1)
                                                return f"{proto}://{auth.split(':')[0]}:*****@{tail}"
                                        except Exception:
                                            pass
                                        return s
                                    c["source"] = mask(src)
                                    changed = True
                                except Exception:
                                    logger.exception("Failed to encrypt camera source on load")
                        if changed:
                            self._save()
            except Exception:
                logger.exception("Failed to load cameras file")

    def _save(self):
        try:
            with open(CAMERAS_FILE, "w", encoding="utf-8") as fh:
                json.dump(list(self.cameras.values()), fh, indent=2)
        except Exception:
            logger.exception("Failed to save cameras file")

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
            # Prefer decrypted source when available
            source = None
            enc = cam.get("_encrypted_source")
            if enc and secret_store:
                try:
                    dec = secret_store.decrypt(enc)
                    if dec:
                        source = dec
                except Exception:
                    logger.exception("Failed to decrypt camera source for capture")
            if not source:
                source = cam.get("source")
            backoff = 1
            while True:
                try:
                    cap = cv2.VideoCapture(str(source))
                    self.captures[camera_id] = cap
                    if not cap.isOpened():
                        logger.warning(f"Camera {camera_id} unable to open source {source}")
                        # mark offline
                        self.cameras[camera_id]["status"] = "offline"
                        self._save()
                        time.sleep(backoff)
                        backoff = min(backoff * 2, 30)
                        continue

                    # reset backoff on success
                    backoff = 1
                    self.cameras[camera_id]["status"] = "online"
                    self._save()

                    while cap.isOpened() and self.cameras.get(camera_id, {}).get("enabled", True):
                        ret, frame = cap.read()
                        if not ret:
                            time.sleep(0.05)
                            continue
                        success, buffer = cv2.imencode('.jpg', frame)
                        if success:
                            with self.locks[camera_id]:
                                self.frames[camera_id] = buffer.tobytes()
                        time.sleep(0.02)

                    try:
                        cap.release()
                    except Exception:
                        pass
                    time.sleep(1)
                except Exception:
                    logger.exception(f"Camera capture loop failed for {camera_id}")
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

    def get_frame(self, camera_id: str):
        if camera_id not in self.frames:
            return None
        lock = self.locks.get(camera_id)
        if lock:
            with lock:
                return self.frames.get(camera_id)
        return self.frames.get(camera_id)


camera_manager = CameraManager()
