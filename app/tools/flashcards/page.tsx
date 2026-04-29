"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Card = { q: string; a: string };

export default function FlashcardsPage() {
  const [input, setInput]     = useState("");
  const [subject, setSubject] = useState("");
  const [cards, setCards]     = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [idx, setIdx]         = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown]     = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [mode, setMode]       = useState<"all"|"unknown">("all");

  const deck = mode === "unknown" ? cards.filter((_, i) => unknown.has(i)) : cards;
  const cur  = deck[idx];

  async function generate() {
    if (!input.trim() && !subject.trim()) return;
    setLoading(true); setError(""); setCards([]); setIdx(0); setFlipped(false); setKnown(new Set()); setUnknown(new Set());
    try {
      const res  = await callAI({ tool: "flashcards", content: input, subject });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed."); return; }
      if (!Array.isArray(data.cards) || !data.cards.length) { setError("No cards generated — try again."); return; }
      setCards(data.cards);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function markKnown() {
    const orig = cards.indexOf(cur);
    setKnown(s => new Set(Array.from(s).concat(orig)));
    setUnknown(s => { const n = new Set(s); n.delete(orig); return n; });
    next();
  }

  function markUnknown() {
    const orig = cards.indexOf(cur);
    setUnknown(s => new Set(Array.from(s).concat(orig)));
    setKnown(s => { const n = new Set(s); n.delete(orig); return n; });
    next();
  }

  function next() { setFlipped(false); setTimeout(() => setIdx(i => (i + 1) % deck.length), 80); }
  function prev() { setFlipped(false); setTimeout(() => setIdx(i => (i - 1 + deck.length) % deck.length), 80); }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 17 · Flashcard Engine</div>
        {cards.length > 0 && <div className="mono" style={{ color: "var(--ink-3)" }}>{known.size} known · {unknown.size} still learning · {cards.length - known.size - unknown.size} unseen</div>}
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
        {cards.length === 0 ? (
          <>
            <div className="mono cin" style={{ marginBottom: 8 }}>Generate flashcards</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Paste notes or name a topic.</h2>

            <div style={{ marginBottom: 14 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / topic (optional if pasting notes)</div>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Organic Chemistry, World War II, Calculus…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Paste your notes (optional)</div>
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={8} placeholder="Paste chapter notes, definitions, or any study material here…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
            <button className="btn" onClick={generate} disabled={loading || (!input.trim() && !subject.trim())} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
              {loading ? "Generating cards…" : "Generate flashcards →"}
            </button>
          </>
        ) : (
          <>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)", marginBottom: 28, width: "fit-content" }}>
              {[["all", `All cards (${cards.length})`], ["unknown", `Still learning (${unknown.size})`]] .map(([v, l], i) => (
                <button key={v} onClick={() => { setMode(v as "all"|"unknown"); setIdx(0); setFlipped(false); }}
                  style={{ padding: "9px 18px", fontFamily: "var(--mono)", fontSize: 10, background: mode === v ? "var(--ink)" : "var(--paper)", color: mode === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i === 0 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
                  {l}
                </button>
              ))}
            </div>

            {deck.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", color: "var(--ink-2)" }}>No cards in this set.</div>
              </div>
            ) : (
              <>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 12, textAlign: "center" }}>{idx + 1} / {deck.length}</div>

                {/* Card */}
                <div onClick={() => setFlipped(f => !f)} style={{ border: "2px solid var(--ink)", padding: "60px 40px", textAlign: "center", cursor: "pointer", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: flipped ? "var(--ink)" : "var(--paper)", transition: "background 200ms", marginBottom: 20, userSelect: "none" }}>
                  <div className="mono" style={{ color: flipped ? "rgba(255,255,255,0.4)" : "var(--ink-3)", fontSize: 9, marginBottom: 16, letterSpacing: "0.1em" }}>{flipped ? "ANSWER" : "QUESTION — click to reveal"}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: flipped ? "var(--paper)" : "var(--ink)", lineHeight: 1.5, maxWidth: 520 }}>
                    {flipped ? cur.a : cur.q}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <button onClick={prev} style={{ flex: 1, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer" }}>← Prev</button>
                  {flipped && <>
                    <button onClick={markUnknown} style={{ flex: 2, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid #c44b2a", background: "var(--paper)", color: "#c44b2a", cursor: "pointer" }}>✕ Still learning</button>
                    <button onClick={markKnown}   style={{ flex: 2, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid #2d7a3c", background: "var(--paper)", color: "#2d7a3c", cursor: "pointer" }}>✓ Got it</button>
                  </>}
                  <button onClick={next} style={{ flex: 1, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer" }}>Next →</button>
                </div>

                <button className="btn ghost" onClick={() => setCards([])} style={{ width: "100%" }}>Generate new set</button>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 17 of 44.</div>
        </div>
      </main>
    </div>
  );
}
