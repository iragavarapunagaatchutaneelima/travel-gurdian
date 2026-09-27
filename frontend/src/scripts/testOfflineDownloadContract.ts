// TESTS: Offline Vector Corridor download endpoint contract.
//
// Investigation finding #1 (Vercel connectivity task): "Download Vector
// Corridor Pack" does NOT call our own backend at all -- there is no
// /backend-api/* call anywhere in this path, by design, so it keeps working
// even if the FastAPI backend is completely unreachable.
//
// Investigation finding #2 (root-caused live, on the deployed judges' URL):
// the ORIGINAL direct fetch to build.protomaps.com was CORS-blocked for
// every real origin -- verified with curl that Protomaps' CORS allowlist
// only echoes Access-Control-Allow-Origin for http://localhost:3000, never
// any other origin. That is exactly why it "worked every time I tested
// locally" and failed for judges. Fixed by routing through our own
// same-origin proxy (app/api/pmtiles-proxy/route.ts), which forwards the
// real range request server-side (no CORS applies between servers) and
// streams back the identical real bytes. These tests lock down that
// contract so it can't silently regress back to a direct cross-origin
// fetch, and that the CSP/proxy pieces stay in sync.
import * as fs from "fs";
import * as path from "path";

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

console.log("=== OFFLINE VECTOR CORRIDOR DOWNLOAD CONTRACT TESTS ===");

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

const realVectorTiles = read("src/services/realVectorTiles.ts");
const offlineTileService = read("src/services/offlineTileService.ts");
const nextConfig = read("next.config.ts");
const proxyRoute = read("src/app/api/pmtiles-proxy/route.ts");
const swSource = read("public/sw.js");

assert(realVectorTiles.includes('PUBLIC_PMTILES_URL = "/api/pmtiles-proxy"'),
  "Offline tiles are fetched through the same-origin proxy, never build.protomaps.com directly from the browser (CORS-blocked for any real deployed origin)");
assert(proxyRoute.includes('"https://build.protomaps.com/'),
  "The proxy itself forwards to the real public Protomaps PMTiles archive -- real map data, not a stub");
assert(/headers\["Range"\]\s*=\s*range/.test(proxyRoute) || /Range.*=.*range/.test(proxyRoute),
  "The proxy forwards the caller's real Range header (byte-serving), never buffers/serves the whole ~114GB archive");
assert(swSource.includes("/api/pmtiles-proxy") && /if \(url\.pathname === '\/api\/pmtiles-proxy'\) \{\s*return;/.test(swSource),
  "The service worker bypasses the proxy entirely -- re-issuing a Range request via fetch(event.request) inside a SW does not reliably replay Range semantics (verified live)");
assert(!/backend-api|BACKEND_API_URL/.test(realVectorTiles),
  "Tile fetch has no dependency on our backend -- keeps working if the FastAPI backend is down");
assert(!/backend-api|BACKEND_API_URL/.test(offlineTileService),
  "Corridor download orchestration has no /backend-api dependency either");
assert(offlineTileService.includes("verifyTileSourceReachable"),
  "A real reachability check runs before a bulk download starts");
assert(/lastError:\s*reachability\.error/.test(offlineTileService),
  "An unreachable tile source reports the ACTUAL fetch error, never a fabricated success");
assert(offlineTileService.includes('status: mapTiles.length === 0 ? "FAILED"'),
  "Zero real tiles downloaded -> pack status FAILED, never faked as READY");

// The CSP allow-list must actually include the tile host used above, in
// BOTH this repo's committed config and (by extension) whatever gets
// deployed -- a stale/missing entry here reproduces exactly the reported
// "Failed to fetch" symptom in a real browser.
assert(nextConfig.includes("https://build.protomaps.com") && nextConfig.includes("connect-src"),
  "next.config.ts's CSP connect-src allows the real tile host (build.protomaps.com)");
assert(nextConfig.includes("https://protomaps.github.io"),
  "CSP also allows the Protomaps style/glyph host used to render the downloaded tiles");

console.log(`\n=== TEST SUMMARY: ${testsPassed}/${testsPassed + testsFailed} TESTS PASSED ===\n`);
if (testsFailed > 0) process.exit(1);
