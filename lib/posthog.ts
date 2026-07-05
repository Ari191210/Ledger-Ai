import type { PostHog } from "posthog-js";

// posthog-js is ~45 KB gz — dynamic-import it off the critical path so it
// stays out of every page's first-load bundle. Events fired before the SDK
// arrives are queued and flushed on load, so call sites stay synchronous.
let client: PostHog | null = null;
let loading = false;
const queue: Array<(ph: PostHog) => void> = [];

function withClient(fn: (ph: PostHog) => void) {
  if (client) fn(client);
  else queue.push(fn);
}

export function initPostHog() {
  if (client || loading || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  loading = true;

  const load = () => {
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host:           process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        capture_pageview:   false, // we fire manually for SPA routing
        capture_pageleave:  true,
        autocapture:        false, // manual events only — keeps data clean
        persistence:        "localStorage",
        session_recording:  { maskAllInputs: true },
      });
      client = posthog;
      for (const fn of queue.splice(0)) fn(posthog);
    });
  };

  // Load after the page is idle so analytics never competes with LCP/TTI.
  if ("requestIdleCallback" in window) {
    requestIdleCallback(load, { timeout: 3000 });
  } else {
    setTimeout(load, 1500);
  }
}

export function identifyUser(userId: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  withClient(ph => ph.identify(userId, props));
}

export function resetUser() {
  if (typeof window === "undefined") return;
  withClient(ph => ph.reset());
}

function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  withClient(ph => ph.capture(event, props));
}

// ── Core events ──────────────────────────────────────────────────────────────
export const track = {
  pageView(path: string) {
    capture("$pageview", { $current_url: path });
  },
  toolOpen(slug: string, category: string) {
    capture("tool_open", { tool: slug, category });
  },
  aiCall(tool: string) {
    capture("ai_call", { tool });
  },
  aiComplete(tool: string, durationMs: number) {
    capture("ai_complete", { tool, duration_ms: durationMs });
  },
  aiError(tool: string, code: string) {
    capture("ai_error", { tool, code });
  },
  signUp(method: string) {
    capture("sign_up", { method });
  },
  signIn(method: string) {
    capture("sign_in", { method });
  },
  onboardingComplete(grade: string, board: string) {
    capture("onboarding_complete", { grade, board });
  },
  featureUsed(feature: string, props?: Record<string, unknown>) {
    capture("feature_used", { feature, ...props });
  },
  rateLimitHit(tool: string) {
    capture("rate_limit_hit", { tool });
  },
};
