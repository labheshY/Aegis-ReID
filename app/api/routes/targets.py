from fastapi import APIRouter
from fastapi import HTTPException
from app.schemas.base_schema import APIResponse
from app.schemas.target_schema import TargetResponse
from app.schemas.target_schema import UpdateTargetRequest
from app.services.payload_service import load_all_payloads
from app.services.payload_service import load_target_by_id
from app.services.payload_service import delete_target_by_id
from app.services.payload_service import update_target_by_id
from app.services.tracker_service import tracker_service

router = APIRouter()

@router.get("/", response_model=list[TargetResponse])
def get_targets():
    return load_all_payloads()

@router.get("/{target_id}", response_model=APIResponse)
def get_target(target_id: str):
    target = load_target_by_id(target_id)
    if target is None:
        raise HTTPException(
            status_code=404,
            detail="Target not found"
        ) 
    return {
        "success": True,
        "data": target
    }

@router.delete("/{target_id}")
def delete_target(target_id: str):
    success = delete_target_by_id(target_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Target not found"
        )
    if tracker_service.current_search_target == target_id:
        tracker_service.clear_search_target()
    return {
        "success": True,
        "message": f"Target {target_id} deleted successfully"
    }

@router.put("/{target_id}", response_model=TargetResponse)
def update_target(target_id: str, request: UpdateTargetRequest):
    updated_target = update_target_by_id(target_id, request.model_dump(exclude_unset=True))
    if updated_target is None:
        raise HTTPException(
            status_code=404,
            detail="Target not found"
        )
    return updated_target   
