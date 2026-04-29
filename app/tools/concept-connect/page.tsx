"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Connection = { conceptA: string; conceptB: string; links: { type: string; description: string; example: string }[]; deepInsight: string; crossSubjectValue: string; examAngles: string[]; examTip: string };

export default function ConceptConnectPage() {
  const [conceptA, setConceptA] = useState("");
  const [conceptB, setConceptB] = useState("");
  const [result, setResult]     = useState<Connection | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function generate() {
    if (!conceptA.trim() || !conceptB.trim()) { setError("Enter both concepts."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "concept_connect", conceptA, conceptB });
      const data = await res.json();
      if (!res.ok || !data.links) { setError(data.error || "Could not find connections."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Concept Connect · {result.conceptA} ↔ {result.conceptB}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New connection</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
          <div style={{ flex: 1, border: "2px solid var(--ink)", padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{result.conceptA}</div>
          </div>
          <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 20, flexShrink: 0 }}>↔</div>
          <div style={{ flex: 1, border: "2px solid var(--ink)", padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{result.conceptB}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {result.links.map((l, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 6 }}>{l.type}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>{l.description}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", fontStyle: "italic" }}>e.g. {l.example}</div>
            </div>
          ))}
        </div>

        <div style={{ border: "2px solid var(--ink)", padding: "16px 20px", marginBottom: 12 }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Deep Insight</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.7, fontStyle: "italic" }}>{result.deepInsight}</div>
        </div>

        <div style={{ border: "1px solid #2d7a3c", padding: "14px 16px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 8 }}>CROSS-SUBJECT VALUE</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.crossSubjectValue}</div>
        </div>

        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>EXAM ANGLES THIS UNLOCKS</div>
          {result.examAngles.map((a, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {a}</div>)}
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Concept Connect</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Everything connects.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Discover the hidden links between any two concepts.</h2>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>First concept <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <input value={conceptA} onChange={e => setConceptA(e.target.value)} placeholder="e.g. Natural Selection, Supply and Demand, WW1…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Second concept <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <input value={conceptB} onChange={e => setConceptB(e.target.value)} placeholder="e.g. Capitalism, Entropy, Nationalism…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20, padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Try cross-subject pairs for surprising insights. E.g.: &quot;Mitosis&quot; + &quot;Industrial Revolution&quot; or &quot;Keynesian Economics&quot; + &quot;WW2&quot;</div>
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Finding connections…" : "Find the connection →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
