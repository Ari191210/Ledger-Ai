"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PALETTE_IDS, PALETTE_META, applyPalette, getActivePalette, type PaletteId } from "@/lib/palette";
import { getDensity, applyDensity, type Density } from "@/lib/density";
import { getDashLayout, saveDashLayout, type DashLayout, type DashSection, DASH_DEFAULTS } from "@/lib/dash-layout";

const PALETTE_DESC: Record<PaletteId, string> = {
  porcelain: "Obsidian + warm cream + amber gold",
  ink:       "Cold black + icy blue + electric cyan",
  dusk:      "Deep violet + lavender + vivid purple",
  moss:      "Forest dark + pale sage + emerald",
  rose:      "Wine black + blush + crimson rose",
  storm:     "Navy charcoal + steel + periwinkle",
  ember:     "Midnight amber + parchment + copper",
  sand:      "Warm brown + antique cream + brass",
};

const DENSITY_OPTIONS: {
  id: Density; label: string; sub: string; size: number; line: number;
}[] = [
  { id: "compact",     label: "Compact",     sub: "More on screen",           size: 12, line: 1.5  },
  { id: "default",     label: "Default",     sub: "Balanced",                 size: 14, line: 1.65 },
  { id: "comfortable", label: "Comfortable", sub: "Easier over long sessions", size: 16, line: 1.85 },
];

const SAMPLE_TEXT =
  `Your Ledger Score is built from three signals: the accuracy of your practice paper answers, how much of your syllabus you have actually covered, and whether you have been consistent over the last fourteen days. A student who has covered 40% of the syllabus with 80% accuracy outscores one who has covered 90% with 60% accuracy — because retention matters more than exposure.`;

const LAYOUT_SECTIONS: { id: DashSection; label: string; sub: string }[] = [
  { id: "recommendation", label: "Daily Recommendation", sub: "Your #1 weak topic to study right now" },
  { id: "recent",         label: "Recently Used",        sub: "Last 8 tools at a glance"              },
  { id: "score",          label: "Ledger Score™",        sub: "Real-time exam readiness card"         },
  { id: "exams",          label: "Exam Schedule",        sub: "Upcoming exams + weekly email"         },
  { id: "features",       label: "Features Showcase",    sub: "What makes Ledger different"           },
];

