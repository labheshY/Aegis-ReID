"""Aggregated dashboard metrics for the operations console."""
from __future__ import annotations

import shutil
import time
from pathlib import Path

from app.core.config import BASE_DIR, EMBEDDINGS_DIR, PREVIEWS_DIR
from app.services.camera_manager import camera_manager
from app.services.payload_service import load_all_payloads
from app.services.tracker_service import tracker_service


def _gpu_metrics() -> dict:
    try:
        import torch

        if not torch.cuda.is_available():
            return {
                "available": False,
                "device_name": None,
                "utilization_pct": None,
                "memory_used_gb": None,
                "memory_total_gb": None,
            }
        device = torch.cuda.current_device()
        props = torch.cuda.get_device_properties(device)
        allocated = torch.cuda.memory_allocated(device)
        total = props.total_memory
        return {
            "available": True,
            "device_name": props.name,
            "utilization_pct": None,
            "memory_used_gb": round(allocated / (1024**3), 2),
            "memory_total_gb": round(total / (1024**3), 2),
        }
    except Exception:
        return {
            "available": False,
            "device_name": None,
            "utilization_pct": None,
            "memory_used_gb": None,
            "memory_total_gb": None,
        }


def _storage_metrics() -> dict:
    paths = [EMBEDDINGS_DIR, PREVIEWS_DIR]
    used_bytes = 0
    for root in paths:
        if not root.exists():
            continue
        for file_path in root.rglob("*"):
            if file_path.is_file():
                try:
                    used_bytes += file_path.stat().st_size
                except OSError:
                    pass
    try:
        usage = shutil.disk_usage(str(BASE_DIR))
        total_gb = round(usage.total / (1024**3), 1)
        free_gb = round(usage.free / (1024**3), 1)
    except Exception:
        total_gb = None
        free_gb = None
    return {
        "embeddings_used_gb": round(used_bytes / (1024**3), 2),
        "volume_total_gb": total_gb,
        "volume_free_gb": free_gb,
    }


def build_overview() -> dict:
    targets = load_all_payloads()
    cameras = camera_manager.list_cameras()
    online = sum(1 for c in cameras if c.get("status") == "online")
    tracker = tracker_service.get_status()
    search = tracker_service.get_search_status()
    stream = tracker_service.get_stream_health()
    acquisition = tracker_service.get_acquisition_status()
    active_search_count = 1 if search.get("active") else 0

    embeddings_total = sum(t.get("embeddingsCount", 0) for t in targets)
    gpu = _gpu_metrics()
    storage = _storage_metrics()

    return {
        "generated_at": time.time(),
        "counts": {
            "registered_targets": len(targets),
            "active_searches": active_search_count,
            "online_cameras": online,
            "total_cameras": len(cameras),
            "active_tracks": tracker.get("active_tracks_count", 0),
            "total_embeddings": embeddings_total,
        },
        "tracker": tracker,
        "search": search,
        "stream": stream,
        "acquisition": acquisition,
        "gpu": gpu,
        "storage": storage,
        "version": "1.0.0",
    }
