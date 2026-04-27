"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Priority = "high" | "medium" | "low";
type Category = "exam" | "assignment" | "application" | "project" | "other";

type Deadline = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: Category;
  priority: Priority;
  notes: string;
  done: boolean;
};

const CAT_COLORS: Record<Category, string> = {
  exam: "#c44b2a",
  assignment: "#1a6091",
  application: "#8b5a2b",
  project: "#2d7a3c",
  other: "#6b3fa0",
};

const CAT_LABELS: Record<Category, string> = {
  exam: "Exam",
  assignment: "Assignment",
  application: "Application",
  project: "Project",
  other: "Other",
};

function daysUntil(dateStr: string, timeStr: string): number {
  const dt = new Date(`${dateStr}T${timeStr || "23:59"}`);
  return Math.ceil((dt.getTime() - Date.now()) / 86400000);
}

function urgencyLabel(days: number): { label: string; color: string } {
  if (days < 0)  return { label: "Overdue", color: "#c44b2a" };
  if (days === 0) return { label: "Due today!", color: "#c44b2a" };
  if (days === 1) return { label: "Due tomorrow", color: "#c97a1a" };
  if (days <= 3) return { label: `${days} days`, color: "#c97a1a" };
  if (days <= 7) return { label: `${days} days`, color: "#2d7a3c" };
  return { label: `${days} days`, color: "var(--ink-3)" };
}

const EMPTY: Omit<Deadline, "id" | "done"> = { title: "", date: "", time: "23:59", category: "assignment", priority: "medium", notes: "" };

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "done">("upcoming");
  const [catFilter, setCatFilter] = useState<Category | "all">("all");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try { const d = localStorage.getItem("ledger-deadlines"); if (d) setDeadlines(JSON.parse(d)); } catch {}
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  function save(list: Deadline[]) {
    setDeadlines(list);
    try { localStorage.setItem("ledger-deadlines", JSON.stringify(list)); } catch {}
  }

  function addDeadline() {
    if (!form.title.trim() || !form.date) return;
    save([...deadlines, { ...form, id: Date.now().toString(), done: false }]);
    setForm({ ...EMPTY }); setAdding(false);
  }

  function toggle(id: string) { save(deadlines.map(d => d.id === id ? { ...d, done: !d.done } : d)); }
  function remove(id: string) { save(deadlines.filter(d => d.id !== id)); }

  const visible = deadlines
    .filter(d => {
      if (catFilter !== "all" && d.category !== catFilter) return false;
      if (filter === "upcoming") return !d.done;
      if (filter === "done") return d.done;
      return true;
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(a.date + "T" + (a.time || "23:59")).getTime() - new Date(b.date + "T" + (b.time || "23:59")).getTime();
    });

  const overdue = deadlines.filter(d => !d.done && daysUntil(d.date, d.time) < 0).length;
  const dueThis7 = deadlines.filter(d => !d.done && daysUntil(d.date, d.time) >= 0 && daysUntil(d.date, d.time) <= 7).length;

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 26 · Deadline Hub</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {overdue > 0 && <span className="mono" style={{ color: "#c44b2a", fontSize: 11 }}>{overdue} overdue</span>}
          {dueThis7 > 0 && <span className="mono" style={{ color: "#c97a1a", fontSize: 11 }}>{dueThis7} this week</span>}
          <button className="btn" onClick={() => setAdding(true)}>+ Add deadline</button>
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>

        {/* Add form */}
        {adding && (
          <div style={{ border: "2px solid var(--ink)", padding: "24px", marginBottom: 32 }}>
            <div className="mono cin" style={{ marginBottom: 16 }}>New deadline</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Title *</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Chemistry exam, History essay…"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Date *</div>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Time</div>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Category</div>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
                  {(Object.keys(CAT_LABELS) as Category[]).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Priority</div>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Notes (optional)</div>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes…"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={addDeadline} disabled={!form.title.trim() || !form.date}>Save deadline</button>
              <button className="btn ghost" onClick={() => { setAdding(false); setForm({ ...EMPTY }); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {(["upcoming", "all", "done"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "6px 14px", border: "1px solid var(--ink)", background: filter === f ? "var(--ink)" : "var(--paper)", color: filter === f ? "var(--paper)" : "var(--ink)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {f}
            </button>
          ))}
          <div style={{ width: 1, background: "var(--rule)", margin: "0 4px" }} />
          {(["all", ...Object.keys(CAT_LABELS)] as (Category | "all")[]).map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "6px 14px", border: `1px solid ${c === "all" ? "var(--ink)" : CAT_COLORS[c as Category]}`, background: catFilter === c ? (c === "all" ? "var(--ink)" : CAT_COLORS[c as Category]) : "var(--paper)", color: catFilter === c ? "var(--paper)" : (c === "all" ? "var(--ink)" : CAT_COLORS[c as Category]), cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {c === "all" ? "All types" : CAT_LABELS[c as Category]}
            </button>
          ))}
        </div>

        {/* Deadline list */}
        {visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-3)" }}>
            {deadlines.length === 0 ? "No deadlines yet — add your first one." : "Nothing matches the current filter."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {visible.map((d, i) => {
              const days = daysUntil(d.date, d.time);
              const urg  = urgencyLabel(days);
              const color = CAT_COLORS[d.category];
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px", border: "1px solid var(--ink)", borderBottom: i < visible.length - 1 ? "none" : "1px solid var(--ink)", background: d.done ? "var(--paper-2)" : "var(--paper)", opacity: d.done ? 0.6 : 1 }}>
                  <button onClick={() => toggle(d.id)} style={{ width: 20, height: 20, border: `2px solid ${d.done ? "#2d7a3c" : "var(--ink)"}`, background: d.done ? "#2d7a3c" : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--paper)", fontSize: 11 }}>
                    {d.done ? "✓" : ""}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, textDecoration: d.done ? "line-through" : "none", color: d.done ? "var(--ink-3)" : "var(--ink)" }}>{d.title}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "2px 6px", background: color + "18", color, border: `1px solid ${color}40` }}>{CAT_LABELS[d.category]}</span>
                      {d.priority === "high" && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c44b2a" }}>HIGH PRIORITY</span>}
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        {new Date(d.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        {d.time && ` · ${d.time}`}
                      </span>
                      {!d.done && <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: urg.color }}>{urg.label}</span>}
                      {d.notes && <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>{d.notes}</span>}
                    </div>
                  </div>
                  <button onClick={() => remove(d.id)} style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "4px 6px", flexShrink: 0 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 26 of 30.</div>
        </div>
      </main>
    </div>
  );
}
