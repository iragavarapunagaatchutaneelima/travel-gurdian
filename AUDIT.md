# 🔎 TRAVEL GUARDIAN — COMPLETE PROJECT AUDIT

**A full, pin-to-pin, edge-to-edge technical report of the entire project — history, architecture, every feature's real workflow, every technology used, every known issue and every fix applied.**

Written in plain English. This document is the deep-dive companion to [`README.md`](./README.md) (which tells you *how to run it*) — this file tells you *everything about what it is, how it works internally, where it came from, and exactly what state it's in today.*

> **Report date:** 26 September 2026
> **Project age:** ~29 days (first commit 28 Aug 2026, most recent 26 Sep 2026)
> **Total commits:** 19 · **Contributors:** 2 human developers + AI-assisted engineering passes
> **Codebase size:** ~19,900 lines of TypeScript/TSX (frontend) + ~3,150 lines of Python (backend)

> **⚠️ Post-publication update (27 September 2026):** everywhere this report
> mentions **Exotel** as the emergency SMS/voice-call provider, that has since
> been **replaced with Twilio** behind a new `EmergencyCommunicationProvider`
> abstraction (`backend/app/services/communication/`), so the app is not
> tied to one vendor. The `exotel_service.py` file, `EXOTEL_*` environment
> variables, and `docs/EXOTEL_SETUP.md` referenced below no longer exist —
> see `backend/app/services/comms_service.py`, `TWILIO_*` in
> `backend/.env.example`, and [`docs/TWILIO_SETUP.md`](docs/TWILIO_SETUP.md)
> instead. The architecture, safety rules (dry-run default, `is_primary`
> contact resolution, device-identity scoping) and behavior described below
> are otherwise unchanged — only the vendor name and env var prefix changed.

---

## Table of Contents

