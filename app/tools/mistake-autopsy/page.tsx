"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import callAI from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type ErrorType =
  | "silly_arithmetic"
  | "formula_gap"
  | "conceptual_misunderstanding"
  | "misread_question"
  | "trap_question"
  | "time_pressure_guess"
  | "knowledge_gap";

type Severity = "careless" | "habit" | "foundational";

interface AutopsyResult {
  error_type: ErrorType;
  root_cause: string;
  the_actual_gap: string;
  prevention_protocol: string;
  similar_patterns: string;
  severity: Severity;
  weekly_pattern_note?: string;
}

interface MistakeEntry {
  id: string;
  timestamp: number;
  question: string;
  my_answer: string;
  correct_answer: string;
  subject: string;
  chapter: string;
  result: AutopsyResult;
}

interface WeeklySynthesis {
  weekly_pattern_note: string;
}

const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  silly_arithmetic: "Silly Arithmetic",
  formula_gap: "Formula Gap",
  conceptual_misunderstanding: "Conceptual Misunderstanding",
  misread_question: "Misread Question",
  trap_question: "Trap Question",
  time_pressure_guess: "Time Pressure Guess",
  knowledge_gap: "Knowledge Gap",
};

const ERROR_TYPE_COLORS: Record<ErrorType, string> = {
  silly_arithmetic: "#e07b39",
  formula_gap: "#c0392b",
  conceptual_misunderstanding: "#8e44ad",
  misread_question: "#2980b9",
  trap_question: "#16a085",
  time_pressure_guess: "#d35400",
  knowledge_gap: "#c0392b",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  careless: "Careless — fixable fast",
  habit: "Habit — needs 2 weeks of drilling",
  foundational: "Foundational — needs concept rebuild",
};

const SEVERITY_COLORS: Record<Severity, string> = {
  careless: "#e07b39",
  habit: "#d35400",
  foundational: "#c0392b",
};

const SUBJECT_SUGGESTIONS = ["Physics", "Chemistry", "Mathematics", "Biology"];
const CHAPTER_SUGGESTIONS: Record<string, string[]> = {
  Physics: ["Mechanics", "Thermodynamics", "Electrostatics", "Optics", "Modern Physics", "Waves"],
  Chemistry: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Electrochemistry", "Equilibrium"],
  Mathematics: ["Calculus", "Algebra", "Trigonometry", "Coordinate Geometry", "Probability", "Vectors"],
  Biology: ["Cell Biology", "Genetics", "Ecology", "Human Physiology", "Plant Biology"],
};

const STORAGE_KEY = "mistake_autopsy_graveyard";

function loadGraveyard(): MistakeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MistakeEntry[]) : [];
  } catch {
    return [];
  }
}

function saveGraveyard(entries: MistakeEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function groupByErrorType(entries: MistakeEntry[]): Record<ErrorType, MistakeEntry[]> {
  const groups = {} as Record<ErrorType, MistakeEntry[]>;
  for (const entry of entries) {
    if (!groups[entry.result.error_type]) groups[entry.result.error_type] = [];
    groups[entry.result.error_type].push(entry);
  }
  return groups;
}

function getWeekEntries(entries: MistakeEntry[]): MistakeEntry[] {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return entries.filter((e) => e.timestamp > oneWeekAgo);
}

// Simple SVG pie chart
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumulative = 0;
  const slices: { path: string; color: string; label: string; value: number }[] = [];
  const cx = 80;
  const cy = 80;
  const r = 70;

  for (const d of data) {
    if (d.value === 0) continue;
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = d.value / total > 0.5 ? 1 : 0;
    const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
    slices.push({ path, color: d.color, label: d.label, value: d.value });
  }

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.85} stroke="var(--paper)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

// ─── AutopsyResult Component ──────────────────────────────────────────────────

