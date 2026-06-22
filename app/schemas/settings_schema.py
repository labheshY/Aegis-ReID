from pydantic import BaseModel, field_validator
from typing import Optional, Literal


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
    # Tracking heuristic mode
    face_threshold: Optional[float] = None
    face_model: Optional[str] = None
    hybrid_face_weight: Optional[float] = None
    face_detector: Optional[str] = None
    track_buffer: Optional[int] = None
    match_thresh: Optional[float] = None
    track_high_thresh: Optional[float] = None
    track_low_thresh: Optional[float] = None
    new_track_thresh: Optional[float] = None


    @field_validator(
        "min_box_width",
        "min_box_height",
        "target_confirmation",
        "acquisition_frame_interval",
        "reid_frame_interval",
        "max_embeddings",
        "track_buffer",
        mode="before"
    )
    @classmethod
    def ensure_positive(cls, v):
        if v is not None:
            return max(1, int(v))
        return v
    
    @field_validator(
        "min_box_confidence",
        "similarity_threshold",
        "face_threshold",
        "hybrid_face_weight",
        "match_thresh",
        "track_high_thresh",
        "track_low_thresh",
        "new_track_thresh",
        mode="before"
    )
    @classmethod
    def clamp_0_1(cls, v):
        if v is not None:
            return max(0.0, min(1.0, float(v)))
        return v
