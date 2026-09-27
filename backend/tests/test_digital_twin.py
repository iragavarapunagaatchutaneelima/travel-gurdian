"""
Digital Twin tests (HackCelestial Midnight Task 1).

Provider responses are mocked at fetch_json so these run offline and never
hit Open-Meteo / GDACS. The live-provider path is exercised separately by
manual verification (docs/MIDNIGHT_TASK_1_DIGITAL_TWIN.md).
"""
import copy
import json
import os
import tempfile
import unittest
from unittest.mock import patch

_tmp_fd, _tmp_path = tempfile.mkstemp(suffix=".db")
os.close(_tmp_fd)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp_path}")
os.environ["TWILIO_DRY_RUN"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.services.twin import flood, http_cache, model, signals, weather  # noqa: E402
from app.services.twin.http_cache import FetchError  # noqa: E402

# A real-shaped [lng, lat] polyline, Hyderabad -> Mumbai, coarse.
ROUTE_LNGLAT = [[78.4867, 17.385], [77.5, 17.6], [76.3, 17.66], [75.9, 17.66],
                [74.9, 18.2], [73.85, 18.52], [73.3, 18.75], [72.8777, 19.076]]


def _state(rain_values, river_levels=None, pois=None, duration=600):
    """Builds a twin state directly from provider-shaped inputs."""
    segs = model.segment_route(ROUTE_LNGLAT)
    n = len(segs)
    weather_res = {"status": "LIVE", "source": weather.SOURCE, "points": [
        {"precip_rate_mm_h": rain_values[i % len(rain_values)], "condition": "x", "observed_at": "t",
         "weather_code": 0, "temperature_c": 25, "wind_kmh": 5,
         "forecast_next_hours": [{"time": "t", "precip_mm": 0, "probability_pct": 40}]}
        for i in range(n)]}
    levels = river_levels or [None]
    flood_res = {"status": "FORECAST", "source": flood.SOURCE, "points": [
        ({"available": True, "level": levels[i % len(levels)]} if levels[i % len(levels)] else {"available": False})
        for i in range(n)]}
    return model.build_live_state(
        route={"name": "r", "distance_km": 700, "duration_min": duration, "safety_score": 90},
        segments=segs, weather=weather_res, flood=flood_res,
        signals={"status": "LIVE", "signals": []}, pois=pois or [], traveler=None)


class TestRules(unittest.TestCase):
    def test_rain_classes(self):
        self.assertIsNone(model.rain_class(None))
        self.assertEqual(model.rain_class(0.0), "none")
        self.assertEqual(model.rain_class(1.0), "light")
        self.assertEqual(model.rain_class(2.5), "moderate")
        self.assertEqual(model.rain_class(7.6), "heavy")
        self.assertEqual(model.rain_class(49.9), "heavy")
        self.assertEqual(model.rain_class(50.0), "violent")

    def test_exposure_rules(self):
        self.assertEqual(model.exposure(None, None), "UNKNOWN")
        self.assertEqual(model.exposure(None, "HIGH"), "POSSIBLE")
        self.assertEqual(model.exposure(1.0, "NORMAL"), "LOW")
        self.assertEqual(model.exposure(10.0, None), "POSSIBLE")
        self.assertEqual(model.exposure(10.0, "ELEVATED"), "LIKELY")
        self.assertEqual(model.exposure(1.0, "HIGH"), "POSSIBLE")
        self.assertEqual(model.exposure(60.0, None), "LIKELY")

    def test_segments_follow_route(self):
        segs = model.segment_route(ROUTE_LNGLAT)
        self.assertTrue(1 <= len(segs) <= model.MAX_SEGMENTS)
        for s in segs:
            lat, lng = s["mid"]
            self.assertTrue(17.0 < lat < 19.5 and 72.5 < lng < 79.0)
        self.assertEqual(model.segment_route([[78.0, 17.0]]), [])
        self.assertEqual(model.segment_route([]), [])


class TestPropagation(unittest.TestCase):
    def test_dry_route_is_low_risk(self):
        im = model.propagate(_state([0.0]))
        self.assertEqual(im["route_weather_risk"], "LOW")
        self.assertEqual(im["affected_segments"], [])
        self.assertEqual(im["travel_impact"]["estimated_extra_min"], 0.0)

    def test_heavy_rain_raises_risk_and_delay(self):
        im = model.propagate(_state([20.0]))
        self.assertEqual(im["route_weather_risk"], "MODERATE")
        # heavy = 9% speed reduction -> 600 * (1/0.91 - 1) ~= 59.3 min
        self.assertAlmostEqual(im["travel_impact"]["estimated_extra_min"], 59.3, delta=0.2)

    def test_violent_rain_is_not_quantified_as_zero(self):
        im = model.propagate(_state([70.0]))
        self.assertEqual(im["route_weather_risk"], "HIGH")
        self.assertIsNone(im["travel_impact"]["estimated_extra_min"])
        self.assertIn("advisory", im["travel_impact"])

    def test_unknown_rain_is_reported_not_assumed(self):
        im = model.propagate(_state([None]))
        self.assertEqual(im["route_weather_risk"], "UNKNOWN")
        self.assertTrue(all(s["rain_source"] == "UNAVAILABLE" for s in im["segments"]))

    def test_readiness_uses_only_supplied_pois(self):
        self.assertEqual(model.propagate(_state([0.0]))["emergency_readiness"]["level"], "UNAVAILABLE")
        segs = model.segment_route(ROUTE_LNGLAT)
        pois = [{"name": f"H{i}", "type": "hospital", "lat": s["mid"][0], "lng": s["mid"][1]} for i, s in enumerate(segs)]
        self.assertEqual(model.propagate(_state([0.0], pois=pois))["emergency_readiness"]["level"], "GOOD")
        # LIKELY exposure blocks access even with hospitals nearby.
        self.assertEqual(model.propagate(_state([70.0], pois=pois))["emergency_readiness"]["level"], "POOR")

    def test_every_effect_has_input_rule_output(self):
        for e in model.propagate(_state([10.0]))["effects"]:
            self.assertTrue({"input", "rule", "output"} <= set(e))

    def test_uncertainty_comes_only_from_providers(self):
        u = model.propagate(_state([0.0]))["uncertainty"]
        self.assertEqual(u["precipitation_probability_next_hours_max_pct"], 40)
        self.assertIn("DETERMINISTIC", u["derived_impacts"])


class TestSimulationIsolation(unittest.TestCase):
    def test_simulate_clones_and_labels(self):
        live = _state([0.0])
        snapshot = copy.deepcopy(live)
        out = model.simulate(live, 70)
        self.assertEqual(live, snapshot, "live state must not be mutated")
        self.assertEqual(out["state"]["mode"], "SIMULATED")
        self.assertEqual(out["impacts"]["mode"], "SIMULATED")
        self.assertEqual(model.propagate(live)["mode"], "LIVE")

    def test_simulate_bounds(self):
        live = _state([0.0])
        for bad in (-1, 151, float("nan"), "x"):
            with self.assertRaises(ValueError):
                model.simulate(live, bad)

    def test_simulate_never_reaches_network_or_dispatch(self):
        live = _state([0.0])
        with patch("urllib.request.urlopen", side_effect=AssertionError("network used")), \
             patch("app.services.comms_service.send_emergency_sms", side_effect=AssertionError("SMS")), \
             patch("app.services.comms_service.make_emergency_call", side_effect=AssertionError("call")):
            model.simulate(live, 100)


class TestProviders(unittest.TestCase):
    def setUp(self):
        http_cache.clear_cache()

    def test_weather_parses_and_converts_rate(self):
        payload = [{"timezone": "Asia/Kolkata",
                    "current": {"time": "2026-09-27T06:00", "interval": 900, "precipitation": 0.5,
                                "temperature_2m": 24, "weather_code": 61, "wind_speed_10m": 10},
                    "hourly": {"time": ["a", "b"], "precipitation": [1.0, 2.0], "precipitation_probability": [30, 60]}}]
        with patch.object(weather, "fetch_json", return_value=(payload, 1_790_000_000, False)):
            res = weather.fetch_route_weather([(17.4, 78.5)])
        self.assertEqual(res["status"], "LIVE")
        p = res["points"][0]
        self.assertEqual(p["precip_rate_mm_h"], 2.0)  # 0.5 mm per 15 min
        self.assertEqual(p["condition"], "Slight rain")
        self.assertEqual(p["forecast_next_hours"][1]["probability_pct"], 60)

    def test_weather_failure_is_unavailable_not_invented(self):
        with patch.object(weather, "fetch_json", side_effect=FetchError("HTTP 503 from api.open-meteo.com")):
            res = weather.fetch_route_weather([(17.4, 78.5)])
        self.assertEqual(res["status"], "UNAVAILABLE")
        self.assertEqual(res["points"], [])
        self.assertIn("503", res["reason"])

    def test_weather_cache_is_labeled(self):
        payload = [{"current": {"interval": 900, "precipitation": 0}, "hourly": {}}]
        calls = []

        class Resp:
            def __enter__(self): return self
            def __exit__(self, *a): return False
            def read(self): calls.append(1); return json.dumps(payload).encode()

        with patch("urllib.request.urlopen", return_value=Resp()):
            first = weather.fetch_route_weather([(10.0, 10.0)])
            second = weather.fetch_route_weather([(10.0, 10.0)])
        self.assertEqual((first["status"], second["status"]), ("LIVE", "CACHED"))
        self.assertEqual(len(calls), 1)

    def test_flood_ratio_and_levels(self):
        past = [10.0] * 30
        payload = [{"daily": {"time": [f"d{i}" for i in range(33)],
                              "river_discharge": past + [12.0, 35.0, 20.0],
                              "river_discharge_p25": [None] * 30 + [11, 30, 18],
                              "river_discharge_p75": [None] * 30 + [13, 40, 22],
                              "river_discharge_max": [None] * 30 + [15, 50, 25]}}]
        with patch.object(flood, "fetch_json", return_value=(payload, 1, False)):
            p = flood.fetch_route_flood([(17.4, 78.5)])["points"][0]
        self.assertEqual(p["ratio_to_recent_median"], 3.5)
        self.assertEqual(p["level"], "HIGH")
        self.assertEqual(p["uncertainty"]["p75_m3s"], 40)

    def test_flood_tiny_channel_not_assessed(self):
        payload = [{"daily": {"time": list(range(33)), "river_discharge": [0.2] * 33}}]
        with patch.object(flood, "fetch_json", return_value=(payload, 1, False)):
            p = flood.fetch_route_flood([(17.4, 78.5)])["points"][0]
        self.assertEqual(p["level"], "NOT_ASSESSED")

    def test_signals_filter_dedupe_and_sort(self):
        def feat(etype, eid, lng, lat, level):
            return {"geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "properties": {"eventtype": etype, "eventid": eid, "name": f"{etype}{eid}", "alertlevel": level,
                                   "iscurrent": "true", "url": {"report": "https://gdacs.org/r"}}}
        severe = [feat("FL", 1, 78.6, 17.4, "Orange")]
        minor = [feat("FL", 1, 78.6, 17.4, "Orange"),          # duplicate
                 feat("EQ", 2, 78.0, 17.5, "Green"),
                 feat("FL", 3, 10.0, 50.0, "Red")]             # far away
        with patch.object(signals, "_query", side_effect=[(severe, 1, False), (minor, 1, False)]):
            res = signals.fetch_route_signals([(17.385, 78.4867)])
        ids = [s["id"] for s in res["signals"]]
        self.assertEqual(ids, ["gdacs-FL-1", "gdacs-EQ-2"])
        self.assertIn("NOT_INTEGRATED", res["social_media"])

    def test_signals_failure_is_unavailable(self):
        with patch.object(signals, "_query", side_effect=FetchError("timeout")):
            res = signals.fetch_route_signals([(17.4, 78.5)])
        self.assertEqual((res["status"], res["signals"]), ("UNAVAILABLE", []))


