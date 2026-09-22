# Travel Guardian — Phase 3 Engineering Report
**Phase 3: Real Safety Intelligence Over Real Google Routes**  
**Date:** September 21, 2026  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary & Objective

Phase 3 introduces the **Travel Guardian Safety Intelligence Layer**, integrating real safety and emergency accessibility calculations directly over the real Google Directions road network geometry established in Phase 2.

The foundational principle of Phase 3 is **ZERO FABRICATED SAFETY DATA**. Travel Guardian will never invent crime rates, fake accident statistics, synthetic 24/7 hospital capabilities, unverified police patrol densities, or fake weather readings. The system deterministically computes a **Safety Fit** score and an explicit **Safety Confidence** level derived purely from real Google Places points of interest (hospitals, police stations, pharmacies, fuel plazas, food & rest stops), user-reported community road hazards with explicit expiration models, and verified road metrics.

---

## 2. End-to-End System Architecture

```
User Search / Hub Selection
          ↓
Google Places Location Search (Canonical LocationDetails)
          ↓
Google DirectionsService (Real Road Geometry & Waypoints)
          ↓
Corridor POI Extractor (Nearby Places sampled along route corridor)
          ↓
Community Incident Evaluator (Active USER_REPORT incidents within route bounds)
          ↓
Deterministic Safety Engine (`safetyEngine.ts`)
          ↓
Normalized Safety Factors & Safety Fit Calculation (Deterministic 0-100 Score)
          ↓
Profile & Priority Modifiers (Solo / Family / Group / Solo Woman Traveller × Max Safety / Balanced / Time)
          ↓
Explainable Route Justification ("Why This Route?")
          ↓
UI Presentation (Plan Comparison, Map Layers, Offline Pack)
```

---

## 3. Truthful Data Classification Matrix

| Safety Dimension | Data Source | Classification Status | Handling Strategy |
| :--- | :--- | :--- | :--- |
| **Hospital / Medical Access** | Google Places API (`hospital`) | **REAL** | Extracted from corridor sampling; distance & open status recorded without fake ER claims |
| **Police Access** | Google Places API (`police`) | **REAL** | Extracted from corridor sampling; station counts & locations recorded |
| **Pharmacy Access** | Google Places API (`pharmacy`) | **REAL** | Extracted from corridor sampling |
| **Fuel / Petrol Access** | Google Places API (`gas_station`) | **REAL** | Evaluated for Car/Bike; excluded for Walk mode |
| **Food & Rest Stops** | Google Places API (`restaurant` / `cafe`) | **REAL** | Preparedness & comfort metric; separated from personal security |
| **Weather Telemetry** | Unconfigured External API | **NOT_CONFIGURED** | Explicitly marked `NOT_CONFIGURED` / `API Not Configured`; zero synthetic weather |
| **Road Hazards / Blockages** | Community Reporting Service | **USER_REPORTED** | Clearly labeled `USER REPORTED` with 6-hour automatic expiration |
| **Corridor POI Cache** | In-Memory Route Cache | **CACHED** | LRU in-memory corridor cache keyed by origin/dest/radius to prevent quota exhaustion |

---

## 4. Deterministic Safety Engine & Safety Fit Scoring

### 4.1 Safety Fit Formula
The Safety Fit score ($S_{fit} \in [0, 100]$) is computed as a weighted average over available normalized factors:
$$S_{fit} = \sum_{i \in \text{Available Factors}} w_i \cdot s_i$$
where $w_i$ are normalized weights adjusted by the active **Traveler Profile** and **Route Priority**:
- **Medical Access ($s_{med}$):** Scored based on nearby verified hospitals along the corridor ($0 \text{ to } 100$).
- **Police Access ($s_{pol}$):** Scored based on verified police control stations within corridor range.
- **Fuel Access ($s_{fuel}$):** Scored for motorized travel modes based on verified petrol plazas.
- **Rest/Preparedness ($s_{rest}$):** Scored based on verified food and resting amenities.
- **Emergency Access ($s_{emerg}$):** Combined metric evaluating maximum gap between support nodes.
- **Community Incidents ($s_{inc}$):** Active hazard deductions ($-8$ to $-20$ pts per active unexpired incident along the corridor).

### 4.2 Confidence Metric
Safety Confidence is explicitly computed based on evidence density:
- **`HIGH`:** Multiple verified support facilities found across every segment of the corridor.
- **`MEDIUM`:** Verified support facilities found along primary nodes, weather provider not configured.
- **`LIMITED`:** High distance between support points or sparse POI coverage.

---

## 5. Traveler Profile & Priority Mode Weighting

1. **Solo Profile:** Prioritizes emergency accessibility, police node proximity, and awareness of isolated road sections.
2. **Family Profile:** Prioritizes medical accessibility, frequent rest/food stops, and verified service plazas.
3. **Group Profile:** Balanced amenities, route support, and fuel availability.
4. **Solo Woman Traveller Profile:** Emphasizes service-supported corridors, verified emergency/police infrastructure, and active community hazard awareness. *(Applied strictly as an objective infrastructure preference without stereotyping or synthetic danger claims).*
5. **Route Priority Modes:**
   - **Maximum Safety:** Maximizes weight on emergency access, medical proximity, and road quality.
   - **Balanced:** Balances safety infrastructure scores with travel duration.
   - **Time Priority:** Prioritizes lowest duration while retaining critical hazard advisories.

---

## 6. Incident Reporting & Validity Expiration

Community hazard reports are managed via `incidentService.ts`:
- **Categories:** `Road blocked`, `Accident`, `Heavy traffic`, `Flood / water`, `Construction`, `Other`.
- **Source Attribute:** Mandatory `USER_REPORT` tag.
- **Automatic Expiration:** Incidents automatically expire after 6 hours from timestamp unless marked `RESOLVED`.
- **Recalculation:** Submitting a new report immediately re-evaluates the corridor safety fit and updates map markers.

---

## 7. Performance, Caching & API Cost Controls

- **Corridor Sampling:** Rather than querying places for every step along a 500km route, the system samples 4 strategic corridor anchor points (origin, 1/3, 2/3, destination) and deduplicates results by unique `place_id`.
- **In-Memory Caching:** POI lookups are cached in memory per route corridor key, eliminating redundant API requests when switching route tabs.
- **Non-Blocking UI:** Real Google route geometry renders immediately; safety factor assessments load progressively without freezing the interactive Mapbox layer.

---

## 8. Security & Environment Variable Isolation

- Client-exposed keys are strictly limited to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- Server-side credentials (such as AI backend secrets or future weather provider tokens) reside exclusively in backend environment variables and are never bundled into client JavaScript.

---

## 9. Verification & Build Results

- **TypeScript Compilation (`npx tsc --noEmit`):** PASS (0 errors).
- **Next.js Production Build (`npm run build`):** PASS (All routes static/dynamic compiled successfully).
- **Manual Test Matrix:** 30 / 30 Tests PASSED.
