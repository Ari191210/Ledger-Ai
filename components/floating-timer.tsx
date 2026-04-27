"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFocus, DURATIONS, MODE_LABELS } from "@/lib/focus-context";

export default function FloatingTimer() {
  const path = usePathname();
  const { mode, seconds, running, sessions, toggleRunning } = useFocus();
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    try { setEmbedded(window.self !== window.top); } catch { setEmbedded(true); }
  }, []);

  if (embedded) return null;
  if (path === "/tools/focus") return null;
  if (!running && seconds >= DURATIONS[mode]) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const progress = 1 - seconds / DURATIONS[mode];

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 999,
      background: "var(--ink)", color: "var(--paper)",
      minWidth: 164, boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
    }}>
      {/* Header row */}
      <div style={{ padding: "8px 12px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.55 }}>
          {MODE_LABELS[mode]}
        </span>
        <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
          <button onClick={toggleRunning}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--paper)", fontFamily: "var(--mono)", fontSize: 11, padding: "0 8px 0 0", opacity: 0.8, lineHeight: 1 }}>
            {running ? "⏸" : "▶"}
          </button>
          <Link href="/tools/focus"
            style={{ color: "var(--paper)", fontFamily: "var(--mono)", fontSize: 10, opacity: 0.5, textDecoration: "none", lineHeight: 1 }}>
            ↗
          </Link>
        </div>
      </div>

      {/* Timer */}
      <div style={{ padding: "8px 12px 6px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 38, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {mm}:{ss}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.45, marginTop: 3 }}>
          {sessions} session{sessions !== 1 ? "s" : ""} today
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.1)" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--cinnabar)", transition: "width 1s linear" }} />
      </div>
    </div>
  );
}
