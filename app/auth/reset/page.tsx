"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  async function updatePassword() {
    if (!password.trim() || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.replace("/dashboard"), 2000);
  }

  const inp = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <input
      type="password" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => e.key === "Enter" && updatePassword()}
      style={{
        width: "100%", fontFamily: "var(--sans)", fontSize: 14,
        border: "1px solid var(--ink)", background: "var(--paper-2)",
        padding: "12px 14px", color: "var(--ink)", outline: "none",
      }}
    />
  );

  if (hasSession === null) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-3)" }}>
      Verifying…
    </div>
  );

  if (!hasSession) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div className="gl-pane-alt" style={{ maxWidth: 400, width: "100%", textAlign: "center", padding: "40px 32px", border: "1px solid var(--rule)" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic" }}>Link expired.</div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 12, lineHeight: 1.6 }}>
          This reset link has expired or already been used. Request a new one.
        </p>
        <button className="btn" style={{ marginTop: 20 }} onClick={() => router.replace("/auth?forgot=1")}>
          Request new link
        </button>
      </div>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div className="gl-pane-alt" style={{ maxWidth: 400, width: "100%", textAlign: "center", padding: "40px 32px", border: "1px solid var(--rule)" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>Password updated.</div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 12 }}>
          Taking you to your dashboard…
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column" }}>
      <div className="gl-pane" style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)" }}>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div className="gl-pane-alt" style={{ width: "100%", maxWidth: 420, padding: "36px 32px", border: "1px solid var(--rule)" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", marginBottom: 8 }}>
            Set new password.
          </div>
          <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginBottom: 24 }}>
            Choose a strong password — at least 6 characters.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inp(password, setPassword, "New password")}
            {inp(confirm, setConfirm, "Confirm new password")}
          </div>

          {error && (
            <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>
          )}

          <button onClick={updatePassword} disabled={loading || !password.trim() || !confirm.trim()}
            style={{
              marginTop: 20, width: "100%", display: "block",
              background: loading || !password.trim() || !confirm.trim()
                ? "color-mix(in srgb, var(--ink) 40%, transparent)"
                : "var(--ink)",
              color: "var(--paper)", border: "1px solid var(--ink)",
              padding: "14px 0", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase", boxShadow: "none", borderRadius: 0,
              transition: "background 150ms ease",
            }}>
            {loading ? "Updating…" : "Update password →"}
          </button>
        </div>
      </div>
    </div>
  );
}
