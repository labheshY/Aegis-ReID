from datetime import datetime
from app.core.config import ACTIVE_SEARCH_FILE
from app.core.logger import logger
import json
import os

def start_search(target_id: str):
    active_searches = {
        "target_id": target_id,
        "started_at": datetime.now().isoformat(),
        "status": "active"
    }
    with open(ACTIVE_SEARCH_FILE, "w") as f:
        json.dump(active_searches, f)
    logger.info(f"Started search for target {target_id}")
    return active_searches

def stop_search(target_id: str):
    if not ACTIVE_SEARCH_FILE.exists():
        return False
    
    os.remove(ACTIVE_SEARCH_FILE)
    logger.info(f"Stopped search for target {target_id}")
    return True

def get_active_searches():
    # Return a list of active searches. The on-disk format may be a single
    # search object (dict) written by start_search, so normalize to a list.
    if not ACTIVE_SEARCH_FILE.exists():
        logger.info("No active searches file found")
        return []

    with open(ACTIVE_SEARCH_FILE) as f:
        data = json.load(f)

    logger.info("Getting active searches..")

    if data is None:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return [data]
    # Fallback: return empty list for unexpected formats
    return []

def get_current_search():
    if not ACTIVE_SEARCH_FILE.exists():
        return None
    
    with open(ACTIVE_SEARCH_FILE) as f:
        data = json.load(f)
    logger.info(f"Loaded active search for target {data['target_id']}")
    return data