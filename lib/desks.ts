// ═══════════════════════════════════════════════════════════════════════════
// THE DESKS
//
// A publication is organised into desks, not a grid of feature tiles. This is
// the taxonomy — the single source of truth for what each department is called
// and where it lives.
//
// `href` still points at the CURRENT route. The URL move (/tools/learn-lab ->
// /desks/learning) happens in one pass with redirects for every old path, so
// that nothing 404s and no existing link dies. Until then the names change and
// the addresses do not — which is why this file separates the two.
// ═══════════════════════════════════════════════════════════════════════════

export type Desk = {
  /** What the reader sees. */
  name: string;
  /** One line, editorial register — this is a masthead, not a feature bullet. */
  brief: string;
  /** Current route. */
  href: string;
  /** Target route for the URL migration. */
  target: string;
  section: Section;
};

export type Section =
  | "Intelligence"   // understanding: tutor, notes, doubt
  | "Operations"     // planning: schedule, focus, deadlines
  | "Examinations"   // practice: papers, sims, drills
  | "Editorial"      // writing: essays, research, citation
  | "Markets"        // the score: tracking, analysis, reports
  | "Outlook";       // the future: careers, universities

export const SECTIONS: Section[] = [
  "Markets", "Intelligence", "Examinations", "Editorial", "Operations", "Outlook",
];

export const DESKS: Desk[] = [
  // ── Markets — the index and everything that explains it ──────────────────
  { name: "The Index",          section: "Markets",       href: "/tools/grade-tracker",  target: "/markets/index",
    brief: "The Academic Performance Index, its four sectors, and what moved them." },
  { name: "Performance Desk",   section: "Markets",       href: "/tools/marks-forensics", target: "/markets/performance",
    brief: "Forensic analysis of where marks were won and lost." },
  { name: "Risk Desk",          section: "Markets",       href: "/tools/silent-topics",  target: "/markets/risk",
    brief: "The topics you are quietly avoiding, surfaced before they cost you." },
  { name: "Post-Mortem",        section: "Markets",       href: "/tools/post-exam",      target: "/markets/post-mortem",
    brief: "What the last paper actually revealed, written up cold." },

  // ── Intelligence — the learning desk ─────────────────────────────────────
  { name: "Learning Desk",      section: "Intelligence",  href: "/tools/learn-lab",      target: "/desks/learning",
    brief: "The tutor. Ask it anything; it answers at your level, not at a textbook's." },
  { name: "Memory Bureau",      section: "Intelligence",  href: "/tools/recall-studio",  target: "/desks/memory",
    brief: "Recall, drilled and scheduled. Cards, formulae, spaced review." },
  { name: "Language Desk",      section: "Intelligence",  href: "/tools/language-lab",   target: "/desks/language",
    brief: "Grammar, vocabulary and analysis for language papers." },
  { name: "The Syllabus",       section: "Intelligence",  href: "/tools/syllabus",       target: "/desks/syllabus",
    brief: "Your specification, mapped — coverage measured against what is examinable." },

  // ── Examinations — the stress test ───────────────────────────────────────
  { name: "Stress Test Lab",    section: "Examinations",  href: "/tools/exam-sim",       target: "/examinations/stress-test",
    brief: "Timed simulation under exam conditions. No second attempts." },
  { name: "Papers Archive",     section: "Examinations",  href: "/tools/exam-practice",  target: "/examinations/archive",
    brief: "Past papers, dissected question by question." },
  { name: "Question Decoder",   section: "Examinations",  href: "/tools/paper-pattern",  target: "/examinations/decoder",
    brief: "What the examiner is actually asking, and what the mark scheme rewards." },
  { name: "Exam Day",           section: "Examinations",  href: "/tools/exam-day",       target: "/examinations/exam-day",
    brief: "The single screen for the morning of. Gaps, sweep, nothing else." },
  { name: "Triage",             section: "Examinations",  href: "/tools/panic-triage",   target: "/examinations/triage",
    brief: "Too little time, too much syllabus. The ruthless order of operations." },

  // ── Editorial — the writing desk ─────────────────────────────────────────
  { name: "Editorial Review",   section: "Editorial",     href: "/tools/writing-tools",  target: "/editorial/review",
    brief: "Essays graded, argued, and marked up the way an examiner would." },
  { name: "Research Bureau",    section: "Editorial",     href: "/tools/research-suite", target: "/editorial/research",
    brief: "Sources found, read, and cited properly." },
  { name: "Model Answers",      section: "Editorial",     href: "/tools/model-answer",   target: "/editorial/model-answers",
    brief: "What full marks actually looks like, for your board and your level." },
  { name: "The Lab Bench",      section: "Editorial",     href: "/tools/lab-report",     target: "/editorial/lab",
    brief: "Practical write-ups that satisfy a marker." },

  // ── Operations — the running of the day ──────────────────────────────────
  { name: "Operations Desk",    section: "Operations",    href: "/tools/study-command",  target: "/operations/desk",
    brief: "The plan. What to study, in what order, for how long." },
  { name: "The Focus Room",     section: "Operations",    href: "/tools/focus-lab",      target: "/operations/focus",
    brief: "Sessions, timed and logged. Consistency is 150 points of the index." },
  { name: "Forecasting",        section: "Operations",    href: "/tools/forgetting-forecast", target: "/operations/forecast",
    brief: "What you are about to forget, and when. Reviewed before it happens." },
  { name: "Study Rooms",        section: "Operations",    href: "/tools/rooms",          target: "/operations/rooms",
    brief: "The accountability pact. Someone else is counting on you showing up." },

  // ── Outlook — the future ─────────────────────────────────────────────────
  { name: "Future Outlook",     section: "Outlook",       href: "/tools/admissions",     target: "/outlook/admissions",
    brief: "Universities, courses, and whether your trajectory reaches them." },
  { name: "The Interview",      section: "Outlook",       href: "/tools/interview",      target: "/outlook/interview",
    brief: "Rehearsal for the questions that decide it." },
  { name: "Credentials",        section: "Outlook",       href: "/tools/resume",         target: "/outlook/credentials",
    brief: "The record of what you have done, written to be read in ten seconds." },
];

export function desksBySection(section: Section): Desk[] {
  return DESKS.filter(d => d.section === section);
}

/** The section strip under the masthead. */
export const NAV_SECTIONS = [
  { label: "The Index",     href: "/dashboard" },
  { label: "Intelligence",  href: "/tools/learn-lab" },
  { label: "Examinations",  href: "/tools/exam-practice" },
  { label: "Editorial",     href: "/tools/writing-tools" },
  { label: "Operations",    href: "/tools/study-command" },
  { label: "Outlook",       href: "/tools/admissions" },
  { label: "Subscribe",     href: "/pricing" },
];
