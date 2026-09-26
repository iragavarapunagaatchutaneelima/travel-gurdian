# PHASE 1 NEXT UPDATES & ROADMAP FOR PHASE 2

**Current Completed Phase:** Phase 1 (Real Location Search & Journey Planning)  
**Next Target Phase:** Phase 2 (Real Google Routing & Road Network Intelligence)  
**Status:** Phase 1 Verified • Ready for Phase 2 Handoff  

---

## 1. MUST PRESERVE (Protected Baseline from Phase 0 & Phase 1)

1. **Zero Login/Authentication Wall:** Keep immediate access to `/dashboard` from landing page (`/`).
2. **Unified Navigation Drawer (☰):** Preserve `Header.tsx` as the single accessible drawer across all 9 pages.
3. **Canonical Location Model:** Preserve `LocationDetails` (`placeId`, `name`, `formattedAddress`, `latitude`, `longitude`) in `frontend/src/types/location.ts`.
4. **Dual Location Search:** Maintain both free-form Google Places autocomplete search and the 6 quick-select hubs (Chennai, Mumbai, Delhi, Hyderabad, Bangalore, Vizag).
5. **Location Controls:** Preserve the 1-click **"Swap Locations" (⇄)** button and **"Use Current Location"** GPS detection.
6. **Target Travel Modes:** Maintain **Car**, **Bike**, and **Walk** (keep Bus removed).
7. **Theme System:** Preserve TailwindCSS v4 design tokens in `globals.css` with default Dark Mode.
8. **Server-Side AI Gateway:** Preserve `/api/ai/route.ts` with Google Gemini 1.5 Flash and rules fallback.

---

## 2. MUST PREPARE (Prerequisites for Phase 2)

1. **Google Routes / Directions API Access:** Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` has the **Directions API** / **Routes API** enabled in the Google Cloud Platform Console.
2. **Polyline Decoder:** Prepare a lightweight client-side polyline decoder (`@mapbox/polyline` or custom decoder algorithm) to convert encoded Google polyline strings into GeoJSON `[lng, lat]` coordinates for Mapbox GL JS rendering.
3. **Multi-Route Extraction:** Ensure the Directions Service can request `provideRouteAlternatives: true` to generate alternative highway profiles.

---

## 3. PHASE 2 REQUIREMENTS (Real Google Routing)

When Phase 2 is authorized, implementation will focus strictly on:

1. **Real Road Network Directions:**
   - Replace `generateRoutes()` synthetic math with real Google Directions / Routes API queries.
   - Fetch real road centerlines, actual driving distances, and live traffic-adjusted durations between `origin` and `destination` `LocationDetails`.
2. **Multi-Profile Safety Layering Over Real Geometry:**
   - Map real Google route alternatives to Travel Guardian's 4 safety profiles:
     - Route A: Safety Corridor (Highest safety score, expressway tollway, 24/7 rest stops).
     - Route B: Highway Alternative (Direct bypass, fastest transit).
     - Route C: Balanced Route (Intermediate townships).
     - Route D: Caution Route (Rural or single-lane segments).
3. **Real Step-by-Step Waypoints & POI Calibration:**
   - Extract real highway waypoints and position POI markers (Fuel, Hospital, Rest, Police) along actual road coordinates.
4. **Mapbox GL JS Polyline Rendering:**
   - Render real Google GeoJSON line strings with color-coded safety tiers on the Mapbox living canvas in `frontend/src/app/map/page.tsx`.

*Do NOT implement turn-by-turn navigation (Phase 4), SOS SMS (Phase 5), or offline vector tiles (Phase 7) during Phase 2.*

---

## 4. FUTURE PHASES AT A GLANCE

- **Phase 2 — Real Google Routing:** Real road geometry, Directions API, live traffic durations.
- **Phase 3 — Safety Intelligence:** Real hazard feeds, danger zones, women safety corridor weighting.
- **Phase 4 — Live Navigation:** Continuous `watchPosition`, heading compass, speed alerts, off-route recalculation.
- **Phase 5 — Safety Check-In & Emergency SOS:** Automated Dead-Man check-ins with external SMS telemetry dispatches.
- **Phase 6 — Gemini Travel Assistant:** Tool calling, real-time itinerary advice, safety checklists.
- **Phase 7 — Offline Guardian:** Vector map tile caching, offline route bundles.

---
*Roadmap finalized. Phase 1 complete.*
