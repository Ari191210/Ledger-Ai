"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData, type Exam } from "@/lib/user-data";
import { supabase } from "@/lib/supabase";
import { trackToolVisit, getRecentTools, getFavTools, saveFavTools } from "@/lib/recent-tools";
import { CAT_COLOR } from "@/lib/tools-registry";
import { getDashLayout, type DashLayout, DASH_DEFAULTS } from "@/lib/dash-layout";
import { computeLedgerScore, scoreTier, type ScoreBreakdown } from "@/lib/ledger-score";
import { track } from "@/lib/posthog";
import FeaturesShowcase from "@/components/features-showcase";
import { GooeyInput } from "@/components/ui/gooey-input";
import DashboardSkeleton from "@/components/dashboard-skeleton";
import EmptyChair from "@/components/empty-chair";
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
      { slug: "paper-autopsy",      ttl: "Paper Autopsy",          sub: "Dissect every mark you lost.",              tier: "Free", desc: "Upload your answer sheet and get a full breakdown: every error type, every weak subtopic, and a personalised drill plan to fix them before the next paper." },
      { slug: "marks-obituary",     ttl: "Marks Obituary",         sub: "Write the obituary. Get the autopsy.",      tier: "Free", desc: "Write a 60-word obituary for the marks you should have got. The AI files a forensic coroner's report: cause of death, time of death, and a prevention protocol." },
      { slug: "panic-triage", ttl: "Paper Panic Triage", sub: "2AM before the exam — tell me exactly what to do in the", tier: "Free", desc: "At 11PM the night before a JEE/NEET/Board paper, a student has 6 hours left and 14 chapters half-revised. They open 4 Yo" },
      { slug: "marks-forensics", ttl: "Marks Forensics", sub: "Paste your answer. Know exactly which line lost you mar", tier: "Free", desc: "After every board exam or test, students get a number back — 34/50, 67/100 — and have no idea why. They lost 16 marks so" },
      { slug: "paper-trauma", ttl: "Paper Trauma Map", sub: "Find the exact questions that broke you — and why you'l", tier: "Free", desc: "At 2AM before a JEE/NEET paper, students stare at their last 3 mock results and cannot answer one question: which specif" },
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
      { slug: "silent-topics",   ttl: "Silent Topic Finder",     sub: "Find what you've been avoiding.",      tier: "Free", desc: "Paste 14 days of study notes. AI maps your full syllabus, colours avoided chapters in cinnabar, and builds a 3-day reentry plan for the one you've been dodging longest." },
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
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [nextExam, setNextExam] = useState<NextExam | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [papersCount, setPapersCount] = useState(0);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [favSlugs, setFavSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const streakVal = parseInt(localStorage.getItem("ledger-focus-streak") || "0", 10);
      setStreak(streakVal);
      const best = Math.max(parseInt(localStorage.getItem("ledger-focus-best-streak") || "0", 10), streakVal);
      localStorage.setItem("ledger-focus-best-streak", String(best));
      setBestStreak(best);

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

  return { streak, bestStreak, sessionsToday, weakTopics, nextExam, notesCount, papersCount, recentSlugs, favSlugs, toggleFav };
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function useLiveActivity() {
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [feed, setFeed] = useState<{ tool: string; created_at: string }[]>([]);

  useEffect(() => {
    async function load() {
      const fifteenAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ai_history")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", fifteenAgo);
      setActiveCount(count ?? 0);

      const { data } = await supabase
        .from("ai_history")
        .select("tool, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      setFeed(data ?? []);
    }
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return { activeCount, feed };
}

function usePersonalisedOrder(userId: string | undefined) {
  const [freq, setFreq] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("ai_history")
      .select("tool")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return;
        const f: Record<string, number> = {};
        data.forEach(row => { f[row.tool] = (f[row.tool] || 0) + 1; });
        setFreq(f);
      });
  }, [userId]);
  return freq;
}

