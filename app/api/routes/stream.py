from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.tracker_service import tracker_service
from app.services.camera_manager import camera_manager
from fastapi import Query, HTTPException
import cv2
import time
import threading

router = APIRouter()

# Limit concurrent MJPEG stream connections to avoid exhausting file descriptors / memory
MAX_STREAM_CLIENTS = 5
_stream_semaphore = threading.Semaphore(MAX_STREAM_CLIENTS)


def generate_mjpeg_frames(camera_id: str | None = None):
    acquired = _stream_semaphore.acquire(blocking=False)
    if not acquired:
        # Yield a single MJPEG boundary with no content so the generator can terminate cleanly
        return

    try:
        while True:
            if camera_id:
                frame = camera_manager.get_latest_frame(camera_id)
                if frame is None:
                    time.sleep(0.05)
                    continue
                success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
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
                continue

            frame = tracker_service.get_latest_frame()
            if frame is None:
                time.sleep(0.05)
                continue

            success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
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
    except GeneratorExit:
        # Client disconnected cleanly
        pass
    finally:
        _stream_semaphore.release()


@router.get("/video")
def stream_video(camera_id: str | None = Query(None)):
    # Check semaphore availability before initiating stream
    if _stream_semaphore._value == 0:  # type: ignore[attr-defined]
        raise HTTPException(
            status_code=503,
            detail=f"Stream capacity reached ({MAX_STREAM_CLIENTS} max concurrent clients). Try again later."
        )
    return StreamingResponse(
        generate_mjpeg_frames(camera_id=camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/health")
def stream_health():
    return {
        "success": True,
        "data": {
            **tracker_service.get_stream_health(),
            "active_stream_clients": MAX_STREAM_CLIENTS - _stream_semaphore._value,  # type: ignore[attr-defined]
            "max_stream_clients": MAX_STREAM_CLIENTS
        }
    }
