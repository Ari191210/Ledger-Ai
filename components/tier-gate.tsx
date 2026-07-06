"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { hasAccess, normalizeTier, TIER_LABELS, type TierRequirement } from "@/lib/tier";

interface TierGateProps {
  requires: TierRequirement;
  children: React.ReactNode;
  /** Optional one-liner naming what's locked, e.g. "Past paper practice". */
  feature?: string;
}

const TIER_PITCH: Record<"pro" | "max", { headline: string; points: string[] }> = {
  pro: {
    headline: "Part of the Pro ledger.",
    points: [
      "All 48 tools unlocked",
      "Unlimited AI requests",
      "Unlimited syllabus uploads",
      "Score history & analytics",
    ],
  },
  max: {
    headline: "Part of the Max ledger.",
    points: [
      "Everything in Pro",
      "Personalised AI tutor sessions",
      "Parent & guardian dashboard",
      "Score projections & exam forecast",
    ],
  },
};

// Gates a tool (or a tab within one) behind a plan. Renders children freely
// until enforcement activates — see TIER_ENFORCEMENT_DATE in lib/tier.ts.
export default function TierGate({ requires, children, feature }: TierGateProps) {
  const { user, loading } = useAuth();

  if (hasAccess(user, requires)) return <>{children}</>;

  // Enforced and (still resolving auth, or under-tiered): never flash the
  // locked content. While auth resolves, hold a quiet placeholder.
  if (loading) return <div aria-hidden style={{ minHeight: 320 }} />;

  const need  = normalizeTier(requires);
  const pitch = TIER_PITCH[need === "max" ? "max" : "pro"];

  return (
    <main className="mob-p" style={{ padding: "60px 44px 80px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ border: "1px solid var(--ink)", padding: "44px 40px" }}>
        <div className="mono cin" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          {TIER_LABELS[need]} feature · locked
        </div>
        <h2 style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 500, fontSize: "clamp(28px, 4.5vw, 40px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: 0 }}>
          {pitch.headline}
        </h2>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)", margin: "14px 0 0", maxWidth: 480 }}>
          {feature ? `${feature} is` : "This is"} part of the {TIER_LABELS[need]} plan. Your work here — scores, history, streaks — starts counting the moment you upgrade.
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: "28px 0 0", borderTop: "1px solid var(--rule)" }}>
          {pitch.points.map(p => (
            <li key={p} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)" }}>
              <span className="mono cin" style={{ fontSize: 10 }}>✓</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 13.5, color: "var(--ink)" }}>{p}</span>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 32, flexWrap: "wrap" }}>
          <Link
            href="/pricing"
            className="btn"
            style={{ background: "var(--ink)", color: "var(--paper)", padding: "12px 24px", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", border: "1px solid var(--ink)" }}
          >
            Upgrade to {TIER_LABELS[need]} →
          </Link>
          <Link
            href="/pricing"
            style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", textDecoration: "none", borderBottom: "1px solid var(--rule)", paddingBottom: 2 }}
          >
            Compare plans
          </Link>
        </div>
      </div>
    </main>
  );
}
