"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type Tab = "palace" | "analogy";

// ── Memory Palace types ───────────────────────────────────────────────────────

type Station = { number: number; location: string; image: string; item: string; story: string };
type Palace  = { topic: string; palaceName: string; stations: Station[]; reviewTip: string };

// ── Analogy types ─────────────────────────────────────────────────────────────

type AnalogyResult = { concept: string; analogies: { title: string; analogy: string; breakdown: string; limitation: string }[]; keyInsight: string; examTip: string };

// ── Tab: Memory Palace ────────────────────────────────────────────────────────

function MemoryPalaceTab() {
  const [items,   setItems]   = useState("");
  const [topic,   setTopic]   = useState("");
  const [palace,  setPalace]  = useState<Palace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function generate() {
    if (!items.trim()) { setError("Enter the items you want to memorise."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "memory_palace", items, topic });
      const data = await res.json();
      if (!res.ok || !data.stations) { setError(data.error || "Could not build palace."); return; }
      setPalace(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (palace) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div className="mono cin">Your palace: {palace.palaceName}</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>Walk through each station in order. Visualise each image vividly.</div>
        </div>
        <button className="btn ghost" onClick={() => setPalace(null)}>New palace</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {palace.stations.map((s, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px 20px", display: "grid", gridTemplateColumns: "40px 1fr", gap: 16 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, fontStyle: "italic", color: "var(--cinnabar-ink)", lineHeight: 1 }}>{s.number}</div>
            <div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>{s.location}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.item}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--slate)", marginBottom: 6 }}>{s.image}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", fontStyle: "italic", lineHeight: 1.5 }}>{s.story}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid var(--slate)", padding: "14px 18px", background: "var(--slate-bg)" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--slate)", marginBottom: 6 }}>REVIEW TIP</div>
        <AIOutput text={palace.reviewTip} />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="mono cin" style={{ marginBottom: 6 }}>Walk through it. Never forget it.</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, fontStyle: "italic", margin: "0 0 24px" }}>Build a memory palace for any list of facts.</h2>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Items to memorise <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <textarea value={items} onChange={e => setItems(e.target.value)} rows={5}
          placeholder={"Enter each item on a new line:\nMitosis stages: Prophase, Metaphase, Anaphase, Telophase\nOr: French Revolution causes, Newton's laws, dates…"}
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic label (optional)</div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Biology Cell Division, French Revolution…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Building your palace…" : "Build memory palace →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Tab: Analogy Engine ───────────────────────────────────────────────────────

function AnalogyTab() {
  const [concept, setConcept] = useState("");
  const [subject, setSubject] = useState("");
  const [result,  setResult]  = useState<AnalogyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Analogies for: {result.concept}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New analogy</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
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
              <div className="mono cin" style={{ fontSize: 9, marginBottom: 4 }}>WHERE IT BREAKS DOWN</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{a.limitation}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ border: "1px solid var(--slate)", padding: "16px 20px", background: "var(--slate-bg)", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--slate)", marginBottom: 6 }}>KEY INSIGHT</div>
        <AIOutput text={result.keyInsight} variant="principle" />
      </div>
      <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>EXAM TIP</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="mono cin" style={{ marginBottom: 6 }}>If you can&apos;t explain it simply, you don&apos;t understand it yet.</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, fontStyle: "italic", margin: "0 0 24px" }}>Turn any complex concept into three memorable analogies.</h2>
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
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MemoryToolkitPage() {
  const [tab, setTab] = useState<Tab>("palace");

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Memory Toolkit</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Spatial memory and creative analogies. Never forget again.</div>
        </div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
          {([["palace", "Memory Palace"], ["analogy", "Analogy Engine"]] as [Tab, string][]).map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i === 0 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1000, margin: "0 auto" }}>
        {tab === "palace" && <MemoryPalaceTab />}
        {tab === "analogy" && <AnalogyTab />}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
