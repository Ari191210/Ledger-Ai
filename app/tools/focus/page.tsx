"use client";

import { useState } from "react";
import Link from "next/link";
import { useFocus, DURATIONS, MODE_LABELS } from "@/lib/focus-context";

type Mode = "work" | "break" | "longbreak";

export default function FocusPage() {
  const { mode, seconds, running, sessions, tasks, streak, switchMode, toggleRunning, reset, setTasks } = useFocus();
  const [newTask, setNewTask] = useState("");

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const progress = 1 - seconds / DURATIONS[mode];

  function addTask() {
    if (!newTask.trim()) return;
    setTasks((p) => [...p, { id: Date.now(), text: newTask.trim(), done: false }]);
    setNewTask("");
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Focus Dashboard</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Session {sessions + 1} · {sessions} completed today</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          {/* Timer */}
          <div>
            <div className="mono cin">α · Focus Timer</div>

            {/* Mode selector */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: "1px solid var(--ink)", marginTop: 14 }}>
              {(["work", "break", "longbreak"] as Mode[]).map((m, i) => (
                <button key={m} onClick={() => switchMode(m)}
                  style={{ padding: "12px 10px", background: mode === m ? "var(--ink)" : "var(--paper)", color: mode === m ? "var(--paper)" : "var(--ink)", border: "none", borderRight: i < 2 ? "1px solid var(--ink)" : "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Big timer */}
            <div style={{ textAlign: "center", padding: "48px 0 24px", border: "1px solid var(--ink)", borderTop: "none", background: "var(--paper-2)" }}>
              <div className="mob-timer" style={{ fontFamily: "var(--serif)", fontSize: 112, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1, color: mode === "work" ? "var(--ink)" : "var(--cinnabar-ink)" }}>
                {mm}:{ss}
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginTop: 8 }}>{MODE_LABELS[mode]}</div>

              {/* Progress bar */}
              <div style={{ margin: "20px 28px 0", height: 4, background: "var(--rule-2)", border: "1px solid var(--rule)" }}>
                <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--cinnabar)", transition: "width 1s linear" }} />
              </div>

              {/* Controls */}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                <button className="btn" onClick={toggleRunning} style={{ minWidth: 100 }}>
                  {running ? "Pause" : "Start"}
                </button>
                <button className="btn ghost" onClick={reset}>Reset</button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", borderTop: "none" }}>
              {[
                ["Sessions today", String(sessions)],
                ["Streak", `${streak} day${streak !== 1 ? "s" : ""}`],
              ].map(([label, val], i) => (
                <div key={i} style={{ padding: "16px 20px", borderRight: i === 0 ? "1px solid var(--ink)" : "none" }}>
                  <div className="mono" style={{ color: "var(--ink-3)" }}>{label}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Task list */}
          <div>
            <div className="mono cin" style={{ marginBottom: 14 }}>Tasks · This session</div>

            <div style={{ border: "1px solid var(--ink)" }}>
              {tasks.map((t, i) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < tasks.length - 1 ? "1px solid var(--rule)" : "none", background: t.done ? "var(--paper-2)" : "var(--paper)" }}>
                  <input type="checkbox" checked={t.done}
                    onChange={() => setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, done: !x.done } : x))}
                    style={{ accentColor: "var(--cinnabar-ink)", width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--sans)", fontSize: 14, flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--ink-3)" : "var(--ink)" }}>
                    {t.text}
                  </span>
                  <button onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕</button>
                </div>
              ))}

              <div style={{ display: "flex", gap: 0, borderTop: tasks.length ? "1px solid var(--rule)" : "none" }}>
                <input
                  value={newTask} onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                  placeholder="Add a task and press Enter…"
                  style={{ flex: 1, padding: "12px 16px", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "transparent", color: "var(--ink)", outline: "none" }}
                />
              </div>
            </div>

            <div style={{ marginTop: 24, padding: "16px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
              <div className="mono cin" style={{ marginBottom: 8 }}>Session guide</div>
              <ol style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)", margin: 0, paddingLeft: 16 }}>
                <li>Work for 25 minutes without distraction</li>
                <li>Take a 5-minute short break</li>
                <li>After 4 sessions, take a 20-minute long break</li>
                <li>Timer continues even when you switch tools</li>
              </ol>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
