from pydantic import BaseModel
from typing import Optional


class TrackerSettingsRequest(BaseModel):
    min_box_confidence: Optional[float] = None
    min_box_width: Optional[int] = None
    min_box_height: Optional[int] = None
    similarity_threshold: Optional[float] = None
    target_confirmation: Optional[int] = None
    acquisition_frame_interval: Optional[int] = None
    reid_frame_interval: Optional[int] = None
    max_embeddings: Optional[int] = None
    use_soft_decay: Optional[bool] = None
    soft_decay_rate: Optional[float] = None
