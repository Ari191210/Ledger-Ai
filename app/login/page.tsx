"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SplitLayout } from "@/components/auth/split-layout";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next}` },
      });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      setMsg("Check your email to confirm your account, then sign in.");
      setMode("signin");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="u-led" />
        <span className="u-brand text-lg text-text">StudyLedger</span>
      </div>

      <span className="u-label">{mode === "signin" ? "sign in" : "sign up"}</span>
      <h1 className="mt-2 text-xl font-bold text-text">
        {mode === "signin" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-text-2">
        {mode === "signin"
          ? "Pick up where you left off."
          : "Start tracking what to fix next."}
      </p>

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
        <label className="block">
          <span className="u-label">password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </label>

        {err && <p className="u-mono text-2xs text-negative">{err}</p>}
        {msg && <p className="u-mono text-2xs text-positive">{msg}</p>}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setErr(null);
          setMsg(null);
        }}
        className="mt-4 u-mono text-2xs text-text-2 hover:text-text"
      >
        {mode === "signin"
          ? "No account? Create one"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SplitLayout form="sm">
        <LoginForm />
      </SplitLayout>
    </Suspense>
  );
}
