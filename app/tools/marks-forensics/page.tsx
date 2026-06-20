"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type Verdict = "awarded" | "partial" | "dropped";

type MarkSchemePoint = {
  criterion: string;
  marks_available: number;
  verdict: Verdict;
  marks_awarded: number;
  evidence_from_answer: string;
  rescue_phrase: string;
};

type ForensicsResult = {
  mark_scheme_points: MarkSchemePoint[];
  total_available: number;
  total_awarded: number;
  diagnosis: string;
  one_thing_to_drill: string;
};

type Board = "CBSE" | "JEE" | "NEET" | "IB" | "IGCSE";

const BOARDS: Board[] = ["CBSE", "JEE", "NEET", "IB", "IGCSE"];

const MARK_SCHEME_TOOLTIP = `A mark scheme is the official list of acceptable answers. Example (CBSE Physics):
• State Newton's second law: F = ma (1 mark)
• Define each term with SI units: F in Newtons, m in kg, a in m/s² (1 mark)
• Derivation showing F ∝ a at constant mass (1 mark)
Paste the bullets from your textbook or exam paper's marking guide.`;

function TooltipIcon({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6 }}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "1.5px solid var(--ink-3)",
          background: "var(--paper)",
          color: "var(--ink-2)",
          fontSize: 11,
          fontFamily: "var(--sans)",
          cursor: "default",
          lineHeight: "16px",
          padding: 0,
          verticalAlign: "middle",
        }}
        aria-label="Help"
      >
        ?
      </button>
      {visible && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "var(--paper)",
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "var(--sans)",
            whiteSpace: "pre-wrap",
            width: 280,
            zIndex: 100,
            lineHeight: 1.6,
            boxShadow: "var(--shadow-md)",
          }}
        >
          {text}
          <span
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid var(--ink)",
            }}
          />
        </div>
      )}
    </span>
  );
}

function VerdictBadge({ verdict, marksAwarded, marksAvailable }: { verdict: Verdict; marksAwarded: number; marksAvailable: number }) {
  const config: Record<Verdict, { label: string; bg: string; color: string; border: string }> = {
    awarded: { label: "Awarded", bg: "var(--verdict-awarded-bg)", color: "var(--verdict-awarded-color)", border: "var(--verdict-awarded-border)" },
    partial: { label: "Partial",  bg: "var(--verdict-partial-bg)",  color: "var(--verdict-partial-color)",  border: "var(--verdict-partial-border)"  },
    dropped: { label: "Dropped",  bg: "var(--verdict-dropped-bg)",  color: "var(--verdict-dropped-color)",  border: "var(--verdict-dropped-border)"  },
  };
  const c = config[verdict];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 12,
        fontFamily: "var(--sans)",
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {c.label} · {marksAwarded}/{marksAvailable}
    </span>
  );
}

