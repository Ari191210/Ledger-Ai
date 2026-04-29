"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type AnalogyResult = { concept: string; analogies: { title: string; analogy: string; breakdown: string; limitation: string }[]; keyInsight: string; examTip: string };

export default function AnalogyPage() {
  const [concept, setConcept]   = useState("");
  const [subject, setSubject]   = useState("");
  const [result, setResult]     = useState<AnalogyResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function generate() {
    if (!concept.trim()) { setError("Enter a concept to explain."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "analogy", concept, subject });
      const data = await res.json();
      if (!res.ok || !data.analogies) { setError(data.error || "Could not generate analogies."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Analogy Engine · {result.concept}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New analogy</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {result.analogies.map((a, i) => (
            <div key={i} style={{ border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--rule)", padding: "20px 22px" }}>
              {i === 0 && <div className="mono cin" style={{ marginBottom: 8, fontSize: 9 }}>BEST ANALOGY</div>}
              <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, marginBottom: 10 }}>{a.title}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.7, marginBottom: 12, color: "var(--ink)" }}>{a.analogy}</div>
              <div style={{ marginBottom: 8 }}>
                <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 4 }}>HOW IT MAPS</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{a.breakdown}</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 4 }}>WHERE IT BREAKS DOWN</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{a.limitation}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ border: "1px solid #1a6091", padding: "16px 20px", background: "rgba(26,96,145,0.04)", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>KEY INSIGHT</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.7, fontStyle: "italic" }}>{result.keyInsight}</div>
        </div>
        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>EXAM TIP</div>
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Analogy Engine</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>If you can&apos;t explain it simply, you don&apos;t understand it yet.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Turn any complex concept into three memorable analogies.</h2>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Concept to explain <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <input value={concept} onChange={e => setConcept(e.target.value)} placeholder="e.g. Quantum entanglement, Supply elasticity, Oxidative phosphorylation…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject (optional)</div>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Physics, Economics, Biology…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Generating analogies…" : "Generate analogies →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
