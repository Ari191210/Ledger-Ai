"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { loadUserData } from "@/lib/user-data";
import { callAI } from "@/lib/ai-fetch";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Computer Science", "English Literature", "History",
  "Geography", "Economics", "Psychology", "Accountancy",
  "Political Science", "Sociology", "Physical Education",
];

type Example = { title: string; setup: string; solution: string };
type PracticeQ = { q: string; opts: string[]; ans: number };
type Lesson = {
  title: string;
  concept: string;
  keyPoints: string[];
  examples: Example[];
  commonMistakes: string[];
  practice: PracticeQ[];
};

function PracticeView({ items }: { items: PracticeQ[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const done = Object.keys(answers).length === items.length;
  const score = done ? Object.entries(answers).filter(([i, a]) => a === items[+i].ans).length : 0;

  return (
    <div>
      {items.map((item, i) => {
        const answered = answers[i] !== undefined;
        return (
          <div key={i} style={{ marginBottom: 16, border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
              <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>
              {item.q}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {item.opts.map((opt, j) => {
                const isSelected = answers[i] === j;
                const isCorrect  = j === item.ans;
                return (
                  <button key={j} onClick={() => !answered && setAnswers(p => ({ ...p, [i]: j }))}
                    style={{ padding: "8px 12px", background: answered && isCorrect ? "var(--paper-2)" : "transparent", border: `1px solid ${answered && isCorrect ? "var(--cinnabar-ink)" : "var(--rule)"}`, cursor: answered ? "default" : "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 12, color: answered && isCorrect ? "var(--cinnabar-ink)" : answered && isSelected && !isCorrect ? "var(--ink-3)" : "var(--ink)" }}>
                    <span className="mono" style={{ marginRight: 6, opacity: 0.5 }}>{String.fromCharCode(65 + j)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {done && (
        <div style={{ padding: "16px 18px", border: "1px solid var(--ink)", background: "var(--paper-2)", marginTop: 4 }}>
          <div className="mono cin">Practice Score</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>
            {score}/{items.length}
          </div>
          <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>
            {score === items.length ? "Perfect — you've got this topic." : score >= items.length / 2 ? "Good start — review the explanations once more." : "Revisit the concept section above."}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TutorPage() {
  const { user } = useAuth();
  const [subject,  setSubject]  = useState("");
  const [topic,    setTopic]    = useState("");
  const [lesson,   setLesson]   = useState<Lesson | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [tab,      setTab]      = useState<"concept" | "examples" | "keypoints" | "practice">("concept");
  const [profile,  setProfile]  = useState<{ grade?: string; board?: string; stream?: string; interests?: string[]; targetExam?: string }>({});

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      if (ud) setProfile({ grade: ud.grade, board: ud.board, stream: ud.stream, interests: ud.interests, targetExam: ud.targetExam });
    });
  }, [user]);

  async function generate() {
    if (!subject || !topic.trim()) return;
    setLoading(true); setError(""); setLesson(null);
    try {
      const res = await callAI({
        tool: "tutor",
        subject,
        topic: topic.trim(),
        grade: profile.grade || "Class 10",
        board: profile.board || "",
        stream: profile.stream || "",
        targetExam: profile.targetExam || "",
        extra: profile.interests?.length ? `Student's interests: ${profile.interests.join(", ")}` : "",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setLesson(data);
      setTab("concept");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const TABS = [
    { id: "concept",   label: "Concept"    },
    { id: "examples",  label: "Examples"   },
    { id: "keypoints", label: "Key Points" },
    { id: "practice",  label: "Practice"   },
  ] as const;

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Topic Tutor</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Pick a topic. Get a full lesson.</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: lesson ? "1fr 1.5fr" : "1fr", gap: 48 }}>

          {/* Input panel */}
          <div>
            {profile.grade && (
              <div style={{ marginBottom: 16, padding: "10px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 12, alignItems: "center" }}>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Profile</div>
                <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{profile.grade}{profile.board ? ` · ${profile.board}` : ""}{profile.stream ? ` · ${profile.stream}` : ""}{profile.targetExam ? ` · ${profile.targetExam}` : ""}</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginLeft: "auto" }}>Lessons personalised for you</div>
              </div>
            )}

            <div className="mono cin" style={{ marginBottom: 14 }}>01 · Choose a subject</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 24 }}>
              {SUBJECTS.map((s, i) => (
                <button key={s} onClick={() => setSubject(s)}
                  style={{ padding: "10px 14px", background: subject === s ? "var(--ink)" : "transparent", color: subject === s ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: i % 2 === 0 ? "1px solid var(--rule)" : "none", borderBottom: i < SUBJECTS.length - 2 ? "1px solid var(--rule)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em", textAlign: "left", textTransform: "uppercase" }}>
                  {s}
                </button>
              ))}
            </div>

            <div className="mono cin" style={{ marginBottom: 14 }}>02 · Enter a topic</div>
            <input
              value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
              placeholder={subject ? `e.g. ${subject === "Mathematics" ? "Integration by parts" : subject === "Physics" ? "Photoelectric effect" : subject === "Chemistry" ? "Acid-base equilibrium" : subject === "Computer Science" ? "Recursion in Python" : subject === "Psychology" ? "Cognitive dissonance" : "Enter a specific topic…"}` : "Select a subject first…"}
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
            />

            <button className="btn" onClick={generate} disabled={loading || !subject || !topic.trim()} style={{ opacity: loading || !subject || !topic.trim() ? 0.5 : 1 }}>
              {loading ? "Generating lesson…" : "Teach me →"}
            </button>

            {lesson && (
              <button className="btn ghost" onClick={() => { setLesson(null); setTopic(""); }} style={{ marginLeft: 10 }}>
                Clear
              </button>
            )}

            {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}

            {!lesson && !loading && (
              <div style={{ marginTop: 32, border: "1px solid var(--rule)", padding: "20px 18px" }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>What to try</div>
                {[
                  ["Mathematics", "Quadratic equations"],
                  ["Physics", "Newton's laws of motion"],
                  ["Chemistry", "Chemical bonding"],
                  ["Computer Science", "Recursion in Python"],
                  ["Psychology", "Types of memory"],
                  ["Economics", "Law of demand"],
                ].map(([subj, t]) => (
                  <button key={t} onClick={() => { setSubject(subj); setTopic(t); }}
                    style={{ display: "block", width: "100%", padding: "8px 0", background: "none", border: "none", borderBottom: "1px solid var(--rule)", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8 }}>{subj}</span>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lesson output */}
          {lesson && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{lesson.title}</div>
                <div className="mono" style={{ color: "var(--ink-3)", marginTop: 6 }}>{subject} · {profile.grade || "Class 10"}</div>
              </div>

              <div style={{ display: "flex", border: "1px solid var(--ink)", marginBottom: 0 }}>
                {TABS.map((t, i) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ flex: 1, padding: "12px 8px", background: tab === t.id ? "var(--ink)" : "var(--paper)", color: tab === t.id ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: i < TABS.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "24px 20px" }}>

                {tab === "concept" && (
                  <div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" }}>
                      {lesson.concept.split("\n\n").map((p, i) => <p key={i} style={{ marginBottom: 14 }}>{p}</p>)}
                    </div>
                    {lesson.commonMistakes?.length > 0 && (
                      <div style={{ marginTop: 20, padding: "16px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                        <div className="mono cin" style={{ marginBottom: 10 }}>Common mistakes to avoid</div>
                        {lesson.commonMistakes.map((m, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: i < lesson.commonMistakes.length - 1 ? "1px solid var(--rule)" : "none" }}>
                            <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>✕</span>
                            <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{m}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === "examples" && (
                  <div>
                    {lesson.examples.map((ex, i) => (
                      <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < lesson.examples.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                          <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8, fontStyle: "normal" }}>{String(i + 1).padStart(2, "0")}</span>
                          {ex.title}
                        </div>
                        <div style={{ marginBottom: 10, padding: "12px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Problem</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{ex.setup}</div>
                        </div>
                        <div style={{ padding: "12px 14px", border: "1px solid var(--rule)" }}>
                          <div className="mono cin" style={{ marginBottom: 6 }}>Solution</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>
                            {ex.solution.split("\n").map((line, j) => <div key={j} style={{ marginBottom: 4 }}>{line}</div>)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "keypoints" && (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {lesson.keyPoints.map((pt, i) => (
                      <li key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < lesson.keyPoints.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55 }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {tab === "practice" && <PracticeView items={lesson.practice} />}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
