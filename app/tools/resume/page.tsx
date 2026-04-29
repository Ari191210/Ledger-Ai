"use client";

import { useState } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";

type Education = { id: number; school: string; board: string; grade: string; year: string; pct: string };
type Activity  = { id: number; title: string; org: string; year: string; desc: string };
type Skill     = { id: number; name: string; level: "Basic" | "Intermediate" | "Advanced" };

let eid = 2, aid = 3, sid = 4;

export default function ResumePage() {
  const [name,    setName]    = useState("Ananya Sharma");
  const [email,   setEmail]   = useState("ananya@example.com");
  const [phone,   setPhone]   = useState("+91 98765 43210");
  const [city,    setCity]    = useState("New Delhi");
  const [target,  setTarget]  = useState("Engineering undergraduate admission — IIT / NIT");
  const [summary, setSummary] = useState("Class 12 CBSE student with consistent academic performance and active involvement in debate and competitive programming. Seeking engineering admission with focus on Computer Science.");

  const [education, setEducation] = useState<Education[]>([
    { id: 1, school: "Delhi Public School", board: "CBSE", grade: "Class 12", year: "2026", pct: "94.2%" },
  ]);
  const [activities, setActivities] = useState<Activity[]>([
    { id: 1, title: "National Debate Champion", org: "CBSE Inter-school Meet", year: "2025", desc: "First place among 140 teams." },
    { id: 2, title: "Competitive Programming", org: "CodeChef",               year: "2024", desc: "Div 2 rating 1822; top 8% nationally." },
  ]);
  const [skills, setSkills] = useState<Skill[]>([
    { id: 1, name: "Python",    level: "Advanced"     },
    { id: 2, name: "Java",      level: "Intermediate" },
    { id: 3, name: "SQL",       level: "Basic"        },
  ]);

  const inp = (value: string, onChange: (v: string) => void, placeholder?: string) => (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 10px", color: "var(--ink)", width: "100%" }} />
  );

  return (
    <TierGate requires="pro-plus">
      <div>
        <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 09 · Resume Builder</div>
          <button className="btn" onClick={() => window.print()}>Export PDF →</button>
        </header>

        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
            {/* Form */}
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Personal info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {inp(name, setName, "Full name")}
                {inp(email, setEmail, "Email")}
                {inp(phone, setPhone, "Phone")}
                {inp(city, setCity, "City")}
              </div>
              <div style={{ marginTop: 10 }}>{inp(target, setTarget, "Target application (e.g. IIT admission)")}</div>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
                style={{ marginTop: 10, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", width: "100%", resize: "vertical" }} />

              {/* Education */}
              <div className="mono cin" style={{ marginTop: 28, marginBottom: 10 }}>Education</div>
              {education.map((e, i) => (
                <div key={e.id} style={{ marginBottom: 10, padding: 12, border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {inp(e.school, (v) => { const n = [...education]; n[i] = { ...e, school: v }; setEducation(n); }, "School")}
                    {inp(e.board,  (v) => { const n = [...education]; n[i] = { ...e, board:  v }; setEducation(n); }, "Board")}
                    {inp(e.grade,  (v) => { const n = [...education]; n[i] = { ...e, grade:  v }; setEducation(n); }, "Class/Grade")}
                    {inp(e.year,   (v) => { const n = [...education]; n[i] = { ...e, year:   v }; setEducation(n); }, "Year")}
                    {inp(e.pct,    (v) => { const n = [...education]; n[i] = { ...e, pct:    v }; setEducation(n); }, "Percentage / GPA")}
                  </div>
                  <button onClick={() => setEducation((p) => p.filter((_, k) => k !== i))}
                    style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕ Remove</button>
                </div>
              ))}
              <button onClick={() => setEducation((p) => [...p, { id: eid++, school: "", board: "CBSE", grade: "Class 12", year: "2026", pct: "" }])}
                style={{ background: "none", border: "1px dashed var(--rule)", padding: "8px 14px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", color: "var(--ink-2)", width: "100%" }}>
                + Add education
              </button>

              {/* Activities */}
              <div className="mono cin" style={{ marginTop: 28, marginBottom: 10 }}>Activities &amp; achievements</div>
              {activities.map((a, i) => (
                <div key={a.id} style={{ marginBottom: 10, padding: 12, border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 8 }}>
                    {inp(a.title, (v) => { const n = [...activities]; n[i] = { ...a, title: v }; setActivities(n); }, "Title")}
                    {inp(a.org,   (v) => { const n = [...activities]; n[i] = { ...a, org:   v }; setActivities(n); }, "Organisation")}
                    {inp(a.year,  (v) => { const n = [...activities]; n[i] = { ...a, year:  v }; setActivities(n); }, "Year")}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {inp(a.desc, (v) => { const n = [...activities]; n[i] = { ...a, desc: v }; setActivities(n); }, "One-line description")}
                  </div>
                  <button onClick={() => setActivities((p) => p.filter((_, k) => k !== i))}
                    style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕ Remove</button>
                </div>
              ))}
              <button onClick={() => setActivities((p) => [...p, { id: aid++, title: "", org: "", year: "", desc: "" }])}
                style={{ background: "none", border: "1px dashed var(--rule)", padding: "8px 14px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", color: "var(--ink-2)", width: "100%" }}>
                + Add activity
              </button>

              {/* Skills */}
              <div className="mono cin" style={{ marginTop: 28, marginBottom: 10 }}>Skills</div>
              {skills.map((s, i) => (
                <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>{inp(s.name, (v) => { const n = [...skills]; n[i] = { ...s, name: v }; setSkills(n); }, "Skill name")}</div>
                  <select value={s.level} onChange={(e) => { const n = [...skills]; n[i] = { ...s, level: e.target.value as Skill["level"] }; setSkills(n); }}
                    style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 8px", color: "var(--ink)" }}>
                    <option>Basic</option><option>Intermediate</option><option>Advanced</option>
                  </select>
                  <button onClick={() => setSkills((p) => p.filter((_, k) => k !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕</button>
                </div>
              ))}
              <button onClick={() => setSkills((p) => [...p, { id: sid++, name: "", level: "Basic" }])}
                style={{ background: "none", border: "1px dashed var(--rule)", padding: "8px 14px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", color: "var(--ink-2)", width: "100%" }}>
                + Add skill
              </button>
            </div>

            {/* Preview */}
            <div id="resume-preview">
              <div className="mono cin" style={{ marginBottom: 14 }}>Preview</div>
              <div style={{ border: "1px solid var(--ink)", padding: "32px 28px", background: "var(--paper)", fontFamily: "var(--serif)" }}>
                <div style={{ borderBottom: "3px double var(--ink)", paddingBottom: 16, marginBottom: 20 }}>
                  <h1 style={{ fontSize: 36, fontWeight: 700, fontStyle: "italic", letterSpacing: "-0.02em", margin: 0 }}>{name || "Your Name"}</h1>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 6 }}>
                    {[email, phone, city].filter(Boolean).join("  ·  ")}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)", marginTop: 4 }}>{target}</div>
                </div>

                {summary && (
                  <section style={{ marginBottom: 20 }}>
                    <div className="mono cin" style={{ marginBottom: 6 }}>Profile</div>
                    <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", margin: 0 }}>{summary}</p>
                  </section>
                )}

                {education.length > 0 && (
                  <section style={{ marginBottom: 20 }}>
                    <div className="mono cin" style={{ marginBottom: 8 }}>Education</div>
                    {education.map((e) => (
                      <div key={e.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: "1px solid var(--rule)", paddingBottom: 8 }}>
                        <div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600 }}>{e.school}</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{e.board} · {e.grade}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="mono" style={{ fontSize: 10 }}>{e.year}</div>
                          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, color: "var(--cinnabar-ink)" }}>{e.pct}</div>
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {activities.length > 0 && (
                  <section style={{ marginBottom: 20 }}>
                    <div className="mono cin" style={{ marginBottom: 8 }}>Activities &amp; Achievements</div>
                    {activities.map((a) => (
                      <div key={a.id} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{a.title}</span>
                          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{a.year}</span>
                        </div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{a.org}{a.desc ? ` — ${a.desc}` : ""}</div>
                      </div>
                    ))}
                  </section>
                )}

                {skills.length > 0 && (
                  <section>
                    <div className="mono cin" style={{ marginBottom: 8 }}>Skills</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {skills.map((s) => (
                        <span key={s.id} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--ink)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {s.name} · {s.level}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 09 of 44.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
