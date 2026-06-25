"use client";
import { useEffect, useState, useCallback, useRef } from "react";

const STEP_DURATION = 3800;

const SUBJECTS = ["Physics", "Chemistry", "Maths", "English", "Economics", "Biology"];

const PLAN_DAYS = [
  { d: "Mon", subj: "Physics",   pct: 0.7,  color: "var(--cinnabar-ink)" },
  { d: "Tue", subj: "Chemistry", pct: 0.55, color: "var(--powder-blue)" },
  { d: "Wed", subj: "Maths",     pct: 0.85, color: "var(--cream)" },
  { d: "Thu", subj: "Physics",   pct: 0.6,  color: "var(--cinnabar-ink)" },
  { d: "Fri", subj: "Economics", pct: 0.45, color: "var(--sage)" },
  { d: "Sat", subj: "Chemistry", pct: 0.8,  color: "var(--powder-blue)" },
  { d: "Sun", subj: "Revision",  pct: 0.5,  color: "var(--tan)" },
];

const SCORE_SIGNALS = [
  { label: "Past Papers",      pct: 62, color: "var(--cinnabar-ink)" },
  { label: "Syllabus covered", pct: 48, color: "var(--powder-blue)"  },
  { label: "Error correction", pct: 71, color: "var(--cream)"        },
  { label: "Daily streak",     pct: 55, color: "var(--sage)"         },
];

function UploadVisual({ visible }: { visible: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "32px 0" }}>
      <div
        style={{
          width: 200, padding: "28px 24px",
          background: "color-mix(in srgb, var(--cinnabar-ink) 10%, var(--paper))",
          border: "1.5px solid color-mix(in srgb, var(--cinnabar-ink) 35%, transparent)",
          borderRadius: 14, textAlign: "center",
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(-30px)",
          transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)", marginBottom: 4 }}>syllabus_class12.pdf</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>41 pages · 6 subjects</div>
      </div>

      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.4s ease 0.7s",
        }}
      >
        <div style={{ width: 2, height: 28, background: "var(--rule)" }} />
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--ink-3)",
        }}>
          Reading syllabus…
        </div>
        {/* shimmer bar */}
        <div
          style={{ width: 160, height: 4, borderRadius: 2, background: "var(--rule)", overflow: "hidden", marginTop: 4 }}
        >
          <ShimmerBar visible={visible} />
        </div>
      </div>
    </div>
  );
}

/** Looping shimmer via CSS animation injected once */
function ShimmerBar({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        width: 80, height: "100%",
        background: "var(--cinnabar-ink)", borderRadius: 2,
        opacity: visible ? 1 : 0,
        animation: visible ? "shimmer-slide 1.7s ease-in-out 0.9s infinite" : "none",
      }}
    />
  );
}

function ParseVisual({ visible }: { visible: boolean }) {
  return (
    <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 10, minHeight: 220, justifyContent: "center" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
        Chapters detected
      </div>
      {SUBJECTS.map((s, i) => (
        <div
          key={s}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateX(-20px)",
            transition: `opacity 0.4s ease ${i * 0.12}s, transform 0.4s ease ${i * 0.12}s`,
          }}
        >
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: i === 0 ? "var(--cinnabar-ink)" : i === 1 ? "var(--powder-blue)" : i === 2 ? "var(--cream)" : "var(--sage)",
            flexShrink: 0,
          }} />
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", flex: 1 }}>{s}</div>
          <div style={{ width: `${55 + i * 8}%`, maxWidth: 100, height: 3, background: "var(--rule)", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%", width: "100%", background: "var(--cinnabar-ink)", borderRadius: 2,
                transformOrigin: "left",
                transform: visible ? "scaleX(1)" : "scaleX(0)",
                transition: `transform 0.5s ease ${0.3 + i * 0.12}s`,
              }}
            />
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", width: 32, textAlign: "right" }}>
            {12 + i * 3}ch
          </div>
        </div>
      ))}
      <div
        style={{
          marginTop: 8, padding: "8px 14px", borderRadius: 8,
          background: "color-mix(in srgb, var(--sage) 15%, var(--paper))",
          border: "1px solid color-mix(in srgb, var(--sage) 30%, transparent)",
          fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.4s ease 0.9s",
        }}
      >
        ✓ 84 chapters · 3 exam dates · board auto-detected as CBSE
      </div>
    </div>
  );
}

