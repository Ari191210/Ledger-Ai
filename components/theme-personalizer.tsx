"use client";

import { useState, useEffect } from "react";
import { PALETTE_IDS, PALETTE_META, applyPalette, getActivePalette, type PaletteId } from "@/lib/palette";

export default function ThemePersonalizer() {
  const [active, setActive] = useState<PaletteId>("ledger");

  useEffect(() => {
    setActive(getActivePalette());
    const handler = (e: Event) => setActive((e as CustomEvent<PaletteId>).detail);
    window.addEventListener("ledger-palette", handler);
    return () => window.removeEventListener("ledger-palette", handler);
  }, []);

  function pick(p: PaletteId) {
    setActive(p);
    applyPalette(p);
  }

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderBottom: "1px solid var(--rule)",
        paddingBottom: 14,
        marginBottom: 24,
      }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 500 }}>
          Personalise
        </div>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>
          {PALETTE_IDS.length} themes &middot; click to apply
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        background: "var(--rule)",
        border: "1px solid var(--rule)",
      }}>
        {PALETTE_IDS.map((p) => {
          const m = PALETTE_META[p];
          const isActive = active === p;
          return (
            <button
              key={p}
              onClick={() => pick(p)}
              style={{
                border: "none",
                margin: 0,
                padding: "20px 18px",
                cursor: "pointer",
                background: m.paper,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
                outline: isActive ? `2px solid ${m.accent}` : "2px solid transparent",
                outlineOffset: -2,
                transition: "opacity 120ms",
                width: "100%",
                textAlign: "left",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.opacity = "0.82"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              {isActive && (
                <div style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: m.accent,
                  color: m.paper,
                  fontFamily: "var(--mono)",
                  fontSize: 8,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                }}>
                  Active
                </div>
              )}

              {/* Mini screen preview */}
              <div style={{
                width: "100%",
                aspectRatio: "16/9",
                background: m.paper2,
                border: `1px solid ${m.rule}`,
                borderRadius: 2,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
                overflow: "hidden",
                boxSizing: "border-box",
              }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <div style={{ width: 28, height: 3, background: m.accent, borderRadius: 1, opacity: 0.9 }} />
                  <div style={{ flex: 1 }} />
                  <div style={{ width: 10, height: 3, background: m.ink, borderRadius: 1, opacity: 0.25 }} />
                  <div style={{ width: 10, height: 3, background: m.ink, borderRadius: 1, opacity: 0.25 }} />
                </div>
                <div style={{ height: 1, background: m.rule }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                  <div style={{ width: "70%", height: 4, background: m.ink, borderRadius: 1, opacity: 0.7 }} />
                  <div style={{ width: "50%", height: 3, background: m.ink, borderRadius: 1, opacity: 0.35 }} />
                  <div style={{ width: "60%", height: 3, background: m.ink2, borderRadius: 1, opacity: 0.35 }} />
                </div>
                <div style={{ marginTop: "auto", display: "flex", gap: 4 }}>
                  <div style={{ width: 24, height: 8, background: m.accent, borderRadius: 1, opacity: 0.85 }} />
                  <div style={{ width: 16, height: 8, background: m.ink, borderRadius: 1, opacity: 0.15 }} />
                </div>
              </div>

              {/* Swatches */}
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: m.accent, flexShrink: 0 }} />
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: m.ink, opacity: 0.7, flexShrink: 0 }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: m.ink2, opacity: 0.6, flexShrink: 0 }} />
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.ink3, opacity: 0.5, flexShrink: 0 }} />
              </div>

              <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: m.ink, opacity: 0.85 }}>
                {m.name}
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 10, color: m.ink, opacity: 0.45, lineHeight: 1.4 }}>
                {m.description}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic", color: "var(--ink-3)", marginTop: 12, marginBottom: 0 }}>
        Theme applies instantly and is saved to your device.
      </p>
    </section>
  );
}
