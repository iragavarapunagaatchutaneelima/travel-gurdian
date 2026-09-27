"""
Digital Twin state model, deterministic weather propagation, and what-if.

Pure functions only (no network, no DB, no communications). The live state is
assembled by build_live_state() from provider results; propagate() derives
impacts from a state; simulate() deep-copies a state, applies a rainfall
override, and re-propagates -- it can never touch the real journey, Safety
Check, contacts, or emergency dispatch because it has no access to them.

PROPAGATION RULES (documented in docs/MIDNIGHT_TASK_1_DIGITAL_TWIN.md):

1. Rainfall intensity class (mm/h), per AMS Glossary of Meteorology /
   UK Met Office hourly-rate conventions:
     none < 0.1 <= light < 2.5 <= moderate < 7.6 <= heavy < 50 <= violent
2. Waterlogging / flood exposure per route segment:
     LIKELY   if rain >= 50 mm/h (violent), or rain >= 7.6 and the river
              signal is ELEVATED/HIGH
     POSSIBLE if rain >= 7.6 mm/h, or the river signal is HIGH
     LOW      otherwise;  UNKNOWN if rainfall is unavailable
3. Free-flow speed reduction (FHWA, "Empirical Studies on Traffic Flow in
   Inclement Weather", 2006): light 3%, moderate 6%, heavy 9%. Violent rain
   is outside the study's range: flagged, not extrapolated.
4. Emergency readiness: share of segments with a real hospital (from the
   route's Google Places POIs) within 20 km whose exposure is not LIKELY.
     GOOD >= 80%, REDUCED >= 50%, POOR otherwise.
All of these are DETERMINISTIC ESTIMATES. The only probabilities shown come
from providers: Open-Meteo precipitation_probability and GloFAS ensemble
spread.
"""
import copy
import math
import time
from typing import Any, Dict, List, Optional, Tuple

TWIN_VERSION = "1.0"
MAX_SEGMENTS = 10
HOSPITAL_REACH_KM = 20.0
VIOLENT_MM_H = 50.0
HEAVY_MM_H = 7.6
MODERATE_MM_H = 2.5
LIGHT_MM_H = 0.1
SPEED_REDUCTION_PCT = {"none": 0.0, "light": 3.0, "moderate": 6.0, "heavy": 9.0}
SIM_MIN_MM_H = 0.0
SIM_MAX_MM_H = 150.0


def _hav_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def segment_route(waypoints_lnglat: List[List[float]], max_segments: int = MAX_SEGMENTS) -> List[Dict[str, Any]]:
    """Split a [lng, lat] polyline into equal-length segments with midpoints."""
    pts = [(p[1], p[0]) for p in waypoints_lnglat if isinstance(p, (list, tuple)) and len(p) >= 2]
    if len(pts) < 2:
        return []
    cum = [0.0]
    for i in range(1, len(pts)):
        cum.append(cum[-1] + _hav_km(pts[i - 1], pts[i]))
    total = cum[-1]
    if total <= 0:
        return []
    n = max(1, min(max_segments, int(math.ceil(total / 5.0))))  # >= ~5 km per segment

    def point_at(d: float) -> Tuple[float, float]:
        for i in range(1, len(cum)):
            if cum[i] >= d:
                span = cum[i] - cum[i - 1] or 1e-9
                t = (d - cum[i - 1]) / span
                return (pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
                        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t)
        return pts[-1]

    seg_len = total / n
    return [{
        "index": i,
        "start_km": round(i * seg_len, 2),
        "end_km": round((i + 1) * seg_len, 2),
        "length_km": round(seg_len, 2),
        "mid": [round(v, 5) for v in point_at((i + 0.5) * seg_len)],  # [lat, lng]
    } for i in range(n)]


def rain_class(mm_h: Optional[float]) -> Optional[str]:
    if mm_h is None:
        return None
    if mm_h >= VIOLENT_MM_H:
        return "violent"
    if mm_h >= HEAVY_MM_H:
        return "heavy"
    if mm_h >= MODERATE_MM_H:
        return "moderate"
    if mm_h >= LIGHT_MM_H:
        return "light"
    return "none"


def exposure(mm_h: Optional[float], river_level: Optional[str]) -> str:
    if mm_h is None:
        return "POSSIBLE" if river_level == "HIGH" else "UNKNOWN"
    elevated_river = river_level in ("ELEVATED", "HIGH")
    if mm_h >= VIOLENT_MM_H or (mm_h >= HEAVY_MM_H and elevated_river):
        return "LIKELY"
    if mm_h >= HEAVY_MM_H or river_level == "HIGH":
        return "POSSIBLE"
    return "LOW"


