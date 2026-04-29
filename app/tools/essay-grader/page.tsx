"use client";
import { useState } from "react";
import Link from "next/link";

type Criterion = { name: string; score: number; max: number; feedback: string };
type Grade = { overall: string; band: string; totalScore: number; maxScore: number; criteria: Criterion[]; strengths: string[]; improvements: string[]; summary: string };

const LEVELS = ["GCSE", "A-Level / IB", "Class 10", "Class 12", "Undergraduate", "Graduate"];
const TYPES  = ["Argumentative", "Analytical", "Narrative", "Descriptive", "Comparative", "Research"];

export default function EssayGraderPage() {
  const [essay,   setEssay]   = useState("");
  const [subject, setSubject] = useState("");
  const [level,   setLevel]   = useState(LEVELS[1]);
  const [type,    setType]    = useState(TYPES[0]);
  const [prompt,  setPrompt]  = useState("");
  const [grade,   setGrade]   = useState<Grade | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function analyse() {
    if (essay.trim().length < 100) { setError("Essay must be at least 100 characters."); return; }
    setLoading(true); setError(""); setGrade(null);
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "essay_grade", essay, subject, level, type, prompt }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed."); return; }
      if (!data.criteria) { setError("Could not grade — try again."); return; }
      setGrade(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  const wc = essay.trim().split(/\s+/).filter(Boolean).length;

  if (grade) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 18 · Essay Grader · Results</div>
        <button className="btn ghost" onClick={() => setGrade(null)}>Grade another →</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
          <div>
            {/* Overall */}
            <div style={{ border: "2px solid var(--ink)", padding: "28px 32px", marginBottom: 24, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 4 }}>OVERALL GRADE</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 700, lineHeight: 1, color: "var(--cinnabar-ink)" }}>{grade.overall}</div>
                <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>{grade.band}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 6 }}>TOTAL SCORE</div>
                <div style={{ height: 8, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                  <div style={{ height: "100%", width: `${(grade.totalScore / grade.maxScore) * 100}%`, background: "var(--cinnabar)" }} />
                </div>
                <div className="mono" style={{ marginTop: 4 }}>{grade.totalScore} / {grade.maxScore}</div>
              </div>
            </div>

            {/* Criteria */}
            <div style={{ border: "1px solid var(--ink)", marginBottom: 24 }}>
              <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                <div className="mono cin">Marking criteria</div>
              </div>
              {grade.criteria.map((c, i) => (
                <div key={i} style={{ padding: "14px 18px", borderBottom: i < grade.criteria.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)" }}>{c.score}/{c.max}</span>
                  </div>
                  <div style={{ height: 3, background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${(c.score / c.max) * 100}%`, background: c.score / c.max > 0.75 ? "#2d7a3c" : c.score / c.max > 0.5 ? "#c97a1a" : "#c44b2a" }} />
                  </div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{c.feedback}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", lineHeight: 1.7, color: "var(--ink-2)", border: "1px solid var(--rule)", padding: "20px 24px" }}>&ldquo;{grade.summary}&rdquo;</div>
          </div>

          <div>
            <div style={{ border: "1px solid var(--ink)", padding: "18px", marginBottom: 16 }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Strengths</div>
              {grade.strengths.map((s, i) => (<div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ color: "#2d7a3c", fontFamily: "var(--mono)", fontSize: 11 }}>✓</span><span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span></div>))}
            </div>
            <div style={{ border: "1px solid var(--ink)", padding: "18px" }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Improvements</div>
              {grade.improvements.map((s, i) => (<div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 11 }}>{String(i+1).padStart(2,"0")}</span><span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span></div>))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 18 of 44.</div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 18 · Essay Grader</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>{wc} words</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Grade my essay</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Paste your essay. Get a real grade.</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="English, History…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
            <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)" }}>
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay type</div>
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)" }}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay prompt / question (optional)</div>
          <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Paste the question or title you were given…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your essay *</div>
          <textarea value={essay} onChange={e => setEssay(e.target.value)} rows={16} placeholder="Paste your full essay here…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
        </div>
        {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
        <button className="btn" onClick={analyse} disabled={loading || essay.trim().length < 100} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Grading essay…" : "Grade my essay →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 18 of 44.</div>
        </div>
      </main>
    </div>
  );
}
