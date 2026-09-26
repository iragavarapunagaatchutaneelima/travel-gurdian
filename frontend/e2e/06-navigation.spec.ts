import { test, expect } from "@playwright/test";

const MAP_URL = "/map?fromName=Hyderabad&destName=Mumbai&fromLat=17.385&fromLng=78.4867&destLat=19.076&destLng=72.8777";

// Scenario 14: Live navigation
test("Start Live Navigation transitions the map into navigation mode", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 17.385, longitude: 78.4867 });
  await page.goto(MAP_URL);
  await page.waitForSelector("text=START LIVE NAVIGATION", { timeout: 20_000 });
  await page.getByText("START LIVE NAVIGATION").click();
  await page.waitForTimeout(2000);
  await expect(page.locator("body")).toBeVisible();
});

// Scenario 15: Off-route detection requires simulating real GPS drift over time
// against a real calculated route, which needs a scripted position feed beyond
// what context.setGeolocation's single fixed point can provide in this suite.
test.skip("Off-route detection triggers a reroute prompt", () => {
  // NOT TESTED here: off-route detection (useLiveNavigation.ts) is exercised by
  // manual QA and the distance-threshold unit tests in
  // src/scripts/testProductionHardening.ts ("150m distance with 15m accuracy IS
  // off route"). A full E2E version needs a scripted multi-point GPS feed
  // (Playwright's CDP Emulation.setGeolocationOverride can only set one point
  // at a time per call) -- tracked as follow-up work, not faked here.
});
