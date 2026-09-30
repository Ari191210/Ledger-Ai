"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SplitLayout } from "@/components/auth/split-layout";
import { safeNext } from "@/lib/safe-next";

/**
 * The second step of sign-in for a student who turned two-factor on. The proxy
 * sends every protected page here until the session holds a code from their
 * authenticator app, so this page is the only way through, not a courtesy.
 */
function MfaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const next = () => safeNext(params.get("next"), location.origin);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const factor = data?.totp?.find((f) => f.status === "verified");
      // No verified factor means there is nothing to ask for: carry on.
      if (!factor) router.replace(next());
      else setFactorId(factor.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (error) {
      setErr("That code didn't work. Codes change every 30 seconds, so try the one showing now.");
      setCode("");
      setBusy(false);
      return;
    }
    router.replace(next());
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="u-led" />
        <span className="u-brand text-lg text-text">StudyLedger</span>
      </div>

      <span className="u-label">two-factor</span>
      <h1 className="mt-2 text-xl font-bold text-text">Enter your code</h1>
      <p className="mt-1 text-sm text-text-2">
        Open your authenticator app and type the 6-digit code for StudyLedger.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block">
          <span className="u-label">code</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-describedby={err ? "mfa-error" : undefined}
            className="u-mono mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-lg tracking-[0.3em] text-text outline-none focus:border-accent"
          />
        </label>

        {err && <p id="mfa-error" role="alert" className="u-mono text-2xs text-negative">{err}</p>}

        <Button type="submit" size="lg" disabled={busy || !factorId || code.length !== 6} className="w-full">
          {busy ? "…" : "Verify"}
        </Button>
      </form>

      <form action="/auth/signout" method="post" className="mt-4">
        <button type="submit" className="u-mono text-2xs text-text-2 hover:text-text">
          Not you? Sign out
        </button>
      </form>
    </div>
  );
}

export default function MfaPage() {
  return (
    <SplitLayout form="sm">
      <Suspense>
        <MfaForm />
      </Suspense>
    </SplitLayout>
  );
}
