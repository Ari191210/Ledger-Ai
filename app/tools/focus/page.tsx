"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData } from "@/lib/user-data";

type Mode = "work" | "break" | "longbreak";
type Task = { id: number; text: string; done: boolean };

const DURATIONS: Record<Mode, number> = { work: 25 * 60, break: 5 * 60, longbreak: 20 * 60 };
const MODE_LABELS: Record<Mode, string> = { work: "Work", break: "Short break", longbreak: "Long break" };

let taskId = 1;

export default function FocusPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("work");
  const [seconds, setSeconds] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([
    { id: taskId++, text: "Review chapter notes", done: false },
    { id: taskId++, text: "Solve 5 past-paper questions", done: false },
  ]);
  const [newTask, setNewTask] = useState("");
  const [streak, setStreak] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function loadStreak() {
      if (user) {
        const data = await loadUserData(user.id);
        if (data?.focus) {
          setStreak((data.focus as { streak: number }).streak ?? 0);
          return;
        }
      }
      const stored = localStorage.getItem("ledger-focus-streak");
      if (stored) setStreak(parseInt(stored, 10));
    }
    loadStreak();
  }, [user]);

  useEffect(() => {
    setSeconds(DURATIONS[mode]);
    setRunning(false);
  }, [mode]);

  const tick = useCallback(() => {
    setSeconds((s) => {
      if (s <= 1) {
        setRunning(false);
        if (mode === "work") {
          setSessions((n) => {
            const next = n + 1;
            if (next % 4 === 0) setMode("longbreak");
            else setMode("break");
            const today = new Date().toDateString();
            const last = localStorage.getItem("ledger-focus-last");
            const strk = parseInt(localStorage.getItem("ledger-focus-streak") || "0", 10);
            if (last !== today) {
              const newStreak = strk + 1;
              localStorage.setItem("ledger-focus-streak", String(newStreak));
              localStorage.setItem("ledger-focus-last", today);
              setStreak(newStreak);
              if (user) patchUserData(user.id, "focus", { streak: newStreak, lastDate: today });
            }
            return next;
          });
        } else {
          setMode("work");
        }
        return 0;
      }
      return s - 1;
    });
  }, [mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const progress = 1 - seconds / DURATIONS[mode];

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 05 · Focus Dashboard</div>
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
                <button key={m} onClick={() => setMode(m)}
                  style={{ padding: "12px 10px", background: mode === m ? "var(--ink)" : "var(--paper)", color: mode === m ? "var(--paper)" : "var(--ink)", border: "none", borderRight: i < 2 ? "1px solid var(--ink)" : "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Big timer display */}
            <div style={{ textAlign: "center", padding: "48px 0 24px", borderBottom: "1px solid var(--rule)", marginTop: 0, border: "1px solid var(--ink)", borderTop: "none", background: "var(--paper-2)" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 112, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1, color: mode === "work" ? "var(--ink)" : "var(--cinnabar-ink)" }}>
                {mm}:{ss}
              </div>
              <div className="mono" style={{ color: "var(--ink-3)", marginTop: 8 }}>{MODE_LABELS[mode]}</div>

              {/* Progress bar */}
              <div style={{ margin: "20px 28px 0", height: 4, background: "var(--rule-2)", border: "1px solid var(--rule)" }}>
                <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--cinnabar)", transition: "width 1s linear" }} />
              </div>

              {/* Controls */}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                <button className="btn" onClick={() => setRunning((r) => !r)} style={{ minWidth: 100 }}>
                  {running ? "Pause" : "Start"}
                </button>
                <button className="btn ghost" onClick={() => { setRunning(false); setSeconds(DURATIONS[mode]); }}>
                  Reset
                </button>
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
                  <input type="checkbox" checked={t.done} onChange={() => setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, done: !x.done } : x))}
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
                  onKeyDown={(e) => { if (e.key === "Enter" && newTask.trim()) { setTasks((p) => [...p, { id: taskId++, text: newTask.trim(), done: false }]); setNewTask(""); } }}
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
                <li>Repeat. One session = one block in your planner</li>
              </ol>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 05 of 10.</div>
        </div>
      </main>
    </div>
  );
}
