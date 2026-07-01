"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";
import { useUserLevel } from "@/hooks/use-user-level";
import { type UserProfile } from "@/lib/user-data";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ── Types ──────────────────────────────────────────────────────────────────

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

type DebateOutput = {
  motion: string;
  for: { argument: string; evidence: string; rebuttal: string }[];
  against: { argument: string; evidence: string; rebuttal: string }[];
  keyTerms: { term: string; def: string }[];
  practiceQs: string[];
};

type Slide = { title: string; bullets: string[]; speakerNote: string };
type Deck = { title: string; slides: Slide[]; advice: string };

// ── Tab: Research Hub ──────────────────────────────────────────────────────

function ResearchTab() {
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
      const d = await callAIOrThrow<ResearchData>({ tool: "research", query, subject, depth, purpose, level: profile.grade });
      if (!d.sections) { setResError("Could not generate — try again."); return; }
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
      const d = await callAIOrThrow<PlanOutput>({ tool: "assignment", brief, subject: planSubject, wordLimit, ...profile, syllabusSubjects });
      setPlanOutput(d);
    } catch { setPlanError("Network error. Please try again."); }
    finally { setPlanLoading(false); }
  }

  const subTabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "13px 20px", fontFamily: "var(--mono)", fontSize: 11,
    letterSpacing: "0.06em", textTransform: "uppercase" as const,
    background: active ? "var(--ink)" : "transparent",
    color: active ? "var(--paper)" : "var(--ink-2)", border: "none", borderRadius: 8, cursor: "pointer", transition: "background 160ms, color 160ms",
  });

  return (
    <div>
      {/* Sub-mode switcher */}
      <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const, marginBottom: 28, width: "fit-content" }}>
        <button onClick={() => setMode("research")} style={subTabStyle(mode === "research")}>Research</button>
        <button onClick={() => setMode("plan")}     style={subTabStyle(mode === "plan")}>Plan Assignment</button>
      </div>

      {/* ── RESEARCH: input ── */}
      {mode === "research" && !data && (
        <div style={{ maxWidth: 680 }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Deep research, instantly</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any topic. Arguments, evidence, essay angles.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Research question or topic *</div>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="e.g. Does social media harm teenage mental health? &middot; The causes of World War I&hellip;"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject area</div>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Psychology, History&hellip;"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Purpose</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {([["essay","Essay / coursework"],["debate","Debate prep"],["presentation","Presentation"],["revision","Exam revision"],["general","General"]] as [string,string][]).map(([v,l]) => (
                  <button key={v} onClick={() => setPurpose(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${purpose === v ? "var(--ink)" : "var(--rule)"}`, background: purpose === v ? "var(--ink)" : "var(--paper)", color: purpose === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Depth</div>
              <div style={{ display: "flex", gap: 4 }}>
                {([["overview","Overview"],["standard","Standard"],["deep","Deep dive"]] as [string,string][]).map(([v,l]) => (
                  <button key={v} onClick={() => setDepth(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${depth === v ? "var(--ink)" : "var(--rule)"}`, background: depth === v ? "var(--ink)" : "var(--paper)", color: depth === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          {resError && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{resError}</div>}
          <button className="btn" onClick={generateResearch} disabled={resLoading || !query.trim()} style={{ width: "100%", opacity: resLoading ? 0.5 : 1, marginTop: 14, cursor: "pointer" }}>
            {resLoading ? "Researching…" : "Start research →"}
          </button>
          {resLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </div>
      )}

      {/* ── RESEARCH: results ── */}
      {mode === "research" && data && (
        <div style={{ maxWidth: 1100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 20 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, fontStyle: "italic", lineHeight: 1.3 }}>{data.title}</div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={copyAll} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "7px 14px", border: "none", background: copied ? "var(--sage)" : "var(--paper)", color: copied ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                {copied ? "Copied ✓" : "Copy all"}
              </button>
              <button className="btn ghost" onClick={() => window.print()} style={{ cursor: "pointer" }}>Print ↗</button>
              <button className="btn ghost" onClick={() => setData(null)} style={{ cursor: "pointer" }}>New research</button>
            </div>
          </div>
          <div style={{ marginBottom: 32, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}><AIOutput text={data.summary} /></div>

          <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const, marginBottom: 28, width: "fit-content" }}>
            {([["overview","Overview"],["arguments","Arguments"],["stats","Stats & Evidence"],["angles","Essay Angles"]] as [typeof resTab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setResTab(t)}
                style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 10, background: resTab === t ? "var(--ink)" : "var(--paper)", color: resTab === t ? "var(--paper)" : "var(--ink)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                {label}
              </button>
            ))}
          </div>

          {resTab === "overview" && (
            <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
              <div>
                {data.sections.map((s, i) => (
                  <div key={i} style={{ border: "none", borderBottom: i < data.sections.length - 1 ? "none" : "1px solid var(--ink)", padding: "20px 22px" }}>
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
                <div style={{ border: "none", padding: "16px" }}>
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
              <div style={{ border: "1px solid var(--sage)", padding: "20px" }}>
                <div className="mono" style={{ color: "var(--sage)", marginBottom: 14 }}>FOR / Supporting arguments</div>
                {data.keyArguments.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <span className="mono" style={{ color: "var(--sage)", flexShrink: 0 }}>→</span>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{a}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: "1px solid var(--cinnabar)", padding: "20px" }}>
                <div className="mono" style={{ color: "var(--cinnabar)", marginBottom: 14 }}>AGAINST / Counter-arguments</div>
                {data.counterArguments.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <span className="mono" style={{ color: "var(--cinnabar)", flexShrink: 0 }}>→</span>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{a}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resTab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "none" }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "none" }}>
                {data.essayAngles.map((a, i) => (
                  <div key={i} style={{ padding: "20px 22px", borderBottom: i < data.essayAngles.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 4, fontSize: 12 }}>#{i+1}</span>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.6, fontStyle: "italic" }}>{a}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PLAN MODE ── */}
      {mode === "plan" && (
        <TierGate requires="pro">
          <div style={{ maxWidth: 1280 }}>
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
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "none", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button className="btn" onClick={generatePlan} disabled={planLoading || !brief.trim()} style={{ opacity: planLoading || !brief.trim() ? 0.5 : 1, cursor: "pointer" }}>
                    {planLoading ? "Planning…" : "Plan assignment →"}
                  </button>
                  {planOutput && <button className="btn ghost" onClick={() => { setPlanOutput(null); setBrief(""); }} style={{ cursor: "pointer" }}>Clear</button>}
                </div>
                {planError && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{planError}</div>}
              </div>

              {planLoading && !planOutput && <div style={{ paddingTop: 40 }}><AIThinking /></div>}
              {planOutput && (
                <div>
                  <div style={{ padding: "20px 20px 16px", border: "none", borderBottom: "none", background: "var(--paper-2)" }}>
                    <div className="mono cin" style={{ marginBottom: 8 }}>Suggested title</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{planOutput.title}</div>
                  </div>
                  <div style={{ border: "none", borderBottom: "none" }}>
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
                  <div style={{ border: "none", borderBottom: "none" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}><div className="mono cin">Argument angles</div></div>
                    {planOutput.arguments.map((arg, i) => (
                      <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid var(--rule)", display: "flex", gap: 12 }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{arg}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: "none" }}>
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
          </div>
        </TierGate>
      )}
    </div>
  );
}

// ── Tab: Debate Coach ──────────────────────────────────────────────────────

function DebateTab() {
  const profileLevel = useUserLevel();
  const [motion, setMotion]   = useState("");
  const [side, setSide]       = useState<"both"|"for"|"against">("both");
  const [level, setLevel]     = useState("A-Level");
  const [output, setOutput]   = useState<DebateOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [view, setView]       = useState<"for"|"against">("for");
  useEffect(() => { const m = profileLevel === "IGCSE" ? "GCSE" : profileLevel; if (["GCSE","A-Level","IB","University","General"].includes(m)) setLevel(m); }, [profileLevel]);

  async function generate() {
    if (!motion.trim()) return;
    setLoading(true); setError(""); setOutput(null);
    try {
      const data = await callAIOrThrow<DebateOutput>({ tool: "debate", motion, side, level });
      if (!data.for) { setError("Could not generate — try again."); return; }
      setOutput(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (output) return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="btn ghost" onClick={() => setOutput(null)} style={{ cursor: "pointer" }}>New motion</button>
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 600, marginBottom: 28, padding: "16px 20px", border: "none", lineHeight: 1.3 }}>
        &ldquo;{output.motion}&rdquo;
      </div>

      <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const, marginBottom: 24, width: "fit-content" }}>
        <button onClick={() => setView("for")} style={{ padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 10, background: view === "for" ? "var(--sage)" : "var(--paper)", color: view === "for" ? "var(--paper)" : "var(--sage)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.06em" }}>FOR THE MOTION</button>
        <button onClick={() => setView("against")} style={{ padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 10, background: view === "against" ? "var(--cinnabar)" : "var(--paper)", color: view === "against" ? "var(--paper)" : "var(--cinnabar)", border: "none", cursor: "pointer", letterSpacing: "0.06em" }}>AGAINST THE MOTION</button>
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28 }}>
        <div>
          {(view === "for" ? output.for : output.against).map((arg, i) => (
            <div key={i} style={{ border: "none", borderBottom: i < 2 ? "none" : "1px solid var(--ink)", padding: "18px 20px" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <span className="mono" style={{ color: view === "for" ? "var(--sage)" : "var(--cinnabar)", flexShrink: 0, marginTop: 2 }}>ARG {String(i+1).padStart(2,"0")}</span>
                <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, lineHeight: 1.4 }}>{arg.argument}</div>
              </div>
              <div style={{ paddingLeft: 44 }}>
                <div style={{ marginBottom: 8 }}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 3 }}>EVIDENCE / EXAMPLE</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{arg.evidence}</div>
                </div>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 3 }}>REBUTTAL IF CHALLENGED</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", fontStyle: "italic" }}>{arg.rebuttal}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          {output.keyTerms.length > 0 && (
            <div style={{ border: "none", padding: "16px", marginBottom: 14 }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Key terms</div>
              {output.keyTerms.map((t, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 700 }}>{t.term}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{t.def}</div>
                </div>
              ))}
            </div>
          )}
          {output.practiceQs.length > 0 && (
            <div style={{ border: "none", padding: "16px" }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Practice questions</div>
              {output.practiceQs.map((q, i) => (
                <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, marginBottom: 8, color: "var(--ink-2)" }}>{String(i+1).padStart(2,"0")}. {q}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Prepare your debate</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any motion. Arguments, evidence, rebuttals.</h2>

      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Debate motion *</div>
        <input value={motion} onChange={e => setMotion(e.target.value)} placeholder="e.g. This house believes AI will do more harm than good &middot; Social media should be banned for under-16s&hellip;"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Prepare</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {([["both","Both sides"],["for","For only"],["against","Against only"]] as ["both"|"for"|"against",string][]).map(([v,l]) => (
              <button key={v} onClick={() => setSide(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${side === v ? "var(--ink)" : "var(--rule)"}`, background: side === v ? "var(--ink)" : "var(--paper)", color: side === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["GCSE","A-Level","IB","University","General"].map(l => (
              <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading || !motion.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1, cursor: "pointer" }}>
        {loading ? "Building arguments…" : "Generate debate prep →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Tab: Presentation ──────────────────────────────────────────────────────

function PresentationTab() {
  const [topic, setTopic]       = useState("");
  const [audience, setAudience] = useState("class");
  const [duration, setDuration] = useState("10");
  const [style, setStyle]       = useState("academic");
  const [deck, setDeck]         = useState<Deck | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState(0);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setDeck(null);
    try {
      const data = await callAIOrThrow<Deck>({ tool: "presentation", topic, audience, duration, style });
      if (!data.slides) { setError("Could not generate — try again."); return; }
      setDeck(data); setSelected(0);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (deck) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Presentation Planner &middot; {deck.slides.length} slides &middot; {duration} min</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => window.print()} style={{ cursor: "pointer" }}>Print ↗</button>
          <button className="btn ghost" onClick={() => setDeck(null)} style={{ cursor: "pointer" }}>New deck</button>
        </div>
      </div>
      <div style={{ display: "flex", height: 600, border: "none", overflow: "hidden" }}>
        {/* Slide list */}
        <div style={{ width: 220, borderRight: "1px solid var(--ink)", overflowY: "auto", flexShrink: 0 }}>
          {deck.slides.map((s, i) => (
            <div key={i} onClick={() => setSelected(i)}
              style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", cursor: "pointer", background: selected === i ? "var(--ink)" : "var(--paper)", color: selected === i ? "var(--paper)" : "var(--ink)" }}>
              <div className="mono" style={{ fontSize: 9, opacity: 0.5, marginBottom: 3 }}>SLIDE {String(i+1).padStart(2,"0")}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{s.title}</div>
            </div>
          ))}
        </div>

        {/* Slide detail */}
        <div style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ border: "none", padding: "48px 56px", marginBottom: 24, minHeight: 300, background: "var(--paper)", aspectRatio: "16/9", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, fontStyle: "italic", marginBottom: 24, letterSpacing: "-0.02em" }}>{deck.slides[selected].title}</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {deck.slides[selected].bullets.map((b, i) => (
                  <li key={i} style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.8, color: "var(--ink-2)", marginBottom: 4 }}>{b}</li>
                ))}
              </ul>
            </div>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 20 }}>
              <div className="mono cin" style={{ marginBottom: 8 }}>Speaker notes</div>
              <AIOutput text={deck.slides[selected].speakerNote} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSelected(s => Math.max(0, s-1))} disabled={selected === 0} style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer", opacity: selected === 0 ? 0.3 : 1 }}>&larr; Prev</button>
              <button onClick={() => setSelected(s => Math.min(deck.slides.length-1, s+1))} disabled={selected === deck.slides.length-1} style={{ flex: 1, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer", opacity: selected === deck.slides.length-1 ? 0.3 : 1 }}>Next &rarr;</button>
            </div>
            {deck.advice && (
              <div style={{ marginTop: 24, border: "1px solid var(--rule)", padding: "14px 18px" }}>
                <div className="mono cin" style={{ marginBottom: 6 }}>Delivery tip</div>
                <AIOutput text={deck.advice} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Plan your presentation</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Topic &rarr; full slide deck with speaker notes.</h2>

      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic *</div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Climate Change and Food Security, Quantum Computing, Shakespeare&apos;s use of tragedy&hellip;"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Audience</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {([["class","Classmates"],["teacher","Teacher"],["university","University"],["general","General"],["corporate","Corporate"]] as [string,string][]).map(([v,l]) => (
              <button key={v} onClick={() => setAudience(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${audience === v ? "var(--ink)" : "var(--rule)"}`, background: audience === v ? "var(--ink)" : "var(--paper)", color: audience === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Duration (min)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["5","7","10","15","20","30"].map(d => (
              <button key={d} onClick={() => setDuration(d)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${duration === d ? "var(--ink)" : "var(--rule)"}`, background: duration === d ? "var(--ink)" : "var(--paper)", color: duration === d ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{d}m</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Style</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {([["academic","Academic"],["persuasive","Persuasive"],["informative","Informative"],["narrative","Narrative"]] as [string,string][]).map(([v,l]) => (
              <button key={v} onClick={() => setStyle(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${style === v ? "var(--ink)" : "var(--rule)"}`, background: style === v ? "var(--ink)" : "var(--paper)", color: style === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading || !topic.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1, cursor: "pointer" }}>
        {loading ? "Building slides…" : "Generate presentation →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type Tab = "research" | "debate" | "presentation";
const TABS: [Tab, string][] = [["research", "Research Hub"], ["debate", "Debate Coach"], ["presentation", "Presentation"]];

export default function ResearchSuitePage() {
  const [tab, setTab] = useState<Tab>("research");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Research Suite</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Research, debate, and present.</div>
        </div>
        <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>&larr; Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "research" && <ResearchTab />}
        {tab === "debate" && <DebateTab />}
        {tab === "presentation" && <PresentationTab />}
      </main>
    </div>
  );
}
