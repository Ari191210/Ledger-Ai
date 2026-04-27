"use client";
import { useState } from "react";
import Link from "next/link";

type Word = { word: string; definition: string; partOfSpeech: string; example: string; etymology: string; synonyms: string[]; memoryTip: string; difficulty: "basic" | "intermediate" | "advanced" };
type VaultData = { words: Word[]; theme: string };
type CardState = "front" | "back";

export default function VocabPage() {
  const [topic, setTopic]       = useState("");
  const [context, setContext]   = useState("academic");
  const [count, setCount]       = useState("10");
  const [level, setLevel]       = useState("A-Level");
  const [vault, setVault]       = useState<VaultData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [idx, setIdx]           = useState(0);
  const [cardState, setCardState] = useState<CardState>("front");
  const [known, setKnown]       = useState<Set<number>>(new Set());
  const [mode, setMode]         = useState<"cards" | "list">("cards");

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setVault(null);
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "vocab", topic, context, count, level }) });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.words)) { setError("Could not generate — try again."); return; }
      setVault(data); setIdx(0); setCardState("front"); setKnown(new Set());
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function markKnown() {
    setKnown(k => { const n = new Set(k); n.add(idx); return n; });
    if (vault && idx < vault.words.length - 1) { setIdx(i => i + 1); setCardState("front"); }
  }
  function markStudy() {
    setKnown(k => { const n = new Set(k); n.delete(idx); return n; });
    if (vault && idx < vault.words.length - 1) { setIdx(i => i + 1); setCardState("front"); }
  }

  const diffColor = { basic: "#2d7a3c", intermediate: "#c97a1a", advanced: "#c44b2a" };

  if (!vault) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 29 · Vocabulary Vault</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Build your vocabulary</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any topic. Deep word learning with memory hooks.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic / subject *</div>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Biology cell biology, Shakespeare, Economics, Law…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Context</div>
            <select value={context} onChange={e => setContext(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              <option value="academic">Academic writing</option>
              <option value="subject">Subject-specific</option>
              <option value="general">General English</option>
              <option value="sat">SAT / test prep</option>
              <option value="literature">Literature</option>
            </select>
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
            <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              {["GCSE","A-Level","IB","University","Advanced"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Words</div>
            <select value={count} onChange={e => setCount(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
              {["8","10","15","20"].map(n => <option key={n} value={n}>{n} words</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading || !topic.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1, marginTop: 14 }}>
          {loading ? "Building vocab vault…" : "Generate vocabulary →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 29 of 30.</div>
        </div>
      </main>
    </div>
  );

  const w = vault.words[idx];
  const knownCount = known.size;
  const total = vault.words.length;

  return (
    <div>
      <header className="mob-hp" style={{ padding: "20px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 29 · Vocabulary Vault · {vault.theme}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 11, color: "#2d7a3c" }}>{knownCount}/{total} known</span>
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
            <button onClick={() => setMode("cards")} style={{ padding: "6px 14px", fontFamily: "var(--mono)", fontSize: 10, background: mode === "cards" ? "var(--ink)" : "var(--paper)", color: mode === "cards" ? "var(--paper)" : "var(--ink)", border: "none", borderRight: "1px solid var(--ink)", cursor: "pointer" }}>Cards</button>
            <button onClick={() => setMode("list")}  style={{ padding: "6px 14px", fontFamily: "var(--mono)", fontSize: 10, background: mode === "list"  ? "var(--ink)" : "var(--paper)", color: mode === "list"  ? "var(--paper)" : "var(--ink)", border: "none", cursor: "pointer" }}>List</button>
          </div>
          <button className="btn ghost" onClick={() => setVault(null)}>New topic</button>
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>

        {/* Progress bar */}
        <div style={{ background: "var(--paper-2)", height: 6, marginBottom: 32, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${(knownCount / total) * 100}%`, height: "100%", background: "#2d7a3c", transition: "width 0.3s" }} />
        </div>

        {mode === "cards" ? (
          <>
            {/* Card */}
            <div onClick={() => setCardState(s => s === "front" ? "back" : "front")}
              style={{ border: "2px solid var(--ink)", padding: "40px 48px", minHeight: 320, cursor: "pointer", marginBottom: 24, position: "relative", background: known.has(idx) ? "#2d7a3c08" : "var(--paper)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>{w.word}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginLeft: 10 }}>{w.partOfSpeech}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: `1px solid ${diffColor[w.difficulty]}`, color: diffColor[w.difficulty] }}>{w.difficulty}</span>
                  <span className="mono" style={{ color: "var(--ink-3)", fontSize: 10 }}>{idx + 1}/{total}</span>
                </div>
              </div>

              {cardState === "front" ? (
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 40 }}>tap to reveal definition</div>
              ) : (
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 18, lineHeight: 1.6, marginBottom: 16, color: "var(--ink)" }}>{w.definition}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", fontStyle: "italic", marginBottom: 16, lineHeight: 1.6 }}>&ldquo;{w.example}&rdquo;</div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {w.etymology && (
                      <div>
                        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 2 }}>ETYMOLOGY</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{w.etymology}</div>
                      </div>
                    )}
                    {w.synonyms.length > 0 && (
                      <div>
                        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 2 }}>SYNONYMS</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{w.synonyms.join(", ")}</div>
                      </div>
                    )}
                  </div>
                  {w.memoryTip && (
                    <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                      <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 2 }}>MEMORY HOOK</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{w.memoryTip}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setCardState("front"); }} disabled={idx === 0} style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer", opacity: idx === 0 ? 0.3 : 1 }}>← Back</button>
              <button onClick={markStudy} style={{ padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid #c44b2a", background: "var(--paper)", color: "#c44b2a", cursor: "pointer" }}>Still learning</button>
              <button onClick={markKnown} style={{ padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid #2d7a3c", background: "#2d7a3c", color: "var(--paper)", cursor: "pointer" }}>Got it ✓</button>
              <button onClick={() => { setIdx(i => Math.min(total - 1, i + 1)); setCardState("front"); }} disabled={idx === total - 1} style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer", opacity: idx === total - 1 ? 0.3 : 1 }}>Next →</button>
            </div>

            {/* Word dots */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
              {vault.words.map((_, i) => (
                <button key={i} onClick={() => { setIdx(i); setCardState("front"); }}
                  style={{ width: 8, height: 8, borderRadius: "50%", border: "none", cursor: "pointer", background: known.has(i) ? "#2d7a3c" : i === idx ? "var(--ink)" : "var(--rule)" }} />
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1, border: "1px solid var(--ink)" }}>
            {vault.words.map((word, i) => (
              <div key={i} style={{ padding: "16px 18px", borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", background: known.has(i) ? "#2d7a3c08" : "var(--paper)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700 }}>{word.word}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: diffColor[word.difficulty] }}>{word.difficulty}</span>
                </div>
                <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 4 }}>{word.partOfSpeech}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)", marginBottom: 8 }}>{word.definition}</div>
                {word.memoryTip && <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>💡 {word.memoryTip}</div>}
                <button onClick={() => setKnown(k => { const n = new Set(k); if (known.has(i)) { n.delete(i); } else { n.add(i); } return n; })}
                  style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: `1px solid ${known.has(i) ? "#2d7a3c" : "var(--rule)"}`, background: known.has(i) ? "#2d7a3c" : "var(--paper)", color: known.has(i) ? "var(--paper)" : "var(--ink-3)", cursor: "pointer" }}>
                  {known.has(i) ? "✓ known" : "mark known"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 29 of 30.</div>
        </div>
      </main>
    </div>
  );
}
