"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BREACHED_MESSAGE, MIN_PASSWORD_LENGTH, isBreachedPassword, passwordProblem } from "@/lib/auth/password";

export function PasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // With two-factor on, re-checking the password drops the session to aal1 and
  // Supabase refuses a password change until a code lifts it back to aal2.
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    createClient()
      .auth.mfa.listFactors()
      .then(({ data }) => setFactorId(data?.totp?.find((f) => f.status === "verified")?.id ?? null));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    const rule = passwordProblem(next, email);
    if (rule) return setErr(rule);
    if (next !== confirm) return setErr("New passwords don't match.");

    setBusy(true);
    if (await isBreachedPassword(next)) {
      setErr(BREACHED_MESSAGE);
      setBusy(false);
      return;
    }
    const supabase = createClient();

    // Re-authenticate with the current password before changing it, a
    // session alone shouldn't be enough to lock the real owner out from a
    // shared or unattended device.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (verifyError) {
      setErr("Current password is incorrect.");
      setBusy(false);
      return;
    }

    if (factorId) {
      const { error: codeError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (codeError) {
        setErr("That authenticator code didn't work. Try the one showing now.");
        setBusy(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return setErr(error.message);

    setCurrent("");
    setNext("");
    setConfirm("");
    setCode("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PasswordInput
        label="current password"
        required
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <PasswordInput
        label="new password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <PasswordInput
        label="confirm new password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {factorId && (
        <label className="block">
          <span className="u-label">authenticator code</span>
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
      )}
      {err && <p role="alert" className="u-mono text-2xs text-negative">{err}</p>}
      {saved && <p className="u-mono text-2xs text-positive">password updated</p>}
      <Button type="submit" size="sm" variant="secondary" disabled={busy}>
        {busy ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
