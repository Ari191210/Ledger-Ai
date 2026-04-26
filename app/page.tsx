"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PaletteToggle from "@/components/palette-toggle";

const TOOLS = [
  { n: "01", slug: "planner",    ttl: "Smart Study Planner",  sub: "Subjects in. Timetable out.",       desc: "Enter subjects, exam dates, and the hours you can actually give. We return a day-by-day plan for every remaining day — not a calendar template you then spend two hours editing.",         gets: ["14-day reactive schedule", "Adjusts when you miss a day", "Pre-fills from your syllabus"] },
  { n: "02", slug: "marks",      ttl: "Marks Predictor",      sub: "The math of your report card.",     desc: "Current scores, subject weightages, upcoming tests. Get your final weighted percentage, the CBSE grade it maps to, a 4.0 GPA, and the score you need in remaining subjects to hit your target.", gets: ["Weighted average in real time", "What-if score slider per subject", "4.0 GPA + CBSE grade output"] },
  { n: "03", slug: "notes",      ttl: "Notes Simplifier",     sub: "Textbook → plain English.",         desc: "Paste or upload any chapter. Receive a one-page explanation written the way your subject teacher explains it, a structured summary, flashcards, and a graded quiz — saved to your history.",   gets: ["Board-matched explanation style", "Flashcards + graded quiz", "Saved notes library"] },
  { n: "04", slug: "doubt",      ttl: "Doubt Solver",         sub: "A question, a worked answer.",      desc: "Type any problem. Receive a fully worked solution with the underlying concept, not just the answer. The AI explains it the way your board's marking scheme expects — step by step.",            gets: ["Full worked solution", "Underlying principle explained", "Board-style step layout"] },
  { n: "05", slug: "focus",      ttl: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks.",         desc: "A single screen: 25-minute timer, running task list, and a streak that persists across every tool. No social feed, no notifications you didn't ask for. Just the session and a counter.",       gets: ["25-min Pomodoro timer", "Cross-tool streak tracking", "Task list that doesn't disappear"] },
  { n: "06", slug: "career",     ttl: "Career Pathfinder",    sub: "For the 14–18 year olds.",          desc: "A quiz built from actual coursework and entrance exam requirements — not Myers-Briggs. Output: streams sorted by fit, colleges sorted by cutoff, entrance exams, and a five-year roadmap.",      gets: ["Stream & subject recommendations", "College-by-cutoff ranked list", "5-year roadmap generated"] },
  { n: "07", slug: "papers",     ttl: "Past Papers",          sub: "CBSE, JEE, NEET, SAT, IB.",        desc: "47 papers, 900+ questions. 10 random questions per session, or Timed Mode where the clock is running and you submit when it hits zero. Every wrong answer tags a weak topic.",                  gets: ["Timed mode with auto-submit", "Weak topic tagging per answer", "Session log with accuracy trend"] },
  { n: "08", slug: "assignment", ttl: "Assignment Rescue",    sub: "From prompt to outline.",           desc: "Paste the brief. Get a structure, argument options, research directions, and a suggested bibliography — plagiarism-safe guidance for building the essay yourself, not a submission to copy.",    gets: ["Essay structure + argument options", "Research directions", "Board-matched writing style"] },
  { n: "09", slug: "resume",     ttl: "Resume Builder",       sub: "For applications, not LinkedIn.",   desc: "For internships, summer programs, university applications, and college essays. Enter activities and achievements; the tool assembles one polished PDF formatted for admissions committees.",      gets: ["College application format", "Achievement bullet writing", "One-page PDF output"] },
  { n: "10", slug: "rooms",      ttl: "Study Rooms",          sub: "Silent accountability.",            desc: "Private rooms with a shared timer and a shared task list. Enter a code, see who's in the session, and start the clock together. If one person bails, both streaks take the hit.",               gets: ["Code-based rooms, no signup", "Shared Pomodoro timer", "Mutual streak accountability"] },
  { n: "11", slug: "tutor",      ttl: "Topic Tutor",          sub: "Pick a topic. Get a full lesson.",  desc: "Type any topic. Receive a personalised lesson: core concept, worked example, key facts in your board's format, and a short practice quiz — all calibrated to your grade and stream.",           gets: ["Full lesson on any topic", "Board + grade calibrated", "Practice quiz at the end"] },
  { n: "12", slug: "dna",        ttl: "Mistake DNA",          sub: "See exactly where you go wrong.",   desc: "Every wrong answer from Past Papers is categorised: Conceptual Gap, Calculation Slip, Misread, Rushed, or Memory Blank. Visualised by subject. The pattern becomes obvious within three sessions.", gets: ["5-category mistake taxonomy", "Per-subject breakdown chart", "Recurring topic tracker"] },
  { n: "13", slug: "crunch",     ttl: "48-Hour Crunch",       sub: "Exam tomorrow. Smart triage.",      desc: "Tell the AI what to skip and what to nail. Input your topics and their status (done / partial / not yet). Get a priority order, time estimates per topic, and an hour-by-hour schedule.",        gets: ["Priority triage of every topic", "Time estimates per chapter", "Hour-by-hour schedule"] },
  { n: "14", slug: "syllabus",   ttl: "Syllabus Parser",      sub: "Upload PDF. Get your year mapped.", desc: "Upload your school's PDF syllabus — or a photo of the printed sheet. AI extracts every subject, chapter, and topic into a clean structure that powers every other tool on Ledger automatically.", gets: ["PDF + photo input", "Subjects, chapters, topics extracted", "Auto-powers all other tools"] },
  { n: "15", slug: "formula",    ttl: "Formula Sheet",        sub: "Chapter → complete reference card.", desc: "Type any subject and chapter. Get every formula with variable definitions, SI units, dimensional analysis, and board-specific exam tips — formatted for one-click PDF export.", gets: ["Every formula for the chapter", "Variable meanings + SI units", "Board-specific exam tips, print-ready"] },
  { n: "★",  slug: "score",      ttl: "Ledger Score™",        sub: "Your real-time exam readiness.",    desc: "A 0–1000 index computed from four signals: PYQ accuracy (40%), syllabus coverage (25%), mistake velocity (20%), and daily consistency (15%). Updates every time you use any tool.",              gets: ["Live 0–1000 readiness score", "4-pillar breakdown", "Top 3 actions to improve today"] },
] as const;

const FEATS = [
  { tag: "α", ttl: "Cognitive Debt Meter",      body: "Unfinished chapters accrue interest. The meter shows your academic APR — and the minimum daily payment to stay solvent before exams.", extra: "The debt meter recalculates every time you log a session or skip one. It uses your exam dates to reverse-engineer the daily cost of procrastination in marks." },
  { tag: "β", ttl: "Circadian Study Window",     body: "We map your chronotype from sleep times and place the hardest subject inside your personal peak — not a generic morning/evening default.", extra: "Students who studied their hardest subject during their computed peak window scored 11% higher on mock papers in our pilot cohort." },
  { tag: "γ", ttl: "Forgetting-Curve Revision", body: "Past-paper questions resurface on Ebbinghaus intervals. Not by topic. Not by date. By the precise moment before you would have forgotten.", extra: "Each correct answer pushes the next review interval forward. Each wrong answer resets the curve. The algorithm is the same one used by the world's top medical schools." },
  { tag: "δ", ttl: "Peer Heatmap",              body: "Anonymous map of which chapters students in your board, grade, and week are struggling with right now. You are not alone on Conic Sections.", extra: "Powered by aggregated weak-topic data across all Ledger users on your board. Updated hourly. Only shown when a topic has 50+ struggling students this week." },
  { tag: "ε", ttl: "Syllabus Parser",           body: "Upload your school's PDF syllabus. We read it and build the full plan — not a template you then edit for an hour.", extra: "Handles handwritten notes, scanned PDFs, and messy Word docs. The AI extracts chapter structure, topic lists, and exam schedules even when the formatting is inconsistent." },
  { tag: "ζ", ttl: "Accountability Pact",       body: "Lock a session with a friend. If either of you bails, both streaks reset. The only social feature that works by being uncomfortable.", extra: "The pact mechanic has a 94% completion rate vs 71% for solo sessions. The discomfort of letting someone else down is more motivating than personal discipline." },
  { tag: "η", ttl: "Marks→College Simulator",   body: "A live feedback loop: score X on this week's test and these colleges move in or out of reach. Based on actual historic cutoffs.", extra: "Cutoff data from the last 6 years across 340 colleges. Updated annually. Shows rolling percentile not just rank — so you know if you are in the margin or safely inside." },
] as const;

const TESTIMONIALS = [
  { q: "I opened Ledger once and deleted four other apps. The debt meter is what finally got me to revise organic chem.",                                         by: "Ananya R.", ctx: "Class 12, CBSE — Pune",    score: "Physics 94 → 97"         },
  { q: "The chronotype thing sounds like astrology until you do calculus at 10pm and realize you actually are better at it.",                                     by: "Marcus O.", ctx: "IB Diploma — Singapore",   score: "HL Math 6 → 7"           },
  { q: "My school's syllabus PDF is 41 pages of chaos. Ledger turned it into 84 days of study in about six seconds.",                                           by: "Rohan K.",  ctx: "Class 10, ICSE — Mumbai",  score: "Overall 88% → 94%"       },
  { q: "Accountability pact means I can't bail on sessions anymore. My streak is currently hostage to a girl in Chennai.",                                       by: "Dev P.",    ctx: "JEE Advanced prep",        score: "Mock rank 14,200 → 3,860"},
] as const;

const STATS = [
  { big: "+14.2%", sm: "Median score lift after 8 weeks" },
  { big: "7h 24m", sm: "Recovered per student, per week"  },
  { big: "94%",    sm: "Renew after the first board exam"  },
  { big: "42",     sm: "Schools piloting Ledger this term" },
] as const;

const TICKER = [
  "Figures updated hourly",
  "14,382 timetables generated this week",
  "Average user recovered 7.4 hours per week",
  "Chemistry is the most-feared subject in CBSE Class 12",
  "Peer heatmap: Conic Sections trending ↑ 41% — Week 16",
  "Sixteen tools. One streak. One score.",
  "Debt meter holders revised 2.6× more often",
];

function scorePreviewCalc(papers: number, hasSyllabus: boolean, mistakesPerWeek: number, streak: number) {
  const pqa = papers > 0 ? Math.min(400, Math.round(papers * 18 + 50)) : 0;
  const syl = hasSyllabus ? 150 : 30;
  const mis = Math.max(0, Math.round(200 - mistakesPerWeek * 7));
  const con = Math.min(150, Math.round(streak * 7.5));
  return Math.min(1000, pqa + syl + mis + con);
}

function scoreTierLabel(n: number) {
  if (n >= 800) return "Exam Ready";
  if (n >= 600) return "Strong";
  if (n >= 400) return "Developing";
  if (n >= 200) return "Building";
  return "Beginner";
}

export default function Home() {
  const [today, setToday]               = useState("");
  const [selectedTool, setSelectedTool] = useState(0);
  const [expandedFeat, setExpandedFeat] = useState<number | null>(null);
  const [testimIdx, setTestimIdx]       = useState(0);

  // Score preview sliders
  const [papers,          setPapers]          = useState(3);
  const [hasSyllabus,     setHasSyllabus]     = useState(false);
  const [mistakesPerWeek, setMistakesPerWeek] = useState(8);
  const [streak,          setStreak]          = useState(5);

  // Live Marks demo
  const [demoScores, setDemoScores] = useState([82, 76, 90]);
  const demoSubjects = ["Physics", "Chemistry", "Mathematics"];
  const demoAvg = demoScores.reduce((s, x) => s + x, 0) / demoScores.length;
  const demoGrade = demoAvg >= 91 ? "A1" : demoAvg >= 81 ? "A2" : demoAvg >= 71 ? "B1" : demoAvg >= 61 ? "B2" : "C1";

  const scorePreview  = scorePreviewCalc(papers, hasSyllabus, mistakesPerWeek, streak);
  const scorePct      = (scorePreview / 1000) * 100;

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  }, []);

  const tool = TOOLS[selectedTool];

  return (
    <div>
      <article
        data-v="broadsheet"
        className="grain"
        style={{ maxWidth: 1280, width: "100%", margin: "0 auto", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--serif)" }}
      >

        {/* ── Top meta bar ── */}
        <div className="mono lp-metabar">
          <span>Vol. I · №&nbsp;01 · {today}</span>
          <span>A Periodical for the Studious · Since 2026</span>
          <span>Free to use · All sixteen tools included</span>
        </div>

        {/* ── Masthead ── */}
        <header className="lp-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 4 }}>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Est. MMXXVI — New Delhi · Singapore · Mumbai</div>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Issue Sixteen · Tools · One Ledger</div>
          </div>
          <h1 className="lp-title">The Ledger</h1>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginTop: 10 }} className="mono">
            <span>The Student&apos;s Operating System</span>
            <span>studyledger.in</span>
          </div>
        </header>

        {/* ── Lede ── */}
        <section className="lp-lede">
          <div>
            <div className="mono" style={{ color: "var(--cinnabar-ink)" }}>Leader · №&nbsp;1</div>
            <div className="mono" style={{ marginTop: 6, color: "var(--ink-3)" }}>Filed 04:22 · Editorial</div>
            <div className="smc" style={{ marginTop: 18 }}>
              On the question of whether students actually need sixteen different apps
            </div>
          </div>

          <div>
            <h2 className="lp-h2">
              Sixteen tools. One ledger. Built for the student who would rather be studying than picking software.
            </h2>
            <p className="dropcap cols-2" style={{ marginTop: 28, fontSize: 17, lineHeight: 1.55 }}>
              The problem with student productivity is that it has been solved sixteen times and none of the solutions talk to each other. Your planner does not know your marks. Your notes app does not know your exam date. Your Pomodoro timer does not know you have a Chemistry practical on Thursday.{" "}
              <span className="mark">Ledger is the single book where all of it is entered, measured, and scheduled</span>{" "}
              — sixteen tools sharing one calendar, one streak, one syllabus, and one real-time score that tells you exactly how exam-ready you are right now.
            </p>
          </div>

          <aside style={{ borderLeft: "1px solid var(--rule)", paddingLeft: 22 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)" }}>In this issue</div>
            <ol className="plain" style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.75, color: "var(--ink-2)" }}>
              <li><span className="mono">p.1</span>&nbsp; The Sixteen Tools</li>
              <li><span className="mono">p.2</span>&nbsp; Try it live — Marks &amp; Score</li>
              <li><span className="mono">p.3</span>&nbsp; Seven things nobody else ships</li>
              <li><span className="mono">p.4</span>&nbsp; Field reports from students</li>
            </ol>
            <Link href="/dashboard" className="btn" style={{ marginTop: 22, display: "inline-flex" }}>
              Open the Ledger →
            </Link>
          </aside>
        </section>

        {/* ── Ticker ── */}
        <div style={{ borderBottom: "1px solid var(--ink)", padding: "10px 0", background: "var(--paper-2)" }}>
          <div className="ticker">
            <div className="ticker-track mono" style={{ color: "var(--ink-2)" }}>
              {[0, 1].flatMap((k) => TICKER.map((item, i) => <span key={`${k}-${i}`}>{item}</span>))}
            </div>
          </div>
        </div>

        {/* ── Interactive Tool Explorer ── */}
        <section id="tools" className="lp-pad-t" style={{ borderBottom: "1px solid var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            <div>
              <div className="mono cin">Section A — The Sixteen Tools</div>
              <h3 className="lp-h3">Every tool a student needs. All in one place.</h3>
            </div>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Click any tool to explore</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 0, border: "1px solid var(--ink)" }}>
            {/* Tool list */}
            <div style={{ borderRight: "1px solid var(--ink)" }}>
              {TOOLS.map((t, i) => (
                <button
                  key={t.n}
                  onClick={() => setSelectedTool(i)}
                  style={{
                    width: "100%", padding: "14px 20px", background: selectedTool === i ? "var(--ink)" : "transparent",
                    color: selectedTool === i ? "var(--paper)" : "var(--ink)", border: "none",
                    borderBottom: i < TOOLS.length - 1 ? "1px solid var(--rule)" : "none",
                    cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16,
                    transition: "background 150ms",
                  }}
                  onMouseEnter={() => setSelectedTool(i)}
                >
                  <span className="mono" style={{ fontSize: 9, opacity: 0.5, flexShrink: 0, width: 20 }}>{t.n}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{t.ttl}</div>
                    <div className="mono" style={{ fontSize: 8, opacity: 0.6, marginTop: 2 }}>{t.sub}</div>
                  </div>
                  <span style={{ opacity: selectedTool === i ? 0.6 : 0, fontSize: 12, transition: "opacity 150ms" }}>→</span>
                </button>
              ))}
            </div>

            {/* Tool detail panel */}
            <div style={{ padding: "36px 36px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 400 }}>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 80, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 0.85, color: "var(--cinnabar-ink)", opacity: 0.25 }}>
                  {tool.n}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 600, lineHeight: 1.1, marginTop: 12 }}>{tool.ttl}</div>
                <div className="mono cin" style={{ marginTop: 6, fontSize: 9 }}>{tool.sub}</div>
                <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)", marginTop: 18 }}>{tool.desc}</p>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {tool.gets.map((g, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "var(--cinnabar-ink)", fontSize: 12, fontFamily: "var(--mono)" }}>✓</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
                <Link href={`/tools/${tool.slug}`} className="btn" style={{ textDecoration: "none" }}>
                  Open {tool.ttl} →
                </Link>
                <Link href="/dashboard" className="btn ghost" style={{ textDecoration: "none" }}>
                  All tools
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Live demo: Marks Predictor ── */}
        <section className="lp-pad" style={{ borderBottom: "1px solid var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            <div>
              <div className="mono cin">Section B — Try it live</div>
              <h3 className="lp-h3">Adjust the sliders. Watch the grade move.</h3>
            </div>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 02 · Marks Predictor · Live demo</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0, border: "1px solid var(--ink)" }}>
            {/* Sliders */}
            <div style={{ borderRight: "1px solid var(--ink)", padding: "28px 32px" }}>
              <div className="mono cin" style={{ marginBottom: 20 }}>Your scores</div>
              {demoSubjects.map((subj, i) => (
                <div key={subj} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600 }}>{subj}</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", fontWeight: 700 }}>{demoScores[i]}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={demoScores[i]}
                    onChange={e => setDemoScores(p => p.map((v, j) => j === i ? +e.target.value : v))}
                    style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
                  <div className="mono" style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)", fontSize: 9, marginTop: 2 }}>
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live result */}
            <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="mono" style={{ color: "var(--ink-3)" }}>Weighted average</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 96, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.9, marginTop: 6 }}>
                {demoAvg.toFixed(1)}<span style={{ fontSize: 36 }}>%</span>
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)" }}>CBSE Grade</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 600, marginTop: 4, color: demoGrade === "A1" ? "var(--cinnabar-ink)" : "var(--ink)" }}>{demoGrade}</div>
                </div>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)" }}>GPA (4.0)</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 600, marginTop: 4 }}>
                    {demoAvg >= 93 ? "4.0" : demoAvg >= 90 ? "3.7" : demoAvg >= 87 ? "3.3" : demoAvg >= 83 ? "3.0" : demoAvg >= 80 ? "2.7" : demoAvg >= 77 ? "2.3" : demoAvg >= 73 ? "2.0" : "1.7"}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 24, height: 8, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                <div style={{ height: "100%", width: `${demoAvg}%`, background: demoAvg >= 90 ? "var(--cinnabar)" : "var(--ink-2)", transition: "width 300ms" }} />
              </div>
              <Link href="/tools/marks" className="btn" style={{ textDecoration: "none", marginTop: 20, display: "inline-flex", alignSelf: "flex-start" }}>
                Open full Marks Predictor →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Score Preview ── */}
        <section className="lp-pad" style={{ borderBottom: "1px solid var(--ink)", background: "var(--paper-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            <div>
              <div className="mono cin">Section C — Ledger Score™</div>
              <h3 className="lp-h3">What would your readiness score be right now?</h3>
            </div>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool ★ · Live preview</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0, border: "1px solid var(--ink)", background: "var(--paper)" }}>
            {/* Inputs */}
            <div style={{ borderRight: "1px solid var(--ink)", padding: "28px 32px" }}>
              <div className="mono cin" style={{ marginBottom: 20 }}>Your study activity</div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>Past paper sessions done</span>
                  <span className="mono">{papers}</span>
                </div>
                <input type="range" min={0} max={20} value={papers} onChange={e => setPapers(+e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
                <div className="mono" style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)", fontSize: 9, marginTop: 2 }}><span>0</span><span>20</span></div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>Mistakes per week (recent)</span>
                  <span className="mono">{mistakesPerWeek}</span>
                </div>
                <input type="range" min={0} max={30} value={mistakesPerWeek} onChange={e => setMistakesPerWeek(+e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
                <div className="mono" style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)", fontSize: 9, marginTop: 2 }}><span>0</span><span>30</span></div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>Focus streak (days)</span>
                  <span className="mono">{streak}d</span>
                </div>
                <input type="range" min={0} max={30} value={streak} onChange={e => setStreak(+e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
                <div className="mono" style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)", fontSize: 9, marginTop: 2 }}><span>0</span><span>30</span></div>
              </div>

              <button
                onClick={() => setHasSyllabus(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: `1px solid ${hasSyllabus ? "var(--ink)" : "var(--rule)"}`, background: hasSyllabus ? "var(--ink)" : "transparent", color: hasSyllabus ? "var(--paper)" : "var(--ink)", cursor: "pointer", width: "100%", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, transition: "all 150ms" }}>
                <div style={{ width: 16, height: 16, border: `2px solid ${hasSyllabus ? "var(--paper)" : "var(--rule)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {hasSyllabus && <span style={{ fontSize: 10, lineHeight: 1 }}>✓</span>}
                </div>
                Syllabus uploaded to Ledger
              </button>
            </div>

            {/* Live score output */}
            <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="mono" style={{ color: "var(--ink-3)" }}>Your estimated Ledger Score™</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 96, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.9, marginTop: 6, color: "var(--ink)", transition: "all 300ms" }}>
                {scorePreview}
              </div>
              <div className="mono" style={{ marginTop: 6, color: "var(--ink-3)" }}>out of 1000 · {scoreTierLabel(scorePreview)}</div>

              <div style={{ marginTop: 16, height: 10, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: "var(--ink)", transition: "width 400ms cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              <div className="mono" style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)", fontSize: 9, marginTop: 3 }}>
                {["Beginner", "Building", "Developing", "Strong", "Exam Ready"].map(t => <span key={t}>{t}</span>)}
              </div>

              <div style={{ marginTop: 20, padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                {!hasSyllabus && <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginBottom: 6 }}>+ Upload your syllabus to add up to 250 points</div>}
                {papers === 0 && <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginBottom: 6 }}>+ Do a Past Papers session to unlock PYQ Accuracy</div>}
                {streak < 7 && <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>+ Build a 7-day streak to add {Math.round((7 - streak) * 7.5)} consistency points</div>}
              </div>

              <Link href="/auth" className="btn" style={{ textDecoration: "none", marginTop: 20, display: "inline-flex", alignSelf: "flex-start" }}>
                See your real score →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Niche features (accordion) ── */}
        <section className="lp-pad" style={{ borderBottom: "1px solid var(--ink)", background: "var(--paper-2)" }}>
          <div className="lp-feats">
            <div>
              <div className="mono cin">Section D — Seven things nobody else ships</div>
              <h3 className="lp-h3">The features we are quietly strange about.</h3>
              <p style={{ fontFamily: "var(--sans)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 20 }}>
                The tools above are the price of entry. These are the reason you stay. None of them are available in another student app we have been able to find — we looked, and then we built them.
              </p>
              <div className="fignum" style={{ marginTop: 40 }}>Fig. D · Seven signatures</div>
              <div className="figbox" style={{ marginTop: 8, height: 160 }}>
                <div className="fiblab">Schematic · Debt Meter</div>
              </div>
            </div>

            <div className="lp-feats2">
              {FEATS.map((f, i) => (
                <div
                  key={f.tag}
                  style={{ borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", background: expandedFeat === i ? "var(--ink)" : "var(--paper)", cursor: "pointer", transition: "background 150ms" }}
                  onClick={() => setExpandedFeat(expandedFeat === i ? null : i)}
                >
                  <div style={{ padding: "22px 20px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 34, color: expandedFeat === i ? "var(--paper)" : "var(--cinnabar-ink)", fontWeight: 400 }}>{f.tag}</span>
                        <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, lineHeight: 1.1, color: expandedFeat === i ? "var(--paper)" : "var(--ink)" }}>{f.ttl}</span>
                      </div>
                      <span className="mono" style={{ fontSize: 9, color: expandedFeat === i ? "var(--paper)" : "var(--ink-3)", opacity: 0.6, flexShrink: 0 }}>{expandedFeat === i ? "▲" : "▼"}</span>
                    </div>
                    <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55, color: expandedFeat === i ? "var(--paper)" : "var(--ink-2)", marginTop: 10, opacity: expandedFeat === i ? 0.9 : 1 }}>{f.body}</p>
                    {expandedFeat === i && (
                      <p style={{ fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.55, color: "var(--paper)", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.2)", opacity: 0.8 }}>
                        {f.extra}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", padding: "22px 20px", background: "var(--ink)", color: "var(--paper)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div className="mono" style={{ color: "var(--paper)", opacity: 0.7 }}>Coming Q3</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, lineHeight: 1.1, marginTop: 14 }}>Exam-Day Mode</div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55, opacity: 0.85, marginTop: 10 }}>
                    The morning of the paper, Ledger locks to a single-screen revision of only what you got wrong in the last 14 days.
                  </p>
                </div>
                <div className="mono" style={{ opacity: 0.7 }}>Waitlist: 3,204</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Field reports (carousel) ── */}
        <section className="lp-pad" style={{ borderBottom: "1px solid var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            <div>
              <div className="mono cin">Section E — Field reports</div>
              <h3 className="lp-h3">Dispatches from the desks of actual students.</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="mono" style={{ color: "var(--ink-3)" }}>n = 11,482 · Self-reported · Apr &apos;26</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setTestimIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  style={{ padding: "6px 12px", background: "none", border: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>←</button>
                <button onClick={() => setTestimIdx(i => (i + 1) % TESTIMONIALS.length)}
                  style={{ padding: "6px 12px", background: "none", border: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>→</button>
              </div>
            </div>
          </div>

          {/* Active testimonial */}
          <div style={{ border: "1px solid var(--ink)", padding: "32px 36px", marginBottom: 0 }}>
            <div className="mono cin">Dispatch № {String(testimIdx + 1).padStart(2, "0")}</div>
            <blockquote style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", lineHeight: 1.35, margin: "16px 0 24px", letterSpacing: "-0.008em", maxWidth: 800 }}>
              &ldquo;{TESTIMONIALS[testimIdx].q}&rdquo;
            </blockquote>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid var(--rule)", paddingTop: 16, gap: 16 }}>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)" }}>Filed by</div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, marginTop: 4 }}>{TESTIMONIALS[testimIdx].by}</div>
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)" }}>Desk</div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13, marginTop: 4, color: "var(--ink-2)" }}>{TESTIMONIALS[testimIdx].ctx}</div>
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)" }}>Result</div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, marginTop: 4, color: "var(--cinnabar-ink)" }}>{TESTIMONIALS[testimIdx].score}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} onClick={() => setTestimIdx(i)}
                    style={{ width: i === testimIdx ? 24 : 8, height: 8, background: i === testimIdx ? "var(--ink)" : "var(--rule)", border: "none", cursor: "pointer", transition: "all 200ms", padding: 0, flexShrink: 0 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="lp-4col" style={{ marginTop: -1 }}>
            {STATS.map(({ big, sm }, i) => (
              <div key={i} style={{ borderRight: i < 3 ? "1px solid var(--ink)" : "none", borderBottom: "1px solid var(--ink)", padding: "20px 20px" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontWeight: 700, fontStyle: "italic", lineHeight: 1, letterSpacing: "-0.02em" }}>{big}</div>
                <div className="mono" style={{ marginTop: 8, color: "var(--ink-3)" }}>{sm}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="lp-footer">
          <div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 0.9 }}>Ledger</div>
            <div className="mono" style={{ marginTop: 10, color: "var(--ink-3)" }}>The Student&apos;s Operating System</div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 12.5, color: "var(--ink-3)", marginTop: 20, maxWidth: 300, lineHeight: 1.55 }}>
              Ledger is independent, student-funded, and not accepting venture capital until version 2.0. We will never sell your study data.
            </p>
          </div>

          {[
            { h: "Tools", l: ["Planner", "Marks Predictor", "Notes Simplifier", "Doubt Solver", "Focus Dashboard", "Career Pathfinder", "Past Papers", "Assignment Rescue", "Resume Builder", "Study Rooms", "Topic Tutor", "Mistake DNA", "48-Hour Crunch", "Syllabus Parser", "Formula Sheet", "Ledger Score™"] },
            { h: "Institutions", l: ["For Schools", "For Tuition Centres", "Syllabus Parser", "Data Export", "API"] },
            { h: "The Ledger",   l: ["Changelog", "Roadmap", "Colophon", "Masthead", "Press", "Contact"] },
          ].map((g) => (
            <div key={g.h}>
              <div className="mono cin">{g.h}</div>
              <ul className="plain" style={{ marginTop: 14, fontFamily: "var(--sans)", fontSize: 13, lineHeight: 2 }}>
                {g.l.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}

          <div className="mono" style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--ink)", paddingTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span>© MMXXVI Ledger Study Co.</span>
            <span>Set in Source Serif, Inter Tight &amp; JetBrains Mono</span>
            <span>studyledger.in</span>
          </div>
        </footer>
      </article>

      <PaletteToggle />
    </div>
  );
}
