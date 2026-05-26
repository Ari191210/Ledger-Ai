"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData, type Exam } from "@/lib/user-data";
import { trackToolVisit, getRecentTools, getFavTools, saveFavTools } from "@/lib/recent-tools";
import { CAT_COLOR } from "@/lib/tools-registry";
import { getDashLayout, type DashLayout, DASH_DEFAULTS } from "@/lib/dash-layout";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";
import FeaturesShowcase from "@/components/features-showcase";
import DashboardSkeleton from "@/components/dashboard-skeleton";
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
      { slug: "study-command", ttl: "Study Command",  sub: "Planner, habits, coach, deadlines.",      tier: "Free", desc: "Four tools in one: 14-day study planner, daily habit tracker with heatmap, deadline countdown hub, and your personal AI study coach." },
      { slug: "focus-lab",    ttl: "Focus Lab",       sub: "Deep focus. Pomodoro. Break blocks.",     tier: "Free", desc: "Pomodoro timer, focus sessions, debt meter, circadian tracker, and circuit breaker to end procrastination." },
    ],
  },
  {
    label: "LEARN",
    tools: [
      { slug: "learn-lab",    ttl: "Learn Lab",       sub: "Doubt, Feynman, notes, mindmap.",         tier: "Free", desc: "Five tools in one: solve doubts with worked solutions, learn via Feynman technique, generate study notes, build mind maps, and find concept connections." },
      { slug: "language-lab", ttl: "Language Lab",    sub: "Unseen text decoded + vocabulary vault.", tier: "Free", desc: "Language Analyzer annotates any passage with tone, devices, structure, and commentary. Vocabulary Vault generates word sets with etymology and memory hooks." },
      { slug: "syllabus",     ttl: "Syllabus Parser", sub: "Upload PDF. Get your year mapped.",       tier: "Free", desc: "Extract subjects, chapters, and topics from any syllabus document. Unlocks 250 Ledger Score points instantly." },
    ],
  },
  {
    label: "WRITE",
    tools: [
      { slug: "writing-tools",    ttl: "Writing Tools",         sub: "Essay workshop + writing polish.",         tier: "Free", desc: "Essay Blueprint (plan, argue, grade) and Writing Polish (grammar, style, personal statement) combined in one tab-switched hub." },
      { slug: "research-suite",   ttl: "Research Suite",        sub: "Deep research or plan your assignment.",   tier: "Pro",  desc: "Full research briefing with arguments, statistics, and essay angles — or turn a brief into a structured assignment plan." },
      { slug: "presentation",     ttl: "Presentation Planner",  sub: "Topic → full slide deck.",                 tier: "Pro",  desc: "AI builds a complete slide deck with speaker notes calibrated to your audience and subject." },
      { slug: "debate",           ttl: "Debate Coach",          sub: "Any motion. Arguments both ways.",         tier: "Pro",  desc: "For and against arguments, evidence, rebuttals, and practice questions for any debate motion." },
      { slug: "citation",         ttl: "Citation Builder",      sub: "Cite anything. Any style.",                tier: "Free", desc: "Generate properly formatted citations in Harvard, APA, MLA, Chicago, and more from any source type." },
      { slug: "lab-report",       ttl: "Lab Report Writer",     sub: "Lab data → structured report.",           tier: "Free", desc: "Turn raw experimental data into a structured lab report with aim, method, results, and conclusion." },
      { slug: "model-answer",     ttl: "Model Answer Factory",  sub: "See what full marks looks like.",          tier: "Free", desc: "Perfect model answer for any exam question with marking points, structure guide, and examiner commentary." },
      { slug: "reference-builder",ttl: "Reference Builder",     sub: "Build your source list.",                  tier: "Free", desc: "Collect, organise, and export your reference list in any citation style for any essay or project." },
      { slug: "report-tools",     ttl: "Report Tools",          sub: "Case studies, business reports, more.",    tier: "Free", desc: "A suite of report writing tools: case study deconstructor, business report builder, and structured academic reports." },
    ],
  },
  {
    label: "PRACTISE",
    tools: [
      { slug: "exam-practice",      ttl: "Exam Practice Hub",      sub: "Papers, triage, crunch, formula.",       tier: "Pro",  desc: "Six tools: Past Papers (47 papers, 900+ questions), Paper Panic Triage, 48h Crunch Plan, Question Decoder, Formula Sheet, and Formula Recall." },
      { slug: "recall-studio",      ttl: "Recall Studio",          sub: "Flashcards + formula recall drills.",    tier: "Free", desc: "AI generates flashcards from notes or any topic. Formula Recall drills formulas with active recall — beats re-reading by 4×." },
      { slug: "exam-planner",       ttl: "Revision Planner",       sub: "Spaced revision schedule.",              tier: "Free", desc: "AI builds a revision schedule around your exam dates with Ebbinghaus intervals. Track topic half-life and predict which questions will come up." },
      { slug: "exam-triage",        ttl: "Exam Triage",            sub: "48-hour crunch + syllabus cremator.",    tier: "Free", desc: "48-Hour Crunch builds a rescue plan from your topics and time left. Syllabus Cremator ranks every chapter by examiner obsession." },
      { slug: "practice",           ttl: "Practice Suite",         sub: "Practice problems or full mock exam.",   tier: "Free", desc: "Generate graded practice problems with worked solutions — or sit a full timed mock MCQ exam with flag-for-review and results breakdown." },
      { slug: "post-exam",          ttl: "Post-Exam Analysis",     sub: "Mistake DNA + exam debrief.",            tier: "Free", desc: "Mistake DNA maps your error fingerprint by category and subject. Exam Debrief gives you a personalised AI coaching note after every test." },
      { slug: "memory-toolkit",     ttl: "Memory Toolkit",         sub: "Analogy + memory palace.",               tier: "Free", desc: "Build powerful analogies to explain any concept, or construct a memory palace for recalling sequences, lists, and processes." },
      { slug: "flashcards",         ttl: "Flashcard Studio",       sub: "Active recall, anytime.",                tier: "Free", desc: "AI-generated flashcards for any topic or set of notes, with a flip-card interface and spaced repetition tracking." },
      { slug: "exam-sim",           ttl: "Exam Simulator",         sub: "Full timed mock exam.",                  tier: "Pro",  desc: "Sit a complete timed exam with real-style questions, flag-for-review, auto-marking, and a full performance breakdown at the end." },
      { slug: "forgetting-forecast",ttl: "Forgetting Forecast",    sub: "See when you'll forget.",                tier: "Free", desc: "Ebbinghaus-based decay model shows exactly when each topic will slip below recall threshold — so you revise at the right moment." },
      { slug: "calibration",        ttl: "Confidence Calibrator",  sub: "Know what you actually know.",           tier: "Free", desc: "Rate your confidence on each topic, then test it. The gap between confidence and accuracy reveals your exact blind spots." },
      { slug: "dna",                ttl: "Mistake DNA",            sub: "Your error fingerprint.",                tier: "Free", desc: "Categorise mistakes by type: conceptual, calculation, recall, or careless. Your error pattern tells you exactly how to fix it." },
      { slug: "cremator",           ttl: "Syllabus Cremator",      sub: "Kill the filler. Keep the core.",        tier: "Free", desc: "Ranks every chapter by examiner obsession score. Tells you what to DO NOW, skim, or skip entirely — in order of priority." },
      { slug: "paper-pattern",      ttl: "Paper Pattern Analyser", sub: "Decode what examiners want.",            tier: "Free", desc: "Analyse past paper patterns to surface which topics, question types, and mark allocations appear most frequently." },
    ],
  },
  {
    label: "FUTURE",
    tools: [
      { slug: "admissions", ttl: "Admissions Engine", sub: "Your real odds. 60 universities.",         tier: "Pro",  desc: "University matching, subject combination advice, career path quiz, and modelled admission chances for 60 top universities." },
      { slug: "resume",     ttl: "Resume Builder",    sub: "For applications, not LinkedIn.",          tier: "Pro",  desc: "Internships, summer programs, college applications — one polished document built from your experience and goals." },
      { slug: "interview",  ttl: "Interview Coach",   sub: "Practice. Get scored. Improve.",           tier: "Pro",  desc: "Answer AI interview questions, get scored on each response with a model answer and a specific coaching tip." },
      { slug: "gpa-sim",    ttl: "GPA Simulator",     sub: "Simulate your GPA trajectory.",            tier: "Free", desc: "Enter your grades and targets — see exactly what you need in each remaining subject to hit your GPA or percentage goal." },
    ],
  },
  {
    label: "TRACK",
    tools: [
      { slug: "grade-tracker",  ttl: "Grade Tracker",           sub: "Marks, score, heatmap, debrief.",      tier: "Free", desc: "Weighted grade predictor, Ledger Score™ breakdown, peer performance heatmap, and post-exam debrief — all in one hub." },
      { slug: "rooms",          ttl: "Study Rooms",             sub: "Silent accountability.",               tier: "Pro+", desc: "Shared timer and tasks with friends. Code-based rooms, no sign-up needed for guests." },
      { slug: "compare",        ttl: "Comparison Chart",        sub: "Any concepts, side by side.",          tier: "Free", desc: "Compare 2–4 items across 6–8 criteria. Similarities, differences, and a clear verdict in a clean table." },
      { slug: "source",         ttl: "Source Analyser",         sub: "Analyse any source.",                  tier: "Free", desc: "Deconstruct any primary or secondary source: origin, purpose, value, limitation, and historical context." },
      { slug: "case-study",     ttl: "Case Study Decoder",      sub: "Deconstruct any case study.",          tier: "Free", desc: "Break down any business, science, or humanities case study into structured analysis with key lessons and frameworks." },
      { slug: "timeline",       ttl: "Timeline Builder",        sub: "Build any historical timeline.",       tier: "Free", desc: "Generate a structured chronological timeline for any topic, event sequence, or historical period." },
      { slug: "study-guide",    ttl: "Study Guide Generator",   sub: "One topic. One clean guide.",          tier: "Free", desc: "Turn any topic, chapter, or set of notes into a structured study guide with key points, definitions, and practice questions." },
      { slug: "analysis-hub",   ttl: "Analysis Hub",            sub: "Analyse anything deeply.",             tier: "Free", desc: "Deep analytical breakdown of any text, data, event, or concept — structured and ready for academic use." },
      { slug: "personalise",    ttl: "Personalise",             sub: "Your study profile.",                  tier: "Free", desc: "Set your grade level, board, subjects, and learning preferences so every tool is tailored specifically to you." },
    ],
  },
];


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
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [favSlugs, setFavSlugs] = useState<Set<string>>(new Set());

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

      setRecentSlugs(getRecentTools());
      setFavSlugs(new Set(getFavTools()));
    } catch {}
  }, []);

  function toggleFav(slug: string) {
    setFavSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      saveFavTools(Array.from(next));
      return next;
    });
  }

  return { streak, sessionsToday, weakTopics, nextExam, notesCount, papersCount, recentSlugs, favSlugs, toggleFav };
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
        <div className="gl-pane-alt" style={{ border: "1px solid var(--rule)", padding: "20px", marginBottom: 16 }}>
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
        <div className="gl-pane-alt" style={{ padding: "20px", border: "1px solid var(--rule)" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>No exams scheduled. Add your upcoming exams to get personalised progress emails.</div>
        </div>
      ) : upcoming.length > 0 ? (
        <div style={{ border: "1px solid var(--rule)", marginBottom: 16 }}>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="gl-pane-alt">
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

      <div className="gl-pane-alt" style={{ border: "1px solid var(--rule)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
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
      <div className="gl-pane" style={{ padding: "20px" }}>
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

      <div className="gl-pane" style={{ padding: "20px" }}>
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
  const pillars = [
    { label: "PYQ",      val: score.pqaScore,        max: 400 },
    { label: "Syllabus", val: score.syllabusScore,    max: 250 },
    { label: "Mistakes", val: score.mistakeScore,     max: 200 },
    { label: "Streak",   val: score.consistencyScore, max: 150 },
  ];
  return (
    <Link href="/tools/score" style={{ textDecoration: "none", display: "block", marginBottom: 40, border: "1px solid var(--rule)", color: "inherit" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 20px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.16em", textTransform: "uppercase" as const }}>Ledger Score™</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em" }}>View breakdown →</span>
      </div>
      {/* Body: score + 4 pillar rows */}
      <div className="dash-score-body" style={{ display: "flex", background: "var(--paper)" }}>
        <div style={{ padding: "24px 28px", borderRight: "1px solid var(--rule)", flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 52, fontWeight: 800, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>{score.total}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginTop: 8 }}>{tier.label} · /1000</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "18px 22px", gap: 11 }}>
          {pillars.map(p => (
            <div key={p.label} style={{ display: "grid", gridTemplateColumns: "72px 42px 1fr", gap: 10, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{p.label}</span>
              <span style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 13, fontWeight: 700, color: "var(--ink)", textAlign: "right" as const }}>
                {p.val}<span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", fontWeight: 400 }}>/{p.max}</span>
              </span>
              <div style={{ height: 4, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                <div style={{ height: "100%", width: `${Math.min(100, Math.round((p.val / p.max) * 100))}%`, background: "var(--ink)", transition: "width 800ms ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Action */}
      {score.actions[0] && (
        <div style={{ padding: "9px 20px", borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.06em" }}>↳ {score.actions[0]}</span>
        </div>
      )}
    </Link>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
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
  const [toolQuery, setToolQuery] = useState("");
  const [dashLayout, setDashLayout] = useState<DashLayout>(DASH_DEFAULTS);
  useEffect(() => { setDashLayout(getDashLayout()); }, []);
  const greeting = getGreeting();

  type Announcement = { id: string; message: string; style: "banner" | "modal" };
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  useEffect(() => {
    fetch("/api/admin/broadcast")
      .then(r => r.json())
      .then(d => {
        if (!d.announcement) return;
        const a: Announcement = d.announcement;
        if (a.style === "modal") {
          const key = `ledger-modal-dismissed-${a.id}`;
          if (sessionStorage.getItem(key)) return;
        }
        setAnnouncement(a);
      })
      .catch(() => {});
  }, []);

  const filteredCategories = useMemo(() => {
    const q = toolQuery.trim().toLowerCase();
    if (!q) return TOOL_CATEGORIES;
    return TOOL_CATEGORIES
      .map(cat => ({
        ...cat,
        tools: cat.tools.filter(t =>
          t.ttl.toLowerCase().includes(q) ||
          t.sub.toLowerCase().includes(q) ||
          t.desc.toLowerCase().includes(q) ||
          cat.label.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.tools.length > 0);
  }, [toolQuery]);

  const totalMatches = filteredCategories.reduce((sum, cat) => sum + cat.tools.length, 0);

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
  const { streak, sessionsToday, weakTopics, nextExam, notesCount, papersCount, recentSlugs, favSlugs, toggleFav } = useStats();

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  if (authLoading) return <DashboardSkeleton />;

  return (
    <main ref={containerRef} id="main-content" tabIndex={-1} className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>

      {/* Command Centre header */}
      <div className="dash-header" style={{ borderBottom: "1px solid var(--rule)", paddingBottom: 24, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>
              Command Centre · {today.toUpperCase()}
            </div>
            <h1 className="mob-heading" style={{ fontFamily: "var(--serif)", fontSize: 52, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.0, margin: 0, color: "var(--ink)" }}>
              {greeting}, {name}.
            </h1>
          </div>
          {/* Streak badge */}
          {streak > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, paddingTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 9999, border: "1.5px solid color-mix(in srgb, var(--cinnabar) 40%, transparent)", background: "color-mix(in srgb, var(--cinnabar) 7%, transparent)", backdropFilter: "blur(8px)" }}>
                <span style={{ fontSize: 20 }}>🔥</span>
                <span style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--cinnabar-ink)", lineHeight: 1 }}>{streak}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", opacity: 0.8 }}>day streak</span>
              </div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{streak >= 7 ? "On a serious roll" : streak >= 3 ? "Building momentum" : "Keep it going"}</div>
            </div>
          )}
        </div>

        {/* Quick-launch pills */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {[
            { label: "Doubt Solver", slug: "doubt" },
            { label: "Practice", slug: "practice" },
            { label: "Notes", slug: "notes" },
            { label: "Grade Tracker", slug: "grade-tracker" },
          ].map(item => (
            <Link key={item.slug} href={`/tools/${item.slug}`} onClick={() => trackToolVisit(item.slug)}
              className="btn ghost" style={{ padding: "7px 16px", fontSize: 11, textDecoration: "none" }}>
              {item.label}
            </Link>
          ))}
          <Link href="/dashboard/saved" className="btn ghost" style={{ padding: "7px 16px", fontSize: 11, textDecoration: "none" }}>
            Saved →
          </Link>
          <button className="btn ghost" style={{ padding: "7px 16px", fontSize: 11 }}
            onClick={() => { const e = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }); document.dispatchEvent(e); }}>
            ⌘K Search
          </button>
        </div>
      </div>

      {/* Profile setup banner */}
      {showProfileBanner && (
        <div className="gl-pane-alt" style={{ marginBottom: 24, padding: "14px 20px", border: "1px solid var(--cinnabar-ink)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
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

      {/* Announcement banner */}
      {announcement?.style === "banner" && (
        <div style={{ marginBottom: 24, padding: "12px 20px", background: "var(--ink)", color: "var(--paper)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{announcement.message}</span>
          <button onClick={() => setAnnouncement(null)} style={{ background: "none", border: "none", color: "var(--paper)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, opacity: 0.7, flexShrink: 0, padding: "0 4px" }}>✕</button>
        </div>
      )}

      {/* Announcement modal */}
      {announcement?.style === "modal" && !modalDismissed && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="gl-pane" style={{ maxWidth: 480, width: "100%", padding: "36px 32px", border: "1px solid var(--rule)", position: "relative" }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>Announcement</div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.6, color: "var(--ink)", margin: "0 0 28px" }}>{announcement.message}</p>
            <button className="btn" onClick={() => {
              sessionStorage.setItem(`ledger-modal-dismissed-${announcement.id}`, "1");
              setModalDismissed(true);
              setAnnouncement(null);
            }} style={{ padding: "8px 24px", fontSize: 12 }}>Got it</button>
          </div>
        </div>
      )}

      {/* Jump back in — recently used tools, at the top of the dashboard */}
      {recentSlugs.length > 0 && (() => {
        const allTools = TOOL_CATEGORIES.flatMap(c => c.tools);
        const recent = recentSlugs.slice(0, 6)
          .map(s => allTools.find(t => t.slug === s))
          .filter(Boolean) as typeof allTools;
        if (!recent.length) return null;
        return (
          <div style={{ marginBottom: 32 }}>
            {/* Section divider — matches SectionLabel style */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.18em", flexShrink: 0 }}>↩</span>
              <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase", flexShrink: 0 }}>Jump back in</span>
            </div>

            {/* Tool cards — rounded bubbly grid */}
            <div style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap:                 12,
            }}>
              {recent.map(t => {
                const cat      = TOOL_CATEGORIES.find(c => c.tools.some(x => x.slug === t.slug));
                const catLabel = cat?.label ?? "";
                const catColor = CAT_COLOR[catLabel as keyof typeof CAT_COLOR] ?? "var(--ink-3)";
                return (
                  <Link
                    key={t.slug}
                    href={`/tools/${t.slug}`}
                    onClick={() => trackToolVisit(t.slug)}
                    style={{
                      textDecoration: "none",
                      display:        "flex",
                      flexDirection:  "column",
                      gap:            8,
                      padding:        "18px 20px 16px",
                      background:     "var(--paper)",
                      borderRadius:   14,
                      border:         `1.5px solid color-mix(in srgb, ${catColor} 30%, var(--rule))`,
                      boxShadow:      "0 2px 8px rgba(0,0,0,0.10)",
                      transition:     "transform 280ms cubic-bezier(0.34,1.4,0.64,1), box-shadow 240ms ease, background 160ms ease",
                    }}
                    onMouseOver={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background  = "var(--paper-2)";
                      el.style.transform   = "translateY(-6px) scale(1.03)";
                      el.style.boxShadow   = `0 0 0 1.5px ${catColor}, 0 18px 44px rgba(0,0,0,0.32), 0 0 36px color-mix(in srgb, ${catColor} 14%, transparent)`;
                    }}
                    onMouseOut={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background  = "var(--paper)";
                      el.style.transform   = "";
                      el.style.boxShadow   = "0 2px 8px rgba(0,0,0,0.10)";
                    }}
                  >
                    {/* Category tag */}
                    <div style={{
                      fontFamily:    "var(--mono)",
                      fontSize:      8,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color:         catColor,
                    }}>
                      {catLabel}
                    </div>

                    {/* Tool name */}
                    <div style={{
                      fontFamily: "var(--serif)",
                      fontSize:   14,
                      fontWeight: 600,
                      color:      "var(--ink)",
                      lineHeight: 1.25,
                      flex:       1,
                    }}>
                      {t.ttl}
                    </div>

                    {/* Open arrow */}
                    <div style={{
                      fontFamily:    "var(--mono)",
                      fontSize:      9,
                      color:         catColor,
                      letterSpacing: "0.06em",
                      marginTop:     4,
                    }}>
                      Open →
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Stats bar — 5 bento cells */}
      <div className="mob-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--rule)", border: "1px solid var(--rule)", marginBottom: 32 }}>
        {[
          { label: "Study streak",    value: streak > 0 ? `${streak}d` : "—",     sub: streak === 0 ? "Start today" : streak === 1 ? "Keep it up" : "On a roll", hot: streak >= 3 },
          { label: "Sessions today",  value: String(sessionsToday),                sub: sessionsToday === 0 ? "None yet" : `${sessionsToday * 25} min focused`, hot: false },
          { label: "Notes saved",     value: String(notesCount),                   sub: notesCount === 0 ? "Generate your first" : "In your library", hot: false },
          { label: "Papers done",     value: String(papersCount),                  sub: papersCount === 0 ? "Start practising" : "Sessions completed", hot: false },
          { label: "Next exam",       value: nextExam ? `${nextExam.days}d` : "—", sub: nextExam ? nextExam.name : "Add below", hot: !!nextExam && nextExam.days <= 7 },
        ].map((s, i) => (
          <div key={i} className="dash-stat gl-pane" style={{ padding: "18px 20px", borderLeft: s.hot ? "2px solid var(--cinnabar)" : undefined }}>
            <div className="mono" style={{ color: s.hot ? "var(--cinnabar-ink)" : "var(--ink-3)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, marginTop: 6, color: s.hot ? "var(--cinnabar-ink)" : "var(--ink)" }}>{s.value}</div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Weak topics strip */}
      {weakTopics.length > 0 && (
        <div className="gl-pane-alt" style={{ marginBottom: 32, padding: "16px 20px", border: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
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

      {/* Daily recommendation */}
      {dashLayout.recommendation && weakTopics.length > 0 && (
        <div className="gl-pane-alt" style={{ marginBottom: 32, border: "1px solid var(--cinnabar-ink)", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div className="mono cin" style={{ fontSize: 9, letterSpacing: "0.16em", marginBottom: 6 }}>Recommended now</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.4 }}>
              You&apos;ve missed <strong style={{ fontStyle: "normal" }}>{weakTopics[0].topic}</strong> {weakTopics[0].count}× in practice. Run Exam Simulator on it.
            </div>
          </div>
          <Link href="/tools/exam-sim" className="btn" style={{ padding: "8px 18px", fontSize: 11, flexShrink: 0, textDecoration: "none" }}>Open →</Link>
        </div>
      )}

      {/* Recently used — now shown at top, skip here */}

      {/* Ledger Score */}
      {dashLayout.score && <LedgerScoreWidget />}

      {/* Exam schedule */}
      {dashLayout.exams && user && (
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

      {/* Features nobody else ships */}
      {dashLayout.features && <FeaturesShowcase />}

      {/* Favorites strip */}
      {favSlugs.size > 0 && (() => {
        const allTools = TOOL_CATEGORIES.flatMap(c => c.tools);
        const favs = Array.from(favSlugs).map(s => allTools.find(t => t.slug === s)).filter(Boolean) as typeof allTools;
        return (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--rule)", paddingBottom: 10, marginBottom: 14 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--cinnabar-ink)" }}>★ Favourites</div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{favs.length} pinned</div>
            </div>
            <div className="mob-2col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {favs.map((t, ti) => {
                const favCat      = TOOL_CATEGORIES.find(c => c.tools.some(x => x.slug === t.slug));
                const favCatColor = CAT_COLOR[(favCat?.label ?? "") as keyof typeof CAT_COLOR] ?? "var(--cinnabar-ink)";
                return (
                <Link key={t.slug} href={`/tools/${t.slug}`} className="dash-tool gl-pane"
                  onClick={() => trackToolVisit(t.slug)}
                  style={{
                    textDecoration: "none", padding: "18px 20px 14px",
                    display: "flex", flexDirection: "column", color: "var(--ink)", minHeight: 120,
                    "--cat-color": favCatColor,
                  } as React.CSSProperties}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div className="mono" style={{ fontSize: 7, letterSpacing: "0.14em", color: favCatColor }}>★</div>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(t.slug); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", padding: 0 }}>✕</button>
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 500, fontStyle: "italic", color: "var(--ink)", flex: 1 }}>{t.ttl}</div>
                  <div style={{ borderTop: "1px solid var(--rule)", marginTop: 10, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <div className="mono" style={{ fontSize: 7, color: "var(--ink-3)" }}>{String(ti + 1).padStart(2, "0")}</div>
                    <span className="dash-tool-arrow mono" style={{ fontSize: 11 }}>↗</span>
                  </div>
                </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Tools grid — categorised */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--rule)", paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 500 }}>The Archive</div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>41 tools · click to open</div>
        </div>

        {/* Tool search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, border: "none", borderRadius: 12, background: "color-mix(in srgb, var(--ink) 7%, transparent)", padding: "0 14px", marginBottom: 28, height: 42, boxShadow: "inset 0 1px 0 color-mix(in srgb, white 10%, transparent)" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--ink-3)", flexShrink: 0 }}>⌕</span>
          <input
            type="search"
            value={toolQuery}
            onChange={e => setToolQuery(e.target.value)}
            placeholder="Search 41 tools…"
            aria-label="Search tools"
            aria-controls="tools-grid"
            style={{
              flex: 1, background: "transparent", border: "none",
              fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)",
              outline: "none",
            }}
          />
          {toolQuery && (
            <>
              <span
                className="mono"
                aria-live="polite"
                aria-atomic="true"
                style={{ color: totalMatches > 0 ? "var(--ink-3)" : "var(--cinnabar-ink)", fontSize: 9, flexShrink: 0 }}
              >
                {totalMatches > 0 ? `${totalMatches} result${totalMatches !== 1 ? "s" : ""}` : "No matches"}
              </span>
              <button
                onClick={() => setToolQuery("")}
                aria-label="Clear search"
                style={{
                  background: "color-mix(in srgb, var(--ink) 8%, transparent)", border: "none",
                  color: "var(--ink-3)", cursor: "pointer",
                  padding: "2px 8px", fontFamily: "var(--mono)", fontSize: 10,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </>
          )}
        </div>

        {/* No results state */}
        {filteredCategories.length === 0 && toolQuery && (
          <div style={{ padding: "48px 20px", textAlign: "center", border: "1px solid var(--rule)" }}>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, color: "var(--ink-3)" }}>
              No tools match &ldquo;{toolQuery}&rdquo;
            </div>
            <button onClick={() => setToolQuery("")} className="btn ghost" style={{ marginTop: 16, padding: "6px 16px", fontSize: 11 }}>
              Clear search
            </button>
          </div>
        )}

        <div id="tools-grid">
        {filteredCategories.map(cat => (
          <div key={cat.label} style={{ marginBottom: 40 }}>
            <div style={{ marginBottom: 12, display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--cinnabar-ink)" }}>{cat.label}</div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{cat.tools.length} tools</div>
            </div>
            <div className="mob-2col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {cat.tools.map((t, ti) => {
                const catColor = CAT_COLOR[cat.label as keyof typeof CAT_COLOR] ?? "var(--cinnabar-ink)";
                return (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="dash-tool gl-pane"
                  aria-label={`Open ${t.ttl} — ${t.sub}`}
                  onClick={() => trackToolVisit(t.slug)}
                  style={{
                    textDecoration: "none",
                    padding: "22px 20px 18px",
                    display: "flex", flexDirection: "column",
                    color: "var(--ink)", minHeight: 188,
                    "--cat-color": catColor,
                  } as React.CSSProperties}
                >
                  {/* Card header: category label + fav star + tier badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div className="mono" style={{ fontSize: 7, letterSpacing: "0.2em", color: "var(--cinnabar-ink)" }}>{cat.label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(t.slug); }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 12, color: favSlugs.has(t.slug) ? "var(--cinnabar-ink)" : "var(--ink-3)", opacity: favSlugs.has(t.slug) ? 1 : 0.4, transition: "opacity 160ms, color 160ms", lineHeight: 1 }}
                        aria-label={favSlugs.has(t.slug) ? "Unfavorite" : "Favorite"}
                      >
                        {favSlugs.has(t.slug) ? "★" : "☆"}
                      </button>
                      {t.tier !== "Free" && (
                        <div className="mono" style={{ fontSize: 7, letterSpacing: "0.1em", color: "var(--cinnabar-ink)", border: "1px solid var(--cinnabar-ink)", padding: "1px 6px", opacity: 0.7 }}>
                          {t.tier}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500, fontStyle: "italic", lineHeight: 1.15, color: "var(--ink)", marginBottom: 7 }}>
                    {t.ttl}
                  </div>

                  {/* Subtitle */}
                  <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.12em", lineHeight: 1.4 }}>
                    {t.sub}
                  </div>

                  {/* Description */}
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.65, marginTop: 10, flex: 1 }}>
                    {t.desc}
                  </div>

                  {/* Footer: index + animated arrow */}
                  <div style={{ borderTop: "1px solid var(--rule)", marginTop: 14, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
                      {String(ti + 1).padStart(2, "0")}
                    </div>
                    <span className="dash-tool-arrow mono" style={{ fontSize: 13 }} aria-hidden="true">↗</span>
                  </div>
                </Link>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>

      <div className="mono" style={{ marginTop: 24, color: "var(--ink-3)", fontSize: 10, textAlign: "right" }}>
        <Link href="/" style={{ color: "var(--ink-3)" }}>← Back to home</Link>
      </div>
    </main>
  );
}
