"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Problem = { number: number; problem: string; hint: string; marks: number; solution: string };
type PracticeSet = { topic: string; difficulty: string; problems: Problem[] };

const SUBJECTS  = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Statistics", "Further Maths"];
const LEVELS    = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE Class 11", "CBSE Class 12", "JEE"];
const DIFF      = ["Mixed", "Easy", "Medium", "Hard"];

export default function PracticePage() {
  const [subject, setSubject]     = useState("Mathematics");
  const [topic, setTopic]         = useState("");
  const [level, setLevel]         = useState("A-Level");
  const [difficulty, setDifficulty] = useState("Mixed");
  const [count, setCount]         = useState(5);
  const [set, setSet]             = useState<PracticeSet | null>(null);
  const [revealed, setRevealed]   = useState<Record<number, boolean>>({});
  const [hinted, setHinted]       = useState<Record<number, boolean>>({});
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic."); return; }
    setLoading(true); setError(""); setRevealed({}); setHinted({});
    try {
      const res  = await callAI({ tool: "practice", subject, topic, level, difficulty, count });
      const data = await res.json();
      if (!res.ok || !data.problems) { setError(data.error || "Could not generate problems."); return; }
      setSet(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (set) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Practice Problems · {subject}</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{set.topic} · {set.difficulty} · {level}</div>
        </div>
        <button className="btn ghost" onClick={() => setSet(null)}>New set</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {set.problems.map((p) => (
            <div key={p.number} style={{ border: "1px solid var(--rule)", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="mono cin">Q{p.number}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>[{p.marks} mark{p.marks > 1 ? "s" : ""}]</span>
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{p.problem}</div>

              <div style={{ display: "flex", gap: 8 }}>
                {!hinted[p.number] && !revealed[p.number] && (
                  <button onClick={() => setHinted(prev => ({ ...prev, [p.number]: true }))}
                    style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 12px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>
                    Hint
                  </button>
                )}
                <button onClick={() => setRevealed(prev => ({ ...prev, [p.number]: !prev[p.number] }))}
                  style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 12px", border: `1px solid ${revealed[p.number] ? "var(--ink)" : "var(--rule)"}`, background: revealed[p.number] ? "var(--ink)" : "none", color: revealed[p.number] ? "var(--paper)" : "var(--ink-3)", cursor: "pointer" }}>
                  {revealed[p.number] ? "Hide solution" : "Show solution"}
                </button>
              </div>

              {hinted[p.number] && !revealed[p.number] && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                  <span className="mono" style={{ fontSize: 9, color: "#1a6091" }}>HINT · </span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>{p.hint}</span>
                </div>
              )}

              {revealed[p.number] && (
                <div style={{ marginTop: 12, padding: "16px 18px", border: "2px solid var(--ink)", background: "var(--paper-2)" }}>
                  <div className="mono cin" style={{ marginBottom: 10 }}>Worked solution</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{p.solution}</div>
                </div>
              )}
            </div>
          ))}
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Practice Problems</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Do, not just read</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Graded problems with full worked solutions.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Integration by parts, Circular motion, Supply & demand…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Difficulty</div>
          <div style={{ display: "flex", gap: 6 }}>
            {DIFF.map(d => <button key={d} onClick={() => setDifficulty(d)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${difficulty === d ? "var(--ink)" : "var(--rule)"}`, background: difficulty === d ? "var(--ink)" : "var(--paper)", color: difficulty === d ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{d}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Number of problems: {count}</div>
          <input type="range" min={3} max={10} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>3</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>10</span>
          </div>
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Generating problems…" : "Generate practice set →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