function LiveSection({ activeCount, feed }: { activeCount: number | null; feed: { tool: string; created_at: string }[] }) {
  const allTools = TOOL_CATEGORIES.flatMap(c => c.tools);
  const label = (slug: string) => allTools.find(t => t.slug === slug)?.ttl ?? slug.replace(/-/g, " ");

  return (
    <div className="glass-card" style={{ marginBottom: 32, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--severity-success-color)", display: "inline-block", boxShadow: "0 0 0 3px color-mix(in oklch, var(--severity-success-color) 25%, transparent)", animation: "pulse-dot 2s ease-in-out infinite" }} />
        <span className="mono" style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}>Live</span>
        {activeCount !== null && (
          <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", marginLeft: 4 }}>
            <strong style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>{activeCount}</strong>
            <span style={{ color: "var(--ink-2)", marginLeft: 6 }}>students studying right now</span>
          </span>
        )}
      </div>
      {feed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {feed.slice(0, 6).map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--severity-success-color)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>
                Someone just used <strong style={{ color: "var(--ink)" }}>{label(row.tool)}</strong>
              </span>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: "auto", flexShrink: 0 }}>{timeAgo(row.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 500 }}>Exam Schedule</div>
        <button onClick={() => setShowForm(!showForm)} className="btn ghost" style={{ padding: "4px 12px", fontSize: 11 }}>
          {showForm ? "Cancel" : "+ Add exam"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card" style={{ padding: "20px", marginBottom: 16 }}>
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
        <div className="glass-card" style={{ padding: "20px" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>No exams scheduled. Add your upcoming exams to get personalised progress emails.</div>
        </div>
      ) : upcoming.length > 0 ? (
        <div className="glass-card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "color-mix(in srgb, var(--paper) 30%, transparent)" }}>
                {[
                  { label: "Exam", cls: "" },
                  { label: "Subject", cls: "mob-exam-hide" },
                  { label: "Board", cls: "mob-exam-hide" },
                  { label: "Date", cls: "" },
                  { label: "Days", cls: "" },
                  { label: "", cls: "" },
                ].map((h, i) => (
                  <th key={i} className={h.cls} style={{ padding: "8px 14px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal", letterSpacing: "0.06em", borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)" }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e, i) => {
                const d = daysUntil(e.date);
                return (
                  <tr key={i} className="exam-row"
                    onMouseEnter={ev => gsap.to(ev.currentTarget, { backgroundColor: "color-mix(in srgb, var(--ink) 4%, transparent)", duration: 0.2, ease: "power1.out" })}
                    onMouseLeave={ev => gsap.to(ev.currentTarget, { backgroundColor: "transparent", duration: 0.25, ease: "power1.out" })}
                  >
                    <td style={{ padding: "10px 14px", fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic", fontWeight: 500, borderBottom: i < upcoming.length - 1 ? "1px solid color-mix(in srgb, var(--ink) 8%, transparent)" : "none" }}>{e.name}</td>
                    <td className="mob-exam-hide" style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", borderBottom: i < upcoming.length - 1 ? "1px solid color-mix(in srgb, var(--ink) 8%, transparent)" : "none" }}>{e.subject}</td>
                    <td className="mob-exam-hide" style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", borderBottom: i < upcoming.length - 1 ? "1px solid color-mix(in srgb, var(--ink) 8%, transparent)" : "none" }}>{e.board}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", borderBottom: i < upcoming.length - 1 ? "1px solid color-mix(in srgb, var(--ink) 8%, transparent)" : "none" }}>{new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: d <= 7 ? "var(--cinnabar-ink)" : "var(--ink)", borderBottom: i < upcoming.length - 1 ? "1px solid color-mix(in srgb, var(--ink) 8%, transparent)" : "none" }}>{d}d</td>
                    <td style={{ padding: "10px 14px", borderBottom: i < upcoming.length - 1 ? "1px solid color-mix(in srgb, var(--ink) 8%, transparent)" : "none" }}>
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

      <div className="glass-card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
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
    <div className="mob-share share-panel" style={{ marginBottom: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div className="glass-card" style={{ padding: "20px" }}>
        <div className="mono cin" style={{ marginBottom: 6 }}>Share with parent</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
          Your parent gets a live read-only view of your progress — streak, exams, marks, weak topics.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", padding: "8px 10px", background: "var(--paper-2)", color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text", transition: "background 200ms" }}
            onMouseEnter={ev => gsap.to(ev.currentTarget, { background: "color-mix(in srgb, var(--paper) 80%, transparent)", duration: 0.2 })}
            onMouseLeave={ev => gsap.to(ev.currentTarget, { background: "var(--paper-2)", duration: 0.25 })}
          >
            {parentCode ? `${siteBase}/parent/${parentCode}` : "Generating…"}
          </div>
          <button className="btn ghost" onClick={() => copy(`${siteBase}/parent/${parentCode}`, "parent")} disabled={!parentCode}
            style={{ padding: "6px 14px", fontSize: 11, flexShrink: 0 }}>
            {copied === "parent" ? "Copied!" : "Copy →"}
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: "20px" }}>
        <div className="mono cin" style={{ marginBottom: 6 }}>Refer a friend</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
          Share your referral link. When they sign up, both of you get 1 month Pro free once billing is live.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", padding: "8px 10px", background: "var(--paper-2)", color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text", transition: "background 200ms" }}
            onMouseEnter={ev => gsap.to(ev.currentTarget, { background: "color-mix(in srgb, var(--paper) 80%, transparent)", duration: 0.2 })}
            onMouseLeave={ev => gsap.to(ev.currentTarget, { background: "var(--paper-2)", duration: 0.25 })}
          >
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

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const r = (size / 2) - 12;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(score, 1000) / 1000;
  useEffect(() => {
    if (!ringRef.current) return;
    gsap.fromTo(ringRef.current,
      { strokeDashoffset: circumference },
      { strokeDashoffset: circumference * (1 - pct), duration: 1.4, ease: "power2.out", delay: 0.3 }
    );
  }, [circumference, pct]);
  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--cinnabar)" />
          <stop offset="50%" stopColor="var(--ink-2)" />
          <stop offset="100%" stopColor="var(--severity-success-color)" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in oklch, var(--ink) 8%, transparent)" strokeWidth={10} />
      <circle ref={ringRef} cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="url(#ring-grad)" strokeWidth={10}
        strokeDasharray={circumference} strokeDashoffset={circumference}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: "drop-shadow(0 0 8px var(--cinnabar))" }}
      />
      <text x={size / 2} y={size / 2 - 6} textAnchor="middle"
        style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700, fill: "var(--ink)" }}>{score}</text>
      <text x={size / 2} y={size / 2 + 18} textAnchor="middle"
        style={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>/1000</text>
    </svg>
  );
}

