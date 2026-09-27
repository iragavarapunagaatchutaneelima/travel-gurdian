/**
 * Single source of truth for resolving the backend base URL, used by both
 * next.config.ts (the /backend-api/* rewrite destination, for local dev
 * only) and config/serverEnv.ts (direct server-to-server calls from Next.js
 * route handlers, e.g. app/api/ai/route.ts).
 *
 * ARCHITECTURE (single Vercel project, no separate backend host):
 * The FastAPI backend deploys as a Vercel Python Function in THIS SAME
 * project (/vercel.json, backend/index.py). Vercel's own top-level `routes`
 * intercept /backend-api/* and forward it to that function BEFORE Next.js's
 * rewrites ever run -- this only works once the project's Root Directory is
 * the repo root (a Vercel dashboard setting), so vercel.json is actually
 * read. While Root Directory is still `frontend` (or for any deployment
 * where the Python function isn't actually live), /backend-api/* has no
 * real backend behind it at all.
 *
 * IMPORTANT, learned the hard way: this resolver used to default, on any
 * Vercel build with no explicit BACKEND_API_URL, to
 * `https://${VERCEL_URL}/backend-api` -- i.e. the deployment's OWN host.
 * When the Python function isn't actually being served (Root Directory not
 * yet fixed, or any other reason), that makes next.config.ts's own
 * /backend-api/* rewrite point AT ITSELF: a real self-referencing infinite
 * loop, observed live as Vercel's own "508 INFINITE_LOOP_DETECTED" on every
 * page. Guessing a same-host URL automatically is therefore never safe.
 *
 * Instead: an unset BACKEND_API_URL on Vercel now resolves to plain
 * localhost, exactly like local dev -- which back on Vercel's servers just
 * fails to connect (a clean, honest "unavailable", never a loop). Once the
 * monorepo backend is verified actually reachable, set BACKEND_API_URL as
 * an EXPLICIT Vercel Production env var to this project's own STABLE
 * production URL + /backend-api (e.g.
 * https://travel-guardian-<org>.vercel.app/backend-api) -- an explicit,
 * deliberately-set value, never an automatic same-host guess.
 */

export const LOCALHOST_BACKEND_API_URL = "http://127.0.0.1:8000/api";

/** True specifically for a Vercel build/runtime (any of its environments). */
export function isVercelBuild(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.VERCEL;
}

export interface ResolveResult {
  url: string;
  warning?: string;
}

/**
 * Resolves the backend base URL. Explicit BACKEND_API_URL always wins;
 * otherwise always the localhost default, deliberately, everywhere -- see
 * module doc for why an automatic Vercel same-host guess is unsafe.
 */
export function resolveBackendApiUrl(env: NodeJS.ProcessEnv = process.env): ResolveResult {
  const raw = (env.BACKEND_API_URL || "").trim();
  if (raw) return { url: raw.replace(/\/$/, "") };
  return { url: LOCALHOST_BACKEND_API_URL };
}
