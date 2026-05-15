"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useFocus, DURATIONS, MODE_LABELS } from "@/lib/focus-context";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

// ── Tab: Focus Timer ───────────────────────────────────────────────────────────

type FocusMode = "work" | "break" | "longbreak";

function FocusTab() {
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
      <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 16 }}>Session {sessions + 1} · {sessions} completed today</div>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        {/* Timer */}
        <div>
          <div className="mono cin">α · Focus Timer</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: "1px solid var(--ink)", marginTop: 14 }}>
            {(["work", "break", "longbreak"] as FocusMode[]).map((m, i) => (
              <button key={m} onClick={() => switchMode(m)}
                style={{ padding: "12px 10px", background: mode === m ? "var(--ink)" : "var(--paper)", color: mode === m ? "var(--paper)" : "var(--ink)", border: "none", borderRight: i < 2 ? "1px solid var(--ink)" : "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <div style={{ textAlign: "center", padding: "48px 0 24px", border: "1px solid var(--ink)", borderTop: "none", background: "var(--paper-2)" }}>
            <div className="mob-timer" style={{ fontFamily: "var(--serif)", fontSize: 112, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1, color: mode === "work" ? "var(--ink)" : "var(--cinnabar-ink)" }}>
              {mm}:{ss}
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 8 }}>{MODE_LABELS[mode]}</div>

            <div style={{ margin: "20px 28px 0", height: 4, background: "var(--rule-2)", border: "1px solid var(--rule)" }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--cinnabar)", transition: "width 1s linear" }} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
              <button className="btn" onClick={toggleRunning} style={{ minWidth: 100, cursor: "pointer" }}>
                {running ? "Pause" : "Start"}
              </button>
              <button className="btn ghost" onClick={reset} style={{ cursor: "pointer" }}>Reset</button>
            </div>
          </div>

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
    </div>
  );
}

// ── Circuit Breaker shared types ───────────────────────────────────────────────

type BreakResult = {
  micro_task: string;
  why_it_works: string;
  follow_up_nudge: string;
};

function CircuitTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(false);

  useEffect(() => {
    if (left <= 0) {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
      return;
    }
    const id = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onDone]);

  const pct = ((seconds - left) / seconds) * 100;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={160} height={160} style={{ display: "block", margin: "0 auto 16px", transform: "rotate(-90deg)" }}>
        <circle cx={80} cy={80} r={70} fill="none" stroke="var(--rule)" strokeWidth={6} />
        <circle
          cx={80} cy={80} r={70} fill="none"
          stroke="var(--cinnabar-ink)" strokeWidth={6}
          strokeDasharray={`${2 * Math.PI * 70}`}
          strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--ink)" }}>
        {mm}:{ss}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>Keep going</div>
    </div>
  );
}

// ── Tab: Circuit Breaker ───────────────────────────────────────────────────────

function CircuitBreakerTab() {
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BreakResult | null>(null);
  const [phase, setPhase] = useState<"input" | "task" | "timer" | "done">("input");
  const [error, setError] = useState("");

  async function breakCircuit() {
    if (!subject.trim()) { setError("What are you supposed to be studying?"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await callAI({ tool: "circuit_breaker", subject: subject.trim(), context: context.trim() }) as unknown as BreakResult;
      if (!res?.micro_task) { setError("Try again."); return; }
      setResult(res);
      setPhase("task");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSubject("");
    setContext("");
    setResult(null);
    setPhase("input");
    setError("");
  }

  if (phase === "done" && result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", textAlign: "center", minHeight: 400 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 700, lineHeight: 1, color: "var(--ink)", marginBottom: 16 }}>
          Circuit broken.
        </div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", maxWidth: 400, lineHeight: 1.7, marginBottom: 32 }}>
          {result.follow_up_nudge}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn" onClick={() => setPhase("task")} style={{ cursor: "pointer" }}>Back to task</button>
          <button className="btn ghost" onClick={reset} style={{ cursor: "pointer" }}>New circuit</button>
        </div>
      </div>
    );
  }

  if (phase === "timer" && result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", minHeight: 400 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24, textAlign: "center" }}>
          Your 2-minute task
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700, lineHeight: 1.3, color: "var(--ink)", maxWidth: 460, textAlign: "center", marginBottom: 40 }}>
          {result.micro_task}
        </div>
        <CircuitTimer seconds={120} onDone={() => setPhase("done")} />
        <button onClick={() => setPhase("done")} style={{ marginTop: 32, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 18px", border: "1px solid var(--rule)", background: "transparent", color: "var(--ink-3)", cursor: "pointer" }}>
          Done early
        </button>
      </div>
    );
  }

  if (phase === "task" && result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", maxWidth: 560, margin: "0 auto", minHeight: 400 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 20 }}>
          2-minute micro task
        </div>

        <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: "var(--ink)", textAlign: "center", marginBottom: 32, letterSpacing: "-0.01em" }}>
          {result.micro_task}
        </div>

        <div style={{ background: "var(--paper-2)", border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 32, width: "100%", boxSizing: "border-box" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Why this works</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{result.why_it_works}</div>
        </div>

        <button className="btn" onClick={() => setPhase("timer")} style={{ width: "100%", marginBottom: 10, cursor: "pointer" }}>
          Start 2-minute timer →
        </button>
        <button className="btn ghost" onClick={reset} style={{ width: "100%", fontSize: 11, cursor: "pointer" }}>New circuit</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", maxWidth: 480, margin: "0 auto", minHeight: 400 }}>
      <div style={{ width: "100%", marginBottom: 40 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 700, lineHeight: 1.0, color: "var(--ink)", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          Can&rsquo;t start?
        </h1>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>
          Tell me what you&rsquo;re avoiding. I&rsquo;ll give you one 2-minute task to break the block. That&rsquo;s it.
        </p>
      </div>

      <div style={{ width: "100%", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>What are you supposed to be studying?</div>
        <input
          autoFocus
          value={subject}
          onChange={e => setSubject(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") breakCircuit(); }}
          placeholder="e.g. Organic Chemistry, Chapter 3"
          style={{ width: "100%", padding: "14px 16px", border: "1px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 15, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ width: "100%", marginBottom: 28 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Why are you stuck? (optional)</div>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={2}
          placeholder="e.g. I&apos;ve been staring at it for 30 minutes and nothing is going in"
          style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, resize: "none", boxSizing: "border-box" }}
        />
      </div>

      {error && <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--cinnabar-ink)", marginBottom: 14, padding: "10px 14px", border: "1px solid var(--cinnabar-ink)", width: "100%", boxSizing: "border-box" }}>{error}</div>}
      {loading && <div style={{ marginBottom: 16, width: "100%" }}><AIThinking /></div>}

      <button className="btn" onClick={breakCircuit} disabled={loading} style={{ width: "100%", padding: "16px", fontSize: 13, cursor: "pointer" }}>
        {loading ? "Finding your first step…" : "Break the circuit →"}
      </button>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

type Tab = "focus" | "breaker";
const TABS: [Tab, string][] = [["focus", "Focus Timer"], ["breaker", "Circuit Breaker"]];

export default function FocusLabPage() {
  const [tab, setTab] = useState<Tab>("focus");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Focus Lab</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Pomodoro timer and block-breaking in one place.</div>
        </div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i < TABS.length - 1 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "focus" && <FocusTab />}
        {tab === "breaker" && <CircuitBreakerTab />}
      </main>
    </div>
  );
}
