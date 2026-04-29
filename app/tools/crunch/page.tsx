"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type TopicStatus = "done" | "partial" | "untouched";
type TopicItem = { name: string; status: TopicStatus };
type Priority = { topic: string; why: string; timeHours: number };
type Schedule = { slot: string; action: string; topic: string };
type Plan = { verdict: string; skip: string[]; priority: Priority[]; schedule: Schedule[]; advice: string };

const STATUS_LABEL: Record<TopicStatus, string> = { done: "Done ✓", partial: "Partial ⟳", untouched: "Not yet ✗" };
const STATUS_NEXT: Record<TopicStatus, TopicStatus> = { done: "partial", partial: "untouched", untouched: "done" };
const STATUS_COLOR: Record<TopicStatus, string> = { done: "var(--cinnabar-ink)", partial: "var(--ink-2)", untouched: "var(--ink-3)" };

export default function CrunchPage() {
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

  function toggleStatus(i: number) {
    setTopics(prev => prev.map((t, idx) => idx === i ? { ...t, status: STATUS_NEXT[t.status] } : t));
  }

  async function generate() {
    if (!examName.trim() || topics.length === 0) return;
    setLoading(true); setError(""); setPlan(null);
    try {
      const res = await callAI({
        tool: "crunch",
        examName: examName.trim(),
        hoursLeft: String(hoursLeft),
        topics: topics.map(t => `${t.name}: ${t.status}`).join("\n"),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setPlan(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>48-Hour Crunch</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Triage your syllabus. Make the hours count.</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: plan ? "1fr 1.6fr" : "1fr", gap: 48 }}>

          {/* Input panel */}
          <div>
            <div className="mono cin" style={{ marginBottom: 14 }}>01 · Exam name</div>
            <input
              value={examName} onChange={e => setExamName(e.target.value)}
              placeholder="e.g. Physics Board Exam, JEE Main Paper 1"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", outline: "none", boxSizing: "border-box", marginBottom: 28 }}
            />

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
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 10, fontSize: 9 }}>Add topics, then tap the status button to mark coverage.</div>
            <div style={{ display: "flex", gap: 0, marginBottom: topics.length > 0 ? 0 : 20 }}>
              <input
                value={topicInput} onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTopic()}
                placeholder="Type a topic, press Enter"
                style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", borderRight: "none", background: "var(--paper-2)", padding: "12px 14px", color: "var(--ink)", outline: "none" }}
              />
              <button onClick={addTopic} className="btn" style={{ borderRadius: 0, flexShrink: 0, padding: "0 20px" }}>+ Add</button>
            </div>

            {topics.length > 0 && (
              <div style={{ border: "1px solid var(--ink)", borderTop: "none", marginBottom: 20 }}>
                {topics.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", borderBottom: i < topics.length - 1 ? "1px solid var(--rule)" : "none" }}>
                    <button onClick={() => toggleStatus(i)}
                      style={{ padding: "10px 12px", background: "none", border: "none", borderRight: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.04em", color: STATUS_COLOR[t.status], whiteSpace: "nowrap", textTransform: "uppercase", minWidth: 96 }}>
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

            {plan && (
              <button className="btn ghost" onClick={() => setPlan(null)} style={{ marginLeft: 10 }}>Clear</button>
            )}

            {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
          </div>

          {/* Plan output */}
          {plan && (
            <div>
              {/* Verdict */}
              <div style={{ border: "1px solid var(--ink)", padding: "24px", marginBottom: 24 }}>
                <div className="mono cin" style={{ marginBottom: 8 }}>Reality Check</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", lineHeight: 1.6 }}>{plan.verdict}</div>
              </div>

              {/* Skip + Priority */}
              <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 24 }}>
                <div style={{ padding: "20px", borderRight: "1px solid var(--rule)" }}>
                  <div className="mono cin" style={{ marginBottom: 12 }}>Skip entirely</div>
                  {plan.skip.length === 0
                    ? <div className="mono" style={{ color: "var(--ink-3)" }}>None — you have time for everything.</div>
                    : plan.skip.map((s, i) => (
                        <div key={i} style={{ padding: "8px 0", borderBottom: i < plan.skip.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>—</span>
                          <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", textDecoration: "line-through" }}>{s}</span>
                        </div>
                      ))
                  }
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

              {/* Hour-by-hour schedule */}
              <div style={{ border: "1px solid var(--ink)", marginBottom: 24 }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
                  <div className="mono cin">Hour-by-Hour Schedule</div>
                </div>
                {plan.schedule.map((s, i) => (
                  <div key={i} style={{ display: "flex", borderBottom: i < plan.schedule.length - 1 ? "1px solid var(--rule)" : "none" }}>
                    <div style={{ padding: "14px 16px", borderRight: "1px solid var(--rule)", minWidth: 90, flexShrink: 0, display: "flex", alignItems: "center" }}>
                      <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, letterSpacing: "0.05em" }}>{s.slot}</div>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{s.topic}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>{s.action}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Exam day tip */}
              <div style={{ border: "1px solid var(--ink)", padding: "20px 24px" }}>
                <div className="mono cin" style={{ marginBottom: 8 }}>Exam Day Tip</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontStyle: "italic", lineHeight: 1.6 }}>{plan.advice}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
