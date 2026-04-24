"use client";
import Link from "next/link";
import { useAuth } from "./auth-provider";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--paper)" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Loading…</div>
    </div>
  );

  if (!user) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 20, background: "var(--paper)", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 36, letterSpacing: "-0.02em" }}>
        Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "var(--ink-2)" }}>
        Sign in to continue.
      </div>
      <Link href="/auth" className="btn">Sign in →</Link>
    </div>
  );

  return <>{children}</>;
}
