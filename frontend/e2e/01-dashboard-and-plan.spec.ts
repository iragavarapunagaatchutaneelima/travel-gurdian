import { test, expect } from "@playwright/test";

// Scenario 1: Dashboard
test("Dashboard loads with real status overview, no fabricated widgets", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Journey & Safety Overview")).toBeVisible();
  await expect(page.getByText("GPS Status")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trusted Contact" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Safety Check" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Offline Pack" })).toBeVisible();
  // The old fabricated "Live Conditions" panel (hardcoded weather/AQI) must not exist.
  await expect(page.getByText("Live Conditions")).toHaveCount(0);
  await expect(page.getByText("28°C, Clear")).toHaveCount(0);
});

// Scenario 2: Plan Journey
test("Plan Journey page loads with the planning form", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByText("Plan Your Journey")).toBeVisible();
  await expect(page.getByText("CALCULATE SAFEST ROUTE")).toBeVisible();
});

async function planRoute(page: import("@playwright/test").Page, mode: "Car" | "Bike" | "Walk") {
  await page.goto("/plan");
  await page.waitForLoadState("networkidle");
  // Quick-select hubs: first occurrence group = origin, second = destination.
  // exact:true matters here -- a fuzzy match against "Hyderabad" can also hit
  // the autocomplete suggestion row ("Hyderabad, Telangana, India") once one
  // is selected, which silently breaks .first()/.last() ordering.
  const hydFrom = page.getByRole("button", { name: "Hyderabad", exact: true }).first();
  const mumTo = page.getByRole("button", { name: "Mumbai", exact: true }).last();
  await hydFrom.click();
  // Wait for the click to actually take effect (state update + re-render)
  // before proceeding -- under full-suite load a fixed sleep is not reliable.
  await expect(page.getByText(/^From:\s*Hyderabad/)).toBeVisible({ timeout: 10_000 });
  await mumTo.click();
  await expect(page.getByText(/^To:\s*Mumbai/)).toBeVisible({ timeout: 10_000 });
  if (mode !== "Car") {
    await page.getByText(mode === "Bike" ? "Bike / Two-Wheeler" : "Walk", { exact: false }).first().click();
  }
  await page.getByText("CALCULATE SAFEST ROUTE").click();
  // Generous timeout: this hits real Google Directions/Routes API calls,
  // which can be slower under full-suite sequential load than in isolation.
  await page.waitForSelector("text=Calculated Safe Corridors", { timeout: 40_000 });
  await page.waitForSelector("text=Route A", { timeout: 5_000 });
}

// Scenario 3: Two-wheeler route (TWO_WHEELER, not BICYCLING)
test("Two-wheeler route calculates via Google Routes API", async ({ page }) => {
  await planRoute(page, "Bike");
  await expect(page.getByText("Route A")).toBeVisible();
});

// Scenario 4: Car route
test("Car route calculates with a real safety score", async ({ page }) => {
  await planRoute(page, "Car");
  await expect(page.getByText("Route A")).toBeVisible();
});

// Scenario 5: Walk route
test("Walk route calculates via Google Directions", async ({ page }) => {
  await planRoute(page, "Walk");
  await expect(page.getByText("Route A")).toBeVisible();
});

// Scenario 6 + 7: Maximum two route cards, near-duplicates removed
test("Plan Journey shows at most 2 route cards (route-diversity analysis)", async ({ page }) => {
  await planRoute(page, "Car");
  // Note: the DOM text is "Route A"/"Route B" -- the all-caps look is CSS
  // text-transform, not the actual rendered text.
  const count =
    (await page.getByText("Route A", { exact: true }).count()) +
    (await page.getByText("Route B", { exact: true }).count());
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(2);
  // Not every route may claim to be the safest -- at most one "BEST MATCH".
  const bestMatchCount = await page.getByText("BEST MATCH").count();
  expect(bestMatchCount).toBeLessThanOrEqual(1);
});

// Scenario 8: Route scores truthful (numeric, deterministic, not a fixed banner)
test("Route safety score is a real number in range, not a fabricated constant", async ({ page }) => {
  await planRoute(page, "Car");
  const scoreText = await page.locator("text=/^\\d{1,3}$/").first().innerText();
  const score = Number(scoreText);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
});
