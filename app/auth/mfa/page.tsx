"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SplitLayout } from "@/components/auth/split-layout";
import { safeNext } from "@/lib/safe-next";
import { cleanCode } from "@/lib/auth/mfa";
import { useCodeFlow } from "@/components/auth/use-code-flow";

/**
 * The second step of sign-in for a student who turned two-factor on. The proxy
 * sends every protected page here until this sign-in has entered the code we
 * emailed, so this page is the only way through, not a courtesy. The code is
 * sent as the page opens; there is nothing to decide first.
 */
function MfaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const flow = useCodeFlow("signin");
  const [code, setCode] = useState("");
  const sentOnce = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice in development; one email is enough.
    if (sentOnce.current) return;
    sentOnce.current = true;
    flow.send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(value: string) {
    if (value.length !== 6 || flow.busy) return;
    if (await flow.verify(value)) {
      router.replace(safeNext(params.get("next"), location.origin));
      router.refresh();
    } else {
      setCode("");
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="u-led" />
        <span className="u-brand text-lg text-text">StudyLedger</span>
      </div>

      <span className="u-label">two-factor</span>
      <h1 className="mt-2 text-xl font-bold text-text">Check your email</h1>
      <p aria-live="polite" className="mt-1 text-sm text-text-2">
        {flow.to ? (
          <>
            We sent a 6-digit code to <span className="u-mono text-text">{flow.to}</span>. It works for 10 minutes.
          </>
        ) : (
          "Sending a 6-digit code to your email…"
        )}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
        className="mt-6 space-y-3"
      >
        <label className="block">
          <span className="u-label">code</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            spellCheck={false}
            required
            autoFocus
            value={code}
            onChange={(e) => {
              const next = cleanCode(e.target.value);
              setCode(next);
              if (next.length === 6) submit(next);
            }}
            aria-describedby={flow.err ? "mfa-error" : undefined}
            className="u-mono mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-lg tracking-[0.3em] text-text outline-none focus:border-accent"
          />
        </label>

        {flow.err && (
          <p id="mfa-error" role="alert" className="u-mono text-2xs text-negative">
            {flow.err}
          </p>
        )}

        <Button type="submit" size="lg" disabled={flow.busy || code.length !== 6} className="w-full">
          {flow.busy ? "Checking…" : "Verify"}
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={flow.send}
          disabled={flow.cooldown > 0 || flow.sending}
          className="u-mono text-2xs text-text-2 hover:text-text disabled:text-text-3"
        >
          {flow.cooldown > 0 ? `resend in ${flow.cooldown}s` : flow.sending ? "sending…" : "resend code"}
        </button>
        <form action="/auth/signout" method="post">
          <button type="submit" className="u-mono text-2xs text-text-2 hover:text-text">
            Not you? Sign out
          </button>
        </form>
      </div>
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
