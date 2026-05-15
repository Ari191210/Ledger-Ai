"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

type Requirement = { requirement: string; studentStatus: "met" | "partial" | "missing" };
type RoadmapMonth = { month: string; actions: string[] };
type Result = {
  institution: string;
  course: string;
  applicationCycle: string;
  profileAssessment: string;
  requirements: Requirement[];
  roadmap: RoadmapMonth[];
  strengthenAreas: string[];
  essayTopics: string[];
  redFlags: string[];
  advice: string;
};

const STATUS_COLOR: Record<string, string> = {
  met:     "#2d7a3c",
  partial: "#c97a1a",
  missing: "var(--cinnabar-ink)",
};
const STATUS_LABEL: Record<string, string> = {
  met:     "Met",
  partial: "Partial",
  missing: "Missing",
};

export default function UniPrepPage() {
  const [institution, setInstitution] = useState("");
  const [course, setCourse]           = useState("");
  const [cycle, setCycle]             = useState("2026 entry");
  const [profile, setProfile]         = useState("");
  const [grades, setGrades]           = useState("");
  const [result, setResult]           = useState<Result | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [tab, setTab]                 = useState<"roadmap" | "reqs" | "essays">("reqs");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!institution.trim() || !course.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callAI({
        tool: "uni_prep",
        institution, course, cycle, profile, grades,
      });
      setResult(data as unknown as Result);
    } catch {
      setError("Failed to generate readiness report. Try again.");
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
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em" }}>University Prep</h1>
        </div>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.6 }}>
          Get an honest readiness assessment and a month-by-month preparation roadmap for your target university.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 0 }}>
          <div style={{ padding: "16px 18px", borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>TARGET INSTITUTION *</label>
            <input
              value={institution} onChange={e => setInstitution(e.target.value)}
              placeholder="e.g. Imperial College London"
              style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" }}
              required
            />
          </div>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ink)" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>COURSE *</label>
            <input
              value={course} onChange={e => setCourse(e.target.value)}
              placeholder="e.g. MEng Electrical Engineering"
              style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" }}
              required
            />
          </div>
          <div style={{ padding: "16px 18px", borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>APPLICATION CYCLE</label>
            <input
              value={cycle} onChange={e => setCycle(e.target.value)}
              placeholder="e.g. 2026 entry"
              style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" }}
            />
          </div>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ink)" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>PREDICTED / CURRENT GRADES</label>
            <input
              value={grades} onChange={e => setGrades(e.target.value)}
              placeholder="e.g. A-Level predicted A*A*A (Maths, Physics, CS)"
              style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none" }}
            />
          </div>
        </div>
        <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "16px 18px" }}>
          <label style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>YOUR PROFILE — ECs, competitions, work experience, motivations</label>
          <textarea
            value={profile} onChange={e => setProfile(e.target.value)}
            rows={4}
            placeholder="e.g. Robotic club president, UKMT Intermediate Gold, internship at local tech firm, strong interest in renewable energy systems…"
            style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", outline: "none", resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        <button type="submit" disabled={loading || !institution.trim() || !course.trim()}
          className="btn" style={{ marginTop: 14, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Generating…" : "Assess My Readiness"}
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
          {/* Profile assessment */}
          <div style={{ border: "1px solid var(--ink)", padding: "20px 22px", background: "var(--paper-2)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--cinnabar-ink)", marginBottom: 8 }}>
              {result.institution} · {result.course} · {result.applicationCycle}
            </div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", margin: 0, lineHeight: 1.7 }}>{result.profileAssessment}</p>
          </div>

          {/* Red flags */}
          {result.redFlags?.length > 0 && (
            <div style={{ border: "1px solid var(--cinnabar-ink)", borderTop: "none", padding: "14px 22px", background: "rgba(180,50,30,0.04)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--cinnabar-ink)", marginBottom: 8 }}>RED FLAGS</div>
              {result.redFlags.map((f, i) => (
                <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)", marginBottom: 4 }}>⚠ {f}</div>
              ))}
            </div>
          )}

          {/* Insider advice */}
          <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "16px 22px", borderLeft: "4px solid var(--cinnabar-ink)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-3)", marginBottom: 6 }}>INSIDER ADVICE</div>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, color: "var(--ink)", margin: 0, lineHeight: 1.7 }}>{result.advice}</p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", border: "1px solid var(--ink)", borderTop: "none" }}>
            {(["reqs", "roadmap", "essays"] as const).map((t, i) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "11px 0", background: tab === t ? "var(--ink)" : "var(--paper)", color: tab === t ? "var(--paper)" : "var(--ink)", border: "none", borderRight: i < 2 ? "1px solid var(--ink)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {t === "reqs" ? "Requirements" : t === "roadmap" ? "Roadmap" : "Essay Angles"}
              </button>
            ))}
          </div>

          {tab === "reqs" && (
            <div style={{ border: "1px solid var(--ink)", borderTop: "none" }}>
              {(result.requirements ?? []).map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", padding: "13px 18px", borderBottom: i < result.requirements.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)" }}>{r.requirement}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: STATUS_COLOR[r.studentStatus] ?? "var(--ink-3)", border: `1px solid ${STATUS_COLOR[r.studentStatus] ?? "var(--rule)"}`, padding: "2px 7px", whiteSpace: "nowrap" }}>
                    {STATUS_LABEL[r.studentStatus] ?? r.studentStatus}
                  </span>
                </div>
              ))}
              {/* Strengthen areas */}
              {result.strengthenAreas?.length > 0 && (
                <div style={{ padding: "14px 18px", borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-3)", marginBottom: 8 }}>AREAS TO STRENGTHEN</div>
                  {result.strengthenAreas.map((a, i) => (
                    <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", marginBottom: 5, display: "flex", gap: 8 }}>
                      <span style={{ color: "#c97a1a" }}>→</span><span>{a}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "roadmap" && (
            <div style={{ border: "1px solid var(--ink)", borderTop: "none" }}>
              {(result.roadmap ?? []).map((m, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 0, borderBottom: i < result.roadmap.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <div style={{ padding: "14px 16px", borderRight: "1px solid var(--rule)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)", display: "flex", alignItems: "flex-start", paddingTop: 16 }}>{m.month}</div>
                  <div style={{ padding: "14px 18px" }}>
                    {m.actions.map((a, j) => (
                      <div key={j} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", marginBottom: j < m.actions.length - 1 ? 7 : 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: "var(--ink-3)", flexShrink: 0 }}>·</span><span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "essays" && (
            <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "20px 22px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", marginBottom: 14 }}>PERSONAL STATEMENT ANGLES</div>
              {(result.essayTopics ?? []).map((t, i) => (
                <div key={i} style={{ borderLeft: "3px solid var(--cinnabar)", paddingLeft: 16, marginBottom: 16 }}>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", margin: 0, lineHeight: 1.65 }}>{t}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
