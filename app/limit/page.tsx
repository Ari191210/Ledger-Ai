"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LimitPage() {
  const [hoursLeft, setHoursLeft] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    setHoursLeft(Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000));
  }, []);

  return (
    <main style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 480, padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 20 }}>
          Daily limit reached
        </div>

        <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 900, letterSpacing: "0.04em", lineHeight: 0.9, color: "var(--ink)", marginBottom: 24 }}>
          20
        </div>

        <p style={{ fontFamily: "var(--prose)", fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 8 }}>
          You&apos;ve queried the ledger 20 times today.
        </p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em", marginBottom: 40 }}>
          Resets at midnight
          {hoursLeft !== null ? ` · ${hoursLeft}h away` : ""}
        </p>

        <div style={{ borderTop: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", paddingTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
            In the meantime
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              ["Dashboard", "/dashboard"],
              ["Study Rooms", "/tools/rooms"],
              ["Your Notes", "/tools/notes"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--cinnabar-ink)",
                  textDecoration: "none",
                  border: "1px solid color-mix(in srgb, var(--cinnabar) 40%, transparent)",
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "color-mix(in srgb, var(--cinnabar) 5%, transparent)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {label} →
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ marginTop: 48, padding: "20px 24px" }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>Coming October 2026</p>
          <p style={{ fontFamily: "var(--prose)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)", margin: 0 }}>
            Pro plans with unlimited AI queries. Free tier stays at 20/day.
          </p>
        </div>
      </div>
    </main>
  );
}
