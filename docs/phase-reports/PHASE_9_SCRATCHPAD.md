# TRAVEL GUARDIAN — PHASE 9 ENGINEERING SCRATCHPAD
**Project:** Travel Guardian  
**Phase:** 9 — Advanced Offline Maps & Vector Corridors  
**Started:** September 21, 2026  
**Status:** COMPLETED & PRODUCTION AUDITED

---

## [BASELINE]
- **Project Structure:** Next.js 16.3.3, React 19.2.8, TypeScript 5, Tailwind CSS v4, Mapbox GL JS 3.0.0
- **Package Manager:** npm (with lockfile `package-lock.json`)
- **Map Engine:** Mapbox GL JS with GeoJSON routes, live user marker, safety POIs, and custom layer toggles.
- **Offline Engine (Phase 7):** IndexedDB (`TravelGuardianOfflineDB`) with `offline_corridor_packs` store, `useOfflineStatus` hook, `OfflineSurvivalCard`, `survivalPdfGenerator`, deterministic `offlineIntentEngine`.
- **PWA / Hardening (Phase 8):** `manifest.json`, `sw.js` (Cache Version: `travel-guardian-v8`), `usePwaManager`, `OfflineBootStatus`, `ErrorBoundary`, strict security headers (CSP), and secret isolation.
- **AI Integration (Phase 6):** Server-side `/api/ai/route.ts`, `geminiToolRouter.ts` with strict allowlisted tools.

---

## [DISCOVERED]
- **Storage Constraints:** Unrestricted vector tile downloads could quickly overwhelm browser IndexedDB quotas. Vector corridors MUST be bounded tightly around the route polyline with lateral padding ($\pm 8\text{ km}$) and practical zoom range (z10 to z13).
- **Service Worker / IndexedDB Separation:** Service Worker CacheStorage is for static app shell and code. IndexedDB is authoritative for vector tile data and corridor packs.
- **Mapbox Fallback:** When running offline, map renderer renders cached vector features and GeoJSON corridor geometry without crashing.
- **Truthful Provenance:** If map tiles or route geometry are loaded from offline cache, the UI explicitly displays `CACHED` with timestamp, never claiming live road conditions.

---

## [IMPLEMENTED]
- [x] 1. Vector tile coordinate calculation & corridor bounding geometry math (`vectorTileMath.ts`).
- [x] 2. IndexedDB vector tile store extension (`offlineTileService.ts` / `offlineStorageService.ts`).
- [x] 3. Bounded vector corridor download engine with progress phases, quota limits, and atomic validation.
- [x] 4. Mapbox GL offline vector corridor integration and fallback renderer.
- [x] 5. Offline Map Pack Manager UI with download progress, tile counts, pack sizes, and deletion.
- [x] 6. Gemini tool allowlist extension for offline map state (`readOfflineMapState`).
- [x] 7. Phase 9 automated test suite (`testOfflineVectorTiles.ts`).
- [x] 8. Browser QA, AI simulation, and visual verification.

---

## [TESTED]
- `testOfflineVectorTiles.ts`: 32/32 PASS
- `testProductionHardening.ts`: 35/35 PASS
- `testOfflineGuardian.ts`: 24/24 PASS
- `testGeminiTools.ts`: 37/37 PASS
- `testSafetyCheckIn.ts`: 24/24 PASS
- `testNavigation.ts`: 20/20 PASS
- `npx tsc --noEmit`: 0 errors (PASS)
- `npm run build`: PASS (20/20 routes compiled in 1.35s)
- Localhost QA on `http://localhost:3000`: PASS (0 console errors, 0 blank screens)
- AI Simulation Query Flow: PASS (readOfflineMapState, truthful offline reroute rejection, prompt injection sanitized)

---

## [FIXED]
- **Issue 1:** TypeScript type definitions for vector corridor packs. Fixed by updating `frontend/src/types/offline.ts` with `VectorTileCoordinate`, `OfflineMapTile`, `VectorCorridorBounds`, `OfflineMapPackMetadata`.
- **Issue 2:** AI router missing offline map coverage tool. Fixed by declaring `readOfflineMapState` in `types/gemini.ts` and implementing deterministic execution in `geminiToolRouter.ts` and `api/ai/route.ts`.
- **Issue 3:** Cascade deletion of vector tiles upon pack removal. Fixed by linking `deleteOfflineTilesForPack` inside `deleteOfflinePack`.
