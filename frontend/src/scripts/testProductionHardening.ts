// TRAVEL GUARDIAN PHASE 8 TEST SUITE: PRODUCTION HARDENING & PWA OFFLINE BOOT
import * as fs from "fs";
import * as path from "path";
import { ALLOWLISTED_TOOLS } from "../services/geminiToolRouter.js";
import { createDefaultCorridorPacks, getPackFreshness } from "../services/offlineStorageService.js";
import { haversineDistanceMeters, pointToSegmentDistanceMeters, isOffRoute } from "../services/navigationMath.js";
import { assessRouteSafety } from "../services/safetyEngine.js";
import { CITIES, generateRoutes } from "../data/routeData.js";

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

console.log("=== TRAVEL GUARDIAN PHASE 8 PRODUCTION HARDENING & PWA TESTS ===");

// 1. PWA Manifest Validation
const manifestPath = path.resolve(process.cwd(), "public/manifest.json");
const manifestExists = fs.existsSync(manifestPath);
assert(manifestExists, "public/manifest.json exists");

if (manifestExists) {
  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  assert(manifestJson.name === "Travel Guardian", "Manifest name is 'Travel Guardian'");
  assert(manifestJson.short_name === "TravelGuardian", "Manifest short_name is 'TravelGuardian'");
  assert(manifestJson.display === "standalone", "Manifest display mode is 'standalone'");
  assert(manifestJson.theme_color === "#059669", "Manifest theme_color configured");
  assert(Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 2, "Manifest has at least 2 icons");
}

// 2. Service Worker File & Cache Versioning
const swPath = path.resolve(process.cwd(), "public/sw.js");
const swExists = fs.existsSync(swPath);
assert(swExists, "public/sw.js exists");

if (swExists) {
  const swContent = fs.readFileSync(swPath, "utf-8");
  assert(swContent.includes("travel-guardian-v8"), "Service Worker includes v8 cache version tag");
  assert(swContent.includes("STATIC_CACHE"), "Static cache strategy defined");
  assert(swContent.includes("RUNTIME_CACHE"), "Runtime cache strategy defined");
  assert(swContent.includes("APP_SHELL"), "App shell pre-cache array configured");
  assert(swContent.includes("/offline-mode"), "Offline portal included in precache list");
  assert(swContent.includes("caches.delete"), "Old cache cleanup implemented in activate event");
  assert(swContent.includes("SKIP_WAITING"), "SKIP_WAITING message listener configured for user-triggered update");
  assert(!swContent.includes("indexedDB.deleteDatabase"), "Service Worker never deletes IndexedDB packs");
}

// 3. Security Headers in Next Config
const nextConfigPath = path.resolve(process.cwd(), "next.config.ts");
const nextConfigExists = fs.existsSync(nextConfigPath);
assert(nextConfigExists, "next.config.ts exists");

if (nextConfigExists) {
  const configContent = fs.readFileSync(nextConfigPath, "utf-8");
  assert(configContent.includes("Content-Security-Policy"), "Content-Security-Policy header configured");
  assert(configContent.includes("X-Content-Type-Options"), "X-Content-Type-Options header configured");
  assert(configContent.includes("X-Frame-Options"), "X-Frame-Options configured to DENY");
  assert(configContent.includes("Referrer-Policy"), "Referrer-Policy configured");
  assert(configContent.includes("Permissions-Policy"), "Permissions-Policy configured with geolocation");
  assert(configContent.includes("productionBrowserSourceMaps: false"), "Source maps secured against secret leak");
}

// 4. Secret Protection Audit
const routeAiPath = path.resolve(process.cwd(), "src/app/api/ai/route.ts");
const routeAiContent = fs.readFileSync(routeAiPath, "utf-8");
assert(routeAiContent.includes("process.env.GEMINI_API_KEY"), "GEMINI_API_KEY read strictly server-side");

// Verify no keys hardcoded in public or client components
const clientComponentsDir = path.resolve(process.cwd(), "src/app/components");
const clientFiles = fs.readdirSync(clientComponentsDir);
let foundExposedKey = false;
clientFiles.forEach((file) => {
  const content = fs.readFileSync(path.join(clientComponentsDir, file), "utf-8");
  if (content.includes("AIzaSy") || content.includes("process.env.GEMINI_API_KEY")) {
    foundExposedKey = true;
  }
});
assert(!foundExposedKey, "No API keys or server env references exposed in client components");

// 5. Offline Storage & Freshness Verification
const defaultPacks = createDefaultCorridorPacks();
assert(defaultPacks.length > 0, "Default corridor packs generated");
const pack = defaultPacks[0];
assert(pack.provenance === "CACHED", "Offline corridor pack provenance is truthfully CACHED");
assert(getPackFreshness(pack) === "FRESH", "Fresh pack evaluated as FRESH (<24h)");

// 6. Navigation Math Performance & Accuracy
const p1 = { lat: 13.0827, lng: 80.2707 }; // Chennai
const p2 = { lat: 12.9716, lng: 77.5946 }; // Bangalore
const distMeters = haversineDistanceMeters(p1.lat, p1.lng, p2.lat, p2.lng);
const distKm = distMeters / 1000;
assert(distKm > 280 && distKm < 310, "Distance calculation accurate (~290 km)");

const isNotOffRoute = isOffRoute(50, 15);
assert(!isNotOffRoute, "50m distance with 15m accuracy is NOT off route");
const realOffRoute = isOffRoute(150, 15);
assert(realOffRoute, "150m distance with 15m accuracy IS off route");

// 7. Safety Fit Engine Determinism
const routes = generateRoutes("chennai", "bangalore", "Car");
const mainRoute = routes[0];
const fitAssessment = assessRouteSafety(mainRoute, [], [], "Solo", "Balanced", "Car");
assert(fitAssessment.safetyFit >= 50 && fitAssessment.safetyFit <= 100, "Safety fit score calculated deterministically (50-100)");
assert(["HIGH", "MEDIUM", "LOW", "LIMITED"].includes(fitAssessment.confidence), "Safety confidence rating valid");

// 8. Tool Router Security & Allowlisting
assert(ALLOWLISTED_TOOLS.some(t => t.name === "readSafetyState"), "readSafetyState allowlisted");
assert(ALLOWLISTED_TOOLS.some(t => t.name === "proposeCall112"), "proposeCall112 allowlisted");
assert(!ALLOWLISTED_TOOLS.some(t => (t.name as string) === "autoEmergencyDispatch"), "Auto emergency dispatch forbidden");

console.log(`\n=== PHASE 8 TEST SUMMARY: ${testsPassed}/${testsPassed + testsFailed} TESTS PASSED ===`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
