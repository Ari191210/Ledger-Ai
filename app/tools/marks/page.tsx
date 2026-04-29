"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData } from "@/lib/user-data";

type Subject = { id: number; name: string; score: number; weight: number };

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 1, name: "Physics",     score: 78, weight: 20 },
  { id: 2, name: "Chemistry",   score: 82, weight: 20 },
  { id: 3, name: "Mathematics", score: 91, weight: 20 },
  { id: 4, name: "English",     score: 88, weight: 20 },
  { id: 5, name: "Computer Sci", score: 95, weight: 20 },
];

function pctToGpa4(p: number): number {
  if (p >= 93) return 4.0;
  if (p >= 90) return 3.7;
  if (p >= 87) return 3.3;
  if (p >= 83) return 3.0;
  if (p >= 80) return 2.7;
  if (p >= 77) return 2.3;
  if (p >= 73) return 2.0;
  if (p >= 70) return 1.7;
  if (p >= 67) return 1.3;
  if (p >= 60) return 1.0;
  return 0.0;
}

function pctToGrade(p: number): string {
  if (p >= 91) return "A1";
  if (p >= 81) return "A2";
  if (p >= 71) return "B1";
  if (p >= 61) return "B2";
  if (p >= 51) return "C1";
  if (p >= 41) return "C2";
  if (p >= 33) return "D";
  return "E";
}

let nextId = 6;

