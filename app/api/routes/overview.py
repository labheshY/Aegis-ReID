from fastapi import APIRouter
from app.services.overview_service import build_overview

router = APIRouter()


@router.get("")
def get_overview():
    return {
        "success": True,
        "data": build_overview(),
    }
