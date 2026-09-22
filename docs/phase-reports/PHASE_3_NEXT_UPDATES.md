# Travel Guardian — Phase 3 Next Updates & Phase 4 Preparation
**Phase 3 to Phase 4 Transition Guide**  
**Date:** September 21, 2026  

---

## 1. What Phase 3 Delivers to Phase 4

Phase 3 establishes a solid, deterministic, and verifiable Safety Intelligence layer over real Google road network routes. Specifically, Phase 4 inherits:

1. **High-Fidelity Road Polylines & Step Legs:** `RouteOption.waypoints` and `RouteOption.steps` containing real turn-by-turn step coordinates from Google DirectionsService.
2. **Corridor Points of Interest (POIs):** Verified hospitals, police stations, fuel plazas, pharmacies, and rest areas with precise geographic coordinates along each route corridor.
3. **Safety Assessment Data Model:** `SafetyAssessment` providing dynamic safety fit, factor confidence, and segment emergency accessibility indices.
4. **Active Hazard Telemetry:** Community-reported hazard points with timestamps and expiration models ready for live proximity alerts.
5. **Interactive Mapbox GL Base:** High-performance vector map rendering capable of displaying animated user position markers and route layers.

---

## 2. Phase 4 Planned Scope (Real Live Navigation)

*Note: Phase 4 features are strictly deferred and NOT implemented in Phase 3.*

When Phase 4 begins, the system will implement:
- **Continuous Geolocation Tracking:** `navigator.geolocation.watchPosition()` with accuracy filtering and battery-efficient intervals.
- **Dynamic User Navigation Marker:** Moving marker with heading arrow orienting to the direction of travel.
- **Live Speed & Telemetry Display:** Real-time ground speed, altitude, and estimated time to next safety haven.
- **Dynamic Route Progress:** Progress bar tracking distance completed vs distance remaining.
- **Off-Route Detection & Recalculation:** Threshold-based off-corridor detection (e.g. >100m from route polyline) prompting user-approved Google route re-routing.
- **Turn-by-Turn Guidance Engine:** Real-time audio/visual instructions for upcoming maneuvers derived from Google step legs.
- **Arrival Detection:** Automatic transition to journey summary when within destination radius (<50m).

---

## 3. Scope Boundary Enforcement

- Continuous GPS tracking (`watchPosition`) remains **DISABLED** in Phase 3.
- Live progress recalculation remains **DISABLED** in Phase 3.
- Phase 3 delivers static route planning, verified safety scoring, and interactive layer examination.
