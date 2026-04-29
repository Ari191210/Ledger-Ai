"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type ReadingResult = { title: string; summary: string; tone: string; themes: string[]; devices: { name: string; example: string; effect: string }[]; questions: { q: string; level: string; modelAnswer: string }[]; vocabHighlights: { word: string; meaning: string }[]; examTip: string };

const SUBJECTS = ["English Literature", "English Language", "History", "Economics", "Politics", "Other"];

export default function ReadingPage() {
  const [passage, setPassage]   = useState("");
  const [subject, setSubject]   = useState("English Literature");
  const [question, setQuestion] = useState("");
  const [result, setResult]     = useState<ReadingResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [openQ, setOpenQ]       = useState<number | null>(null);

  async function analyse() {
    if (passage.trim().length < 40) { setError("Paste at least a paragraph to analyse."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "reading", passage, subject, question });
      const data = await res.json();
      if (!res.ok || !data.themes) { setError(data.error || "Could not analyse passage."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 50 · Reading Companion · {subject}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New passage</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ flex: 2, border: "1px solid var(--rule)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>SUMMARY</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.summary}</div>
          </div>
          <div style={{ flex: 1, border: "1px solid var(--rule)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>TONE</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic" }}>{result.tone}</div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6, marginTop: 12 }}>THEMES</div>
            {result.themes.map((t, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 3 }}>· {t}</div>)}
          </div>
        </div>

        {result.devices.length > 0 && (
          <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10 }}>LITERARY / LANGUAGE DEVICES</div>
            {result.devices.map((d, i) => (
              <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < result.devices.length - 1 ? "1px solid var(--rule-2)" : "none" }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", flexShrink: 0 }}>{d.name}</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", fontStyle: "italic" }}>&ldquo;{d.example}&rdquo;</span>
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>Effect: {d.effect}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10 }}>COMPREHENSION QUESTIONS</div>
          {result.questions.map((q, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", marginBottom: 6 }}>
              <button onClick={() => setOpenQ(openQ === i ? null : i)} style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "left" }}>
                  <span className="mono" style={{ fontSize: 8, color: q.level === "Analysis" ? "var(--cinnabar-ink)" : q.level === "Evaluation" ? "#6b3fa0" : "#2d7a3c", marginRight: 8 }}>{q.level}</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{q.q}</span>
                </div>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", flexShrink: 0 }}>{openQ === i ? "▲" : "▼"}</span>
              </button>
              {openQ === i && <div style={{ padding: "0 14px 12px", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", borderTop: "1px solid var(--rule)" }}><div style={{ paddingTop: 10 }}>{q.modelAnswer}</div></div>}
            </div>
          ))}
        </div>

        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY VOCABULARY</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.vocabHighlights.map((v, i) => (
              <div key={i} style={{ padding: "4px 10px", border: "1px solid var(--rule)" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>{v.word}</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)" }}> — {v.meaning}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 50 · Reading Companion</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Read deeper. Answer better.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste any passage. Get full analysis, questions, and model answers.</h2>
        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Passage <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <textarea value={passage} onChange={e => setPassage(e.target.value)} rows={7}
            placeholder="Paste the text you want to analyse — a poem, prose extract, article, speech, or source document."
            style={{ width: "100%", fontFamily: "var(--serif)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question or focus (optional)</div>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. 'How does the writer create tension?' or 'What is the author's viewpoint?'"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={analyse} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Analysing passage…" : "Analyse passage →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
