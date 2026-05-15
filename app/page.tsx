"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GetStartedButton } from "@/components/ui/get-started-button";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TOOLS = [
  { n: "01", slug: "planner",         ttl: "Smart Study Planner",   sub: "Subjects in. Timetable out.",                    cat: "PLAN",     desc: "Enter subjects, exam dates, and the hours you can actually give. We return a day-by-day plan for every remaining day — not a calendar template you then spend two hours editing.",                                                                                                                  gets: ["14-day reactive schedule", "Adjusts when you miss a day", "Pre-fills from your syllabus"] },
  { n: "02", slug: "marks",           ttl: "Marks Predictor",       sub: "The math of your report card.",                  cat: "TRACK",    desc: "Current scores, subject weightages, upcoming tests. Get your final weighted percentage, the CBSE grade it maps to, a 4.0 GPA, and the score you need in remaining subjects to hit your target.",                                                                                                           gets: ["Weighted average in real time", "What-if score slider per subject", "4.0 GPA + CBSE grade output"] },
  { n: "03", slug: "notes",           ttl: "Study Engine",          sub: "Simplify chapters. Get a full lesson.",          cat: "LEARN",    desc: "Two modes in one: Simplify turns any chapter into plain-English notes, flashcards, and a graded quiz — saved to your library. Learn delivers a full board-calibrated lesson on any topic, with worked examples, key facts, and a practice quiz.",                                                              gets: ["Simplify: board-matched notes + flashcards + quiz", "Learn: full lesson on any topic", "Saved notes library across sessions"] },
  { n: "04", slug: "doubt",           ttl: "Doubt Solver",          sub: "A question, a worked answer.",                   cat: "LEARN",    desc: "Type any problem. Receive a fully worked solution with the underlying concept, not just the answer. The AI explains it the way your board's marking scheme expects — step by step.",                                                                                                                  gets: ["Full worked solution", "Underlying principle explained", "Board-style step layout"] },
  { n: "05", slug: "focus",           ttl: "Focus Dashboard",       sub: "Pomodoro, streaks, tasks.",                      cat: "PLAN",     desc: "A single screen: 25-minute timer, running task list, and a streak that persists across every tool. No social feed, no notifications you didn't ask for. Just the session and a counter.",                                                                                                              gets: ["25-min Pomodoro timer", "Cross-tool streak tracking", "Task list that doesn't disappear"] },
  { n: "06", slug: "papers",          ttl: "Past Papers",           sub: "CBSE, JEE, NEET, SAT, IB.",                     cat: "PRACTISE", desc: "47 papers, 900+ questions. 10 random questions per session, or Timed Mode where the clock is running and you submit when it hits zero. Every wrong answer tags a weak topic.",                                                                                                                          gets: ["Timed mode with auto-submit", "Weak topic tagging per answer", "Session log with accuracy trend"] },
  { n: "07", slug: "resume",          ttl: "Resume Builder",        sub: "For applications, not LinkedIn.",                cat: "FUTURE",   desc: "For internships, summer programs, university applications, and college essays. Enter activities and achievements; the tool assembles one polished PDF formatted for admissions committees.",                                                                                                              gets: ["College application format", "Achievement bullet writing", "One-page PDF output"] },
  { n: "08", slug: "rooms",           ttl: "Study Rooms",           sub: "Silent accountability.",                         cat: "TRACK",    desc: "Private rooms with a shared timer and a shared task list. Enter a code, see who's in the session, and start the clock together. If one person bails, both streaks take the hit.",                                                                                                                     gets: ["Code-based rooms, no signup", "Shared Pomodoro timer", "Mutual streak accountability"] },
  { n: "09", slug: "dna",             ttl: "Mistake DNA",           sub: "See exactly where you go wrong.",                cat: "PRACTISE", desc: "Every wrong answer from Past Papers is categorised: Conceptual Gap, Calculation Slip, Misread, Rushed, or Memory Blank. Visualised by subject. The pattern becomes obvious within three sessions.",                                                                                                      gets: ["5-category mistake taxonomy", "Per-subject breakdown chart", "Recurring topic tracker"] },
  { n: "10", slug: "crunch",          ttl: "48-Hour Crunch",        sub: "Exam tomorrow. Smart triage.",                   cat: "PRACTISE", desc: "Tell the AI what to skip and what to nail. Input your topics and their status (done / partial / not yet). Get a priority order, time estimates per topic, and an hour-by-hour schedule.",                                                                                                                gets: ["Priority triage of every topic", "Time estimates per chapter", "Hour-by-hour schedule"] },
  { n: "11", slug: "syllabus",        ttl: "Syllabus Parser",       sub: "Upload PDF. Get your year mapped.",              cat: "LEARN",    desc: "Upload your school's PDF syllabus — or a photo of the printed sheet. AI extracts every subject, chapter, and topic into a clean structure that powers every other tool on Ledger automatically.",                                                                                                       gets: ["PDF + photo input", "Subjects, chapters, topics extracted", "Auto-powers all other tools"] },
  { n: "12", slug: "formula",         ttl: "Formula Sheet",         sub: "Chapter -> complete reference card.",            cat: "LEARN",    desc: "Type any subject and chapter. Get every formula with variable definitions, SI units, dimensional analysis, and board-specific exam tips — formatted for one-click PDF export.",                                                                                                                         gets: ["Every formula for the chapter", "Variable meanings + SI units", "Board-specific exam tips, print-ready"] },
  { n: "13", slug: "admissions",      ttl: "Admissions Engine",     sub: "Your real odds. 60 universities.",               cat: "FUTURE",   desc: "GPA, test scores, ECs, awards -> statistical admission probability for 60 top universities. AI strategy, gap analysis, essay angles, and deadline countdowns.",                                                                                                                                         gets: ["Probability at 60 real universities", "Safety / Match / Reach / Far Reach list", "AI strategy + essay angles + gap analysis"] },
  { n: "14", slug: "flashcards",      ttl: "AI Flashcards",         sub: "Topic or notes -> flip cards.",                  cat: "PRACTISE", desc: "AI generates high-quality flashcards from any topic or your own notes. Track known/unknown per card and drill only what you haven't mastered.",                                                                                                                                                           gets: ["Paste your notes or name a topic", "Known / still-learning card tracking", "Flip to reveal, tap to categorise"] },
  { n: "15", slug: "interview",       ttl: "Interview Coach",       sub: "Practice. Get scored. Improve.",                 cat: "FUTURE",   desc: "Pick your interview type, answer AI-generated questions, then get scored with strengths, gaps, a model answer, and a coaching tip per response.",                                                                                                                                                      gets: ["University, Job, Medicine, Scholarship modes", "Score + model answer per question", "Coaching tip after every response"] },
  { n: "16", slug: "mindmap",         ttl: "Mind Map Builder",      sub: "Any topic. Full concept breakdown.",             cat: "LEARN",    desc: "AI generates a full collapsible mind map with depth levels. Branches collapse on click, colours by depth, printable to PDF in one click.",                                                                                                                                                           gets: ["Collapsible branch tree", "Brief / Standard / Deep dive modes", "Print to PDF in one click"] },
  { n: "17", slug: "citation",        ttl: "Citation Generator",    sub: "APA, MLA, Chicago, Harvard.",                   cat: "WRITE",    desc: "Fill in source details and get a correctly formatted citation in any major style. Supports book, journal, website, newspaper, and video sources.",                                                                                                                                                   gets: ["5 source types supported", "APA 7, MLA 9, Chicago 17, Harvard, Vancouver", "One-click copy to clipboard"] },
  { n: "18", slug: "presentation",    ttl: "Presentation Planner",  sub: "Topic -> full slide deck with notes.",           cat: "WRITE",    desc: "AI builds a slide-by-slide presentation with speaker notes, calibrated to your audience, duration, and style. Left panel navigation, print-ready.",                                                                                                                                                  gets: ["Slide panel + 16:9 preview", "Speaker notes for every slide", "Audience + duration + style controls"] },
  { n: "19", slug: "debate",          ttl: "Debate Coach",          sub: "Any motion. Arguments both ways.",               cat: "WRITE",    desc: "Generate for and against arguments, evidence, rebuttals, key terms, and practice questions for any debate motion at any level.",                                                                                                                                                                   gets: ["3 arguments per side with evidence", "Rebuttal for each if challenged", "Key terms + practice questions"] },
  { n: "20", slug: "habits",          ttl: "Habit Tracker",         sub: "Build study habits that stick.",                 cat: "PLAN",     desc: "Track daily study habits with a 14-day heatmap grid, per-habit streak counter, weekly score percentage, and the ability to add custom habits.",                                                                                                                                                   gets: ["14-day heatmap history", "Streak counter per habit", "Add custom habits with emoji"] },
  { n: "21", slug: "deadlines",       ttl: "Deadline Hub",          sub: "Every deadline. Never miss one.",                cat: "PLAN",     desc: "Add exams, assignments, and applications with priority levels, categories, and notes. Overdue alerts, due-this-week counts, and category filters.",                                                                                                                                                 gets: ["Countdown to each deadline", "Category + priority + overdue alerts", "Filter by type or status"] },
  { n: "22", slug: "gpa-sim",         ttl: "GPA Simulator",         sub: "Model your grades. Plan your GPA.",              cat: "FUTURE",   desc: "Add all your courses, choose your scale (4.0 / 5.0 / 7.0 / 100), toggle weighted or unweighted, and find out what grade you need to hit a target GPA.",                                                                                                                                           gets: ["4.0 / 5.0 / 7.0 / 100 scale support", "Weighted vs unweighted toggle", "What-do-I-need? calculator"] },
  { n: "23", slug: "vocab",           ttl: "Vocabulary Vault",      sub: "Deep word learning with memory hooks.",          cat: "LEARN",    desc: "AI generates vocabulary sets with definition, part of speech, example sentence, etymology, synonyms, and a vivid memory hook. Card flip and list modes.",                                                                                                                                         gets: ["Memory hook per word", "Etymology + synonyms included", "Card flip + full list view"] },
  { n: "24", slug: "research",        ttl: "Research Hub",          sub: "Research any topic. Plan any assignment.",       cat: "WRITE",    desc: "Two modes: Research generates a full briefing — sections, for/against arguments, statistics, and five essay angles. Plan Assignment (Pro) takes your brief and returns an outline, argument structure, and bibliography — plagiarism-safe guidance for building it yourself.",                         gets: ["Research mode: arguments, stats, 5 angles", "Plan mode: outline + bibliography (Pro)", "Board-matched academic style throughout"] },
  { n: "25", slug: "essay-blueprint", ttl: "Essay Workshop",        sub: "Plan. Argue. Grade. One page.",                  cat: "WRITE",    desc: "Three tools in one flow: Blueprint plans your thesis and argument structure, Argue generates steel-manned arguments for any position, and Grade gives your essay a full examiner breakdown with a criteria-by-criteria score and concrete improvement actions.",                                       gets: ["Blueprint: thesis + structure in 3 minutes", "Argue: 3 arguments + rebuttals + structure map", "Grade: examiner score + improvement actions"] },
  { n: "26", slug: "coach",           ttl: "Academic Coach",        sub: "Personal guidance, any subject.",                cat: "TRACK",    desc: "Your AI mentor that knows your grade, board, and exam targets. Ask anything: how to study for Chemistry, how to fix your essay structure, how to stop avoiding Maths.",                                                                                                                          gets: ["Board + grade aware coaching", "Study strategy per subject", "Honest, specific advice"] },
  { n: "27", slug: "compare",         ttl: "Topic Comparer",        sub: "Two concepts. Side-by-side.",                    cat: "TRACK",    desc: "Enter two topics, theories, or periods and get a structured comparison: similarities, differences, key tensions, and a recommendation for which angle suits an essay question best.",                                                                                                              gets: ["Structured similarity/difference table", "Key tension analysis", "Essay angle recommendation"] },
  { n: "28", slug: "exam-planner",    ttl: "Revision Planner",      sub: "All your exams. Spaced revision built in.",      cat: "PRACTISE", desc: "Two tools in one: Exam Planner builds a day-by-day revision timetable weighted by exam proximity, subject difficulty, and the hours you have. Spaced Revision resurfaces your weak topics on Ebbinghaus intervals — precisely when you're about to forget them.",                                    gets: ["Planner: weighted day-by-day timetable", "Spaced: Ebbinghaus-interval resurfacing", "Syncs with your syllabus and mistake history"] },
  { n: "29", slug: "lab-report",      ttl: "Lab Report Writer",     sub: "Hypothesis to discussion, complete.",            cat: "WRITE",    desc: "Enter your experiment, hypothesis, results table, and observations. Get a complete lab report with method, analysis, uncertainty calculations, and discussion in IGCSE/IB/CBSE format.",                                                                                                           gets: ["Full report in your board's format", "Uncertainty + error analysis", "Discussion + evaluation section"] },
  { n: "30", slug: "lang-analyzer",   ttl: "Language Analyzer",     sub: "Deep linguistic analysis of any text.",          cat: "LEARN",    desc: "Paste any passage for literary device identification, tone and register mapping, theme extraction, and a stylistic analysis matching your exam board's rubric expectations.",                                                                                                                    gets: ["Literary devices identified + quoted", "Tone, register, theme analysis", "Exam rubric-matched commentary"] },
  { n: "31", slug: "mark-scheme",     ttl: "Question Decoder",      sub: "Mark schemes. Paper anatomy. Both in one.",      cat: "PRACTISE", desc: "Two modes: Mark Scheme Decoder annotates every mark point in any mark scheme or question, showing exactly what earns marks and why. Paper Dissector analyses a full past paper — topic frequency, question difficulty, command words, and strategic advice.",                                        gets: ["Decode: mark-point breakdown + examiner intent", "Dissect: topic frequency + difficulty map", "Self-assessment checklist per question"] },
  { n: "32", slug: "practice",        ttl: "Practice Suite",        sub: "Targeted questions. Timed exam mode.",           cat: "PRACTISE", desc: "Two modes: Practice Engine generates 10 custom questions — MCQ, short answer, and extended — with model answers for self-marking. Exam Simulator builds a full timed MCQ paper with a question map, flag-for-review, and detailed explanations on submission.",                                     gets: ["Practice mode: 10 custom questions + model answers", "Exam mode: timed AI MCQ with question map", "Board-calibrated for your subject and level"] },
  { n: "33", slug: "source",          ttl: "Text Analyst",          sub: "Source analysis and reading comprehension.",     cat: "TRACK",    desc: "Two modes: Source Analyst runs a full OPCVL analysis on any primary source — Origin, Purpose, Content, Value, Limitation — formatted for IB, IGCSE, or A-Level history. Reading Companion summarises any passage with tone, theme, devices, and four-level comprehension questions.", gets: ["Source mode: full OPCVL in your board's format", "Reading mode: summary + devices + 4-level questions", "Contextual background auto-included"] },
  { n: "34", slug: "uni-match",       ttl: "Future Finder",         sub: "Universities, subjects, and your path forward.", cat: "FUTURE",   desc: "Three tools in one: University Matcher ranks universities by fit and entry grade, Subject Picker recommends your Grade 11 or A-Level choices based on strengths and goals, and Career Pathfinder maps streams, colleges, entrance exams, and a five-year roadmap.",                                 gets: ["Uni: ranked by fit + deadline countdowns", "Subject: ranked picks + career alignment", "Career: stream + roadmap + entrance exams"] },
  { n: "35", slug: "predict",         ttl: "Question Predictor",    sub: "What will the examiner ask next?",               cat: "PRACTISE", desc: "Enter your subject, topic, and exam board. Get 6-8 predicted questions ranked by likelihood, with reasoning, hot-topic areas, and command words likely to appear this cycle.",                                                                                                                          gets: ["6-8 predicted questions ranked", "Likelihood reasoning per question", "Hot-topic + command word flags"] },
  { n: "36", slug: "memory-palace",   ttl: "Memory Palace Builder", sub: "Remember anything with Method of Loci.",        cat: "PRACTISE", desc: "Pick any list to memorise — vocabulary, dates, formulas, case studies. Get a full memory palace with a familiar location, vivid station images, and a memorable story linking every item.",                                                                                                             gets: ["Full palace with location + stations", "Vivid image per item", "Story linking the whole sequence"] },
  { n: "37", slug: "analogy",         ttl: "Analogy Engine",        sub: "Turn complexity into understanding.",            cat: "PRACTISE", desc: "Type any difficult concept and get 3 analogies ranked from most intuitive to most surprising, each with a breakdown of where the comparison holds and where it breaks down.",                                                                                                                        gets: ["3 analogies: simple -> surprising", "Breakdown of where each holds", "Limitation of each analogy"] },
  { n: "38", slug: "case-study",      ttl: "Case Study Pro",        sub: "Business scenarios, fully analysed.",            cat: "TRACK",    desc: "Enter a company, industry, or scenario. Get a complete business case study with SWOT, Porter's Five Forces, stakeholder map, and strategic recommendations in exam-ready format.",                                                                                                               gets: ["SWOT + Porter's 5 Forces analysis", "Stakeholder map + tensions", "Strategic recommendations"] },
  { n: "39", slug: "timeline",        ttl: "Timeline Builder",      sub: "History, chronologically mapped.",               cat: "TRACK",    desc: "Enter any historical period or topic. Get 10-14 key events with dates, significance, causal links between them, and category tags — formatted for history exam essay structure.",                                                                                                               gets: ["10-14 annotated events", "Causal links between events", "Political / Economic / Social categories"] },
  { n: "40", slug: "grammar",         ttl: "Writing Polish",        sub: "Grammar, style, and personal statement.",       cat: "WRITE",    desc: "Two modes: Grammar Coach scores and rewrites your academic writing with category-level feedback and 10 phrases to elevate your register. Personal Statement scores your application essay with hook analysis, paragraph-by-paragraph notes, and a rewritten opening.",                            gets: ["Grammar mode: quality score + corrected rewrite", "Statement mode: hook + tone + paragraph notes", "10 academic phrases to improve your register"] },
  { n: "41", slug: "study-guide",     ttl: "Study Guide Builder",   sub: "Complete revision guide in minutes.",           cat: "TRACK",    desc: "Enter any topic or chapter. Get a full study guide: sections, must-know facts, common mistakes, exam tips, visual memory prompts, and a 60-second summary for last-minute review.",                                                                                                              gets: ["Structured sections with must-knows", "Common mistakes to avoid", "60-second last-minute summary"] },
  { n: "42", slug: "exam-strategy",   ttl: "Exam Strategy",         sub: "How to work the paper on exam day.",            cat: "PRACTISE", desc: "Input your exam type, duration, and subject. Get time allocation per section, nerve-control techniques, last-minute revision priorities, and a personalised exam-day checklist.",                                                                                                                gets: ["Time allocation per section", "Nerve-control + focus techniques", "Personalised exam-day checklist"] },
  { n: "43", slug: "concept-connect", ttl: "Concept Connect",       sub: "Bridge ideas across subjects.",                 cat: "TRACK",    desc: "Enter two concepts from any discipline. Get structural, causal, analogical, and historical connections — uncovering surprising links between ideas you thought were unrelated.",                                                                                                                  gets: ["Structural + causal connections", "Analogical + historical links", "Cross-subject insight map"] },
  { n: "44", slug: "model-answer",    ttl: "Model Answer Factory",  sub: "Produce full-marks exemplars.",                 cat: "WRITE",    desc: "Paste any exam question. Get a model answer hitting every marking point, a structure guide showing how marks are distributed, and commentary on what makes this answer grade-band-A.",                                                                                                          gets: ["Full-marks model answer", "Mark-point distribution map", "Commentary on why it works"] },
  { n: "★",  slug: "score",           ttl: "Ledger Score",          sub: "Your real-time exam readiness.",                cat: "TRACK",    desc: "A 0-1000 index computed from four signals: PYQ accuracy (40%), syllabus coverage (25%), mistake velocity (20%), and daily consistency (15%). Updates every time you use any tool.",                                                                                                             gets: ["Live 0-1000 readiness score", "4-pillar breakdown", "Top 3 actions to improve today"] },
] as const;

