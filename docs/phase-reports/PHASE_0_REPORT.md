# PHASE 0 REPORT — STABLE BASELINE & ARCHITECTURE AUDIT
**Project:** Travel Guardian (AI-Powered Travel Safety & Guidance Platform)  
**Date:** September 21, 2026  
**Auditor:** Antigravity AI Engineering Baseline Auditor  
**Audit Scope:** Full repository inventory, Git history, frontend/backend architecture, data flow, safety intelligence, maps, routing, AI integration, offline packs, and test verification.  
**Mode:** Phase 0 Inspection-Only (Zero code modification, zero refactoring, zero dependency changes).

---

## 1. Executive Summary

The **Travel Guardian** repository is a full-stack, AI-assisted travel safety and guidance platform designed for proactive travel risk assessment, real-time danger alerting, intelligent route planning, and emergency dispatch assistance.

The current stable codebase represents a modernized Next.js 16 (React 19, Turbopack, TailwindCSS v4) frontend coupled with an optional Python 3.11+ FastAPI / SQLAlchemy backend and a Docker Compose multi-container stack.

Key highlights of the stable baseline:
1. **Frontend-Driven Architecture:** The Next.js frontend is self-sufficient with rich client-side demo intelligence, 6-city cross-compatible route matrix calculations, interactive Mapbox GL JS map rendering, PDF offline travel pack generation (`jspdf`), local storage fallbacks, and a server-side route `/api/ai` connecting to Google Gemini 1.5 Flash.
2. **Backend Services (FastAPI):** A structured Python service layer organized around the core paradigm **"SENSE • ASSESS • GUIDE • ASSIST"**, featuring SQLite/MySQL database persistence, geographic bounding alert queries, rule-based risk evaluation formulas, safe check-in timers, and emergency SOS broadcasting.
3. **Intentional Product Consolidations:** The landing screen has zero fake login friction (direct "GET STARTED →" CTA to `/dashboard`), a unified collapsible navigation drawer (☰) housing 9 core modules, and automatic client redirects for legacy standalone routes (`/login` -> `/`, `/signup` -> `/`, `/assess` -> `/plan`, `/sense` -> `/map`).
4. **Verification Status:** TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors, production build (`npm run build`) completes cleanly across all 20 static/dynamic routes, and localhost dev server verification confirms 100% HTTP 200 responses across all primary routes and the `/api/ai` server endpoint.

---

## 2. High-Level Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TRAVEL GUARDIAN ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                     ┌──────────────────────────────────────────────┐
                     │            User Browser / Mobile             │
                     └──────────────────────┬───────────────────────┘
                                            │
                ┌───────────────────────────┴───────────────────────────┐
                │                                                       │
                ▼                                                       ▼
  ┌───────────────────────────┐                           ┌───────────────────────────┐
  │   Next.js 16 (Frontend)   │                           │     Client Storage &      │
  │   App Router (React 19)   │                           │     Device Capabilities   │
  ├───────────────────────────┤                           ├───────────────────────────┤
  │ • Landing & Dashboard     │                           │ • localStorage (Journeys, │
  │ • Plan (/plan)            │                           │   Contacts, Checkins)     │
  │ • Map (/map) [Mapbox GL]  │                           │ • navigator.geolocation   │
  │ • AI Guardian (/assist)   │                           │ • navigator.onLine        │
  │ • Emergency SOS (/emerg.) │                           │ • jsPDF (Offline PDF Pack)│
  │ • Dossiers (/guide)       │                           └───────────────────────────┘
  │ • Profile & Settings      │                                         │
  └─────────────┬─────────────┘                                         │
                │                                                       │
        ┌───────┴────────────────────────┐                              │
        │ Server-Side Route              │                              │
        ▼                                ▼                              │
