"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PALETTE_IDS, PALETTE_META, applyPalette, getActivePalette, type PaletteId } from "@/lib/palette";
import { getDensity, applyDensity, type Density } from "@/lib/density";
import { getDashLayout, saveDashLayout, type DashLayout, type DashSection, DASH_DEFAULTS } from "@/lib/dash-layout";

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

const DENSITY_OPTIONS: { id: Density; label: string; desc: string; size: number; line: number; gap: number }[] = [
  { id: "compact",     label: "Compact",     desc: "Space-efficient. More content on screen.",        size: 12, line: 1.5,  gap: 14 },
  { id: "default",     label: "Default",     desc: "Balanced. The original Ledger reading experience.", size: 14, line: 1.65, gap: 18 },
  { id: "comfortable", label: "Comfortable", desc: "Generous spacing. Easier on the eyes over time.",  size: 16, line: 1.85, gap: 22 },
];

const LAYOUT_SECTIONS: { id: DashSection; label: string; desc: string }[] = [
  { id: "recommendation", label: "Daily Recommendation", desc: "Surfaces the #1 weak topic you should practice right now." },
  { id: "recent",         label: "Recently Used",        desc: "Your last 8 tools at a glance — one click to return." },
  { id: "score",          label: "Ledger Score™",        desc: "Your real-time exam readiness score with next actions." },
  { id: "exams",          label: "Exam Schedule",        desc: "Add upcoming exams and get weekly progress emails." },
  { id: "features",       label: "Features Showcase",    desc: "Highlights what makes Ledger different from everything else." },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? "var(--ink)" : "var(--rule)",
        position: "relative", transition: "background 200ms", padding: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: on ? 19 : 3,
        width: 14, height: 14,
        background: on ? "var(--paper)" : "var(--ink-3)",
        borderRadius: "50%", transition: "left 200ms, background 200ms",
      }} />
    </button>
  );
}

export default function PersonalisePage() {
  const [active,   setActive]   = useState<PaletteId>("porcelain");
  const [density,  setDensity]  = useState<Density>("default");
  const [layout,   setLayout]   = useState<DashLayout>(DASH_DEFAULTS);

  useEffect(() => {
    setActive(getActivePalette());
    setDensity(getDensity());
    setLayout(getDashLayout());

    const onPalette = (e: Event) => setActive((e as CustomEvent<PaletteId>).detail);
    const onDensity = (e: Event) => setDensity((e as CustomEvent<Density>).detail);
    window.addEventListener("ledger-palette", onPalette);
    window.addEventListener("ledger-density", onDensity);
    return () => {
      window.removeEventListener("ledger-palette", onPalette);
      window.removeEventListener("ledger-density", onDensity);
    };
  }, []);

  function pick(p: PaletteId) { setActive(p); applyPalette(p); }

  function pickDensity(d: Density) { setDensity(d); applyDensity(d); }

  function toggleSection(id: DashSection) {
    const next = { ...layout, [id]: !layout[id] };
    setLayout(next);
    saveDashLayout(next);
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

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: m.accent, flexShrink: 0 }} />
                    <div style={{ width: 13, height: 13, borderRadius: "50%", background: m.ink, opacity: 0.7, flexShrink: 0 }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.ink, opacity: 0.22, flexShrink: 0 }} />
                    <div style={{ flex: 1 }} />
                    <div style={{ width: 28, height: 2, background: m.rule, borderRadius: 1 }} />
                  </div>

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

        {/* ── Reading Density ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 14, marginBottom: 24 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
              Reading Density
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500 }}>
                How dense should the text feel?
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>
                applies to all AI output
              </div>
            </div>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1, background: "var(--rule)", border: "1px solid var(--rule)",
          }}>
            {DENSITY_OPTIONS.map((opt) => {
              const isActive = density === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => pickDensity(opt.id)}
                  style={{
                    border: "none", margin: 0, padding: "28px 24px",
                    cursor: "pointer", background: "var(--paper-2)",
                    display: "flex", flexDirection: "column", gap: 20,
                    position: "relative", textAlign: "left",
                    outline: isActive ? "2px solid var(--ink)" : "2px solid transparent",
                    outlineOffset: -2, transition: "opacity 120ms, outline-color 160ms",
                    width: "100%", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.opacity = "0.75"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  {isActive && (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      background: "var(--ink)", color: "var(--paper)",
                      fontFamily: "var(--mono)", fontSize: 8,
                      letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 7px",
                    }}>
                      Active
                    </div>
                  )}

                  {/* Live text preview */}
                  <div style={{
                    border: "1px solid var(--rule)", padding: "14px 16px",
                    background: "var(--paper)", minHeight: 88,
                    display: "flex", flexDirection: "column", gap: opt.gap,
                  }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: opt.size, lineHeight: opt.line, color: "var(--ink-2)" }}>
                      The Ledger reads your weak topics and surfaces what to study today. Not tomorrow.
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ height: 2, flex: 2, background: "var(--cinnabar)", opacity: 0.7 }} />
                      <div style={{ height: 2, flex: 3, background: "var(--rule)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
                      {opt.label}
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", lineHeight: 1.6 }}>
                      {opt.desc}
                    </div>
                  </div>

                  <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", borderTop: "1px solid var(--rule)", paddingTop: 10 }}>
                    {opt.size}px · {opt.line} leading
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Dashboard Layout ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 14, marginBottom: 24 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
              Dashboard Layout
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500 }}>
                Choose your command centre.
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>
                saved instantly
              </div>
            </div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, marginTop: 8 }}>
              Toggle which widgets appear on your dashboard. The Tools Archive and stats bar are always shown.
            </p>
          </div>

          <div style={{ border: "1px solid var(--rule)" }}>
            {LAYOUT_SECTIONS.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 24, padding: "18px 24px",
                  borderBottom: i < LAYOUT_SECTIONS.length - 1 ? "1px solid var(--rule)" : "none",
                  background: layout[s.id] ? "var(--paper-2)" : "var(--paper)",
                  transition: "background 200ms",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, fontWeight: 500, color: layout[s.id] ? "var(--ink)" : "var(--ink-3)", marginBottom: 3, transition: "color 200ms" }}>
                    {s.label}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    {s.desc}
                  </div>
                </div>
                <Toggle on={layout[s.id]} onToggle={() => toggleSection(s.id)} />
              </div>
            ))}
          </div>

          <p className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 12 }}>
            Changes take effect the next time you open the dashboard.
          </p>
        </div>

        {/* ── Cloud Sync — Coming Soon ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 14, marginBottom: 24 }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Coming Soon · Q4 2026</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500, color: "var(--ink-3)" }}>
              Cloud Sync.
            </div>
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: "28px 32px", background: "var(--paper-2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 480 }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 16 }}>
                Your palette, reading density, and dashboard layout will follow you to every device automatically — phone, tablet, new laptop. No setup required.
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {["Palette sync", "Density sync", "Dashboard layout"].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--rule)", border: "1px solid var(--ink-3)" }} />
                    <span className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", textAlign: "right", letterSpacing: "0.1em" }}>
              ON ROADMAP<br />Q4 2026
            </div>
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
