# 🛡️ Travel Guardian

**A truthful, offline-first personal travel safety companion.**

Travel Guardian plans real road routes across India (car, motorized two-wheeler, or on foot), scores them on a deterministic Safety Fit index built from verified Google Places data, tracks you live with turn-by-turn navigation and off-route detection, keeps a Dead-Man's-Switch safety check-in timer, and — when something goes wrong — dispatches your trusted guardian by SMS and voice call through Exotel. An AI assistant (Gemini) answers questions grounded in your real GPS position, route, and check-in state, and never invents a place, a score, or a location it doesn't actually have.

The project's guiding rule: **if the app doesn't know something, it says so — it never fabricates data.** No fake hospitals, no fake safety scores, no fake GPS, no fake "message sent" confirmations.

> **Emergency disclaimer:** Travel Guardian is a personal safety aid, not a substitute for official emergency services. In a genuine emergency, always dial your local emergency number (112 in India) directly.

---

## Table of Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting the API keys you need](#getting-the-api-keys-you-need)
- [Setup — step by step](#setup--step-by-step)
- [Running the project](#running-the-project)
- [Environment variables reference](#environment-variables-reference)
- [Testing](#testing)
- [Docker](#docker)
- [Deployment](#deployment)
- [Security model](#security-model)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

---

## What it does

| Feature | Description |
|---|---|
| 🗺️ **Plan Journey** | Enter an origin and destination (autocomplete-backed), pick Car, Bike (motorized two-wheeler), or Walk, and get 2–3 real Google-routed alternatives, each with a deterministic Safety Fit score (0–100) computed from real hospitals, police stations, fuel stops, and rest stops found along the corridor. |
| 🧭 **Live Navigation** | Turn-by-turn guidance with real GPS tracking, dynamic ETA, off-route detection, and one-tap rerouting through live Google traffic data. |
| ⏱️ **Safety Check-In (Dead-Man's Switch)** | Set a check-in timer before a risky leg of your trip. If you don't confirm you're safe before it expires, your trusted guardian is notified automatically. |
| 🆘 **Emergency SOS** | One button sends your live GPS location by SMS and initiates a voice call to your registered trusted guardian via Exotel. A separately locked, explicitly-confirmed `tel:112` dialer is always available for genuine emergencies. |
| 🤝 **Trusted Guardian Contacts** | A backend-authoritative contact list (not a browser guess) with a deterministic primary contact, shared consistently across every screen. |
| 🤖 **AI Guardian Assistant** | A Gemini-powered chat assistant that answers "Where am I?", "What's my safety score?", "Find a petrol station near me" — always grounded in your actual live state, never Gemini's imagination. |
| 📴 **Offline Mode** | Downloadable offline corridor packs (cached maps, safety data, and a printable PDF survival card) for when connectivity drops. |

---

## Tech stack

### Frontend
- **[Next.js 16](https://nextjs.org/)** (App Router, Turbopack) — React framework, server and client components
- **[React 19](https://react.dev/)** + TypeScript 5
- **[Tailwind CSS 4](https://tailwindcss.com/)** — utility-first styling, with `next-themes` for dark mode
- **[Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)** — map rendering, Places Autocomplete, Geocoding, legacy Directions (Car/Walk)
- **[Google Routes API (v2)](https://developers.google.com/maps/documentation/routes)** — motorized two-wheeler (`TWO_WHEELER`) routing with real toll data, called server-side
- **[Google Gemini API](https://ai.google.dev/)** — the AI Guardian assistant's language model
- **[jsPDF](https://github.com/parallax/jsPDF)** — offline survival card generation
- **[Lucide React](https://lucide.dev/)** — icon set
- A hand-rolled Service Worker (no Workbox) for offline app-shell caching

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** (Python) — REST API
- **[SQLAlchemy 2](https://www.sqlalchemy.org/)** — ORM, SQLite by default (MySQL-ready via `DATABASE_URL`)
- **[Pydantic 2](https://docs.pydantic.dev/)** / `pydantic-settings` — request/response validation and environment-driven config
- **[Exotel](https://exotel.com/)** REST API — emergency SMS and outbound voice calls (Singapore cluster)
- **[Uvicorn](https://www.uvicorn.org/)** — ASGI server
- A background daemon thread polls for overdue safety check-ins and triggers escalation

### Infrastructure & tooling
- **Docker** — `Dockerfile` for both frontend and backend, plus a `docker-compose.yml` for local MySQL
- **ESLint 9** / **TypeScript compiler** — linting and type checking (the production build fails on real type errors; there is no `ignoreBuildErrors` escape hatch)
- **`tsx`** — runs the TypeScript test scripts directly, no separate build step
- **Python `unittest`** + **FastAPI `TestClient`** — backend unit and HTTP-integration tests

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (client)                        │
│   Next.js pages  ·  Google Maps JS SDK  ·  Service Worker        │
└───────────────┬───────────────────────────────┬─────────────────┘
                │ same-origin fetch              │ Google Maps SDK
                ▼                                ▼
┌───────────────────────────────┐   ┌─────────────────────────────┐
│   Next.js server (App Router) │   │  maps.googleapis.com        │
│                                │   │  (Maps JS, Places, Geocoder,│
│  /api/routes/compute  ───────►│──►│   legacy Directions)        │
│    (hardened proxy to         │   └─────────────────────────────┘
│     Routes API v2, server key)│   ┌─────────────────────────────┐
│  /api/ai  ────────────────────│──►│  Gemini API + Places API    │
│    (Gemini + tool router,     │   │  (New, server-side lookup)  │
│     grounded in real state)   │   └─────────────────────────────┘
│  /backend-api/*  ─────────────│──┐
│    (same-origin rewrite,      │  │
│     browser never sees the    │  │
│     real backend origin)      │  │
└────────────────────────────────┘  │
                                     ▼
                     ┌───────────────────────────────┐
                     │      FastAPI backend           │
                     │  /api/assist   — contacts,     │
                     │                  check-ins, SOS │
                     │  /api/emergency — Exotel SMS/   │
                     │                   call dispatch │
                     │  /api/guide, /api/assess,       │
                     │  /api/alerts                    │
                     │  Device-identity cookie          │
                     │  (no login system, but no        │
                     │   trusting client-supplied IDs   │
                     │   either)                        │
                     └───────────┬──────────┬───────────┘
                                 ▼          ▼
                     ┌───────────────┐  ┌──────────────────┐
                     │  SQLite/MySQL │  │  Exotel REST API  │
                     │  (SQLAlchemy) │  │  (SMS + voice)    │
                     └───────────────┘  └──────────────────┘
```

**Why the `/backend-api/*` proxy exists:** the browser never talks to the FastAPI backend directly. Next.js rewrites same-origin requests to the real backend URL (`BACKEND_API_URL`, a server-only environment variable), so the strict Content-Security-Policy never needs to name the backend's origin, and the backend's real address is never exposed to client-side code.

**Why routes are computed two ways:** Car and Walk use the browser's Google Maps JS SDK (`DirectionsService`) directly. Bike (motorized two-wheeler) is routed through a server-side proxy to the newer Routes API v2, because the classic `BICYCLING` travel mode is for human-powered bicycles, not motorcycles/scooters, and only the v2 API supports `TWO_WHEELER`.

---

## Project structure

```
travel-gurdian/
├── frontend/                    Next.js application
│   ├── src/
│   │   ├── app/                 App Router pages & layouts
│   │   │   ├── api/             Server route handlers (ai, routes/compute)
│   │   │   ├── plan/            Journey planning
│   │   │   ├── map/             Live navigation map
│   │   │   ├── emergency/       SOS & trusted contacts
│   │   │   ├── assist/          AI Guardian chat
│   │   │   ├── settings/        App preferences
│   │   │   └── components/      Shared UI components
│   │   ├── services/            API clients, Google Maps/Places/Routes,
│   │   │                        safety engine, Gemini tool router
│   │   ├── hooks/                useLiveNavigation, useSafetyCheckIn, etc.
│   │   ├── types/                Shared TypeScript types
│   │   ├── data/                 Static reference data (cities, route shapes)
│   │   └── scripts/               Standalone test scripts (run via tsx)
│   ├── public/                   Static assets, manifest.json, sw.js
│   └── Dockerfile
├── backend/                       FastAPI application
│   ├── app/
│   │   ├── api/                  Route handlers (assist, emergency, guide,
│   │   │                         assess, alerts)
│   │   ├── core/                 Settings, database engine, device identity
│   │   ├── models/                SQLAlchemy models
│   │   ├── schemas/                Pydantic request/response schemas
│   │   └── services/               Business logic (assist, assess, sense,
│   │                                exotel_service, checkin_scheduler)
│   ├── tests/                      unittest suite (+ HTTP integration tests)
│   ├── seed.py                     Idempotent reference-data seeding
│   └── Dockerfile
├── docs/                           Architecture notes, Exotel setup guide
├── docker-compose.yml              Local MySQL + backend + frontend stack
├── .env.example                    Root-level env var reference
├── LICENSE
└── README.md                       You are here
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 20+ (22 recommended) | Next.js 16 requires a modern runtime |
| **npm** | 10+ | ships with Node 20+ |
| **Python** | 3.11+ | backend runtime (the Docker image pins 3.11) |
| **Git** | any recent version | |
| **A Google Cloud project** with billing enabled | — | for Maps, Places, Geocoding, Routes, and (optionally) the Places API (New) |
| **A Google AI Studio / Gemini API key** | — | for the AI Guardian assistant |
| **An Exotel account** (optional for local dev) | — | only needed to send *real* SMS/calls; the app runs safely in dry-run mode without one |

---

## Getting the API keys you need

### 1. Google Maps Platform key(s)

1. Create (or open) a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **billing** on the project (required, or Directions/Places calls fail with `OVER_QUERY_LIMIT`).
3. Enable these APIs under **APIs & Services → Library**:
   - Maps JavaScript API
   - Places API (both classic and, ideally, the newer "Places API (New)")
   - Geocoding API
   - Directions API
   - Routes API
4. Create an API key under **APIs & Services → Credentials**.
5. **Restrict it** under Application restrictions → HTTP referrers, to:
   - `http://localhost:3000/*`
   - `http://127.0.0.1:3000/*`
   - your production domain, once you have one
6. (Recommended) Create a **second key** with no HTTP referrer restriction (server calls don't send a browser referer), restricted instead to your server's IP address if possible. Use this as `GOOGLE_ROUTES_API_KEY`. If you skip this, the app falls back to the browser key for server-side calls, which still works.

### 2. Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create an API key.
3. This is the `GEMINI_API_KEY` — it is **server-only** and must never be prefixed with `NEXT_PUBLIC_`.

### 3. Exotel credentials (optional for local development)

The app runs safely without these — `EXOTEL_DRY_RUN` defaults to `true`, so emergency SMS/call requests are fully built and validated but **never actually sent** until you deliberately turn dry-run off with real, KYC-approved credentials.

If you do want live dispatch:

1. Sign up at [Exotel](https://exotel.com/) and complete their KYC verification (required before outbound calls/SMS work).
2. From the Exotel dashboard, note your **Account SID**, generate an **API Key** and **API Token**.
3. Provision (or use an existing) **ExoPhone** (virtual number) for outbound Caller ID.
4. Only set `EXOTEL_DRY_RUN=false` once all of the above are real and approved.

---

## Setup — step by step

```bash
# 1. Clone the repository
git clone https://github.com/iragavarapunagaatchutaneelima/travel-gurdian.git
cd travel-gurdian

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Configure the frontend environment
cp .env.example .env.local
# Now edit frontend/.env.local and fill in:
#   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
#   GOOGLE_ROUTES_API_KEY   (optional, falls back to the key above)
#   GEMINI_API_KEY
#   GEMINI_MODEL            (defaults fine as gemini-2.5-flash)
#   BACKEND_API_URL         (defaults fine as http://localhost:8000/api)

cd ../backend

# 4. Create and activate a Python virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 5. Install backend dependencies
pip install -r requirements.txt

# 6. Configure the backend environment
cp .env.example .env
# Edit backend/.env — the defaults (SQLite, dry-run Exotel) work out of the
# box for local development. Fill in real EXOTEL_* values only if you intend
# to test live dispatch.

# 7. Seed reference data (destinations, alerts) — safe to re-run, never
#    touches contacts or check-ins
python seed.py
```

---

## Running the project

You need **two terminals** — the backend and the frontend run as separate processes.

### Terminal 1 — Backend (FastAPI)

```bash
cd backend
venv\Scripts\activate        # or: source venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is now live at `http://127.0.0.1:8000`. Interactive docs (unless `DISABLE_API_DOCS=true`) are at `http://127.0.0.1:8000/docs`.

### Terminal 2 — Frontend (Next.js)

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

### From the repository root (convenience scripts)

```bash
npm run dev              # starts the frontend dev server (backend still needs its own terminal)
npm run build            # production build of the frontend
npm run start            # starts the production frontend server
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test:frontend    # runs the frontend test scripts (tsx)
npm run test:backend     # runs the backend unittest suite
```

### Verifying it's working

1. Open `http://localhost:3000` — the landing page should load with no console errors about the backend.
2. Go to **Plan Journey**, pick an origin and destination, choose a travel mode, and calculate a route — you should see 2–3 real routes with Safety Fit scores.
3. Go to **Emergency** — it should say "Synced with Server" (not "Local Cache"), confirming the frontend can reach the backend through the proxy.
4. Go to **AI Guardian** and ask "Where am I?" — with location permission granted, it answers from your real coordinates; without it, it says so honestly.

---

## Environment variables reference

### Frontend (`frontend/.env.local`)

| Variable | Required | Exposure | Description |
|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Public (browser) | Maps JS, Places Autocomplete, Geocoding, legacy Directions |
| `GOOGLE_ROUTES_API_KEY` | No | Server-only | Used by `/api/routes/compute` for TWO_WHEELER routing; falls back to the key above if unset |
| `GEMINI_API_KEY` | Yes (for AI Guardian) | Server-only | AI Guardian's language model |
| `GEMINI_MODEL` | No (defaults to `gemini-2.5-flash`) | Server-only | The UI always displays whatever this is actually set to |
| `BACKEND_API_URL` | No (defaults to `http://localhost:8000/api`) | Server-only | Real FastAPI origin; the browser never sees this directly |

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PROJECT_NAME` | No | API title (cosmetic) |
| `API_V1_STR` | No | API prefix, defaults to `/api` |
| `DATABASE_URL` | No | Defaults to local SQLite; MySQL example in `.env.example` |
| `CORS_ORIGINS` | No | JSON array of allowed frontend origins |
| `EXOTEL_ACCOUNT_SID` | For live dispatch | Exotel Account SID |
| `EXOTEL_API_KEY` | For live dispatch | Exotel API Key |
| `EXOTEL_API_TOKEN` | For live dispatch | Exotel API Token |
| `EXOTEL_SUBDOMAIN` | No (defaults to `api.exotel.com`) | Exotel cluster host |
| `EXOTEL_EXOPHONE` | For live calls | Your Exotel virtual number (Caller ID) |
| `EXOTEL_APP_ID` | No | Optional ExoML Voice App ID for a custom IVR flow |
| `EXOTEL_DRY_RUN` | No (**defaults to `true`**) | While true, Exotel requests are built and validated but never sent; set `false` only with real, KYC-approved credentials |
| `SEED_RESET` | No (defaults to `false`) | When true, `python seed.py` wipes and re-inserts demo destinations/alerts. Contacts and check-ins are never touched by seeding regardless |
| `DISABLE_API_DOCS` | No (defaults to `false`) | Set `true` in production to hide `/docs`, `/redoc`, `/openapi.json` |

**Never commit real values for any of these.** Only `.env.example` files (with placeholder values) are tracked in git.

---

## Testing

### Backend

```bash
cd backend
venv\Scripts\python.exe -m unittest discover tests
```

Runs the full `unittest` suite (unit tests calling service functions directly, plus HTTP-level integration tests using FastAPI's `TestClient` against an isolated temporary database with `EXOTEL_DRY_RUN` forced on — no real Exotel call is ever possible from the test suite).

### Frontend

```bash
cd frontend
npm run test
```

Runs a set of standalone TypeScript test scripts (via `tsx`) covering navigation math, the Gemini tool router, offline-pack truthfulness, the safety check-in state machine, and production-hardening checks (security headers, no leaked secrets, no fabricated data).

`src/scripts/testMasterEngineeringAudit.ts` is intentionally **not** part of the default test run — it POSTs to a live server's emergency SMS endpoint and should only be run deliberately against a server you control, with Exotel dry-run enabled.

### Type checking & linting

```bash
npm run typecheck   # tsc --noEmit — the production build also fails on real type errors
npm run lint         # ESLint
```

---

## Docker

A `docker-compose.yml` at the repository root brings up MySQL, the backend, and the frontend together:

```bash
docker compose up --build
```

This starts:
- **MySQL 8** on port `3306`
- **Backend** (FastAPI, `python seed.py` then `uvicorn`) on port `8000`
- **Frontend** (Next.js production build) on port `3000`

Set real environment variables via a `.env` file at the repository root, or export them before running `docker compose up` — the compose file reads `DATABASE_URL` and `NEXT_PUBLIC_API_URL` from the environment for the backend/frontend containers respectively. For a production Docker deployment, prefer the `/backend-api` proxy pattern described above over exposing the backend port directly.

---

## Deployment

- **Frontend**: designed for [Vercel](https://vercel.com/) or any Node 20+ host that supports Next.js server features (the `/backend-api/*` rewrite and the `/api/ai`, `/api/routes/compute` route handlers require a real Node server, not a static export).
- **Backend**: any host that can run a long-lived Python/Uvicorn process (the check-in scheduler runs as a background thread inside the app process, so serverless platforms that freeze/kill idle instances are not suitable).
- Set `BACKEND_API_URL` on the frontend deployment to the backend's real, non-public address (e.g. an internal network address or a backend that only accepts traffic from the frontend).
- Set `DISABLE_API_DOCS=true` and consider `EXOTEL_DRY_RUN=false` only after Exotel KYC and ExoPhone provisioning are complete.
- Never set `NEXT_PUBLIC_*` on any value that should stay secret — anything with that prefix is compiled into the client-side JavaScript bundle and is publicly readable.

---

## Security model

- **No login system**, but no trusting the client either: each browser is assigned a random, `httpOnly` device-identity cookie (`tg_device_id`) by the backend on first request. All contact, check-in, and emergency-log endpoints resolve "who is this" from that cookie, not from a client-suppliable parameter.
- **The backend is never reachable directly from the browser** — only through the same-origin `/backend-api/*` Next.js proxy, which is also what keeps the Content-Security-Policy tight without needing to name the backend's real host.
- **The `/api/routes/compute` proxy** validates payload shape and coordinate ranges, rejects requests claiming a different origin, rate-limits per source IP, and never forwards a client-supplied `Referer` header to Google.
- **Exotel dispatch defaults to dry-run** — nothing is ever sent to a real phone number unless you explicitly configure and enable it.
- **No fabricated data, anywhere**: if Google Places returns nothing, the app says so; if GPS is unavailable, it says so; if the backend is unreachable, it says so. There is no silent fallback to made-up hospitals, safety scores, or GPS coordinates.

If you discover a security issue, please open a private security advisory on the repository rather than a public issue.

---

## Known limitations

- Route safety scores currently cluster in a fairly narrow band (roughly 85–96); the underlying weighting model is deterministic and honest, but not yet finely differentiated between close alternatives.
- Toll information reflects exactly what Google reports — for many Indian routes this is genuinely "unavailable" rather than a false "no tolls."
- Live Exotel dispatch requires your own Exotel account, completed KYC, and a provisioned ExoPhone; none of that can be supplied by this codebase.
- Service worker / offline behavior has not been exhaustively verified across all browsers.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes, keeping the "no fabricated data" principle in mind — any fallback for missing data must say so honestly, not invent a plausible-looking substitute.
3. Run `npm run typecheck`, `npm run lint`, `npm run test:frontend`, and `npm run test:backend` before opening a pull request.
4. Never commit real API keys, tokens, or `.env`/`.env.local` files — only `.env.example` templates with placeholder values.
5. Open a pull request describing what changed and why.

---

## License

This project is licensed under the **MIT License** — see [`LICENSE`](./LICENSE) for the full text.

Copyright © 2026 Senapathi Yaswanth and Iragavarapu Naga Atchuta Neelima.