class TestTwinApi(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def _mocked_state(self):
        dry = {"status": "LIVE", "source": "x", "points": [{"precip_rate_mm_h": 0.0, "forecast_next_hours": []}] * 10}
        with patch.object(weather, "fetch_route_weather", return_value=dry), \
             patch.object(flood, "fetch_route_flood", return_value={"status": "FORECAST", "points": []}), \
             patch.object(signals, "fetch_route_signals", return_value={"status": "LIVE", "signals": []}):
            return self.client.post("/api/twin/state", json={"route": {"name": "r", "duration_min": 600, "waypoints": ROUTE_LNGLAT}})

    def test_state_endpoint(self):
        res = self._mocked_state()
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["state"]["mode"], "LIVE")
        self.assertEqual(body["impacts"]["route_weather_risk"], "LOW")

    def test_state_rejects_bad_geometry(self):
        self.assertEqual(self.client.post("/api/twin/state", json={"route": {"waypoints": [[200, 10], [1, 1]]}}).status_code, 422)
        self.assertEqual(self.client.post("/api/twin/state", json={"route": {"waypoints": [[1, 1], [1, 1]]}}).status_code, 400)

    def test_simulate_endpoint_and_guards(self):
        live = self._mocked_state().json()["state"]
        res = self.client.post("/api/twin/simulate", json={"state": live, "rainfall_mm_h": 70})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["live_impacts"]["route_weather_risk"], "LOW")
        self.assertEqual(body["impacts"]["route_weather_risk"], "HIGH")
        # Can't chain a simulation off a simulated state, or send junk.
        self.assertEqual(self.client.post("/api/twin/simulate", json={"state": body["state"], "rainfall_mm_h": 10}).status_code, 400)
        self.assertEqual(self.client.post("/api/twin/simulate", json={"state": {"x": 1}, "rainfall_mm_h": 10}).status_code, 400)

    def test_point_weather_endpoint(self):
        live = {"status": "LIVE", "source": weather.SOURCE, "fetched_at": "t",
                "points": [{"precip_rate_mm_h": 3.2, "condition": "Moderate rain"}]}
        with patch.object(weather, "fetch_route_weather", return_value=live) as f:
            res = self.client.get("/api/twin/weather", params={"lat": 17.385, "lng": 78.4867})
        self.assertEqual(res.status_code, 200)
        f.assert_called_once_with([(17.385, 78.4867)])
        body = res.json()
        self.assertEqual(body["status"], "LIVE")
        self.assertEqual(body["point"]["precip_rate_mm_h"], 3.2)
        self.assertNotIn("points", body)

    def test_point_weather_unavailable_and_bounds(self):
        down = {"status": "UNAVAILABLE", "reason": "HTTP 503", "points": []}
        with patch.object(weather, "fetch_route_weather", return_value=down):
            body = self.client.get("/api/twin/weather", params={"lat": 17.4, "lng": 78.5}).json()
        self.assertEqual((body["status"], body["point"]), ("UNAVAILABLE", None))
        self.assertEqual(self.client.get("/api/twin/weather", params={"lat": 95, "lng": 78.5}).status_code, 422)
        self.assertEqual(self.client.get("/api/twin/weather", params={"lat": 17.4}).status_code, 422)


