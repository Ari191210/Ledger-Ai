"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Prediction = { topic: string; level: string; questions: { q: string; marks: number; type: string; why: string }[]; hotTopics: string[]; commandWords: string[]; examTip: string };

const LEVELS = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE", "JEE", "NEET"];

export default function PredictPage() {
  const [topic, setTopic]     = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel]     = useState("A-Level");
  const [result, setResult]   = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic or chapter."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "predict", topic, subject, level });
      const data = await res.json();
      if (!res.ok || !data.questions) { setError(data.error || "Could not generate predictions."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Question Predictor · {result.topic}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New prediction</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10, letterSpacing: "0.08em" }}>HOT TOPICS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.hotTopics.map((t, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--cinnabar-ink)", color: "var(--cinnabar-ink)" }}>{t}</span>)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {result.questions.map((q, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span className="mono cin" style={{ fontSize: 9 }}>Q{i + 1} · {q.type}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>[{q.marks} marks]</span>
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.6, marginBottom: 10 }}>{q.q}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                <span style={{ color: "#2d7a3c", fontFamily: "var(--mono)", fontSize: 9 }}>WHY LIKELY · </span>{q.why}
              </div>
            </div>
          ))}
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY COMMAND WORDS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.commandWords.map((w, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)" }}>{w}</span>)}
            </div>
          </div>
          <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
            <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 8 }}>EXAM TIP</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Question Predictor</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>What will the examiner ask?</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Predict likely exam questions from any topic or chapter.</h2>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic or chapter <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The Cold War, Organic Chemistry, Calculus…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject (optional)</div>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. History, Chemistry…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Predicting questions…" : "Predict exam questions →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
