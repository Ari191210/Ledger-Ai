import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "./sentry.shared";

Sentry.init({
  ...sharedSentryOptions,
  // Drop the browser's own noise. These are almost always an extension, an
  // adblocker, or a user closing the tab mid-request, and on a free quota they
  // would crowd out the reports that matter.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^Failed to fetch$/,
    /^NetworkError/,
    /^AbortError/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
