"use client";
import { useState } from "react";
import Link from "next/link";

type Question = { q: string; tip: string };
type Evaluation = { score: number; strengths: string[]; gaps: string[]; betterAnswer: string; tip: string };

const TYPES = [
  { v: "university", l: "University Admissions", sub: "Oxford, Oxbridge, Ivy League, scholarship panels" },
  { v: "internship", l: "Internship / Job",       sub: "Finance, tech, consulting, general" },
  { v: "scholarship",l: "Scholarship",             sub: "Merit scholarships, bursaries, fellowships" },
  { v: "medical",    l: "Medicine / MMI",          sub: "Medical school multiple mini interviews" },
];

export default function InterviewPage() {
  const [type, setType]       = useState("university");
  const [role, setRole]       = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx]       = useState(0);
  const [answer, setAnswer]   = useState("");
  const [evaluation, setEval] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError]     = useState("");
  const [phase, setPhase]     = useState<"setup"|"practice"|"result">("setup");

  async function generateQuestions() {
    setGenLoading(true); setError("");
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "interview_questions", type, role }) });
      const data = await res.json();
      if (!res.ok || !data.questions) { setError("Could not generate questions."); return; }
      setQuestions(data.questions); setPhase("practice"); setQIdx(0); setAnswer(""); setEval(null);
    } catch { setError("Network error."); }
    finally { setGenLoading(false); }
  }

  async function evaluate() {
    if (answer.trim().length < 20) { setError("Write a proper answer first."); return; }
    setLoading(true); setError(""); setEval(null);
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "interview_eval", question: questions[qIdx].q, answer, type }) });
      const data = await res.json();
      if (!res.ok || !data.strengths) { setError("Could not evaluate."); return; }
      setEval(data); setPhase("result");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function nextQ() { setQIdx(i => (i + 1) % questions.length); setAnswer(""); setEval(null); setPhase("practice"); setError(""); }

  if (phase === "setup") return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 20 · Interview Prep</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Set up your session</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>What are you preparing for?</h2>

        <div style={{ border: "1px solid var(--ink)", marginBottom: 20 }}>
          {TYPES.map((t, i) => (
            <button key={t.v} onClick={() => setType(t.v)}
              style={{ display: "flex", width: "100%", padding: "14px 18px", background: type === t.v ? "var(--ink)" : "var(--paper)", color: type === t.v ? "var(--paper)" : "var(--ink)", border: "none", borderBottom: i < TYPES.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left", gap: 14, alignItems: "center" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: type === t.v ? "var(--cinnabar)" : "transparent", border: type === t.v ? "none" : "2px solid var(--rule)", flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{t.l}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 11, opacity: 0.6, marginTop: 1 }}>{t.sub}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Specific role / course / university (optional)</div>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. PPE at Oxford, Goldman Sachs summer analyst, Rhodes Scholar…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
        <button className="btn" onClick={generateQuestions} disabled={genLoading} style={{ width: "100%", opacity: genLoading ? 0.5 : 1 }}>
          {genLoading ? "Generating questions…" : "Start practice session →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 20 of 30.</div>
        </div>
      </main>
    </div>
  );

  const cur = questions[qIdx];

  if (phase === "practice") return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 20 · Interview Prep · Question {qIdx + 1} of {questions.length}</div>
        <button className="btn ghost" onClick={() => setPhase("setup")}>New session</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ border: "2px solid var(--ink)", padding: "28px 32px", marginBottom: 24 }}>
          <div className="mono cin" style={{ marginBottom: 10 }}>Question {String(qIdx+1).padStart(2,"0")}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", lineHeight: 1.4 }}>{cur.q}</div>
          {cur.tip && <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>TIP · </span>
            <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{cur.tip}</span>
          </div>}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your answer</div>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={8} placeholder="Type your answer as you would say it in the interview…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
        </div>
        {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ghost" onClick={nextQ} style={{ flex: 1 }}>Skip →</button>
          <button className="btn" onClick={evaluate} disabled={loading} style={{ flex: 2, opacity: loading ? 0.5 : 1 }}>{loading ? "Evaluating…" : "Evaluate my answer →"}</button>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 20 · Interview Prep · Feedback</div>
        <button className="btn ghost" onClick={nextQ}>Next question →</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ border: "2px solid var(--ink)", padding: "20px 24px", marginBottom: 20, display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, color: evaluation!.score >= 7 ? "#2d7a3c" : evaluation!.score >= 5 ? "#c97a1a" : "#c44b2a", lineHeight: 1 }}>{evaluation!.score}<span style={{ fontSize: 18, color: "var(--ink-3)" }}>/10</span></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic", color: "var(--ink-2)", lineHeight: 1.5 }}>&ldquo;{cur.q}&rdquo;</div>
              </div>
            </div>
            <div style={{ border: "1px solid var(--ink)", padding: "18px", marginBottom: 14 }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Strengths</div>
              {evaluation!.strengths.map((s, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ color: "#2d7a3c", fontFamily: "var(--mono)" }}>✓</span><span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span></div>)}
            </div>
            <div style={{ border: "1px solid var(--ink)", padding: "18px" }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Gaps to address</div>
              {evaluation!.gaps.map((g, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 11 }}>{String(i+1).padStart(2,"0")}</span><span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{g}</span></div>)}
            </div>
          </div>
          <div>
            <div style={{ border: "2px solid var(--ink)", padding: "18px", marginBottom: 14 }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>Stronger answer</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.9, color: "var(--ink)" }}>{evaluation!.betterAnswer}</div>
            </div>
            {evaluation!.tip && (
              <div style={{ border: "1px solid var(--rule)", padding: "14px 18px", background: "var(--paper-2)" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 6 }}>COACHING TIP</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{evaluation!.tip}</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button className="btn ghost" onClick={() => { setPhase("practice"); setEval(null); }} style={{ flex: 1 }}>Retry this question</button>
          <button className="btn" onClick={nextQ} style={{ flex: 1 }}>Next question →</button>
        </div>
      </main>
    </div>
  );
}
