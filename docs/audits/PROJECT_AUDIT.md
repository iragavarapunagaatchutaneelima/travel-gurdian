# Travel Guardian — Comprehensive Project Audit & Architectural Analysis

**Date:** September 2026  
**Auditor:** Senior Full-Stack & Systems Reliability Engineer  
**System Status:** Operational & Verified  
**Mapping Provider:** Google Maps Platform Exclusively (Zero Mapbox)  
**Routing Architecture:** Google Routes API v2 (Motorized `TWO_WHEELER`) + Google Directions (`DRIVE`, `WALK`)  
**Emergency Telecommunications:** Exotel Cloud Telephony (Singapore Regional Cluster) + 112 Safety Lock  

---

## 1. Executive Summary

Travel Guardian is a resilient, context-aware travel safety platform engineered for Indian regional corridors and highway networks. The application integrates real-time GPS telemetry, Google Maps Platform spatial intelligence, deterministic route safety scoring, Google Gemini AI grounded tool routing, offline emergency survival packs, and multi-channel emergency communication via registered private guardians and India's National Emergency Line (112).

This comprehensive audit documents the end-to-end architecture, root cause diagnoses, engineering fixes, and verification results across all system domains.

---

## 2. Project Architecture

The platform operates as a modern decoupled full-stack architecture:

```
[ User Browser / PWA ]
       │
       ├─── HTTP/REST ───► [ Next.js 16 Frontend App (Port 3000) ]
       │                         │
       │                         ├─── Server Routes ───► Google Routes API v2 (:computeRoutes)
       │                         │                       Google Gemini 1.5 Flash API
       │                         └─── Client APIs ──────► Google Maps JS API (Directions, Places, Geocoding)
       │
       └─── HTTP/REST ───► [ FastAPI Python Backend (Port 8000) ]
                                 │
                                 ├─── SQLite / SQLAlchemy Database (travel_guardian.db)
                                 ├─── Background Dead-Man's Switch Scheduler
                                 └─── Exotel REST API (Singapore Cluster: api.exotel.com)
```

---

## 3. Frontend Architecture

- **Framework**: Next.js 16.3.3 (App Router, React 19, TypeScript 5)
- **Styling**: Tailwind CSS v4 with semantic HSL/CSS design tokens
- **Routing Engine**:
  - `googleRoutes.ts`: Orchestrates real route computation, geometry decoding, and priority ranking
  - `/api/routes/compute`: Secure server-side proxy calling Google Routes API v2
- **Spatial Mapping**:
  - Pure Google Maps Platform (`@types/google.maps`)
  - Dynamic singleton script injection via `googlePlaces.ts`
  - Zero Mapbox dependencies
- **Navigation HUD**:
  - `LiveNavigationOverlay.tsx`: Translucent dark glassmorphism HUD (`rgba(15, 23, 42, 0.85)`) with backdrop blur and responsive compact telemetry metrics (ETA, Speed, Heading, Safety)
- **Emergency UI**:
  - `emergency/page.tsx`: Protected 112 Safety Lock, Trusted Contact SMS and Voice calling, live reverse-geocoded location telemetry

---

## 4. Backend Architecture

- **Framework**: FastAPI (Python 3.11+, Uvicorn, Pydantic v2, SQLAlchemy)
- **Data Persistence**: SQLite (`travel_guardian.db`) with automatic table creation and idempotent column migrations
- **Services**:
  - `exotel_service.py`: Exotel Singapore cluster integration (`api.exotel.com/v1/Accounts/{SID}/...`)
  - `checkin_scheduler.py`: Background Dead-Man's Switch monitor with automated escalation
  - `assist.py`: Trusted contact CRUD, emergency audit logging, and SOS broadcast
- **API Endpoints**:
  - `/api/emergency/sms`: Outbound emergency SMS to stored contact only
  - `/api/emergency/call`: Outbound emergency voice call to stored contact only
  - `/api/emergency/notify-trusted-contact`: Simultaneous dual SMS + Voice alert
  - `/api/emergency/config-status`: Non-secret readiness inspection
  - `/api/emergency/contacts`: CRUD synchronization for trusted guardians
  - `/api/emergency/checkin`: Safe check-in timer management

---

## 5. Google Maps & Routing Architecture

