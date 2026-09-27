"""
Nugen integration tests. The Nugen API is replaced by httpx.MockTransport, so
these never call the real service and never need a key. They check request
shapes against the documented API, key hygiene, honest failure states, and
the grounding guard on aligned-model output.
"""
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

_fd, _db = tempfile.mkstemp(suffix=".db")
os.close(_fd)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_db}")
os.environ["TWILIO_DRY_RUN"] = "true"

import httpx  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.services.nugen import explain as nugen_explain  # noqa: E402
from app.services.nugen.client import NugenClient, NugenError, NugenNotConfigured, pick_base_model  # noqa: E402

KEY = "test-key-SHOULD-NEVER-LEAK-123456"


def client_with(handler):
    return NugenClient(api_key=KEY, base_url="https://api.nugen.in/api/v3", transport=httpx.MockTransport(handler))


class TestClientRequests(unittest.TestCase):
    def test_auth_header_and_documented_paths(self):
        seen = []

        def handler(req: httpx.Request):
            seen.append((req.method, req.url.path, req.headers.get("authorization")))
            if req.url.path.endswith("/models/base"):
                return httpx.Response(200, json={"models": [{"model_id": "m1", "alignment_ready": True, "type": "llm"}]})
            if req.url.path.endswith("/alignment-projects/create"):
                body = json.loads(req.content)
                self.assertEqual(set(body) >= {"alignment_name", "base_model_id", "document_ids"}, True)
                return httpx.Response(200, json={"alignment_id": "alignment_x", "status": "PROCESSING"})
            if req.url.path.endswith("/inference/chat/completions"):
                body = json.loads(req.content)
                self.assertFalse(body["stream"])
                return httpx.Response(200, json={"model": body["model"], "choices": [{"message": {"content": "ok"}}], "confidence_score": 90.1})
            return httpx.Response(404, json={"detail": "nope"})

        c = client_with(handler)
        self.assertEqual(c.list_base_models()[0]["model_id"], "m1")
        self.assertEqual(c.create_alignment("n", "m1", ["d1"], "b1")["alignment_id"], "alignment_x")
        self.assertEqual(c.chat("model_1", [{"role": "user", "content": "hi"}])["confidence_score"], 90.1)
        self.assertEqual([p for _, p, _ in seen], ["/api/v3/models/base", "/api/v3/alignment-projects/create", "/api/v3/inference/chat/completions"])
        self.assertTrue(all(h == f"Bearer {KEY}" for _, _, h in seen))

    def test_upload_is_multipart_text(self):
        def handler(req):
            self.assertIn("multipart/form-data", req.headers["content-type"])
            self.assertIn(b"travel_guardian_weather_safety.txt", req.content)
            return httpx.Response(200, json={"document_ids": ["doc_1"]})
        corpus = Path(__file__).resolve().parents[1] / "nugen" / "corpus" / "travel_guardian_weather_safety.txt"
        self.assertEqual(client_with(handler).upload_documents([corpus]), ["doc_1"])

    def test_errors_never_contain_the_key(self):
        def handler(req):
            return httpx.Response(401, json={"detail": f"invalid token {KEY}"})
        with self.assertRaises(NugenError) as ctx:
            client_with(handler).list_base_models()
        self.assertNotIn(KEY, str(ctx.exception))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_network_error_is_reported_not_swallowed(self):
        def handler(req):
            raise httpx.ConnectError("boom")
        with self.assertRaises(NugenError):
            client_with(handler).list_base_models()

    def test_not_configured(self):
        with patch.object(settings, "NUGEN_API_KEY", None):
            with self.assertRaises(NugenNotConfigured):
                NugenClient()


class TestBaseModelChoice(unittest.TestCase):
    def test_picks_smallest_usable_alignment_ready_llm(self):
        models = [
            {"model_id": "big", "parameters": "70B", "alignment_ready": True, "type": "llm"},
            {"model_id": "small", "parameters": "0.5B", "alignment_ready": True, "type": "llm"},
            {"model_id": "gated", "parameters": "0.1B", "alignment_ready": True, "type": "llm", "available_on_request": True, "access_request_status": None},
            {"model_id": "embed", "parameters": "0.1B", "alignment_ready": True, "type": "embedding"},
            {"model_id": "no", "parameters": "0.2B", "alignment_ready": False, "type": "llm"},
        ]
        self.assertEqual(pick_base_model(models)["model_id"], "small")

    def test_none_when_nothing_qualifies(self):
        self.assertIsNone(pick_base_model([{"model_id": "x", "alignment_ready": False}]))


class TestExplain(unittest.TestCase):
    VERIFIED = "Route weather risk: LOW. Flood exposure: 0 of 10 segments likely (Open-Meteo, LIVE, fetched 06:00 UTC)."
    DATA = {"route_weather_risk": "LOW", "flood_exposure": {"likely": 0, "segments": 10}}

    def _chat_client(self, reply):
        def handler(req):
            return httpx.Response(200, json={"model": "model_al", "choices": [{"message": {"content": reply}}], "confidence_score": 88.0})
        return client_with(handler)

    def test_grounded_reply_ok(self):
        with patch.object(settings, "NUGEN_ALIGNED_MODEL_ID", "model_al"):
            r = nugen_explain.explain("weather?", self.VERIFIED, self.DATA, client=self._chat_client(
                "Open-Meteo data fetched at 06:00 UTC shows low weather risk, and none of the 10 segments is likely to flood."))
        self.assertEqual(r["status"], "OK")
        self.assertEqual(r["confidence_score"], 88.0)

    def test_embellished_reply_rejected(self):
        with patch.object(settings, "NUGEN_ALIGNED_MODEL_ID", "model_al"):
            r = nugen_explain.explain("weather?", self.VERIFIED, self.DATA, client=self._chat_client(
                "Low risk, but police have closed the highway and expect a 45 minute delay."))
        self.assertEqual(r["status"], "REJECTED")
        self.assertNotIn("text", r)

    def test_unavailable_without_key_or_model(self):
        with patch.object(settings, "NUGEN_API_KEY", None):
            self.assertEqual(nugen_explain.explain("q", "a", {})["status"], "UNAVAILABLE")
        with patch.object(settings, "NUGEN_API_KEY", KEY), patch.object(settings, "NUGEN_ALIGNED_MODEL_ID", None):
            r = nugen_explain.explain("q", "a", {})
        self.assertEqual(r["status"], "UNAVAILABLE")
        self.assertIn("aligned model", r["reason"])

    def test_provider_error_is_unavailable_with_reason(self):
        def handler(req):
            return httpx.Response(400, json={"detail": "model not deployed"})
        with patch.object(settings, "NUGEN_ALIGNED_MODEL_ID", "model_al"):
            r = nugen_explain.explain("q", self.VERIFIED, self.DATA, client=client_with(handler))
        self.assertEqual(r["status"], "UNAVAILABLE")
        self.assertIn("not deployed", r["reason"])


class TestApi(unittest.TestCase):
    def test_status_never_returns_key(self):
        with patch.object(settings, "NUGEN_API_KEY", KEY), patch.object(settings, "NUGEN_ALIGNED_MODEL_ID", None):
            body = TestClient(app).get("/api/nugen/status").json()
        self.assertTrue(body["api_key_configured"])
        self.assertFalse(body["ready_for_inference"])
        self.assertNotIn(KEY, json.dumps(body))

    def test_explain_endpoint_unavailable_when_unconfigured(self):
        with patch.object(settings, "NUGEN_API_KEY", None):
            res = TestClient(app).post("/api/nugen/explain", json={"question": "q", "verified_answer": "a", "data": {}})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
