"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SplitLayout } from "@/components/auth/split-layout";

function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/auth/reset/confirm`,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="u-led" />
        <span className="u-brand text-lg text-text">StudyLedger</span>
      </div>

      <span className="u-label">reset password</span>
      <h1 className="mt-2 text-xl font-bold text-text">Forgot your password?</h1>
      <p className="mt-1 text-sm text-text-2">
        Enter your account email — we&apos;ll send a link to set a new one.
      </p>

      {sent ? (
        <p className="u-mono mt-6 text-2xs text-positive">
          If an account exists for that email, a reset link is on its way. Check your inbox
          (and spam folder).
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="u-label">email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </label>

          {err && <p className="u-mono text-2xs text-negative">{err}</p>}

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "…" : "Send reset link"}
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="mt-4 inline-block u-mono text-2xs text-text-2 hover:text-text"
      >
        Back to sign in
      </Link>
    </div>
  );
}

export default function ResetRequestPage() {
  return (
    <SplitLayout form="sm">
      <ResetRequestForm />
    </SplitLayout>
  );
}