const FEATS = [
  { tag: "α", ttl: "Cognitive Debt Meter",      body: "Unfinished chapters accrue interest. The meter shows your academic APR — and the minimum daily payment to stay solvent before exams.", extra: "The debt meter recalculates every time you log a session or skip one. It uses your exam dates to reverse-engineer the daily cost of procrastination in marks." },
  { tag: "β", ttl: "Circadian Study Window",     body: "We map your chronotype from sleep times and place the hardest subject inside your personal peak — not a generic morning/evening default.", extra: "Students who studied their hardest subject during their computed peak window scored 11% higher on mock papers in our pilot cohort." },
  { tag: "γ", ttl: "Forgetting-Curve Revision", body: "Past-paper questions resurface on Ebbinghaus intervals. Not by topic. Not by date. By the precise moment before you would have forgotten.", extra: "Each correct answer pushes the next review interval forward. Each wrong answer resets the curve. The algorithm is the same one used by the world's top medical schools." },
  { tag: "δ", ttl: "Peer Heatmap",              body: "Anonymous map of which chapters students in your board, grade, and week are struggling with right now. You are not alone on Conic Sections.", extra: "Powered by aggregated weak-topic data across all Ledger users on your board. Updated hourly. Only shown when a topic has 50+ struggling students this week." },
  { tag: "ε", ttl: "Syllabus Parser",           body: "Upload your school's PDF syllabus. We read it and build the full plan — not a template you then edit for an hour.", extra: "Handles handwritten notes, scanned PDFs, and messy Word docs. The AI extracts chapter structure, topic lists, and exam schedules even when the formatting is inconsistent." },
  { tag: "ζ", ttl: "Accountability Pact",       body: "Lock a session with a friend. If either of you bails, both streaks reset. The only social feature that works by being uncomfortable.", extra: "The pact mechanic has a 94% completion rate vs 71% for solo sessions. The discomfort of letting someone else down is more motivating than personal discipline." },
  { tag: "η", ttl: "Marks->College Simulator",  body: "A live feedback loop: score X on this week's test and these colleges move in or out of reach. Based on actual historic cutoffs.", extra: "Cutoff data from the last 6 years across 340 colleges. Updated annually. Shows rolling percentile not just rank — so you know if you are in the margin or safely inside." },
] as const;

