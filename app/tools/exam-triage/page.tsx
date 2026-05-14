"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIOutput } from "@/components/ai-output";

// ── shared types ─────────────────────────────────────────────────────────────

type Tab = "crunch" | "cremator";

// ── Crunch types ──────────────────────────────────────────────────────────────

type TopicStatus = "done" | "partial" | "untouched";
type TopicItem   = { name: string; status: TopicStatus };
type Priority    = { topic: string; why: string; timeHours: number };
type Schedule    = { slot: string; action: string; topic: string };
type Plan        = { verdict: string; skip: string[]; priority: Priority[]; schedule: Schedule[]; advice: string };

const STATUS_LABEL: Record<TopicStatus, string>    = { done: "Done ✓", partial: "Partial ⟳", untouched: "Not yet ✗" };
const STATUS_NEXT: Record<TopicStatus, TopicStatus> = { done: "partial", partial: "untouched", untouched: "done" };
const STATUS_COLOR: Record<TopicStatus, string>    = { done: "var(--cinnabar-ink)", partial: "var(--ink-2)", untouched: "var(--ink-3)" };

// ── Cremator types ────────────────────────────────────────────────────────────

type RankedTopic = {
  rank: number; topic_name: string; chapter: string;
  marks_weight_percent: number; examiner_obsession_score: number;
  time_allocation_minutes: number;
  urgency_tier: "DO NOW" | "DO TODAY" | "IF TIME" | "SKIP";
  one_line_reason: string; key_subtopics_to_nail: string[];
};
type SkipItem   = { topic_name: string; reason_to_skip: string };
type HiddenGem  = { topic_name: string; why_overlooked: string; expected_marks: number; prep_time_minutes: number };
type TimeBudget = { total_minutes_available: number; minutes_allocated: number; coverage_confidence_percent: number };
type CremResult = { ranked_topics: RankedTopic[]; skip_list: SkipItem[]; hidden_gem: HiddenGem; time_budget_summary: TimeBudget; examiner_pattern_note: string };

const EXAM_BOARDS = ["CBSE Class 12", "CBSE Class 10", "JEE Main", "JEE Advanced", "NEET", "IB HL", "IB SL", "ICSE", "Other"];
const URGENCY_COLORS: Record<RankedTopic["urgency_tier"], { bg: string; color: string }> = {
  "DO NOW":   { bg: "#c0392b", color: "#fff" },
  "DO TODAY": { bg: "#e67e22", color: "#fff" },
  "IF TIME":  { bg: "#2980b9", color: "#fff" },
  "SKIP":     { bg: "var(--ink-3)", color: "var(--paper)" },
};

// ── Cremator sub-components ───────────────────────────────────────────────────