┌─────────────────────────┐   ┌─────────────────────────┐               │
│ Next.js API Route       │   │ Optional FastAPI        │               │
│ /api/ai (POST)          │   │ Backend (Port 8000)     │               │
├─────────────────────────┤   ├─────────────────────────┤               │
│ • Google Gemini REST API│   │ • /api/alerts (SENSE)   │               │
│   (gemini-1.5-flash)    │   │ • /api/assess (ASSESS)  │               │
│ • Fallback Rules Engine │   │ • /api/guide  (GUIDE)   │               │
└───────────┬─────────────┘   │ • /api/assist (ASSIST)  │               │
            │                 └───────────┬─────────────┘               │
            ▼                             ▼                             │
  ┌──────────────────┐          ┌──────────────────┐                    │
  │ Google Generative│          │ SQLite / MySQL   │                    │
  │ AI Cloud API     │          │ Database Engine  │                    │
  └──────────────────┘          └──────────────────┘                    │
                                                                        ▼
                                                         ┌─────────────────────────────┐
                                                         │ External Map Tiles:         │
                                                         │ Mapbox GL JS Cloud / Vector │
                                                         └─────────────────────────────┘
```

---

## 3. Detailed Repository Inventory

### 3.1 Frontend (`frontend/`)
- **Framework:** Next.js 16.3.3 (App Router, Turbopack), React 19.2.8, TypeScript 5.
- **Styling:** TailwindCSS v4 (`@tailwindcss/postcss`), custom CSS tokens in `globals.css`, `next-themes` (Dark/Light mode).
- **Mapping:** `mapbox-gl` (v3.0.0), `@types/mapbox-gl` (v2.7.20).
- **Icons:** `lucide-react` (*).
- **Offline / Export:** `jspdf` (v4.2.1).

### 3.2 Backend (`backend/`)
- **Framework:** FastAPI (>=0.100.0), Uvicorn (>=0.22.0), Pydantic v2 / Pydantic-Settings (>=2.0.0).
- **Database / ORM:** SQLAlchemy (>=2.0.0), PyMySQL (>=1.1.0), Cryptography (>=41.0.0).
- **Database Default:** SQLite (`sqlite:///./travel_guardian.db`) or MySQL in Docker (`mysql+pymysql://guardian_user:guardian_password@db:3306/travel_guardian`).

### 3.3 Infrastructure & Docker
- `docker-compose.yml`: 3 services:
  - `db`: MySQL 8.0 with volume `mysql_data`.
  - `backend`: Python FastAPI running on port 8000.
  - `frontend`: Next.js production build running on port 3000.

---

## 4. Current Features Inventory

