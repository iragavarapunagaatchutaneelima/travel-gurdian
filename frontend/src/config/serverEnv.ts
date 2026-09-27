/**
 * Server-only configuration for Next.js route handlers (app/api/*). Never
 * import this from a "use client" module: these values are secrets and must
 * never reach the browser bundle.
 *
 * Canonical source: repository-root /.env.local (see ENVIRONMENT.md).
 */
if (typeof window !== "undefined") {
  throw new Error("serverEnv must never be imported into browser code.");
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
} as const;
