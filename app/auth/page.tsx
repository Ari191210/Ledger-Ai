"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "../console/console.css";
import { supabase } from "@/lib/supabase";
import { loadUserData } from "@/lib/user-data";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

// Same font wiring as app/page.tsx (the landing page) — without these,
// --console-sans / --console-mono are undefined outside /console and the
// whole type system silently falls back to system-ui.
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--console-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--console-mono",
  display: "swap",
});

const LOOP_STEPS = [
  "A marked paper becomes an academic event.",
  "The session it belongs to gets found and finished.",
  "Every mistake is confirmed, never assumed.",
  "The record compounds — nothing in it is ever silently rewritten.",
];

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
    try {
      const res = await fetch("/api/auth/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send.");
    } catch {
      setError("Could not send reset email. Try again.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setResetSent(true);
  }

  // ── M5-3 — SIGNUP LEADS INTO ONBOARDING ───────────────────────────────────
  //
  // Architecture S.6: *"Signup → onboarding, `app/auth/page.tsx:80-91` —
  // signup never leads to `/onboard`, so profile is empty and personalisation
  // silently no-ops (R.1)."*
  //
  // The gap was not one missing redirect. Signup ended at the "check your
  // email" screen and stopped; the student then came back, signed IN, and sign
  // in went to `/home`. `/onboard` was reachable only from the landing page's
  // two CTAs, so a student who arrived by any other door never saw it — which
  // is why most real profiles are empty.
  //
  // Both doors are therefore fixed, not just the first:
  //
  //   · signup with email confirmation OFF returns a session, so the student
  //     is already signed in and goes straight to `/onboard`;
  //   · signup with confirmation ON still shows the confirmation screen — it
  //     is the honest state, and skipping it would strand the student on a
  //     screen they cannot act on — and the SIGN-IN path below now sends
  //     anyone who has not declared a board and subjects to `/onboard` first.
  //
  // Completion is derived from the profile, never from a stored flag alone:
  // the same rule as `isOnboarded()` in `lib/student-profile.ts`, with the
  // pre-M5 `onboardingDone` boolean still honoured for existing accounts.
  async function landingRouteFor(userId: string): Promise<string> {
    try {
      const ud = await loadUserData(userId);
      const declared =
        Boolean(ud?.board) && Array.isArray(ud?.interests) && ud.interests.length > 0;
      if (ud?.onboardingDone === true || declared) return "/home";
    } catch {
      /* fall through — `/onboard` bounces an already-declared student to /home */
    }
    return "/onboard";
  }

  async function submit() {
    if (mode === "forgot") { sendReset(); return; }
    if (!email.trim() || !password.trim()) return;
    setLoading(true); setError("");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data.session) { router.replace("/onboard"); return; }
      setDone(true);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.push(data.user ? await landingRouteFor(data.user.id) : "/home");
    }
    setLoading(false);
  }

  const inp = (value: string, onChange: (v: string) => void, placeholder: string, type = "text") => (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => e.key === "Enter" && submit()}
      className="auth-input"
      style={{
        background: "var(--g-3)",
        color: "var(--g-7)",
        borderColor: "var(--g-4)",
      }}
    />
  );

  const shellClass = `${sans.variable} ${mono.variable}`;

  if (resetSent) return (
    <main data-console className={shellClass}>
      <div className="auth-standalone">
        <div className="auth-standalone-card">
          <div className="auth-standalone-title">Check your inbox.</div>
          <p className="auth-standalone-body">
            We sent a password reset link to <strong>{email}</strong>. Click it to set a new password.
          </p>
          <button className="auth-btn auth-btn--primary" onClick={() => { setResetSent(false); setMode("signin"); }}>
            Back to sign in
          </button>
        </div>
      </div>
      <style jsx>{authStyles}</style>
    </main>
  );

  if (done) return (
    <main data-console className={shellClass}>
      <div className="auth-standalone">
        <div className="auth-standalone-card">
          <div className="auth-standalone-title">Check your email.</div>
          <p className="auth-standalone-body">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <button className="auth-btn auth-btn--primary" onClick={() => { setDone(false); setMode("signin"); }}>
            Back to sign in
          </button>
        </div>
      </div>
      <style jsx>{authStyles}</style>
    </main>
  );

  return (
    <main data-console className={shellClass}>
      <div className="auth-shell">
        <div className="auth-panel auth-panel--context">
          <div className="auth-context-top">
            <Link href="/" className="auth-wordmark">Ledger.</Link>
            <span className="c-label">The Student&apos;s Operating System</span>
          </div>

          <div className="auth-context-body">
            <div className="auth-context-title">Your mistakes are your syllabus.</div>
            <ol className="auth-loop">
              {LOOP_STEPS.map((step, i) => (
                <li key={step} className="auth-loop-item">
                  <span className="c-micro auth-loop-index">{String(i + 1).padStart(2, "0")}</span>
                  <span className="auth-loop-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <Link href="/" className="auth-context-back">← Back to studyledger.in</Link>
        </div>

        <div className="auth-panel auth-panel--form">
          <div ref={formRef} className="auth-card">
            {mode !== "forgot" && (
              <div className="auth-tabs c-rule" role="tablist">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => { setMode(m); setError(""); }}
                    className={`auth-tab ${mode === m ? "auth-tab--active" : ""}`}
                  >
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>
            )}

            <h1 className="auth-heading">
              {mode === "signin" ? "Welcome back." : mode === "signup" ? "Start your ledger." : "Reset password."}
            </h1>

            {mode === "forgot" ? (
              <>
                <p className="auth-subtext">
                  Enter your email and we&apos;ll send you a link to set a new password.
                </p>
                {inp(email, setEmail, "Email address", "email")}
                {error && <div className="auth-error">{error}</div>}
                <button
                  onClick={sendReset}
                  disabled={loading || !email.trim()}
                  className="auth-btn auth-btn--primary"
                >
                  {loading ? "Sending…" : "Send reset link →"}
                </button>
                <div className="auth-center">
                  <button onClick={() => { setMode("signin"); setError(""); }} className="auth-link-quiet">
                    ← Back to sign in
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="auth-fields">
                  {mode === "signup" && inp(name, setName, "Your name (optional)")}
                  {inp(email, setEmail, "Email address", "email")}
                  {inp(password, setPassword, "Password (min 6 characters)", "password")}
                </div>

                {mode === "signin" && (
                  <div className="auth-forgot">
                    <button onClick={() => { setMode("forgot"); setError(""); }} className="auth-link-quiet">
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && <div className="auth-error">{error}</div>}

                <button
                  onClick={submit}
                  disabled={loading || !email.trim() || !password.trim()}
                  className="auth-btn auth-btn--primary"
                >
                  {loading ? "Please wait…" : mode === "signin" ? "Sign in →" : "Create account →"}
                </button>

                <div className="auth-divider">
                  <span className="c-rule" />
                  <span className="c-micro">OR</span>
                  <span className="c-rule" />
                </div>

                <button onClick={signInWithGoogle} disabled={loading} className="auth-btn auth-btn--google">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {mode === "signin" && (
                  <div className="auth-center auth-signup-nudge">
                    No account?{" "}
                    <button onClick={() => setMode("signup")} className="auth-link">
                      Create one free
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <style jsx>{authStyles}</style>
    </main>
  );
}

const authStyles = `
  .auth-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
  }
  @media (max-width: 900px) {
    .auth-shell { grid-template-columns: 1fr; }
  }

  .auth-panel { display: flex; flex-direction: column; }

  .auth-panel--context {
    background: var(--g-1);
    padding: var(--s-6) var(--s-5);
    justify-content: space-between;
    border-right: 1px solid var(--g-4);
  }
  @media (max-width: 900px) {
    .auth-panel--context { display: none; }
  }

  .auth-context-top { display: flex; flex-direction: column; gap: var(--s-2); }

  .auth-wordmark {
    font-family: var(--type-interface);
    font-weight: 500;
    font-size: var(--t-title);
    color: var(--g-7);
    text-decoration: none;
    letter-spacing: -0.01em;
  }

  .auth-context-body { display: flex; flex-direction: column; gap: var(--s-5); max-width: 42ch; }

  .auth-context-title {
    font-family: var(--type-interface);
    font-weight: 500;
    font-size: var(--t-figure);
    line-height: 1.25;
    letter-spacing: -0.01em;
    color: var(--g-7);
  }

  .auth-loop { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-4); }

  .auth-loop-item { display: grid; grid-template-columns: 28px 1fr; gap: var(--s-2); align-items: baseline; }

  .auth-loop-index { color: var(--g-5); }

  .auth-loop-text {
    font-family: var(--type-interface);
    font-size: var(--t-body);
    line-height: 1.5;
    color: var(--g-6);
  }

  .auth-context-back {
    font-family: var(--type-instrument);
    font-size: var(--t-label);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--info);
    text-decoration: none;
    width: fit-content;
  }

  .auth-panel--form {
    align-items: center;
    justify-content: center;
    padding: var(--s-5);
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
  }

  .auth-tabs { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--g-4); border-radius: var(--r-control); overflow: hidden; margin-bottom: var(--s-5); }

  .auth-tab {
    padding: var(--control-pad-y) 0;
    min-height: 44px;
    background: var(--g-3) !important;
    color: var(--g-6) !important;
    border: none !important;
    font-family: var(--type-interface);
    font-weight: 500;
    font-size: var(--t-body);
    cursor: pointer;
    transition: background var(--m-fast) var(--ease-out), color var(--m-fast) var(--ease-out);
  }
  .auth-tab:not(:last-child) { border-right: 1px solid var(--g-4) !important; }
  .auth-tab--active { background: var(--g-7) !important; color: var(--g-0) !important; }

  .auth-heading {
    font-family: var(--type-interface);
    font-weight: 500;
    font-size: var(--t-figure);
    letter-spacing: -0.01em;
    color: var(--g-7);
    margin: 0 0 var(--s-4);
    text-wrap: balance;
  }

  .auth-subtext {
    font-family: var(--type-interface);
    font-size: var(--t-body);
    color: var(--g-6);
    line-height: 1.5;
    margin: 0 0 var(--s-4);
  }

  .auth-fields { display: flex; flex-direction: column; gap: var(--s-3); }

  :global(.auth-input) {
    width: 100%;
    font-family: var(--type-interface);
    font-size: var(--t-body);
    border: 1px solid var(--g-4) !important;
    border-radius: var(--r-control);
    background: var(--g-3) !important;
    color: var(--g-7) !important;
    padding: var(--control-pad-y) var(--s-3);
    min-height: 44px;
    outline: none;
    transition: border-color var(--m-fast) var(--ease-out);
  }
  :global(.auth-input:focus) { border-color: var(--g-7) !important; }
  :global(.auth-input::placeholder) { color: var(--g-5) !important; }

  .auth-forgot { display: flex; justify-content: flex-end; margin-top: var(--s-2); }

  .auth-error {
    margin-top: var(--s-3);
    font-family: var(--type-interface);
    font-size: var(--t-label);
    color: var(--error);
  }

  .auth-btn {
    margin-top: var(--s-4);
    width: 100%;
    min-height: 44px;
    border-radius: var(--r-control);
    cursor: pointer;
    transition: background var(--m-fast) var(--ease-out), opacity var(--m-fast) var(--ease-out);
  }
  .auth-btn:disabled { cursor: not-allowed; opacity: 0.5; }

  .auth-btn--primary {
    background: var(--g-7) !important;
    color: var(--g-0) !important;
    border: 1px solid var(--g-7) !important;
    padding: var(--control-pad-y) 0;
    font-family: var(--type-instrument);
    font-size: var(--t-label);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .auth-btn--primary:disabled {
    background: var(--g-5) !important;
    border-color: var(--g-5) !important;
  }

  .auth-btn--google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    background: var(--g-3) !important;
    color: var(--g-7) !important;
    border: 1px solid var(--g-4) !important;
    padding: var(--control-pad-y) 0;
    font-family: var(--type-interface);
    font-size: var(--t-body);
    font-weight: 500;
    margin-top: var(--s-2);
  }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin: var(--s-4) 0 var(--s-1);
  }
  .auth-divider .c-rule { flex: 1; }
  .auth-divider .c-micro { color: var(--g-5); }

  .auth-center { text-align: center; margin-top: var(--s-3); }

  .auth-signup-nudge {
    font-family: var(--type-interface);
    font-size: var(--t-body);
    color: var(--g-6);
  }

  .auth-link-quiet {
    background: none !important;
    border: none !important;
    padding: 0 !important;
    cursor: pointer;
    color: var(--g-6) !important;
    font-family: var(--type-interface);
    font-size: var(--t-label);
  }

  .auth-link {
    background: none !important;
    border: none !important;
    padding: 0 !important;
    cursor: pointer;
    color: var(--info) !important;
    font-family: var(--type-interface);
    font-size: var(--t-body);
    text-decoration: underline;
  }

  .auth-standalone {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--s-5);
  }

  .auth-standalone-card {
    max-width: 420px;
    width: 100%;
    text-align: center;
    padding: var(--s-5) var(--s-4);
    border: 1px solid var(--g-4);
    border-radius: var(--r-panel);
    background: var(--g-2);
  }

  .auth-standalone-title {
    font-family: var(--type-interface);
    font-weight: 500;
    font-size: var(--t-figure);
    color: var(--g-7);
  }

  .auth-standalone-body {
    font-family: var(--type-interface);
    font-size: var(--t-body);
    color: var(--g-6);
    line-height: 1.6;
    margin-top: var(--s-3);
  }
`;
