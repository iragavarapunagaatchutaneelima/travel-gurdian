# Nugen Integration (Midnight Task 2)

**Status: implemented and unit-tested; not yet run against the live Nugen API,
because `NUGEN_API_KEY` is not configured.** No Nugen ID, status, score or
answer appears anywhere in this repository until a real run produces it. The
"Recorded run" section below stays empty until then.

## What the aligned model does

AI Guardian computes weather, flood and route-safety facts deterministically
(the Digital Twin: Open-Meteo, GloFAS, GDACS). The Nugen aligned model is
used only to **explain** those verified answers in plain language:

```
question ─► grounded answer (Digital Twin data, deterministic)
               │
               ├─► POST /api/nugen/explain ─► Nugen chat/completions (aligned model)
               │         │
               │         └─► backend grounding_check: rejects added numbers,
               │             unsupported claims (closures, police, "alert sent",
               │             112...), padding
               ▼
   OK       → the Nugen text is shown, labelled `nugen-aligned:<model_id> (confidence N)`
   REJECTED → the verified text is shown, plus an amber "reply discarded (reason)" note
   UNAVAILABLE → the verified text is shown (a note appears only if Nugen is configured but failing)
```

The model never decides whether a route is safe, never invents a place or a
number, and never claims an alert was sent. The verified answer is always
the fallback.

## Workflow (official Nugen API v3)

Implemented in `backend/app/services/nugen/client.py`, driven by
`backend/scripts/nugen_workflow.py`. Endpoints follow the Nugen API reference
(docs.nugen.in) and the nugen-cookbook alignment guide.

| Step | Command | API |
|---|---|---|
| 1. Discover base model | `nugen_workflow.py discover` | `GET /api/v3/models/base` → an alignment-ready LLM the account can use (`alignment_ready`, not gated), smallest first |
| 2. Upload corpus | `upload` | `POST /api/v3/documents/create` (multipart, text) → poll `GET /documents/{id}/status` until `READY` |
| 3. Benchmark | `benchmark` | `POST /api/v3/benchmarks/create` (20 questions) → poll `/benchmarks/{id}/status` → `/data` saved to `backend/nugen/benchmark_generated.json` for review |
| 4. Align | `align` | `POST /api/v3/alignment-projects/create` → poll `/alignment-projects/{id}/status` until `READY`/`COMPLETED` (the docs use both) → aligned `model_id` |
| 5. Deploy | `deploy` | `POST /api/v3/models/{model_id}/deployment` → poll `/deployment/status` until `DEPLOYED` (the docs say 5–15 min; a failure settles back to `UNDEPLOYED` with `error`) |
| 6. Inference | `infer` | `POST /api/v3/inference/chat/completions` (`stream: false`) with a grounded test prompt; records the reply, `confidence_score`, usage and the grounding-check result |

Each step is resumable: re-running skips work whose real ID is already
recorded in `backend/nugen_state.json` (git-ignored). `all` runs every step
in order. Without a key, the script exits with `Blocked: NUGEN_API_KEY is not
set…` and calls nothing.

### Corpus
`backend/nugen/corpus/travel_guardian_weather_safety.txt`. It is plain text
(the developer edition accepts text only) and was **authored by the project
team from the app's own documented rules**: rain classes, exposure rules, FHWA
delay method, readiness, uncertainty and safety rules, plus illustrative
explanation examples. It is labelled in the file as *not real incident data
and not an official forecast*.

## Running it (manual step for the maintainer)

1. Create a key at https://platform.nugen.in. Add it **only** to the root
   `/.env.local` as `NUGEN_API_KEY=...`. Never commit it or paste it into chat.
2. `node scripts/check-env.mjs` should show `NUGEN_API_KEY … CONFIGURED`.
3. From `backend/`: `venv/Scripts/python scripts/nugen_workflow.py all`.
   Alignment can take hours; if it stops on a timeout, re-run the same
   command to resume.
4. Copy the printed `NUGEN_BASE_MODEL_ID` and `NUGEN_ALIGNED_MODEL_ID` into
   `/.env.local`, restart the backend, and check that
   `GET /api/nugen/status` reports `ready_for_inference: true`.
5. Ask AI Guardian a weather question with a journey selected. The header
   shows `nugen-aligned:<id>`.
6. Fill in the "Recorded run" table below from `nugen_workflow.py status`.

## Security

- The key is read server-side from settings. It is sent only as
  `Authorization: Bearer …` to `api.nugen.in`, and it is scrubbed from every
  error message (tested).
- `GET /api/nugen/status` returns booleans and model IDs, never the key
  (tested).
- The frontend never talks to Nugen directly. `/api/ai` calls the backend's
  `/nugen/explain`. `scripts/check-secret-exposure.mjs` covers `NUGEN_API_KEY`.

## Tests

`backend/tests/test_nugen.py` (13, Nugen mocked with `httpx.MockTransport`):
documented paths and Bearer header; multipart corpus upload; key never in
errors; network errors surfaced; base-model choice; explainer OK / REJECTED /
UNAVAILABLE (no key, no model, provider error); status endpoint hides the key.
`frontend/src/scripts/testGroundedAnswers.ts`: explainer request shape and
failure handling.

## Recorded run

| Item | Value |
|---|---|
| Base model | *not yet run* |
| Document ID | *not yet run* |
| Benchmark ID / questions | *not yet run* |
| Alignment ID / final status | *not yet run* |
| Aligned model ID | *not yet run* |
| Deployment status | *not yet run* |
| Test inference (reply, confidence, grounding check) | *not yet run* |
