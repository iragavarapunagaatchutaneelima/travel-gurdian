# TRAVEL GUARDIAN — PHASE 5 NEXT UPDATES
## Phase 6 Handoff & Technical Boundaries

**Date**: September 21, 2026  
**Next Phase**: Phase 6 — Travel Assistant + Controlled Gemini Tool Calling  

---

### 1. What Phase 6 Inherits

Phase 6 inherits a rock-solid, production-built navigation and safety foundation:

1. **Phase 1**: Real Google Places location search, canonical `LocationDetails`, quick hubs, and origin-destination swapping.
2. **Phase 2**: Real Google Directions API road routing, multi-route alternatives, turn-by-turn maneuvers, and Mapbox geometry rendering.
3. **Phase 3**: Deterministic Safety Intelligence (Safety Fit 0-100, confidence scoring, road/lighting factors, and community incident reporting).
4. **Phase 4**: Continuous Live Navigation (`useLiveNavigation`, moving user marker, route progress, ETA, speed, heading, off-route detection, Google rerouting, and arrival detection).
5. **Phase 5**: Safety Check-In (absolute timestamps, presets & custom intervals, grace period, "I'M SAFE" cycle resets, 1-5 trusted contacts, truthful notification gateway, and arrival-safe resolution).

---

### 2. Strict Architectural Boundaries for Phase 6

When implementing Phase 6 (Travel Assistant + Controlled Gemini Tool Calling):

1. **DO NOT ALLOW AI TO AUTONOMOUSLY TRIGGER EMERGENCY ACTIONS**:
   - The AI Assistant must **never** independently call 112, trigger SOS, or send trusted contact alerts without explicit user confirmation.
2. **DO NOT REBUILD PHASES 1-5**:
   - Reuse existing hooks (`useLiveNavigation`, `useSafetyCheckIn`), services (`googleRoutes.ts`, `safetyEngine.ts`, `trustedContactService.ts`), and types (`navigation.ts`, `safetyCheckIn.ts`).
3. **PRESERVE AUTH-FREE ARCHITECTURE**:
   - Do NOT introduce a login or signup gate.
4. **PRESERVE TRANSPORT MODE INTEGRITY**:
   - Supported travel modes remain **Car, Bike, Walk**. Do NOT reintroduce Bus.
5. **PRESERVE TRUTHFULNESS PRINCIPLE**:
   - Any AI tool call that simulates an action or returns simulated data must be explicitly flagged to the user. Never claim real SMS delivery or automated dispatch unless genuine external integrations are configured.

---

### 3. Recommended Focus for Phase 6

- **Context-Aware Safety Conversational Assistant**:
  - Integrate Gemini tool calling for read-only situational awareness (e.g. "What is my current safety score?", "Find nearest hospital along my route", "How long until next safety check-in?").
- **User-Approved AI Action Proposals**:
  - If the assistant proposes a safety action (such as adjusting check-in interval or selecting an alternative route), it must require a direct user button click to execute.
