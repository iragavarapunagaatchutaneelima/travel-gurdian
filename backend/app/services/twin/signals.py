"""
Public / official signals: GDACS (Global Disaster Alert and Coordination
System, a joint UN OCHA / European Commission service). Keyless, public.

API: https://www.gdacs.org/gdacsapi/  (event list, GeoJSON)

Only official alerts are used. No social-media scraping: platforms like X
require paid, authenticated API access this project doesn't have, so the UI
states that social feeds are not integrated rather than faking them.
"""
import datetime
import math
from typing import Any, Dict, List, Tuple

from app.services.twin.http_cache import FetchError, fetch_json, iso

GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"
SIGNALS_TTL_SECONDS = 900
SOURCE = "GDACS (UN OCHA / European Commission)"
LOOKBACK_DAYS = 14

EVENT_TYPES = {"FL": "Flood", "TC": "Tropical cyclone", "EQ": "Earthquake", "WF": "Wildfire", "DR": "Drought", "VO": "Volcano"}
# How close an event must be to the route to be relevant (km).
RELEVANCE_RADIUS_KM = {"TC": 500, "FL": 150, "EQ": 300, "WF": 100, "DR": 300, "VO": 200}


def haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def _query(alertlevels: str) -> Tuple[List[Dict[str, Any]], float, bool]:
    today = datetime.date.today()
    params = {
        "eventlist": "FL;TC;EQ;WF;DR;VO",
        "fromDate": (today - datetime.timedelta(days=LOOKBACK_DAYS)).isoformat(),
        "toDate": today.isoformat(),
        "alertlevel": alertlevels,
    }
    data, fetched_at, cached = fetch_json(GDACS_URL, params, SIGNALS_TTL_SECONDS, timeout=15)
    return (data or {}).get("features") or [], fetched_at, cached


def fetch_route_signals(route_points: List[Tuple[float, float]]) -> Dict[str, Any]:
    if not route_points:
        return {"status": "UNAVAILABLE", "source": SOURCE, "fetched_at": None,
                "reason": "No route points supplied.", "signals": []}
    try:
        # Orange/Red queried on their own so a flood of minor Green events
        # can never push a serious alert past the provider's page limit.
        severe, fetched_at, cached = _query("Orange;Red")
        minor, _, _ = _query("Green")
    except FetchError as e:
        return {"status": "UNAVAILABLE", "source": SOURCE, "fetched_at": None,
                "reason": str(e), "signals": []}

    seen = set()
    signals = []
    for feat in severe + minor:
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") if geom.get("type") == "Point" else None
        key = (props.get("eventtype"), props.get("eventid"))
        if not coords or key in seen:
            continue
        seen.add(key)
        etype = props.get("eventtype")
        event_pt = (coords[1], coords[0])
        dist = min(haversine_km(event_pt, p) for p in route_points)
        if dist > RELEVANCE_RADIUS_KM.get(etype, 150):
            continue
        sev = props.get("severitydata") or {}
        signals.append({
            "id": f"gdacs-{etype}-{props.get('eventid')}",
            "type": EVENT_TYPES.get(etype, etype),
            "name": props.get("name"),
            "alert_level": props.get("alertlevel"),
            "is_current": str(props.get("iscurrent")).lower() == "true",
            "from": props.get("fromdate"),
            "to": props.get("todate"),
            "country": props.get("country") or None,
            "lat": event_pt[0],
            "lng": event_pt[1],
            "distance_to_route_km": round(dist, 1),
            "severity": sev.get("severitytext"),
            "report_url": (props.get("url") or {}).get("report"),
            "source": SOURCE,
            # Relevance is plain geometry (distance vs a fixed per-type
            # radius), not a model confidence.
            "relevance": "WITHIN_RADIUS",
        })
    signals.sort(key=lambda s: ({"Red": 0, "Orange": 1}.get(s["alert_level"], 2), s["distance_to_route_km"]))
    return {
        "status": "CACHED" if cached else "LIVE",
        "source": SOURCE,
        "fetched_at": iso(fetched_at),
        "lookback_days": LOOKBACK_DAYS,
        "social_media": "NOT_INTEGRATED: social platforms require paid authenticated API access; no social posts are shown or invented.",
        "signals": signals,
    }
