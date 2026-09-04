"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SplitLayout } from "@/components/auth/split-layout";

function ResetConfirmForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="u-led" />
        <span className="u-brand text-lg text-text">StudyLedger</span>
      </div>

      <span className="u-label">reset password</span>
      <h1 className="mt-2 text-xl font-bold text-text">Set a new password</h1>

      {!ready ? (
        <p className="u-mono mt-6 text-2xs text-text-3">Checking your reset link…</p>
      ) : !hasSession ? (
        <>
          <p className="mt-1 text-sm text-text-2">
            This reset link is invalid or has expired.
          </p>
          <a
            href="/auth/reset"
            className="mt-4 inline-block u-mono text-2xs text-accent-strong hover:underline"
          >
            Request a new link
          </a>
        </>
      ) : done ? (
        <p className="u-mono mt-6 text-2xs text-positive">
          Password updated. Taking you to your dashboard…
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="u-label">new password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="u-label">confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </label>

          {err && <p className="u-mono text-2xs text-negative">{err}</p>}

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetConfirmPage() {
  return (
    <SplitLayout form="sm">
      <ResetConfirmForm />
    </SplitLayout>
  );
}
