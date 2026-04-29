"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type SourceAnalysis = {
  origin: { who: string; what: string; when: string; context: string };
  purpose: string;
  content: string;
  value: { origin: string; purpose: string; content: string };
  limitation: { origin: string; purpose: string; content: string };
  bias: string[];
  utility: string;
  examTip: string;
};

const SUBJECTS = ["History", "Economics", "Politics", "English Literature", "Geography", "TOK / Theory of Knowledge", "Other"];

export default function SourcePage() {
  const [sourceText, setSourceText] = useState("");
  const [origin, setOrigin]         = useState("");
  const [subject, setSubject]       = useState("History");
  const [question, setQuestion]     = useState("");
  const [analysis, setAnalysis]     = useState<SourceAnalysis | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  async function analyse() {
    if (sourceText.trim().length < 30) { setError("Paste at least a sentence from the source."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "source", sourceText, origin, subject, question });
      const data = await res.json();
      if (!res.ok || !data.value) { setError(data.error || "Could not analyse source."); return; }
      setAnalysis(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  const ValueBox = ({ label, text, accent }: { label: string; text: string; accent: string }) => (
    <div style={{ border: `1px solid ${accent}`, padding: "14px 16px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: accent, marginBottom: 8, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{text}</div>
    </div>
  );

  if (analysis) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 42 · Source Analyzer · {subject}</div>
        <button className="btn ghost" onClick={() => setAnalysis(null)}>New source</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>

        {/* Origin */}
        <div style={{ border: "2px solid var(--ink)", padding: "20px 24px", marginBottom: 20 }}>
          <div className="mono cin" style={{ marginBottom: 12 }}>Origin</div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {[["WHO", analysis.origin.who], ["WHAT", analysis.origin.what], ["WHEN", analysis.origin.when], ["CONTEXT", analysis.origin.context]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Purpose + Content */}
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 8 }}>PURPOSE</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{analysis.purpose}</div>
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 8 }}>CONTENT</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{analysis.content}</div>
          </div>
        </div>

        {/* Value */}
        <div style={{ marginBottom: 12 }}>
          <div className="mono" style={{ color: "#2d7a3c", fontSize: 9, marginBottom: 10, letterSpacing: "0.08em" }}>VALUE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ValueBox label="VALUE OF ORIGIN" text={analysis.value.origin} accent="#2d7a3c" />
            <ValueBox label="VALUE OF PURPOSE" text={analysis.value.purpose} accent="#2d7a3c" />
            <ValueBox label="VALUE OF CONTENT" text={analysis.value.content} accent="#2d7a3c" />
          </div>
        </div>

        {/* Limitation */}
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginBottom: 10, letterSpacing: "0.08em" }}>LIMITATION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ValueBox label="LIMITATION OF ORIGIN" text={analysis.limitation.origin} accent="var(--cinnabar-ink)" />
            <ValueBox label="LIMITATION OF PURPOSE" text={analysis.limitation.purpose} accent="var(--cinnabar-ink)" />
            <ValueBox label="LIMITATION OF CONTENT" text={analysis.limitation.content} accent="var(--cinnabar-ink)" />
          </div>
        </div>

        {/* Bias + Utility */}
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 8 }}>POSSIBLE BIAS</div>
            {analysis.bias.map((b, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {b}</div>)}
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 8 }}>OVERALL UTILITY</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{analysis.utility}</div>
          </div>
        </div>

        <div style={{ border: "1px solid #1a6091", padding: "14px 18px", background: "rgba(26,96,145,0.04)" }}>
          <div className="mono" style={{ color: "#1a6091", fontSize: 9, marginBottom: 6 }}>EXAM TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{analysis.examTip}</div>
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 42 · Source Analyzer</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Origin. Purpose. Value. Limitation.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Analyse any source. Exam-ready in seconds.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Source text or description <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} rows={6}
            placeholder="Paste the source text, or describe it: 'A photograph taken by a German soldier in 1942 showing…'"
            style={{ width: "100%", fontFamily: "var(--serif)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Origin details (optional but recommended)</div>
          <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Speech by Churchill, 1940; Newspaper article from The Times, 1956"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question context (optional)</div>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. 'Evaluate the usefulness of this source for studying the causes of WWI'"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={analyse} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Analysing source…" : "Analyse source →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
