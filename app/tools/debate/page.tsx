"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type DebateOutput = { motion: string; for: { argument: string; evidence: string; rebuttal: string }[]; against: { argument: string; evidence: string; rebuttal: string }[]; keyTerms: { term: string; def: string }[]; practiceQs: string[] };

export default function DebatePage() {
  const [motion, setMotion]   = useState("");
  const [side, setSide]       = useState<"both"|"for"|"against">("both");
  const [level, setLevel]     = useState("A-Level");
  const [output, setOutput]   = useState<DebateOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [view, setView]       = useState<"for"|"against">("for");

  async function generate() {
    if (!motion.trim()) return;
    setLoading(true); setError(""); setOutput(null);
    try {
      const res  = await callAI({ tool: "debate", motion, side, level });
      const data = await res.json();
      if (!res.ok || !data.for) { setError("Could not generate — try again."); return; }
      setOutput(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (output) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 24 · Debate Coach</div>
        <button className="btn ghost" onClick={() => setOutput(null)}>New motion</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 600, marginBottom: 28, padding: "16px 20px", border: "2px solid var(--ink)", lineHeight: 1.3 }}>
          &ldquo;{output.motion}&rdquo;
        </div>

        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)", marginBottom: 24, width: "fit-content" }}>
          <button onClick={() => setView("for")} style={{ padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 10, background: view === "for" ? "#2d7a3c" : "var(--paper)", color: view === "for" ? "var(--paper)" : "#2d7a3c", border: "none", borderRight: "1px solid var(--ink)", cursor: "pointer", letterSpacing: "0.06em" }}>FOR THE MOTION</button>
          <button onClick={() => setView("against")} style={{ padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 10, background: view === "against" ? "#c44b2a" : "var(--paper)", color: view === "against" ? "var(--paper)" : "#c44b2a", border: "none", cursor: "pointer", letterSpacing: "0.06em" }}>AGAINST THE MOTION</button>
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28 }}>
          <div>
            {(view === "for" ? output.for : output.against).map((arg, i) => (
              <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < 2 ? "none" : "1px solid var(--ink)", padding: "18px 20px" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <span className="mono" style={{ color: view === "for" ? "#2d7a3c" : "#c44b2a", flexShrink: 0, marginTop: 2 }}>ARG {String(i+1).padStart(2,"0")}</span>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, lineHeight: 1.4 }}>{arg.argument}</div>
                </div>
                <div style={{ paddingLeft: 44 }}>
                  <div style={{ marginBottom: 8 }}>
                    <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 3 }}>EVIDENCE / EXAMPLE</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{arg.evidence}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 3 }}>REBUTTAL IF CHALLENGED</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", fontStyle: "italic" }}>{arg.rebuttal}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            {output.keyTerms.length > 0 && (
              <div style={{ border: "1px solid var(--ink)", padding: "16px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Key terms</div>
                {output.keyTerms.map((t, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 700 }}>{t.term}</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{t.def}</div>
                  </div>
                ))}
              </div>
            )}
            {output.practiceQs.length > 0 && (
              <div style={{ border: "1px solid var(--ink)", padding: "16px" }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Practice questions</div>
                {output.practiceQs.map((q, i) => (
                  <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, marginBottom: 8, color: "var(--ink-2)" }}>{String(i+1).padStart(2,"0")}. {q}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 24 of 44.</div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 24 · Debate Coach</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Prepare your debate</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any motion. Arguments, evidence, rebuttals.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Debate motion *</div>
          <input value={motion} onChange={e => setMotion(e.target.value)} placeholder="e.g. This house believes AI will do more harm than good · Social media should be banned for under-16s…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Prepare</div>
            <select value={side} onChange={e => setSide(e.target.value as "both"|"for"|"against")} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              <option value="both">Both sides</option>
              <option value="for">For the motion only</option>
              <option value="against">Against only</option>
            </select>
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
            <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              {["GCSE","A-Level","IB","University","General"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading || !motion.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building arguments…" : "Generate debate prep →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 24 of 44.</div>
        </div>
      </main>
    </div>
  );
}
