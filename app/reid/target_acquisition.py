from datetime import datetime
from app.services.payload_service import load_target_payload
from app.core.logger import logger
from pathlib import Path
import torch

class TargetAcquisitionManager:
    def __init__(self,min_embeddings=3, max_embeddings=10, payload_dir="data/embeddings"):
        self.selected_target_id = None
        self.target_embeddings = []
        self.min_embeddings = min_embeddings
        self.max_embeddings = max_embeddings
        self.payload_dir = Path(payload_dir)
        self.acquisition_complete = False
        self.payload = {}
        self.best_preview_confidence = 0.0

    def start_acquisition(self, track_id, alias=None):
        self.selected_target_id = track_id
        self.target_embeddings = []
        self.acquisition_complete = False
        self.best_preview_confidence = 0.0
        self.payload = {
            "target_id": track_id,
            "alias": alias,
            "created_at": datetime.now().isoformat(),
            "preview_image_path": None,
            "status": "idle"
        }
        logger.info(f"Started acquisition for track ID {track_id}")

    def add_embedding(self, embedding):
        if self.acquisition_complete:
            return
        self.target_embeddings.append(embedding)
        logger.info(f"Collected embedding {len(self.target_embeddings)}/{self.max_embeddings}")
        if len(self.target_embeddings) >= self.max_embeddings:
            self.finalize_acquisition()
    
    def is_target_track(self, track_id):
        return track_id == self.selected_target_id
    
    def save_payload(self, save_path):
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "metadata": self.payload,
            "embeddings": self.target_embeddings
        }
        torch.save(payload, save_path)
        logger.info(f"Saved acquisition payload to target {self.selected_target_id}")

    def load_payload(self, target_id):
        payload = load_target_payload(target_id)
        self.target_embeddings = payload["embeddings"]
        self.payload = payload["metadata"]
        self.acquisition_complete = True
            
    def get_payload(self):
        return self.payload
    
    def get_embeddings(self):
        return self.target_embeddings
    
    def has_minimum_embeddings(self):
        return len(self.target_embeddings) >= self.min_embeddings
    
    def get_progress(self):
        return {
            "embeddings_count" : len(self.target_embeddings),
            "minimum_embeddings": self.min_embeddings,
            "maximum_embeddings": self.max_embeddings,
            "usable": self.has_minimum_embeddings(),
            "complete": self.acquisition_complete
        }
    
    def finalize_acquisition(self):
        if not self.has_minimum_embeddings():
            logger.warning(f"Cannot finalize acquisition for {self.selected_target_id} - not enough embeddings")
            return False
        self.acquisition_complete = True
        self.save_payload(self.payload_dir / f"target_{self.selected_target_id}.pt")
        logger.info(f"Finalized acquisition with {len(self.target_embeddings)} embeddings for {self.selected_target_id}")
        return True