"use client";

import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type ErrorType = "conceptual" | "recall" | "calculation" | "presentation" | "time_pressure" | "misread";
type RecurrenceRisk = "high" | "medium" | "low";

interface QuestionInput {
  id: string;
  questionText: string;
  studentAnswer: string;
  markScheme: string;
  marksAvailable: string;
  marksAwarded: string;
}

interface QuestionResult {
  question_snippet: string;
  marks_available: number;
  marks_awarded: number;
  marks_lost: number;
  error_type: ErrorType;
  error_label: string;
  exact_moment: string;
  mark_scheme_gap: string;
  fix_protocol: [string, string, string];
  recurrence_risk: RecurrenceRisk;
}

interface AggregateResult {
  total_marks_lost: number;
  top_error_type: string;
  error_distribution: Record<ErrorType, number>;
  killer_habit: string;
  patch_plan: [string, string, string];
}

interface ObituaryResult {
  questions: QuestionResult[];
  aggregate: AggregateResult;
}

const ERROR_ICONS: Record<ErrorType, string> = {
  conceptual: "🧠",
  recall: "📚",
  calculation: "🔢",
  presentation: "✏️",
  time_pressure: "⏱️",
  misread: "👁️",
};

const ERROR_COLORS: Record<ErrorType, string> = {
  conceptual: "#e05a5a",
  recall: "#e07a3a",
  calculation: "#e0a83a",
  presentation: "#8a6fe0",
  time_pressure: "#5a9de0",
  misread: "#5ac9a8",
};

