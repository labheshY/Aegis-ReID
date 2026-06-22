import yaml
from pathlib import Path

RUNTIME_TRACKER_YAML = Path("runtime/bytetrack_runtime.yaml")

def save_bytetrack_yaml(settings: dict):
    RUNTIME_TRACKER_YAML.parent.mkdir(parents=True, exist_ok=True)

    config = {
        "tracker_type": "bytetrack",
        "track_high_thresh": settings["track_high_thresh"],
        "track_low_thresh": settings["track_low_thresh"],
        "new_track_thresh": settings["new_track_thresh"],
        "track_buffer": settings["track_buffer"],
        "match_thresh": settings["match_thresh"],
        "fuse_score": True,
    }

    with open(RUNTIME_TRACKER_YAML, "w", encoding="utf-8") as fh:
        yaml.safe_dump(config, fh)