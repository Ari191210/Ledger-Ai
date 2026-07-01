"use client";
import { useState, useEffect } from "react";
import { useUserLevel } from "@/hooks/use-user-level";
import Link from "next/link";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type Row = { criterion: string; items: string[] };
type Chart = { title: string; items: string[]; rows: Row[]; similarities: string[]; differences: string[]; verdict: string };

const LEVELS = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE", "University"];

export default function ComparePage() {
  const profileLevel = useUserLevel();
  const [items, setItems]       = useState(["", ""]);
  const [subject, setSubject]   = useState("");
  const [level, setLevel]       = useState("A-Level");

  useEffect(() => { const m = profileLevel.startsWith("CBSE") ? "CBSE" : profileLevel; if (LEVELS.includes(m)) setLevel(m); }, [profileLevel]);
  const [criteria, setCriteria] = useState("");
  const [chart, setChart]       = useState<Chart | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  function setItem(i: number, v: string) { setItems(prev => prev.map((x, j) => j === i ? v : x)); }
  function addItem() { if (items.length < 4) setItems(prev => [...prev, ""]); }
  function removeItem(i: number) { if (items.length > 2) setItems(prev => prev.filter((_, j) => j !== i)); }

  async function generate() {
    const filled = items.filter(x => x.trim());
    if (filled.length < 2) { setError("Enter at least two items to compare."); return; }
    setLoading(true); setError("");
    try {
      const data = await callAIOrThrow<Chart>({ tool: "compare", items: filled, subject, level, criteria });
      setChart(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (chart) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Comparison Chart</div>
        <button className="btn ghost" onClick={() => setChart(null)}>New comparison</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 960, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 500, margin: "0 0 28px" }}>{chart.title}</h2>

        {/* Comparison table */}
        <div style={{ overflowX: "auto", marginBottom: 28 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-3)", textAlign: "left", padding: "10px 14px", borderBottom: "2px solid var(--ink)", background: "var(--paper-2)", width: 160 }}>CRITERION</th>
                {chart.items.map((item, i) => (
                  <th key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid var(--ink)", borderLeft: "1px solid var(--rule)", background: i === 0 ? "var(--ink)" : "var(--paper-2)", color: i === 0 ? "var(--paper)" : "var(--ink)" }}>
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid var(--rule)" }}>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--cinnabar-ink)", padding: "12px 14px", background: "var(--paper-2)", verticalAlign: "top" }}>{row.criterion}</td>
                  {row.items.map((cell, ci) => (
                    <td key={ci} style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, padding: "12px 14px", borderLeft: "1px solid var(--rule)", verticalAlign: "top", color: "var(--ink)" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ color: "var(--sage)", fontSize: 9, marginBottom: 10 }}>SIMILARITIES</div>
            {chart.similarities.map((s, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 6 }}>· {s}</div>)}
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginBottom: 10 }}>KEY DIFFERENCES</div>
            {chart.differences.map((d, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 6 }}>· {d}</div>)}
          </div>
        </div>

        <div style={{ border: "none", padding: "16px 20px" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Verdict</div>
          <AIOutput text={chart.verdict} variant="principle" />
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Comparison Chart</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Side by side, instantly</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Compare any concepts, events, or theories.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Items to compare <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={item} onChange={e => setItem(i, e.target.value)} placeholder={`Item ${i + 1} — e.g. Mitosis`}
                style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              {items.length > 2 && <button onClick={() => removeItem(i)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "0 10px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>✕</button>}
            </div>
          ))}
          {items.length < 4 && (
            <button onClick={addItem} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 12px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>+ Add item</button>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LEVELS.map(l => (
              <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / context (optional)</div>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology, Economics, History…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Specific criteria to compare (optional)</div>
          <input value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="e.g. cause, effect, time period, key figures…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building comparison…" : "Build comparison chart →"}
        </button>
        {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
