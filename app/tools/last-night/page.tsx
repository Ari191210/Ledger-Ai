"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

// ─── Types ───────────────────────────────────────────────────────────────────

type ChipState = "confident" | "shaky" | "not-done";

type ChapterChip = {
  name: string;
  state: ChipState;
};

type Session = {
  chapter: string;
  duration_minutes: number;
  triage_status: "DRILL" | "SKIM" | "FORMULA-ONLY";
  reason: string;
  key_points: string[];
  done?: boolean;
};

type SkipItem = {
  chapter: string;
  reason: string;
};

type FormulaItem = {
  formula: string;
  context: string;
};

type TriagePlan = {
  exam_context: string;
  opening_line: string;
  skip_list: SkipItem[];
  sessions: Session[];
  formula_sheet: FormulaItem[];
};

type Step = 1 | 2 | 3;

// ─── Syllabus presets ────────────────────────────────────────────────────────

const SYLLABI: Record<string, string[]> = {
  "Physics — JEE Mains": [
    "Kinematics","Laws of Motion","Work, Energy & Power","Rotational Motion","Gravitation",
    "Properties of Solids & Liquids","Thermodynamics","Kinetic Theory of Gases",
    "Oscillations","Waves","Electrostatics","Current Electricity","Magnetic Effects of Current",
    "Magnetism","Electromagnetic Induction","Alternating Current","Electromagnetic Waves",
    "Ray Optics","Wave Optics","Dual Nature of Matter","Atoms & Nuclei",
    "Electronic Devices","Communication Systems",
  ],
  "Chemistry — JEE Mains": [
    "Some Basic Concepts","Atomic Structure","Chemical Bonding","States of Matter",
    "Thermodynamics","Equilibrium","Redox Reactions","Hydrogen","s-Block Elements",
    "p-Block Elements","d & f Block Elements","Coordination Compounds",
    "Organic Chemistry Basics","Hydrocarbons","Haloalkanes","Alcohols & Ethers",
    "Aldehydes & Ketones","Carboxylic Acids","Amines","Polymers","Biomolecules",
    "Chemistry in Everyday Life","Electrochemistry","Chemical Kinetics","Surface Chemistry",
  ],
  "Mathematics — JEE Mains": [
    "Sets & Relations","Complex Numbers","Quadratic Equations","Sequences & Series",
    "Permutations & Combinations","Binomial Theorem","Matrices & Determinants",
    "Limits & Continuity","Differentiation","Applications of Derivatives",
    "Integrals","Differential Equations","Straight Lines","Circles","Conic Sections",
    "3D Geometry","Vectors","Probability","Statistics","Trigonometry",
    "Inverse Trigonometry","Mathematical Reasoning",
  ],
  "Biology — NEET": [
    "Cell Biology","Biomolecules","Cell Division","Plant Morphology","Plant Anatomy",
    "Plant Physiology","Photosynthesis","Respiration in Plants","Plant Growth",
    "Animal Tissues","Digestion & Absorption","Breathing & Gas Exchange",
    "Body Fluids & Circulation","Excretion","Locomotion & Movement",
    "Neural Control","Chemical Coordination","Reproduction in Plants",
    "Human Reproduction","Genetics","Molecular Biology","Evolution",
    "Human Health & Disease","Biotechnology","Ecosystem","Biodiversity",
    "Environmental Issues",
  ],
  "Physics — NEET": [
    "Kinematics","Laws of Motion","Work & Energy","Rotational Motion","Gravitation",
    "Mechanics of Solids & Fluids","Heat & Thermodynamics","Oscillations","Waves",
    "Electrostatics","Current Electricity","Magnetic Effects","Electromagnetic Induction",
    "Ray Optics","Wave Optics","Dual Nature","Atoms & Nuclei","Electronic Devices",
  ],
  "Chemistry — NEET": [
    "Basic Concepts","Atomic Structure","Chemical Bonding","States of Matter",
    "Thermodynamics","Equilibrium","Electrochemistry","Kinetics","Solutions",
    "Surface Chemistry","s-Block","p-Block","d-Block","Coordination","Organic Basics",
    "Hydrocarbons","Haloalkanes","Alcohols","Carbonyl Compounds","Carboxylic Acids",
    "Amines","Biomolecules","Polymers","Chemistry in Everyday Life",
  ],
};

