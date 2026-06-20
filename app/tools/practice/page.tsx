"use client";
import { useState } from "react";
import Link from "next/link";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type Mode = "practice" | "mock";

type Problem  = { number: number; problem: string; hint: string; marks: number; solution: string };
type PracticeSet = { topic: string; difficulty: string; problems: Problem[] };

type Question = { q: string; options: string[]; answer: number; explanation: string };
type ExamData = { title: string; questions: Question[]; timeMinutes: number };
type Phase    = "setup" | "exam" | "result";

function pad(n: number) { return String(n).padStart(2, "0"); }

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Statistics", "Further Maths"];
const LEVELS   = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE Class 11", "CBSE Class 12", "JEE"];
const DIFF     = ["Mixed", "Easy", "Medium", "Hard"];

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "10px 22px", fontFamily: "var(--mono)", fontSize: 10,
  background: active ? "var(--ink)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)",
  border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em",
});

export default function PracticeSuitePage() {
  const [mode, setMode] = useState<Mode>("practice");

  // Shared
  const [subject,  setSubject]  = useState("Mathematics");
  const [topic,    setTopic]    = useState("");
  const [level,    setLevel]    = useState("A-Level");

  // Practice state
  const [difficulty, setDifficulty] = useState("Mixed");
  const [count,      setCount]      = useState(5);
  const [set,        setSet]        = useState<PracticeSet | null>(null);
  const [revealed,   setRevealed]   = useState<Record<number, boolean>>({});
  const [hinted,     setHinted]     = useState<Record<number, boolean>>({});
  const [prLoading,  setPrLoading]  = useState(false);
  const [prError,    setPrError]    = useState("");

  // Mock state
  const [mockCount,   setMockCount]   = useState("10");
  const [examData,    setExamData]    = useState<ExamData | null>(null);
  const [phase,       setPhase]       = useState<Phase>("setup");
  const [answers,     setAnswers]     = useState<(number | null)[]>([]);
  const [flagged,     setFlagged]     = useState<boolean[]>([]);
  const [current,     setCurrent]     = useState(0);
  const [elapsed,     setElapsed]     = useState(0);
  const [timerRef,    setTimerRef]    = useState<ReturnType<typeof setInterval> | null>(null);
  const [mkLoading,   setMkLoading]   = useState(false);
  const [mkError,     setMkError]     = useState("");

  async function generatePractice() {
    if (!topic.trim()) { setPrError("Enter a topic."); return; }
    setPrLoading(true); setPrError(""); setRevealed({}); setHinted({});
    try {
      const data = await callAIOrThrow<PracticeSet>({ tool: "practice", subject, topic, level, difficulty, count });
      setSet(data);
    } catch { setPrError("Network error."); }
    finally { setPrLoading(false); }
  }

  async function startMock() {
    if (!subject.trim()) return;
    setMkLoading(true); setMkError("");
    try {
      const data = await callAIOrThrow<ExamData>({ tool: "exam_sim", subject, topic, count: mockCount, level });
      setExamData(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setFlagged(new Array(data.questions.length).fill(false));
      setCurrent(0); setElapsed(0);
      setPhase("exam");
      const iv = setInterval(() => setElapsed(e => e + 1), 1000);
      setTimerRef(iv);
    } catch { setMkError("Network error."); }
    finally { setMkLoading(false); }
  }

  function submitMock() { if (timerRef) clearInterval(timerRef); setPhase("result"); }
  function restartMock() { setPhase("setup"); setExamData(null); setMkError(""); }

  const answered   = answers.filter(a => a !== null).length;
  const totalQ     = examData?.questions.length || 0;
  const timeLimit  = (examData?.timeMinutes || 30) * 60;
  const remaining  = Math.max(0, timeLimit - elapsed);
  const score      = examData ? answers.reduce<number>((acc, a, i) => acc + (a !== null && a === examData!.questions[i]?.answer ? 1 : 0), 0) : 0;
  const pct        = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;

  // Shared setup panel (both modes use same subject/topic/level)
  const SharedSetup = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic {mode === "practice" ? <span style={{ color: "var(--cinnabar-ink)" }}>*</span> : "(optional)"}</div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Integration by parts, Circular motion…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
        </div>
      </div>
    </>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Practice Suite</div>
        {phase === "setup" && (
          <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
            <button style={TAB_STYLE(mode === "practice")} onClick={() => { setMode("practice"); setSet(null); }}>Practice Problems</button>
            <button style={TAB_STYLE(mode === "mock")} onClick={() => { setMode("mock"); setSet(null); }}>Mock Exam</button>
          </div>
        )}
        {phase === "exam" && examData && (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{examData.title} · Q {current + 1}/{totalQ} · {answered}/{totalQ} answered</span>
            <span className="mono" style={{ color: remaining < 120 ? "var(--cinnabar)" : remaining < 300 ? "var(--gold)" : "var(--ink-3)", fontSize: 14, fontWeight: 700 }}>
              {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
            </span>
            <button className="btn ghost" onClick={submitMock} style={{ fontSize: 11 }}>Submit exam</button>
          </div>
        )}
        {phase === "result" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={() => window.print()}>Print ↗</button>
            <button className="btn ghost" onClick={restartMock}>New exam</button>
          </div>
        )}
      </header>

      {/* ── PRACTICE PROBLEMS ── */}
      {mode === "practice" && !set && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Do, not just read</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Graded problems with full worked solutions.</h2>
          <SharedSetup />
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Difficulty</div>
            <div style={{ display: "flex", gap: 6 }}>
              {DIFF.map(d => <button key={d} onClick={() => setDifficulty(d)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${difficulty === d ? "var(--ink)" : "var(--rule)"}`, background: difficulty === d ? "var(--ink)" : "var(--paper)", color: difficulty === d ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{d}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Number of problems: {count}</div>
            <input type="range" min={3} max={10} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>3</span>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>10</span>
            </div>
          </div>
          {prError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{prError}</div>}
          <button className="btn" onClick={generatePractice} disabled={prLoading} style={{ width: "100%", opacity: prLoading ? 0.5 : 1 }}>
            {prLoading ? "Generating problems…" : "Generate practice set →"}
          </button>
          {prLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {mode === "practice" && set && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{set.topic} · {set.difficulty} · {level}</div>
            <button className="btn ghost" onClick={() => setSet(null)}>New set</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {set.problems.map((p) => (
              <div key={p.number} style={{ border: "1px solid var(--rule)", padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="mono cin">Q{p.number}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>[{p.marks} mark{p.marks > 1 ? "s" : ""}]</span>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{p.problem}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!hinted[p.number] && !revealed[p.number] && (
                    <button onClick={() => setHinted(prev => ({ ...prev, [p.number]: true }))}
                      style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 12px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>
                      Hint
                    </button>
                  )}
                  <button onClick={() => setRevealed(prev => ({ ...prev, [p.number]: !prev[p.number] }))}
                    style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 12px", border: `1px solid ${revealed[p.number] ? "var(--ink)" : "var(--rule)"}`, background: revealed[p.number] ? "var(--ink)" : "none", color: revealed[p.number] ? "var(--paper)" : "var(--ink-3)", cursor: "pointer" }}>
                    {revealed[p.number] ? "Hide solution" : "Show solution"}
                  </button>
                </div>
                {hinted[p.number] && !revealed[p.number] && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-2)" }}>HINT · </span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>{p.hint}</span>
                  </div>
                )}
                {revealed[p.number] && (
                  <div style={{ marginTop: 12, padding: "16px 18px", border: "none", background: "var(--paper-2)" }}>
                    <div className="mono cin" style={{ marginBottom: 10 }}>Worked solution</div>
                    <AIOutput text={p.solution} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {/* ── MOCK EXAM ── */}
      {mode === "mock" && phase === "setup" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Simulate your exam</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>AI-generated MCQs. Timed. Explained.</h2>
          <SharedSetup />
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Questions</div>
            <select value={mockCount} onChange={e => setMockCount(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "none", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              {["5","10","15","20"].map(n => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </div>
          {mkError && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{mkError}</div>}
          <button className="btn" onClick={startMock} disabled={mkLoading} style={{ width: "100%", opacity: mkLoading ? 0.5 : 1 }}>
            {mkLoading ? "Generating exam…" : "Start mock exam →"}
          </button>
          {mkLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {mode === "mock" && phase === "exam" && examData && (() => {
        const q = examData.questions[current];
        return (
          <div className="tool-split" style={{ display: "flex", height: "calc(100vh - 65px)" }}>
            <div className="tool-split-sidebar" style={{ width: 180, borderRight: "1px solid var(--ink)", overflowY: "auto", padding: "16px 12px", flexShrink: 0 }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 10 }}>QUESTION MAP</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
                {examData.questions.map((_, i) => {
                  const isAnswered = answers[i] !== null;
                  const isFlagged  = flagged[i];
                  const isCurrent  = i === current;
                  return (
                    <button key={i} onClick={() => setCurrent(i)}
                      style={{ padding: "6px 2px", fontFamily: "var(--mono)", fontSize: 10, border: `1px solid ${isCurrent ? "var(--cinnabar-ink)" : isAnswered ? "var(--sage)" : "var(--rule)"}`, background: isCurrent ? "var(--cinnabar-ink)" : isAnswered ? "var(--sage)18" : "var(--paper)", color: isCurrent ? "var(--paper)" : isAnswered ? "var(--sage)" : "var(--ink-3)", cursor: "pointer", position: "relative" }}>
                      {i + 1}{isFlagged && <span style={{ position: "absolute", top: 1, right: 1, fontSize: 6 }}>🚩</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="tool-split-main" style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span className="mono cin" style={{ fontSize: 11 }}>Question {current + 1}</span>
                  <button onClick={() => setFlagged(f => { const n = [...f]; n[current] = !n[current]; return n; })}
                    style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "1px solid var(--rule)", padding: "4px 10px", cursor: "pointer", color: flagged[current] ? "var(--gold)" : "var(--ink-3)" }}>
                    {flagged[current] ? "🚩 Flagged" : "Flag for review"}
                  </button>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.5, marginBottom: 28, fontWeight: 500 }}>{q.q}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {q.options.map((opt, oi) => {
                    const selected = answers[current] === oi;
                    return (
                      <button key={oi} onClick={() => setAnswers(a => { const n = [...a]; n[current] = oi; return n; })}
                        style={{ padding: "14px 18px", border: `2px solid ${selected ? "var(--ink)" : "var(--rule)"}`, background: selected ? "var(--ink)" : "var(--paper)", color: selected ? "var(--paper)" : "var(--ink)", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.4, display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span className="mono" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{String.fromCharCode(65 + oi)}.</span>{opt}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer", opacity: current === 0 ? 0.3 : 1 }}>← Prev</button>
                  {current < totalQ - 1
                    ? <button onClick={() => setCurrent(c => c + 1)} style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer" }}>Next →</button>
                    : <button onClick={submitMock} className="btn" style={{ flex: 1 }}>Submit exam →</button>
                  }
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {mode === "mock" && phase === "result" && examData && (() => {
        const grade     = pct >= 90 ? "A*" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "U";
        const gradeColor = pct >= 70 ? "var(--sage)" : pct >= 50 ? "var(--gold)" : "var(--cinnabar)";
        return (
          <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 24, marginBottom: 36, padding: "28px 32px", border: "none" }} className="mob-col">
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 700, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginTop: 4 }}>{pct}% · {score}/{totalQ} correct</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                <div style={{ background: "var(--paper-2)", height: 12, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: gradeColor, transition: "width 0.8s" }} />
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Time: {pad(Math.floor(elapsed / 60))}:{pad(elapsed % 60)}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Level: {level}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Subject: {examData.title}</div>
                </div>
              </div>
            </div>
            <div className="mono cin" style={{ marginBottom: 16 }}>Question review</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {examData.questions.map((q, i) => {
                const userAns    = answers[i];
                const correct    = userAns === q.answer;
                const unanswered = userAns === null;
                return (
                  <div key={i} style={{ border: "none", borderBottom: i < totalQ - 1 ? "none" : "1px solid var(--ink)", padding: "18px 20px" }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                      <span className="mono" style={{ fontSize: 10, color: unanswered ? "var(--ink-3)" : correct ? "var(--sage)" : "var(--cinnabar)", flexShrink: 0, marginTop: 2, fontWeight: 700 }}>
                        {unanswered ? "—" : correct ? "✓" : "✗"} Q{i + 1}
                      </span>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.5, fontWeight: 500 }}>{q.q}</div>
                    </div>
                    <div style={{ paddingLeft: 36, display: "flex", flexDirection: "column", gap: 6 }}>
                      {q.options.map((opt, oi) => {
                        const isCorrect  = oi === q.answer;
                        const isSelected = oi === userAns;
                        const bg     = isCorrect ? "var(--sage)18" : isSelected && !isCorrect ? "var(--cinnabar)12" : "transparent";
                        const border = isCorrect ? "var(--sage)"   : isSelected && !isCorrect ? "var(--cinnabar)"   : "var(--rule)";
                        const color  = isCorrect ? "var(--sage)"   : isSelected && !isCorrect ? "var(--cinnabar)"   : "var(--ink-2)";
                        return (
                          <div key={oi} style={{ padding: "8px 12px", border: `1px solid ${border}`, background: bg, color, fontFamily: "var(--sans)", fontSize: 13, display: "flex", gap: 8 }}>
                            <span className="mono" style={{ fontSize: 11, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}.</span>{opt}
                            {isCorrect    && <span className="mono" style={{ marginLeft: "auto", fontSize: 9 }}>CORRECT</span>}
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
              <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
            </div>
          </main>
        );
      })()}
    </div>
  );
}
