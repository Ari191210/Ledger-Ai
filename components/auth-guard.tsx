"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // The dashboard V2 flag rides in on ?v2=…, but the /auth redirect below (and
    // the hard-coded post-login redirects back to /dashboard) drop the query
    // string. Persist the flag here — before any redirect — so it survives login;
    // the dashboard flag router then reads it from localStorage. Temporary: goes
    // away with the flag at V2 cutover.
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has("v2")) localStorage.setItem("ledger-dash-v2", p.get("v2") === "0" ? "0" : "1");
    } catch {
      /* storage unavailable — flag simply won't stick */
    }
    if (!loading && !user) {
      // Preserve the intended destination (path + query) so login returns here —
      // e.g. /dashboard?v2=1 comes back intact instead of a bare /dashboard.
      const here = window.location.pathname + window.location.search;
      router.replace(`/auth?next=${encodeURIComponent(here)}`);
    }
  }, [user, loading, router]);

  if (loading || !user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--paper)" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Loading…</div>
    </div>
  );

  return <>{children}</>;
}