const EXAM_OPTIONS = Object.keys(SYLLABI);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chipColor(state: ChipState): string {
  if (state === "confident") return "#22863a";
  if (state === "shaky") return "#b08800";
  return "#c0392b";
}

function chipBg(state: ChipState): string {
  if (state === "confident") return "#e6f4ea";
  if (state === "shaky") return "#fef9e7";
  return "#fdecea";
}

function chipLabel(state: ChipState): string {
  if (state === "confident") return "✓";
  if (state === "shaky") return "~";
  return "✗";
}

function triageColor(status: Session["triage_status"]): string {
  if (status === "DRILL") return "var(--cinnabar)";
  if (status === "SKIM") return "#b08800";
  return "#555";
}

function triageBg(status: Session["triage_status"]): string {
  if (status === "DRILL") return "#fdecea";
  if (status === "SKIM") return "#fef9e7";
  return "var(--paper-2)";
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ─── Floating Countdown ───────────────────────────────────────────────────────

function FloatingClock({ totalMinutes, spentMinutes }: { totalMinutes: number; spentMinutes: number }) {
  const remaining = Math.max(0, totalMinutes - spentMinutes);
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  const pct = totalMinutes > 0 ? Math.min(1, spentMinutes / totalMinutes) : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "var(--ink)",
        color: "var(--paper)",
        borderRadius: 0,
        padding: "14px 20px",
        fontFamily: "var(--mono)",
        fontSize: 13,
        zIndex: 999,
        minWidth: 120,
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>
        Time Left
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>
        {pad(h)}:{pad(m)}
      </div>
      <div
        style={{
          height: 3,
          background: "var(--paper-2)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            background: pct > 0.75 ? "var(--cinnabar)" : "#22863a",
            transition: "width 0.4s",
          }}
        />
      </div>
      <div style={{ fontSize: 9, opacity: 0.5 }}>
        {formatTime(spentMinutes)} used
      </div>
    </div>
  );
}

// ─── Session Block ────────────────────────────────────────────────────────────

