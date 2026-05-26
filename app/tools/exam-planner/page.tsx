"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

type TabType = "plan" | "review" | "halflife" | "predict";

// ── Half-Life types ───────────────────────────────────────────────────────────

type DecayStatus = "fresh" | "aging" | "critical";
type DecayEntry  = { chapter: string; weeks_since: number; original_mastery: number; current_recall_pct: number; status: DecayStatus };
type ReviveDay   = { day: number; chapter: string; method: string; time_budget: string };
type HalfLifeResult = { decay_table: DecayEntry[]; critical_chapters: string[]; revive_sequence: ReviveDay[] };

const STATUS_COLOR: Record<DecayStatus, string> = { fresh: "var(--ink)", aging: "var(--ink-2)", critical: "var(--cinnabar-ink)" };
const STATUS_LABEL: Record<DecayStatus, string> = { fresh: "Fresh", aging: "Aging", critical: "Critical" };
const HL_LS_KEY = "ledger-half-life-history";
const HL_PLACEHOLDER = `Rotational Motion | 14 | 4\nThermodynamics | 8 | 3\nElectrochemistry | 20 | 2\nOrganic: Aldehydes | 3 | 5\nCalculus: Integration | 6 | 4`;
const HL_EXAM_OPTIONS = ["JEE", "NEET", "CBSE", "IB", "IGCSE", "A-Level", "SAT"];

// ── Predict types ─────────────────────────────────────────────────────────────

type Prediction = { topic: string; level: string; questions: { q: string; marks: number; type: string; why: string }[]; hotTopics: string[]; commandWords: string[]; examTip: string };
const PREDICT_LEVELS = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE", "JEE", "NEET"];
type Exam    = { id: string; subject: string; date: string; board: string; confidence: number };
type Session = { subject: string; type: string; duration: string };
type DayPlan = { date: string; label: string; sessions: Session[] };
type ReviewItem = { id: string; subject: string; topic: string; createdAt: number; reviews: { date: number; correct: boolean }[]; nextReview: number; interval: number };

const INTERVALS = [1, 3, 7, 14, 30, 60];

function nextInterval(item: ReviewItem, correct: boolean): number {
  if (!correct) return 1;
  const idx = INTERVALS.indexOf(item.interval);
  return INTERVALS[Math.min(idx + 1, INTERVALS.length - 1)];
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isDueToday(item: ReviewItem)    { return item.nextReview <= Date.now() + 86400000; }
function isDueThisWeek(item: ReviewItem) { return item.nextReview <= Date.now() + 7 * 86400000 && !isDueToday(item); }

function planDays(exams: Exam[]): DayPlan[] {
  if (exams.length === 0) return [];
  const sorted = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const end    = new Date(sorted[sorted.length - 1].date);
  const result: DayPlan[] = [];
  for (const d = new Date(); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const label   = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const sessions: Session[] = [];
    const upcoming = sorted.filter(e => { const daysAway = Math.ceil((new Date(e.date).getTime() - d.getTime()) / 86400000); return daysAway >= 0 && daysAway <= 21; });
    if (upcoming.length === 0) continue;
    upcoming.slice(0, 3).forEach(e => {
      const away = Math.ceil((new Date(e.date).getTime() - d.getTime()) / 86400000);
      if (away === 0)      sessions.push({ subject: e.subject, type: "EXAM DAY", duration: "—" });
      else if (away === 1) sessions.push({ subject: e.subject, type: "Light review + rest", duration: "30 min" });
      else if (away <= 3)  sessions.push({ subject: e.subject, type: "Past papers — timed conditions", duration: "2 hrs" });
      else if (away <= 7)  sessions.push({ subject: e.subject, type: "Topic deep-dives + weak areas", duration: "1.5 hrs" });
      else if (away <= 14) sessions.push({ subject: e.subject, type: e.confidence < 40 ? "Core concept revision" : "Practice questions", duration: "1 hr" });
      else                 sessions.push({ subject: e.subject, type: "Spaced recall — key facts & formulas", duration: "30 min" });
    });
    result.push({ date: dateStr, label, sessions });
  }
  return result;
}

const typeColor = (t: string) => t === "EXAM DAY" ? "#c44b2a" : t.includes("Past") ? "#1a6091" : t.includes("deep") || t.includes("weak") ? "#7a4fa3" : t.includes("Spaced") ? "#c97a1a" : "var(--ink-2)";

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "10px 22px", fontFamily: "var(--mono)", fontSize: 10,
  background: active ? "var(--ink)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)",
  border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em",
});

