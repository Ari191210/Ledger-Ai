"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

const PLANS: Record<string, { chapters: { name: string; pct: number }[]; score: number; weeks: number }> = {
  chemistry: {
    chapters: [
      { name: "Thermodynamics",      pct: 88 },
      { name: "Chemical Equilibrium",pct: 42 },
      { name: "Organic Reactions",   pct: 74 },
      { name: "Electrochemistry",    pct: 31 },
      { name: "Reaction Kinetics",   pct: 65 },
    ],
    score: 87, weeks: 6,
  },
  physics: {
    chapters: [
      { name: "Mechanics",           pct: 82 },
      { name: "Electromagnetism",    pct: 55 },
      { name: "Ray Optics",          pct: 78 },
      { name: "Modern Physics",      pct: 38 },
      { name: "Waves & Sound",       pct: 60 },
    ],
    score: 82, weeks: 7,
  },
  maths: {
    chapters: [
      { name: "Calculus",            pct: 70 },
      { name: "Algebra",             pct: 85 },
      { name: "Coordinate Geometry", pct: 55 },
      { name: "Probability",         pct: 40 },
      { name: "Vectors & 3D",        pct: 62 },
    ],
    score: 84, weeks: 8,
  },
  biology: {
    chapters: [
      { name: "Cell Biology",        pct: 90 },
      { name: "Genetics",            pct: 65 },
      { name: "Ecology",             pct: 78 },
      { name: "Human Physiology",    pct: 45 },
      { name: "Plant Biology",       pct: 58 },
    ],
    score: 89, weeks: 5,
  },
  english: {
    chapters: [
      { name: "Comprehension",       pct: 88 },
      { name: "Grammar",             pct: 72 },
      { name: "Creative Writing",    pct: 60 },
      { name: "Literature",          pct: 55 },
      { name: "Vocabulary",          pct: 80 },
    ],
    score: 91, weeks: 4,
  },
  economics: {
    chapters: [
      { name: "Microeconomics",      pct: 75 },
      { name: "Macroeconomics",      pct: 58 },
      { name: "Statistics",          pct: 42 },
      { name: "Indian Economy",      pct: 85 },
      { name: "Development",         pct: 65 },
    ],
    score: 86, weeks: 5,
  },
};

const DEFAULT_PLAN = {
  chapters: [
    { name: "Core Concepts",        pct: 72 },
    { name: "Applied Problems",     pct: 48 },
    { name: "Theory & Definitions", pct: 85 },
    { name: "Practice Questions",   pct: 35 },
    { name: "Revision Topics",      pct: 60 },
  ],
  score: 85, weeks: 6,
};

const LOADING_STEPS = [
  "Mapping chapters...",
  "Detecting weak areas...",
  "Building revision plan...",
  "Calibrating score trajectory...",
];

function getPlan(subject: string) {
  const key = subject.toLowerCase().trim().replace(/\s+/g, "").replace(/maths?/, "maths").replace(/math/, "maths");
  return PLANS[key] || DEFAULT_PLAN;
}

