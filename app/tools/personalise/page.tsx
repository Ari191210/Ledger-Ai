"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BASE_IDS, BASE_META, ACCENT_IDS, ACCENT_META,
  applyTheme, getActiveBase, getActiveAccent, resolveTheme,
  type BaseId, type AccentId,
} from "@/lib/palette";
import { getDensity, applyDensity, type Density } from "@/lib/density";
import { getDashLayout, saveDashLayout, type DashLayout, type DashSection, DASH_DEFAULTS } from "@/lib/dash-layout";
import { FontPicker } from "./_font-picker";
import EditorialRange from "@/components/ui/editorial-range";

const DENSITY_OPTIONS: { id: Density; label: string; sub: string }[] = [
  { id: "compact",     label: "Compact",     sub: "More on screen" },
  { id: "default",     label: "Default",     sub: "Balanced" },
  { id: "comfortable", label: "Comfortable", sub: "Easy on long sessions" },
];

const LAYOUT_SECTIONS: { id: DashSection; label: string }[] = [
  { id: "recommendation", label: "Daily Recommendation" },
  { id: "recent",         label: "Recently Used" },
  { id: "score",          label: "Ledger Score™" },
  { id: "exams",          label: "Exam Schedule" },
  { id: "features",       label: "Features Showcase" },
];

const CARD = {
  background: "color-mix(in srgb, var(--ink) 5%, var(--paper))",
  border: "1px solid var(--rule)",
  borderRadius: 16,
  padding: "32px 36px",
  marginBottom: 32,
} as const;

const SH = (label: string, n: string, right?: string) => ({
  label, n, right,
});

function SectionHead({ n, label, right }: { n: string; label: string; right?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, borderBottom: "1px solid var(--rule)", paddingBottom: 16 }}>
      <div>
        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 8 }}>{n}</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, margin: 0, letterSpacing: "-0.02em" }}>{label}</h2>
      </div>
      {right && <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "right" }}>{right}</div>}
    </div>
  );
}

