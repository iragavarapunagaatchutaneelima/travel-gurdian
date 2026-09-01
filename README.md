# Travel Guardian (AI-Powered Travel Safety & Guidance Platform)

**Travel Guardian** is a full-stack, AI-assisted travel safety and guidance application designed for hackathon demonstrations and real-world travel planning. It combines multi-profile route intelligence across 6 primary Indian metro hubs, interactive Mapbox GL JS mapping, Gemini AI travel safety advisories, fail-safe check-in timers, and emergency SOS dispatch tools.

---

## 🌟 Key Features

1. **Get Started Landing Experience**:
   - Hero banner with direct **"GET STARTED →"** CTA navigating to Dashboard.
   - Integrated **Dark / Light Mode** theme switcher right on the landing page header.
   - Zero fake authentication friction.

2. **Unified Navigation Drawer (☰)**:
   - Modern collapsible slide-out drawer accessible on desktop, tablet, and mobile.
   - Comprehensive navigation:
     - 🧭 **Home / Dashboard** (`/dashboard`)
     - 🗺️ **Plan Journey** (`/plan`)
     - 📍 **Live Maps** (`/map`)
     - 🚨 **Emergency** (`/emergency`)
     - 🤖 **AI Guardian** (`/assist`)
     - 📜 **My Journeys** (`/history`)
     - 📖 **Review Session** (`/guide`)
     - 👤 **Profile** (`/profile`)
     - ⚙️ **Settings** (`/settings`)

3. **6-City Cross-Compatible Route Matrix**:
   - Primary Origin & Destination Hubs: **Chennai**, **Mumbai**, **Delhi**, **Hyderabad**, **Bangalore**, **Visakhapatnam (Vizag)**.
   - Cross-compatible planning for any pair of origin and destination cities.
   - 4 Travel Modes: **Car**, **Bike**, **Bus**, **Walk**.
   - Safety Preferences: **Solo Traveler**, **Group**, **Family**, **Women Safety Prioritization**.

4. **Multi-Profile Route Intelligence Engine**:
   - Generates **4 distinct route options**:
     - **Route A: Safety Corridor** (NH Main Highway, 24/7 Patrolled Plazas) — `HIGHLY RECOMMENDED`
     - **Route B: Highway Alternative** (Direct Express Bypass) — `RECOMMENDED`
     - **Route C: Balanced Route** (Scenic District Link) — `RECOMMENDED`
     - **Route D: Caution Route** (Rural Connecting roads) — `USE CAUTION`
   - Transparent multi-factor breakdown: Safety Index (XX/100), Traffic Congestion, Road Quality, Day/Night Safety Ratings, Weather Risk, and Amenities (Rest stops, Fuel, Food, Hotels, Emergency nodes).
   - Side-by-side comparative table.

5. **Mapbox GL JS Real Map Integration**:
   - Interactive road and satellite mapping tiles (`mapbox-gl`).
   - Dynamic GeoJSON route line rendering with color-coded safety tiers.
   - Interactive POI markers (Petrol, Food, Hotel, Rest Area, Emergency Clinic) with detailed popup cards.
   - **"Show My Location"** browser GPS geolocation button with live user marker.
   - Graceful Map Preview fallback when Mapbox token is not configured.

6. **AI Guardian & Gemini AI Advisory**:
   - AI assistant powered by Google Gemini 1.5 Flash via server-side `/api/ai` endpoint.
   - Clear intelligence status badge: `CONNECTED (Gemini)` vs `DEMO / RULES ENGINE`.
   - Contextual travel safety advice for Indian highways, solo female travel protocols, and lost document procedures.

7. **Dead-Man's Safe Check-In & Emergency SOS**:
   - Automated fail-safe countdown timer with check-in confirmation and simulated dispatch alert.
   - Direct emergency hotline (112) dialer and live GPS location telemetry sharing.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript, TailwindCSS v4, `next-themes`, Mapbox GL JS, Lucide React.
- **Backend (Optional FastAPI)**: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy, Pydantic v2.
- **AI Engine**: Google Gemini Generative AI REST API (`gemini-1.5-flash`) with resilient rules-based demo fallback.

---

## ⚙️ Environment Variables

Create `.env.local` inside `frontend/` (or set in Vercel Project Settings):

```bash
# Frontend (Public token for Mapbox GL JS map rendering)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token

# Backend / Server (Google Gemini Generative AI API key)
# Kept securely on the server-side, never exposed to client bundles
GEMINI_API_KEY=your_gemini_api_key

# Optional backend URL if connecting to FastAPI backend
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 🚀 Local Development Setup

### 1. Run the Frontend (Next.js):
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run the Backend (FastAPI, Optional):
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

---

## 🌐 Deployment to Vercel

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: Travel Guardian full-stack safety companion"
   git push origin main
   ```
2. In the Vercel Dashboard:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
   - **Environment Variables**: Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` and `GEMINI_API_KEY` (optional for live Gemini AI mode).
3. Click **Deploy**.

---

## 📄 License & Hackathon Disclaimer
All simulated intelligence datasets (traffic delays, weather feeds, POI lists, user reviews) are clearly marked as **DEMO INTELLIGENCE** for hackathon presentation purposes.
