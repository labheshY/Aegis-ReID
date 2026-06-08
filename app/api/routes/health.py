from fastapi import APIRouter
from app.services.tracker_service import tracker_service
from app.services.camera_manager import camera_manager

router = APIRouter()


@router.get("")
def health():
    return {
        "success": True,
        "data": {
            "tracker": tracker_service.get_status(),
            "cameras": {c['id']: {'enabled': c.get('enabled', True)} for c in camera_manager.list_cameras()}
        }
    }


@router.get("/ready")
def ready():
    return {"success": True, "ready": True}
