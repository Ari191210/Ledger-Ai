"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

// ── Types ────────────────────────────────────────────────────────────────────

type RankedTopic = {
  rank: number;
  topic_name: string;
  chapter: string;
  marks_weight_percent: number;
  examiner_obsession_score: number;
  time_allocation_minutes: number;
  urgency_tier: "DO NOW" | "DO TODAY" | "IF TIME" | "SKIP";
  one_line_reason: string;
  key_subtopics_to_nail: string[];
};

type SkipItem = {
  topic_name: string;
  reason_to_skip: string;
};

type HiddenGem = {
  topic_name: string;
  why_overlooked: string;
  expected_marks: number;
  prep_time_minutes: number;
};

type TimeBudget = {
  total_minutes_available: number;
  minutes_allocated: number;
  coverage_confidence_percent: number;
};

type CrematorResult = {
  ranked_topics: RankedTopic[];
  skip_list: SkipItem[];
  hidden_gem: HiddenGem;
  time_budget_summary: TimeBudget;
  examiner_pattern_note: string;
};

type FormState = {
  syllabusText: string;
  examBoard: string;
  examDate: string;
  hoursPerDay: string;
  revisedTopics: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const EXAM_BOARDS = [
  "CBSE Class 12",
  "CBSE Class 10",
  "JEE Main",
  "JEE Advanced",
  "NEET",
  "IB HL",
  "IB SL",
  "ICSE",
  "Other",
];

const URGENCY_COLORS: Record<RankedTopic["urgency_tier"], { bg: string; color: string }> = {
  "DO NOW":   { bg: "#c0392b", color: "#fff" },
  "DO TODAY": { bg: "#e67e22", color: "#fff" },
  "IF TIME":  { bg: "#2980b9", color: "#fff" },
  "SKIP":     { bg: "var(--ink-3)", color: "var(--paper)" },
};

// ── PriorityTable ────────────────────────────────────────────────────────────

function PriorityTable({ topics }: { topics: RankedTopic[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {topics.map((t) => {
        const pill = URGENCY_COLORS[t.urgency_tier];
        return (
          <div
            key={t.rank}
            style={{
              border: "1px solid var(--rule)",
              padding: "14px 16px",
              background: "var(--paper)",
              position: "relative",
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              {/* Rank */}
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--cinnabar-ink)",
                  lineHeight: 1,
                  minWidth: 28,
                  flexShrink: 0,
                }}
              >
                #{t.rank}
              </div>

              {/* Topic + chapter */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 2,
                  }}
                >
                  {t.topic_name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {t.chapter}
                </div>
              </div>

              {/* Urgency pill */}
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  padding: "4px 8px",
                  background: pill.bg,
                  color: pill.color,
                  borderRadius: 2,
                  flexShrink: 0,
                  alignSelf: "flex-start",
                }}
              >
                {t.urgency_tier}
              </span>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: 20,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "block",
                    marginBottom: 2,
                  }}
                >
                  Marks weight
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  {t.marks_weight_percent}%
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "block",
                    marginBottom: 2,
                  }}
                >
                  Obsession
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  {t.examiner_obsession_score}
                  <span style={{ fontSize: 10, color: "var(--ink-3)" }}>/10</span>
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "block",
                    marginBottom: 2,
                  }}
                >
                  Time budget
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  {t.time_allocation_minutes}
                  <span style={{ fontSize: 10, color: "var(--ink-3)" }}>min</span>
                </span>
              </div>
            </div>

            {/* One-line reason */}
            <div
              style={{
                fontFamily: "var(--sans)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--ink-2)",
                marginBottom: t.key_subtopics_to_nail.length > 0 ? 8 : 0,
              }}
            >
              {t.one_line_reason}
            </div>

            {/* Key subtopics */}
            {t.key_subtopics_to_nail.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {t.key_subtopics_to_nail.map((sub, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      padding: "3px 7px",
                      border: "1px solid var(--rule)",
                      color: "var(--ink-2)",
                      background: "var(--paper-2)",
                      borderRadius: 2,
                    }}
                  >
                    {sub}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CrematorPage() {
  const [form, setForm] = useState<FormState>({
    syllabusText: "",
    examBoard: "JEE Main",
    examDate: "",
    hoursPerDay: "6",
    revisedTopics: "",
  });
  const [result, setResult] = useState<CrematorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function daysRemaining(): number {
    if (!form.examDate) return 0;
    const diff = new Date(form.examDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  async function generate() {
    if (!form.syllabusText.trim()) {
      setError("Paste your syllabus or list of chapters first.");
      return;
    }
    if (!form.examDate) {
      setError("Set your exam date so we can calculate your time budget.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const days = daysRemaining();
      const res = await callAI({
        tool: "cremator",
        syllabusText: form.syllabusText,
        examBoard: form.examBoard,
        daysRemaining: days,
        hoursPerDay: parseFloat(form.hoursPerDay) || 6,
        alreadyRevisedTopics: form.revisedTopics,
      }) as unknown as CrematorResult;
      if (!res || !res.ranked_topics) {
        setError("Could not generate priority list. Please try again.");
        return;
      }
      setResult(res);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const days = daysRemaining();
  const totalHours = days * (parseFloat(form.hoursPerDay) || 6);

  // ── Result View ────────────────────────────────────────────────────────────

  if (result) {
    const { ranked_topics, skip_list, hidden_gem, time_budget_summary, examiner_pattern_note } = result;
    const confidenceColor =
      time_budget_summary.coverage_confidence_percent >= 75
        ? "#27ae60"
        : time_budget_summary.coverage_confidence_percent >= 50
        ? "#e67e22"
        : "#c0392b";

    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
        {/* Header */}
        <header
          style={{
            padding: "20px 32px",
            borderBottom: "1px solid var(--ink)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "var(--paper)",
            zIndex: 10,
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
                letterSpacing: "0.04em",
              }}
            >
              ← Dashboard
            </Link>
            <span style={{ color: "var(--rule)" }}>|</span>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
              Syllabus Cremator · {form.examBoard}
            </div>
          </div>
          <button
            onClick={() => setResult(null)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              padding: "6px 14px",
              border: "1px solid var(--ink)",
              background: "transparent",
              color: "var(--ink)",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            New session
          </button>
        </header>

        {/* Body — 2-column */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px 1fr",
            gap: 0,
            minHeight: "calc(100vh - 61px)",
          }}
        >
          {/* LEFT: context recap */}
          <div
            style={{
              borderRight: "1px solid var(--rule)",
              padding: "32px 24px",
              background: "var(--paper-2)",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Time budget card */}
            <div
              style={{
                border: "2px solid var(--ink)",
                padding: "18px 16px",
                background: "var(--paper)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                Time Budget
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--ink)",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {Math.round(time_budget_summary.total_minutes_available / 60)}h
              </div>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  marginBottom: 16,
                }}
              >
                total available across {days} day{days !== 1 ? "s" : ""}
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 6,
                  background: "var(--rule)",
                  borderRadius: 3,
                  marginBottom: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (time_budget_summary.minutes_allocated / time_budget_summary.total_minutes_available) * 100)}%`,
                    background: confidenceColor,
                    borderRadius: 3,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  marginBottom: 12,
                }}
              >
                <span>{Math.round(time_budget_summary.minutes_allocated / 60)}h allocated</span>
                <span style={{ color: confidenceColor, fontWeight: 700 }}>
                  {time_budget_summary.coverage_confidence_percent}% confidence
                </span>
              </div>
            </div>

            {/* Examiner note */}
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--cinnabar-ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                Examiner Pattern
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 13,
                  fontStyle: "italic",
                  lineHeight: 1.7,
                  color: "var(--ink-2)",
                  borderLeft: "2px solid var(--cinnabar)",
                  paddingLeft: 12,
                }}
              >
                {examiner_pattern_note}
              </div>
            </div>

            {/* Hidden Gem */}
            <div
              style={{
                border: "1px dashed var(--cinnabar)",
                padding: "14px 14px",
                background: "var(--paper)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--cinnabar-ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                💎 Hidden Gem
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 4,
                }}
              >
                {hidden_gem.topic_name}
              </div>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 11,
                  color: "var(--ink-2)",
                  lineHeight: 1.6,
                  marginBottom: 10,
                }}
              >
                {hidden_gem.why_overlooked}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                }}
              >
                <span>
                  <span style={{ color: "var(--ink-3)" }}>marks: </span>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>{hidden_gem.expected_marks}</span>
                </span>
                <span>
                  <span style={{ color: "var(--ink-3)" }}>prep: </span>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>{hidden_gem.prep_time_minutes}min</span>
                </span>
              </div>
            </div>

            {/* Skip list */}
            {skip_list.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Consciously skip
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {skip_list.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--rule)",
                        background: "var(--paper)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--serif)",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ink-3)",
                          textDecoration: "line-through",
                          marginBottom: 3,
                        }}
                      >
                        {s.topic_name}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: 11,
                          color: "var(--ink-3)",
                          lineHeight: 1.5,
                        }}
                      >
                        {s.reason_to_skip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Priority table */}
          <div style={{ padding: "32px 32px 80px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <h1
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: 0,
                }}
              >
                Your Battle Plan
              </h1>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--ink-3)",
                }}
              >
                {ranked_topics.length} topics · ranked by examiner obsession
              </span>
            </div>

            <PriorityTable topics={ranked_topics} />
          </div>
        </div>

        {/* Sticky footer — time bar */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--ink)",
            color: "var(--paper)",
            padding: "10px 32px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            zIndex: 20,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--paper)",
              opacity: 0.6,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}
          >
            Time budget
          </span>
          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (time_budget_summary.minutes_allocated / time_budget_summary.total_minutes_available) * 100)}%`,
                background:
                  time_budget_summary.coverage_confidence_percent >= 75
                    ? "#2ecc71"
                    : time_budget_summary.coverage_confidence_percent >= 50
                    ? "#f39c12"
                    : "#e74c3c",
                borderRadius: 2,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--paper)",
              flexShrink: 0,
            }}
          >
            {Math.round(time_budget_summary.minutes_allocated / 60)}h of {Math.round(time_budget_summary.total_minutes_available / 60)}h used
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color:
                time_budget_summary.coverage_confidence_percent >= 75
                  ? "#2ecc71"
                  : time_budget_summary.coverage_confidence_percent >= 50
                  ? "#f39c12"
                  : "#e74c3c",
              flexShrink: 0,
            }}
          >
            {time_budget_summary.coverage_confidence_percent}% coverage confidence
          </span>
        </div>
      </div>
    );
  }

  // ── Input View ─────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      {/* Header */}
      <header
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid var(--ink)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
              letterSpacing: "0.04em",
            }}
          >
            ← Dashboard
          </Link>
          <span style={{ color: "var(--rule)" }}>|</span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Practise
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          Syllabus Cremator
        </div>
      </header>

      <main
        style={{
          padding: "48px 32px 80px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        {/* Title block */}
        <div style={{ marginBottom: 36 }}>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: 30,
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 10px",
            }}
          >
            Burn your syllabus down to what matters.
          </h1>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: 14,
              color: "var(--ink-2)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            It&apos;s 2AM. You have 6 hours and 14 chapters. Tell me what you&apos;re
            working with — I&apos;ll tell you exactly what to study, in what order,
            and what to consciously skip.
          </p>
        </div>

        {/* Exam board + date row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Exam Board
            </label>
            <select
              value={form.examBoard}
              onChange={(e) => setForm((f) => ({ ...f, examBoard: e.target.value }))}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--ink)",
                background: "var(--paper)",
                color: "var(--ink)",
                fontFamily: "var(--sans)",
                fontSize: 13,
                cursor: "pointer",
                appearance: "none",
              }}
            >
              {EXAM_BOARDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Exam Date
            </label>
            <input
              type="date"
              value={form.examDate}
              onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--ink)",
                background: "var(--paper)",
                color: "var(--ink)",
                fontFamily: "var(--mono)",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Hours per day */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Hours available per day
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min={1}
              max={16}
              step={0.5}
              value={form.hoursPerDay}
              onChange={(e) => setForm((f) => ({ ...f, hoursPerDay: e.target.value }))}
              style={{ flex: 1, cursor: "pointer", accentColor: "var(--cinnabar)" }}
            />
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--ink)",
                minWidth: 40,
                textAlign: "right",
              }}
            >
              {form.hoursPerDay}h
            </span>
          </div>
          {form.examDate && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--cinnabar-ink)",
                marginTop: 6,
              }}
            >
              {days} day{days !== 1 ? "s" : ""} remaining ·{" "}
              {Math.round(totalHours)}h total
            </div>
          )}
        </div>

        {/* Syllabus textarea */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Syllabus / Chapters to cover
          </label>
          <textarea
            value={form.syllabusText}
            onChange={(e) => setForm((f) => ({ ...f, syllabusText: e.target.value }))}
            rows={8}
            placeholder="Paste your chapters or syllabus here — e.g. 'Ch1: Motion, Ch2: Laws of Motion, Ch3: Work Energy Power...'"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--ink)",
              background: "var(--paper)",
              color: "var(--ink)",
              fontFamily: "var(--mono)",
              fontSize: 12,
              lineHeight: 1.7,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Already revised */}
        <div style={{ marginBottom: 28 }}>
          <label
            style={{
              display: "block",
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Topics already revised (optional)
          </label>
          <textarea
            value={form.revisedTopics}
            onChange={(e) => setForm((f) => ({ ...f, revisedTopics: e.target.value }))}
            rows={3}
            placeholder="List anything you've already covered well — we'll skip those and reallocate the time."
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--rule)",
              background: "var(--paper)",
              color: "var(--ink)",
              fontFamily: "var(--mono)",
              fontSize: 12,
              lineHeight: 1.7,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "#c0392b",
              marginBottom: 16,
              padding: "8px 12px",
              border: "1px solid #c0392b",
              background: "oklch(97% 0.02 20)",
            }}
          >
            {error}
          </div>
        )}

        {/* AI thinking */}
        {loading && <AIThinking />}

        {/* Submit */}
        <button
          onClick={generate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 24px",
            background: loading ? "var(--ink-3)" : "var(--ink)",
            color: "var(--paper)",
            border: "none",
            fontFamily: "var(--mono)",
            fontSize: 13,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Cremating syllabus..." : "Cremate syllabus →"}
        </button>

        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--ink-3)",
            textAlign: "center",
            marginTop: 12,
          }}
        >
          Takes ~10 seconds · Powered by Claude
        </p>
      </main>
    </div>
  );
}