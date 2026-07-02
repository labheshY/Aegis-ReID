from pydantic import BaseModel
from typing import Optional


class AcquisitionStartRequest(BaseModel):
    track_id: Optional[int] = None
    x: Optional[int] = None
    y: Optional[int] = None
    alias: str
