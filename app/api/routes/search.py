from fastapi import APIRouter
from fastapi import HTTPException
from app.schemas.search_schema import SearchRequest
from app.services.tracker_service import tracker_service
from datetime import datetime

router = APIRouter()

#Start Endpoint
@router.post("/start")
def start_search_route(request: SearchRequest):
    try:
        tracker_service.set_search_target(
            request.target_id,
            tracking_mode=request.tracking_mode
        )
    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc)
        )

    search = {
        "target_id": request.target_id,
        "started_at": datetime.now().isoformat(),
        "status": "active",
        "tracking_mode": request.tracking_mode
    }
    return {
        "success": True,
        "data": search
    }

@router.post("/stop")
def stop_search_route(request: SearchRequest):
    tracker_service.clear_search_target()

    return {
        "success": True
    }

@router.get("/active")
def get_active_searches_route():
    status = tracker_service.get_search_status()
    active_searches = []
    if status["active"]:
        active_searches.append({
            "target_id": status["target_id"],
            "started_at": None,
            "status": "active"
        })

    return {
        "success": True,
        "data": active_searches
    }


@router.get("/status")
def get_search_status_route():
    return {
        "success": True,
        "data": tracker_service.get_search_status()
    }

@router.get("/matches")
def get_search_matches_route():
    return {
        "success": True,
        "data": tracker_service.get_search_matches()
    }
