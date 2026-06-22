from fastapi import APIRouter
from app.core.logger import logger
from fastapi import HTTPException
from app.schemas.acquisition_schema import AcquisitionStartRequest
from app.services.tracker_service import tracker_service

router = APIRouter()


@router.post("/start")
def start_acquisition(request: AcquisitionStartRequest):
    # Guard: reject if acquisition already in progress
    current_status = tracker_service.get_acquisition_status()
    if current_status.get("active"):
        raise HTTPException(
            status_code=409,
            detail=(
                "Acquisition already in progress "
                f"(track_id={current_status.get('track_id')}). "
                "Call POST /acquisition/stop first."
            )
        )

    # If the tracker isn't producing active tracks, return a helpful 503
    try:
        active = tracker_service.get_active_tracks()
    except Exception:
        active = {}
    if not active:
        raise HTTPException(
            status_code=503,
            detail="Tracker has no active tracks. Start a camera or wait for frames."
        )

    if request.track_id is not None:
        logger.info(f"Request payload: {request}")
        logger.info(f"Current active tracks: {tracker_service.get_active_tracks().keys()}")
        status = tracker_service.set_acquisition_target(request.track_id, alias=request.alias)
    elif request.x is not None and request.y is not None:
        logger.info(f"Request payload: {request}")
        logger.info(f"Current active tracks: {tracker_service.get_active_tracks().keys()}")
        status = tracker_service.set_acquisition_target_from_point(
            request.x,
            request.y,
            alias=request.alias
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either track_id or x/y click coordinates"
        )

    if status is None:
        raise HTTPException(
            status_code=404,
            detail="No active track found for acquisition"
        )

    return {
        "success": True,
        "data": status
    }


@router.post("/stop")
def stop_acquisition():
    return {
        "success": True,
        "data": tracker_service.stop_acquisition()
    }


@router.get("/status")
def acquisition_status():
    return {
        "success": True,
        "data": tracker_service.get_acquisition_status()
    }

@router.get("/tracks")
def get_tracks():
    return {
        "success": True,
        "data": tracker_service.get_active_tracks()
    }
