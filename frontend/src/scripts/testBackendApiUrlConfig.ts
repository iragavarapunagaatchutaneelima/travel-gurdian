// TESTS: backend base URL resolution (single-Vercel-project architecture).
//
// The FastAPI backend is deployed as a Vercel Python Function in the SAME
// Vercel project (backend/index.py, /vercel.json). /backend-api/* is served
// directly by that function via vercel.json's top-level `routes` -- the
// browser needs no configuration in production at all. The one thing that
// DOES need resolving is server-to-server calls from Next.js Route Handlers,
// which use VERCEL_URL (the deployment's own hostname, set automatically by
// Vercel) to reach that same backend Function with zero required env var.
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

// --- Local dev: unchanged, no env var required ---
let r = resolveBackendApiUrl(env({}));
assert(r.url === LOCALHOST_BACKEND_API_URL && !r.warning, "Local dev, nothing set: defaults to localhost, no warning");

r = resolveBackendApiUrl(env({ BACKEND_API_URL: "http://127.0.0.1:9000/api" }));
assert(r.url === "http://127.0.0.1:9000/api" && !r.warning, "Local dev, explicit override: used verbatim");

// --- Vercel: resolves to the SAME deployment via VERCEL_URL, no env var needed ---
r = resolveBackendApiUrl(env({ VERCEL: "1", VERCEL_URL: "travel-guardian-abc123.vercel.app" }));
assert(r.url === "https://travel-guardian-abc123.vercel.app/backend-api" && !r.warning,
  "Vercel + VERCEL_URL, no BACKEND_API_URL override: resolves to the same deployment's own /backend-api, no warning");

r = resolveBackendApiUrl(env({ VERCEL: "1", VERCEL_URL: "travel-guardian-preview-xyz.vercel.app" }));
assert(r.url.includes("travel-guardian-preview-xyz.vercel.app"), "Works for a Preview deployment's own VERCEL_URL too");

// --- Explicit BACKEND_API_URL always wins, even on Vercel (e.g. a separate host) ---
r = resolveBackendApiUrl(env({ VERCEL: "1", VERCEL_URL: "travel-guardian-abc123.vercel.app", BACKEND_API_URL: "https://api.example.com/api" }));
assert(r.url === "https://api.example.com/api" && !r.warning, "Explicit BACKEND_API_URL overrides VERCEL_URL-based resolution");

r = resolveBackendApiUrl(env({ VERCEL: "1", VERCEL_URL: "x.vercel.app", BACKEND_API_URL: "https://api.example.com/api/" }));
assert(r.url === "https://api.example.com/api", "Trailing slash is stripped from an explicit override too");

// --- Defensive edge case: Vercel but VERCEL_URL somehow missing (shouldn't happen) ---
r = resolveBackendApiUrl(env({ VERCEL: "1" }));
assert(!!r.warning, "Vercel with no VERCEL_URL and no override -> warns (defensive; VERCEL_URL is always set in practice)");

// --- isVercelBuild ---
assert(isVercelBuild(env({ VERCEL: "1" })) === true, "isVercelBuild true when VERCEL is set");
assert(isVercelBuild(env({})) === false, "isVercelBuild false otherwise");

console.log(`\n=== TEST SUMMARY: ${testsPassed}/${testsPassed + testsFailed} TESTS PASSED ===\n`);
if (testsFailed > 0) process.exit(1);
