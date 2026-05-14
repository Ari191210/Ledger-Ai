"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type TabType = "decode" | "grade";

type Part     = { label: string; marks: number; what: string; howToAnswer: string };
type Analysis = { commandWord: string; commandDefinition: string; totalMarks: number; timeAdvice: string; parts: Part[]; keyContent: string[]; structure: string[]; examinersTip: string; commonMistakes: string[] };

type Criterion = { name: string; achieved: string; missed: string; marks: string };
type Grade = { marks: number; totalMarks: number; grade: string; band: string; summary: string; criteria: Criterion[]; strengths: string[]; improvements: string[]; modelAnswer: string };

const BOARDS   = ["CBSE", "ICSE", "IB", "A-Level", "IGCSE", "AP"];
const SUBJECTS = ["Economics", "History", "Biology", "Chemistry", "Physics", "Mathematics", "English", "Geography", "Psychology", "Business"];

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "10px 22px", fontFamily: "var(--mono)", fontSize: 10,
  background: active ? "var(--ink)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)",
  border: "none", borderRight: "1px solid var(--ink)", cursor: "pointer", letterSpacing: "0.05em",
});

export default function QuestionDecoderPage() {
  const [tab,     setTab]     = useState<TabType>("decode");
  const [board,   setBoard]   = useState("A-Level");
  const [subject, setSubject] = useState("Economics");

  const [question,  setQuestion]  = useState("");
  const [marks,     setMarks]     = useState("");
  const [analysis,  setAnalysis]  = useState<Analysis | null>(null);
  const [dcLoading, setDcLoading] = useState(false);
  const [dcError,   setDcError]   = useState("");

  const [gradeQuestion, setGradeQuestion] = useState("");
  const [answer,        setAnswer]        = useState("");
  const [totalMarks,    setTotalMarks]    = useState("10");
  const [grade,         setGrade]         = useState<Grade | null>(null);
  const [grLoading,     setGrLoading]     = useState(false);
  const [grError,       setGrError]       = useState("");
  const [grPhase,       setGrPhase]       = useState<"setup" | "answer" | "result">("setup");

  async function decode() {
    if (question.trim().length < 10) { setDcError("Paste your exam question."); return; }
    setDcLoading(true); setDcError("");
    try {
      const res  = await callAI({ tool: "paper_dissector", board, subject, question, marks });
      const data = await res.json();
      if (!res.ok || !data.commandWord) { setDcError("Could not analyse question."); return; }
      setAnalysis(data);
    } catch { setDcError("Network error."); }
    finally { setDcLoading(false); }
  }

  async function gradeAnswer() {
    if (answer.trim().length < 20) { setGrError("Write at least a sentence."); return; }
    setGrLoading(true); setGrError("");
    try {
      const res  = await callAI({ tool: "mark_scheme_eval", board, subject, question: gradeQuestion, answer, totalMarks });
      const data = await res.json();
      if (!res.ok || !data.criteria) { setGrError(data.error || "Could not grade answer."); return; }
      setGrade(data);
      setGrPhase("result");
    } catch { setGrError("Network error."); }
    finally { setGrLoading(false); }
  }

  function switchTab(t: TabType) {
    setTab(t);
    if (t === "grade" && analysis) {
      setGradeQuestion(question);
      setTotalMarks(marks || String(analysis.totalMarks || 10));
    }
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Question Decoder</div>
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          <button style={TAB_STYLE(tab === "decode")} onClick={() => switchTab("decode")}>Decode Question</button>
          <button style={{ ...TAB_STYLE(tab === "grade"), borderRight: "none" }} onClick={() => switchTab("grade")}>Grade My Answer</button>
        </div>
      </header>

      <div style={{ padding: "12px 44px", borderBottom: "1px solid var(--rule)", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginRight: 4 }}>BOARD</span>
          {BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "4px 8px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginRight: 4 }}>SUBJECT</span>
          {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "4px 8px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
        </div>
      </div>

      {tab === "decode" && !analysis && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Decode what examiners want</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste any question. Get the strategy.</h2>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question</div>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={6}
              placeholder="Paste the exact exam question, including any sub-parts (a), (b), (c)…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Total marks (optional)</div>
            <input type="number" value={marks} onChange={e => setMarks(e.target.value)} placeholder="e.g. 25"
              style={{ width: 100, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          {dcError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{dcError}</div>}
          <button className="btn" onClick={decode} disabled={dcLoading} style={{ width: "100%", opacity: dcLoading ? 0.5 : 1 }}>
            {dcLoading ? "Dissecting question…" : "Decode this question →"}
          </button>
          {dcLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {tab === "decode" && analysis && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => switchTab("grade")}>Grade my answer →</button>
            <button className="btn ghost" onClick={() => setAnalysis(null)}>New question</button>
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 2, border: "2px solid var(--ink)", padding: "16px 20px", minWidth: 200 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>COMMAND WORD</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, color: "var(--cinnabar-ink)" }}>{analysis.commandWord}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{analysis.commandDefinition}</div>
            </div>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", minWidth: 100 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>MARKS</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700 }}>{analysis.totalMarks}</div>
            </div>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", flex: 1, minWidth: 160 }}>
              <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 4 }}>TIME ADVICE</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{analysis.timeAdvice}</div>
            </div>
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              {analysis.parts.length > 0 && (
                <div style={{ border: "1px solid var(--rule)", padding: "16px", marginBottom: 16 }}>
                  <div className="mono cin" style={{ marginBottom: 12 }}>Question parts</div>
                  {analysis.parts.map((p, i) => (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < analysis.parts.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700 }}>{p.label}</span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>{p.marks}m</span>
                      </div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 4 }}>{p.what}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "#1a6091" }}>{p.howToAnswer}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ border: "1px solid var(--rule)", padding: "16px" }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Key content required</div>
                {analysis.keyContent.map((k, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 10 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ border: "2px solid var(--ink)", padding: "16px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Answer structure</div>
                {analysis.structure.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: 9 }}>{i + 1}</span>
                    </div>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 6 }}>EXAMINER TIP</div>
                <AIOutput text={analysis.examinersTip} variant="principle" />
              </div>
              <div style={{ padding: "14px", border: "1px solid var(--rule)" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>COMMON MISTAKES</div>
                {analysis.commonMistakes.map((m, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>✗ {m}</div>)}
              </div>
            </div>
          </div>
        </main>
      )}

      {tab === "grade" && grPhase === "setup" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Examiner-grade your work</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste your question. Write your answer. Get graded.</h2>
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>The question</div>
            <textarea value={gradeQuestion} onChange={e => setGradeQuestion(e.target.value)} rows={3}
              placeholder="Paste the exam question here…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Total marks available</div>
            <select value={totalMarks} onChange={e => setTotalMarks(e.target.value)}
              style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)" }}>
              {["5","8","10","12","15","20","25"].map(m => <option key={m} value={m}>{m} marks</option>)}
            </select>
          </div>
          <button className="btn" onClick={() => setGrPhase("answer")} disabled={!gradeQuestion.trim()} style={{ width: "100%", opacity: gradeQuestion.trim() ? 1 : 0.4 }}>
            Write my answer →
          </button>
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {tab === "grade" && grPhase === "answer" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: 20, fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--ink)" }}>{gradeQuestion}</strong>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 12 }}>[{totalMarks} marks · {board} {subject}]</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your answer</div>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={12}
              placeholder="Write your answer here — treat it like the real exam…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.7, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical" }} />
          </div>
          {grError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{grError}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" onClick={() => setGrPhase("setup")}>← Change question</button>
            <button className="btn" onClick={gradeAnswer} disabled={grLoading || answer.trim().length < 20} style={{ flex: 1, opacity: grLoading ? 0.5 : 1 }}>
              {grLoading ? "Grading…" : "Grade my answer →"}
            </button>
          </div>
          {grLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </main>
      )}

      {tab === "grade" && grPhase === "result" && grade && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => { setGrPhase("answer"); setGrade(null); setGrError(""); }}>Revise answer</button>
            <button className="btn ghost" onClick={() => { setGrPhase("setup"); setGrade(null); setAnswer(""); setGrError(""); }}>New question</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ border: "2px solid var(--ink)", padding: "20px 28px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>MARKS</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: "var(--cinnabar-ink)" }}>{grade.marks}<span style={{ fontSize: 22, color: "var(--ink-3)" }}>/{grade.totalMarks}</span></div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>{grade.grade} · {grade.band}</div>
            </div>
            <div style={{ flex: 1, border: "1px solid var(--rule)", padding: "16px 20px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>OVERALL VERDICT</div>
              <AIOutput text={grade.summary} />
            </div>
          </div>
          <div style={{ border: "1px solid var(--rule)", marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
              <div className="mono cin">Mark scheme criteria</div>
            </div>
            {grade.criteria.map((c, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: i < grade.criteria.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>{c.marks}</span>
                </div>
                <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {c.achieved && <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "#2d7a3c" }}>✓ {c.achieved}</div>}
                  {c.missed   && <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--cinnabar-ink)" }}>✗ {c.missed}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ border: "1px solid #2d7a3c", padding: "14px 16px" }}>
              <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 8 }}>STRENGTHS</div>
              {grade.strengths.map((s, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {s}</div>)}
            </div>
            <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "14px 16px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8 }}>TO IMPROVE</div>
              {grade.improvements.map((s, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {s}</div>)}
            </div>
          </div>
          {grade.modelAnswer && (
            <div style={{ border: "1px solid var(--rule)", padding: "16px 20px" }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Model answer</div>
              <AIOutput text={grade.modelAnswer} />
            </div>
          )}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}
    </div>
  );
}
