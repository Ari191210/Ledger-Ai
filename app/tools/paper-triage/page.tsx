"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type TopicStatus = "green" | "amber" | "red" | null;

type TopicMap = Record<string, TopicStatus>;

type SkipItem = {
  topic: string;
  reason: string;
};

type QuickRevisionItem = {
  topic: string;
  micro_task: string;
  minutes: number;
};

type DeepFocusItem = {
  topic: string;
  why_priority: string;
  micro_task: string;
  minutes: number;
};

type ScheduleBlock = {
  block: string;
  activity: string;
  topics: string[];
};

type TriagePlan = {
  skip: SkipItem[];
  quick_revision: QuickRevisionItem[];
  deep_focus: DeepFocusItem[];
  schedule: ScheduleBlock[];
  sleep_verdict: string;
};

const EXAM_OPTIONS = [
  "CBSE Class 12 – Physics",
  "CBSE Class 12 – Chemistry",
  "CBSE Class 12 – Mathematics",
  "CBSE Class 12 – Biology",
  "CBSE Class 12 – English",
  "CBSE Class 12 – Economics",
  "CBSE Class 12 – Accountancy",
  "CBSE Class 12 – Business Studies",
  "CBSE Class 12 – History",
  "CBSE Class 12 – Political Science",
  "CBSE Class 12 – Geography",
  "CBSE Class 12 – Computer Science",
  "JEE Mains – Physics",
  "JEE Mains – Chemistry",
  "JEE Mains – Mathematics",
  "JEE Advanced – Physics",
  "JEE Advanced – Chemistry",
  "JEE Advanced – Mathematics",
  "NEET – Physics",
  "NEET – Chemistry",
  "NEET – Biology (Botany)",
  "NEET – Biology (Zoology)",
  "IGCSE – Mathematics",
  "IGCSE – Physics",
  "IGCSE – Chemistry",
  "IGCSE – Biology",
  "IGCSE – Economics",
  "IGCSE – English Language",
  "IGCSE – History",
  "IGCSE – Computer Science",
];

const STORAGE_KEY = "paper_triage_plan";

