# PHASE 2 REPORT — REAL GOOGLE ROUTING & ROAD NETWORK INTELLIGENCE

**Project:** Travel Guardian  
**Phase:** 2  
**Date:** September 21, 2026  
**Status:** COMPLETED & VERIFIED  

---

## 1. Objective

The objective of Phase 2 was to replace the Phase 1 synthetic/mathematical curve route generator (`generateRoutes()`) with **Real Google Road Network Routing**. The application now fetches actual roadway geometry, exact travel distance, traffic-aware durations, route alternatives, and toll notices directly from Google Maps Platform (`google.maps.DirectionsService`), and renders the real road geometry onto Mapbox GL JS using standard GeoJSON `[longitude, latitude]` polylines.

---

## 2. Files Created & Modified

### Files Created
- [`frontend/src/services/googleRoutes.ts`](file:///n:/project/travel-gurdian/frontend/src/services/googleRoutes.ts): Dedicated routing service implementing `calculateGoogleRoutes()`, zero-dependency encoded polyline decoding (`decodeGooglePolyline`), distance/duration formatters, toll warning parsing, and route model normalization.
- [`docs/phase-reports/PHASE_2_REPORT.md`](file:///n:/project/travel-gurdian/docs/phase-reports/PHASE_2_REPORT.md): Comprehensive Phase 2 implementation report.
- [`docs/phase-reports/PHASE_2_AUDIT.md`](file:///n:/project/travel-gurdian/docs/phase-reports/PHASE_2_AUDIT.md): Complete Phase 2 audit and verification matrix.
- [`docs/phase-reports/PHASE_2_EXAMINATION.md`](file:///n:/project/travel-gurdian/docs/phase-reports/PHASE_2_EXAMINATION.md): Critical engineering review and risk assessment.
- [`docs/phase-reports/PHASE_2_NEXT_UPDATES.md`](file:///n:/project/travel-gurdian/docs/phase-reports/PHASE_2_NEXT_UPDATES.md): Phase 3 preparation and roadmap guide.

### Files Modified
- [`frontend/src/services/googlePlaces.ts`](file:///n:/project/travel-gurdian/frontend/src/services/googlePlaces.ts): Added `AutocompleteSessionToken` management lifecycle to group autocomplete queries and place detail resolutions for billing optimization.
- [`frontend/src/data/routeData.ts`](file:///n:/project/travel-gurdian/frontend/src/data/routeData.ts): Updated `RouteOption` interface to support Google routing properties (`provider: "google"`, `tollInfo`, `trafficDuration`, `warnings`, `legs`, `steps`).
- [`frontend/src/app/plan/page.tsx`](file:///n:/project/travel-gurdian/frontend/src/app/plan/page.tsx): Updated journey planner to asynchronously fetch real Google routes with loading indicators, button protection, and dynamic alternative card rendering.
- [`frontend/src/app/map/page.tsx`](file:///n:/project/travel-gurdian/frontend/src/app/map/page.tsx): Updated live map view to render decoded Google road geometry GeoJSON, fit bounds to real road coordinates, and handle alternative switches smoothly.
- [`.env.example`](file:///n:/project/travel-gurdian/.env.example): Added documentation for Directions API enablement, HTTP referrer restrictions, localhost testing, and production domain requirements.

---

## 3. Google Routing Architecture

```
User Selects Origin & Destination (Canonical LocationDetails)
                           ↓
               Selects Travel Mode (Car / Bike / Walk)
                           ↓
          frontend/src/services/googleRoutes.ts
                           ↓
        google.maps.DirectionsService.route()
   (provideRouteAlternatives: true, unitSystem: METRIC)
                           ↓
               Google Directions API Response
                           ↓
        1. Decode overview_polyline into [lng, lat][]
        2. Sum leg distances (meters → km / m)
        3. Sum leg durations (seconds → hours & mins)
        4. Detect duration_in_traffic & toll warnings
        5. Extract step instructions for Phase 4 foundation
                           ↓
      Normalize into Travel Guardian RouteOption[]
       (Route A, Route B, Route C as returned by Google)
                           ↓
            Mapbox GL JS Real Road Polyline Layer
                           ↓
              Interactive Route Profile Selection
```

---

## 4. API Configuration & Security

- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Required Google Cloud Platform APIs:**
  1. Maps JavaScript API
  2. Places API
  3. Geocoding API
  4. Directions API
- **Key Restrictions (Google Cloud Console):**
  - Application Restrictions: HTTP Referrers (`http://localhost:3000/*`, `https://<production-domain>/*`)
  - API Restrictions: Restrict key usage exclusively to Maps JavaScript API, Places API, Geocoding API, and Directions API.
- **Client vs Server Architecture:** Since Google Maps JavaScript API with DirectionsService runs client-side with HTTP referrer restrictions, client key exposure is safe and compliant with Google Maps Platform architecture guidelines.

---

## 5. Travel Modes Supported

1. **Car (`DRIVING`):** Requests Google driving routes on national highways, state highways, and city arterials. Real toll notices and traffic delays are captured.
2. **Bike (`BICYCLING`):** Requests Google two-wheeler / bicycle routes. Where bicycling paths are not supported by Google for certain intercity stretches in India, the application returns a truthful error notification ("Google routing is unavailable for this travel mode on this route") rather than fabricating a fake route.
3. **Walk (`WALKING`):** Requests Google pedestrian routing on sidewalks and walkways.
4. **Bus:** Remains completely removed per product roadmap.

---

## 6. Route Alternatives & Integrity

- **No Artificial 4-Route Fabrication:** If Google returns 1 route, the UI renders 1 route card. If Google returns 2 routes, 2 cards are rendered. If Google returns 3 routes, 3 cards are rendered.
- **Truthful Labeling:** Routes are clearly marked with `Route A • Google Route`, exact distance (`1,336 km`), exact duration (`19h 40m`), and real toll indicator (`Tolls on Route` or `No Tolls Reported`).
- **No Fake Incident Numbers:** No artificial accident counts or fabricated police booth totals are injected into the real Google route data.

---

## 7. Mapbox GL JS Geometry Rendering

- Polyline coordinates decoded into Mapbox GeoJSON format: `[longitude, latitude]`.
- GeoJSON LineString added to Mapbox map source `route-line`.
- Map camera bounds automatically fit to real road waypoints:
  ```typescript
  const bounds = new mapboxgl.LngLatBounds([origin.longitude, origin.latitude], [origin.longitude, origin.latitude]);
  selectedRoute.waypoints.forEach(wp => bounds.extend([wp[0], wp[1]]));
  map.current.fitBounds(bounds, { padding: 60 });
  ```

---

## 8. Verification & Build Results

- `npx tsc --noEmit`: 0 errors
- `npm run build`: Exit code 0 (Compiled successfully, all 20 pages generated)
- All 20 manual test matrix cases verified.
