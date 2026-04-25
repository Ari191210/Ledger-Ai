"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode,     setMode]     = useState<"signin" | "signup">("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  async function submit() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true); setError("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setDone(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.push("/dashboard");
    }
    setLoading(false);
  }

  const inp = (value: string, onChange: (v: string) => void, placeholder: string, type = "text") => (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => e.key === "Enter" && submit()}
      style={{
        width: "100%", fontFamily: "var(--sans)", fontSize: 14,
        border: "1px solid var(--ink)", background: "var(--paper-2)",
        padding: "12px 14px", color: "var(--ink)", outline: "none",
      }}
    />
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>Check your email.</div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 12, lineHeight: 1.6 }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
        </p>
        <button className="btn" style={{ marginTop: 20 }} onClick={() => { setDone(false); setMode("signin"); }}>
          Back to sign in
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
          </span>
        </Link>
        <div className="mono mob-hide" style={{ color: "var(--ink-3)" }}>The Student&apos;s Operating System</div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Mode toggle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--ink)", marginBottom: 32 }}>
            {(["signin", "signup"] as const).map((m, i) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ padding: "12px 0", background: mode === m ? "var(--ink)" : "var(--paper)", color: mode === m ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: i === 0 ? "1px solid var(--ink)" : "none", cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13 }}>
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 24 }}>
            {mode === "signin" ? "Welcome back." : "Start your ledger."}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mode === "signup" && inp(name, setName, "Your name (optional)")}
            {inp(email, setEmail, "Email address", "email")}
            {inp(password, setPassword, "Password (min 6 characters)", "password")}
          </div>

          {error && (
            <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>
          )}

          <button className="btn" onClick={submit} disabled={loading || !email.trim() || !password.trim()}
            style={{ marginTop: 20, width: "100%", justifyContent: "center", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in →" : "Create account →"}
          </button>

          {mode === "signin" && (
            <div style={{ marginTop: 16, fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", textAlign: "center" }}>
              No account?{" "}
              <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>
                Create one free
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
