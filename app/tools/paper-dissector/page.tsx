"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Part     = { label: string; marks: number; what: string; howToAnswer: string };
type Analysis = { commandWord: string; commandDefinition: string; totalMarks: number; timeAdvice: string; parts: Part[]; keyContent: string[]; structure: string[]; examinersTip: string; commonMistakes: string[] };

const BOARDS   = ["CBSE", "ICSE", "IB", "A-Level", "IGCSE", "AP"];
const SUBJECTS = ["Economics", "History", "Biology", "Chemistry", "Physics", "Mathematics", "English", "Geography", "Psychology", "Business"];

export default function PaperDissectorPage() {
  const [board, setBoard]       = useState("A-Level");
  const [subject, setSubject]   = useState("Economics");
  const [question, setQuestion] = useState("");
  const [marks, setMarks]       = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function analyse() {
    if (question.trim().length < 10) { setError("Paste your exam question."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "paper_dissector", board, subject, question, marks });
      const data = await res.json();
      if (!res.ok || !data.commandWord) { setError("Could not analyse question."); return; }
      setAnalysis(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (analysis) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 37 · Paper Dissector · {board} {subject}</div>
        <button className="btn ghost" onClick={() => setAnalysis(null)}>New question</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
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
              <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic", lineHeight: 1.6 }}>{analysis.examinersTip}</div>
            </div>
            <div style={{ padding: "14px", border: "1px solid var(--rule)" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>COMMON MISTAKES</div>
              {analysis.commonMistakes.map((m, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>✗ {m}</div>)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 37 · Paper Dissector</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Decode what examiners want</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste any question. Get the strategy.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Board</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

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

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={analyse} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Dissecting question…" : "Dissect this question →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
