"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";
import { type UserProfile } from "@/lib/user-data";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type RSection = { heading: string; content: string; keyPoints: string[] };
type ResearchData = {
  title: string; summary: string; sections: RSection[];
  keyArguments: string[]; counterArguments: string[];
  statistics: { stat: string; source: string }[];
  furtherReading: { title: string; author: string; why: string }[];
  essayAngles: string[];
};
type OutlineSection = { section: string; points: string[] };
type PlanOutput = { title: string; outline: OutlineSection[]; arguments: string[]; research: string[] };

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: "13px 20px", fontFamily: "var(--mono)", fontSize: 11,
  letterSpacing: "0.06em", textTransform: "uppercase" as const,
  background: active ? "var(--ink)" : "var(--paper)",
  color: active ? "var(--paper)" : "var(--ink-2)", border: "none", cursor: "pointer",
});

export default function ResearchHubPage() {
  const [mode, setMode] = useState<"research" | "plan">("research");

  // Research state
  const [query,    setQuery]    = useState("");
  const [subject,  setSubject]  = useState("");
  const [depth,    setDepth]    = useState("standard");
  const [purpose,  setPurpose]  = useState("essay");
  const [data,     setData]     = useState<ResearchData | null>(null);
  const [resLoading, setResLoading] = useState(false);
  const [resError,   setResError]   = useState("");
  const [resTab,     setResTab]     = useState<"overview"|"arguments"|"stats"|"angles">("overview");
  const [copied,     setCopied]     = useState(false);

  // Plan state
  const [brief,       setBrief]       = useState("");
  const [planSubject, setPlanSubject] = useState("");
  const [wordLimit,   setWordLimit]   = useState(1000);
  const [planOutput,  setPlanOutput]  = useState<PlanOutput | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError,   setPlanError]   = useState("");
  const [profile,     setProfile]     = useState<UserProfile>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ledger-profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  async function generateResearch() {
    if (!query.trim()) return;
    setResLoading(true); setResError(""); setData(null);
    try {
      const res = await callAI({ tool: "research", query, subject, depth, purpose });
      const d   = await res.json();
      if (!res.ok || !d.sections) { setResError("Could not generate — try again."); return; }
      setData(d); setResTab("overview");
    } catch { setResError("Network error."); }
    finally { setResLoading(false); }
  }

  function copyAll() {
    if (!data) return;
    const text = [
      `# ${data.title}`,
      `\n## Summary\n${data.summary}`,
      ...data.sections.map(s => `\n## ${s.heading}\n${s.content}\n\nKey points:\n${s.keyPoints.map(p => `- ${p}`).join("\n")}`),
      `\n## Key Arguments\n${data.keyArguments.map(a => `- ${a}`).join("\n")}`,
      `\n## Counter-Arguments\n${data.counterArguments.map(a => `- ${a}`).join("\n")}`,
      `\n## Statistics\n${data.statistics.map(s => `- ${s.stat} (${s.source})`).join("\n")}`,
      `\n## Essay Angles\n${data.essayAngles.map((a, i) => `${i+1}. ${a}`).join("\n")}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function generatePlan() {
    if (!brief.trim()) return;
    setPlanLoading(true); setPlanError(""); setPlanOutput(null);
    try {
      const syllabusSubjects = (() => { try { return JSON.parse(localStorage.getItem("ledger-syllabus-subjects") || "[]"); } catch { return []; } })();
      const res  = await callAI({ tool: "assignment", brief, subject: planSubject, wordLimit, ...profile, syllabusSubjects });
      const d    = await res.json();
      if (!res.ok) { setPlanError(d.error || "Something went wrong."); return; }
      setPlanOutput(d);
    } catch { setPlanError("Network error. Please try again."); }
    finally { setPlanLoading(false); }
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Research Hub</div>
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          <button onClick={() => setMode("research")} style={{ ...TAB_STYLE(mode === "research"), borderRight: "1px solid var(--rule)" }}>Research</button>
          <button onClick={() => setMode("plan")}     style={TAB_STYLE(mode === "plan")}>Plan Assignment</button>
        </div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>
          {mode === "research" ? "Arguments, evidence, angles" : "Brief → outline in 30 seconds"}
        </div>
      </header>

      {/* ── RESEARCH MODE ─────────────────────────────── */}
      {mode === "research" && !data && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Deep research, instantly</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any topic. Arguments, evidence, essay angles.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Research question or topic *</div>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="e.g. Does social media harm teenage mental health? · The causes of World War I…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject area</div>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Psychology, History…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Purpose</div>
              <select value={purpose} onChange={e => setPurpose(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
                <option value="essay">Essay / coursework</option>
                <option value="debate">Debate preparation</option>
                <option value="presentation">Presentation</option>
                <option value="revision">Exam revision</option>
                <option value="general">General learning</option>
              </select>
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Depth</div>
              <select value={depth} onChange={e => setDepth(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)" }}>
                <option value="overview">Quick overview</option>
                <option value="standard">Standard depth</option>
                <option value="deep">Deep dive</option>
              </select>
            </div>
          </div>
          {resError && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{resError}</div>}
          <button className="btn" onClick={generateResearch} disabled={resLoading || !query.trim()} style={{ width: "100%", opacity: resLoading ? 0.5 : 1, marginTop: 14 }}>
            {resLoading ? "Researching…" : "Start research →"}
          </button>
          {resLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {mode === "research" && data && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 20 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, fontStyle: "italic", lineHeight: 1.3 }}>{data.title}</div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={copyAll} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "7px 14px", border: "1px solid var(--ink)", background: copied ? "#2d7a3c" : "var(--paper)", color: copied ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                {copied ? "Copied ✓" : "Copy all"}
              </button>
              <button className="btn ghost" onClick={() => window.print()}>Print ↗</button>
              <button className="btn ghost" onClick={() => setData(null)}>New research</button>
            </div>
          </div>
          <div style={{ marginBottom: 32, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}><AIOutput text={data.summary} /></div>

          <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)", marginBottom: 28, width: "fit-content" }}>
            {([["overview","Overview"],["arguments","Arguments"],["stats","Stats & Evidence"],["angles","Essay Angles"]] as [typeof resTab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setResTab(t)}
                style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 10, background: resTab === t ? "var(--ink)" : "var(--paper)", color: resTab === t ? "var(--paper)" : "var(--ink)", border: "none", borderRight: "1px solid var(--ink)", cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                {label}
              </button>
            ))}
          </div>

          {resTab === "overview" && (
            <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
              <div>
                {data.sections.map((s, i) => (
                  <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < data.sections.length - 1 ? "none" : "1px solid var(--ink)", padding: "20px 22px" }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.heading}</div>
                    <div style={{ marginBottom: 12 }}><AIOutput text={s.content} /></div>
                    {s.keyPoints.length > 0 && (
                      <div>
                        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>KEY POINTS</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {s.keyPoints.map((p, j) => <li key={j} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 2 }}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {data.furtherReading.length > 0 && (
                <div style={{ border: "1px solid var(--ink)", padding: "16px" }}>
                  <div className="mono cin" style={{ marginBottom: 12 }}>Further reading</div>
                  {data.furtherReading.map((r, i) => (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < data.furtherReading.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.title}</div>
                      {r.author && <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>{r.author}</div>}
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{r.why}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {resTab === "arguments" && (
            <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ border: "1px solid #2d7a3c", padding: "20px" }}>
                <div className="mono" style={{ color: "#2d7a3c", marginBottom: 14 }}>FOR / Supporting arguments</div>
                {data.keyArguments.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <span className="mono" style={{ color: "#2d7a3c", flexShrink: 0 }}>→</span>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{a}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: "1px solid #c44b2a", padding: "20px" }}>
                <div className="mono" style={{ color: "#c44b2a", marginBottom: 14 }}>AGAINST / Counter-arguments</div>
                {data.counterArguments.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <span className="mono" style={{ color: "#c44b2a", flexShrink: 0 }}>→</span>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{a}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resTab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--ink)" }}>
              {data.statistics.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-3)" }}>No statistics generated for this topic.</div>
              ) : data.statistics.map((s, i) => (
                <div key={i} style={{ padding: "18px 20px", borderBottom: i < data.statistics.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 2 }}>{String(i+1).padStart(2,"0")}</span>
                  <div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, lineHeight: 1.5, marginBottom: 4 }}>{s.stat}</div>
                    {s.source && <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Source: {s.source}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {resTab === "angles" && (
            <div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", marginBottom: 20, lineHeight: 1.6 }}>
                Use these angles as essay thesis statements or presentation hooks. Each represents a distinct perspective on your topic.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--ink)" }}>
                {data.essayAngles.map((a, i) => (
                  <div key={i} style={{ padding: "20px 22px", borderBottom: i < data.essayAngles.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 4, fontSize: 12 }}>#{i+1}</span>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.6, fontStyle: "italic" }}>{a}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {/* ── PLAN MODE ─────────────────────────────────────── */}
      {mode === "plan" && (
        <TierGate requires="pro">
          <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
            <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (planOutput || planLoading) ? "1fr 1.4fr" : "1fr", gap: 48, maxWidth: (planOutput || planLoading) ? "100%" : 680 }}>
              <div>
                {profile.grade && (
                  <div style={{ marginBottom: 14, padding: "8px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 10, alignItems: "center" }}>
                    <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Profile</div>
                    <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{profile.grade}{profile.board ? ` · ${profile.board}` : ""}{profile.stream ? ` · ${profile.stream}` : ""}</div>
                    <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginLeft: "auto" }}>Writing style matched to your board</div>
                  </div>
                )}
                <div className="mono cin" style={{ marginBottom: 14 }}>Your assignment brief</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 10 }}>
                  <input value={planSubject} onChange={e => setPlanSubject(e.target.value)} placeholder="Subject (e.g. History, Economics)"
                    style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)" }} />
                  <input type="number" value={wordLimit} onChange={e => setWordLimit(+e.target.value)} placeholder="Words"
                    style={{ fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)" }} />
                </div>
                <textarea value={brief} onChange={e => setBrief(e.target.value)}
                  placeholder={"Paste or type your assignment brief.\n\nExamples:\n— Analyse the causes and consequences of the French Revolution.\n— Compare and contrast two economic models of development.\n— Evaluate the impact of social media on teenage mental health."}
                  rows={12}
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button className="btn" onClick={generatePlan} disabled={planLoading || !brief.trim()} style={{ opacity: planLoading || !brief.trim() ? 0.5 : 1 }}>
                    {planLoading ? "Planning…" : "Plan assignment →"}
                  </button>
                  {planOutput && <button className="btn ghost" onClick={() => { setPlanOutput(null); setBrief(""); }}>Clear</button>}
                </div>
                {planError && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{planError}</div>}
              </div>

              {planLoading && !planOutput && <div style={{ paddingTop: 40 }}><AIThinking /></div>}
              {planOutput && (
                <div>
                  <div style={{ padding: "20px 20px 16px", border: "1px solid var(--ink)", borderBottom: "none", background: "var(--paper-2)" }}>
                    <div className="mono cin" style={{ marginBottom: 8 }}>Suggested title</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{planOutput.title}</div>
                  </div>
                  <div style={{ border: "1px solid var(--ink)", borderBottom: "none" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}><div className="mono cin">Outline</div></div>
                    {planOutput.outline.map((sec, i) => (
                      <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                          <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8 }}>{String(i+1).padStart(2,"0")}</span>{sec.section}
                        </div>
                        <ul style={{ margin: "0 0 0 28px", padding: 0 }}>
                          {sec.points.map((p, j) => <li key={j} style={{ fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: 2 }}>{p}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: "1px solid var(--ink)", borderBottom: "none" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}><div className="mono cin">Argument angles</div></div>
                    {planOutput.arguments.map((arg, i) => (
                      <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid var(--rule)", display: "flex", gap: 12 }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{arg}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: "1px solid var(--ink)" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}><div className="mono cin">Research directions</div></div>
                    {planOutput.research.map((r, i) => (
                      <div key={i} style={{ padding: "12px 20px", borderBottom: i < planOutput.research.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 12 }}>
                        <span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
              <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
              <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
            </div>
          </main>
        </TierGate>
      )}
    </div>
  );
}
