from pathlib import Path
import uuid
import json
from app.core.config import EMBEDDINGS_DIR, BASE_DIR, FACES_PREVIEWS_DIR
from app.reid.reid_model import generate_embedding
from app.services.face_models import get_face_model
from app.core.logger import logger
import torch
from typing import List
from app.utils.similarity import cosine_similarity
from app.services.face_utils import detect_faces, crop_image
from app.services.camera_manager import camera_manager
import numpy as np
from app.services.face_scanner import face_scanner


FACES_DIR = EMBEDDINGS_DIR / "faces"
FACES_DIR.mkdir(parents=True, exist_ok=True)


class FaceService:
    def __init__(self):
        self.profiles_dir = FACES_DIR
        FACES_PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)

    def _check_alias_unique(self, alias: str):
        profiles = self.list_profiles()
        for p in profiles:
            if p.get("alias") == alias:
                raise ValueError(f"Alias '{alias}' is already in use by another face profile.")

    def _save_profile(self, profile_id: str, profile: dict, embeddings: List[torch.Tensor]):
        profile_folder = self.profiles_dir / profile_id
        profile_folder.mkdir(parents=True, exist_ok=True)
        # Save profile metadata
        with open(profile_folder / "profile.json", "w", encoding="utf-8") as fh:
            json.dump(profile, fh, indent=2)

        # Save embeddings
        for i, emb in enumerate(embeddings):
            torch.save(emb, profile_folder / f"emb_{i}.pt")

    def list_profiles(self):
        profiles = []
        for p in self.profiles_dir.iterdir():
            if not p.is_dir():
                continue
            meta = p / "profile.json"
            if meta.exists():
                try:
                    with open(meta, "r", encoding="utf-8") as fh:
                        data = json.load(fh)
                        profiles.append(data)
                except Exception:
                    logger.exception(f"Failed to read profile {p}")
        return profiles

    def _load_profile_embeddings(self, profile_id: str):
        profile_folder = self.profiles_dir / profile_id
        embs = []
        for p in profile_folder.glob('emb_*.pt'):
            try:
                embs.append(torch.load(p, weights_only=False))
            except Exception:
                logger.exception(f"Failed to load embedding {p}")
        return embs

    def search_profiles(self, query_emb, top_k: int = 5, threshold: float = 0.5):
        results = []
        for p in self.profiles_dir.iterdir():
            if not p.is_dir():
                continue
            meta = p / 'profile.json'
            if not meta.exists():
                continue
            try:
                with open(meta, 'r', encoding='utf-8') as fh:
                    data = json.load(fh)
            except Exception:
                continue

            embs = self._load_profile_embeddings(data['id'])
            best = 0.0
            for emb in embs:
                try:
                    score = cosine_similarity(query_emb, emb)
                    if score > best:
                        best = score
                except Exception:
                    continue

            if best >= threshold:
                results.append({
                    'profile_id': data['id'],
                    'alias': data.get('alias'),
                    'score': float(best),
                    'method': data.get('method')
                })

        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]

    def search_live_cameras_for_face(self, query_emb, threshold: float = 0.6):
        # Use cached embeddings from face_scanner for performance
        matches = []
        cameras = camera_manager.list_cameras()
        for cam in cameras:
            cam_id = cam['id']
            cached = face_scanner.get_recent_embeddings(cam_id)
            for item in cached:
                try:
                    stored_emb = item['emb']
                    score = cosine_similarity(query_emb, stored_emb)
                except Exception:
                    continue
                if score >= threshold:
                    matches.append({
                        'camera_id': cam_id,
                        'bbox': item['bbox'],
                        'score': float(score),
                        'ts': item.get('ts')
                    })

        matches.sort(key=lambda x: x['score'], reverse=True)
        return matches

    def enroll_multi(self, files: dict, alias: str):
        if not alias:
            raise ValueError("Alias is required")
        self._check_alias_unique(alias)

        # files expected dict with keys like 'front', 'left', 'right', etc.
        embeddings = []
        preview_saved = False
        import numpy as np
        import cv2

        for key in ['front', 'left', 'right', 'up', 'down']:
            f = files.get(key)
            if not f:
                continue
            # read bytes and write temp file path accepted by generate_embedding
            try:
                data = f.file.read()
                arr = np.frombuffer(data, dtype='uint8')
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                emb = generate_embedding(img)
                embeddings.append(emb)

                if not preview_saved:
                    preview_path = FACES_PREVIEWS_DIR / f"{alias}.jpg"
                    cv2.imwrite(str(preview_path), img)
                    preview_saved = True
            except Exception:
                logger.exception("Failed to process face image")

        profile_id = str(uuid.uuid4())
        profile = {
            "id": profile_id,
            "alias": alias,
            "method": "multi",
            "images": [k for k in ['front', 'left', 'right', 'up', 'down'] if k in files],
            "preview_image_path": f"/previews/faces/{alias}.jpg" if preview_saved else None
        }
        self._save_profile(profile_id, profile, embeddings)
        return profile

    def enroll_single(self, file, alias: str):
        if not alias:
            raise ValueError("Alias is required")
        self._check_alias_unique(alias)

        try:
            data = file.file.read()
            import numpy as np
            import cv2
            arr = np.frombuffer(data, dtype='uint8')
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            face_model = get_face_model()
            emb = face_model.generate(img)

            preview_path = FACES_PREVIEWS_DIR / f"{alias}.jpg"
            cv2.imwrite(str(preview_path), img)
        except Exception:
            logger.exception("Failed to process single face image")
            raise

        profile_id = str(uuid.uuid4())
        profile = {
            "id": profile_id,
            "alias": alias,
            "method": "single",
            "images": ["single"],
            "preview_image_path": f"/previews/faces/{alias}.jpg"
        }
        self._save_profile(profile_id, profile, [emb])
        return profile


face_service = FaceService()
