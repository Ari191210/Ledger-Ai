"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function getMidnightCountdown(): string {
  const now  = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const ms = midnight.getTime() - now.getTime();
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  const s  = Math.floor((ms % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LimitPage() {
  const [countdown, setCountdown] = useState(getMidnightCountdown);

  useEffect(() => {
    const id = setInterval(() => setCountdown(getMidnightCountdown()), 1_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--paper)",
      color: "var(--ink)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 24px",
      textAlign: "center",
      gap: 32,
    }}>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em" }}>
        Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", color: "var(--ink)" }}>
          You've queried the ledger 20 times today.
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink-2)", fontStyle: "italic" }}>
          It resets at midnight.
        </div>
      </div>

      <div style={{
        border: "1px solid var(--ink)",
        padding: "20px 48px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.1em" }}>RESETS IN</div>
        <div className="mono" style={{ fontSize: 36, letterSpacing: "0.05em", color: "var(--ink)" }}>{countdown}</div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/tools" className="mono" style={{
          fontSize: 11,
          color: "var(--ink-3)",
          letterSpacing: "0.08em",
          textDecoration: "none",
          borderBottom: "1px solid var(--ink-3)",
          paddingBottom: 2,
        }}>
          ← back to tools
        </Link>
      </div>
    </div>
  );
}
