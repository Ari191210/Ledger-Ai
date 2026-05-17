"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { loadUserData } from "@/lib/user-data";
import { type UserProfile } from "@/lib/user-data";
import { callAIOrThrow, AIError } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";
import SaveOutputButton from "@/components/save-output-button";

type Flashcard    = { q: string; a: string };
type QuizItem     = { q: string; opts: string[]; ans: number };
type NotesOutput  = { explanation: string; summary: string[]; flashcards: Flashcard[]; quiz: QuizItem[] };
type HistoryEntry = { id: number; title: string; date: string; input: string; output: NotesOutput };
type Example      = { title: string; setup: string; solution: string };
type PracticeQ    = { q: string; opts: string[]; ans: number };
type Lesson       = { title: string; concept: string; keyPoints: string[]; examples: Example[]; commonMistakes: string[]; practice: PracticeQ[] };

const SUBJECTS = [
  "Mathematics","Physics","Chemistry","Biology",
  "Computer Science","English Literature","History",
  "Geography","Economics","Psychology","Accountancy",
  "Political Science","Sociology","Physical Education",
];

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: "13px 20px", fontFamily: "var(--mono)", fontSize: 11,
  letterSpacing: "0.06em", textTransform: "uppercase" as const,
  background: active ? "var(--ink)" : "var(--paper)",
  color: active ? "var(--paper)" : "var(--ink-2)", border: "none", cursor: "pointer",
});

function saveToHistory(input: string, output: NotesOutput) {
  try {
    const existing: HistoryEntry[] = JSON.parse(localStorage.getItem("ledger-notes-history") || "[]");
    const entry: HistoryEntry = {
      id: Date.now(), title: input.trim().slice(0, 60),
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      input, output,
    };
    localStorage.setItem("ledger-notes-history", JSON.stringify([entry, ...existing].slice(0, 10)));
  } catch {}
}

function FlashcardView({ cards }: { cards: Flashcard[] }) {
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  return (
    <div className="mob-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)" }}>
      {cards.map((c, i) => (
        <div key={i} onClick={() => setFlip((p) => ({ ...p, [i]: !p[i] }))}
          style={{ padding: "20px 18px", minHeight: 100, cursor: "pointer", borderRight: i % 2 === 0 ? "1px solid var(--ink)" : "none", borderBottom: i < cards.length - 2 ? "1px solid var(--ink)" : "none", background: flip[i] ? "var(--ink)" : "var(--paper-2)", color: flip[i] ? "var(--paper)" : "var(--ink)", transition: "background 200ms, color 200ms" }}>
          <div className="mono" style={{ opacity: 0.6, marginBottom: 8 }}>{flip[i] ? "Answer" : `Card ${String(i + 1).padStart(2, "0")}`}</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{flip[i] ? c.a : c.q}</div>
          <div className="mono" style={{ opacity: 0.4, marginTop: 8, fontSize: 9 }}>tap to {flip[i] ? "show question" : "reveal"}</div>
        </div>
      ))}
    </div>
  );
}

