# Travel Guardian — Phase 3 Engineering Examination & Risk Analysis
**Phase 3: Real Safety Intelligence Over Real Routes**  
**Date:** September 21, 2026  
**Auditor:** Senior Infrastructure & Safety Systems Architect  

---

## 1. Deep Engineering Review & Findings

### Finding 1: Google Places Corridor Request Throttling
- **Severity:** **LOW**
- **Analysis:** Long interstate routes (e.g. Chennai to Mumbai > 1,300 km) have large bounding boxes. Querying PlacesService across 20+ intermediate points would rapidly exhaust Google Maps API rate limits and trigger `OVER_QUERY_LIMIT`.
- **Resolution:** We implemented intelligent 4-point corridor anchor sampling (Origin, 1/3 corridor, 2/3 corridor, Destination) with in-memory caching and deduplication by `place_id`. This keeps total Places API requests below 4 per route calculation while covering the primary transit anchors.

### Finding 2: Truthful Handling of Missing Live Weather Telemetry
- **Severity:** **LOW**
- **Analysis:** Prior iterations tempted developers to return synthetic weather icons and fake rain chances. 
- **Resolution:** We enforced strict classification: `weather.status = "NOT_CONFIGURED"`. The UI clearly explains: *"Live weather telemetry provider is not configured for this installation. No synthetic weather assumed."*

### Finding 3: Race Conditions on Fast Origin/Destination Tab Switching
- **Severity:** **LOW**
- **Analysis:** Rapidly clicking between Route A, Route B, and Route C could cause asynchronous POI responses to resolve out of order.
- **Resolution:** `calculateGoogleRoutes` resolves POIs per route and attaches the fully calculated `SafetyAssessment` directly onto the `RouteOption` object before setting state, ensuring atomic updates.

### Finding 4: Security & Environment Token Exposure
- **Severity:** **LOW**
- **Analysis:** Client bundle inspection verified that private server secrets (Gemini backend keys, database URLs) are not exposed with `NEXT_PUBLIC_` prefixes. Only standard browser-restricted keys (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`) are present.

### Finding 5: Community Incident Spam / Stale Hazard Retention
- **Severity:** **MEDIUM**
- **Analysis:** Unmoderated user reports could accumulate indefinitely and artificially depress safety fit scores.
- **Resolution:** Enforced a strict 6-hour automatic validity expiration window on all community hazard reports, with status transitioning to `EXPIRED` automatically.

---

## 2. Risk Assessment Summary

| Risk Category | Evaluated Risk | Mitigation Verified |
| :--- | :---: | :--- |
| Fabricated Danger / Crime Scores | **NONE** | Zero synthetic danger algorithms in production codebase |
| API Rate Limit Depletion | **LOW** | In-memory corridor cache & 4-node anchor sampling |
| Mobile Viewport Usability | **LOW** | Responsive sticky layer pills & clean scrollable drawer |
| Unsupported Safety Claims | **NONE** | Terminology audited; "Safety Fit" used consistently |
