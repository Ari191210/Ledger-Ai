"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PALETTE_IDS, PALETTE_META, applyPalette, getActivePalette, type PaletteId } from "@/lib/palette";

const PALETTE_DESC: Record<PaletteId, string> = {
  porcelain: "Deep obsidian base, warm cream ink, gold accents. The default.",
  ink:       "Cold black with soft blue-white ink and electric cyan highlights.",
  dusk:      "Deep violet with lavender ink and vivid purple accents.",
  moss:      "Dark forest base with pale sage ink and emerald accents.",
  rose:      "Near-black wine with blush ink and crimson-rose highlights.",
  storm:     "Muted navy-charcoal with steel ink and cool periwinkle accents.",
  ember:     "Black-amber base with warm parchment and burned-orange highlights.",
  sand:      "Dark warm brown with antique cream ink and brass-gold accents.",
};

export default function PersonalisePage() {
  const [active, setActive] = useState<PaletteId>("porcelain");

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

  const activeMeta = PALETTE_META[active];

  return (
    <div>
      <header className="mob-hp" style={{
        padding: "24px 44px", borderBottom: "1px solid var(--ink)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Personalise · Ledger</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: activeMeta.accent, flexShrink: 0 }} />
          <div className="mono" style={{ color: "var(--cinnabar-ink)" }}>{activeMeta.name} active</div>
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Colour Palette ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 14, marginBottom: 32 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
              Colour Palette
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500 }}>
                Choose your Ledger.
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>
                {PALETTE_IDS.length} themes · applies instantly
              </div>
            </div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, marginTop: 8 }}>
              Every theme is built around the same typographic system — only the colour values change. Switch freely; your choice is saved to this device.
            </p>
          </div>

          <div className="mob-2col" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1, background: "var(--rule)", border: "1px solid var(--rule)",
          }}>
            {PALETTE_IDS.map((p) => {
              const m = PALETTE_META[p];
              const isActive = active === p;
              return (
                <button
                  key={p}
                  onClick={() => pick(p)}
                  style={{
                    border: "none", margin: 0, padding: "24px 20px",
                    cursor: "pointer", background: m.paper,
                    display: "flex", flexDirection: "column", gap: 14,
                    position: "relative",
                    outline: isActive ? `2px solid ${m.accent}` : "2px solid transparent",
                    outlineOffset: -2, transition: "opacity 120ms",
                    width: "100%", textAlign: "left", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  {isActive && (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      background: m.accent, color: m.paper,
                      fontFamily: "var(--mono)", fontSize: 8,
                      letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 7px",
                    }}>
                      Active
                    </div>
                  )}

                  {/* Mini screen preview */}
                  <div style={{
                    width: "100%", aspectRatio: "4/3", background: m.paper,
                    border: `1px solid ${m.rule}`, borderRadius: 2,
                    padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5,
                    overflow: "hidden", boxSizing: "border-box",
                  }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <div style={{ width: 22, height: 3, background: m.accent, borderRadius: 1, opacity: 0.9 }} />
                      <div style={{ flex: 1 }} />
                      <div style={{ width: 8, height: 3, background: m.ink, borderRadius: 1, opacity: 0.2 }} />
                      <div style={{ width: 8, height: 3, background: m.ink, borderRadius: 1, opacity: 0.2 }} />
                    </div>
                    <div style={{ height: 1, background: m.rule }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                      <div style={{ width: "75%", height: 5, background: m.ink, borderRadius: 1, opacity: 0.8 }} />
                      <div style={{ width: "55%", height: 3, background: m.ink, borderRadius: 1, opacity: 0.35 }} />
                      <div style={{ width: "65%", height: 3, background: m.ink, borderRadius: 1, opacity: 0.35 }} />
                      <div style={{ width: "45%", height: 3, background: m.ink, borderRadius: 1, opacity: 0.25 }} />
                    </div>
                    <div style={{ marginTop: "auto", display: "flex", gap: 5 }}>
                      <div style={{ width: 30, height: 10, background: m.accent, borderRadius: 1, opacity: 0.9 }} />
                      <div style={{ width: 20, height: 10, background: m.ink, borderRadius: 1, opacity: 0.12 }} />
                    </div>
                  </div>

                  {/* Swatches + rule swatch */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: m.accent, flexShrink: 0 }} />
                    <div style={{ width: 13, height: 13, borderRadius: "50%", background: m.ink, opacity: 0.7, flexShrink: 0 }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.ink, opacity: 0.22, flexShrink: 0 }} />
                    <div style={{ flex: 1 }} />
                    <div style={{ width: 28, height: 2, background: m.rule, borderRadius: 1 }} />
                  </div>

                  {/* Name + description */}
                  <div>
                    <div style={{
                      fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17,
                      fontWeight: 500, color: m.ink, marginBottom: 5, letterSpacing: "-0.01em",
                    }}>
                      {m.name}
                    </div>
                    <div style={{
                      fontFamily: "var(--mono)", fontSize: 9, color: m.ink,
                      opacity: 0.42, lineHeight: 1.55,
                    }}>
                      {PALETTE_DESC[p]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-3)", marginTop: 14 }}>
            All eight themes use the same OKLCH colour token system — the full WebGL shader, glassmorphism panels, and typography adapt to each one automatically.
          </p>
        </div>

        {/* ── Coming soon ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 14, marginBottom: 24 }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Coming Soon</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 500 }}>More personalisation, on the roadmap.</div>
          </div>
          <div className="mob-col" style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1, background: "var(--rule)", border: "1px solid var(--rule)",
          }}>
            {[
              { ttl: "Font Size", sub: "Compact / Default / Comfortable reading density across all tools.", note: "Q3 2026" },
              { ttl: "Dashboard Layout", sub: "Choose which widgets appear on your dashboard and in what order.", note: "Q3 2026" },
              { ttl: "Cloud Sync", sub: "Your theme and layout settings follow you to every device automatically.", note: "Q4 2026" },
            ].map((c, i) => (
              <div key={i} style={{ padding: "22px 20px", background: "color-mix(in srgb, var(--ink) 3%, var(--paper-2))" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, fontWeight: 500, color: "var(--ink)", marginBottom: 8 }}>{c.ttl}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, marginBottom: 16 }}>{c.sub}</div>
                <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", borderTop: "1px solid var(--rule)", paddingTop: 10 }}>{c.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
