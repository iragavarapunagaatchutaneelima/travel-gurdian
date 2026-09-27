/**
 * Single source of truth for resolving the backend base URL, used by both
 * next.config.ts (the /backend-api/* rewrite destination, for local dev
 * only -- see below) and config/serverEnv.ts (direct server-to-server calls
 * from Next.js route handlers, e.g. app/api/ai/route.ts).
 *
 * ARCHITECTURE (single Vercel project, no separate backend host):
 * The FastAPI backend is deployed as a Vercel Python Function in THIS SAME
 * project (see /vercel.json, backend/index.py, backend/app/main.py's
 * /backend-api/* router aliases). Vercel's own top-level `routes` in
 * vercel.json intercept /backend-api/* and forward it to that function
 * BEFORE Next.js's rewrites ever run -- so the browser's calls to
 * /backend-api/* need no configuration at all in production.
 *
 * The one case that DOES need resolving here is server-to-server: a Next.js
 * Route Handler (its own separate serverless function) calling the backend
 * directly needs an absolute URL. Vercel sets VERCEL_URL (the deployment's
 * own hostname) automatically at runtime, so `https://${VERCEL_URL}/backend-api`
 * reaches the same deployment's backend function with ZERO required env var.
 *
 * BACKEND_API_URL remains a supported explicit override (e.g. a separate
 * backend host, or local dev against `uvicorn app.main:app`), but is no
 * longer required on Vercel -- unlike an earlier version of this resolver,
 * which incorrectly treated an unset BACKEND_API_URL on Vercel as fatal.
 * That was correct advice under the OLD architecture (a same-origin rewrite
 * to an external host); it is not under this one.
 */

export const LOCALHOST_BACKEND_API_URL = "http://127.0.0.1:8000/api";

/** True specifically for a Vercel build/runtime (any of its environments). */
export function isVercelBuild(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.VERCEL;
}

export interface ResolveResult {
  url: string;
  /** Informational only now (no longer build-breaking) -- see module doc. */
  warning?: string;
}

/**
 * Resolves the backend base URL:
 *   1. Explicit BACKEND_API_URL always wins (a real override, or a plain
 *      local-dev value like http://127.0.0.1:8000/api).
 *   2. On Vercel with no override: the SAME deployment's own /backend-api
 *      path, via VERCEL_URL (always set by the platform).
 *   3. Otherwise (local dev, VERCEL_URL not yet known for some reason):
 *      the localhost default.
 */
export function resolveBackendApiUrl(env: NodeJS.ProcessEnv = process.env): ResolveResult {
  const raw = (env.BACKEND_API_URL || "").trim();
  if (raw) return { url: raw.replace(/\/$/, "") };

  if (isVercelBuild(env)) {
    if (env.VERCEL_URL) {
      return { url: `https://${env.VERCEL_URL}/backend-api` };
    }
    // Should not happen in practice -- Vercel always sets VERCEL_URL -- but
    // never silently fall back to an unreachable localhost on Vercel.
    return {
      url: LOCALHOST_BACKEND_API_URL,
      warning: "Running on Vercel but VERCEL_URL is unset and BACKEND_API_URL is not overridden; " +
        "server-to-server backend calls (AI Guardian weather/Nugen) will fail. This should not happen on a normal " +
        "Vercel deployment -- if it does, set BACKEND_API_URL explicitly as a fallback.",
    };
  }

  return { url: LOCALHOST_BACKEND_API_URL };
}
