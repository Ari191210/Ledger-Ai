"use client";

import { useState } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";

type OutlineSection = { section: string; points: string[] };
type Output = { title: string; outline: OutlineSection[]; arguments: string[]; research: string[] };

export default function AssignmentPage() {
  const [brief,     setBrief]     = useState("");
  const [subject,   setSubject]   = useState("");
  const [wordLimit, setWordLimit] = useState(1000);
  const [output,    setOutput]    = useState<Output | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function generate() {
    if (!brief.trim()) return;
    setLoading(true); setError(""); setOutput(null);
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "assignment", brief, subject, wordLimit }) });
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
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 08 · Assignment Rescue</div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Brief → outline in 30 seconds</div>
        </header>

        <main style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: output ? "1fr 1.4fr" : "1fr", gap: 48, maxWidth: output ? "100%" : 680 }}>
            {/* Input */}
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Input · Your assignment brief</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 10 }}>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (e.g. History, Economics)"
                  style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)" }} />
                <input type="number" value={wordLimit} onChange={(e) => setWordLimit(+e.target.value)} placeholder="Words"
                  style={{ fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)" }} />
              </div>
              <textarea
                value={brief} onChange={(e) => setBrief(e.target.value)}
                placeholder={"Paste or type your assignment brief.\n\nExamples:\n— Analyse the causes and consequences of the French Revolution.\n— Compare and contrast two economic models of development.\n— Evaluate the impact of social media on teenage mental health."}
                rows={12}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="btn" onClick={generate} disabled={loading || !brief.trim()} style={{ opacity: loading || !brief.trim() ? 0.5 : 1 }}>
                  {loading ? "Planning…" : "Rescue →"}
                </button>
                {output && <button className="btn ghost" onClick={() => { setOutput(null); setBrief(""); }}>Clear</button>}
              </div>
              {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
            </div>

            {/* Output */}
            {output && (
              <div>
                {/* Title */}
                <div style={{ padding: "20px 20px 16px", border: "1px solid var(--ink)", borderBottom: "none", background: "var(--paper-2)" }}>
                  <div className="mono cin" style={{ marginBottom: 8 }}>Suggested title</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
                    {output.title}
                  </div>
                </div>

                {/* Outline */}
                <div style={{ border: "1px solid var(--ink)", borderBottom: "none" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
                    <div className="mono cin">Outline</div>
                  </div>
                  {output.outline.map((sec, i) => (
                    <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>
                        {sec.section}
                      </div>
                      <ul style={{ margin: "0 0 0 28px", padding: 0 }}>
                        {sec.points.map((p, j) => (
                          <li key={j} style={{ fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: 2 }}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Arguments */}
                <div style={{ border: "1px solid var(--ink)", borderBottom: "none" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
                    <div className="mono cin">Argument angles</div>
                  </div>
                  {output.arguments.map((arg, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid var(--rule)", display: "flex", gap: 12 }}>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{arg}</span>
                    </div>
                  ))}
                </div>

                {/* Research */}
                <div style={{ border: "1px solid var(--ink)" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
                    <div className="mono cin">Research directions</div>
                  </div>
                  {output.research.map((r, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: i < output.research.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 12 }}>
                      <span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 08 of 10.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
