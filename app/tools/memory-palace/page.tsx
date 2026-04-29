"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Station = { number: number; location: string; image: string; item: string; story: string };
type Palace = { topic: string; palaceName: string; stations: Station[]; reviewTip: string };

export default function MemoryPalacePage() {
  const [items, setItems]   = useState("");
  const [topic, setTopic]   = useState("");
  const [palace, setPalace] = useState<Palace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

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
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Memory Palace</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{palace.palaceName}</div>
        </div>
        <button className="btn ghost" onClick={() => setPalace(null)}>New palace</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ border: "2px solid var(--ink)", padding: "16px 20px", marginBottom: 24 }}>
          <div className="mono cin" style={{ marginBottom: 4 }}>Your palace: {palace.palaceName}</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>Walk through each station in order. Visualise the image vividly.</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {palace.stations.map((s, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px 20px", display: "grid", gridTemplateColumns: "40px 1fr", gap: 16 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700, fontStyle: "italic", color: "var(--cinnabar-ink)", lineHeight: 1 }}>{s.number}</div>
              <div>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>{s.location}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.item}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "#1a6091", marginBottom: 6 }}>🖼 {s.image}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", fontStyle: "italic", lineHeight: 1.5 }}>{s.story}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ border: "1px solid #1a6091", padding: "14px 18px", background: "rgba(26,96,145,0.04)" }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>REVIEW TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{palace.reviewTip}</div>
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Memory Palace Builder</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Walk through it. Never forget it.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Build a memory palace for any list of facts.</h2>
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
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
