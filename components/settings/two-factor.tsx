"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Enrolling = { factorId: string; qr: string; secret: string };

/**
 * Two-factor sign-in with an authenticator app (TOTP), from Settings.
 *
 * Turning it on is three steps in place: show the QR code, scan it, type the
 * code it shows. Nothing is switched on until that code verifies, so a student
 * who closes the page halfway through is left exactly as they were. Once on,
 * every new sign-in asks for a code, enforced on the server (lib/auth/mfa.ts).
 */
export function TwoFactor() {
  const [verifiedId, setVerifiedId] = useState<string | null | undefined>(undefined);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function refresh() {
    return createClient().auth.mfa.listFactors().then(({ data }) => {
      setVerifiedId(data?.totp?.find((f) => f.status === "verified")?.id ?? null);
    });
  }
  useEffect(() => {
    refresh();
  }, []);

  async function start() {
    setErr(null);
    setNote(null);
    setBusy(true);
    const supabase = createClient();
    // clear any half-finished setup left from an earlier attempt
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `StudyLedger ${Date.now()}` });
    setBusy(false);
    if (error || !data) return setErr(error?.message ?? "Couldn't start setup. Try again.");
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    setErr(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrolling.factorId, code: code.trim() });
    setBusy(false);
    if (error) return setErr("That code didn't match. Type the one showing in your app now.");
    setEnrolling(null);
    setCode("");
    setNote("two-factor is on");
    refresh();
  }

  async function turnOff() {
    if (!verifiedId) return;
    setBusy(true);
    setErr(null);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: verifiedId });
    setBusy(false);
    if (error) return setErr("Couldn't turn it off. Sign in again with your code, then retry.");
    setNote("two-factor is off");
    refresh();
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="u-label">two-factor sign-in</span>
        <p className="mt-1 text-sm text-text-2">
          {verifiedId
            ? "On. Every new sign-in asks for a code from your authenticator app."
            : "Off. Add a code from an authenticator app (Google Authenticator, Authy, 1Password) to every sign-in, so a leaked password alone can't open your account."}
        </p>
      </div>

      {enrolling ? (
        <form onSubmit={confirm} className="space-y-3">
          <div className="flex flex-wrap items-start gap-4">
            {/* Supabase returns the QR code as an SVG data URL; white ground so every app can read it */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolling.qr} alt="QR code to add StudyLedger to your authenticator app" width={160} height={160} className="rounded-md bg-white p-2" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-text-2">Scan this with your authenticator app, then type the 6-digit code it shows.</p>
              <p className="u-mono break-all text-2xs text-text-3">can&apos;t scan? enter this key: {enrolling.secret}</p>
            </div>
          </div>
          <label className="block">
            <span className="u-label">code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="u-mono mt-1.5 w-full max-w-[12rem] rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm tracking-[0.3em] text-text outline-none focus:border-accent"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy || code.length !== 6}>{busy ? "…" : "Turn on"}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setEnrolling(null); setCode(""); }}>Cancel</Button>
          </div>
        </form>
      ) : verifiedId === undefined ? null : verifiedId ? (
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={turnOff}>{busy ? "…" : "Turn off two-factor"}</Button>
      ) : (
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={start}>{busy ? "…" : "Set up two-factor"}</Button>
      )}

      {err && <p role="alert" className="u-mono text-2xs text-negative">{err}</p>}
      {note && <p className="u-mono text-2xs text-positive">{note}</p>}
    </div>
  );
}
