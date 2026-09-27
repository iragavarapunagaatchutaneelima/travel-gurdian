"""
Nugen alignment workflow (Midnight Task 2), run step by step against the
REAL Nugen API. Every id and status written to nugen_state.json comes from an
actual API response; nothing is invented. The API key is read from /.env.local
via app settings and is never printed or written anywhere.

Usage (from backend/):
  venv/Scripts/python scripts/nugen_workflow.py status
  venv/Scripts/python scripts/nugen_workflow.py discover        # GET /models/base, pick alignment-ready model
  venv/Scripts/python scripts/nugen_workflow.py upload          # upload corpus, poll document status
  venv/Scripts/python scripts/nugen_workflow.py benchmark       # generate benchmark, poll
  venv/Scripts/python scripts/nugen_workflow.py align           # create alignment project, poll
  venv/Scripts/python scripts/nugen_workflow.py deploy          # deploy aligned model, poll
  venv/Scripts/python scripts/nugen_workflow.py infer           # grounded test inference
  venv/Scripts/python scripts/nugen_workflow.py all             # every step in order (resumes)

Each step is resumable: it skips work whose real id is already recorded.
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.services.nugen.client import NugenClient, NugenError, NugenNotConfigured, pick_base_model  # noqa: E402
from app.services.nugen.explain import SYSTEM_PROMPT, grounding_check  # noqa: E402

STATE = BACKEND / "nugen_state.json"
CORPUS = BACKEND / "nugen" / "corpus" / "travel_guardian_weather_safety.txt"
DONE_ALIGN = {"READY", "COMPLETED"}  # cookbook uses READY, API reference COMPLETED


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load() -> dict:
    return json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}


def save(state: dict) -> None:
    STATE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def poll(fn, done, failed, label: str, interval: int, timeout_s: int) -> dict:
    t0 = time.time()
    while True:
        res = fn()
        status = str(res.get("status", "")).upper()
        print(f"  [{now()}] {label}: {status or res}")
        if status in done:
            return res
        if status in failed or res.get("error"):
            raise NugenError(f"{label} ended with {status}: {res.get('error') or res.get('reason') or res}")
        if time.time() - t0 > timeout_s:
            raise NugenError(f"{label} still {status} after {timeout_s}s; re-run this step later to resume.")
        time.sleep(interval)


def step_discover(c: NugenClient, s: dict) -> None:
    models = c.list_base_models()
    s["base_models_seen"] = [{k: m.get(k) for k in ("model_id", "model_name", "parameters", "alignment_ready", "available_on_request", "access_request_status", "type")} for m in models]
    chosen = pick_base_model(models)
    if not chosen:
        raise NugenError("No alignment-ready base model is available to this account (see base_models_seen in nugen_state.json).")
    s["base_model"] = {"model_id": chosen["model_id"], "model_name": chosen.get("model_name"), "parameters": chosen.get("parameters"), "chosen_at": now()}
    print(f"  chosen base model: {chosen['model_id']} ({chosen.get('model_name')}, {chosen.get('parameters')})")


def step_upload(c: NugenClient, s: dict) -> None:
    if not s.get("document_id"):
        ids = c.upload_documents([CORPUS], categories=["travel-safety"])
        if not ids:
            raise NugenError("Upload returned no document ids.")
        s["document_id"] = ids[0]
        s["document_uploaded_at"] = now()
        save(s)
        print(f"  document_id: {ids[0]}")
    res = poll(lambda: c.document_status(s["document_id"]), {"READY", "COMPLETED"}, {"FAILED", "ERROR"}, "document", 10, 1800)
    s["document_status"] = res.get("status")


def step_benchmark(c: NugenClient, s: dict) -> None:
    if not s.get("benchmark_id"):
        res = c.create_benchmark([s["document_id"]], num_questions=20)
        s["benchmark_id"] = res["benchmark_id"]
        s["benchmark_created_at"] = now()
        save(s)
        print(f"  benchmark_id: {s['benchmark_id']}")
    res = poll(lambda: c.benchmark_status(s["benchmark_id"]), {"READY", "COMPLETED"}, {"FAILED", "ERROR"}, "benchmark", 15, 3600)
    s["benchmark_status"] = res.get("status")
    data = c.benchmark_data(s["benchmark_id"])
    qs = data.get("questions") or []
    s["benchmark_question_count"] = len(qs)
    (BACKEND / "nugen" / "benchmark_generated.json").write_text(json.dumps(qs, indent=2), encoding="utf-8")
    print(f"  {len(qs)} generated benchmark questions saved to nugen/benchmark_generated.json (review them).")


def step_align(c: NugenClient, s: dict) -> None:
    if not s.get("alignment_id"):
        res = c.create_alignment(
            "Travel Guardian weather-safety explainer",
            s["base_model"]["model_id"], [s["document_id"]], s.get("benchmark_id"),
            "Explains Travel Guardian's verified Digital Twin weather, flood and route-safety outputs without adding facts.",
        )
        s["alignment_id"] = res["alignment_id"]
        s["alignment_created_at"] = now()
        save(s)
        print(f"  alignment_id: {s['alignment_id']}")
    res = poll(lambda: c.alignment_status(s["alignment_id"]), DONE_ALIGN, {"FAILED", "ERROR"}, "alignment", 60, 6 * 3600)
    s["alignment_status"] = res.get("status")
    model_id = res.get("model_id")
    if not model_id:
        aligned = c.list_aligned_models()
        match = [m for m in aligned if m.get("alignment_id") == s["alignment_id"]] or aligned[:1]
        model_id = match[0]["model_id"] if match else None
    if not model_id:
        raise NugenError("Alignment finished but no aligned model id was returned.")
    s["aligned_model_id"] = model_id
    print(f"  aligned model id: {model_id}")


def step_deploy(c: NugenClient, s: dict) -> None:
    mid = s["aligned_model_id"]
    current = c.deployment_status(mid)
    if str(current.get("status")).upper() not in ("DEPLOYED", "DEPLOYING"):
        c.deploy(mid)
        s["deploy_requested_at"] = now()
        save(s)
    res = poll(lambda: c.deployment_status(mid), {"DEPLOYED"}, set(), "deployment", 30, 3600)
    s["deployment_status"] = res.get("status")
    s["deployed_at"] = res.get("completed_at") or now()


def step_infer(c: NugenClient, s: dict) -> None:
    verified = ("Live weather along your route (Open-Meteo, LIVE, fetched 06:00 UTC): rainfall 0-1.2 mm/h. "
                "Route weather risk: LOW. Flood/waterlogging exposure: 0 of 10 segments likely.")
    data = {"route_weather_risk": "LOW", "rainfall_mm_h_range": [0, 1.2], "weather_source": "Open-Meteo", "flood_exposure": {"likely": 0, "segments": 10}}
    res = c.chat(s["aligned_model_id"], [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"QUESTION: How will the weather affect my journey?\n\nVERIFIED ANSWER: {verified}\n\nDATA: {json.dumps(data)}"},
    ])
    text = ((res.get("choices") or [{}])[0].get("message") or {}).get("content", "")
    s["test_inference"] = {
        "at": now(), "model": res.get("model"), "response_id": res.get("id"),
        "confidence_score": res.get("confidence_score"), "usage": res.get("usage"),
        "reply": text, "grounding_check": grounding_check(text, verified, data) or "PASSED",
    }
    print(json.dumps(s["test_inference"], indent=2))


STEPS = {"discover": step_discover, "upload": step_upload, "benchmark": step_benchmark,
         "align": step_align, "deploy": step_deploy, "infer": step_infer}


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    state = load()
    if cmd == "status":
        print(json.dumps({k: v for k, v in state.items() if k != "base_models_seen"}, indent=2) if state else "No Nugen workflow state yet.")
        return 0
    try:
        client = NugenClient()
    except NugenNotConfigured as e:
        print(f"Blocked: {e} Add NUGEN_API_KEY to /.env.local (never paste it into chat or commit it).")
        return 2
    order = list(STEPS) if cmd == "all" else [cmd]
    if any(o not in STEPS for o in order):
        print(__doc__)
        return 1
    try:
        for name in order:
            print(f"== {name}")
            STEPS[name](client, state)
            save(state)
    except NugenError as e:
        save(state)
        print(f"Stopped at {name}: {e}")
        return 1
    finally:
        client.close()
    print("\nDone. Put the recorded ids into /.env.local:")
    if state.get("base_model"):
        print(f"  NUGEN_BASE_MODEL_ID={state['base_model']['model_id']}")
    if state.get("aligned_model_id"):
        print(f"  NUGEN_ALIGNED_MODEL_ID={state['aligned_model_id']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
