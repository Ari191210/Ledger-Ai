import * as Sentry from "@sentry/nextjs";

/**
 * Server-side instrumentation. Next runs this once per runtime before anything
 * else, which is why the Sentry configs are imported rather than inlined: the
 * node and edge runtimes are separate bundles.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Catches errors thrown while rendering Server Components and in route
// handlers, which do not surface to any client-side handler.
export const onRequestError = Sentry.captureRequestError;
