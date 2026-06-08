from fastapi import APIRouter
from fastapi import HTTPException
from app.schemas.runtime_schema import RuntimeModeRequest
from app.services.tracker_service import tracker_service

router = APIRouter()

@router.get("/mode")
def get_mode():
    return {
        "success": True,
        "mode": tracker_service.get_mode()
    }

@router.post("/mode")
def set_mode(request: RuntimeModeRequest):
    try:
        state = tracker_service.set_mode(request.mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "success": True,
        "data": state
    }
