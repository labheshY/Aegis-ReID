from app.exceptions.target_exceptions import TargetNotFoundException
from app.core.config import EMBEDDINGS_DIR
from app.core.logger import logger
from dotenv import load_dotenv
from pathlib import Path
import os
import torch

load_dotenv()

PAYLOAD_DIR = EMBEDDINGS_DIR

def build_target_response(data):
    metadata = data["metadata"]

    preview_path = metadata.get("preview_image_path")

    return {
        "id": str(metadata.get("target_id")),
        "alias": metadata.get("alias"),
        "created_at": metadata.get("created_at"),
        "previewImagePath": preview_path,
        "embeddingsCount": len(data["embeddings"]),
        "status": metadata.get("status", "idle")
    }

def load_all_payloads():
    targets = []
    if not os.path.exists(PAYLOAD_DIR):
        logger.warning("Path don't exists of embeddings directory")
        return targets
    
    for filename in os.listdir(PAYLOAD_DIR):
        if not filename.endswith(".pt"):
            continue
        file_path = os.path.join(PAYLOAD_DIR, filename)
        try:
            data = torch.load(file_path, weights_only=False)
            targets.append(build_target_response(data))
        except Exception as e:
            logger.warning(f"Error loading payload {filename}: {e}", exc_info=True)
    return targets


def load_target_by_id(target_id: str):
    data = load_target_payload(target_id)
    target = build_target_response(data)
    return target

def delete_target_by_id(target_id: str):
    file_name = f"target_{target_id}.pt"
    file_path = PAYLOAD_DIR/ file_name
    
    if not os.path.exists(file_path):
        return False
    try:
        data = torch.load(file_path, weights_only=False)
        metadata = data["metadata"]
        preview_image_path = metadata.get("preview_image_path")
        if preview_image_path and os.path.exists(preview_image_path):
            os.remove(preview_image_path)
            logger.info(f"Deleted preview image for target {target_id}")
        os.remove(file_path)
        logger.info(f"Deleted payload for target {target_id}")
        return True
    except Exception as e:
        logger.warning(f"Error deleting payload {file_name}: {e}", exc_info=True)
        return False

def update_target_by_id(target_id: str, update_data: dict):
    file_name = f"target_{target_id}.pt"
    file_path = os.path.join(PAYLOAD_DIR, file_name)
    if not os.path.exists(file_path):
        logger.warning(f"Payload file {file_name} not found for target {target_id}", exc_info=True)
        raise TargetNotFoundException(target_id)
    try:
        data = torch.load(file_path, weights_only=False)
        metadata = data["metadata"]
        #Update field in metadata
        for key, value in update_data.items():
            if value is not None:
                metadata[key] = value
        torch.save(data, file_path)
        logger.info(f"Updated target {target_id} with data: {update_data}")
        return build_target_response(data)
    except Exception as e:
        logger.warning(f"Error updating target {target_id}: {e}", exc_info=True)
        return None
    
def load_target_embeddings(target_id: str):
    data = load_target_payload(target_id)
    return data["embeddings"]   

def load_target_payload(target_id: str):
    if not os.path.exists(PAYLOAD_DIR):
        logger.warning(f"Payload directory {PAYLOAD_DIR} does not exist", exc_info=True)
        raise TargetNotFoundException(target_id)
    file_name = f"target_{target_id}.pt"
    file_path = PAYLOAD_DIR/ file_name
    if not file_path.exists():
        logger.warning("File to load payload does not exists.")
        raise TargetNotFoundException(target_id)
    try:
        data = torch.load(file_path, weights_only=False)
        logger.info(f"Loaded payload for target {target_id}")
    except Exception as e:
        logger.warning(f"Error loading target {target_id} payload: {e}", exc_info=True)
        raise TargetNotFoundException(target_id)
    return data


# ---------------------------------------------------------------------------
# TODO: Switch to alias-based payload loading when all .pt files are saved
#       under the alias filename (i.e. target_{alias}.pt).
#
# To enable:
#   1. Uncomment the function below.
#   2. Replace calls to load_target_payload(target_id) in:
#        - target_acquisition.py  → load_payload(target_id)
#        - tracker_service.py     → acquisition_manager.load_payload(target_id)
#      with load_target_payload_by_alias(alias) after resolving the alias from
#      the target metadata or passing it from the route.
# ---------------------------------------------------------------------------
#
# def load_target_payload_by_alias(alias: str):
#     """
#     Load a target payload using the alias as the filename key.
#     New acquisitions are saved as  target_{alias}.pt  (see finalize_acquisition).
#     This function is the matching loader for that convention.
#     """
#     if not os.path.exists(PAYLOAD_DIR):
#         logger.warning(f"Payload directory {PAYLOAD_DIR} does not exist")
#         raise TargetNotFoundException(alias)
#
#     file_path = PAYLOAD_DIR / f"target_{alias}.pt"
#     if not file_path.exists():
#         logger.warning(f"Alias payload file not found: {file_path}")
#         raise TargetNotFoundException(alias)
#
#     try:
#         data = torch.load(file_path, weights_only=False)
#         logger.info(f"Loaded payload for alias '{alias}'")
#     except Exception as e:
#         logger.warning(f"Error loading alias payload '{alias}': {e}", exc_info=True)
#         raise TargetNotFoundException(alias)
#
#     return data