// ── Tab: Topic Half-Life ──────────────────────────────────────────────────────

function HalfLifeTab() {
  const [chaptersLog, setChaptersLog] = useState("");
  const [exam,        setExam]        = useState("JEE");
  const [subject,     setSubject]     = useState("");
  const [result,      setResult]      = useState<HalfLifeResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HL_LS_KEY);
      if (saved) {
        const { result: r, inputs } = JSON.parse(saved);
        setResult(r); setChaptersLog(inputs.chaptersLog ?? ""); setExam(inputs.exam ?? "JEE"); setSubject(inputs.subject ?? "");
      }
    } catch {}
  }, []);

  async function generate() {
    if (!chaptersLog.trim() || !subject.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await callAI({ tool: "topic_half_life", chaptersLog: chaptersLog.trim(), exam, subject: subject.trim() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data);
      localStorage.setItem(HL_LS_KEY, JSON.stringify({ result: data, inputs: { chaptersLog, exam, subject } }));
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="mob-col" style={{ display: "grid", gridTemplateColumns: result || loading ? "380px 1fr" : "1fr", gap: 48, alignItems: "start" }}>
      <div>
        <div className="mono cin" style={{ marginBottom: 8 }}>01 · Chapter log</div>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 10, lineHeight: 1.7 }}>
          One chapter per line. Format:<br />
          <span style={{ color: "var(--ink-2)" }}>Chapter name | weeks ago | mastery 1–5</span>
        </div>
        <textarea value={chaptersLog} onChange={e => setChaptersLog(e.target.value)} placeholder={HL_PLACEHOLDER} rows={10}
          style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.75, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", outline: "none", resize: "vertical" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, marginBottom: 16 }}>
          <div>
            <div className="mono cin" style={{ marginBottom: 8, fontSize: 9 }}>02 · Exam</div>
            <select value={exam} onChange={e => setExam(e.target.value)}
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "10px 12px", color: "var(--ink)", outline: "none" }}>
              {HL_EXAM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div className="mono cin" style={{ marginBottom: 8, fontSize: 9 }}>03 · Subject</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Physics, Chemistry…"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "10px 12px", color: "var(--ink)", outline: "none" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={generate} disabled={loading || !chaptersLog.trim() || !subject.trim()}
            style={{ opacity: loading || !chaptersLog.trim() || !subject.trim() ? 0.5 : 1 }}>
            {loading ? "Modeling decay…" : "Run decay model →"}
          </button>
          {result && <button className="btn ghost" onClick={() => setResult(null)}>Clear</button>}
        </div>
        {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
        <div style={{ marginTop: 24, borderTop: "1px solid var(--rule)", paddingTop: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 10 }}>Mastery scale</div>
          {[["1","Barely covered"],["2","Read once, no practice"],["3","Did some problems, understood basics"],["4","Solid — could explain it"],["5","Expert — solved complex problems"]].map(([n, l]) => (
            <div key={n} style={{ display: "flex", gap: 10, marginBottom: 5, alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, fontWeight: 500, color: "var(--cinnabar-ink)", flexShrink: 0, width: 14 }}>{n}</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      {loading && !result && (
        <div style={{ paddingTop: 40 }}>
          <AIThinking />
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 16 }}>Applying Ebbinghaus forgetting curve…</div>
        </div>
      )}
      {result && (
        <div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--ink)", paddingBottom: 12 }}>
              <div className="mono cin">Decay Map</div>
              <div style={{ display: "flex", gap: 16 }}>
                {(["critical","aging","fresh"] as DecayStatus[]).map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, background: STATUS_COLOR[s] }} />
                    <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{STATUS_LABEL[s]}</span>
                  </div>
                ))}
              </div>
            </div>
            {result.decay_table.map((entry, i) => {
              const pct   = Math.max(0, Math.min(100, entry.current_recall_pct));
              const color = STATUS_COLOR[entry.status];
              const isCrit = entry.status === "critical";
              return (
                <div key={i} style={{ borderBottom: "1px solid var(--rule)", padding: "14px 0", background: isCrit ? "color-mix(in srgb, var(--cinnabar-ink) 4%, var(--paper))" : "transparent", paddingLeft: isCrit ? 12 : 0, paddingRight: isCrit ? 12 : 0, marginLeft: isCrit ? -12 : 0, marginRight: isCrit ? -12 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>{entry.chapter}</span>
                    <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{entry.weeks_since}w ago · m{entry.original_mastery}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600, color, minWidth: 38, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: "var(--rule)", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, transition: "width 0.6s ease", opacity: entry.status === "fresh" ? 0.5 : 1 }} />
                    <div style={{ position: "absolute", left: "40%", top: -3, bottom: -3, width: 1, background: "var(--cinnabar-ink)", opacity: 0.4 }} />
                  </div>
                </div>
              );
            })}
          </div>
          {result.critical_chapters.length > 0 && (
            <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px 20px", marginBottom: 28, background: "color-mix(in srgb, var(--cinnabar-ink) 6%, var(--paper))" }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Critical — below 40% recall</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.critical_chapters.map((ch, i) => (
                  <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, color: "var(--cinnabar-ink)", padding: "4px 10px", border: "1px solid var(--cinnabar-ink)" }}>{ch}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 10 }}>
              <div className="mono cin">7-Day Revive Sequence</div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>Quick-revive methods only — not full re-study</div>
            </div>
            {result.revive_sequence.map((day, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "36px 1fr auto", alignItems: "start", gap: 16, borderBottom: i < result.revive_sequence.length - 1 ? "1px solid var(--rule)" : "none", padding: "14px 0" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, fontWeight: 400, color: "var(--cinnabar-ink)", lineHeight: 1, paddingTop: 2 }}>D{day.day}</div>
                <div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{day.chapter}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{day.method}</div>
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)", flexShrink: 0, textAlign: "right" }}>{day.time_budget}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Question Predictor ───────────────────────────────────────────────────