class TestTwinRouteRegistration(unittest.TestCase):
    """
    Route-registration contract, independent of business logic: guards
    against the exact class of production bug this was written for --
    app.include_router(twin.router, prefix=...) being removed, re-prefixed,
    or never reaching /api/twin/* -- which surfaces in a browser as
    "Digital Twin: HTTP 404" with no other symptom.

    A 404 specifically means "no route matched this path/method" (FastAPI
    dispatches to a route handler before any of that handler's own logic or
    validation runs). Sending a deliberately invalid payload and asserting
    the response is NOT 404 therefore proves the route exists at that exact
    path, independent of whatever the handler does with the payload -- this
    is robust across FastAPI's internal route-storage representation
    (verified 0.141.1 wraps include_router() results as lazy _IncludedRouter
    objects, not a flat list of APIRoute in app.routes, so introspecting
    app.routes directly would be version-fragile).
    """

    def setUp(self):
        self.client = TestClient(app)

    def test_twin_state_route_exists_under_api_v1_prefix(self):
        res = self.client.post(f"{settings.API_V1_STR}/twin/state", json={})
        self.assertNotEqual(res.status_code, 404, "POST /api/twin/state must be registered (got 404: route missing)")
        self.assertEqual(res.status_code, 422)  # missing required "route" -> validation error, not "route not found"

    def test_twin_simulate_route_exists_under_api_v1_prefix(self):
        res = self.client.post(f"{settings.API_V1_STR}/twin/simulate", json={})
        self.assertNotEqual(res.status_code, 404, "POST /api/twin/simulate must be registered (got 404: route missing)")
        self.assertEqual(res.status_code, 422)

    def test_twin_weather_route_exists_under_api_v1_prefix(self):
        res = self.client.get(f"{settings.API_V1_STR}/twin/weather")  # missing required lat/lng
        self.assertNotEqual(res.status_code, 404, "GET /api/twin/weather must be registered (got 404: route missing)")
        self.assertEqual(res.status_code, 422)

    def test_twin_prefix_is_api_v1_str(self):
        # settings.API_V1_STR is "/api" today; this documents that the
        # deployed contract is /api/twin/*, matching what next.config.ts's
        # /backend-api/* rewrite must proxy to (BACKEND_API_URL already
        # includes /api -- see next.config.ts and ENVIRONMENT.md).
        self.assertEqual(settings.API_V1_STR, "/api")

    def test_no_route_under_bare_backend_api_prefix(self):
        # /backend-api/* is the FRONTEND's same-origin rewrite prefix, not a
        # real backend path -- a request straight to it on the FastAPI app
        # itself must 404, confirming the two layers' contracts are not
        # confused with each other.
        res = self.client.post("/backend-api/twin/state", json={})
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
