"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Tone     = { label: string; explanation: string };
type LangDev  = { device: string; example: string; effect: string };
type Structure = { feature: string; effect: string };
type Theme    = { theme: string; evidence: string };
type Analysis = { type: string; tone: Tone[]; structure: Structure[]; language: LangDev[]; themes: Theme[]; audience: string; purpose: string; grade9Points: string[]; exampleAnswer: string };

const TEXT_TYPES = ["Poetry", "Prose extract", "News article", "Speech", "Diary/Letter", "Advertisement", "Literary non-fiction"];

export default function LangAnalyzerPage() {
  const [text, setText]         = useState("");
  const [textType, setTextType] = useState("Poetry");
  const [level, setLevel]       = useState("A-Level");
  const [focus, setFocus]       = useState("full");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState<"language" | "structure" | "themes" | "answer">("language");

  async function analyse() {
    if (text.trim().length < 50) { setError("Paste at least a paragraph of text."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "lang_analyzer", text, textType, level, focus });
      const data = await res.json();
      if (!res.ok || !data.language) { setError("Could not analyse text."); return; }
      setAnalysis(data); setTab("language");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (analysis) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Language Analyzer · {analysis.type}</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Audience: {analysis.audience} · Purpose: {analysis.purpose}</div>
        </div>
        <button className="btn ghost" onClick={() => setAnalysis(null)}>New text</button>
      </header>
      <main className="mob-p" style={{ padding: "32px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {analysis.tone.map((t, i) => (
            <div key={i} style={{ padding: "8px 14px", border: "1px solid var(--ink)", background: i === 0 ? "var(--ink)" : "var(--paper)", color: i === 0 ? "var(--paper)" : "var(--ink)" }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 700 }}>{t.label}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 11, opacity: 0.7, marginTop: 2 }}>{t.explanation}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", borderBottom: "2px solid var(--ink)", marginBottom: 24 }}>
          {(["language", "structure", "themes", "answer"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 18px", border: "none", borderBottom: tab === t ? "2px solid var(--cinnabar-ink)" : "none", background: "none", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: tab === t ? "var(--cinnabar-ink)" : "var(--ink-3)", cursor: "pointer", marginBottom: -2 }}>
              {t === "answer" ? "Grade 9 answer" : t}
            </button>
          ))}
        </div>

        {tab === "language" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {analysis.language.map((l, i) => (
              <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 18px" }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, color: "var(--cinnabar-ink)", marginBottom: 6 }}>{l.device}</div>
                <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 8, fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic" }}>&ldquo;{l.example}&rdquo;</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}><strong>Effect:</strong> {l.effect}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "structure" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analysis.structure.map((s, i) => (
              <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 18px", display: "flex", gap: 16 }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, minWidth: 160 }}>{s.feature}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.effect}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "themes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analysis.themes.map((t, i) => (
              <div key={i} style={{ border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--rule)", padding: "14px 18px" }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t.theme}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{t.evidence}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "answer" && (
          <div>
            <div style={{ marginBottom: 14, padding: "10px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>TOP-BAND POINTS TO HIT</div>
              {analysis.grade9Points.map((p, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 4 }}>· {p}</div>)}
            </div>
            <div style={{ border: "2px solid var(--ink)", padding: "20px 24px" }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>Model paragraph</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.9 }}>{analysis.exampleAnswer}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Language Analyzer</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Unseen text, fully decoded</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste any text. Get exam-ready analysis.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Text type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TEXT_TYPES.map(t => <button key={t} onClick={() => setTextType(t)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${textType === t ? "var(--ink)" : "var(--rule)"}`, background: textType === t ? "var(--ink)" : "var(--paper)", color: textType === t ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{t}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["GCSE", "IGCSE", "A-Level", "IB"].map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Analysis focus</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["full", "Full analysis"], ["language", "Language only"], ["structure", "Structure only"]].map(([v, l]) => <button key={v} onClick={() => setFocus(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${focus === v ? "var(--ink)" : "var(--rule)"}`, background: focus === v ? "var(--ink)" : "var(--paper)", color: focus === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Text to analyse</div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
            placeholder="Paste your poem, extract, article, or passage here…"
            style={{ width: "100%", fontFamily: "var(--serif)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.8 }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={analyse} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Analysing text…" : "Analyse this text →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
