import posthog from "posthog-js";

let initialised = false;

export function initPostHog() {
  if (initialised || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host:           process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview:   false, // we fire manually for SPA routing
    capture_pageleave:  true,
    autocapture:        false, // manual events only — keeps data clean
    persistence:        "localStorage",
    session_recording:  { maskAllInputs: true },
  });
  initialised = true;
}

export function identifyUser(userId: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, props);
}

export function resetUser() {
  if (typeof window === "undefined") return;
  posthog.reset();
}

// ── Core events ──────────────────────────────────────────────────────────────
export const track = {
  pageView(path: string) {
    posthog.capture("$pageview", { $current_url: path });
  },
  toolOpen(slug: string, category: string) {
    posthog.capture("tool_open", { tool: slug, category });
  },
  aiCall(tool: string) {
    posthog.capture("ai_call", { tool });
  },
  aiComplete(tool: string, durationMs: number) {
    posthog.capture("ai_complete", { tool, duration_ms: durationMs });
  },
  aiError(tool: string, code: string) {
    posthog.capture("ai_error", { tool, code });
  },
  signUp(method: string) {
    posthog.capture("sign_up", { method });
  },
  signIn(method: string) {
    posthog.capture("sign_in", { method });
  },
  onboardingComplete(grade: string, board: string) {
    posthog.capture("onboarding_complete", { grade, board });
  },
  featureUsed(feature: string, props?: Record<string, unknown>) {
    posthog.capture("feature_used", { feature, ...props });
  },
  rateLimitHit(tool: string) {
    posthog.capture("rate_limit_hit", { tool });
  },
};
