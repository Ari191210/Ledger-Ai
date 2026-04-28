"use client";
import { useState } from "react";
import Link from "next/link";

type MarkScheme = { question: string; totalMarks: number; markScheme: { criterion: string; marks: number; detail: string }[]; hint: string };
type Feedback   = { marksEarned: number; totalMarks: number; breakdown: { criterion: string; earned: number; max: number; comment: string }[]; missing: string[]; improved: string };

const BOARDS    = ["CBSE", "ICSE", "IB", "A-Level", "IGCSE", "AP", "SAT"];
const SUBJECTS  = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "History", "English", "Geography", "Computer Science", "Business"];

export default function MarkSchemePage() {
  const [board, setBoard]         = useState("A-Level");
  const [subject, setSubject]     = useState("Economics");
  const [topic, setTopic]         = useState("");
  const [marks, setMarks]         = useState("8");
  const [question, setQuestion]   = useState<MarkScheme | null>(null);
  const [answer, setAnswer]       = useState("");
  const [feedback, setFeedback]   = useState<Feedback | null>(null);
  const [phase, setPhase]         = useState<"setup" | "answer" | "result">("setup");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "mark_scheme", board, subject, topic, marks }) });
      const data = await res.json();
      if (!res.ok || !data.question) { setError("Could not generate question."); return; }
      setQuestion(data); setPhase("answer"); setAnswer(""); setFeedback(null);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  async function markAnswer() {
    if (answer.trim().length < 30) { setError("Write a proper answer first."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "mark_scheme_eval", question: question!.question, markScheme: question!.markScheme, answer, board, subject }) });
      const data = await res.json();
      if (!res.ok || data.marksEarned === undefined) { setError("Could not mark answer."); return; }
      setFeedback(data); setPhase("result");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (phase === "setup") return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 32 · Mark Scheme Trainer</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Practice like an examiner marks</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Real questions. Real marking.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Board</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 12px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic or chapter</div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Market failure, Photosynthesis, World War I causes…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Marks available: {marks}</div>
          <input type="range" min="4" max="25" value={marks} onChange={e => setMarks(e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>4</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>25 marks</span>
          </div>
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Generating question…" : "Generate exam question →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );

  if (phase === "answer") return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 32 · Mark Scheme Trainer · {board} {subject} · {question!.totalMarks} marks</div>
        <button className="btn ghost" onClick={() => setPhase("setup")}>New question</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ border: "2px solid var(--ink)", padding: "24px 28px", marginBottom: 24 }}>
          <div className="mono cin" style={{ marginBottom: 10 }}>{board} · {subject} · [{question!.totalMarks} marks]</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", lineHeight: 1.5 }}>{question!.question}</div>
          {question!.hint && (
            <div style={{ marginTop: 14, padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>HINT · </span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{question!.hint}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Your answer</div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{answer.split(/\s+/).filter(Boolean).length} words</div>
          </div>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={10}
            placeholder={`Write your full ${question!.totalMarks}-mark answer. Think about what the mark scheme rewards…`}
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={markAnswer} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Marking…" : "Mark my answer →"}
        </button>
      </main>
    </div>
  );

  const pct = feedback!.marksEarned / feedback!.totalMarks;
  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 32 · Mark Scheme Trainer · Result</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => { setPhase("answer"); setFeedback(null); }}>Retry</button>
          <button className="btn" onClick={() => setPhase("setup")}>New question</button>
        </div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ border: "2px solid var(--ink)", padding: "20px 24px", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: pct >= 0.7 ? "#2d7a3c" : pct >= 0.5 ? "#c97a1a" : "#c44b2a" }}>
                  {feedback!.marksEarned}<span style={{ fontSize: 20, color: "var(--ink-3)" }}>/{feedback!.totalMarks}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{pct >= 0.8 ? "Excellent" : pct >= 0.6 ? "Good" : pct >= 0.4 ? "Developing" : "Needs work"}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)", marginTop: 2 }}>{Math.round(pct * 100)}% of marks</div>
                </div>
              </div>
            </div>

            {feedback!.breakdown.map((b, i) => (
              <div key={i} style={{ border: "1px solid var(--rule)", padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>{b.criterion}</span>
                  <span className="mono" style={{ fontSize: 10, color: b.earned === b.max ? "#2d7a3c" : "var(--cinnabar-ink)" }}>{b.earned}/{b.max}</span>
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{b.comment}</div>
              </div>
            ))}
          </div>

          <div>
            {feedback!.missing.length > 0 && (
              <div style={{ border: "1px solid var(--ink)", padding: "16px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Missing mark points</div>
                {feedback!.missing.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 10 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{m}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ border: "2px solid var(--ink)", padding: "16px" }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Model answer extract</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.8 }}>{feedback!.improved}</div>
            </div>
            <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>MARK SCHEME USED</div>
              {question!.markScheme.map((ms, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)" }}>{ms.criterion}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{ms.marks}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
