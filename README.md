# Travel Guardian

> **Intelligent, Production-Quality Travel Safety & Navigation Platform**

Travel Guardian is a full-stack, AI-assisted travel safety and navigation application designed to protect travelers across regional corridors and highway networks. It combines multi-profile route intelligence, live Google Maps Platform spatial mapping, Gemini 1.5 Flash AI tool calling, dead-man check-in safety timers, offline survival packs, and multi-channel emergency SOS dispatch via India's National Emergency line (112) and Exotel telecommunications.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Architecture Diagrams](#architecture-diagrams)
- [Technology Stack](#technology-stack)
- [Environment Configuration](#environment-configuration)
- [Run & Installation Instructions](#run--installation-instructions)
- [Verification & Testing](#verification--testing)
- [Project Documentation](#project-documentation)

---

## 🔎 Overview

Travel Guardian bridges the critical gap between conventional turn-by-turn navigation apps (which optimize exclusively for speed or distance) and personal security. By evaluating road lighting, historical incident rates, verified safe havens, and cellular signal dead zones, Travel Guardian empowers solo travelers, women, families, and night drivers to make informed safety decisions.

---

## ⚠️ Problem Statement

Modern travelers face several unaddressed safety risks:
1. **Speed vs. Safety Blindspots**: Navigation services frequently route drivers through unlit, isolated rural roads to save 2–3 minutes, creating extreme vulnerability during nighttime or vehicle breakdowns.
2. **AI Hallucinations in Emergency**: Generic AI chatbots fabricate nearby hospitals, fake police stations, and invented distances when travelers need urgent assistance.
3. **Connectivity Vulnerability**: In cellular dead zones, cloud routing and emergency dispatch tools fail completely without offline vector corridors and emergency protocols.
4. **Passive Panic Buttons**: Traditional SOS buttons often rely on manual initiation during high-stress scenarios rather than automated fail-safe check-in timers.

---

## 🛡️ Solution

Travel Guardian resolves these issues through a multi-tiered architecture:
- **Deterministic Safety Fit Scoring**: Transparent 0–100 safety score evaluating lighting, police frequency, verified trauma centers, and traffic health.
- **Strictly Grounded AI Guardian**: Gemini 1.5 Flash assistant with deterministic tool calling; queries real GPS coordinates to locate verified havens with zero hallucination.
- **Two-Way Chat & Map Synchronization**: Chat queries ("What's near me?") plot verified pins directly onto the interactive Google Maps canvas, and map pin selection injects context into the assistant.
- **Automated Dead-Man Safety Check-In**: Configurable countdown cycles with grace periods. If unconfirmed, alerts escalate to trusted guardians via SMS/voice calls.
- **Exotel Emergency Telecommunications**: Masked caller IDs, regulatory E.164 phone normalization, request debouncing, and direct 112 dialing integration.
- **Offline Survival Architecture**: Pre-cached corridor routes, turn-by-turn instructions, and printable survival PDFs.

---

## 🌟 Key Features

1. **Multi-Profile Journey Planning (`/plan`)**:
   - Real road corridors via Google Routes API v2 (`TWO_WHEELER` for motorized motorcycles) and Google Directions (`DRIVE`, `WALK`).
   - Priority-based deterministic ranking: Maximum Safety (Safety-First), Time Priority (Fastest), and Balanced.
   - Dynamic route hierarchy: `#1 — HIGHEST PRIORITY (HIGHLY RECOMMENDED)`, `#2 — SECOND PRIORITY (SAFE ALTERNATIVE)`, `#3 — THIRD PRIORITY (ALTERNATIVE OPTION)`.
   - Tailored profiles: Solo Traveler, Solo Woman Traveller (Police & Emergency Focus), Family Travel, and Group.
2. **Interactive Live Navigation & Map (`/map`)**:
   - Google Maps JavaScript API interactive mapping with live GPS tracking, heading, and speed telemetry.
   - Translucent dark glassmorphism HUD (`LiveNavigationOverlay`) displaying live ETA, Speed, Heading, and Safety metrics.
   - Layers for 24/7 verified hospitals, police posts, EV charging, fuel bunks, and rest plazas.
3. **AI Guardian Assistant (`/assist`)**:
   - Dedicated split-view layout on desktop and responsive tab view on mobile.
   - Grounded tool execution over verified application state (`findNearbyPlace`, `readSafetyState`, `readCheckInState`, `getArrivalEstimate`).
   - Route-aware and travel-direction-aware search for fuel stations/petrol bunks and medical havens.
4. **Emergency Portal & 112 Safety Lock (`/emergency`)**:
   - Protected **112 Safety Lock**: DEACTIVATED by default with explicit confirmation modal opt-in preventing accidental or unauthorized emergency service calls. Zero automated test calls permitted.
   - Strict destination restriction: SMS and Voice alerts resolve strictly to stored, registered trusted guardians.
   - Standardized Section 21 SMS alert structure containing human-readable address, GPS coordinates, and direct Google Maps link.
   - Exotel Cloud Telephony (Singapore Regional Cluster) integration with truthful status reporting.
5. **Offline Survival Guardian (`/offline-mode`)**:
   - Zero-signal emergency checklists, nearest offline POI indexes, and PDF route generators.
6. **Unified Design System & Themes (`/settings`)**:
   - Daylight Travel Light Theme and Deep Night Corridor Dark Theme.
   - Accessible WCAG AA color tokens, smooth theme switching, and reduced-motion compliance.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (Next.js 16 + React 19 + Tailwind v4)"]
        UI[User Interface & Pages]
        SharedLoc[Shared Location Service]
        AIAssist[Travel Assistant UI]
        SyncMap[Guardian Map Sync]
        CheckIn[Safety Check-In Hook]
        ThemeProv[next-themes Provider]
    end

    subgraph ServerAPIs["Next.js Server Routes"]
        APIAI["/api/ai (Tool Calling)"]
    end

    subgraph CloudServices["External Cloud & AI Services"]
        GoogleMaps[Google Maps Platform & Places API]
        Gemini[Google Gemini 1.5 Flash]
    end

    subgraph BackendAPI["Backend Services (FastAPI + Python 3.11)"]
        FastAPIApp[FastAPI Server]
        ExotelSvc[Exotel Emergency Service]
        DB[(SQLite / Database)]
    end

    subgraph Telephony["Public Telecom & Emergency"]
        ExotelCloud[Exotel Telephony Cloud]
        Emergency112[National 112 Hotline]
        TrustedContacts[Trusted Contacts SMS/Voice]
    end

    UI --> SharedLoc
    SharedLoc --> GoogleMaps
    AIAssist <--> SyncMap
    AIAssist --> APIAI
    APIAI --> Gemini
    APIAI --> GoogleMaps
    SyncMap --> GoogleMaps
    CheckIn --> FastAPIApp
    UI -->|Emergency 112| Emergency112
    FastAPIApp --> ExotelSvc
    ExotelSvc --> ExotelCloud
    ExotelCloud --> TrustedContacts
    FastAPIApp --> DB
```

---

## 📊 Core User Workflows

### 1. "What's Near Me?" — Real GPS AI Synchronization
```mermaid
sequenceDiagram
    autonumber
    actor Traveler
    participant App as Travel Guardian UI
    participant GPS as Geolocation API
    participant AI as Gemini Tool Router
    participant Map as Guardian Map Sync

    Traveler->>App: "What's near me?" / "Find safe cafe"
    App->>GPS: Request Current Coordinates
    GPS-->>App: Latitude, Longitude (±Accuracy)
    App->>AI: queryTravelAssistant(prompt, { coordinates })
    AI->>AI: executeToolCall('findNearbyPlace')
    AI-->>App: Verified Places (Real Haversine Distances)
    App->>Map: Update Pinned Places
    Map->>Map: Drop Safe Haven Markers & Fit Bounds
    App-->>Traveler: Summarized verified places in chat
    Traveler->>Map: Clicks marker
    Map-->>Traveler: Shows directions & "Call 112/Phone"
```

### 2. Emergency Escalation Workflow
```mermaid
sequenceDiagram
    autonumber
    actor Traveler
    participant App as Emergency Hub UI
    participant Backend as FastAPI Emergency API
    participant Exotel as Exotel Telephony Gateway
    participant Contact as Trusted Contact Phone

    Traveler->>App: Trigger Emergency SOS
    App->>App: Confirm with anti-accidental dialog
    App->>Backend: POST /api/emergency/notify-trusted-contact
    Backend->>Backend: Resolve DB trusted contacts & normalize (+91)
    Backend->>Exotel: Dispatch emergency SMS & trigger voice call
    Exotel-->>Contact: Emergency SMS with live Google Maps coordinates
    Exotel-->>Contact: Outbound emergency IVR phone call
    Backend-->>App: 200 OK (Masked status response)
    App-->>Traveler: "Emergency alert dispatched successfully"
```

---

## 💻 Technology Stack

| Layer | Technology | Purpose | Status |
|---|---|---|---|
| **Frontend Framework** | Next.js 16 (Turbopack) | Server Components, routing, and PWA shell | Active |
| **Language** | TypeScript 5.9 | Static type checking and safety interfaces | Strict |
| **Styling & Tokens** | Tailwind CSS v4 + Vanilla CSS | CSS variables, responsive design, dark mode | Active |
| **Mapping Engine** | Google Maps JavaScript API | Interactive maps, route polylines, GPS markers | Active |
| **Places & Geocoding** | Google Places & Geocoder API | Autocomplete, reverse geocoding, and routing | Active |
| **AI Intelligence** | Gemini 1.5 Flash + Tool Router | Deterministic tool execution without hallucinations | Active |
| **Backend API** | FastAPI (Python 3.11) | REST endpoints, models, Exotel integration | Active |
| **Database** | SQLite / SQLAlchemy | User profiles, emergency contacts, incident reports | Active |
| **Telecommunications** | Exotel REST API | Emergency SMS dispatch and outbound voice IVR | Integrated |
| **Offline Engine** | Service Worker + Cache API | Offline corridor caching and PDF survival cards | Active |
| **Icons** | Lucide React | Consistent accessible iconography | Active |

---

## ⚙️ Environment Configuration

### Frontend (`frontend/.env.local`)
| Variable | Description | Exposure |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public Google Maps JavaScript API key | Public |
| `GOOGLE_ROUTES_API_KEY` | Server-only Routes API key used by `/api/routes/compute` (falls back to the key above if unset) | Server-Only |
| `GEMINI_API_KEY` | Google AI Studio API key for the AI Guardian assistant | Server-Only |
| `GEMINI_MODEL` | Target Gemini model, e.g. `gemini-2.5-flash` (the UI always displays whatever this is actually set to) | Server-Only |
| `BACKEND_API_URL` | Real FastAPI backend origin. The browser never talks to this directly -- Next.js proxies same-origin `/backend-api/*` requests to it (see `next.config.ts`), which is also what keeps the CSP `connect-src` from needing to name the backend host. | Server-Only |

### Backend (`backend/.env`)
| Variable | Description | Exposure |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy database connection string | Private |
| `CORS_ORIGINS` | JSON array of allowed frontend origins | Private |
| `EXOTEL_ACCOUNT_SID` | Exotel Account SID | Private |
| `EXOTEL_API_KEY` | Exotel API Key | Private |
| `EXOTEL_API_TOKEN` | Exotel API Token | Private |
| `EXOTEL_SUBDOMAIN` | Exotel cluster subdomain (e.g., `api.exotel.com`) | Private |
| `EXOTEL_EXOPHONE` | Approved Exotel virtual number (Caller ID), required for live calls | Private |
| `EXOTEL_APP_ID` | Optional ExoML Voice App ID for automated outbound emergency calls | Private |
| `EXOTEL_DRY_RUN` | **Defaults to `true`.** While true, every Exotel SMS/call request is fully built and validated but never actually sent; the response reports `status: "dry_run"`. Set to `false` only once real, KYC-approved credentials and an ExoPhone are configured. | Private |
| `SEED_RESET` | Defaults to `false`. When true, `python seed.py` wipes and re-inserts demo destinations/alerts. Emergency contacts and check-ins are never touched by seeding regardless. | Private |
| `DISABLE_API_DOCS` | Defaults to `false`. Set to `true` in production to hide `/docs`, `/redoc`, `/openapi.json`. | Private |

*(Never commit actual secret values or credentials to Git).*

---

## 🚀 Run & Installation Instructions

### Prerequisites
- Node.js 18.17+ or 20+
- Python 3.10+
- Git

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the application at [http://localhost:3000](http://localhost:3000).

To build the production bundle:
```bash
npm run build
npm run start
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```
API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 🧪 Verification & Testing

### Frontend Type Safety & Production Build
```bash
cd frontend
npx tsc --noEmit
npm run build
```

### Backend Unit & Integration Tests
```bash
cd backend
.\venv\Scripts\activate
python -m unittest discover -s tests
```
All 13 Exotel communication and API tests validate successfully.

---

## 📚 Project Documentation

- [Master Project Audit](docs/audits/PROJECT_AUDIT.md) — Comprehensive architectural analysis, root cause audits, and engineering verification.
- [Issue Inventory & Resolution Tracker](docs/issues/issues.md) — Detailed registry of all identified issues and their verified solutions.
- [Unresolved Issues Tracker](docs/issues/tobe-resolved.md) — Status of any open architectural items.
- [Exotel Emergency Setup](docs/EXOTEL_SETUP.md) — Telecommunications configuration for the Exotel Singapore cluster, phone normalization, and DLT compliance.

## 📄 License & Disclaimer

Travel Guardian is designed for real-world personal travel safety. Simulated datasets (e.g. mock incident reports or demo emergency keys) are clearly isolated to prevent false alerts during development. Emergency hotline 112 should only be dialed during genuine life-safety emergencies.
