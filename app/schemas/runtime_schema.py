from pydantic import BaseModel

class RuntimeModeRequest(BaseModel):
    mode: str