"""
Open-Meteo Flood API: GloFAS river-discharge forecast (keyless).

Docs: https://open-meteo.com/en/docs/flood-api
Data: Copernicus Emergency Management Service, Global Flood Awareness System.

IMPORTANT LIMITATION (surfaced to the UI): the API does not provide official
flood thresholds or return periods. We therefore compare the forecast peak
against the SAME location's own median over the past 30 days. That is a
relative "is the river higher than usual lately" signal, labeled
DETERMINISTIC ESTIMATE, never an official flood warning.
"""
import statistics
from typing import Any, Dict, List, Tuple

from app.services.twin.http_cache import FetchError, fetch_json, iso

FLOOD_URL = "https://flood-api.open-meteo.com/v1/flood"
FLOOD_TTL_SECONDS = 3 * 3600  # GloFAS updates daily
SOURCE = "Open-Meteo Flood API (Copernicus GloFAS)"

# Ratio of forecast peak to the site's own 30-day median.
ELEVATED_RATIO = 1.5
HIGH_RATIO = 3.0


def classify_discharge_ratio(ratio: float) -> str:
    if ratio >= HIGH_RATIO:
        return "HIGH"
    if ratio >= ELEVATED_RATIO:
        return "ELEVATED"
    return "NORMAL"


def fetch_route_flood(points: List[Tuple[float, float]]) -> Dict[str, Any]:
    if not points:
        return {"status": "UNAVAILABLE", "source": SOURCE, "fetched_at": None,
                "reason": "No route points supplied.", "points": []}
    params = {
        "latitude": ",".join(f"{lat:.4f}" for lat, _ in points),
        "longitude": ",".join(f"{lng:.4f}" for _, lng in points),
        "daily": "river_discharge,river_discharge_p25,river_discharge_p75,river_discharge_max",
        "past_days": 30,
        "forecast_days": 3,
    }
    try:
        data, fetched_at, cached = fetch_json(FLOOD_URL, params, FLOOD_TTL_SECONDS)
    except FetchError as e:
        return {"status": "UNAVAILABLE", "source": SOURCE, "fetched_at": None,
                "reason": str(e), "points": []}

    rows = data if isinstance(data, list) else [data]
    out = []
    for (lat, lng), row in zip(points, rows):
        daily = row.get("daily") or {}
        times = daily.get("time") or []
        q = daily.get("river_discharge") or []
        p25 = daily.get("river_discharge_p25") or []
        p75 = daily.get("river_discharge_p75") or []
        qmax = daily.get("river_discharge_max") or []
        # The last 3 entries are the forecast; everything before is the past.
        past = [v for v in q[:-3] if v is not None]
        forecast_idx = list(range(max(0, len(q) - 3), len(q)))
        forecast = [q[i] for i in forecast_idx if q[i] is not None]
        if not past or not forecast:
            out.append({"lat": lat, "lng": lng, "available": False,
                        "reason": "No river discharge modelled at this location (likely no nearby river in GloFAS)."})
            continue
        median_past = statistics.median(past)
        peak = max(forecast)
        peak_i = forecast_idx[[q[i] for i in forecast_idx].index(peak)]
        # Tiny channels (median ~0) would make any ratio meaningless.
        ratio = round(peak / median_past, 2) if median_past >= 1.0 else None
        out.append({
            "lat": lat,
            "lng": lng,
            "available": True,
            "forecast_peak_m3s": peak,
            "forecast_peak_date": times[peak_i] if peak_i < len(times) else None,
            "median_past_30d_m3s": round(median_past, 2),
            "ratio_to_recent_median": ratio,
            "level": classify_discharge_ratio(ratio) if ratio is not None else "NOT_ASSESSED",
            # Real ensemble spread for the peak day (50 GloFAS members).
            "uncertainty": {
                "p25_m3s": p25[peak_i] if peak_i < len(p25) else None,
                "p75_m3s": p75[peak_i] if peak_i < len(p75) else None,
                "ensemble_max_m3s": qmax[peak_i] if peak_i < len(qmax) else None,
                "kind": "ENSEMBLE_SPREAD",
            },
        })
    return {
        "status": "CACHED" if cached else "FORECAST",
        "source": SOURCE,
        "fetched_at": iso(fetched_at),
        "method": f"Forecast peak vs this location's own 30-day median; ELEVATED >= {ELEVATED_RATIO}x, HIGH >= {HIGH_RATIO}x. Not an official flood threshold.",
        "points": out,
    }
