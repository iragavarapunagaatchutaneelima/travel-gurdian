"""
Nugen API v3 client (Midnight Task 2).

Endpoints follow the official Nugen API reference (docs.nugen.in) and the
nugen-cookbook alignment guide:

  GET  /models/base                          alignment-ready base models
  POST /documents/create                     upload corpus (multipart, text files)
  GET  /documents/{id}/status                poll until READY
  POST /benchmarks/create                    generate a benchmark from documents
  GET  /benchmarks/{id}/status | /data       poll / fetch questions
  POST /alignment-projects/create            start alignment
  GET  /alignment-projects/{id}/status       poll (READY / COMPLETED | FAILED)
  GET  /models/aligned | /models/{id}        aligned models
  POST /models/{id}/deployment               deploy (async, 5-15 min)
  GET  /models/{id}/deployment/status        UNDEPLOYED | DEPLOYING | DEPLOYED ...
  POST /inference/chat/completions           inference (aligned model id)

The API key lives server-side only (settings.NUGEN_API_KEY), is sent solely
in the Authorization header, and is scrubbed from every error message this
module produces. Nothing here fabricates an id, status or answer: callers get
the provider's real response or a NugenError.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

DEFAULT_TIMEOUT = httpx.Timeout(60.0, connect=10.0)


class NugenError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class NugenNotConfigured(NugenError):
    pass


def _key() -> Optional[str]:
    k = (settings.NUGEN_API_KEY or "").strip()
    return None if not k or k.startswith("your_") or k.startswith("<") else k


def is_configured() -> bool:
    return _key() is not None


class NugenClient:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None,
                 transport: Optional[httpx.BaseTransport] = None):
        self._key = api_key or _key()
        if not self._key:
            raise NugenNotConfigured("NUGEN_API_KEY is not set in /.env.local.")
        self._base = (base_url or settings.NUGEN_API_URL or "https://api.nugen.in/api/v3").rstrip("/")
        self._http = httpx.Client(timeout=DEFAULT_TIMEOUT, transport=transport,
                                  headers={"Authorization": f"Bearer {self._key}"})

    # -- plumbing -----------------------------------------------------------
    def _scrub(self, text: str) -> str:
        return text.replace(self._key, "[redacted]") if self._key else text

    def _request(self, method: str, path: str, **kw) -> Any:
        url = f"{self._base}{path}"
        try:
            res = self._http.request(method, url, **kw)
        except httpx.HTTPError as e:
            raise NugenError(self._scrub(f"Network error calling Nugen {path}: {e.__class__.__name__}")) from None
        if res.status_code >= 400:
            try:
                detail = res.json().get("detail", res.text)
            except Exception:
                detail = res.text
            raise NugenError(self._scrub(f"Nugen {method} {path} -> HTTP {res.status_code}: {str(detail)[:400]}"), res.status_code)
        try:
            return res.json()
        except ValueError:
            raise NugenError(f"Nugen {path} returned a non-JSON response.", res.status_code) from None

    def close(self) -> None:
        self._http.close()

    # -- models -------------------------------------------------------------
    def list_base_models(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self._request("GET", "/models/base", params={"limit": limit}).get("models", [])

    def list_aligned_models(self) -> List[Dict[str, Any]]:
        return self._request("GET", "/models/aligned").get("domain_aligned_models", [])

    def get_model(self, model_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/models/{model_id}")

    def deploy(self, model_id: str) -> Dict[str, Any]:
        return self._request("POST", f"/models/{model_id}/deployment")

    def deployment_status(self, model_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/models/{model_id}/deployment/status")

    # -- documents & benchmarks ---------------------------------------------
    def upload_documents(self, paths: List[Path], categories: Optional[List[str]] = None) -> List[str]:
        files = [("files", (p.name, p.read_bytes(), "text/plain")) for p in paths]
        data = {"categories": categories} if categories else None
        return self._request("POST", "/documents/create", files=files, data=data).get("document_ids", [])

    def document_status(self, document_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/documents/{document_id}/status")

    def create_benchmark(self, document_ids: List[str], num_questions: int = 20) -> Dict[str, Any]:
        return self._request("POST", "/benchmarks/create", json={"document_ids": document_ids, "num_questions": num_questions})

    def benchmark_status(self, benchmark_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/benchmarks/{benchmark_id}/status")

    def benchmark_data(self, benchmark_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/benchmarks/{benchmark_id}/data")

    # -- alignment ------------------------------------------------------------
    def create_alignment(self, name: str, base_model_id: str, document_ids: List[str],
                         benchmark_id: Optional[str] = None, description: str = "") -> Dict[str, Any]:
        body: Dict[str, Any] = {"alignment_name": name, "base_model_id": base_model_id,
                                "document_ids": document_ids, "description": description}
        if benchmark_id:
            body["benchmark_id"] = benchmark_id
        return self._request("POST", "/alignment-projects/create", json=body)

    def alignment_status(self, alignment_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/alignment-projects/{alignment_id}/status")

    # -- inference ------------------------------------------------------------
    def chat(self, model_id: str, messages: List[Dict[str, str]], max_tokens: int = 220,
             temperature: float = 0.2) -> Dict[str, Any]:
        return self._request("POST", "/inference/chat/completions", json={
            "model": model_id, "messages": messages, "max_tokens": max_tokens,
            "temperature": temperature, "stream": False,
        })


def pick_base_model(models: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Chooses an alignment-ready text LLM the account can use now (not
    "available on request" without approval). Prefers the smallest listed,
    since the task is short, grounded explanations. Returns None rather than
    guessing when nothing qualifies.
    """
    usable = [m for m in models
              if m.get("alignment_ready") and (m.get("type") in (None, "llm"))
              and (not m.get("available_on_request") or m.get("access_request_status") in ("APPROVED", "approved"))]
    if not usable:
        return None

    def size(m: Dict[str, Any]) -> float:
        p = str(m.get("parameters") or "").lower().replace("b", "")
        try:
            return float(p)
        except ValueError:
            return 1e9

    return sorted(usable, key=size)[0]
