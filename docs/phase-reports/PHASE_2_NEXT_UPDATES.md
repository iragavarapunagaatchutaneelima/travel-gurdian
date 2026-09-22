# PHASE 2 ROADMAP & PHASE 3 TRANSITION GUIDE

**Project:** Travel Guardian  
**Current Phase Completed:** Phase 2 (Real Google Routing & Road Network Intelligence)  
**Next Phase:** Phase 3 (Real Safety Intelligence Over Real Routes)  
**Date:** September 21, 2026  

---

## 1. What Phase 2 Completed

1. **Dedicated Google Routing Service (`frontend/src/services/googleRoutes.ts`):** Complete integration with Google Maps `DirectionsService`, decoding real encoded polyline road coordinates into standard GeoJSON `[lng, lat]` format.
2. **Real Distance & Duration:** Replaced static speed calculations with real Google road mileage and duration (including live traffic adjustments).
3. **Dynamic Alternative Handling:** Renders only real alternatives returned by Google (1 to 3) without manufacturing synthetic routes.
4. **Autocomplete Session Tokens (`frontend/src/services/googlePlaces.ts`):** Implemented session token grouping for Places predictions and place details.
5. **Mapbox GL JS Real Geometry:** Rendered real decoded polylines on Mapbox map layers with automatic viewport bounding.
6. **Robust Error Handling & Security:** Documented API referrer restrictions and implemented graceful error notifications for missing keys, network faults, and unsupported modes.

---

## 2. What Must Remain Protected

- Landing page CTA flow (`/`)
- Header navigation drawer (☰) and theme switcher (Dark/Light mode)
- Six quick-select hubs and location swapping
- Direct dashboard access (`/dashboard`)
- Gemini AI Guardian proxy (`/api/ai`)
- Emergency SOS & Check-in interfaces (`/emergency`)
- Mapbox GL JS map engine with offline pack generator

---

## 3. What Phase 3 Needs (Real Safety Intelligence Over Real Routes)

Phase 3 will focus exclusively on **Real Safety Intelligence Over Real Routes**:
- Ingest real-world safety feeds and danger zone geofences.
- Dynamic road segment risk assessment (lighting, historical collision clusters, police patrol density).
- Women Safety weighted corridor routing algorithms.
- Real-time weather and landslide risk overlay along active route polylines.
- Integration of live emergency response node accessibility.

---

## 4. Phase 3 Prerequisites Status

- Real Location Search (Phase 1): **READY**
- Real Google Road Routing (Phase 2): **READY**
- Mapbox Polyline Geometry (Phase 2): **READY**
- Typecheck & Production Build: **CLEAN (0 errors)**
