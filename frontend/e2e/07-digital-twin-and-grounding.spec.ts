import { test, expect, type APIRequestContext } from "@playwright/test";

// Midnight Task 1 (Digital Twin) + AI Guardian grounding. These hit the real
// keyless providers (Open-Meteo, GloFAS, GDACS) through the backend, so each
// assertion accepts either real data WITH a source, or an explicit
// "unavailable" -- never a bare number with no provenance.

const MAP_URL = "/map?fromName=Hyderabad&destName=Mumbai&fromLat=17.385&fromLng=78.4867&destLat=19.076&destLng=72.8777";
const ROUTE = {
  name: "E2E corridor",
  distanceKm: 705,
  durationMinutes: 810,
  safetyScore: 90,
  waypoints: [[78.4867, 17.385], [76.3, 17.66], [74.9, 18.2], [72.8777, 19.076]],
  pois: [],
};
const ALLOWED_WEATHER = /Open-Meteo|unavailable|couldn't be reached/i;

// /api/ai is rate limited (20/min/IP); a 429 here means the suite was run
// too many times in a minute, so fail with that message rather than a
// confusing "reply is undefined".
async function ask(request: APIRequestContext, prompt: string, context: object = {}) {
  const res = await request.post("/api/ai", { data: { prompt, context } });
  expect(res.status(), "/api/ai status (429 = rate limit hit by repeated runs)").toBe(200);
  return res.json();
}

// Scenario 33: AI weather answer -- grounded or honest, never guessed
test("AI Guardian weather answer is grounded in the Digital Twin or says it can't check", async ({ request }) => {
  const none = await ask(request, "Will it rain on my trip?");
  expect(none.model).toBe("guardian-grounded-tools");
  expect(none.reply).toContain("without a planned route or your GPS");

  const gps = await ask(request, "What's the weather here?", {
    currentPosition: { latitude: 17.385, longitude: 78.4867, accuracy: 10, timestamp: Date.now() },
  });
  expect(gps.reply).toMatch(ALLOWED_WEATHER);
  if (/Open-Meteo/.test(gps.reply)) expect(gps.reply).toContain("No route is planned");

  const route = await ask(request, "How will the weather affect my journey?", { activeRoute: ROUTE });
  expect(route.reply).toMatch(ALLOWED_WEATHER);
  if (/Open-Meteo/.test(route.reply)) {
    expect(route.reply).toMatch(/fetched \d{2}:\d{2} UTC/);
    expect(route.reply).toMatch(/Route weather risk: (LOW|MODERATE|HIGH|UNKNOWN)/);
  }
});

// Scenario 34: AI flood answer never presented as an official warning
test("AI Guardian flood answer is a relative signal, not an official warning", async ({ request }) => {
  const res = await ask(request, "Is there any flooding risk on my route?", { activeRoute: ROUTE });
  expect(res.reply).toMatch(/River levels|River data is unavailable|couldn't be reached/);
  if (/River levels \(GloFAS\)/.test(res.reply)) expect(res.reply).toContain("not an official flood warning");
});

// Scenario 35: trusted contact -- from backend, masked, location never claimed
test("AI Guardian trusted-contact answer comes from the backend and never claims a location", async ({ request }) => {
  const res = await ask(request, "Who is my trusted contact?");
  expect(res.reply).toMatch(/trusted contact/i);
  expect(res.reply).not.toMatch(/\+?\d{10,}/); // phone always masked
  if (/primary trusted contact is/.test(res.reply)) expect(res.reply).toContain("doesn't track your contact's location");
});

// Scenario 36: twin API guards
test("Digital Twin API rejects out-of-range and chained simulations", async ({ request }) => {
  expect((await request.get("/backend-api/twin/weather?lat=95&lng=78")).status()).toBe(422);
  const stateRes = await request.post("/backend-api/twin/state", { data: { route: { name: "e2e", duration_min: 810, waypoints: ROUTE.waypoints } } });
  expect(stateRes.ok()).toBeTruthy();
  const { state } = await stateRes.json();
  expect(state.mode).toBe("LIVE");
  expect(["LIVE", "CACHED", "UNAVAILABLE"]).toContain(state.weather.status);
  if (state.weather.status === "UNAVAILABLE") expect(state.weather.reason).toBeTruthy();
  expect(state.signals.social_media ?? "").toContain("NOT_INTEGRATED");

  expect((await request.post("/backend-api/twin/simulate", { data: { state, rainfall_mm_h: 500 } })).status()).toBe(400);
  const sim = await (await request.post("/backend-api/twin/simulate", { data: { state, rainfall_mm_h: 70 } })).json();
  expect(sim.state.mode).toBe("SIMULATED");
  expect(sim.impacts.route_weather_risk).toBe("HIGH");
  expect(sim.impacts.travel_impact.estimated_extra_min).toBeNull(); // violent rain: not quantified
  expect(sim.live_impacts.mode).toBe("LIVE");
  expect((await request.post("/backend-api/twin/simulate", { data: { state: sim.state, rainfall_mm_h: 5 } })).status()).toBe(400);
});

// Scenario 37: Digital Twin panel on Live Map + what-if isolation
test("Digital Twin panel shows sourced live state and a what-if that triggers no emergency traffic", async ({ page }) => {
  test.setTimeout(120_000);
  const emergencyCalls: string[] = [];
  page.on("request", (r) => {
    if (/\/emergency\/|\/assist\/sos|\/checkin\/(confirm|check-overdue)/.test(r.url())) emergencyCalls.push(r.url());
  });

  await page.goto(MAP_URL);
  const toggle = page.getByRole("button", { name: "Open Digital Twin" });
  await expect(toggle).toBeVisible({ timeout: 45_000 });
  await toggle.click();

  const panel = page.getByRole("dialog", { name: "Digital Twin" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/Open-Meteo|Digital Twin: /).first()).toBeVisible({ timeout: 45_000 });
  await expect(panel.getByText("How the weather propagates")).toBeVisible();

  await panel.getByLabel("Simulated rainfall in millimetres per hour").fill("70");
  await panel.getByRole("button", { name: "Run simulation" }).click();
  await expect(panel.getByText(/Simulated: 70 mm\/h on every segment/)).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByText(/beyond the FHWA study range/)).toBeVisible();

  await panel.getByRole("button", { name: "Live" }).click();
  await expect(panel.getByText(/Simulated: 70 mm\/h/)).toHaveCount(0);
  expect(emergencyCalls).toEqual([]);
});

// Scenario 38: selected journey is shared with AI Guardian / My Journeys
test("Live Map publishes the selected real journey; My Journeys shows it instead of invented trips", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(MAP_URL);
  await expect(page.getByRole("button", { name: "Open Digital Twin" })).toBeVisible({ timeout: 45_000 });
  const journey = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tg_active_journey") || "null"));
  expect(journey?.destinationName).toBe("Mumbai");
  expect(journey?.route?.waypoints?.length).toBeGreaterThan(2);

  await page.goto("/history");
  await expect(page.getByText("Current journey", { exact: true })).toBeVisible();
  await expect(page.getByText(/Hyderabad → Mumbai/)).toBeVisible();
  await expect(page.getByText(`Safety Fit ${journey.route.safetyScore}/100`, { exact: false })).toBeVisible();
});
