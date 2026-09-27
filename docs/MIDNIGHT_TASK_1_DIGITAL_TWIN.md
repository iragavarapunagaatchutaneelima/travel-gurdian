# Midnight Task 1: Weather-Driven Digital Twin

Travel Guardian builds a **Digital Twin of the traveller's current journey**: a
structured, timestamped state holding the planned route, live weather along it,
river-flood signals, official disaster alerts and real safety services. A
deterministic rule set turns that state into impacts. A **what-if** mode clones
the state, applies hypothetical rainfall and shows how the impacts change. The
real journey is never touched.

Every value carries a source, a timestamp and a status. When a provider fails,
the twin reports `UNAVAILABLE` with the reason. It never fills the gap with
invented numbers.

---

## 1. Where it lives

| Layer | File | Role |
|---|---|---|
| Providers | `backend/app/services/twin/weather.py` | Open-Meteo forecast (current + next hours) |
| | `backend/app/services/twin/flood.py` | Open-Meteo Flood API (Copernicus GloFAS) |
| | `backend/app/services/twin/signals.py` | GDACS official disaster alerts |
| | `backend/app/services/twin/http_cache.py` | Keyless JSON fetch + in-process TTL cache |
| Model | `backend/app/services/twin/model.py` | State builder, propagation rules, what-if (pure functions) |
| API | `backend/app/api/twin.py` | `POST /api/twin/state`, `POST /api/twin/simulate`, `GET /api/twin/weather` |
| UI | `frontend/src/app/components/DigitalTwinPanel.tsx` | Slide-over panel on **Live Map** |
| | `frontend/src/app/map/page.tsx` | Segment circles and GDACS markers drawn on the existing Google Map |
| | `frontend/src/services/digitalTwinService.ts` | Typed client via same-origin `/backend-api` |
| AI | `frontend/src/services/groundedAnswers.ts` | AI Guardian weather/flood answers are read from the twin |
| Tests | `backend/tests/test_digital_twin.py` | 25 tests: rules, providers (mocked), API guards, isolation |
| | `frontend/src/scripts/testGroundedAnswers.ts` | 25 checks: AI answers are grounded and honest on failure |

Open it on **Live Map** after planning a route, using the **Digital Twin** button
(waves icon) in the map controls.

---

## 2. State model

`POST /api/twin/state` receives the route the app already computed with Google
(the `[lng, lat]` polyline, name, distance, duration and Safety Fit score), the
Google Places POIs found along it, and optionally the GPS position. It returns:

```
state
├─ twin_version, generated_at, mode = "LIVE", simulation = null
├─ route      name, distance_km, duration_min, safety_score, source
│  └─ segments[≤10]  start_km, end_km, length_km, mid [lat,lng]
│        ├─ weather  observed_at, precip_rate_mm_h, condition, temperature_c,
│        │           wind_kmh, forecast_next_hours[{time, precip_mm, probability_pct}]
│        └─ river    available, level, ratio_to_recent_median, forecast_peak_m3s,
│                    forecast_peak_date, median_past_30d_m3s, uncertainty{p25,p75,max}
├─ traveler   LIVE (browser geolocation) | UNAVAILABLE + reason
├─ weather    status, source, attribution, fetched_at, reason
├─ flood      status, source, fetched_at, method, reason
├─ signals    status, source, fetched_at, lookback_days, signals[], social_media
└─ services   status, source, pois[{name, type, lat, lng}]
impacts       (see §4)
```

The route is split into up to 10 equal-length segments, each about 5 km or more.
Each segment's midpoint is where weather and river data are sampled. All three
providers are fetched in parallel in one request each, since Open-Meteo accepts
many coordinates per call.

**Status vocabulary:** `LIVE` (fetched now), `CACHED` (served from the TTL cache,
labelled as such), `FORECAST` (a model forecast, e.g. GloFAS), `UNAVAILABLE`
(provider failed or no input, always with `reason`), `SIMULATED` (what-if
output), and `NOT_INTEGRATED` (social media, see §3.4).

---

## 3. Data sources

All three providers are **free and keyless**, so the twin has no API-key
configuration and nothing that could leak.

### 3.1 Weather: Open-Meteo forecast
- Endpoint: `https://api.open-meteo.com/v1/forecast`. Cache TTL: 10 min.
- `current.precipitation` is the amount over the model's current interval
  (usually 15 min). It is converted to a rate:
  `rate_mm_h = precipitation × 3600 / interval_seconds`.
- `hourly.precipitation_probability` for the next hours is the **only
  probability shown for weather**. It comes from the provider's model and is
  labelled PREDICTION.
- WMO weather codes are mapped to plain-language conditions.
- Attribution: *Weather data by Open-Meteo.com (CC BY 4.0)*, shown in the panel.

