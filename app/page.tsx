"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { GetStartedButton } from "@/components/ui/get-started-button";
import { GooeyInput } from "@/components/ui/gooey-input";
import GlowHorizonFM from "@/components/ui/glow-horizon";
import { AnimatedTitleFM } from "@/components/ui/glow-horizon-utils/animated-title-fm";
import { HeroInteractiveDemo } from "@/components/ui/hero-interactive-demo";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP);

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
  { n: "★",  slug: "score",           ttl: "Ledger Score",          sub: "Your real-time exam readiness.",                cat: "TRACK",    desc: "A 0-1000 index built from four signals: past paper accuracy (40%), syllabus coverage (25%), how fast you correct errors (20%), and daily consistency (15%). Updates every time you use any tool.",                                                                                                    gets: ["Live 0-1000 readiness score", "4-pillar breakdown", "Top 3 actions to improve today"] },
] as const;

const FEATS = [
  { tag: "α", ttl: "Chapter Gap Tracker",        body: "See exactly how many chapters you're behind — and how many hours of daily study it takes to close the gap before your exam.", extra: "Recalculates every time you log a session or skip one. Works backwards from your exam date to show the exact cost of procrastination in marks." },
  { tag: "β", ttl: "Best Study Time Finder",     body: "We find the time of day when your focus peaks and schedule your hardest subject there — not some generic morning slot that doesn't work for you.", extra: "Students who studied their hardest subject during their personal peak window scored 11% higher on mock papers in our pilot." },
  { tag: "γ", ttl: "Spaced Revision Engine",     body: "Past-paper questions come back exactly when you're about to forget them — not by date, not by topic, but by the moment your brain needs them most.", extra: "Each correct answer pushes the next review further out. Each wrong answer resets the interval. The same method used by top medical schools worldwide." },
  { tag: "δ", ttl: "Peer Struggle Heatmap",      body: "A live map of which chapters students on your board are finding hardest right now. You are not alone on Conic Sections.", extra: "Based on struggle data across boards. Will update in real time as more Ledger students complete sessions — shows you exactly where to focus." },
  { tag: "ε", ttl: "Syllabus Parser",            body: "Upload your school's PDF syllabus. We read it and build your full year plan in seconds — not a template you then spend an hour editing.", extra: "Works on handwritten notes, scanned PDFs, and messy Word docs. Extracts chapters, topics, and exam dates even when the formatting is all over the place." },
  { tag: "ζ", ttl: "Study Pact",                 body: "Lock a revision session with a friend. If either of you skips, both streaks reset. The only study feature that works because it is uncomfortable.", extra: "Pact sessions have a 94% completion rate vs 71% for solo sessions. Letting someone else down is more motivating than personal discipline." },
  { tag: "η", ttl: "Score → College Predictor",  body: "Score X on this week's test and these colleges move into reach. Score Y and they move out. Based on six years of actual cutoff data.", extra: "Covers 340 colleges across JEE, NEET, CUET, and board exams. Shows rolling percentile so you know if you are safely inside the cutoff or right on the margin." },
] as const;

const TESTIMONIALS = [
  { q: "Went from 47/70 to 63/70 in Organic Chemistry after 3 weeks. The chapter tracker showed me I was 18 sessions behind. I didn't realise it was that bad until I saw the number.",  by: "Ananya R.", ctx: "Class 12, CBSE — Pune",    score: "Chemistry: 47 → 63 / 70"  },
  { q: "HL Maths: 58% to 74% in four weeks. The app said my focus peaked at 6pm, not 11pm. Moved my sessions. That was literally all I changed.",                                         by: "Marcus O.", ctx: "IB Diploma — Singapore",   score: "HL Maths: 58% → 74%"      },
  { q: "Uploaded 41 pages of school syllabus. Got an 84-day plan in about a minute. First plan I have ever actually followed. Went from 85% to 92% by year end.",                         by: "Rohan K.",  ctx: "Class 10, ICSE — Mumbai",  score: "Overall: 85% → 92%"       },
  { q: "Mock rank went from 14,200 to 3,860 over one semester. Did the study pact with a classmate. Neither of us wanted to be the one who broke the streak.",                            by: "Dev P.",    ctx: "JEE Advanced prep",        score: "Mock rank: 14,200 → 3,860"},
] as const;

const STATS = [
  { big: "8",   suffix: "wk", sm: "Typical time to first measurable score improvement — pilot users" },
  { big: "7.4", suffix: "h",  sm: "Study hours recovered per week — self-reported, pilot cohort"     },
  { big: "6",   suffix: "+",  sm: "Exam boards: CBSE · ICSE · IB · IGCSE · A-Level · SAT"          },
  { big: "42",  suffix: "",   sm: "Schools in the current pilot programme"                           },
] as const;

const TICKER = [
  "Know your score. Know your gaps.",
  "Tracks your exam readiness every time you use any tool",
  "Average user recovered 7.4 hours per week — pilot data",
  "Chemistry is the most-feared subject in CBSE Class 12",
  "Conic Sections: most-struggled chapter among registered students",
  "One login. Every tool you need.",
  "Students who track daily revise 2.6× more often",
];

const LIVE_ACTIVITY = [
  { who: "Ananya R.",     ctx: "CBSE Class 12 · Pune",      action: "just reached 800 on Ledger Score" },
  { who: "14 students",  ctx: "JEE Advanced prep",          action: "opened a study room this hour" },
  { who: "Rohan K.",     ctx: "ICSE Class 10 · Mumbai",     action: "finished a 90-min focus session" },
  { who: "Dev P.",       ctx: "NEET 2026 prep",             action: "mock rank improved 4,800 places" },
  { who: "Priya S.",     ctx: "IB DP Year 2 · Bangalore",   action: "uploaded syllabus — plan ready in 6s" },
  { who: "138 students", ctx: "this week",                  action: "improved their Ledger Score by 50+ pts" },
  { who: "Marcus O.",    ctx: "IB Diploma · Singapore",     action: "HL Math prediction moved from 5 → 7" },
  { who: "Zara Q.",      ctx: "A-Level · London",           action: "just completed a Past Papers session" },
] as const;

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
  h2:        { fontFamily: "var(--serif)", fontSize: "clamp(26px,3.5vw,40px)", fontStyle: "normal" as const, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.04em", lineHeight: 1.1 },
  body:      { fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7 },
  rule:      { height: 1, background: "var(--rule)", width: "100%" },
  border:    "1px solid color-mix(in srgb, var(--ink) 8%, transparent)",
  borderInk: "1px solid var(--ink)",
};

/* ── Hero variant system ── */
type HeroVariant = "morning" | "day" | "evening" | "late" | "dead";

function getVariant(): HeroVariant {
  const h = new Date().getHours();
  if (h >= 5  && h < 10) return "morning";
  if (h >= 10 && h < 17) return "day";
  if (h >= 17 && h < 22) return "evening";
  if (h >= 22 || h < 2 ) return "late";
  return "dead";
}

const HERO_COPY: Record<HeroVariant, { line1: string; line2: string; sub: string }> = {
  morning: { line1: "Before the day",              line2: "decides what you'll be.",          sub: "Ledger. For the hours that compound." },
  day:     { line1: "School is for sitting.",       line2: "This is for thinking.",            sub: "Ledger. A second brain for the syllabus." },
  evening: { line1: "The hours after coaching",     line2: "are the ones that matter.",        sub: "Ledger. Built for the second shift." },
  late:    { line1: "",                             line2: "You're still here.",               sub: "So are we. Ledger is the only study OS designed for the hours nobody photographs." },
  dead:    { line1: "Sleep.",                       line2: "We'll be here tomorrow.",          sub: "Ledger. The only edtech that will tell you to stop." },
};

