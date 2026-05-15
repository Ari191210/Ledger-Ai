"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIOutput } from "@/components/ai-output";

type Task = { task: string; due: string; priority: "high" | "medium" | "low" };
type TimelineItem = { week: number; focus: string };
type Result = {
  institution: string;
  course: string;
  deadline: string;
  overview: string;
  requirements: string[];
  tasks: Task[];
  essayPrompts: string[];
  strengthsToHighlight: string[];
  weaknessesToAddress: string[];
  timeline: TimelineItem[];
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "var(--cinnabar-ink)",
  medium: "#c97a1a",
  low: "var(--ink-3)",
};

export default function ApplicationsPage() {
  const [institution, setInstitution] = useState("");
  const [course, setCourse]           = useState("");
  const [deadline, setDeadline]       = useState("");
  const [profile, setProfile]         = useState("");
  const [grades, setGrades]           = useState("");
  const [result, setResult]           = useState<Result | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [tab, setTab]                 = useState<"tasks" | "essays" | "timeline">("tasks");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!institution.trim() || !course.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callAI({
        tool: "application_plan",
        institution, course, deadline, profile, grades,
      });
      setResult(data as unknown as Result);
    } catch {
      setError("Failed to generate plan. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.08em" }}>
          ← Dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 12 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)", border: "1px solid var(--cinnabar-ink)", padding: "2px 6px" }}>FUTURE</span>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em" }}>Application Planner</h1>
        </div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.6 }}>
          Generate a structured, task-by-task application plan for any university.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 0 }}>
          <div style={{ padding: "16px 18px", borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>INSTITUTION *</label>
            <input
              value={institution} onChange={e => setInstitution(e.target.value)}
              placeholder="e.g. University of Edinburgh"
              style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" }}
              required
            />
          </div>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ink)" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>COURSE *</label>
            <input
              value={course} onChange={e => setCourse(e.target.value)}
              placeholder="e.g. BSc Computer Science"
              style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" }}
              required
            />
          </div>
          <div style={{ padding: "16px 18px", borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>DEADLINE</label>
            <input
              value={deadline} onChange={e => setDeadline(e.target.value)}
              placeholder="e.g. Jan 15, 2026"
              style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" }}
            />
          </div>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ink)" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>CURRENT GRADES</label>
            <input
              value={grades} onChange={e => setGrades(e.target.value)}
              placeholder="e.g. IB predicted 40/45, Maths HL 7"
              style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" }}
            />
          </div>
        </div>
        <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "16px 18px" }}>
          <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>YOUR PROFILE — activities, achievements, interests, why this course</label>
          <textarea
            value={profile} onChange={e => setProfile(e.target.value)}
            rows={4}
            placeholder="e.g. Physics Olympiad bronze, founded school coding club, interested in AI ethics, applied to 5 other UK unis…"
            style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none", resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        <button type="submit" disabled={loading || !institution.trim() || !course.trim()}
          className="btn" style={{ marginTop: 14, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Generating…" : "Generate Application Plan"}
        </button>
      </form>

      {loading && (
        <div style={{ marginTop: 32 }}>
          <AIThinking />
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>
      )}

      {result && (
        <div style={{ marginTop: 40 }}>
          {/* Overview */}
          <div style={{ border: "1px solid var(--ink)", padding: "20px 22px", marginBottom: 0, background: "var(--paper-2)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--cinnabar-ink)", marginBottom: 8 }}>{result.institution} · {result.course}</div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", margin: 0, lineHeight: 1.7 }}>{result.overview}</p>
          </div>

          {/* Requirements */}
          {result.requirements?.length > 0 && (
            <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "16px 22px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 10 }}>REQUIREMENTS</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {result.requirements.map((r, i) => (
                  <li key={i} style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", borderTop: "none" }}>
            <div style={{ padding: "16px 18px", borderRight: "1px solid var(--ink)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 10 }}>STRENGTHS TO HIGHLIGHT</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {(result.strengthsToHighlight ?? []).map((s, i) => (
                  <li key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#2d7a3c", flexShrink: 0 }}>+</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 10 }}>WEAKNESSES TO ADDRESS</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {(result.weaknessesToAddress ?? []).map((w, i) => (
                  <li key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>!</span><span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tabs: Tasks / Essays / Timeline */}
          <div style={{ display: "flex", border: "1px solid var(--ink)", borderTop: "none" }}>
            {(["tasks", "essays", "timeline"] as const).map((t, i) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "11px 0", background: tab === t ? "var(--ink)" : "var(--paper)", color: tab === t ? "var(--paper)" : "var(--ink)", border: "none", borderRight: i < 2 ? "1px solid var(--ink)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {t === "tasks" ? "Action List" : t === "essays" ? "Essay Prompts" : "Timeline"}
              </button>
            ))}
          </div>

          {tab === "tasks" && (
            <div style={{ border: "1px solid var(--ink)", borderTop: "none" }}>
              {(result.tasks ?? []).map((t, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, alignItems: "center", padding: "14px 18px", borderBottom: i < result.tasks.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)" }}>{t.task}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", whiteSpace: "nowrap" }}>{t.due}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: PRIORITY_COLOR[t.priority] ?? "var(--ink-3)", border: `1px solid ${PRIORITY_COLOR[t.priority] ?? "var(--rule)"}`, padding: "2px 6px", whiteSpace: "nowrap" }}>{t.priority}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "essays" && (
            <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "20px 22px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 14 }}>ESSAY PROMPTS TO PREPARE FOR</div>
              {(result.essayPrompts ?? []).map((p, i) => (
                <div key={i} style={{ borderLeft: "3px solid var(--cinnabar)", paddingLeft: 16, marginBottom: 16 }}>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", margin: 0, lineHeight: 1.65 }}>{p}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "timeline" && (
            <div style={{ border: "1px solid var(--ink)", borderTop: "none" }}>
              {(result.timeline ?? []).map((w, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 0, borderBottom: i < result.timeline.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <div style={{ padding: "14px 0 14px 18px", borderRight: "1px solid var(--rule)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)", display: "flex", alignItems: "center" }}>W{w.week}</div>
                  <div style={{ padding: "14px 18px", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)" }}>{w.focus}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
