// TESTS: BACKEND_API_URL resolution (Vercel production connectivity fix).
//
// Root cause under test: BACKEND_API_URL silently fell back to
// http://127.0.0.1:8000/api whenever unset, including inside a Vercel
// production build -- which bakes that literal localhost destination into
// the deployed /backend-api/* rewrite manifest at build time, producing
// "Digital Twin: HTTP 404" and similar failures with no diagnostic. These
// tests cover: the rewrite/serverEnv resolver's behavior across dev/Vercel/
// self-hosted-production, and that no localhost URL is ever silently
// accepted for a real deployment.
import { resolveBackendApiUrl, isVercelBuild, isProductionDeployment, LOCALHOST_BACKEND_API_URL } from "../config/backendApiUrl.js";

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
// a plain object literal in a test doesn't unless it's included explicitly.
// Defaults to "development" (plain local dev) unless overridden.
function env(overrides: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return { ...process.env, NODE_ENV: "development", VERCEL: undefined, BACKEND_API_URL: undefined, ...overrides };
}

console.log("=== BACKEND_API_URL CONFIGURATION TESTS ===");

// --- Local dev: unchanged behavior, no message ---
let r = resolveBackendApiUrl(env({ BACKEND_API_URL: LOCALHOST_BACKEND_API_URL }));
assert(r.url === LOCALHOST_BACKEND_API_URL && !r.fatalMisconfiguration && !r.warning,
  "Local dev with an explicit localhost BACKEND_API_URL: no warning, no throw (unchanged behavior)");

r = resolveBackendApiUrl(env({}));
assert(r.url === LOCALHOST_BACKEND_API_URL && !r.fatalMisconfiguration && !r.warning,
  "Local dev with BACKEND_API_URL unset: silently defaults to localhost, no message");

r = resolveBackendApiUrl(env({ NODE_ENV: "development", BACKEND_API_URL: LOCALHOST_BACKEND_API_URL }));
assert(!r.fatalMisconfiguration && !r.warning, "NODE_ENV=development is never treated as a deployment");

// --- Vercel: the actual bug this fixes -- must be FATAL, not a silent 404 ---
r = resolveBackendApiUrl(env({ VERCEL: "1" }));
assert(!!r.fatalMisconfiguration, "Vercel + unset BACKEND_API_URL -> fatal (this is the exact prod bug)");
assert(r.url === LOCALHOST_BACKEND_API_URL, "...but still reports what it would have used, for the error message");

r = resolveBackendApiUrl(env({ VERCEL: "1", BACKEND_API_URL: "http://127.0.0.1:8000/api" }));
assert(!!r.fatalMisconfiguration, "Vercel + explicit localhost BACKEND_API_URL -> still fatal");

r = resolveBackendApiUrl(env({ VERCEL: "1", BACKEND_API_URL: "http://localhost:8000/api" }));
assert(!!r.fatalMisconfiguration, "Vercel + 'localhost' hostname (not just 127.0.0.1) -> fatal");

r = resolveBackendApiUrl(env({ VERCEL: "1", BACKEND_API_URL: "https://travel-guardian-api.example.com/api" }));
assert(!r.fatalMisconfiguration && !r.warning && r.url === "https://travel-guardian-api.example.com/api",
  "Vercel + a real backend host -> resolves cleanly, no message");

r = resolveBackendApiUrl(env({ VERCEL: "1", BACKEND_API_URL: "https://travel-guardian-api.example.com/api/" }));
assert(r.url === "https://travel-guardian-api.example.com/api", "Trailing slash is stripped from the resolved URL");

// --- Self-hosted production (NODE_ENV=production, no VERCEL): warn, don't break the build ---
r = resolveBackendApiUrl(env({ NODE_ENV: "production" }));
assert(!r.fatalMisconfiguration && !!r.warning,
  "Self-hosted NODE_ENV=production + unset BACKEND_API_URL -> warns, does not throw (doesn't break `next build` locally)");

// --- isVercelBuild / isProductionDeployment predicates ---
assert(isVercelBuild(env({ VERCEL: "1" })) === true, "isVercelBuild true when VERCEL is set");
assert(isVercelBuild(env({})) === false, "isVercelBuild false otherwise");
assert(isProductionDeployment(env({ NODE_ENV: "production" })) === true, "isProductionDeployment true for NODE_ENV=production");
assert(isProductionDeployment(env({ VERCEL: "1", NODE_ENV: "development" })) === true, "isProductionDeployment true for any Vercel env, even a 'development' Vercel target");
assert(isProductionDeployment(env({ NODE_ENV: "development" })) === false, "isProductionDeployment false for plain local dev");

console.log(`\n=== TEST SUMMARY: ${testsPassed}/${testsPassed + testsFailed} TESTS PASSED ===\n`);
if (testsFailed > 0) process.exit(1);
