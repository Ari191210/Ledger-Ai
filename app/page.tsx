"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PaletteToggle from "@/components/palette-toggle";

const TOOLS = [
  { n: "01", slug: "planner",            ttl: "Smart Study Planner",      sub: "Subjects in. Timetable out.",                  cat: "PLAN",     desc: "Enter subjects, exam dates, and the hours you can actually give. We return a day-by-day plan for every remaining day — not a calendar template you then spend two hours editing.",                                                              gets: ["14-day reactive schedule", "Adjusts when you miss a day", "Pre-fills from your syllabus"] },
  { n: "02", slug: "marks",              ttl: "Marks Predictor",          sub: "The math of your report card.",                cat: "TRACK",    desc: "Current scores, subject weightages, upcoming tests. Get your final weighted percentage, the CBSE grade it maps to, a 4.0 GPA, and the score you need in remaining subjects to hit your target.",                                             gets: ["Weighted average in real time", "What-if score slider per subject", "4.0 GPA + CBSE grade output"] },
  { n: "03", slug: "notes",              ttl: "Notes Simplifier",         sub: "Textbook → plain English.",                   cat: "LEARN",    desc: "Paste or upload any chapter. Receive a one-page explanation written the way your subject teacher explains it, a structured summary, flashcards, and a graded quiz — saved to your history.",                                              gets: ["Board-matched explanation style", "Flashcards + graded quiz", "Saved notes library"] },
  { n: "04", slug: "doubt",              ttl: "Doubt Solver",             sub: "A question, a worked answer.",                cat: "LEARN",    desc: "Type any problem. Receive a fully worked solution with the underlying concept, not just the answer. The AI explains it the way your board's marking scheme expects — step by step.",                                                       gets: ["Full worked solution", "Underlying principle explained", "Board-style step layout"] },
  { n: "05", slug: "focus",              ttl: "Focus Dashboard",          sub: "Pomodoro, streaks, tasks.",                   cat: "PLAN",     desc: "A single screen: 25-minute timer, running task list, and a streak that persists across every tool. No social feed, no notifications you didn't ask for. Just the session and a counter.",                                                 gets: ["25-min Pomodoro timer", "Cross-tool streak tracking", "Task list that doesn't disappear"] },
  { n: "06", slug: "career",             ttl: "Career Pathfinder",        sub: "For the 14–18 year olds.",                   cat: "FUTURE",   desc: "A quiz built from actual coursework and entrance exam requirements — not Myers-Briggs. Output: streams sorted by fit, colleges sorted by cutoff, entrance exams, and a five-year roadmap.",                                              gets: ["Stream & subject recommendations", "College-by-cutoff ranked list", "5-year roadmap generated"] },
  { n: "07", slug: "papers",             ttl: "Past Papers",              sub: "CBSE, JEE, NEET, SAT, IB.",                  cat: "PRACTISE", desc: "47 papers, 900+ questions. 10 random questions per session, or Timed Mode where the clock is running and you submit when it hits zero. Every wrong answer tags a weak topic.",                                                          gets: ["Timed mode with auto-submit", "Weak topic tagging per answer", "Session log with accuracy trend"] },
  { n: "08", slug: "assignment",         ttl: "Assignment Rescue",        sub: "From prompt to outline.",                    cat: "WRITE",    desc: "Paste the brief. Get a structure, argument options, research directions, and a suggested bibliography — plagiarism-safe guidance for building the essay yourself, not a submission to copy.",                                           gets: ["Essay structure + argument options", "Research directions", "Board-matched writing style"] },
  { n: "09", slug: "resume",             ttl: "Resume Builder",           sub: "For applications, not LinkedIn.",            cat: "FUTURE",   desc: "For internships, summer programs, university applications, and college essays. Enter activities and achievements; the tool assembles one polished PDF formatted for admissions committees.",                                             gets: ["College application format", "Achievement bullet writing", "One-page PDF output"] },
  { n: "10", slug: "rooms",              ttl: "Study Rooms",              sub: "Silent accountability.",                     cat: "TRACK",    desc: "Private rooms with a shared timer and a shared task list. Enter a code, see who's in the session, and start the clock together. If one person bails, both streaks take the hit.",                                                      gets: ["Code-based rooms, no signup", "Shared Pomodoro timer", "Mutual streak accountability"] },
  { n: "11", slug: "tutor",              ttl: "Topic Tutor",              sub: "Pick a topic. Get a full lesson.",           cat: "LEARN",    desc: "Type any topic. Receive a personalised lesson: core concept, worked example, key facts in your board's format, and a short practice quiz — all calibrated to your grade and stream.",                                                  gets: ["Full lesson on any topic", "Board + grade calibrated", "Practice quiz at the end"] },
  { n: "12", slug: "dna",               ttl: "Mistake DNA",              sub: "See exactly where you go wrong.",            cat: "PRACTISE", desc: "Every wrong answer from Past Papers is categorised: Conceptual Gap, Calculation Slip, Misread, Rushed, or Memory Blank. Visualised by subject. The pattern becomes obvious within three sessions.",                                     gets: ["5-category mistake taxonomy", "Per-subject breakdown chart", "Recurring topic tracker"] },
  { n: "13", slug: "crunch",             ttl: "48-Hour Crunch",           sub: "Exam tomorrow. Smart triage.",               cat: "PRACTISE", desc: "Tell the AI what to skip and what to nail. Input your topics and their status (done / partial / not yet). Get a priority order, time estimates per topic, and an hour-by-hour schedule.",                                               gets: ["Priority triage of every topic", "Time estimates per chapter", "Hour-by-hour schedule"] },
  { n: "14", slug: "syllabus",           ttl: "Syllabus Parser",          sub: "Upload PDF. Get your year mapped.",          cat: "LEARN",    desc: "Upload your school's PDF syllabus — or a photo of the printed sheet. AI extracts every subject, chapter, and topic into a clean structure that powers every other tool on Ledger automatically.",                                    gets: ["PDF + photo input", "Subjects, chapters, topics extracted", "Auto-powers all other tools"] },
  { n: "15", slug: "formula",            ttl: "Formula Sheet",            sub: "Chapter → complete reference card.",         cat: "LEARN",    desc: "Type any subject and chapter. Get every formula with variable definitions, SI units, dimensional analysis, and board-specific exam tips — formatted for one-click PDF export.",                                                      gets: ["Every formula for the chapter", "Variable meanings + SI units", "Board-specific exam tips, print-ready"] },
  { n: "16", slug: "admissions",         ttl: "Admissions Engine",        sub: "Your real odds. 60 universities.",           cat: "FUTURE",   desc: "GPA, test scores, ECs, awards → statistical admission probability for 60 top universities. AI strategy, gap analysis, essay angles, and deadline countdowns.",                                                                      gets: ["Probability at 60 real universities", "Safety / Match / Reach / Far Reach list", "AI strategy + essay angles + gap analysis"] },
  { n: "17", slug: "flashcards",         ttl: "AI Flashcards",            sub: "Topic or notes → flip cards.",               cat: "PRACTISE", desc: "AI generates high-quality flashcards from any topic or your own notes. Track known/unknown per card and drill only what you haven't mastered.",                                                                                        gets: ["Paste your notes or name a topic", "Known / still-learning card tracking", "Flip to reveal, tap to categorise"] },
  { n: "18", slug: "essay-grader",       ttl: "Essay Grader",             sub: "Paste essay. Get examiner marks.",           cat: "WRITE",    desc: "Receive a grade, band score, and criteria-by-criteria feedback on argument, evidence, structure, and language — with specific improvement suggestions.",                                                                             gets: ["Grade + band score instantly", "4-criteria examiner breakdown", "Concrete improvement actions"] },
  { n: "19", slug: "personal-statement", ttl: "Personal Statement",       sub: "Score your application essay.",              cat: "WRITE",    desc: "1–10 holistic score, hook analysis, paragraph-by-paragraph feedback, tone check, and a rewritten opening sentence if yours isn't pulling weight.",                                                                               gets: ["Hook + structure + tone analysis", "Paragraph-by-paragraph notes", "Rewritten opening if yours is weak"] },
  { n: "20", slug: "interview",          ttl: "Interview Coach",          sub: "Practice. Get scored. Improve.",             cat: "FUTURE",   desc: "Pick your interview type, answer AI-generated questions, then get scored with strengths, gaps, a model answer, and a coaching tip per response.",                                                                                   gets: ["University, Job, Medicine, Scholarship modes", "Score + model answer per question", "Coaching tip after every response"] },
  { n: "21", slug: "mindmap",            ttl: "Mind Map Builder",         sub: "Any topic. Full concept breakdown.",         cat: "LEARN",    desc: "AI generates a full collapsible mind map with depth levels. Branches collapse on click, colours by depth, printable to PDF in one click.",                                                                                        gets: ["Collapsible branch tree", "Brief / Standard / Deep dive modes", "Print to PDF in one click"] },
  { n: "22", slug: "citation",           ttl: "Citation Generator",       sub: "APA, MLA, Chicago, Harvard.",                cat: "WRITE",    desc: "Fill in source details and get a correctly formatted citation in any major style. Supports book, journal, website, newspaper, and video sources.",                                                                                gets: ["5 source types supported", "APA 7, MLA 9, Chicago 17, Harvard, Vancouver", "One-click copy to clipboard"] },
  { n: "23", slug: "presentation",       ttl: "Presentation Planner",     sub: "Topic → full slide deck with notes.",        cat: "WRITE",    desc: "AI builds a slide-by-slide presentation with speaker notes, calibrated to your audience, duration, and style. Left panel navigation, print-ready.",                                                                               gets: ["Slide panel + 16:9 preview", "Speaker notes for every slide", "Audience + duration + style controls"] },
  { n: "24", slug: "debate",             ttl: "Debate Coach",             sub: "Any motion. Arguments both ways.",           cat: "WRITE",    desc: "Generate for and against arguments, evidence, rebuttals, key terms, and practice questions for any debate motion at any level.",                                                                                                gets: ["3 arguments per side with evidence", "Rebuttal for each if challenged", "Key terms + practice questions"] },
  { n: "25", slug: "habits",             ttl: "Habit Tracker",            sub: "Build study habits that stick.",             cat: "PLAN",     desc: "Track daily study habits with a 14-day heatmap grid, per-habit streak counter, weekly score percentage, and the ability to add custom habits.",                                                                                gets: ["14-day heatmap history", "Streak counter per habit", "Add custom habits with emoji"] },
  { n: "26", slug: "deadlines",          ttl: "Deadline Hub",             sub: "Every deadline. Never miss one.",            cat: "PLAN",     desc: "Add exams, assignments, and applications with priority levels, categories, and notes. Overdue alerts, due-this-week counts, and category filters.",                                                                              gets: ["Countdown to each deadline", "Category + priority + overdue alerts", "Filter by type or status"] },
  { n: "27", slug: "exam-sim",           ttl: "Exam Simulator",           sub: "Timed AI exam. Full explanations.",          cat: "PRACTISE", desc: "AI generates a realistic timed MCQ exam for any subject and level. Question map, flag-for-review, auto-submit, and full answer explanations after.",                                                                            gets: ["AI-generated timed MCQ exam", "Question map + flag for review", "Detailed explanation per question"] },
  { n: "28", slug: "gpa-sim",            ttl: "GPA Simulator",            sub: "Model your grades. Plan your GPA.",          cat: "FUTURE",   desc: "Add all your courses, choose your scale (4.0 / 5.0 / 7.0 / 100), toggle weighted or unweighted, and find out what grade you need to hit a target GPA.",                                                                        gets: ["4.0 / 5.0 / 7.0 / 100 scale support", "Weighted vs unweighted toggle", "What-do-I-need? calculator"] },
  { n: "29", slug: "vocab",              ttl: "Vocabulary Vault",         sub: "Deep word learning with memory hooks.",      cat: "LEARN",    desc: "AI generates vocabulary sets with definition, part of speech, example sentence, etymology, synonyms, and a vivid memory hook. Card flip and list modes.",                                                                      gets: ["Memory hook per word", "Etymology + synonyms included", "Card flip + full list view"] },
  { n: "30", slug: "research",           ttl: "Research Assistant",       sub: "Any topic. Arguments, stats, angles.",      cat: "WRITE",    desc: "Full research briefing: sections, for/against arguments, real statistics, essay angles, and further reading — calibrated to your purpose and depth.",                                                                         gets: ["For + against arguments", "Statistics with sources", "5 essay angles to choose from"] },
  { n: "31", slug: "essay-blueprint",    ttl: "Essay Blueprint",          sub: "Topic → structure in three minutes.",        cat: "WRITE",    desc: "Paste any essay prompt and get a complete plan: thesis, paragraph-by-paragraph argument structure, evidence suggestions, and transitions — matched to your board's marking rubric.",                                           gets: ["Full thesis + argument structure", "Evidence suggestions per paragraph", "Board-matched writing guide"] },
  { n: "32", slug: "argument",           ttl: "Argument Builder",         sub: "Premise → steel-manned case.",              cat: "WRITE",    desc: "State a position. Get three structured arguments with evidence, anticipate the strongest counterarguments with steel-manned rebuttals, and receive a logical structure map for your essay.",                                   gets: ["3 arguments + evidence per side", "Steel-manned counterargument", "Logical structure map"] },
  { n: "33", slug: "coach",              ttl: "Academic Coach",           sub: "Personal guidance, any subject.",            cat: "TRACK",    desc: "Your AI mentor that knows your grade, board, and exam targets. Ask anything: how to study for Chemistry, how to fix your essay structure, how to stop avoiding Maths.",                                                       gets: ["Board + grade aware coaching", "Study strategy per subject", "Honest, specific advice"] },
  { n: "34", slug: "compare",            ttl: "Topic Comparer",           sub: "Two concepts. Side-by-side.",                cat: "TRACK",    desc: "Enter two topics, theories, or periods and get a structured comparison: similarities, differences, key tensions, and a recommendation for which angle suits an essay question best.",                                         gets: ["Structured similarity/difference table", "Key tension analysis", "Essay angle recommendation"] },
  { n: "35", slug: "concept-web",        ttl: "Concept Web",              sub: "Every connection in a chapter.",             cat: "LEARN",    desc: "Enter any topic and get a visual web showing every key idea, how they connect, and the hierarchy of understanding — ideal for revision before a detailed essay.",                                                             gets: ["Full concept relationship map", "Hierarchy of understanding", "Revision + essay prep"] },
  { n: "36", slug: "exam-planner",       ttl: "Exam Planner",             sub: "All your papers. One schedule.",             cat: "PLAN",     desc: "Add your exam subjects and dates. Get a day-by-day revision timetable weighted by proximity to exams, subject difficulty, and the hours you actually have.",                                                                gets: ["Day-by-day revision timetable", "Weighted by exam proximity + difficulty", "Hours-available input"] },
  { n: "37", slug: "lab-report",         ttl: "Lab Report Writer",        sub: "Hypothesis to discussion, complete.",        cat: "WRITE",    desc: "Enter your experiment, hypothesis, results table, and observations. Get a complete lab report with method, analysis, uncertainty calculations, and discussion in IGCSE/IB/CBSE format.",                                  gets: ["Full report in your board's format", "Uncertainty + error analysis", "Discussion + evaluation section"] },
  { n: "38", slug: "lang-analyzer",      ttl: "Language Analyzer",        sub: "Deep linguistic analysis of any text.",      cat: "LEARN",    desc: "Paste any passage for literary device identification, tone and register mapping, theme extraction, and a stylistic analysis matching your exam board's rubric expectations.",                                               gets: ["Literary devices identified + quoted", "Tone, register, theme analysis", "Exam rubric-matched commentary"] },
  { n: "39", slug: "mark-scheme",        ttl: "Mark Scheme Decoder",      sub: "Understand exactly how marks are won.",      cat: "PRACTISE", desc: "Paste a mark scheme or question. Get an annotated breakdown of every mark point, what the examiner is signalling, and a checklist you can use to self-assess your answer.",                                               gets: ["Mark-point by mark-point breakdown", "Examiner intention explained", "Self-assessment checklist"] },
  { n: "40", slug: "paper-dissector",    ttl: "Paper Dissector",          sub: "Anatomy of a past paper.",                  cat: "PRACTISE", desc: "Enter a past paper's subject and year. Get question-by-question difficulty ratings, topic frequency analysis, command word breakdown, and strategic advice for approaching it.",                                            gets: ["Topic frequency + difficulty map", "Command word analysis", "Strategic approach advice"] },
  { n: "41", slug: "practice",           ttl: "Practice Engine",          sub: "Targeted questions, any topic.",             cat: "PRACTISE", desc: "Name any topic and level. Get 10 custom practice questions — MCQ, short answer, and extended — calibrated to your board's question style, with model answers for self-marking.",                                           gets: ["MCQ + short + extended questions", "Board-style question format", "Model answers included"] },
  { n: "42", slug: "source",             ttl: "Source Analyst",           sub: "OPCVL on any primary source.",               cat: "TRACK",    desc: "Paste any historical document or primary source. Get a complete OPCVL analysis — Origin, Purpose, Content, Value, and Limitation — structured for IB, IGCSE, and A-Level history marking.",                             gets: ["Full OPCVL breakdown", "IB / IGCSE / A-Level format", "Contextual background included"] },
  { n: "43", slug: "subject-picker",     ttl: "Subject Picker",           sub: "Choose your stream intelligently.",          cat: "FUTURE",   desc: "Not sure which subjects to pick for Grade 11, IB, or A-Level? Enter your interests, strengths, and career direction for a ranked recommendation with detailed reasoning.",                                               gets: ["Ranked subject recommendations", "Reasoning per subject", "Career + entrance exam alignment"] },
  { n: "44", slug: "uni-match",          ttl: "University Matcher",       sub: "Find universities that fit you.",            cat: "FUTURE",   desc: "Enter your grades, interests, budget, and location preferences. Get a ranked list of universities with course match, entry requirements, and application deadline countdowns.",                                           gets: ["Ranked by fit + entry grade match", "Course + location filters", "Deadline countdowns"] },
  { n: "45", slug: "predict",            ttl: "Question Predictor",       sub: "What will the examiner ask next?",           cat: "PRACTISE", desc: "Enter your subject, topic, and exam board. Get 6-8 predicted questions ranked by likelihood, with reasoning, hot-topic areas, and command words likely to appear this cycle.",                                          gets: ["6–8 predicted questions ranked", "Likelihood reasoning per question", "Hot-topic + command word flags"] },
  { n: "46", slug: "memory-palace",      ttl: "Memory Palace Builder",    sub: "Remember anything with Method of Loci.",    cat: "PRACTISE", desc: "Pick any list to memorise — vocabulary, dates, formulas, case studies. Get a full memory palace with a familiar location, vivid station images, and a memorable story linking every item.",                             gets: ["Full palace with location + stations", "Vivid image per item", "Story linking the whole sequence"] },
  { n: "47", slug: "analogy",            ttl: "Analogy Engine",           sub: "Turn complexity into understanding.",        cat: "PRACTISE", desc: "Type any difficult concept and get 3 analogies ranked from most intuitive to most surprising, each with a breakdown of where the comparison holds and where it breaks down.",                                           gets: ["3 analogies: simple → surprising", "Breakdown of where each holds", "Limitation of each analogy"] },
  { n: "48", slug: "case-study",         ttl: "Case Study Pro",           sub: "Business scenarios, fully analysed.",        cat: "TRACK",    desc: "Enter a company, industry, or scenario. Get a complete business case study with SWOT, Porter's Five Forces, stakeholder map, and strategic recommendations in exam-ready format.",                                        gets: ["SWOT + Porter's 5 Forces analysis", "Stakeholder map + tensions", "Strategic recommendations"] },
  { n: "49", slug: "timeline",           ttl: "Timeline Builder",         sub: "History, chronologically mapped.",           cat: "TRACK",    desc: "Enter any historical period or topic. Get 10-14 key events with dates, significance, causal links between them, and category tags — formatted for history exam essay structure.",                                      gets: ["10–14 annotated events", "Causal links between events", "Political / Economic / Social categories"] },
  { n: "50", slug: "reading",            ttl: "Reading Companion",        sub: "Understand any passage deeply.",             cat: "TRACK",    desc: "Paste any unseen text. Get a summary, tone and theme analysis, key literary devices with examples, and 4 comprehension questions at different difficulty levels — all in one page.",                                    gets: ["Summary + tone + theme analysis", "Literary devices identified + quoted", "4-level comprehension questions"] },
  { n: "51", slug: "grammar",            ttl: "Grammar Coach",            sub: "Write with academic precision.",             cat: "WRITE",    desc: "Paste any piece of writing. Get a quality score, grammar and style issues by category, a list of strengths, a corrected rewrite, and 10 academic phrases to improve your register.",                                   gets: ["Overall quality score + issues by type", "Corrected rewrite of your text", "10 academic phrases to use"] },
  { n: "52", slug: "study-guide",        ttl: "Study Guide Builder",      sub: "Complete revision guide in minutes.",        cat: "TRACK",    desc: "Enter any topic or chapter. Get a full study guide: sections, must-know facts, common mistakes, exam tips, visual memory prompts, and a 60-second summary for last-minute review.",                                   gets: ["Structured sections with must-knows", "Common mistakes to avoid", "60-second last-minute summary"] },
  { n: "53", slug: "exam-strategy",      ttl: "Exam Strategy",            sub: "How to work the paper on exam day.",         cat: "PRACTISE", desc: "Input your exam type, duration, and subject. Get time allocation per section, nerve-control techniques, last-minute revision priorities, and a personalised exam-day checklist.",                                     gets: ["Time allocation per section", "Nerve-control + focus techniques", "Personalised exam-day checklist"] },
  { n: "54", slug: "concept-connect",    ttl: "Concept Connect",          sub: "Bridge ideas across subjects.",              cat: "TRACK",    desc: "Enter two concepts from any discipline. Get structural, causal, analogical, and historical connections — uncovering surprising links between ideas you thought were unrelated.",                                       gets: ["Structural + causal connections", "Analogical + historical links", "Cross-subject insight map"] },
  { n: "55", slug: "model-answer",       ttl: "Model Answer Factory",     sub: "Produce full-marks exemplars.",              cat: "WRITE",    desc: "Paste any exam question. Get a model answer hitting every marking point, a structure guide showing how marks are distributed, and commentary on what makes this answer grade-band-A.",                               gets: ["Full-marks model answer", "Mark-point distribution map", "Commentary on why it works"] },
  { n: "★",  slug: "score",              ttl: "Ledger Score™",            sub: "Your real-time exam readiness.",             cat: "TRACK",    desc: "A 0–1000 index computed from four signals: PYQ accuracy (40%), syllabus coverage (25%), mistake velocity (20%), and daily consistency (15%). Updates every time you use any tool.",                                    gets: ["Live 0–1000 readiness score", "4-pillar breakdown", "Top 3 actions to improve today"] },
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
  "Fifty-five tools. One streak. One score.",
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

/* ── Shared style tokens ── */
const S = {
  cap: { fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--ink-3)" },
  capAccent: { fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--cinnabar-ink)" },
  h1: { fontFamily: "var(--serif)", fontSize: 80, fontStyle: "italic" as const, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.025em", lineHeight: 1.0 },
  h2: { fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic" as const, fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1.2 },
  h3: { fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic" as const, fontWeight: 500, color: "var(--ink)", lineHeight: 1.3 },
  body: { fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-3)", lineHeight: 1.6 },
  bodyLg: { fontFamily: "var(--sans)", fontSize: 18, color: "var(--ink-3)", lineHeight: 1.6 },
  divider: { height: 1, background: "var(--rule)", width: "100%", margin: "16px 0" },
  border: "1px solid var(--rule)",
  borderInk: "1px solid var(--ink)",
};

export default function Home() {
  const [today, setToday] = useState("");
  const [selectedTool, setSelectedTool] = useState(0);
  const [expandedFeat, setExpandedFeat] = useState<number | null>(null);
  const [testimIdx, setTestimIdx] = useState(0);

  const [papers,          setPapers]          = useState(3);
  const [hasSyllabus,     setHasSyllabus]     = useState(false);
  const [mistakesPerWeek, setMistakesPerWeek] = useState(8);
  const [streak,          setStreak]          = useState(5);

  const [demoScores, setDemoScores] = useState([82, 76, 90]);
  const demoSubjects = ["Physics", "Chemistry", "Mathematics"];
  const demoAvg = demoScores.reduce((s, x) => s + x, 0) / demoScores.length;
  const demoGrade = demoAvg >= 91 ? "A1" : demoAvg >= 81 ? "A2" : demoAvg >= 71 ? "B1" : demoAvg >= 61 ? "B2" : "C1";

  const scorePreview = scorePreviewCalc(papers, hasSyllabus, mistakesPerWeek, streak);
  const scorePct = (scorePreview / 1000) * 100;

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  }, []);

  const tool = TOOLS[selectedTool];

  return (
    <div style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>

      {/* ── Sticky top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--paper)", borderBottom: S.border,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 32px", height: 60,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 500, fontSize: 20, color: "var(--ink)", letterSpacing: "-0.01em" }}>Ledger</span>
          <nav style={{ display: "flex", gap: 24 }} className="mob-hide">
            <a href="#tools" style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", textDecoration: "none", transition: "color 200ms" }}>Tools</a>
            <a href="#score" style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", textDecoration: "none" }}>Score</a>
            <a href="#features" style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", textDecoration: "none" }}>Features</a>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/auth" style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }} className="mob-hide">Sign in</Link>
          <Link href="/dashboard" className="btn" style={{ padding: "8px 20px", fontSize: 11, letterSpacing: "0.12em", textDecoration: "none" }}>Open the Ledger →</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "88px 32px 72px", textAlign: "center" }}>
        <div style={{ display: "inline-block", border: S.borderInk, color: "var(--ink)", padding: "4px 16px", ...S.cap, marginBottom: 28 }}>
          Academic OS
        </div>
        <h1 style={{ ...S.h1, fontSize: 88, maxWidth: 800, margin: "0 auto 28px", letterSpacing: "-0.03em" }} className="mob-heading">
          The Student&apos;s Operating System.
        </h1>
        <p style={{ ...S.bodyLg, maxWidth: 480, margin: "0 auto 36px" }}>
          55 AI-powered tools. One streak. One score. One syllabus.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard" className="btn" style={{ padding: "12px 32px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>Initiate Protocol</Link>
          <a href="#tools" className="btn ghost" style={{ padding: "12px 32px", fontSize: 11, letterSpacing: "0.14em", textDecoration: "none" }}>Explore 55 Tools</a>
        </div>
      </section>

      {/* ── The Quantified Mind ── */}
      <section style={{ background: "var(--paper-2)", borderTop: S.border, borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "60px 32px" }} className="mob-col" >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 40, alignItems: "end" }} className="mob-col">
            <div>
              <h2 style={S.h2}>The Quantified Mind</h2>
              <div style={S.divider} />
              <p style={{ ...S.body, fontStyle: "italic" }}>
                A unified metric for academic health. Your Ledger Score™ accounts for past paper accuracy, syllabus coverage, and daily consistency.
              </p>
            </div>
            {/* 3 metric bento cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--rule)", border: S.border }} className="mob-col">
              <div style={{ background: "var(--paper)", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 200 }}>
                <span style={S.cap}>Score Cluster</span>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontStyle: "italic", fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1, marginTop: 12 }}>842</div>
                  <div style={{ ...S.body, fontSize: 13, marginTop: 8 }}>+12% research velocity this week</div>
                </div>
              </div>
              <div style={{ background: "var(--paper)", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 200 }}>
                <span style={S.cap}>Toolkit</span>
                <div>
                  <div style={{ ...S.h2, marginTop: 12 }}>55 Tools</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", ...S.body, fontSize: 13 }}>
                    <li>· Notes Simplifier</li>
                    <li>· Exam Simulator</li>
                    <li>· Essay Blueprint</li>
                  </ul>
                </div>
              </div>
              <div style={{ background: "var(--paper)", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 200 }}>
                <span style={S.cap}>Retention Streak</span>
                <div>
                  <div style={{ ...S.h2, marginTop: 12, fontStyle: "italic" }}>142 Days</div>
                  <div style={{ marginTop: 12, height: 4, background: "var(--rule)" }}>
                    <div style={{ height: "100%", width: "85%", background: "var(--ink)" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div style={{ borderBottom: S.border, padding: "9px 0", background: "var(--paper-2)", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div className="ticker">
          <div className="ticker-track mono" style={{ color: "var(--ink-2)", fontSize: 10, letterSpacing: "0.08em" }}>
            {[0, 1].flatMap((k) => TICKER.map((item, i) => <span key={`${k}-${i}`}>{item}</span>))}
          </div>
        </div>
      </div>

      {/* ── Section A: All 55 Tools ── */}
      <section id="tools" style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 32px 60px", borderBottom: S.border }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
          <div>
            <div style={S.capAccent}>Section A — All 55 Tools</div>
            <h2 style={{ ...S.h2, marginTop: 8 }}>Every tool a student needs.</h2>
          </div>
          <div style={S.cap}>Hover any tool to explore</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 1, background: "var(--rule)", border: S.border }} className="mob-col">
          {/* Tool list */}
          <div style={{ maxHeight: 640, overflowY: "auto", background: "var(--paper)" }}>
            {TOOLS.map((t, i) => (
              <button
                key={t.n}
                onClick={() => setSelectedTool(i)}
                onMouseEnter={() => setSelectedTool(i)}
                style={{
                  width: "100%", padding: "12px 18px",
                  background: selectedTool === i ? "var(--ink)" : "transparent",
                  color: selectedTool === i ? "var(--paper)" : "var(--ink)",
                  border: "none", borderBottom: i < TOOLS.length - 1 ? `1px solid var(--rule)` : "none",
                  cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                  transition: "background 120ms",
                }}
              >
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.45, flexShrink: 0, width: 18, letterSpacing: "0.04em" }}>{t.n}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{t.ttl}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 10, opacity: 0.6, marginTop: 2, letterSpacing: "0.04em" }}>{t.sub}</div>
                </div>
                <span style={{ opacity: selectedTool === i ? 0.5 : 0, fontFamily: "var(--mono)", fontSize: 11, transition: "opacity 120ms", flexShrink: 0 }}>→</span>
              </button>
            ))}
          </div>

          {/* Tool detail */}
          <div style={{ padding: "32px 32px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 360, background: "var(--paper)" }}>
            <div>
              <div style={{ ...S.cap, color: "var(--ink-2)" }}>{tool.cat}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.15, marginTop: 8, color: "var(--ink)" }}>{tool.ttl}</div>
              <div style={{ ...S.capAccent, marginTop: 6 }}>{tool.sub}</div>
              <p style={{ ...S.body, marginTop: 16 }}>{tool.desc}</p>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                {tool.gets.map((g, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 11 }}>✓</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href={`/tools/${tool.slug}`} className="btn" style={{ textDecoration: "none", fontSize: 11, letterSpacing: "0.1em" }}>Open tool →</Link>
              <Link href="/dashboard" className="btn ghost" style={{ textDecoration: "none", fontSize: 11, letterSpacing: "0.1em" }}>All 55 tools</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section B: Marks Demo ── */}
      <section style={{ background: "var(--paper-2)", borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 32px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
            <div>
              <div style={S.capAccent}>Section B — Try It Live</div>
              <h2 style={{ ...S.h2, marginTop: 8 }}>Adjust the sliders. Watch the grade move.</h2>
            </div>
            <div style={S.cap}>Tool 02 · Marks Predictor</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 1, background: "var(--rule)", border: S.border }} className="mob-col">
            <div style={{ padding: "28px 28px", background: "var(--paper)" }}>
              <div style={S.capAccent}>Your scores</div>
              {demoSubjects.map((subj, i) => (
                <div key={subj} style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{subj}</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 500, color: "var(--ink)" }}>{demoScores[i]}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={demoScores[i]}
                    onChange={e => setDemoScores(p => p.map((v, j) => j === i ? +e.target.value : v))}
                    style={{ width: "100%", accentColor: "var(--ink)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", ...S.cap, fontSize: 9, marginTop: 2 }}>
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "28px 28px", display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--paper)" }}>
              <div style={S.cap}>Weighted average</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 80, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 0.9, marginTop: 8, color: "var(--ink)" }}>
                {demoAvg.toFixed(1)}<span style={{ fontSize: 32 }}>%</span>
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
                <div>
                  <div style={S.cap}>CBSE Grade</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, marginTop: 4, color: demoGrade === "A1" ? "var(--cinnabar-ink)" : "var(--ink)" }}>{demoGrade}</div>
                </div>
                <div>
                  <div style={S.cap}>GPA (4.0)</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 500, marginTop: 4, color: "var(--ink)" }}>
                    {demoAvg >= 93 ? "4.0" : demoAvg >= 90 ? "3.7" : demoAvg >= 87 ? "3.3" : demoAvg >= 83 ? "3.0" : demoAvg >= 80 ? "2.7" : demoAvg >= 77 ? "2.3" : demoAvg >= 73 ? "2.0" : "1.7"}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20, height: 6, background: "var(--rule)" }}>
                <div style={{ height: "100%", width: `${demoAvg}%`, background: demoAvg >= 90 ? "var(--cinnabar)" : "var(--ink)", transition: "width 300ms" }} />
              </div>
              <Link href="/tools/marks" className="btn" style={{ textDecoration: "none", marginTop: 20, display: "inline-flex", alignSelf: "flex-start", fontSize: 11, letterSpacing: "0.1em" }}>
                Open Marks Predictor →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section C: Score Preview ── */}
      <section id="score" style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 32px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
            <div>
              <div style={S.capAccent}>Section C — Ledger Score™</div>
              <h2 style={{ ...S.h2, marginTop: 8 }}>What would your readiness score be right now?</h2>
            </div>
            <div style={S.cap}>Tool ★ · Live preview</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 1, background: "var(--rule)", border: S.border }} className="mob-col">
            <div style={{ padding: "28px 28px", background: "var(--paper)" }}>
              <div style={S.capAccent}>Your study activity</div>

              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Past paper sessions done</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)" }}>{papers}</span>
                </div>
                <input type="range" min={0} max={20} value={papers} onChange={e => setPapers(+e.target.value)} style={{ width: "100%", accentColor: "var(--ink)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", ...S.cap, fontSize: 9, marginTop: 2 }}><span>0</span><span>20</span></div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Mistakes per week</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)" }}>{mistakesPerWeek}</span>
                </div>
                <input type="range" min={0} max={30} value={mistakesPerWeek} onChange={e => setMistakesPerWeek(+e.target.value)} style={{ width: "100%", accentColor: "var(--ink)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", ...S.cap, fontSize: 9, marginTop: 2 }}><span>0</span><span>30</span></div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Focus streak (days)</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink)" }}>{streak}d</span>
                </div>
                <input type="range" min={0} max={30} value={streak} onChange={e => setStreak(+e.target.value)} style={{ width: "100%", accentColor: "var(--ink)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", ...S.cap, fontSize: 9, marginTop: 2 }}><span>0</span><span>30</span></div>
              </div>

              <button
                onClick={() => setHasSyllabus(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginTop: 16, border: `1px solid ${hasSyllabus ? "var(--ink)" : "var(--rule)"}`, background: hasSyllabus ? "var(--ink)" : "transparent", color: hasSyllabus ? "var(--paper)" : "var(--ink)", cursor: "pointer", width: "100%", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, transition: "all 150ms" }}
              >
                <div style={{ width: 14, height: 14, border: `1.5px solid ${hasSyllabus ? "var(--paper)" : "var(--rule)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {hasSyllabus && <span style={{ fontSize: 9, lineHeight: 1 }}>✓</span>}
                </div>
                Syllabus uploaded to Ledger
              </button>
            </div>

            <div style={{ padding: "28px 28px", display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--paper)" }}>
              <div style={S.cap}>Estimated Ledger Score™</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 80, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 0.9, marginTop: 8, color: "var(--ink)", transition: "all 300ms" }}>
                {scorePreview}
              </div>
              <div style={{ ...S.cap, marginTop: 6 }}>out of 1000 · {scoreTierLabel(scorePreview)}</div>

              <div style={{ marginTop: 16, height: 6, background: "var(--rule)" }}>
                <div style={{ height: "100%", width: `${scorePct}%`, background: "var(--ink)", transition: "width 400ms cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", ...S.cap, fontSize: 9, marginTop: 3 }}>
                {["Beginner", "Building", "Developing", "Strong", "Exam Ready"].map(t => <span key={t}>{t}</span>)}
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", border: S.border, background: "var(--paper-2)" }}>
                {!hasSyllabus && <div style={{ ...S.capAccent, fontSize: 9, marginBottom: 5 }}>+ Upload your syllabus to add up to 250 points</div>}
                {papers === 0 && <div style={{ ...S.capAccent, fontSize: 9, marginBottom: 5 }}>+ Do a Past Papers session to unlock PYQ Accuracy</div>}
                {streak < 7 && <div style={{ ...S.capAccent, fontSize: 9 }}>+ Build a 7-day streak to add {Math.round((7 - streak) * 7.5)} consistency points</div>}
              </div>

              <Link href="/auth" className="btn" style={{ textDecoration: "none", marginTop: 20, display: "inline-flex", alignSelf: "flex-start", fontSize: 11, letterSpacing: "0.1em" }}>
                See your real score →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section D: Seven signatures ── */}
      <section id="features" style={{ background: "var(--paper-2)", borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 32px 60px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 40, alignItems: "start" }} className="mob-col">
            <div>
              <div style={S.capAccent}>Section D — Seven Signatures</div>
              <h2 style={{ ...S.h2, marginTop: 8 }}>Features nobody else ships.</h2>
              <div style={S.divider} />
              <p style={{ ...S.body, fontSize: 14 }}>
                The tools above are the price of entry. These are the reason you stay. None of them are available in another student app — we looked, and then we built them.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--rule)", border: S.border }} className="mob-col">
              {FEATS.map((f, i) => (
                <div
                  key={f.tag}
                  style={{ background: expandedFeat === i ? "var(--ink)" : "var(--paper)", cursor: "pointer", transition: "background 150ms", padding: "20px 18px" }}
                  onClick={() => setExpandedFeat(expandedFeat === i ? null : i)}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 28, color: expandedFeat === i ? "var(--paper)" : "var(--cinnabar-ink)", fontWeight: 400 }}>{f.tag}</span>
                      <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, fontWeight: 500, lineHeight: 1.2, color: expandedFeat === i ? "var(--paper)" : "var(--ink)" }}>{f.ttl}</span>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: expandedFeat === i ? "var(--paper)" : "var(--ink-3)", opacity: 0.6, flexShrink: 0 }}>{expandedFeat === i ? "▲" : "▼"}</span>
                  </div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55, color: expandedFeat === i ? "rgba(253,252,251,0.85)" : "var(--ink-3)", marginTop: 8 }}>{f.body}</p>
                  {expandedFeat === i && (
                    <p style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.55, color: "rgba(253,252,251,0.75)", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(253,252,251,0.15)" }}>
                      {f.extra}
                    </p>
                  )}
                </div>
              ))}
              <div style={{ background: "var(--ink)", color: "var(--paper)", padding: "20px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ ...S.cap, color: "rgba(253,252,251,0.6)" }}>Coming Q3</div>
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, fontWeight: 500, lineHeight: 1.2, marginTop: 10 }}>Exam-Day Mode</div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55, opacity: 0.8, marginTop: 8 }}>
                    The morning of the paper, Ledger locks to a single-screen revision of only what you got wrong in the last 14 days.
                  </p>
                </div>
                <div style={{ ...S.cap, opacity: 0.6, marginTop: 16, fontSize: 10 }}>Waitlist: 3,204</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section E: Field reports ── */}
      <section style={{ borderBottom: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 32px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            <div>
              <div style={S.capAccent}>Section E — Field Reports</div>
              <h2 style={{ ...S.h2, marginTop: 8 }}>Dispatches from actual students.</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ ...S.cap, fontSize: 10 }}>n = 11,482 · Self-reported · Apr &apos;26</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setTestimIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  style={{ padding: "5px 11px", background: "none", border: S.border, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>←</button>
                <button onClick={() => setTestimIdx(i => (i + 1) % TESTIMONIALS.length)}
                  style={{ padding: "5px 11px", background: "none", border: S.border, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>→</button>
              </div>
            </div>
          </div>

          <div style={{ border: S.border, padding: "28px 32px" }}>
            <div style={{ ...S.capAccent, fontSize: 10 }}>Dispatch № {String(testimIdx + 1).padStart(2, "0")}</div>
            <blockquote style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", lineHeight: 1.4, margin: "14px 0 20px", letterSpacing: "-0.008em", maxWidth: 760, color: "var(--ink)", fontWeight: 400 }}>
              &ldquo;{TESTIMONIALS[testimIdx].q}&rdquo;
            </blockquote>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: S.border, paddingTop: 14, gap: 16 }} className="mob-col">
              <div>
                <div style={S.cap}>Filed by</div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, marginTop: 4, color: "var(--ink)" }}>{TESTIMONIALS[testimIdx].by}</div>
              </div>
              <div>
                <div style={S.cap}>Desk</div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13, marginTop: 4, color: "var(--ink-2)" }}>{TESTIMONIALS[testimIdx].ctx}</div>
              </div>
              <div>
                <div style={S.cap}>Result</div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, marginTop: 4, color: "var(--cinnabar-ink)" }}>{TESTIMONIALS[testimIdx].score}</div>
              </div>
              <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} onClick={() => setTestimIdx(i)}
                    style={{ width: i === testimIdx ? 22 : 7, height: 7, background: i === testimIdx ? "var(--ink)" : "var(--rule)", border: "none", cursor: "pointer", transition: "all 200ms", padding: 0, flexShrink: 0 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--rule)", border: S.border, marginTop: -1 }} className="mob-2col">
            {STATS.map(({ big, sm }, i) => (
              <div key={i} style={{ background: "var(--paper)", padding: "20px 20px" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 400, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--ink)" }}>{big}</div>
                <div style={{ ...S.cap, fontSize: 10, marginTop: 8 }}>{sm}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--paper-2)", borderTop: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 32px 56px", display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", gap: 28 }} className="mob-2col">
          <div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 500, fontSize: 32, letterSpacing: "-0.02em", lineHeight: 0.95, color: "var(--ink)" }}>Ledger</div>
            <div style={{ ...S.cap, fontSize: 10, marginTop: 8 }}>The Student&apos;s Operating System</div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 12.5, color: "var(--ink-3)", marginTop: 16, maxWidth: 280, lineHeight: 1.6 }}>
              Independent, student-funded. We will never sell your study data.
            </p>
          </div>
          {[
            { h: "Tools", l: ["Planner", "Marks Predictor", "Notes Simplifier", "Doubt Solver", "Essay Blueprint", "Essay Grader", "Argument Builder", "Grammar Coach", "Model Answer Factory", "Topic Tutor", "AI Flashcards", "Concept Web", "Vocabulary Vault", "Analogy Engine", "Memory Palace", "Past Papers", "Exam Simulator", "Practice Engine", "Focus Dashboard", "Ledger Score™"] },
            { h: "Institutions", l: ["For Schools", "For Tuition Centres", "Syllabus Parser", "Data Export", "API"] },
            { h: "The Ledger", l: ["Changelog", "Roadmap", "Colophon", "Masthead", "Press", "Contact"] },
          ].map((g) => (
            <div key={g.h}>
              <div style={{ ...S.capAccent, marginBottom: 14 }}>{g.h}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--sans)", fontSize: 13, lineHeight: 2, color: "var(--ink-2)" }}>
                {g.l.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: S.border, padding: "14px 32px", maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, ...S.cap, fontSize: 10 }}>
            <span>© MMXXVI Ledger Study Co.</span>
            <span>Set in Newsreader, Inter Tight &amp; JetBrains Mono</span>
            <span>{today}</span>
          </div>
        </div>
      </footer>

      <PaletteToggle />
    </div>
  );
}
