import type { NextConfig } from "next";
import recoveredSourceRunData from "./seed-runs/curation/2026-07-16-recovered-approved-source-runs.json";
import sourceRunRuntimeRoutes from "./config/source-run-runtime-routes.json";

const sourceRunRuntimeFiles = [
  './seed-runs/**/*.json',
  './public/artifacts/**/*',
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // The invitation-only project pilot accepts one HTML artifact up to 2 MB
    // plus a bounded evidence manifest. The server action rejects anything
    // outside that contract before private storage.
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
  // The local review links shared during design work use both hostnames. Keep
  // Next's development client available on 127.0.0.1 as well as localhost so
  // client-mounted artifact previews do not remain stuck in their loading UI.
  allowedDevOrigins: ['127.0.0.1'],
  // Most project evidence is consumed while static pages are built. These
  // request-time routes are the deliberate exceptions: admin publication,
  // model/fork readers, and the signed-in workspace may verify source-run
  // packages after deployment. Keep that evidence scoped to those functions
  // instead of tracing it into every route in the application.
  outputFileTracingIncludes: Object.fromEntries([
    ...sourceRunRuntimeRoutes.map((route) => [route, sourceRunRuntimeFiles] as const),
    ['/api/prepared-artifacts/*', ['./public/artifacts/**/*']] as const,
  ]),
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/artifacts/:path*',
          destination: '/api/prepared-artifacts/:path*',
        },
      ],
      afterFiles: recoveredSourceRunData.projects.map((project) => ({
        source: project.href,
        destination: `/recovered-source-runs/${project.href.slice(1)}`,
      })),
      fallback: [],
    };
  },
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
