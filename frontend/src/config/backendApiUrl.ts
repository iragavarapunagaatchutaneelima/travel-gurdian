/**
 * Single source of truth for resolving BACKEND_API_URL, used by both
 * next.config.ts (the same-origin /backend-api/* rewrite destination, for
 * the browser) and config/serverEnv.ts (direct server-to-server calls from
 * Next.js route handlers). Keeping one resolver avoids the two drifting.
 *
 * Root cause this exists to prevent: BACKEND_API_URL silently fell back to
 * http://127.0.0.1:8000/api whenever it wasn't set, including in a Vercel
 * production build -- which bakes that literal localhost destination into
 * the deployed rewrite manifest at build time. The browser then gets a
 * proxy to an address that doesn't exist in Vercel's infrastructure, and
 * every /backend-api/* call fails ("Digital Twin: HTTP 404", etc.) with no
 * indication of why. A local/dev fallback is still allowed -- only a
 * genuinely production build (Vercel, or NODE_ENV=production without an
 * explicit opt-out) with the variable missing or pointed at localhost fails
 * loudly at build time instead.
 */

export const LOCALHOST_BACKEND_API_URL = "http://127.0.0.1:8000/api";

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";
  } catch {
    // Not a parseable absolute URL -- treat as invalid, not as "safe".
    return true;
  }
}

/**
 * True specifically for a Vercel build/runtime (any of its environments:
 * production, preview, or a "development" target still running on Vercel's
 * infra). VERCEL is a var Vercel sets itself, never something a developer
 * sets locally. Scoped to Vercel (not any NODE_ENV=production build) so a
 * developer's own `next build && next start` against a local backend, e.g.
 * to test a production build before deploying, keeps working exactly as
 * before -- only Vercel's infra can never actually reach 127.0.0.1:8000.
 */
export function isVercelBuild(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.VERCEL;
}

/** Broader "this looks like a real deployment" check, used only for a non-fatal warning. */
export function isProductionDeployment(env: NodeJS.ProcessEnv = process.env): boolean {
  return isVercelBuild(env) || env.NODE_ENV === "production";
}

export interface ResolveResult {
  url: string;
  /** Set when Vercel would deploy with a broken backend target; the caller (next.config.ts) throws to fail the build loudly. */
  fatalMisconfiguration?: string;
  /** Set for a non-Vercel production build with the same issue; worth a console warning, not a hard failure. */
  warning?: string;
}

/**
 * Resolves BACKEND_API_URL. Never throws itself -- next.config.ts decides
 * whether to turn a Vercel misconfiguration into a build-failing throw.
 */
export function resolveBackendApiUrl(env: NodeJS.ProcessEnv = process.env): ResolveResult {
  const raw = (env.BACKEND_API_URL || "").trim();
  const url = (raw || LOCALHOST_BACKEND_API_URL).replace(/\/$/, "");

  // A missing/localhost BACKEND_API_URL is completely normal and expected in
  // plain local dev (`next dev` against a locally-running FastAPI backend) --
  // only flag it once this looks like a real deployment.
  if (!isProductionDeployment(env)) return { url };
  const broken = !raw || isLocalhostUrl(url);
  if (!broken) return { url };

  const message = !raw
    ? "BACKEND_API_URL is not set. This silently proxies /backend-api/* to " +
      `${LOCALHOST_BACKEND_API_URL}, which does not exist on a deployed host. Set BACKEND_API_URL to the ` +
      "real FastAPI origin, e.g. https://<backend-host>/api, as a Production environment variable, then redeploy."
    : `BACKEND_API_URL is set to a localhost address (${url}). Set it to the real FastAPI origin, e.g. ` +
      "https://<backend-host>/api, then redeploy.";

  return isVercelBuild(env) ? { url, fatalMisconfiguration: message } : { url, warning: message };
}
