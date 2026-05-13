"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

type BreakResult = {
  micro_task: string;
  why_it_works: string;
  follow_up_nudge: string;
};

function Timer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
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

export default function CircuitBreakerPage() {
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

  // Done screen
  if (phase === "done" && result) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700 }}>Circuit Breaker</div>
        </header>
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 700, lineHeight: 1, color: "var(--ink)", marginBottom: 16 }}>
            Circuit broken.
          </div>
          <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", maxWidth: 400, lineHeight: 1.7, marginBottom: 32 }}>
            {result.follow_up_nudge}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" onClick={() => setPhase("task")}>Back to task</button>
            <button className="btn ghost" onClick={reset}>New circuit</button>
          </div>
        </main>
      </div>
    );
  }

  // Timer screen
  if (phase === "timer" && result) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700 }}>Circuit Breaker</div>
        </header>
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24, textAlign: "center" }}>
            Your 2-minute task
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700, lineHeight: 1.3, color: "var(--ink)", maxWidth: 460, textAlign: "center", marginBottom: 40 }}>
            {result.micro_task}
          </div>
          <Timer seconds={120} onDone={() => setPhase("done")} />
          <button onClick={() => setPhase("done")} style={{ marginTop: 32, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 18px", border: "1px solid var(--rule)", background: "transparent", color: "var(--ink-3)", cursor: "pointer" }}>
            Done early
          </button>
        </main>
      </div>
    );
  }

  // Task screen
  if (phase === "task" && result) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700 }}>Circuit Breaker</div>
        </header>
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", maxWidth: 560, margin: "0 auto", width: "100%" }}>
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

          <button className="btn" onClick={() => setPhase("timer")} style={{ width: "100%", marginBottom: 10 }}>
            Start 2-minute timer →
          </button>
          <button className="btn ghost" onClick={reset} style={{ width: "100%", fontSize: 11 }}>New circuit</button>
        </main>
      </div>
    );
  }

  // Input screen
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em" }}>← Dashboard</Link>
          <span style={{ color: "var(--rule)" }}>|</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Plan</span>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>Circuit Breaker</div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
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
            placeholder="e.g. I've been staring at it for 30 minutes and nothing is going in"
            style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, resize: "none", boxSizing: "border-box" }}
          />
        </div>

        {error && <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--cinnabar-ink)", marginBottom: 14, padding: "10px 14px", border: "1px solid var(--cinnabar-ink)", width: "100%", boxSizing: "border-box" }}>{error}</div>}
        {loading && <div style={{ marginBottom: 16, width: "100%" }}><AIThinking /></div>}

        <button className="btn" onClick={breakCircuit} disabled={loading} style={{ width: "100%", padding: "16px", fontSize: 13 }}>
          {loading ? "Finding your first step…" : "Break the circuit →"}
        </button>
      </main>
    </div>
  );
}
