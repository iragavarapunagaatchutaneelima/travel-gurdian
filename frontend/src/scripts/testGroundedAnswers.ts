// AI GUARDIAN GROUNDING TESTS: weather / flood / trusted-contact answers must
// come from backend data (mocked here) and say "unavailable" instead of
// inventing anything when that data is missing.
import * as fs from "fs";
import * as path from "path";
import { isWeatherQuestion, isTrustedContactQuestion, answerWeather, answerTrustedContact } from "../services/groundedAnswers.js";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    testsFailed++;
  }
}

type Handler = (url: string, init?: RequestInit) => { status: number; body: unknown } | Error;
const calls: { url: string; init?: RequestInit }[] = [];
function mockFetch(handler: Handler) {
  calls.length = 0;
  (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = handler(url, init);
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  };
}

const BACKEND = "http://backend.test/api";
const ROUTE: any = {
  name: "Optimal Safety Corridor", distanceKm: 705, durationMinutes: 810, safetyScore: 94,
  waypoints: [[78.48, 17.38], [72.87, 19.07]],
  pois: [{ name: "City Hospital", type: "hospital", latitude: 17.4, longitude: 78.4 }],
};

function twinResponse(overrides: { weather?: any; flood?: any; signals?: any; segments?: any[] } = {}) {
  const segments = overrides.segments ?? [
    { rain_mm_h: 0.4, river_level: "NORMAL" },
    { rain_mm_h: 3.1, river_level: "ELEVATED" },
    { rain_mm_h: 1.0, river_level: "NOT_ASSESSED" },
  ];
  return {
    state: {
      weather: overrides.weather ?? { status: "LIVE", source: "Open-Meteo (open-meteo.com)", fetched_at: "2026-09-27T01:00:00Z" },
      flood: overrides.flood ?? { status: "FORECAST" },
      signals: overrides.signals ?? { status: "LIVE", signals: [] },
    },
    impacts: {
      segments,
      uncertainty: { precipitation_probability_next_hours_max_pct: 40 },
      route_weather_risk: "MODERATE",
      flood_exposure: { likely: 0, possible: 1, segments: segments.length },
      affected_km: 70, total_km: 705,
      travel_impact: { estimated_extra_min: 12, advisory: null },
      emergency_readiness: { level: "GOOD" },
    },
  };
}

