from fastapi import APIRouter, UploadFile, Form, HTTPException
from app.services.face_service import face_service
from app.core.config import DEFAULT_TRACKER_SETTINGS
from app.services.settings_service import settings_service
from app.utils.similarity import cosine_similarity
import cv2
import numpy as np

router = APIRouter()


@router.post("/enroll/multi")
async def enroll_multi(front: UploadFile | None = None, left: UploadFile | None = None, right: UploadFile | None = None, up: UploadFile | None = None, down: UploadFile | None = None, alias: str | None = Form(None)):
    files = {}
    if front: files['front'] = front
    if left: files['left'] = left
    if right: files['right'] = right
    if up: files['up'] = up
    if down: files['down'] = down

    if not files:
        raise HTTPException(status_code=400, detail="No images uploaded")

    profile = face_service.enroll_multi(files, alias=alias)
    return {"success": True, "data": profile}


@router.post("/enroll/single")
async def enroll_single(file: UploadFile, alias: str | None = Form(None)):
    profile = face_service.enroll_single(file, alias=alias)
    return {"success": True, "data": profile}


@router.get("")
def list_profiles():
    profiles = face_service.list_profiles()
    return {"success": True, "data": profiles}


@router.post("/search")
async def search_faces(file: UploadFile, mode: str | None = Form('hybrid')):
    # read image
    data = await file.read()
    arr = np.frombuffer(data, dtype='uint8')
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail='Invalid image')

    # detect face and generate embedding
    rects = []
    try:
        rects = face_service and []
    except Exception:
        rects = []

    from app.services.face_utils import detect_faces, crop_image
    rects = detect_faces(img)
    if not rects:
        raise HTTPException(status_code=400, detail='No face detected')

    crop = crop_image(img, rects[0])
    face_emb = generate_embedding(crop)

    results = {
        'face_matches': [],
        'reid_matches': [],
        'hybrid_matches': []
    }

    # Face-based search in profiles
    face_threshold = settings_service.get().get('face_threshold', DEFAULT_TRACKER_SETTINGS.get('face_threshold', 0.7))
    face_results = face_service.search_profiles(face_emb, top_k=5, threshold=0.0)
    results['face_matches'] = face_results

    # ReID-based search against acquisition embeddings
    from app.reid.target_acquisition import TargetAcquisitionManager
    # reuse acquisition manager instance? load from tracker_service
    from app.services.tracker_service import tracker_service
    target_embeddings = tracker_service.acquisition_manager.get_embeddings()
    reid_res = []
    for i, emb in enumerate(target_embeddings):
        try:
            score = cosine_similarity(face_emb, emb)
        except Exception:
            continue
        reid_res.append({'index': i, 'score': float(score)})
    reid_res.sort(key=lambda x: x['score'], reverse=True)
    results['reid_matches'] = reid_res[:5]

    # Hybrid: for live cameras scan and combine face + reid if possible
    if mode == 'hybrid':
        hybrid_weight = settings_service.get().get('hybrid_face_weight', DEFAULT_TRACKER_SETTINGS.get('hybrid_face_weight', 0.5))
        # search live cameras for face matches
        live_matches = face_service.search_live_cameras_for_face(face_emb, threshold=face_threshold)
        # attach reid score if available by checking tracker active_tracks bbox overlap
        for m in live_matches:
            cam_id = m['camera_id']
            bbox = m['bbox']
            # find overlapping track in tracker_service active_tracks that belong to same camera
            active = tracker_service.get_active_tracks()
            best_reid = 0.0
            for tid, data in active.items():
                if data.get('camera_id') != cam_id:
                    continue
                # simple IoU-ish overlap check
                tx1, ty1, tx2, ty2 = data['bbox']
                x1, y1, x2, y2 = bbox
                # intersection
                ix1 = max(tx1, x1); iy1 = max(ty1, y1); ix2 = min(tx2, x2); iy2 = min(ty2, y2)
                if ix2 > ix1 and iy2 > iy1:
                    # get reid score using current embeddings (approx) by extracting crop and embedding
                    try:
                        frame_buf = camera_manager.get_frame(cam_id)
                        if frame_buf:
                            a = np.frombuffer(frame_buf, dtype='uint8')
                            frame = cv2.imdecode(a, cv2.IMREAD_COLOR)
                            person_crop = crop_image(frame, data['bbox'])
                            reid_emb = generate_embedding(person_crop)
                            rscore = cosine_similarity(face_emb, reid_emb)
                            best_reid = max(best_reid, rscore)
                    except Exception:
                        continue

            combined = hybrid_weight * m['score'] + (1 - hybrid_weight) * best_reid
            results['hybrid_matches'].append({
                'camera_id': cam_id,
                'bbox': m['bbox'],
                'face_score': m['score'],
                'reid_score': float(best_reid),
                'combined_score': float(combined)
            })

    return {"success": True, "data": results}
