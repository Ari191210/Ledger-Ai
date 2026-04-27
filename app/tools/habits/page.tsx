"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Habit = { id: string; name: string; emoji: string; target: number };
type Log = Record<string, Record<string, number>>; // habitId -> dateStr -> count

const DEFAULT_HABITS: Habit[] = [
  { id: "read",     name: "Read / review notes", emoji: "📖", target: 1 },
  { id: "practice", name: "Practice problems",   emoji: "✏️", target: 1 },
  { id: "revise",   name: "Active recall / flashcards", emoji: "🃏", target: 1 },
  { id: "nophone",  name: "Phone-free study hour", emoji: "📵", target: 1 },
  { id: "sleep",    name: "8 hours sleep",        emoji: "🌙", target: 1 },
];

function dateStr(d: Date) { return d.toISOString().split("T")[0]; }
function last14() { return Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return dateStr(d); }); }

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [log, setLog]       = useState<Log>({});
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("⭐");
  const today = dateStr(new Date());
  const dates  = last14();

  useEffect(() => {
    try {
      const h = localStorage.getItem("ledger-habits-list");
      const l = localStorage.getItem("ledger-habits-log");
      if (h) setHabits(JSON.parse(h));
      if (l) setLog(JSON.parse(l));
    } catch {}
  }, []);

  function save(h: Habit[], l: Log) {
    setHabits(h); setLog(l);
    try { localStorage.setItem("ledger-habits-list", JSON.stringify(h)); localStorage.setItem("ledger-habits-log", JSON.stringify(l)); } catch {}
  }

  function toggle(habitId: string, date: string) {
    const newLog = { ...log, [habitId]: { ...(log[habitId] || {}), [date]: log[habitId]?.[date] ? 0 : 1 } };
    save(habits, newLog);
  }

  function addHabit() {
    if (!newName.trim()) return;
    const h: Habit = { id: Date.now().toString(), name: newName.trim(), emoji: newEmoji, target: 1 };
    save([...habits, h], log);
    setNewName(""); setNewEmoji("⭐");
  }

  function removeHabit(id: string) { save(habits.filter(h => h.id !== id), log); }

  function streak(habitId: string): number {
    let s = 0;
    const d = new Date();
    while (true) {
      if (log[habitId]?.[dateStr(d)]) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  }

  function weekScore(): number {
    const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return dateStr(d); });
    const done  = habits.reduce((acc, h) => acc + week.filter(d => log[h.id]?.[d]).length, 0);
    return Math.round((done / (habits.length * 7)) * 100);
  }

  const score = weekScore();

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 25 · Habit Tracker</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="mono" style={{ color: score >= 70 ? "#2d7a3c" : score >= 40 ? "#c97a1a" : "var(--cinnabar-ink)" }}>This week: {score}%</span>
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Today's habits */}
        <div className="mono cin" style={{ marginBottom: 12 }}>Today — {new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" })}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 36 }}>
          {habits.map(h => {
            const done = !!log[h.id]?.[today];
            const s    = streak(h.id);
            return (
              <button key={h.id} onClick={() => toggle(h.id, today)}
                style={{ padding: "20px 16px", border: `2px solid ${done ? "#2d7a3c" : "var(--ink)"}`, background: done ? "#2d7a3c" : "var(--paper)", cursor: "pointer", textAlign: "left", transition: "all 150ms" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{h.emoji}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: done ? "var(--paper)" : "var(--ink)", lineHeight: 1.3, marginBottom: 6 }}>{h.name}</div>
                <div className="mono" style={{ fontSize: 9, color: done ? "rgba(255,255,255,0.7)" : "var(--ink-3)" }}>{s > 0 ? `${s} day streak 🔥` : "Not done yet"}</div>
              </button>
            );
          })}
        </div>

        {/* 14-day grid */}
        <div className="mono cin" style={{ marginBottom: 12 }}>14-day history</div>
        <div style={{ overflowX: "auto", marginBottom: 36 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 12px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal", width: 180 }}>Habit</th>
                {dates.map(d => (
                  <th key={d} style={{ padding: "6px 4px", textAlign: "center", fontFamily: "var(--mono)", fontSize: 8, color: d === today ? "var(--cinnabar-ink)" : "var(--ink-3)", fontWeight: d === today ? 700 : "normal" }}>
                    {new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short" }).replace(" ", "\n")}
                  </th>
                ))}
                <th style={{ padding: "6px 8px", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal" }}>Streak</th>
              </tr>
            </thead>
            <tbody>
              {habits.map(h => (
                <tr key={h.id}>
                  <td style={{ padding: "6px 12px", fontFamily: "var(--sans)", fontSize: 12 }}>{h.emoji} {h.name}</td>
                  {dates.map(d => {
                    const done = !!log[h.id]?.[d];
                    return (
                      <td key={d} onClick={() => toggle(h.id, d)} style={{ padding: "4px", textAlign: "center", cursor: "pointer" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 2, background: done ? "#2d7a3c" : d === today ? "var(--paper-2)" : "var(--paper)", border: `1px solid ${done ? "#2d7a3c" : "var(--rule)"}`, margin: "0 auto" }} />
                      </td>
                    );
                  })}
                  <td style={{ padding: "6px 8px", textAlign: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)" }}>{streak(h.id) > 0 ? `${streak(h.id)}🔥` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add habit */}
        <div className="mono cin" style={{ marginBottom: 10 }}>Add a habit</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} style={{ width: 50, fontFamily: "var(--sans)", fontSize: 18, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)", textAlign: "center" }} />
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addHabit()} placeholder="Habit name…"
            style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)" }} />
          <button className="btn" onClick={addHabit} disabled={!newName.trim()} style={{ opacity: newName.trim() ? 1 : 0.4 }}>Add</button>
        </div>
        {habits.length > DEFAULT_HABITS.length && (
          <div style={{ marginTop: 16 }}>
            {habits.slice(DEFAULT_HABITS.length).map(h => (
              <button key={h.id} onClick={() => removeHabit(h.id)} style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "1px solid var(--rule)", padding: "4px 10px", cursor: "pointer", color: "var(--ink-3)", marginRight: 6, marginTop: 6 }}>
                {h.emoji} {h.name} ✕
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 25 of 30.</div>
        </div>
      </main>
    </div>
  );
}
