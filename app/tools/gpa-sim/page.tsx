"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Scale = "4.0" | "5.0" | "7.0" | "100" | "percentage";
type Grade = { id: string; subject: string; grade: string; credits: number; weight: "standard" | "honors" | "ap" };

const GRADE_MAPS: Record<Scale, Record<string, number>> = {
  "4.0": { "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0 },
  "5.0": { "A+": 5.0, "A": 5.0, "A-": 4.7, "B+": 4.3, "B": 4.0, "B-": 3.7, "C+": 3.3, "C": 3.0, "C-": 2.7, "D+": 1.3, "D": 1.0, "F": 0 },
  "7.0": { "A+": 7.0, "A": 7.0, "A-": 6.7, "B+": 6.3, "B": 6.0, "B-": 5.7, "C+": 5.3, "C": 5.0, "C-": 4.7, "D+": 3.0, "D": 2.0, "F": 0 },
  "100": { "A+": 99, "A": 95, "A-": 92, "B+": 88, "B": 85, "B-": 82, "C+": 78, "C": 75, "C-": 72, "D+": 68, "D": 65, "F": 50 },
  "percentage": { "A+": 99, "A": 95, "A-": 92, "B+": 88, "B": 85, "B-": 82, "C+": 78, "C": 75, "C-": 72, "D+": 68, "D": 65, "F": 50 },
};

const WEIGHT_BOOST: Record<string, Record<string, number>> = {
  "4.0": { standard: 0, honors: 0.5, ap: 1.0 },
  "5.0": { standard: 0, honors: 0, ap: 0 },
  "7.0": { standard: 0, honors: 0, ap: 0 },
  "100": { standard: 0, honors: 0, ap: 0 },
  "percentage": { standard: 0, honors: 0, ap: 0 },
};

const ALL_GRADES = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","F"];

function computeGPA(grades: Grade[], scale: Scale, weighted: boolean): number {
  const map  = GRADE_MAPS[scale];
  const boost = WEIGHT_BOOST[scale];
  let totalPoints = 0, totalCredits = 0;
  for (const g of grades) {
    const raw = map[g.grade] ?? 0;
    const b   = weighted ? (boost[g.weight] ?? 0) : 0;
    const pts = Math.min(raw + b, parseFloat(scale === "percentage" || scale === "100" ? "100" : scale));
    totalPoints  += pts * g.credits;
    totalCredits += g.credits;
  }
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

function gpaLabel(gpa: number, scale: Scale): { grade: string; color: string } {
  const max = parseFloat(scale === "percentage" || scale === "100" ? "100" : scale);
  const pct = gpa / max;
  if (pct >= 0.92) return { grade: "A / Distinction", color: "#2d7a3c" };
  if (pct >= 0.82) return { grade: "B / Merit", color: "#1a6091" };
  if (pct >= 0.72) return { grade: "C / Pass", color: "#c97a1a" };
  return { grade: "Below average", color: "#c44b2a" };
}

const EMPTY_GRADE: Omit<Grade, "id"> = { subject: "", grade: "A", credits: 3, weight: "standard" };

export default function GPASimPage() {
  const [grades, setGrades]   = useState<Grade[]>([]);
  const [scale, setScale]     = useState<Scale>("4.0");
  const [weighted, setWeighted] = useState(true);
  const [targetGPA, setTargetGPA] = useState("");
  const [newGrade, setNewGrade]   = useState({ ...EMPTY_GRADE });

  useEffect(() => {
    try { const d = localStorage.getItem("ledger-gpa"); if (d) setGrades(JSON.parse(d)); } catch {}
  }, []);

  function save(g: Grade[]) {
    setGrades(g);
    try { localStorage.setItem("ledger-gpa", JSON.stringify(g)); } catch {}
  }

  function addGrade() {
    if (!newGrade.subject.trim()) return;
    save([...grades, { ...newGrade, id: Date.now().toString() }]);
    setNewGrade({ ...EMPTY_GRADE });
  }

  function remove(id: string) { save(grades.filter(g => g.id !== id)); }
  function updateGrade(id: string, key: keyof Grade, val: string | number) {
    save(grades.map(g => g.id === id ? { ...g, [key]: val } : g));
  }

  const currentGPA = computeGPA(grades, scale, weighted);
  const maxScale   = parseFloat(scale === "percentage" || scale === "100" ? "100" : scale);
  const label      = gpaLabel(currentGPA, scale);
  const pct        = currentGPA / maxScale;

  // "What do I need?" simulation
  function neededGrade(): string {
    const target = parseFloat(targetGPA);
    if (isNaN(target) || grades.length === 0) return "";
    const totalCredits = grades.reduce((s, g) => s + g.credits, 0);
    const currentPoints = computeGPA(grades, scale, weighted) * totalCredits;
    const newCredits = 3;
    const needed = (target * (totalCredits + newCredits) - currentPoints) / newCredits;
    if (needed <= 0) return "Any grade will do!";
    const map = GRADE_MAPS[scale];
    const closest = ALL_GRADES.find(g => (map[g] ?? 0) >= needed - 0.01);
    return closest ? `${closest} (${needed.toFixed(2)} pts needed on next course)` : "Not achievable with one course";
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 28 · GPA Simulator</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select value={scale} onChange={e => setScale(e.target.value as Scale)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "6px 8px", color: "var(--ink)" }}>
            {(["4.0","5.0","7.0","100","percentage"] as Scale[]).map(s => <option key={s} value={s}>{s} scale</option>)}
          </select>
          <button onClick={() => setWeighted(w => !w)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "6px 14px", border: "1px solid var(--ink)", background: weighted ? "var(--ink)" : "var(--paper)", color: weighted ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
            {weighted ? "Weighted ✓" : "Unweighted"}
          </button>
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>

        {/* GPA Display */}
        <div style={{ display: "flex", gap: 32, marginBottom: 36, padding: "28px 32px", border: "2px solid var(--ink)" }} className="mob-col">
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 700, color: label.color, lineHeight: 1 }}>{currentGPA.toFixed(2)}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>/ {maxScale} · {weighted ? "weighted" : "unweighted"}</div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: label.color }}>{label.grade}</div>
            <div style={{ background: "var(--paper-2)", height: 10, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: "100%", background: label.color, transition: "width 0.5s" }} />
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              {grades.length} course{grades.length !== 1 ? "s" : ""} · {grades.reduce((s, g) => s + g.credits, 0)} total credits
            </div>
          </div>
        </div>

        {/* Courses table */}
        <div className="mono cin" style={{ marginBottom: 12 }}>Courses</div>
        {grades.length > 0 && (
          <div style={{ marginBottom: 16, border: "1px solid var(--ink)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 100px 32px", gap: 0, padding: "8px 12px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
              {["Subject","Grade","Credits","Weight",""].map((h, i) => (
                <div key={i} className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{h}</div>
              ))}
            </div>
            {grades.map((g, idx) => (
              <div key={g.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 100px 32px", gap: 0, padding: "10px 12px", borderBottom: idx < grades.length - 1 ? "1px solid var(--rule)" : "none", alignItems: "center" }}>
                <input value={g.subject} onChange={e => updateGrade(g.id, "subject", e.target.value)}
                  style={{ fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "transparent", color: "var(--ink)", padding: 0, width: "100%" }} />
                <select value={g.grade} onChange={e => updateGrade(g.id, "grade", e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 4px", color: "var(--ink)" }}>
                  {ALL_GRADES.map(gr => <option key={gr}>{gr}</option>)}
                </select>
                <input type="number" min={1} max={6} value={g.credits} onChange={e => updateGrade(g.id, "credits", parseInt(e.target.value) || 1)}
                  style={{ fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 8px", color: "var(--ink)", width: 56 }} />
                <select value={g.weight} onChange={e => updateGrade(g.id, "weight", e.target.value as Grade["weight"])} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 4px", color: "var(--ink)" }}>
                  <option value="standard">Standard</option>
                  <option value="honors">Honors</option>
                  <option value="ap">AP/IB</option>
                </select>
                <button onClick={() => remove(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add course */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 100px auto", gap: 8, marginBottom: 32, alignItems: "flex-end" }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>Subject</div>
            <input value={newGrade.subject} onChange={e => setNewGrade(f => ({ ...f, subject: e.target.value }))} onKeyDown={e => e.key === "Enter" && addGrade()} placeholder="e.g. Mathematics"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 10px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>Grade</div>
            <select value={newGrade.grade} onChange={e => setNewGrade(f => ({ ...f, grade: e.target.value }))} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 6px", color: "var(--ink)" }}>
              {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>Credits</div>
            <input type="number" min={1} max={6} value={newGrade.credits} onChange={e => setNewGrade(f => ({ ...f, credits: parseInt(e.target.value) || 1 }))}
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>Weight</div>
            <select value={newGrade.weight} onChange={e => setNewGrade(f => ({ ...f, weight: e.target.value as Grade["weight"] }))} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 6px", color: "var(--ink)" }}>
              <option value="standard">Standard</option>
              <option value="honors">Honors</option>
              <option value="ap">AP/IB</option>
            </select>
          </div>
          <button className="btn" onClick={addGrade} disabled={!newGrade.subject.trim()} style={{ opacity: newGrade.subject.trim() ? 1 : 0.4 }}>Add</button>
        </div>

        {/* What-if simulator */}
        {grades.length > 0 && (
          <div style={{ border: "1px solid var(--ink)", padding: "20px" }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>What do I need?</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>Target GPA</div>
                <input type="number" step="0.01" value={targetGPA} onChange={e => setTargetGPA(e.target.value)} placeholder={`e.g. ${(maxScale * 0.9).toFixed(1)}`}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 14, padding: "10px 16px", border: "1px solid var(--rule)", color: "var(--ink-2)", minWidth: 200, lineHeight: 1.4 }}>
                {targetGPA ? neededGrade() : "Enter a target GPA above"}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 28 of 30.</div>
        </div>
      </main>
    </div>
  );
}