1. [What is Travel Guardian, in one page](#1-what-is-travel-guardian-in-one-page)
2. [Project history — how it got here](#2-project-history--how-it-got-here)
3. [Complete technology inventory (A to Z)](#3-complete-technology-inventory-a-to-z)
4. [System architecture](#4-system-architecture)
5. [Repository map — every folder explained](#5-repository-map--every-folder-explained)
6. [Database — every table explained](#6-database--every-table-explained)
7. [API reference — every backend endpoint](#7-api-reference--every-backend-endpoint)
8. [Feature-by-feature workflow diagrams](#8-feature-by-feature-workflow-diagrams)
9. [The "no fabrication" principle](#9-the-no-fabrication-principle)
10. [Security model](#10-security-model)
11. [Everything that was found broken, and what was done about it](#11-everything-that-was-found-broken-and-what-was-done-about-it)
12. [Current test coverage](#12-current-test-coverage)
13. [What still needs attention](#13-what-still-needs-attention)
14. [Glossary of terms used in this project](#14-glossary-of-terms-used-in-this-project)

---

## 1. What is Travel Guardian, in one page

Travel Guardian is a **travel safety web app** built as a Progressive Web App (installable like a phone app). A traveler — say, someone riding a motorbike from Chennai to Bangalore — uses it to:

1. **Plan a route** and see which of 2–3 real road options is statistically "safer" (more hospitals, police stations, fuel stops nearby).
2. **Navigate live**, with the app tracking GPS, telling them if they've gone off-route, and offering to recalculate.
3. **Set a safety timer** ("check in every 15 minutes") so that if they go silent, someone is told automatically.
4. **Press SOS** in a real emergency, which texts and calls a pre-registered trusted contact with their exact location.
5. **Ask an AI assistant** things like "where am I?" or "find a petrol station" and get answers grounded in their actual GPS position — never a guess.

It is built by two people (`senapathiyaswanth` and `Iragavarapu Naga Atchuta Neelima`) as a personal/portfolio safety-tech project, using free-tier and pay-as-you-go cloud services (Google Cloud, Google AI Studio, Exotel) rather than enterprise infrastructure.

---

## 2. Project history — how it got here

The project was built in a rapid, iterative style typical of a solo/two-person hackathon-to-product journey. Reconstructing the commit history:

| Date | Commit | What happened |
|---|---|---|
| 28 Aug 2026 | `b8c72ff` | **Initial commit.** "Travel Guardian Safety Suite MVP" — the very first skeleton of the app. |
| ~ | `8428b02` | A full redesign pass: "unified theme tokens, 6-city routing, and Gemini AI" — this is where the visual design, the 6 quick-select Indian cities (Chennai, Mumbai, Delhi, Hyderabad, Bangalore, Vizag), and the first Gemini AI integration were introduced. |
| ~ | `a74b582`, `f838347` | General project updates and iteration by the second contributor. |
| ~ | `2bf642e` | An API key rotation ("api key update") — a signal that a key had been exposed or needed refreshing. |
| ~ | `22d1d3b` | "fix: resolve Google Maps routing configuration" — an early attempt to fix routing problems (this is the point where the project's Google Maps/Routes integration became a recurring pain point). |
| ~ | `83d2c5a` | Housekeeping: added `.env.example` files and `.gitignore` rules — a sign the team was cleaning up secret-handling practices. |
| ~ | `f7f9217` | A direct edit to a **committed** `.env.local` file — meaning at this point in history, real secrets were briefly stored directly in git. This is now fixed (see §10), but the old values remain in git *history* until the repository history itself is rewritten or the repo is recreated. |
| 25 Sep 2026 | `5d5b0a1` | "Integrate Exotel API and update SOS calling workflow" — the emergency SMS/voice-call system was added. This is also the point where a large batch of self-generated audit documents (`AUDIT.md`, `PROJECT_AUDIT.md`, `FINAL_QA.md`, etc.) briefly existed in the repo, describing the project as "production ready" — those documents' claims were later found not to hold up under closer inspection (see §11) and were removed. |
| 26 Sep 2026 | `e6c0f77` → `609ed4f` (9 commits) | **A full remediation pass.** Every issue described in §11 was found, reproduced, fixed, and verified — CSP/backend connectivity, fabricated data removal, authentication, Exotel safety gating, the map's infinite-loading bug, the AI Guardian's silent failures, and four additional bugs reported directly by the project owner after hands-on testing (Live Map memory, AI Guardian empty results, missing Cancel button, doubled error messages). |
| 26 Sep 2026 | `858015d` | README.md and LICENSE completely rewritten to a professional standard (MIT license, both contributors credited). |

**In short:** this project went through a normal, honest arc — a fast MVP build, feature bolt-ons, a period where things looked "done" on paper but weren't verified end-to-end, and then a rigorous audit-and-repair pass that actually ran the code, reproduced every bug, and fixed the root cause of each one rather than papering over symptoms.

---

## 3. Complete technology inventory (A to Z)

Every piece of technology this project actually uses, alphabetically:

| Technology | Role | Where |
|---|---|---|
| **App Router** (Next.js) | File-based routing system for every page | `frontend/src/app/` |
| **Content-Security-Policy (CSP)** | Browser-enforced security header restricting what the app is allowed to load/connect to | `frontend/next.config.ts` |
| **Cryptography (Python lib)** | Backend dependency (transitively required by other libs) | `backend/requirements.txt` |
| **CSS custom properties / design tokens** | Theming system (`--primary`, `--surface`, etc.) for light/dark mode | `frontend/src/app/globals.css` |
| **Device-identity cookie** | A custom, homegrown lightweight "who is this browser" mechanism (not a full login system) | `backend/app/core/identity.py` |
| **Docker / Dockerfile / docker-compose** | Containerization for both frontend and backend, plus a local MySQL stack | `frontend/Dockerfile`, `backend/Dockerfile`, `docker-compose.yml` |
| **ESLint** | JavaScript/TypeScript code-quality linter | `frontend/eslint.config.mjs` |
| **Exotel** | Third-party Indian telecom API used to send real SMS and place real phone calls for emergencies | `backend/app/services/exotel_service.py` |
| **FastAPI** | The Python web framework the entire backend REST API is built on | `backend/app/main.py` |
| **Geocoding API** (Google) | Converts GPS coordinates ↔ human addresses | `frontend/src/services/googlePlaces.ts` |
| **Gemini API** (Google AI) | The large language model powering the "AI Guardian" chat assistant | `frontend/src/app/api/ai/route.ts` |
| **Git / GitHub** | Version control and remote hosting | this repository |
| **Google Cloud Platform** | Hosts all the Google Maps Platform APIs used | — |
| **Google Maps JavaScript SDK** | Renders the interactive map in the browser | `frontend/src/services/googlePlaces.ts`, `frontend/src/app/map/page.tsx` |
| **Google Places API** (classic + "New") | Finds real hospitals, police stations, fuel stations, cafés, etc. near a location | `frontend/src/services/googlePlaces.ts`, `frontend/src/services/geminiToolRouter.ts` |
| **Google Routes API v2** | Computes real motorized two-wheeler (motorbike/scooter) routes, with toll data | `frontend/src/app/api/routes/compute/route.ts` |
| **httpOnly cookies** | Browser-storage mechanism used for the device-identity cookie, inaccessible to JavaScript (an anti-theft measure) | backend-set, via FastAPI's `Response.set_cookie` |
| **httpx** | Python HTTP client library, used only by the test suite | `backend/requirements.txt` |
| **jsPDF** | Generates downloadable PDF "survival cards" for offline use | `frontend/src/services/survivalPdfGenerator.ts` |
| **JSON Web-style device cookie** *(not JWT — see Security Model)* | — | — |
| **Lucide React** | The icon library used throughout the UI | all `frontend/src/app/components/*.tsx` |
| **Next.js 16 (with Turbopack)** | The core web framework: renders pages, runs the server, bundles the app | `frontend/` (entire folder) |
| **Node.js** | JavaScript runtime the frontend server runs on | — |
| **npm** | Package manager for the frontend/root workspace | `package.json` files |
| **Pydantic / pydantic-settings** | Python data-validation library; also reads environment variables into typed settings objects | `backend/app/core/config.py`, `backend/app/schemas/schemas.py` |
| **PWA (Progressive Web App) / Web App Manifest** | Makes the app installable on a phone home screen | `frontend/public/manifest.json` |
| **Python** | The backend's programming language | `backend/` (entire folder) |
| **React 19** | The UI library Next.js is built on | `frontend/src/` |
| **React Hooks (custom)** | `useLiveNavigation`, `useSafetyCheckIn`, `useSharedLocation`, etc. — the app's core stateful logic | `frontend/src/hooks/` |
| **Service Worker** (hand-written, no framework) | Caches the app shell for offline use | `frontend/public/sw.js` |
| **SQLAlchemy 2** | Python ORM (Object-Relational Mapper) — turns database rows into Python objects | `backend/app/models/models.py` |
| **SQLite** | The default local database file | `backend/travel_guardian.db` |
| **Tailwind CSS 4** | Utility-class-based CSS styling framework | throughout `frontend/src` |
| **TestClient** (FastAPI) | Used to test the backend's HTTP layer without a real running server | `backend/tests/test_api_integration.py` |
| **tsx** | Runs TypeScript files directly as scripts, no compile step | `frontend/src/scripts/` |
| **TypeScript** | Adds type-safety on top of JavaScript across the entire frontend | `frontend/src/**/*.ts(x)` |
| **unittest** (Python standard library) | The backend's test framework | `backend/tests/` |
| **Uvicorn** | The ASGI server that actually runs the FastAPI app | `backend/app/main.py` entry point |
| **UUID (Python `uuid` module)** | Generates the random device-identity cookie value | `backend/app/core/identity.py` |
| **Vercel** | The recommended hosting platform for the frontend (not currently deployed there, per this session's testing — local only) | — |
| **Web Geolocation API** (browser-native) | The actual GPS/location data source (`navigator.geolocation`) | `frontend/src/hooks/useLiveNavigation.ts`, others |
| **XML/JSON dual parsing** | The Exotel service can parse either XML or JSON responses from Exotel's API, since Exotel's API is inconsistent | `backend/app/services/exotel_service.py` |

---

## 4. System architecture

### 4.1 The big picture

```
┌──────────────────────────────────────────────────────────────────┐
│                         YOUR BROWSER                              │
│                                                                     │
│   Next.js React app  ·  Google Maps SDK  ·  Service Worker          │
│   (runs on your phone/laptop)                                      │
└───────────────┬─────────────────────────────┬─────────────────────┘
                │                              │
                │ (1) same-origin fetch         │ (2) direct browser calls
                ▼                              ▼
┌────────────────────────────────┐   ┌──────────────────────────────┐
│   NEXT.JS SERVER (Node.js)     │   │   GOOGLE'S SERVERS             │
│                                 │   │                               │
│  /api/routes/compute  ────────►│──►│ Routes API v2 (motorbike       │
│    hardened proxy               │   │   routing + real tolls)       │
│                                 │   │ Maps JS SDK (map tiles,        │
│  /api/ai  ──────────────────►  │──►│   autocomplete, geocoding)     │
│    Gemini + "tool router" +    │   │ Places API (nearby search)    │
│    real Google Places lookup    │   └──────────────────────────────┘
│                                 │
│  /backend-api/*  ──────────────│──┐  (3) invisible proxy —
│    forwards to the real backend │  │  the browser never sees the
│    without the browser ever    │  │  real backend address
│    knowing its address         │  │
└─────────────────────────────────┘  │
                                      ▼
                        ┌─────────────────────────────┐
                        │   FASTAPI BACKEND (Python)    │
                        │                                │
                        │  Trusted contacts CRUD          │
                        │  Safety check-in timers          │
                        │  Emergency dispatch logic         │
                        │  Background scheduler thread       │
                        │  (polls every 5 seconds for         │
                        │   overdue check-ins)                 │
                        └──────────┬─────────────┬─────────────┘
                                   ▼             ▼
                     ┌──────────────────┐  ┌──────────────────────┐
                     │  SQLite DATABASE  │  │  EXOTEL (SMS + Call)   │
                     │  (or MySQL)        │  │  (real phone network)  │
                     └────────────────────┘  └────────────────────────┘
```

### 4.2 Why there are *two* ways of talking to Google

This confuses people at first, so it's worth explaining clearly:

- **Car and Walk routes** are computed **directly in your browser** using Google's old-style `DirectionsService`. Your browser calls Google directly.
- **Bike (motorized two-wheeler) routes** are computed by asking **the Next.js server** to call Google's newer Routes API on your behalf. This is because the *old* Directions API has no concept of "motorbike" — only "car," "walk," "bicycle," and "transit." A human-powered bicycle (`BICYCLING`) is a completely different thing from a motorized scooter, and using the wrong one would give wrong route advice (e.g. routing you down a highway a bicycle isn't allowed on, or avoiding a highway a motorbike is allowed and expected to use). Only the newer Routes API has a true `TWO_WHEELER` mode for motorbikes/scooters, and only a server (not a public browser page) should hold the kind of API key that newer API needs.

### 4.3 Why the browser never talks to the backend directly

Early in this project, the browser tried to call the FastAPI backend directly (e.g. `http://your-backend.com/api/...`). This was blocked by the browser's own Content-Security-Policy — a security header that says "this webpage is only allowed to talk to these specific addresses." Rather than loosen that security header (which would make the app less safe), the fix was to make the *Next.js server itself* act as a relay: your browser only ever talks to its own address (`/backend-api/...`), and the Next.js server quietly forwards that to wherever the real backend actually lives. This is called a **reverse proxy**, and it means:
- The browser's security policy stays strict.
- The backend's real network address is never exposed to anyone using the app.
- If you ever move the backend to a different server, only one setting (`BACKEND_API_URL`) needs to change — nothing in the browser code does.

---

## 5. Repository map — every folder explained

```
travel-gurdian/
│
├── frontend/                          Everything the user's browser runs
│   ├── src/app/                       Every PAGE of the app (Next.js "App Router")
│   │   ├── page.tsx                   Landing page
│   │   ├── dashboard/                 Home dashboard after "login"
│   │   ├── plan/                      "Plan Journey" — pick origin/destination/mode
│   │   ├── map/                       "Live Map" — the actual navigation screen
│   │   ├── assist/                    "AI Guardian" chat assistant
│   │   ├── emergency/                 SOS button, trusted contacts, 112 dialer
│   │   ├── settings/, profile/        Account-level preference screens
│   │   ├── offline/, offline-mode/    Offline survival mode
│   │   ├── guide/, assess/, sense/, history/   Secondary/lower-priority features
│   │   ├── login/, signup/            Placeholder auth screens (not wired to real accounts)
│   │   ├── api/                       Server-side "route handlers" (see below)
│   │   │   ├── ai/route.ts            The AI Guardian's brain: talks to Gemini
│   │   │   └── routes/compute/route.ts The motorbike-routing proxy to Google
│   │   └── components/                Every reusable UI piece (buttons, modals, nav bars)
│   │
│   ├── src/services/                  Pure logic, no UI — the "business logic" layer
│   │   ├── api.ts                     The one place that talks to the FastAPI backend
│   │   ├── googlePlaces.ts            Autocomplete, geocoding, "nearby search"
│   │   ├── googleRoutes.ts            Turns raw Google route data into the app's format
│   │   ├── safetyEngine.ts            Computes the 0–100 "Safety Fit" score
│   │   ├── geminiToolRouter.ts        Lets the AI assistant safely call app functions
│   │   ├── geminiService.ts           Sends chat messages to `/api/ai`
│   │   ├── notificationService.ts     Builds and sends the check-in escalation alert
│   │   ├── trustedContactService.ts   Keeps the trusted-contact list in sync
│   │   ├── locationContext.ts         Shared GPS state used by multiple screens
│   │   ├── navigationMath.ts          Distance/off-route/arrival math
│   │   ├── offlineStorageService.ts, offlineTileService.ts  Offline pack management
│   │   ├── incidentService.ts         Community hazard reports
│   │   └── survivalPdfGenerator.ts    The offline PDF generator
│   │
│   ├── src/hooks/                     Custom React hooks (reusable stateful behavior)
│   │   ├── useLiveNavigation.ts       GPS tracking, off-route detection, rerouting
│   │   ├── useSafetyCheckIn.ts        The Dead-Man's-Switch timer state machine
│   │   ├── useSharedLocation.ts       Cross-page GPS state
│   │   └── usePwaManager.ts, useOfflineStatus.ts   PWA install prompts, connectivity
│   │
│   ├── src/types/                     TypeScript type definitions (the "shape" of all data)
│   ├── src/data/                      Static reference data (the 6 quick-select cities, etc.)
│   ├── src/scripts/                   Standalone test scripts (run with `tsx`, not Jest)
│   ├── public/                        Static files: manifest.json, sw.js, icons, images
│   └── Dockerfile                     How to build the frontend as a container
│
├── backend/                            Everything that runs on the server, not the browser
│   ├── app/
│   │   ├── main.py                    The FastAPI app itself: startup, routers, migrations
│   │   ├── api/                       Each file = one group of URL endpoints
│   │   │   ├── assist.py              Contacts, check-ins, SOS (the "core" endpoints)
│   │   │   ├── emergency.py           Duplicate/aliased emergency endpoints (see §7)
│   │   │   ├── guide.py               Destination info (Tokyo, Paris, etc. — a demo feature)
│   │   │   ├── assess.py              Trip risk scoring (a demo feature)
│   │   │   └── alerts.py              Community/regional hazard alerts (a demo feature)
│   │   ├── core/
│   │   │   ├── config.py              Reads every environment variable into one object
│   │   │   ├── database.py            Sets up the SQLite/MySQL connection
│   │   │   └── identity.py            The device-identity cookie system
│   │   ├── models/models.py           The 6 database tables, defined as Python classes
│   │   ├── schemas/schemas.py         The shape of every API request/response
│   │   └── services/
│   │       ├── assist.py              The real logic behind contacts/check-ins/SOS
│   │       ├── exotel_service.py      All the code that talks to Exotel's API
│   │       ├── checkin_scheduler.py   The background thread that watches for overdue check-ins
│   │       ├── assess.py, sense.py    Logic for the demo risk/alert features
│   │       └── (none for guide — it's static data)
│   ├── tests/                          8 test files, 68 tests total (see §12)
│   ├── seed.py                         Fills the database with example destinations/alerts
│   └── Dockerfile                       How to build the backend as a container
│
├── docs/                                Supplementary documentation
│   ├── EXOTEL_SETUP.md                  Step-by-step Exotel account setup guide
│   ├── architecture/, audits/, issues/, phase-reports/   Historical working notes
│
├── docker-compose.yml                   Brings up MySQL + backend + frontend together
├── .env.example                         Root-level list of every environment variable
├── LICENSE                               MIT License
├── README.md                             How to install, configure, and run the project
└── AUDIT.md                              **This file.**
```

---

## 6. Database — every table explained

The database has **6 tables**. By default it's a single SQLite file (`backend/travel_guardian.db`) — one file on disk, no separate database server needed. It can be switched to MySQL by changing one environment variable (`DATABASE_URL`).

| Table | What it stores | Key columns |
|---|---|---|
| **`emergency_contacts`** | Your trusted guardian(s) | `name`, `phone`, `relation`, `is_enabled`, **`is_primary`** (exactly one contact per device is always the primary — the one who actually gets contacted), `user_id` (the device-identity cookie value, not a real username) |
| **`safe_checkins`** | Active and past safety check-in timers | `target_time` (when you must confirm safety by), `escalation_status` (`pending` → `escalating` → `escalated`/`confirmed_safe`/`cancelled`/`dry_run`), `last_known_latitude/longitude` (your GPS at the time), `dispatch_sms_sid`/`dispatch_call_sid` (proof of what Exotel actually did) |
| **`emergency_event_logs`** | An audit trail of every SOS/SMS/call attempt, ever | `event_type`, `status`, `recipient_phone_masked` (the phone number with the middle digits hidden, e.g. `+9198*****362`), `sid` |
| **`destinations`** | Demo reference data about 5 world cities (Tokyo, Rio, Paris, Cairo, New York) for the "Guide" feature | `base_safety_score`, `cultural_tips_json`, `local_laws_json` |
| **`alerts`** | Demo hazard alerts (a protest in Paris, a typhoon near Tokyo, etc.) for the "Sense" feature | `category`, `severity`, `latitude/longitude`, `radius_km` |
| **`risk_reports`** | Saved results of the "Assess" trip-risk calculator | `overall_score`, `score_breakdown_json` |

**Important distinction:** `emergency_contacts` and `safe_checkins` are **real user data** — the app never wipes these automatically. `destinations`, `alerts`, and `risk_reports` are **demo/reference data** — safe to reset, and only ever reset if you explicitly ask for it (`SEED_RESET=true`).

---

## 7. API reference — every backend endpoint

The backend exposes **44 distinct route registrations** (some are intentional duplicates — see note below). Grouped by purpose:

### Trusted contacts (`/api/assist/contacts`)
| Method | Path | What it does |
|---|---|---|
| GET | `/contacts` | List your trusted contacts |
| POST | `/contacts` | Add a new contact (validates the phone number, rejects duplicates) |
| PUT / PATCH | `/contacts/{id}` | Edit a contact, including making it the primary |
| DELETE | `/contacts/{id}` | Remove a contact |

### Safety Check-In / Dead-Man's-Switch (`/api/assist/checkin`)
| Method | Path | What it does |
|---|---|---|
| GET | `/checkin` | List all your check-in timers |
| GET | `/checkin/active` | Get the one currently-running timer |
| POST | `/checkin` | Start a new timer |
| POST | `/checkin/confirm` | "I'm Safe" — cancels the timer safely |
| POST | `/checkin/cancel` | Stop monitoring without confirming safety |
| POST | `/checkin/location` | Update the GPS snapshot attached to the active timer |
| POST | `/checkin/check-overdue` | Manually trigger the overdue-check sweep (normally automatic) |
| GET | `/checkin/scheduler-status` | See if the background scheduler is alive, and its stats |

### Emergency dispatch (`/api/emergency/*` and `/api/assist/*`, intentionally duplicated)
| Method | Path | What it does |
|---|---|---|
| POST | `/sms` | Send an emergency SMS to your primary trusted contact |
| POST | `/call` | Place an emergency voice call to your primary trusted contact |
| POST | `/notify-trusted-contact` | Do both SMS and call in one request |
| POST | `/sos` | The full "SOS" broadcast, including a list of national emergency lifelines |
| GET | `/config-status` | Check whether Exotel is configured, and whether dry-run mode is on |
| GET | `/diagnostic` | Safely test the Exotel connection (a real API call that costs nothing — it just checks account balance) |
| GET | `/logs` | View the audit trail of past emergency actions |

*Why the duplication?* Both `/api/emergency/sms` and `/api/assist/sms` (and their siblings) do the exact same thing — this was a deliberate design decision early in the project to make the API forgiving of two different frontend calling conventions that existed at different points in development. It is redundant but harmless.

### Secondary/demo features
| Method | Path | What it does |
|---|---|---|
| GET/POST | `/api/alerts/` | Regional hazard alerts |
| POST | `/api/assess/` | Trip risk score calculator |
| GET | `/api/assess/history` | Past risk assessments |
| GET | `/api/guide/destinations` | List of demo destination guides |
| GET | `/api/guide/destination/{name}` | Details for one destination |

### Frontend-only endpoints (not part of the FastAPI backend)
| Method | Path | What it does |
|---|---|---|
| POST | `/api/ai` | The AI Guardian chat endpoint (talks to Gemini) |
| POST | `/api/routes/compute` | The motorbike-routing proxy (talks to Google Routes API) |

---

## 8. Feature-by-feature workflow diagrams

### 8.1 Plan a Journey → See Safety Scores

```
 User types origin & destination
              │
              ▼
   Google Places Autocomplete
   (real suggestions as you type)
              │
              ▼
     User picks a suggestion
              │
              ▼
   Google Place Details lookup
   (gets exact latitude/longitude)
              │
              ▼
      User picks Car / Bike / Walk
              │
      ┌───────┴────────┐
      ▼                ▼
   Car or Walk      Bike (motorbike)
   → browser calls   → browser calls OUR
     Google directly    server, which calls
     (DirectionsService) Google Routes API v2
      │                │
      └───────┬────────┘
              ▼
   2–3 real road routes come back
   (with real distance, duration,
    turn-by-turn steps, toll info)
              │
              ▼
   For each route: sample 2 points
   along it, ask Google Places:
   "how many hospitals/police/fuel
    stations/rest stops nearby?"
              │
              ▼
   Safety Engine combines those
   counts + your traveler profile
   (Solo / Family / Group / Solo
   Woman) into a 0–100 score
              │
              ▼
   Routes are ranked and shown,
   best one highlighted
```

### 8.2 Live Navigation

```
 User taps "Start Live Navigation"
              │
              ▼
   Browser asks for GPS permission
              │
     ┌────────┴─────────┐
     ▼ granted           ▼ denied
  Real GPS watch      Honest message:
  starts (updates      "Location permission
  every ~2 seconds)     denied" — NEVER a
     │                   fake position
     ▼
  Every GPS update:
   • recalculate % of route done
   • recalculate ETA
   • check: are you within 80m
     of the route line?
     ┌────────┴─────────┐
     ▼ yes (on route)    ▼ no, for 3 fixes in a row
  Keep navigating      Status → OFF_ROUTE,
                        offers "Recalculate Route"
                              │
                              ▼
                     Calls Google again from your
                     CURRENT position, shows the
                     new route, waits for you to
                     approve or reject it
```

### 8.3 Safety Check-In (Dead-Man's Switch)

```
 User sets an interval (e.g. 15 min)
 and a grace period (e.g. 2 min)
              │
              ▼
  App tells the BACKEND: "expect a
  check-in from me by [time]"
  (this is the authoritative timer —
   it lives on the server, not just
   in your browser tab)
              │
              ▼
        Countdown runs...
              │
     ┌────────┴─────────┐
     ▼ You tap "I'm Safe" ▼ Time runs out
  Timer resets,          Status → GRACE PERIOD
  new cycle starts        (extra buffer time)
                                │
                       ┌────────┴─────────┐
                       ▼ You confirm       ▼ Still no response
                     in time             GRACE PERIOD expires
                    Cancelled safely           │
                                                ▼
                                   Backend scheduler (checks
                                   every 5 seconds) detects
                                   the overdue timer
                                                │
                                                ▼
                                   Resolves your PRIMARY
                                   trusted contact + your
                                   last known GPS location
                                                │
                                                ▼
                                   Sends real SMS + real call
                                   via Exotel (or, if
                                   EXOTEL_DRY_RUN=true,
                                   builds and validates the
                                   request but does NOT send it)
```

### 8.4 Emergency SOS

```
 User taps the SOS button
              │
              ▼
  Explicit confirmation screen:
  "Send SOS Broadcast?" — nothing
  is sent until you tap again
              │
              ▼
  5-second cancellable countdown
              │
     ┌────────┴─────────┐
     ▼ You cancel        ▼ Countdown reaches 0
  Nothing sent          Browser gets your GPS
  at all                (or proceeds without it
                          if denied — never fakes
                          a location)
                              │
                              ▼
                   Backend resolves your PRIMARY
                   trusted contact (the frontend
                   NEVER decides who gets contacted
                   — only the backend does, from
                   its own database)
                              │
                              ▼
                   Sends emergency SMS with your
                   real coordinates + a Google
                   Maps link, and places a call
                              │
                              ▼
                   Result shown honestly:
                   "sent" / "dry_run" / "failed"
                   — never a fake success
```

### 8.5 AI Guardian Assistant

```
 User types a question
              │
              ▼
   Is it "Where am I?" / "my location"?
     ┌────────┴─────────┐
     ▼ yes                ▼ no
  Answered directly    Sent to Gemini (Google's AI)
  from real GPS,        along with a list of "tools"
  no AI involved         Gemini is allowed to call
  at all                       │
                                ▼
                    Gemini decides: does this need
                    real data? (e.g. "find a hospital"
                    needs the findNearbyPlace tool)
                                │
                       ┌────────┴─────────┐
                       ▼ needs a tool       ▼ just conversation
                 App runs the REAL         Gemini answers using
                 function (checks the       only what it already
                 route's real POIs first,    knows from context
                 then a live Google Places
                 search if needed)
                       │
                       ▼
              Real result (or an honest
              "nothing found nearby")
              is handed back to Gemini,
              which explains it in
              plain language
```

---

## 9. The "no fabrication" principle

This is the single most important design rule in the entire codebase, and it's worth explaining *why* it matters so much for a safety app specifically:

> **If the app doesn't actually know something, it must say so. It must never invent a plausible-looking answer.**

Concretely, this rule was enforced (or, in several cases, **fixed after being found violated** — see §11) in every one of these places:

- **Nearby places:** if Google genuinely has no hospital/pharmacy/fuel station nearby, the app says "no verified places found" — it used to silently invent a named business (e.g. "Apollo 24/7 Pharmacy") at a random nearby coordinate, which is dangerous: a user in a real emergency might trust and drive toward a business that doesn't exist there.
- **GPS location:** if permission is denied or GPS hasn't locked yet, the badge says "Location permission denied" or "Waiting for location" — it used to say "REAL GPS ACTIVE" regardless of whether GPS was actually working.
- **Safety scores:** if no route has been calculated yet, the AI assistant says so — it used to default to "85/100" as a made-up placeholder.
- **Toll information:** if Google's data doesn't confirm tolls either way, the app says "Toll information unavailable" instead of a false "No Tolls Reported."
- **Emergency dispatch:** if `EXOTEL_DRY_RUN` is on (the default), the result is explicitly labeled `dry_run` — never disguised as a real "sent" success.
- **Backend connectivity:** if the backend can't be reached, the app used to silently fall back to a **fake, made-up list of contacts stored only in the browser** — meaning a Dead-Man's-Switch could look "armed" on screen while nothing was actually registered anywhere. This is now impossible: every check-in/contact action either genuinely succeeds against the real backend or visibly tells you it failed.

---

## 10. Security model

- **No traditional login system.** There are `/login` and `/signup` pages, but they are not wired to any real authentication — they're placeholders. Instead, each browser is given a random, hidden (`httpOnly`) cookie called `tg_device_id` the first time it visits. Every contact, check-in, and emergency-log request is tied to that cookie's value, not to a username/password. This means: **your data is scoped to "this specific browser/device," not to "you" as a person** — if you clear your cookies or use a different browser, you'll start with an empty contact list.
- **The backend is never reachable directly from the internet-facing browser** — only through the Next.js proxy (§4.3).
- **The motorbike-routing proxy** validates every request strictly: it checks coordinates are real numbers in valid ranges, only allows known travel modes, rejects requests pretending to come from a different website, and limits how many requests one visitor can make per minute.
- **Exotel dispatch defaults to "dry run."** Nothing is ever actually texted or called to a real phone number unless someone deliberately sets `EXOTEL_DRY_RUN=false` with real, verified Exotel credentials.
- **Phone numbers are masked everywhere they're displayed or logged** (e.g. `+9198*****362`) — the full number is never written to a log file.
- **Historical secret exposure:** as noted in §2, an early commit (`f7f9217`) directly modified a committed `.env.local` file, meaning real API key values were in git history at that point. This has since been cleaned up going forward (no `.env` file is tracked today, and `.gitignore` blocks it), but **anyone with access to the full git history can still see those old values** unless the git history itself is rewritten. It is strongly recommended that any Google Maps or Gemini API key that was ever committed be rotated (regenerated) in the Google Cloud Console, since a key's safety depends on it being secret, not on where it's currently referenced from.

---

## 11. Everything that was found broken, and what was done about it

This section is the honest "before and after" — every real problem discovered while actually running the app (not just reading the code), and exactly what fixed it.

### 11.1 Found during the full system audit (backend connectivity, fabrication, safety gaps)

| # | Problem found | Root cause | Fix |
|---|---|---|---|
| 1 | Browser couldn't reach the backend at all | The Content-Security-Policy didn't allow it | Added the same-origin `/backend-api/*` proxy (§4.3) |
| 2 | AI assistant invented fake hospitals/pharmacies with fake phone numbers | A "fallback" code path generated fictional businesses at random coordinate offsets when Google returned nothing | Deleted entirely; now returns an honest empty result or a real live Google Places lookup |
| 3 | Emergency contact list showed a demo contact ("Sarah Miller") and a placeholder number that anyone testing the app might accidentally message | Leftover demo/seed data from early development | Purged automatically on server startup; contacts are now real-only |
| 4 | No way to reliably know *who* would receive an SOS if multiple contacts existed | The "primary" contact was just "whichever database row came back first," which isn't guaranteed to be stable | Added an explicit `is_primary` flag with deterministic assignment/reassignment rules |
| 5 | Anyone could read or modify anyone else's contacts by guessing a `?user_id=` value in the URL | The API trusted a value the browser sent, with no verification | Replaced with the hidden device-identity cookie (§10) |
| 6 | Live Map page sometimes got stuck forever on "Connecting Google Maps Corridor…", and a hard page refresh could freeze the whole browser tab | A React coding pattern re-created certain objects on every single render, which triggered an endless loop of "start loading" without ever being allowed to finish | Fixed by properly "memoizing" (freezing) those objects so they're only re-created when they actually change |
| 7 | Off-route detection during live navigation could never actually fire | A classic bug where a background GPS callback function captured an old, frozen copy of the navigation status the moment it was set up, and kept using that stale copy forever | Fixed using a "ref" (a live-updating reference) instead of the frozen copy |
| 8 | Toll information sometimes falsely said "No Tolls Reported" | The app was treating "Google didn't say anything about tolls" as proof of "no tolls," which isn't a safe assumption | Now distinguishes "confirmed no tolls," "possibly tolls," and "toll information unavailable" |
| 9 | The Exotel emergency system could send real SMS/calls with no safety net | No dry-run mode existed at all | Added `EXOTEL_DRY_RUN` (defaults to **on**) — nothing is ever really sent unless explicitly turned off with real credentials |
| 10 | The interactive API documentation (`/docs`) was publicly reachable in a way that exposed the entire emergency API surface | No option to disable it | Added `DISABLE_API_DOCS` for production use |
| 11 | The frontend's own test scripts couldn't run at all | A required tool (`tsx`) was referenced but never actually installed | Installed it, and fixed 2 tests whose assumptions had become outdated by fix #2 above |
| 12 | The database seed script wiped all real contacts and check-ins every time the app started | Overly aggressive "reset" logic left over from early development/demo needs | Made destructive resets require an explicit opt-in flag (`SEED_RESET=true`); real user data (contacts, check-ins) is now never touched by seeding under any setting |

### 11.2 Found during hands-on testing by the project owner (this session's second pass)

| # | Problem reported | Root cause | Fix |
|---|---|---|---|
| 13 | Live Map always reset to a Chennai→Bangalore demo route no matter what journey was actually planned | Every "Live Map" navigation-bar link points at a bare page address with no route information attached, and the page had no memory of the last real route | The app now remembers the last real route (in the browser's local storage) and restores it whenever the page is opened without specific route information |
| 14 | The AI assistant said "no results found" for literally every "near me" question, even in places with obviously nearby services | The Google Maps API key is (correctly) restricted to only work from the browser's own web address; when the *server* tried to use the same key to search Google Places on the AI assistant's behalf, Google rejected every request, and that rejection was silently swallowed and shown to the user as "nothing nearby" | Fixed the server-side request to include the information Google needs to allow it; separately found and fixed a second, deeper copy of the same bug where the *real* AI (Gemini) code path was skipping the fixed logic entirely |
| 15 | No way to stop the Safety Check-In timer once started, short of an escalation actually happening | The "cancel" button that existed only appeared *after* the timer was already overdue; the everyday view had no stop control at all | Added a working "Stop" button visible at all times while monitoring is active |
| 16 | Confusing, doubled error messages like "Emergency communication failed: Emergency communication failed: HTTP error! status: 404" | The final, complete message from the backend was being wrapped in an extra copy of the same prefix by the page displaying it | Fixed to show the backend's message as-is; also added a distinct, calmer message for the intentional "dry run" case so it's not shown as a scary red failure |

**Also specifically re-verified and found to be already correct** (not a bug): the actual Dead-Man's-Switch escalation mechanism — a test was run where a check-in timer was deliberately set to already be overdue, and the background scheduler was confirmed to detect it within 5 seconds, correctly identify the trusted contact, attach the last known GPS location, and (with dry-run mode on) report that outcome honestly.

---

## 12. Current test coverage

| Suite | Count | What it actually proves |
|---|---|---|
| Backend `unittest` suite | 68 tests across 8 files | Phone number validation, Exotel request construction, the Dead-Man's-Switch state machine, contact CRUD rules, and (in the newest file, `test_api_integration.py`) real HTTP-level behavior including that two different "devices" genuinely cannot see each other's data |
| Frontend `tsx` scripts | 7 scripts, 207 individual assertions | Navigation math correctness, that the AI tool router never fabricates data, offline-pack honesty, the check-in state machine, and production-hardening checks (security headers present, no leaked secrets, no fake data) |

**What is *not* covered by automated tests:** a full browser-based end-to-end suite (e.g. Playwright) that clicks through the actual UI does not exist yet — verification of UI behavior in this project has so far been done manually/interactively rather than via a permanent, repeatable automated suite.

---

## 13. What still needs attention

Being equally honest about what remains imperfect:

- **Route safety scores cluster tightly** (usually 85–96 out of 100) — the underlying scoring logic is honest and deterministic, but doesn't yet spread scores out enough to make close alternative routes feel meaningfully different.
- **No automated browser end-to-end test suite** — all UI verification so far has been manual/interactive.
- **~150 low-severity linter warnings remain** (mostly unused imports) — cosmetic, not functional.
- **Service Worker / offline behavior** has not been exhaustively tested across different browsers and network conditions.
- **Old committed secrets remain in git history** (see §10) until the history is rewritten or the repo is recreated — the *current* files are clean, but the *history* is not.
- **Real Exotel dispatch requires the project owner's own Exotel account** to complete KYC verification and provision a virtual phone number — nothing in the code can complete that step; it is a real-world business process outside the codebase.
- **Duplicate demo/reference-only backend features** (Guide, Assess, Sense) exist alongside the core safety features and are not this project's primary focus — they work, but they're illustrative rather than production-critical.

---

## 14. Glossary of terms used in this project

| Term | Plain-English meaning |
|---|---|
| **Dead-Man's Switch** | A safety mechanism that assumes something is wrong if you *don't* check in, rather than waiting for you to actively report a problem |
| **Dry run** | A mode where the app builds and validates a real action (like sending an SMS) but deliberately stops short of actually doing it |
| **ExoPhone** | Exotel's term for a virtual phone number you own, used as the "from" number on outbound calls |
| **Fabrication (in this document)** | Any time software presents made-up information as if it were real/verified data |
| **Geolocation** | The browser feature that reads your device's real GPS coordinates |
| **KYC** | "Know Your Customer" — an identity-verification process telecom providers like Exotel legally require before allowing outbound calling |
| **Primary contact** | The one trusted contact, out of possibly several, who actually gets contacted first in an emergency |
| **Proxy** | A server that forwards a request to another server on your behalf, without the original requester needing to know the final destination |
| **PWA** | "Progressive Web App" — a website built to feel and install like a native phone app |
| **Referrer restriction** | A Google Cloud security setting that only allows an API key to be used from specific website addresses |
| **Same-origin** | Two web addresses are "same-origin" if they share the same protocol, domain, and port — browsers apply much stricter security rules to cross-origin requests |
| **TWO_WHEELER** | Google's official Routes API term for motorized two-wheeled vehicles (motorbikes/scooters) — explicitly *not* the same as `BICYCLING` |

---

*This report reflects the state of the codebase as of the commits listed in §2, verified through direct code inspection, live local execution of both the frontend and backend, and interactive testing in a real browser. Nothing in this report is a claim about a deployed/hosted version of the app unless explicitly stated.*
