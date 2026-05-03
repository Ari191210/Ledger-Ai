"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData, type Exam } from "@/lib/user-data";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(ScrollTrigger, useGSAP);

type DashTool = { slug: string; ttl: string; sub: string; tier: string; desc: string };
type DashCat  = { label: string; tools: DashTool[] };

const TOOL_CATEGORIES: DashCat[] = [
  {
    label: "PLAN",
    tools: [
      { slug: "planner",      ttl: "Smart Study Planner",  sub: "Subjects in. Timetable out.",         tier: "Free", desc: "14-day reactive plan built around your exam dates and daily hours." },
      { slug: "focus",        ttl: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks.",           tier: "Free", desc: "25-min timer that runs in the background across every tool." },
      { slug: "habits",       ttl: "Habit Tracker",        sub: "Build study habits that stick.",      tier: "Free", desc: "Track daily study habits with a 14-day heatmap, streak counter, and weekly score." },
      { slug: "deadlines",    ttl: "Deadline Hub",         sub: "Every deadline. Never miss one.",     tier: "Free", desc: "Add exams, assignments, and applications with priority levels. Countdown timers." },
      { slug: "exam-planner", ttl: "Exam Season Planner",  sub: "Spaced repetition, automatically.",   tier: "Free", desc: "AI builds a spaced-repetition revision schedule around your real exam dates." },
    ],
  },
  {
    label: "LEARN",
    tools: [
      { slug: "notes",         ttl: "Notes Simplifier",   sub: "Textbook → plain English.",            tier: "Free", desc: "AI explanations, summaries, flashcards, and a graded quiz. Saves history." },
      { slug: "doubt",         ttl: "Doubt Solver",       sub: "A question, a worked answer.",         tier: "Pro",  desc: "Type the problem, get a full worked solution with the underlying principle." },
      { slug: "tutor",         ttl: "Topic Tutor",        sub: "Pick a topic. Get a full lesson.",     tier: "Free", desc: "AI generates a personalised lesson with concept, examples, key points and a practice quiz." },
      { slug: "syllabus",      ttl: "Syllabus Parser",    sub: "Upload PDF. Get your year mapped.",    tier: "Free", desc: "Extract subjects, chapters, and topics from any syllabus document." },
      { slug: "mindmap",       ttl: "Mind Map Builder",   sub: "Any topic. Full concept breakdown.",   tier: "Free", desc: "AI generates a full collapsible mind map with depth levels. Print to PDF or export." },
      { slug: "concept-web",   ttl: "Concept Web",        sub: "Any concept, fully mapped.",           tier: "Free", desc: "Deep concept map showing relationships, examples, and connections." },
      { slug: "formula",       ttl: "Formula Sheet",      sub: "Chapter → complete reference card.",   tier: "Free", desc: "Every formula, variable definition, units table, and exam tips — printable." },
      { slug: "lang-analyzer", ttl: "Language Analyzer",  sub: "Unseen text, fully decoded.",          tier: "Free", desc: "Annotates any passage with tone, devices, structure, and exam-ready commentary." },
      { slug: "vocab",         ttl: "Vocabulary Vault",   sub: "Deep word learning with memory hooks.",tier: "Free", desc: "AI generates vocabulary sets with definitions, etymology, synonyms, and memory hooks." },
    ],
  },
  {
    label: "WRITE",
    tools: [
      { slug: "assignment",         ttl: "Assignment Rescue",    sub: "From prompt to outline.",             tier: "Pro",  desc: "Paste the brief. Get structure, argument options, and research directions." },
      { slug: "essay-grader",       ttl: "Essay Grader",         sub: "Paste essay. Get examiner marks.",    tier: "Pro",  desc: "Grade, band score, and detailed feedback on argument, evidence, structure, and language." },
      { slug: "personal-statement", ttl: "Personal Statement",   sub: "Score your uni application essay.",   tier: "Pro",  desc: "1-10 score, hook analysis, paragraph-by-paragraph notes, and a rewritten opening." },
      { slug: "essay-blueprint",    ttl: "Essay Blueprint",      sub: "Structure before you write.",         tier: "Free", desc: "AI generates a full essay structure with thesis, paragraph plan, and signpost phrases." },
      { slug: "research",           ttl: "Research Assistant",   sub: "Any topic. Arguments, stats, angles.",tier: "Pro",  desc: "Full research briefing with for/against arguments, statistics, and essay angles." },
      { slug: "presentation",       ttl: "Presentation Planner", sub: "Topic → full slide deck.",            tier: "Pro",  desc: "AI builds a complete slide deck with speaker notes calibrated to your audience." },
      { slug: "debate",             ttl: "Debate Coach",         sub: "Any motion. Arguments both ways.",    tier: "Pro",  desc: "For and against arguments, evidence, rebuttals, and practice questions." },
      { slug: "citation",           ttl: "Citation Generator",   sub: "APA, MLA, Chicago, Harvard.",        tier: "Free", desc: "Fill in source details → instant formatted citation in 5 styles." },
      { slug: "lab-report",         ttl: "Lab Report Builder",   sub: "Turn experiments into full reports.", tier: "Free", desc: "AI structures your experimental data into a complete IB/A-level lab report." },
      { slug: "argument",           ttl: "Argument Builder",     sub: "P-E-E-L plan from any claim.",        tier: "Free", desc: "Full P-E-E-L plan: thesis, intro, 3 points, counter-argument, rebuttal, conclusion." },
      { slug: "grammar",            ttl: "Grammar Coach",        sub: "Improve academic writing instantly.",  tier: "Free", desc: "Score, fix issues, improve vocabulary, and get a rewritten version of your text." },
      { slug: "model-answer",       ttl: "Model Answer Factory", sub: "See what full marks looks like.",     tier: "Free", desc: "Perfect model answer for any exam question with marking points and structure guide." },
    ],
  },
  {
    label: "PRACTISE",
    tools: [
      { slug: "papers",          ttl: "Past Papers",          sub: "CBSE, JEE, NEET, SAT, IB.",        tier: "Pro",  desc: "47 papers, 900+ questions. 10 random questions per session. Tracks weak topics." },
      { slug: "flashcards",      ttl: "AI Flashcards",        sub: "Topic or notes → flip cards.",      tier: "Free", desc: "AI generates high-quality flashcards. Track known/unknown and drill weak cards." },
      { slug: "exam-sim",        ttl: "Exam Simulator",       sub: "Timed AI exam. Explained answers.", tier: "Pro",  desc: "Full MCQ exam for any subject and level. Timed, with flag-for-review and explanations." },
      { slug: "mark-scheme",     ttl: "Mark Scheme Trainer",  sub: "Real questions. Real marking.",     tier: "Pro",  desc: "AI marks your answers against real marking criteria. Highlights where marks were lost." },
      { slug: "paper-dissector", ttl: "Paper Dissector",      sub: "Decode what examiners want.",       tier: "Free", desc: "AI analyses exam papers to extract question patterns, command words, and mark weightings." },
      { slug: "practice",        ttl: "Practice Problems",    sub: "Graded problems, worked solutions.", tier: "Free", desc: "AI generates 3-10 exam-style problems with step-by-step worked solutions and hints." },
      { slug: "crunch",          ttl: "48-Hour Crunch",       sub: "Exam tomorrow. Smart triage.",      tier: "Free", desc: "Tell the AI what to skip and what to nail. Get a time-blocked priority list." },
      { slug: "dna",             ttl: "Mistake DNA",          sub: "See exactly where you go wrong.",   tier: "Free", desc: "Tracks every wrong answer by category. Pinpoints your highest-leverage weak spots." },
      { slug: "predict",         ttl: "Question Predictor",   sub: "Predict likely exam questions.",    tier: "Free", desc: "AI analyses past paper trends to predict the 6-8 most likely questions for any topic." },
      { slug: "memory-palace",   ttl: "Memory Palace",        sub: "Walk through it. Never forget it.", tier: "Free", desc: "Build a vivid spatial memory palace with locations, images, and stories for any list." },
      { slug: "analogy",         ttl: "Analogy Engine",       sub: "Complex concepts, memorably explained.", tier: "Free", desc: "3 creative analogies with breakdowns and limitations — understand anything deeply." },
      { slug: "exam-strategy",   ttl: "Exam Strategy",        sub: "Personalised exam-day plan.",       tier: "Free", desc: "Time allocation by section, nerve control, last-minute tips, and exam day checklist." },
    ],
  },
  {
    label: "FUTURE",
    tools: [
      { slug: "career",         ttl: "Career Pathfinder",   sub: "For the 14–18 year olds.",          tier: "Pro",  desc: "Quiz → recommended streams, colleges, entrance exams, 5-yr roadmap." },
      { slug: "admissions",     ttl: "Admissions Engine",   sub: "Your real odds. 60 universities.",  tier: "Pro",  desc: "GPA, scores, activities → modelled chances for 60 top universities + essay angles." },
      { slug: "resume",         ttl: "Resume Builder",      sub: "For applications, not LinkedIn.",   tier: "Pro+", desc: "Internships, summer programs, college essays — one polished document." },
      { slug: "interview",      ttl: "Interview Coach",     sub: "Practice. Get scored. Improve.",    tier: "Pro",  desc: "Answer AI questions, get scored on each response with a model answer and coaching tip." },
      { slug: "subject-picker", ttl: "Subject Picker",      sub: "Find the perfect combination.",     tier: "Free", desc: "AI recommends the ideal Grade 11 subject combination based on your goals." },
      { slug: "uni-match",      ttl: "University Match",    sub: "Your grades. Your field. Matched.", tier: "Free", desc: "Input your grades and interests → ranked university matches with fit scores." },
      { slug: "gpa-sim",        ttl: "GPA Simulator",       sub: "Model your grades. Plan your GPA.", tier: "Free", desc: "Add courses, choose your scale, and simulate what grade you need to hit a target GPA." },
    ],
  },
  {
    label: "TRACK",
    tools: [
      { slug: "marks",          ttl: "Marks Predictor",   sub: "The math of your report card.",    tier: "Free", desc: "Weighted GPA, CBSE grade, and the score you need in remaining subjects." },
      { slug: "coach",          ttl: "AI Study Coach",    sub: "Daily briefing + personal chat.",  tier: "Pro",  desc: "Your personal AI. Morning briefing, streak coaching, and free-form study chat." },
      { slug: "rooms",          ttl: "Study Rooms",       sub: "Silent accountability.",           tier: "Pro+", desc: "Shared timer and tasks with friends. Code-based rooms, no sign-up needed." },
      { slug: "compare",        ttl: "Comparison Chart",  sub: "Any concepts, side by side.",      tier: "Free", desc: "Compare 2-4 items across 6-8 criteria. Similarities, differences, and verdict." },
      { slug: "source",         ttl: "Source Analyzer",   sub: "OPCVL analysis in seconds.",       tier: "Free", desc: "Full origin, purpose, content, value, and limitation breakdown for any source." },
      { slug: "case-study",     ttl: "Case Study Pro",    sub: "Business analysis in seconds.",    tier: "Free", desc: "SWOT, Porter's, PESTLE and more. Stakeholders, analysis, recommendations, verdict." },
      { slug: "timeline",       ttl: "Timeline Builder",  sub: "Annotated timelines instantly.",   tier: "Free", desc: "10-14 annotated events with significance ratings, category tags, and key themes." },
      { slug: "reading",        ttl: "Reading Companion", sub: "Full passage analysis + Qs.",      tier: "Free", desc: "Paste any passage. Get tone, themes, devices, comprehension questions, and model answers." },
      { slug: "study-guide",    ttl: "Study Guide",       sub: "Comprehensive guide, any topic.",  tier: "Free", desc: "Complete study guide with sections, must-know facts, common mistakes, and quick review." },
      { slug: "concept-connect",ttl: "Concept Connect",   sub: "Find hidden links between ideas.", tier: "Free", desc: "Discover structural, causal, and philosophical connections between any two concepts." },
      { slug: "score",          ttl: "Ledger Score™",     sub: "Your real-time exam readiness.",   tier: "Free", desc: "A 0–1000 score built from PYQ accuracy, syllabus coverage, and consistency." },
    ],
  },
];

const TIER_COLOR: Record<string, string> = {
  Free: "var(--ink-3)",
  Pro: "var(--cinnabar-ink)",
  "Pro+": "var(--cinnabar-ink)",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type WeakTopic = { topic: string; count: number };
type NextExam = { name: string; days: number };

function useStats() {
  const [streak, setStreak] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [nextExam, setNextExam] = useState<NextExam | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [papersCount, setPapersCount] = useState(0);

  useEffect(() => {
    try {
      setStreak(parseInt(localStorage.getItem("ledger-focus-streak") || "0", 10));

      const timer = JSON.parse(localStorage.getItem("ledger-focus-timer") || "{}");
      setSessionsToday(timer.n || 0);

      const wt = JSON.parse(localStorage.getItem("ledger-weak-topics") || "{}") as Record<string, number>;
      const sorted = Object.entries(wt).sort(([, a], [, b]) => b - a).slice(0, 5).map(([topic, count]) => ({ topic, count }));
      setWeakTopics(sorted);

      const plan = JSON.parse(localStorage.getItem("ledger-plan-v1") || "{}");
      if (plan.subjects?.length) {
        const today = new Date();
        const upcoming = (plan.subjects as Array<{ name: string; exam: string }>)
          .map((s) => ({ name: s.name, days: Math.ceil((new Date(s.exam).getTime() - today.getTime()) / 86400000) }))
          .filter((s) => s.days > 0)
          .sort((a, b) => a.days - b.days);
        if (upcoming.length) setNextExam(upcoming[0]);
      }

      const notes = JSON.parse(localStorage.getItem("ledger-notes-history") || "[]");
      setNotesCount(notes.length);

      const papers = JSON.parse(localStorage.getItem("ledger-papers-log") || "[]");
      setPapersCount(papers.length);
    } catch {}
  }, []);

  return { streak, sessionsToday, weakTopics, nextExam, notesCount, papersCount };
}

const BOARDS = ["CBSE", "ICSE", "IB", "State Board", "JEE", "NEET", "Other"];

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ExamSchedule({ userId, userEmail, userName }: { userId: string; userEmail: string; userName: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", date: "", board: "CBSE" });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadUserData(userId)
      .then((ud) => {
        if (ud) {
          setExams(ud.exams || []);
          setEmailEnabled(ud.emailEnabled || false);
        }
        setLoaded(true);
      })
      .catch(() => { setLoaded(true); });
  }, [userId]);

  async function addExam() {
    if (!form.name || !form.date) return;
    setSaving(true);
    const updated = [...exams, { ...form }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setExams(updated);
    await patchUserData(userId, "exams", updated);
    setForm({ name: "", subject: "", date: "", board: "CBSE" });
    setShowForm(false);
    setSaving(false);
  }

  async function removeExam(i: number) {
    const updated = exams.filter((_, idx) => idx !== i);
    setExams(updated);
    await patchUserData(userId, "exams", updated);
  }

  async function toggleEmail(val: boolean) {
    setEmailEnabled(val);
    await patchUserData(userId, "emailEnabled", val);
  }

  async function sendNow() {
    setSending(true);
    setSendMsg("");
    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: userEmail, name: userName }),
      });
      const json = await res.json();
      setSendMsg(res.ok ? "Report sent. Check your inbox." : `Error: ${json.error}`);
    } catch {
      setSendMsg("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (!loaded) return (
    <div style={{ padding: "20px 0" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Loading schedule…</div>
    </div>
  );

  const upcoming = exams.filter(e => daysUntil(e.date) >= 0).sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  const past = exams.filter(e => daysUntil(e.date) < 0);

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--rule)", paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 500 }}>Exam Schedule</div>
        <button onClick={() => setShowForm(!showForm)} className="btn ghost" style={{ padding: "4px 12px", fontSize: 11 }}>
          {showForm ? "Cancel" : "+ Add exam"}
        </button>
      </div>

      {showForm && (
        <div style={{ border: "1px solid var(--rule)", padding: "20px", marginBottom: 16, background: "var(--paper-2)" }}>
          <div className="mono cin" style={{ marginBottom: 14 }}>New exam</div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Exam name</div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Physics Unit Test"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Subject</div>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Physics"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Date</div>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Board</div>
              <select value={form.board} onChange={e => setForm(f => ({ ...f, board: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}>
                {BOARDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <button className="btn" onClick={addExam} disabled={saving || !form.name || !form.date} style={{ opacity: saving || !form.name || !form.date ? 0.5 : 1 }}>
            {saving ? "Saving…" : "Add exam →"}
          </button>
        </div>
      )}

      {upcoming.length === 0 && !showForm ? (
        <div style={{ padding: "20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>No exams scheduled. Add your upcoming exams to get personalised progress emails.</div>
        </div>
      ) : upcoming.length > 0 ? (
        <div style={{ border: "1px solid var(--rule)", marginBottom: 16 }}>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--paper-2)" }}>
                {[
                  { label: "Exam", cls: "" },
                  { label: "Subject", cls: "mob-exam-hide" },
                  { label: "Board", cls: "mob-exam-hide" },
                  { label: "Date", cls: "" },
                  { label: "Days", cls: "" },
                  { label: "", cls: "" },
                ].map((h, i) => (
                  <th key={i} className={h.cls} style={{ padding: "8px 14px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal", letterSpacing: "0.06em", borderBottom: "1px solid var(--rule)" }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e, i) => {
                const d = daysUntil(e.date);
                return (
                  <tr key={i}>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic", fontWeight: 500, borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{e.name}</td>
                    <td className="mob-exam-hide" style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{e.subject}</td>
                    <td className="mob-exam-hide" style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{e.board}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: d <= 7 ? "var(--cinnabar-ink)" : "var(--ink)", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{d}d</td>
                    <td style={{ padding: "10px 14px", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <button onClick={() => removeExam(i)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {past.length > 0 && (
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 16 }}>{past.length} past exam{past.length > 1 ? "s" : ""} hidden.</div>
      )}

      <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>Weekly Progress Email</div>
          <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>Exam countdown · weak topics · marks · AI study plan · every Monday 8 AM IST</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div onClick={() => toggleEmail(!emailEnabled)}
              style={{ width: 36, height: 20, background: emailEnabled ? "var(--ink)" : "var(--rule)", borderRadius: 10, position: "relative", cursor: "pointer", transition: "background 200ms", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: emailEnabled ? 19 : 3, width: 14, height: 14, background: "white", borderRadius: "50%", transition: "left 200ms" }} />
            </div>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-2)" }}>{emailEnabled ? "On" : "Off"}</span>
          </label>
          <button className="btn ghost" onClick={sendNow} disabled={sending || !emailEnabled} style={{ padding: "6px 14px", fontSize: 11, opacity: sending || !emailEnabled ? 0.4 : 1 }}>
            {sending ? "Sending…" : "Send now →"}
          </button>
        </div>
      </div>
      {sendMsg && (
        <div className="mono" style={{ marginTop: 8, fontSize: 11, color: sendMsg.startsWith("Error") ? "var(--cinnabar-ink)" : "var(--ink-2)" }}>{sendMsg}</div>
      )}
    </div>
  );
}

function SharePanel({ userId, userName }: { userId: string; userName: string }) {
  const [parentCode, setParentCode] = useState("");
  const [copied, setCopied] = useState<"parent" | "ref" | null>(null);

  useEffect(() => {
    loadUserData(userId)
      .then(async (ud) => {
        if (ud?.parentCode) {
          setParentCode(ud.parentCode);
        } else {
          const code = Math.random().toString(36).slice(2, 10);
          setParentCode(code);
          await patchUserData(userId, "parentCode", code).catch(() => {});
          await patchUserData(userId, "parentName", userName).catch(() => {});
        }
      })
      .catch(() => {});
  }, [userId, userName]);

  const referralCode = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const siteBase = typeof window !== "undefined" ? window.location.origin : "https://studyledger.in";

  function copy(text: string, type: "parent" | "ref") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="mob-share" style={{ marginBottom: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)" }}>
      <div style={{ padding: "20px", background: "var(--paper)" }}>
        <div className="mono cin" style={{ marginBottom: 6 }}>Share with parent</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
          Your parent gets a live read-only view of your progress — streak, exams, marks, weak topics.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", padding: "8px 10px", background: "var(--paper-2)", color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {parentCode ? `${siteBase}/parent/${parentCode}` : "Generating…"}
          </div>
          <button className="btn ghost" onClick={() => copy(`${siteBase}/parent/${parentCode}`, "parent")} disabled={!parentCode}
            style={{ padding: "6px 14px", fontSize: 11, flexShrink: 0 }}>
            {copied === "parent" ? "Copied!" : "Copy →"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px", background: "var(--paper)" }}>
        <div className="mono cin" style={{ marginBottom: 6 }}>Refer a friend</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
          Share your referral link. When they sign up, both of you get 1 month Pro free once billing is live.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", padding: "8px 10px", background: "var(--paper-2)", color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {siteBase}/?ref={referralCode}
          </div>
          <button className="btn ghost" onClick={() => copy(`${siteBase}/?ref=${referralCode}`, "ref")}
            style={{ padding: "6px 14px", fontSize: 11, flexShrink: 0 }}>
            {copied === "ref" ? "Copied!" : "Copy →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LedgerScoreWidget() {
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  useEffect(() => {
    try { setScore(computeLedgerScore()); } catch { setScore({ total: 0, pqaScore: 0, syllabusScore: 0, mistakeScore: 0, consistencyScore: 0, pqaAccuracy: 0, papersCount: 0, syllabusUploaded: false, subjectsCovered: 0, subjectsTotal: 0, recentMistakes: 0, streak: 0, actions: ["Upload your syllabus — this alone unlocks up to 250 score points"], subjectAccuracy: [] }); }
  }, []);
  if (!score) return null;
  const tier = scoreTier(score.total);
  const pct = (score.total / 1000) * 100;
  return (
    <Link href="/tools/score" style={{ textDecoration: "none", display: "block", marginBottom: 40, border: "1px solid var(--rule)", padding: "28px 32px", background: "var(--paper-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Ledger Score™</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--ink)" }}>{score.total}</span>
            <span className="mono" style={{ color: "var(--ink-3)" }}>/ 1000 · {tier.label}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ height: 6, background: "var(--paper)", border: "1px solid var(--rule)", marginBottom: 10 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink)", transition: "width 800ms" }} />
          </div>
          {score.actions[0] && (
            <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", lineHeight: 1.5 }}>
              Next: {score.actions[0]}
            </div>
          )}
        </div>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, flexShrink: 0 }}>View breakdown →</div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".dash-header", { opacity: 0, y: 24, duration: 0.7 })
      .from(".dash-stat",   { opacity: 0, y: 20, duration: 0.55, stagger: 0.07 }, "-=0.4");
    ScrollTrigger.batch(".dash-tool", {
      onEnter: els => gsap.from(els, {
        opacity: 0, y: 24, scale: 0.97, duration: 0.55, stagger: 0.04,
        ease: "power2.out", clearProps: "opacity,transform",
      }),
      start: "top 88%", once: true,
    });
  }, { scope: containerRef });

  const [name, setName] = useState(user?.email?.split("@")[0] ?? "student");
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const greeting = getGreeting();

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id)
      .then(ud => {
        if (ud?.username) setName(ud.username);
        const done = localStorage.getItem("ledger-onboarding-done") === "1" || ud?.onboardingDone === true;
        if (!done) setShowProfileBanner(true);
      })
      .catch(() => {});
  }, [user]);
  const { streak, sessionsToday, weakTopics, nextExam, notesCount, papersCount } = useStats();

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main ref={containerRef} className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>

      {/* Command Centre header */}
      <div className="dash-header" style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 24, marginBottom: 32 }}>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>
          Command Centre · {today.toUpperCase()}
        </div>
        <h1 className="mob-heading" style={{ fontFamily: "var(--serif)", fontSize: 52, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.0, margin: 0, color: "var(--ink)" }}>
          {greeting}, {name}.
        </h1>
      </div>

      {/* Profile setup banner */}
      {showProfileBanner && (
        <div style={{ marginBottom: 24, padding: "14px 20px", border: "1px solid var(--cinnabar-ink)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="mono cin" style={{ marginRight: 10 }}>Profile incomplete</span>
            <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>Set your grade, board and interests so every tool is personalised for you.</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button className="btn" onClick={() => router.push("/onboard")} style={{ padding: "6px 16px", fontSize: 11 }}>Set up profile →</button>
            <button className="btn ghost" onClick={() => setShowProfileBanner(false)} style={{ padding: "6px 12px", fontSize: 11 }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Stats bar — 5 bento cells */}
      <div className="mob-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)", marginBottom: 32 }}>
        {[
          { label: "Study streak",    value: `${streak}d`,           sub: streak === 0 ? "Start today" : streak === 1 ? "Keep it up" : "On a roll" },
          { label: "Sessions today",  value: String(sessionsToday),  sub: sessionsToday === 0 ? "None yet" : `${sessionsToday * 25} min focused` },
          { label: "Notes saved",     value: String(notesCount),     sub: notesCount === 0 ? "Generate your first" : "In your library" },
          { label: "Papers done",     value: String(papersCount),    sub: papersCount === 0 ? "Start practising" : "Sessions completed" },
          { label: "Next exam",       value: nextExam ? `${nextExam.days}d` : "—", sub: nextExam ? nextExam.name : "Add below" },
        ].map((s, i) => (
          <div key={i} className="dash-stat" style={{ padding: "18px 20px", background: "var(--paper)" }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, marginTop: 6, color: i === 4 && nextExam && nextExam.days <= 7 ? "var(--cinnabar-ink)" : "var(--ink)" }}>{s.value}</div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Weak topics strip */}
      {weakTopics.length > 0 && (
        <div style={{ marginBottom: 32, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div className="mono cin" style={{ flexShrink: 0 }}>Weak topics</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
            {weakTopics.map((wt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid var(--rule)", background: "var(--paper)" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 12 }}>{wt.topic}</span>
                <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{wt.count}✗</span>
              </div>
            ))}
          </div>
          <Link href="/tools/papers" className="mono" style={{ color: "var(--ink-3)", fontSize: 10, whiteSpace: "nowrap" }}>Practice → </Link>
        </div>
      )}

      {/* Ledger Score */}
      <LedgerScoreWidget />

      {/* Exam schedule */}
      {user && (
        <ExamSchedule
          userId={user.id}
          userEmail={user.email ?? ""}
          userName={name}
        />
      )}

      {/* Share with parent + referral */}
      {user && (
        <SharePanel userId={user.id} userName={name} />
      )}

      {/* Tools grid — categorised */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--rule)", paddingBottom: 14, marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 500 }}>The Archive</div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>55 tools · click to open</div>
        </div>
        {TOOL_CATEGORIES.map(cat => (
          <div key={cat.label} style={{ marginBottom: 36 }}>
            <div style={{ marginBottom: 12 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.16em", color: "var(--cinnabar-ink)" }}>{cat.label}</div>
            </div>
            <div className="mob-2col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)" }}>
              {cat.tools.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="dash-tool"
                  style={{
                    textDecoration: "none",
                    padding: "20px 18px 16px", background: "var(--paper)", display: "flex",
                    flexDirection: "column", color: "var(--ink)", minHeight: 160,
                    transition: "background 120ms",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--paper-2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--paper)")}
                >
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                    <div className="mono" style={{ fontSize: 8, color: TIER_COLOR[t.tier] }}>{t.tier}</div>
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 500, fontStyle: "italic", lineHeight: 1.2 }}>{t.ttl}</div>
                  <div className="mono" style={{ color: "var(--ink-3)", marginTop: 5, fontSize: 8, lineHeight: 1.5 }}>{t.sub}</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginTop: 8 }}>{t.desc}</div>
                  <div style={{ flex: 1 }} />
                  <div className="mono" style={{ borderTop: "1px solid var(--rule)", marginTop: 12, paddingTop: 8, display: "flex", justifyContent: "flex-end", fontSize: 8, color: "var(--ink-3)" }}>
                    <span>↗</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mono" style={{ marginTop: 24, color: "var(--ink-3)", fontSize: 10, textAlign: "right" }}>
        <Link href="/" style={{ color: "var(--ink-3)" }}>← Back to home</Link>
      </div>
    </main>
  );
}
