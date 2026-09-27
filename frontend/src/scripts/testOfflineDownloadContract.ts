// TESTS: Offline Vector Corridor download endpoint contract.
//
// Investigation finding (Vercel connectivity task): "Download Vector
// Corridor Pack" does NOT call our backend at all. It fetches real MVT
// tiles directly from the public Protomaps PMTiles archive
// (services/realVectorTiles.ts) via the browser -- there is no
// /backend-api/* call anywhere in this path, by design, so it keeps
// working even if the FastAPI backend is completely unreachable. The
// reported production "Download failed: Failed to fetch" is therefore NOT
// a /backend-api/BACKEND_API_URL routing problem; it is the browser failing
// to reach build.protomaps.com, most likely because a stale Vercel
// deployment predates this CSP connect-src entry. These tests lock down the
// actual contract so a future change can't silently reintroduce a fake/
// local stub, and so the CSP allow-list can't silently regress.
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

assert(realVectorTiles.includes('"https://build.protomaps.com/'),
  "Offline tiles are fetched from the real public Protomaps PMTiles archive");
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