const RISK_COLORS: Record<RecurrenceRisk, string> = {
  high: "#dc2626",
  medium: "#d97706",
  low: "#16a34a",
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export default function MarksObituaryPage() {
  const [questions, setQuestions] = useState<QuestionInput[]>([
    {
      id: generateId(),
      questionText: "",
      studentAnswer: "",
      markScheme: "",
      marksAvailable: "",
      marksAwarded: "",
    },
  ]);
  const [result, setResult] = useState<ObituaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addQuestion(): void {
    setQuestions((prev) => [
      ...prev,
      {
        id: generateId(),
        questionText: "",
        studentAnswer: "",
        markScheme: "",
        marksAvailable: "",
        marksAwarded: "",
      },
    ]);
  }

  function removeQuestion(id: string): void {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, field: keyof Omit<QuestionInput, "id">, value: string): void {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await callAI({
        tool: "marks_obituary",
        questions: questions.map((q) => ({
          questionText: q.questionText,
          studentAnswer: q.studentAnswer,
          markScheme: q.markScheme,
          marksAvailable: Number(q.marksAvailable),
          marksAwarded: Number(q.marksAwarded),
        })),
      }) as ObituaryResult;
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const totalAvailable = questions.reduce((sum, q) => sum + (Number(q.marksAvailable) || 0), 0);
  const totalAwarded = questions.reduce((sum, q) => sum + (Number(q.marksAwarded) || 0), 0);

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
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          background: "var(--paper)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            color: "var(--ink-3)",
            textDecoration: "none",
            fontSize: "13px",
            fontFamily: "var(--sans)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "color 0.15s",
          }}
        >
          ← Dashboard
        </Link>
        <span style={{ color: "var(--rule)", fontSize: "16px" }}>|</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>🪦</span>
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            Marks Obituary
          </span>
        </div>
        <span
          style={{
            marginLeft: "auto",
            background: "var(--paper-2)",
            border: "1px solid var(--rule)",
            borderRadius: "4px",
            padding: "2px 8px",
            fontSize: "11px",
            color: "var(--ink-3)",
            fontFamily: "var(--mono)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Practise
        </span>
      </header>

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🪦</div>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 10px",
              letterSpacing: "-0.02em",
            }}
          >
            Mark Loss Autopsy
          </h1>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "15px",
              color: "var(--ink-2)",
              margin: 0,
              maxWidth: "540px",
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Paste your questions, answers, and mark schemes. We&apos;ll diagnose exactly where
            you died — and give you a surgical fix protocol so it never happens again.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  background: "var(--paper-2)",
                  border: "1px solid var(--rule)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {/* Question header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--rule)",
                    background: "var(--paper)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Question {idx + 1}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "var(--ink-3)",
                          fontFamily: "var(--sans)",
                        }}
                      >
                        Available:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={q.marksAvailable}
                        onChange={(e) => updateQuestion(q.id, "marksAvailable", e.target.value)}
                        placeholder="e.g. 6"
                        required
                        style={{
                          width: "60px",
                          padding: "4px 8px",
                          border: "1px solid var(--rule)",
                          borderRadius: "4px",
                          background: "var(--paper)",
                          color: "var(--ink)",
                          fontFamily: "var(--mono)",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "var(--ink-3)",
                          fontFamily: "var(--sans)",
                        }}
                      >
                        Awarded:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={q.marksAwarded}
                        onChange={(e) => updateQuestion(q.id, "marksAwarded", e.target.value)}
                        placeholder="e.g. 3"
                        required
                        style={{
                          width: "60px",
                          padding: "4px 8px",
                          border: "1px solid var(--rule)",
                          borderRadius: "4px",
                          background: "var(--paper)",
                          color: "var(--ink)",
                          fontFamily: "var(--mono)",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--ink-3)",
                          fontSize: "14px",
                          padding: "2px 4px",
                          lineHeight: 1,
                          borderRadius: "4px",
                          transition: "color 0.15s",
                        }}
                        title="Remove question"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Three columns */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0",
                  }}
                >
                  {/* Column 1: Question */}
                  <div
                    style={{
                      borderRight: "1px solid var(--rule)",
                      padding: "14px 16px",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontFamily: "var(--mono)",
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: "8px",
                      }}
                    >
                      Question Text
                    </label>
                    <textarea
                      value={q.questionText}
                      onChange={(e) => updateQuestion(q.id, "questionText", e.target.value)}
                      placeholder="Paste the exam question here..."
                      required
                      rows={6}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid var(--rule)",
                        borderRadius: "6px",
                        background: "var(--paper)",
                        color: "var(--ink)",
                        fontFamily: "var(--sans)",
                        fontSize: "13px",
                        lineHeight: 1.5,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Column 2: Student Answer */}
                  <div
                    style={{
                      borderRight: "1px solid var(--rule)",
                      padding: "14px 16px",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontFamily: "var(--mono)",
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: "8px",
                      }}
                    >
                      Your Answer / Working
                    </label>
                    <textarea
                      value={q.studentAnswer}
                      onChange={(e) => updateQuestion(q.id, "studentAnswer", e.target.value)}
                      placeholder="Paste or describe your working and answer..."
                      required
                      rows={6}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid var(--rule)",
                        borderRadius: "6px",
                        background: "var(--paper)",
                        color: "var(--ink)",
                        fontFamily: "var(--sans)",
                        fontSize: "13px",
                        lineHeight: 1.5,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Column 3: Mark Scheme */}
                  <div
                    style={{
                      padding: "14px 16px",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontFamily: "var(--mono)",
                        color: "var(--ink-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: "8px",
                      }}
                    >
                      Mark Scheme / Expected
                    </label>
                    <textarea
                      value={q.markScheme}
                      onChange={(e) => updateQuestion(q.id, "markScheme", e.target.value)}
                      placeholder="Paste the mark scheme or expected answer..."
                      required
                      rows={6}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid var(--rule)",
                        borderRadius: "6px",
                        background: "var(--paper)",
                        color: "var(--ink)",
                        fontFamily: "var(--sans)",
                        fontSize: "13px",
                        lineHeight: 1.5,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add question + Submit */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "20px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={addQuestion}
              style={{
                background: "none",
                border: "1px dashed var(--rule)",
                borderRadius: "6px",
                padding: "10px 18px",
                color: "var(--ink-2)",
                fontFamily: "var(--sans)",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              + Add another question
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {totalAvailable > 0 && (
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                    color: "var(--ink-3)",
                  }}
                >
                  {totalAwarded}/{totalAvailable} marks
                  {totalAvailable > 0 && (
                    <span
                      style={{
                        marginLeft: "6px",
                        color:
                          totalAwarded / totalAvailable >= 0.7
                            ? "#16a34a"
                            : totalAwarded / totalAvailable >= 0.5
                            ? "#d97706"
                            : "#dc2626",
                      }}
                    >
                      ({Math.round((totalAwarded / totalAvailable) * 100)}%)
                    </span>
                  )}
                </span>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? "var(--paper-2)" : "var(--cinnabar)",
                  color: loading ? "var(--ink-3)" : "var(--cinnabar-ink)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "11px 24px",
                  fontFamily: "var(--sans)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {loading ? "Analysing…" : "🔬 Run Autopsy"}
              </button>
            </div>
          </div>

          {/* Thinking indicator */}
          {loading && (
            <div style={{ marginTop: "20px" }}>
              <AIThinking />
            </div>
          )}
        </form>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: "24px",
              padding: "14px 18px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontFamily: "var(--sans)",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ marginTop: "48px" }}>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "28px",
                paddingBottom: "14px",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <span style={{ fontSize: "20px" }}>🪦</span>
              <h2
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Death Certificates
              </h2>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  color: "var(--ink-3)",
                  background: "var(--paper-2)",
                  border: "1px solid var(--rule)",
                  borderRadius: "4px",
                  padding: "2px 8px",
                }}
              >
                {result.aggregate.total_marks_lost} marks lost
              </span>
            </div>

            {/* Death certificate cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {result.questions.map((qr, idx) => (
                <DeathCertCard key={idx} question={qr} index={idx} />
              ))}
            </div>

            {/* Aggregate section */}
            <div
              style={{
                marginTop: "48px",
                paddingTop: "32px",
                borderTop: "2px solid var(--rule)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: "0 0 24px",
                  letterSpacing: "-0.01em",
                }}
              >
                📊 Error Profile
              </h2>

              {/* Killer habit headline */}
              <div
                style={{
                  background: "#1a0505",
                  border: "1px solid #7f1d1d",
                  borderRadius: "10px",
                  padding: "20px 24px",
                  marginBottom: "28px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    color: "#f87171",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "8px",
                  }}
                >
                  Your #1 Killer
                </div>
                <p
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "17px",
                    color: "#fca5a5",
                    margin: 0,
                    lineHeight: 1.5,
                    fontStyle: "italic",
                  }}
                >
                  {result.aggregate.killer_habit}
                </p>
              </div>

              {/* Error distribution bar */}
              <ErrorDistributionBar distribution={result.aggregate.error_distribution} />

              {/* AIOutput for killer insight */}
              <div style={{ marginTop: "24px" }}>
                <AIOutput variant="principle">
                  {`Top error type: ${result.aggregate.top_error_type} — ${result.aggregate.killer_habit}`}
                </AIOutput>
              </div>

              {/* 3-day patch plan */}
              <div style={{ marginTop: "32px" }}>
                <h3
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--ink)",
                    margin: "0 0 16px",
                    letterSpacing: "-0.01em",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  🗓️ 3-Day Patch Plan
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "14px",
                  }}
                >
                  {result.aggregate.patch_plan.map((action, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--paper-2)",
                        border: "1px solid var(--rule)",
                        borderRadius: "8px",
                        padding: "16px 18px",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "-10px",
                          left: "16px",
                          background: "#16a34a",
                          color: "#fff",
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          letterSpacing: "0.06em",
                        }}
                      >
                        DAY {i + 1}
                      </div>
                      <p
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: "13px",
                          color: "var(--ink)",
                          margin: "8px 0 0",
                          lineHeight: 1.6,
                        }}
                      >
                        {action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Death Certificate Card ── */
function DeathCertCard({
  question,
  index,
}: {
  question: QuestionResult;
  index: number;
}): JSX.Element {
  const errorColor = ERROR_COLORS[question.error_type];
  const riskColor = RISK_COLORS[question.recurrence_risk];
  const icon = ERROR_ICONS[question.error_type];
  const pctLost =
    question.marks_available > 0
      ? Math.round((question.marks_lost / question.marks_available) * 100)
      : 0;

  return (
    <div
      style={{
        background: "#0d0808",
        border: `1px solid ${errorColor}44`,
        borderLeft: `4px solid ${errorColor}`,
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${errorColor}22`,
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>{icon}</span>
          <div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              Q{index + 1}
            </div>
            <div
              style={{
                fontFamily: "var(--sans)",
                fontSize: "13px",
                color: "#e5e7eb",
                maxWidth: "400px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {question.question_snippet}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Error type badge */}
          <span
            style={{
              background: `${errorColor}22`,
              border: `1px solid ${errorColor}66`,
              color: errorColor,
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {question.error_type.replace("_", " ")}
          </span>

          {/* Recurrence risk badge */}
          <span
            style={{
              background: `${riskColor}22`,
              border: `1px solid ${riskColor}66`,
              color: riskColor,
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {question.recurrence_risk} risk
          </span>

          {/* Marks lost */}
          <span
            style={{
              background: "#dc262622",
              border: "1px solid #dc262655",
              color: "#f87171",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "4px",
            }}
          >
            −{question.marks_lost}/{question.marks_available} ({pctLost}%)
          </span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Left: diagnosis */}
        <div>
          <InfoRow
            label="Error Label"
            value={question.error_label}
            valueColor="#fbbf24"
            dark
          />
          <InfoRow
            label="Exact Moment of Death"
            value={question.exact_moment}
            valueColor="#f87171"
            dark
          />
          <InfoRow
            label="Mark Scheme Gap"
            value={question.mark_scheme_gap}
            valueColor="#d1d5db"
            dark
          />
        </div>

        {/* Right: fix protocol */}
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "10px",
            }}
          >
            Fix Protocol
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {question.fix_protocol.map((action, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                  padding: "8px 12px",
                  background: "#0a1f0a",
                  border: "1px solid #16a34a33",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9px",
                    color: "#16a34a",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "12px",
                    color: "#d1d5db",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}