const TESTIMONIALS = [
  { q: "I opened Ledger once and deleted four other apps. The debt meter is what finally got me to revise organic chem.",                                         by: "Ananya R.", ctx: "Class 12, CBSE — Pune",    score: "Physics 94 -> 97"         },
  { q: "The chronotype thing sounds like astrology until you do calculus at 10pm and realize you actually are better at it.",                                     by: "Marcus O.", ctx: "IB Diploma — Singapore",   score: "HL Math 6 -> 7"           },
  { q: "My school's syllabus PDF is 41 pages of chaos. Ledger turned it into 84 days of study in about six seconds.",                                           by: "Rohan K.",  ctx: "Class 10, ICSE — Mumbai",  score: "Overall 88% -> 94%"       },
  { q: "Accountability pact means I can't bail on sessions anymore. My streak is currently hostage to a girl in Chennai.",                                       by: "Dev P.",    ctx: "JEE Advanced prep",        score: "Mock rank 14,200 -> 3,860"},
] as const;

const STATS = [
  { big: "14.2", suffix: "%", sm: "Median score lift after 8 weeks" },
  { big: "7.4",  suffix: "h", sm: "Recovered per student, per week"  },
  { big: "94",   suffix: "%", sm: "Renew after the first board exam"  },
  { big: "42",   suffix: "",  sm: "Schools piloting Ledger this term" },
] as const;