(async () => {
  console.log("=== AI GUARDIAN GROUNDED ANSWERS TESTS ===");

  // Intent detection
  assert(isWeatherQuestion("How will the rain affect my journey?"), "rain question detected as weather");
  assert(isWeatherQuestion("Any flooding on the route?"), "flood question detected as weather");
  assert(!isWeatherQuestion("Where is the nearest hospital?"), "hospital question is not weather");
  assert(isTrustedContactQuestion("Who is my trusted contact?"), "trusted contact question detected");
  assert(!isTrustedContactQuestion("Call 112"), "112 is not a trusted-contact question");

  // Route weather comes from the Digital Twin, with source + timestamp
  mockFetch((url) => (url.endsWith("/twin/state") ? { status: 200, body: twinResponse() } : new Error("unexpected " + url)));
  let a = await answerWeather("How will the weather affect my journey?", { activeRoute: ROUTE } as any, BACKEND);
  assert(calls.length === 1 && calls[0].url === `${BACKEND}/twin/state`, "route weather calls backend /twin/state once");
  const sent = JSON.parse(String(calls[0].init?.body));
  assert(sent.route.waypoints.length === 2 && sent.pois[0].lat === 17.4, "real route geometry and POIs are sent");
  assert(a.reply.includes("Open-Meteo") && a.reply.includes("01:00 UTC"), "reply cites source and fetch time");
  assert(a.reply.includes("0.4–3.1 mm/h"), "rainfall range comes from segment data");
  assert(a.reply.includes("up to 40%") && a.reply.includes("+12 min"), "probability and delay come from impacts");
  assert((a.data as any).route_weather_risk === "MODERATE", "structured data carries the twin risk level");

  // Flood focus distinguishes assessed vs not-assessed segments
  a = await answerWeather("Is there flooding risk?", { activeRoute: ROUTE } as any, BACKEND);
  assert(a.reply.includes("1 of 2 assessed segment(s) elevated") && a.reply.includes("1 segment(s) have no significant modelled river"),
    "flood answer separates assessed from not-assessed segments");
  mockFetch(() => ({ status: 200, body: twinResponse({ segments: [{ rain_mm_h: 0, river_level: "NOT_ASSESSED" }] }) }));
  a = await answerWeather("flood?", { activeRoute: ROUTE } as any, BACKEND);
  assert(a.reply.includes("can't be assessed"), "no modelled river -> says it can't be assessed");

  // Provider down -> unavailable, never invented numbers
  mockFetch(() => ({ status: 200, body: twinResponse({ weather: { status: "UNAVAILABLE", reason: "HTTP 503" }, segments: [{ rain_mm_h: null, river_level: "NOT_ASSESSED" }] }) }));
  a = await answerWeather("weather?", { activeRoute: ROUTE } as any, BACKEND);
  assert(a.reply.includes("unavailable right now (HTTP 503)") && !a.reply.includes("mm/h"), "weather outage reported, no rainfall invented");
  mockFetch(() => ({ status: 502, body: {} }));
  a = await answerWeather("weather?", { activeRoute: ROUTE } as any, BACKEND);
  assert(a.reply.includes("couldn't be reached") && (a.data as any).available === false, "backend error -> honest unreachable message");

  // GPS only -> point weather, and says no route impact can be assessed
  mockFetch((url) => (url.includes("/twin/weather?lat=17.4&lng=78.5")
    ? { status: 200, body: { status: "LIVE", source: "Open-Meteo", point: { observed_at: "2026-09-27T06:00", condition: "Slight rain", temperature_c: 24, wind_kmh: 10, precip_rate_mm_h: 2 } } }
    : new Error("unexpected " + url)));
  a = await answerWeather("rain now?", { currentPosition: { latitude: 17.4, longitude: 78.5 } } as any, BACKEND);
  assert(a.reply.includes("Slight rain") && a.reply.includes("No route is planned"), "GPS-only uses point weather and says no route");
  mockFetch(() => ({ status: 200, body: { status: "UNAVAILABLE", reason: "timeout", point: null } }));
  a = await answerWeather("rain now?", { currentPosition: { latitude: 17.4, longitude: 78.5 } } as any, BACKEND);
  assert(a.reply.includes("unavailable right now (timeout)"), "point weather outage reported honestly");

  // Nothing known -> no network call, explains what is needed
  mockFetch(() => new Error("must not be called"));
  a = await answerWeather("weather?", {} as any, BACKEND);
  assert(calls.length === 0 && a.reply.includes("without a planned route or your GPS"), "no route/GPS -> no call, honest reply");

  // Trusted contact: masked phone, cookie forwarded, location not claimed
  mockFetch(() => ({ status: 200, body: [
    { name: "Disabled", phone: "+919000000001", is_enabled: false, is_primary: true },
    { name: "Asha", relation: "Sister", phone: "+919876543210", is_enabled: true, is_primary: false },
  ] }));
  a = await answerTrustedContact("tg_device=abc", BACKEND);
  assert((calls[0].init?.headers as any)?.cookie === "tg_device=abc", "device cookie forwarded to backend");
  assert(a.reply.includes("Asha (Sister)") && !a.reply.includes("9876543210") && a.reply.includes("+9198*****210"), "enabled contact named, phone masked");
  assert(a.reply.includes("doesn't track your contact's location") && (a.data as any).location_known === false, "contact location is never claimed");
  mockFetch(() => ({ status: 200, body: [] }));
  a = await answerTrustedContact(null, BACKEND);
  assert((a.data as any).configured === false && a.reply.includes("don't have a trusted contact"), "no contacts -> says not configured");
  mockFetch(() => new Error("ECONNREFUSED"));
  a = await answerTrustedContact(null, BACKEND);
  assert(a.reply.includes("couldn't reach the contact service"), "contact service down -> honest message");

  // Regression: fabricated journey values removed from pages that feed AI Guardian / escalation text
  const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
  const assist = read("src/app/assist/page.tsx");
  assert(!/safetyScore:\s*89/.test(assist) && !assist.includes("Destination Corridor"), "assist page no longer hardcodes score 89 / fake destination");
  assert(!read("src/app/safety-check/page.tsx").includes('"Current Journey"'), "safety-check no longer sends a placeholder destination");

  console.log(`\nResults: ${testsPassed} passed, ${testsFailed} failed`);
  if (testsFailed > 0) process.exit(1);
})();
