from pydantic import BaseModel
from typing import Optional, Literal


class SearchRequest(BaseModel):
    target_id: str
    # Optional heuristic override for this search session
    tracking_mode: Optional[Literal["person", "face", "hybrid"]] = None