function QuizView({ items }: { items: QuizItem[] }) {
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
                const isCorrect = j === item.ans;
                return (
                  <button key={j} onClick={() => !answered && setAnswers((p) => ({ ...p, [i]: j }))}
                    style={{ padding: "8px 12px", background: answered && isCorrect ? "var(--paper-2)" : "transparent", border: `1px solid ${answered && isCorrect ? "var(--cinnabar-ink)" : "var(--rule)"}`, cursor: answered ? "default" : "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 12, color: answered && isCorrect ? "var(--cinnabar-ink)" : answered && answers[i] === j && !isCorrect ? "var(--ink-3)" : "var(--ink)" }}>
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
          <div className="mono cin">Score</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{score}/{items.length}</div>
        </div>
      )}
    </div>
  );
}

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
                const isCorrect = j === item.ans;
                return (
                  <button key={j} onClick={() => !answered && setAnswers((p) => ({ ...p, [i]: j }))}
                    style={{ padding: "8px 12px", background: answered && isCorrect ? "var(--paper-2)" : "transparent", border: `1px solid ${answered && isCorrect ? "var(--cinnabar-ink)" : "var(--rule)"}`, cursor: answered ? "default" : "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 12, color: answered && isCorrect ? "var(--cinnabar-ink)" : answered && answers[i] === j && !isCorrect ? "var(--ink-3)" : "var(--ink)" }}>
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
          <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{score}/{items.length}</div>
          <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>
            {score === items.length ? "Perfect — you've got this topic." : score >= items.length / 2 ? "Good start — review the concept once more." : "Revisit the concept section above."}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudyEnginePage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"simplify" | "learn">("simplify");

  // Simplify state
  const [input,       setInput]       = useState("");
  const [notesOut,    setNotesOut]    = useState<NotesOutput | null>(null);
  const [notesTab,    setNotesTab]    = useState<"explanation" | "summary" | "flashcards" | "quiz">("explanation");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError,   setNotesError]   = useState<AIError | string | null>(null);
  const [history,      setHistory]      = useState<HistoryEntry[]>([]);
  const [showHistory,  setShowHistory]  = useState(false);
  const [profile,      setProfile]      = useState<UserProfile>({});

  // Learn state
  const [subject,      setSubject]      = useState("");
  const [topic,        setTopic]        = useState("");
  const [lesson,       setLesson]       = useState<Lesson | null>(null);
  const [lessonTab,    setLessonTab]    = useState<"concept" | "examples" | "keypoints" | "practice">("concept");
  const [learnLoading, setLearnLoading] = useState(false);
  const [learnError,   setLearnError]   = useState<AIError | string | null>(null);
  const [learnProfile, setLearnProfile] = useState<{ grade?: string; board?: string; stream?: string; interests?: string[]; targetExam?: string }>({});

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("ledger-notes-history") || "[]");
      setHistory(h);
      const raw = localStorage.getItem("ledger-profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      if (ud) setLearnProfile({ grade: ud.grade, board: ud.board, stream: ud.stream, interests: ud.interests, targetExam: ud.targetExam });
    });
  }, [user]);

  async function simplify() {
    if (!input.trim()) return;
    setNotesLoading(true); setNotesError(null); setNotesOut(null);
    try {
      const syllabusSubjects = (() => { try { return JSON.parse(localStorage.getItem("ledger-syllabus-subjects") || "[]"); } catch { return []; } })();
      const data = await callAIOrThrow<NotesOutput>({ tool: "notes", content: input, ...profile, syllabusSubjects });
      setNotesOut(data); setNotesTab("explanation");
      saveToHistory(input, data);
      setHistory(JSON.parse(localStorage.getItem("ledger-notes-history") || "[]"));
    } catch (err) { setNotesError(err instanceof AIError ? err : "Something went wrong. Please try again."); }
    finally { setNotesLoading(false); }
  }

  function loadFromHistory(entry: HistoryEntry) {
    setInput(entry.input); setNotesOut(entry.output); setNotesTab("explanation"); setShowHistory(false);
  }

  function deleteFromHistory(id: number) {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem("ledger-notes-history", JSON.stringify(updated));
  }

  async function learn() {
    if (!subject || !topic.trim()) return;
    setLearnLoading(true); setLearnError(null); setLesson(null);
    try {
      const data = await callAIOrThrow<Lesson>({
        tool: "tutor", subject, topic: topic.trim(),
        grade: learnProfile.grade || "Class 10", board: learnProfile.board || "",
        stream: learnProfile.stream || "", targetExam: learnProfile.targetExam || "",
        extra: learnProfile.interests?.length ? `Student's interests: ${learnProfile.interests.join(", ")}` : "",
      });
      setLesson(data); setLessonTab("concept");
    } catch (err) { setLearnError(err instanceof AIError ? err : "Something went wrong. Please try again."); }
    finally { setLearnLoading(false); }
  }

  const NOTES_TABS = [
    { id: "explanation" as const, label: "Explanation" },
    { id: "summary"     as const, label: "Summary"     },
    { id: "flashcards"  as const, label: "Flashcards"  },
    { id: "quiz"        as const, label: "Quiz"        },
  ];
  const LESSON_TABS = [
    { id: "concept"   as const, label: "Concept"    },
    { id: "examples"  as const, label: "Examples"   },
    { id: "keypoints" as const, label: "Key Points" },
    { id: "practice"  as const, label: "Practice"   },
  ];

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Study Engine</div>
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          <button onClick={() => setMode("simplify")} style={{ ...TAB_STYLE(mode === "simplify"), borderRight: "1px solid var(--rule)" }}>Simplify Notes</button>
          <button onClick={() => setMode("learn")}    style={TAB_STYLE(mode === "learn")}>Learn Topic</button>
        </div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>
          {mode === "simplify" ? "Textbook → plain English" : "Pick a topic. Get a full lesson."}
        </div>
      </header>

      {mode === "simplify" && (
        <>
          {showHistory && history.length > 0 && (
            <div style={{ borderBottom: "1px solid var(--ink)", background: "var(--paper-2)" }}>
              <div className="mob-p" style={{ padding: "20px 44px", maxWidth: 1280, margin: "0 auto" }}>
                <div className="mono cin" style={{ marginBottom: 12 }}>Recent notes · {history.length} saved</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 0, border: "1px solid var(--ink)" }}>
                  {history.map((h, i) => (
                    <div key={h.id} style={{ padding: "14px 16px", borderRight: "1px solid var(--rule)", borderBottom: i < history.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button onClick={() => loadFromHistory(h)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1, padding: 0 }}>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{h.title}</div>
                        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>{h.date} · {h.output.flashcards.length} cards · {h.output.summary.length} points</div>
                      </button>
                      <button onClick={() => deleteFromHistory(h.id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
            <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (notesOut || notesLoading) ? "1fr 1.4fr" : "1fr", gap: 48 }}>
              <div>
                {history.length > 0 && (
                  <button onClick={() => setShowHistory(!showHistory)} className="btn ghost" style={{ marginBottom: 16, padding: "6px 14px", fontSize: 11 }}>
                    {showHistory ? "Hide history" : `History (${history.length})`}
                  </button>
                )}
                {profile.grade && (
                  <div style={{ marginBottom: 14, padding: "8px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 10, alignItems: "center" }}>
                    <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Profile</div>
                    <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{profile.grade}{profile.board ? ` · ${profile.board}` : ""}{profile.stream ? ` · ${profile.stream}` : ""}</div>
                    <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginLeft: "auto" }}>AI personalised for your board</div>
                  </div>
                )}
                <div className="mono cin" style={{ marginBottom: 14 }}>Paste your notes or chapter</div>
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste your textbook excerpt, lecture notes, or any study material here. The longer and denser, the better."
                  rows={notesOut ? 16 : 20}
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button className="btn" onClick={simplify} disabled={notesLoading || !input.trim()} style={{ opacity: notesLoading || !input.trim() ? 0.5 : 1 }}>
                    {notesLoading ? "Analysing…" : "Simplify →"}
                  </button>
                  {notesOut && <button className="btn ghost" onClick={() => { setNotesOut(null); setInput(""); }}>Clear</button>}
                </div>
                {notesError && <AIErrorDisplay error={notesError} onRetry={simplify} inline />}
              </div>

              {notesLoading && (
                <div>
                  <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
                    {["Explanation","Summary","Flashcards","Quiz"].map((label, i, arr) => (
                      <div key={label} style={{ flex: 1, padding: "12px 8px", background: "var(--paper)", borderRight: i < arr.length - 1 ? "1px solid var(--rule)" : "none", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", textAlign: "center" }}>{label}</div>
                    ))}
                  </div>
                  <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "24px 20px" }}><AIThinking /></div>
                </div>
              )}

              {notesOut && !notesLoading && (
                <div>
                  <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
                    {NOTES_TABS.map((t, i) => (
                      <button key={t.id} onClick={() => setNotesTab(t.id)}
                        style={{ flex: 1, padding: "12px 8px", background: notesTab === t.id ? "var(--ink)" : "var(--paper)", color: notesTab === t.id ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: i < NOTES_TABS.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "24px 20px" }}>
                    {notesTab === "explanation" && <AIOutput text={notesOut.explanation} />}
                    {notesTab === "summary" && (
                      <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                        {notesOut.summary.map((point, i) => (
                          <li key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < notesOut.summary.length - 1 ? "1px solid var(--rule)" : "none" }}>
                            <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                            <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {notesTab === "flashcards" && <FlashcardView cards={notesOut.flashcards} />}
                    {notesTab === "quiz" && <QuizView items={notesOut.quiz} />}
                  </div>
                  <div style={{ padding: "10px 20px", borderLeft: "1px solid var(--rule)", borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "flex-end" }}>
                    <SaveOutputButton
                      toolSlug="notes"
                      toolName="Study Engine"
                      input={input}
                      outputText={notesOut.explanation}
                    />
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
              <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
              <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
            </div>
          </main>
        </>
      )}

      {mode === "learn" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (lesson || learnLoading) ? "1fr 1.5fr" : "1fr", gap: 48 }}>
            <div>
              {learnProfile.grade && (
                <div style={{ marginBottom: 16, padding: "10px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Profile</div>
                  <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{learnProfile.grade}{learnProfile.board ? ` · ${learnProfile.board}` : ""}{learnProfile.stream ? ` · ${learnProfile.stream}` : ""}{learnProfile.targetExam ? ` · ${learnProfile.targetExam}` : ""}</div>
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
              <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && learn()}
                placeholder={subject ? `e.g. ${subject === "Mathematics" ? "Integration by parts" : subject === "Physics" ? "Photoelectric effect" : subject === "Chemistry" ? "Acid-base equilibrium" : subject === "Computer Science" ? "Recursion in Python" : subject === "Psychology" ? "Cognitive dissonance" : "Enter a specific topic…"}` : "Select a subject first…"}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
              />
              <button className="btn" onClick={learn} disabled={learnLoading || !subject || !topic.trim()} style={{ opacity: learnLoading || !subject || !topic.trim() ? 0.5 : 1 }}>
                {learnLoading ? "Generating lesson…" : "Teach me →"}
              </button>
              {lesson && <button className="btn ghost" onClick={() => { setLesson(null); setTopic(""); }} style={{ marginLeft: 10 }}>Clear</button>}
              {learnError && <AIErrorDisplay error={learnError} onRetry={learn} inline />}
              {!lesson && !learnLoading && (
                <div style={{ marginTop: 32, border: "1px solid var(--rule)", padding: "20px 18px" }}>
                  <div className="mono cin" style={{ marginBottom: 10 }}>What to try</div>
                  {[["Mathematics","Quadratic equations"],["Physics","Newton's laws of motion"],["Chemistry","Chemical bonding"],["Computer Science","Recursion in Python"],["Psychology","Types of memory"],["Economics","Law of demand"]].map(([subj, t]) => (
                    <button key={t} onClick={() => { setSubject(subj); setTopic(t); }}
                      style={{ display: "block", width: "100%", padding: "8px 0", background: "none", border: "none", borderBottom: "1px solid var(--rule)", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8 }}>{subj}</span>{t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {learnLoading && <AIThinking />}

            {lesson && !learnLoading && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{lesson.title}</div>
                  <div className="mono" style={{ color: "var(--ink-3)", marginTop: 6 }}>{subject} · {learnProfile.grade || "Class 10"}</div>
                </div>
                <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
                  {LESSON_TABS.map((t, i) => (
                    <button key={t.id} onClick={() => setLessonTab(t.id)}
                      style={{ flex: 1, padding: "12px 8px", background: lessonTab === t.id ? "var(--ink)" : "var(--paper)", color: lessonTab === t.id ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: i < LESSON_TABS.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "24px 20px" }}>
                  {lessonTab === "concept" && (
                    <div>
                      <AIOutput text={lesson.concept} noBorder />
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
                  {lessonTab === "examples" && (
                    <div>
                      {lesson.examples.map((ex, i) => (
                        <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < lesson.examples.length - 1 ? "1px solid var(--rule)" : "none" }}>
                          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                            <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8, fontStyle: "normal" }}>{String(i + 1).padStart(2, "0")}</span>{ex.title}
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
                  {lessonTab === "keypoints" && (
                    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                      {lesson.keyPoints.map((pt, i) => (
                        <li key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < lesson.keyPoints.length - 1 ? "1px solid var(--rule)" : "none" }}>
                          <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55 }}>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {lessonTab === "practice" && <PracticeView items={lesson.practice} />}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}
    </div>
  );
}
