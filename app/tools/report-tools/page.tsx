"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ── Types ──────────────────────────────────────────────────────────────────

type ReportSection = { heading: string; content: string; template: string | null };
type LabReport     = { title: string; sections: ReportSection[]; safetyNotes: string[]; evaluationCriteria: string[]; ibCriteria: string | null };

type ModelAnswer = { question: string; marks: number; modelAnswer: string; markingPoints: string[]; whatMakesItGood: string[]; structureGuide: string; examTip: string };

// ── Constants ──────────────────────────────────────────────────────────────

const BOARDS   = ["IB", "A-Level", "GCSE", "IGCSE", "AP", "CBSE"];
const SUBJECTS = ["Biology", "Chemistry", "Physics", "Environmental Science"];
const LEVELS   = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE", "JEE", "NEET"];

// ── Tab: Lab Report ────────────────────────────────────────────────────────

function LabReportTab() {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Lab Report Builder &middot; {board} {subject}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={copyAll} style={{ cursor: "pointer" }}>{copied ? "Copied!" : "Copy all"}</button>
          <button className="btn ghost" onClick={() => setReport(null)} style={{ cursor: "pointer" }}>New report</button>
        </div>
      </div>
      <div style={{ maxWidth: 800 }}>
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
              <div style={{ marginBottom: s.template ? 12 : 0 }}><AIOutput text={s.content} /></div>
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
              {report.safetyNotes.map((n, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5 }}>&#9888; {n}</div>)}
            </div>
          )}
          {report.evaluationCriteria.length > 0 && (
            <div style={{ border: "1px solid var(--rule)", padding: "16px" }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Evaluation criteria</div>
              {report.evaluationCriteria.map((c, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5 }}>&middot; {c}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Write it right, first time</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Turn your experiment into a full report.</h2>

      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Board</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {BOARDS.map(b => (
            <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
        <div style={{ display: "flex", gap: 6 }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>
          ))}
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
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1, cursor: "pointer" }}>
        {loading ? "Building lab report…" : "Generate lab report structure →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Tab: Model Answer ──────────────────────────────────────────────────────

function ModelAnswerTab() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject]   = useState("");
  const [level, setLevel]       = useState("A-Level");
  const [marks, setMarks]       = useState(6);
  const [result, setResult]     = useState<ModelAnswer | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  async function generate() {
    if (!question.trim()) { setError("Enter an exam question."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "model_answer", question, subject, level, marks });
      const data = await res.json();
      if (!res.ok || !data.modelAnswer) { setError(data.error || "Could not generate model answer."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.modelAnswer).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (result) return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Model Answer &middot; {result.marks} marks</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={copy} style={{ cursor: "pointer" }}>{copied ? "Copied!" : "Copy answer"}</button>
          <button className="btn ghost" onClick={() => setResult(null)} style={{ cursor: "pointer" }}>New question</button>
        </div>
      </div>

      <div style={{ border: "1px solid var(--rule)", padding: "14px 18px", marginBottom: 20, background: "var(--paper-2)" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>QUESTION</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.6, fontStyle: "italic" }}>{result.question}</div>
      </div>

      <div style={{ border: "2px solid var(--ink)", padding: "20px 24px", marginBottom: 20 }}>
        <div className="mono cin" style={{ marginBottom: 12 }}>Model Answer</div>
        <AIOutput text={result.modelAnswer} />
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ border: "1px solid #2d7a3c", padding: "14px 16px" }}>
          <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 8 }}>MARKING POINTS COVERED</div>
          {result.markingPoints.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#2d7a3c", fontFamily: "var(--mono)", fontSize: 9 }}>&#10003;</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.4 }}>{p}</span>
            </div>
          ))}
        </div>
        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 8 }}>WHAT MAKES IT GOOD</div>
          {result.whatMakesItGood.map((w, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5, color: "var(--ink-2)" }}>&middot; {w}</div>)}
        </div>
      </div>

      <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>STRUCTURE GUIDE</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.structureGuide}</div>
      </div>

      <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
        <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>EXAM TIP</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>See what full marks looks like.</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Generate a perfect model answer for any exam question.</h2>

      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
          placeholder="e.g. &apos;Evaluate the causes of WWI.&apos; or &apos;Explain how enzymes work. [6 marks]&apos;"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject (optional)</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. History, Biology…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {LEVELS.map(l => (
            <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Marks: {marks}</div>
        <input type="range" min={1} max={25} value={marks} onChange={e => setMarks(Number(e.target.value))} style={{ width: "100%", cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>1</span>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>25</span>
        </div>
      </div>
      {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1, cursor: "pointer" }}>
        {loading ? "Generating model answer…" : "Generate model answer →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type Tab = "lab" | "model";
const TABS: [Tab, string][] = [["lab", "Lab Report"], ["model", "Model Answer"]];

export default function ReportToolsPage() {
  const [tab, setTab] = useState<Tab>("lab");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Report Tools</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Lab reports and model answers.</div>
        </div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i < TABS.length - 1 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>&larr; Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "lab" && <LabReportTab />}
        {tab === "model" && <ModelAnswerTab />}
      </main>
    </div>
  );
}