export default function MarksPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [target, setTarget] = useState(90);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then((data) => {
      if (data?.marks) {
        const { subjects: s, target: t } = data.marks as { subjects: Subject[]; target: number };
        if (Array.isArray(s) && s.length) setSubjects(s);
        if (typeof t === "number") setTarget(t);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      patchUserData(user.id, "marks", { subjects, target });
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [subjects, target, user]);

  const [whatIfId,    setWhatIfId]    = useState<number | null>(null);
  const [whatIfScore, setWhatIfScore] = useState(80);

  const totalWeight = subjects.reduce((s, x) => s + x.weight, 0);
  const { currentPct, needed } = useMemo(() => {
    if (!totalWeight) return { currentPct: 0, needed: null };
    const currentPct = subjects.reduce((s, x) => s + x.score * (x.weight / totalWeight), 0);
    const remaining = 100 - totalWeight;
    const needed = remaining > 0 ? ((target - currentPct * (totalWeight / 100)) / (remaining / 100)) : null;
    return { currentPct, needed };
  }, [subjects, target, totalWeight]);

  const gpa4 = pctToGpa4(currentPct);
  const grade = pctToGrade(currentPct);
  const gpaIndian = Math.round(currentPct / 9.5 * 10) / 10;

  const hypotheticalPct = useMemo(() => {
    if (whatIfId === null || !totalWeight) return null;
    return subjects.reduce((sum, s) => {
      const score = s.id === whatIfId ? whatIfScore : s.score;
      return sum + score * (s.weight / totalWeight);
    }, 0);
  }, [whatIfId, whatIfScore, subjects, totalWeight]);

  function update(id: number, field: keyof Subject, val: number | string) {
    setSubjects((prev) => prev.map((s) => s.id === id ? { ...s, [field]: field === "name" ? val : Math.max(0, Math.min(field === "score" ? 100 : 100, Number(val))) } : s));
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 02 · Marks Predictor</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>The math of your report card</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          {/* Left: input */}
          <div>
            <div className="mono cin">Input · Current scores &amp; weights</div>
            <div className="mob-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, fontFamily: "var(--sans)", fontSize: 13 }}>
              <thead>
                <tr className="mono" style={{ color: "var(--ink-3)", textAlign: "left" }}>
                  <th style={{ padding: "8px 0", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}>Subject</th>
                  <th style={{ padding: "8px 0 8px 12px", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}>Score /100</th>
                  <th style={{ padding: "8px 0 8px 12px", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}>Weight %</th>
                  <th style={{ padding: "8px 0", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}></th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <td style={{ padding: "10px 0" }}>
                      <input value={s.name} onChange={(e) => update(s.id, "name", e.target.value)}
                        style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, border: "none", background: "transparent", color: "var(--ink)", width: "100%" }} />
                    </td>
                    <td style={{ padding: "10px 0 10px 12px" }}>
                      <input type="number" min="0" max="100" value={s.score} onChange={(e) => update(s.id, "score", e.target.value)}
                        style={{ fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 6px", width: 64, color: "var(--ink)" }} />
                    </td>
                    <td style={{ padding: "10px 0 10px 12px" }}>
                      <input type="number" min="0" max="100" value={s.weight} onChange={(e) => update(s.id, "weight", e.target.value)}
                        style={{ fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 6px", width: 64, color: "var(--ink)" }} />
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "right" }}>
                      <button onClick={() => setSubjects((p) => p.filter((x) => x.id !== s.id))}
                        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <button onClick={() => setSubjects((p) => [...p, { id: nextId++, name: "New Subject", score: 0, weight: 0 }])}
              style={{ marginTop: 10, background: "none", border: "1px dashed var(--rule)", padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", color: "var(--ink-2)", width: "100%" }}>
              + Add subject
            </button>

            <div style={{ marginTop: 24 }}>
              <div className="mono cin">Target percentage</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 10 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{target}%</span>
              </div>
              <input type="range" min="40" max="100" value={target} onChange={(e) => setTarget(+e.target.value)}
                style={{ width: "100%", accentColor: "var(--cinnabar-ink)", marginTop: 10 }} />
              <div className="mono" style={{ color: "var(--ink-3)", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>40%</span><span>70%</span><span>100%</span>
              </div>
            </div>
          </div>

          {/* Right: output */}
          <div>
            <div className="mono cin">Output · Your results</div>
            <div style={{ marginTop: 14, border: "1px solid var(--ink)", padding: 28 }}>
              <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 20, marginBottom: 20 }}>
                <div className="mono" style={{ color: "var(--ink-3)" }}>Current weighted average</div>
                <div className="mob-n96" style={{ fontFamily: "var(--serif)", fontSize: 96, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.9, marginTop: 6 }}>
                  {currentPct.toFixed(1)}<span style={{ fontSize: 32 }}>%</span>
                </div>
                <div className="mob-gpa-row" style={{ display: "flex", gap: 24, marginTop: 14 }}>
                  <div>
                    <div className="mono" style={{ color: "var(--ink-3)" }}>CBSE Grade</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 600, marginTop: 4 }}>{grade}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ color: "var(--ink-3)" }}>GPA (4.0)</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 600, marginTop: 4 }}>{gpa4.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ color: "var(--ink-3)" }}>GPA (10-pt)</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 600, marginTop: 4 }}>{gpaIndian}</div>
                  </div>
                </div>
              </div>

              {needed !== null && (
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)" }}>Score needed in remaining {100 - totalWeight}% weight to reach {target}%</div>
                  <div className="mob-n64" style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 6, color: needed > 100 ? "var(--cinnabar-ink)" : "var(--ink)" }}>
                    {needed < 0 ? "Already achieved" : needed > 100 ? `${needed.toFixed(0)}% ← not possible` : `${needed.toFixed(1)}%`}
                  </div>
                </div>
              )}

              {totalWeight === 100 && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                  <span className="mono" style={{ color: "var(--ink-3)" }}>Weights sum to 100% — final result is locked.</span>
                </div>
              )}
            </div>

            {/* Per-subject bar with What-if */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div className="mono cin">Score breakdown</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Click a bar to run What-if</div>
              </div>
              {subjects.map((s) => {
                const isWhatIf = whatIfId === s.id;
                return (
                  <div key={s.id} style={{ marginBottom: isWhatIf ? 0 : 10 }}>
                    <button onClick={() => { setWhatIfId(isWhatIf ? null : s.id); setWhatIfScore(s.score); }}
                      style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: isWhatIf ? "var(--cinnabar-ink)" : "var(--ink)" }}>{s.name}</span>
                      <span className="mono" style={{ color: "var(--ink-3)" }}>{s.score}%</span>
                    </button>
                    <div style={{ height: 6, background: "var(--paper-2)", border: `1px solid ${isWhatIf ? "var(--cinnabar-ink)" : "var(--rule)"}` }}>
                      <div style={{ height: "100%", width: `${s.score}%`, background: s.score >= target ? "var(--cinnabar)" : "var(--ink-3)", transition: "width 300ms" }} />
                    </div>

                    {/* What-if panel */}
                    {isWhatIf && (
                      <div style={{ margin: "8px 0 14px", padding: "16px", border: "1px solid var(--cinnabar-ink)", background: "var(--paper-2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                          <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>What if {s.name} = {whatIfScore}%?</span>
                          {hypotheticalPct !== null && (
                            <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", fontWeight: 700 }}>
                              {hypotheticalPct.toFixed(1)}%
                              <span className="mono" style={{ fontSize: 11, marginLeft: 8, color: hypotheticalPct > currentPct ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>
                                {hypotheticalPct > currentPct ? "+" : ""}{(hypotheticalPct - currentPct).toFixed(1)}%
                              </span>
                            </span>
                          )}
                        </div>
                        <input type="range" min={0} max={100} value={whatIfScore}
                          onChange={e => setWhatIfScore(+e.target.value)}
                          style={{ width: "100%", accentColor: "var(--cinnabar)" }} />
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>0%</span>
                          <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>100%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 02 of 44.</div>
        </div>
      </main>
    </div>
  );
}
