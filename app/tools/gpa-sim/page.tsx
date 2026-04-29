"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Board = "CBSE" | "ICSE" | "IB" | "A-Level" | "IGCSE" | "AP" | "State";
type Component = { id: string; name: string; weight: number; scored: number | null; maxScore: number; done: boolean };

const BOARD_CONFIGS: Record<Board, { label: string; components: Omit<Component, "id" | "scored" | "done">[]; targetScale: { label: string; options: string[] }; gradeFromPct: (p: number) => string; color: string }> = {
  CBSE: {
    label: "CBSE (Class 9–12)",
    color: "#1a6091",
    components: [
      { name: "Unit Test 1", weight: 10, maxScore: 100 },
      { name: "Mid-Term / Half Yearly", weight: 30, maxScore: 100 },
      { name: "Unit Test 2", weight: 10, maxScore: 100 },
      { name: "Board / Annual Exam", weight: 80, maxScore: 100 },
    ],
    targetScale: { label: "Target grade", options: ["A1 (91–100%)", "A2 (81–90%)", "B1 (71–80%)", "B2 (61–70%)", "C1 (51–60%)", "C2 (41–50%)", "D (33–40%)"] },
    gradeFromPct: p => p >= 91 ? "A1" : p >= 81 ? "A2" : p >= 71 ? "B1" : p >= 61 ? "B2" : p >= 51 ? "C1" : p >= 41 ? "C2" : p >= 33 ? "D" : "Fail",
  },
  ICSE: {
    label: "ICSE / ISC",
    color: "#2d7a3c",
    components: [
      { name: "Internal Assessment", weight: 20, maxScore: 100 },
      { name: "Board Examination", weight: 80, maxScore: 100 },
    ],
    targetScale: { label: "Target grade", options: ["Distinction (75%+)", "Merit (60–74%)", "Pass (35–59%)"] },
    gradeFromPct: p => p >= 75 ? "Distinction" : p >= 60 ? "Merit" : p >= 35 ? "Pass" : "Fail",
  },
  IB: {
    label: "IB (MYP / DP)",
    color: "#8b5a2b",
    components: [
      { name: "Internal Assessment (IA)", weight: 20, maxScore: 7 },
      { name: "Paper 1", weight: 40, maxScore: 7 },
      { name: "Paper 2", weight: 40, maxScore: 7 },
    ],
    targetScale: { label: "Target grade (1–7)", options: ["7 (Excellent)", "6 (Very Good)", "5 (Good)", "4 (Satisfactory)", "3 (Mediocre)", "2 (Poor)", "1 (Very Poor)"] },
    gradeFromPct: p => p >= 87 ? "7" : p >= 72 ? "6" : p >= 56 ? "5" : p >= 42 ? "4" : p >= 28 ? "3" : p >= 14 ? "2" : "1",
  },
  "A-Level": {
    label: "A-Level / AS-Level",
    color: "#6b3fa0",
    components: [
      { name: "Coursework / NEA", weight: 20, maxScore: 100 },
      { name: "Paper 1", weight: 40, maxScore: 100 },
      { name: "Paper 2", weight: 40, maxScore: 100 },
    ],
    targetScale: { label: "Target grade", options: ["A* (90%+)", "A (80–89%)", "B (70–79%)", "C (60–69%)", "D (50–59%)", "E (40–49%)"] },
    gradeFromPct: p => p >= 90 ? "A*" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : p >= 40 ? "E" : "U",
  },
  IGCSE: {
    label: "Cambridge IGCSE",
    color: "#c44b2a",
    components: [
      { name: "Coursework (if applicable)", weight: 20, maxScore: 100 },
      { name: "Paper 1 / Theory", weight: 40, maxScore: 100 },
      { name: "Paper 2 / Practical", weight: 40, maxScore: 100 },
    ],
    targetScale: { label: "Target grade", options: ["A* (90%+)", "A (80–89%)", "B (70–79%)", "C (60–69%)", "D (50–59%)", "E (40–49%)", "F / G (below 40%)"] },
    gradeFromPct: p => p >= 90 ? "A*" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : p >= 40 ? "E" : "F",
  },
  AP: {
    label: "AP (Advanced Placement)",
    color: "#c97a1a",
    components: [
      { name: "Multiple Choice (MCQ)", weight: 50, maxScore: 100 },
      { name: "Free Response (FRQ)", weight: 50, maxScore: 100 },
    ],
    targetScale: { label: "Target AP score", options: ["5 (Extremely well qualified)", "4 (Well qualified)", "3 (Qualified)", "2 (Possibly qualified)", "1 (No recommendation)"] },
    gradeFromPct: p => p >= 76 ? "5" : p >= 60 ? "4" : p >= 44 ? "3" : p >= 30 ? "2" : "1",
  },
  State: {
    label: "State Board (India)",
    color: "#555",
    components: [
      { name: "Internal / Practical", weight: 20, maxScore: 100 },
      { name: "Theory Exam", weight: 80, maxScore: 100 },
    ],
    targetScale: { label: "Target percentage", options: ["Distinction (75%+)", "First Class (60–74%)", "Second Class (50–59%)", "Pass (35–49%)"] },
    gradeFromPct: p => p >= 75 ? "Distinction" : p >= 60 ? "First Class" : p >= 50 ? "Second Class" : p >= 35 ? "Pass" : "Fail",
  },
};