function PriorityTable({ topics }: { topics: RankedTopic[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {topics.map(t => {
        const pill = URGENCY_COLORS[t.urgency_tier];
        return (
          <div key={t.rank} style={{ border: "1px solid var(--rule)", padding: "14px 16px", background: "var(--paper)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: "var(--cinnabar-ink)", lineHeight: 1, minWidth: 28, flexShrink: 0 }}>#{t.rank}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{t.topic_name}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.chapter}</div>
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 8px", background: pill.bg, color: pill.color, flexShrink: 0, alignSelf: "flex-start" }}>{t.urgency_tier}</span>
            </div>
            <div style={{ display: "flex", gap: 20, marginBottom: 8, flexWrap: "wrap" }}>
              {[["Marks weight", `${t.marks_weight_percent}%`], ["Obsession", `${t.examiner_obsession_score}/10`], ["Time", `${t.time_allocation_minutes}min`]].map(([l, v]) => (
                <div key={l}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 2 }}>{l}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: t.key_subtopics_to_nail.length ? 8 : 0 }}>{t.one_line_reason}</div>
            {t.key_subtopics_to_nail.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {t.key_subtopics_to_nail.map((sub, i) => (
                  <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 7px", border: "1px solid var(--rule)", color: "var(--ink-2)", background: "var(--paper-2)" }}>{sub}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: 48-Hour Crunch ───────────────────────────────────────────────────────

function CrunchTab() {
  const [examName,   setExamName]   = useState("");
  const [hoursLeft,  setHoursLeft]  = useState(24);
  const [topicInput, setTopicInput] = useState("");
  const [topics,     setTopics]     = useState<TopicItem[]>([]);
  const [plan,       setPlan]       = useState<Plan | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  function addTopic() {
    const t = topicInput.trim();
    if (!t || topics.find(x => x.name.toLowerCase() === t.toLowerCase())) return;
    setTopics(prev => [...prev, { name: t, status: "untouched" }]);
    setTopicInput("");
  }

  async function generate() {
    if (!examName.trim() || topics.length === 0) return;
    setLoading(true); setError(""); setPlan(null);
    try {
      const res  = await callAI({ tool: "crunch", examName: examName.trim(), hoursLeft: String(hoursLeft), topics: topics.map(t => `${t.name}: ${t.status}`).join("\n") });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setPlan(data);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (plan || loading) ? "1fr 1.6fr" : "1fr", gap: 48 }}>
      <div>
        <div className="mono cin" style={{ marginBottom: 14 }}>01 · Exam name</div>
        <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Physics Board Exam, JEE Main Paper 1"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", outline: "none", boxSizing: "border-box", marginBottom: 28 }} />

        <div className="mono cin" style={{ marginBottom: 14 }}>02 · Hours until exam</div>
        <div style={{ border: "1px solid var(--ink)", padding: "20px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 52, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>{hoursLeft}</span>
            <span className="mono" style={{ color: "var(--ink-3)" }}>hours left</span>
          </div>
          <input type="range" min={4} max={48} step={1} value={hoursLeft} onChange={e => setHoursLeft(+e.target.value)}
            style={{ width: "100%", accentColor: "var(--cinnabar)", marginBottom: 6 }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>4h</span>
            <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>48h</span>
          </div>
        </div>

        <div className="mono cin" style={{ marginBottom: 14 }}>03 · Your topics</div>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 10, fontSize: 9 }}>Add topics, then tap status to mark coverage.</div>
        <div style={{ display: "flex", gap: 0, marginBottom: topics.length > 0 ? 0 : 20 }}>
          <input value={topicInput} onChange={e => setTopicInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTopic()}
            placeholder="Type a topic, press Enter"
            style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", borderRight: "none", background: "var(--paper-2)", padding: "12px 14px", color: "var(--ink)", outline: "none" }} />
          <button onClick={addTopic} className="btn" style={{ borderRadius: 0, flexShrink: 0, padding: "0 20px" }}>+ Add</button>
        </div>

        {topics.length > 0 && (
          <div style={{ border: "1px solid var(--ink)", borderTop: "none", marginBottom: 20 }}>
            {topics.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", borderBottom: i < topics.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <button onClick={() => setTopics(prev => prev.map((x, idx) => idx === i ? { ...x, status: STATUS_NEXT[x.status] } : x))}
                  style={{ padding: "10px 12px", background: "none", border: "none", borderRight: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: STATUS_COLOR[t.status], whiteSpace: "nowrap", textTransform: "uppercase", minWidth: 96 }}>
                  {STATUS_LABEL[t.status]}
                </button>
                <span style={{ flex: 1, padding: "10px 14px", fontFamily: "var(--sans)", fontSize: 13 }}>{t.name}</span>
                <button onClick={() => setTopics(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ padding: "10px 12px", background: "none", border: "none", borderLeft: "1px solid var(--rule)", cursor: "pointer", color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 10 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <button className="btn" onClick={generate} disabled={loading || !examName.trim() || topics.length === 0}
          style={{ opacity: loading || !examName.trim() || topics.length === 0 ? 0.5 : 1 }}>
          {loading ? "Building plan…" : "Build rescue plan →"}
        </button>
        {plan && <button className="btn ghost" onClick={() => setPlan(null)} style={{ marginLeft: 10 }}>Clear</button>}
        {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
      </div>

      {loading && !plan && <div style={{ paddingTop: 40 }}><AIThinking /></div>}
      {plan && (
        <div>
          <div style={{ border: "1px solid var(--ink)", padding: "24px", marginBottom: 24 }}>
            <div className="mono cin" style={{ marginBottom: 8 }}>Reality Check</div>
            <AIOutput text={plan.verdict} variant="principle" />
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 24 }}>
            <div style={{ padding: "20px", borderRight: "1px solid var(--rule)" }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>Skip entirely</div>
              {plan.skip.length === 0
                ? <div className="mono" style={{ color: "var(--ink-3)" }}>None — you have time for everything.</div>
                : plan.skip.map((s, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: i < plan.skip.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 8 }}>
                      <span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>—</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", textDecoration: "line-through" }}>{s}</span>
                    </div>
                  ))}
            </div>
            <div style={{ padding: "20px" }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>Study this first</div>
              {plan.priority.map((p, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < plan.priority.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{p.topic}</span>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, flexShrink: 0 }}>{p.timeHours}h</span>
                  </div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 3 }}>{p.why}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid var(--ink)", marginBottom: 24 }}>
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
          <div style={{ border: "1px solid var(--ink)", padding: "20px 24px" }}>
            <div className="mono cin" style={{ marginBottom: 8 }}>Exam Day Tip</div>
            <AIOutput text={plan.advice} variant="principle" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Syllabus Cremator ────────────────────────────────────────────────────

function CrematorTab() {
  const [form, setForm] = useState({ syllabusText: "", examBoard: "JEE Main", examDate: "", hoursPerDay: "6", revisedTopics: "" });
  const [result, setResult] = useState<CremResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function daysRemaining() {
    if (!form.examDate) return 0;
    return Math.max(0, Math.ceil((new Date(form.examDate).getTime() - Date.now()) / 86400000));
  }

  async function generate() {
    if (!form.syllabusText.trim()) { setError("Paste your syllabus or chapters first."); return; }
    if (!form.examDate)            { setError("Set your exam date."); return; }
    setLoading(true); setError("");
    try {
      const days = daysRemaining();
      const res = await callAI({ tool: "cremator", syllabusText: form.syllabusText, examBoard: form.examBoard, daysRemaining: days, hoursPerDay: parseFloat(form.hoursPerDay) || 6, alreadyRevisedTopics: form.revisedTopics }) as unknown as CremResult;
      if (!res?.ranked_topics) { setError("Could not generate priority list. Please try again."); return; }
      setResult(res);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  if (result) {
    const { ranked_topics, skip_list, hidden_gem, time_budget_summary, examiner_pattern_note } = result;
    const days = daysRemaining();
    const confColor = time_budget_summary.coverage_confidence_percent >= 75 ? "#27ae60" : time_budget_summary.coverage_confidence_percent >= 50 ? "#e67e22" : "#c0392b";
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button className="btn ghost" onClick={() => setResult(null)} style={{ fontSize: 11 }}>New session</button>
        </div>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ border: "2px solid var(--ink)", padding: "18px 16px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Time Budget</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "var(--ink)", lineHeight: 1, marginBottom: 4 }}>{Math.round(time_budget_summary.total_minutes_available / 60)}h</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>across {days} day{days !== 1 ? "s" : ""}</div>
              <div style={{ height: 6, background: "var(--rule)", marginBottom: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (time_budget_summary.minutes_allocated / time_budget_summary.total_minutes_available) * 100)}%`, background: confColor }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>
                <span>{Math.round(time_budget_summary.minutes_allocated / 60)}h allocated</span>
                <span style={{ color: confColor, fontWeight: 700 }}>{time_budget_summary.coverage_confidence_percent}% conf.</span>
              </div>
            </div>
            <div>
              <div className="mono cin" style={{ fontSize: 9, marginBottom: 8 }}>Examiner Pattern</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic", lineHeight: 1.7, color: "var(--ink-2)", borderLeft: "2px solid var(--cinnabar)", paddingLeft: 12 }}>{examiner_pattern_note}</div>
            </div>
            <div style={{ border: "1px dashed var(--cinnabar)", padding: "14px" }}>
              <div className="mono cin" style={{ fontSize: 9, marginBottom: 8 }}>Hidden Gem</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{hidden_gem.topic_name}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 8 }}>{hidden_gem.why_overlooked}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                <span style={{ color: "var(--ink-3)" }}>marks: </span><span style={{ fontWeight: 700 }}>{hidden_gem.expected_marks}</span>
                <span style={{ color: "var(--ink-3)", marginLeft: 12 }}>prep: </span><span style={{ fontWeight: 700 }}>{hidden_gem.prep_time_minutes}min</span>
              </div>
            </div>
            {skip_list.length > 0 && (
              <div>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Consciously skip</div>
                {skip_list.map((s, i) => (
                  <div key={i} style={{ padding: "10px 12px", border: "1px solid var(--rule)", marginBottom: 6 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 12, color: "var(--ink-3)", textDecoration: "line-through", marginBottom: 3 }}>{s.topic_name}</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>{s.reason_to_skip}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Battle Plan</h2>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{ranked_topics.length} topics · ranked by examiner obsession</span>
            </div>
            <PriorityTable topics={ranked_topics} />
          </div>
        </div>
      </div>
    );
  }

  const days = daysRemaining();
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Exam Board</label>
          <select value={form.examBoard} onChange={e => setForm(f => ({ ...f, examBoard: e.target.value }))}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13 }}>
            {EXAM_BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Exam Date</label>
          <input type="date" value={form.examDate} onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 13, boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Hours per day</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="range" min={1} max={16} step={0.5} value={form.hoursPerDay} onChange={e => setForm(f => ({ ...f, hoursPerDay: e.target.value }))} style={{ flex: 1, accentColor: "var(--cinnabar)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: "var(--ink)", minWidth: 40, textAlign: "right" }}>{form.hoursPerDay}h</span>
        </div>
        {form.examDate && <div className="mono cin" style={{ fontSize: 10, marginTop: 6 }}>{days} day{days !== 1 ? "s" : ""} remaining · {Math.round(days * (parseFloat(form.hoursPerDay) || 6))}h total</div>}
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Syllabus / chapters to cover</label>
        <textarea value={form.syllabusText} onChange={e => setForm(f => ({ ...f, syllabusText: e.target.value }))} rows={7}
          placeholder="Paste chapters or syllabus — e.g. Ch1: Motion, Ch2: Laws of Motion…"
          style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Topics already revised (optional)</label>
        <textarea value={form.revisedTopics} onChange={e => setForm(f => ({ ...f, revisedTopics: e.target.value }))} rows={3}
          placeholder="Anything you've already covered well — we'll reallocate that time."
          style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }} />
      </div>
      {error && <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 16, padding: "8px 12px", border: "1px solid var(--cinnabar-ink)" }}>{error}</div>}
      {loading && <AIThinking />}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%" }}>
        {loading ? "Cremating syllabus…" : "Cremate syllabus →"}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExamTriagePage() {
  const [tab, setTab] = useState<Tab>("crunch");

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Exam Triage</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Last-minute strategy. Make every hour count.</div>
        </div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
          {([["crunch", "48-Hour Crunch"], ["cremator", "Syllabus Cremator"]] as [Tab, string][]).map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i === 0 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "crunch"   && <CrunchTab />}
        {tab === "cremator" && <CrematorTab />}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
