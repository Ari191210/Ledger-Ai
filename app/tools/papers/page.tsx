"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";
import { PAPERS, type Paper, type Question } from "@/lib/papers-data";
import { patchUserData } from "@/lib/user-data";
import { useAuth } from "@/components/auth-provider";

type PracticeState = {
  paper: Paper;
  current: number;
  answers: (number | null)[];
  done: boolean;
  timeLimit?: number; // seconds, undefined = untimed
  timedOut?: boolean;
};

function saveSessionResults(paper: Paper, answers: (number | null)[], userId?: string) {
  try {
    const wt: Record<string, number> = JSON.parse(localStorage.getItem("ledger-weak-topics") || "{}");
    paper.questions.forEach((q, i) => {
      if (answers[i] !== q.ans) wt[q.topic] = (wt[q.topic] || 0) + 1;
    });
    localStorage.setItem("ledger-weak-topics", JSON.stringify(wt));

    const log = JSON.parse(localStorage.getItem("ledger-papers-log") || "[]");
    const score = answers.filter((a, i) => a === paper.questions[i].ans).length;
    log.unshift({ date: new Date().toISOString(), subject: paper.subject, board: paper.board, score, total: paper.questions.length });
    localStorage.setItem("ledger-papers-log", JSON.stringify(log.slice(0, 50)));

    // Sync to Supabase so email reports have accurate data
    if (userId) {
      patchUserData(userId, "weakTopics", wt);
      patchUserData(userId, "papersCount", log.length);
    }
  } catch {}
}

