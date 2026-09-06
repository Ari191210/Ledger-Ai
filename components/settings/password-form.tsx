"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

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
    if (next.length < 8) return setErr("New password must be at least 8 characters.");
    if (next !== confirm) return setErr("New passwords don't match.");

    setBusy(true);
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

    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return setErr(error.message);

    setCurrent("");
    setNext("");
    setConfirm("");
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
        minLength={8}
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <PasswordInput
        label="confirm new password"
        required
        minLength={8}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {err && <p className="u-mono text-2xs text-negative">{err}</p>}
      {saved && <p className="u-mono text-2xs text-positive">password updated</p>}
      <Button type="submit" size="sm" variant="secondary" disabled={busy}>
        {busy ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
