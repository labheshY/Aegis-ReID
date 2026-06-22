from fastapi import APIRouter
from app.schemas.settings_schema import TrackerSettingsRequest
from app.services.tracker_service import tracker_service

router = APIRouter()

@router.get("")
def get_settings():
    return {
        "success": True,
        "data": tracker_service.get_settings()
    }


@router.put("")
def update_settings(request: TrackerSettingsRequest):
    settings = tracker_service.update_settings(request.model_dump(exclude_unset=True))
    return {
        "success": True,
        "data": settings
    }

@router.post("/reset")
def reset_settings():
    settings = tracker_service.reset_settings()

    return {
        "success": True,
        "message": "Settings reset to defaults",
        "data": settings
    }