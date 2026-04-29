"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Slide = { title: string; bullets: string[]; speakerNote: string };
type Deck = { title: string; slides: Slide[]; advice: string };

export default function PresentationPage() {
  const [topic, setTopic]       = useState("");
  const [audience, setAudience] = useState("class");
  const [duration, setDuration] = useState("10");
  const [style, setStyle]       = useState("academic");
  const [deck, setDeck]         = useState<Deck | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState(0);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setDeck(null);
    try {
      const res  = await callAI({ tool: "presentation", topic, audience, duration, style });
      const data = await res.json();
      if (!res.ok || !data.slides) { setError("Could not generate — try again."); return; }
      setDeck(data); setSelected(0);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (deck) return (
    <div>
      <header className="mob-hp" style={{ padding: "20px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Presentation Planner · {deck.slides.length} slides · {duration} min</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => window.print()}>Print ↗</button>
          <button className="btn ghost" onClick={() => setDeck(null)}>New deck</button>
        </div>
      </header>
      <main style={{ display: "flex", height: "calc(100vh - 61px)", overflow: "hidden" }}>
        {/* Slide list */}
        <div style={{ width: 220, borderRight: "1px solid var(--ink)", overflowY: "auto", flexShrink: 0 }}>
          {deck.slides.map((s, i) => (
            <div key={i} onClick={() => setSelected(i)}
              style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", cursor: "pointer", background: selected === i ? "var(--ink)" : "var(--paper)", color: selected === i ? "var(--paper)" : "var(--ink)" }}>
              <div className="mono" style={{ fontSize: 9, opacity: 0.5, marginBottom: 3 }}>SLIDE {String(i+1).padStart(2,"0")}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{s.title}</div>
            </div>
          ))}
        </div>

        {/* Slide detail */}
        <div style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {/* Slide preview */}
            <div style={{ border: "2px solid var(--ink)", padding: "48px 56px", marginBottom: 24, minHeight: 300, background: "var(--paper)", aspectRatio: "16/9", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, fontStyle: "italic", marginBottom: 24, letterSpacing: "-0.02em" }}>{deck.slides[selected].title}</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {deck.slides[selected].bullets.map((b, i) => (
                  <li key={i} style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.8, color: "var(--ink-2)", marginBottom: 4 }}>{b}</li>
                ))}
              </ul>
            </div>

            {/* Speaker notes */}
            <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 20 }}>
              <div className="mono cin" style={{ marginBottom: 8 }}>Speaker notes</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>{deck.slides[selected].speakerNote}</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSelected(s => Math.max(0, s-1))} disabled={selected === 0} style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer", opacity: selected === 0 ? 0.3 : 1 }}>← Prev</button>
              <button onClick={() => setSelected(s => Math.min(deck.slides.length-1, s+1))} disabled={selected === deck.slides.length-1} style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer", opacity: selected === deck.slides.length-1 ? 0.3 : 1 }}>Next →</button>
            </div>

            {deck.advice && (
              <div style={{ marginTop: 24, border: "1px solid var(--rule)", padding: "14px 18px" }}>
                <div className="mono cin" style={{ marginBottom: 6 }}>Delivery tip</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{deck.advice}</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Presentation Planner</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Plan your presentation</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Topic → full slide deck with speaker notes.</h2>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic *</div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Climate Change and Food Security, Quantum Computing, Shakespeare's use of tragedy…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Audience</div>
            <select value={audience} onChange={e => setAudience(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              <option value="class">Classmates</option>
              <option value="teacher">Teacher / examiner</option>
              <option value="university">University panel</option>
              <option value="general">General audience</option>
              <option value="corporate">Corporate / professional</option>
            </select>
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Duration (min)</div>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              {["5","7","10","15","20","30"].map(d => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Style</div>
            <select value={style} onChange={e => setStyle(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              <option value="academic">Academic</option>
              <option value="persuasive">Persuasive</option>
              <option value="informative">Informative</option>
              <option value="narrative">Narrative / Story</option>
            </select>
          </div>
        </div>
        {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading || !topic.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building slides…" : "Generate presentation →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
