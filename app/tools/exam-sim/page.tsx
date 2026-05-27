"use client";
import { useState } from "react";
import Link from "next/link";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { type AIError } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";

type Question = { q: string; options: string[]; answer: number; explanation: string };
type ExamData  = { title: string; timeMinutes: number; questions: Question[] };
type Phase     = "setup" | "exam" | "result";

function pad(n: number) { return String(n).padStart(2, "0"); }

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Statistics", "Further Maths", "Computer Science", "History", "Geography"];
const LEVELS   = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE Class 11", "CBSE Class 12", "JEE", "SAT"];
const COUNTS   = ["5", "10", "15", "20"];

export default function ExamSimPage() {
  const [subject,  setSubject]  = useState("Mathematics");
  const [topic,    setTopic]    = useState("");
  const [level,    setLevel]    = useState("A-Level");
  const [count,    setCount]    = useState("10");

  const [phase,    setPhase]    = useState<Phase>("setup");
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [answers,  setAnswers]  = useState<(number | null)[]>([]);
  const [flagged,  setFlagged]  = useState<boolean[]>([]);
  const [current,  setCurrent]  = useState(0);
  const [elapsed,  setElapsed]  = useState(0);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<AIError | string | null>(null);

  async function startExam() {
    setLoading(true); setError(null);
    try {
      const data = await callAIOrThrow<ExamData>({ tool: "exam_sim", subject, topic, count, level });
      if (!Array.isArray(data.questions) || !data.questions.length) {
        setError("No questions generated — try again."); return;
      }
      setExamData(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setFlagged(new Array(data.questions.length).fill(false));
      setCurrent(0); setElapsed(0);
      setPhase("exam");
      const iv = setInterval(() => setElapsed(e => e + 1), 1000);
      setTimerRef(iv);
    } catch (e) {
      setError(e as AIError | string);
    } finally {
      setLoading(false);
    }
  }

  function submit() { if (timerRef) clearInterval(timerRef); setPhase("result"); }
  function restart() { setPhase("setup"); setExamData(null); setError(null); }

  const totalQ    = examData?.questions.length ?? 0;
  const answered  = answers.filter(a => a !== null).length;
  const timeLimit = (examData?.timeMinutes ?? 30) * 60;
  const remaining = Math.max(0, timeLimit - elapsed);
  const score     = examData
    ? answers.reduce<number>((acc, a, i) => acc + (a !== null && a === examData.questions[i]?.answer ? 1 : 0), 0)
    : 0;
  const pct       = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;

  return (
    <div>
      {/* ── Header ── */}
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Exam Simulator</div>

        {phase === "exam" && examData && (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
              {examData.title} · Q {current + 1}/{totalQ} · {answered}/{totalQ} answered
            </span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: remaining < 120 ? "#c44b2a" : remaining < 300 ? "#c97a1a" : "var(--ink-3)" }}>
              {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
            </span>
            <button className="btn ghost" onClick={submit} style={{ fontSize: 11 }}>Submit exam</button>
          </div>
        )}

        {phase === "result" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={() => window.print()}>Print ↗</button>
            <button className="btn ghost" onClick={restart}>New exam</button>
          </div>
        )}
      </header>

      {/* ── Setup ── */}
      {phase === "setup" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Simulate your exam</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 32px" }}>
            AI-generated MCQs. Timed. Fully explained.
          </h2>

          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></div>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Integration, Organic Chemistry, World War II…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Questions</div>
            <div style={{ display: "flex", gap: 6 }}>
              {COUNTS.map(c => (
                <button key={c} onClick={() => setCount(c)}
                  style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 14px", border: `1px solid ${count === c ? "var(--ink)" : "var(--rule)"}`, background: count === c ? "var(--ink)" : "var(--paper)", color: count === c ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <AIErrorDisplay error={error} onRetry={startExam} inline />
            </div>
          )}

          <button className="btn" onClick={startExam} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Generating exam…" : "Start exam →"}
          </button>
          {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {/* ── Exam ── */}
      {phase === "exam" && examData && (() => {
        const q = examData.questions[current];
        return (
          <div className="tool-split" style={{ display: "flex", height: "calc(100vh - 65px)" }}>
            {/* Question map */}
            <div className="tool-split-sidebar" style={{ width: 180, borderRight: "1px solid var(--ink)", overflowY: "auto", padding: "16px 12px", flexShrink: 0 }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 10 }}>QUESTION MAP</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
                {examData.questions.map((_, i) => {
                  const isAnswered = answers[i] !== null;
                  const isFlagged  = flagged[i];
                  const isCurrent  = i === current;
                  return (
                    <button key={i} onClick={() => setCurrent(i)}
                      style={{ padding: "6px 2px", fontFamily: "var(--mono)", fontSize: 10, border: `1px solid ${isCurrent ? "var(--cinnabar-ink)" : isAnswered ? "#2d7a3c" : "var(--rule)"}`, background: isCurrent ? "var(--cinnabar-ink)" : isAnswered ? "#2d7a3c18" : "var(--paper)", color: isCurrent ? "var(--paper)" : isAnswered ? "#2d7a3c" : "var(--ink-3)", cursor: "pointer", position: "relative" }}>
                      {i + 1}{isFlagged && <span style={{ position: "absolute", top: 1, right: 1, fontSize: 6 }}>🚩</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>LEGEND</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="mono" style={{ fontSize: 9, color: "#2d7a3c" }}>■ Answered</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)" }}>■ Current</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>□ Unanswered</span>
                </div>
              </div>
            </div>

            {/* Question pane */}
            <div className="tool-split-main" style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span className="mono cin" style={{ fontSize: 11 }}>Question {current + 1}</span>
                  <button
                    onClick={() => setFlagged(f => { const n = [...f]; n[current] = !n[current]; return n; })}
                    style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "1px solid var(--rule)", padding: "4px 10px", cursor: "pointer", color: flagged[current] ? "#c97a1a" : "var(--ink-3)" }}>
                    {flagged[current] ? "🚩 Flagged" : "Flag for review"}
                  </button>
                </div>

                <div style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.55, marginBottom: 28, fontWeight: 500 }}>
                  {q.q}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {q.options.map((opt, oi) => {
                    const selected = answers[current] === oi;
                    return (
                      <button key={oi}
                        onClick={() => setAnswers(a => { const n = [...a]; n[current] = oi; return n; })}
                        style={{ padding: "14px 18px", border: `2px solid ${selected ? "var(--ink)" : "var(--rule)"}`, background: selected ? "var(--ink)" : "var(--paper)", color: selected ? "var(--paper)" : "var(--ink)", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.4, display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span className="mono" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{String.fromCharCode(65 + oi)}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                    style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer", opacity: current === 0 ? 0.3 : 1 }}>
                    ← Prev
                  </button>
                  {current < totalQ - 1
                    ? <button onClick={() => setCurrent(c => c + 1)}
                        style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer" }}>
                        Next →
                      </button>
                    : <button onClick={submit} className="btn" style={{ flex: 1 }}>Submit exam →</button>
                  }
                </div>

                {answered < totalQ && (
                  <div className="mono" style={{ marginTop: 16, fontSize: 10, color: "var(--ink-3)", textAlign: "center" }}>
                    {totalQ - answered} question{totalQ - answered !== 1 ? "s" : ""} unanswered — you can still submit.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Result ── */}
      {phase === "result" && examData && (() => {
        const grade      = pct >= 90 ? "A*" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "U";
        const gradeColor = pct >= 70 ? "#2d7a3c" : pct >= 50 ? "#c97a1a" : "#c44b2a";
        return (
          <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
            {/* Score summary */}
            <div style={{ display: "flex", gap: 24, marginBottom: 36, padding: "28px 32px", border: "none" }} className="mob-col">
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 700, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginTop: 4 }}>{pct}% · {score}/{totalQ} correct</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
                <div style={{ background: "var(--paper-2)", height: 12, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: gradeColor, transition: "width 0.8s" }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Time: {pad(Math.floor(elapsed / 60))}:{pad(elapsed % 60)}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Level: {level}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{examData.title}</div>
                </div>
              </div>
            </div>

            {/* Per-question review */}
            <div className="mono cin" style={{ marginBottom: 16 }}>Question review</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {examData.questions.map((q, i) => {
                const userAns    = answers[i];
                const correct    = userAns === q.answer;
                const unanswered = userAns === null;
                return (
                  <div key={i} style={{ border: "none", borderBottom: i < totalQ - 1 ? "none" : "1px solid var(--ink)", padding: "18px 20px" }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                      <span className="mono" style={{ fontSize: 10, color: unanswered ? "var(--ink-3)" : correct ? "#2d7a3c" : "#c44b2a", flexShrink: 0, marginTop: 2, fontWeight: 700 }}>
                        {unanswered ? "—" : correct ? "✓" : "✗"} Q{i + 1}
                      </span>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.5, fontWeight: 500 }}>{q.q}</div>
                    </div>
                    <div style={{ paddingLeft: 36, display: "flex", flexDirection: "column", gap: 6 }}>
                      {q.options.map((opt, oi) => {
                        const isCorrect  = oi === q.answer;
                        const isSelected = oi === userAns;
                        const bg     = isCorrect ? "#2d7a3c18" : isSelected && !isCorrect ? "#c44b2a12" : "transparent";
                        const border = isCorrect ? "#2d7a3c"   : isSelected && !isCorrect ? "#c44b2a"   : "var(--rule)";
                        const color  = isCorrect ? "#2d7a3c"   : isSelected && !isCorrect ? "#c44b2a"   : "var(--ink-2)";
                        return (
                          <div key={oi} style={{ padding: "8px 12px", border: `1px solid ${border}`, background: bg, color, fontFamily: "var(--sans)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                            <span className="mono" style={{ fontSize: 11, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}.</span>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {isCorrect     && <span className="mono" style={{ fontSize: 9, flexShrink: 0 }}>CORRECT</span>}
                            {isSelected && !isCorrect && <span className="mono" style={{ fontSize: 9, flexShrink: 0 }}>YOUR ANSWER</span>}
                          </div>
                        );
                      })}
                      {q.explanation && (
                        <div style={{ marginTop: 6, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>EXPLANATION</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{q.explanation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
              <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
              <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
            </div>
          </main>
        );
      })()}
    </div>
  );
}
