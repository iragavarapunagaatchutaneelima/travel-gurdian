from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.nugen import explain as nugen_explain
from app.services.nugen.client import is_configured

router = APIRouter()


class ExplainRequest(BaseModel):
    question: str = Field(..., max_length=1000)
    verified_answer: str = Field(..., max_length=4000)
    data: Dict[str, Any] = Field(default_factory=dict)


@router.get("/status")
def nugen_status() -> Dict[str, Any]:
    """Configuration state only; the API key itself is never returned."""
    return {
        "api_key_configured": is_configured(),
        "base_model_id": settings.NUGEN_BASE_MODEL_ID or None,
        "aligned_model_id": settings.NUGEN_ALIGNED_MODEL_ID or None,
        "ready_for_inference": bool(is_configured() and settings.NUGEN_ALIGNED_MODEL_ID),
    }


@router.post("/explain")
def nugen_explain_endpoint(req: ExplainRequest) -> Dict[str, Any]:
    """
    Rephrases an already-verified AI Guardian answer with the deployed Nugen
    aligned model. Returns status OK (grounding-checked text), REJECTED (the
    model added unsupported content) or UNAVAILABLE (with the reason).
    """
    return nugen_explain.explain(req.question, req.verified_answer, req.data)