export default function PaperTriagePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [exam, setExam] = useState("");
  const [hoursLeft, setHoursLeft] = useState(6);
  const [hoursSleep, setHoursSleep] = useState(6);
  const [topicList, setTopicList] = useState<string[]>([]);
  const [topicStatus, setTopicStatus] = useState<TopicMap>({});
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [plan, setPlan] = useState<TriagePlan | null>(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { plan: TriagePlan; windowMinutes: number; savedAt: number };
        const elapsed = Math.floor((Date.now() - parsed.savedAt) / 1000 / 60);
        const remaining = parsed.windowMinutes - elapsed;
        if (remaining > 0) {
          setPlan(parsed.plan);
          setCountdown(remaining * 60);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown]);

  const studyMinutes = Math.max(0, (hoursLeft - hoursSleep) * 60);

  function formatCountdown(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }

  async function fetchTopics() {
    if (!exam) {
      setError("Please select an exam.");
      return;
    }
    setError("");
    setLoadingTopics(true);
    try {
      const res = await callAI({ tool: "paper_triage", phase: "topics", exam });
      const data = await res.json();
      if (!res.ok || !data.topics) {
        setError(data.error || "Could not load topics.");
        return;
      }
      const topics: string[] = data.topics;
      setTopicList(topics);
      const initial: TopicMap = {};
      topics.forEach((t) => { initial[t] = null; });
      setTopicStatus(initial);
      setStep(2);
    } catch {
      setError("Network error loading topics.");
    } finally {
      setLoadingTopics(false);
    }
  }

  function setStatus(topic: string, status: TopicStatus) {
    setTopicStatus((prev) => ({ ...prev, [topic]: status }));
  }

  function cycleStatus(topic: string) {
    const current = topicStatus[topic];
    const next: TopicStatus = current === null ? "green" : current === "green" ? "amber" : current === "amber" ? "red" : null;
    setStatus(topic, next);
  }

  async function generatePlan() {
    const untouched = Object.values(topicStatus).filter((s) => s === null).length;
    if (untouched === topicList.length) {
      setError("Please rate at least a few topics before generating your plan.");
      return;
    }
    setError("");
    setLoadingPlan(true);
    try {
      const statusMap: Record<string, string> = {};
      Object.entries(topicStatus).forEach(([t, s]) => {
        statusMap[t] = s === "green" ? "confident" : s === "amber" ? "shaky" : s === "red" ? "not_touched" : "unrated";
      });
      const res = await callAI({
        tool: "paper_triage",
        phase: "plan",
        exam,
        studyWindowMinutes: studyMinutes,
        topicStatus: statusMap,
      });
      const data = await res.json();
      if (!res.ok || !data.schedule) {
        setError(data.error || "Could not generate triage plan.");
        return;
      }
      const triagePlan = data as TriagePlan;
      setPlan(triagePlan);
      setCountdown(studyMinutes * 60);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ plan: triagePlan, windowMinutes: studyMinutes, savedAt: Date.now() })
      );
    } catch {
      setError("Network error generating plan.");
    } finally {
      setLoadingPlan(false);
    }
  }

  function resetAll() {
    setPlan(null);
    setStep(1);
    setExam("");
    setHoursLeft(6);
    setHoursSleep(6);
    setTopicList([]);
    setTopicStatus({});
    setCountdown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
    localStorage.removeItem(STORAGE_KEY);
  }

  if (plan) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", paddingBottom: 100 }}>
        <header style={{ padding: "24px 44px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
            <div style={{ width: 1, height: 16, background: "var(--rule)" }} />
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>Paper Panic Triage · {exam}</div>
          </div>
          <button
            onClick={resetAll}
            style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "8px 16px", border: "1px solid var(--ink)", background: "none", color: "var(--ink)", cursor: "pointer" }}
          >
            New Triage
          </button>
        </header>

        <main style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Your Attack Plan</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>
              Study window: {Math.floor(studyMinutes / 60)}h {studyMinutes % 60}m · {exam}
            </div>
          </div>

          {/* Sleep verdict */}
          <div style={{ marginBottom: 32, padding: "18px 22px", borderLeft: "3px solid var(--cinnabar)", background: "var(--paper-2)" }}>
            <AIOutput variant="principle" text={plan.sleep_verdict} />
          </div>

          {/* Skip section */}
          {plan.skip.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>
                Skip These Entirely
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.skip.map((item, i) => (
                  <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: "#ccc", marginTop: 5 }} />
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{item.topic}</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic", color: "var(--ink-2)", lineHeight: 1.6 }}>{item.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deep focus section */}
          {plan.deep_focus.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--cinnabar-ink)", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>
                🔥 Deep Focus — Ranked by Impact
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.deep_focus.map((item, i) => (
                  <div key={i} style={{ border: "2px solid var(--ink)", padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                        #{i + 1} — {item.topic}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", flexShrink: 0, marginLeft: 12 }}>{item.minutes} min</div>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", marginBottom: 8 }}>{item.why_priority}</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", lineHeight: 1.65, padding: "10px 14px", background: "var(--paper-2)", borderLeft: "2px solid var(--cinnabar)" }}>
                      {item.micro_task}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick revision section */}
          {plan.quick_revision.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>
                Quick Revision
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {plan.quick_revision.map((item, i) => (
                  <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--cinnabar-ink)", marginBottom: 2 }}>{item.minutes}m</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{item.topic}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{item.micro_task}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule */}
          {plan.schedule.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>
                Time-Boxed Schedule
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {plan.schedule.map((block, i) => (
                  <div key={i} style={{ borderLeft: "2px solid var(--ink)", padding: "14px 20px", marginBottom: 2, background: i % 2 === 0 ? "var(--paper)" : "var(--paper-2)" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{block.block}</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65, marginBottom: block.topics.length > 0 ? 8 : 0 }}>
                      {block.activity}
                    </div>
                    {block.topics.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {block.topics.map((t, j) => (
                          <span key={j} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-3)" }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Sticky countdown bar */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--ink)",
          color: "var(--paper)",
          padding: "14px 44px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 100,
        }}>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13 }}>Study window remaining</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700, color: countdown < 1800 ? "#ff6b6b" : "var(--paper)" }}>
            {countdown > 0 ? formatCountdown(countdown) : "Time's up — go to sleep."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <header style={{ padding: "24px 44px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
          <div style={{ width: 1, height: 16, background: "var(--rule)" }} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>Paper Panic Triage</div>
        </div>
      </header>

      <main style={{ padding: "40px 44px 80px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
            Paper Panic Triage
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7 }}>
            {"It's late. You have limited hours. Let's build a brutal, honest attack plan — what to skip, what to skim, and what to actually study."}
          </div>
        </div>

        {/* Step 1 — Exam selector */}
        <div style={{
          border: "2px solid var(--ink)",
          padding: "28px 28px",
          marginBottom: 20,
          opacity: step > 1 && exam ? 0.6 : 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              1
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>Which exam is tomorrow?</div>
          </div>

          <select
            value={exam}
            onChange={(e) => { setExam(e.target.value); setStep(1); setTopicList([]); setTopicStatus({}); }}
            disabled={step > 1 && loadingTopics}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontFamily: "var(--sans)",
              fontSize: 14,
              color: "var(--ink)",
              background: "var(--paper)",
              border: "1px solid var(--rule)",
              appearance: "none",
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            <option value="">Select exam / subject…</option>
            {EXAM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {step === 1 && (
            <button
              onClick={fetchTopics}
              disabled={!exam || loadingTopics}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                padding: "12px 28px",
                background: exam ? "var(--ink)" : "var(--rule)",
                color: exam ? "var(--paper)" : "var(--ink-3)",
                border: "none",
                cursor: exam ? "pointer" : "not-allowed",
                letterSpacing: "0.04em",
              }}
            >
              {loadingTopics ? "Loading topics…" : "Load Topic List →"}
            </button>
          )}

          {step === 1 && loadingTopics && (
            <div style={{ marginTop: 20 }}>
              <AIThinking />
            </div>
          )}

          {step > 1 && exam && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#4caf50" }}>✓</span> {exam}
              <button
                onClick={() => { setStep(1); setTopicList([]); setTopicStatus({}); }}
                style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "2px 8px", border: "1px solid var(--rule)", background: "none", color: "var(--ink-3)", cursor: "pointer", marginLeft: 8 }}
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Step 2 — Time input */}
        {step >= 2 && (
          <div style={{
            border: "2px solid var(--ink)",
            padding: "28px 28px",
            marginBottom: 20,
            opacity: step > 2 ? 0.6 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 28, height: 28, border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                2
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>How much time do you have?</div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>Hours left before you sleep</label>
                <div style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{hoursLeft}h</div>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={hoursLeft}
                onChange={(e) => setHoursLeft(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--cinnabar)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>1h</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>10h</span>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>Hours you want to sleep</label>
                <div style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{hoursSleep}h</div>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                value={hoursSleep}
                onChange={(e) => setHoursSleep(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--cinnabar)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>0h (no sleep)</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>8h</span>
              </div>
            </div>

            <div style={{ padding: "14px 18px", background: "var(--paper-2)", border: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>Your actual study window</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700, color: studyMinutes < 60 ? "var(--cinnabar)" : "var(--ink)" }}>
                {studyMinutes <= 0 ? "0 minutes 😬" : `${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m`}
              </div>
            </div>

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={studyMinutes <= 0}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  padding: "12px 28px",
                  background: studyMinutes > 0 ? "var(--ink)" : "var(--rule)",
                  color: studyMinutes > 0 ? "var(--paper)" : "var(--ink-3)",
                  border: "none",
                  cursor: studyMinutes > 0 ? "pointer" : "not-allowed",
                  letterSpacing: "0.04em",
                }}
              >
                Rate My Topics →
              </button>
            )}

            {step > 2 && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#4caf50" }}>✓</span> Study window: {Math.floor(studyMinutes / 60)}h {studyMinutes % 60}m
                <button
                  onClick={() => setStep(2)}
                  style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "2px 8px", border: "1px solid var(--rule)", background: "none", color: "var(--ink-3)", cursor: "pointer", marginLeft: 8 }}
                >
                  Change
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Topic grid */}
        {step >= 3 && topicList.length > 0 && (
          <div style={{ border: "2px solid var(--ink)", padding: "28px 28px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                3
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>Rate each topic honestly</div>
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginBottom: 20 }}>
              Tap each chip to cycle: <span style={{ color: "#4caf50", fontWeight: 600 }}>Green = Confident</span> · <span style={{ color: "#f59e0b", fontWeight: 600 }}>Amber = Shaky</span> · <span style={{ color: "#ef4444", fontWeight: 600 }}>Red = Not touched</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 28 }}>
              {topicList.map((topic) => {
                const status = topicStatus[topic];
                const bg = status === "green" ? "rgba(76,175,80,0.12)" : status === "amber" ? "rgba(245,158,11,0.12)" : status === "red" ? "rgba(239,68,68,0.12)" : "var(--paper-2)";
                const border = status === "green" ? "1.5px solid #4caf50" : status === "amber" ? "1.5px solid #f59e0b" : status === "red" ? "1.5px solid #ef4444" : "1px solid var(--rule)";
                const textColor = status === "green" ? "#4caf50" : status === "amber" ? "#f59e0b" : status === "red" ? "#ef4444" : "var(--ink-2)";
                return (
                  <button
                    key={topic}
                    onClick={() => cycleStatus(topic)}
                    style={{
                      background: bg,
                      border,
                      padding: "10px 12px",
                      fontFamily: "var(--sans)",
                      fontSize: 12,
                      color: textColor,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>

            {error && (
              <div style={{ marginBottom: 16, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar)" }}>
                {error}
              </div>
            )}

            <button
              onClick={generatePlan}
              disabled={loadingPlan}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                padding: "12px 28px",
                background: "var(--ink)",
                color: "var(--paper)",
                border: "none",
                cursor: loadingPlan ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
                opacity: loadingPlan ? 0.6 : 1,
              }}
            >
              {loadingPlan ? "Building your plan…" : "Generate Attack Plan →"}
            </button>

            {loadingPlan && (
              <div style={{ marginTop: 20 }}>
                <AIThinking />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}