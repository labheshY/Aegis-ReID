from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

EMBEDDINGS_DIR = BASE_DIR / "data" / "embeddings"

PREVIEWS_DIR = BASE_DIR / "data" / "previews"

OUTPUTS_DIR = BASE_DIR / "outputs"

MODELS_DIR = BASE_DIR / "models"

VIDEOS_DIR = BASE_DIR / "data" / "videos"

API_V1_PREFIX = "/api/v1"

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

ACTIVE_SEARCH_FILE = BASE_DIR / "data" / "runtime" / "active_search.json"

RUNTIME_STATE_FILE = BASE_DIR / "data" / "runtime" / "runtime_state.json"

DEFAULT_VIDEO_PATH = Path(os.getenv("DEFAULT_VIDEO_PATH", VIDEOS_DIR / "test_short.mp4"))

YOLO_MODEL_PATH = Path(os.getenv("YOLO_MODEL_PATH", MODELS_DIR / "yolo11n.onnx"))

DEFAULT_TRACKER_SETTINGS = {
    "min_box_confidence": float(os.getenv("MIN_BOX_CONFIDENCE", 0.7)),
    "min_box_width": int(os.getenv("MIN_BOX_WIDTH", 80)),
    "min_box_height": int(os.getenv("MIN_BOX_HEIGHT", 120)),
    "similarity_threshold": float(os.getenv("SIMILARITY_THRESHOLD", 0.7)),
    "target_confirmation": int(os.getenv("TARGET_CONFIRMATION", 8)),
    "acquisition_frame_interval": int(os.getenv("ACQUISITION_FRAME_INTERVAL", 5)),
    "reid_frame_interval": int(os.getenv("REID_FRAME_INTERVAL", 3)),
    "max_embeddings": int(os.getenv("MAX_EMBEDDINGS", 10)),
    "use_soft_decay": os.getenv("USE_SOFT_DECAY", "false").lower() == "true",
    "soft_decay_rate": float(os.getenv("SOFT_DECAY_RATE", 0.2)),
    # Face recognition/runtime settings
    "face_threshold": float(os.getenv("FACE_THRESHOLD", 0.7)),
    "face_model": os.getenv("FACE_MODEL", "facenet"),
    "face_detector": os.getenv("FACE_DETECTOR", "haar"),
    # hybrid weight between reid and face (0..1 where 1.0 means only face)
    "hybrid_face_weight": float(os.getenv("HYBRID_FACE_WEIGHT", 0.5)),
}