function SessionBlock({
  session,
  startMinutes,
  onMarkDone,
}: {
  session: Session;
  startMinutes: number;
  onMarkDone: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const startH = Math.floor(startMinutes / 60) % 24;
  const startM = startMinutes % 60;
  const endMinutes = startMinutes + session.duration_minutes;
  const endH = Math.floor(endMinutes / 60) % 24;
  const endM = endMinutes % 60;

  const timeStr = `${pad(startH)}:${pad(startM)} — ${pad(endH)}:${pad(endM)}`;

  return (
    <div
      style={{
        border: `1px solid var(--rule)`,
        borderLeft: `4px solid ${triageColor(session.triage_status)}`,
        background: session.done ? "var(--paper-2)" : triageBg(session.triage_status),
        marginBottom: 10,
        opacity: session.done ? 0.55 : 1,
        transition: "opacity 0.3s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--ink-3)",
            minWidth: 110,
            flexShrink: 0,
          }}
        >
          {timeStr}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--sans)",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--ink)",
              textDecoration: session.done ? "line-through" : "none",
            }}
          >
            {session.chapter}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: triageColor(session.triage_status),
                background: "transparent",
                border: `1px solid ${triageColor(session.triage_status)}`,
                padding: "1px 6px",
                letterSpacing: 1,
              }}
            >
              {session.triage_status}
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--ink-3)",
              }}
            >
              {session.duration_minutes} min
            </span>
          </div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
          {!session.done && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkDone();
              }}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                background: "var(--ink)",
                color: "var(--paper)",
                border: "none",
                padding: "5px 10px",
                cursor: "pointer",
                letterSpacing: 0.5,
              }}
            >
              Mark done
            </button>
          )}
          {session.done && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "#22863a",
              }}
            >
              ✓ done
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--ink-3)",
            }}
          >
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            padding: "0 16px 14px 16px",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 12,
              color: "var(--ink-2)",
              lineHeight: 1.6,
              marginTop: 10,
              marginBottom: 8,
              fontStyle: "italic",
            }}
          >
            {session.reason}
          </div>
          {session.key_points && session.key_points.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--ink-3)",
                  letterSpacing: 1,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Focus on:
              </div>
              {session.key_points.map((pt, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 4,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--cinnabar)",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    →
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: 12,
                      color: "var(--ink)",
                      lineHeight: 1.5,
                    }}
                  >
                    {pt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LastNightPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [examType, setExamType] = useState<string>(EXAM_OPTIONS[0]);
  const [customExam, setCustomExam] = useState<string>("");
  const [hoursRemaining, setHoursRemaining] = useState<number>(8);
  const [useCustom, setUseCustom] = useState<boolean>(false);

  // Step 2
  const [chapters, setChapters] = useState<ChapterChip[]>([]);

  // Step 3
  const [plan, setPlan] = useState<TriagePlan | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // UI
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [startTimeMinutes, setStartTimeMinutes] = useState<number>(0); // minutes since midnight

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("last-night-plan");
      if (saved) {
        const parsed = JSON.parse(saved) as {
          plan: TriagePlan;
          sessions: Session[];
          startTimeMinutes: number;
          examType: string;
          hoursRemaining: number;
        };
        if (parsed.plan) {
          setPlan(parsed.plan);
          setSessions(parsed.sessions || parsed.plan.sessions);
          setStartTimeMinutes(parsed.startTimeMinutes || 0);
          setExamType(parsed.examType || EXAM_OPTIONS[0]);
          setHoursRemaining(parsed.hoursRemaining || 8);
          setStep(3);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist sessions to localStorage whenever they change
  useEffect(() => {
    if (plan) {
      try {
        localStorage.setItem(
          "last-night-plan",
          JSON.stringify({ plan, sessions, startTimeMinutes, examType, hoursRemaining })
        );
      } catch {
        // ignore
      }
    }
  }, [sessions, plan, startTimeMinutes, examType, hoursRemaining]);

  // Step 1 → Step 2
  function goToStep2() {
    const exam = useCustom ? customExam.trim() : examType;
    if (!exam) {
      setError("Please specify an exam.");
      return;
    }
    setError("");
    const syllabus = SYLLABI[exam] || [];
    // If no preset, start with empty list for custom
    const chips: ChapterChip[] =
      syllabus.length > 0
        ? syllabus.map((name) => ({ name, state: "shaky" as ChipState }))
        : [];
    setChapters(chips);
    setStep(2);
  }

  // Cycle chip state
  function cycleChip(index: number) {
    setChapters((prev) => {
      const next = [...prev];
      const cur = next[index].state;
      const order: ChipState[] = ["confident", "shaky", "not-done"];
      const idx = order.indexOf(cur);
      next[index] = { ...next[index], state: order[(idx + 1) % 3] };
      return next;
    });
  }

  // Step 2 → Step 3 (AI call)
  async function generatePlan() {
    const exam = useCustom ? customExam.trim() : examType;
    if (!exam) {
      setError("Please specify an exam.");
      return;
    }
    if (chapters.length === 0) {
      setError("No chapters found. Please check the exam type.");
      return;
    }
    setLoading(true);
    setError("");

    const chapterStates = chapters.map((c) => ({
      chapter: c.name,
      status: c.state,
    }));

    // Set start time to now
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    setStartTimeMinutes(nowMinutes);

    try {
      const result = (await callAI({
        tool: "last_night_triage",
        exam_type: exam,
        hours_remaining: hoursRemaining,
        chapter_states: chapterStates,
      })) as unknown as TriagePlan;

      if (!result || !result.sessions) {
        setError("AI returned an unexpected response. Please try again.");
        return;
      }

      const hydratedSessions: Session[] = result.sessions.map((s) => ({
        ...s,
        done: false,
      }));

      setPlan(result);
      setSessions(hydratedSessions);
      setStep(3);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function markDone(index: number) {
    setSessions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], done: true };
      return next;
    });
  }

  function resetPlan() {
    setPlan(null);
    setSessions([]);
    setStep(1);
    setError("");
    try {
      localStorage.removeItem("last-night-plan");
    } catch {
      // ignore
    }
  }

  const totalPlanMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const doneMinutes = sessions
    .filter((s) => s.done)
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  // Build cumulative start times for each session
  function getSessionStartMinutes(index: number): number {
    let acc = startTimeMinutes;
    for (let i = 0; i < index; i++) {
      acc += sessions[i].duration_minutes;
    }
    return acc;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--sans)",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "20px 40px",
          borderBottom: "1px solid var(--ink)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/dashboard"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--ink-3)",
              textDecoration: "none",
              letterSpacing: 0.5,
            }}
          >
            ← Dashboard
          </Link>
          <div
            style={{
              width: 1,
              height: 14,
              background: "var(--rule)",
            }}
          />
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: 0.5,
            }}
          >
            PRACTISE
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: 17,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Last Night Triage
          </div>
          {step === 3 && (
            <button
              onClick={resetPlan}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                background: "transparent",
                color: "var(--ink-2)",
                border: "1px solid var(--rule)",
                padding: "5px 12px",
                cursor: "pointer",
                letterSpacing: 0.5,
              }}
            >
              New Plan
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "40px 40px 120px",
        }}
      >
        {/* Intro (only before plan) */}
        {step !== 3 && (
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 26,
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: 8,
                lineHeight: 1.3,
              }}
            >
              The night before the paper.
            </div>
            <div
              style={{
                fontFamily: "var(--sans)",
                fontSize: 14,
                color: "var(--ink-2)",
                lineHeight: 1.7,
                maxWidth: 560,
              }}
            >
              Stop second-guessing. Tell us your exam, your hours, and which
              chapters you know — we&apos;ll triage the rest. 90 seconds of input,
              an hour-by-hour battle plan as output.
            </div>
          </div>
        )}

        {/* ── STEP INDICATOR ── */}
        {step !== 3 && (
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 40,
              borderBottom: "2px solid var(--rule)",
            }}
          >
            {(["1. Exam Setup", "2. Chapter Status", "3. Your Plan"] as const).map(
              (label, i) => {
                const s = (i + 1) as Step;
                const active = step === s;
                const past = step > s;
                return (
                  <div
                    key={label}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      textAlign: "center",
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      letterSpacing: 0.5,
                      color: active
                        ? "var(--cinnabar)"
                        : past
                        ? "var(--ink-2)"
                        : "var(--ink-3)",
                      borderBottom: active
                        ? "2px solid var(--cinnabar)"
                        : "2px solid transparent",
                      marginBottom: -2,
                      transition: "color 0.2s",
                      cursor: past ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (past) setStep(s);
                    }}
                  >
                    {label}
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* ─────────── STEP 1 ─────────── */}
        {step === 1 && (
          <div>
            {/* Exam selector */}
            <div style={{ marginBottom: 28 }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Exam / Subject
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setUseCustom(false)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    padding: "5px 12px",
                    border: "1px solid var(--rule)",
                    background: !useCustom ? "var(--ink)" : "transparent",
                    color: !useCustom ? "var(--paper)" : "var(--ink-2)",
                    cursor: "pointer",
                    letterSpacing: 0.5,
                  }}
                >
                  Preset
                </button>
                <button
                  onClick={() => setUseCustom(true)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    padding: "5px 12px",
                    border: "1px solid var(--rule)",
                    background: useCustom ? "var(--ink)" : "transparent",
                    color: useCustom ? "var(--paper)" : "var(--ink-2)",
                    cursor: "pointer",
                    letterSpacing: 0.5,
                  }}
                >
                  Custom
                </button>
              </div>

              {!useCustom ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {EXAM_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setExamType(opt)}
                      style={{
                        fontFamily: "var(--sans)",
                        fontSize: 12,
                        padding: "8px 14px",
                        border: `1px solid ${examType === opt ? "var(--ink)" : "var(--rule)"}`,
                        background:
                          examType === opt ? "var(--ink)" : "transparent",
                        color:
                          examType === opt ? "var(--paper)" : "var(--ink-2)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={customExam}
                  onChange={(e) => setCustomExam(e.target.value)}
                  placeholder="e.g. Physics — Board (Class 12)"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontFamily: "var(--sans)",
                    fontSize: 14,
                    border: "1px solid var(--rule)",
                    background: "var(--paper-2)",
                    color: "var(--ink)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>

            {/* Hours slider */}
            <div style={{ marginBottom: 36 }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Hours Remaining Until Exam
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <input
                  type="range"
                  min={4}
                  max={14}
                  step={0.5}
                  value={hoursRemaining}
                  onChange={(e) => setHoursRemaining(parseFloat(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: "var(--cinnabar)",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--cinnabar)",
                    minWidth: 64,
                    textAlign: "right",
                  }}
                >
                  {hoursRemaining}h
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--ink-3)",
                  marginTop: 4,
                }}
              >
                <span>4h</span>
                <span>14h</span>
              </div>
            </div>

            {error && (
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--cinnabar)",
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={goToStep2}
              className="btn"
              style={{ marginTop: 8 }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ─────────── STEP 2 ─────────── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 12 }}>
                Tap each chapter to mark your confidence
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {chapters.map((chip, i) => (
                  <button
                    key={chip.name}
                    onClick={() => cycleChip(i)}
                    style={{
                      padding: "7px 14px",
                      border: `1px solid ${chipColor(chip.state)}`,
                      background: chipBg(chip.state),
                      color: chipColor(chip.state),
                      fontFamily: "var(--sans)",
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 4,
                    }}
                  >
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10 }}>{chipLabel(chip.state)}</span>
                    {chip.name}
                  </button>
                ))}
              </div>
              {error && (
                <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" onClick={generatePlan} disabled={loading}>
                  {loading ? "Building plan…" : "Build my plan →"}
                </button>
                <button className="btn ghost" onClick={() => setStep(1)}>← Back</button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── STEP 3 ─────────── */}
        {step === 3 && plan && (
          <div>
            <FloatingClock totalMinutes={totalPlanMinutes} spentMinutes={doneMinutes} />
            <div style={{ marginBottom: 20, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
              <div className="mono cin" style={{ marginBottom: 6 }}>Tonight&apos;s mission</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", fontWeight: 500, lineHeight: 1.4 }}>
                {plan.opening_line}
              </div>
            </div>

            {plan.skip_list?.length > 0 && (
              <div style={{ marginBottom: 20, padding: "14px 18px", border: "1px solid var(--rule)" }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 10 }}>Skip tonight</div>
                {plan.skip_list.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: i < plan.skip_list.length - 1 ? "1px solid var(--rule-2)" : "none" }}>
                    <span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>✕</span>
                    <div>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{item.chapter}</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginLeft: 8 }}>{item.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 12 }}>Your sessions</div>
              {sessions.map((session, i) => (
                <SessionBlock
                  key={i}
                  session={session}
                  startMinutes={getSessionStartMinutes(i)}
                  onMarkDone={() => markDone(i)}
                />
              ))}
            </div>

            {plan.formula_sheet?.length > 0 && (
              <div style={{ marginBottom: 24, padding: "14px 18px", border: "1px solid var(--rule)" }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Formula sheet</div>
                {plan.formula_sheet.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: i < plan.formula_sheet.length - 1 ? "1px solid var(--rule-2)" : "none" }}>
                    <code style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)", flexShrink: 0, minWidth: 120 }}>{f.formula}</code>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{f.context}</span>
                  </div>
                ))}
              </div>
            )}

            <button className="btn ghost" onClick={resetPlan} style={{ marginTop: 8 }}>
              Start over
            </button>
          </div>
        )}
      </main>
    </div>
  );
}