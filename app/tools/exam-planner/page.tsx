"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

type TabType = "plan" | "review";
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
  border: "none", borderRight: "1px solid var(--ink)", cursor: "pointer", letterSpacing: "0.05em",
});

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
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          <button style={TAB_STYLE(tab === "plan")} onClick={() => setTab("plan")}>Exam Season Plan</button>
          <button style={{ ...TAB_STYLE(tab === "review"), borderRight: "none" }} onClick={() => setTab("review")}>Spaced Review</button>
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
              <div key={i} style={{ padding: "20px", borderRight: i < 2 ? "1px solid var(--rule)" : "none" }}>
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
    </div>
  );
}
