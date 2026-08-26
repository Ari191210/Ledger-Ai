"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Sign in, in the academic OS language.
//
// The three flows are carried over from the legacy page unchanged — email and
// password via Supabase, Google via the OAuth redirect, and the reset email
// through /api/auth/send-reset. Only the presentation is new; the auth logic
// is the part that must not be casually rewritten.
//
// The GSAP entrance from the legacy page is deliberately not carried over.
// A sign-in form is the last place that benefits from staggered motion, and
// Constitution §4 rules out animation that does not earn its place.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup" | "forgot";

export default function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode]         = useState<Mode>("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [checkInbox, setCheckInbox]   = useState(false);
  const [resetSent, setResetSent]     = useState(false);

  useEffect(() => {
    if (searchParams.get("forgot") === "1") setMode("forgot");
  }, [searchParams]);

  function signInWithGoogle() {
    setLoading(true);
    setError("");

    // State is generated and stored so the callback can verify the response
    // came from a request this browser actually made.
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
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("failed");
      setResetSent(true);
    } catch {
      setError("Could not send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (mode === "forgot") return sendReset();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() || undefined } },
        });
        if (error) throw error;
        // Supabase may require confirmation, so this does not assume a session.
        setCheckInbox(true);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const heading = mode === "signup" ? "Create your account"
    : mode === "forgot" ? "Reset your password"
    : "Sign in";

  return (
    <div data-os style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="os-bar">
        <div className="os-bar-inner">
          <Link href="/" className="os-wordmark">StudyLedger</Link>
          <div style={{ marginLeft: "auto" }}>
            <Link href="/journey" className="os-btn" data-variant="ghost" data-size="sm">
              Continue without an account
            </Link>
          </div>
        </div>
      </div>

      <main id="main-content" style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 20px 80px",
      }}>
        <div style={{ width: "100%", maxWidth: 396 }}>
          <h1 style={{
            fontSize: 27, fontWeight: 600, letterSpacing: "-0.025em",
            color: "var(--os-ink)", margin: "0 0 8px",
          }}>{heading}</h1>
          <p style={{
            fontSize: 14.5, lineHeight: 1.6, color: "var(--os-ink-3)", margin: "0 0 26px",
          }}>
            {mode === "forgot"
              ? "Enter the email on your account and we will send you a link."
              : "Signing in syncs your record across devices. StudyLedger works without an account too — nothing is locked behind this."}
          </p>

          {checkInbox ? (
            <div className="os-card">
              <h2 className="os-card-title" style={{ marginBottom: 6 }}>Check your inbox</h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--os-ink-3)", margin: 0 }}>
                We sent a confirmation link to <strong style={{ color: "var(--os-ink-2)" }}>{email}</strong>.
                Open it to finish creating your account.
              </p>
            </div>
          ) : resetSent ? (
            <div className="os-card">
              <h2 className="os-card-title" style={{ marginBottom: 6 }}>Reset link sent</h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--os-ink-3)", margin: 0 }}>
                If an account exists for <strong style={{ color: "var(--os-ink-2)" }}>{email}</strong>,
                a reset link is on its way.
              </p>
              <button className="os-btn" data-variant="ghost" data-size="sm"
                style={{ marginTop: 14, paddingLeft: 0 }}
                onClick={() => { setResetSent(false); setMode("signin"); }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <>
                  <button className="os-btn" style={{ width: "100%" }}
                    onClick={signInWithGoogle} disabled={loading}>
                    <GoogleMark /> Continue with Google
                  </button>
                  <div className="os-row" style={{ gap: 12, margin: "18px 0" }}>
                    <span style={{ flex: 1, height: 1, background: "var(--os-line)" }} />
                    <span style={{ fontSize: 12, color: "var(--os-ink-4)" }}>or</span>
                    <span style={{ flex: 1, height: 1, background: "var(--os-line)" }} />
                  </div>
                </>
              )}

              <form
                onSubmit={e => { e.preventDefault(); submit(); }}
                style={{ display: "grid", gap: 13 }}
              >
                {mode === "signup" && (
                  <label className="os-field">
                    <span className="os-field-label">Name</span>
                    <input className="os-input" value={name} autoComplete="name"
                      onChange={e => setName(e.target.value)} placeholder="Your name" />
                  </label>
                )}

                <label className="os-field">
                  <span className="os-field-label">Email</span>
                  <input className="os-input" type="email" value={email} autoComplete="email"
                    onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </label>

                {mode !== "forgot" && (
                  <label className="os-field">
                    <span className="os-field-label">Password</span>
                    <input className="os-input" type="password" value={password}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                      required />
                  </label>
                )}

                {error && (
                  <p style={{ fontSize: 13, color: "var(--os-risk)", margin: 0 }}>{error}</p>
                )}

                <button type="submit" className="os-btn" data-variant="primary" data-size="lg"
                  style={{ width: "100%", marginTop: 4 }} disabled={loading}>
                  {loading ? "Working…"
                    : mode === "signup" ? "Create account"
                    : mode === "forgot" ? "Send reset link"
                    : "Sign in"}
                </button>
              </form>

              <div className="os-row" style={{ marginTop: 18, gap: 14 }}>
                {mode === "signin" && (
                  <>
                    <button className="os-link" style={btnAsLink}
                      onClick={() => { setMode("signup"); setError(""); }}>
                      Create an account
                    </button>
                    <button className="os-link" style={{ ...btnAsLink, marginLeft: "auto" }}
                      onClick={() => { setMode("forgot"); setError(""); }}>
                      Forgot password
                    </button>
                  </>
                )}
                {mode !== "signin" && (
                  <button className="os-link" style={btnAsLink}
                    onClick={() => { setMode("signin"); setError(""); }}>
                    Back to sign in
                  </button>
                )}
              </div>
            </>
          )}

          <p className="os-basis" style={{ marginTop: 26 }}>
            By continuing you agree to the{" "}
            <Link href="/legal/terms" className="os-link">terms</Link> and{" "}
            <Link href="/legal/privacy" className="os-link">privacy policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}

const btnAsLink: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
};

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}
