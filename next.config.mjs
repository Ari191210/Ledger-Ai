import { withSentryConfig } from "@sentry/nextjs";

const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for anti-flash scripts and framework chunks.
  // unsafe-eval is required by Three.js/Spline WebGL shader compilation.
  // ACCEPTED RISK: unsafe-eval weakens XSS protection. Scoped to WebGL use only;
  // do not add new eval() dependencies. Remove when Spline/Three.js is eliminated.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // api.fontshare.com serves the Orsiri stylesheet; cdn.fontshare.com serves its font files
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.fontshare.com",
  // data: for base64 image uploads (doubt tool), blob: for WebGL textures
  "img-src 'self' data: blob:",
  [
    "connect-src 'self'",
    "https://*.supabase.co wss://*.supabase.co",  // Supabase REST + Realtime
    "https://us.i.posthog.com https://us-assets.i.posthog.com", // PostHog analytics
    "https://*.ingest.sentry.io",                  // Sentry error ingestion
    "https://prod.spline.design",                  // Spline scene files
  ].join(" "),
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "frame-ancestors 'self'",  // allow same-origin iframe (split-view tool panel)
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",  // allow Google OAuth redirect
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Consolidated tools — permanent redirects keep old bookmarks and any
  // indexed URLs working. dna's UI is post-exam's DNA tab; cremator's flow
  // is exam-triage's cremator tab (same "cremator" prompt template).
  redirects: async () => [
    { source: "/tools/dna",      destination: "/tools/post-exam?tab=dna",        permanent: true },
    { source: "/tools/cremator", destination: "/tools/exam-triage?tab=cremator", permanent: true },
  ],
  headers: async () => [
    {
      source: "/_next/static/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy",            value: CSP },
        { key: "X-Content-Type-Options",            value: "nosniff" },
        { key: "X-Frame-Options",                   value: "SAMEORIGIN" },
        { key: "X-XSS-Protection",                  value: "1; mode=block" },
        { key: "Referrer-Policy",                   value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",                value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        { key: "Strict-Transport-Security",         value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        { key: "Cross-Origin-Opener-Policy",        value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy",      value: "same-origin" },
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
