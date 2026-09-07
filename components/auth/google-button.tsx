"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { playClick } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * Sign in with Google.
 *
 * Rendered only when NEXT_PUBLIC_GOOGLE_AUTH is set, because the provider has
 * to be enabled in Supabase with a client id and secret before this can work,
 * and a button that always fails is worse than no button. The same flag gates
 * the privacy-page guard in lib/privacy-claims.test.ts: turning this on makes
 * Google a third-party processor in the auth flow, and the page has to say so.
 *
 * The date of birth is not collected here and cannot be: Google returns an
 * email and a name and nothing else. That is fine, because onboarding asks for
 * it separately and the app layout sends anyone without an onboarded_at there
 * first. DPDP child status is decided on that answer, not on anything Google
 * hands over.
 */
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";

/** Google's own mark. Their brand guidelines require the four-colour "G". */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    playClick("tap");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Through our own callback, which validates `next` before redirecting.
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      // Most likely the provider is not configured yet, or a school Workspace
      // admin blocks third-party sign-in for this account.
      setErr("Couldn't reach Google. Use your email and password instead.");
      setBusy(false);
    }
    // On success the browser leaves for Google, so there is nothing to reset.
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className={cn(
          "u-tap flex w-full items-center justify-center gap-2.5 rounded-md border border-border-2 bg-surface-2 px-3 py-2.5",
          "text-sm font-semibold text-text",
          "transition-[translate,background-color,box-shadow] duration-[190ms] ease-spring",
          "hover:-translate-y-px hover:border-border-2 hover:bg-surface-3",
          "active:translate-y-[2px] active:duration-[70ms] active:ease-out",
          "disabled:pointer-events-none disabled:opacity-60",
        )}
      >
        <GoogleMark />
        {busy ? "Taking you to Google…" : "Continue with Google"}
      </button>
      {err && <p className="mt-2 u-mono text-2xs text-negative">{err}</p>}
    </div>
  );
}
