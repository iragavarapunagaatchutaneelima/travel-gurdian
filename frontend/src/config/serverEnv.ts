/**
 * Server-only configuration for Next.js route handlers (app/api/*). Never
 * import this from a "use client" module: these values are secrets and must
 * never reach the browser bundle.
 *
 * Canonical source: repository-root /.env.local (see ENVIRONMENT.md).
 */
import { resolveBackendApiUrl } from "./backendApiUrl";

if (typeof window !== "undefined") {
  throw new Error("serverEnv must never be imported into browser code.");
}

// Route handlers (app/api/ai/route.ts) call the backend directly
// (server-to-server). Set BACKEND_API_URL explicitly on Vercel once the
// monorepo backend is verified reachable -- see config/backendApiUrl.ts.
const _backend = resolveBackendApiUrl();
if (_backend.warning) {
  console.warn(`[serverEnv] ${_backend.warning}`);
}

function readKey(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  // Treat untouched template placeholders as "not configured".
  if (/^(your_|<)/i.test(value)) return undefined;
  return value;
}

export const serverEnv = {
  geminiApiKey: readKey("GEMINI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  // Dedicated server-side Google key (IP-restricted). Falls back to the
  // public referrer-restricted Maps key, which then needs a Referer header.
  googleRoutesApiKey: readKey("GOOGLE_ROUTES_API_KEY"),
  googleMapsPublicKey: readKey("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
  // FastAPI origin; route handlers call it directly (server-to-server).
  backendApiUrl: _backend.url,
} as const;
