import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import { resolveBackendApiUrl } from "./src/config/backendApiUrl";

// Canonical configuration lives in the repository-root /.env.local (shared
// with the FastAPI backend; see ENVIRONMENT.md). Next.js only auto-loads env
// files from frontend/, so read the root file here and let it take
// precedence over the legacy frontend/.env.local, which keeps working as a
// fallback for any variable not yet moved. Values are never logged.
(function loadRootEnv() {
  const rootEnv = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(rootEnv)) return;
  for (const rawLine of fs.readFileSync(rootEnv, "utf-8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value !== "") process.env[key] = value;
  }
})();

// Server-only backend target for the LOCAL-DEV /backend-api/* rewrite below.
// On Vercel, /backend-api/* is instead served directly by the backend Python
// Function in this same project (see /vercel.json's top-level `routes`,
// which intercept it before this rewrite ever runs) -- so this only matters
// for `next dev` / a non-Vercel deployment. See src/config/backendApiUrl.ts.
const { url: BACKEND_API_URL, warning } = resolveBackendApiUrl();
if (warning) {
  console.warn(`[next.config.ts] ${warning}`);
}

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // blob: is required for MapLibre GL JS's tile-parsing web worker,
      // which it wraps in a blob: URL that internally imports the actual
      // worker script as an ES module.
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com",
      "font-src 'self' data: https://fonts.gstatic.com https://protomaps.github.io",
      // build.protomaps.com: the public OpenStreetMap PMTiles archive used
      // for the real offline vector map engine (range-request tile fetches).
      // protomaps.github.io: text-label glyphs for that same offline map style.
      // huggingface.co / *.hf.co / raw.githubusercontent.com: WebLLM on-device
      // model config, weights (HF redirects to its LFS/Xet CDNs), and the
      // compiled model WASM library -- only fetched when the user asks the
      // offline AI a question on a WebGPU-capable browser.
      "connect-src 'self' https://maps.googleapis.com https://generativelanguage.googleapis.com https://build.protomaps.com https://protomaps.github.io https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  productionBrowserSourceMaps: false, // Security: Do not expose raw server/client source maps in production
  experimental: {
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // LOCAL DEV ONLY same-origin proxy to a locally-running FastAPI backend
  // (`uvicorn app.main:app`). On Vercel, /vercel.json's top-level `routes`
  // serve /backend-api/* directly from the backend Python Function in this
  // same project, before this rewrite is ever consulted -- there is no
  // external backend host to name, so the strict CSP connect-src ('self')
  // never needs one either, in dev or on Vercel.
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${BACKEND_API_URL.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
