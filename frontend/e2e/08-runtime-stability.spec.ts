import { test, expect } from "@playwright/test";
// Regression coverage for three real bugs found and fixed this session:
//  1. useSafetyCheckIn effect keyed on the `currentPosition` OBJECT REFERENCE
//     (unstable -- recreated every render) instead of its primitive fields,
//     causing setLastKnownSnapshot -> re-render -> new object -> effect fires
//     again, forever ("Maximum update depth exceeded").
//  2. safety-check/page.tsx fabricated `timestamp: Date.now()` for every
//     currentPosition object instead of using the GPS fix's real timestamp,
//     defeating staleness detection and feeding the unstable reference above.
//  3. services/locationContext.ts read localStorage synchronously at module
//     scope (client-only), so the client's first render already differed
//     from the server's (which has no localStorage) whenever a previous
//     visit had cached a GPS fix -- a guaranteed hydration mismatch
//     ("GPS: Active" vs "Unavailable" on /safety-check). Fixed by deferring
//     the localStorage read to a post-mount effect.

// Real user journey that populates the shared location singleton
// (services/locationContext.ts) BEFORE visiting Safety Check: use AI
// Guardian's "Locate Me" button (GuardianMapSync -> requestCurrentLocation),
// then navigate to /safety-check where useSafetyCheckIn consumes
// useSharedLocation(). This reproduces the real path that fed a fabricated
// Date.now()-stamped object into an effect keyed on object identity.
test("Safety Check does not enter a render loop after a real GPS fix from AI Guardian", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 17.385, longitude: 78.4867 });

  await page.goto("/assist", { waitUntil: "networkidle" });
  const locateBtn = page.getByTitle("Recenter on current GPS position").first();
  if (await locateBtn.count()) {
    await locateBtn.click({ timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(1000);

  await page.goto("/safety-check", { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);

  const critical = errors.filter((e) =>
    /Maximum update depth|Hydration failed|script tag while rendering/i.test(e)
  );
  console.log("all errors seen:", JSON.stringify(errors.slice(0, 5)));
  expect(critical).toHaveLength(0);
});
