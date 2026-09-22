# PHASE 2 CRITICAL ENGINEERING EXAMINATION & RISK REVIEW

**Project:** Travel Guardian  
**Phase:** 2  
**Date:** September 21, 2026  
**Review Type:** Deep Architecture, Security & Risk Analysis  

---

## 1. Executive Summary

Phase 2 successfully eliminated synthetic Bezier curves and replaced the routing engine with Google Directions road network geometry. All data rendered on the Mapbox GL JS map corresponds to real physical highway and city street alignments.

---

## 2. Detailed Findings & Severity Ratings

### Finding 1: Autocomplete Session Token Lifecycle
- **Severity:** LOW
- **Analysis:** Google Places autocomplete billing charges per prediction unless grouped with an `AutocompleteSessionToken`. Phase 2 implemented session tokens in `googlePlaces.ts` by initializing a session token on search keystrokes and closing/resetting it when `fetchPlaceDetails` completes.
- **Remediation Status:** RESOLVED.

### Finding 2: Coordinate Order Normalization (GeoJSON vs Google LatLng)
- **Severity:** MEDIUM
- **Analysis:** Google Directions API uses `(lat, lng)` order, while GeoJSON and Mapbox GL JS strictly require `[longitude, latitude]` order.
- **Implementation Check:** `decodeGooglePolyline()` explicitly pushes `[lng * 1e-5, lat * 1e-5]`. Checked and verified on Mapbox GL JS rendering layer.
- **Remediation Status:** RESOLVED & VERIFIED.

### Finding 3: Truthfulness on Route Alternatives Count
- **Severity:** HIGH
- **Analysis:** In legacy prototypes, 4 artificial routes (Routes A, B, C, D) were manufactured regardless of whether physical alternative corridors existed. In Phase 2, the UI dynamically renders only the real alternatives returned by Google (1 to 3).
- **Remediation Status:** RESOLVED.

### Finding 4: Separation of Real Route Metrics vs Travel Guardian Safety Scores
- **Severity:** MEDIUM
- **Analysis:** Distance (km), travel duration, traffic delays, and toll warnings are strictly derived from Google Directions API. Safety Fit scores (e.g. 92/100) are classified by Travel Guardian's corridor algorithm. The UI clearly attributes each data point to its source.
- **Remediation Status:** RESOLVED.

### Finding 5: API Key Protection & Referrer Restrictions
- **Severity:** LOW
- **Analysis:** The public key `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is loaded in browser scripts. Per Google Maps Platform best practices, it MUST be restricted in Google Cloud Console with HTTP referrers and limited to authorized APIs (Maps JS, Places, Geocoding, Directions).
- **Remediation Status:** DOCUMENTED IN `.env.example`.
