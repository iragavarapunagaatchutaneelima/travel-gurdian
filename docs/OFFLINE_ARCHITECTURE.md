# Offline Architecture

Travel Guardian keeps working when the connection drops, **with only data that
was actually downloaded**. Nothing offline is invented. Anything that needs a
server (live routing, traffic, Places search, the Digital Twin, Twilio alerts)
is labelled unavailable offline instead of being faked.

Verified on 2026-09-27 with a real Hyderabad → Mumbai pack (705.5 km, 135
turns, 26 safe havens, 1,145 tiles, 13.7 MB).

---

## 1. Components

| Concern | Implementation | File(s) |
|---|---|---|
| App shell offline | Service worker: precaches 10 app routes + manifest + icons; network-first navigations with cache fallback; cache-first static assets; **never intercepts cross-origin requests** | `public/sw.js`, `hooks/usePwaManager.ts` |
| Offline storage | IndexedDB `TravelGuardianOfflineDB` v3: `offline_corridor_packs` (keyPath `packId`) and `offline_map_tiles` (keyPath `id`) | `services/offlineStorageService.ts` |
| Map tiles | Real MVT tiles fetched by HTTP range requests from Protomaps' public OSM PMTiles archive (`build.protomaps.com/20230925.pmtiles`) | `services/realVectorTiles.ts`, `services/offlineTileService.ts` |
| Tile selection | Route-following corridor: route densified, tiles within ±8 km at zoom 10–13, capped at 1,200 | `services/vectorTileMath.ts` |
| Offline map | MapLibre GL JS + custom `tg-offline://<packId>/{z}/{x}/{y}.mvt` protocol reading IndexedDB; Protomaps basemap style; self-hosted worker (`public/maplibre-gl-worker.mjs`, `maplibre-gl-shared.mjs`) | `services/offlineMapProtocol.ts`, `components/OfflineMapView.tsx` |
| Route, turns, havens | The real planned route (Google geometry, Directions steps, Places POIs) handed off via `sessionStorage['tg_offline_source_route']` from Plan Journey | `app/plan/page.tsx`, `app/offline/page.tsx` |
| Survival Card | Turns, safe havens, 112/1091, device-cached trusted contact, PDF export | `components/OfflineSurvivalCard.tsx`, `services/survivalPdfGenerator.ts` |
| Offline AI | Deterministic grounded engine (always available) + optional WebLLM on WebGPU | `services/offlineAI.ts`, `services/webllmEngine.ts`, `components/OfflineAIChat.tsx` |
| Online/offline switching | `online`/`offline` events + `navigator.onLine`; Live Map swaps Google Maps for the MapLibre pack map | `hooks/useOfflineStatus.ts`, `app/map/page.tsx`, `components/OfflineBootStatus.tsx` |

**Not used, by design:** Google Maps tiles are never cached (Google's terms
forbid it, and the service worker ignores all cross-origin requests). There is
no Mapbox dependency.

---

## 2. Download flow

1. **Plan Journey** computes real routes (Google). On a route card, the user
   taps **Download Offline Pack**, which stores the route in sessionStorage and
   opens `/offline`.
2. `/offline` offers a download **only when a real route was handed off**.
   There is no default journey and no synthetic route.
3. `downloadCorridorMapPack()`:
   - checks the PMTiles source is reachable (fails honestly otherwise);
   - computes the corridor tiles, then fetches them in batches of 16 with
     progress (`n / total`, unavailable count);
   - **Cancel** is checked between batches. Tiles are written to IndexedDB only
     after fetching completes, so a cancelled download stores nothing
     (verified: pack and tile counts unchanged);
   - status is `READY`, `PARTIAL` (some tiles missing or cap reached, with the
     reason) or `FAILED`. A failed pack is not saved.
4. The pack record stores turns from the real Directions steps and safe havens
   from the real Places POIs. If either is missing, it stays empty rather than
   being padded.
5. Sizes shown are **measured**: the sum of stored tile bytes plus the pack
   records. (Previously an assumed 2.5 KB per tile under-reported about 6x, and
   tiles were double-counted.) Verified: 15.3 MB shown vs the browser's
   IndexedDB usage of 16.7 MB.
6. Packs can be deleted along with their tiles, and a failed download can be
   retried.

## 3. Offline use

- **Live Map (`/map`):** on `offline` it overlays the active pack on the
  MapLibre map, states what is unavailable offline and that route
  recalculation isn't possible, and links to the Survival Card. With no pack it
  says the live map needs a connection. The bottom nav (with **SOS**) always
  stays on top, covered by an E2E test. Reconnecting restores Google Maps.
- **Offline hub (`/offline-mode`):** the offline map (anchored `#offline-map`)
  with notes on zoom coverage and rerouting; the Survival Card; the offline AI
  chat; and emergency calling. Calling 112 works on voice signal without data.