### 3.2 River flooding: Open-Meteo Flood API (Copernicus GloFAS)
- Endpoint: `https://flood-api.open-meteo.com/v1/flood`, with 30 past days and
  3 forecast days. Cache TTL: 3 h (GloFAS updates daily).
- **Limitation (shown in the UI):** the API provides no official flood thresholds
  or return periods. The twin compares the forecast peak with **the same
  location's own median over the past 30 days**:
  - ratio ≥ 3.0 → `HIGH`, ratio ≥ 1.5 → `ELEVATED`, otherwise `NORMAL`
  - median < 1 m³/s → `NOT_ASSESSED` (no significant modelled river; a ratio on
    a trickle is meaningless)
- Uncertainty comes from the GloFAS 50-member ensemble: p25, p75 and max per
  segment.
- This is a relative "the river is higher than usual" signal, **never an
  official flood warning**, and both the UI and AI Guardian say so.

### 3.3 Official alerts: GDACS
- Endpoint: GDACS event list (GeoJSON), covering floods, tropical cyclones,
  earthquakes, wildfires, droughts and volcanoes over the last 14 days.
  Cache TTL: 15 min.
- Orange/Red alerts are queried **separately** from Green, so a flood of minor
  events can never push a serious alert past the provider's page limit. Results
  are de-duplicated by event id.
- An event is kept only if it lies within a type-specific radius of the route:
  TC 500 km, EQ 300 km, DR 300 km, VO 200 km, FL 150 km, WF 100 km. This
  relevance is geometric (`WITHIN_RADIUS`), not a model confidence.

### 3.4 Social media: not integrated (deliberately)
X/Twitter, Facebook and similar platforms require paid, authenticated API access
that this project does not have. Scraping would breach their terms. The twin
therefore reports `social_media: NOT_INTEGRATED` with that explanation. It does
**not** generate synthetic "citizen reports".

### 3.5 Route and services
The route geometry, duration and POIs come from the app's existing Google
Directions/Routes and Places calls. The twin reads them and never modifies them.
Emergency readiness is only as complete as the POIs the route search found, and
the panel says so (`basis: N hospital(s) found along the route…`).

---

## 4. Propagation rules (deterministic)

`propagate(state)` is a pure function. The same state always produces the same
impacts. Each step is recorded in `impacts.effects[]` as `{input, rule, output}`,
and the panel shows this as the propagation chain.

1. **Rainfall intensity class** (AMS Glossary of Meteorology / UK Met Office
   hourly-rate conventions):
   `none < 0.1 ≤ light < 2.5 ≤ moderate < 7.6 ≤ heavy < 50 ≤ violent` (mm/h).
2. **Waterlogging / flood exposure per segment**
   - `LIKELY` if rain ≥ 50 mm/h, or rain ≥ 7.6 mm/h *and* the river is
     ELEVATED/HIGH
   - `POSSIBLE` if rain ≥ 7.6 mm/h, or the river is HIGH
   - `LOW` otherwise. `UNKNOWN` if rainfall is unavailable (unless the river is
     HIGH, which gives POSSIBLE).
3. **Travel delay:** free-flow speed reductions from FHWA, *Empirical Studies
   on Traffic Flow in Inclement Weather* (2006): light 3 %, moderate 6 %,
   heavy 9 %. Extra time per segment = `seg_duration × (1/(1−r) − 1)`.
   **Violent rain is outside the study's range, so it is not extrapolated.** The
   delay is reported as *not quantified*, with a lower bound from the other
   segments and an advisory that roads may become impassable. (An earlier
   version printed "+0 min" at 70 mm/h; that bug is fixed and covered by tests.)
