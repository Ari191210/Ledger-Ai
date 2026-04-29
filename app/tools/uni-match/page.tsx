"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type UniMatch = { name: string; country: string; fitScore: number; why: string; requirements: string; strengths: string[]; applyBy: string; reach: "safety" | "match" | "reach" };
type Result   = { summary: string; unis: UniMatch[]; advice: string; gaps: string[] };

const COUNTRIES = ["United Kingdom", "United States", "Canada", "Australia", "Netherlands", "Germany", "Singapore", "India", "Any"];
const FIELDS    = ["Medicine", "Engineering", "Law", "Economics / Finance", "Computer Science", "Architecture", "Business", "Natural Sciences", "Psychology", "Arts & Design", "International Relations", "Mathematics", "Education", "Journalism"];
const BOARDS    = ["IB", "A-Level", "CBSE", "ICSE", "AP", "SAT", "IGCSE"];

export default function UniMatchPage() {
  const [board, setBoard]         = useState("IB");
  const [grade, setGrade]         = useState("");
  const [field, setField]         = useState("Economics / Finance");
  const [countries, setCountries] = useState<string[]>(["United Kingdom"]);
  const [extra, setExtra]         = useState("");
  const [result, setResult]       = useState<Result | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  function toggleCountry(c: string) {
    setCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  async function generate() {
    if (!grade.trim()) { setError("Enter your predicted grades."); return; }
    if (countries.length === 0) { setError("Select at least one country."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "uni_match", board, grade, field, countries, extra });
      const data = await res.json();
      if (!res.ok || !data.unis) { setError("Could not generate recommendations."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  const reachColor = (r: string) => r === "safety" ? "#2d7a3c" : r === "match" ? "#c97a1a" : "#c44b2a";
  const reachLabel = (r: string) => r === "safety" ? "Likely" : r === "match" ? "Good chance" : "Reach";

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>University Match · {field}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>Start over</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontStyle: "italic", lineHeight: 1.6, marginBottom: 28, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>{result.summary}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          {result.unis.map((u, i) => (
            <div key={i} style={{ border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--rule)", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  {i === 0 && <div className="mono cin" style={{ marginBottom: 4 }}>Top match</div>}
                  <div style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 700 }}>{u.name}</div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{u.country}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: `1px solid ${reachColor(u.reach)}`, color: reachColor(u.reach) }}>{reachLabel(u.reach)}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>{u.fitScore}/10 fit</span>
                </div>
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: 10 }}>{u.why}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {u.strengths.map((s, j) => <span key={j} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{s}</span>)}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>REQUIREMENTS · </span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)" }}>{u.requirements}</span>
                </div>
                {u.applyBy && (
                  <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>APPLY BY · </span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12 }}>{u.applyBy}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {result.gaps.length > 0 && (
          <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px 20px", marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 8 }}>Gaps to address before applying</div>
            {result.gaps.map((g, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {g}</div>)}
          </div>
        )}

        <div style={{ padding: "14px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 4 }}>APPLICATION ADVICE</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.advice}</div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>University Match</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Find your university</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Your grades. Your field. Your matches.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your board</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Predicted / achieved grades</div>
          <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. IB 38/42, A-Level AAB, CBSE 94%…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Field of study</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {FIELDS.map(f => <button key={f} onClick={() => setField(f)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${field === f ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: field === f ? "var(--cinnabar-ink)" : "var(--paper)", color: field === f ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{f}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Countries (pick all that apply)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {COUNTRIES.map(c => <button key={c} onClick={() => toggleCountry(c)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${countries.includes(c) ? "var(--ink)" : "var(--rule)"}`, background: countries.includes(c) ? "var(--ink)" : "var(--paper)", color: countries.includes(c) ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{c}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Anything else? (optional)</div>
          <input value={extra} onChange={e => setExtra(e.target.value)} placeholder="e.g. I want a small campus, strong research, scholarship opportunities, warm climate…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Finding your matches…" : "Find my universities →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
