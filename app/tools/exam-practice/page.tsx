"use client";
import { useState, useEffect, useRef } from "react";
import TierGate from "@/components/tier-gate";
import ElasticSlider from "@/components/ui/elastic-slider-lazy";
import type { Paper, Question } from "@/lib/papers-data";
import { patchUserData } from "@/lib/user-data";
import { useAuth } from "@/components/auth-provider";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type Tab = "papers" | "triage" | "crunch" | "markscheme" | "formula" | "recall";
const TABS: [Tab, string][] = [
  ["papers",     "Past Papers"],
  ["triage",     "Panic Triage"],
  ["crunch",     "48h Crunch"],
  ["markscheme", "Q Decoder"],
  ["formula",    "Formula Sheet"],
  ["recall",     "Formula Recall"],
];

// ── Papers ─────────────────────────────────────────────────────────────
type ExplainResult = { explanation: string; keyConcept: string; examTip: string };
type PracticeState = { paper: Paper; current: number; answers: (number | null)[]; done: boolean; timeLimit?: number; timedOut?: boolean };

function saveSessionResults(paper: Paper, answers: (number | null)[], userId?: string) {
  try {
    const wt: Record<string, number> = JSON.parse(localStorage.getItem("ledger-weak-topics") || "{}");
    paper.questions.forEach((q, i) => { if (answers[i] !== q.ans) wt[q.topic] = (wt[q.topic] || 0) + 1; });
    localStorage.setItem("ledger-weak-topics", JSON.stringify(wt));
    const log = JSON.parse(localStorage.getItem("ledger-papers-log") || "[]");
    const score = answers.filter((a, i) => a === paper.questions[i].ans).length;
    log.unshift({ date: new Date().toISOString(), subject: paper.subject, board: paper.board, score, total: paper.questions.length });
    localStorage.setItem("ledger-papers-log", JSON.stringify(log.slice(0, 50)));
    if (userId) { patchUserData(userId, "weakTopics", wt); patchUserData(userId, "papersCount", log.length); }
  } catch {}
}

