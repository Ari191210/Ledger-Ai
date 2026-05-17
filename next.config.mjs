import { withSentryConfig } from "@sentry/nextjs";

const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline (anti-flash script, framework chunks) and
  // unsafe-eval (WebGL shader compilation via Three.js / Spline)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // data: for base64 image uploads (doubt tool), blob: for WebGL textures
  "img-src 'self' data: blob:",
  [
    "connect-src 'self'",
    "https://*.supabase.co wss://*.supabase.co",  // Supabase REST + Realtime
    "https://app.posthog.com",                     // PostHog analytics
    "https://*.ingest.sentry.io",                  // Sentry error ingestion
    "https://prod.spline.design",                  // Spline scene files
  ].join(" "),
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => [
    {
      source: "/_next/static/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: CSP },
        { key: "X-Content-Type-Options",  value: "nosniff" },
        { key: "X-Frame-Options",         value: "DENY" },
        { key: "X-XSS-Protection",        value: "1; mode=block" },
        { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

export default withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent:  true,
  hideSourceMaps: true,
  disableLogger:  true,
  automaticVercelMonitors: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
