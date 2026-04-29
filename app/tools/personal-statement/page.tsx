"use client";
import { useState } from "react";
import Link from "next/link";

type Feedback = { score: number; hook: string; structure: string[]; paragraphNotes: string[]; tone: string; suggestions: string[]; rewrite: string };

const WORD_LIMITS = [250, 500, 650, 700, 1000];

export default function PersonalStatementPage() {
  const [ps, setPs]           = useState("");
  const [limit, setLimit]     = useState(650);
  const [uni, setUni]         = useState("");
  const [course, setCourse]   = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const wc = ps.trim().split(/\s+/).filter(Boolean).length;
  const pct = Math.min(wc / limit * 100, 100);
  const wcColor = wc > limit ? "#c44b2a" : wc > limit * 0.9 ? "#c97a1a" : "#2d7a3c";

  async function analyse() {
    if (wc < 50) { setError("Write at least 50 words first."); return; }
    setLoading(true); setError(""); setFeedback(null);
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "personal_statement", ps, limit, uni, course }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed."); return; }
      if (!data.suggestions) { setError("Could not analyse — try again."); return; }
      setFeedback(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 19 · Personal Statement Coach</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="mono" style={{ color: wcColor }}>{wc} / {limit} words</span>
          {feedback && <button className="btn ghost" onClick={() => setFeedback(null)}>Edit</button>}
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>
        {!feedback ? (
          <>
            <div className="mono cin" style={{ marginBottom: 8 }}>Personal statement workshop</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Write it here. Get coached in real time.</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>University / programme</div>
                <input value={uni} onChange={e => setUni(e.target.value)} placeholder="Oxford, UCL, Common App…"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / course</div>
                <input value={course} onChange={e => setCourse(e.target.value)} placeholder="Computer Science, Medicine…"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Word limit</div>
                <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)" }}>
                  {WORD_LIMITS.map(l => <option key={l} value={l}>{l} words</option>)}
                </select>
              </div>
            </div>

            {/* Word count bar */}
            <div style={{ height: 4, background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: wcColor, transition: "width 200ms" }} />
            </div>

            <textarea value={ps} onChange={e => setPs(e.target.value)} rows={20} placeholder="Start writing your personal statement here…"
              style={{ width: "100%", fontFamily: "Georgia, serif", fontSize: 15, border: "1px solid var(--ink)", background: "var(--paper)", padding: "16px 18px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.8, marginBottom: 16 }} />

            {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
            <button className="btn" onClick={analyse} disabled={loading || wc < 50} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
              {loading ? "Analysing…" : "Get feedback →"}
            </button>
          </>
        ) : (
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
            <div>
              <div style={{ border: "2px solid var(--ink)", padding: "20px 28px", marginBottom: 20, display: "flex", gap: 24, alignItems: "center" }}>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>OVERALL SCORE</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, color: "var(--cinnabar-ink)", lineHeight: 1 }}>{feedback.score}<span style={{ fontSize: 20, color: "var(--ink-3)" }}>/10</span></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 6 }}>HOOK STRENGTH</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", fontStyle: "italic" }}>&ldquo;{feedback.hook}&rdquo;</div>
                </div>
              </div>

              <div style={{ border: "1px solid var(--ink)", marginBottom: 20 }}>
                <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Structure analysis</div></div>
                {feedback.structure.map((s, i) => (
                  <div key={i} style={{ padding: "10px 18px", borderBottom: i < feedback.structure.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 10 }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>

              <div style={{ border: "1px solid var(--ink)", marginBottom: 20 }}>
                <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Paragraph-by-paragraph notes</div></div>
                {feedback.paragraphNotes.map((n, i) => (
                  <div key={i} style={{ padding: "10px 18px", borderBottom: i < feedback.paragraphNotes.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 10 }}>
                    <span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>¶{i+1}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{n}</span>
                  </div>
                ))}
              </div>

              {feedback.rewrite && (
                <div style={{ border: "1px solid var(--rule)", padding: "20px 24px" }}>
                  <div className="mono cin" style={{ marginBottom: 10 }}>Suggested opening rewrite</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.8, color: "var(--ink-2)", fontStyle: "italic" }}>{feedback.rewrite}</div>
                </div>
              )}
            </div>

            <div>
              <div style={{ border: "1px solid var(--ink)", padding: "18px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Tone & voice</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{feedback.tone}</div>
              </div>
              <div style={{ border: "1px solid var(--ink)", padding: "18px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Priority improvements</div>
                {feedback.suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
              <button className="btn ghost" onClick={() => setFeedback(null)} style={{ width: "100%" }}>← Back to editing</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 19 of 44.</div>
        </div>
      </main>
    </div>
  );
}
