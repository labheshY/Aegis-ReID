from fastapi import APIRouter
from app.services.tracker_service import tracker_service

router = APIRouter()


@router.get("")
@router.get("/")
def get_tracks():
    return {
        "success": True,
        "data": tracker_service.get_active_tracks()
    }
