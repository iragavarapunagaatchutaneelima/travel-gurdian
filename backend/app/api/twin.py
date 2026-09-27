"""
Digital Twin API.

POST /twin/state     live state + impacts for a route the app already planned
POST /twin/simulate  what-if on a CLONE of that state (pure; no side effects)

The route geometry and POIs come from the frontend (which computed them via
Google); this API never invents either. Weather, flood and public-signal
data are fetched here from keyless public providers.
"""
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.services.twin import flood, model, signals, weather

router = APIRouter()


class TwinRoute(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    distance_km: Optional[float] = Field(default=None, ge=0, le=20000)
    duration_min: Optional[float] = Field(default=None, ge=0, le=100000)
    safety_score: Optional[float] = Field(default=None, ge=0, le=100)
    waypoints: List[List[float]] = Field(..., min_length=2, max_length=20000)

    @field_validator("waypoints")
    @classmethod
    def check_lnglat(cls, v: List[List[float]]) -> List[List[float]]:
        for p in v:
            if len(p) < 2 or not (-180 <= p[0] <= 180) or not (-90 <= p[1] <= 90):
                raise ValueError("waypoints must be [lng, lat] pairs in range")
        return v


class TwinPoi(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    type: Optional[str] = Field(default=None, max_length=40)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class TwinTraveler(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    accuracy_m: Optional[float] = Field(default=None, ge=0, le=100000)


class TwinStateRequest(BaseModel):
    route: TwinRoute
    pois: List[TwinPoi] = Field(default_factory=list, max_length=500)
    traveler: Optional[TwinTraveler] = None


class TwinSimulateRequest(BaseModel):
    state: Dict[str, Any]
    rainfall_mm_h: float


@router.post("/state")
def twin_state(req: TwinStateRequest) -> Dict[str, Any]:
    segments = model.segment_route(req.route.waypoints)
    if not segments:
        raise HTTPException(status_code=400, detail="Route geometry is too short to model.")
    mids = [(s["mid"][0], s["mid"][1]) for s in segments]
    with ThreadPoolExecutor(max_workers=3) as pool:
        wf = pool.submit(weather.fetch_route_weather, mids)
        ff = pool.submit(flood.fetch_route_flood, mids)
        sf = pool.submit(signals.fetch_route_signals, mids)
        w, f, s = wf.result(), ff.result(), sf.result()
    state = model.build_live_state(
        route=req.route.model_dump(exclude={"waypoints"}),
        segments=segments,
        weather=w,
        flood=f,
        signals=s,
        pois=[p.model_dump() for p in req.pois],
        traveler=req.traveler.model_dump() if req.traveler else None,
    )
    return {"state": state, "impacts": model.propagate(state)}


@router.get("/weather")
def point_weather(lat: float, lng: float) -> Dict[str, Any]:
    """Live weather at a single point (e.g. the traveler's GPS position)."""
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(status_code=422, detail="lat/lng out of range")
    res = weather.fetch_route_weather([(lat, lng)])
    return {k: v for k, v in res.items() if k != "points"} | {"point": (res.get("points") or [None])[0]}


@router.post("/simulate")
def twin_simulate(req: TwinSimulateRequest) -> Dict[str, Any]:
    st = req.state
    try:
        segs = st["route"]["segments"]
        if not isinstance(segs, list) or not (1 <= len(segs) <= model.MAX_SEGMENTS):
            raise KeyError
        st["services"]["pois"]
    except (KeyError, TypeError):
        raise HTTPException(status_code=400, detail="state must be a Digital Twin state returned by /twin/state.")
    if st.get("mode") != "LIVE":
        raise HTTPException(status_code=400, detail="Simulations must start from a LIVE state.")
    try:
        result = model.simulate(st, req.rainfall_mm_h)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"live_impacts": model.propagate(st), **result}
