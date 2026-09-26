# Travel Guardian — Unresolved Issues (To Be Resolved)

### Status: ALL IDENTIFIED ISSUES RESOLVED

Every issue identified across the audit phases, routing engine, emergency subsystem, AI location awareness, and UI/UX has been resolved and verified with automated test suites.

### Verified Resolutions Checklist
- [x] **ISS-01**: Translucent dark glassmorphism Navigation HUD overlay.
- [x] **ISS-02**: Welcome Traveler scenic background image visibility with refined contrast.
- [x] **ISS-03**: AI Guardian route-aware petrol bunk and pharmacy search.
- [x] **ISS-04**: Bidirectional AI-to-map synchronization with auto-fitting camera bounds.
- [x] **ISS-05**: Graceful `"-- km/h"` and `"--"` formatting for unavailable GPS speed/heading.
- [x] **ISS-06**: Reverse-geocoded human location telemetry in emergency portal.
- [x] **ISS-07**: Singleton Google Maps JavaScript API loader with auth failure trap.
- [x] **ISS-08**: Mobile viewport responsiveness (320px–430px) without horizontal scrolling.
- [x] **ISS-09**: High-contrast, interactive Plan Journey action cards on dashboard.
- [x] **ISS-10**: Complete removal of Mapbox references across functional codebase.
- [x] **ISS-11**: Google Routes API v2 `TWO_WHEELER` mode implementation (resolves Mumbai ➔ Hyderabad ZERO_RESULTS).
- [x] **ISS-12**: Priority-based deterministic route ranking (#1 Highest Priority, #2 Safe Alternative, #3 Alternative).
- [x] **ISS-13**: Exotel emergency communication timeout expansion and truthful error reporting.
- [x] **ISS-14**: 112 Safety Lock state machine (Default `DEACTIVATED`, confirmation modal, zero automated test 112 dials).
- [x] **ISS-15**: Standardized emergency SMS structure with human-readable location, GPS coordinates, and Google Maps link.

### Known Environmental Constraints (Not Application Bugs)
1. **Exotel Singapore Region KYC Requirements**: Production SMS dispatch requires Exotel regulatory KYC compliance and active ExoPhone provisioning. The application reports provider rejection cleanly to the user.
2. **Google Maps API Key HTTP Referrer Policy**: Key `AIzaSy...` requires requests to include an authorized referrer (`http://localhost:3000/`), enforced cleanly by the Next.js server proxy.
