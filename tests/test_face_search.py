import time
import torch

from app.services.face_service import face_service


def test_search_live_cameras_uses_cache(monkeypatch):
    # Prepare a fake embedding and cached entry
    emb = torch.tensor([1.0, 0.0, 0.0])

    # Mock camera list to include one camera
    monkeypatch.setattr('app.services.face_service.camera_manager.list_cameras', lambda: [{'id': 'cam-1'}])

    # Mock face_scanner to return our embedding for cam-1
    monkeypatch.setattr('app.services.face_service.face_scanner.get_recent_embeddings', lambda cid: [{'bbox': [0, 0, 10, 10], 'emb': emb, 'ts': time.time()}] if cid == 'cam-1' else [])

    results = face_service.search_live_cameras_for_face(emb, threshold=0.5)
    assert isinstance(results, list)
    assert len(results) >= 1
    assert results[0]['camera_id'] == 'cam-1'
    assert results[0]['score'] >= 0.5
