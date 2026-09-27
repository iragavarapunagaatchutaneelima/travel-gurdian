/**
 * Browser-safe configuration. Everything here is compiled into the client
 * JavaScript bundle and is publicly readable -- only values that are
 * designed to be public (and restricted by other means, e.g. the Maps key's
 * HTTP-referrer restriction) may appear here.
 *
 * NEXT_PUBLIC_* values must be read with a literal `process.env.NAME`
 * expression so Next.js can inline them at build time; that's why each is
 * spelled out rather than looked up dynamically.
 *
 * Canonical source: repository-root /.env.local (see ENVIRONMENT.md).
 */
export const publicEnv = {
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
} as const;
