import type { NextConfig } from "next";

// Server-only backend target for the same-origin API proxy (see rewrites() below).
// Never exposed to the browser bundle because it is read only inside next.config.ts
// and the rewrite destination, both of which execute on the Next.js server.
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000/api";

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
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://maps.googleapis.com https://generativelanguage.googleapis.com",
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
  // Same-origin proxy to the FastAPI backend. The browser only ever talks to
  // /backend-api/* on its own origin, so the strict CSP connect-src ('self')
  // does not need to name the backend host at all, in dev OR production.
  // The real backend location (BACKEND_API_URL) is a server-only env var and
  // is never sent to the browser.
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
