"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type ReportSection = { heading: string; content: string; template: string | null };
type LabReport     = { title: string; sections: ReportSection[]; safetyNotes: string[]; evaluationCriteria: string[]; ibCriteria: string | null };

const BOARDS   = ["IB", "A-Level", "GCSE", "IGCSE", "AP", "CBSE"];
const SUBJECTS = ["Biology", "Chemistry", "Physics", "Environmental Science"];

export default function LabReportPage() {
  const [board, setBoard]         = useState("IB");
  const [subject, setSubject]     = useState("Biology");
  const [experiment, setExp]      = useState("");
  const [aim, setAim]             = useState("");
  const [variables, setVariables] = useState("");
  const [method, setMethod]       = useState("");
  const [report, setReport]       = useState<LabReport | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [copied, setCopied]       = useState(false);

  async function generate() {
    if (!experiment.trim()) { setError("Enter your experiment name."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "lab_report", board, subject, experiment, aim, variables, method });
      const data = await res.json();
      if (!res.ok || !data.sections) { setError("Could not generate report structure."); return; }
      setReport(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function copyAll() {
    if (!report) return;
    const text = report.sections.map(s => `## ${s.heading}\n\n${s.content}${s.template ? `\n\n${s.template}` : ""}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (report) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Lab Report Builder · {board} {subject}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={copyAll}>{copied ? "Copied!" : "Copy all"}</button>
          <button className="btn ghost" onClick={() => setReport(null)}>New report</button>
        </div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", margin: "0 0 28px" }}>{report.title}</h2>

        {report.ibCriteria && (
          <div style={{ padding: "12px 16px", border: "1px solid #1a6091", background: "rgba(26,96,145,0.05)", marginBottom: 24 }}>
            <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 4 }}>IB INTERNAL ASSESSMENT CRITERIA</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{report.ibCriteria}</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 28 }}>
          {report.sections.map((s, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 700 }}>{s.heading}</span>
                </div>
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink)", marginBottom: s.template ? 12 : 0 }}>{s.content}</div>
              {s.template && (
                <div style={{ padding: "12px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {s.template}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {report.safetyNotes.length > 0 && (
            <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px" }}>
              <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 8 }}>Safety notes</div>
              {report.safetyNotes.map((n, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5 }}>⚠ {n}</div>)}
            </div>
          )}
          {report.evaluationCriteria.length > 0 && (
            <div style={{ border: "1px solid var(--rule)", padding: "16px" }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Evaluation criteria</div>
              {report.evaluationCriteria.map((c, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5 }}>· {c}</div>)}
            </div>
          )}
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Lab Report Builder</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Write it right, first time</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Turn your experiment into a full report.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Board</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Experiment name / title</div>
          <input value={experiment} onChange={e => setExp(e.target.value)} placeholder="e.g. Effect of temperature on enzyme activity"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Research question / aim (optional)</div>
          <input value={aim} onChange={e => setAim(e.target.value)} placeholder="e.g. To investigate how temperature affects the rate of amylase activity"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Variables (optional)</div>
          <input value={variables} onChange={e => setVariables(e.target.value)} placeholder="e.g. IV: temperature (20, 30, 40, 50°C), DV: rate of starch breakdown, CV: pH, enzyme concentration"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Brief method summary (optional)</div>
          <textarea value={method} onChange={e => setMethod(e.target.value)} rows={3} placeholder="Brief summary of what you did…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical" }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building lab report…" : "Generate lab report structure →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
