#!/usr/bin/env node
/**
 * Travel Guardian environment checker.
 *
 *   node scripts/check-env.mjs
 *
 * Reports which configuration variables are set and WHERE they come from,
 * without ever printing a value. Canonical file: /.env.local (repo root).
 * Legacy files (frontend/.env.local, backend/.env) are still read by the
 * app as fallbacks and are reported here so you can migrate them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  { label: "/.env.local", file: path.join(repoRoot, ".env.local"), canonical: true },
  { label: "frontend/.env.local (legacy)", file: path.join(repoRoot, "frontend", ".env.local") },
  { label: "backend/.env (legacy)", file: path.join(repoRoot, "backend", ".env") },
];

// scope: "public" = compiled into the browser bundle; "server" = Next.js
// server only; "backend" = FastAPI only. required: needed for core features.
const VARIABLES = [
  { name: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", scope: "public", required: true, purpose: "Google Maps JS, Places autocomplete, Directions (browser)" },
  { name: "GEMINI_API_KEY", scope: "server", required: false, purpose: "AI Guardian conversational layer (deterministic tools work without it)" },
  { name: "GEMINI_MODEL", scope: "server", required: false, purpose: "Gemini model id (defaults to gemini-2.5-flash)" },
  { name: "GOOGLE_ROUTES_API_KEY", scope: "server", required: false, purpose: "Server-side Routes/Places key (falls back to the public Maps key)" },
  { name: "BACKEND_API_URL", scope: "server", required: false, purpose: "FastAPI origin for the /backend-api proxy (defaults to http://127.0.0.1:8000/api)" },
  { name: "DATABASE_URL", scope: "backend", required: false, purpose: "Database (defaults to local SQLite)" },
  { name: "CORS_ORIGINS", scope: "backend", required: false, purpose: "Allowed frontend origins" },
  { name: "TWILIO_ACCOUNT_SID", scope: "backend", required: false, purpose: "Twilio emergency SMS/voice (only needed when TWILIO_DRY_RUN=false)" },
  { name: "TWILIO_AUTH_TOKEN", scope: "backend", required: false, purpose: "Twilio auth token" },
  { name: "TWILIO_PHONE_NUMBER", scope: "backend", required: false, purpose: "Twilio sender number" },
  { name: "TWILIO_DRY_RUN", scope: "backend", required: false, purpose: "true (default) = never send real SMS/calls" },
  { name: "NUGEN_API_KEY", scope: "backend", required: false, purpose: "Nugen alignment/deployment/inference (Midnight Task 2)" },
  { name: "NUGEN_API_URL", scope: "backend", required: false, purpose: "Nugen API base (defaults to https://api.nugen.in/api/v3)" },
  { name: "NUGEN_BASE_MODEL_ID", scope: "backend", required: false, purpose: "Alignment-ready base model chosen from GET /models/base" },
  { name: "NUGEN_ALIGNED_MODEL_ID", scope: "backend", required: false, purpose: "Deployed aligned model id used for inference" },
  { name: "SEED_RESET", scope: "backend", required: false, purpose: "true = seed.py wipes demo reference tables" },
  { name: "DISABLE_API_DOCS", scope: "backend", required: false, purpose: "true in production hides /docs" },
];

// Present in older installs but no longer read by any code.
const OBSOLETE = [
  "EXOTEL_ACCOUNT_SID", "EXOTEL_SUBDOMAIN", "EXOTEL_API_KEY", "EXOTEL_API_TOKEN",
  "EXOTEL_EXOPHONE", "EXOTEL_APP_ID", "EXOTEL_DRY_RUN", "NEXT_PUBLIC_API_URL",
];

const SECRET_WORDS = /(KEY|TOKEN|SECRET|PASSWORD|SID|DATABASE_URL)/;

function parseEnv(file) {
  const out = new Map();
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    out.set(key, value);
  }
  return out;
}

function classify(value) {
  if (value === undefined) return "MISSING";
  if (value === "") return "EMPTY";
  if (/^(your_|<|paste_|xxx)/i.test(value)) return "PLACEHOLDER";
  return "CONFIGURED";
}

const parsed = FILES.map((f) => ({ ...f, exists: fs.existsSync(f.file), vars: parseEnv(f.file) }));

console.log("\nTravel Guardian environment check (values are never printed)\n");
for (const f of parsed) {
  console.log(`  ${f.exists ? "found  " : "absent "} ${f.label}`);
}
console.log("");

let problems = 0;
const pad = (s, n) => (s + " ").padEnd(n, ".");
for (const v of VARIABLES) {
  // App precedence: root /.env.local wins, then legacy files.
  const hit = parsed.find((f) => f.vars.has(v.name) && f.vars.get(v.name) !== "");
  const status = classify(hit ? hit.vars.get(v.name) : undefined);
  const where = hit ? (hit.canonical ? "root" : hit.label) : "-";
  const flag = status !== "CONFIGURED" && v.required ? "  <-- REQUIRED" : "";
  if (flag) problems++;
  console.log(`  ${pad(v.name, 34)} ${status.padEnd(11)} [${v.scope}] from ${where}${flag}`);
}

console.log("\nMigration / safety notes:");
let notes = 0;
for (const f of parsed.filter((p) => !p.canonical)) {
  for (const key of f.vars.keys()) {
    if (OBSOLETE.includes(key)) {
      console.log(`  - ${key} in ${f.label} is obsolete (no code reads it); safe to delete.`);
      notes++;
    } else if (VARIABLES.some((v) => v.name === key)) {
      const alsoInRoot = parsed[0].vars.has(key);
      console.log(`  - ${key} is in ${f.label}${alsoInRoot ? " AND /.env.local (root wins; delete the legacy copy)" : "; move it to /.env.local"}.`);
      notes++;
    }
  }
}
for (const f of parsed) {
  for (const key of f.vars.keys()) {
    if (key.startsWith("NEXT_PUBLIC_") && SECRET_WORDS.test(key.replace("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", ""))) {
      console.log(`  ! ${key} in ${f.label}: NEXT_PUBLIC_ variables are shipped to every browser. Never put a secret here.`);
      problems++;
      notes++;
    }
  }
}
if (notes === 0) console.log("  none");

console.log(problems === 0 ? "\nResult: OK\n" : `\nResult: ${problems} problem(s). See ENVIRONMENT.md.\n`);
process.exit(problems === 0 ? 0 : 1);
