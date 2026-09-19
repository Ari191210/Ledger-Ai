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

import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

/**
 * Everything a crash report is allowed to carry out of the building.
 *
 * sendDefaultPii already keeps IP addresses, cookies and headers out. These two
 * close the doors it does not cover, and they exist so the privacy page can keep
 * saying that Anthropic is the only third party any study data reaches. A crash
 * report is not meant to contain study data, but it can pick some up by
 * accident: a console line quoting a topic name, a URL carrying a query string,
 * a Postgres error repeating the row that failed.
 *
 * Both are deliberately blunt. A breadcrumb we cannot read is worth less than a
 * promise we can keep.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Console breadcrumbs are whatever anyone ever passed to console.error, which
  // in this codebase includes lines about a student's own rows. Dropped whole:
  // the stack trace is the part worth having.
  if (breadcrumb.category === "console") return null;
  const url = breadcrumb.data?.url;
  if (typeof url === "string") {
    breadcrumb.data = { ...breadcrumb.data, url: url.split("?")[0] };
  }
  return breadcrumb;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    // A request body on this product is a logged mistake, an essay, a doubt.
    delete event.request.data;
    delete event.request.query_string;
    if (typeof event.request.url === "string") {
      event.request.url = event.request.url.split("?")[0];
    }
  }
  return event;
}

export const sharedSentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // with no DSN the SDK no-ops, which is what we want in local dev
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  // a stack trace is useless without knowing which deploy produced it
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  // Keeps a long Postgres error from carrying half a table out with it.
  maxValueLength: 400,
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: scrubEvent,
};
