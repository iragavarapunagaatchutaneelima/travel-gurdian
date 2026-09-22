# TRAVEL GUARDIAN — PHASE 6 NEXT UPDATES
## Phase 7 Handoff & Future Engineering Roadmap

**Date**: September 21, 2026  
**Next Phase**: Phase 7 — Offline Guardian & Local Survival Intelligence  

---

### 1. What Phase 7 Inherits

Phase 7 inherits an end-to-end, verified, production-built travel safety platform:

1. **Phase 1**: Real Google Places location search, canonical `LocationDetails`, quick hubs, origin/destination swap.
2. **Phase 2**: Real Google Directions API road routing, multi-route alternatives, turn maneuvers, Mapbox rendering.
3. **Phase 3**: Deterministic Safety Intelligence (Safety Fit 0-100, confidence ratings, lighting/police/hospital scoring, incident reporting).
4. **Phase 4**: Continuous Live Navigation (`useLiveNavigation`, moving user marker, progress bar, ETA, speed, heading, off-route detection, Google rerouting, arrival detection).
5. **Phase 5**: Safety Check-In (absolute timestamps, presets & custom intervals, grace period, "I'M SAFE" cycle resets, 1-5 trusted contacts, truthful notifications, arrival-safe resolution).
6. **Phase 6**: Travel Assistant + Controlled Gemini Tool Calling (tool router, read-only tools, human-confirmed action proposals, prompt injection defense).

---

### 2. Strict Architectural Boundaries for Phase 7

When implementing Phase 7 (Offline Guardian & Local Survival Intelligence):

1. **DO NOT REBUILD PHASES 1–6**:
   - Reuse existing hooks (`useLiveNavigation`, `useSafetyCheckIn`), services (`geminiToolRouter.ts`, `safetyEngine.ts`, `trustedContactService.ts`), and types.
2. **DO NOT RESTORE REMOVED FEATURES**:
   - Preserve Auth-Free design (no login wall).
   - Preserve supported transport modes (Car, Bike, Walk). Do NOT reintroduce Bus.
3. **DO NOT FABRICATE OFFLINE ACCURACY**:
   - If an offline vector tile or route is unavailable, report it truthfully.
   - When offline, indicate cached status with clear timestamp labelling.

---

### 3. Recommended Focus for Phase 7

- **Offline Vector Pack Storage**:
  - Implement IndexedDB/CacheStorage for corridor bounding box vector tiles and safe havens.
- **Offline Survival Card & PDF Kit**:
  - Extend the existing PDF generator to include full turn instructions, hospital emergency numbers, and consular contacts.
- **Offline Corridor LLM Fallback**:
  - Deepen local deterministic rules engine responses for complete zero-network highway transit.
