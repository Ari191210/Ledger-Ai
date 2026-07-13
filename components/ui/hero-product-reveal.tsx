"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const CHAPTERS = [
  { name: "Kinetics",       pct: 88, color: "rgba(74,222,128,0.65)"  },
  { name: "Thermodynamics", pct: 45, color: "rgba(251,113,133,0.65)" },
  { name: "Optics",         pct: 72, color: "rgba(255,202,175,0.65)" },
  { name: "Electrostatics", pct: 31, color: "rgba(251,113,133,0.65)" },
  { name: "Modern Physics", pct: 60, color: "rgba(255,202,175,0.65)" },
];

const STEPS = [
  { label: "14 chapters mapped",       delay: 0.9  },
  { label: "3 weak areas detected",    delay: 1.25 },
  { label: "28-day plan generated",    delay: 1.6  },
];

export function HeroProductReveal() {
  const ref   = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start  = Date.now();
    const target = 78;
    const dur    = 1600;
    const delay  = 2100;
    const t = setTimeout(() => {
      const id = setInterval(() => {
        const elapsed = Date.now() - start - delay;
        const frac = Math.min(elapsed / dur, 1);
        const ease = 1 - Math.pow(1 - frac, 3);
        setScore(Math.round(ease * target));
        if (frac >= 1) clearInterval(id);
      }, 16);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <section
      className="hero-product-reveal"
      style={{
        background:     "linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)",
        padding:        "0 24px 120px",
        overflow:       "hidden",
        position:       "relative",
      }}
    >
      {/* ambient glow behind card */}
      <div aria-hidden style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(255,202,175,0.06) 0%, transparent 65%)",
        filter: "blur(60px)", pointerEvents: "none",
      }} />

      <div ref={ref} style={{ maxWidth: 900, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 64, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
          style={{
            background:   "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
            border:       "1px solid rgba(255,255,255,0.08)",
            borderRadius:  24,
            padding:       "40px 48px",
            boxShadow:     "0 48px 96px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter:"blur(24px)",
          }}
        >
          {/* card chrome */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Ledger · Syllabus Analysis</span>
            <div style={{ display: "flex", gap: 6 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />)}
            </div>
          </div>

          {/* file row + progress */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
            style={{ marginBottom: 28 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ width: 36, height: 44, borderRadius: 8, background: "rgba(255,202,175,0.1)", border: "1px solid rgba(255,202,175,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(255,202,175,0.7)", letterSpacing: "0.06em" }}>PDF</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>Class 11 Physics.pdf</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,0.22)", letterSpacing: "0.08em", marginTop: 3 }}>2.4 MB · CBSE · Grade 11</div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 1.1, duration: 0.4 }}
                style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(74,222,128,0.8)" }}
              >
                ✓ Done
              </motion.div>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
              <motion.div
                initial={{ width: "0%" }}
                animate={inView ? { width: "100%" } : {}}
                transition={{ duration: 0.85, ease: "easeOut", delay: 0.45 }}
                style={{ height: "100%", background: "linear-gradient(90deg, rgba(255,202,175,0.9), rgba(255,202,175,0.4))", borderRadius: 2 }}
              />
            </div>
          </motion.div>

          {/* analysis steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 36 }}>
            {STEPS.map(s => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.55, ease: EASE, delay: s.delay }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={inView ? { scale: 1 } : {}}
                  transition={{ type: "spring", stiffness: 600, damping: 22, delay: s.delay + 0.1 }}
                  style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,202,175,0.12)", border: "1px solid rgba(255,202,175,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <span style={{ color: "rgba(255,202,175,1)", fontSize: 9, lineHeight: 1 }}>✓</span>
                </motion.div>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.01em" }}>{s.label}</span>
              </motion.div>
            ))}
          </div>

          {/* score + heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, ease: EASE, delay: 1.95 }}
            style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, alignItems: "start" }}
          >
            {/* score panel */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 20px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 10 }}>Readiness Score</div>
              <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 68, fontWeight: 400, color: "rgba(255,202,175,1)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {score}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 6, letterSpacing: "0.08em" }}>
                / 100 · Physics
              </div>
              <div style={{ marginTop: 16, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: "0%" }}
                  animate={inView ? { width: "78%" } : {}}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 2.2 }}
                  style={{ height: "100%", background: "rgba(255,202,175,0.6)", borderRadius: 2 }}
                />
              </div>
            </div>

            {/* chapter heatmap */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 4 }}>Chapter Readiness</div>
              {CHAPTERS.map((ch, i) => (
                <div key={ch.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "rgba(255,255,255,0.38)", letterSpacing: "0.01em" }}>{ch.name}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{ch.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={inView ? { width: `${ch.pct}%` } : {}}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 2.5 + i * 0.1 }}
                      style={{ height: "100%", background: ch.color, borderRadius: 3 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
