import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Tools cut on 2026-09-06. Anyone holding a bookmark lands on the tool that
  // does the nearest honest version of the job rather than on a 404.
  async redirects() {
    return [
      { source: "/tools/tutor", destination: "/tools/doubt", permanent: true },
      { source: "/tools/assignment", destination: "/tools/model-answer", permanent: true },
      { source: "/tools/career", destination: "/tools", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "study-ledger",
  project: "javascript-nextjs",
  // Quiet by default; the build log is not where Sentry news belongs.
  silent: true,
  // Source map upload needs a SENTRY_AUTH_TOKEN, which we do not have yet.
  // Without it, uploading would fail noisily on every build for no benefit, so
  // it is off until a token exists. Consequence, stated plainly: production
  // stack traces will be minified until then.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Route Sentry requests through our own domain so adblockers, which block
  // ingest.sentry.io by default, do not silently swallow browser errors.
  tunnelRoute: "/monitoring",
});
