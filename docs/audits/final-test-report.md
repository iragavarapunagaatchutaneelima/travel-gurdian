# Travel Guardian — Final Engineering Test Report

**Execution Date:** September 2026  
**Environment:** Development & Integration Testing (Windows / Node 20 / Python 3.11)  
**Safety Protocol:** 112 = OFF during all automated test runs. Zero live 112 dispatches.  
**Provider:** Google Maps Platform exclusively (Zero Mapbox)  

---

## 1. Routing Test Matrix (Google Routes API v2 & Directions)

| Origin | Destination | Travel Mode | Engine / API | Distance (km) | Duration | Status | Notes |
|--------|-------------|-------------|--------------|---------------|----------|--------|-------|
| Mumbai | Hyderabad | Two-Wheeler (Bike) | Google Routes API v2 (`TWO_WHEELER`) | 704.5 km | 16h 40m | **PASS** | Genuine motorcycle corridor via NH 65. 126 turn steps. |
| Chennai | Bangalore | Two-Wheeler (Bike) | Google Routes API v2 (`TWO_WHEELER`) | 347.3 km | 8h 12m | **PASS** | Highway route via NH 48. 77 turn steps. |
| Chennai | Mumbai | Two-Wheeler (Bike) | Google Routes API v2 (`TWO_WHEELER`) | 1250.3 km | 28h 37m | **PASS** | 3 distinct alternative corridors returned via NH 50, NH 48, NH 716. |
| Delhi | Hyderabad | Two-Wheeler (Bike) | Google Routes API v2 (`TWO_WHEELER`) | 1532.4 km | 32h 49m | **PASS** | 3 distinct alternative corridors via NH 44, NH 46, NH 161. |
| Chennai | Bangalore | Car | Google Directions (`DRIVE`) | 346.8 km | 6h 15m | **PASS** | Express highway corridors with toll road metadata. |
| Chennai | Bangalore | Walk | Google Directions (`WALK`) | 338.2 km | 70h 20m | **PASS** | Pedestrian corridor paths with zero fuel penalty. |

---

## 2. Priority-Based Route Ranking Matrix

| Mode | Route Input | Selected Priority | Composite Weighting | Rank 1 Corridor | Rank 2 Corridor | Rank 3 Corridor | Result |
|------|-------------|-------------------|---------------------|-----------------|-----------------|-----------------|--------|
| Car | Chennai ➔ Bangalore | Maximum Safety | 85% Safety + 15% Time | #1 — MOST SAFE (Score: 94) | #2 — SAFE ALTERNATIVE (Score: 89) | #3 — ALTERNATIVE (Score: 82) | **PASS** |
| Car | Chennai ➔ Bangalore | Time Priority | 75% Time + 25% Safety | #1 — FASTEST (Duration: 5h 45m) | #2 — SAFE ALTERNATIVE | #3 — ALTERNATIVE | **PASS** |
| Bike | Mumbai ➔ Hyderabad | Balanced | 55% Safety + 45% Time | #1 — BEST MATCH (NH 65) | — | — | **PASS** |

---

## 3. 112 Safety Lock State Machine Matrix

| Step | User / System Action | Expected 112 State | Button Presentation | 112 Dispatch Executed | Result |
|------|----------------------|--------------------|---------------------|-----------------------|--------|
| 1 | Page initial load | `DEACTIVATED` | Locked with lock icon | **NONE (0 Calls)** | **PASS** |
| 2 | Click locked 112 button | Opens Confirmation Modal | Locked | **NONE (0 Calls)** | **PASS** |
| 3 | Click "Cancel" in modal | Remains `DEACTIVATED` | Locked | **NONE (0 Calls)** | **PASS** |
| 4 | Click "Activate 112" in modal | Transitions to `ACTIVE` | Enabled (Red action) | **NONE (0 Calls)** | **PASS** |
| 5 | Toggle switch clicked while active | Immediately `DEACTIVATED` | Locked | **NONE (0 Calls)** | **PASS** |

---

## 4. Emergency Telecommunications & Exotel Matrix

| Channel | Recipient | Payload Verification | Provider Endpoint | Status | Result |
|---------|-----------|----------------------|-------------------|--------|--------|
| SMS | Stored Contact (Sarah Miller) | Human locality + GPS coordinates + Google Maps URL | Exotel Singapore (`Sms/send.json`) | HTTP 200 (Masked: `+9198*****210`) | **PASS** |
| Voice | Stored Contact (Sarah Miller) | Emergency voice notice | Exotel Singapore (`Calls/connect.json`) | HTTP 200 | **PASS** |
| Security | Arbitrary injected number | Request rejected / resolved to stored contact | Backend assist resolver | Enforced stored contact only | **PASS** |
| Timeout | Exotel Telecom Gateway | Request allowed up to 15 seconds before abort | `frontend/src/services/api.ts` | Eliminates false "Backend unreachable" | **PASS** |

---

## 5. Mapbox Complete Purge Matrix

| Search Target | Codebase Location | Matches Found | Status |
|---------------|-------------------|---------------|--------|
| `mapbox-gl` | `frontend/package.json` | 0 | **CLEAN** |
| `mapbox-gl` | `frontend/src` | 0 | **CLEAN** |
| `@mapbox` | `frontend/package.json` | 0 | **CLEAN** |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | `frontend/src` | 0 | **CLEAN** |
| `MAPBOX_ACCESS_TOKEN` | `backend` | 0 | **CLEAN** |
