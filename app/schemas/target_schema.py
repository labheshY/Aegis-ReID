from pydantic import BaseModel
from typing import Optional

class TargetResponse(BaseModel):
    id : str
    alias : Optional[str] = None
    created_at : str
    embeddingsCount : int
    previewImagePath : Optional[str] = None
    status : str

class UpdateTargetRequest(BaseModel):
    alias: Optional[str] = None
    status: Optional[str] = None