from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.camera_manager import camera_manager

router = APIRouter()


class CameraModel(BaseModel):
    id: str
    name: str
    source: str
    enabled: bool = True


class CameraUpdateModel(BaseModel):
    """All fields are optional — only provided fields are applied."""
    name: Optional[str] = None
    source: Optional[str] = None
    enabled: Optional[bool] = None
    resolution: Optional[str] = None
    fps: Optional[int] = None


@router.get("")
def list_cameras():
    return {"success": True, "data": camera_manager.list_cameras()}


@router.post("")
def add_camera(camera: CameraModel):
    try:
        camera_manager.add_camera(camera.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"success": True, "data": camera.model_dump()}


@router.put("/{camera_id}")
def update_camera(camera_id: str, updates: CameraUpdateModel):
    existing = camera_manager.get_camera(camera_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Camera not found")
    cam = camera_manager.update_camera(camera_id, updates.model_dump(exclude_unset=True))
    if cam is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"success": True, "data": cam}


@router.delete("/{camera_id}")
def delete_camera(camera_id: str):
    existing = camera_manager.get_camera(camera_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Camera not found")
    camera_manager.remove_camera(camera_id)
    return {"success": True}


@router.get("/{camera_id}/test")
def test_camera(camera_id: str):
    cam = camera_manager.get_camera(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera_manager.start_capture(camera_id)
    frame = camera_manager.wait_for_latest_frame(camera_id)
    if frame is None:
        status = (camera_manager.get_camera(camera_id) or {}).get("status", "offline")
        return {
            "success": False,
            "message": f"No frame received within startup timeout; camera status is {status}",
        }
    return {"success": True, "message": "Frame received"}


@router.post("/{camera_id}/activate")
def activate_camera(camera_id: str):
    cam = camera_manager.get_camera(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    # ensure camera capture is running
    camera_manager.start_capture(camera_id)
    # ask tracker to switch
    from app.services.tracker_service import tracker_service
    tracker_service.switch_camera(camera_id)
    return {"success": True, "message": f"Camera {camera_id} activated"}
