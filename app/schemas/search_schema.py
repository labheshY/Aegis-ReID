from pydantic import BaseModel

class SearchRequest(BaseModel):
    target_id: str