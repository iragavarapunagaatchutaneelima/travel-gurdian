# E2E Test Status — 32 Mentor Scenarios

Run with:
```bash
# terminal 1
cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# terminal 2
cd frontend && npm run dev
# terminal 3
cd frontend && npm run test:e2e
```

Real browser E2E tests (Playwright + Chromium) live in `frontend/e2e/`. This
table maps each of the 32 mentor-specified scenarios to its actual status —
`PASS`, `BLOCKED` (feature doesn't exist yet), or `NOT TESTED` (real
infrastructure this repo can't provide). Nothing here is claimed done that
wasn't actually run.

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | Dashboard | **PASS** | `e2e/01-dashboard-and-plan.spec.ts` — verifies real status overview, confirms the old fabricated "Live Conditions" panel is gone |
| 2 | Plan Journey | **PASS** | Form loads with all fields |
| 3 | Two-wheeler route | **PASS** | Verified TWO_WHEELER (not BICYCLING) via `/api/routes/compute` |
| 4 | Car route | **PASS** | |
| 5 | Walk route | **PASS** | |
| 6 | Maximum two route cards | **PASS** | |
| 7 | Near-duplicate routes removed | **PASS** | Covered by the same corridor-overlap-analysis test; also verified manually (Hyderabad→Mumbai gave 2 routes ~29km apart via different highways) |
| 8 | Route scores truthful | **PASS** | Score is a real 0-100 number from the deterministic safety engine, not a fixed banner |
| 9 | Map load | **PASS** | |
| 10 | Map zoom | **PASS** | Regression test for the service-worker cross-origin bug fixed this session |
| 11 | Broken image absent | **PASS** | Same test asserts zero `naturalWidth===0` images after repeated zoom |
| 12 | GPS permission (granted) | **PASS** | |
| 13 | GPS permission (denied) | **PASS** | App doesn't crash or fabricate a position |
| 14 | Live navigation | **PASS** | `e2e/06-navigation.spec.ts` — Start Live Navigation transitions cleanly |
| 15 | Off-route detection | **NOT TESTED** | Needs a scripted multi-point GPS feed over time; Playwright's `setGeolocation` only sets one fixed point per call. Covered instead by the distance-threshold unit tests in `testProductionHardening.ts` ("150m distance with 15m accuracy IS off route") |
| 16 | AI location | **PASS** | `e2e/03-ai-guardian.spec.ts` — "where am I" grounded in real GPS context, honest when unavailable |
| 17 | AI nearby search | **PASS** | Requires real location, never invents a place |
| 18 | Safety Check | **PASS** | Dedicated `/safety-check` page |
| 19 | Safety Check demo | **PASS** | New this session (`SafetyCheckDemoMode.tsx`) — 30s simulation, never dispatches real alerts |
| 20 | Trusted contact | **PASS** | Fetched from backend; confirmed no hardcoded "Sarah Miller" demo data anywhere |
| 21 | Twilio dry-run | **PASS** | Validates without requiring real credentials |
| 22 | Twilio trial error | **NOT TESTED** | Requires a real Twilio trial account and an unverified recipient number, which this repo cannot provide. `TwilioProvider`'s HTTP 21608 error mapping is covered by `backend/tests/test_sos_audit_scenarios.py::test_scenario_07_twilio_api_failure` instead |
| 23 | 112 safety lock | **PASS** | Confirmed locked by default (zero `tel:112` links in the DOM until explicit multi-step activation). Test deliberately stops short of the app's own "DO NOT dial 112 during automated tests" confirmation step |
| 24 | Offline pack download | **PASS** | Verified manually end-to-end: downloads 1200 real MVT vector tiles (~17MB) from Protomaps' public OSM PMTiles archive via HTTP range requests, plus real turn instructions (135) and real Google Places safe havens (26) from the actual planned route — not the previous fabricated placeholder data. See "Offline map engine" note below |
| 25 | Offline map | **PARTIAL** | Real tiles download and store correctly (scenario 24). MapLibre GL JS renders the map container and controls, but vector layers don't paint — MapLibre's tile-parsing web worker fails to load under Next.js/Turbopack's bundler even after pointing `workerUrl`/`config.WORKER_URL` at a self-hosted static copy. Root-caused to the bundler integration, not the data pipeline; not resolved in this pass |
| 26 | Offline POIs | **PASS** | Real Google Places POIs from the actual route are now stored as safe havens (see scenario 24) — no longer the fabricated "Apollo Emergency Care" placeholder |
| 27 | Offline Survival Card | **PASS** (smoke only) | Page reachable and marks itself as offline data |
| 28 | Offline AI | **PARTIAL** | Full grounded architecture built and verified: intent detection → `executeToolCall()` against real offline pack data → deterministic reply, with WebLLM (WebGPU) attempted first and falling back honestly. Verified live: "give me the route summary" correctly answered "Cached route: Optimal Safety Corridor (705.5 km, est. 13h 30m)" from real downloaded data, labeled "Answered by deterministic offline engine". WebGPU reports present in this environment but actual on-device model download/inference wasn't verified to complete (large model download, no way to confirm real GPU acceleration in this sandbox) — falls through safely to the deterministic engine either way, which is the correct, safety-preserving behavior |
| 29 | Network disconnect | **PASS** | `e2e/05-pwa-and-network.spec.ts` — real `context.setOffline(true)`, waits for genuine SW activation first |
| 30 | Network reconnect | **PASS** | |
| 31 | PWA reload | **PASS** | SW survives hard reload |
| 32 | Production build | **PASS** | `npm run build` succeeds — run manually, not part of the Playwright suite (see below) |

## Known flakiness

Two tests (two-wheeler routing, network-disconnect) occasionally fail on
the first attempt when run as part of the full suite but pass reliably
(3/3) in isolation. Root-caused to real Google Routes API latency and
service-worker activation timing under sequential full-browser-process load
— not application bugs. `playwright.config.ts` sets `retries: 2` to absorb
this, matching how any suite exercising live third-party APIs and a real
SW lifecycle behaves under CI-style load.

## Offline map engine (scenarios 24-26)

The previous implementation of the entire offline-download pipeline was a
complete simulation: `downloadCorridorMapPack()` never made a network call
at all, storing a synthetic `{z,x,y,packId,cachedAt}` JSON blob per tile and
labeling the result `provenance: "CACHED"` / `status: "READY"` regardless.
Turn instructions and safe havens were hardcoded fabricated strings (e.g.
"Apollo Emergency Care", phone "044-28290200") reused for every corridor,
disconnected from the route the user actually planned.

This is now real:
- **Map tiles**: `services/realVectorTiles.ts` fetches genuine MVT (vector
  tile) bytes via HTTP range requests from Protomaps' publicly hosted,
  OpenStreetMap-derived PMTiles archive (`build.protomaps.com`, MIT/ODbL
  planetiler build). A tile that fails to fetch is simply not stored — the
  pack is marked `PARTIAL`/`FAILED` honestly rather than padded out.
- **Turn instructions & safe havens**: the Plan Journey page now hands off
  the actual computed route (real Google Directions steps, real Google
  Places POIs) via `sessionStorage` when the user taps "Download Offline
  Pack", instead of the offline page silently regenerating an unrelated
  synthetic route.
- **Rendering**: `OfflineMapView.tsx` (MapLibre GL JS + a custom
  `tg-offline://` protocol reading tiles straight out of IndexedDB) is
  wired into `/offline-mode`. The map initializes and its controls render,
  but the vector layers don't currently paint: MapLibre's tile-parsing web
  worker fails to load under this Next.js/Turbopack bundler setup, even
  after pointing `maplibregl.config.WORKER_URL` at a self-hosted static
  copy of the worker script. This is a bundler-integration issue, not a
  data problem — real tiles are confirmed present and byte-correct in
  IndexedDB — and is left as a known, documented gap rather than papered
  over.
- **No Google tile caching, no Mapbox**: confirmed — this system is fully
  independent of `googleRoutes.ts`/the Google Maps JS SDK.

## What's real vs asserted here

Every `PASS` above was actually executed against real running frontend +
backend servers with real Google Maps/Places/Directions calls (dry-run
Twilio, no real SMS/calls). Nothing was mocked to make a scenario appear to
pass unless explicitly noted (Twilio dry-run is intentionally simulated by
design, not a test shortcut).
