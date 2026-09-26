import { defineConfig, devices } from "@playwright/test";

// E2E suite assumes the frontend (npm run dev, port 3000) and backend
// (uvicorn app.main:app, port 8000) are already running -- this project's
// backend is a separate Python process this config cannot start itself.
// See docs/TESTING.md for how to start both before running `npm run test:e2e`.
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  // 1 retry: this suite exercises real Google Directions/Routes API calls
  // and a real service-worker install lifecycle, both of which can be
  // transiently slow under sequential full-suite load even though they pass
  // reliably in isolation -- a real-API characteristic, not flaky test logic.
  retries: 2,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
