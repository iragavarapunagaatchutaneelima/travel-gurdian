import { test, expect } from "@playwright/test";

// "Offline Maps" navigation + dark theme completion. Covers:
//  - Offline Maps sits beside Live Maps in primary nav, in the required order
//  - a pack already in IndexedDB (the real download's storage) is discovered
//    on /offline immediately -- no restart, no special sync step needed
//  - the Offline Maps page and its pack cards actually change color in dark
//    mode (they were 100% hardcoded light hex before this fix)
//  - theme persists across a reload
//  - mobile bottom nav gains "Offline" with no horizontal overflow

async function seedPack(page: import("@playwright/test").Page, id: string, name: string) {
  await page.evaluate(({ id, name }) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open("TravelGuardianOfflineDB", 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("offline_corridor_packs")) db.createObjectStore("offline_corridor_packs", { keyPath: "packId" });
      if (!db.objectStoreNames.contains("offline_map_tiles")) db.createObjectStore("offline_map_tiles", { keyPath: "id" });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("offline_corridor_packs", "readwrite");
      tx.objectStore("offline_corridor_packs").put({
        packId: id, packName: name, schemaVersion: "1.0.0", version: 1,
        origin: { id: "a", name: "SeedOrigin", state: "", latitude: 17.4, longitude: 78.5, region: "", highways: [] },
        destination: { id: "b", name: "SeedDest", state: "", latitude: 19.0, longitude: 72.9, region: "", highways: [] },
        travelMode: "Car",
        route: { id: "r1", name: "E2E Corridor", distance: "10 km", time: "10 min", safetyScore: 90, waypoints: [[78.5, 17.4], [72.9, 19.0]], pois: [] },
        turnInstructions: [], safeHavens: [],
        emergencyInfo: { nationalEmergencyNumber: "112", womenHelpline: "1091", ambulanceNumber: "108", sourceCachedAt: Date.now(), disclaimer: "x" },
        createdAt: Date.now(), updatedAt: Date.now(), approxSizeKb: 100,
        provenance: "CACHED", mapPack: { tileCount: 0, totalSizeBytes: 0, bounds: { minLng: 0, minLat: 0, maxLng: 0, maxLat: 0, lateralPaddingKm: 8, minZoom: 10, maxZoom: 13 }, zoomRange: [10, 13], status: "READY" },
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }), { id, name });
}

test("Offline Maps sits beside Live Maps and matches the required primary nav order", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  const navText = await page.locator("nav").first().innerText();
  const order = navText.split("\n").map((s) => s.trim()).filter(Boolean);
  expect(order).toEqual(["Plan Journey", "Live Map", "Offline Maps", "AI Guardian", "Safety Check", "Emergency"]);
});

test("Offline Maps discovers a stored pack immediately, no restart required", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await seedPack(page, "pack_e2e_sync", "SeedOrigin ➔ SeedDest (E2E Corridor)");
  await page.goto("/offline", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const text = await page.locator("body").innerText();
  expect(text).toContain("SeedOrigin");
  expect(text).toContain("E2E Corridor");
});

test("Offline Maps page is theme-aware: dark mode changes real card colors, persists on reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await seedPack(page, "pack_e2e_theme", "SeedOrigin ➔ SeedDest (E2E Corridor)");
  await page.goto("/offline", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const cardBg = async () =>
    page.locator("text=SeedOrigin").first().evaluate((el) => {
      let n: HTMLElement | null = el as HTMLElement;
      for (let i = 0; i < 5 && n; i++) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)") return bg;
        n = n.parentElement;
      }
      return null;
    });

  const lightBg = await cardBg();
  expect(lightBg).toBe("rgb(255, 255, 255)"); // --tg-surface light

  const themeBtn = page.getByRole("button", { name: /dark mode|light mode/i }).first();
  await themeBtn.click();
  await page.waitForTimeout(300);
  const darkBg = await cardBg();
  expect(darkBg).toBe("rgb(17, 24, 39)"); // --tg-surface dark -- was hardcoded #FFFFFF before this fix
  expect(darkBg).not.toBe(lightBg);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const htmlClass = await page.evaluate(() => document.documentElement.className);
  expect(htmlClass).toContain("dark");

  expect(errors.filter((e) => /Maximum update depth|Hydration failed|TypeError|ReferenceError/i.test(e))).toHaveLength(0);
});

test("Mobile bottom nav includes Offline with no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/offline", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await expect(page.locator('nav[aria-label="Mobile Bottom Navigation"]').getByText("Offline", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(overflow).toBe(false);
});