def build_live_state(route: Dict[str, Any], segments: List[Dict[str, Any]], weather: Dict[str, Any],
                     flood: Dict[str, Any], signals: Dict[str, Any], pois: List[Dict[str, Any]],
                     traveler: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    w_pts = weather.get("points") or []
    f_pts = flood.get("points") or []
    seg_states = []
    for i, seg in enumerate(segments):
        w = w_pts[i] if i < len(w_pts) else None
        f = f_pts[i] if i < len(f_pts) else None
        seg_states.append({
            **seg,
            "weather": ({k: w.get(k) for k in ("observed_at", "precip_rate_mm_h", "condition", "weather_code",
                                                "temperature_c", "wind_kmh", "forecast_next_hours")} if w else None),
            "river": ({k: f.get(k) for k in ("available", "level", "ratio_to_recent_median", "forecast_peak_m3s",
                                              "forecast_peak_date", "median_past_30d_m3s", "uncertainty", "reason")} if f else None),
        })
    usable_pois = [p for p in (pois or []) if isinstance(p, dict) and p.get("lat") is not None and p.get("lng") is not None]
    return {
        "twin_version": TWIN_VERSION,
        "generated_at": now_iso,
        "mode": "LIVE",
        "route": {
            "name": route.get("name"),
            "distance_km": route.get("distance_km"),
            "duration_min": route.get("duration_min"),
            "safety_score": route.get("safety_score"),
            "source": "Google Directions/Routes (computed in the app, not modified by the twin)",
            "segments": seg_states,
        },
        "traveler": ({"status": "LIVE", "source": "Browser geolocation", **traveler} if traveler
                     else {"status": "UNAVAILABLE", "reason": "No GPS position supplied."}),
        "weather": {k: weather.get(k) for k in ("status", "source", "attribution", "fetched_at", "reason")},
        "flood": {k: flood.get(k) for k in ("status", "source", "fetched_at", "method", "reason")},
        "signals": signals,
        "services": {
            "status": "LIVE" if usable_pois else "UNAVAILABLE",
            "source": "Google Places (POIs found along the route when it was planned)",
            "reason": None if usable_pois else "No route POIs supplied.",
            "pois": [{"name": p.get("name"), "type": p.get("type"), "lat": p["lat"], "lng": p["lng"]} for p in usable_pois],
        },
        "simulation": None,
    }


def _nearest(pois: List[Dict[str, Any]], at: Tuple[float, float], types: Tuple[str, ...]) -> Optional[Dict[str, Any]]:
    best = None
    for p in pois:
        if p.get("type") not in types:
            continue
        d = _hav_km(at, (p["lat"], p["lng"]))
        if best is None or d < best["distance_km"]:
            best = {"name": p.get("name"), "type": p.get("type"), "distance_km": round(d, 1), "lat": p["lat"], "lng": p["lng"]}
    return best


def propagate(state: Dict[str, Any]) -> Dict[str, Any]:
    """Derive impacts from a (live or simulated) state. Pure; returns a new dict."""
    sim = state.get("simulation")
    override = sim.get("rainfall_mm_h") if sim else None
    segments = state["route"]["segments"]
    pois = state["services"]["pois"]
    duration = state["route"].get("duration_min")
    total_km = sum(s["length_km"] for s in segments) or 0.0

    effects: List[Dict[str, Any]] = []
    seg_out = []
    extra_min = 0.0
    violent_seen = False
    unknown = 0
    reachable = 0

    for s in segments:
        live_rain = (s.get("weather") or {}).get("precip_rate_mm_h")
        rain = override if override is not None else live_rain
        river_info = s.get("river") or {}
        river = river_info.get("level") if river_info.get("available") else None
        cls = rain_class(rain)
        exp = exposure(rain, river)
        if exp == "UNKNOWN":
            unknown += 1
        if cls == "violent":
            violent_seen = True
        red = SPEED_REDUCTION_PCT.get(cls) if cls else None
        if red and duration and total_km:
            seg_min = duration * (s["length_km"] / total_km)
            extra_min += seg_min * (1 / (1 - red / 100.0) - 1)
        mid = (s["mid"][0], s["mid"][1])
        hospital = _nearest(pois, mid, ("hospital", "emergency"))
        hospital_ok = hospital is not None and hospital["distance_km"] <= HOSPITAL_REACH_KM and exp != "LIKELY"
        if hospital_ok:
            reachable += 1
        seg_out.append({
            "index": s["index"],
            "start_km": s["start_km"],
            "end_km": s["end_km"],
            "mid": s["mid"],
            "rain_mm_h": rain,
            "rain_source": "SIMULATED" if override is not None else ("LIVE" if live_rain is not None else "UNAVAILABLE"),
            "rain_class": cls,
            "river_level": river or "UNAVAILABLE",
            "exposure": exp,
            "speed_reduction_pct": red,
            "nearest_hospital": hospital,
            "nearest_police": _nearest(pois, mid, ("police",)),
            "nearest_fuel": _nearest(pois, mid, ("petrol",)),
            "hospital_reachable": hospital_ok,
        })

    affected = [s for s in seg_out if s["exposure"] in ("POSSIBLE", "LIKELY")]
    likely = [s for s in seg_out if s["exposure"] == "LIKELY"]
    seg_len = (total_km / len(segments)) if segments else 0.0
    n = len(seg_out)

    if n == 0:
        risk = "UNAVAILABLE"
    elif unknown == n:
        risk = "UNKNOWN"
    elif likely or violent_seen:
        risk = "HIGH"
    elif affected:
        risk = "MODERATE"
    else:
        risk = "LOW"

    readiness_share = (reachable / n) if (n and pois) else None
    if readiness_share is None:
        readiness = {"level": "UNAVAILABLE", "reason": "No hospital POIs available for this route."}
    else:
        level = "GOOD" if readiness_share >= 0.8 else "REDUCED" if readiness_share >= 0.5 else "POOR"
        readiness = {"level": level, "share_of_route_with_reachable_hospital": round(readiness_share, 2),
                     "rule": f"hospital within {HOSPITAL_REACH_KM:g} km of segment and exposure not LIKELY"}

    travel = {
        "baseline_duration_min": duration,
        "estimated_extra_min": round(extra_min, 1) if duration else None,
        "method": "FHWA (2006) free-flow speed reductions: light 3%, moderate 6%, heavy 9%",
    }
    if violent_seen:
        # Violent segments contribute nothing to extra_min (no FHWA figure),
        # so a bare number here would understate the impact -- "+0 min" in
        # 70 mm/h rain is exactly the wrong message. Report it as
        # unquantified, with a lower bound from the segments that can be.
        travel["estimated_extra_min"] = None
        travel["extra_min_lower_bound"] = round(extra_min, 1) if duration else None
        travel["advisory"] = "Violent rainfall (>= 50 mm/h) on part of the route is beyond the FHWA study range; delay is not quantified and roads may become impassable."

    prob_max = None
    for s in segments:
        for h in ((s.get("weather") or {}).get("forecast_next_hours") or []):
            if h.get("probability_pct") is not None:
                prob_max = h["probability_pct"] if prob_max is None else max(prob_max, h["probability_pct"])

    effects.append({"input": "Rainfall per segment (mm/h)", "rule": "AMS/Met Office intensity classes",
                    "output": {c: sum(1 for s in seg_out if s["rain_class"] == c) for c in ("none", "light", "moderate", "heavy", "violent")}})
    effects.append({"input": "Rainfall class + GloFAS river signal", "rule": "Exposure rule 2",
                    "output": f"{len(affected)} of {n} segments exposed ({len(likely)} LIKELY)"})
    effects.append({"input": "Exposed segments", "rule": "Share of route length",
                    "output": f"{round(len(affected) * seg_len, 1)} km of {round(total_km, 1)} km"})
    if travel["estimated_extra_min"] is not None:
        travel_out = f"+{travel['estimated_extra_min']} min"
    elif violent_seen:
        travel_out = f"not quantified (violent rain); at least +{travel.get('extra_min_lower_bound') or 0} min from other segments"
    else:
        travel_out = "not computable (no route duration)"
    effects.append({"input": "Rainfall class per segment", "rule": "FHWA speed reductions", "output": travel_out})
    effects.append({"input": "Real hospital POIs + exposure", "rule": "Readiness rule 4", "output": readiness["level"]})

    safe_locations = []
    for s in affected:
        for key in ("nearest_hospital", "nearest_police", "nearest_fuel"):
            loc = s.get(key)
            if loc and not any(x["name"] == loc["name"] and x["type"] == loc["type"] for x in safe_locations):
                safe_locations.append({**loc, "near_segment_km": s["start_km"]})

    return {
        "mode": "SIMULATED" if sim else "LIVE",
        "route_weather_risk": risk,
        "affected_segments": [s["index"] for s in affected],
        "affected_km": round(len(affected) * seg_len, 1),
        "total_km": round(total_km, 1),
        "flood_exposure": {"likely": len(likely), "possible": len(affected) - len(likely), "segments": n},
        "travel_impact": travel,
        "emergency_readiness": readiness,
        "safe_locations_for_affected_segments": safe_locations[:8],
        "segments": seg_out,
        "effects": effects,
        "uncertainty": {
            "precipitation_probability_next_hours_max_pct": prob_max,
            "precipitation_probability_source": "Open-Meteo model forecast (PREDICTION)" if prob_max is not None else None,
            "river_discharge": "GloFAS 50-member ensemble p25-p75 per segment (see segments[].river.uncertainty)",
            "derived_impacts": "DETERMINISTIC ESTIMATE (rule-based; no model confidence is claimed)",
        },
    }


def simulate(live_state: Dict[str, Any], rainfall_mm_h: float) -> Dict[str, Any]:
    """
    What-if on a CLONED state. The input dict is never mutated; the result
    is explicitly marked SIMULATED.
    """
    try:
        rain = float(rainfall_mm_h)
    except (TypeError, ValueError):
        raise ValueError("rainfall_mm_h must be a number")
    if math.isnan(rain) or rain < SIM_MIN_MM_H or rain > SIM_MAX_MM_H:
        raise ValueError(f"rainfall_mm_h must be between {SIM_MIN_MM_H:g} and {SIM_MAX_MM_H:g}")
    clone = copy.deepcopy(live_state)
    clone["mode"] = "SIMULATED"
    clone["simulation"] = {
        "rainfall_mm_h": rain,
        "applied_to": "all route segments",
        "note": "Hypothetical scenario. Does not change the live journey, Safety Check, contacts, or emergency state.",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    return {"state": clone, "impacts": propagate(clone)}