function PracticeMode({ state, setState, userId }: { state: PracticeState; setState: (s: PracticeState | null) => void; userId?: string }) {
  const { paper, current, answers, done } = state;
  const q: Question = paper.questions[current];

  const score = answers.filter((a, i) => a === paper.questions[i].ans).length;
  const [mistakeTags, setMistakeTags] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(state.timeLimit ?? null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!state.timeLimit || done) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit — save and mark done
          const finalAnswers = [...state.answers];
          saveSessionResults(state.paper, finalAnswers, userId);
          setState({ ...state, answers: finalAnswers, done: true, timedOut: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timeLimit, done]);
  const [logged, setLogged] = useState(false);
  const CATS = ["Conceptual", "Slip", "Misread", "Rushed", "Blanked"] as const;
  const CAT_FULL: Record<string, string> = { Conceptual: "Conceptual Gap", Slip: "Calculation Slip", Misread: "Misread Question", Rushed: "Time Pressure", Blanked: "Memory Blank" };
  const wrongIdxs = answers.map((a, i) => a !== paper.questions[i].ans ? i : -1).filter(i => i >= 0);

  function logMistakes() {
    try {
      const existing = JSON.parse(localStorage.getItem("ledger-mistakes") || "[]");
      const entries = Object.entries(mistakeTags).map(([idx, cat]) => ({
        date: new Date().toISOString(),
        subject: paper.subject,
        topic: paper.questions[+idx].topic,
        category: CAT_FULL[cat] || cat,
      }));
      localStorage.setItem("ledger-mistakes", JSON.stringify([...entries, ...existing].slice(0, 500)));
      setLogged(true);
    } catch {}
  }

  if (done) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 0" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <div className="mono cin">Results · {paper.subject} {paper.year}</div>
          {state.timedOut && <span className="mono" style={{ fontSize: 9, padding: "2px 8px", background: "var(--cinnabar)", color: "var(--paper)" }}>⏱ Time&apos;s up</span>}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 72, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.9 }}>
          {score}/{paper.questions.length}
        </div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 8 }}>
          {Math.round(score / paper.questions.length * 100)}% · {score === paper.questions.length ? "Perfect score." : score >= paper.questions.length * 0.8 ? "Strong performance." : "Keep practising."}
        </div>

        <div style={{ marginTop: 32, border: "1px solid var(--ink)" }}>
          {paper.questions.map((q, i) => (
            <div key={i} style={{ padding: "16px 20px", borderBottom: i < paper.questions.length - 1 ? "1px solid var(--rule)" : "none", background: answers[i] === q.ans ? "var(--paper)" : "var(--paper-2)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span className="mono" style={{ color: answers[i] === q.ans ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>{answers[i] === q.ans ? "✓" : "✗"}</span>
                <div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{q.q}</div>
                  <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>
                    Your answer: {answers[i] !== null ? q.opts[answers[i]!] : "—"} · Correct: {q.opts[q.ans]}
                    {answers[i] !== q.ans && <span style={{ color: "var(--cinnabar-ink)" }}> · Topic: {q.topic}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {wrongIdxs.length > 0 && (
          <div style={{ marginTop: 28, border: "1px solid var(--rule)", padding: "20px 20px 16px" }}>
            <div className="mono cin" style={{ marginBottom: 4 }}>Tag your mistakes</div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 16 }}>Why did you get each wrong? Builds your Mistake DNA profile.</div>
            {wrongIdxs.map(i => (
              <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--rule)" }}>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 6 }}>{paper.questions[i].topic}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CATS.map(cat => (
                    <button key={cat} onClick={() => setMistakeTags(p => ({ ...p, [i]: cat }))}
                      style={{ padding: "4px 10px", background: mistakeTags[i] === cat ? "var(--ink)" : "transparent", color: mistakeTags[i] === cat ? "var(--paper)" : "var(--ink-2)", border: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(mistakeTags).length > 0 && !logged && (
              <button className="btn ghost" onClick={logMistakes} style={{ marginTop: 4 }}>Save to Mistake DNA →</button>
            )}
            {logged && <div className="mono" style={{ color: "var(--cinnabar-ink)", marginTop: 8 }}>Saved — view your profile in Tool 12 · Mistake DNA.</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button className="btn" onClick={() => setState(null)}>← Back to papers</button>
          <button className="btn ghost" onClick={() => setState({ ...state, current: 0, answers: Array(paper.questions.length).fill(null), done: false })}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <div>
          <div className="mono cin">{paper.subject} · {paper.board} {paper.year}</div>
          <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>Question {current + 1} of {paper.questions.length}</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {timeRemaining !== null && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 600, color: timeRemaining <= 120 ? "var(--cinnabar-ink)" : "var(--ink)", letterSpacing: "0.05em", transition: "color 500ms" }}>
              {String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:{String(timeRemaining % 60).padStart(2, "0")}
            </div>
          )}
          <button onClick={() => setState(null)} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}>✕ Exit</button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: 4, background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 32 }}>
        <div style={{ height: "100%", width: `${(current / paper.questions.length) * 100}%`, background: "var(--cinnabar)", transition: "width 300ms" }} />
      </div>

      <div style={{ border: "1px solid var(--ink)", padding: "28px 28px 24px" }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>{q.topic}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, lineHeight: 1.4, marginBottom: 24 }}>{q.q}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--rule)" }}>
          {q.opts.map((opt, j) => (
            <button key={j} onClick={() => {
              const newAnswers = [...answers]; newAnswers[current] = j;
              const isLast = current === paper.questions.length - 1;
              if (isLast) saveSessionResults(paper, newAnswers, userId);
              setState({ ...state, answers: newAnswers, current: isLast ? current : current + 1, done: isLast });
            }}
              style={{
                padding: "14px 16px",
                background: answers[current] === j ? "var(--ink)" : "var(--paper)",
                color: answers[current] === j ? "var(--paper)" : "var(--ink)",
                border: "none",
                borderBottom: j < 3 ? "1px solid var(--rule)" : "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--sans)",
                fontSize: 14,
                display: "flex",
                gap: 12,
              }}
            >
              <span className="mono" style={{ opacity: 0.5 }}>{String.fromCharCode(65 + j)}.</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PapersPage() {
  const { user } = useAuth();
  const [practice, setPractice] = useState<PracticeState | null>(null);
  const [board,    setBoard]    = useState<string>("All");
  const [subject,  setSubject]  = useState<string>("All");
  const [diff,     setDiff]     = useState<string>("All");

  const boards   = ["All", ...Array.from(new Set(PAPERS.map((p) => p.board)))];
  const subjects = ["All", ...Array.from(new Set(PAPERS.map((p) => p.subject)))];
  const diffs    = ["All", "Easy", "Medium", "Hard"];

  const filtered = PAPERS.filter((p) =>
    (board   === "All" || p.board      === board)   &&
    (subject === "All" || p.subject    === subject) &&
    (diff    === "All" || p.difficulty === diff)
  );

  function startPractice(paper: Paper, timed = false) {
    const shuffled = [...paper.questions].sort(() => Math.random() - 0.5).slice(0, 10);
    const timeLimit = timed ? 15 * 60 : undefined; // 15 minutes for 10 questions
    setPractice({ paper: { ...paper, questions: shuffled }, current: 0, answers: Array(shuffled.length).fill(null), done: false, timeLimit });
  }

  if (practice) return (
    <div>
      <header style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 07 · Past Papers · Practice Mode</div>
      </header>
      <main className="mob-p" style={{ padding: "0 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <PracticeMode state={practice} setState={(s) => setPractice(s)} userId={user?.id} />
      </main>
    </div>
  );

  return (
    <TierGate requires="pro">
      <div>
        <header style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 07 · Past Papers</div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>{PAPERS.length} papers · {PAPERS.reduce((s, p) => s + p.questions.length, 0)} questions in pool</div>
        </header>

        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
            {[
              { label: "Board",      value: board,   set: setBoard,   opts: boards   },
              { label: "Subject",    value: subject, set: setSubject, opts: subjects },
              { label: "Difficulty", value: diff,    set: setDiff,    opts: diffs    },
            ].map(({ label, value, set, opts }, gi) => (
              <div key={gi} style={{ border: "1px solid var(--ink)", borderRight: gi < 2 ? "none" : "1px solid var(--ink)", padding: "10px 16px" }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {opts.map((o) => (
                    <button key={o} onClick={() => set(o)}
                      style={{ padding: "4px 10px", background: value === o ? "var(--ink)" : "transparent", color: value === o ? "var(--paper)" : "var(--ink-2)", border: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Papers list */}
          <div className="mob-col" style={{ borderTop: "1px solid var(--ink)", borderLeft: "1px solid var(--ink)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {filtered.map((p) => (
              <div key={p.id} style={{ borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", padding: "22px 20px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="mono cin">{p.board}</div>
                  <div className="mono" style={{ color: p.difficulty === "Easy" ? "var(--ink-3)" : p.difficulty === "Hard" ? "var(--cinnabar-ink)" : "var(--ink-2)" }}>{p.difficulty}</div>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, lineHeight: 1.1, marginTop: 10 }}>{p.subject}</div>
                <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>{p.grade} · {p.year}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 8 }}>{p.questions.length} questions in pool · 10 random per session</div>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={() => startPractice(p)}>Practice →</button>
                  <button className="btn ghost" style={{ flexShrink: 0 }} onClick={() => startPractice(p, true)} title="15 minutes for 10 questions">⏱ Timed</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1 / -1", borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", padding: "48px 20px", textAlign: "center" }}>
                <div className="mono" style={{ color: "var(--ink-3)" }}>No papers match the selected filters.</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 07 of 44.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
