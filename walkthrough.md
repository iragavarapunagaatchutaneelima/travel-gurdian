# Walkthrough: Travel Guardian MVP

Travel Guardian is a professional, production-style travel safety companion application. It is structured strictly under the architectural principles of **"SENSE • ASSESS • GUIDE • ASSIST"**.

This document outlines the codebase features, directory structure, manual start instructions, and Docker Compose configuration.

---

## What We Built

### 1. Entry & Authentication (`frontend/src/app/page.tsx` & `/signup/`)
- **Screen 1 (Login Screen)**: Renders the entry point of the app. Built on a clean white/light gray background with an elegant purple banner and credentials fields, matching the wireframe mockups.
- **Form Submission**: Submitting routes directly to the Home Dashboard (Screen 2).
- **Registration**: Matching Sign Up view at `/signup`.

### 2. Home Dashboard (`frontend/src/app/dashboard/page.tsx`)
- **Screen 2 (Home Dashboard)**: Spans the full width of the desktop screen in a premium, clean light-themed responsive grid layout.
- **Top Carousel Banner**: Displays travel slides that slide automatically every 3 seconds.
- **Quick Actions Grid**: Sleek grid cards for *Plan Journey*, *AI Guardian*, *Safety Mode*, *Offline Guardian*, *My Journeys*, and *Emergency*.
- **Live Conditions Matrix**: Summarizes live Weather, AQI, Traffic, and Connectivity parameters.
- **Safety Mode Timer**: An interactive check-in time interval selector popup that alerts emergency contacts upon countdown completion.

### 3. Plan Your Journey Screen (`frontend/src/app/plan/page.tsx`)
- **Screen 3 (Plan Your Journey)**: A professional desktop form layout allowing search configurations between any origin and destination.
- **Transit Mode selector**: Buttons for Car, Bike, Bus, and Walk transit modes.
- **Safety Preferences**: Controls for traveler type, women's safety preference, language, and mobility access.
- **Find Best Route**: Submitting dynamically forwards search queries to the Living Map (Screen 4).

### 4. Living Map Screen (`frontend/src/app/map/page.tsx`)
- **Screen 4 (Living Map)**: Designed inside a split-screen desktop panel layout. Left panel contains the safety caution ring gauge, POI checkers, offline prepare downloads, and simulation console controls. Right panel contains the wide-screen SVG map canvas.
- **Dynamic Map Labels Bug Fix**: The SVG map labels are now fully reactive and read from the traveler's custom search parameters dynamically. If you search for `Kakinada` to `Rajahmundry`, the map text overlays will dynamically display `Kakinada` and `Rajahmundry` instead of remaining hardcoded to "Mumbai" and "Pune".
- **Dynamic Weather Overlays**: Triggers rain loops over the map when conditions are rainy.
- **Drift Alerts & GPS Loss Override**: Includes simulation triggers to disconnect network, pause GPS coordinates, or deviate from route bounds with recovering actions.

### 5. Offline Pack & Offline Mode (Screens 5 & 6)
- **Screen 5 (Prepare Journey Pack)**: Located at `/offline`. Caches travel assets dynamically into local storage.
- **Screen 6 (Offline Mode)**: Located at `/offline-mode`. Bypasses recalculation requests and runs off of offline storage caches.

### 6. Emergency Assistance (Screen 7)
- **Screen 7 (Emergency Screen)**: Located at `/emergency`. Provides direct hotlines for Call 112, emergency SMS alerts, and location sharing controls.

### 7. My Journeys History (Screen 8)
- **Screen 8 (My Journeys)**: Located at `/history`. Houses upcoming, completed, and cancelled travel records.

---

## File Structure

```
travel guardian/
├── backend/
│   ├── app/
│   │   ├── api/          # Routers (alerts, assess, guide, assist)
│   │   ├── core/         # Config, Database setup
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── services/     # Business logic (scoring, safe haven query)
│   ├── Dockerfile
│   ├── requirements.txt  # FastAPI, SQLAlchemy, PyMySQL dependencies
│   ├── seed.py           # Seeder database script
│   └── main.py           # FastAPI entrypoint
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # Header, BottomNav, SOSModal
│   │   │   ├── dashboard/   # Responsive Dashboard Screen
│   │   │   ├── plan/        # Plan Your Journey Screen
│   │   │   ├── map/         # Living Map Journey Screen
│   │   │   ├── offline/     # Offline Guardian Pack Screen
│   │   │   ├── offline-mode/# Offline Mode Screen
│   │   │   ├── emergency/   # Emergency Screen
│   │   │   └── history/     # My Journeys History Screen
│   │   └── services/
│   │       └── api.ts       # Service layer with mock fallbacks
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml       # Complete environment orchestrator
```

---

## Launch Instructions

### Option A: The Docker Way (Recommended)
Docker Compose will launch a MySQL database, start the FastAPI backend, seed the initial database, build the production Next.js bundle, and link them all automatically:
```bash
docker-compose up --build
```
- Frontend will be live on: `http://localhost:3000`
- Backend API docs will be live on: `http://localhost:8500/docs`

### Option B: Local Manual Launch

#### 1. Start the Backend
If Python is available on your machine:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```
*Note: If no MySQL database URL is provided, the backend automatically falls back to a zero-configuration SQLite database (`travel_guardian.db`) locally.*

#### 2. Start the Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.
