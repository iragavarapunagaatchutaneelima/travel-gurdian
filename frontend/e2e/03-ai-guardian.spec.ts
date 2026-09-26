import { test, expect } from "@playwright/test";

// Scenario 16: AI location — grounded in real GPS, never invented.
test("AI Guardian answers 'where am I' from real GPS, honestly if unavailable", async ({ request }) => {
  const res = await request.post("/api/ai", {
    data: { prompt: "Where am I?", context: {} },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.reply.toLowerCase()).toContain("gps");

  const resWithGps = await request.post("/api/ai", {
    data: {
      prompt: "Where am I?",
      context: { currentPosition: { latitude: 17.385, longitude: 78.4867, accuracy: 10, timestamp: Date.now() } },
    },
  });
  const bodyWithGps = await resWithGps.json();
  expect(bodyWithGps.reply).toContain("17.385");
});

// Scenario 17: AI nearby search — real Places data or honest empty, never fabricated.
test("AI Guardian nearby-place search requires real location, never invents a place", async ({ request }) => {
  const res = await request.post("/api/ai", {
    data: { prompt: "find a hospital near me", context: {} },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  // Without GPS, must ask for location rather than name any place.
  expect(body.reply.toLowerCase()).toMatch(/location|permission/);
});

test("AI Guardian route summary is honest when no route is planned", async ({ request }) => {
  const res = await request.post("/api/ai", {
    data: { prompt: "give me the route summary", context: {} },
  });
  const body = await res.json();
  expect(body.reply).not.toContain("null");
  expect(body.reply.toLowerCase()).toContain("no route");
});

test("AI Guardian reports the actual configured Gemini model, not a hardcoded name", async ({ request }) => {
  const res = await request.post("/api/ai", {
    data: { prompt: "hello", context: {} },
  });
  const body = await res.json();
  expect(body.model).toBeTruthy();
  expect(body.model).not.toBe("Gemini 1.5 Flash");
});
