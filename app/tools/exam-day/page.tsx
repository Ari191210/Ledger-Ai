"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { callAIOrThrow, type AIError } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";
import { useUserLevel } from "@/hooks/use-user-level";
import ScoreImpactStrip from "@/components/score-impact-strip";
import { currentInputs, projectMistakeReductionImpact, type ScoreProjection } from "@/lib/score-projection";

type Question = { q: string; options: string[]; answer: number; explanation: string };
type ExamData = { title: string; timeMinutes: number; questions: Question[] };
type Phase = "brief" | "sweep" | "done";

type Mistake = { date: string; subject: string; topic: string; category: string };
type Gap = { topic: string; count: number; topCategory: string | null };

const WINDOW_DAYS = 14;

function getTodayExam(): { name: string; days: number } | null {
  try {
    const plan = JSON.parse(localStorage.getItem("ledger-plan-v1") || "{}");
    if (!plan.subjects?.length) return null;
    const today = new Date();
    const upcoming = (plan.subjects as Array<{ name: string; exam: string }>)
      .map(s => ({ name: s.name, days: Math.ceil((new Date(s.exam).getTime() - today.getTime()) / 86400000) }))
      .filter(s => s.days >= 0 && !Number.isNaN(s.days))
      .sort((a, b) => a.days - b.days);
    return upcoming[0] ?? null;
  } catch { return null; }
}

// Gaps = what you got wrong in the last 14 days, grouped by topic.
// Prefers mistakes matching the day's subject; falls back to all recent,
// then to the all-time weak-topics ledger.
function getGaps(subjectHint?: string): { gaps: Gap[]; misses: number; source: "recent" | "all-time" } {
  try {
    const all: Mistake[] = JSON.parse(localStorage.getItem("ledger-mistakes") || "[]");
    const cutoff = Date.now() - WINDOW_DAYS * 86400000;
    const recent = all.filter(m => new Date(m.date).getTime() >= cutoff);
    let pool = recent;
    if (subjectHint) {
      const hint = subjectHint.toLowerCase();
      const matched = recent.filter(m => { const subj = (m.subject || "").toLowerCase(); return subj !== "" && (subj.includes(hint) || hint.includes(subj)); });
      if (matched.length > 0) pool = matched;
    }
    if (pool.length > 0) {
      const byTopic: Record<string, { count: number; cats: Record<string, number> }> = {};
      pool.forEach(m => {
        const t = m.topic || m.subject || "General";
        byTopic[t] = byTopic[t] || { count: 0, cats: {} };
        byTopic[t].count += 1;
        if (m.category) byTopic[t].cats[m.category] = (byTopic[t].cats[m.category] || 0) + 1;
      });
      const gaps = Object.entries(byTopic)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 6)
        .map(([topic, v]) => ({
          topic,
          count: v.count,
          topCategory: Object.entries(v.cats).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null,
        }));
      return { gaps, misses: pool.length, source: "recent" };
    }
    const wt: Record<string, number> = JSON.parse(localStorage.getItem("ledger-weak-topics") || "{}");
    const gaps = Object.entries(wt)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([topic, count]) => ({ topic, count, topCategory: null }));
    return { gaps, misses: gaps.reduce((a, g) => a + g.count, 0), source: "all-time" };
  } catch { return { gaps: [], misses: 0, source: "recent" }; }
}