const TICKER = [
  "Figures updated hourly",
  "14,382 timetables generated this week",
  "Average user recovered 7.4 hours per week",
  "Chemistry is the most-feared subject in CBSE Class 12",
  "Peer heatmap: Conic Sections trending +41% — Week 16",
  "Fifty-one tools. One streak. One score.",
  "Debt meter holders revised 2.6x more often",
];

const CATEGORIES = ["ALL", "PLAN", "LEARN", "WRITE", "PRACTISE", "FUTURE", "TRACK"] as const;

const CAT_COLOR: Record<string, string> = {
  PLAN:     "var(--sage)",
  LEARN:    "var(--slate)",
  WRITE:    "var(--ochre)",
  PRACTISE: "var(--cinnabar-ink)",
  FUTURE:   "var(--plum)",
  TRACK:    "var(--teal)",
};

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

const TIERS = [
  { label: "Beginner",   min: 0,   max: 199  },
  { label: "Building",   min: 200, max: 399  },
  { label: "Developing", min: 400, max: 599  },
  { label: "Strong",     min: 600, max: 799  },
  { label: "Exam Ready", min: 800, max: 1000 },
];

const S = {
  cap:       { fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)" },
  capAccent: { fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--cinnabar-ink)" },
  h2:        { fontFamily: "var(--serif)", fontSize: "clamp(26px,3.5vw,40px)", fontStyle: "italic" as const, fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.15 },
  body:      { fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7 },
  rule:      { height: 1, background: "var(--rule)", width: "100%" },
  border:    "1px solid var(--rule)",
  borderInk: "1px solid var(--ink)",
};

/* ── Section label row ── */
function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="anim-divider-row" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--cinnabar-ink)", letterSpacing: "0.18em", flexShrink: 0 }}>{num}</span>
      <div className="anim-divider" style={{ flex: 1, height: 1, background: "var(--rule)" }} />
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase", flexShrink: 0 }}>{label}</span>
    </div>
  );
}