function PlanVisual({ visible }: { visible: boolean }) {
  return (
    <div style={{ padding: "20px 0", minHeight: 220, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>
        This week — auto-generated
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {PLAN_DAYS.map((day, i) => (
          <div
            key={day.d}
            style={{
              transformOrigin: "bottom", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              opacity: visible ? 1 : 0,
              transform: visible ? "scaleY(1)" : "scaleY(0)",
              transition: `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
            }}
          >
            <div
              style={{
                width: "100%", borderRadius: 8,
                height: `${Math.round(day.pct * 80)}px`,
                background: `color-mix(in srgb, ${day.color} 30%, var(--paper))`,
                border: `1.5px solid color-mix(in srgb, ${day.color} 45%, transparent)`,
              }}
            />
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.06em" }}>{day.d}</div>
          </div>
        ))}
      </div>
      {PLAN_DAYS.slice(0, 3).map((day, i) => (
        <div
          key={`row-${i}`}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8,
            background: `color-mix(in srgb, ${day.color} 8%, var(--paper))`,
            border: `1px solid color-mix(in srgb, ${day.color} 20%, transparent)`,
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateX(-10px)",
            transition: `opacity 0.4s ease ${0.65 + i * 0.1}s, transform 0.4s ease ${0.65 + i * 0.1}s`,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: day.color, flexShrink: 0 }} />
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)", flex: 1 }}>{day.d} — {day.subj}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>{Math.round(day.pct * 3)}h</div>
        </div>
      ))}
    </div>
  );
}

function ScoreVisual({ visible }: { visible: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) { setCount(0); return; }
    const target = 316;
    let n = 0;
    const id = setInterval(() => {
      n = Math.min(n + 4, target);
      setCount(n);
      if (n >= target) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <div style={{ padding: "16px 0", minHeight: 220, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div
          style={{
            fontFamily: "var(--serif)", fontSize: "clamp(56px,8vw,80px)", fontWeight: 700, color: "var(--ink)", lineHeight: 1,
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "scale(0.6)",
            transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {count}
        </div>
        <div style={{ paddingBottom: 8 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>/1000</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--cinnabar-ink)", marginTop: 2 }}>Needs attention</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SCORE_SIGNALS.map((sig, i) => (
          <div
            key={sig.label}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              opacity: visible ? 1 : 0,
              transition: `opacity 0.4s ease ${0.4 + i * 0.1}s`,
            }}
          >
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", width: 120, flexShrink: 0 }}>{sig.label}</div>
            <div style={{ flex: 1, height: 4, background: "var(--rule)", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%", background: sig.color, borderRadius: 2,
                  width: `${sig.pct}%`,
                  transformOrigin: "left",
                  transform: visible ? "scaleX(1)" : "scaleX(0)",
                  transition: `transform 0.7s ease ${0.6 + i * 0.1}s`,
                }}
              />
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", width: 30, textAlign: "right" }}>{sig.pct}%</div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "10px 14px", borderRadius: 10, marginTop: 4,
          background: "color-mix(in srgb, var(--cinnabar-ink) 10%, var(--paper))",
          border: "1px solid color-mix(in srgb, var(--cinnabar-ink) 25%, transparent)",
          fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.4s ease 1.1s",
        }}
      >
        Top priority: complete 3 more past papers in Physics to lift your score by ~40 points.
      </div>
    </div>
  );
}

const STEPS = [
  { id: "upload", label: "01 — Upload",  heading: "Drop your syllabus",          sub: "PDF, photo, or text — any format",     visual: UploadVisual },
  { id: "parse",  label: "02 — Parse",   heading: "Ledger reads every chapter",   sub: "Subjects, chapters, exam dates — done", visual: ParseVisual  },
  { id: "plan",   label: "03 — Plan",    heading: "Your year, mapped in 6s",       sub: "Day-by-day schedule, auto-generated",   visual: PlanVisual   },
  { id: "score",  label: "04 — Score",   heading: "Your readiness score",          sub: "See exactly what to fix next",          visual: ScoreVisual  },
] as const;

export function ProductWalkthrough() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const prevActive = useRef(active);

  const advance = useCallback(() => {
    setActive(prev => (prev + 1) % STEPS.length);
    setProgress(0);
  }, []);

  useEffect(() => {
    setProgress(0);
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(elapsed / STEP_DURATION, 1);
      setProgress(pct);
      if (pct < 1) raf = requestAnimationFrame(tick);
      else advance();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, advance]);

  // Cross-fade the visual panel when active step changes
  useEffect(() => {
    if (prevActive.current === active) return;
    prevActive.current = active;
    setIsVisible(false);
    const t = setTimeout(() => setIsVisible(true), 35);
    return () => clearTimeout(t);
  }, [active]);

  const Visual = STEPS[active].visual;

  return (
    <section style={{ borderBottom: "1px solid var(--rule)" }}>
      {/* shimmer keyframe — injected once, no extra file needed */}
      <style>{`
        @keyframes shimmer-slide {
          0%   { transform: translateX(-160px); }
          100% { transform: translateX(160px); }
        }
      `}</style>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "120px 56px 108px" }} className="lp-inner">
        <div style={{ height: 1, background: "var(--rule)", marginBottom: 56 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 48 }}>
          <h2 style={{
            fontFamily: "var(--serif)", fontStyle: "italic",
            fontSize: "clamp(28px,4vw,48px)", color: "var(--ink)",
            letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0,
          }}>
            See it work in 15 seconds.
          </h2>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            No login · No signup · Auto-plays
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 48, alignItems: "start" }} className="mob-col">
          {/* Step nav */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setActive(i); setProgress(0); }}
                style={{
                  all: "unset", cursor: "pointer", padding: "14px 16px", borderRadius: 10,
                  background: active === i ? "color-mix(in srgb, var(--ink) 6%, var(--paper))" : "transparent",
                  border: active === i ? "1px solid var(--rule)" : "1px solid transparent",
                  transition: "all 200ms",
                }}
              >
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: active === i ? "var(--cinnabar-ink)" : "var(--ink-3)", marginBottom: 4 }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: active === i ? "var(--ink)" : "var(--ink-3)", lineHeight: 1.3 }}>
                  {s.heading}
                </div>
                {active === i && (
                  <div style={{ marginTop: 10, height: 2, background: "var(--rule)", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "100%", background: "var(--cinnabar-ink)", borderRadius: 1, transform: `scaleX(${progress})`, transformOrigin: "left", transition: "transform 80ms linear" }} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Visual area */}
          <div style={{
            padding: "36px 40px", borderRadius: 16,
            background: "color-mix(in srgb, var(--ink) 3%, var(--paper))",
            border: "1px solid var(--rule)", minHeight: 320, position: "relative", overflow: "hidden",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>
              {STEPS[active].label}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "clamp(20px,2.5vw,30px)", color: "var(--ink)", letterSpacing: "-0.01em", marginBottom: 4 }}>
              {STEPS[active].heading}
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>
              {STEPS[active].sub}
            </div>

            <div
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "none" : "translateY(12px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}
            >
              <Visual visible={isVisible} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
