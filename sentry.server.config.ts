import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  beforeSend(event) {
    // Don't send 4xx errors to Sentry — those are user errors not bugs
    if (event.extra?.statusCode && Number(event.extra.statusCode) < 500) {
      return null;
    }
    return event;
  },
});