function mostMissedSubject(): string | null {
  try {
    const all: Mistake[] = JSON.parse(localStorage.getItem("ledger-mistakes") || "[]");
    const cutoff = Date.now() - WINDOW_DAYS * 86400000;
    const counts: Record<string, number> = {};
    all.filter(m => new Date(m.date).getTime() >= cutoff).forEach(m => {
      if (m.subject) counts[m.subject] = (counts[m.subject] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  } catch { return null; }
}

export default function ExamDayPage() {
  const level = useUserLevel();
  const [phase,   setPhase]   = useState<Phase>("brief");
  const [exam,    setExam]    = useState<{ name: string; days: number } | null>(null);
  const [gaps,    setGaps]    = useState<Gap[]>([]);
  const [misses,  setMisses]  = useState(0);
  const [source,  setSource]  = useState<"recent" | "all-time">("recent");
  const [ready,   setReady]   = useState(false);

  const [drill,    setDrill]    = useState<ExamData | null>(null);
  const [current,  setCurrent]  = useState(0);
  const [picked,   setPicked]   = useState<(number | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<AIError | string | null>(null);

  const [scoreImpact, setScoreImpact] = useState<ScoreProjection | null>(null);

  useEffect(() => {
    const e = getTodayExam();
    setExam(e);
    const g = getGaps(e?.name);
    setGaps(g.gaps); setMisses(g.misses); setSource(g.source);
    // What clearing these gaps is worth: the sweep drills recent misses,
    // so project the score once they stop recurring.
    const inputs = currentInputs();
    if (inputs) {
      const p = projectMistakeReductionImpact(inputs, inputs.mistakes.length);
      setScoreImpact(p.delta > 0 ? p : null);
    }
    setReady(true);
  }, []);

  const subject = exam?.name ?? mostMissedSubject() ?? "General";
  const topics  = useMemo(() => gaps.map(g => g.topic).join(", "), [gaps]);

  async function beginSweep() {
    setLoading(true); setError(null);
    try {
      const data = await callAIOrThrow<ExamData>({
        tool: "exam_sim", subject, topic: topics, count: "10", level, difficulty: "Medium",
      });
      if (!Array.isArray(data.questions) || !data.questions.length) {
        setError("No questions generated — try again."); return;
      }
      setDrill(data);
      setPicked(new Array(data.questions.length).fill(null));
      setCurrent(0); setRevealed(false);
      setPhase("sweep");
    } catch (e) {
      setError(e as AIError | string);
    } finally {
      setLoading(false);
    }
  }

  function pick(oi: number) {
    if (revealed) return;
    setPicked(p => { const n = [...p]; n[current] = oi; return n; });
    setRevealed(true);
  }

  function next() {
    if (!drill) return;
    if (current < drill.questions.length - 1) { setCurrent(c => c + 1); setRevealed(false); }
    else setPhase("done");
  }

  // Keyboard: A–D / 1–4 pick, Enter / → advance
  useEffect(() => {
    if (phase !== "sweep") return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (!revealed) {
        const letterIdx = ["a", "b", "c", "d"].indexOf(k.toLowerCase());
        const digitIdx  = ["1", "2", "3", "4"].indexOf(k);
        const idx = letterIdx !== -1 ? letterIdx : digitIdx;
        const optCount = drill?.questions[current]?.options.length ?? 0;
        if (idx !== -1 && idx < optCount) { e.preventDefault(); pick(idx); }
      } else if (k === "Enter" || k === "ArrowRight") {
        e.preventDefault(); next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed, current, drill]);

  const totalQ = drill?.questions.length ?? 0;
  const score  = drill ? picked.reduce<number>((acc, p, i) => acc + (p !== null && p === drill.questions[i]?.answer ? 1 : 0), 0) : 0;
  const missedIdxs = drill ? picked.map((p, i) => (p === drill.questions[i]?.answer ? -1 : i)).filter(i => i >= 0) : [];

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9999, background: "var(--paper)",
    color: "var(--ink)", overflowY: "auto",
  };

  // ── Brief — the lock screen ──
  if (phase === "brief") return (
    <div style={overlay}>
      <div className="mob-p" style={{ maxWidth: 620, margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 48 }}>
          <div className="mono cin">Exam-Day Mode</div>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)", textDecoration: "none" }}>← exit</Link>
        </div>

        {!ready ? null : (
          <>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(30px,5vw,44px)", fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 10px" }}>
              {exam
                ? exam.days === 0 ? `${exam.name}. Today.` : `${exam.name} — in ${exam.days} day${exam.days === 1 ? "" : "s"}.`
                : "No paper on the schedule."}
            </h1>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 44 }}>
              {gaps.length > 0
                ? source === "recent"
                  ? `Last ${WINDOW_DAYS} days · ${misses} miss${misses === 1 ? "" : "es"} · ${gaps.length} gap${gaps.length === 1 ? "" : "s"}. No decisions — just these.`
                  : `Nothing missed in ${WINDOW_DAYS} days — falling back to your all-time weak topics.`
                : "Nothing logged yet."}
            </div>

            {gaps.length > 0 ? (
              <>
                {scoreImpact && (
                  <div style={{ marginBottom: 20 }}>
                    <ScoreImpactStrip
                      currentScore={scoreImpact.current}
                      projectedScore={scoreImpact.projected}
                      scoreDelta={scoreImpact.delta}
                      affectedPillar="mistakes"
                      nextAction="Sweeping these gaps is how this week's misses stop costing you points."
                    />
                  </div>
                )}
                <div style={{ borderTop: "1px solid var(--ink)" }}>
                  {gaps.map((g, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "14px 2px", borderBottom: "1px solid var(--rule)" }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 500 }}>{g.topic}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", flexShrink: 0 }}>
                        ×{g.count}{g.topCategory ? ` · ${g.topCategory}` : ""}
                      </div>
                    </div>
                  ))}
                </div>

                {error && <div style={{ marginTop: 20 }}><AIErrorDisplay error={error} onRetry={beginSweep} inline /></div>}

                <button className="btn" onClick={beginSweep} disabled={loading} style={{ width: "100%", marginTop: 32, opacity: loading ? 0.5 : 1 }}>
                  {loading ? "Building your sweep…" : "Begin the sweep →"}
                </button>
                {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "center", marginTop: 14 }}>
                  10 questions on exactly these topics. Then close the laptop.
                </div>
              </>
            ) : (
              <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 24 }}>
                <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)", margin: "0 0 24px" }}>
                  Exam-Day Mode drills only what you&apos;ve been getting wrong. Do a past paper or a mock first — your misses land here automatically.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href="/tools/exam-practice" className="btn">Past Papers →</Link>
                  <Link href="/tools/exam-sim" className="btn ghost">Exam Simulator →</Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── Sweep — one question, no chrome ──
  if (phase === "sweep" && drill) {
    const q = drill.questions[current];
    const myPick = picked[current];
    return (
      <div style={overlay}>
        <div style={{ position: "sticky", top: 0, background: "var(--paper-2)", height: 3 }}>
          <div style={{ width: "100%", height: "100%", background: "var(--cinnabar-ink)", transform: `scaleX(${(current + (revealed ? 1 : 0)) / totalQ})`, transformOrigin: "left", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
        <div className="mob-p" style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
            <span className="mono cin" style={{ fontSize: 11 }}>Q {current + 1} / {totalQ}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{subject}</span>
          </div>

          <div style={{ fontFamily: "var(--serif)", fontSize: 21, lineHeight: 1.55, marginBottom: 28, fontWeight: 500 }}>{q.q}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, oi) => {
              const isCorrect  = revealed && oi === q.answer;
              const isWrongPick = revealed && oi === myPick && oi !== q.answer;
              const border = isCorrect ? "var(--sage)" : isWrongPick ? "var(--cinnabar)" : myPick === oi ? "var(--ink)" : "var(--rule)";
              const bg     = isCorrect ? "var(--sage)18" : isWrongPick ? "var(--cinnabar)12" : "var(--paper)";
              const color  = isCorrect ? "var(--sage)" : isWrongPick ? "var(--cinnabar)" : "var(--ink)";
              return (
                <button key={oi} onClick={() => pick(oi)} disabled={revealed}
                  style={{ padding: "14px 18px", border: `2px solid ${border}`, background: bg, color, cursor: revealed ? "default" : "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.4, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span className="mono" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{String.fromCharCode(65 + oi)}.</span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {isCorrect && <span className="mono" style={{ fontSize: 9, flexShrink: 0 }}>✓</span>}
                  {isWrongPick && <span className="mono" style={{ fontSize: 9, flexShrink: 0 }}>✗</span>}
                </button>
              );
            })}
          </div>

          {revealed && (
            <>
              {q.explanation && (
                <div style={{ marginTop: 18, padding: "12px 16px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>WHY</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{q.explanation}</div>
                </div>
              )}
              <button className="btn" onClick={next} style={{ width: "100%", marginTop: 20 }}>
                {current < totalQ - 1 ? "Next →" : "Finish →"}
              </button>
            </>
          )}
          <div className="mono mob-hide" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "center", marginTop: 20 }}>
            A–D to answer · Enter to continue
          </div>
        </div>
      </div>
    );
  }

  // ── Done — walk in calm ──
  return (
    <div style={overlay}>
      <div className="mob-p" style={{ maxWidth: 620, margin: "0 auto", padding: "72px 24px 80px" }}>
        <div className="mono cin" style={{ marginBottom: 16 }}>Sweep complete</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 72, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.9 }}>
          {score}/{totalQ}
        </div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.7, color: "var(--ink-2)", margin: "20px 0 40px" }}>
          {missedIdxs.length === 0
            ? "Every gap closed. There is nothing left to cram — walk in calm."
            : `Read the ${missedIdxs.length} below once more. Then stop — more cramming now costs marks, not earns them.`}
        </p>

        {drill && missedIdxs.length > 0 && (
          <div style={{ borderTop: "1px solid var(--ink)", marginBottom: 40 }}>
            {missedIdxs.map(i => {
              const q = drill.questions[i];
              return (
                <div key={i} style={{ padding: "16px 2px", borderBottom: "1px solid var(--rule)" }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500, lineHeight: 1.5, marginBottom: 8 }}>{q.q}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--sage)", marginBottom: 6 }}>
                    {String.fromCharCode(65 + q.answer)}. {q.options[q.answer]}
                  </div>
                  {q.explanation && <div style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.6, color: "var(--ink-3)" }}>{q.explanation}</div>}
                </div>
              );
            })}
          </div>
        )}

        <Link href="/dashboard" className="btn" style={{ display: "inline-block" }}>Close the laptop →</Link>
      </div>
    </div>
  );
}