function PredictTab() {
  const [topic,   setTopic]   = useState("");
  const [subject, setSubject] = useState("");
  const [level,   setLevel]   = useState("A-Level");
  const [result,  setResult]  = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic or chapter."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "predict", topic, subject, level });
      const data = await res.json();
      if (!res.ok || !data.questions) { setError(data.error || "Could not generate predictions."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Predictions for: {result.topic}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New prediction</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8, letterSpacing: "0.08em" }}>HOT TOPICS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {result.hotTopics.map((t, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--cinnabar-ink)", color: "var(--cinnabar-ink)" }}>{t}</span>)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {result.questions.map((q, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="mono cin" style={{ fontSize: 9 }}>Q{i + 1} · {q.type}</span>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>[{q.marks} marks]</span>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>{q.q}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
              <span style={{ color: "#2d7a3c", fontFamily: "var(--mono)", fontSize: 9 }}>WHY LIKELY · </span>{q.why}
            </div>
          </div>
        ))}
      </div>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY COMMAND WORDS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.commandWords.map((w, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)" }}>{w}</span>)}
          </div>
        </div>
        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>EXAM TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="mono cin" style={{ marginBottom: 6 }}>What will the examiner ask?</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, fontStyle: "italic", margin: "0 0 24px" }}>Predict likely exam questions from any topic or chapter.</h2>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic or chapter <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The Cold War, Organic Chemistry, Calculus…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject (optional)</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. History, Chemistry…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PREDICT_LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
        </div>
      </div>
      {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Predicting questions…" : "Predict exam questions →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

export default function RevisionPlannerPage() {
  const [tab,  setTab]  = useState<TabType>("plan");

  // Exam planner state
  const [exams, setExams] = useState<Exam[]>([]);
  const [form,  setForm]  = useState({ subject: "", date: "", board: "A-Level", confidence: 50 });
  const [planView, setPlanView] = useState<"setup" | "plan">("setup");

  // Spaced review state
  const [items,      setItems]      = useState<ReviewItem[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newTopic,   setNewTopic]   = useState("");
  const [activeId,   setActiveId]   = useState<string | null>(null);

  const plan = useMemo(() => planDays(exams), [exams]);

  useEffect(() => {
    try {
      const d = localStorage.getItem("ledger-spaced-items");
      if (d) setItems(JSON.parse(d));
    } catch {}
  }, []);

  function saveItems(next: ReviewItem[]) {
    setItems(next);
    try { localStorage.setItem("ledger-spaced-items", JSON.stringify(next)); } catch {}
  }

  function addExam() {
    if (!form.subject.trim() || !form.date) return;
    setExams(prev => [...prev, { id: Date.now().toString(), ...form }]);
    setForm(f => ({ ...f, subject: "", date: "" }));
  }

  function addReviewItem() {
    if (!newSubject.trim() || !newTopic.trim()) return;
    saveItems([...items, { id: Date.now().toString(), subject: newSubject.trim(), topic: newTopic.trim(), createdAt: Date.now(), reviews: [], nextReview: Date.now(), interval: 1 }]);
    setNewTopic("");
  }

  function markReview(id: string, correct: boolean) {
    saveItems(items.map(item => {
      if (item.id !== id) return item;
      const newInt = nextInterval(item, correct);
      return { ...item, reviews: [...item.reviews, { date: Date.now(), correct }], interval: newInt, nextReview: Date.now() + newInt * 86400000 };
    }));
    setActiveId(null);
  }

  const dueToday    = items.filter(isDueToday);
  const dueThisWeek = items.filter(isDueThisWeek);
  const mastered    = items.filter(i => i.interval >= 30);

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Revision Planner</div>
          {tab === "review" && dueToday.length > 0 && (
            <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginTop: 2 }}>{dueToday.length} topic{dueToday.length > 1 ? "s" : ""} due today</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px" }}>
          {([["plan","Exam Season Plan"],["review","Spaced Review"],["halflife","Topic Half-Life"],["predict","Q Predictor"]] as [TabType,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} style={TAB_STYLE(tab === v)}>
              {l}
            </button>
          ))}
        </div>
      </header>

      {/* ── EXAM SEASON PLAN ── */}
      {tab === "plan" && planView === "setup" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Spaced repetition, automatically</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Add your exams. Get your plan.</h2>
          <div style={{ border: "1px solid var(--ink)", padding: "20px", marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / paper name</div>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Economics Paper 1"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam date</div>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Board</div>
                <select value={form.board} onChange={e => setForm(f => ({ ...f, board: e.target.value }))}
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }}>
                  {["CBSE", "ICSE", "IB", "A-Level", "IGCSE", "AP", "SAT"].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Current confidence: {form.confidence}%</div>
              <input type="range" min="10" max="90" value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: parseInt(e.target.value) }))} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
            </div>
            <button className="btn" onClick={addExam} style={{ width: "100%" }}>+ Add exam</button>
          </div>
          {exams.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {[...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--rule)", marginBottom: 6, background: "var(--paper-2)" }}>
                  <div>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{e.subject}</span>
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 10 }}>{e.board} · {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{e.confidence}%</span>
                    <button onClick={() => setExams(prev => prev.filter(x => x.id !== e.id))} style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "3px 8px", border: "1px solid var(--rule)", background: "none", color: "var(--cinnabar-ink)", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn" onClick={() => setPlanView("plan")} disabled={exams.length === 0} style={{ width: "100%", opacity: exams.length === 0 ? 0.4 : 1 }}>
            Generate revision plan →
          </button>
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {tab === "plan" && planView === "plan" && (
        <main className="mob-p" style={{ padding: "32px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{exams.length} exams · {plan.length} revision days</div>
            <button className="btn ghost" onClick={() => setPlanView("setup")}>Edit exams</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {([["Past papers", "#1a6091"], ["Deep dives", "#7a4fa3"], ["Spaced recall", "#c97a1a"], ["EXAM DAY", "#c44b2a"]] as [string,string][]).map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, background: c }} />
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{l}</span>
              </div>
            ))}
          </div>
          {plan.map((day, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>
              <div style={{ width: 110, flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{day.label}</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                {day.sessions.map((s, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 6, height: 6, background: typeColor(s.type), flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, minWidth: 110 }}>{s.subject}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: typeColor(s.type), flex: 1 }}>{s.type}</span>
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{s.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 24, padding: "14px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>SPACED REPETITION LOGIC</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
              21+ days: spaced recall every 3 days · 14–21: topic revision + practice · 7–14: deep dives on weak areas · 3–7: timed past papers · 1 day: light review + rest
            </div>
          </div>
        </main>
      )}

      {/* ── SPACED REVIEW ── */}
      {tab === "review" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
            {[
              { label: "Due today",        value: dueToday.length,    color: dueToday.length > 0 ? "var(--cinnabar-ink)" : "var(--ink)" },
              { label: "Due this week",    value: dueThisWeek.length, color: "var(--ink)" },
              { label: "Mastered (≥30d)",  value: mastered.length,    color: "#2d7a3c" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "20px", borderRadius: 8, transition: "background 160ms, color 160ms" }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 48, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.03em", color: s.color, lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {dueToday.length > 0 && (
            <>
              <div className="mono cin" style={{ marginBottom: 12 }}>Due today — review these now</div>
              <div style={{ border: "1px solid var(--ink)", marginBottom: 28 }}>
                {dueToday.map((item, i) => (
                  <div key={item.id}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginRight: 8 }}>{item.subject}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 14 }}>{item.topic}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{item.interval}d interval · {item.reviews.length} reviews</div>
                      <button onClick={() => setActiveId(activeId === item.id ? null : item.id)}
                        className="btn" style={{ padding: "4px 12px", fontSize: 11, flexShrink: 0 }}>
                        {activeId === item.id ? "Cancel" : "Review"}
                      </button>
                    </div>
                    {activeId === item.id && (
                      <div style={{ padding: "16px 20px", background: "var(--paper-2)", borderBottom: i < dueToday.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 12 }}>
                          Do you recall <strong style={{ color: "var(--ink)", fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13 }}>{item.topic}</strong>?
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => markReview(item.id, true)}
                            style={{ padding: "8px 20px", background: "#2d7a3c", color: "#fff", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10 }}>
                            Yes — next in {nextInterval(item, true)} days
                          </button>
                          <button onClick={() => markReview(item.id, false)}
                            style={{ padding: "8px 20px", background: "var(--cinnabar)", color: "var(--paper)", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10 }}>
                            No — reset to 1 day
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {dueThisWeek.length > 0 && (
            <>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 12 }}>Coming up this week</div>
              <div style={{ border: "1px solid var(--rule)", marginBottom: 32 }}>
                {dueThisWeek.map((item, i) => (
                  <div key={item.id} style={{ padding: "12px 20px", borderBottom: i < dueThisWeek.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginRight: 8 }}>{item.subject}</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{item.topic}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{fmtDate(item.nextReview)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mono cin" style={{ marginBottom: 12 }}>Track a new topic</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject"
              style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)" }} />
            <input value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && addReviewItem()}
              placeholder="Topic you got wrong (e.g. Organic mechanisms)"
              style={{ flex: 2, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)" }} />
            <button className="btn" onClick={addReviewItem} disabled={!newSubject.trim() || !newTopic.trim()} style={{ opacity: newSubject.trim() && newTopic.trim() ? 1 : 0.4 }}>Track</button>
          </div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 36 }}>
            Add topics you got wrong in past papers. Ledger resurfaces them just before you forget: 1d → 3 → 7 → 14 → 30 → 60.
          </div>

          {items.length > 0 && (
            <>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 12 }}>All tracked topics ({items.length})</div>
              <div style={{ border: "1px solid var(--rule)", marginBottom: 40 }}>
                {items.map((item, i) => (
                  <div key={item.id} style={{ padding: "10px 20px", borderBottom: i < items.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginRight: 8 }}>{item.subject}</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{item.topic}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="mono" style={{ fontSize: 8, color: item.interval >= 30 ? "#2d7a3c" : "var(--ink-3)" }}>
                        {item.interval >= 30 ? "Mastered" : `Next: ${fmtDate(item.nextReview)}`} · {item.interval}d
                      </div>
                      <button onClick={() => saveItems(items.filter(x => x.id !== item.id))} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 9 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {tab === "halflife" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <HalfLifeTab />
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {tab === "predict" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <PredictTab />
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}
    </div>
  );
}