| Feature Area | Module / Page | Status | Description |
|---|---|---|---|
| **Landing Screen** | `frontend/src/app/page.tsx` | **IMPLEMENTED** | Hero layout with theme toggle, high-impact typography, feature highlights, and direct "GET STARTED" CTA to `/dashboard`. |
| **Theme System** | `frontend/src/app/globals.css`, `providers.tsx` | **IMPLEMENTED** | Default Dark Mode, dynamic Light Mode switcher, CSS variables for background, surface, elevated-surface, primary-accent, border, muted. |
| **Unified Navigation** | `frontend/src/app/components/Header.tsx` | **IMPLEMENTED** | Collapsible slide-out drawer (☰) supporting desktop/tablet/mobile with 9 navigation destinations and emergency SOS trigger. |
| **Home Dashboard** | `frontend/src/app/dashboard/page.tsx` | **IMPLEMENTED** | Top slideshow banner, 6 quick-action modules, live conditions matrix (Weather, AQI, Traffic, Network), and check-in timer modal. |
| **Journey Planning** | `frontend/src/app/plan/page.tsx` | **IMPLEMENTED** | 6-city pair selector, travel modes (Car, Bike, Bus, Walk), safety preferences (Solo, Group, Family, Women Safety), and 4-route generation. |
| **Route Intelligence** | `frontend/src/data/routeData.ts` | **IMPLEMENTED (SIMULATED)** | Algorithmic generator producing Route A (Safety Corridor), Route B (Highway Alternative), Route C (Balanced), Route D (Caution) with multi-factor breakdown. |
| **Route Matrix Table** | `frontend/src/app/plan/page.tsx` | **IMPLEMENTED** | Side-by-side comparative table of all 4 generated routes evaluating Safety, Time, Distance, Traffic, Night Safety, Weather, Emergency. |
| **Interactive Map** | `frontend/src/app/map/page.tsx` | **IMPLEMENTED** | Mapbox GL JS map with GeoJSON polyline rendering, Street/Satellite style switcher, and fallback preview card when token is omitted. |
| **GPS Telemetry** | `frontend/src/app/map/page.tsx` | **IMPLEMENTED** | Browser `navigator.geolocation` button ("Show My Location"), drops live coordinate marker and fly-to animation. |
| **POI Markers** | `frontend/src/app/map/page.tsx` | **IMPLEMENTED (SIMULATED)** | Color-coded POI markers (Petrol, Rest Stop, Hospital, Hotel) along route corridor with clickable popup cards. |
| **Offline Travel Pack** | `frontend/src/app/map/page.tsx`, `/offline` | **IMPLEMENTED (PARTIAL)** | Client-side `jspdf` generator producing multi-page PDF with route metrics, POIs, notes, and WebGL canvas snapshot; `localStorage` backup. |
| **AI Guardian Advisor** | `frontend/src/app/assist/page.tsx`, `/api/ai` | **IMPLEMENTED** | Google Gemini 1.5 Flash server-side integration via `/api/ai` with intelligent local rules-engine fallback and status indicator. |
| **Emergency SOS Hub** | `frontend/src/app/emergency/page.tsx` | **IMPLEMENTED (SIMULATED)** | Direct 112 hotline dialer, location telemetry sharing toggle, emergency contact SMS simulation, nearby hospital/police havens. |
| **Check-In Timer** | `frontend/src/app/assist/page.tsx` | **IMPLEMENTED** | Dead-man countdown timer with confirm check-in button, expired alert dispatch simulation, and backend `/assist/checkin` sync. |
| **Emergency Contacts** | `frontend/src/app/assist/page.tsx` | **IMPLEMENTED** | Add/delete emergency contacts stored in backend SQLite/MySQL and mirrored to `localStorage`. |
| **My Journeys History** | `frontend/src/app/history/page.tsx` | **IMPLEMENTED** | Tabs for Upcoming, Completed, and Cancelled journeys with direct navigation link to Live Map view. |
| **Municipal Dossiers** | `frontend/src/app/guide/page.tsx` | **IMPLEMENTED** | 6-city municipal dossiers (Chennai, Mumbai, Bangalore, Hyderabad, Delhi, Vizag), consular contacts, highway warnings, reviews, checklist. |
| **Profile & Settings** | `frontend/src/app/profile`, `/settings` | **IMPLEMENTED** | Personal profile credentials, default safety preferences, theme selection, and local demo storage reset tool. |

---

## 5. Intentional Removals & Consolidations

The following features and pages were intentionally removed, bypassed, or simplified in the stable version to maximize UX reliability and eliminate hackathon demonstration failure points:

1. **Fake Authentication Wall Removed:**
   - The landing page no longer requires login credentials. Clicking "GET STARTED →" links directly to `/dashboard`.
   - `/login` simply renders the landing view.
   - `/signup` automatically redirects (`router.replace('/')`) to the landing page.
   - **Rule:** Do NOT restore login gates or fake JWT authentication walls unless explicitly instructed in a future phase.
2. **Legacy Route Redirects:**
   - `/assess` automatically redirects to `/plan`.
   - `/sense` automatically redirects to `/map`.
   - **Rule:** Maintain these aliases or canonical paths without breaking routing.