export default function PersonalisePage() {
  const [activeBase,   setActiveBase]   = useState<BaseId>("obsidian");
  const [activeAccent, setActiveAccent] = useState<AccentId>("cinnabar");
  const [density, setDensity] = useState<Density>("default");
  const [layout,  setLayout]  = useState<DashLayout>(DASH_DEFAULTS);
  const [radius,  setRadius]  = useState(12);
  const [width,   setWidth]   = useState<"narrow"|"medium"|"wide">("medium");
  const [speed,   setSpeed]   = useState<"reduced"|"normal"|"fast">("normal");

  useEffect(() => {
    setActiveBase(getActiveBase());
    setActiveAccent(getActiveAccent());
    setDensity(getDensity());
    setLayout(getDashLayout());
    const saved = localStorage.getItem("ledger-radius");
    if (saved) { const v = parseInt(saved); setRadius(v); document.documentElement.style.setProperty("--radius", v + "px"); }
    const savedW = localStorage.getItem("ledger-width") as "narrow"|"medium"|"wide" | null;
    if (savedW) setWidth(savedW);
    const savedS = localStorage.getItem("ledger-anim-speed") as "reduced"|"normal"|"fast" | null;
    if (savedS) setSpeed(savedS);
    const onT = (e: Event) => {
      const detail = (e as CustomEvent<{ base: BaseId; accent: AccentId }>).detail;
      setActiveBase(detail.base); setActiveAccent(detail.accent);
    };
    window.addEventListener("ledger-theme", onT);
    return () => window.removeEventListener("ledger-theme", onT);
  }, []);

  function pickBase(b: BaseId) { setActiveBase(b); applyTheme(b, activeAccent); }
  function pickAccent(a: AccentId) { setActiveAccent(a); applyTheme(activeBase, a); }
  function pickDensity(d: Density) { setDensity(d); applyDensity(d); }
  function toggleSection(id: DashSection) {
    const next = { ...layout, [id]: !layout[id] };
    setLayout(next); saveDashLayout(next);
  }
  function changeRadius(v: number) {
    setRadius(v);
    document.documentElement.style.setProperty("--radius", v + "px");
    localStorage.setItem("ledger-radius", String(v));
  }
  function changeWidth(w: typeof width) {
    setWidth(w);
    const map = { narrow: "860px", medium: "1100px", wide: "1400px" };
    document.documentElement.style.setProperty("--content-max", map[w]);
    localStorage.setItem("ledger-width", w);
  }
  function changeSpeed(s: typeof speed) {
    setSpeed(s);
    const map = { reduced: "0.4", normal: "1", fast: "1.8" };
    document.documentElement.style.setProperty("--anim-speed", map[s]);
    localStorage.setItem("ledger-anim-speed", s);
  }

  const activeTheme = resolveTheme(activeBase, activeAccent);

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* Studio bar */}
      <div style={{ borderBottom: "1px solid var(--rule)", padding: "0 44px", height: 48, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>Personalise · Ledger Studio</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeTheme.accent, boxShadow: `0 0 10px ${activeTheme.accent}99`, transition: "background 300ms" }} />
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--ink-2)" }}>{BASE_META[activeBase].name} · {ACCENT_META[activeAccent].name} · {density}</div>
        </div>
      </div>

      <div className="mob-p" style={{ padding: "0 44px 100px", maxWidth: 1200, margin: "0 auto" }}>

        {/* 01 · Colour */}
        <section style={{ paddingTop: 56, marginBottom: 8 }}>
          <div style={CARD}>
            <SectionHead n="01 · Colour" label="Make Ledger yours." right={`${BASE_IDS.length} themes × ${ACCENT_IDS.length} accents · applies instantly`} />

            {/* Base surface */}
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>☀ Light surfaces</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 28 }}>
              {BASE_IDS.filter(b => BASE_META[b].isLight).map((b) => {
                const bm = BASE_META[b];
                const isAct = activeBase === b;
                return (
                  <button key={b} onClick={() => pickBase(b)} style={{
                    border: "none", padding: 0, cursor: "pointer", textAlign: "left", background: "transparent",
                    outline: isAct ? `2px solid ${activeTheme.accent}` : "2px solid transparent",
                    outlineOffset: 2, borderRadius: 12, transition: "outline-color 180ms",
                  }}>
                    <div style={{ background: bm.paper, borderRadius: 12, padding: "18px 16px", minHeight: 92, position: "relative", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, color: bm.ink, lineHeight: 1, marginBottom: 8, letterSpacing: "-0.02em" }}>{bm.name}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: bm.ink, opacity: 0.38, lineHeight: 1.5 }}>{bm.description}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 10, alignItems: "center" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: bm.ink, opacity: 0.7 }} />
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: bm.ink2, opacity: 0.6 }} />
                        {isAct && <div style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 7, background: activeTheme.accent, color: bm.paper, padding: "2px 6px" }}>✓</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dark surfaces */}
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>☾ Dark surfaces</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 28 }}>
              {BASE_IDS.filter(b => !BASE_META[b].isLight).map((b) => {
                const bm = BASE_META[b];
                const isAct = activeBase === b;
                return (
                  <button key={b} onClick={() => pickBase(b)} style={{
                    border: "none", padding: 0, cursor: "pointer", textAlign: "left", background: "transparent",
                    outline: isAct ? `2px solid ${activeTheme.accent}` : "2px solid transparent",
                    outlineOffset: 2, borderRadius: 12, transition: "outline-color 180ms",
                  }}>
                    <div style={{ background: bm.paper, borderRadius: 12, padding: "18px 16px", minHeight: 92, position: "relative", overflow: "hidden" }}>
                      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, color: bm.ink, lineHeight: 1, marginBottom: 8, letterSpacing: "-0.02em" }}>{bm.name}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: bm.ink, opacity: 0.38, lineHeight: 1.5 }}>{bm.description}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 10, alignItems: "center" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: bm.ink, opacity: 0.7 }} />
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: bm.ink2, opacity: 0.6 }} />
                        {isAct && <div style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 7, background: activeTheme.accent, color: bm.paper, padding: "2px 6px" }}>✓</div>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Accent */}
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>◆ Accent</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {ACCENT_IDS.map((a) => {
                const am = ACCENT_META[a];
                const isAct = activeAccent === a;
                return (
                  <button key={a} onClick={() => pickAccent(a)} aria-label={am.name} title={am.name} style={{
                    border: "none", padding: 0, cursor: "pointer", background: "transparent",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: `linear-gradient(145deg, ${am.accent}, ${am.accentMid})`,
                      outline: isAct ? "2px solid var(--ink)" : "2px solid transparent",
                      outlineOffset: 3,
                      boxShadow: isAct ? `0 0 14px ${am.accent}80` : "0 1px 3px rgba(0,0,0,0.3)",
                      transition: "outline-color 150ms, box-shadow 150ms",
                    }} />
                    <div style={{ fontFamily: "var(--mono)", fontSize: 7, letterSpacing: "0.06em", textTransform: "uppercase", color: isAct ? "var(--ink)" : "var(--ink-3)" }}>{am.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 02 · Typography */}
        <FontPicker />

        {/* 03 · Density */}
        <section style={CARD}>
          <SectionHead n="03 · Reading Density" label="How should words feel?" right="affects all AI output" />
          <div style={{ display: "flex", gap: 8 }}>
            {DENSITY_OPTIONS.map(opt => {
              const isAct = density === opt.id;
              return (
                <button key={opt.id} onClick={() => pickDensity(opt.id)} style={{
                  flex: 1, padding: "16px 20px", border: `1px solid ${isAct ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                  borderRadius: 10, background: isAct ? "color-mix(in srgb, var(--cinnabar-ink) 8%, var(--paper))" : "transparent",
                  cursor: "pointer", textAlign: "left", transition: "border-color 150ms, background 150ms",
                }}>
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, color: isAct ? "var(--ink)" : "var(--ink-3)", marginBottom: 4 }}>{opt.label}</div>
                  <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 04 · Layout */}
        <section style={CARD}>
          <SectionHead n="04 · Layout" label="Shape your space." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {/* Radius */}
            <div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginBottom: 10, letterSpacing: "0.1em" }}>BORDER RADIUS · {radius}px</div>
              <EditorialRange
                startingValue={0}
                maxValue={24}
                defaultValue={radius}
                isStepped
                stepSize={1}
                leftIcon={<span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>0</span>}
                rightIcon={<span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>24</span>}
                onChange={changeRadius}
                showValue={false}
              />
            </div>
            {/* Width */}
            <div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginBottom: 10, letterSpacing: "0.1em" }}>CONTENT WIDTH</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["narrow","medium","wide"] as const).map(w => (
                  <button key={w} onClick={() => changeWidth(w)} style={{
                    flex: 1, padding: "8px 0", border: `1px solid ${width === w ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                    borderRadius: 6, background: width === w ? "color-mix(in srgb, var(--cinnabar-ink) 10%, var(--paper))" : "transparent",
                    fontFamily: "var(--mono)", fontSize: 8, color: width === w ? "var(--cinnabar-ink)" : "var(--ink-3)",
                    cursor: "pointer", textTransform: "capitalize", transition: "border-color 150ms, color 150ms, background 150ms",
                  }}>{w}</button>
                ))}
              </div>
            </div>
            {/* Speed */}
            <div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginBottom: 10, letterSpacing: "0.1em" }}>ANIMATION SPEED</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["reduced","normal","fast"] as const).map(s => (
                  <button key={s} onClick={() => changeSpeed(s)} style={{
                    flex: 1, padding: "8px 0", border: `1px solid ${speed === s ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                    borderRadius: 6, background: speed === s ? "color-mix(in srgb, var(--cinnabar-ink) 10%, var(--paper))" : "transparent",
                    fontFamily: "var(--mono)", fontSize: 8, color: speed === s ? "var(--cinnabar-ink)" : "var(--ink-3)",
                    cursor: "pointer", textTransform: "capitalize", transition: "border-color 150ms, color 150ms, background 150ms",
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 05 · Dashboard layout */}
        <section style={CARD}>
          <SectionHead n="05 · Dashboard Layout" label="Your command centre, your way." right={`${Object.values(layout).filter(Boolean).length}/${LAYOUT_SECTIONS.length} shown`} />
          <div style={{ border: "1px solid var(--rule)", borderRadius: 10, overflow: "hidden" }}>
            {LAYOUT_SECTIONS.map((s, i) => {
              const on = layout[s.id];
              return (
                <button key={s.id} onClick={() => toggleSection(s.id)} style={{
                  width: "100%", border: "none", margin: 0,
                  borderBottom: i < LAYOUT_SECTIONS.length - 1 ? "1px solid var(--rule)" : "none",
                  display: "flex", alignItems: "center", gap: 20, padding: "18px 24px",
                  background: on ? "color-mix(in srgb, var(--ink) 4%, var(--paper))" : "transparent",
                  cursor: "pointer", textAlign: "left", transition: "background 150ms",
                }}>
                  <div className="mono" style={{ fontSize: 8, color: on ? "var(--cinnabar-ink)" : "var(--ink-3)", width: 18, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ flex: 1, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, color: on ? "var(--ink)" : "var(--ink-3)" }}>{s.label}</div>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? "var(--cinnabar-ink)" : "var(--rule)", position: "relative", transition: "background 200ms", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 14, height: 14, borderRadius: "50%", background: on ? "#fff" : "var(--ink-3)", transition: "left 200ms cubic-bezier(0.22,1,0.36,1)" }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em" }}>Ledger Studio · {BASE_IDS.length}×{ACCENT_IDS.length} themes</div>
        </div>

      </div>
    </div>
  );
}
