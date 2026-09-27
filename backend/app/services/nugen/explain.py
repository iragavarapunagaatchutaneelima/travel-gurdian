"""
Nugen-aligned explanations for AI Guardian (Midnight Task 2 integration).

The aligned model never decides facts. It receives a question plus the
VERIFIED answer and data that the app already computed (Digital Twin weather,
flood, route safety) and may only restate them in plain language. Its reply
must pass grounding_check(); otherwise it is discarded and the caller keeps
the verified deterministic answer.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional

from app.core.config import settings
from app.services.nugen.client import NugenClient, NugenError, is_configured

SYSTEM_PROMPT = (
    "You are Travel Guardian's safety explainer. Rephrase the VERIFIED ANSWER for a traveller in at most "
    "3 short sentences. Use ONLY facts in the VERIFIED ANSWER and DATA: do not add numbers, places, "
    "forecasts, advice about specific roads, or any fact not present. Keep source names and 'unavailable' "
    "statements. Never say an alert, SMS or call was sent, and never suggest the app will call 112."
)

# Claims the model must not introduce unless the verified data already has them.
UNSUPPORTED_TERMS = [
    "closed", "closure", "accident", "roadblock", "landslide", "evacuat", "curfew", "police",
    "hospital", "ambulance", "sms", "alert sent", "notified", "called 112", "dispatch",
    "cyclone", "earthquake", "miles", "guarantee", "100% safe", "completely safe",
]


def aligned_model_id() -> Optional[str]:
    m = (settings.NUGEN_ALIGNED_MODEL_ID or "").strip()
    return m or None


def grounding_check(reply: str, verified: str, data: Any) -> Optional[str]:
    """Returns None if the reply is grounded, else the reason it was rejected."""
    if not reply or not reply.strip():
        return "empty reply"
    allowed = f"{verified} {json.dumps(data, default=str)}".lower()
    low = reply.lower()
    allowed_numbers = set(re.findall(r"\d+(?:\.\d+)?", allowed))
    for n in re.findall(r"\d+(?:\.\d+)?", low):
        if n not in allowed_numbers:
            return f'number "{n}" is not in the verified data'
    for t in UNSUPPORTED_TERMS:
        if t in low and t not in allowed:
            return f'mentions "{t}", which the verified data does not'
    if len(reply) > max(260, int(len(verified) * 1.6) + 80):
        return "reply adds content beyond the verified answer"
    return None


def explain(question: str, verified_answer: str, data: Dict[str, Any],
            client: Optional[NugenClient] = None) -> Dict[str, Any]:
    model = aligned_model_id()
    if not is_configured() and client is None:
        return {"status": "UNAVAILABLE", "reason": "NUGEN_API_KEY is not configured.", "model_id": model}
    if not model:
        return {"status": "UNAVAILABLE", "reason": "No deployed Nugen aligned model yet (NUGEN_ALIGNED_MODEL_ID unset).", "model_id": None}
    own = client is None
    try:
        client = client or NugenClient()
        res = client.chat(model, [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"QUESTION: {question}\n\nVERIFIED ANSWER: {verified_answer}\n\nDATA: {json.dumps(data, default=str)[:6000]}"},
        ])
    except NugenError as e:
        return {"status": "UNAVAILABLE", "reason": str(e), "model_id": model}
    finally:
        if own and client is not None:
            client.close()

    text = ((res.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
    text = text.strip()
    rejected = grounding_check(text, verified_answer, data)
    base = {"model_id": res.get("model") or model, "confidence_score": res.get("confidence_score"),
            "usage": res.get("usage")}
    if rejected:
        return {"status": "REJECTED", "reason": rejected, **base}
    return {"status": "OK", "text": text, **base}
