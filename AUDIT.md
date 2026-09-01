# COMPREHENSIVE PROJECT AUDIT & TECHNICAL SPECIFICATION: TRAVEL GUARDIAN

## 1. Executive Summary
**Travel Guardian** is an AI-powered travel safety and guidance companion built for hackathons and production deployments. It provides multi-profile route intelligence, live conditions monitoring, GPS tracking, Mapbox GL JS interactive mapping, Google Gemini AI safety advisories with graceful fallbacks, fail-safe check-in timers, and emergency SOS dispatch protocols.

---

## 2. Architecture & Tech Stack

### Frontend Architecture
- **Framework**: Next.js 15+ (App Router), React 19, TypeScript
- **Styling**: TailwindCSS v4 with semantic CSS variables and design tokens (`--background`, `--surface`, `--elevated-surface`, `--border`, `--primary-accent`, `--success`, `--warning`, `--danger`, `--info`, `--muted`)
- **Theme Management**: `next-themes` with class-based switching. Default theme: **Dark Mode**. Persists across navigation and browser reloads via `localStorage`.
- **Mapping**: Mapbox GL JS (`mapbox-gl`) with GeoJSON route lines, interactive POI markers, GPS geolocation, and Map / Satellite toggles.
- **Icons**: Lucide React
- **Deployment**: Configured for Vercel deployment with root directory `frontend/`.

### Backend Architecture
- **Framework**: FastAPI (Python 3.11+), Uvicorn, Pydantic v2, SQLAlchemy
- **Endpoints**:
  - `/api/alerts/` - Regional hazard bulletins & security alerts
  - `/api/assess/` - Multi-factor route risk assessment engine
  - `/api/assist/` - Emergency contacts, safe check-in timers, SOS dispatch
  - `/api/guide/` - Destination guides, consular contacts, cultural laws
  - `/api/ai/` (Next.js server-side route) - Google Gemini 1.5 Flash generative AI safety assistant with rule-based demo fallback.

---

## 3. Page Structure & Navigation System

| Route | Name | Purpose | Features |
|---|---|---|---|
| `/` | Landing / Get Started | High-impact product showcase | Dark/Light theme toggle in header, hero banner, feature badges, direct CTA to `/dashboard` (No fake auth) |
| `/dashboard` | Home / Dashboard | Central command panel | Dynamic time greeting, 3-slide auto carousel, 6 quick safety modules, live conditions matrix, quick safety timer |
| `/plan` | Plan Journey | Multi-city route intelligence | 6 cross-compatible cities (Chennai, Mumbai, Delhi, Hyderabad, Bangalore, Vizag), 4 travel modes (Car, Bike, Bus, Walk), traveler & women safety preferences, 4 distinct routes (A, B, C, D), side-by-side comparison matrix |
| `/map` | Live Maps | Living map & navigation session | Mapbox GL JS interactive map, Street/Satellite style switcher, "Show My Location" GPS browser geolocation, clickable POIs (Fuel, Rest, Stay, SOS), Day & Night safety ratings, Route safety index panel, graceful missing token fallback |
| `/assist` | AI Guardian | AI Safety Companion & Assist Hub | Gemini 1.5 Flash integration with `CONNECTED` vs `DEMO` mode badges, Dead Man's check-in timer, emergency contact registry |
| `/emergency` | Emergency & SOS | Rapid incident dispatch | Share live GPS coordinates, alert emergency contacts, find nearby hospitals and police, 112 emergency hotline |
| `/history` | My Journeys | Journey logs & vectors | Filter by Upcoming, Completed, Cancelled; view route details link to Live Map |
| `/guide` | Review Session & Guide | Dossiers & safety reviews | 6-city municipal dossiers, consular contacts, highway radar warnings, simulated traveler reviews, pre-travel checklist |
| `/profile` | Traveler Profile | Profile & credentials | Name, email, phone, home base city, verified trust level |
| `/settings` | Settings | App configuration | Dark / Light theme picker, women safety default, telemetry settings, demo storage cache reset |

---

## 4. Theme & Design Tokens System
All pages strictly utilize the standardized design token system defined in `globals.css`:
- **Default Application Theme**: `dark`
- **Theme Switcher**: Available directly on the Landing (`/`) page header, in the top-right header across all pages, and inside the collapsible navigation drawer and `/settings`.
- **Contrast & Accessibility**: High-contrast ratios maintained in both Dark (`#09090b` zinc background, `#fafafa` zinc foreground) and Light (`#f8fafc` slate background, `#0f172a` slate foreground) modes without raw inverted colors or unreadable text.

---

## 5. Route Intelligence & 6-City Cross-Compatible Matrix
Supports the 6 primary Indian metro hubs with complete cross-compatibility:
1. **Chennai** (`Tamil Nadu`) - `[80.2707, 13.0827]`
2. **Mumbai** (`Maharashtra`) - `[72.8777, 19.0760]`
3. **Delhi** (`Delhi NCR`) - `[77.1025, 28.7041]`
4. **Hyderabad** (`Telangana`) - `[78.4867, 17.3850]`
5. **Bangalore** (`Karnataka`) - `[77.5946, 12.9716]`
6. **Visakhapatnam (Vizag)** (`Andhra Pradesh`) - `[83.2185, 17.6868]`

Every search generates **4 distinct route profiles**:
- **Route A: Safety Corridor** (Main National Highway, High Night Safety, 24/7 CCTV & Patrolled Plazas) - `HIGHLY RECOMMENDED`
- **Route B: Highway Alternative** (Direct Toll Bypass, Fastest Transit, High-speed corridor) - `RECOMMENDED`
- **Route C: Balanced Route** (District Link, Moderate Speed, Scenic) - `RECOMMENDED`
- **Route D: Caution / Alternate Route** (Rural Connecting roads, Night travel caution) - `USE CAUTION`

---

## 6. Environment Variables Configuration

| Variable | Required In | Target Service | Description |
|---|---|---|---|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | `frontend/.env.local` & Vercel | Mapbox GL JS | Public token for high-resolution vector tiles and satellite imagery. If absent, renders a clean Preview Fallback. |
| `GEMINI_API_KEY` | `frontend/.env.local` / Server env & Vercel | Google Gemini API | Server-side key for Google Gemini 1.5 Flash AI Guardian. If absent, seamlessly activates local rule-based safety expert mode. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` (Optional) | Backend Service | API URL for FastAPI backend (default: `http://localhost:8000/api`). |

---

## 7. How to Continue Development & Run Locally

### Running the Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running the Backend (Optional FastAPI server):
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```
