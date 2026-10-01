import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Content-Security-Policy: the browser refuses any script, style, frame or
// network call from a source not listed here, so an injected <script> or a
// stray third-party tag has nowhere to load from or send data to.
//
// No nonces. A nonce CSP forces every page to render per request, which would
// throw away static rendering across the marketing site; the hash of the one
// inline script (the theme setter in app/layout.tsx) is not stable across Next's
// own inline bootstrap scripts either. So 'unsafe-inline' stays for scripts,
// the documented "without nonces" setup (node_modules/next/dist/docs/01-app/
// 02-guides/content-security-policy.md). Everything else is locked to named
// hosts. React already escapes every value it renders; this is the second wall.
//
// connect-src: Supabase (auth and data), the breached-password range lookup
// (lib/auth/password.ts). Sentry is not listed because tunnelRoute below sends
// it through our own origin. 'unsafe-eval' only in dev, for React's debugging.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} https://api.pwnedpasswords.com`.trim(),
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
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
