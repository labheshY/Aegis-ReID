import threading
import time
from typing import Dict, List
from app.services.face_utils import detect_faces, crop_image
from app.services.face_models import get_face_model
from app.services.camera_manager import camera_manager
from app.core.logger import logger


class FaceScanner:
    def __init__(self, interval_ms: int = 500):
        self.interval = interval_ms / 1000.0
        self.lock = threading.RLock()
        # camera_id -> list of {'bbox': [x1,y1,x2,y2], 'emb': tensor_cpu, 'ts': float}
        self.camera_embeddings: Dict[str, List[dict]] = {}
        self.running = False
        self.thread = None
        self.face_model = get_face_model()

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)

    def _run(self):
        while self.running:
            try:
                cams = camera_manager.list_cameras()
                crops_by_cam = {}
                meta_by_cam = {}

                for cam in cams:
                    cid = cam.get('id')
                    frame = camera_manager.get_latest_frame(cid)
                    if frame is None:
                        continue
                    rects = detect_faces(frame)
                    if not rects:
                        continue
                    crops = []
                    metas = []
                    for bbox in rects:
                        crop = crop_image(frame, bbox)
                        if crop.size == 0:
                            continue
                        crops.append(crop)
                        metas.append({'bbox': bbox, 'camera_id': cid})

                    if crops:
                        crops_by_cam[cid] = crops
                        meta_by_cam[cid] = metas

                # Batch embeddings per camera (or combined)
                for cid, crops in crops_by_cam.items():
                    try:
                        embs = self.face_model.generate_batch(crops)
                    except Exception:
                        logger.exception('Failed to generate batch embeddings')
                        continue

                    with self.lock:
                        lst = []
                        for meta, emb in zip(meta_by_cam[cid], embs):
                            lst.append({'bbox': meta['bbox'], 'emb': emb, 'ts': time.time()})
                        self.camera_embeddings[cid] = lst

            except Exception:
                logger.exception('FaceScanner loop error')

            time.sleep(self.interval)

    def get_recent_embeddings(self, camera_id: str):
        with self.lock:
            return list(self.camera_embeddings.get(camera_id, []))


face_scanner = FaceScanner()
face_scanner.start()
