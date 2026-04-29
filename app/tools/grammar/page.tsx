"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Issue = { type: string; original: string; suggestion: string; explanation: string };
type GrammarResult = { overallScore: number; band: string; issues: Issue[]; strengths: string[]; rewrite: string; academicPhrases: string[]; examTip: string };

export default function GrammarPage() {
  const [text, setText]       = useState("");
  const [purpose, setPurpose] = useState("Essay");
  const [result, setResult]   = useState<GrammarResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showRewrite, setShowRewrite] = useState(false);

  const PURPOSES = ["Essay", "Report", "Personal Statement", "Dissertation", "Email"];
  const TYPE_COLORS: Record<string, string> = { Grammar: "var(--cinnabar-ink)", Style: "#1a6091", Vocabulary: "#2d7a3c", Punctuation: "#7a5c2d", Structure: "#6b3fa0" };

  async function check() {
    if (text.trim().length < 30) { setError("Paste at least a paragraph of text."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "grammar", text, purpose });
      const data = await res.json();
      if (!res.ok || !data.issues) { setError(data.error || "Could not check grammar."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Grammar Coach · {purpose}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>Check new text</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ border: "2px solid var(--ink)", padding: "18px 24px", flex: "0 0 auto" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>WRITING SCORE</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 700, lineHeight: 1, color: result.overallScore >= 80 ? "#2d7a3c" : result.overallScore >= 60 ? "var(--ink)" : "var(--cinnabar-ink)" }}>{result.overallScore}</div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 4 }}>/ 100 · {result.band}</div>
          </div>
          <div style={{ flex: 1, border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 8 }}>STRENGTHS</div>
            {result.strengths.map((s, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {s}</div>)}
          </div>
        </div>

        {result.issues.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10, letterSpacing: "0.08em" }}>ISSUES TO FIX ({result.issues.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.issues.map((issue, i) => {
                const color = TYPE_COLORS[issue.type] || "var(--ink-3)";
                return (
                  <div key={i} style={{ border: `1px solid ${color}`, padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span className="mono" style={{ fontSize: 9, color }}>{issue.type}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 6 }}>
                      <div>
                        <div className="mono" style={{ fontSize: 8, color: "var(--cinnabar-ink)", marginBottom: 3 }}>ORIGINAL</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", textDecoration: "line-through" }}>{issue.original}</div>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 8, color: "#2d7a3c", marginBottom: 3 }}>SUGGESTION</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{issue.suggestion}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.4 }}>{issue.explanation}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>ACADEMIC PHRASES TO USE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.academicPhrases.map((p, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{p}</span>)}
          </div>
        </div>

        <div style={{ border: "1px solid var(--ink)", padding: "16px 18px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showRewrite ? 12 : 0 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>IMPROVED REWRITE</div>
            <button onClick={() => setShowRewrite(!showRewrite)} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>
              {showRewrite ? "Hide" : "Show rewrite"}
            </button>
          </div>
          {showRewrite && <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{result.rewrite}</div>}
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Grammar Coach</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Write like an examiner expects.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Improve grammar, style, and academic register — instantly.</h2>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Writing type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PURPOSES.map(p => <button key={p} onClick={() => setPurpose(p)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${purpose === p ? "var(--ink)" : "var(--rule)"}`, background: purpose === p ? "var(--ink)" : "var(--paper)", color: purpose === p ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{p}</button>)}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your text <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
            placeholder="Paste a paragraph or more of your writing. The tool checks grammar, style, vocabulary, and academic register."
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={check} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Checking writing…" : "Check my writing →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
