#!/usr/bin/env node
/**
 * Secret-exposure check: fetches real pages from a running frontend, follows
 * every same-origin <script src> and stylesheet they reference, and searches
 * the delivered HTML/JS/CSS for the ACTUAL values of server-only secrets
 * read from /.env.local (and the legacy env files).
 *
 * Prints only variable names and FOUND / not found -- never a value.
 *
 * Usage: node scripts/check-secret-exposure.mjs [baseUrl]   (default http://localhost:3000)
 * Exit code 1 if any secret value is found in client-delivered content.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

const SERVER_ONLY = [
  "GEMINI_API_KEY", "GOOGLE_ROUTES_API_KEY", "NUGEN_API_KEY",
  "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "DATABASE_URL", "SECRET_KEY",
];
const PAGES = ["/", "/dashboard", "/plan", "/map", "/assist", "/emergency", "/safety-check", "/offline", "/offline-mode", "/guide", "/history", "/settings"];

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].replace(/^["']|["']$/g, "");
    if (v) out[m[1]] = v;
  }
  return out;
}

const env = {
  ...parseEnv(path.join(root, "backend", ".env")),
  ...parseEnv(path.join(root, "frontend", ".env.local")),
  ...parseEnv(path.join(root, ".env.local")),
};
const secrets = SERVER_ONLY
  .filter((k) => env[k] && env[k].length >= 8 && !/^your_|^</.test(env[k]))
  .map((k) => [k, env[k]]);

if (secrets.length === 0) {
  console.log("No server-only secrets are configured locally; nothing to check.");
  process.exit(0);
}

const seen = new Set();
const bodies = [];
async function grab(url) {
  if (seen.has(url)) return null;
  seen.add(url);
  try {
    const res = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    bodies.push([url, text]);
    return text;
  } catch (e) {
    console.warn(`  could not fetch ${url}: ${e.message}`);
    return null;
  }
}

for (const p of PAGES) {
  const html = await grab(base + p);
  if (!html) continue;
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css|mjs)[^"]*)"/g)].map((m) => m[1]);
  for (const r of refs) await grab(base + r.replace(/&amp;/g, "&"));
}
// Service worker and MapLibre worker are delivered to the browser too.
for (const p of ["/sw.js", "/maplibre-gl-worker.mjs", "/manifest.json"]) await grab(base + p);

console.log(`Checked ${bodies.length} client-delivered resources from ${base} for ${secrets.length} server-only secret(s).`);
let leaks = 0;
for (const [name, value] of secrets) {
  const hit = bodies.find(([, text]) => text.includes(value));
  if (hit) {
    leaks++;
    console.log(`  ${name.padEnd(24)} FOUND in ${hit[0].replace(base, "")}`);
  } else {
    console.log(`  ${name.padEnd(24)} not found`);
  }
}
// Control: the public Maps key is SUPPOSED to be in client code. If the scan
// can't see it, the scan didn't reach the client bundles and "not found"
// above would mean nothing.
const publicKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (publicKey && publicKey.length >= 8) {
  const seenPublic = bodies.some(([, text]) => text.includes(publicKey));
  console.log(`  control: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ${seenPublic ? "found (expected, public by design)" : "NOT found"}`);
  if (!seenPublic) console.log("  WARNING: the public key wasn't seen either; the scan may not have reached the client bundles.");
}
if (leaks) {
  console.log(`\n${leaks} secret(s) exposed to the browser.`);
  process.exit(1);
}
console.log("\nNo server-only secret value appears in any client-delivered resource.");