3. **Sidebar Replacement:**
   - The old fixed desktop sidebar (`Sidebar.tsx`) has been superseded by the unified collapsible navigation drawer (☰) in `Header.tsx` across all pages.
4. **Decoupled Backend Resilience:**
   - The frontend API service (`frontend/src/services/api.ts`) wraps all backend calls with automatic `localStorage` and mock data fallback. If FastAPI is not running, the frontend remains 100% functional.

---

## 6. Location Search & Geographic Audit

- **Current Implementation:** Dropdown selectors with 6 fixed Indian metro hubs (`chennai`, `mumbai`, `delhi`, `hyderabad`, `bangalore`, `vizag`).
- **Classification:** **PARTIAL / MOCK HUBS**.
- **Origin / Destination Selection:** Available between any permutation of the 6 hubs. Same-city validation is enforced with an alert.
- **Coordinates & Waypoints:** Hardcoded municipal coordinates in `routeData.ts` with interpolated GeoJSON bezier curve waypoints.
- **Real Location Search (Google Places / Autocomplete / Geocoding):** **NOT IMPLEMENTED**.

---

## 7. Map & Routing Audit

- **Map Provider:** Mapbox GL JS (`mapbox-gl` v3.0.0).
- **Map Styles:** Streets (`mapbox://styles/mapbox/dark-v11`) and Satellite (`mapbox://styles/mapbox/satellite-streets-v12`).
- **Map Fallback:** If `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is missing or default, renders a sleek "MAP PREVIEW MODE" card detailing route parameters.
- **Routing Engine:** Pure client-side synthetic route generator (`generateRoutes()` in `frontend/src/data/routeData.ts`). Computes distance, travel time, safety index, and POI markers deterministically using haversine approximations and road curvature coefficients.
- **Real Routing Providers (Google Routes / Directions / Mapbox Directions / OSRM):** **NOT IMPLEMENTED**.

---

## 8. Safety Intelligence Engine Audit

- **Current Implementation:** Dual-tier calculation:
  1. **Frontend (`routeData.ts`):** Deterministic scoring engine generating 4 profile tiers (Safety Score 50-96/100, traffic congestion, road quality, night safety rating, weather risk, emergency index).
  2. **Backend (`backend/app/services/assess.py`):** Formula-based scoring combining base destination safety score, active hazard penalties (within geographic radius), traveler profile penalties (Solo Female, Senior, Adventure), and transport mode modifiers.
- **Data Reality:** **STATIC & MOCK FORMULAS** (no live sensor or government police crime feeds connected).

---

## 9. Live Navigation & GPS Audit

- **Current Implementation:** Single-shot browser GPS geolocation via `navigator.geolocation.getCurrentPosition()`. Places red user marker and flies camera to location.
- **Turn-by-Turn Navigation:** **NOT IMPLEMENTED**.
- **Continuous Tracking (`watchPosition`):** **NOT IMPLEMENTED**.
- **Speed / Heading / Off-Route Recalculation:** **NOT IMPLEMENTED**.

---

## 10. Emergency & Assistance Audit

- **SOS Broadcast:** Simulated emergency dispatch popup and `tel:112` / `tel:911` dialer. Backend endpoint `/assist/sos` generates nearby mock police and hospital havens.
- **Dead-Man's Timer:** Interactive countdown in `/assist` and `/dashboard` using browser `setInterval` and backend `/assist/checkin`.
- **Emergency Contacts:** Full CRUD against SQLite/MySQL and `localStorage`.
- **Real SMS / Dispatch Gateways (Twilio, AWS SNS):** **SIMULATED / NOT IMPLEMENTED**.

---

## 11. AI Travel Assistant Audit

- **API Route:** `frontend/src/app/api/ai/route.ts` (Next.js Server-Side App Router Route).
- **AI Provider:** Google Gemini Generative AI REST API (`gemini-1.5-flash`).
- **Authentication:** `process.env.GEMINI_API_KEY` checked on server. Never exposed to browser bundle.
- **Fallback:** Intelligent local keyword-based safety rules engine (detects city names, solo travel, SOS, lost documents) returning structured JSON with status badge `DEMO / RULES ENGINE` vs `CONNECTED (Gemini)`.
- **UI Integration:** Chat interface in `/assist` and quick-query drawer on `/dashboard`.

---

## 12. Offline Capabilities Audit

- **Offline Travel Pack:** Client-side PDF generation using `jspdf` in `frontend/src/app/map/page.tsx` (`handleDownloadOfflinePack`). Captures route metadata, POI directory, guidelines, and WebGL canvas image snapshot via `toDataURL()`.
- **Local Storage Caching:** Saves active route data under `offline_travel_pack` and `journey_safety_pack`.
- **Network Detection:** `window.addEventListener('online'/'offline')` displays an "OFFLINE MODE — USING SAVED TRAVEL PACK" banner when disconnected.
- **Offline Map Tiles / Vector Cache (MapLibre / Service Worker):** **NOT IMPLEMENTED**.

---

## 13. Database & Backend API Audit

- **Database:** SQLAlchemy 2.0 with SQLite (`travel_guardian.db`) or MySQL 8.0 (`travel_guardian_db`).
- **Models:**
  - `Destination`: Name, coordinates, emergency contacts JSON, cultural tips JSON, local laws JSON, base safety score.
  - `Alert`: Category, severity, coordinates, radius_km, active status.
  - `RiskReport`: Destination, traveler profile, overall score, breakdown JSON, recommendations JSON.
  - `EmergencyContact`: Name, phone, email, relation, user_id.
  - `SafeCheckIn`: Target time, note, completed status, triggered status.
- **Seed Data:** `backend/seed.py` seeds 5 global cities (Tokyo, Rio, Paris, Cairo, New York) and 7 sample alerts.

---

## 14. Test & Verification Summary

| Test / Check | Command | Result | Details |
|---|---|---|---|
| **TypeScript Type Check** | `npx tsc --noEmit` | **PASS** | 0 type errors across all frontend files. |
| **Next.js Production Build** | `npm run build` | **PASS** | Compiled with Turbopack in 12.1s; 20/20 routes generated successfully. |
| **Unit / E2E Tests** | `npm test` | **NOT CONFIGURED** | No test runner configured in `package.json` scripts. |
| **Python Backend Tests** | `python -m pytest` | **NOT CONFIGURED** | 0 test items collected in `backend/`. |
| **Python Imports Check** | `python -c "import fastapi, ..."` | **PASS** | Core backend dependencies resolve properly. |
| **Localhost HTTP Check** | `Invoke-WebRequest (10 routes)` | **PASS (200 OK)** | `/`, `/dashboard`, `/plan`, `/map`, `/assist`, `/emergency`, `/history`, `/guide`, `/profile`, `/settings` all return HTTP 200. |
| **AI Route Check** | `POST /api/ai` | **PASS (200 OK)** | Returns valid JSON with structured safety advice and mode status. |

---

## 15. Known Limitations & Baseline Gaps

1. **City Selection Boundary:** Origin and destination selection is currently limited to 6 hardcoded Indian metropolitan hubs.
2. **Synthetic Routing:** Polylines and waypoint curves are generated algorithmically rather than through live Google Maps or Mapbox Directions APIs.
3. **Simulated Threat Feeds:** Alerts, road condition ratings, and crime indices are generated via static rules and mock DB rows.
4. **Turn Navigation Absence:** Live GPS tracking does not provide real-time turn guidance, speed gauges, or route departure alarms.
5. **Simulated SOS Dispatch:** SOS dispatches provide simulated alerts and `tel:` links rather than active cellular/SMS API transmissions.
6. **PDF-Only Offline Map:** Offline mapping is provided as an exported PDF summary rather than vector tile caching in IndexedDB.

---
*Report certified for Phase 0 Baseline Audit.*
