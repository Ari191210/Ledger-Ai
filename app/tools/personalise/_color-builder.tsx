"use client";

import { useState, useCallback } from "react";

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function darken([r, g, b]: [number, number, number], amount: number): string {
  return `#${[r, g, b].map(c => Math.max(0, Math.round(c * (1 - amount))).toString(16).padStart(2, "0")).join("")}`;
}

function lighten([r, g, b]: [number, number, number], amount: number): string {
  return `#${[r, g, b].map(c => Math.min(255, Math.round(c + (255 - c) * amount)).toString(16).padStart(2, "0")).join("")}`;
}

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function buildTokens(accent: string) {
  const rgb = hexToRgb(accent);
  if (!rgb) return null;
  const paper = darken(rgb, 0.96);
  const paper2 = darken(rgb, 0.93);
  const ink = lighten(rgb, 0.85);
  const ink2 = lighten(rgb, 0.55);
  const ink3 = lighten(rgb, 0.25);
  const accentMid = darken(rgb, 0.18);
  return { paper, paper2, ink, ink2, ink3, accent, accentMid, rgb };
}

function applyCustom(accent: string) {
  const t = buildTokens(accent);
  if (!t) return;
  const root = document.documentElement;
  root.style.setProperty("--paper", t.paper);
  root.style.setProperty("--paper-2", t.paper2);
  root.style.setProperty("--ink", t.ink);
  root.style.setProperty("--ink-2", t.ink2);
  root.style.setProperty("--ink-3", t.ink3);
  root.style.setProperty("--cinnabar-ink", t.accent);
  root.style.setProperty("--cinnabar", t.accentMid);
  root.style.setProperty("--rule", rgba(t.rgb, 0.18));
  root.style.setProperty("--rule-2", rgba(t.rgb, 0.07));
  root.style.setProperty("--page-glow-a", rgba(t.rgb, 0.20));
  root.style.setProperty("--page-glow-b", rgba(t.rgb, 0.10));
  root.style.setProperty("--highlight", rgba(t.rgb, 0.15));
  localStorage.setItem("palette", "custom");
  localStorage.setItem("palette-custom-accent", accent);
}

const QUICK_ACCENTS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#06b6d4",
  "#a855f7", "#f43f5e", "#10b981", "#f59e0b", "#64748b",
];

export function ColorBuilder() {
  const [hex, setHex] = useState("#6366f1");
  const [applied, setApplied] = useState(false);

  const tokens = buildTokens(hex);

  const apply = useCallback(() => {
    applyCustom(hex);
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  }, [hex]);

  const card = { background: "color-mix(in srgb, var(--ink) 5%, var(--paper))", border: "1px solid var(--rule)", borderRadius: 16, padding: "32px 36px", marginBottom: 32 } as const;

  return (
    <section style={card}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
        <div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 8 }}>05 · Custom Accent</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, margin: 0, letterSpacing: "-0.02em" }}>Build your own palette.</h2>
        </div>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>auto-generates all 12 tokens</div>
      </div>

      {/* Quick palette */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {QUICK_ACCENTS.map(c => (
          <button key={c} onClick={() => setHex(c)} style={{
            width: 28, height: 28, borderRadius: "50%", background: c,
            outline: hex === c ? "3px solid var(--ink)" : "3px solid transparent",
            outlineOffset: 2, cursor: "pointer", border: "none", padding: 0,
          }} />
        ))}
      </div>

      {/* Hex input + color swatch */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <input type="color" value={hex} onChange={e => setHex(e.target.value)}
          style={{ width: 44, height: 44, border: "1px solid var(--rule)", borderRadius: 8, cursor: "pointer", padding: 2, background: "transparent" }} />
        <input type="text" value={hex} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setHex(e.target.value); }}
          style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink)", background: "transparent", border: "1px solid var(--rule)", borderRadius: 8, padding: "10px 14px", width: 120, outline: "none" }} />
        <button onClick={apply} style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
          color: applied ? "var(--paper)" : "var(--cinnabar-ink)",
          background: applied ? "var(--cinnabar-ink)" : "transparent",
          border: "1px solid var(--cinnabar-ink)", borderRadius: 8, padding: "10px 20px",
          cursor: "pointer", transition: "color 200ms, background 200ms, border-color 200ms",
        }}>
          {applied ? "Applied ✓" : "Apply"}
        </button>
      </div>

      {/* Token preview */}
      {tokens && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {[
            { label: "Paper", color: tokens.paper },
            { label: "Paper 2", color: tokens.paper2 },
            { label: "Ink", color: tokens.ink },
            { label: "Ink 2", color: tokens.ink2 },
            { label: "Accent", color: tokens.accent },
            { label: "Accent Mid", color: tokens.accentMid },
          ].map(t => (
            <div key={t.label} style={{ textAlign: "center" }}>
              <div style={{ height: 40, borderRadius: 8, background: t.color, border: "1px solid var(--rule)", marginBottom: 6 }} />
              <div className="mono" style={{ fontSize: 7, color: "var(--ink-3)", letterSpacing: "0.06em" }}>{t.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
