// TESTS: backend base URL resolution.
//
// Regression coverage for a REAL production incident: this resolver used to
// default, on Vercel with no explicit BACKEND_API_URL, to
// `https://${VERCEL_URL}/backend-api` -- the deployment's OWN host. When the
// backend Python function wasn't actually being served there (e.g. the
// project's Root Directory wasn't yet pointed at the repo root), that made
// next.config.ts's /backend-api/* rewrite point AT ITSELF: a genuine
// self-referencing infinite loop, observed live as Vercel's own
// "508 INFINITE_LOOP_DETECTED" on every single page. An automatic same-host
// guess is therefore never safe; these tests lock down that it stays gone.
import { resolveBackendApiUrl, isVercelBuild, LOCALHOST_BACKEND_API_URL } from "../config/backendApiUrl.js";

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

// Real process.env satisfies NodeJS.ProcessEnv's required NODE_ENV field;
// a plain object literal doesn't unless it's included explicitly.
function env(overrides: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return { ...process.env, NODE_ENV: "development", VERCEL: undefined, VERCEL_URL: undefined, BACKEND_API_URL: undefined, ...overrides };
}

console.log("=== BACKEND BASE URL RESOLUTION TESTS ===");

let r = resolveBackendApiUrl(env({}));
assert(r.url === LOCALHOST_BACKEND_API_URL && !r.warning, "Local dev, nothing set: defaults to localhost, no warning");

r = resolveBackendApiUrl(env({ BACKEND_API_URL: "http://127.0.0.1:9000/api" }));
assert(r.url === "http://127.0.0.1:9000/api" && !r.warning, "Local dev, explicit override: used verbatim");

// --- The actual regression: Vercel + no override must NEVER self-reference ---
r = resolveBackendApiUrl(env({ VERCEL: "1", VERCEL_URL: "travel-guardian-abc123.vercel.app" }));
assert(r.url === LOCALHOST_BACKEND_API_URL,
  "Vercel + VERCEL_URL set, no explicit BACKEND_API_URL: NEVER resolves to the same host (the exact 508 loop this fixes)");
assert(!r.url.includes("vercel.app"), "Resolved URL never contains the deployment's own vercel.app hostname when unset");

r = resolveBackendApiUrl(env({ VERCEL: "1" })); // no VERCEL_URL either
assert(r.url === LOCALHOST_BACKEND_API_URL, "Vercel with nothing set at all: still just the plain localhost default");

// --- Explicit BACKEND_API_URL always wins, including a deliberately-set same-host value ---
r = resolveBackendApiUrl(env({ VERCEL: "1", VERCEL_URL: "travel-guardian-abc123.vercel.app", BACKEND_API_URL: "https://api.example.com/api" }));
assert(r.url === "https://api.example.com/api" && !r.warning, "Explicit BACKEND_API_URL always wins over any automatic guess");

r = resolveBackendApiUrl(env({ VERCEL: "1", BACKEND_API_URL: "https://travel-guardian-stable.vercel.app/backend-api/" }));
assert(r.url === "https://travel-guardian-stable.vercel.app/backend-api",
  "A deliberately-configured stable-domain override is honored verbatim (trailing slash stripped)");

// --- isVercelBuild ---
assert(isVercelBuild(env({ VERCEL: "1" })) === true, "isVercelBuild true when VERCEL is set");
assert(isVercelBuild(env({})) === false, "isVercelBuild false otherwise");

console.log(`\n=== TEST SUMMARY: ${testsPassed}/${testsPassed + testsFailed} TESTS PASSED ===\n`);
if (testsFailed > 0) process.exit(1);
