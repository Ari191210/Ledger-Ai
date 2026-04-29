"use client";
import { useState } from "react";
import Link from "next/link";

type Section = { heading: string; content: string; keyPoints: string[] };
type ResearchData = {
  title: string;
  summary: string;
  sections: Section[];
  keyArguments: string[];
  counterArguments: string[];
  statistics: { stat: string; source: string }[];
  furtherReading: { title: string; author: string; why: string }[];
  essayAngles: string[];
};

export default function ResearchPage() {
  const [query, setQuery]     = useState("");
  const [subject, setSubject] = useState("");
  const [depth, setDepth]     = useState("standard");
  const [purpose, setPurpose] = useState("essay");
  const [data, setData]       = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [tab, setTab]         = useState<"overview"|"arguments"|"stats"|"angles">("overview");
  const [copied, setCopied]   = useState(false);

  async function generate() {
    if (!query.trim()) return;
    setLoading(true); setError(""); setData(null);
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "research", query, subject, depth, purpose }) });
      const d    = await res.json();
      if (!res.ok || !d.sections) { setError("Could not generate — try again."); return; }
      setData(d); setTab("overview");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
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

  if (!data) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 30 · Research Assistant</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Deep research, instantly</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any topic. Arguments, evidence, essay angles.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Research question or topic *</div>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Does social media harm teenage mental health? · The causes of World War I…"
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
        {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading || !query.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1, marginTop: 14 }}>
          {loading ? "Researching…" : "Start research →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 30 of 44.</div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "20px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 30 · Research Assistant</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={copyAll} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "7px 14px", border: "1px solid var(--ink)", background: copied ? "#2d7a3c" : "var(--paper)", color: copied ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
            {copied ? "Copied ✓" : "Copy all"}
          </button>
          <button className="btn ghost" onClick={() => window.print()}>Print ↗</button>
          <button className="btn ghost" onClick={() => setData(null)}>New research</button>
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Title + summary */}
        <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, fontStyle: "italic", marginBottom: 12, lineHeight: 1.3 }}>{data.title}</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.8, color: "var(--ink-2)", marginBottom: 32, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>{data.summary}</div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)", marginBottom: 28, width: "fit-content" }}>
          {([["overview","Overview"],["arguments","Arguments"],["stats","Stats & Evidence"],["angles","Essay Angles"]] as [typeof tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 10, background: tab === t ? "var(--ink)" : "var(--paper)", color: tab === t ? "var(--paper)" : "var(--ink)", border: "none", borderRight: "1px solid var(--ink)", cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
            <div>
              {data.sections.map((s, i) => (
                <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < data.sections.length - 1 ? "none" : "1px solid var(--ink)", padding: "20px 22px" }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--ink)" }}>{s.heading}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.8, color: "var(--ink-2)", marginBottom: 12 }}>{s.content}</div>
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
            <div>
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
          </div>
        )}

        {tab === "arguments" && (
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #2d7a3c", padding: "20px" }}>
              <div className="mono" style={{ color: "#2d7a3c", marginBottom: 14 }}>FOR / Supporting arguments</div>
              {data.keyArguments.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <span className="mono" style={{ color: "#2d7a3c", flexShrink: 0 }}>→</span>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{a}</div>
                </div>
              ))}
            </div>
            <div style={{ border: "1px solid #c44b2a", padding: "20px" }}>
              <div className="mono" style={{ color: "#c44b2a", marginBottom: 14 }}>AGAINST / Counter-arguments</div>
              {data.counterArguments.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <span className="mono" style={{ color: "#c44b2a", flexShrink: 0 }}>→</span>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{a}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "stats" && (
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

        {tab === "angles" && (
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
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 30 of 44.</div>
        </div>
      </main>
    </div>
  );
}
