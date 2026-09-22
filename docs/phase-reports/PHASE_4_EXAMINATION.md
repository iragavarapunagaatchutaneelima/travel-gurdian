# Travel Guardian — Phase 4 Technical Examination & Risk Analysis
**Phase 4: Real Live Navigation & Dynamic Rerouting**  
**Date:** September 21, 2026  
**Auditor:** Senior Navigation Systems & Safety Architect  

---

## 1. Technical Examination Findings

### Finding 1: GPS Noise & Spuriously Triggered Rerouting
- **Severity:** **LOW** (Mitigated)
- **Analysis:** GPS signal bounce in urban canyons (high-rise corridors) can momentarily offset position readings by 50–100m. An instantaneous threshold check would repeatedly trigger false off-route alerts and spam Google routing requests.
- **Mitigation Implemented:** 
  1. Effective off-route threshold scales with accuracy: `max(80m, min(250m, accuracy * 1.4))`.
  2. Multi-fix persistence requirement: User must record **3 consecutive off-route fixes** before transitioning to `OFF_ROUTE`.
  3. User approval gate: System never reroutes automatically.

### Finding 2: Stale Asynchronous Reroute Overwrite Race Condition
- **Severity:** **LOW** (Mitigated)
- **Analysis:** If a user moves rapidly while two reroute requests are dispatched in close succession, an older slow network response could resolve after a newer response, overwriting fresh route geometry with stale coordinates.
- **Mitigation Implemented:** Incremental generation counter `rerouteRequestIdRef`. Every reroute request compares its request ID upon completion against the latest ID; stale responses are dropped immediately.

### Finding 3: Memory Leak Prevention & GPS Watcher Lifecycle
- **Severity:** **LOW** (Mitigated)
- **Analysis:** Failing to clear `watchPosition` on component unmount or navigation completion can drain device battery and leak background geolocation callbacks.
- **Mitigation Implemented:** `useEffect` cleanup hook unconditionally calls `navigator.geolocation.clearWatch(watchIdRef.current)` and resets references when `status === "ENDED"` or on unmount.

### Finding 4: Camera Jitter During Active Follow Mode
- **Severity:** **LOW** (Mitigated)
- **Analysis:** Calling `map.flyTo` on every high-frequency GPS fix produces stuttering camera motion.
- **Mitigation Implemented:** Used `map.easeTo` with an 800ms duration and zoom lock (15), decoupled from marker coordinate updates. Map pan/drag immediately disengages follow mode without freezing location updates.

### Finding 5: Mobile Viewport Touch Target Ergonomics
- **Severity:** **LOW** (Mitigated)
- **Analysis:** Mobile devices require thumb-accessible controls that do not obscure the live route turn card.
- **Mitigation Implemented:** Turn maneuver HUD is positioned at the top left/center, while bottom telemetry and controls span the bottom margin with minimum 48px touch targets.

---

## 2. Risk Classification Summary

| Evaluated Risk Area | Assessed Risk | Status |
| :--- | :---: | :--- |
| False Positive Off-Route Alerts | **LOW** | 3-fix persistence & accuracy expansion verified |
| Stale Async Route Overwrites | **LOW** | Generation request counter verified |
| Background Geolocation Memory Leaks | **LOW** | Strict clearWatch lifecycle verified |
| Uncontrolled Google API Request Loops | **LOW** | 15-second cooldown guard verified |
| Fabricated GPS / Speed Telemetry | **NONE** | Strict null fallback handling verified |
| Unauthorized Automatic SOS Escalations | **NONE** | Off-route decoupled from SOS verified |