- **Survival Card:** overview (distance, cached duration, Safety Fit at
  download time, when it was stored); the turn list; safe havens ("cached
  coordinates; availability cannot be verified offline"); and 112 / 1091 plus
  the device-cached trusted contact. Calls are manual only, and it states that
  automatic alerts need a connection.
- **Safety Check offline:** the backend enforces the timer. Offline, the app
  says escalation can't be sent until the backend is reachable. It never
  pretends an alert was delivered.

## 4. Offline AI

1. **Intent → tool:** the prompt is mapped to a read-only tool (route summary,
   safety, check-in, map state, ETA, nearby cached place). `executeToolCall()`
   runs against the pack and GPS only.
2. **Deterministic reply** from that data. This is always available, instant,
   and needs no GPU.
3. **Optional on-device LLM** (`Qwen2.5-0.5B-Instruct-q4f16_1-MLC` via WebLLM,
   about 280 MB):
   - downloaded **only when the user taps Download**, with progress; loads from
     Cache Storage afterwards (~2 s, no network); can be removed;
   - used only once loaded, so a question never waits on a download;
   - it only **rephrases the verified answer**. `checkLlmReplyGrounded()`
     rejects replies containing numbers or risk/service terms absent from the
     data, or noticeably longer than the verified answer. Rejected replies fall
     back to the deterministic text, and the UI says why.
   - Live result: the 0.5B model embellished on its first use (an invented
     "≈436 miles", traffic claims). With the guard, 2 of 3 replies were
     rejected and 1 faithful rephrase was accepted.
4. Every reply is labelled *on-device LLM (grounding-checked)* or
   *deterministic offline engine*.
5. Without WebGPU, the deterministic engine answers everything, and the UI says
   so.

CSP allowances for the model: `connect-src` includes `huggingface.co`,
`*.huggingface.co`, `*.hf.co` (weights) and `raw.githubusercontent.com`
(model library WASM).

## 5. Service worker behaviour

- Precaches `/`, `/dashboard`, `/plan`, `/map`, `/emergency`, `/safety-check`,
  `/offline`, `/offline-mode`, `/assist`, `/settings`, the manifest and icons.
- Navigations are network-first. Offline, they fall back to the cached page,
  then `/offline-mode`, then `/`, then a minimal inline offline page.
- `/api/*` (Next.js routes such as AI Guardian): network only. Offline, it
  returns an explicit 503 JSON (`"Operating in truthful offline mode"`).
- `/backend-api/*` (FastAPI proxy): network-first, and responses are never
  written to any cache. Offline, the request fails, and each page shows its own
  "unavailable" state. API responses and tokens are never cached.
- Cross-origin requests are never intercepted. (That fixed broken Google Maps
  tiles, where cancelled tile requests had been turned into synthetic 408
  images.)
- In local dev, `/_next/` is bypassed to avoid stale Turbopack modules, so a
  dev-mode offline reload renders server HTML without client JS. A production
  build caches its static chunks.
- **Update behaviour:** the page reloads only when an *existing* worker is
  replaced by an update. The first install no longer reloads the page (that had
  wiped in-progress UI a few seconds after a first visit).

## 6. Tests

| What | Where |
|---|---|
| Corridor tile math, cap, zoom bounds | `src/scripts/testOfflineVectorTiles.ts` (32) |
| Offline tools, anti-fabrication, prompt sanitising, LLM grounding guard | `src/scripts/testOfflineGuardian.ts` (30) |
| SW offline reload, reconnect, hard reload, no cross-origin interception | `e2e/05-pwa-and-network.spec.ts` |
| Live Map offline switch + SOS reachability | `e2e/05-pwa-and-network.spec.ts` (scenario 39) |
| Download (real tiles), offline map render, WebLLM on real WebGPU, cancel | Manual, recorded in `docs/E2E_STATUS.md` (24–28) |

## 7. Limitations

- **Zoom 10–13 only, along the corridor.** Street-level detail (z14+) isn't
  downloaded; zoomed out to the whole route, the basemap is blank (the UI says
  so).
- **Basemap snapshot:** the public Protomaps build is dated 2023-09-25.
  Newer roads may be missing.
- **No offline rerouting.** Routing needs Google; the app says to return to
  the route or reconnect.
- **Safe havens are a snapshot** of Google Places results at planning time,
  and opening hours or availability can't be checked offline.
- **The on-device LLM is small.** It is useful for phrasing; facts always come
  from the deterministic layer, and the guard is heuristic (numbers, a risk
  lexicon, length). It is not a proof.
- **Trusted contact offline** is the device's last-synced copy.
- **Android/PWA:** installable manifest and service worker are in place;
  WebGPU availability varies by device, and the deterministic engine covers
  devices without it.