function daysUntil(dateStr: string) {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function barColor(pct: number) {
  if (pct >= 70) return "rgba(74,222,128,0.75)";
  if (pct >= 50) return "rgba(255,202,175,0.85)";
  return "rgba(251,113,133,0.80)";
}

function barLabel(pct: number) {
  if (pct >= 70) return "strong";
  if (pct >= 50) return "review";
  return "urgent";
}

type Phase = "idle" | "loading" | "result";

export function HeroInteractiveDemo() {
  const [subject,  setSubject]  = useState("");
  const [examDate, setExamDate] = useState("");
  const [phase,    setPhase]    = useState<Phase>("idle");
  const [loadIdx,  setLoadIdx]  = useState(0);
  const [score,    setScore]    = useState(0);

  const today = new Date().toISOString().split("T")[0];

  const generate = useCallback(() => {
    if (!subject.trim() || phase === "loading") return;
    setPhase("loading");
    setLoadIdx(0);
    setScore(0);

    let step = 0;
    const stepInt = setInterval(() => {
      step++;
      if (step < LOADING_STEPS.length) setLoadIdx(step);
      else clearInterval(stepInt);
    }, 380);

    setTimeout(() => {
      clearInterval(stepInt);
      setPhase("result");
      const target = getPlan(subject).score;
      let s = 0;
      const scoreInt = setInterval(() => {
        s = Math.min(s + 2, target);
        setScore(s);
        if (s >= target) clearInterval(scoreInt);
      }, 18);
    }, 1650);
  }, [subject, phase]);

  const plan = phase === "result" ? getPlan(subject) : null;
  const days = daysUntil(examDate);
  const subjectDisplay = subject.trim()
    ? subject.trim().charAt(0).toUpperCase() + subject.trim().slice(1)
    : "Subject";

  return (
    <section style={{
      background: "linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)",
      padding: "0 24px 100px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* ambient glow */}
      <div aria-hidden style={{
        position: "absolute", top: "10%", left: "50%", transform: "translate(-50%, 0)",
        width: 600, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse, var(--page-glow-a) 0%, transparent 70%)",
        filter: "blur(60px)", pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>

        {/* Section label */}
        <div style={{ textAlign: "center", paddingTop: 72, paddingBottom: 12 }}>
          <p style={{
            fontFamily: "var(--serif)", fontStyle: "italic",
            fontSize: "clamp(22px,3vw,32px)", color: "var(--ink)",
            letterSpacing: "-0.01em", lineHeight: 1.3, margin: "0 0 10px",
          }}>
            What&apos;s your exam readiness score right now?
          </p>
          <p style={{
            fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)",
            letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 28px",
          }}>
            Enter a subject to find out — no account needed
          </p>
        </div>

        {/* Input row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <input
            type="text"
            placeholder="Your subject (e.g. Chemistry)"
            value={subject}
            onChange={e => { setSubject(e.target.value); if (phase === "result") setPhase("idle"); }}
            onKeyDown={e => e.key === "Enter" && generate()}
            style={{
              flex: "1 1 200px", maxWidth: 240,
              background: "color-mix(in srgb, var(--ink) 4%, var(--paper))",
              border: "1px solid var(--rule)", color: "var(--ink)",
              fontFamily: "var(--sans)", fontSize: 13,
              padding: "11px 16px", borderRadius: 10, outline: "none",
            }}
          />
          <input
            type="date"
            min={today}
            value={examDate}
            onChange={e => setExamDate(e.target.value)}
            style={{
              flex: "1 1 160px", maxWidth: 185,
              background: "color-mix(in srgb, var(--ink) 4%, var(--paper))",
              border: "1px solid var(--rule)",
              color: examDate ? "var(--ink)" : "var(--ink-3)",
              fontFamily: "var(--sans)", fontSize: 13,
              padding: "11px 16px", borderRadius: 10, outline: "none",
            }}
          />
          <button
            onClick={generate}
            disabled={phase === "loading" || !subject.trim()}
            style={{
              flexShrink: 0,
              background: subject.trim() ? "var(--cinnabar-ink)" : "var(--rule)",
              color: subject.trim() ? "var(--paper)" : "var(--ink-3)",
              border: "none", borderRadius: 10, cursor: subject.trim() ? "pointer" : "default",
              fontFamily: "var(--sans)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "11px 22px",
              transition: "background 200ms ease, color 200ms ease, opacity 200ms ease",
              opacity: phase === "loading" ? 0.6 : 1,
            }}
          >
            {phase === "loading" ? "Building…" : "Generate plan →"}
          </button>
        </div>

        {/* Result area */}
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", marginTop: 40, height: 60,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 14 }}>◌</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.12em" }}>
                {LOADING_STEPS[loadIdx]}
              </span>
            </motion.div>
          )}

          {phase === "result" && plan && (
            <motion.div key="result"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: EASE }}
              style={{
                marginTop: 24,
                background: "color-mix(in srgb, var(--ink) 3%, var(--paper))",
                border: "1px solid var(--rule)",
                borderRadius: 18, padding: "32px 36px",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* subtle corner glow */}
              <div aria-hidden style={{
                position: "absolute", top: -80, right: -60,
                width: 260, height: 260,
                background: "radial-gradient(ellipse, var(--page-glow-a) 0%, transparent 65%)",
                filter: "blur(50px)", pointerEvents: "none",
              }} />

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, position: "relative" }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>
                    {subjectDisplay}{days > 0 ? ` · ${days} days to exam` : " · Plan generated"}
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--ink)", lineHeight: 1.2 }}>
                    Your study plan is ready.
                  </div>
                </div>
                {/* Score ring */}
                <div style={{ textAlign: "center", flexShrink: 0, marginLeft: 24 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>Ledger Score™</div>
                  <div style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 44, color: "var(--cinnabar-ink)", lineHeight: 1 }}>{score}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.08em" }}>/ 100</div>
                </div>
              </div>

              {/* Chapter readiness bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
                {plan.chapters.map((ch, i) => (
                  <motion.div key={ch.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, ease: EASE, delay: i * 0.07 }}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div style={{ width: 126, fontFamily: "var(--sans)", fontSize: 10, color: "var(--ink-2)", textAlign: "right", flexShrink: 0 }}>
                      {ch.name}
                    </div>
                    <div style={{ flex: 1, height: 5, background: "var(--rule)", borderRadius: 3, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ch.pct}%` }}
                        transition={{ duration: 0.85, ease: EASE, delay: 0.25 + i * 0.07 }}
                        style={{ height: "100%", background: barColor(ch.pct), borderRadius: 3 }}
                      />
                    </div>
                    <div style={{ width: 36, fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", flexShrink: 0 }}>
                      {barLabel(ch.pct)}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
                {[
                  `${plan.chapters.length} chapters mapped`,
                  "Weak areas detected",
                  `${plan.weeks}-week revision plan`,
                  "Daily targets set",
                ].map((label, i) => (
                  <motion.div key={label}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: EASE, delay: 0.55 + i * 0.1 }}
                    style={{
                      fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "var(--cinnabar-ink)", background: "var(--highlight)",
                      padding: "5px 11px", borderRadius: 6,
                    }}
                  >
                    ✓ {label}
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: 1.0 }}
                style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}
              >
                <Link href="/auth" style={{
                  fontFamily: "var(--sans)", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "var(--paper)", background: "var(--ink)",
                  textDecoration: "none", padding: "12px 24px", borderRadius: 10,
                  transition: "opacity 160ms",
                }}>
                  Get your full plan — free →
                </Link>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em" }}>
                  No card · Instant access · 55 tools
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* idle hint */}
        {phase === "idle" && (
          <div style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
            Try: Chemistry, Physics, Maths, Biology, Economics
          </div>
        )}
      </div>

      {/* spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}