function LedgerScoreWidget() {
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const scoreRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    try {
      const s = computeLedgerScore();
      setScore(s);
      track.featureUsed("ledger_score_computed", {
        score: s.total,
        tier: scoreTier(s.total).label,
        pqa_score: s.pqaScore,
        syllabus_score: s.syllabusScore,
        mistake_score: s.mistakeScore,
        consistency_score: s.consistencyScore,
      });
    } catch {
      setScore({ total: 0, pqaScore: 0, syllabusScore: 0, mistakeScore: 0, consistencyScore: 0, pqaAccuracy: 0, papersCount: 0, syllabusUploaded: false, subjectsCovered: 0, subjectsTotal: 0, recentMistakes: 0, streak: 0, actions: ["Upload your syllabus — this alone unlocks up to 250 score points"], subjectAccuracy: [] });
    }
  }, []);
  if (!score) return null;
  const tier = scoreTier(score.total);
  const pillars = [
    { label: "PYQ",      val: score.pqaScore,        max: 400 },
    { label: "Syllabus", val: score.syllabusScore,    max: 250 },
    { label: "Mistakes", val: score.mistakeScore,     max: 200 },
    { label: "Streak",   val: score.consistencyScore, max: 150 },
  ];

  function handleScoreEnter() {
    if (!scoreRef.current) return;
    gsap.to(scoreRef.current, { y: -3, scale: 1.01, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    // Pillar bar pulse: collapse then re-expand
    const bars = scoreRef.current.querySelectorAll<HTMLElement>(".pillar-bar-fill");
    bars.forEach((bar, i) => {
      const realW = bar.style.width;
      gsap.timeline()
        .to(bar, { width: "0%", duration: 0.22, ease: "power2.in", delay: i * 0.04 })
        .to(bar, { width: realW,   duration: 0.55, ease: "power3.out" });
    });
  }

  function handleScoreLeave() {
    if (!scoreRef.current) return;
    gsap.to(scoreRef.current, { y: 0, scale: 1, duration: 0.4, ease: "power2.out", overwrite: "auto" });
  }

  return (
    <Link ref={scoreRef} href="/tools/score" className="glass-card score-widget"
      style={{ textDecoration: "none", display: "block", marginBottom: 40, color: "inherit", overflow: "hidden" }}
      onMouseEnter={handleScoreEnter}
      onMouseLeave={handleScoreLeave}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 20px", borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", background: "color-mix(in srgb, var(--paper) 30%, transparent)" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.16em", textTransform: "uppercase" as const }}>Ledger Score™</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em" }}>View breakdown →</span>
      </div>
      {/* Body: score + 4 pillar rows */}
      <div className="dash-score-body" style={{ display: "flex", background: "transparent" }}>
        <div style={{ padding: "24px 28px", borderRight: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <ScoreRing score={score.total} size={148} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>{tier.label}</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "18px 22px", gap: 11 }}>
          {pillars.map(p => (
            <div key={p.label} style={{ display: "grid", gridTemplateColumns: "72px 42px 1fr", gap: 10, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{p.label}</span>
              <span style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 13, fontWeight: 700, color: "var(--ink)", textAlign: "right" as const }}>
                {p.val}<span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", fontWeight: 400 }}>/{p.max}</span>
              </span>
              <div style={{ height: 4, background: "color-mix(in srgb, var(--ink) 12%, transparent)", borderRadius: 2 }}>
                <div className="pillar-bar-fill" style={{ height: "100%", width: "100%", background: "var(--cinnabar-ink)", borderRadius: 2, transformOrigin: "left center", transform: `scaleX(${Math.min(1, p.val / p.max)})`, transition: "transform 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Action */}
      {score.actions[0] && (
        <div style={{ padding: "9px 20px", borderTop: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", background: "color-mix(in srgb, var(--paper) 30%, transparent)" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.06em" }}>↳ {score.actions[0]}</span>
        </div>
      )}
    </Link>
  );
}

function FocusStrip() {
  const dateKey  = new Date().toDateString();
  const storeKey = `ledger:intention:${dateKey}`;
  const [intention, setIntention] = useState("");
  const [elapsed,   setElapsed]   = useState(0);

  useEffect(() => {
    try { setIntention(localStorage.getItem(storeKey) ?? ""); } catch {}
    const start = Date.now();
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [storeKey]);

  if (!intention) return null;

  const h   = Math.floor(elapsed / 3600);
  const m   = Math.floor((elapsed % 3600) / 60);
  const s   = elapsed % 60;
  const fmt = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div style={{
      position: "sticky", top: 76, zIndex: 50,
      display: "flex", alignItems: "center", gap: 16,
      padding: "9px 16px", marginBottom: 32,
      background: "color-mix(in srgb, var(--paper) 94%, transparent)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderTop: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)",
      borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: "var(--cinnabar-ink)", flexShrink: 0,
        boxShadow: "0 0 0 3px color-mix(in oklch, var(--cinnabar-ink) 20%, transparent)",
        animation: "pulse-dot 2s ease-in-out infinite",
      }} />
      <span style={{
        fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14,
        color: "var(--ink)", flex: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        letterSpacing: "-0.01em",
      }}>{intention}</span>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)",
        letterSpacing: "0.08em", flexShrink: 0, tabularNums: true,
      } as React.CSSProperties}>{fmt}</span>
    </div>
  );
}

function TodayIntention() {
  const dateKey   = new Date().toDateString();
  const storeKey  = `ledger:intention:${dateKey}`;

  const [intention, setIntention] = useState("");
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState("");
  const [loaded,    setLoaded]    = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey) ?? "";
      setIntention(saved);
      if (!saved) setEditing(true);
    } catch {}
    setLoaded(true);
  }, [storeKey]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  function commit() {
    const val = draft.trim();
    if (!val) return;
    try { localStorage.setItem(storeKey, val); } catch {}
    setIntention(val);
    setDraft("");
    setEditing(false);
  }

  function startEdit() { setDraft(intention); setEditing(true); }

  if (!loaded) return null;

  const sharedRow: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 16,
    borderBottom: "1px solid color-mix(in srgb, var(--ink) 10%, transparent)",
    paddingBottom: 14, marginBottom: 32,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)",
    letterSpacing: "0.14em", textTransform: "uppercase", flexShrink: 0,
  };

  const intentionStyle: React.CSSProperties = {
    fontFamily: "var(--serif)", fontStyle: "italic",
    fontSize: "clamp(18px, 2.2vw, 24px)", color: "var(--ink)",
    letterSpacing: "-0.02em", flex: 1, lineHeight: 1.15,
  };

  if (editing) {
    return (
      <div style={sharedRow}>
        <span style={labelStyle}>Today I&apos;m studying</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter")  commit();
            if (e.key === "Escape") { setEditing(false); setDraft(""); }
          }}
          placeholder="e.g. Organic Chemistry — reaction mechanisms"
          style={{
            ...intentionStyle,
            background: "none", border: "none", outline: "none", padding: 0,
            color: "var(--ink)", opacity: draft ? 1 : 0.45,
          }}
        />
        <button onClick={commit} className="btn" style={{ padding: "6px 14px", fontSize: 11, flexShrink: 0 }}>
          Set →
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...sharedRow, cursor: "text" }} onClick={startEdit}>
      <span style={labelStyle}>Studying</span>
      <span style={intentionStyle}>{intention}</span>
      <button
        onClick={e => { e.stopPropagation(); startEdit(); }}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", padding: "2px 4px", opacity: 0.5, flexShrink: 0 }}
      >
        edit
      </button>
    </div>
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

    // ── Scroll reveal: pre-hide elements ───────────────────────────────────
    gsap.set(".score-widget",      { autoAlpha: 0, y: 60, scale: 0.95 });
    gsap.set(".exam-row",          { autoAlpha: 0, x: -30 });
    gsap.set(".share-panel",       { autoAlpha: 0, y: 40 });
    gsap.set(".weak-strip",        { autoAlpha: 0, x: -20 });
    gsap.set(".recommend-strip",   { autoAlpha: 0, y: 30 });
    gsap.set(".section-label",     { autoAlpha: 0, x: -20 });

    // Score widget reveal
    gsap.to(".score-widget", {
      autoAlpha: 1, y: 0, scale: 1, duration: 0.75, ease: "power3.out",
      scrollTrigger: { trigger: ".score-widget", start: "top 88%", once: true },
    });

    // Exam rows — staggered slide in
    ScrollTrigger.batch(".exam-row", {
      onEnter: els => gsap.to(els, {
        autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.06, ease: "power2.out",
      }),
      start: "top 88%", once: true,
    });

    // Share panel reveal
    gsap.to(".share-panel", {
      autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out",
      scrollTrigger: { trigger: ".share-panel", start: "top 88%", once: true },
    });

    // Weak topics strip
    gsap.to(".weak-strip", {
      autoAlpha: 1, x: 0, duration: 0.55, ease: "power2.out",
      scrollTrigger: { trigger: ".weak-strip", start: "top 88%", once: true },
    });

    // Recommendation strip
    gsap.to(".recommend-strip", {
      autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out",
      scrollTrigger: { trigger: ".recommend-strip", start: "top 88%", once: true },
    });

    // Section labels
    ScrollTrigger.batch(".section-label", {
      onEnter: els => gsap.to(els, {
        autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.05, ease: "power2.out",
      }),
      start: "top 88%", once: true,
    });

    // ── 3D card tilt on mouse move ──────────────────────────────────────────
    const cards = gsap.utils.toArray<HTMLElement>(".dash-tool");
    const cleanup: (() => void)[] = [];

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cards.forEach(card => {
        const onEnter = () => {
          gsap.to(card, {
            y: -8, scale: 1.022,
            transformPerspective: 1000,
            duration: 0.28, ease: "expo.out",
            overwrite: "auto",
          });
        };
        const onMove = (e: MouseEvent) => {
          const r = card.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
          const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
          gsap.to(card, {
            rotationY:  x * 10,
            rotationX: -y * 7,
            transformPerspective: 1000,
            duration: 0.18,
            ease: "power2.out",
            overwrite: "auto",
          });
          const sx = (-x * 12).toFixed(1);
          const sy = (-y * 8).toFixed(1);
          card.style.boxShadow = `${sx}px ${sy}px 32px color-mix(in srgb, var(--cat-color, var(--cinnabar-ink)) 24%, transparent), 0 4px 16px color-mix(in srgb, var(--ink) 8%, transparent)`;
        };
        const onLeave = () => {
          card.style.boxShadow = "";
          gsap.to(card, {
            y: 0, scale: 1, rotationY: 0, rotationX: 0,
            duration: 0.4, ease: "expo.out",
            overwrite: "auto",
          });
        };
        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("mousemove",  onMove);
        card.addEventListener("mouseleave", onLeave);
        cleanup.push(() => {
          card.removeEventListener("mouseenter", onEnter);
          card.removeEventListener("mousemove",  onMove);
          card.removeEventListener("mouseleave", onLeave);
        });
      });
    }

    // ── Stat cell hover ─────────────────────────────────────────────────────
    const statCells = gsap.utils.toArray<HTMLElement>(".dash-stat");
    statCells.forEach(cell => {
      const onEnter = () => gsap.to(cell, {
        y: -4, scale: 1.03,
        boxShadow: "0 8px 24px color-mix(in srgb, var(--ink) 15%, transparent)",
        duration: 0.28, ease: "power2.out", overwrite: "auto",
      });
      const onLeave = () => gsap.to(cell, {
        y: 0, scale: 1, boxShadow: "none",
        duration: 0.38, ease: "power2.out", overwrite: "auto",
      });
      cell.addEventListener("mouseenter", onEnter);
      cell.addEventListener("mouseleave", onLeave);
      cleanup.push(() => {
        cell.removeEventListener("mouseenter", onEnter);
        cell.removeEventListener("mouseleave", onLeave);
      });
    });


    return () => cleanup.forEach(fn => fn());
  }, { scope: containerRef });

  const [name, setName] = useState(user?.email?.split("@")[0] ?? "student");
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [toolQuery, setToolQuery] = useState("");

  const [showChair,     setShowChair]     = useState(false);
  const [chairDaysSince, setChairDaysSince] = useState(0);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem("ledger:lastVisit");
      const now = Date.now();
      if (raw) {
        const daysSince = (now - parseInt(raw, 10)) / 86400000;
        if (daysSince >= 9) { setChairDaysSince(daysSince); setShowChair(true); }
      }
      localStorage.setItem("ledger:lastVisit", String(now));
    } catch { /* ignore */ }
  }, [user]);
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
  const { streak, bestStreak, sessionsToday, weakTopics, nextExam, notesCount, papersCount, recentSlugs, favSlugs, toggleFav } = useStats();
  const { activeCount, feed } = useLiveActivity();
  const toolFreq = usePersonalisedOrder(user?.id);

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  if (authLoading) return <DashboardSkeleton />;
  if (showChair)   return <EmptyChair daysSince={chairDaysSince} onDismiss={() => setShowChair(false)} />;

  return (
    <main ref={containerRef} id="main-content" tabIndex={-1} className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>

      {/* Atmospheric orbs — subtle, behind all content */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--cinnabar) 8%, transparent) 0%, transparent 70%)",
          filter: "blur(100px)", top: "-15%", right: "-5%",
          animation: "hero-orb-drift 22s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--ink-2) 6%, transparent) 0%, transparent 70%)",
          filter: "blur(90px)", bottom: "10%", left: "-5%",
          animation: "float-orb 28s ease-in-out infinite reverse",
        }} />
      </div>

      {/* Command Centre header */}
      <div className="dash-header" style={{ borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", paddingBottom: 24, marginBottom: 32 }}>
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
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, paddingTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 9999, border: "1.5px solid color-mix(in srgb, var(--cinnabar) 40%, transparent)", background: "color-mix(in srgb, var(--cinnabar) 7%, transparent)", backdropFilter: "blur(8px)" }}>
                {/* SVG flame */}
                <svg width="18" height="22" viewBox="0 0 18 22" fill="none" aria-hidden="true">
                  <path d="M9 0C9 0 4 5 4 10C4 12.5 5.5 14.5 7 15.5C7 13 8 11 9 10C10 11 11 13 11 15.5C12.5 14.5 14 12.5 14 10C14 5 9 0 9 0Z" fill="var(--cinnabar)" opacity="0.9"/>
                  <ellipse cx="9" cy="17" rx="4" ry="5" fill="color-mix(in oklch, var(--cinnabar) 60%, var(--paper))" opacity="0.8"/>
                </svg>
                <span style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--cinnabar-ink)", lineHeight: 1 }}>{streak}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", opacity: 0.8 }}>day streak</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {bestStreak > streak && (
                  <span className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>Best: {bestStreak}d</span>
                )}
                <span className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{streak >= 7 ? "On a serious roll" : streak >= 3 ? "Building momentum" : "Keep it going"}</span>
              </div>
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
              className="btn ghost" style={{ padding: "7px 16px", fontSize: 11, textDecoration: "none" }}
              onMouseEnter={ev => gsap.to(ev.currentTarget, { y: -3, scale: 1.05, duration: 0.22, ease: "power2.out", overwrite: "auto" })}
              onMouseLeave={ev => gsap.to(ev.currentTarget, { y: 0, scale: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" })}
              onMouseDown={ev => gsap.to(ev.currentTarget, { scale: 0.96, duration: 0.1, overwrite: "auto" })}
              onMouseUp={ev => gsap.to(ev.currentTarget, { scale: 1.05, duration: 0.15, overwrite: "auto" })}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/dashboard/saved" className="btn ghost" style={{ padding: "7px 16px", fontSize: 11, textDecoration: "none" }}
            onMouseEnter={ev => gsap.to(ev.currentTarget, { y: -3, scale: 1.05, duration: 0.22, ease: "power2.out", overwrite: "auto" })}
            onMouseLeave={ev => gsap.to(ev.currentTarget, { y: 0, scale: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" })}
            onMouseDown={ev => gsap.to(ev.currentTarget, { scale: 0.96, duration: 0.1, overwrite: "auto" })}
            onMouseUp={ev => gsap.to(ev.currentTarget, { scale: 1.05, duration: 0.15, overwrite: "auto" })}
          >
            Saved →
          </Link>
          <button className="btn ghost" style={{ padding: "7px 16px", fontSize: 11 }}
            onClick={() => { const e = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }); document.dispatchEvent(e); }}
            onMouseEnter={ev => gsap.to(ev.currentTarget, { y: -3, scale: 1.05, duration: 0.22, ease: "power2.out", overwrite: "auto" })}
            onMouseLeave={ev => gsap.to(ev.currentTarget, { y: 0, scale: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" })}
            onMouseDown={ev => gsap.to(ev.currentTarget, { scale: 0.96, duration: 0.1, overwrite: "auto" })}
            onMouseUp={ev => gsap.to(ev.currentTarget, { scale: 1.05, duration: 0.15, overwrite: "auto" })}
          >
            ⌘K Search
          </button>
        </div>
      </div>

      {/* Sticky session strip — shows intention + running timer while scrolling */}
      <FocusStrip />

      {/* Today's Intention */}
      <TodayIntention />

      {/* Profile setup banner */}
      {showProfileBanner && (
        <div style={{ marginBottom: 24, padding: "14px 20px", border: "1px solid color-mix(in srgb, var(--cinnabar) 40%, transparent)", borderRadius: 12, background: "color-mix(in srgb, var(--paper) 60%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "color-mix(in oklch, var(--ink) 60%, transparent)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="glass-card" style={{ maxWidth: 480, width: "100%", padding: "36px 32px", position: "relative" }}>
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
      {(() => {
        const allTools = TOOL_CATEGORIES.flatMap(c => c.tools);
        const recent = recentSlugs.slice(0, 6)
          .map(s => allTools.find(t => t.slug === s))
          .filter(Boolean) as typeof allTools;
        return (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.18em", flexShrink: 0 }}>↩</span>
              <div style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--ink) 8%, transparent)" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase", flexShrink: 0 }}>Jump back in</span>
            </div>

            {recent.length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center", border: "1px dashed var(--rule)", borderRadius: 12 }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24, color: "var(--ink-2)", marginBottom: 8 }}>No tools used yet</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", marginBottom: 20 }}>Your recently used tools will appear here</div>
                <Link href="/tools" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)", textDecoration: "none", letterSpacing: "0.08em", border: "1px solid var(--cinnabar-ink)", padding: "8px 16px", borderRadius: 6 }}>
                  Browse all 55 tools →
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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
                        position:       "relative",
                        overflow:       "hidden",
                        padding:        "14px 16px 14px 20px",
                        border:         "1px solid var(--rule)",
                        borderRadius:   10,
                        background:     "var(--paper)",
                        color:          "var(--ink)",
                        cursor:         "pointer",
                        transition:     "transform 150ms ease, box-shadow 150ms ease",
                      }}
                      onMouseOver={e => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.transform  = "translateY(-2px)";
                        el.style.boxShadow  = "0 4px 16px color-mix(in srgb, var(--ink) 8%, transparent)";
                      }}
                      onMouseOut={e => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.transform  = "";
                        el.style.boxShadow  = "";
                      }}
                    >
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: catColor }} />
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                        {t.ttl}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em", lineHeight: 1.4 }}>
                        {t.sub}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Stats bar — 5 bento cells */}
      <div className="mob-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Study streak",    value: streak > 0 ? `${streak}d` : "—",     sub: streak === 0 ? "Start today" : streak === 1 ? "Keep it up" : "On a roll", hot: streak >= 3 },
          { label: "Sessions today",  value: String(sessionsToday),                sub: sessionsToday === 0 ? "None yet" : `${sessionsToday * 25} min focused`, hot: false },
          { label: "Notes saved",     value: String(notesCount),                   sub: notesCount === 0 ? "Generate your first" : "In your library", hot: false },
          { label: "Papers done",     value: String(papersCount),                  sub: papersCount === 0 ? "Start practising" : "Sessions completed", hot: false },
          { label: "Next exam",       value: nextExam ? `${nextExam.days}d` : "—", sub: nextExam ? nextExam.name : "Add below", hot: !!nextExam && nextExam.days <= 7 },
        ].map((s, i) => (
          <div key={i} className="dash-stat glass-card" style={{ padding: "18px 20px", borderLeft: s.hot ? "2px solid var(--cinnabar)" : undefined }}>
            <div className="mono" style={{ color: s.hot ? "var(--cinnabar-ink)" : "var(--ink-3)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, marginTop: 6, color: s.hot ? "var(--cinnabar-ink)" : "var(--ink)" }}>{s.value}</div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Live activity section */}
      <LiveSection activeCount={activeCount} feed={feed} />

      {/* Weak topics strip */}
      {weakTopics.length > 0 && (
        <div className="glass-card weak-strip" style={{ marginBottom: 32, padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div className="mono cin" style={{ flexShrink: 0 }}>Weak topics</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
            {weakTopics.map((wt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid color-mix(in srgb, var(--ink) 10%, transparent)", background: "color-mix(in srgb, var(--paper) 60%, transparent)", borderRadius: 8 }}>
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
        <div className="recommend-strip" style={{ marginBottom: 32, border: "1px solid color-mix(in srgb, var(--cinnabar) 40%, transparent)", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", borderRadius: 14, background: "color-mix(in srgb, var(--cinnabar) 5%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", paddingBottom: 10, marginBottom: 14 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--cinnabar-ink)" }}>★ Favourites</div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{favs.length} pinned</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {favs.map((t) => {
                const favCat      = TOOL_CATEGORIES.find(c => c.tools.some(x => x.slug === t.slug));
                const favCatColor = CAT_COLOR[(favCat?.label ?? "") as keyof typeof CAT_COLOR] ?? "var(--cinnabar-ink)";
                return (
                <Link key={t.slug} href={`/tools/${t.slug}`} className="dash-tool"
                  onClick={() => trackToolVisit(t.slug)}
                  style={{
                    textDecoration: "none",
                    display: "flex", flexDirection: "column",
                    position: "relative", overflow: "hidden",
                    padding: "14px 16px 14px 20px",
                    border: "1px solid var(--rule)", borderRadius: 10,
                    background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
                    transition: "transform 150ms ease, box-shadow 150ms ease",
                  } as React.CSSProperties}
                  onMouseOver={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 4px 16px color-mix(in srgb, var(--ink) 8%, transparent)"; }}
                  onMouseOut={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = ""; el.style.boxShadow = ""; }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: favCatColor }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.ttl}</div>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(t.slug); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", padding: 0, flexShrink: 0, marginLeft: 8 }}>✕</button>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em", lineHeight: 1.4 }}>{t.sub}</div>
                </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Tools grid — categorised */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 500 }}>The Archive</div>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>55 tools · click to open</div>
        </div>

        {/* Your top tools — personalised by usage */}
        {Object.keys(toolFreq).length > 0 && (() => {
          const allTools = TOOL_CATEGORIES.flatMap(c => c.tools);
          const topSlugs = Object.entries(toolFreq).sort(([,a],[,b]) => b - a).slice(0, 4).map(([slug]) => slug);
          const topTools = topSlugs.map(s => allTools.find(t => t.slug === s)).filter(Boolean) as typeof allTools;
          if (!topTools.length) return null;
          return (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", paddingBottom: 10, marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--cinnabar-ink)" }}>Your Favourites</div>
                <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>based on your usage</div>
              </div>
              <div className="dash-grid mob-2col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {topTools.map((t, ti) => {
                  const cat = TOOL_CATEGORIES.find(c => c.tools.some(x => x.slug === t.slug));
                  const catColor = CAT_COLOR[(cat?.label ?? "") as keyof typeof CAT_COLOR] ?? "var(--cinnabar-ink)";
                  return (
                    <Link key={t.slug} href={`/tools/${t.slug}`} className="dash-tool glass-card"
                      aria-label={`Open ${t.ttl}`} onClick={() => trackToolVisit(t.slug)}
                      style={{ textDecoration: "none", padding: "22px 20px 18px", display: "flex", flexDirection: "column", color: "var(--ink)", minHeight: 160, "--cat-color": catColor } as React.CSSProperties}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div className="mono" style={{ fontSize: 7, letterSpacing: "0.2em", color: catColor }}>{cat?.label}</div>
                        <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>Used {toolFreq[t.slug]}×</div>
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 500, fontStyle: "italic", lineHeight: 1.15, color: "var(--ink)", flex: 1 }}>{t.ttl}</div>
                      <div style={{ borderTop: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                        <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{String(ti + 1).padStart(2, "0")}</div>
                        <span className="dash-tool-arrow mono" style={{ fontSize: 13 }} aria-hidden="true">↗</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Tool search */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <GooeyInput
            value={toolQuery}
            onChange={setToolQuery}
            placeholder="Search 55 tools…"
            style={{ flex: 1 }}
          />
          {toolQuery && (
            <span
              className="mono"
              aria-live="polite"
              aria-atomic="true"
              style={{
                fontSize: 9, flexShrink: 0, whiteSpace: "nowrap",
                color: totalMatches > 0 ? "var(--ink-3)" : "var(--cinnabar-ink)",
              }}
            >
              {totalMatches > 0 ? `${totalMatches} match${totalMatches !== 1 ? "es" : ""}` : "No matches"}
            </span>
          )}
        </div>

        {/* No results state */}
        {filteredCategories.length === 0 && toolQuery && (
          <div className="glass-card" style={{ padding: "48px 20px", textAlign: "center" }}>
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
            <div className="section-label" style={{ marginBottom: 12, display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 10, borderBottom: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--cinnabar-ink)" }}>{cat.label}</div>
              <div className="mono" style={{ fontSize: 8, color: "var(--ink-3)" }}>{cat.tools.length} tools</div>
            </div>
            <div className="dash-grid mob-2col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {cat.tools.map((t, ti) => {
                const catColor = CAT_COLOR[cat.label as keyof typeof CAT_COLOR] ?? "var(--cinnabar-ink)";
                return (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="dash-tool glass-card"
                  aria-label={`Open ${t.ttl} — ${t.sub}`}
                  onClick={() => trackToolVisit(t.slug)}
                  style={{
                    textDecoration: "none",
                    padding: "22px 20px 18px",
                    display: "flex", flexDirection: "column",
                    color: "var(--ink)",
                    minHeight: (ti < 2 || (ti >= 6 && ti < 8)) ? 200 : 188,
                    gridColumn: (ti < 2 || (ti >= 6 && ti < 8)) ? "span 2" : undefined,
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
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.4, fontWeight: 500 }}>
                    {t.sub}
                  </div>

                  {/* Description */}
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65, marginTop: 8, flex: 1, opacity: 0.75 }}>
                    {t.desc}
                  </div>

                  {/* Footer: index + animated arrow */}
                  <div style={{ borderTop: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", marginTop: 14, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
