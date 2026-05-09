"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type ReviewItem = {
  id: string;
  subject: string;
  topic: string;
  createdAt: number;
  reviews: { date: number; correct: boolean }[];
  nextReview: number;
  interval: number;
};

const INTERVALS = [1, 3, 7, 14, 30, 60];

function nextInterval(item: ReviewItem, correct: boolean): number {
  if (!correct) return 1;
  const idx = INTERVALS.indexOf(item.interval);
  return INTERVALS[Math.min(idx + 1, INTERVALS.length - 1)];
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isDueToday(item: ReviewItem): boolean {
  return item.nextReview <= Date.now() + 24 * 60 * 60 * 1000;
}

function isDueThisWeek(item: ReviewItem): boolean {
  return item.nextReview <= Date.now() + 7 * 24 * 60 * 60 * 1000 && !isDueToday(item);
}

export default function SpacedReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const d = localStorage.getItem("ledger-spaced-items");
      if (d) setItems(JSON.parse(d));
    } catch {}
  }, []);

  function save(next: ReviewItem[]) {
    setItems(next);
    try { localStorage.setItem("ledger-spaced-items", JSON.stringify(next)); } catch {}
  }

  function addItem() {
    if (!newSubject.trim() || !newTopic.trim()) return;
    save([...items, {
      id: Date.now().toString(),
      subject: newSubject.trim(),
      topic: newTopic.trim(),
      createdAt: Date.now(),
      reviews: [],
      nextReview: Date.now(),
      interval: 1,
    }]);
    setNewTopic("");
  }

  function markReview(id: string, correct: boolean) {
    save(items.map(item => {
      if (item.id !== id) return item;
      const newInt = nextInterval(item, correct);
      return { ...item, reviews: [...item.reviews, { date: Date.now(), correct }], interval: newInt, nextReview: Date.now() + newInt * 24 * 60 * 60 * 1000 };
    }));
    setActiveId(null);
  }

  function removeItem(id: string) { save(items.filter(i => i.id !== id)); }

  const dueToday = items.filter(isDueToday);
  const dueThisWeek = items.filter(isDueThisWeek);
  const mastered = items.filter(i => i.interval >= 30);

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Forgetting-Curve Revision · γ</div>
        <div className="mono" style={{ color: dueToday.length > 0 ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>
          {dueToday.length} due today
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 960, margin: "0 auto" }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
          {[
            { label: "Due today", value: dueToday.length, color: dueToday.length > 0 ? "var(--cinnabar-ink)" : "var(--ink)" },
            { label: "Due this week", value: dueThisWeek.length, color: "var(--ink)" },
            { label: "Mastered (≥30 days)", value: mastered.length, color: "#2d7a3c" },
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
                  <div style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--rule)",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginRight: 8 }}>{item.subject}</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 14 }}>{item.topic}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>
                      {item.interval}d interval · {item.reviews.length} reviews
                    </div>
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
                          style={{ padding: "8px 20px", background: "#2d7a3c", color: "#fff", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em" }}>
                          Yes — next in {nextInterval(item, true)} days
                        </button>
                        <button onClick={() => markReview(item.id, false)}
                          style={{ padding: "8px 20px", background: "var(--cinnabar)", color: "var(--paper)", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em" }}>
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
          <input value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="Topic you got wrong (e.g. Organic mechanisms)"
            style={{ flex: 2, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)" }} />
          <button className="btn" onClick={addItem} disabled={!newSubject.trim() || !newTopic.trim()} style={{ opacity: newSubject.trim() && newTopic.trim() ? 1 : 0.4 }}>Track</button>
        </div>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 36 }}>
          Add topics you got wrong in past papers. Ledger resurfaces them just before you would have forgotten.
        </div>

        {items.length > 0 ? (
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
                      {item.interval >= 30 ? "Mastered" : `Next: ${fmtDate(item.nextReview)}`} · {item.interval}d interval
                    </div>
                    <button onClick={() => removeItem(item.id)} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 9 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-3)", marginBottom: 40 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", marginBottom: 8 }}>No topics tracked yet.</div>
            <div className="mono" style={{ fontSize: 10 }}>Add topics above and Ledger will resurface them just before you forget.</div>
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 24, marginBottom: 40 }}>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>The Ebbinghaus curve</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7, maxWidth: 640 }}>
            Each correct recall pushes the next review interval forward: 1 day → 3 → 7 → 14 → 30 → 60. Each wrong answer resets to 1 day. The algorithm is the same used by the world&apos;s top medical schools for long-term retention of complex material.
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
