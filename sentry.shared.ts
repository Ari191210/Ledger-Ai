/**
 * Settings shared by every Sentry runtime.
 *
 * Two choices here are deliberate and should not be "improved" without a
 * reason, because most of this product's users are legally children under
 * India's DPDP Act:
 *
 *   sendDefaultPii: false   never attach IP addresses, cookies or headers.
 *   no Session Replay       replay records what a user does on screen. On a
 *                           product used by minors that is exactly the kind of
 *                           behavioural monitoring s.9(3) is concerned with,
 *                           and it is the single heaviest thing the browser SDK
 *                           can load. See docs/dpdp-children.md.
 *
 * Tracing is off (tracesSampleRate 0). We want crash reports, not performance
 * transactions, and tracing costs both quota and client work on a site that
 * currently scores 99 on mobile.
 */

export const sharedSentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // with no DSN the SDK no-ops, which is what we want in local dev
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  // a stack trace is useless without knowing which deploy produced it
  release: process.env.VERCEL_GIT_COMMIT_SHA,
};
