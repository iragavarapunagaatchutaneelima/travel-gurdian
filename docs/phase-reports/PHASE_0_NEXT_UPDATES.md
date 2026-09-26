# PHASE 0 NEXT UPDATES & ROADMAP

**Baseline Phase:** Phase 0 (Stable Baseline Audit)  
**Next Upcoming Phase:** Phase 1 (Real Location Search & Journey Planning)  
**Status:** Audit Complete • Implementation Locked  

---

## 1. MUST PRESERVE (Protected Core Baseline)

The following stable patterns and components **MUST NOT** be removed, rewritten, or degraded during Phase 1 or any subsequent phase:

1. **Zero Fake Authentication Friction:**  
   - Keep the landing page (`/`) direct entry to `/dashboard`.
   - Preserve client redirects for `/login` and `/signup`.
   - Do NOT introduce unrequested login screens or authentication barriers.
2. **Unified Navigation Drawer (☰):**  
   - Preserve `frontend/src/app/components/Header.tsx` as the single navigation component.
   - Maintain the 9 destinations: Home/Dashboard, Plan Journey, Live Maps, Emergency, AI Guardian, My Journeys, Review Session, Profile, Settings.
3. **Design System & Theme Tokens:**  
   - Preserve TailwindCSS v4 tokenized variables in `frontend/src/app/globals.css` (`--background`, `--surface`, `--elevated-surface`, `--primary-accent`, `--border`, `--muted`).
   - Default theme must remain Dark Mode with seamless Light Mode toggle.
4. **Resilient Service Layer:**  
   - Preserve `TravelGuardianAPI` in `frontend/src/services/api.ts` with its automatic `localStorage` and demo fallbacks.
5. **Server-Side AI Gateway:**  
   - Preserve `frontend/src/app/api/ai/route.ts` with its Google Gemini 1.5 Flash server-side call and local rules engine fallback.
6. **Multi-Profile 4-Route Safety Matrix Concept:**  
   - Preserve the concept of 4 distinct safety profiles: Route A (Safety Corridor), Route B (Highway Alternative), Route C (Balanced Route), Route D (Caution Route).

---

## 2. MUST PREPARE (Pre-requisites for Next Phases)

Before executing future phases, the following preparation guidelines must be respected:

1. **Environment Variable Grounding:**  
   - Ensure `.env.local` supports standard keys: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, `GEMINI_API_KEY`, and future `GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
2. **Backward Compatibility:**  
   - Any new dynamic location search must allow the existing 6 Indian metro hubs (Chennai, Mumbai, Delhi, Hyderabad, Bangalore, Vizag) as one-click defaults.
3. **Incremental Verification:**  
   - Verify TypeScript compilation (`npx tsc --noEmit`) and production build (`npm run build`) after every incremental phase change.

---

## 3. PHASE 1 REQUIREMENTS (Real Location Search & Journey Planning)

When Phase 1 is authorized, development will focus strictly on:

1. **Real Location Search Inputs:**
   - Implement dynamic location search inputs with autocomplete (e.g., Google Places Autocomplete or Mapbox Geocoding) for origin and destination in `frontend/src/app/plan/page.tsx`.
   - Support searching arbitrary landmarks, addresses, train stations, airports, and cities across India.
2. **Current Location Autodetection:**
   - Add a "Use Current Location" GPS trigger in the origin search input to auto-populate the traveler's current coordinates and reverse-geocode address.
3. **Place Data Structure:**
   - Store place name, formatted address, latitude, longitude, and place ID in the journey planning state.
4. **Validation & Quick-Select Hubs:**
   - Provide quick-select chips for the 6 primary hubs (Chennai, Mumbai, Delhi, Hyderabad, Bangalore, Vizag) alongside free-form search.
   - Prevent identical origin and destination queries with user-friendly alerts.

*Note: Phase 1 DOES NOT implement live turn-by-turn navigation or real Google Directions polylines (reserved for Phase 2 & Phase 4).*

---

## 4. FUTURE PHASES AT A GLANCE

- **Phase 2 — Real Google Routing:** True road network polyline fetching, distance matrix, toll calculations, and multi-profile route scoring over real geometry.
- **Phase 3 — Safety Intelligence:** Live threat data overlays, danger zones, municipal incident feeds, and women-safety corridor weighting.
- **Phase 4 — Live Navigation:** Continuous GPS tracking (`watchPosition`), heading, speed, off-route deviation alerts, and arrival detection.
- **Phase 5 — Safety Check-In & Emergency SOS:** Automated Dead-Man check-ins with external SMS/telemetry dispatches and 112 emergency routing.
- **Phase 6 — Gemini Travel Assistant:** Context-aware travel advisory tool calling, route itinerary explanations, and safety checklists.
- **Phase 7 — Offline Guardian:** Client-side vector map caching, offline route bundles, and emergency contact dossiers.

---
*Roadmap established. Phase 0 complete.*
