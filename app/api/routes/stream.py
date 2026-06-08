from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.tracker_service import tracker_service
from app.services.camera_manager import camera_manager
from fastapi import Query
import cv2
import time

router = APIRouter()


def generate_mjpeg_frames(camera_id: str | None = None):
    while True:
        if camera_id:
            buffer = camera_manager.get_frame(camera_id)
            if buffer is None:
                time.sleep(0.05)
                continue
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + buffer
                + b"\r\n"
            )
            time.sleep(0.03)
            continue

        frame = tracker_service.get_latest_frame()
        if frame is None:
            time.sleep(0.05)
            continue

        success, buffer = cv2.imencode(".jpg", frame)
        if not success:
            time.sleep(0.05)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )
        time.sleep(0.03)


@router.get("/video")
def stream_video(camera_id: str | None = Query(None)):
    return StreamingResponse(
        generate_mjpeg_frames(camera_id=camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/health")
def stream_health():
    return {
        "success": True,
        "data": tracker_service.get_stream_health()
    }
