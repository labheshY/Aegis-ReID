from fastapi import APIRouter
from app.services.tracker_service import tracker_service

router = APIRouter()


@router.get("/tracker")
def tracker_status():
    return {
        "success": True,
        "data": tracker_service.get_status()
    }


@router.get("/search")
def search_status():
    return {
        "success": True,
        "data": tracker_service.get_search_status()
    }


@router.get("/acquisition")
def acquisition_status():
    return {
        "success": True,
        "data": tracker_service.get_acquisition_status()
    }


@router.get("/stream")
def stream_status():
    return {
        "success": True,
        "data": tracker_service.get_stream_health()
    }