function AutopsyResultCard({ result }: { result: AutopsyResult }) {
  return (
    <div
      style={{
        background: "var(--paper-2)",
        border: "1.5px solid var(--rule)",
        borderRadius: "4px",
        padding: "28px 28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              display: "inline-block",
              background: ERROR_TYPE_COLORS[result.error_type],
              color: "#fff",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              padding: "3px 10px",
              borderRadius: "2px",
              marginBottom: "6px",
              textTransform: "uppercase",
            }}
          >
            {ERROR_TYPE_LABELS[result.error_type]}
          </div>
          <div
            style={{
              display: "block",
              fontFamily: "var(--mono)",
              fontSize: "10px",
              letterSpacing: "0.06em",
              color: SEVERITY_COLORS[result.severity],
              textTransform: "uppercase",
            }}
          >
            ⚠ {SEVERITY_LABELS[result.severity]}
          </div>
        </div>
      </div>

      {/* Root cause */}
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "6px" }}>
          Root Cause
        </div>
        <AIOutput variant="principle" text={result.root_cause} />
      </div>

      {/* Actual gap */}
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "6px" }}>
          The Actual Gap
        </div>
        <p style={{ fontFamily: "var(--sans)", fontSize: "14px", color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>
          {result.the_actual_gap}
        </p>
      </div>

      {/* Prevention protocol */}
      <div
        style={{
          background: "var(--paper)",
          border: "1.5px solid var(--cinnabar)",
          borderRadius: "3px",
          padding: "14px 16px",
        }}
      >
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--cinnabar)", textTransform: "uppercase", marginBottom: "6px" }}>
          Prevention Protocol
        </div>
        <p style={{ fontFamily: "var(--sans)", fontSize: "14px", color: "var(--ink)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
          {result.prevention_protocol}
        </p>
      </div>

      {/* Similar patterns */}
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "6px" }}>
          Where This Error Will Strike Again
        </div>
        <p style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
          {result.similar_patterns}
        </p>
      </div>
    </div>
  );
}

// ─── MistakeGraveyard Component ───────────────────────────────────────────────

