import type { NextConfig } from "next";
import sourceRunRuntimeRoutes from "./config/source-run-runtime-routes.json";

const sourceRunRuntimeFiles = [
  './seed-runs/**/*.json',
  './public/artifacts/**/*',
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Most project evidence is consumed while static pages are built. These
  // request-time routes are the deliberate exceptions: admin publication,
  // model/fork readers, and the signed-in workspace may verify source-run
  // packages after deployment. Keep that evidence scoped to those functions
  // instead of tracing it into every route in the application.
  outputFileTracingIncludes: Object.fromEntries(
    sourceRunRuntimeRoutes.map((route) => [route, sourceRunRuntimeFiles]),
  ),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
      {
        source: "/artifacts/:path*",
        headers: [
          {
            key: "Content-Disposition",
            value: "attachment",
          },
          {
            key: "Content-Security-Policy",
            value: "sandbox; default-src 'none'; frame-ancestors 'none'",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
