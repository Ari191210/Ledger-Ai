"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData } from "@/lib/user-data";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";

// ── Marks types & helpers ──────────────────────────────────────────────────

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

// ── Score helpers ──────────────────────────────────────────────────────────

function Bar({ value, max, color = "var(--ink)" }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: 8, background: "var(--paper-2)", border: "1px solid var(--rule)", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${Math.min(100, (value / max) * 100)}%`, background: color, transition: "width 800ms cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

const PILLARS = [
  { key: "pqaScore",         label: "PYQ Accuracy",       max: 400, weight: "40%", desc: "Correct answers across Past Paper sessions"     },
  { key: "syllabusScore",    label: "Syllabus Coverage",  max: 250, weight: "25%", desc: "Subjects & chapters covered via Notes and Tutor" },
  { key: "mistakeScore",     label: "Mistake Velocity",   max: 200, weight: "20%", desc: "Fewer recent errors = higher score"              },
  { key: "consistencyScore", label: "Consistency",        max: 150, weight: "15%", desc: "Daily Focus streak and study frequency"          },
] as const;

// ── Tab components ─────────────────────────────────────────────────────────

function MarksTab() {
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>The math of your report card</div>
      </div>
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
    </div>
  );
}

function ScoreTab() {
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try { setScore(computeLedgerScore()); } catch { setScore({ total: 100, pqaScore: 0, syllabusScore: 0, mistakeScore: 100, consistencyScore: 0, pqaAccuracy: 0, papersCount: 0, syllabusUploaded: false, subjectsCovered: 0, subjectsTotal: 0, recentMistakes: 0, streak: 0, actions: ["Do your first Past Papers session — PYQ accuracy is 40% of your score", "Upload your syllabus — this alone unlocks up to 250 score points", "Start a Focus session today to open your streak"], subjectAccuracy: [] }); }
    setMounted(true);
  }, []);

  if (!mounted || !score) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Computing score…</div>
      </div>
    );
  }

  const tier = scoreTier(score.total);
  const pctToNext = tier.nextAt < 1000
    ? Math.round(((score.total - (tier.nextAt - 200)) / 200) * 100)
    : 100;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger Score™ · Your academic readiness index</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Updates every time you use a tool</div>
      </div>

      {/* ── Hero score ── */}
      <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 32, marginBottom: 40, display: "flex", alignItems: "flex-end", gap: 40, flexWrap: "wrap" }}>
        <div>
          <div className="mono cin" style={{ marginBottom: 6 }}>Ledger Score™</div>
          <div className="mob-n96" style={{ fontFamily: "var(--serif)", fontSize: 120, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 0.85, color: "var(--ink)" }}>
            {score.total}
          </div>
          <div className="mono" style={{ marginTop: 10, color: "var(--ink-3)" }}>out of 1000</div>
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: "1px solid var(--ink)", padding: "6px 14px", marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", fontWeight: 600 }}>{tier.label}</span>
            {tier.nextAt < 1000 && (
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{tier.nextAt - score.total} pts to {tier.next}</span>
            )}
          </div>

          <div style={{ height: 12, background: "var(--paper-2)", border: "1px solid var(--ink)", position: "relative", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(score.total / 1000) * 100}%`, background: "var(--ink)", transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
            {[200, 400, 600, 800].map(t => (
              <div key={t} style={{ position: "absolute", top: 0, bottom: 0, left: `${t / 10}%`, width: 1, background: "var(--paper)", opacity: 0.3 }} />
            ))}
          </div>
          <div className="mono" style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "var(--ink-3)", fontSize: 9 }}>
            <span>0</span><span>Beginner</span><span>Building</span><span>Developing</span><span>Strong</span><span>Exam Ready</span>
          </div>

          {tier.nextAt < 1000 && (
            <div className="mono" style={{ marginTop: 8, color: "var(--cinnabar-ink)", fontSize: 9 }}>
              {pctToNext}% of the way to {tier.next}
            </div>
          )}
        </div>
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        {/* ── Left: pillars ── */}
        <div>
          <div className="mono cin" style={{ marginBottom: 16 }}>Score Breakdown</div>

          {PILLARS.map(p => {
            const val = score[p.key] as number;
            const pct = Math.round((val / p.max) * 100);
            return (
              <div key={p.key} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--rule)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600 }}>{p.label}</span>
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em" }}>{val}</span>
                    <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>/ {p.max}</span>
                  </div>
                </div>
                <Bar value={val} max={p.max} color={pct >= 70 ? "var(--ink)" : pct >= 40 ? "var(--ink-2)" : "var(--ink-3)"} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{p.desc}</span>
                  <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{p.weight} of total</span>
                </div>
              </div>
            );
          })}

          {/* Quick stats */}
          <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", background: "var(--paper-2)" }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>Activity snapshot</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Papers done",        score.papersCount,       "sessions"],
                ["PYQ accuracy",       `${Math.round(score.pqaAccuracy * 100)}%`, ""],
                ["Subjects covered",   `${score.subjectsCovered}${score.subjectsTotal > 0 ? ` / ${score.subjectsTotal}` : ""}`, "subjects"],
                ["Recent mistakes",    score.recentMistakes,    "last 7 days"],
                ["Focus streak",       `${score.streak}d`,      ""],
                ["Syllabus",           score.syllabusUploaded ? "Uploaded" : "Not yet", ""],
              ].map(([label, val, unit], i) => (
                <div key={i}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{label}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 700, marginTop: 2 }}>
                    {String(val)} <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: actions + subject breakdown ── */}
        <div>
          {score.actions.length > 0 && (
            <div style={{ border: "1px solid var(--ink)", marginBottom: 32 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)", background: "var(--ink)" }}>
                <div className="mono" style={{ color: "var(--paper)", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 9 }}>Top actions to gain points today</div>
              </div>
              {score.actions.map((action, i) => (
                <div key={i} style={{ padding: "16px 20px", borderBottom: i < score.actions.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>{action}</span>
                </div>
              ))}
            </div>
          )}

          {score.subjectAccuracy.length > 0 ? (
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Accuracy by subject</div>
              {score.subjectAccuracy.map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{s.subject}</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{s.sessions} session{s.sessions !== 1 ? "s" : ""}</span>
                      <span className="mono" style={{ color: s.accuracy >= 0.7 ? "var(--ink)" : "var(--cinnabar-ink)" }}>{Math.round(s.accuracy * 100)}%</span>
                    </div>
                  </div>
                  <Bar value={Math.round(s.accuracy * 100)} max={100} color={s.accuracy >= 0.7 ? "var(--ink)" : "var(--cinnabar-ink)"} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ border: "1px solid var(--rule)", padding: "24px 20px", background: "var(--paper-2)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", marginBottom: 8 }}>No paper sessions yet.</div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 16 }}>Do a Past Papers session to see your accuracy by subject.</div>
              <Link href="/tools/papers" className="btn ghost" style={{ textDecoration: "none", display: "inline-block" }}>Start a session →</Link>
            </div>
          )}

          <div style={{ marginTop: 32, border: "1px solid var(--rule)", padding: "20px" }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>How it&apos;s calculated</div>
            {[
              ["PYQ Accuracy",      "400 pts", "Correct answers on past papers, weighted by sessions done"],
              ["Syllabus Coverage", "250 pts", "Subjects covered via Notes and Tutor vs your uploaded syllabus"],
              ["Mistake Velocity",  "200 pts", "Inversely proportional to mistakes logged in the last 7 days"],
              ["Consistency",       "150 pts", "Daily Focus streak — compound interest of your study habit"],
            ].map(([label, pts, desc], i, arr) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, width: 28 }}>{pts}</span>
                <div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type Tab = "marks" | "score";
const TABS: [Tab, string][] = [["marks", "Marks Predictor"], ["score", "Ledger Score"]];

export default function GradeTrackerPage() {
  const [tab, setTab] = useState<Tab>("marks");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Grade Tracker</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Track your marks and academic readiness score.</div>
        </div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i < TABS.length - 1 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "marks" && <MarksTab />}
        {tab === "score" && <ScoreTab />}
      </main>
    </div>
  );
}
