"use client";
// The 48-Hour Crunch tab — ONE definition (M2-5).
//
// It previously existed twice, byte-for-byte apart from six cosmetic drifts:
// `app/tools/exam-practice/page.tsx` (as `CrunchTab`) and
// `app/tools/exam-triage/page.tsx` (also `CrunchTab`). PRODUCT_DECISIONS §1.5
// classes that as duplicate functionality — "extract to shared, do not archive
// either host".
//
// The six drifts are the six optional props below. Defaults reproduce the
// exam-practice copy exactly; exam-triage passes overrides that reproduce its
// copy exactly. M2 is structural, so neither host's rendered output changes.

import { useState, type CSSProperties } from "react";
import EditorialRange from "@/components/ui/editorial-range";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIOutput } from "@/components/ai-output";

export type CrunchTopicStatus = "done" | "partial" | "untouched";
export type CrunchTopicItem   = { name: string; status: CrunchTopicStatus };
export type CrunchPriority    = { topic: string; why: string; timeHours: number };
export type CrunchSchedule    = { slot: string; action: string; topic: string };
export type CrunchPlan        = { verdict: string; skip: string[]; priority: CrunchPriority[]; schedule: CrunchSchedule[]; advice: string };

export const CRUNCH_STATUS_LABEL: Record<CrunchTopicStatus, string>            = { done: "Done ✓", partial: "Partial ⟳", untouched: "Not yet ✗" };
export const CRUNCH_STATUS_NEXT:  Record<CrunchTopicStatus, CrunchTopicStatus> = { done: "partial", partial: "untouched", untouched: "done" };
export const CRUNCH_STATUS_COLOR: Record<CrunchTopicStatus, string>            = { done: "var(--cinnabar-ink)", partial: "var(--ink-2)", untouched: "var(--ink-3)" };

export type CrunchTabProps = {
  examNamePlaceholder?: string;
  /** Merged into the exam-name input. exam-triage suppressed the focus ring. */
  examNameInputStyle?:  CSSProperties;
  topicHint?:           string;
  networkErrorText?:    string;
  /** Merged into the priority row's topic/time flex line. */
  priorityHeadStyle?:   CSSProperties;
  /** Merged into the priority row's hours badge. */
  priorityTimeStyle?:   CSSProperties;
};

export default function CrunchTab({
  examNamePlaceholder = "e.g. Physics Board Exam",
  examNameInputStyle,
  topicHint           = "Add topics, tap status to mark coverage.",
  networkErrorText    = "Network error.",
  priorityHeadStyle,
  priorityTimeStyle,
}: CrunchTabProps) {
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
    } catch { setError(networkErrorText); }
    finally { setLoading(false); }
  }

  return (
    <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (plan || loading) ? "1fr 1.6fr" : "1fr", gap: 48 }}>
      <div>
        <div className="mono cin" style={{ marginBottom: 14 }}>01 · Exam name</div>
        <input value={examName} onChange={e => setExamName(e.target.value)} placeholder={examNamePlaceholder}
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", boxSizing: "border-box", marginBottom: 28, ...examNameInputStyle }} />

        <div className="mono cin" style={{ marginBottom: 14 }}>02 · Hours until exam</div>
        <div style={{ border: "none", padding: "20px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 52, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>{hoursLeft}</span>
            <span className="mono" style={{ color: "var(--ink-3)" }}>hours left</span>
          </div>
          <EditorialRange defaultValue={hoursLeft} startingValue={4} maxValue={48} isStepped stepSize={1} onChange={setHoursLeft} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>4h</span>
            <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>48h</span>
          </div>
        </div>

        <div className="mono cin" style={{ marginBottom: 14 }}>03 · Your topics</div>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 10, fontSize: 9 }}>{topicHint}</div>
        <div style={{ display: "flex", gap: 0, marginBottom: topics.length > 0 ? 0 : 20 }}>
          <input value={topicInput} onChange={e => setTopicInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTopic()}
            placeholder="Type a topic, press Enter"
            style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "none", borderRight: "none", background: "var(--paper-2)", padding: "12px 14px", color: "var(--ink)", outline: "none" }} />
          <button onClick={addTopic} className="btn" style={{ borderRadius: 0, flexShrink: 0, padding: "0 20px" }}>+ Add</button>
        </div>

        {topics.length > 0 && (
          <div style={{ border: "none", marginBottom: 20 }}>
            {topics.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", borderBottom: i < topics.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <button onClick={() => toggleStatus(i)}
                  style={{ padding: "10px 12px", background: "none", border: "none", borderRight: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: CRUNCH_STATUS_COLOR[t.status], whiteSpace: "nowrap", textTransform: "uppercase", minWidth: 96 }}>
                  {CRUNCH_STATUS_LABEL[t.status]}
                </button>
                <span style={{ flex: 1, padding: "10px 14px", fontFamily: "var(--sans)", fontSize: 13 }}>{t.name}</span>
                <button onClick={() => setTopics(p => p.filter((_, idx) => idx !== i))}
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
          <div style={{ border: "none", padding: "24px", marginBottom: 24 }}>
            <div className="mono cin" style={{ marginBottom: 8 }}>Reality Check</div>
            <AIOutput text={plan.verdict} variant="principle" />
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "none", marginBottom: 24 }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, ...priorityHeadStyle }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{p.topic}</span>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, ...priorityTimeStyle }}>{p.timeHours}h</span>
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
  );
}
