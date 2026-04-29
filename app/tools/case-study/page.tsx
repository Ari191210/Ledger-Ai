"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type CaseStudy = { title: string; summary: string; situation: string; problem: string; stakeholders: string[]; analysis: { framework: string; points: string[] }[]; recommendations: string[]; conclusion: string; examTip: string };

const FRAMEWORKS = ["SWOT", "Porter's Five Forces", "PESTLE", "BCG Matrix", "ANSOFF", "Auto-select best"];

export default function CaseStudyPage() {
  const [caseText, setCaseText]     = useState("");
  const [question, setQuestion]     = useState("");
  const [framework, setFramework]   = useState("Auto-select best");
  const [result, setResult]         = useState<CaseStudy | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  async function analyse() {
    if (caseText.trim().length < 20) { setError("Paste a case study or describe the scenario."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "case_study", caseText, question, framework });
      const data = await res.json();
      if (!res.ok || !data.analysis) { setError(data.error || "Could not analyse case study."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 48 · Case Study Pro · {result.title}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New case</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ border: "2px solid var(--ink)", padding: "18px 22px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>SUMMARY</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.7 }}>{result.summary}</div>
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>SITUATION</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.situation}</div>
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8 }}>CORE PROBLEM</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.problem}</div>
          </div>
        </div>

        <div style={{ border: "1px solid var(--rule)", padding: "16px 18px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>STAKEHOLDERS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.stakeholders.map((s, i) => <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, padding: "4px 10px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{s}</span>)}
          </div>
        </div>

        {result.analysis.map((a, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px 18px", marginBottom: 12 }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>{a.framework}</div>
            {a.points.map((p, j) => <div key={j} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>· {p}</div>)}
          </div>
        ))}

        <div style={{ border: "1px solid #2d7a3c", padding: "16px 18px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 10 }}>RECOMMENDATIONS</div>
          {result.recommendations.map((r, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{i + 1}. {r}</div>)}
        </div>

        <div style={{ border: "1px solid var(--ink)", padding: "16px 20px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>CONCLUSION</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 14, lineHeight: 1.7, fontStyle: "italic" }}>{result.conclusion}</div>
        </div>

        <div style={{ border: "1px solid #1a6091", padding: "14px 18px", background: "rgba(26,96,145,0.04)" }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>EXAM TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 48 · Case Study Pro</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Structure. Analyse. Recommend.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Business and economics case study analysis in seconds.</h2>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Case study text or scenario <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <textarea value={caseText} onChange={e => setCaseText(e.target.value)} rows={6}
            placeholder="Paste the case study text, or describe the scenario: 'A UK supermarket chain is losing market share to discount retailers…'"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question (optional)</div>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. 'Evaluate the most appropriate strategy for the business'"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Analysis framework</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {FRAMEWORKS.map(f => <button key={f} onClick={() => setFramework(f)} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 10px", border: `1px solid ${framework === f ? "var(--ink)" : "var(--rule)"}`, background: framework === f ? "var(--ink)" : "var(--paper)", color: framework === f ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{f}</button>)}
          </div>
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={analyse} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Analysing case…" : "Analyse case study →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