4. **Emergency readiness:** the share of segments with a real hospital (from
   the route's Google Places POIs) within 20 km of the segment midpoint, where
   exposure is not LIKELY. `GOOD` ≥ 80 %, `REDUCED` ≥ 50 %, otherwise `POOR`.
   `UNAVAILABLE` if the route has no hospital POIs.
5. **Route weather risk:** `HIGH` if any segment is LIKELY or violent,
   `MODERATE` if any is POSSIBLE, `LOW` otherwise, `UNKNOWN` if all rainfall is
   unavailable.
6. **Safe locations:** the nearest real hospital, police station and fuel
   station for each exposed segment (up to 8).

### Uncertainty honesty
- Probabilities shown come **only from providers**: Open-Meteo precipitation
  probability and the GloFAS ensemble spread.
- Derived impacts are labelled **DETERMINISTIC ESTIMATE (rule-based; no model
  confidence is claimed)**. No invented confidence percentages appear anywhere.

---

## 5. What-if simulation

`POST /api/twin/simulate` with `{state, rainfall_mm_h}`:

- **Clones** the state (`copy.deepcopy`), sets `mode = SIMULATED`, and applies
  the rainfall to all segments. The input is never mutated.
- Accepts only a **LIVE** state produced by `/twin/state`. Chaining a simulation
  onto a simulated state, or sending a malformed state, returns 400.
- Rainfall must be 0–150 mm/h. Anything else returns 400 (non-numeric → 422).
- Returns `live_impacts` alongside the simulated `impacts`, so the panel can show
  the deltas side by side.
- **Isolation:** `model.py` has no access to the database, Safety Check,
  contacts, Twilio or 112. A test patches `send_emergency_sms` and
  `make_emergency_call` to raise and runs a 100 mm/h simulation. Neither is
  called. A simulation **cannot** trigger emergency communication.

---

## 6. AI Guardian integration

Questions such as *"How will the weather affect my journey?"* or *"Is there
flooding on my route?"* are intercepted in `/api/ai` **before any LLM call**
(`groundedAnswers.ts`):

- **Journey selected on Live Map** → `POST /twin/state` for that real route. The
  reply cites source, status and fetch time, the rainfall range, the forecast
  probability, route risk, exposed km, the delay estimate and GDACS alerts.
  Flood answers separate assessed segments from not-assessed ones.
- **GPS only** → `GET /twin/weather?lat&lng` for current conditions at that
  point. The reply says that no route is planned, so no journey impact can be
  assessed.
- **Neither** → says that a route or GPS is needed. No call, no guess.
- **Provider or backend failure** → says the service is unavailable and why.

The journey reaches AI Guardian through `services/activeJourney.ts`: Live Map
writes the selected route to sessionStorage, and AI Guardian and Safety Check
read it. Pages that previously used placeholders (a hardcoded Safety Fit 89,
"Destination Corridor") now use the real journey or nothing.

---

## 7. Verified behaviour (live run, 2026-09-27 ~01:08 UTC)

Coarse Hyderabad → Mumbai polyline (8 points, 810 min), with one test hospital
POI supplied as input:

| Check | Result |
|---|---|
| `POST /twin/state` | 200. Weather `LIVE` (fetched 01:07:45Z), flood `CACHED`, GDACS `CACHED` (0 alerts in range) |
| Live rain per segment | 0.0 mm/h × 10 (consistent with point check: "Clear sky") |
| River levels | 9 × `NOT_ASSESSED` (no significant modelled river), 1 × `NORMAL` |
| Live impacts | risk `LOW`, +0.0 min, max rain probability next hours 21 % |
| Readiness | `POOR`: expected for a single test hospital; real routes pass their Places POIs |
| Simulate 20 mm/h | `MODERATE`, 10/10 POSSIBLE, **+80.1 min**; live impacts unchanged |
| Simulate 70 mm/h | `HIGH`, 10/10 LIKELY, delay **not quantified** (lower bound 0.0); live unchanged |
| Simulate 500 mm/h / chained sim | 400 / 400 |
| `GET /twin/weather` (Hyderabad) | `LIVE`, Clear sky, 0.0 mm/h |

In the browser, with a Google-computed "Optimal Safety Corridor" (225 points,
26 POIs, Safety Fit 94) selected on Live Map, AI Guardian answered from the twin:
*"Live weather along your route (Open-Meteo (open-meteo.com), LIVE, fetched
01:00 UTC): rainfall 0–0 mm/h. Forecast chance of rain in the next few hours:
up to 10% (model prediction). Route weather risk: LOW…"*

Automated: `backend/tests/test_digital_twin.py` (25 tests, providers mocked so
the suite runs offline) and `frontend/src/scripts/testGroundedAnswers.ts`
(25 checks).

---

## 8. Limitations

- **River signal is relative**, not an official warning (no thresholds or return
  periods are available from the API). Small channels are `NOT_ASSESSED`.
- **No urban-drainage model.** Waterlogging exposure is inferred from rainfall
  intensity and river state, not from street-level drainage or elevation data.
- **What-if applies uniform rainfall** to the whole route. Per-segment or
  moving-storm scenarios are not modelled.
- **Segment resolution:** at most 10 samples per route. Very local cells between
  midpoints can be missed.
- **Readiness depends on the POIs the route search returned**, not every
  hospital that exists.
- **FHWA speed reductions** come from US freeway data. They are a transparent,
  cited baseline, not a calibrated model for Indian highways.
- **Social media is not integrated** (§3.4).
- **Cache:** in-process only. It resets when the backend restarts and is not
  shared across workers.

## 9. Attribution
- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
- River discharge: Copernicus Emergency Management Service, GloFAS, via the
  Open-Meteo Flood API.
- Disaster alerts: [GDACS](https://www.gdacs.org/), a joint UN OCHA / European
  Commission service.
- Rain classes: AMS Glossary of Meteorology / UK Met Office. Speed reductions:
  FHWA (2006), *Empirical Studies on Traffic Flow in Inclement Weather*.
