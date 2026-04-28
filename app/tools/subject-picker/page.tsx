"use client";
import { useState } from "react";
import Link from "next/link";

type SubjectRec = { combo: string[]; why: string; careerFit: string[]; uniReqs: string; difficulty: "manageable" | "challenging" | "intense"; score: number };
type Result = { intro: string; combos: SubjectRec[]; avoid: string[]; tip: string };

const IB_ALL = ["English A Lit", "English A Lang&Lit", "Hindi A", "French B", "Spanish B", "Economics", "History", "Geography", "Psychology", "Business Management", "Philosophy", "Biology", "Chemistry", "Physics", "Computer Science", "Environmental Systems", "Mathematics AA", "Mathematics AI", "Visual Arts", "Music", "Theatre"];
const ALEVELS = ["Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Business", "History", "Geography", "English Literature", "Psychology", "Computer Science", "Law", "Sociology", "Political Science", "French", "Spanish", "Art & Design", "Music"];
const CAREERS = ["Medicine", "Engineering", "Law", "Finance & Banking", "Computer Science", "Architecture", "Business", "Research / Academia", "Journalism", "Education", "Arts & Design", "Psychology", "International Relations", "Entrepreneurship"];

export default function SubjectPickerPage() {
  const [board, setBoard]         = useState<"IB" | "A-Level">("IB");
  const [interests, setInterests] = useState<string[]>([]);
  const [career, setCareer]       = useState<string[]>([]);
  const [extra, setExtra]         = useState("");
  const [result, setResult]       = useState<Result | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  function toggle<T>(arr: T[], item: T, set: (v: T[]) => void) {
    set(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  }

  async function generate() {
    if (interests.length < 2) { setError("Select at least 2 subjects you like."); return; }
    if (career.length < 1)    { setError("Select at least 1 career direction."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "subject_picker", board, interests, career, extra }) });
      const data = await res.json();
      if (!res.ok || !data.combos) { setError("Could not generate recommendations."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  const subjects = board === "IB" ? IB_ALL : ALEVELS;
  const diffColor = (d: string) => d === "manageable" ? "#2d7a3c" : d === "challenging" ? "#c97a1a" : "#c44b2a";

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 33 · Subject Picker · {board}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>Start over</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontStyle: "italic", lineHeight: 1.6, marginBottom: 28, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>{result.intro}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
          {result.combos.map((c, i) => (
            <div key={i} style={{ border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--rule)", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  {i === 0 && <div className="mono cin" style={{ marginBottom: 6 }}>Best fit for you</div>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {c.combo.map((s, j) => <span key={j} style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, padding: "4px 10px", background: i === 0 ? "var(--ink)" : "var(--paper-2)", color: i === 0 ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{s}</span>)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span className="mono" style={{ fontSize: 10, color: diffColor(c.difficulty) }}>{c.difficulty.toUpperCase()}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--cinnabar-ink)" }}>{c.score}/10</span>
                </div>
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: 10 }}>{c.why}</div>
              <div style={{ marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>OPENS DOORS TO · </span>
                {c.careerFit.map((cf, j) => <span key={j} style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)" }}>{cf}{j < c.careerFit.length - 1 ? " · " : ""}</span>)}
              </div>
              <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>UNI REQUIREMENTS · </span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{c.uniReqs}</span>
              </div>
            </div>
          ))}
        </div>

        {result.avoid.length > 0 && (
          <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px 20px", marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 8 }}>Combinations to avoid</div>
            {result.avoid.map((a, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 4 }}>· {a}</div>)}
          </div>
        )}

        <div style={{ padding: "14px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 4 }}>COACH TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.tip}</div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 33 · Subject Picker</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Grade 11 subject selection</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Find the perfect combination.</h2>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Your board</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["IB", "A-Level"] as const).map(b => (
              <button key={b} onClick={() => { setBoard(b); setInterests([]); }} style={{ flex: 1, padding: "12px", border: `2px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{b}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Subjects you like or are good at (pick 2–6)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {subjects.map(s => <button key={s} onClick={() => toggle(interests, s, setInterests)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${interests.includes(s) ? "var(--ink)" : "var(--rule)"}`, background: interests.includes(s) ? "var(--ink)" : "var(--paper)", color: interests.includes(s) ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Career interests (pick 1–3)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CAREERS.map(c => <button key={c} onClick={() => toggle(career, c, setCareer)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${career.includes(c) ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: career.includes(c) ? "var(--cinnabar-ink)" : "var(--paper)", color: career.includes(c) ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{c}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Anything else? (optional)</div>
          <input value={extra} onChange={e => setExtra(e.target.value)} placeholder="e.g. I want to apply to UK universities, strong in maths but hate memorisation…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Finding your perfect combination…" : "Get subject recommendations →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
