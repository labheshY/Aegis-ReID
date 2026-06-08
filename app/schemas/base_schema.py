from pydantic import BaseModel
from typing import Any

class APIResponse(BaseModel):
    success: bool
    message: str| None = None
    data: Any = None