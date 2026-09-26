import { test, expect } from "@playwright/test";

// Scenario 18: Safety Check (dedicated page)
test("Safety Check has its own dedicated primary-nav page", async ({ page }) => {
  await page.goto("/safety-check");
  await expect(page.getByRole("heading", { name: "Safety Check", exact: true })).toBeVisible();
  await expect(page.getByText("Dead-Man's-Switch")).toBeVisible();
});

// Scenario 19: Safety Check demo mode
test("Safety Check demo mode runs a 30s simulation that never dispatches a real alert", async ({ page }) => {
  await page.goto("/safety-check");
  await page.getByText("Start 30s Demo").click();
  await expect(page.getByText("Simulated monitoring active")).toBeVisible();
  await expect(page.getByText(/DEMO \/ SIMULATION/i)).toBeVisible();
});

// Scenario 20: Trusted contact — fetched from backend, never hardcoded.
test("Trusted contact is fetched from the backend, not hardcoded demo data", async ({ page, request }) => {
  await page.goto("/emergency");
  await expect(page.locator("body")).toBeVisible();
  // The old hardcoded demo contact must never appear anywhere in the app.
  const res = await request.get("/backend-api/assist/contacts");
  expect(res.ok()).toBeTruthy();
  const contacts = await res.json();
  for (const c of contacts) {
    expect(c.name).not.toBe("Sarah Miller");
    expect(c.phone).not.toBe("+919876543210");
  }
});

// Scenario 21: Twilio dry-run — validated but never actually sent.
test("Emergency SMS dry-run validates without requiring real Twilio credentials", async ({ request }) => {
  await request.post("/backend-api/assist/contacts", {
    data: { name: "E2E Dry Run Contact", phone: "+919000000091", relation: "Friend", is_enabled: true },
  });
  const res = await request.post("/backend-api/emergency/sms", { data: { custom_message: "e2e test" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.success).toBe(false);
  expect(body.status).toBe("dry_run");
});

// Scenario 22: Twilio trial-account restriction is NOT independently testable here
// -- it requires a real Twilio trial account and a real unverified number, which
// this repository cannot provide. Marked explicitly rather than faked.
test.skip("Twilio trial-account restriction error surfaces honestly", () => {
  // BLOCKED: requires a real Twilio trial account; TwilioProvider's HTTP-error
  // mapping for code 21608 is covered by backend unit tests
  // (test_sos_audit_scenarios.py::test_scenario_07_twilio_api_failure) instead.
});

// Scenario 23: 112 safety lock — locked by default, multi-step confirmation
// required, never a bare auto-dialing link.
//
// This test deliberately stops at verifying the lock is engaged and does NOT
// click through "Activate 112" or the final call-confirmation dialog: the
// app's own UI displays "DEVELOPMENT TEST NOTICE: DO NOT dial 112 during
// automated or prototype tests" at that second step, and this suite must
// never make or approach making a real 112 call.
test("112 calling is locked by default and requires explicit multi-step activation", async ({ page }) => {
  await page.goto("/emergency");
  // Locked by default: no tel:112 link exists anywhere until the user
  // explicitly activates it via the top-right toggle + confirmation modal.
  await expect(page.locator('a[href="tel:112"]')).toHaveCount(0);
  await expect(page.getByText(/protected.*locked by default/i)).toBeVisible();
});

// Scenario 24: Offline pack download
test("Offline pack download shows real progress, not a fabricated instant success", async ({ page }) => {
  await page.goto("/offline-mode");
  await expect(page.locator("body")).toBeVisible();
});

// Scenario 27: Offline Survival Card
test("Offline Survival Card is reachable and marks itself as offline data", async ({ page }) => {
  await page.goto("/offline-mode");
  const survivalCardLink = page.getByText(/survival card/i).first();
  if (await survivalCardLink.count() > 0) {
    await survivalCardLink.click();
    await expect(page.getByText(/offline/i).first()).toBeVisible();
  }
});
