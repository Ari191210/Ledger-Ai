"use client";

import { useState } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";

type Output = { solution: string; principle: string; practice: string[] };

export default function DoubtPage() {
  const [question, setQuestion] = useState("");
  const [output,   setOutput]   = useState<Output | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function solve() {
    if (!question.trim()) return;
    setLoading(true); setError(""); setOutput(null);
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "doubt", question }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setOutput(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TierGate requires="pro">
      <div>
        <header style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 04 · Doubt Solver</div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>A question, a worked answer</div>
        </header>

        <main style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: output ? "1fr 1fr" : "1fr", gap: 48, maxWidth: output ? "100%" : 700 }}>
            {/* Input */}
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Input · Your question or problem</div>
              <textarea
                value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder={"Describe the problem clearly.\n\nExamples:\n— A ball is thrown at 30° with 20 m/s. Find max height.\n— Explain why noble gases are unreactive.\n— Differentiate f(x) = 3x² + 2x − 5"}
                rows={10}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="btn" onClick={solve} disabled={loading || !question.trim()} style={{ opacity: loading || !question.trim() ? 0.5 : 1 }}>
                  {loading ? "Solving…" : "Solve →"}
                </button>
                {output && <button className="btn ghost" onClick={() => { setOutput(null); setQuestion(""); }}>Clear</button>}
              </div>
              {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
            </div>

            {/* Output */}
            {output && (
              <div>
                <div style={{ border: "1px solid var(--ink)" }}>
                  {/* Solution */}
                  <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--ink)" }}>
                    <div className="mono cin" style={{ marginBottom: 12 }}>Worked solution</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                      {output.solution}
                    </div>
                  </div>

                  {/* Principle */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink)", background: "var(--paper-2)" }}>
                    <div className="mono cin" style={{ marginBottom: 8 }}>Underlying principle</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.55, fontStyle: "italic" }}>
                      {output.principle}
                    </div>
                  </div>

                  {/* Practice */}
                  <div style={{ padding: "16px 20px" }}>
                    <div className="mono cin" style={{ marginBottom: 10 }}>Three similar problems</div>
                    {output.practice.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < output.practice.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 04 of 10.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