function VerdictCard({ point, index }: { point: MarkSchemePoint; index: number }) {
  const borderColor: Record<Verdict, string> = {
    awarded: "var(--verdict-awarded-border)",
    partial: "var(--verdict-partial-border)",
    dropped: "var(--cinnabar)",
  };
  const headerBg: Record<Verdict, string> = {
    awarded: "var(--verdict-awarded-bg)",
    partial: "var(--verdict-partial-bg)",
    dropped: "var(--verdict-dropped-bg)",
  };

  return (
    <div
      style={{
        border: `1.5px solid ${borderColor[point.verdict]}`,
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          background: headerBg[point.verdict],
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: `1px solid var(--rule)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--ink-3)",
              marginTop: 2,
              minWidth: 24,
            }}
          >
            #{index + 1}
          </span>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: 14,
              color: "var(--ink)",
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {point.criterion}
          </p>
        </div>
        <VerdictBadge verdict={point.verdict} marksAwarded={point.marks_awarded} marksAvailable={point.marks_available} />
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {point.evidence_from_answer && (
          <div>
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                margin: "0 0 6px 0",
              }}
            >
              {point.verdict === "dropped" ? "Missing from your answer" : "From your answer"}
            </p>
            <blockquote
              style={{
                margin: 0,
                padding: "8px 12px",
                borderLeft: `3px solid ${borderColor[point.verdict]}`,
                background: "var(--paper)",
                borderRadius: "0 6px 6px 0",
                fontFamily: "var(--serif)",
                fontSize: 13.5,
                fontStyle: "italic",
                color: "var(--ink-2)",
                lineHeight: 1.6,
              }}
            >
              {point.evidence_from_answer}
            </blockquote>
          </div>
        )}

        {point.verdict !== "awarded" && point.rescue_phrase && (
          <div
            style={{
              background: "var(--paper)",
              border: "1px dashed var(--rule)",
              borderRadius: 8,
              padding: "10px 14px",
            }}
          >
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--cinnabar)",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                margin: "0 0 6px 0",
              }}
            >
              Rescue Phrase — write this next time
            </p>
            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: 13,
                color: "var(--ink)",
                margin: 0,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              &ldquo;{point.rescue_phrase}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryBar({ total_available, total_awarded, points }: { total_available: number; total_awarded: number; points: MarkSchemePoint[] }) {
  const totalAvail = Number(total_available) || 0;
  const totalAward = Number(total_awarded) || 0;
  const dropped = points.filter((p) => p.verdict === "dropped").reduce((s, p) => s + (Number(p.marks_available) - Number(p.marks_awarded)), 0);
  const partial = points.filter((p) => p.verdict === "partial").reduce((s, p) => s + Number(p.marks_awarded), 0);
  const awarded = points.filter((p) => p.verdict === "awarded").reduce((s, p) => s + Number(p.marks_awarded), 0);
  const pct = totalAvail > 0 ? Math.round((totalAward / totalAvail) * 100) : 0;

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1.5px solid var(--rule)",
        borderRadius: 10,
        padding: "16px 20px",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: 0 }}>
          Score: {totalAward}/{totalAvail}
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-2)", fontWeight: 400, marginLeft: 8 }}>({pct}%)</span>
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--verdict-awarded-color)" }}>✓ Awarded: {awarded}</span>
          <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--verdict-partial-color)" }}>~ Partial: {partial}</span>
          <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--verdict-dropped-color)" }}>✗ Dropped: {dropped}</span>
        </div>
      </div>
      <div style={{ width: "100%", height: 10, borderRadius: 5, background: "var(--rule)", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${totalAvail > 0 ? (awarded / totalAvail) * 100 : 0}%`, background: "var(--verdict-awarded-bar)", transition: "width 0.4s" }} />
        <div style={{ width: `${totalAvail > 0 ? (partial / totalAvail) * 100 : 0}%`, background: "var(--verdict-partial-bar)", transition: "width 0.4s" }} />
        <div style={{ width: `${totalAvail > 0 ? (dropped / totalAvail) * 100 : 0}%`, background: "var(--verdict-dropped-bar)", transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink-2)",
  display: "block",
  marginBottom: 6,
  letterSpacing: 0.2,
};

const textAreaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 120,
  background: "var(--paper)",
  border: "1.5px solid var(--rule)",
  borderRadius: 8,
  padding: "10px 12px",
  fontFamily: "var(--sans)",
  fontSize: 14,
  color: "var(--ink)",
  resize: "vertical",
  lineHeight: 1.6,
  boxSizing: "border-box",
  outline: "none",
};

const sectionStyle: React.CSSProperties = {
  background: "var(--paper)",
  border: "1.5px solid var(--rule)",
  borderRadius: 12,
  padding: "20px 20px 16px",
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ink-3)",
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "0 0 16px 0",
};