function makeId() { return Math.random().toString(36).slice(2); }

export default function GpaSimPage() {
  const [board, setBoard]     = useState<Board>("CBSE");
  const [subject, setSubject] = useState("");
  const [comps, setComps]     = useState<Component[]>([]);
  const [targetIdx, setTargetIdx] = useState(0);

  const cfg = BOARD_CONFIGS[board];

  useEffect(() => {
    const cfgNow = BOARD_CONFIGS[board];
    setComps(cfgNow.components.map(c => ({ ...c, id: makeId(), scored: null, done: false })));
    setTargetIdx(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  function setScored(id: string, val: string) {
    const n = val === "" ? null : Math.min(parseFloat(val), comps.find(c => c.id === id)!.maxScore);
    setComps(cs => cs.map(c => c.id === id ? { ...c, scored: isNaN(n as number) ? null : n, done: val !== "" } : c));
  }
  function toggleDone(id: string) { setComps(cs => cs.map(c => c.id === id ? { ...c, done: !c.done, scored: c.done ? null : c.scored } : c)); }
  function addComponent() { setComps(cs => [...cs, { id: makeId(), name: "Custom component", weight: 10, maxScore: 100, scored: null, done: false }]); }
  function updateComp(id: string, key: "name" | "weight" | "maxScore", val: string) {
    setComps(cs => cs.map(c => c.id === id ? { ...c, [key]: key === "name" ? val : parseFloat(val) || 0 } : c));
  }
  function removeComp(id: string) { setComps(cs => cs.filter(c => c.id !== id)); }

  const targetOptions = cfg.targetScale.options;
  const targetLabel   = targetOptions[targetIdx] || "";
  const targetPct     = parseFloat(targetLabel.match(/\d+/)?.[0] || "0");

  const totalWeight = comps.reduce((s, c) => s + c.weight, 0);
  const doneWeight  = comps.filter(c => c.done && c.scored !== null).reduce((s, c) => s + c.weight, 0);
  const pendingWeight = totalWeight - doneWeight;

  const currentWeightedPct = comps
    .filter(c => c.done && c.scored !== null)
    .reduce((s, c) => s + ((c.scored! / c.maxScore) * 100) * (c.weight / totalWeight), 0);


  function neededInRemaining(): { pct: number | null; feasible: boolean; msg: string } {
    if (pendingWeight === 0) {
      const grade = cfg.gradeFromPct(currentWeightedPct);
      return { pct: null, feasible: currentWeightedPct >= targetPct, msg: `All done. Final: ${currentWeightedPct.toFixed(1)}% → ${grade}` };
    }
    if (totalWeight === 0) return { pct: null, feasible: false, msg: "Add components first." };
    const needed = ((targetPct - currentWeightedPct) / (pendingWeight / totalWeight));
    if (needed > 100) return { pct: needed, feasible: false, msg: `You need ${needed.toFixed(1)}% avg in remaining — not achievable. Aim for the next grade down.` };
    if (needed <= 0)  return { pct: 0, feasible: true, msg: "You've already secured this grade. Keep it up." };
    return { pct: needed, feasible: true, msg: `Average ${needed.toFixed(1)}% across remaining assessments to hit your target.` };
  }

  const needed = neededInRemaining();
  const scoreColor = needed.feasible ? "#2d7a3c" : "#c44b2a";

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 28 · Score Needed Calculator</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={board} onChange={e => setBoard(e.target.value as Board)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: `2px solid ${cfg.color}`, background: "var(--paper)", padding: "6px 10px", color: cfg.color, cursor: "pointer" }}>
            {(Object.keys(BOARD_CONFIGS) as Board[]).map(b => <option key={b} value={b}>{BOARD_CONFIGS[b].label}</option>)}
          </select>
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>What score do you need?</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px", lineHeight: 1.3 }}>Enter your marks. See exactly what you need in upcoming papers.</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>Subject</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics, Physics…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>{cfg.targetScale.label}</div>
            <select value={targetIdx} onChange={e => setTargetIdx(parseInt(e.target.value))} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: `2px solid ${scoreColor}`, background: "var(--paper)", padding: "10px 8px", color: scoreColor }}>
              {targetOptions.map((opt, i) => <option key={i} value={i}>{opt}</option>)}
            </select>
          </div>
        </div>

        {/* Result banner */}
        <div style={{ border: `2px solid ${scoreColor}`, padding: "20px 24px", marginBottom: 28, display: "flex", gap: 20, alignItems: "center" }} className="mob-col">
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            {needed.pct !== null && needed.pct > 0 ? (
              <>
                <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{Math.ceil(needed.pct)}%</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 4 }}>needed avg</div>
              </>
            ) : (
              <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 700, color: scoreColor, lineHeight: 1.2 }}>{needed.feasible ? "✓" : "✗"}</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, color: scoreColor, marginBottom: 6 }}>{needed.msg}</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Current: {currentWeightedPct.toFixed(1)}% {comps.some(c => c.done) ? `→ ${cfg.gradeFromPct(currentWeightedPct)}` : ""}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Target: {targetLabel}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Components done: {comps.filter(c => c.done).length}/{comps.length}</div>
            </div>
          </div>
        </div>

        {/* Components table */}
        <div className="mono cin" style={{ marginBottom: 12 }}>Assessment components</div>
        <div style={{ border: "1px solid var(--ink)", marginBottom: 16 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 100px 32px", padding: "8px 12px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)", gap: 8 }}>
            {["Component", "Weight%", "Max score", "Your score", ""].map((h, i) => (
              <div key={i} className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{h}</div>
            ))}
          </div>
          {comps.map((c, idx) => {
            const pct = c.scored !== null ? (c.scored / c.maxScore) * 100 : null;
            return (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 100px 32px", padding: "10px 12px", borderBottom: idx < comps.length - 1 ? "1px solid var(--rule)" : "none", alignItems: "center", gap: 8, background: c.done ? "#2d7a3c08" : "var(--paper)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => toggleDone(c.id)} style={{ width: 16, height: 16, border: `2px solid ${c.done ? "#2d7a3c" : "var(--rule)"}`, background: c.done ? "#2d7a3c" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--paper)", fontSize: 10 }}>
                    {c.done ? "✓" : ""}
                  </button>
                  <input value={c.name} onChange={e => updateComp(c.id, "name", e.target.value)} style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "transparent", color: "var(--ink)", padding: 0, textDecoration: c.done ? "none" : "none" }} />
                </div>
                <input type="number" min={0} max={100} value={c.weight} onChange={e => updateComp(c.id, "weight", e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 6px", color: "var(--ink)", width: "100%", boxSizing: "border-box" }} />
                <input type="number" min={1} value={c.maxScore} onChange={e => updateComp(c.id, "maxScore", e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 6px", color: "var(--ink)", width: "100%", boxSizing: "border-box" }} />
                <div>
                  <input type="number" min={0} max={c.maxScore} value={c.scored ?? ""} onChange={e => setScored(c.id, e.target.value)} placeholder="—"
                    style={{ fontFamily: "var(--mono)", fontSize: 12, border: `1px solid ${pct !== null ? (pct >= targetPct ? "#2d7a3c" : "#c44b2a") : "var(--rule)"}`, background: "var(--paper)", padding: "4px 6px", color: pct !== null ? (pct >= targetPct ? "#2d7a3c" : "#c44b2a") : "var(--ink)", width: "100%", boxSizing: "border-box" }} />
                  {pct !== null && <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", marginTop: 2 }}>{pct.toFixed(1)}%</div>}
                </div>
                <button onClick={() => removeComp(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 12 }}>✕</button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
          <button onClick={addComponent} className="btn ghost" style={{ fontSize: 11 }}>+ Add component</button>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", display: "flex", alignItems: "center" }}>
            Total weight: {totalWeight}% {totalWeight !== 100 && <span style={{ color: "#c97a1a", marginLeft: 6 }}>(should add to 100%)</span>}
          </div>
        </div>

        {/* How to use */}
        <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>HOW TO USE</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
            1. Select your board from the dropdown — components auto-fill for that board. <br />
            2. Click the checkbox next to each assessment you have already <strong>completed</strong> and enter your score. <br />
            3. Leave upcoming assessments unchecked — the calculator works out exactly what average you need in them to hit your target grade. <br />
            4. Adjust component names, weights, and max scores to match your exact exam structure.
          </div>
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 28 of 44.</div>
        </div>
      </main>
    </div>
  );
}
