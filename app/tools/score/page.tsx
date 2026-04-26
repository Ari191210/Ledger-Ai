"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";

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

export default function ScorePage() {
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
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger Score™ · Your academic readiness index</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Updates every time you use a tool</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>

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
            {/* Tier badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: "1px solid var(--ink)", padding: "6px 14px", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", fontWeight: 600 }}>{tier.label}</span>
              {tier.nextAt < 1000 && (
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{tier.nextAt - score.total} pts to {tier.next}</span>
              )}
            </div>

            {/* Progress bar 0-1000 */}
            <div style={{ height: 12, background: "var(--paper-2)", border: "1px solid var(--ink)", position: "relative", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(score.total / 1000) * 100}%`, background: "var(--ink)", transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
              {/* Tier markers */}
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
            {/* Today's actions */}
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

            {/* Subject accuracy breakdown */}
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

            {/* How the score works */}
            <div style={{ marginTop: 32, border: "1px solid var(--rule)", padding: "20px" }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>How it's calculated</div>
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

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger Score™ · Live exam readiness index</div>
        </div>
      </main>
    </div>
  );
}