function PracticeMode({ state, setState, userId }: { state: PracticeState; setState: (s: PracticeState | null) => void; userId?: string }) {
  const { paper, current, answers, done } = state;
  const q: Question = paper.questions[current];
  const score = answers.filter((a, i) => a === paper.questions[i].ans).length;
  const [mistakeTags, setMistakeTags] = useState<Record<number, string>>({});
  const [explains, setExplains] = useState<Record<number, { loading: boolean; result: ExplainResult | null }>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(state.timeLimit ?? null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    if (!state.timeLimit || done) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          const fa = [...state.answers];
          saveSessionResults(state.paper, fa, userId);
          setState({ ...state, answers: fa, done: true, timedOut: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timeLimit, done]);

  const CATS = ["Conceptual", "Slip", "Misread", "Rushed", "Blanked"] as const;
  const CAT_FULL: Record<string, string> = { Conceptual: "Conceptual Gap", Slip: "Calculation Slip", Misread: "Misread Question", Rushed: "Time Pressure", Blanked: "Memory Blank" };
  const wrongIdxs = answers.map((a, i) => a !== paper.questions[i].ans ? i : -1).filter(i => i >= 0);

  function logMistakes() {
    try {
      const existing = JSON.parse(localStorage.getItem("ledger-mistakes") || "[]");
      const entries = Object.entries(mistakeTags).map(([idx, cat]) => ({ date: new Date().toISOString(), subject: paper.subject, topic: paper.questions[+idx].topic, category: CAT_FULL[cat] || cat }));
      localStorage.setItem("ledger-mistakes", JSON.stringify([...entries, ...existing].slice(0, 500)));
      setLogged(true);
    } catch {}
  }

  if (done) return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 0" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <div className="mono cin">Results · {paper.subject} {paper.year}</div>
        {state.timedOut && <span className="mono" style={{ fontSize: 9, padding: "2px 8px", background: "var(--cinnabar)", color: "var(--paper)" }}>⏱ Time&apos;s up</span>}
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 72, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.9 }}>{score}/{paper.questions.length}</div>
      <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 8 }}>
        {Math.round(score / paper.questions.length * 100)}% · {score === paper.questions.length ? "Perfect score." : score >= paper.questions.length * 0.8 ? "Strong performance." : "Keep practising."}
      </div>
      <div style={{ marginTop: 32, border: "none" }}>
        {paper.questions.map((q2, i) => (
          <div key={i} style={{ padding: "16px 20px", borderBottom: i < paper.questions.length - 1 ? "1px solid var(--rule)" : "none", background: answers[i] === q2.ans ? "var(--paper)" : "var(--paper-2)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span className="mono" style={{ color: answers[i] === q2.ans ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>{answers[i] === q2.ans ? "✓" : "✗"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{q2.q}</div>
                <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>
                  Your: {answers[i] !== null ? q2.opts[answers[i]!] : "—"} · Correct: {q2.opts[q2.ans]}
                  {answers[i] !== q2.ans && <span style={{ color: "var(--cinnabar-ink)" }}> · {q2.topic}</span>}
                </div>
                {answers[i] !== q2.ans && (
                  <div style={{ marginTop: 10 }}>
                    {!explains[i] && (
                      <button className="btn ghost" style={{ fontSize: 11, padding: "4px 12px" }}
                        onClick={async () => {
                          setExplains(p => ({ ...p, [i]: { loading: true, result: null } }));
                          try {
                            const r = await callAIOrThrow<ExplainResult>({ tool: "papers_explain", question: q2.q, correct: q2.opts[q2.ans], topic: q2.topic });
                            setExplains(p => ({ ...p, [i]: { loading: false, result: r } }));
                          } catch { setExplains(p => ({ ...p, [i]: { loading: false, result: null } })); }
                        }}>Explain →</button>
                    )}
                    {explains[i]?.loading && <div style={{ marginTop: 8 }}><AIThinking /></div>}
                    {explains[i]?.result && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--rule)" }}>
                        <AIOutput text={explains[i]!.result!.explanation} />
                        <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 4 }}>KEY CONCEPT</div>
                            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{explains[i]!.result!.keyConcept}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 4 }}>EXAM TIP</div>
                            <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontStyle: "italic", color: "var(--ink-2)", lineHeight: 1.5 }}>{explains[i]!.result!.examTip}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {wrongIdxs.length > 0 && (
        <div style={{ marginTop: 28, border: "1px solid var(--rule)", padding: "20px 20px 16px" }}>
          <div className="mono cin" style={{ marginBottom: 4 }}>Tag your mistakes</div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 16 }}>Why did you get each wrong?</div>
          {wrongIdxs.map(i => (
            <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--rule)" }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 6 }}>{paper.questions[i].topic}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CATS.map(cat => (
                  <button key={cat} onClick={() => setMistakeTags(p => ({ ...p, [i]: cat }))}
                    style={{ padding: "4px 10px", background: mistakeTags[i] === cat ? "var(--ink)" : "transparent", color: mistakeTags[i] === cat ? "var(--paper)" : "var(--ink-2)", border: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(mistakeTags).length > 0 && !logged && <button className="btn ghost" onClick={logMistakes} style={{ marginTop: 4 }}>Save to Mistake DNA →</button>}
          {logged && <div className="mono" style={{ color: "var(--cinnabar-ink)", marginTop: 8 }}>Saved.</div>}
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button className="btn" onClick={() => setState(null)}>← Back to papers</button>
        <button className="btn ghost" onClick={() => setState({ ...state, current: 0, answers: Array(paper.questions.length).fill(null), done: false })}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <div>
          <div className="mono cin">{paper.subject} · {paper.board} {paper.year}</div>
          <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>Question {current + 1} of {paper.questions.length}</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {timeRemaining !== null && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 600, color: timeRemaining <= 120 ? "var(--cinnabar-ink)" : "var(--ink)", letterSpacing: "0.05em" }}>
              {String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:{String(timeRemaining % 60).padStart(2, "0")}
            </div>
          )}
          <button onClick={() => setState(null)} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}>✕ Exit</button>
        </div>
      </div>
      <div style={{ height: 4, background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 32, overflow: "hidden" }}>
        <div style={{ height: "100%", background: "var(--cinnabar)", transform: `scaleX(${current / paper.questions.length})`, transformOrigin: "left", transition: "transform 300ms cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      <div style={{ border: "none", padding: "28px 28px 24px" }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>{q.topic}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, lineHeight: 1.4, marginBottom: 24 }}>{q.q}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--rule)" }}>
          {q.opts.map((opt, j) => (
            <button key={j} onClick={() => {
              const na = [...answers]; na[current] = j;
              const isLast = current === paper.questions.length - 1;
              if (isLast) saveSessionResults(paper, na, userId);
              setState({ ...state, answers: na, current: isLast ? current : current + 1, done: isLast });
            }} style={{ padding: "14px 16px", background: answers[current] === j ? "var(--ink)" : "var(--paper)", color: answers[current] === j ? "var(--paper)" : "var(--ink)", border: "none", borderBottom: j < 3 ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 14, display: "flex", gap: 12 }}>
              <span className="mono" style={{ opacity: 0.5 }}>{String.fromCharCode(65 + j)}.</span>{opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// papers-data is ~130 KB of source shipped to first load when imported
// statically — fetch it after mount instead; the browser has it within ms.
let PAPERS_CACHE: Paper[] | null = null;
function usePapers(): Paper[] | null {
  const [papers, setPapers] = useState<Paper[] | null>(PAPERS_CACHE);
  useEffect(() => {
    if (papers) return;
    let alive = true;
    import("@/lib/papers-data").then(m => {
      PAPERS_CACHE = m.PAPERS;
      if (alive) setPapers(m.PAPERS);
    });
    return () => { alive = false; };
  }, [papers]);
  return papers;
}

function PapersTab() {
  const { user } = useAuth();
  const [practice, setPractice] = useState<PracticeState | null>(null);
  const [board, setBoard]     = useState("All");
  const [subject, setSubject] = useState("All");
  const [diff, setDiff]       = useState("All");
  const PAPERS   = usePapers() ?? [];
  const boards   = ["All", ...Array.from(new Set(PAPERS.map(p => p.board)))];
  const subjects = ["All", ...Array.from(new Set(PAPERS.map(p => p.subject)))];
  const diffs    = ["All", "Easy", "Medium", "Hard"];
  const filtered = PAPERS.filter(p => (board === "All" || p.board === board) && (subject === "All" || p.subject === subject) && (diff === "All" || p.difficulty === diff));

  function startPractice(paper: Paper, timed = false) {
    const shuffled = [...paper.questions].sort(() => Math.random() - 0.5).slice(0, 10);
    setPractice({ paper: { ...paper, questions: shuffled }, current: 0, answers: Array(shuffled.length).fill(null), done: false, timeLimit: timed ? 15 * 60 : undefined });
  }

  if (practice) return (
    <div>
      <div style={{ padding: "12px 44px", borderBottom: "1px solid var(--rule)" }}>
        <span className="mono" style={{ color: "var(--ink-3)" }}>Past Papers · Practice Mode</span>
      </div>
      <main className="mob-p" style={{ padding: "0 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <PracticeMode state={practice} setState={s => setPractice(s)} userId={user?.id} />
      </main>
    </div>
  );

  return (
    <TierGate requires="pro">
      <div>
        <div style={{ padding: "12px 44px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between" }}>
          <span className="mono" style={{ color: "var(--ink-3)" }}>Past Papers</span>
          <span className="mono" style={{ color: "var(--ink-3)" }}>{PAPERS.length === 0 ? "Loading papers…" : `${PAPERS.length} papers · ${PAPERS.reduce((s, p) => s + p.questions.length, 0)} questions`}</span>
        </div>
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
            {[{ label: "Board", value: board, set: setBoard, opts: boards }, { label: "Subject", value: subject, set: setSubject, opts: subjects }, { label: "Difficulty", value: diff, set: setDiff, opts: diffs }].map(({ label, value, set, opts }, gi) => (
              <div key={gi} style={{ border: "none", borderRight: gi < 2 ? "none" : "1px solid var(--ink)", padding: "10px 16px" }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {opts.map(o => <button key={o} onClick={() => set(o)} style={{ padding: "4px 10px", background: value === o ? "var(--ink)" : "transparent", color: value === o ? "var(--paper)" : "var(--ink-2)", border: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase" }}>{o}</button>)}
                </div>
              </div>
            ))}
          </div>
          <div className="mob-col" style={{ borderTop: "1px solid var(--ink)", borderLeft: "1px solid var(--ink)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {filtered.map(p => (
              <div key={p.id} style={{ borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", padding: "22px 20px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div className="mono cin">{p.board}</div>
                  <div className="mono" style={{ color: p.difficulty === "Easy" ? "var(--ink-3)" : p.difficulty === "Hard" ? "var(--cinnabar-ink)" : "var(--ink-2)" }}>{p.difficulty}</div>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, lineHeight: 1.1, marginTop: 10 }}>{p.subject}</div>
                <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>{p.grade} · {p.year}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 8 }}>{p.questions.length} questions · 10 random per session</div>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={() => startPractice(p)}>Practice →</button>
                  <button className="btn ghost" style={{ flexShrink: 0 }} onClick={() => startPractice(p, true)} title="15 min">⏱ Timed</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ gridColumn: "1 / -1", borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", padding: "48px 20px", textAlign: "center" }}><div className="mono" style={{ color: "var(--ink-3)" }}>No papers match.</div></div>}
          </div>
        </main>
      </div>
    </TierGate>
  );
}

// ── Paper Triage ────────────────────────────────────────────────────────
type TriageTopicStatus = "green" | "amber" | "red" | null;
type TopicMap = Record<string, TriageTopicStatus>;
type SkipItem = { topic: string; reason: string };
type QuickRevisionItem = { topic: string; micro_task: string; minutes: number };
type DeepFocusItem = { topic: string; why_priority: string; micro_task: string; minutes: number };
type ScheduleBlock = { block: string; activity: string; topics: string[] };
type TriagePlan = { skip: SkipItem[]; quick_revision: QuickRevisionItem[]; deep_focus: DeepFocusItem[]; schedule: ScheduleBlock[]; sleep_verdict: string };

const EXAM_OPTIONS = ["CBSE Class 12 – Physics","CBSE Class 12 – Chemistry","CBSE Class 12 – Mathematics","CBSE Class 12 – Biology","CBSE Class 12 – English","CBSE Class 12 – Economics","CBSE Class 12 – Accountancy","CBSE Class 12 – Business Studies","CBSE Class 12 – History","CBSE Class 12 – Political Science","CBSE Class 12 – Geography","CBSE Class 12 – Computer Science","JEE Mains – Physics","JEE Mains – Chemistry","JEE Mains – Mathematics","JEE Advanced – Physics","JEE Advanced – Chemistry","JEE Advanced – Mathematics","NEET – Physics","NEET – Chemistry","NEET – Biology (Botany)","NEET – Biology (Zoology)","IGCSE – Mathematics","IGCSE – Physics","IGCSE – Chemistry","IGCSE – Biology","IGCSE – Economics","IGCSE – English Language","IGCSE – History","IGCSE – Computer Science"];
const TRIAGE_STORAGE_KEY = "paper_triage_plan";

const EXAM_BOARDS = [...new Set(EXAM_OPTIONS.map(o => o.split(" – ")[0]))];
function subjectsFor(board: string) { return EXAM_OPTIONS.filter(o => o.startsWith(board + " – ")).map(o => o.split(" – ")[1]); }

function PaperTriageTab() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [examBoard, setExamBoard] = useState("");
  const [exam, setExam] = useState("");
  const [hoursLeft, setHoursLeft]   = useState(6);
  const [hoursSleep, setHoursSleep] = useState(6);
  const [topicList, setTopicList]   = useState<string[]>([]);
  const [topicStatus, setTopicStatus] = useState<TopicMap>({});
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingPlan, setLoadingPlan]     = useState(false);
  const [plan, setPlan]     = useState<TriagePlan | null>(null);
  const [error, setError]   = useState("");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(TRIAGE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { plan: TriagePlan; windowMinutes: number; savedAt: number };
        const remaining = parsed.windowMinutes - Math.floor((Date.now() - parsed.savedAt) / 60000);
        if (remaining > 0) { setPlan(parsed.plan); setCountdown(remaining * 60); }
        else localStorage.removeItem(TRIAGE_STORAGE_KEY);
      } catch { localStorage.removeItem(TRIAGE_STORAGE_KEY); }
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current!); return 0; } return c - 1; }), 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [countdown]);

  const studyMinutes = Math.max(0, (hoursLeft - hoursSleep) * 60);
  function fmtCd(s: number) { const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=s%60; return `${h}h ${String(m).padStart(2,"0")}m ${String(sec).padStart(2,"0")}s`; }

  async function fetchTopics() {
    if (!exam) { setError("Please select an exam."); return; }
    setError(""); setLoadingTopics(true);
    try {
      const data = await callAIOrThrow<{ topics: string[] }>({ tool: "paper_triage", phase: "topics", exam });
      const topics: string[] = data.topics;
      setTopicList(topics);
      const init: TopicMap = {};
      topics.forEach(t => { init[t] = null; });
      setTopicStatus(init);
      setStep(2);
    } catch { setError("Network error."); }
    finally { setLoadingTopics(false); }
  }

  function cycleStatus(topic: string) {
    const cur = topicStatus[topic];
    const next: TriageTopicStatus = cur === null ? "green" : cur === "green" ? "amber" : cur === "amber" ? "red" : null;
    setTopicStatus(p => ({ ...p, [topic]: next }));
  }

  async function generatePlan() {
    if (Object.values(topicStatus).every(s => s === null)) { setError("Rate at least a few topics first."); return; }
    setError(""); setLoadingPlan(true);
    try {
      const statusMap: Record<string, string> = {};
      Object.entries(topicStatus).forEach(([t, s]) => { statusMap[t] = s === "green" ? "confident" : s === "amber" ? "shaky" : s === "red" ? "not_touched" : "unrated"; });
      const tp = await callAIOrThrow<TriagePlan>({ tool: "paper_triage", phase: "plan", exam, studyWindowMinutes: studyMinutes, topicStatus: statusMap });
      setPlan(tp);
      setCountdown(studyMinutes * 60);
      localStorage.setItem(TRIAGE_STORAGE_KEY, JSON.stringify({ plan: tp, windowMinutes: studyMinutes, savedAt: Date.now() }));
    } catch { setError("Network error."); }
    finally { setLoadingPlan(false); }
  }

  function resetAll() {
    setPlan(null); setStep(1); setExam(""); setHoursLeft(6); setHoursSleep(6);
    setTopicList([]); setTopicStatus({}); setCountdown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
    localStorage.removeItem(TRIAGE_STORAGE_KEY);
  }

  if (plan) return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: "16px 44px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Paper Panic Triage · {exam}</div>
        <button onClick={resetAll} style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "8px 16px", border: "none", background: "none", color: "var(--ink)", cursor: "pointer" }}>New Triage</button>
      </div>
      <main style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Your Attack Plan</div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Study window: {Math.floor(studyMinutes/60)}h {studyMinutes%60}m · {exam}</div>
        </div>
        <div style={{ marginBottom: 32, padding: "18px 22px", border: "1px solid var(--cinnabar)", background: "var(--paper-2)" }}>
          <AIOutput variant="principle" text={plan.sleep_verdict} />
        </div>
        {plan.skip.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div className="mono" style={{ color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase", fontSize: 10 }}>Skip These Entirely</div>
            {plan.skip.map((item, i) => (
              <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 18px", display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: "var(--rule)", marginTop: 5 }} />
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.topic}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic", color: "var(--ink-2)", lineHeight: 1.6 }}>{item.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {plan.deep_focus.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase", fontSize: 10 }}>🔥 Deep Focus — Ranked by Impact</div>
            {plan.deep_focus.map((item, i) => (
              <div key={i} style={{ border: "none", padding: "16px 18px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700 }}>#{i+1} — {item.topic}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{item.minutes} min</div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-2)", marginBottom: 8 }}>{item.why_priority}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.65, padding: "10px 14px", background: "var(--paper-2)", borderLeft: "2px solid var(--cinnabar)" }}>{item.micro_task}</div>
              </div>
            ))}
          </div>
        )}
        {plan.quick_revision.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div className="mono" style={{ color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase", fontSize: 10 }}>Quick Revision</div>
            {plan.quick_revision.map((item, i) => (
              <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 18px", display: "flex", gap: 16, marginBottom: 8 }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)", flexShrink: 0 }}>{item.minutes}m</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.topic}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{item.micro_task}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {plan.schedule.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div className="mono" style={{ color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase", fontSize: 10 }}>Time-Boxed Schedule</div>
            {plan.schedule.map((block, i) => (
              <div key={i} style={{ borderLeft: "2px solid var(--ink)", padding: "14px 20px", marginBottom: 2, background: i % 2 === 0 ? "var(--paper)" : "var(--paper-2)" }}>
                <div className="mono" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{block.block}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65, marginBottom: block.topics.length ? 8 : 0 }}>{block.activity}</div>
                {block.topics.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{block.topics.map((t,j) => <span key={j} className="mono" style={{ fontSize: 10, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-3)" }}>{t}</span>)}</div>}
              </div>
            ))}
          </div>
        )}
      </main>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--ink)", color: "var(--paper)", padding: "14px 44px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100 }}>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13 }}>Study window remaining</div>
        <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: countdown < 1800 ? "var(--cinnabar)" : "var(--paper)" }}>{countdown > 0 ? fmtCd(countdown) : "Time's up — go to sleep."}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "40px 44px 80px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700, marginBottom: 10 }}>Paper Panic Triage</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7 }}>{"It's late. You have limited hours. Let's build a brutal, honest attack plan."}</div>
      </div>
      {/* Step 1 */}
      <div style={{ border: "none", padding: "28px", marginBottom: 20, opacity: step > 1 && exam ? 0.6 : 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 28, height: 28, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700 }}>1</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700 }}>Which exam is tomorrow?</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>Exam board</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXAM_BOARDS.map(b => (
              <button key={b} onClick={() => { setExamBoard(b); setExam(""); setStep(1); setTopicList([]); setTopicStatus({}); }} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${examBoard === b ? "var(--ink)" : "var(--rule)"}`, background: examBoard === b ? "var(--ink)" : "var(--paper)", color: examBoard === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>
            ))}
          </div>
        </div>
        {examBoard && (
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {subjectsFor(examBoard).map(s => {
                const full = `${examBoard} – ${s}`;
                return <button key={s} onClick={() => { setExam(full); setStep(1); setTopicList([]); setTopicStatus({}); }} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${exam === full ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: exam === full ? "var(--cinnabar-ink)" : "var(--paper)", color: exam === full ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>;
              })}
            </div>
          </div>
        )}
        {step === 1 && <button onClick={fetchTopics} disabled={!exam || loadingTopics} style={{ fontFamily: "var(--mono)", fontSize: 12, padding: "12px 28px", background: exam ? "var(--ink)" : "var(--rule)", color: exam ? "var(--paper)" : "var(--ink-3)", border: "none", cursor: exam ? "pointer" : "not-allowed" }}>{loadingTopics ? "Loading topics…" : "Load Topic List →"}</button>}
        {step === 1 && loadingTopics && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        {step > 1 && exam && <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--sage)" }}>✓</span> {exam} <button onClick={() => { setStep(1); setTopicList([]); setTopicStatus({}); }} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "2px 8px", border: "1px solid var(--rule)", background: "none", color: "var(--ink-3)", cursor: "pointer", marginLeft: 8 }}>Change</button></div>}
      </div>
      {/* Step 2 */}
      {step >= 2 && (
        <div style={{ border: "none", padding: "28px", marginBottom: 20, opacity: step > 2 ? 0.6 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700 }}>2</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700 }}>How much time do you have?</div>
          </div>
          {[{ label: "Hours left before you sleep", val: hoursLeft, set: setHoursLeft, min: 1, max: 10 }, { label: "Hours you want to sleep", val: hoursSleep, set: setHoursSleep, min: 0, max: 8 }].map(({ label, val, set, min, max }) => (
            <div key={label} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>{label}</label>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{val}h</div>
              </div>
              <ElasticSlider defaultValue={val} startingValue={min} maxValue={max} isStepped stepSize={1} onChange={set} />
            </div>
          ))}
          <div style={{ padding: "14px 18px", background: "var(--paper-2)", border: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>Actual study window</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: studyMinutes < 60 ? "var(--cinnabar)" : "var(--ink)" }}>{studyMinutes <= 0 ? "0 min 😬" : `${Math.floor(studyMinutes/60)}h ${studyMinutes%60}m`}</div>
          </div>
          {step === 2 && <button onClick={() => setStep(3)} disabled={studyMinutes <= 0} style={{ fontFamily: "var(--mono)", fontSize: 12, padding: "12px 28px", background: studyMinutes > 0 ? "var(--ink)" : "var(--rule)", color: studyMinutes > 0 ? "var(--paper)" : "var(--ink-3)", border: "none", cursor: studyMinutes > 0 ? "pointer" : "not-allowed" }}>Rate My Topics →</button>}
          {step > 2 && <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}><span style={{ color: "var(--sage)" }}>✓</span> {Math.floor(studyMinutes/60)}h {studyMinutes%60}m</div>}
        </div>
      )}
      {/* Step 3 */}
      {step >= 3 && topicList.length > 0 && (
        <div style={{ border: "none", padding: "28px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700 }}>3</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700 }}>Rate each topic honestly</div>
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginBottom: 20 }}>
            Tap to cycle: <span style={{ color: "var(--sage)", fontWeight: 600 }}>Green = Confident</span> · <span style={{ color: "var(--gold)", fontWeight: 600 }}>Amber = Shaky</span> · <span style={{ color: "var(--cinnabar)", fontWeight: 600 }}>Red = Not touched</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 28 }}>
            {topicList.map(topic => {
              const s = topicStatus[topic];
              return (
                <button key={topic} onClick={() => cycleStatus(topic)} style={{ background: s === "green" ? "color-mix(in oklch, var(--sage) 12%, transparent)" : s === "amber" ? "color-mix(in oklch, var(--gold) 12%, transparent)" : s === "red" ? "color-mix(in oklch, var(--cinnabar) 12%, transparent)" : "var(--paper-2)", border: s === "green" ? "1.5px solid var(--sage)" : s === "amber" ? "1.5px solid var(--gold)" : s === "red" ? "1.5px solid var(--cinnabar)" : "1px solid var(--rule)", padding: "10px 12px", fontFamily: "var(--sans)", fontSize: 12, color: s === "green" ? "var(--sage)" : s === "amber" ? "var(--gold)" : s === "red" ? "var(--cinnabar)" : "var(--ink-2)", cursor: "pointer", textAlign: "left" }}>
                  {topic}
                </button>
              );
            })}
          </div>
          {error && <div style={{ marginBottom: 16, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar)" }}>{error}</div>}
          <button onClick={generatePlan} disabled={loadingPlan} style={{ fontFamily: "var(--mono)", fontSize: 12, padding: "12px 28px", background: "var(--ink)", color: "var(--paper)", border: "none", cursor: loadingPlan ? "not-allowed" : "pointer", opacity: loadingPlan ? 0.6 : 1 }}>
            {loadingPlan ? "Building your plan…" : "Generate Attack Plan →"}
          </button>
          {loadingPlan && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </div>
      )}
      {error && step < 3 && <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
    </div>
  );
}

// ── Crunch ──────────────────────────────────────────────────────────────
type CrunchTopicStatus = "done" | "partial" | "untouched";
type CrunchTopicItem   = { name: string; status: CrunchTopicStatus };
type CrunchPriority    = { topic: string; why: string; timeHours: number };
type CrunchSchedule    = { slot: string; action: string; topic: string };
type CrunchPlan        = { verdict: string; skip: string[]; priority: CrunchPriority[]; schedule: CrunchSchedule[]; advice: string };
const CRUNCH_STATUS_LABEL: Record<CrunchTopicStatus, string>                         = { done: "Done ✓", partial: "Partial ⟳", untouched: "Not yet ✗" };
const CRUNCH_STATUS_NEXT:  Record<CrunchTopicStatus, CrunchTopicStatus>               = { done: "partial", partial: "untouched", untouched: "done" };
const CRUNCH_STATUS_COLOR: Record<CrunchTopicStatus, string>                          = { done: "var(--cinnabar-ink)", partial: "var(--ink-2)", untouched: "var(--ink-3)" };

function CrunchTab() {
  const [examName,   setExamName]   = useState("");
  const [hoursLeft,  setHoursLeft]  = useState(24);
  const [topicInput, setTopicInput] = useState("");
  const [topics,     setTopics]     = useState<CrunchTopicItem[]>([]);
  const [plan,       setPlan]       = useState<CrunchPlan | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  function addTopic() {
    const t = topicInput.trim();
    if (!t || topics.find(x => x.name.toLowerCase() === t.toLowerCase())) return;
    setTopics(p => [...p, { name: t, status: "untouched" }]);
    setTopicInput("");
  }

  function toggleStatus(i: number) {
    setTopics(p => p.map((t, idx) => idx === i ? { ...t, status: CRUNCH_STATUS_NEXT[t.status] } : t));
  }

  async function generate() {
    if (!examName.trim() || topics.length === 0) return;
    setLoading(true); setError(""); setPlan(null);
    try {
      const data = await callAIOrThrow<CrunchPlan>({ tool: "crunch", examName: examName.trim(), hoursLeft: String(hoursLeft), topics: topics.map(t => `${t.name}: ${t.status}`).join("\n") });
      setPlan(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (plan || loading) ? "1fr 1.6fr" : "1fr", gap: 48 }}>
          <div>
            <div className="mono cin" style={{ marginBottom: 14 }}>01 · Exam name</div>
            <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Physics Board Exam" style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", boxSizing: "border-box", marginBottom: 28 }} />
            <div className="mono cin" style={{ marginBottom: 14 }}>02 · Hours until exam</div>
            <div style={{ border: "none", padding: "20px", marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 52, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>{hoursLeft}</span>
                <span className="mono" style={{ color: "var(--ink-3)" }}>hours left</span>
              </div>
              <ElasticSlider defaultValue={hoursLeft} startingValue={4} maxValue={48} isStepped stepSize={1} onChange={setHoursLeft} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>4h</span>
                <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>48h</span>
              </div>
            </div>
            <div className="mono cin" style={{ marginBottom: 14 }}>03 · Your topics</div>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 10, fontSize: 9 }}>Add topics, tap status to mark coverage.</div>
            <div style={{ display: "flex", gap: 0, marginBottom: topics.length > 0 ? 0 : 20 }}>
              <input value={topicInput} onChange={e => setTopicInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTopic()} placeholder="Type a topic, press Enter" style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "none", borderRight: "none", background: "var(--paper-2)", padding: "12px 14px", color: "var(--ink)", outline: "none" }} />
              <button onClick={addTopic} className="btn" style={{ borderRadius: 0, flexShrink: 0, padding: "0 20px" }}>+ Add</button>
            </div>
            {topics.length > 0 && (
              <div style={{ border: "none", marginBottom: 20 }}>
                {topics.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", borderBottom: i < topics.length - 1 ? "1px solid var(--rule)" : "none" }}>
                    <button onClick={() => toggleStatus(i)} style={{ padding: "10px 12px", background: "none", border: "none", borderRight: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: CRUNCH_STATUS_COLOR[t.status], whiteSpace: "nowrap", textTransform: "uppercase", minWidth: 96 }}>{CRUNCH_STATUS_LABEL[t.status]}</button>
                    <span style={{ flex: 1, padding: "10px 14px", fontFamily: "var(--sans)", fontSize: 13 }}>{t.name}</span>
                    <button onClick={() => setTopics(p => p.filter((_, idx) => idx !== i))} style={{ padding: "10px 12px", background: "none", border: "none", borderLeft: "1px solid var(--rule)", cursor: "pointer", color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 10 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn" onClick={generate} disabled={loading || !examName.trim() || topics.length === 0} style={{ opacity: loading || !examName.trim() || topics.length === 0 ? 0.5 : 1 }}>{loading ? "Building plan…" : "Build rescue plan →"}</button>
            {plan && <button className="btn ghost" onClick={() => setPlan(null)} style={{ marginLeft: 10 }}>Clear</button>}
            {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
          </div>
          {loading && !plan && <div style={{ paddingTop: 40 }}><AIThinking /></div>}
          {plan && (
            <div>
              <div style={{ border: "none", padding: "24px", marginBottom: 24 }}>
                <div className="mono cin" style={{ marginBottom: 8 }}>Reality Check</div>
                <AIOutput text={plan.verdict} variant="principle" />
              </div>
              <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "none", marginBottom: 24 }}>
                <div style={{ padding: "20px", borderRight: "1px solid var(--rule)" }}>
                  <div className="mono cin" style={{ marginBottom: 12 }}>Skip entirely</div>
                  {plan.skip.length === 0
                    ? <div className="mono" style={{ color: "var(--ink-3)" }}>None — you have time for everything.</div>
                    : plan.skip.map((s, i) => <div key={i} style={{ padding: "8px 0", borderBottom: i < plan.skip.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 8 }}><span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>—</span><span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", textDecoration: "line-through" }}>{s}</span></div>)
                  }
                </div>
                <div style={{ padding: "20px" }}>
                  <div className="mono cin" style={{ marginBottom: 12 }}>Study this first</div>
                  {plan.priority.map((p, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: i < plan.priority.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{p.topic}</span>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{p.timeHours}h</span>
                      </div>
                      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 3 }}>{p.why}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: "none", marginBottom: 24 }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}><div className="mono cin">Hour-by-Hour Schedule</div></div>
                {plan.schedule.map((s, i) => (
                  <div key={i} style={{ display: "flex", borderBottom: i < plan.schedule.length - 1 ? "1px solid var(--rule)" : "none" }}>
                    <div style={{ padding: "14px 16px", borderRight: "1px solid var(--rule)", minWidth: 90, flexShrink: 0, display: "flex", alignItems: "center" }}>
                      <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{s.slot}</div>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{s.topic}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>{s.action}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ border: "none", padding: "20px 24px" }}>
                <div className="mono cin" style={{ marginBottom: 8 }}>Exam Day Tip</div>
                <AIOutput text={plan.advice} variant="principle" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Mark Scheme ─────────────────────────────────────────────────────────
type MarkSchemeTabType = "decode" | "grade";
type Part      = { label: string; marks: number; what: string; howToAnswer: string };
type Analysis  = { commandWord: string; commandDefinition: string; totalMarks: number; timeAdvice: string; parts: Part[]; keyContent: string[]; structure: string[]; examinersTip: string; commonMistakes: string[] };
type Criterion = { name: string; achieved: string; missed: string; marks: string };
type Grade     = { marks: number; totalMarks: number; grade: string; band: string; summary: string; criteria: Criterion[]; strengths: string[]; improvements: string[]; modelAnswer: string };
const MARKSCHEME_BOARDS    = ["CBSE","ICSE","IB","A-Level","IGCSE","AP"];
const MARKSCHEME_SUBJECTS  = ["Economics","History","Biology","Chemistry","Physics","Mathematics","English","Geography","Psychology","Business"];
const MARKSCHEME_TAB_STYLE = (active: boolean): React.CSSProperties => ({ padding: "10px 22px", fontFamily: "var(--mono)", fontSize: 10, background: active ? "var(--ink)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" });

function MarkSchemeTab() {
  const [tab,     setTab]     = useState<MarkSchemeTabType>("decode");
  const [board,   setBoard]   = useState("A-Level");
  const [subject, setSubject] = useState("Economics");
  const [question,  setQuestion]  = useState("");
  const [marks,     setMarks]     = useState("");
  const [analysis,  setAnalysis]  = useState<Analysis | null>(null);
  const [dcLoading, setDcLoading] = useState(false);
  const [dcError,   setDcError]   = useState("");
  const [gradeQuestion, setGradeQuestion] = useState("");
  const [answer,        setAnswer]        = useState("");
  const [totalMarks,    setTotalMarks]    = useState("10");
  const [grade,         setGrade]         = useState<Grade | null>(null);
  const [grLoading,     setGrLoading]     = useState(false);
  const [grError,       setGrError]       = useState("");
  const [grPhase,       setGrPhase]       = useState<"setup" | "answer" | "result">("setup");

  async function decode() {
    if (question.trim().length < 10) { setDcError("Paste your exam question."); return; }
    setDcLoading(true); setDcError("");
    try {
      const data = await callAIOrThrow<Analysis>({ tool: "paper_dissector", board, subject, question, marks });
      setAnalysis(data);
    } catch { setDcError("Network error."); }
    finally { setDcLoading(false); }
  }

  async function gradeAnswer() {
    if (answer.trim().length < 20) { setGrError("Write at least a sentence."); return; }
    setGrLoading(true); setGrError("");
    try {
      const data = await callAIOrThrow<Grade>({ tool: "mark_scheme_eval", board, subject, question: gradeQuestion, answer, totalMarks });
      setGrade(data); setGrPhase("result");
    } catch { setGrError("Network error."); }
    finally { setGrLoading(false); }
  }

  function switchTab(t: MarkSchemeTabType) {
    setTab(t);
    if (t === "grade" && analysis) { setGradeQuestion(question); setTotalMarks(marks || String(analysis.totalMarks || 10)); }
  }

  return (
    <div>
      <div className="mob-hp" style={{ padding: "16px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Question Decoder</div>
        <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
          <button style={MARKSCHEME_TAB_STYLE(tab === "decode")} onClick={() => switchTab("decode")}>Decode Question</button>
          <button style={MARKSCHEME_TAB_STYLE(tab === "grade")} onClick={() => switchTab("grade")}>Grade My Answer</button>
        </div>
      </div>
      <div style={{ padding: "12px 44px", borderBottom: "1px solid var(--rule)", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginRight: 4 }}>BOARD</span>
          {MARKSCHEME_BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "4px 8px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginRight: 4 }}>SUBJECT</span>
          {MARKSCHEME_SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "4px 8px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
        </div>
      </div>

      {tab === "decode" && !analysis && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Decode what examiners want</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste any question. Get the strategy.</h2>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question</div>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={6} placeholder="Paste the exact exam question…" style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Total marks (optional)</div>
            <input type="number" value={marks} onChange={e => setMarks(e.target.value)} placeholder="e.g. 25" style={{ width: 100, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)" }} />
          </div>
          {dcError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{dcError}</div>}
          <button className="btn" onClick={decode} disabled={dcLoading} style={{ width: "100%", opacity: dcLoading ? 0.5 : 1 }}>{dcLoading ? "Dissecting…" : "Decode this question →"}</button>
          {dcLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </main>
      )}

      {tab === "decode" && analysis && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => switchTab("grade")}>Grade my answer →</button>
            <button className="btn ghost" onClick={() => setAnalysis(null)}>New question</button>
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 2, border: "none", padding: "16px 20px", minWidth: 200 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>COMMAND WORD</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, color: "var(--cinnabar-ink)" }}>{analysis.commandWord}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{analysis.commandDefinition}</div>
            </div>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", minWidth: 100 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>MARKS</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700 }}>{analysis.totalMarks}</div>
            </div>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", flex: 1, minWidth: 160 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", marginBottom: 4 }}>TIME ADVICE</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{analysis.timeAdvice}</div>
            </div>
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              {analysis.parts.length > 0 && (
                <div style={{ border: "1px solid var(--rule)", padding: "16px", marginBottom: 16 }}>
                  <div className="mono cin" style={{ marginBottom: 12 }}>Question parts</div>
                  {analysis.parts.map((p, i) => (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < analysis.parts.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700 }}>{p.label}</span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>{p.marks}m</span>
                      </div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 4 }}>{p.what}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{p.howToAnswer}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ border: "1px solid var(--rule)", padding: "16px" }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Key content required</div>
                {analysis.keyContent.map((k, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 10 }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ border: "none", padding: "16px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Answer structure</div>
                {analysis.structure.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: 9 }}>{i+1}</span>
                    </div>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 6 }}>EXAMINER TIP</div>
                <AIOutput text={analysis.examinersTip} variant="principle" />
              </div>
              <div style={{ padding: "14px", border: "1px solid var(--rule)" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>COMMON MISTAKES</div>
                {analysis.commonMistakes.map((m, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>✗ {m}</div>)}
              </div>
            </div>
          </div>
        </main>
      )}

      {tab === "grade" && grPhase === "setup" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Examiner-grade your work</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste your question. Write your answer. Get graded.</h2>
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>The question</div>
            <textarea value={gradeQuestion} onChange={e => setGradeQuestion(e.target.value)} rows={3} placeholder="Paste the exam question here…" style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Total marks available</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["5","8","10","12","15","20","25"].map(m => (
                <button key={m} onClick={() => setTotalMarks(m)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${totalMarks === m ? "var(--ink)" : "var(--rule)"}`, background: totalMarks === m ? "var(--ink)" : "var(--paper)", color: totalMarks === m ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{m}m</button>
              ))}
            </div>
          </div>
          <button className="btn" onClick={() => setGrPhase("answer")} disabled={!gradeQuestion.trim()} style={{ width: "100%", opacity: gradeQuestion.trim() ? 1 : 0.4 }}>Write my answer →</button>
        </main>
      )}

      {tab === "grade" && grPhase === "answer" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: 20, fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--ink)" }}>{gradeQuestion}</strong>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 12 }}>[{totalMarks} marks · {board} {subject}]</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your answer</div>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={12} placeholder="Write your answer here…" style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.7, border: "none", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical" }} />
          </div>
          {grError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{grError}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" onClick={() => setGrPhase("setup")}>← Change question</button>
            <button className="btn" onClick={gradeAnswer} disabled={grLoading || answer.trim().length < 20} style={{ flex: 1, opacity: grLoading ? 0.5 : 1 }}>{grLoading ? "Grading…" : "Grade my answer →"}</button>
          </div>
          {grLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </main>
      )}

      {tab === "grade" && grPhase === "result" && grade && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => { setGrPhase("answer"); setGrade(null); setGrError(""); }}>Revise answer</button>
            <button className="btn ghost" onClick={() => { setGrPhase("setup"); setGrade(null); setAnswer(""); setGrError(""); }}>New question</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ border: "none", padding: "20px 28px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>MARKS</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: "var(--cinnabar-ink)" }}>{grade.marks}<span style={{ fontSize: 22, color: "var(--ink-3)" }}>/{grade.totalMarks}</span></div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>{grade.grade} · {grade.band}</div>
            </div>
            <div style={{ flex: 1, border: "1px solid var(--rule)", padding: "16px 20px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>OVERALL VERDICT</div>
              <AIOutput text={grade.summary} />
            </div>
          </div>
          <div style={{ border: "1px solid var(--rule)", marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Mark scheme criteria</div></div>
            {grade.criteria.map((c, i) => (
              <div key={i} style={{ padding: "14px 16px", borderBottom: i < grade.criteria.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>{c.marks}</span>
                </div>
                <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {c.achieved && <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--sage)" }}>✓ {c.achieved}</div>}
                  {c.missed   && <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--cinnabar-ink)" }}>✗ {c.missed}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ border: "1px solid var(--sage)", padding: "14px 16px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--sage)", marginBottom: 8 }}>STRENGTHS</div>
              {grade.strengths.map((s, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {s}</div>)}
            </div>
            <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "14px 16px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8 }}>TO IMPROVE</div>
              {grade.improvements.map((s, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {s}</div>)}
            </div>
          </div>
          {grade.modelAnswer && (
            <div style={{ border: "1px solid var(--rule)", padding: "16px 20px" }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Model answer</div>
              <AIOutput text={grade.modelAnswer} />
            </div>
          )}
        </main>
      )}
    </div>
  );
}

// ── Formula Sheet ────────────────────────────────────────────────────────
type FormulaSheetFormula  = { name: string; formula: string; variables: string; notes: string | null };
type FormulaSection       = { title: string; formulas: FormulaSheetFormula[] };
type FormulaSheet         = { subject: string; chapter: string; board: string; sections: FormulaSection[]; keyConcepts: string[]; units: Array<{ quantity: string; unit: string; dimensions?: string }>; examTips: string[] };
type FormulaHistoryEntry  = { date: string; subject: string; chapter: string; data: FormulaSheet };
const FORMULA_SUBJECTS = ["Physics","Chemistry","Mathematics","Biology","Economics","Accountancy","Business Studies","English Literature","History","Geography","Political Science","Computer Science"];
const FORMULA_BOARDS   = ["CBSE","ICSE","IB","IGCSE","State Board"];
const FORMULA_GRADES   = ["Any","Class 9","Class 10","Class 11","Class 12","JEE","NEET","CUET"];

function FormulaSheetTab() {
  const [subject,     setSubject]     = useState("");
  const [chapter,     setChapter]     = useState("");
  const [board,       setBoard]       = useState("CBSE");
  const [grade,       setGrade]       = useState("Any");
  const [sheet,       setSheet]       = useState<FormulaSheet | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [saved,       setSaved]       = useState(false);
  const [history,     setHistory]     = useState<FormulaHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("ledger-profile") || "{}");
      if (profile.board) setBoard(profile.board);
      if (profile.grade) setGrade(profile.grade);
      const hist: FormulaHistoryEntry[] = JSON.parse(localStorage.getItem("ledger-formula-history") || "[]");
      setHistory(hist);
    } catch {}
  }, []);

  async function generate() {
    if (!subject.trim() || !chapter.trim()) return;
    setLoading(true); setError(""); setSaved(false); setSheet(null);
    try {
      const data = await callAIOrThrow<FormulaSheet>({ tool: "formula", subject, chapter, board, grade: grade === "Any" ? "" : grade });
      if (!Array.isArray(data.sections) || data.sections.length === 0) { setError("Generation failed — try again."); return; }
      setSheet({ subject: data.subject || subject, chapter: data.chapter || chapter, board: data.board || board, sections: data.sections, keyConcepts: Array.isArray(data.keyConcepts) ? data.keyConcepts : [], units: Array.isArray(data.units) ? data.units : [], examTips: Array.isArray(data.examTips) ? data.examTips : [] });
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function handleSave() {
    if (!sheet) return;
    try {
      const entry: FormulaHistoryEntry = { date: new Date().toISOString(), subject, chapter, data: sheet };
      const hist = [entry, ...history].slice(0, 20);
      localStorage.setItem("ledger-formula-history", JSON.stringify(hist));
      setHistory(hist); setSaved(true);
    } catch {}
  }

  function loadFromHistory(entry: FormulaHistoryEntry) {
    setSubject(entry.subject); setChapter(entry.chapter);
    setSheet({ ...entry.data, sections: Array.isArray(entry.data.sections) ? entry.data.sections : [], keyConcepts: Array.isArray(entry.data.keyConcepts) ? entry.data.keyConcepts : [], units: Array.isArray(entry.data.units) ? entry.data.units : [], examTips: Array.isArray(entry.data.examTips) ? entry.data.examTips : [] });
    setShowHistory(false); setSaved(true);
  }

  return (
    <div>
      <style>{`@media print{.no-print{display:none!important}nav{display:none!important}.formula-output{border:none!important;padding:0!important}body{background:white!important}}`}</style>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 40 }}>
          <div className="no-print">
            <div className="mono cin" style={{ marginBottom: 16 }}>Generate</div>
            <div style={{ marginBottom: 14 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
              <input list="fml-subj-list" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Physics, Mathematics…" style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              <datalist id="fml-subj-list">{FORMULA_SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Chapter / Topic</div>
              <input value={chapter} onChange={e => setChapter(e.target.value)} placeholder="Laws of Motion, Integration…" onKeyDown={e => e.key === "Enter" && generate()} style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Board</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FORMULA_BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Grade</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FORMULA_GRADES.map(g => <button key={g} onClick={() => setGrade(g)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${grade === g ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: grade === g ? "var(--cinnabar-ink)" : "var(--paper)", color: grade === g ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{g}</button>)}
              </div>
            </div>
            <button className="btn" onClick={generate} disabled={loading || !subject.trim() || !chapter.trim()} style={{ width: "100%", opacity: loading || !subject.trim() || !chapter.trim() ? 0.5 : 1 }}>{loading ? "Generating…" : "Generate formula sheet →"}</button>
            {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
            {history.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <button onClick={() => setShowHistory(v => !v)} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0 }}>{showHistory ? "▲" : "▼"} History ({history.length})</button>
                {showHistory && (
                  <div style={{ marginTop: 8, border: "1px solid var(--rule)" }}>
                    {history.slice(0, 8).map((h, i) => (
                      <button key={i} onClick={() => loadFromHistory(h)} style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", borderBottom: i < Math.min(history.length-1,7) ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left" }}>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{h.subject} · {h.chapter}</div>
                        <div className="mono" style={{ color: "var(--ink-3)", marginTop: 2 }}>{new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="formula-output">
            {!sheet ? (
              <div style={{ border: "1px solid var(--rule)", padding: "60px 40px", textAlign: "center", background: "var(--paper-2)", minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                {loading ? <AIThinking /> : <>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "var(--ink-2)", marginBottom: 8 }}>Your formula sheet will appear here.</div>
                  <div className="mono" style={{ color: "var(--ink-3)" }}>Enter a subject and chapter to begin.</div>
                </>}
              </div>
            ) : (
              <>
                <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "flex-end" }}>
                  <button className="btn ghost" onClick={handleSave} disabled={saved} style={{ padding: "8px 18px", opacity: saved ? 0.5 : 1 }}>{saved ? "Saved ✓" : "Save →"}</button>
                  <button className="btn ghost" onClick={() => { setSheet(null); setSaved(false); }} style={{ padding: "8px 18px" }}>New sheet</button>
                  <button className="btn" onClick={() => window.print()} style={{ padding: "8px 18px" }}>Print / PDF ↗</button>
                </div>
                <div style={{ border: "none", padding: "20px 24px", marginBottom: 16, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", background: "var(--ink)", color: "var(--paper)" }}>
                  <div><div className="mono" style={{ opacity: 0.5, fontSize: 9 }}>Subject</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700, marginTop: 2 }}>{sheet.subject}</div></div>
                  <div style={{ width: 1, height: 36, background: "color-mix(in oklch, var(--paper) 15%, transparent)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><div className="mono" style={{ opacity: 0.5, fontSize: 9 }}>Chapter</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700, marginTop: 2 }}>{sheet.chapter}</div></div>
                  <div><div className="mono" style={{ opacity: 0.5, fontSize: 9 }}>Board</div><div className="mono" style={{ fontSize: 12, marginTop: 2 }}>{sheet.board}</div></div>
                  {grade !== "Any" && <div><div className="mono" style={{ opacity: 0.5, fontSize: 9 }}>Grade</div><div className="mono" style={{ fontSize: 12, marginTop: 2 }}>{grade}</div></div>}
                </div>
                {(sheet.sections || []).map((section, si) => (
                  <div key={si} style={{ marginBottom: 16, border: "none" }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">{section.title}</div></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                      {(section.formulas || []).map((f, fi) => (
                        <div key={fi} style={{ padding: "16px 18px", borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{f.name}</div>
                          <div className="mono" style={{ fontSize: 18, color: "var(--ink)", marginBottom: 10, lineHeight: 1.4 }}>{f.formula}</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.6 }}>{f.variables}</div>
                          {f.notes && <div style={{ fontFamily: "var(--sans)", fontSize: 11, fontStyle: "italic", color: "var(--ink-3)", borderTop: "1px solid var(--rule)", paddingTop: 6, marginTop: 8 }}>{f.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(sheet.keyConcepts || []).length > 0 && (
                  <div style={{ marginBottom: 16, border: "none" }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Key Concepts</div></div>
                    <div style={{ padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(sheet.keyConcepts || []).map((c, i) => <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, padding: "4px 10px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>{c}</span>)}
                    </div>
                  </div>
                )}
                {(sheet.units || []).length > 0 && (
                  <div style={{ marginBottom: 16, border: "none" }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Units &amp; Dimensions</div></div>
                    <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
                      <thead><tr>{["Quantity","SI Unit","Dimensions"].map(h => <th key={h} style={{ padding: "8px 18px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal", letterSpacing: "0.06em", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(sheet.units || []).map((u, i) => (
                          <tr key={i}>
                            <td style={{ padding: "10px 18px", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, borderBottom: i < sheet.units.length-1 ? "1px solid var(--rule)" : "none" }}>{u.quantity}</td>
                            <td style={{ padding: "10px 18px", fontFamily: "var(--mono)", fontSize: 12, borderBottom: i < sheet.units.length-1 ? "1px solid var(--rule)" : "none" }}>{u.unit}</td>
                            <td style={{ padding: "10px 18px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-2)", borderBottom: i < sheet.units.length-1 ? "1px solid var(--rule)" : "none" }}>{u.dimensions || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {(sheet.examTips || []).length > 0 && (
                  <div style={{ border: "none" }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--ink)", color: "var(--paper)" }}><div className="mono" style={{ letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 9 }}>Exam tips</div></div>
                    {(sheet.examTips || []).map((tip, i) => (
                      <div key={i} style={{ padding: "12px 18px", borderBottom: i < sheet.examTips.length-1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 1 }}>{String(i+1).padStart(2,"0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Formula Recall ───────────────────────────────────────────────────────
type RecallFormula     = { id: number; name: string; formula: string; variables_explained: string; memory_tip: string; topic: string };
type RecallDrillResult = { formulas: RecallFormula[] };
type CardState         = "prompt" | "answered" | "revealed";
const RECALL_SUBJECTS = ["Physics","Chemistry","Mathematics","Biology"];
const RECALL_TOPICS: Record<string, string[]> = {
  Physics:     ["Mechanics","Thermodynamics","Electrostatics","Magnetism","Optics","Modern Physics","Waves","Fluid Mechanics"],
  Chemistry:   ["Mole Concept","Thermodynamics","Electrochemistry","Chemical Kinetics","Organic Reactions","Atomic Structure","Equilibrium"],
  Mathematics: ["Calculus","Algebra","Trigonometry","Coordinate Geometry","Probability","Matrices","Vectors","Statistics"],
  Biology:     ["Cell Biology","Genetics","Ecology","Human Physiology","Plant Physiology","Evolution","Biotechnology"],
};
function normalize(s: string) { return s.trim().toLowerCase().replace(/\s+/g," ").replace(/[×·]/g,"*"); }
function isClose(attempt: string, answer: string): boolean {
  const a = normalize(attempt); const b = normalize(answer);
  if (a === b) return true;
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return true;
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { if (a[i] === b[i]) matches++; }
  return matches / longer >= 0.8;
}

function FormulaRecallTab() {
  const [subject,   setSubject]   = useState("Physics");
  const [topic,     setTopic]     = useState("Mechanics");
  const [loading,   setLoading]   = useState(false);
  const [formulas,  setFormulas]  = useState<RecallFormula[]>([]);
  const [current,   setCurrent]   = useState(0);
  const [attempt,   setAttempt]   = useState("");
  const [cardState, setCardState] = useState<CardState>("prompt");
  const [scores,    setScores]    = useState<boolean[]>([]);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTopic(RECALL_TOPICS[subject][0]); }, [subject]);

  async function generate() {
    setLoading(true); setError(""); setFormulas([]); setScores([]); setCurrent(0); setAttempt(""); setCardState("prompt"); setDone(false);
    try {
      const res = await callAIOrThrow<RecallDrillResult>({ tool: "formula_recall", subject, topic });
      if (!res?.formulas?.length) { setError("Could not generate formulas. Try again."); return; }
      setFormulas(res.formulas);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function checkAnswer() {
    if (!attempt.trim()) return;
    setScores(s => [...s, isClose(attempt, formulas[current].formula)]);
    setCardState("answered");
  }

  function reveal() {
    if (cardState === "prompt") setScores(s => [...s, false]);
    setCardState("revealed");
  }

  function next() {
    if (current + 1 >= formulas.length) { setDone(true); }
    else { setCurrent(c => c + 1); setAttempt(""); setCardState("prompt"); setTimeout(() => inputRef.current?.focus(), 80); }
  }

  function restart() { setCurrent(0); setAttempt(""); setCardState("prompt"); setScores([]); setDone(false); setTimeout(() => inputRef.current?.focus(), 80); }

  const correctCount = scores.filter(Boolean).length;

  if (done && formulas.length) {
    const pct = Math.round((correctCount / formulas.length) * 100);
    const tierColor = pct >= 80 ? "var(--sage)" : pct >= 50 ? "var(--gold)" : "var(--cinnabar-ink)";
    const tierLabel = pct >= 80 ? "Strong recall" : pct >= 50 ? "Review needed" : "Critical gaps";
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 72, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{pct}%</div>
          <div className="mono" style={{ fontSize: 11, color: tierColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{tierLabel}</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{correctCount}/{formulas.length} recalled · {subject} · {topic}</div>
        </div>
        <div style={{ marginBottom: 32 }}>
          {formulas.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--rule)" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: scores[i] ? "var(--sage)" : "var(--cinnabar-ink)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                <span style={{ color: "var(--paper)", fontSize: 11, fontWeight: 700 }}>{scores[i] ? "✓" : "✗"}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{f.name}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--cinnabar-ink)" }}>{f.formula}</div>
                {!scores[i] && <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>{f.memory_tip}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={restart} style={{ flex: 1 }}>Drill again →</button>
          <button className="btn ghost" onClick={generate} style={{ flex: 1 }}>New set</button>
        </div>
      </div>
    );
  }

  if (formulas.length && !done) {
    const f = formulas[current];
    const isCorrect = cardState === "answered" && scores[scores.length - 1];
    const isWrong   = cardState === "answered" && !scores[scores.length - 1];
    return (
      <div>
        <div style={{ padding: "12px 32px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{current + 1} / {formulas.length} · {subject}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{topic}</div>
        </div>
        <div style={{ height: 3, background: "var(--rule)", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "var(--cinnabar-ink)", transform: `scaleX(${current / formulas.length})`, transformOrigin: "left", transition: "transform 400ms cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "60px 32px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>{f.topic}</div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 32 }}>{f.name}</h1>
          {cardState === "prompt" && (
            <>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Write the formula from memory</div>
              <input ref={inputRef} autoFocus value={attempt} onChange={e => setAttempt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && attempt.trim()) checkAnswer(); }} placeholder="e.g. F = ma" style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 18, padding: "14px 16px", border: "none", background: "var(--paper)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="btn" onClick={checkAnswer} disabled={!attempt.trim()} style={{ flex: 2 }}>Check →</button>
                <button className="btn ghost" onClick={reveal} style={{ flex: 1, fontSize: 11 }}>Show answer</button>
              </div>
            </>
          )}
          {(cardState === "answered" || cardState === "revealed") && (
            <div>
              {cardState === "answered" && (
                <div style={{ padding: "14px 18px", border: `1px solid ${isCorrect ? "var(--sage)" : "var(--cinnabar-ink)"}`, background: isCorrect ? "color-mix(in oklch, var(--sage) 8%, transparent)" : "color-mix(in oklch, var(--cinnabar) 6%, transparent)", marginBottom: 20 }}>
                  <div className="mono" style={{ fontSize: 10, color: isCorrect ? "var(--sage)" : "var(--cinnabar-ink)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{isCorrect ? "Correct ✓" : isWrong ? "Not quite ✗" : ""}</div>
                  <div className="mono" style={{ fontSize: 14, color: "var(--ink-2)" }}>Your answer: {attempt}</div>
                </div>
              )}
              <div style={{ padding: "20px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: 20 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Correct formula</div>
                <div className="mono" style={{ fontSize: 22, color: "var(--cinnabar-ink)", marginBottom: 14 }}>{f.formula}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 10 }}>{f.variables_explained}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, fontStyle: "italic" }}>Memory tip: {f.memory_tip}</div>
              </div>
              <button className="btn" onClick={next} style={{ width: "100%" }}>{current + 1 >= formulas.length ? "See results →" : "Next formula →"}</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 32px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700, lineHeight: 1.1, margin: "0 0 10px" }}>Test your formula memory.</h1>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>We show you the formula name. You write it from memory. Active recall beats re-reading by 4×.</p>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Subject</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {RECALL_SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)} style={{ padding: "12px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "transparent", color: subject === s ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--sans)", fontSize: 13, fontWeight: subject === s ? 700 : 400, cursor: "pointer" }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 32 }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Topic</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(RECALL_TOPICS[subject] || []).map(t => (
            <button key={t} onClick={() => setTopic(t)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${topic === t ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: topic === t ? "var(--cinnabar-ink)" : "var(--paper)", color: topic === t ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
      </div>
      {error && <div className="mono" style={{ fontSize: 12, color: "var(--cinnabar-ink)", marginBottom: 16, padding: "10px 14px", border: "1px solid var(--cinnabar-ink)" }}>{error}</div>}
      {loading && <AIThinking />}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%" }}>{loading ? "Generating drill…" : "Start drill →"}</button>
      <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center", marginTop: 14 }}>8–10 formulas · Active recall · Spaced repetition ready</p>
    </div>
  );
}

// ── Hub ──────────────────────────────────────────────────────────────────
export default function ExamPracticePage() {
  const [tab, setTab] = useState<Tab>("papers");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Exam Practice</div>
        <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)} style={{ padding: "10px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "var(--paper)", color: tab === v ? "var(--paper)" : "var(--ink)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{l}</button>
          ))}
        </div>
      </header>
      {tab === "papers"     && <PapersTab />}
      {tab === "triage"     && <PaperTriageTab />}
      {tab === "crunch"     && <CrunchTab />}
      {tab === "markscheme" && <MarkSchemeTab />}
      {tab === "formula"    && <FormulaSheetTab />}
      {tab === "recall"     && <FormulaRecallTab />}
    </div>
  );
}