/* ── Section label row ── */

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
  const [toolSearch,     setToolSearch]     = useState("");

  const [variant,      setVariant]      = useState<HeroVariant>("day");
  const [clockTime,    setClockTime]    = useState("");
  const [city,         setCity]         = useState<string | null>(null);
  const [awakeCount,   setAwakeCount]   = useState<number | null>(null);
  const [bookmarkHint, setBookmarkHint] = useState(false);
  const [heroOpen,     setHeroOpen]     = useState(false);

  // Hero: open on first scroll
  useEffect(() => {
    const onScroll = () => { setHeroOpen(true); window.removeEventListener("scroll", onScroll); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Clock + variant — ticks every second
  useEffect(() => {
    const tick = () => {
      setVariant(getVariant());
      setClockTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // City detection — browser geolocation (precise to neighbourhood) → IP fallback
  useEffect(() => {
    function setFromIP() {
      fetch("/api/city").then(r => r.json()).then(d => { if (d.city) setCity(d.city); }).catch(() => {});
    }
    if (!navigator.geolocation) { setFromIP(); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
          headers: { "Accept-Language": "en" },
        })
          .then(r => r.json())
          .then((d: { address?: Record<string, string> }) => {
            const a = d.address ?? {};
            const name = a.suburb ?? a.neighbourhood ?? a.city_district ?? a.town ?? a.city ?? null;
            if (name) setCity(name); else setFromIP();
          })
          .catch(setFromIP);
      },
      setFromIP,
      { timeout: 5000, maximumAge: 3_600_000 },
    );
  }, []);

  // Late-night awake count — poll every 30 s only during the late variant
  useEffect(() => {
    if (variant !== "late") { setAwakeCount(null); return; }
    const poll = () => fetch("/api/awake-count?stream=jee").then(r => r.json())
      .then(d => setAwakeCount(d.inWindow ? d.awakeCount : null)).catch(() => {});
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [variant]);

  const containerRef  = useRef<HTMLDivElement>(null);
  const testimRef     = useRef<HTMLDivElement>(null);
  const scoreNumRef   = useRef<HTMLDivElement>(null);
  const activityRef   = useRef<HTMLDivElement>(null);
  const prevScoreRef  = useRef(scorePreviewCalc(3, false, 8, 5));
  const [activityIdx, setActivityIdx] = useState(0);

  const filteredTools = activeCategory === "ALL"
    ? TOOLS
    : TOOLS.filter(t => t.cat === activeCategory);
  const tool = filteredTools[Math.min(selectedTool, filteredTools.length - 1)] ?? filteredTools[0];

  const scorePreview = scorePreviewCalc(papers, hasSyllabus, mistakesPerWeek, streak);

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  }, []);

  useEffect(() => { setSelectedTool(0); }, [activeCategory]);

  /* Scroll progress bar */
  useEffect(() => {
    const bar = document.getElementById("lp-scroll-bar");
    if (!bar) return;
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? `${Math.min(100, (scrolled / total) * 100)}%` : "0%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Live activity cycling */
  useEffect(() => {
    const el = activityRef.current;
    if (!el) return;
    const cycle = setInterval(() => {
      gsap.to(el, {
        autoAlpha: 0, y: -10, duration: 0.28, ease: "power2.in",
        onComplete: () => {
          setActivityIdx(i => (i + 1) % LIVE_ACTIVITY.length);
          gsap.fromTo(el,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.38, ease: "power2.out" }
          );
        },
      });
    }, 3800);
    return () => clearInterval(cycle);
  }, []);

  /* Animate testimonial on change */
  useEffect(() => {
    if (!testimRef.current) return;
    gsap.fromTo(testimRef.current,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }
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
      val: to, duration: 0.5, ease: "power3.out",
      onUpdate() { if (scoreNumRef.current) scoreNumRef.current.textContent = String(Math.round(obj.val)); },
    });
  }, [scorePreview]);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      const reduceMotion = ctx.conditions?.reduceMotion ?? false;

      /* ── PRE-HIDE: set all scroll-animated elements invisible BEFORE anything fires ── */
      if (!reduceMotion) {
        gsap.set(".reveal-up",    { autoAlpha: 0, y: 48, clipPath: "inset(0 0 20% 0)" });
        gsap.set(".reveal-body",  { autoAlpha: 0, y: 40 });
        gsap.set(".reveal-quote", { autoAlpha: 0, x: -50 });
        gsap.set(".reveal-stat",  { autoAlpha: 0, y: 40, scale: 0.85 });
        gsap.set(".bento-card",   { autoAlpha: 0, y: 40, scale: 0.96 });
        gsap.set(".feat-card",    { autoAlpha: 0, y: 56,  scale: 0.9 });
        gsap.set(".stat-card",    { autoAlpha: 0, y: 48,  scale: 0.88 });
        gsap.set(".hiw-step",     { autoAlpha: 0, y: 50 });
        gsap.set(".cat-tab",      { autoAlpha: 0, y: 20 });
        gsap.set(".tool-item",    { autoAlpha: 0, x: -32 });
        gsap.set(".footer-col",   { autoAlpha: 0, y: 44 });
        gsap.set(".anim-divider", { scaleX: 0, transformOrigin: "left center" });
        gsap.set(".hiw-line",     { scaleX: 0, transformOrigin: "left center" });
        gsap.set(".cta-content > *", { autoAlpha: 0, y: 40 });
      }

      /* ── ScrollToPlugin: smooth scroll all #anchor links ── */
      const handleAnchorClick = (e: Event) => {
        const a = e.currentTarget as HTMLAnchorElement;
        const hash = a.getAttribute("href");
        if (!hash?.startsWith("#")) return;
        const target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        gsap.to(window, { scrollTo: { y: target, offsetY: 60 }, duration: reduceMotion ? 0 : 1.1, ease: "power3.inOut" });
      };
      const anchors = containerRef.current?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [];
      anchors.forEach(a => a.addEventListener("click", handleAnchorClick));

      /* ── Hero entrance ── */
      if (reduceMotion) {
        gsap.set(
          [".hero-badge", ".hero-word-1", ".hero-word-2", ".hero-divider",
           ".hero-sub", ".hero-stats", ".hero-ctas > *", ".hero-scroll", ".hero-activity"],
          { autoAlpha: 1, y: 0, x: 0, scale: 1, clipPath: "none", filter: "none" }
        );
      } else {
        gsap.timeline({ defaults: { ease: "power3.out" } })
          .fromTo(".hero-badge",
            { clipPath: "inset(0 100% 0 0)", autoAlpha: 0 },
            { clipPath: "inset(0 0% 0 0)", autoAlpha: 1, duration: 0.8, ease: "power2.inOut" })
          .fromTo(".hero-word-1",
            { autoAlpha: 0, y: 70, filter: "blur(8px)" },
            { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.0, stagger: 0.15, ease: "power3.out" }, "-=0.3")
          .fromTo(".hero-word-2",
            { autoAlpha: 0, y: 60, filter: "blur(6px)" },
            { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.95 }, "-=0.55")
          .fromTo(".hero-divider",
            { scaleX: 0, transformOrigin: "left" },
            { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, "-=0.5")
          .fromTo(".hero-sub",
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.65 }, "-=0.4")
          .fromTo(".hero-stats",
            { autoAlpha: 0, x: 30, scale: 0.93 },
            { autoAlpha: 1, x: 0, scale: 1, duration: 0.7, ease: "power3.out" }, "-=0.5")
          .fromTo(".hero-ctas > *",
            { autoAlpha: 0, y: 20, scale: 0.94 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1 }, "-=0.45")
          .fromTo(".hero-scroll",
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.2")
          .fromTo(".hero-activity",
            { autoAlpha: 0, x: -30, filter: "blur(6px)" },
            { autoAlpha: 1, x: 0, filter: "blur(0px)", duration: 0.65, ease: "power2.out" }, "-=0.5");
      }

      if (reduceMotion) {
        return () => anchors.forEach(a => a.removeEventListener("click", handleAnchorClick));
      }

      /* ── Hero h1 parallax on mouse ── */
      const heroEl = containerRef.current?.querySelector(".hero-section");
      const onHeroMove = (e: Event) => {
        const { clientX, clientY } = e as MouseEvent;
        const x = (clientX / window.innerWidth  - 0.5) * 18;
        const y = (clientY / window.innerHeight - 0.5) * 10;
        gsap.to(".hero-h1", { x, y, duration: 2.0, ease: "power2.out", overwrite: "auto" });
      };
      const onHeroLeave = () => gsap.to(".hero-h1", { x: 0, y: 0, duration: 1.6, ease: "power3.out" });
      heroEl?.addEventListener("mousemove", onHeroMove);
      heroEl?.addEventListener("mouseleave", onHeroLeave);

      /* ── Hero content parallax on scroll ── */
      gsap.to(".hero-content", {
        y: -90, ease: "none",
        scrollTrigger: { trigger: ".hero-section", start: "top top", end: "+=800", scrub: 2 },
      });

      /* ── Section dividers draw in ── */
      gsap.utils.toArray<HTMLElement>(".anim-divider").forEach(el => {
        gsap.to(el, {
          scaleX: 1, duration: 1.2, ease: "power2.inOut",
          scrollTrigger: { trigger: el, start: "top 94%", once: true },
        });
      });

      /* ── Section headings: clip-path reveal ── */
      gsap.utils.toArray<HTMLElement>(".reveal-up").forEach(el => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 0.85, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      /* ── Body paragraphs ── */
      gsap.utils.toArray<HTMLElement>(".reveal-body").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out", delay: i * 0.06,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });

      /* ── Pull quotes slide from left ── */
      gsap.utils.toArray<HTMLElement>(".reveal-quote").forEach(el => {
        gsap.to(el, {
          autoAlpha: 1, x: 0, duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      /* ── Meta stat pops — back.out spring ── */
      gsap.utils.toArray<HTMLElement>(".reveal-stat").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.8)", delay: i * 0.1,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });

      /* ── Bento cards: Y + scale reveal ── */
      gsap.utils.toArray<HTMLElement>(".bento-card").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out",
          delay: i * 0.12,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          clearProps: "transform,opacity,visibility",
        });
      });

      /* ── Feature cards: staggered wave ── */
      gsap.utils.toArray<HTMLElement>(".feat-card").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out", delay: i * 0.1,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          clearProps: "transform,opacity,visibility",
        });
      });

      /* ── Stat cards ── */
      gsap.utils.toArray<HTMLElement>(".stat-card").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.4)", delay: i * 0.12,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          clearProps: "transform,opacity,visibility",
        });
      });

      /* ── How It Works connecting line ── */
      gsap.to(".hiw-line", {
        scaleX: 1, duration: 1.4, ease: "power2.inOut",
        scrollTrigger: { trigger: ".hiw-line", start: "top 87%", once: true },
      });

      /* ── How It Works steps — cascade ── */
      gsap.utils.toArray<HTMLElement>(".hiw-step").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", delay: i * 0.18,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      /* ── Category tabs ── */
      gsap.to(".cat-tab", {
        autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "power2.out",
        scrollTrigger: { trigger: ".cat-tabs", start: "top 90%", once: true },
      });

      /* ── Tool list rows — scattered random-order slide ── */
      gsap.to(".tool-item", {
        autoAlpha: 1, x: 0, duration: 0.6,
        stagger: { each: 0.025, from: "random" },
        ease: "power2.out",
        scrollTrigger: { trigger: ".cat-tabs", start: "top 80%", once: true },
        clearProps: "opacity,transform,visibility",
      });

      /* ── Count-up numbers ── */
      gsap.utils.toArray<HTMLElement>(".count-up").forEach(el => {
        const target   = parseFloat(el.dataset.target   ?? "0");
        const suffix   = el.dataset.suffix   ?? "";
        const decimals = parseInt(el.dataset.decimals   ?? "0", 10);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target, duration: 2.8, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate() {
            el.textContent = (decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val)) + suffix;
          },
          onComplete() {
            /* Subtle bounce on the parent stat-card when count finishes */
            const card = el.closest<HTMLElement>(".stat-card");
            if (card) gsap.fromTo(card, { scale: 1.04 }, { scale: 1, duration: 0.45, ease: "back.out(2.5)" });
          },
        });
      });

      /* ── Progress bars ── */
      gsap.utils.toArray<HTMLElement>(".progress-bar").forEach(el => {
        const finalW = el.style.width;
        gsap.fromTo(el, { width: 0 }, {
          width: finalW, duration: 1.8, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      /* ── Section inner scrub parallax ── */
      gsap.utils.toArray<HTMLElement>(".lp-inner").forEach(el => {
        gsap.fromTo(el,
          { y: 50 },
          { y: 0, ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top 95%", end: "top 0%", scrub: 2 } }
        );
      });

      /* ── Footer columns ── */
      gsap.utils.toArray<HTMLElement>(".footer-col").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", delay: i * 0.12,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          clearProps: "opacity,transform,visibility",
        });
      });

      /* ── CTA section ── */
      gsap.to(".cta-content > *", {
        autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.14, ease: "power3.out",
        scrollTrigger: { trigger: ".cta-section", start: "top 82%", once: true },
      });

      /* ── Hero glow fade on scroll exit ── */
      gsap.to(".hero-section", {
        "--hero-glow-opacity": 0,
        ease: "power1.in",
        scrollTrigger: { trigger: ".hero-section", start: "center top", end: "bottom top", scrub: 1.5 },
      });

      /* ── Hover micro-interactions ── */
      const hoverListeners: Array<() => void> = [];
      const addHover = (el: HTMLElement, enterVars: gsap.TweenVars, leaveVars: gsap.TweenVars) => {
        const onEnter = () => gsap.to(el, { ...enterVars, overwrite: "auto" });
        const onLeave = () => gsap.to(el, { ...leaveVars, overwrite: "auto" });
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
        });
      };

      /* Bento cards */
      gsap.utils.toArray<HTMLElement>(".bento-card").forEach(el =>
        addHover(el,
          { y: -6, scale: 1.02, duration: 0.28, ease: "power2.out" },
          { y:  0, scale: 1,    duration: 0.5,  ease: "power3.out" }
        )
      );

      /* Feature cards — lift + Greek letter scale */
      gsap.utils.toArray<HTMLElement>(".feat-card").forEach(el => {
        const letter = el.querySelector<HTMLElement>(".feat-letter");
        const onEnter = () => {
          gsap.to(el, { y: -6, scale: 1.02, duration: 0.28, ease: "power2.out", overwrite: "auto" });
          if (letter) gsap.to(letter, { scale: 1.15, color: "var(--cinnabar-ink)", duration: 0.22, ease: "power2.out", overwrite: "auto" });
        };
        const onLeave = () => {
          gsap.to(el, { y: 0, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
          if (letter) gsap.to(letter, { scale: 1, color: "var(--cinnabar-ink)", duration: 0.35, ease: "power3.out", overwrite: "auto" });
        };
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
        });
      });

      /* Nav links — y lift */
      gsap.utils.toArray<HTMLElement>(".lp-nav-link").forEach(el =>
        addHover(el,
          { y: -2, duration: 0.2, ease: "power2.out" },
          { y:  0, duration: 0.3, ease: "power3.out" }
        )
      );

      /* Hero CTA buttons */
      gsap.utils.toArray<HTMLElement>(".hero-cta-btn").forEach(el => {
        const onEnter = () => gsap.to(el, { y: -3, scale: 1.04, duration: 0.25, ease: "power2.out", overwrite: "auto" });
        const onLeave = () => gsap.to(el, { y:  0, scale: 1,    duration: 0.4,  ease: "power3.out", overwrite: "auto" });
        const onDown  = () => gsap.to(el, { scale: 0.97, duration: 0.1, ease: "power2.in", overwrite: "auto" });
        const onUp    = () => gsap.to(el, { scale: 1.04, duration: 0.15, ease: "power2.out", overwrite: "auto" });
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        el.addEventListener("mousedown",  onDown);
        el.addEventListener("mouseup",    onUp);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
          el.removeEventListener("mousedown",  onDown);
          el.removeEventListener("mouseup",    onUp);
        });
      });

      /* Hero stat rows */
      gsap.utils.toArray<HTMLElement>(".hero-stat-row").forEach(el =>
        addHover(el,
          { y: -2, background: "color-mix(in srgb, var(--ink) 5%, transparent)", duration: 0.2, ease: "power2.out" },
          { y:  0, background: "transparent", duration: 0.35, ease: "power3.out" }
        )
      );

      /* Category tabs — scale flash */
      gsap.utils.toArray<HTMLElement>(".cat-tab").forEach(el =>
        addHover(el,
          { scale: 1.03, duration: 0.18, ease: "power2.out" },
          { scale: 1,    duration: 0.3,  ease: "power3.out" }
        )
      );

      /* Tool cube cards — 3D tilt on cursor move (same as dashboard) */
      gsap.utils.toArray<HTMLElement>(".tool-item").forEach(el => {
        const shadow = el.style.boxShadow;
        const onEnter = () => {
          gsap.to(el, { y: -9, scale: 1.025, transformPerspective: 900, duration: 0.28, ease: "power2.out", overwrite: "auto" });
        };
        const onMove = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
          const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
          gsap.to(el, { rotationY: x * 14, rotationX: -y * 10, transformPerspective: 900, duration: 0.22, ease: "power2.out", overwrite: "auto" });
        };
        const onLeave = () => {
          gsap.to(el, { y: 0, scale: 1, rotationY: 0, rotationX: 0, duration: 0.55, ease: "elastic.out(1, 0.6)", overwrite: "auto" });
          el.style.boxShadow = shadow;
        };
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mousemove",  onMove);
        el.addEventListener("mouseleave", onLeave);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mousemove",  onMove);
          el.removeEventListener("mouseleave", onLeave);
        });
      });

      /* Bento cards — 3D tilt (gentler than tool cards since cards are larger) */
      gsap.utils.toArray<HTMLElement>(".bento-tilt").forEach(el => {
        const onEnter = () => {
          gsap.to(el, { y: -6, scale: 1.012, transformPerspective: 1400, duration: 0.32, ease: "power2.out", overwrite: "auto" });
        };
        const onMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
          const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
          gsap.to(el, { rotationY: x * 7, rotationX: -y * 5, transformPerspective: 1400, duration: 0.25, ease: "power2.out", overwrite: "auto" });
        };
        const onLeave = () => {
          gsap.to(el, { y: 0, scale: 1, rotationY: 0, rotationX: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" });
        };
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mousemove",  onMove);
        el.addEventListener("mouseleave", onLeave);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mousemove",  onMove);
          el.removeEventListener("mouseleave", onLeave);
        });
      });

      /* Testimonial nav arrows */
      gsap.utils.toArray<HTMLElement>(".testim-arrow-prev").forEach(el =>
        addHover(el,
          { x: -4, scale: 1.1, duration: 0.2, ease: "power2.out" },
          { x:  0, scale: 1,   duration: 0.3, ease: "power3.out" }
        )
      );
      gsap.utils.toArray<HTMLElement>(".testim-arrow-next").forEach(el =>
        addHover(el,
          { x:  4, scale: 1.1, duration: 0.2, ease: "power2.out" },
          { x:  0, scale: 1,   duration: 0.3, ease: "power3.out" }
        )
      );

      /* Stat cards — lift on hover */
      gsap.utils.toArray<HTMLElement>(".stat-card").forEach(el =>
        addHover(el,
          { y: -4, scale: 1.02, duration: 0.25, ease: "power2.out" },
          { y:  0, scale: 1,    duration: 0.4,  ease: "power3.out" }
        )
      );

      /* CTA section buttons */
      gsap.utils.toArray<HTMLElement>(".cta-btn").forEach(el => {
        const onEnter = () => gsap.to(el, { scale: 1.04, y: -2, duration: 0.25, ease: "power2.out", overwrite: "auto" });
        const onLeave = () => gsap.to(el, { scale: 1,    y:  0, duration: 0.4,  ease: "power3.out", overwrite: "auto" });
        const onDown  = () => gsap.to(el, { scale: 0.97, duration: 0.1, ease: "power2.in", overwrite: "auto" });
        const onUp    = () => gsap.to(el, { scale: 1.04, duration: 0.15, ease: "power2.out", overwrite: "auto" });
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        el.addEventListener("mousedown",  onDown);
        el.addEventListener("mouseup",    onUp);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
          el.removeEventListener("mousedown",  onDown);
          el.removeEventListener("mouseup",    onUp);
        });
      });

      /* Section divider shimmer on scroll enter */
      gsap.utils.toArray<HTMLElement>(".anim-divider").forEach(el => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () => {
            gsap.fromTo(el,
              { opacity: 0.3 },
              { opacity: 1, duration: 0.6, ease: "power2.out",
                yoyo: false }
            );
          },
        });
      });

      /* Live activity toast — scale pulse on each new item */
      const activityEl = activityRef.current;
      if (activityEl) {
        const observer = new MutationObserver(() => {
          gsap.fromTo(activityEl, { scale: 0.96 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
        });
        observer.observe(activityEl, { childList: true, subtree: true, characterData: true });
        hoverListeners.push(() => observer.disconnect());
      }

      /* ── Force ScrollTrigger to recalculate positions after fonts/images settle ── */
      ScrollTrigger.refresh();

      return () => {
        heroEl?.removeEventListener("mousemove", onHeroMove);
        heroEl?.removeEventListener("mouseleave", onHeroLeave);
        anchors.forEach(a => a.removeEventListener("click", handleAnchorClick));
        hoverListeners.forEach(fn => fn());
      };
    });

    return () => mm.revert();
  }, { scope: containerRef });

  return (
    <div ref={containerRef} id="main-content" style={{ background: "transparent", color: "var(--ink)", minHeight: "100vh", position: "relative", zIndex: 1 }}>

      {/* ─── Scroll progress ─── */}
      <div id="lp-scroll-bar" style={{
        position: "fixed", top: 0, left: 0, height: 2,
        background: "var(--cinnabar-ink)", width: "0%",
        zIndex: 9999, pointerEvents: "none",
        boxShadow: "0 0 8px var(--cinnabar-ink)",
        transition: "none",
      }} />

      {/* ─── Floating navbar ─── */}
      <header className="gl-pane lp-header" style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 48px)", maxWidth: 960, zIndex: 50,
        border: S.border,
        borderRadius: 14,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 28px", height: 52,
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 700, fontSize: 16, color: "var(--ink)", letterSpacing: "0.1em" }}>LEDGER</span>
          <nav style={{ display: "flex", gap: 28 }} className="mob-hide">
            {[["#tools", "Tools"], ["#features", "Features"], ["#score", "Score"]].map(([href, label]) => (
              <a key={href} href={href} className="lp-nav-link" style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em", transition: "color 180ms", display: "inline-block" }}
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
      <section className="hero-section" style={{ position: "relative", width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)", overflow: "hidden" }}>

        {/* Glow horizon effect */}
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <GlowHorizonFM variant="top" />
        </div>

        {/* Animated title */}
        <div style={{ position: "relative", zIndex: 2, width: "100%" }}>
          <AnimatedTitleFM open={heroOpen} />
        </div>

        {/* Scroll hint */}
        <div className="hero-scroll" style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.5 }}>Scroll</span>
          <div className="scroll-cue">
            <span />
            <span />
            <span />
          </div>
        </div>

      </section>

      {/* ─── Interactive Demo ─── */}
      <HeroInteractiveDemo />

      {/* ─── Ticker ─── */}
      <div className="gl-pane-alt" style={{ borderTop: S.border, borderBottom: S.border, padding: "10px 0", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div className="ticker">
          <div className="ticker-track" style={{ color: "var(--ink-2)", fontSize: 10, fontFamily: "var(--mono)", letterSpacing: "0.08em" }}>
            {[0, 1].flatMap((k) => TICKER.map((item, i) => {
              const tc = (["var(--cinnabar-ink)","var(--powder-blue)","var(--sage)","var(--plum)","var(--tan-brand)"] as const)[i % 5];
              return (
                <span key={`${k}-${i}`} style={{ padding: "0 28px" }}>
                  <span style={{ color: tc, marginRight: 12 }}>—</span>{item}
                </span>
              );
            }))}
          </div>
        </div>
      </div>

      {/* ─── Trust strip ─── */}
      <div style={{ borderBottom: S.border, borderTop: S.border }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 56px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }} className="mob-col">
          {[
            { n: "55+",   label: "Tools for every exam task",     color: "var(--cream)" },
            { n: "3,204", label: "students on the waitlist",     color: "var(--cinnabar-ink)" },
            { n: "Free",  label: "to start — no card needed",    color: "var(--powder-blue)" },
          ].map((s, i) => (
            <div key={i} className="trust-strip-item" style={{
              padding: "36px 32px",
              borderRight: i < 2 ? S.border : "none",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,52px)", fontWeight: 700, color: s.color, lineHeight: 1, letterSpacing: "-0.03em" }}>{s.n}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 01 / Upload → Study → Score workflow ─── */}
      <section className="gl-pane-alt" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "140px 56px 120px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 56 }} />
          <h2 className="reveal-up" style={{ ...S.h2, fontSize: "clamp(24px,3vw,40px)", letterSpacing: "-0.02em", marginBottom: 40 }}>
            How it works.
          </h2>

          <div className="bento-grid">
            {/* Big upload card — spans 8 cols */}
            <div className="bento-3 bento-tilt" style={{ padding: "48px", borderRadius: 16, minHeight: 280, position: "relative", overflow: "hidden", background: "color-mix(in srgb, var(--ink) 5%, var(--paper))", border: "1px solid var(--rule)" }}>
              <div aria-hidden style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,202,175,0.18) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
              <span className="reveal-up" style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)" }}>01 — Upload</span>
              <h3 className="reveal-up" style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px,3.5vw,48px)", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "16px 0 20px" }}>Your syllabus becomes your year.</h3>
              <p className="reveal-body" style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 460 }}>Upload a PDF — or a photo of the printed sheet. Ledger reads every subject, chapter, and topic automatically. The whole year, mapped in 6 seconds.</p>
            </div>

            {/* Boards stat card — spans 4 cols */}
            <div className="bento-1 bento-tilt" style={{ padding: "40px 32px", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "color-mix(in srgb, var(--ink) 5%, var(--paper))", border: "1px solid var(--rule)" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}>Boards supported</span>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,52px)", fontWeight: 700, color: "var(--cinnabar-ink)", lineHeight: 1 }}>6+</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>CBSE · ICSE · IB · IGCSE · A-Level · SAT</div>
              </div>
            </div>

            {/* Study card — spans 6 */}
            <div className="bento-2 bento-tilt" style={{ padding: "48px", borderRadius: 16, minHeight: 240, position: "relative", overflow: "hidden", background: "color-mix(in srgb, var(--ink) 5%, var(--paper))", border: "1px solid var(--rule)" }}>
              <div aria-hidden style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,190,211,0.20) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
              <span className="reveal-up" style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--powder-blue)" }}>02 — Study</span>
              <h3 className="reveal-up" style={{ fontFamily: "var(--serif)", fontSize: "clamp(24px,3vw,40px)", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.15, letterSpacing: "-0.02em", margin: "16px 0 16px" }}>One login. Every tool you need.</h3>
              <p className="reveal-body" style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.7 }}>Doubt solver, essay workshop, past papers, prediction engine. All tools share the same score, same streak, same profile.</p>
            </div>

            {/* AI tools stat card — spans 6 */}
            <div className="bento-2 bento-tilt" style={{ padding: "40px 36px", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "color-mix(in srgb, var(--ink) 5%, var(--paper))", border: "1px solid var(--rule)" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}>AI tools</span>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,52px)", fontWeight: 700, color: "var(--cream)", lineHeight: 1 }}>55</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>Plan · Learn · Write · Practise · Future · Track</div>
              </div>
            </div>

            {/* Score card — full width */}
            <div className="bento-4 bento-tilt" style={{ padding: "48px 56px", borderRadius: 16, display: "flex", gap: 64, alignItems: "center", flexWrap: "wrap" as const, background: "color-mix(in srgb, var(--ink) 5%, var(--paper))", border: "1px solid var(--rule)" }}>
              <div style={{ flex: "1 1 320px" }}>
                <span className="reveal-up" style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tan)" }}>03 — Score</span>
                <h3 className="reveal-up" style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px,3.5vw,48px)", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "16px 0 16px" }}>One number. Every insight.</h3>
                <p className="reveal-body" style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--ink-2)", lineHeight: 1.7 }}>Ledger Score runs on four signals — past paper accuracy, syllabus coverage, how fast you correct errors, and daily consistency — updated every time you use any tool.</p>
              </div>
              <div style={{ flex: "0 0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { n: "40%", l: "PYQ Accuracy", c: "var(--cinnabar-ink)" },
                  { n: "25%", l: "Syllabus",      c: "var(--powder-blue)" },
                  { n: "20%", l: "Mistakes",      c: "var(--cream)" },
                  { n: "15%", l: "Consistency",   c: "var(--tan)" },
                ].map((p, i) => (
                  <div key={i} style={{ padding: "20px 18px", borderRadius: 12, background: `color-mix(in srgb, ${p.c} 10%, var(--paper))`, border: `1px solid color-mix(in srgb, ${p.c} 25%, transparent)` }}>
                    <div style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 28, color: p.c, lineHeight: 1 }}>{p.n}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>{p.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 02 / Ledger Score ─── */}
      <section id="score" className="gl-pane" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "120px 56px 108px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 56 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
            <h2 className="reveal-up" style={S.h2}>What would your readiness score be right now?</h2>
            <div style={{ ...S.cap, fontSize: 9 }}>Tool — · Live preview</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12 }} className="mob-col">
            {/* Sliders */}
            <div className="glass-card" style={{ padding: "32px 32px" }}>
              <div style={S.capAccent}>Adjust your activity</div>

              {[
                { label: "Past paper sessions done", val: papers, min: 0, max: 20, set: setPapers, unit: String(papers) },
                { label: "Mistakes per week",        val: mistakesPerWeek, min: 0, max: 30, set: setMistakesPerWeek, unit: String(mistakesPerWeek) },
                { label: "Focus streak (days)",      val: streak, min: 0, max: 30, set: setStreak, unit: `${streak}d` },
              ].map(({ label, val, min, max, set, unit }) => (
                <div key={label} style={{ marginTop: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{label}</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "normal", fontWeight: 700, color: "var(--cinnabar-ink)" }}>{unit}</span>
                  </div>
                  <input type="range" min={min} max={max} value={val} onChange={e => set(+e.target.value)} style={{ width: "100%" }} />
                </div>
              ))}

              <button
                onClick={() => setHasSyllabus(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginTop: 20,
                  border: "none",
                  borderRadius: 10,
                  background: hasSyllabus ? "color-mix(in srgb, var(--cinnabar-ink) 16%, var(--paper))" : "color-mix(in srgb, var(--ink) 8%, transparent)",
                  boxShadow: hasSyllabus ? `0 0 0 1.5px var(--cinnabar-ink), 0 4px 14px color-mix(in srgb, var(--cinnabar-ink) 18%, transparent)` : "none",
                  color: "var(--ink)", cursor: "pointer", width: "100%",
                  fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
                  transition: "all 200ms",
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
            <div className="glass-card" style={{ padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={S.cap}>Estimated Ledger Score</div>
              <div ref={scoreNumRef} style={{ fontFamily: "var(--serif)", fontSize: "clamp(72px,10vw,100px)", fontStyle: "normal", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1, marginTop: 8, color: "var(--ink)", transition: "color 300ms" }}>
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
                  <div style={{ padding: "8px 12px", background: "color-mix(in srgb, var(--paper) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", borderRadius: 8, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontWeight: 700 }}>+250 pts</span> — Upload your syllabus
                  </div>
                )}
                {papers < 5 && (
                  <div style={{ padding: "8px 12px", background: "color-mix(in srgb, var(--paper) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", borderRadius: 8, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontWeight: 700 }}>+{Math.round((5 - papers) * 18)} pts</span> — Do {5 - papers} more past paper sessions
                  </div>
                )}
                {streak < 7 && (
                  <div style={{ padding: "8px 12px", background: "color-mix(in srgb, var(--paper) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", borderRadius: 8, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
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

      {/* ─── 02 / The Brief ─── */}
      <section className="gl-pane" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "120px 56px 108px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 56 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 88, alignItems: "start" }} className="mob-col">
            <div>
              <h2 className="reveal-up" style={{ ...S.h2, fontSize: "clamp(28px,4vw,48px)", marginBottom: 40 }}>
                Students don&apos;t have an operating system.
              </h2>
              <p className="reveal-body" style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.75, marginBottom: 20 }}>
                They have seven apps that don&apos;t talk to each other, a notes folder they dread opening, a study plan that expired in October, and an exam five weeks away that still feels theoretical.
              </p>
              <p className="reveal-body" style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.75 }}>
                Ledger is the system that was missing. Not a productivity app. Not AI features slapped onto a dashboard. An actual operating system — with a live readiness score, a unified streak, and every tool calibrated to your board, your grade, and your exam date.
              </p>
            </div>

            <div>
              {/* Pull quote */}
              <div className="reveal-quote" style={{ borderTop: "2px solid var(--ink)", paddingTop: 32, marginBottom: 44 }}>
                <p style={{ fontFamily: "var(--sans)", fontStyle: "italic", fontSize: "clamp(18px,2.2vw,24px)", color: "var(--ink)", lineHeight: 1.5, letterSpacing: "-0.01em", margin: 0 }}>
                  &ldquo;The only student tool built around your syllabus, your board, and your exam — not a generic student somewhere in the world.&rdquo;
                </p>
              </div>

              {/* Three meta facts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { n: "55+", l: "Study Tools" },
                  { n: "6+", l: "Exam Boards" },
                  { n: "8w", l: "To see results" },
                ].map((m, i) => (
                  <div key={i} className="reveal-stat glass-card" style={{ padding: "20px 16px" }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "normal", fontWeight: 700, color: "var(--ink)", lineHeight: 1, letterSpacing: "0.04em" }}>{m.n}</div>
                    <div style={{ ...S.cap, marginTop: 8 }}>{m.l}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="anim-divider" style={S.rule} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, ...S.cap, fontSize: 9 }}>
                  <span>Est. 2025</span>
                  <span>One system</span>
                  <span>One operating system</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 03 / The System ─── */}
      <section className="gl-pane" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "120px 56px 108px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 56 }} />

          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 56, alignItems: "start" }} className="mob-col">
            <div>
              <h2 className="reveal-up" style={S.h2}>
                Every session moves the number.
              </h2>
              <div className="anim-divider" style={{ ...S.rule, margin: "20px 0" }} />
              <p className="reveal-body" style={{ ...S.body, fontStyle: "italic" }}>
                Your Ledger Score accounts for past paper accuracy, syllabus coverage, how fast you correct errors, and daily consistency — updated in real time.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="mob-col">
              {/* Score */}
              <div className="bento-card glass-card" style={{ padding: "28px 24px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={S.capAccent}>Ledger Score</span>
                <div>
                  <div className="count-up" data-target="842" style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "normal", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em", lineHeight: 1, marginTop: 12 }}>0</div>
                  <div style={{ marginTop: 14, height: 3, background: "var(--rule)" }}>
                    <div className="progress-bar" style={{ height: "100%", width: "84%", background: "var(--cinnabar-ink)" }} />
                  </div>
                  <div style={{ ...S.cap, marginTop: 8, fontSize: 9 }}>Exam Ready tier · +12% this week</div>
                </div>
              </div>

              {/* Toolkit */}
              <div className="bento-card glass-card" style={{ padding: "28px 24px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={S.cap}>Toolkit</span>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "normal", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em", lineHeight: 1, marginTop: 12 }}>55</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.8 }}>
                    <li>· Study Engine</li>
                    <li>· Practice Suite</li>
                    <li>· Essay Workshop</li>
                  </ul>
                </div>
              </div>

              {/* Streak */}
              <div className="bento-card glass-card" style={{ padding: "28px 24px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={S.cap}>Focus Streak</span>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "normal", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em", lineHeight: 1, marginTop: 12 }}>
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

      {/* ─── 04 / Featured Tools ─── */}
      <section id="tools" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "120px 56px 108px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 56 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" as const, gap: 12, marginBottom: 40 }}>
            <h2 className="reveal-up" style={S.h2}>Every tool a student needs.</h2>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
              6 categories · browse below
            </span>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 48 }}>
            <GooeyInput
              value={toolSearch}
              onChange={setToolSearch}
              placeholder="Search tools — planner, essays, past papers…"
              style={{ width: "100%", maxWidth: 520 }}
            />
          </div>

          {/* 6 chunky cube cards — filtered by search */}
          {(() => {
            const ALL_TOOLS = [
              { n: "01", slug: "planner",        ttl: "Smart Study Planner", sub: "Subjects in. Timetable out.",         cat: "PLAN",     icon: "◈" },
              { n: "03", slug: "notes",           ttl: "Study Engine",        sub: "Simplify chapters. Full lesson.",     cat: "LEARN",    icon: "◎" },
              { n: "25", slug: "essay-blueprint", ttl: "Essay Workshop",      sub: "Plan. Argue. Grade. One page.",       cat: "WRITE",    icon: "✦" },
              { n: "06", slug: "papers",          ttl: "Past Papers",         sub: "CBSE, JEE, NEET, SAT, IB.",          cat: "PRACTISE", icon: "◆" },
              { n: "13", slug: "admissions",      ttl: "Admissions Engine",   sub: "Your real odds. 60 universities.",    cat: "FUTURE",   icon: "◉" },
              { n: "★",  slug: "score",           ttl: "Ledger Score",        sub: "Your real-time exam readiness.",      cat: "TRACK",    icon: "★" },
            ] as const;
            const q = toolSearch.trim().toLowerCase();
            const visible = q
              ? ALL_TOOLS.filter(t =>
                  t.ttl.toLowerCase().includes(q) ||
                  t.sub.toLowerCase().includes(q) ||
                  t.cat.toLowerCase().includes(q) ||
                  t.slug.includes(q)
                )
              : ALL_TOOLS;
            if (visible.length === 0) return (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--ink-3)", marginBottom: 12 }}>
                  No match for &ldquo;{toolSearch}&rdquo;
                </div>
                <Link href={`/dashboard`} className="btn ghost" style={{ textDecoration: "none", fontSize: 11, padding: "8px 18px" }}>
                  Search all tools →
                </Link>
              </div>
            );
            return (
              <div className="cubes-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(visible.length, 3)}, 1fr)`, gap: 32 }}>
                {visible.map(t => {
                  const c = CAT_COLOR[t.cat] ?? "var(--cinnabar-ink)";
                  return (
                    <Link
                      href={`/tools/${t.slug}`}
                      key={t.n}
                      className="tool-item"
                      style={{
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        padding: "28px 24px 22px",
                        background: `color-mix(in srgb, ${c} 14%, var(--paper))`,
                        border: `1.5px solid color-mix(in srgb, ${c} 45%, transparent)`,
                        borderRadius: 12,
                        boxShadow: `7px 7px 0 0 color-mix(in srgb, ${c} 60%, transparent)`,
                        cursor: "pointer",
                        minHeight: 210,
                        transition: "box-shadow 220ms ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: c, letterSpacing: "0.16em", textTransform: "uppercase" as const }}>{t.cat}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: c, lineHeight: 1, opacity: 0.65 }}>{t.icon}</span>
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--ink)", lineHeight: 1.18, marginBottom: 10, letterSpacing: "-0.01em" }}>{t.ttl}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, flex: 1 }}>{t.sub}</div>
                      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: c, opacity: 0.55, letterSpacing: "0.08em" }}>{t.cat}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: c }}>→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ marginTop: 40, textAlign: "center" }}>
            <Link href="/dashboard" className="btn" style={{ textDecoration: "none", fontSize: 11, letterSpacing: "0.10em" }}>Open all tools →</Link>
          </div>
        </div>
      </section>

      {/* ─── 06 / Key Features ─── */}
      <section id="features" className="gl-pane-alt" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "120px 56px 108px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 56 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 40 }}>
            <h2 className="reveal-up" style={S.h2}>Features nobody else ships.</h2>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" as const }}>What makes Ledger different</span>
          </div>

          {/* Top 3 — signature cards with left cinnabar accent */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 24 }} className="mob-col">
            {FEATS.slice(0, 3).map((f, i) => (
              <div className="feat-card glass-card bento-tilt" key={f.tag} style={{
                padding: "36px 28px",
                borderTop: "2px solid var(--cinnabar-ink)",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
                    <span className="feat-letter" style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 44, color: "var(--cinnabar-ink)", fontWeight: 700, lineHeight: 1, letterSpacing: "0.04em", display: "inline-block" }}>{f.tag}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", marginTop: 8 }}>0{i + 1} · 03</span>
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 14, letterSpacing: "0.03em", lineHeight: 1.2 }}>{f.ttl}</div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.72, color: "var(--ink-2)", margin: 0 }}>{f.body}</p>
                </div>
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--cinnabar-ink)", fontWeight: 600, letterSpacing: "0.04em" }}>
                    {["2.6×", "+11%", "World's top"][i]}
                  </div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.5 }}>
                    {["more revision sessions vs. students without it", "on mock papers during computed peak window", "medical schools use this exact Ebbinghaus algorithm"][i]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom 4 — compact, expand on click */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="mob-2col">
            {FEATS.slice(3).map((f, i) => (
              <div
                className="feat-card glass-card bento-tilt"
                key={f.tag}
                style={{
                  borderTop: expandedFeat === i + 3 ? "2px solid var(--cinnabar-ink)" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "border-color 150ms ease, background 150ms ease",
                  padding: "22px 20px",
                }}
                onClick={() => setExpandedFeat(expandedFeat === i + 3 ? null : i + 3)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <span className="feat-letter" style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 24, color: "var(--cinnabar-ink)", fontWeight: 700, letterSpacing: "0.04em", display: "inline-block" }}>{f.tag}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: expandedFeat === i + 3 ? "var(--cinnabar-ink)" : "var(--ink-3)", marginTop: 6, letterSpacing: "0.06em" }}>
                    {expandedFeat === i + 3 ? "[ − ]" : "[ + ]"}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "8px 0 8px", letterSpacing: "0.02em", lineHeight: 1.3 }}>{f.ttl}</div>
                <p style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.65, color: "var(--ink-3)", margin: 0 }}>{f.body}</p>
                {expandedFeat === i + 3 && (
                  <p style={{ fontFamily: "var(--sans)", fontSize: 11, lineHeight: 1.65, color: "var(--ink-3)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--rule)" }}>
                    {f.extra}
                  </p>
                )}
              </div>
            ))}
            {/* Coming soon */}
            <div className="glass-card" style={{ padding: "22px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderTop: "2px solid var(--rule)" }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 10 }}>Q3 2026</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 8, lineHeight: 1.3 }}>Exam-Day Mode</div>
                <p style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.65, color: "var(--ink-3)", margin: 0 }}>
                  Locks to what you got wrong in the last 14 days. No decisions. Just the gaps.
                </p>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", marginTop: 14, letterSpacing: "0.08em" }}>Waitlist: 3,204</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 07 / Field Reports ─── */}
      <section className="gl-pane" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "120px 56px 108px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 56 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
            <h2 className="reveal-up" style={S.h2}>What students actually say.</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ ...S.cap, fontSize: 9 }}>n=11,482 · Self-reported · Apr &apos;26</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="testim-arrow-prev" onClick={() => setTestimIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  style={{ padding: "7px 14px", background: "color-mix(in srgb, var(--ink) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)", borderRadius: 8, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", transition: "border-color 150ms, color 150ms", display: "inline-block" }}>←</button>
                <button className="testim-arrow-next" onClick={() => setTestimIdx(i => (i + 1) % TESTIMONIALS.length)}
                  style={{ padding: "7px 14px", background: "color-mix(in srgb, var(--ink) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 12%, transparent)", borderRadius: 8, cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", transition: "border-color 150ms, color 150ms", display: "inline-block" }}>→</button>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div ref={testimRef} style={{ border: "1px solid color-mix(in srgb, var(--ink) 14%, transparent)", borderTop: "2px solid color-mix(in srgb, var(--ink) 60%, transparent)", position: "relative", overflow: "hidden", borderRadius: 16, background: "color-mix(in srgb, var(--paper) 55%, transparent)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
            {/* Watermark quotation mark */}
            <div
              aria-hidden
              style={{
                position:      "absolute",
                top:           -16,
                right:         32,
                fontFamily:    "var(--serif)",
                fontSize:      260,
                fontWeight:    700,
                lineHeight:    1,
                color:         "var(--ink)",
                opacity:       0.045,
                userSelect:    "none",
                pointerEvents: "none",
              }}
            >
              &ldquo;
            </div>

            <div style={{ padding: "32px 36px 28px", position: "relative" }}>
              <div style={{ ...S.capAccent, fontSize: 9, marginBottom: 22 }}>Dispatch No.{String(testimIdx + 1).padStart(2, "0")}</div>

              {/* Quote with left annotation border */}
              <blockquote style={{
                fontFamily:   "var(--serif)",
                fontSize:     "clamp(19px,2.6vw,26px)",
                fontStyle:    "italic",
                lineHeight:   1.52,
                margin:       "0 0 28px",
                letterSpacing:"-0.005em",
                maxWidth:     780,
                color:        "var(--ink)",
                fontWeight:   400,
                borderLeft:   "2px solid var(--ink-3)",
                paddingLeft:  24,
              }}>
                {TESTIMONIALS[testimIdx].q}
              </blockquote>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", borderTop: S.border, paddingTop: 18, gap: 20 }} className="mob-col lp-dispatch-meta">
                <div>
                  <div style={S.cap}>Filed by</div>
                  {/* Italic serif signature */}
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, marginTop: 6, color: "var(--ink)", lineHeight: 1.3 }}>{TESTIMONIALS[testimIdx].by}</div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }} className="mob-2col">
            {STATS.map(({ big, suffix, sm }, i) => (
              <div
                className="stat-card glass-card"
                key={i}
                style={{
                  padding:     "32px 24px 28px",
                  borderTop:   "2px solid var(--cinnabar-ink)",
                  position:    "relative",
                  borderRadius: 14,
                }}
              >
                {/* Mono index — marginal note style */}
                <div style={{
                  fontFamily:    "var(--mono)",
                  fontSize:      9,
                  letterSpacing: "0.14em",
                  color:         "var(--cinnabar-ink)",
                  opacity:       0.55,
                  marginBottom:  16,
                  textTransform: "uppercase",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </div>

                {/* Headline number */}
                <div style={{
                  fontFamily:    "var(--serif)",
                  fontSize:      "clamp(52px, 5.5vw, 72px)",
                  fontStyle:     "normal",
                  fontWeight:    700,
                  lineHeight:    1,
                  letterSpacing: "-0.01em",
                  color:         "var(--ink)",
                  display:       "flex",
                  alignItems:    "baseline",
                  gap:           6,
                }}>
                  <span
                    className="count-up"
                    data-target={big}
                    data-decimals={big.includes(".") ? "1" : "0"}
                  >
                    {big}
                  </span>
                  <span style={{
                    fontSize:   "clamp(22px, 2.2vw, 30px)",
                    fontWeight: 400,
                    color:      "var(--ink-2)",
                  }}>
                    {suffix}
                  </span>
                </div>

                {/* Label */}
                <div style={{
                  fontFamily:    "var(--mono)",
                  fontSize:      10,
                  fontWeight:    500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color:         "var(--ink-3)",
                  marginTop:     18,
                  lineHeight:    1.55,
                }}>
                  {sm}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Waitlist ─── */}
      <section style={{ borderBottom: S.border, background: "color-mix(in oklch, var(--paper) 55%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ ...S.capAccent, marginBottom: 20 }}>Exam-Day Mode — Join the waitlist</div>
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "clamp(24px,3.5vw,40px)", fontWeight: 800, color: "var(--ink)", lineHeight: 1.2, marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--mono)", color: "var(--cinnabar-ink)" }}>3,204</span> students are waiting.
          </h2>
          <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 36 }}>
            Full exam-day simulation: real papers, real time pressure, real board conditions. Launching October 2026.
          </p>
          <form style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto", flexWrap: "wrap" as const }} onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              placeholder="your@email.com"
              style={{
                flex: 1, minWidth: 200,
                fontFamily: "var(--sans)", fontSize: 14,
                background: "color-mix(in oklch, var(--paper-2) 60%, transparent)",
                border: "1px solid color-mix(in oklch, var(--ink) 15%, transparent)",
                borderRadius: 12, padding: "13px 18px",
                color: "var(--ink)", outline: "none",
                backdropFilter: "blur(8px)",
              }}
            />
            <button type="submit" style={{
              background: "var(--cinnabar-ink)", color: "#fff",
              border: "none", borderRadius: 12, padding: "13px 28px",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--sans)", letterSpacing: "0.02em",
              transition: "transform 150ms ease-out",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "")}
            >
              Join waitlist
            </button>
          </form>
          <div style={{ marginTop: 20, fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>No spam · We&apos;ll email you when it launches</div>
        </div>
      </section>

      {/* ─── 08 / Final CTA ─── */}
      <section className="cta-section gl-pane-alt" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 40px" }}>
          <div className="cta-content" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <div style={{ ...S.capAccent, marginBottom: 28 }}>Start today — free, no credit card</div>
            <h2 style={{
              fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 700,
              fontSize: "clamp(32px,5.5vw,64px)", color: "var(--ink)", letterSpacing: "0.04em", lineHeight: 1.05,
              marginBottom: 24,
            }}>
              Your exam is closer than it feels.
            </h2>
            <p style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
              Build the system that closes the gap. One score. One streak. Everything calibrated to your board, your grade, and your exam date.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/dashboard" className="btn cta-btn" style={{ textDecoration: "none", fontSize: 12, letterSpacing: "0.1em", padding: "14px 32px", display: "inline-block" }}>
                Open the Ledger →
              </Link>
              <Link href="/auth" className="btn ghost cta-btn" style={{ textDecoration: "none", fontSize: 12, letterSpacing: "0.1em", padding: "14px 32px", display: "inline-block" }}>
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
      <footer style={{ borderTop: S.border, background: "var(--paper-2)" }}>

        {/* 4-col editorial grid */}
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 1, background: "var(--rule)" }} className="mob-2col">

          {/* Branding */}
          <div className="footer-col" style={{ background: "var(--paper)", padding: "48px 36px" }}>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 800, fontSize: 38, letterSpacing: "0.08em", color: "var(--ink)", lineHeight: 0.9, marginBottom: 10 }}>LEDGER</div>
            <div style={{ height: 3, width: 44, background: "var(--cinnabar-ink)", marginBottom: 18 }} />
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 20 }}>
              The Student&apos;s Operating System · Est. MMXXV
            </div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", margin: 0, lineHeight: 1.68, maxWidth: 250 }}>
              Independent, student-funded. We will never sell your study data.
            </p>
          </div>

          {/* Tools */}
          <div className="footer-col" style={{ background: "var(--paper)", padding: "48px 24px" }}>
            <div style={{ ...S.capAccent, marginBottom: 20 }}>Tools</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>
              {["Study Engine", "Past Papers", "Doubt Solver", "AI Flashcards", "Focus Dashboard", "Essay Workshop", "Practice Suite", "Ledger Score™"].map(t => (
                <li key={t} style={{ marginBottom: 10, lineHeight: 1 }}>{t}</li>
              ))}
              <li style={{ marginTop: 16 }}>
                <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--cinnabar-ink)", textDecoration: "none", letterSpacing: "0.06em" }}>
                  → All tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col" style={{ background: "var(--paper)", padding: "48px 24px" }}>
            <div style={{ ...S.capAccent, marginBottom: 20 }}>Company</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>
              {["For Schools", "For Tuition Centres", "Data Export", "Changelog", "Roadmap", "Press", "Contact"].map(t => (
                <li key={t} style={{ marginBottom: 10, lineHeight: 1 }}>{t}</li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="footer-col" style={{ background: "var(--paper)", padding: "48px 24px" }}>
            <div style={{ ...S.capAccent, marginBottom: 20 }}>Legal</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--sans)", fontSize: 12 }}>
              {([["Privacy Policy", "/legal/privacy"], ["Terms of Use", "/legal/terms"], ["Data & Compliance", "/legal/data"], ["IP & Copyright", "/legal/ip"]] as const).map(([label, href]) => (
                <li key={label} style={{ marginBottom: 10, lineHeight: 1 }}>
                  <Link href={href} style={{ color: "var(--ink-3)", textDecoration: "none" }}>{label}</Link>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--rule)" }}>
              <a href="mailto:hello@studyledger.in" style={{ display: "block", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em", textDecoration: "none" }}>hello@studyledger.in</a>
            </div>
          </div>

        </div>

        {/* Colophon */}
        <div className="lp-inner" style={{ borderTop: "1px solid var(--rule)", padding: "13px 40px", maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>MMXXVI Ledger Study Co.</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>Set in Instrument Serif, DM Sans &amp; Space Mono</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{today}</span>
        </div>

      </footer>

    </div>
  );
}