export default function MarksForensicsPage() {
  const [question, setQuestion] = useState("");
  const [board, setBoard] = useState<Board>("CBSE");
  const [marksAvailable, setMarksAvailable] = useState(5);
  const [markScheme, setMarkScheme] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForensicsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !markScheme.trim() || !studentAnswer.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await callAIOrThrow<ForensicsResult>({
        tool: "marks_forensics",
        question: question.trim(),
        board,
        marks_available: marksAvailable,
        mark_scheme: markScheme.trim(),
        student_answer: studentAnswer.trim(),
      });

      // Coerce totals to numbers defensively
      const safeResult: ForensicsResult = {
        ...data,
        total_available: Number(data.total_available) || 0,
        total_awarded: Number(data.total_awarded) || 0,
        mark_scheme_points: (data.mark_scheme_points || []).map(p => ({
          ...p,
          marks_available: Number(p.marks_available) || 0,
          marks_awarded: Number(p.marks_awarded) || 0,
        })),
      };

      setResult(safeResult);

      // Persist to localStorage for cross-tool pattern surfacing
      try {
        const existing = JSON.parse(localStorage.getItem("forensics_sessions") || "[]");
        const session = {
          timestamp: new Date().toISOString(),
          board,
          marks_available: marksAvailable,
          total_awarded: safeResult.total_awarded,
          diagnosis: safeResult.diagnosis,
          one_thing_to_drill: safeResult.one_thing_to_drill,
          question_snippet: question.slice(0, 80),
        };
        existing.unshift(session);
        localStorage.setItem("forensics_sessions", JSON.stringify(existing.slice(0, 50)));
      } catch {
        // localStorage unavailable
      }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = question.trim().length > 0 && markScheme.trim().length > 0 && studentAnswer.trim().length > 0 && !loading;

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
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--paper)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontFamily: "var(--sans)",
            fontSize: 13,
            color: "var(--ink-3)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
            letterSpacing: 0.2,
          }}
        >
          ← Dashboard
        </Link>
        <span style={{ color: "var(--rule)", fontSize: 18, lineHeight: 1 }}>|</span>
        <span
          style={{
            fontFamily: "var(--sans)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: 0.3,
          }}
        >
          Marks Forensics
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--sans)",
            fontSize: 11,
            color: "var(--ink-3)",
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            borderRadius: 20,
            padding: "2px 10px",
            letterSpacing: 0.5,
          }}
        >
          PRACTISE
        </span>
      </header>

      <main
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "32px 20px 60px",
        }}
      >
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: 26,
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 8px 0",
              lineHeight: 1.25,
            }}
          >
            Marks Forensics
          </h1>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: 14,
              color: "var(--ink-2)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Paste your question, the mark scheme, and your answer. In 30 seconds you&apos;ll know exactly which marks you dropped and the precise phrase that would have rescued each one.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Panel 1: Question */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>① Question</p>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="question" style={labelStyle}>
                Question text
              </label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Paste the exam question here…"
                style={textAreaStyle}
                required
              />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label htmlFor="board" style={labelStyle}>
                  Board / Exam
                </label>
                <select
                  id="board"
                  value={board}
                  onChange={(e) => setBoard(e.target.value as Board)}
                  style={{
                    width: "100%",
                    background: "var(--paper)",
                    border: "1.5px solid var(--rule)",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontFamily: "var(--sans)",
                    fontSize: 14,
                    color: "var(--ink)",
                    cursor: "pointer",
                    outline: "none",
                    appearance: "none",
                  }}
                >
                  {BOARDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={labelStyle}>Marks available</label>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <button
                    type="button"
                    onClick={() => setMarksAvailable((v) => Math.max(1, v - 1))}
                    style={{
                      width: 36,
                      height: 38,
                      background: "var(--paper)",
                      border: "1.5px solid var(--rule)",
                      borderRight: "none",
                      borderRadius: "8px 0 0 8px",
                      fontFamily: "var(--sans)",
                      fontSize: 18,
                      color: "var(--ink-2)",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    −
                  </button>
                  <div
                    style={{
                      width: 48,
                      height: 38,
                      background: "var(--paper)",
                      border: "1.5px solid var(--rule)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--mono)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--ink)",
                    }}
                  >
                    {marksAvailable}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMarksAvailable((v) => Math.min(20, v + 1))}
                    style={{
                      width: 36,
                      height: 38,
                      background: "var(--paper)",
                      border: "1.5px solid var(--rule)",
                      borderLeft: "none",
                      borderRadius: "0 8px 8px 0",
                      fontFamily: "var(--sans)",
                      fontSize: 18,
                      color: "var(--ink-2)",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Mark Scheme */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>
              ② Mark Scheme
              <TooltipIcon text={MARK_SCHEME_TOOLTIP} />
            </p>
            <label htmlFor="markScheme" style={labelStyle}>
              Official mark scheme bullets
            </label>
            <textarea
              id="markScheme"
              value={markScheme}
              onChange={(e) => setMarkScheme(e.target.value)}
              placeholder={`Paste mark scheme here, e.g.:\n• State Newton's second law: F = ma (1)\n• Define each term with SI units (1)\n• Show F ∝ a at constant mass (1)`}
              style={{ ...textAreaStyle, minHeight: 130 }}
              required
            />
          </div>

          {/* Panel 3: Student Answer */}
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>③ Your Answer</p>
            <label htmlFor="studentAnswer" style={labelStyle}>
              What you wrote (or remember writing)
            </label>
            <textarea
              id="studentAnswer"
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Type or paste your written answer here…"
              style={{ ...textAreaStyle, minHeight: 140 }}
              required
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: canSubmit ? "var(--cinnabar)" : "var(--rule)",
              color: canSubmit ? "var(--cinnabar-ink)" : "var(--ink-3)",
              border: "none",
              borderRadius: 10,
              fontFamily: "var(--sans)",
              fontSize: 15,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              letterSpacing: 0.3,
              transition: "background 0.2s, color 0.2s",
              marginTop: 4,
            }}
          >
            Run Forensics
          </button>
        </form>

        {/* Loading */}
        {loading && (
          <div style={{ marginTop: 24 }}>
            <AIThinking />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            style={{
              marginTop: 24,
              background: "var(--verdict-dropped-bg)",
              border: "1.5px solid var(--verdict-dropped-border)",
              borderRadius: 10,
              padding: "14px 18px",
              fontFamily: "var(--sans)",
              fontSize: 14,
              color: "var(--verdict-dropped-color)",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div ref={resultRef} style={{ marginTop: 36 }}>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--ink)",
                margin: "0 0 20px 0",
              }}
            >
              Forensic Report
            </h2>

            <SummaryBar
              total_available={result.total_available}
              total_awarded={result.total_awarded}
              points={result.mark_scheme_points}
            />

            {result.mark_scheme_points.length === 0 ? (
              <div
                style={{
                  padding: "24px 20px",
                  border: "1px solid var(--rule)",
                  borderRadius: 10,
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  color: "var(--ink-3)",
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                No mark scheme points were returned. Try rephrasing your mark scheme.
              </div>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {result.mark_scheme_points.map((point, i) => (
                  <VerdictCard key={i} point={point} index={i} />
                ))}
              </div>
            )}

            {/* Diagnosis */}
            <div
              style={{
                margin: "28px 0 0",
                background: "var(--paper)",
                border: "1.5px solid var(--rule)",
                borderRadius: 12,
                padding: "20px 20px 16px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  margin: "0 0 12px 0",
                }}
              >
                Pattern Diagnosis
              </p>
              <AIOutput text={result.diagnosis} variant="principle" />
            </div>

            {/* One thing to drill */}
            <div
              style={{
                marginTop: 16,
                background: "var(--paper)",
                border: "1.5px solid var(--cinnabar)",
                borderRadius: 12,
                padding: "16px 20px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--cinnabar)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  margin: "0 0 10px 0",
                }}
              >
                #1 Thing to Drill Before Your Next Paper
              </p>
              <p
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 14,
                  color: "var(--ink)",
                  margin: 0,
                  lineHeight: 1.7,
                }}
              >
                {result.one_thing_to_drill}
              </p>
            </div>

            {/* Run again */}
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                marginTop: 28,
                width: "100%",
                padding: "12px 20px",
                background: "transparent",
                color: "var(--ink-2)",
                border: "1.5px solid var(--rule)",
                borderRadius: 10,
                fontFamily: "var(--sans)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: 0.2,
              }}
            >
              Run Another Forensics
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
