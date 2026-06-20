"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData } from "@/lib/user-data";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";
import { callAI, callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ── Marks types & helpers ──────────────────────────────────────────────────

type Subject = { id: number; name: string; score: number; weight: number };

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 1, name: "Physics",      score: 78, weight: 20 },
  { id: 2, name: "Chemistry",    score: 82, weight: 20 },
  { id: 3, name: "Mathematics",  score: 91, weight: 20 },
  { id: 4, name: "English",      score: 88, weight: 20 },
  { id: 5, name: "Computer Sci", score: 95, weight: 20 },
];

function pctToGpa4(p: number): number {
  if (p >= 93) return 4.0; if (p >= 90) return 3.7; if (p >= 87) return 3.3;
  if (p >= 83) return 3.0; if (p >= 80) return 2.7; if (p >= 77) return 2.3;
  if (p >= 73) return 2.0; if (p >= 70) return 1.7; if (p >= 67) return 1.3;
  if (p >= 60) return 1.0; return 0.0;
}

function pctToGrade(p: number): string {
  if (p >= 91) return "A1"; if (p >= 81) return "A2"; if (p >= 71) return "B1";
  if (p >= 61) return "B2"; if (p >= 51) return "C1"; if (p >= 41) return "C2";
  if (p >= 33) return "D"; return "E";
}

let nextSubjectId = 6;

// ── Score helpers ──────────────────────────────────────────────────────────

