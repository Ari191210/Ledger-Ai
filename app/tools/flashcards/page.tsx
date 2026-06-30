"use client";
import { useState } from "react";
import Link from "next/link";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

type Card = { q: string; a: string; hint?: string };
type Diff = "Easy" | "Medium" | "Hard";

const DIFFS: { value: Diff; desc: string }[] = [
  { value: "Easy",   desc: "Definitions & key terms" },
  { value: "Medium", desc: "Application & comparison" },
  { value: "Hard",   desc: "Synthesis & edge cases" },
];
const COUNTS = [10, 20, 30] as const;

export default function FlashcardsPage() {
  const [input, setInput]         = useState("");
  const [subject, setSubject]     = useState("");
  const [difficulty, setDifficulty] = useState<Diff>("Medium");
  const [count, setCount]         = useState<10 | 20 | 30>(10);
  const [cards, setCards]         = useState<Card[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [idx, setIdx]             = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [showHint, setShowHint]   = useState(false);
  const [known, setKnown]         = useState<Set<number>>(new Set());
  const [unknown, setUnknown]     = useState<Set<number>>(new Set());
  const [mode, setMode]           = useState<"all"|"unknown">("all");

  const deck = mode === "unknown" ? cards.filter((_, i) => unknown.has(i)) : cards;
  const cur  = deck[idx];

  async function generate() {
    if (!input.trim() && !subject.trim()) return;
    setLoading(true); setError(""); setCards([]); setIdx(0); setFlipped(false); setShowHint(false); setKnown(new Set()); setUnknown(new Set());
    try {
      const data = await callAIOrThrow<{ cards: Card[] }>({ tool: "flashcards", content: input, subject, difficulty, count });
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

  function next() { setFlipped(false); setShowHint(false); setTimeout(() => setIdx(i => (i + 1) % deck.length), 80); }
  function prev() { setFlipped(false); setShowHint(false); setTimeout(() => setIdx(i => (i - 1 + deck.length) % deck.length), 80); }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Flashcard Engine</div>
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
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Paste your notes (optional)</div>
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={8} placeholder="Paste chapter notes, definitions, or any study material here…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Difficulty</div>
              <div style={{ display: "flex", gap: 6 }}>
                {DIFFS.map(d => (
                  <button key={d.value} onClick={() => setDifficulty(d.value)}
                    style={{ flex: 1, padding: "8px 6px", border: `1px solid ${difficulty === d.value ? "var(--ink)" : "var(--rule)"}`, background: difficulty === d.value ? "var(--ink)" : "var(--paper-2)", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: difficulty === d.value ? "var(--paper)" : "var(--ink)", marginBottom: 2 }}>{d.value}</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 10, color: difficulty === d.value ? "var(--paper-2)" : "var(--ink-3)" }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Cards</div>
              <div style={{ display: "flex", gap: 6 }}>
                {COUNTS.map(n => (
                  <button key={n} onClick={() => setCount(n as 10 | 20 | 30)}
                    style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 18px", border: `1px solid ${count === n ? "var(--ink)" : "var(--rule)"}`, background: count === n ? "var(--ink)" : "var(--paper-2)", color: count === n ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
            <button className="btn" onClick={generate} disabled={loading || (!input.trim() && !subject.trim())} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
              {loading ? "Generating cards…" : `Generate ${count} ${difficulty.toLowerCase()} cards →`}
            </button>
            {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          </>
        ) : (
          <>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const, marginBottom: 28, width: "fit-content" }}>
              {[["all", `All cards (${cards.length})`], ["unknown", `Still learning (${unknown.size})`]] .map(([v, l], i) => (
                <button key={v} onClick={() => { setMode(v as "all"|"unknown"); setIdx(0); setFlipped(false); }}
                  style={{ padding: "9px 18px", fontFamily: "var(--mono)", fontSize: 10, background: mode === v ? "var(--ink)" : "var(--paper)", color: mode === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
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
                <div onClick={() => setFlipped(f => !f)} style={{ border: "none", padding: "60px 40px", textAlign: "center", cursor: "pointer", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: flipped ? "var(--ink)" : "var(--paper)", transition: "background 200ms", marginBottom: 12, userSelect: "none" }}>
                  <div className="mono" style={{ color: flipped ? "color-mix(in oklch, var(--paper) 40%, transparent)" : "var(--ink-3)", fontSize: 9, marginBottom: 16, letterSpacing: "0.1em" }}>{flipped ? "ANSWER" : "QUESTION — click to reveal"}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: flipped ? "var(--paper)" : "var(--ink)", lineHeight: 1.5, maxWidth: 520 }}>
                    {flipped ? cur.a : cur.q}
                  </div>
                </div>
                {!flipped && cur.hint && (
                  <div style={{ marginBottom: 12, textAlign: "center" }}>
                    {showHint
                      ? <div style={{ padding: "8px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)", display: "inline-block" }}>
                          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>HINT · </span>
                          <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>{cur.hint}</span>
                        </div>
                      : <button onClick={e => { e.stopPropagation(); setShowHint(true); }}
                          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 14px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>
                          Hint
                        </button>
                    }
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <button onClick={prev} style={{ flex: 1, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer" }}>← Prev</button>
                  {flipped && <>
                    <button onClick={markUnknown} style={{ flex: 2, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--cinnabar)", background: "var(--paper)", color: "var(--cinnabar)", cursor: "pointer" }}>✕ Still learning</button>
                    <button onClick={markKnown}   style={{ flex: 2, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--sage)", background: "var(--paper)", color: "var(--sage)", cursor: "pointer" }}>✓ Got it</button>
                  </>}
                  <button onClick={next} style={{ flex: 1, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer" }}>Next →</button>
                </div>

                <button className="btn ghost" onClick={() => setCards([])} style={{ width: "100%" }}>Generate new set</button>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
