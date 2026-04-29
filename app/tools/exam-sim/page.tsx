"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Question = { q: string; options: string[]; answer: number; explanation: string };
type ExamData = { title: string; questions: Question[]; timeMinutes: number };
type Phase = "setup" | "exam" | "result";

function pad(n: number) { return String(n).padStart(2, "0"); }

export default function ExamSimPage() {
  const [subject, setSubject] = useState("");
  const [topic, setTopic]     = useState("");
  const [count, setCount]     = useState("10");
  const [level, setLevel]     = useState("A-Level");
  const [examData, setExamData]   = useState<ExamData | null>(null);
  const [phase, setPhase]     = useState<Phase>("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [answers, setAnswers]   = useState<(number | null)[]>([]);
  const [flagged, setFlagged]   = useState<boolean[]>([]);
  const [current, setCurrent]   = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null);

  async function generate() {
    if (!subject.trim()) return;
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "exam_sim", subject, topic, count, level });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions)) { setError("Could not generate — try again."); return; }
      setExamData(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setFlagged(new Array(data.questions.length).fill(false));
      setCurrent(0); setElapsed(0); setSubmitted(false);
      setPhase("exam");
      const iv = setInterval(() => setElapsed(e => e + 1), 1000);
      setTimerRef(iv);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function selectAnswer(qi: number, ai: number) {
    if (submitted) return;
    setAnswers(a => { const n = [...a]; n[qi] = ai; return n; });
  }

  function toggleFlag(qi: number) { setFlagged(f => { const n = [...f]; n[qi] = !n[qi]; return n; }); }

  function submit() {
    if (timerRef) clearInterval(timerRef);
    setSubmitted(true);
    setPhase("result");
  }

  function restart() { setPhase("setup"); setExamData(null); setError(""); }

  const answered = answers.filter(a => a !== null).length;
  const totalQ   = examData?.questions.length || 0;
  const timeLimit = (examData?.timeMinutes || 30) * 60;
  const remaining = Math.max(0, timeLimit - elapsed);
  const score     = submitted && examData ? answers.reduce<number>((acc, a, i) => acc + (a !== null && a === examData!.questions[i]?.answer ? 1 : 0), 0) : 0;
  const pct       = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;

  if (phase === "setup") return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 27 · Exam Simulator</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Simulate your exam</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>AI-generated MCQs. Timed. Explained.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject *</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology, Mathematics, History…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Specific topic (optional)</div>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Cell division, Quadratic equations…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Questions</div>
            <select value={count} onChange={e => setCount(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              {["5","10","15","20"].map(n => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
            <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              {["GCSE","A-Level","IB","University","General"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading || !subject.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1, marginTop: 14 }}>
          {loading ? "Generating exam…" : "Start exam →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 27 of 44.</div>
        </div>
      </main>
    </div>
  );

  if (phase === "exam" && examData) {
    const q = examData.questions[current];
    const timeColor = remaining < 120 ? "#c44b2a" : remaining < 300 ? "#c97a1a" : "var(--ink-3)";
    return (
      <div>
        <header style={{ padding: "14px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>
            {examData.title} · Q {current + 1}/{totalQ} · {answered}/{totalQ} answered
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span className="mono" style={{ color: timeColor, fontSize: 14, fontWeight: 700 }}>
              {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
            </span>
            <button className="btn ghost" onClick={submit} style={{ fontSize: 11 }}>Submit exam</button>
          </div>
        </header>

        <div style={{ display: "flex", height: "calc(100vh - 57px)" }}>
          {/* Question map sidebar */}
          <div style={{ width: 180, borderRight: "1px solid var(--ink)", overflowY: "auto", padding: "16px 12px", flexShrink: 0 }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 10 }}>QUESTION MAP</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
              {examData.questions.map((_, i) => {
                const isAnswered = answers[i] !== null;
                const isFlagged  = flagged[i];
                const isCurrent  = i === current;
                return (
                  <button key={i} onClick={() => setCurrent(i)}
                    style={{ padding: "6px 2px", fontFamily: "var(--mono)", fontSize: 10, border: `1px solid ${isCurrent ? "var(--cinnabar-ink)" : isAnswered ? "#2d7a3c" : "var(--rule)"}`, background: isCurrent ? "var(--cinnabar-ink)" : isAnswered ? "#2d7a3c18" : "var(--paper)", color: isCurrent ? "var(--paper)" : isAnswered ? "#2d7a3c" : "var(--ink-3)", cursor: "pointer", position: "relative" }}>
                    {i + 1}
                    {isFlagged && <span style={{ position: "absolute", top: 1, right: 1, fontSize: 6 }}>🚩</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span className="mono cin" style={{ fontSize: 11 }}>Question {current + 1}</span>
                <button onClick={() => toggleFlag(current)} style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "1px solid var(--rule)", padding: "4px 10px", cursor: "pointer", color: flagged[current] ? "#c97a1a" : "var(--ink-3)" }}>
                  {flagged[current] ? "🚩 Flagged" : "Flag for review"}
                </button>
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.5, marginBottom: 28, fontWeight: 500 }}>{q.q}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                {q.options.map((opt, oi) => {
                  const selected = answers[current] === oi;
                  return (
                    <button key={oi} onClick={() => selectAnswer(current, oi)}
                      style={{ padding: "14px 18px", border: `2px solid ${selected ? "var(--ink)" : "var(--rule)"}`, background: selected ? "var(--ink)" : "var(--paper)", color: selected ? "var(--paper)" : "var(--ink)", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.4, display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span className="mono" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer", opacity: current === 0 ? 0.3 : 1 }}>← Prev</button>
                {current < totalQ - 1
                  ? <button onClick={() => setCurrent(c => c + 1)} style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer" }}>Next →</button>
                  : <button onClick={submit} className="btn" style={{ flex: 1 }}>Submit exam →</button>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && examData) {
    const grade = pct >= 90 ? "A*" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "U";
    const gradeColor = pct >= 70 ? "#2d7a3c" : pct >= 50 ? "#c97a1a" : "#c44b2a";
    const timeTaken  = elapsed;
    return (
      <div>
        <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 27 · Exam Simulator · Results</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={() => window.print()}>Print ↗</button>
            <button className="btn ghost" onClick={restart}>New exam</button>
          </div>
        </header>
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
          {/* Score banner */}
          <div style={{ display: "flex", gap: 24, marginBottom: 36, padding: "28px 32px", border: "2px solid var(--ink)" }} className="mob-col">
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 700, color: gradeColor, lineHeight: 1 }}>{grade}</div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginTop: 4 }}>{pct}% · {score}/{totalQ} correct</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              <div style={{ background: "var(--paper-2)", height: 12, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: gradeColor, transition: "width 0.8s" }} />
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Time: {pad(Math.floor(timeTaken / 60))}:{pad(timeTaken % 60)}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Level: {level}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Subject: {examData.title}</div>
              </div>
            </div>
          </div>

          {/* Question review */}
          <div className="mono cin" style={{ marginBottom: 16 }}>Question review</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {examData.questions.map((q, i) => {
              const userAns   = answers[i];
              const correct   = userAns === q.answer;
              const unanswered = userAns === null;
              return (
                <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < totalQ - 1 ? "none" : "1px solid var(--ink)", padding: "18px 20px" }}>
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
                      let bg = "transparent", border = "var(--rule)", color = "var(--ink-2)";
                      if (isCorrect)           { bg = "#2d7a3c18"; border = "#2d7a3c"; color = "#2d7a3c"; }
                      if (isSelected && !isCorrect) { bg = "#c44b2a12"; border = "#c44b2a"; color = "#c44b2a"; }
                      return (
                        <div key={oi} style={{ padding: "8px 12px", border: `1px solid ${border}`, background: bg, color, fontFamily: "var(--sans)", fontSize: 13, display: "flex", gap: 8 }}>
                          <span className="mono" style={{ fontSize: 11, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                          {isCorrect && <span className="mono" style={{ marginLeft: "auto", fontSize: 9 }}>CORRECT</span>}
                          {isSelected && !isCorrect && <span className="mono" style={{ marginLeft: "auto", fontSize: 9 }}>YOUR ANSWER</span>}
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
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 27 of 44.</div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