function MistakeGraveyard({
  entries,
  onDelete,
  weeklySynthesis,
  onWeeklySynthesis,
  isSynthesising,
}: {
  entries: MistakeEntry[];
  onDelete: (id: string) => void;
  weeklySynthesis: WeeklySynthesis | null;
  onWeeklySynthesis: () => void;
  isSynthesising: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const weekEntries = getWeekEntries(entries);
  const groups = groupByErrorType(entries);

  const pieData = (Object.keys(groups) as ErrorType[]).map((et) => ({
    label: ERROR_TYPE_LABELS[et],
    value: groups[et].length,
    color: ERROR_TYPE_COLORS[et],
  }));

  const dominantError = pieData.sort((a, b) => b.value - a.value)[0];

  if (entries.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 24px",
          color: "var(--ink-3)",
          fontFamily: "var(--sans)",
          fontSize: "14px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.4 }}>☠</div>
        <p style={{ margin: 0 }}>Your Graveyard is empty. Submit your first mistake to begin building your profile.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Pattern summary card */}
      <div
        style={{
          background: "var(--paper-2)",
          border: "1.5px solid var(--rule)",
          borderRadius: "4px",
          padding: "24px",
        }}
      >
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "16px" }}>
          Mistake Profile — {entries.length} total · {weekEntries.length} this week
        </div>
        <div style={{ display: "flex", gap: "28px", alignItems: "center", flexWrap: "wrap" }}>
          <PieChart data={pieData} />
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {pieData.map((d) => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--ink-2)" }}>
                    {d.label}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink-3)", marginLeft: "auto" }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
            {dominantError && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "10px 12px",
                  background: "var(--paper)",
                  border: `1.5px solid ${dominantError.color}`,
                  borderRadius: "3px",
                }}
              >
                <div style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: "0.08em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: "4px" }}>
                  Biggest failure mode
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--ink)", fontWeight: 600 }}>
                  {dominantError.label} ({dominantError.value}×)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly synthesis */}
        <div style={{ marginTop: "20px", borderTop: "1px solid var(--rule)", paddingTop: "16px" }}>
          {weeklySynthesis ? (
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--cinnabar)", textTransform: "uppercase", marginBottom: "8px" }}>
                Weekly AI Synthesis
              </div>
              <AIOutput variant="principle" text={weeklySynthesis.weekly_pattern_note} />
            </div>
          ) : (
            <button
              onClick={onWeeklySynthesis}
              disabled={isSynthesising || weekEntries.length < 2}
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                border: "none",
                borderRadius: "3px",
                fontFamily: "var(--mono)",
                fontSize: "11px",
                letterSpacing: "0.06em",
                padding: "8px 16px",
                cursor: isSynthesising || weekEntries.length < 2 ? "not-allowed" : "pointer",
                opacity: weekEntries.length < 2 ? 0.5 : 1,
                textTransform: "uppercase",
              }}
            >
              {isSynthesising ? "Synthesising…" : weekEntries.length < 2 ? "Add 2+ mistakes this week to unlock" : "Run Weekly Synthesis"}
            </button>
          )}
          {isSynthesising && <AIThinking />}
        </div>
      </div>

      {/* Grouped entries */}
      {(Object.keys(groups) as ErrorType[]).map((et) => (
        <div key={et}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: ERROR_TYPE_COLORS[et],
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                color: "var(--ink-2)",
                textTransform: "uppercase",
              }}
            >
              {ERROR_TYPE_LABELS[et]} ({groups[et].length})
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {groups[et]
              .slice()
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: "var(--paper-2)",
                    border: "1px solid var(--rule)",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      cursor: "pointer",
                      gap: "12px",
                    }}
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: "13px",
                          color: "var(--ink)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginBottom: "3px",
                        }}
                      >
                        {entry.question.slice(0, 90)}{entry.question.length > 90 ? "…" : ""}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "10px",
                          color: "var(--ink-3)",
                        }}
                      >
                        {entry.subject && `${entry.subject} · `}{entry.chapter && `${entry.chapter} · `}
                        {new Date(entry.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9px",
                          letterSpacing: "0.06em",
                          color: SEVERITY_COLORS[entry.result.severity],
                          textTransform: "uppercase",
                        }}
                      >
                        {entry.result.severity}
                      </span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--ink-3)" }}>
                        {expandedId === entry.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                  {expandedId === entry.id && (
                    <div style={{ padding: "0 14px 14px" }}>
                      <AutopsyResultCard result={entry.result} />
                      <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => onDelete(entry.id)}
                          style={{
                            background: "none",
                            border: "1px solid var(--rule)",
                            borderRadius: "3px",
                            fontFamily: "var(--mono)",
                            fontSize: "10px",
                            color: "var(--ink-3)",
                            padding: "4px 10px",
                            cursor: "pointer",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MistakeAutopsyPage() {
  const [view, setView] = useState<"autopsy" | "graveyard">("autopsy");

  // Input state
  const [question, setQuestion] = useState("");
  const [myAnswer, setMyAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");

  // Result state
  const [result, setResult] = useState<AutopsyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Graveyard state
  const [graveyard, setGraveyard] = useState<MistakeEntry[]>([]);
  const [weeklySynthesis, setWeeklySynthesis] = useState<WeeklySynthesis | null>(null);
  const [isSynthesising, setIsSynthesising] = useState(false);

  // Chapters for selected subject
  const availableChapters = subject ? (CHAPTER_SUGGESTIONS[subject] ?? []) : [];

  useEffect(() => {
    setGraveyard(loadGraveyard());
  }, []);

  const handleSubmit = async () => {
    if (!question.trim() || !myAnswer.trim() || !correctAnswer.trim()) {
      setError("Please fill in the question, your answer, and the correct answer.");
      return;
    }
    setError(null);
    setResult(null);
    setIsLoading(true);
    try {
      const res = await callAI({
        tool: "mistake_autopsy",
        question: question.trim(),
        my_answer: myAnswer.trim(),
        correct_answer: correctAnswer.trim(),
        subject: subject.trim(),
        chapter: chapter.trim(),
      }) as AutopsyResult;
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToGraveyard = () => {
    if (!result) return;
    const entry: MistakeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      question,
      my_answer: myAnswer,
      correct_answer: correctAnswer,
      subject,
      chapter,
      result,
    };
    const updated = [entry, ...graveyard];
    setGraveyard(updated);
    saveGraveyard(updated);
    // Reset
    setQuestion("");
    setMyAnswer("");
    setCorrectAnswer("");
    setResult(null);
    setView("graveyard");
  };

  const handleDelete = (id: string) => {
    const updated = graveyard.filter((e) => e.id !== id);
    setGraveyard(updated);
    saveGraveyard(updated);
  };

  const handleWeeklySynthesis = async () => {
    const weekEntries = getWeekEntries(graveyard);
    if (weekEntries.length < 2) return;
    setIsSynthesising(true);
    try {
      const summaries = weekEntries.map((e) => ({
        error_type: e.result.error_type,
        root_cause: e.result.root_cause,
        the_actual_gap: e.result.the_actual_gap,
        severity: e.result.severity,
        subject: e.subject,
        chapter: e.chapter,
      }));
      const res = await callAI({
        tool: "mistake_autopsy",
        mode: "weekly_synthesis",
        entries: summaries,
      }) as WeeklySynthesis;
      setWeeklySynthesis(res);
    } catch {
      // silently fail
    } finally {
      setIsSynthesising(false);
    }
  };

  const graveyardCount = graveyard.length;

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
          borderBottom: "1px solid var(--rule)",
          padding: "0 24px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "var(--paper)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/dashboard"
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              color: "var(--ink-3)",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            ← Dashboard
          </Link>
          <span style={{ color: "var(--rule)" }}>|</span>
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: "15px",
              color: "var(--ink)",
              fontStyle: "italic",
            }}
          >
            Mistake Autopsy
          </span>
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          {(["autopsy", "graveyard"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                background: view === v ? "var(--ink)" : "none",
                color: view === v ? "var(--paper)" : "var(--ink-3)",
                border: "1px solid var(--rule)",
                borderRadius: "3px",
                fontFamily: "var(--mono)",
                fontSize: "10px",
                letterSpacing: "0.07em",
                padding: "4px 12px",
                cursor: "pointer",
                textTransform: "uppercase",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {v === "autopsy" ? "New Autopsy" : `Graveyard ${graveyardCount > 0 ? `(${graveyardCount})` : ""}`}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          maxWidth: "820px",
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        {view === "autopsy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* Panel 1: Input */}
            <section>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  marginBottom: "16px",
                }}
              >
                Panel 1 — The Mistake
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Subject + Chapter */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <label
                      style={{
                        display: "block",
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        setChapter("");
                      }}
                      style={{
                        width: "100%",
                        background: "var(--paper-2)",
                        border: "1px solid var(--rule)",
                        borderRadius: "3px",
                        fontFamily: "var(--sans)",
                        fontSize: "13px",
                        color: subject ? "var(--ink)" : "var(--ink-3)",
                        padding: "8px 10px",
                        outline: "none",
                      }}
                    >
                      <option value="">Select subject</option>
                      {SUBJECT_SUGGESTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <label
                      style={{
                        display: "block",
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      Chapter
                    </label>
                    <select
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      disabled={!subject}
                      style={{
                        width: "100%",
                        background: "var(--paper-2)",
                        border: "1px solid var(--rule)",
                        borderRadius: "3px",
                        fontFamily: "var(--sans)",
                        fontSize: "13px",
                        color: chapter ? "var(--ink)" : "var(--ink-3)",
                        padding: "8px 10px",
                        outline: "none",
                        opacity: !subject ? 0.5 : 1,
                      }}
                    >
                      <option value="">Select chapter</option>
                      {availableChapters.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Question */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--