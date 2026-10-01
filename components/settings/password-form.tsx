"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BREACHED_MESSAGE, MIN_PASSWORD_LENGTH, isBreachedPassword, passwordProblem } from "@/lib/auth/password";

/**
 * The checks here are for a quick answer only; the server (/api/account/password)
 * runs the same rules again and is the one that counts. It also checks the
 * current password without replacing this session, and signs out every other
 * device once the password has changed.
 */
export function PasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setErr(j?.error ?? "Couldn't update the password. Check your connection and try again.");

    setCurrent("");
    setNext("");
    setConfirm("");
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
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
      {err && <p role="alert" className="u-mono text-2xs text-negative">{err}</p>}
      {saved && <p className="u-mono text-2xs text-positive">password updated. Other devices were signed out.</p>}
      <Button type="submit" size="sm" variant="secondary" disabled={busy}>
        {busy ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
