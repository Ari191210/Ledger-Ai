"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { createClient } from "@/lib/supabase/client";
import { cleanCode } from "@/lib/auth/mfa";
import { useCodeFlow } from "@/components/auth/use-code-flow";

/**
 * Two-factor sign-in by email code, from Settings. A switch, like the other two
 * on/off choices here. Flipping it emails a code, and it only changes once that
 * code is entered, both ways: turning it off from a session someone else is
 * holding needs the inbox too.
 *
 * What it does and does not protect is said plainly: it stops a leaked
 * password, not someone who is already inside the student's email, because a
 * password reset goes to that same inbox.
 */
export function TwoFactor({ on, passwordSignIn }: { on: boolean; passwordSignIn: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(on);
  const [pending, setPending] = useState<"enable" | "disable" | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const enable = useCodeFlow("enable");
  const disable = useCodeFlow("disable");
  const flow = pending === "disable" ? disable : enable;

  async function start(next: boolean) {
    setNote(null);
    setCode("");
    const purpose = next ? "enable" : "disable";
    setPending(purpose);
    const f = purpose === "enable" ? enable : disable;
    f.reset();
    await f.send();
  }

  async function confirm(value: string) {
    if (!pending || value.length !== 6 || flow.busy) return;
    if (!(await flow.verify(value))) {
      setCode("");
      return;
    }
    // Pull a fresh token so it carries the new setting, then redraw.
    await createClient().auth.refreshSession();
    setEnabled(pending === "enable");
    setNote(pending === "enable" ? "two-factor is on. Other devices were signed out." : "two-factor is off");
    setPending(null);
    setCode("");
    router.refresh();
  }

  if (!passwordSignIn) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm text-text">Two-factor sign-in</span>
          <p className="mt-0.5 text-xs text-text-3">
            You sign in with Google, which already checks it&apos;s you. This protects password sign-in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm text-text">Two-factor sign-in</span>
          <p className="mt-0.5 text-xs text-text-3">
            {enabled
              ? "On. Signing in with your password also needs a code we email you."
              : "Off. Turn on to need a code from your email as well as your password, so a leaked password alone can't get in."}
          </p>
        </div>
        <ToggleSwitch
          checked={pending ? pending === "enable" : enabled}
          onChange={(next) => (pending ? null : start(next))}
          label="Two-factor sign-in"
        />
      </div>

      {pending && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm(code);
          }}
          className="space-y-3 rounded-md border border-border bg-surface-2 p-3"
        >
          <p aria-live="polite" className="text-xs text-text-2">
            {flow.to ? (
              <>
                Enter the code we sent to <span className="u-mono text-text">{flow.to}</span> to turn it{" "}
                {pending === "enable" ? "on" : "off"}.
              </>
            ) : (
              "Sending a code to your email…"
            )}
          </p>
          <input
            aria-label="Code from your email"
            inputMode="numeric"
            autoComplete="one-time-code"
            spellCheck={false}
            value={code}
            onChange={(e) => {
              const next = cleanCode(e.target.value);
              setCode(next);
              if (next.length === 6) confirm(next);
            }}
            className="u-mono w-full max-w-[12rem] rounded-md border border-border-2 bg-surface px-3 py-2 text-sm tracking-[0.3em] text-text outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={flow.busy || code.length !== 6}>
              {flow.busy ? "Checking…" : pending === "enable" ? "Turn on" : "Turn off"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={flow.send}
              disabled={flow.cooldown > 0 || flow.sending}
              className="u-mono text-2xs text-text-2 hover:text-text disabled:text-text-3"
            >
              {flow.cooldown > 0 ? `resend in ${flow.cooldown}s` : "resend code"}
            </button>
          </div>
        </form>
      )}

      {flow.err && (
        <p role="alert" className="u-mono text-2xs text-negative">
          {flow.err}
        </p>
      )}
      {note && <p className="u-mono text-2xs text-positive">{note}</p>}
      <p className="text-2xs text-text-3">
        This stops someone who has your password. It can&apos;t stop someone already inside your email, so keep that
        account secure too.
      </p>
    </div>
  );
}
