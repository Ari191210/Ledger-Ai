"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

export default function AuthPage() {
  const router = useRouter();
  const [mode,     setMode]     = useState<"signin" | "signup" | "forgot">("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("forgot") === "1") setMode("forgot");
  }, [searchParams]);

  useGSAP(() => {
    if (!formRef.current) return;
    gsap.from(formRef.current.children, {
      opacity: 0, y: 18, duration: 0.55, stagger: 0.09, ease: "power3.out",
      clearProps: "opacity,transform",
    });
  }, { dependencies: [mode], revertOnUpdate: true });

  function signInWithGoogle() {
    setLoading(true); setError("");

    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem("google_oauth_state", state);

    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: "https://studyledger.in/auth/callback",
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async function sendReset() {
    if (!email.trim()) return;
    setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

  async function submit() {
    if (mode === "forgot") { sendReset(); return; }
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

  if (resetSent) return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div className="gl-pane-alt" style={{ maxWidth: 400, width: "100%", textAlign: "center", padding: "40px 32px", border: "1px solid var(--rule)" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>Check your inbox.</div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 12, lineHeight: 1.6 }}>
          We sent a password reset link to <strong>{email}</strong>. Click it to set a new password.
        </p>
        <button className="btn" style={{ marginTop: 20 }} onClick={() => { setResetSent(false); setMode("signin"); }}>
          Back to sign in
        </button>
      </div>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div className="gl-pane-alt" style={{ maxWidth: 400, width: "100%", textAlign: "center", padding: "40px 32px", border: "1px solid var(--rule)" }}>
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
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <div className="gl-pane" style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
          </span>
        </Link>
        <div className="mono mob-hide" style={{ color: "var(--ink-3)" }}>The Student&apos;s Operating System</div>
      </div>

      <div className="auth-outer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div ref={formRef} className="auth-card gl-pane-alt" style={{ width: "100%", maxWidth: 420, padding: "36px 32px", border: "1px solid var(--rule)" }}>
          {mode !== "forgot" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--ink)", marginBottom: 32 }}>
              {(["signin", "signup"] as const).map((m, i) => (
                <button key={m} onClick={() => { setMode(m); setError(""); }}
                  style={{ padding: "12px 0", background: mode === m ? "var(--ink)" : "var(--paper)", color: mode === m ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: i === 0 ? "1px solid var(--ink)" : "none", cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13 }}>
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
          )}

          <div className="auth-heading" style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 24 }}>
            {mode === "signin" ? "Welcome back." : mode === "signup" ? "Start your ledger." : "Reset password."}
          </div>

          {mode === "forgot" ? (
            <>
              <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginBottom: 20, lineHeight: 1.6 }}>
                Enter your email and we&apos;ll send you a link to set a new password.
              </div>
              {inp(email, setEmail, "Email address", "email")}
              {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
              <button onClick={sendReset} disabled={loading || !email.trim()}
                style={{
                  marginTop: 20, width: "100%", display: "block",
                  background: loading || !email.trim() ? "color-mix(in srgb, var(--ink) 40%, transparent)" : "var(--ink)",
                  color: "var(--paper)", border: "1px solid var(--ink)",
                  padding: "14px 0", cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
                  textTransform: "uppercase", boxShadow: "none", borderRadius: 0,
                  transition: "background 150ms ease",
                }}>
                {loading ? "Sending…" : "Send reset link →"}
              </button>
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button onClick={() => { setMode("signin"); setError(""); }}
                  style={{ background: "none", border: "none", boxShadow: "none", borderRadius: 0, padding: 0,
                    cursor: "pointer", color: "var(--ink-3)", fontFamily: "var(--sans)", fontSize: 13 }}>
                  ← Back to sign in
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mode === "signup" && inp(name, setName, "Your name (optional)")}
                {inp(email, setEmail, "Email address", "email")}
                {inp(password, setPassword, "Password (min 6 characters)", "password")}
              </div>

              {mode === "signin" && (
                <div style={{ marginTop: 8, textAlign: "right" }}>
                  <button onClick={() => { setMode("forgot"); setError(""); }}
                    style={{ background: "none", border: "none", boxShadow: "none", borderRadius: 0, padding: 0,
                      cursor: "pointer", color: "var(--ink-3)", fontFamily: "var(--sans)", fontSize: 12 }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>
              )}

              <button onClick={submit} disabled={loading || !email.trim() || !password.trim()}
                style={{
                  marginTop: 20, width: "100%", display: "block",
                  background: loading || !email.trim() || !password.trim() ? "color-mix(in srgb, var(--ink) 40%, transparent)" : "var(--ink)",
                  color: "var(--paper)", border: "1px solid var(--ink)",
                  padding: "14px 0", cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
                  textTransform: "uppercase", boxShadow: "none", borderRadius: 0,
                  transition: "background 150ms ease",
                }}>
                {loading ? "Please wait…" : mode === "signin" ? "Sign in →" : "Create account →"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 4px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
              </div>

              <button onClick={signInWithGoogle} disabled={loading}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: "var(--paper-2)", color: "var(--ink)", border: "1px solid var(--rule)",
                  padding: "12px 0", cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
                  boxShadow: "none", borderRadius: 0, marginTop: 8,
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {mode === "signin" && (
                <div style={{ marginTop: 16, fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", textAlign: "center" }}>
                  No account?{" "}
                  <button onClick={() => setMode("signup")}
                    style={{ background: "none", border: "none", boxShadow: "none", borderRadius: 0, padding: 0,
                      cursor: "pointer", color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>
                    Create one free
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