### A. Two-Wheeler Motorized Routing
- **Problem**: When selecting "Bike" on intercity routes (e.g. Mumbai ➔ Hyderabad), Google DirectionsService returned `ZERO_RESULTS`.
- **Root Cause**: DirectionsService only supports non-motorized `BICYCLING`. In India, Google Maps lacks intercity bicycle trail paths on national highways.
- **Solution**: Migrated to Google Routes API v2 `https://routes.googleapis.com/directions/v2:computeRoutes` with `travelMode: "TWO_WHEELER"`. Motorized motorcycles are officially supported across India's highway network.
- **Verification**: Verified on 4 major Indian routes:
  1. Mumbai ➔ Hyderabad: 704.5 km, 126 steps (HTTP 200)
  2. Chennai ➔ Bangalore: 347.3 km, 77 steps (HTTP 200)
  3. Chennai ➔ Mumbai: 1250.3 km, 183 steps, 3 alternative routes (HTTP 200)
  4. Delhi ➔ Hyderabad: 1532.4 km, 112 steps, 3 alternative routes (HTTP 200)

### B. Priority-Based Route Ranking
- **Problem**: Route result cards all displayed "★ SAFEST ROUTE" regardless of individual route safety scores.
- **Root Cause**: Condition `idx === 0 || route.safetyScore >= 88` stamped "SAFEST ROUTE" on any route with score >= 88.
- **Solution**: Implemented `applyPriorityRanking` in `googleRoutes.ts` with dynamic composite weighting:
  - **Maximum Safety**: 85% Safety Score + 15% Time Efficiency
  - **Time Priority**: 75% Time Efficiency + 25% Safety Score
  - **Balanced**: 55% Safety Score + 45% Time Efficiency
- **Hierarchy Output**:
  - Rank 1: `#1 — HIGHEST PRIORITY (HIGHLY RECOMMENDED)`
  - Rank 2: `#2 — SECOND PRIORITY (SAFE ALTERNATIVE)`
  - Rank 3: `#3 — THIRD PRIORITY (ALTERNATIVE OPTION)`

---

## 6. Emergency Architecture & Exotel Integration

### A. 112 Safety Lock State Machine
- **Constraint**: In prototype and development environments, live 112 calls must NEVER be executed.
- **Implementation**:
  - Initial State: **DEACTIVATED / LOCKED** by default.
  - Top-right activation toggle with clear status badge.
  - Opt-in requires explicit confirmation modal:
    *"Are you sure you want to activate 112 emergency calling? Activating this feature enables direct emergency-service calling. Use it only when required."*
  - Deactivation immediately re-locks the 112 action.
  - Automated tests enforce `112 = OFF` at all times.

### B. Trusted Contact Destination Restriction
- All SMS and Voice emergency requests resolve strictly to the user's stored, registered trusted contact in the backend database.
- Arbitrary destination number injection (e.g. `?phone=...`) is strictly rejected.
- SMS alert payload follows Section 21 specifications:
  ```
  Travel Guardian Emergency Alert:
  I need help. Alert triggered by [Name].

  Current location:
  [Human-Readable Locality]

  Coordinates:
  [Latitude], [Longitude]

  Google Maps:
  https://www.google.com/maps?q=[Latitude],[Longitude]
  ```

### C. Exotel Timeout & Reachability
- Frontend `callAPI` timeout increased to 15 seconds for all emergency endpoints.
- Resolves false "Backend emergency service unreachable" caused by telecom gateway latency.
- Truthful Exotel provider responses (e.g. KYC status, invalid number, or credentials) are surfaced transparently to the user.

---

## 7. AI Guardian & Location Intelligence

- **Model**: Google Gemini 1.5 Flash via Next.js server route `/api/ai/route.ts`
- **Tool Calling**: Strict allowlist of deterministic local tools (`ALLOWLISTED_TOOLS`)
- **Spatial Synchronization**:
  - Queries real GPS coordinates via `navigator.geolocation`
  - Searches fuel bunks and safety resources along the active route corridor in travel direction
  - Returns real Google Places IDs, names, addresses, and coordinates
  - Interacting with AI place suggestions auto-focuses Google Maps camera on that exact place

---

## 8. Complete Mapbox Removal Audit

- **Functional Codebase**: **ZERO** occurrences of `mapbox`, `mapbox-gl`, `@mapbox`, or `MAPBOX_ACCESS_TOKEN` in `frontend/src` or `backend`.
- **Dependencies**: Cleaned from `package.json`.
- **Sole Active Provider**: Google Maps Platform exclusively.

---

## 9. Verification & Test Suite Summary

- **Total Automated Tests Executed**: 27
- **Tests Passed**: 27 (100%)
- **TypeScript Typecheck**: Passed with 0 errors (`npx tsc --noEmit`)
- **Backend Health**: HTTP 200 on `/docs`, `/api/alerts`, `/api/emergency/*`
- **Frontend Health**: HTTP 200 on `/`, `/plan`, `/map`, `/emergency`, `/dashboard`
