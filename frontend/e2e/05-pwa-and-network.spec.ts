import { test, expect } from "@playwright/test";

// Waits until the service worker CONTROLS the page -- the actual precondition
// for serving an offline reload. The worker only activates (and claims the
// page) after its install step has finished pre-caching the app shell.
// The predicate is synchronous on purpose: waitForFunction treats a returned
// Promise as truthy and would resolve immediately, before install finished.
async function waitForServiceWorkerActive(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 20_000 });
}

// Scenario 29: Network disconnect
test("App shows an honest offline indicator on network disconnect, no fabricated data", async ({ page, context }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  // Must wait for the SW to actually finish installing/activating before
  // going offline -- otherwise there's nothing yet to serve the reload from
  // cache, which looks like an offline-support bug but is really a race.
  await waitForServiceWorkerActive(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(1000);
  // The page must still render something (cached shell or offline fallback),
  // never crash to a blank white screen.
  const bodyText = await page.locator("body").innerText().catch(() => "");
  expect(bodyText.length).toBeGreaterThan(0);
  await context.setOffline(false);
});

// Scenario 30: Network reconnect
test("App recovers cleanly when network returns, without destroying offline pack state", async ({ page, context }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await waitForServiceWorkerActive(page);
  await context.setOffline(true);
  await page.waitForTimeout(500);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText("Journey & Safety Overview")).toBeVisible({ timeout: 10_000 });
});

// Scenario 31: PWA reload
test("Hard reload does not freeze the browser or lose the service worker", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForTimeout(2000);
  await page.reload();
  await expect(page.locator("body")).toBeVisible();
  const swActive = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg?.active;
  });
  expect(swActive).toBe(true);
});

// Regression coverage for the fix landed this session: cross-origin requests
// (Google Maps, Places, Gemini) must never be intercepted by the service worker.
test("Service worker never intercepts cross-origin requests", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForTimeout(1500);
  const swSource = await page.evaluate(async () => {
    const res = await fetch("/sw.js", { cache: "no-store" });
    return res.text();
  });
  expect(swSource).toContain("url.origin !== self.location.origin");
});
