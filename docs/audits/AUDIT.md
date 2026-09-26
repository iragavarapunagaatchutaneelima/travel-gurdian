# OFFLINE LIVE MAP & TRAVEL PACK AUDIT

## Current Live Map Architecture
- **Page:** `frontend/src/app/map/page.tsx`
- **Map:** Mapbox GL JS (`mapbox-gl`) via `useRef` rendering GeoJSON route lines and POI markers.
- **Route State:** Uses `routeIdParam` from `useSearchParams`, cross-referencing with `allRoutes` from `generateRoutes()` in `frontend/src/data/routeData.ts`. The state `selectedRoute` holds the complete route object (origin, destination, waypoints, POIs, scores, recommendations).
- **Existing Offline Functionality:** There are stubbed `/offline` and `/offline-mode` pages that use a mock local storage mechanism (`journey_safety_pack`). The current Live Map does not have an offline mode fallback built in directly.
- **PDF Generation:** None currently exists.

## New Offline Functionality
- **Trigger:** A "Download Offline Pack" button added to the Live Map control panel (top right, near map style toggles).
- **Action:** Generates a PDF snapshot containing the exact data of the `selectedRoute` (route summary, safety analysis, POIs, travel guidance).
- **Map Snapshot in PDF:** A static map representation. If the map canvas can be captured (via `map.current.getCanvas().toDataURL()`), it will be embedded. Otherwise, a graceful fallback "MAP SNAPSHOT UNAVAILABLE" will be used.
- **Local Storage:** The `selectedRoute` will be saved to `localStorage` under `offline_travel_pack`.
- **Offline Detection:** A `navigator.onLine` listener will detect network drops. If offline, the Live Map page will display a prominent "OFFLINE MODE - USING SAVED TRAVEL PACK" banner, and use the saved route data from `localStorage` instead of attempting live recalcs.
- **Library:** `jspdf` will be added to generate the PDF entirely client-side without a bulky framework.

## Files to Modify
- `frontend/src/app/map/page.tsx`: Add the offline button, PDF generation logic, local storage saving, and offline detection/UI states.
- `frontend/package.json`: Will receive `jspdf` as a dependency.

## Files to Remain Untouched
- `frontend/src/data/routeData.ts`
- Landing page, Dashboard, AI Guardian, Emergency, Settings, etc.
- Dark/Light Theme System and Navigation Architecture.

## Known Limitations
- The PDF generation relies on client-side rendering.
- The Mapbox WebGL canvas might require `preserveDrawingBuffer: true` to successfully export an image via `toDataURL()`. I will configure Mapbox with `preserveDrawingBuffer: true` to ensure the map snapshot can be captured.
- This provides an "Offline Travel Pack", not interactive turn-by-turn routing without cell service.
