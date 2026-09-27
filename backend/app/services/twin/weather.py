"""
Open-Meteo live weather + short-range forecast (keyless).

Docs: https://open-meteo.com/en/docs
Attribution (CC BY 4.0): "Weather data by Open-Meteo.com"
Limits: free for non-commercial use, < 10,000 calls/day. One request covers
every sample point along a route (comma-separated coordinates), and results
are cached for WEATHER_TTL_SECONDS, so a journey costs ~1 call per 10 min.
"""
from typing import Any, Dict, List, Tuple

from app.services.twin.http_cache import FetchError, fetch_json, iso

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_TTL_SECONDS = 600
SOURCE = "Open-Meteo (open-meteo.com)"
ATTRIBUTION = "Weather data by Open-Meteo.com (CC BY 4.0)"

# WMO weather interpretation codes, as documented by Open-Meteo.
WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    56: "Light freezing drizzle", 57: "Dense freezing drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Light freezing rain", 67: "Heavy freezing rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
}


def fetch_route_weather(points: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    points: [(lat, lng), ...] (<= 20). Returns
      {"status": "LIVE"|"CACHED"|"UNAVAILABLE", "source", "attribution",
       "fetched_at", "reason"?, "points": [ {...per point...} ]}
    Per point: observed_at (provider observation time), temperature_c,
    wind_kmh, weather_code, condition, precip_rate_mm_h (last 15 min, as a
    rate), forecast_next_hours: [{time, precip_mm, probability_pct}].
    """
    if not points:
        return {"status": "UNAVAILABLE", "source": SOURCE, "attribution": ATTRIBUTION,
                "fetched_at": None, "reason": "No route points supplied.", "points": []}

    params = {
        "latitude": ",".join(f"{lat:.4f}" for lat, _ in points),
        "longitude": ",".join(f"{lng:.4f}" for _, lng in points),
        "current": "temperature_2m,precipitation,weather_code,wind_speed_10m",
        "hourly": "precipitation,precipitation_probability",
        "forecast_hours": 4,
        "timezone": "auto",
    }
    try:
        data, fetched_at, cached = fetch_json(OPEN_METEO_URL, params, WEATHER_TTL_SECONDS)
    except FetchError as e:
        return {"status": "UNAVAILABLE", "source": SOURCE, "attribution": ATTRIBUTION,
                "fetched_at": None, "reason": str(e), "points": []}

    rows = data if isinstance(data, list) else [data]
    out_points = []
    for (lat, lng), row in zip(points, rows):
        current = row.get("current") or {}
        interval = current.get("interval") or 900
        precip_interval = current.get("precipitation")
        hourly = row.get("hourly") or {}
        times = hourly.get("time") or []
        precip = hourly.get("precipitation") or []
        prob = hourly.get("precipitation_probability") or []
        code = current.get("weather_code")
        out_points.append({
            "lat": lat,
            "lng": lng,
            "observed_at": current.get("time"),
            "timezone": row.get("timezone"),
            "temperature_c": current.get("temperature_2m"),
            "wind_kmh": current.get("wind_speed_10m"),
            "weather_code": code,
            "condition": WMO_CODES.get(code, "Unknown") if code is not None else None,
            # Open-Meteo's current precipitation is the sum over the preceding
            # `interval` seconds; scale to a per-hour rate.
            "precip_rate_mm_h": round(precip_interval * 3600 / interval, 2) if precip_interval is not None else None,
            "forecast_next_hours": [
                {"time": t, "precip_mm": precip[i] if i < len(precip) else None,
                 "probability_pct": prob[i] if i < len(prob) else None}
                for i, t in enumerate(times)
            ],
        })

    return {
        "status": "CACHED" if cached else "LIVE",
        "source": SOURCE,
        "attribution": ATTRIBUTION,
        "fetched_at": iso(fetched_at),
        "points": out_points,
    }
