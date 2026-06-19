from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.database import get_db, User
from models.schemas import AISearchRequest, AISearchResponse
from services.ai_search import search_buses_ai
from services.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Search"])


@router.post("/search", response_model=AISearchResponse)
def ai_search(
    request: AISearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        result = search_buses_ai(request.query, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI search failed: {str(e)}")