function Bar({ value, max, color = "var(--ink)" }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: 8, background: "var(--paper-2)", border: "1px solid var(--rule)", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${Math.min(100, (value / max) * 100)}%`, background: color, transition: "width 800ms cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

const PILLARS = [
  { key: "pqaScore",         label: "PYQ Accuracy",       max: 400, weight: "40%", desc: "Correct answers across Past Paper sessions"     },
  { key: "syllabusScore",    label: "Syllabus Coverage",  max: 250, weight: "25%", desc: "Subjects & chapters covered via Notes and Tutor" },
  { key: "mistakeScore",     label: "Mistake Velocity",   max: 200, weight: "20%", desc: "Fewer recent errors = higher score"              },
  { key: "consistencyScore", label: "Consistency",        max: 150, weight: "15%", desc: "Daily Focus streak and study frequency"          },
] as const;

// ── Peer Heatmap types & data ──────────────────────────────────────────────

type HeatBoard = "CBSE" | "JEE" | "NEET" | "IB" | "IGCSE";
type HeatTopic = { name: string; count: number };
type HeatSubject = { subject: string; topics: HeatTopic[] };

const HEAT_DATA: Record<HeatBoard, HeatSubject[]> = {
  CBSE: [
    { subject: "Mathematics", topics: [{ name: "Conic Sections", count: 847 }, { name: "Integrals", count: 634 }, { name: "Probability", count: 521 }, { name: "Matrices & Determinants", count: 489 }, { name: "Differential Equations", count: 412 }, { name: "Vector Algebra", count: 287 }] },
    { subject: "Physics", topics: [{ name: "Electromagnetic Induction", count: 723 }, { name: "Optics", count: 598 }, { name: "Semiconductor Devices", count: 445 }, { name: "Alternating Current", count: 412 }, { name: "Dual Nature of Matter", count: 334 }, { name: "Atoms & Nuclei", count: 298 }] },
    { subject: "Chemistry", topics: [{ name: "Organic Mechanisms", count: 812 }, { name: "Coordination Compounds", count: 687 }, { name: "Electrochemistry", count: 534 }, { name: "p-Block Elements", count: 478 }, { name: "Polymers", count: 356 }, { name: "Biomolecules", count: 289 }] },
  ],
  JEE: [
    { subject: "Mathematics", topics: [{ name: "Complex Numbers", count: 1284 }, { name: "Quadratic Equations", count: 967 }, { name: "Sequences & Series", count: 834 }, { name: "Circle Geometry", count: 712 }, { name: "Permutations & Combinations", count: 645 }, { name: "3D Geometry", count: 589 }] },
    { subject: "Physics", topics: [{ name: "Rotational Motion", count: 1145 }, { name: "Thermodynamics", count: 987 }, { name: "Electrostatics", count: 823 }, { name: "SHM & Waves", count: 734 }, { name: "Modern Physics", count: 612 }, { name: "Fluid Mechanics", count: 489 }] },
    { subject: "Chemistry", topics: [{ name: "Mole Concept", count: 934 }, { name: "Chemical Bonding", count: 812 }, { name: "General Organic Chemistry", count: 756 }, { name: "Ionic Equilibrium", count: 678 }, { name: "Thermochemistry", count: 534 }, { name: "d-Block Elements", count: 445 }] },
  ],
  NEET: [
    { subject: "Biology", topics: [{ name: "Genetics & Inheritance", count: 1156 }, { name: "Human Physiology", count: 934 }, { name: "Reproduction", count: 812 }, { name: "Ecology & Environment", count: 723 }, { name: "Plant Physiology", count: 567 }, { name: "Cell Biology", count: 489 }] },
    { subject: "Physics", topics: [{ name: "Laws of Motion", count: 712 }, { name: "Optics", count: 634 }, { name: "Electricity", count: 578 }, { name: "Work, Energy & Power", count: 489 }, { name: "Magnetism", count: 423 }, { name: "Thermodynamics", count: 345 }] },
    { subject: "Chemistry", topics: [{ name: "Organic Reactions", count: 867 }, { name: "Chemical Equilibrium", count: 712 }, { name: "Periodic Table Trends", count: 589 }, { name: "Biomolecules", count: 512 }, { name: "Coordination Chemistry", count: 445 }, { name: "Solid State", count: 334 }] },
  ],
  IB: [
    { subject: "Mathematics", topics: [{ name: "Calculus", count: 634 }, { name: "Statistics", count: 512 }, { name: "Vectors", count: 445 }, { name: "Complex Numbers", count: 389 }, { name: "Proof", count: 312 }, { name: "Differential Eqs", count: 267 }] },
    { subject: "Physics", topics: [{ name: "Wave Phenomena", count: 567 }, { name: "Electricity & Mag", count: 489 }, { name: "Thermal Physics", count: 412 }, { name: "Quantum & Nuclear", count: 378 }, { name: "Fields", count: 334 }, { name: "Mechanics", count: 289 }] },
    { subject: "Chemistry", topics: [{ name: "Organic Chemistry", count: 623 }, { name: "Equilibrium", count: 512 }, { name: "Acid-Base Chemistry", count: 445 }, { name: "Redox Reactions", count: 389 }, { name: "Energetics", count: 334 }, { name: "Bonding Structure", count: 289 }] },
  ],
  IGCSE: [
    { subject: "Mathematics", topics: [{ name: "Algebra", count: 534 }, { name: "Trigonometry", count: 445 }, { name: "Geometry & Mensuration", count: 389 }, { name: "Probability & Stats", count: 334 }, { name: "Functions & Graphs", count: 289 }, { name: "Vectors & Matrices", count: 234 }] },
    { subject: "Physics", topics: [{ name: "Forces & Motion", count: 489 }, { name: "Waves & Optics", count: 412 }, { name: "Electricity", count: 378 }, { name: "Thermal Physics", count: 312 }, { name: "Magnetism", count: 267 }, { name: "Radioactivity", count: 223 }] },
    { subject: "Chemistry", topics: [{ name: "Organic Chemistry", count: 523 }, { name: "Acids & Bases", count: 445 }, { name: "Metals & Reactivity", count: 389 }, { name: "Electrolysis", count: 312 }, { name: "Rates of Reaction", count: 267 }, { name: "The Periodic Table", count: 234 }] },
  ],
};

const HEAT_MAX = 1300;

function heatColor(count: number): string {
  if (count >= 900) return "var(--cinnabar)"; if (count >= 600) return "var(--gold)";
  if (count >= 400) return "var(--gold)"; if (count >= 200) return "var(--sage)";
  return "var(--ink-3)";
}
function heatBg(count: number): string {
  if (count >= 900) return "color-mix(in srgb, var(--cinnabar) 12%, var(--paper-2))";
  if (count >= 600) return "color-mix(in srgb, var(--gold) 10%, var(--paper-2))";
  if (count >= 400) return "color-mix(in srgb, var(--gold) 10%, var(--paper-2))";
  if (count >= 200) return "color-mix(in srgb, var(--sage) 8%, var(--paper-2))";
  return "var(--paper)";
}

// ── Exam Debrief types ─────────────────────────────────────────────────────

type DebriefResult = { immediate_focus: string; pattern_note: string; sleep_impact: string; next_session: string; mindset_note: string };
type DebriefEntry  = { id: string; date: string; examName: string; scorePercent: number; hardTopics: string; sleepHours: number; anxietyLevel: number; examBoard: string; result: DebriefResult };

const DEBRIEF_BOARDS = ["CBSE", "ICSE", "IB", "IGCSE", "JEE", "NEET", "A-Level", "SAT", "Other"];
const ANXIETY_LABELS: Record<number, string> = { 1: "Calm", 2: "Mildly anxious", 3: "Nervous", 4: "Very anxious", 5: "Overwhelmed" };
const ANXIETY_COLORS: Record<number, string> = { 1: "var(--sage)", 2: "#5aaf6a", 3: "var(--gold)", 4: "#d45a22", 5: "var(--cinnabar-ink)" };

const DEBRIEF_LS_KEY = "ledger-exam-debriefs";
function loadDebriefHistory(): DebriefEntry[] { try { return JSON.parse(localStorage.getItem(DEBRIEF_LS_KEY) || "[]"); } catch { return []; } }
function saveDebriefEntry(entry: DebriefEntry) { localStorage.setItem(DEBRIEF_LS_KEY, JSON.stringify([entry, ...loadDebriefHistory()].slice(0, 50))); }
function formatDebriefDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }

// ── Tab components ─────────────────────────────────────────────────────────

function MarksTab() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [target, setTarget] = useState(90);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then((data) => {
      if (data?.marks) {
        const { subjects: s, target: t } = data.marks as { subjects: Subject[]; target: number };
        if (Array.isArray(s) && s.length) setSubjects(s);
        if (typeof t === "number") setTarget(t);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { patchUserData(user.id, "marks", { subjects, target }); }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [subjects, target, user]);

  const [whatIfId, setWhatIfId] = useState<number | null>(null);
  const [whatIfScore, setWhatIfScore] = useState(80);

  const totalWeight = subjects.reduce((s, x) => s + x.weight, 0);
  const { currentPct, needed } = useMemo(() => {
    if (!totalWeight) return { currentPct: 0, needed: null };
    const currentPct = subjects.reduce((s, x) => s + x.score * (x.weight / totalWeight), 0);
    const remaining = 100 - totalWeight;
    const needed = remaining > 0 ? ((target - currentPct * (totalWeight / 100)) / (remaining / 100)) : null;
    return { currentPct, needed };
  }, [subjects, target, totalWeight]);

  const gpa4 = pctToGpa4(currentPct);
  const grade = pctToGrade(currentPct);
  const gpaIndian = Math.round(currentPct / 9.5 * 10) / 10;

  const hypotheticalPct = useMemo(() => {
    if (whatIfId === null || !totalWeight) return null;
    return subjects.reduce((sum, s) => { const score = s.id === whatIfId ? whatIfScore : s.score; return sum + score * (s.weight / totalWeight); }, 0);
  }, [whatIfId, whatIfScore, subjects, totalWeight]);

  function update(id: number, field: keyof Subject, val: number | string) {
    setSubjects((prev) => prev.map((s) => s.id === id ? { ...s, [field]: field === "name" ? val : Math.max(0, Math.min(100, Number(val))) } : s));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>The math of your report card</div>
      </div>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        <div>
          <div className="mono cin">Input · Current scores &amp; weights</div>
          <div className="mob-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, fontFamily: "var(--sans)", fontSize: 13 }}>
              <thead>
                <tr className="mono" style={{ color: "var(--ink-3)", textAlign: "left" }}>
                  <th style={{ padding: "8px 0", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}>Subject</th>
                  <th style={{ padding: "8px 0 8px 12px", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}>Score /100</th>
                  <th style={{ padding: "8px 0 8px 12px", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}>Weight %</th>
                  <th style={{ padding: "8px 0", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}></th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <td style={{ padding: "10px 0" }}><input value={s.name} onChange={(e) => update(s.id, "name", e.target.value)} style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, border: "none", background: "transparent", color: "var(--ink)", width: "100%" }} /></td>
                    <td style={{ padding: "10px 0 10px 12px" }}><input type="number" min="0" max="100" value={s.score} onChange={(e) => update(s.id, "score", e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 6px", width: 64, color: "var(--ink)" }} /></td>
                    <td style={{ padding: "10px 0 10px 12px" }}><input type="number" min="0" max="100" value={s.weight} onChange={(e) => update(s.id, "weight", e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 6px", width: 64, color: "var(--ink)" }} /></td>
                    <td style={{ padding: "10px 0", textAlign: "right" }}><button onClick={() => setSubjects((p) => p.filter((x) => x.id !== s.id))} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setSubjects((p) => [...p, { id: nextSubjectId++, name: "New Subject", score: 0, weight: 0 }])} style={{ marginTop: 10, background: "none", border: "1px dashed var(--rule)", padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", color: "var(--ink-2)", width: "100%" }}>+ Add subject</button>
          <div style={{ marginTop: 24 }}>
            <div className="mono cin">Target percentage</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 10 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{target}%</span>
            </div>
            <input type="range" min="40" max="100" value={target} onChange={(e) => setTarget(+e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar-ink)", marginTop: 10 }} />
            <div className="mono" style={{ color: "var(--ink-3)", display: "flex", justifyContent: "space-between", marginTop: 4 }}><span>40%</span><span>70%</span><span>100%</span></div>
          </div>
        </div>
        <div>
          <div className="mono cin">Output · Your results</div>
          <div style={{ marginTop: 14, border: "none", padding: 28 }}>
            <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 20, marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--ink-3)" }}>Current weighted average</div>
              <div className="mob-n96" style={{ fontFamily: "var(--serif)", fontSize: 96, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.9, marginTop: 6 }}>{currentPct.toFixed(1)}<span style={{ fontSize: 32 }}>%</span></div>
              <div className="mob-gpa-row" style={{ display: "flex", gap: 24, marginTop: 14 }}>
                <div><div className="mono" style={{ color: "var(--ink-3)" }}>CBSE Grade</div><div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 600, marginTop: 4 }}>{grade}</div></div>
                <div><div className="mono" style={{ color: "var(--ink-3)" }}>GPA (4.0)</div><div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 600, marginTop: 4 }}>{gpa4.toFixed(1)}</div></div>
                <div><div className="mono" style={{ color: "var(--ink-3)" }}>GPA (10-pt)</div><div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 600, marginTop: 4 }}>{gpaIndian}</div></div>
              </div>
            </div>
            {needed !== null && (
              <div>
                <div className="mono" style={{ color: "var(--ink-3)" }}>Score needed in remaining {100 - totalWeight}% weight to reach {target}%</div>
                <div className="mob-n64" style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 6, color: needed > 100 ? "var(--cinnabar-ink)" : "var(--ink)" }}>
                  {needed < 0 ? "Already achieved" : needed > 100 ? `${needed.toFixed(0)}% ← not possible` : `${needed.toFixed(1)}%`}
                </div>
              </div>
            )}
            {totalWeight === 100 && <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}><span className="mono" style={{ color: "var(--ink-3)" }}>Weights sum to 100% — final result is locked.</span></div>}
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="mono cin">Score breakdown</div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Click a bar to run What-if</div>
            </div>
            {subjects.map((s) => {
              const isWhatIf = whatIfId === s.id;
              return (
                <div key={s.id} style={{ marginBottom: isWhatIf ? 0 : 10 }}>
                  <button onClick={() => { setWhatIfId(isWhatIf ? null : s.id); setWhatIfScore(s.score); }} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: isWhatIf ? "var(--cinnabar-ink)" : "var(--ink)" }}>{s.name}</span>
                    <span className="mono" style={{ color: "var(--ink-3)" }}>{s.score}%</span>
                  </button>
                  <div style={{ height: 6, background: "var(--paper-2)", border: `1px solid ${isWhatIf ? "var(--cinnabar-ink)" : "var(--rule)"}` }}>
                    <div style={{ height: "100%", width: `${s.score}%`, background: s.score >= target ? "var(--cinnabar)" : "var(--ink-3)", transition: "width 300ms" }} />
                  </div>
                  {isWhatIf && (
                    <div style={{ margin: "8px 0 14px", padding: "16px", border: "1px solid var(--cinnabar-ink)", background: "var(--paper-2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>What if {s.name} = {whatIfScore}%?</span>
                        {hypotheticalPct !== null && <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", fontWeight: 700 }}>{hypotheticalPct.toFixed(1)}%<span className="mono" style={{ fontSize: 11, marginLeft: 8, color: hypotheticalPct > currentPct ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>{hypotheticalPct > currentPct ? "+" : ""}{(hypotheticalPct - currentPct).toFixed(1)}%</span></span>}
                      </div>
                      <input type="range" min={0} max={100} value={whatIfScore} onChange={e => setWhatIfScore(+e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar)" }} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>0%</span><span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>100%</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreTab() {
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try { setScore(computeLedgerScore()); } catch { setScore({ total: 100, pqaScore: 0, syllabusScore: 0, mistakeScore: 100, consistencyScore: 0, pqaAccuracy: 0, papersCount: 0, syllabusUploaded: false, subjectsCovered: 0, subjectsTotal: 0, recentMistakes: 0, streak: 0, actions: ["Do your first Past Papers session — PYQ accuracy is 40% of your score", "Upload your syllabus — this alone unlocks up to 250 score points", "Start a Focus session today to open your streak"], subjectAccuracy: [] }); }
    setMounted(true);
  }, []);

  if (!mounted || !score) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="mono" style={{ color: "var(--ink-3)" }}>Computing score…</div></div>;

  const tier = scoreTier(score.total);
  const pctToNext = tier.nextAt < 1000 ? Math.round(((score.total - (tier.nextAt - 200)) / 200) * 100) : 100;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger Score™ · Your academic readiness index</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Updates every time you use a tool</div>
      </div>
      <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 32, marginBottom: 40, display: "flex", alignItems: "flex-end", gap: 40, flexWrap: "wrap" }}>
        <div>
          <div className="mono cin" style={{ marginBottom: 6 }}>Ledger Score™</div>
          <div className="mob-n96" style={{ fontFamily: "var(--serif)", fontSize: 120, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 0.85 }}>{score.total}</div>
          <div className="mono" style={{ marginTop: 10, color: "var(--ink-3)" }}>out of 1000</div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: "none", padding: "6px 14px", marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", fontWeight: 600 }}>{tier.label}</span>
            {tier.nextAt < 1000 && <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{tier.nextAt - score.total} pts to {tier.next}</span>}
          </div>
          <div style={{ height: 12, background: "var(--paper-2)", border: "none", position: "relative", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(score.total / 1000) * 100}%`, background: "var(--ink)", transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
            {[200, 400, 600, 800].map(t => <div key={t} style={{ position: "absolute", top: 0, bottom: 0, left: `${t / 10}%`, width: 1, background: "var(--paper)", opacity: 0.3 }} />)}
          </div>
          <div className="mono" style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "var(--ink-3)", fontSize: 9 }}><span>0</span><span>Beginner</span><span>Building</span><span>Developing</span><span>Strong</span><span>Exam Ready</span></div>
          {tier.nextAt < 1000 && <div className="mono" style={{ marginTop: 8, color: "var(--cinnabar-ink)", fontSize: 9 }}>{pctToNext}% of the way to {tier.next}</div>}
        </div>
      </div>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        <div>
          <div className="mono cin" style={{ marginBottom: 16 }}>Score Breakdown</div>
          {PILLARS.map(p => {
            const val = score[p.key] as number;
            const pct = Math.round((val / p.max) * 100);
            return (
              <div key={p.key} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--rule)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600 }}>{p.label}</span>
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}><span style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em" }}>{val}</span><span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>/ {p.max}</span></div>
                </div>
                <Bar value={val} max={p.max} color={pct >= 70 ? "var(--ink)" : pct >= 40 ? "var(--ink-2)" : "var(--ink-3)"} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}><span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{p.desc}</span><span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{p.weight} of total</span></div>
              </div>
            );
          })}
          <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", background: "var(--paper-2)" }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>Activity snapshot</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Papers done", score.papersCount, "sessions"], ["PYQ accuracy", `${Math.round(score.pqaAccuracy * 100)}%`, ""], ["Subjects covered", `${score.subjectsCovered}${score.subjectsTotal > 0 ? ` / ${score.subjectsTotal}` : ""}`, "subjects"], ["Recent mistakes", score.recentMistakes, "last 7 days"], ["Focus streak", `${score.streak}d`, ""], ["Syllabus", score.syllabusUploaded ? "Uploaded" : "Not yet", ""]].map(([label, val, unit], i) => (
                <div key={i}><div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{label}</div><div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 700, marginTop: 2 }}>{String(val)} <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{unit}</span></div></div>
              ))}
            </div>
          </div>
        </div>
        <div>
          {score.actions.length > 0 && (
            <div style={{ border: "none", marginBottom: 32 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)", background: "var(--ink)" }}><div className="mono" style={{ color: "var(--paper)", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 9 }}>Top actions to gain points today</div></div>
              {score.actions.map((action, i) => <div key={i} style={{ padding: "16px 20px", borderBottom: i < score.actions.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 14, alignItems: "flex-start" }}><span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span><span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{action}</span></div>)}
            </div>
          )}
          {score.subjectAccuracy.length > 0 ? (
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Accuracy by subject</div>
              {score.subjectAccuracy.map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{s.subject}</span><div style={{ display: "flex", gap: 12, alignItems: "baseline" }}><span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{s.sessions} session{s.sessions !== 1 ? "s" : ""}</span><span className="mono" style={{ color: s.accuracy >= 0.7 ? "var(--ink)" : "var(--cinnabar-ink)" }}>{Math.round(s.accuracy * 100)}%</span></div></div>
                  <Bar value={Math.round(s.accuracy * 100)} max={100} color={s.accuracy >= 0.7 ? "var(--ink)" : "var(--cinnabar-ink)"} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ border: "1px solid var(--rule)", padding: "24px 20px", background: "var(--paper-2)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", marginBottom: 8 }}>No paper sessions yet.</div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 16 }}>Do a Past Papers session to see your accuracy by subject.</div>
              <Link href="/tools/papers" className="btn ghost" style={{ textDecoration: "none", display: "inline-block" }}>Start a session →</Link>
            </div>
          )}
          <div style={{ marginTop: 32, border: "1px solid var(--rule)", padding: "20px" }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>How it&apos;s calculated</div>
            {[["PYQ Accuracy", "400 pts", "Correct answers on past papers, weighted by sessions done"], ["Syllabus Coverage", "250 pts", "Subjects covered via Notes and Tutor vs your uploaded syllabus"], ["Mistake Velocity", "200 pts", "Inversely proportional to mistakes logged in the last 7 days"], ["Consistency", "150 pts", "Daily Focus streak — compound interest of your study habit"]].map(([label, pts, desc], i, arr) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--rule)" : "none" }}><span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, width: 28 }}>{pts}</span><div><div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>{label}</div><div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div></div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function heatLabel(count: number): string {
  if (count >= 900) return "Critical"; if (count >= 600) return "High";
  if (count >= 400) return "Moderate"; if (count >= 200) return "Low";
  return "Minimal";
}

function PeerHeatmapTab() {
  const [board, setBoard] = useState<HeatBoard>("CBSE");
  const data = HEAT_DATA[board];
  const allTopics = data.flatMap(s => s.topics.map(t => ({ ...t, subject: s.subject })));
  const hardest = [...allTopics].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div>
      {/* Disclaimer banner */}
      <div style={{ border: "1px solid var(--rule)", background: "var(--paper-2)", padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9, flexShrink: 0, marginTop: 1 }}>ⓘ</span>
        <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
          <strong>Illustrative data.</strong> This heatmap shows representative difficulty patterns based on common exam topics — not aggregated from real student sessions. Live aggregation will replace this once enough students have completed past-paper sessions.
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const, marginBottom: 32, overflow: "hidden" }}>
        {(["CBSE", "JEE", "NEET", "IB", "IGCSE"] as HeatBoard[]).map((b) => (
          <button key={b} onClick={() => setBoard(b)} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 8, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", cursor: "pointer", transition: "background 160ms, color 160ms" }}>{b}</button>
        ))}
      </div>

      <div className="mono cin" style={{ marginBottom: 12 }}>Top 5 — hardest topics for {board}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--rule)", border: "none", marginBottom: 36 }} className="mob-col">
        {hardest.map((t, i) => (
          <div key={i} style={{ padding: "16px 14px", background: heatBg(t.count) }}>
            <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginBottom: 4 }}>#{i + 1}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{t.name}</div>
            <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginBottom: 10 }}>{t.subject}</div>
            <div style={{ height: 3, background: "var(--rule)", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${Math.min(100, (t.count / HEAT_MAX) * 100)}%`, background: heatColor(t.count) }} />
            </div>
            <div className="mono" style={{ fontSize: 8, color: heatColor(t.count) }}>{heatLabel(t.count)} difficulty</div>
          </div>
        ))}
      </div>

      <div className="mono cin" style={{ marginBottom: 16 }}>Full heatmap — {board}</div>
      {data.map(subj => (
        <div key={subj.subject} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8, paddingLeft: 2 }}>{subj.subject}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)" }} className="mob-col">
            {subj.topics.map(t => (
              <div key={t.name} style={{ padding: "14px 16px", background: heatBg(t.count) }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.3, marginBottom: 8 }}>{t.name}</div>
                <div style={{ height: 3, background: "var(--rule)", marginBottom: 5 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (t.count / HEAT_MAX) * 100)}%`, background: heatColor(t.count) }} />
                </div>
                <div className="mono" style={{ fontSize: 8, color: heatColor(t.count) }}>{heatLabel(t.count)} difficulty</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Difficulty scale:</div>
        {[{ label: "Minimal", color: "var(--ink-3)" }, { label: "Low", color: "var(--sage)" }, { label: "Moderate", color: "var(--gold)" }, { label: "High", color: "var(--gold)" }, { label: "Critical", color: "var(--cinnabar)" }].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, background: l.color, borderRadius: 1, flexShrink: 0 }} />
            <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{l.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamDebriefTab() {
  const [form, setForm] = useState({ examName: "", scorePercent: "", hardTopics: "", sleepHours: "7", anxietyLevel: 3, examBoard: "CBSE" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebriefResult | null>(null);
  const [history, setHistory] = useState<DebriefEntry[]>([]);
  const [error, setError] = useState("");
  const [view, setView] = useState<"form" | "result" | "history">("form");

  useEffect(() => { setHistory(loadDebriefHistory()); }, []);

  async function generate() {
    if (!form.examName.trim() || !form.scorePercent) { setError("Add the exam name and your score first."); return; }
    setLoading(true); setError("");
    try {
      const res = await callAIOrThrow<DebriefResult>({ tool: "exam_debrief", examName: form.examName, scorePercent: parseFloat(form.scorePercent), hardTopics: form.hardTopics, sleepHours: parseFloat(form.sleepHours), anxietyLevel: form.anxietyLevel, examBoard: form.examBoard });
      if (!res?.immediate_focus) { setError("Could not generate debrief. Try again."); return; }
      setResult(res);
      const entry: DebriefEntry = { id: Date.now().toString(), date: new Date().toISOString(), examName: form.examName, scorePercent: parseFloat(form.scorePercent), hardTopics: form.hardTopics, sleepHours: parseFloat(form.sleepHours), anxietyLevel: form.anxietyLevel, examBoard: form.examBoard, result: res };
      saveDebriefEntry(entry);
      setHistory(loadDebriefHistory());
      setView("result");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  function newDebrief() { setResult(null); setForm({ examName: "", scorePercent: "", hardTopics: "", sleepHours: "7", anxietyLevel: 3, examBoard: "CBSE" }); setView("form"); }

  const scoreNum = parseFloat(form.scorePercent) || 0;
  const scoreColor = scoreNum >= 80 ? "var(--sage)" : scoreNum >= 55 ? "var(--gold)" : "var(--cinnabar-ink)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Log your score, sleep, and stress. AI detects your patterns after 3 exams.</div>
        {history.length > 0 && <button onClick={() => setView(view === "history" ? "form" : "history")} style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", border: "1px solid var(--rule)", background: "transparent", color: "var(--ink-3)", cursor: "pointer" }}>{view === "history" ? "New debrief" : `History (${history.length})`}</button>}
      </div>

      {view === "history" && (
        <div style={{ maxWidth: 680 }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>Your exam history.</h2>
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", margin: "0 0 28px", lineHeight: 1.6 }}>{history.length >= 3 ? "Pattern detected across your debriefs — review the notes below each exam." : `${3 - history.length} more debrief${3 - history.length !== 1 ? "s" : ""} before pattern analysis unlocks.`}</p>
          {history.map(entry => (
            <div key={entry.id} style={{ border: "1px solid var(--rule)", marginBottom: 16, background: "var(--paper-2)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, fontStyle: "italic" }}>{entry.examName}</div><div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 3 }}>{formatDebriefDate(entry.date)} · {entry.examBoard}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, lineHeight: 1, color: entry.scorePercent >= 80 ? "var(--sage)" : entry.scorePercent >= 55 ? "var(--gold)" : "var(--cinnabar-ink)" }}>{entry.scorePercent}%</div><div className="mono" style={{ fontSize: 9, color: ANXIETY_COLORS[entry.anxietyLevel], marginTop: 2 }}>{ANXIETY_LABELS[entry.anxietyLevel]}</div></div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Immediate focus</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{entry.result.immediate_focus}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "result" && result && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ marginBottom: 32 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Debrief · {form.examName}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", color: scoreColor }}>{form.scorePercent}%</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{form.examBoard} · {form.sleepHours}h sleep · {ANXIETY_LABELS[form.anxietyLevel].toLowerCase()}</div>
            </div>
          </div>
          {[{ label: "Immediate focus", text: result.immediate_focus }, { label: "Pattern insight", text: result.pattern_note }, { label: "Sleep impact", text: result.sleep_impact }, { label: "Next study session", text: result.next_session }, { label: "Mindset note", text: result.mindset_note }].map(({ label, text }) => (
            <div key={label} style={{ marginBottom: 28 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 }}>{label}</div>
              <AIOutput text={text} noBorder />
            </div>
          ))}
          <button className="btn ghost" onClick={newDebrief} style={{ width: "100%", marginTop: 8 }}>Log another exam →</button>
        </div>
      )}

      {view === "form" && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, lineHeight: 1.1, margin: "0 0 10px" }}>Debrief every exam.</h2>
            <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>Log your score, sleep, and stress level. After 3 exams, the AI detects your personal patterns — what&apos;s actually holding your score back.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Exam name</div>
              <input value={form.examName} onChange={e => setForm(f => ({ ...f, examName: e.target.value }))} placeholder="e.g. Physics Unit Test 2" style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Score (%)</div>
              <input type="number" min={0} max={100} value={form.scorePercent} onChange={e => setForm(f => ({ ...f, scorePercent: e.target.value }))} placeholder="67" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${scoreNum > 0 ? scoreColor : "var(--rule)"}`, background: "var(--paper)", color: scoreNum > 0 ? scoreColor : "var(--ink)", fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, boxSizing: "border-box", transition: "border-color 200ms, color 200ms" }} />
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Board</div>
              <select value={form.examBoard} onChange={e => setForm(f => ({ ...f, examBoard: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{DEBRIEF_BOARDS.map(b => <option key={b}>{b}</option>)}</select>
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Topics that destroyed you (optional)</div>
            <textarea value={form.hardTopics} onChange={e => setForm(f => ({ ...f, hardTopics: e.target.value }))} rows={3} placeholder="e.g. Electrostatics, Organic mechanisms, Integration by parts..." style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Sleep last night</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: parseFloat(form.sleepHours) < 6 ? "var(--cinnabar-ink)" : "var(--ink)" }}>{form.sleepHours}h</div>
            </div>
            <input type="range" min={2} max={12} step={0.5} value={form.sleepHours} onChange={e => setForm(f => ({ ...f, sleepHours: e.target.value }))} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Anxiety level going in</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setForm(f => ({ ...f, anxietyLevel: n }))} style={{ flex: 1, padding: "10px 0", border: `1px solid ${form.anxietyLevel === n ? ANXIETY_COLORS[n] : "var(--rule)"}`, background: form.anxietyLevel === n ? `${ANXIETY_COLORS[n]}18` : "transparent", color: form.anxietyLevel === n ? ANXIETY_COLORS[n] : "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 160ms ease" }}>{n}</button>)}
            </div>
            <div className="mono" style={{ fontSize: 9, color: ANXIETY_COLORS[form.anxietyLevel], marginTop: 6 }}>{ANXIETY_LABELS[form.anxietyLevel]}</div>
          </div>
          {error && <div className="mono" style={{ fontSize: 12, color: "var(--cinnabar-ink)", marginBottom: 16, padding: "10px 14px", border: "1px solid var(--cinnabar-ink)" }}>{error}</div>}
          {loading && <div style={{ marginBottom: 16 }}><AIThinking /></div>}
          <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%" }}>{loading ? "Analysing…" : "Generate debrief →"}</button>
          <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center", marginTop: 12 }}>Saved locally · Patterns unlock after 3 exams</p>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type Tab = "marks" | "score" | "heatmap" | "debrief";
const TABS: [Tab, string][] = [["marks", "Marks Predictor"], ["score", "Ledger Score"], ["heatmap", "Peer Heatmap"], ["debrief", "Exam Debrief"]];

export default function GradeTrackerPage() {
  const [tab, setTab] = useState<Tab>("marks");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Grade Tracker</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Marks, Ledger Score, peer data, and exam debrief in one place.</div>
        </div>
        <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "marks"   && <MarksTab />}
        {tab === "score"   && <ScoreTab />}
        {tab === "heatmap" && <PeerHeatmapTab />}
        {tab === "debrief" && <ExamDebriefTab />}
      </main>
    </div>
  );
}
