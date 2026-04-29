"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Point = { point: string; evidence: string; explain: string; link: string };
type ArgumentPlan = { thesis: string; intro: string; points: Point[]; counter: { argument: string; rebuttal: string }; conclusion: string; keyPhrases: string[]; examTip: string };

const SUBJECTS = ["History", "Economics", "English Literature", "Politics", "Philosophy", "Sociology", "Geography", "Business", "Other Humanities"];
const LEVELS   = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE"];

export default function ArgumentPage() {
  const [claim, setClaim]       = useState("");
  const [subject, setSubject]   = useState("History");
  const [level, setLevel]       = useState("A-Level");
  const [evidence, setEvidence] = useState("");
  const [plan, setPlan]         = useState<ArgumentPlan | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  async function generate() {
    if (!claim.trim()) { setError("Enter a claim or essay question."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "argument", claim, subject, level, evidence });
      const data = await res.json();
      if (!res.ok || !data.points) { setError(data.error || "Could not build argument."); return; }
      setPlan(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function copyAll() {
    if (!plan) return;
    const t = [
      `THESIS: ${plan.thesis}`,
      `\nINTRODUCTION:\n${plan.intro}`,
      ...plan.points.map((p, i) => `\nPOINT ${i + 1}:\nP: ${p.point}\nE: ${p.evidence}\nE: ${p.explain}\nL: ${p.link}`),
      `\nCOUNTER-ARGUMENT:\n${plan.counter.argument}`,
      `REBUTTAL: ${plan.counter.rebuttal}`,
      `\nCONCLUSION:\n${plan.conclusion}`,
    ].join("\n");
    navigator.clipboard.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (plan) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Argument Builder · {subject}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={copyAll}>{copied ? "Copied!" : "Copy plan"}</button>
          <button className="btn ghost" onClick={() => setPlan(null)}>New argument</button>
        </div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>

        {/* Thesis */}
        <div style={{ border: "2px solid var(--ink)", padding: "18px 22px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8, letterSpacing: "0.08em" }}>THESIS STATEMENT</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.7, fontStyle: "italic" }}>{plan.thesis}</div>
        </div>

        {/* Intro */}
        <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>INTRODUCTION</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>{plan.intro}</div>
        </div>

        {/* Points */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {plan.points.map((p, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px 20px" }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>Point {i + 1}</div>
              {[["P — POINT", p.point, "var(--cinnabar-ink)"], ["E — EVIDENCE", p.evidence, "#1a6091"], ["E — EXPLAIN", p.explain, "var(--ink-3)"], ["L — LINK", p.link, "#2d7a3c"]].map(([label, text, color]) => (
                <div key={label as string} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: color as string, marginBottom: 4 }}>{label as string}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{text as string}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Counter + Rebuttal */}
        <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 12 }}>COUNTER-ARGUMENT & REBUTTAL</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 4 }}>COUNTER</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{plan.counter.argument}</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#2d7a3c", marginBottom: 4 }}>REBUTTAL</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{plan.counter.rebuttal}</div>
          </div>
        </div>

        {/* Conclusion */}
        <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>CONCLUSION</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7 }}>{plan.conclusion}</div>
        </div>

        {/* Key phrases + Exam tip */}
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY PHRASES TO USE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {plan.keyPhrases.map((phrase, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{phrase}</span>)}
            </div>
          </div>
          <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
            <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 8 }}>EXAM TIP</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{plan.examTip}</div>
          </div>
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Argument Builder</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Point. Evidence. Explain. Link.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Build a full P-E-E-L argument from any claim.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", gap: 6 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Claim, thesis, or essay question <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <textarea value={claim} onChange={e => setClaim(e.target.value)} rows={3}
            placeholder="e.g. 'To what extent was nationalism the primary cause of WWI?' or 'Stalin was a more effective leader than Hitler'"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Key evidence you have (optional)</div>
          <input value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="e.g. Treaty of Versailles, economic data, specific quotes…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building argument…" : "Build my argument →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
