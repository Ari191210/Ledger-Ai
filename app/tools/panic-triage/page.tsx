"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import EditorialRange from "@/components/ui/editorial-range";
import Link from "next/link";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ── Local sub-components ───────────────────────────────────────────────────────

function StepLabel({ number, text }: { number: number; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
      <span style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "var(--cinnabar)", color: "var(--cinnabar-ink)",
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{number}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)" }}>{text}</span>
    </div>
  );
}

function StatCard({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  const color = danger ? "var(--cinnabar)" : accent ? "var(--ink)" : "var(--ink-2)";
  return (
    <div style={{
      padding: "1rem", borderRadius: 10, border: "1.5px solid var(--rule)",
      background: "var(--paper)", textAlign: "center",
    }}>
      <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>{label}</div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Confidence = "red" | "amber" | "green";

interface Chapter {
  name: string;
  weightage: number; // marks weightage out of 100
  confidence: Confidence;
}

interface ExamSyllabus {
  label: string;
  chapters: Omit<Chapter, "confidence">[];
}

interface PlanSlot {
  slot: number;
  chapter: string;
  action: "skim_pyqs" | "do_mcqs" | "read_summary" | "formula_drill" | "skip";
  duration_mins: number;
  expected_marks_recovered: number;
  rationale: string;
}

interface TriageResult {
  exam: string;
  total_hours: number;
  skip_list: string[];
  plan: PlanSlot[];
  closing_note: string;
}

// ── Exam syllabi (hardcoded weightage data) ────────────────────────────────────

const EXAM_SYLLABI: Record<string, ExamSyllabus> = {
  jee_mains_physics: {
    label: "JEE Mains — Physics",
    chapters: [
      { name: "Mechanics", weightage: 23 },
      { name: "Thermodynamics", weightage: 10 },
      { name: "Waves & Oscillations", weightage: 8 },
      { name: "Electrostatics", weightage: 12 },
      { name: "Current Electricity", weightage: 8 },
      { name: "Magnetism", weightage: 8 },
      { name: "Electromagnetic Induction", weightage: 6 },
      { name: "Optics", weightage: 10 },
      { name: "Modern Physics", weightage: 10 },
      { name: "Semiconductors", weightage: 5 },
    ],
  },
  jee_mains_chemistry: {
    label: "JEE Mains — Chemistry",
    chapters: [
      { name: "Atomic Structure & Chemical Bonding", weightage: 10 },
      { name: "Chemical Equilibrium", weightage: 8 },
      { name: "Electrochemistry", weightage: 6 },
      { name: "Chemical Kinetics", weightage: 6 },
      { name: "Solutions", weightage: 6 },
      { name: "Thermodynamics (Chem)", weightage: 8 },
      { name: "Organic Chemistry — GOC", weightage: 8 },
      { name: "Hydrocarbons", weightage: 6 },
      { name: "Carbonyl Compounds", weightage: 8 },
      { name: "Coordination Chemistry", weightage: 8 },
      { name: "p-Block Elements", weightage: 10 },
      { name: "d & f Block Elements", weightage: 6 },
      { name: "Surface Chemistry", weightage: 4 },
      { name: "Polymers & Biomolecules", weightage: 6 },
    ],
  },
  jee_mains_maths: {
    label: "JEE Mains — Mathematics",
    chapters: [
      { name: "Algebra — Complex Numbers", weightage: 6 },
      { name: "Algebra — Matrices & Determinants", weightage: 8 },
      { name: "Sequences & Series", weightage: 6 },
      { name: "Coordinate Geometry", weightage: 15 },
      { name: "Calculus — Limits & Continuity", weightage: 8 },
      { name: "Calculus — Differentiation", weightage: 8 },
      { name: "Calculus — Integration", weightage: 10 },
      { name: "Differential Equations", weightage: 6 },
      { name: "Probability & Statistics", weightage: 8 },
      { name: "Trigonometry", weightage: 8 },
      { name: "Vectors & 3D", weightage: 10 },
      { name: "Sets, Relations & Functions", weightage: 5 },
      { name: "Binomial Theorem", weightage: 4 },
      { name: "Mathematical Reasoning", weightage: 4 },
    ],
  },
  neet_biology: {
    label: "NEET — Biology",
    chapters: [
      { name: "Cell Biology & Cell Division", weightage: 12 },
      { name: "Genetics & Evolution", weightage: 18 },
      { name: "Human Physiology", weightage: 20 },
      { name: "Plant Physiology", weightage: 10 },
      { name: "Diversity of Life", weightage: 8 },
      { name: "Ecology & Environment", weightage: 12 },
      { name: "Reproduction", weightage: 10 },
      { name: "Biotechnology", weightage: 6 },
      { name: "Biomolecules", weightage: 4 },
    ],
  },
  neet_physics: {
    label: "NEET — Physics",
    chapters: [
      { name: "Mechanics", weightage: 25 },
      { name: "Thermodynamics", weightage: 10 },
      { name: "Electrostatics & Current Electricity", weightage: 20 },
      { name: "Magnetism & EMI", weightage: 12 },
      { name: "Optics", weightage: 10 },
      { name: "Modern Physics", weightage: 10 },
      { name: "Waves", weightage: 8 },
      { name: "Semiconductors", weightage: 5 },
    ],
  },
  neet_chemistry: {
    label: "NEET — Chemistry",
    chapters: [
      { name: "Chemical Bonding", weightage: 10 },
      { name: "Equilibrium", weightage: 8 },
      { name: "Electrochemistry", weightage: 6 },
      { name: "Thermodynamics (Chem)", weightage: 8 },
      { name: "Solutions", weightage: 5 },
      { name: "Organic — GOC & Hydrocarbons", weightage: 10 },
      { name: "Organic — Functional Groups", weightage: 12 },
      { name: "p-Block Elements", weightage: 12 },
      { name: "d & f Block", weightage: 8 },
      { name: "Coordination Chemistry", weightage: 8 },
      { name: "Biomolecules & Polymers", weightage: 6 },
      { name: "Surface Chemistry", weightage: 4 },
      { name: "Atomic Structure", weightage: 3 },
    ],
  },
  cbse_physics_12: {
    label: "CBSE Class 12 — Physics",
    chapters: [
      { name: "Electrostatics", weightage: 15 },
      { name: "Current Electricity", weightage: 7 },
      { name: "Magnetic Effects of Current", weightage: 8 },
      { name: "Magnetism & Matter", weightage: 5 },
      { name: "Electromagnetic Induction", weightage: 8 },
      { name: "Alternating Current", weightage: 7 },
      { name: "Electromagnetic Waves", weightage: 5 },
      { name: "Ray Optics", weightage: 10 },
      { name: "Wave Optics", weightage: 7 },
      { name: "Dual Nature of Radiation", weightage: 5 },
      { name: "Atoms & Nuclei", weightage: 6 },
      { name: "Semiconductor Electronics", weightage: 7 },
      { name: "Communication Systems", weightage: 3 },
    ],
  },
  cbse_maths_12: {
    label: "CBSE Class 12 — Mathematics",
    chapters: [
      { name: "Relations & Functions", weightage: 8 },
      { name: "Inverse Trigonometric Functions", weightage: 4 },
      { name: "Matrices & Determinants", weightage: 13 },
      { name: "Continuity & Differentiability", weightage: 8 },
      { name: "Applications of Derivatives", weightage: 8 },
      { name: "Integrals", weightage: 14 },
      { name: "Applications of Integrals", weightage: 5 },
      { name: "Differential Equations", weightage: 5 },
      { name: "Vectors", weightage: 5 },
      { name: "Three Dimensional Geometry", weightage: 8 },
      { name: "Linear Programming", weightage: 5 },
      { name: "Probability", weightage: 8 },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<PlanSlot["action"], string> = {
  skim_pyqs: "Skim PYQ Solutions",
  do_mcqs: "Do 10 MCQs",
  read_summary: "Read Summary",
  formula_drill: "Formula Drill",
  skip: "SKIP",
};

const ACTION_COLORS: Record<PlanSlot["action"], string> = {
  skim_pyqs: "var(--ink-2)",
  do_mcqs: "var(--ink-2)",
  read_summary: "var(--ink-2)",
  formula_drill: "var(--gold)",
  skip: "var(--ink-3)",
};

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  red: "var(--cinnabar)",
  amber: "var(--gold)",
  green: "var(--sage)",
};

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PanicTriagePage() {
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [hoursRemaining, setHoursRemaining] = useState<number>(6);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string>("");
  const [completedSlots, setCompletedSlots] = useState<Set<number>>(new Set());
  const toggleSlot = (slot: number) => setCompletedSlots(prev => {
    const next = new Set(prev);
    next.has(slot) ? next.delete(slot) : next.add(slot);
    return next;
  });
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const planRef = useRef<HTMLDivElement>(null);

  // Populate chapters when exam changes
  useEffect(() => {
    if (!selectedExam) {
      setChapters([]);
      return;
    }
    const syllabus = EXAM_SYLLABI[selectedExam];
    if (!syllabus) return;
    setChapters(
      syllabus.chapters.map((c) => ({
        ...c,
        confidence: "amber" as Confidence,
      }))
    );
    setResult(null);
    setCompletedSlots(new Set());
  }, [selectedExam]);

  // Countdown timer
  useEffect(() => {
    if (countdownActive && countdownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCountdownSeconds((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            setCountdownActive(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdownActive, countdownSeconds]);

  const updateConfidence = (index: number, confidence: Confidence) => {
    setChapters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, confidence } : c))
    );
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedExam || chapters.length === 0) return;
    setIsLoading(true);
    setError("");
    setResult(null);
    setCompletedSlots(new Set());

    const weightageMap = Object.fromEntries(
      chapters.map((c) => [c.name, c.weightage])
    );
    const confidenceMap = Object.fromEntries(
      chapters.map((c) => [c.name, c.confidence])
    );

    try {
      const res = await callAIOrThrow<TriageResult>({
        tool: "panic_triage",
        exam: EXAM_SYLLABI[selectedExam].label,
        hours_remaining: hoursRemaining,
        weightage_map: weightageMap,
        confidence_map: confidenceMap,
      });

      setResult(res);
      setCountdownSeconds(hoursRemaining * 3600);
      setCountdownActive(true);

      setTimeout(() => {
        planRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedExam, chapters, hoursRemaining]);

  const toggleDone = (slot: number) => {
    setCompletedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  const totalMarksRecoverable = result?.plan
    .filter((p) => p.action !== "skip")
    .reduce((sum, p) => sum + p.expected_marks_recovered, 0) ?? 0;

  const completedMarks = result?.plan
    .filter((p) => completedSlots.has(p.slot) && p.action !== "skip")
    .reduce((sum, p) => sum + p.expected_marks_recovered, 0) ?? 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--sans)",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          borderBottom: "1px solid var(--rule)",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          position: "sticky",
          top: 0,
          backgroundColor: "var(--paper)",
          zIndex: 50,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            color: "var(--ink-2)",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontFamily: "var(--mono)",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          ← Dashboard
        </Link>
        <span style={{ color: "var(--rule)", userSelect: "none" }}>|</span>
        <span
          style={{
            fontFamily: "var(--serif)",
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "var(--cinnabar)",
          }}
        >
          Paper Panic Triage
        </span>
        {countdownActive && (
          <div
            style={{
              marginLeft: "auto",
              fontFamily: "var(--mono)",
              fontSize: "1.3rem",
              fontWeight: 700,
              color: countdownSeconds < 3600 ? "var(--cinnabar)" : "var(--ink)",
              background: "var(--paper-2)",
              border: "2px solid var(--rule)",
              borderRadius: "8px",
              padding: "0.3rem 0.9rem",
              letterSpacing: "0.05em",
            }}
          >
            ⏱ {formatTime(countdownSeconds)}
          </div>
        )}
      </header>

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* ── Hero ── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 700,
              lineHeight: 1.25,
              color: "var(--ink)",
              marginBottom: "0.5rem",
            }}
          >
            It's late. You're panicking.
            <br />
            <span style={{ color: "var(--cinnabar)" }}>Let's triage ruthlessly.</span>
          </h1>
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              maxWidth: "560px",
            }}
          >
            Tell us your exam, your hours, and your confidence per chapter. We'll
            build a minute-by-minute recovery plan — and explicitly tell you what
            to skip.
          </p>
        </div>

        {/* ── Step 1: Exam Selector ── */}
        <section style={{ marginBottom: "2rem" }}>
          <StepLabel number={1} text="Select your exam" />
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              border: "1.5px solid var(--rule)",
              borderRadius: "8px",
              backgroundColor: "var(--paper)",
              color: selectedExam ? "var(--ink)" : "var(--ink-3)",
              fontFamily: "var(--sans)",
              fontSize: "0.95rem",
              appearance: "none",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="">— Choose an exam —</option>
            {Object.entries(EXAM_SYLLABI).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </section>

        {/* ── Step 2: Hours Slider ── */}
        {selectedExam && (
          <section style={{ marginBottom: "2rem" }}>
            <StepLabel number={2} text={`Hours remaining: ${hoursRemaining}h`} />
            <EditorialRange defaultValue={hoursRemaining} startingValue={1} maxValue={12} isStepped stepSize={0.5} onChange={setHoursRemaining} />
            <p
              style={{
                textAlign: "center",
                fontFamily: "var(--mono)",
                fontSize: "2rem",
                fontWeight: 700,
                color: hoursRemaining <= 3 ? "var(--cinnabar)" : "var(--ink)",
                margin: "0.5rem 0 0",
              }}
            >
              {hoursRemaining}h left
            </p>
          </section>
        )}

        {/* ── Step 3: Chapter Confidence ── */}
        {chapters.length > 0 && (
          <section style={{ marginBottom: "2rem" }}>
            <StepLabel
              number={3}
              text="Rate your confidence per chapter"
            />
            <p style={{ color: "var(--ink-3)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              🔴 Not started / very weak &nbsp;·&nbsp; 🟡 Partially done &nbsp;·&nbsp; 🟢 Comfortable
            </p>
            <div
              style={{
                border: "1px solid var(--rule)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {chapters.map((ch, i) => (
                <div
                  key={ch.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderBottom: i < chapters.length - 1 ? "1px solid var(--rule)" : "none",
                    backgroundColor: i % 2 === 0 ? "var(--paper)" : "var(--paper-2)",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--ink)" }}>
                      {ch.name}
                    </span>
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.75rem",
                        color: "var(--ink-3)",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {ch.weightage}%
                    </span>
                  </div>
                  <div
                    style={{
                      width: "60px",
                      height: "5px",
                      borderRadius: "3px",
                      backgroundColor: "var(--rule)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${ch.weightage}%`,
                        height: "100%",
                        backgroundColor: "var(--cinnabar)",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    {(["red", "amber", "green"] as Confidence[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => updateConfidence(i, c)}
                        title={c}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          border: ch.confidence === c
                            ? `2.5px solid var(--ink)`
                            : "2px solid transparent",
                          backgroundColor: CONFIDENCE_COLORS[c],
                          cursor: "pointer",
                          opacity: ch.confidence === c ? 1 : 0.4,
                          transition: "opacity 0.15s, border 0.15s",
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Step 4: Submit ── */}
        {chapters.length > 0 && (
          <section style={{ marginBottom: "2rem" }}>
            <StepLabel number={4} text="Generate your triage plan" />
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor: isLoading ? "var(--ink-3)" : "var(--cinnabar)",
                color: "var(--cinnabar-ink)",
                border: "none",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: 700,
                fontFamily: "var(--sans)",
                cursor: isLoading ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                transition: "opacity 0.2s",
              }}
            >
              {isLoading ? "Triaging…" : "⚡ Build My Recovery Plan"}
            </button>
            {isLoading && (
              <div style={{ marginTop: "1.5rem" }}>
                <AIThinking />
              </div>
            )}
            {error && (
              <p
                style={{
                  marginTop: "0.75rem",
                  color: "var(--cinnabar)",
                  fontSize: "0.875rem",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}
          </section>
        )}

        {/* ── Results ── */}
        {result && (
          <div ref={planRef}>
            {/* Closing note */}
            <div style={{ marginBottom: "2rem" }}>
              <AIOutput text={result.closing_note} variant="principle" />
            </div>

            {/* Stats bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <StatCard label="Hours" value={`${result.total_hours}h`} />
              <StatCard label="Marks recoverable" value={`~${totalMarksRecoverable}`} accent />
              <StatCard label="Chapters to skip" value={String(result.skip_list.length)} danger />
            </div>

            {/* Skip list */}
            {result.skip_list.length > 0 && (
              <div
                style={{
                  marginBottom: "2rem",
                  padding: "1rem 1.25rem",
                  background: "var(--paper-2)",
                  border: "1.5px solid var(--cinnabar)",
                  borderRadius: "10px",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.75rem",
                    color: "var(--cinnabar)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "0.6rem",
                    fontWeight: 700,
                  }}
                >
                  ✂ Explicitly Skip These
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {result.skip_list.map((ch) => (
                    <span
                      key={ch}
                      style={{
                        backgroundColor: "color-mix(in oklch, var(--cinnabar) 10%, transparent)",
                        color: "var(--cinnabar)",
                        border: "1px solid color-mix(in oklch, var(--cinnabar) 30%, transparent)",
                        borderRadius: "6px",
                        padding: "0.25rem 0.65rem",
                        fontSize: "0.85rem",
                        fontFamily: "var(--sans)",
                        textDecoration: "line-through",
                        textDecorationColor: "var(--cinnabar)",
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar */}
            {completedSlots.size > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.4rem",
                    fontSize: "0.8rem",
                    color: "var(--ink-2)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  <span>Progress</span>
                  <span>
                    {completedSlots.size}/{result.plan.filter(p => p.action !== "skip").length} blocks · ~{completedMarks} marks recovered
                  </span>
                </div>
                <div
                  style={{
                    height: "8px",
                    background: "var(--rule)",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: "100%",
                      backgroundColor: "var(--cinnabar)",
                      borderRadius: "4px",
                      transform: `scaleX(${totalMarksRecoverable > 0 ? completedMarks / totalMarksRecoverable : 0})`,
                      transformOrigin: "left",
                      transition: "transform 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Timeline */}
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "12px",
                  bottom: "12px",
                  width: "2px",
                  background: "var(--rule)",
                  zIndex: 0,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {result.plan.map((slot) => {
                  const done = completedSlots.has(slot.slot);
                  const isSkip = slot.action === "skip";
                  const actionColor = ACTION_COLORS[slot.action];

                  return (
                    <div
                      key={slot.slot}
                      style={{
                        display: "flex",
                        gap: "1rem",
                        position: "relative",
                        zIndex: 1,
                        opacity: done ? 0.55 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      {/* Dot */}
                      <div
                        style={{
                          width: "40px",
                          minWidth: "40px",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "center",
                          paddingTop: "14px",
                        }}
                      >
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            backgroundColor: done ? "var(--ink-3)" : actionColor,
                            border: "2px solid var(--paper)",
                            boxShadow: done ? "none" : `0 0 0 3px ${actionColor}33`,
                            transition: "all 0.2s",
                            zIndex: 2,
                            position: "relative",
                          }}
                        />
                      </div>

                      {/* Card */}
                      <div
                        style={{
                          flex: 1,
                          background: isSkip ? "var(--paper-2)" : "var(--paper)",
                          border: `1.5px solid ${done ? "var(--rule)" : actionColor}44`,
                          borderRadius: "10px",
                          padding: "14px 16px",
                          cursor: isSkip ? "default" : "pointer",
                          transition: "all 0.2s",
                        }}
                        onClick={() => !isSkip && toggleSlot(slot.slot)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: actionColor, marginBottom: 4 }}>
                              {slot.action.replace(/_/g, " ")} · {slot.duration_mins} min
                            </div>
                            <div style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                              {slot.chapter}
                            </div>
                            <div style={{ fontFamily: "var(--prose)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
                              {slot.rationale}
                            </div>
                          </div>
                          {!isSkip && (
                            <div style={{
                              minWidth: 28, height: 28, borderRadius: "50%",
                              border: `2px solid ${done ? "var(--cinnabar)" : "var(--rule)"}`,
                              background: done ? "var(--cinnabar)" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0, transition: "all 0.2s",
                            }}>
                              {done && <span style={{ color: "var(--paper)", fontSize: 14, lineHeight: 1 }}>✓</span>}
                            </div>
                          )}
                        </div>
                        {!isSkip && (
                          <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>
                            +{slot.expected_marks_recovered} marks recoverable
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Closing note */}
            {result.closing_note && (
              <div style={{
                marginTop: 8,
                padding: "16px 20px",
                borderRadius: 10,
                background: "color-mix(in srgb, var(--cinnabar) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--cinnabar) 20%, transparent)",
                fontFamily: "var(--prose)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--ink-2)",
              }}>
                {result.closing_note}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}