export default function Home() {
  const [today,          setToday]          = useState("");
  const [selectedTool,   setSelectedTool]   = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [expandedFeat,   setExpandedFeat]   = useState<number | null>(null);
  const [testimIdx,      setTestimIdx]      = useState(0);
  const [papers,         setPapers]         = useState(3);
  const [hasSyllabus,    setHasSyllabus]    = useState(false);
  const [mistakesPerWeek,setMistakesPerWeek]= useState(8);
  const [streak,         setStreak]         = useState(5);

  const containerRef = useRef<HTMLDivElement>(null);
  const testimRef    = useRef<HTMLDivElement>(null);
  const scoreNumRef  = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(scorePreviewCalc(3, false, 8, 5));

  const filteredTools = activeCategory === "ALL"
    ? TOOLS
    : TOOLS.filter(t => t.cat === activeCategory);
  const tool = filteredTools[Math.min(selectedTool, filteredTools.length - 1)] ?? filteredTools[0];

  const scorePreview = scorePreviewCalc(papers, hasSyllabus, mistakesPerWeek, streak);

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  }, []);

  useEffect(() => { setSelectedTool(0); }, [activeCategory]);

  /* Animate testimonial on change */
  useEffect(() => {
    if (!testimRef.current) return;
    gsap.fromTo(testimRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
    );
  }, [testimIdx]);

  /* Animate score number on change */
  useEffect(() => {
    if (!scoreNumRef.current) return;
    const from = prevScoreRef.current;
    const to   = scorePreview;
    prevScoreRef.current = scorePreview;
    const obj = { val: from };
    gsap.to(obj, {
      val: to, duration: 0.6, ease: "power2.out",
      onUpdate() { if (scoreNumRef.current) scoreNumRef.current.textContent = String(Math.round(obj.val)); },
    });
  }, [scorePreview]);

  useGSAP(() => {
    /* ── Hero entrance ── */
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".hero-badge",
        { clipPath: "inset(0 100% 0 0)", opacity: 0 },
        { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: 0.8, ease: "power2.inOut" })
      .from(".hero-word",     { opacity: 0, y: 72, duration: 0.9, stagger: 0.16 }, "-=0.3")
      .from(".hero-divider",  { scaleX: 0, transformOrigin: "left", duration: 0.7, ease: "power2.inOut" }, "-=0.5")
      .from(".hero-sub",      { opacity: 0, y: 20, duration: 0.65 }, "-=0.4")
      .from(".hero-stats > *",{ opacity: 0, y: 18, duration: 0.5, stagger: 0.09 }, "-=0.4")
      .from(".hero-ctas > *", { opacity: 0, y: 14, scale: 0.96, duration: 0.5, stagger: 0.08 }, "-=0.35")
      .from(".hero-scroll",   { opacity: 0, duration: 0.5 }, "-=0.2")
      .from(".hero-panel > *",{ opacity: 0, y: 20, duration: 0.55, stagger: 0.06, ease: "power2.out" }, "-=0.6");

    /* ── Hero h1 parallax on mouse ── */
    const heroEl = containerRef.current?.querySelector(".hero-section");
    const onMove = (e: Event) => {
      const { clientX, clientY } = e as MouseEvent;
      const x = (clientX / window.innerWidth  - 0.5) * 16;
      const y = (clientY / window.innerHeight - 0.5) * 9;
      gsap.to(".hero-h1", { x, y, duration: 1.4, ease: "power2.out", overwrite: "auto" });
    };
    const onLeave = () => gsap.to(".hero-h1", { x: 0, y: 0, duration: 1.2, ease: "power3.out" });
    heroEl?.addEventListener("mousemove", onMove);
    heroEl?.addEventListener("mouseleave", onLeave);

    /* ── Hero content parallax on scroll ── */
    gsap.to(".hero-content", {
      y: -60, ease: "none",
      scrollTrigger: { trigger: ".hero-section", start: "top top", end: "+=700", scrub: 1.8 },
    });

    /* ── Dividers draw ── */
    gsap.utils.toArray<HTMLElement>(".anim-divider").forEach(el => {
      gsap.fromTo(el,
        { scaleX: 0 },
        { scaleX: 1, transformOrigin: "left center", duration: 1.0, ease: "power2.inOut",
          scrollTrigger: { trigger: el, start: "top 93%", once: true } }
      );
    });

    /* ── Section headings reveal ── */
    gsap.utils.toArray<HTMLElement>(".reveal-up").forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 36, filter: "blur(2px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 87%", once: true } }
      );
    });

    /* ── Bento cards stagger ── */
    ScrollTrigger.batch(".bento-card", {
      onEnter: els => gsap.fromTo(els,
        { opacity: 0, y: 44, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85, stagger: 0.12, ease: "power3.out", clearProps: "filter" }
      ),
      start: "top 86%", once: true,
    });

    /* ── Category tabs ── */
    gsap.from(".cat-tab", {
      opacity: 0, y: 10, duration: 0.4, stagger: 0.05, ease: "power2.out",
      scrollTrigger: { trigger: ".cat-tabs", start: "top 88%", once: true },
    });

    /* ── Tool list rows slide in ── */
    ScrollTrigger.batch(".tool-item", {
      onEnter: els => gsap.fromTo(els,
        { opacity: 0, x: -24 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.022, ease: "power2.out", clearProps: "opacity,transform" }
      ),
      start: "top 91%", once: true,
    });

    /* ── Feature cards ── */
    ScrollTrigger.batch(".feat-card", {
      onEnter: els => gsap.fromTo(els,
        { opacity: 0, y: 36, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.75, stagger: 0.08, ease: "power3.out", clearProps: "opacity,transform" }
      ),
      start: "top 86%", once: true,
    });

    /* ── Stat cards spring in ── */
    ScrollTrigger.batch(".stat-card", {
      onEnter: els => gsap.fromTo(els,
        { opacity: 0, y: 32, scale: 0.86 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.09, ease: "back.out(1.7)", clearProps: "opacity,transform" }
      ),
      start: "top 86%", once: true,
    });

    /* ── Count-up numbers ── */
    gsap.utils.toArray<HTMLElement>(".count-up").forEach(el => {
      const target   = parseFloat(el.dataset.target   ?? "0");
      const suffix   = el.dataset.suffix   ?? "";
      const decimals = parseInt(el.dataset.decimals   ?? "0", 10);
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target, duration: 2.2, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
        onUpdate() {
          el.textContent = (decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val)) + suffix;
        },
      });
    });

    /* ── Progress bars ── */
    gsap.utils.toArray<HTMLElement>(".progress-bar").forEach(el => {
      const finalW = el.style.width;
      gsap.fromTo(el, { width: 0 }, {
        width: finalW, duration: 1.6, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    /* ── Footer columns ── */
    ScrollTrigger.batch(".footer-col", {
      onEnter: els => gsap.fromTo(els,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: "power2.out", clearProps: "opacity,transform" }
      ),
      start: "top 92%", once: true,
    });

    /* ── CTA section ── */
    gsap.from(".cta-content > *", {
      opacity: 0, y: 28, duration: 0.7, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".cta-section", start: "top 80%", once: true },
    });

    return () => {
      heroEl?.removeEventListener("mousemove", onMove);
      heroEl?.removeEventListener("mouseleave", onLeave);
    };
  }, { scope: containerRef });

  return (
    <div ref={containerRef} id="main-content" style={{ background: "transparent", color: "var(--ink)", minHeight: "100vh", position: "relative", zIndex: 1 }}>

      {/* ─── Sticky header ─── */}
      <header className="gl-pane" style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: S.border,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 40px", height: 60,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 500, fontSize: 21, color: "var(--ink)", letterSpacing: "-0.02em" }}>Ledger</span>
          <nav style={{ display: "flex", gap: 28 }} className="mob-hide">
            {[["#tools", "Tools"], ["#score", "Score"], ["#features", "Features"]].map(([href, label]) => (
              <a key={href} href={href} style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em", transition: "color 180ms" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-3)")}
              >{label}</a>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/auth" className="mob-hide" style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", transition: "color 180ms" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-3)")}
          >Sign in</Link>
          <Link href="/dashboard" className="btn" style={{ padding: "8px 18px", fontSize: 11, letterSpacing: "0.12em", textDecoration: "none", textTransform: "uppercase" }}>Open Ledger</Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="hero-section" style={{ position: "relative", width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="hero-content" style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px", width: "100%", maxWidth: 880, margin: "0 auto" }}>

          {/* Badge */}
          <div className="hero-badge" style={{
            display: "inline-flex", alignItems: "center", gap: 16,
            border: "1px solid rgba(255,255,255,0.14)", padding: "6px 22px", marginBottom: 52,
            backdropFilter: "blur(16px)", background: "rgba(0,0,0,0.38)",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ position: "relative", width: 8, height: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e", opacity: 0.55, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
                <span style={{ position: "relative", width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "block" }} />
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#22c55e" }}>Live</span>
            </span>
            <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>Academic OS</span>
            <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", color: "rgba(255,255,255,0.28)" }}>Est. 2025</span>
          </div>

          {/* Headline */}
          <h1 className="hero-h1" style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 0.92, margin: "0 auto 28px" }}>
            <div className="hero-word" style={{ display: "block", fontSize: "clamp(56px,10vw,122px)", color: "#fff", textShadow: "0 2px 80px rgba(0,0,0,0.35)" }}>
              The Student&apos;s
            </div>
            <div className="hero-word" style={{
              display: "block", fontSize: "clamp(56px,10vw,122px)",
              background: "linear-gradient(125deg, #ffffff 10%, #ffb090 50%, #ff5535 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 0 80px rgba(255,90,55,0.6))",
            }}>
              Operating System.
            </div>
          </h1>

          {/* Divider */}
          <div className="hero-divider" style={{ height: 1, background: "rgba(255,255,255,0.12)", maxWidth: 480, margin: "0 auto 26px", transformOrigin: "left" }} />

          {/* Sub */}
          <p className="hero-sub" style={{ fontFamily: "var(--sans)", fontSize: "clamp(13px,1.6vw,16px)", color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto 32px", lineHeight: 1.65, letterSpacing: "0.01em" }}>
            51 AI-powered tools. One streak. One score. One syllabus.
          </p>

          {/* Stats strip */}
          <div className="hero-stats" style={{ display: "flex", justifyContent: "center", maxWidth: 440, margin: "0 auto 40px", border: "1px solid rgba(255,255,255,0.09)" }}>
            {[{ n: "14,382+", l: "students" }, { n: "+14.2%", l: "avg score lift" }, { n: "51", l: "AI tools" }].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.09)" : "none" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(18px,2.8vw,28px)", fontStyle: "italic", fontWeight: 500, color: "#fff", lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="hero-ctas" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <GetStartedButton />
            </Link>
            <a href="#tools" style={{ textDecoration: "none", fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", padding: "12px 22px", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.22)", transition: "color 200ms, border-color 200ms" }}>
              Explore tools
            </a>
            <Link href="/auth" style={{ textDecoration: "none", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", padding: "12px 4px", transition: "color 200ms" }}>
              Sign in
            </Link>
          </div>

          {/* Scroll hint */}
          <div className="hero-scroll" style={{ position: "absolute", bottom: -96, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.35 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#fff", letterSpacing: "0.16em", textTransform: "uppercase" }}>Scroll</span>
            <div style={{ width: 1, height: 36, background: "linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)" }} />
          </div>
        </div>

        {/* Category preview panel — anchored to hero bottom */}
        <div className="hero-panel" style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "min(1000px, 92vw)", zIndex: 3,
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
          gap: 1, background: "rgba(255,255,255,0.06)",
        }}>
          {([
            { cat: "PLAN",     n: 7,  tools: ["Study Planner", "Focus Dashboard", "Habit Tracker"]   },
            { cat: "LEARN",    n: 7,  tools: ["Study Engine",  "Doubt Solver",    "Mind Map Builder"] },
            { cat: "WRITE",    n: 8,  tools: ["Essay Workshop","Research Hub",    "Writing Polish"]   },
            { cat: "PRACTISE", n: 12, tools: ["Practice Suite","Past Papers",     "Revision Planner"] },
            { cat: "FUTURE",   n: 5,  tools: ["Future Finder", "Admissions",      "GPA Simulator"]    },
            { cat: "TRACK",    n: 12, tools: ["Ledger Score",  "Text Analyst",    "Academic Coach"]   },
          ] as const).map(({ cat, n, tools }) => (
            <a key={cat} href="#tools" style={{ textDecoration: "none" }}>
              <div style={{
                background: "rgba(8,6,4,0.78)", backdropFilter: "blur(24px)",
                padding: "14px 13px 16px",
                borderTop: `2px solid ${CAT_COLOR[cat as keyof typeof CAT_COLOR]}`,
                transition: "background 180ms",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(20,16,12,0.92)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(8,6,4,0.78)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: CAT_COLOR[cat as keyof typeof CAT_COLOR] }}>{cat}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{n}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {tools.map(t => (
                    <li key={t} style={{ fontFamily: "var(--sans)", fontSize: 10, color: "rgba(255,255,255,0.38)", lineHeight: 1.95, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</li>
                  ))}
                </ul>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ─── Ticker ─── */}
      <div className="gl-pane-alt" style={{ borderTop: S.border, borderBottom: S.border, padding: "10px 0", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div className="ticker">
          <div className="ticker-track" style={{ color: "var(--ink-3)", fontSize: 10, fontFamily: "var(--mono)", letterSpacing: "0.08em" }}>
            {[0, 1].flatMap((k) => TICKER.map((item, i) => (
              <span key={`${k}-${i}`} style={{ padding: "0 28px" }}>
                <span style={{ color: "var(--cinnabar-ink)", marginRight: 12 }}>—</span>{item}
              </span>
            )))}
          </div>
        </div>
      </div>

      {/* ─── 01 / The Brief ─── */}
      <section className="gl-pane" style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 40px 72px" }}>
          <SectionLabel num="01" label="The Brief" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 64, alignItems: "start" }} className="mob-col">
            <div>
              <h2 className="reveal-up" style={{ ...S.h2, fontSize: "clamp(28px,4vw,48px)", marginBottom: 28 }}>
                Students don&apos;t have an operating system.
              </h2>
              <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.75, marginBottom: 20 }}>
                They have seven apps that don&apos;t talk to each other, a notes folder they dread opening, a study plan that expired in October, and an exam five weeks away that still feels theoretical.
              </p>
              <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.75 }}>
                Ledger is the system that was missing. Not a productivity app. Not AI features slapped onto a dashboard. An actual operating system — with a live readiness score, a unified streak, and 51 instruments calibrated to your board, your grade, and your exam date.
              </p>
            </div>

            <div>
              {/* Pull quote */}
              <div style={{ borderTop: "2px solid var(--ink)", paddingTop: 24, marginBottom: 32 }}>
                <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "clamp(18px,2.2vw,24px)", color: "var(--ink)", lineHeight: 1.5, letterSpacing: "-0.01em", margin: 0 }}>
                  &ldquo;The only student tool built around your syllabus, your board, and your exam — not a generic student somewhere in the world.&rdquo;
                </p>
              </div>

              {/* Three meta facts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--rule)", border: S.border }}>
                {[
                  { n: "51", l: "AI Tools" },
                  { n: "6+", l: "Exam Boards" },
                  { n: "8w", l: "To see results" },
                ].map((m, i) => (
                  <div key={i} style={{ background: "var(--paper)", padding: "20px 16px" }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 400, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>{m.n}</div>
                    <div style={{ ...S.cap, marginTop: 8 }}>{m.l}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="anim-divider" style={S.rule} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, ...S.cap, fontSize: 9 }}>
                  <span>Est. 2025</span>
                  <span>51 instruments</span>
                  <span>One operating system</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 02 / The System ─── */}
      <section className="gl-pane-alt" style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 40px 72px" }}>
          <SectionLabel num="02" label="The Quantified Mind" />

          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 56, alignItems: "start" }} className="mob-col">
            <div>
              <h2 className="reveal-up" style={S.h2}>
                Every session moves the number.
              </h2>
              <div className="anim-divider" style={{ ...S.rule, margin: "20px 0" }} />
              <p style={{ ...S.body, fontStyle: "italic" }}>
                Your Ledger Score accounts for past paper accuracy, syllabus coverage, mistake velocity, and daily consistency — updated in real time.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--rule)", border: S.border }} className="mob-col">
              {/* Score */}
              <div className="bento-card" style={{ background: "var(--paper)", padding: "28px 24px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={S.capAccent}>Ledger Score</span>
                <div>
                  <div className="count-up" data-target="842" style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 12 }}>0</div>
                  <div style={{ marginTop: 14, height: 3, background: "var(--rule)" }}>
                    <div className="progress-bar" style={{ height: "100%", width: "84%", background: "var(--cinnabar-ink)" }} />
                  </div>
                  <div style={{ ...S.cap, marginTop: 8, fontSize: 9 }}>Exam Ready tier · +12% this week</div>
                </div>
              </div>

              {/* Toolkit */}
              <div className="bento-card" style={{ background: "var(--paper)", padding: "28px 24px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={S.cap}>Toolkit</span>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 12 }}>51</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.8 }}>
                    <li>· Study Engine</li>
                    <li>· Practice Suite</li>
                    <li>· Essay Workshop</li>
                  </ul>
                </div>
              </div>

              {/* Streak */}
              <div className="bento-card" style={{ background: "var(--paper)", padding: "28px 24px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={S.cap}>Focus Streak</span>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 12 }}>
                    <span className="count-up" data-target="142">0</span>
                    <span style={{ fontSize: 28, color: "var(--ink-3)" }}>d</span>
                  </div>
                  <div style={{ marginTop: 14, height: 3, background: "var(--rule)" }}>
                    <div className="progress-bar" style={{ height: "100%", width: "95%", background: "var(--ink)" }} />
                  </div>
                  <div style={{ ...S.cap, marginTop: 8, fontSize: 9 }}>Consecutive study days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 03 / All 55 Tools ─── */}
      <section id="tools" className="gl-pane" style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 40px 72px" }}>
          <SectionLabel num="03" label="All 51 Tools" />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
            <h2 className="reveal-up" style={S.h2}>Every tool a student needs.</h2>
          </div>

          {/* Category filter tabs */}
          <div className="cat-tabs" style={{ display: "flex", gap: 0, flexWrap: "wrap", borderBottom: S.border, marginBottom: 0 }}>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat;
              const color  = cat === "ALL" ? "var(--cinnabar-ink)" : CAT_COLOR[cat] ?? "var(--ink)";
              return (
                <button
                  key={cat}
                  className="cat-tab"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    padding: "10px 16px", border: "none", cursor: "pointer",
                    background: active ? "var(--ink)" : "transparent",
                    color: active ? "var(--paper)" : "var(--ink-3)",
                    borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
                    transition: "background 150ms, color 150ms",
                  }}
                >{cat}</button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 1, background: "var(--rule)", border: S.border, borderTop: "none" }} className="mob-col">
            {/* Tool list */}
            <div style={{ maxHeight: 580, overflowY: "auto", background: "var(--paper)" }}>
              {filteredTools.map((t, i) => {
                const active = selectedTool === i;
                const catColor = CAT_COLOR[t.cat] ?? "var(--cinnabar-ink)";
                return (
                  <button
                    className="tool-item"
                    key={t.n + t.slug}
                    onClick={() => setSelectedTool(i)}
                    onMouseEnter={() => setSelectedTool(i)}
                    style={{
                      width: "100%", padding: "13px 20px",
                      background: active ? "var(--ink)" : "transparent",
                      color: active ? "var(--paper)" : "var(--ink)",
                      border: "none",
                      borderBottom: i < filteredTools.length - 1 ? `1px solid var(--rule)` : "none",
                      borderLeft: active ? `3px solid ${catColor}` : "3px solid transparent",
                      cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                      transition: "background 120ms, border-left-color 120ms",
                    }}
                  >
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.4, flexShrink: 0, width: 18, letterSpacing: "0.04em" }}>{t.n}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.ttl}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 10, opacity: 0.55, marginTop: 2 }}>{t.sub}</div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: active ? 0.5 : 0, transition: "opacity 120ms", flexShrink: 0, color: catColor }}>→</span>
                  </button>
                );
              })}
            </div>

            {/* Tool detail */}
            <div style={{ padding: "36px 36px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 380, background: "var(--paper)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", color: CAT_COLOR[tool.cat] ?? "var(--cinnabar-ink)", textTransform: "uppercase", fontWeight: 600 }}>{tool.cat}</span>
                  <span style={{ width: 1, height: 10, background: "var(--rule)", display: "inline-block" }} />
                  <span style={{ ...S.cap, fontSize: 9 }}>/tools/{tool.slug}</span>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(22px,2.8vw,32px)", fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.15, color: "var(--ink)", marginBottom: 8 }}>{tool.ttl}</div>
                <div style={{ ...S.capAccent, marginBottom: 16 }}>{tool.sub}</div>
                <p style={{ ...S.body, fontSize: 13, lineHeight: 1.72 }}>{tool.desc}</p>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 9 }}>
                  {tool.gets.map((g, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ color: CAT_COLOR[tool.cat] ?? "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 10, marginTop: 1, flexShrink: 0 }}>+</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: S.border, display: "flex", gap: 10 }}>
                <Link href={`/tools/${tool.slug}`} className="btn" style={{ textDecoration: "none", fontSize: 10, letterSpacing: "0.12em" }}>Open tool →</Link>
                <Link href="/dashboard" className="btn ghost" style={{ textDecoration: "none", fontSize: 10, letterSpacing: "0.12em" }}>All 51 tools</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 04 / Ledger Score ─── */}
      <section id="score" className="gl-pane-alt" style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 40px 72px" }}>
          <SectionLabel num="04" label="Ledger Score" />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
            <h2 className="reveal-up" style={S.h2}>What would your readiness score be right now?</h2>
            <div style={{ ...S.cap, fontSize: 9 }}>Tool — · Live preview</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 1, background: "var(--rule)", border: S.border }} className="mob-col">
            {/* Sliders */}
            <div style={{ padding: "32px 32px", background: "var(--paper)" }}>
              <div style={S.capAccent}>Adjust your activity</div>

              {[
                { label: "Past paper sessions done", val: papers, min: 0, max: 20, set: setPapers, unit: String(papers) },
                { label: "Mistakes per week",        val: mistakesPerWeek, min: 0, max: 30, set: setMistakesPerWeek, unit: String(mistakesPerWeek) },
                { label: "Focus streak (days)",      val: streak, min: 0, max: 30, set: setStreak, unit: `${streak}d` },
              ].map(({ label, val, min, max, set, unit }) => (
                <div key={label} style={{ marginTop: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{label}</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 500, color: "var(--cinnabar-ink)" }}>{unit}</span>
                  </div>
                  <input type="range" min={min} max={max} value={val} onChange={e => set(+e.target.value)} style={{ width: "100%" }} />
                </div>
              ))}

              <button
                onClick={() => setHasSyllabus(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginTop: 20,
                  border: `1px solid ${hasSyllabus ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                  background: hasSyllabus ? "color-mix(in srgb, var(--cinnabar-ink) 10%, var(--paper))" : "transparent",
                  color: "var(--ink)", cursor: "pointer", width: "100%",
                  fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
                  transition: "all 180ms",
                }}
              >
                <div style={{
                  width: 16, height: 16, border: `1.5px solid ${hasSyllabus ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                  background: hasSyllabus ? "var(--cinnabar-ink)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 180ms",
                }}>
                  {hasSyllabus && <span style={{ fontSize: 9, color: "var(--paper)", lineHeight: 1 }}>✓</span>}
                </div>
                Syllabus uploaded to Ledger
                {!hasSyllabus && <span style={{ marginLeft: "auto", ...S.capAccent, fontSize: 9 }}>+250 pts</span>}
              </button>
            </div>

            {/* Score display */}
            <div style={{ padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--paper)" }}>
              <div style={S.cap}>Estimated Ledger Score</div>
              <div ref={scoreNumRef} style={{ fontFamily: "var(--serif)", fontSize: "clamp(72px,10vw,100px)", fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.04em", lineHeight: 1, marginTop: 8, color: "var(--ink)", transition: "color 300ms" }}>
                {scorePreview}
              </div>
              <div style={{ ...S.cap, marginTop: 6, color: "var(--cinnabar-ink)" }}>/ 1000 · {scoreTierLabel(scorePreview)}</div>

              {/* Tier bar */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {TIERS.map(tier => {
                    const filled = scorePreview >= tier.min;
                    const isCurrent = scorePreview >= tier.min && scorePreview <= tier.max;
                    return (
                      <div key={tier.label} style={{ flex: 1, height: 5, background: filled ? (isCurrent ? "var(--cinnabar-ink)" : "var(--ink-3)") : "var(--rule)", transition: "background 400ms ease", borderRadius: 1 }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {TIERS.map(t => (
                    <span key={t.label} style={{ fontFamily: "var(--mono)", fontSize: 8, color: scorePreview >= t.min && scorePreview <= t.max ? "var(--cinnabar-ink)" : "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 300ms" }}>{t.label}</span>
                  ))}
                </div>
              </div>

              {/* Improvement tips */}
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {!hasSyllabus && (
                  <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: S.border, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontWeight: 700 }}>+250 pts</span> — Upload your syllabus
                  </div>
                )}
                {papers < 5 && (
                  <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: S.border, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontWeight: 700 }}>+{Math.round((5 - papers) * 18)} pts</span> — Do {5 - papers} more past paper sessions
                  </div>
                )}
                {streak < 7 && (
                  <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: S.border, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontWeight: 700 }}>+{Math.round((7 - streak) * 7.5)} pts</span> — Build a 7-day streak
                  </div>
                )}
              </div>

              <Link href="/auth" className="btn" style={{ textDecoration: "none", marginTop: 24, display: "inline-flex", alignSelf: "flex-start", fontSize: 10, letterSpacing: "0.12em" }}>
                See your real score →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 05 / Seven Signatures ─── */}
      <section id="features" className="gl-pane" style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 40px 72px" }}>
          <SectionLabel num="05" label="Seven Signatures" />

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 56, alignItems: "start" }} className="mob-col">
            <div>
              <h2 className="reveal-up" style={S.h2}>Features nobody else ships.</h2>
              <div className="anim-divider" style={{ ...S.rule, margin: "20px 0" }} />
              <p style={{ ...S.body, fontSize: 13 }}>
                The 51 tools are the price of entry. These seven are the reason you stay. None are available in another student app — we looked, and then we built them.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--rule)", border: S.border }} className="mob-col">
              {FEATS.map((f, i) => (
                <div
                  className="feat-card"
                  key={f.tag}
                  style={{
                    background: expandedFeat === i
                      ? "color-mix(in srgb, var(--cinnabar-ink) 7%, var(--paper-2))"
                      : "var(--paper)",
                    cursor: "pointer",
                    transition: "background 220ms ease",
                    padding: "24px 22px",
                  }}
                  onClick={() => setExpandedFeat(expandedFeat === i ? null : i)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 30, color: "var(--cinnabar-ink)", fontWeight: 400, lineHeight: 1, flexShrink: 0 }}>{f.tag}</span>
                      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, fontWeight: 500, lineHeight: 1.3, color: "var(--ink)" }}>{f.ttl}</div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: expandedFeat === i ? "var(--cinnabar-ink)" : "var(--ink-3)", flexShrink: 0, marginTop: 4, transition: "color 200ms" }}>
                      {expandedFeat === i ? "▲" : "▼"}
                    </span>
                  </div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.68, color: "var(--ink-2)", marginTop: 12 }}>{f.body}</p>
                  {expandedFeat === i && (
                    <p style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.72, color: "var(--ink-3)", marginTop: 12, paddingTop: 12, borderTop: S.border }}>
                      {f.extra}
                    </p>
                  )}
                </div>
              ))}

              {/* Coming soon card */}
              <div style={{ background: "color-mix(in srgb, var(--ink) 4%, var(--paper-2))", padding: "24px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ ...S.cap, marginBottom: 14 }}>Coming Q3 2026</div>
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, fontWeight: 500, lineHeight: 1.3, color: "var(--ink)", marginBottom: 10 }}>Exam-Day Mode</div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.68, color: "var(--ink-3)" }}>
                    The morning of the paper, Ledger locks to a single-screen revision of only what you got wrong in the last 14 days. No distractions. No decisions. Just the gaps.
                  </p>
                </div>
                <div style={{ ...S.cap, marginTop: 16, fontSize: 9 }}>Waitlist: 3,204</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 06 / Field Reports ─── */}
      <section className="gl-pane-alt" style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 40px 72px" }}>
          <SectionLabel num="06" label="Field Reports" />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
            <h2 className="reveal-up" style={S.h2}>Dispatches from actual students.</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ ...S.cap, fontSize: 9 }}>n=11,482 · Self-reported · Apr &apos;26</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setTestimIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  style={{ padding: "7px 14px", background: "none", border: S.border, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", transition: "border-color 150ms, color 150ms" }}>←</button>
                <button onClick={() => setTestimIdx(i => (i + 1) % TESTIMONIALS.length)}
                  style={{ padding: "7px 14px", background: "none", border: S.border, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", transition: "border-color 150ms, color 150ms" }}>→</button>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div ref={testimRef} style={{ border: S.border, borderTop: S.borderInk }}>
            <div style={{ padding: "32px 36px 28px" }}>
              <div style={{ ...S.capAccent, fontSize: 9, marginBottom: 18 }}>Dispatch No.{String(testimIdx + 1).padStart(2, "0")}</div>
              <blockquote style={{
                fontFamily: "var(--serif)", fontSize: "clamp(20px,2.8vw,28px)", fontStyle: "italic",
                lineHeight: 1.42, margin: "0 0 24px", letterSpacing: "-0.01em",
                maxWidth: 800, color: "var(--ink)", fontWeight: 400,
              }}>
                &ldquo;{TESTIMONIALS[testimIdx].q}&rdquo;
              </blockquote>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", borderTop: S.border, paddingTop: 18, gap: 20 }} className="mob-col lp-dispatch-meta">
                <div>
                  <div style={S.cap}>Filed by</div>
                  <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, marginTop: 5, color: "var(--ink)" }}>{TESTIMONIALS[testimIdx].by}</div>
                </div>
                <div>
                  <div style={S.cap}>Desk</div>
                  <div style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13, marginTop: 5, color: "var(--ink-2)" }}>{TESTIMONIALS[testimIdx].ctx}</div>
                </div>
                <div>
                  <div style={S.cap}>Result</div>
                  <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, marginTop: 5, color: "var(--cinnabar-ink)" }}>{TESTIMONIALS[testimIdx].score}</div>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
                  {TESTIMONIALS.map((_, i) => (
                    <button key={i} onClick={() => setTestimIdx(i)} aria-label={`Testimonial ${i + 1}`}
                      style={{ width: i === testimIdx ? 24 : 7, height: 7, background: i === testimIdx ? "var(--ink)" : "var(--rule)", border: "none", cursor: "pointer", transition: "all 220ms cubic-bezier(0.4,0,0.2,1)", padding: 0, flexShrink: 0 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--rule)", border: S.border, borderTop: "none" }} className="mob-2col">
            {STATS.map(({ big, suffix, sm }, i) => (
              <div className="stat-card" key={i} style={{ background: "var(--paper)", padding: "24px 22px" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.025em", color: "var(--ink)", display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span className="count-up" data-target={big} data-decimals={big.includes(".") ? "1" : "0"}>{big}</span>
                  <span style={{ fontSize: 22 }}>{suffix}</span>
                </div>
                <div style={{ ...S.cap, fontSize: 10, marginTop: 10 }}>{sm}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 07 / Final CTA ─── */}
      <section className="cta-section gl-pane" style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 40px" }}>
          <div className="cta-content" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <div style={{ ...S.capAccent, marginBottom: 28 }}>Start today — free, no credit card</div>
            <h2 style={{
              fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400,
              fontSize: "clamp(32px,5.5vw,64px)", color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1.05,
              marginBottom: 24,
            }}>
              Your exam is closer than it feels.
            </h2>
            <p style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
              Build the system that closes the gap. Fifty-one tools. One score. One streak. Everything calibrated to your board and your exam date.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/dashboard" className="btn" style={{ textDecoration: "none", fontSize: 12, letterSpacing: "0.1em", padding: "14px 32px" }}>
                Open the Ledger →
              </Link>
              <Link href="/auth" className="btn ghost" style={{ textDecoration: "none", fontSize: 12, letterSpacing: "0.1em", padding: "14px 32px" }}>
                Sign in
              </Link>
            </div>
            <div style={{ marginTop: 36, ...S.cap, fontSize: 9 }}>
              JEE · NEET · CBSE · ICSE · IB · IGCSE · A-Level · SAT
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="gl-pane-alt" style={{ borderTop: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 40px 60px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32 }} className="mob-2col">
          <div className="footer-col">
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 500, fontSize: 36, letterSpacing: "-0.025em", lineHeight: 0.9, color: "var(--ink)", marginBottom: 8 }}>Ledger</div>
            <div style={{ ...S.cap, fontSize: 9 }}>The Student&apos;s Operating System</div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginTop: 16, maxWidth: 260, lineHeight: 1.65 }}>
              Independent, student-funded. We will never sell your study data.
            </p>
          </div>
          {[
            { h: "Tools", l: ["Study Engine", "Essay Workshop", "Research Hub", "Writing Polish", "Question Decoder", "Practice Suite", "Revision Planner", "Future Finder", "Text Analyst", "Doubt Solver", "AI Flashcards", "Vocabulary Vault", "Analogy Engine", "Memory Palace", "Past Papers", "Focus Dashboard", "Ledger Score"] },
            { h: "Institutions", l: ["For Schools", "For Tuition Centres", "Syllabus Parser", "Data Export", "API"] },
            { h: "The Ledger", l: ["Changelog", "Roadmap", "Colophon", "Masthead", "Press", "Contact"] },
          ].map((g) => (
            <div className="footer-col" key={g.h}>
              <div style={{ ...S.capAccent, marginBottom: 16 }}>{g.h}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--sans)", fontSize: 12, lineHeight: 2.1, color: "var(--ink-3)" }}>
                {g.l.map(x => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: S.border, padding: "14px 40px", maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, ...S.cap, fontSize: 9 }}>
            <span>MMXXVI Ledger Study Co.</span>
            <span>Set in Newsreader, Inter Tight &amp; JetBrains Mono</span>
            <span>{today}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
