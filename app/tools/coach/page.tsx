"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Message = { role: "user" | "assistant"; text: string };
type Briefing = { greeting: string; priorities: { task: string; why: string }[]; insight: string; focus: string; warning: string | null };

function gatherContext() {
  const habits = (() => {
    try {
      const list = JSON.parse(localStorage.getItem("ledger-habits-list") || "[]");
      const log  = JSON.parse(localStorage.getItem("ledger-habits-log")  || "{}");
      const today = new Date().toISOString().slice(0, 10);
      return (list as { name: string }[]).slice(0, 8).map(h => ({ name: h.name, doneToday: !!(log[today] && log[today][h.name]) }));
    } catch { return []; }
  })();
  const streak = (() => { try { return parseInt(localStorage.getItem("ledger-focus-streak") || "0"); } catch { return 0; } })();
  const weakTopics = (() => { try { return JSON.parse(localStorage.getItem("ledger-weak-topics") || "[]"); } catch { return []; } })();
  const deadlines = (() => {
    try {
      const all = JSON.parse(localStorage.getItem("ledger-deadlines") || "[]");
      const today = new Date();
      return (all as { done: boolean; date: string; title: string; category: string }[])
        .filter(d => !d.done)
        .map(d => ({ title: d.title, daysLeft: Math.ceil((new Date(d.date).getTime() - today.getTime()) / 86400000), category: d.category }))
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);
    } catch { return []; }
  })();
  const recentSubjects = (() => { try { return JSON.parse(localStorage.getItem("ledger-notes-history") || "[]").slice(0, 5); } catch { return []; } })();
  return { habits, streak, weakTopics, deadlines, recentSubjects, date: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) };
}

export default function CoachPage() {
  const [briefing, setBriefing]     = useState<Briefing | null>(null);
  const [loading, setLoading]       = useState(false);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError]           = useState("");
  const [ctx, setCtx]               = useState<ReturnType<typeof gatherContext> | null>(null);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = gatherContext();
    setCtx(c);
    fetchBriefing(c);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchBriefing(c: ReturnType<typeof gatherContext>) {
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "coach_briefing", context: c });
      const data = await res.json();
      if (!res.ok || !data.greeting) { setError("Couldn't load briefing."); return; }
      setBriefing(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  async function sendChat() {
    if (!input.trim()) return;
    const msg = input.trim(); setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const res  = await callAI({ tool: "coach_chat", message: msg, context: ctx, history: messages.slice(-6).map(m => `${m.role === "user" ? "Student" : "Coach"}: ${m.text}`).join("\n") });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply || data.raw || "Try again." }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", text: "Network error." }]); }
    finally { setChatLoading(false); }
  }

  const SUGGESTIONS = ["What should I study today?", "How do I improve my weak topics?", "Give me a revision plan for next week."];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>AI Study Coach</div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-2)", marginTop: 3 }}>{ctx?.date || ""}</div>
        </div>
        <div style={{ padding: "6px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15 }}>🔥</span>
          <span className="mono" style={{ fontSize: 11 }}>{ctx?.streak || 0} day streak</span>
        </div>
      </header>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1 }}>
        {/* Briefing panel */}
        <div style={{ borderRight: "1px solid var(--ink)", padding: "32px 36px", overflowY: "auto" }}>
          <div className="mono cin" style={{ marginBottom: 16 }}>Today&apos;s Briefing</div>
          {loading && <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", padding: "40px 0" }}>Analysing your data…</div>}
          {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error} <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => ctx && fetchBriefing(ctx)}>Retry</button></div>}

          {briefing && !loading && (
            <>
              <div style={{ fontFamily: "var(--serif)", fontSize: 19, fontStyle: "italic", lineHeight: 1.5, marginBottom: 24 }}>{briefing.greeting}</div>

              <div style={{ marginBottom: 20 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10, letterSpacing: "0.08em" }}>TODAY&apos;S PRIORITIES</div>
                {briefing.priorities.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, padding: "12px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 10, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{p.task}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{p.why}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: "14px 16px", border: "2px solid var(--ink)", marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>INSIGHT</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic", lineHeight: 1.6 }}>{briefing.insight}</div>
              </div>

              <div style={{ padding: "12px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: briefing.warning ? 12 : 0 }}>
                <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 4 }}>FOCUS RECOMMENDATION</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{briefing.focus}</div>
              </div>

              {briefing.warning && (
                <div style={{ padding: "12px 14px", border: "1px solid var(--cinnabar-ink)", background: "rgba(196,75,42,0.05)" }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 4 }}>⚠ HEADS UP</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{briefing.warning}</div>
                </div>
              )}

              {ctx && ctx.weakTopics.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>WEAK AREAS TO REVISIT</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(ctx.weakTopics as string[]).slice(0, 6).map((t, i) => (
                      <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--cinnabar-ink)", color: "var(--cinnabar-ink)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 40, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>ASK YOUR COACH · Studies, schedule, strategy, anything</div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 300 }}>
            {messages.length === 0 && (
              <div style={{ color: "var(--ink-3)", fontFamily: "var(--sans)", fontSize: 13, textAlign: "center", paddingTop: 40 }}>
                Your coach is ready.
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => setInput(s)} style={{ fontFamily: "var(--sans)", fontSize: 12, padding: "8px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)", color: "var(--ink-2)", cursor: "pointer", textAlign: "left" }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "80%", padding: "10px 14px", background: m.role === "user" ? "var(--ink)" : "var(--paper-2)", color: m.role === "user" ? "var(--paper)" : "var(--ink)", border: m.role === "assistant" ? "1px solid var(--rule)" : "none", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>Thinking…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ borderTop: "1px solid var(--rule)", padding: "14px 16px", display: "flex", gap: 10 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Ask your coach…"
              style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", outline: "none" }} />
            <button className="btn" onClick={sendChat} disabled={chatLoading || !input.trim()}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
