from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.api.routes.targets import router as target_router
from app.api.routes.search import router as search_router
from app.api.routes.runtime import router as runtime_router
from app.api.routes.acquisition import router as acquisition_router
from app.api.routes.tracks import router as tracks_router
from app.api.routes.stream import router as stream_router
from app.api.routes.cameras import router as cameras_router
from app.api.routes.settings import router as settings_router
from app.api.routes.status import router as status_router
from app.api.routes.health import router as health_router
from app.api.routes.overview import router as overview_router
from app.api.routes.face import router as face_router
from app.services.tracker_service import tracker_service
from app.core.config import DEFAULT_VIDEO_PATH
from app.core.config import PREVIEWS_DIR
from app.core.config import ACTIVE_SEARCH_FILE
from app.exceptions.target_exceptions import TargetNotFoundException
from app.core.logger import logger
from contextlib import asynccontextmanager
from pathlib import Path
import os

@asynccontextmanager
async def lifespan(app):
    # Clean up any stale active_search.json from a previous crashed session
    if ACTIVE_SEARCH_FILE.exists():
        try:
            ACTIVE_SEARCH_FILE.unlink()
            logger.info("Cleared stale active_search.json on startup")
        except Exception:
            logger.exception("Failed to clear stale active_search.json on startup")
    yield

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PREVIEW_DIR = PREVIEWS_DIR
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
app = FastAPI(
    title="Aegis ReID API",
    description="AI Person Tracking & Re-Identification — production API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS allowed origins via environment variable ALLOWED_ORIGINS (comma-separated)
allowed = os.getenv('ALLOWED_ORIGINS')
if allowed:
    origins = [o.strip() for o in allowed.split(',') if o.strip()]
else:
    origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    target_router, 
    prefix="/api/v1/targets", 
    tags=["Targets"]
    )

app.include_router(
    search_router,
    prefix="/api/v1/search",
    tags=["Search"]
)

app.include_router(
    runtime_router,
    prefix="/api/v1/runtime",
    tags=["Runtime"]
)

app.include_router(
    acquisition_router,
    prefix="/api/v1/acquisition",
    tags=["Acquisition"]
)

app.include_router(
    tracks_router,
    prefix="/api/v1/tracks",
    tags=["Tracks"]
)

app.include_router(
    stream_router,
    prefix="/api/v1/stream",
    tags=["Stream"]
)

app.include_router(
    cameras_router,
    prefix="/api/v1/cameras",
    tags=["Cameras"]
)

app.include_router(
    settings_router,
    prefix="/api/v1/settings",
    tags=["Settings"]
)

app.include_router(
    face_router,
    prefix="/api/v1/faces",
    tags=["Faces"]
)

app.include_router(
    status_router,
    prefix="/api/v1/status",
    tags=["Status"]
)

app.include_router(
    health_router,
    prefix="/api/v1/health",
    tags=["Health"]
)

app.include_router(
    overview_router,
    prefix="/api/v1/overview",
    tags=["Overview"]
)


@app.get("/api/v1")
def api_root():
    return {
        "success": True,
        "data": {
            "name": "Aegis ReID API",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/api/v1/health",
            "overview": "/api/v1/overview",
        },
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("message", str(detail))
    else:
        message = str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": message},
    )


app.mount(
    "/previews",
    StaticFiles(directory=PREVIEW_DIR),
    name="previews"
)

@app.exception_handler(TargetNotFoundException)
async def target_not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "message": f"Target {exc.target_id} not found"
        }
    )