export default function PersonalisePage() {
  const [active,  setActive]  = useState<PaletteId>("porcelain");
  const [density, setDensity] = useState<Density>("default");
  const [layout,  setLayout]  = useState<DashLayout>(DASH_DEFAULTS);

  useEffect(() => {
    setActive(getActivePalette());
    setDensity(getDensity());
    setLayout(getDashLayout());
    const onP = (e: Event) => setActive((e as CustomEvent<PaletteId>).detail);
    const onD = (e: Event) => setDensity((e as CustomEvent<Density>).detail);
    window.addEventListener("ledger-palette", onP);
    window.addEventListener("ledger-density", onD);
    return () => {
      window.removeEventListener("ledger-palette", onP);
      window.removeEventListener("ledger-density", onD);
    };
  }, []);

  function pick(p: PaletteId)    { setActive(p);  applyPalette(p); }
  function pickDensity(d: Density){ setDensity(d); applyDensity(d); }
  function toggleSection(id: DashSection) {
    const next = { ...layout, [id]: !layout[id] };
    setLayout(next);
    saveDashLayout(next);
  }

  const m = PALETTE_META[active];
  const densityOpt = DENSITY_OPTIONS.find(d => d.id === density) ?? DENSITY_OPTIONS[1];

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Studio bar ── */}
      <div style={{
        borderBottom: "1px solid var(--rule)",
        padding: "0 44px",
        height: 48,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Personalise · Ledger Studio
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.accent, boxShadow: `0 0 10px ${m.accent}99`, flexShrink: 0, transition: "background 300ms, box-shadow 300ms" }} />
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--ink-2)", transition: "color 300ms" }}>
            {m.name} · {densityOpt.label}
          </div>
        </div>
      </div>

      <div className="mob-p" style={{ padding: "0 44px 100px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ══════════════════════════════════════════
            COLOUR PALETTE
        ══════════════════════════════════════════ */}
        <section style={{ paddingTop: 56, marginBottom: 72 }}>

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 8 }}>
                01 · Colour Palette
              </div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>
                Make Ledger yours.
              </h2>
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "right" }}>
              {PALETTE_IDS.length} themes<br />applies instantly
            </div>
          </div>

          {/* Palette grid — each card IS the theme */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
          }}>
            {PALETTE_IDS.map((p, idx) => {
              const pm     = PALETTE_META[p];
              const isAct  = active === p;
              return (
                <button
                  key={p}
                  onClick={() => pick(p)}
                  style={{
                    border: "none", padding: 0, cursor: "pointer",
                    display: "flex", flexDirection: "column",
                    background: "transparent",
                    outline: isAct ? `2px solid ${pm.accent}` : "2px solid transparent",
                    outlineOffset: 2,
                    transition: "outline-color 200ms, transform 200ms cubic-bezier(0.34,1.2,0.64,1)",
                    transform: isAct ? "scale(1.01)" : "scale(1)",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { if (!isAct) e.currentTarget.style.transform = "scale(1.02)"; }}
                  onMouseLeave={e => { if (!isAct) e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {/* Card body in the theme's own colours */}
                  <div style={{
                    background: pm.paper,
                    padding: "28px 24px 22px",
                    flex: 1,
                    display: "flex", flexDirection: "column",
                    minHeight: 200,
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {/* Top accent stripe */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: pm.accent }} />

                    {/* Index + active badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: pm.ink, opacity: 0.3, letterSpacing: "0.1em" }}>
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      {isAct && (
                        <div style={{
                          background: pm.accent, color: pm.paper,
                          fontFamily: "var(--mono)", fontSize: 7,
                          letterSpacing: "0.12em", textTransform: "uppercase",
                          padding: "2px 8px",
                        }}>
                          Active
                        </div>
                      )}
                    </div>

                    {/* Big theme name */}
                    <div style={{
                      fontFamily: "var(--serif)", fontStyle: "italic",
                      fontSize: 32, fontWeight: 500,
                      color: pm.ink, lineHeight: 0.95,
                      letterSpacing: "-0.02em",
                      flex: 1,
                    }}>
                      {pm.name}
                    </div>

                    {/* Description */}
                    <div style={{
                      fontFamily: "var(--mono)", fontSize: 8,
                      color: pm.ink, opacity: 0.38,
                      lineHeight: 1.55, marginTop: 14,
                    }}>
                      {PALETTE_DESC[p]}
                    </div>

                    {/* Colour swatches */}
                    <div style={{ display: "flex", gap: 5, marginTop: 18, alignItems: "center" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: pm.accent, flexShrink: 0 }} />
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: pm.ink, opacity: 0.85, flexShrink: 0 }} />
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: pm.ink, opacity: 0.35, flexShrink: 0 }} />
                      <div style={{ flex: 1 }} />
                      <div style={{ width: 24, height: 1, background: pm.rule }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-3)", marginTop: 16 }}>
            All eight themes share the same typographic system. The WebGL shader, glass panels, and every component adapt automatically.
          </p>
        </section>

        {/* ══════════════════════════════════════════
            READING DENSITY
        ══════════════════════════════════════════ */}
        <section style={{ marginBottom: 72 }}>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 8 }}>
                02 · Reading Density
              </div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>
                How should words feel?
              </h2>
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "right" }}>
              affects all AI output
            </div>
          </div>

          {/* Selector pills */}
          <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
            {DENSITY_OPTIONS.map(opt => {
              const isAct = density === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => pickDensity(opt.id)}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    border: "1px solid var(--rule)",
                    borderBottom: isAct ? "2px solid var(--ink)" : "1px solid var(--rule)",
                    background: isAct ? "var(--paper-2)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 180ms, border-color 180ms",
                  }}
                >
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, fontWeight: 500, color: isAct ? "var(--ink)" : "var(--ink-3)", marginBottom: 3, transition: "color 180ms" }}>
                    {opt.label}
                  </div>
                  <div className="mono" style={{ fontSize: 8, color: isAct ? "var(--ink-3)" : "var(--ink-3)", opacity: isAct ? 1 : 0.5 }}>
                    {opt.size}px · {opt.line} leading · {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live preview block */}
          <div style={{
            border: "1px solid var(--rule)",
            borderTop: "3px solid var(--cinnabar)",
            padding: "36px 40px",
            background: "var(--paper-2)",
            position: "relative",
          }}>
            <div className="mono" style={{ fontSize: 8, color: "var(--cinnabar-ink)", letterSpacing: "0.12em", marginBottom: 20 }}>
              PREVIEW · {densityOpt.label.toUpperCase()}
            </div>
            <p style={{
              fontFamily: "var(--sans)",
              fontSize: densityOpt.size,
              lineHeight: densityOpt.line,
              color: "var(--ink-2)",
              margin: 0,
              transition: "font-size 300ms ease, line-height 300ms ease",
              maxWidth: 720,
            }}>
              {SAMPLE_TEXT}
            </p>
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--rule-2)", display: "flex", gap: 24 }}>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>— Weak topics: <span style={{ color: "var(--cinnabar-ink)" }}>3 flagged</span></div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>— Ledger Score: <span style={{ color: "var(--ink)" }}>642 / 1000</span></div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            DASHBOARD LAYOUT
        ══════════════════════════════════════════ */}
        <section style={{ marginBottom: 72 }}>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 8 }}>
                03 · Dashboard Layout
              </div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>
                Your command centre, your way.
              </h2>
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "right" }}>
              {Object.values(layout).filter(Boolean).length} of {LAYOUT_SECTIONS.length} shown
            </div>
          </div>

          <div style={{ border: "1px solid var(--rule)" }}>
            {LAYOUT_SECTIONS.map((s, i) => {
              const on = layout[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSection(s.id)}
                  style={{
                    width: "100%", border: "none", margin: 0,
                    borderBottom: i < LAYOUT_SECTIONS.length - 1 ? "1px solid var(--rule)" : "none",
                    display: "flex", alignItems: "center", gap: 24,
                    padding: "20px 28px",
                    background: on ? "var(--paper-2)" : "var(--paper)",
                    cursor: "pointer", textAlign: "left",
                    transition: "background 200ms",
                  }}
                >
                  {/* Index */}
                  <div className="mono" style={{ fontSize: 9, color: on ? "var(--cinnabar-ink)" : "var(--ink-3)", width: 20, flexShrink: 0, transition: "color 200ms" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  {/* Label + sub */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, fontWeight: 500, color: on ? "var(--ink)" : "var(--ink-3)", transition: "color 200ms", marginBottom: 2 }}>
                      {s.label}
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", opacity: on ? 1 : 0.5, transition: "opacity 200ms" }}>
                      {s.sub}
                    </div>
                  </div>

                  {/* Toggle */}
                  <div
                    role="switch"
                    aria-checked={on}
                    style={{
                      width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                      background: on ? "var(--cinnabar)" : "var(--rule)",
                      position: "relative", transition: "background 220ms",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 3,
                      left: on ? 21 : 3,
                      width: 14, height: 14, borderRadius: "50%",
                      background: on ? "#fff" : "var(--ink-3)",
                      transition: "left 220ms cubic-bezier(0.34,1.2,0.64,1), background 220ms",
                    }} />
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 12 }}>
            Takes effect the next time you open the dashboard. The stats bar and tools archive are always visible.
          </p>
        </section>

        {/* ══════════════════════════════════════════
            CLOUD SYNC — COMING SOON
        ══════════════════════════════════════════ */}
        <section style={{ marginBottom: 40 }}>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
                04 · Cloud Sync · Q4 2026
              </div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, margin: 0, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--ink-3)" }}>
                Every device, one Ledger.
              </h2>
            </div>
          </div>

          <div style={{ border: "1px solid var(--rule)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--rule)" }}>
            {[
              { feat: "Palette",         note: "Your colour theme follows you across every sign-in." },
              { feat: "Reading density", note: "Font size preference synced to all your devices." },
              { feat: "Dashboard",       note: "Widget visibility settings saved to your account." },
            ].map((f, i) => (
              <div key={i} style={{ background: "var(--paper-2)", padding: "28px 24px" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, fontWeight: 500, color: "var(--ink-3)", marginBottom: 10 }}>
                  {f.feat}
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, opacity: 0.6 }}>
                  {f.note}
                </div>
                <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginTop: 20, opacity: 0.4 }}>On roadmap · Q4 2026</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em" }}>Ledger Studio · {PALETTE_IDS.length} themes</div>
        </div>

      </div>
    </div>
  );
}
