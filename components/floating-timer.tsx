"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFocus, DURATIONS, MODE_LABELS } from "@/lib/focus-context";

export default function FloatingTimer() {
  const path     = usePathname();
  const { mode, seconds, running, sessions, toggleRunning } = useFocus();

  const [embedded,   setEmbedded]   = useState(false);
  const [minimised,  setMinimised]  = useState(false);
  const [dismissed,  setDismissed]  = useState(false);
  const prevRunning = useRef(false);

  useEffect(() => {
    try { setEmbedded(window.self !== window.top); } catch { setEmbedded(true); }
  }, []);

  // Re-surface the popup whenever a new timer session starts
  useEffect(() => {
    if (running && !prevRunning.current) {
      setDismissed(false);
      setMinimised(false);
    }
    prevRunning.current = running;
  }, [running]);

  if (embedded) return null;
  if (path === "/tools/focus-lab") return null;
  if (!running && seconds >= DURATIONS[mode]) return null;
  if (dismissed) return null;

  const mm  = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss  = String(seconds % 60).padStart(2, "0");
  const pct = (1 - seconds / DURATIONS[mode]) * 100;

  const btnStyle: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    color: "var(--paper)", opacity: 0.55, lineHeight: 1,
    padding: "2px 5px", fontFamily: "var(--mono)", fontSize: 11,
    display: "flex", alignItems: "center",
  };

  // ── Minimised chip ──────────────────────────────────────────────────────────
  if (minimised) {
    return (
      <div style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 999,
        background: "var(--ink)", color: "var(--paper)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", gap: 2,
        padding: "6px 10px",
      }}>
        {/* Tiny progress pip */}
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cinnabar)", opacity: running ? 1 : 0.3, marginRight: 6, flexShrink: 0 }} />

        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", lineHeight: 1 }}>
          {mm}:{ss}
        </span>

        <button onClick={toggleRunning} style={{ ...btnStyle, marginLeft: 6 }} title={running ? "Pause" : "Resume"}>
          {running ? "⏸" : "▶"}
        </button>

        <button onClick={() => setMinimised(false)} style={btnStyle} title="Expand">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="0.5" y="0.5" width="10" height="10" stroke="currentColor" strokeOpacity="0.55" />
            <rect x="2.5" y="2.5" width="6" height="6" stroke="currentColor" strokeOpacity="0.55" />
          </svg>
        </button>

        <button onClick={() => setDismissed(true)} style={btnStyle} title="Dismiss">
          ✕
        </button>
      </div>
    );
  }

  // ── Expanded popup ──────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 999,
      background: "var(--ink)", color: "var(--paper)",
      minWidth: 176, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 10px 6px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.45 }}>
          {MODE_LABELS[mode]}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <button onClick={toggleRunning} style={btnStyle} title={running ? "Pause" : "Resume"}>
            {running ? "⏸" : "▶"}
          </button>
          <Link href="/tools/focus-lab" style={{ ...btnStyle, textDecoration: "none", padding: "2px 6px" }} title="Open Focus">
            ↗
          </Link>
          {/* Minimise — collapse to chip */}
          <button onClick={() => setMinimised(true)} style={{ ...btnStyle, padding: "2px 6px" }} title="Minimise">
            —
          </button>
          {/* Dismiss — hide popup, timer keeps running */}
          <button onClick={() => setDismissed(true)} style={{ ...btnStyle, padding: "2px 6px" }} title="Dismiss">
            ✕
          </button>
        </div>
      </div>

      {/* Timer display */}
      <div style={{ padding: "8px 12px 10px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {mm}:{ss}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.4, marginTop: 4 }}>
          {sessions} session{sessions !== 1 ? "s" : ""} today
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.08)" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: "var(--cinnabar)", transition: "width 1s linear",
        }} />
      </div>
    </div>
  );
}
