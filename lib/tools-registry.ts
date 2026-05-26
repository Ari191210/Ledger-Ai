export type ToolCategory = "PLAN" | "LEARN" | "WRITE" | "PRACTISE" | "FUTURE" | "TRACK"

export interface ToolEntry {
  slug:     string
  title:    string
  subtitle: string
  cat:      ToolCategory
  keywords?: string[]
}

export const CAT_COLOR: Record<ToolCategory, string> = {
  PLAN:     "var(--sage)",
  LEARN:    "var(--slate)",
  WRITE:    "var(--ochre)",
  PRACTISE: "var(--cinnabar-ink)",
  FUTURE:   "var(--plum)",
  TRACK:    "var(--teal)",
}

export const TOOLS_REGISTRY: ToolEntry[] = [
  // ── PLAN (5) ──────────────────────────────────────────────────────────────
  { slug: "planner",         title: "Smart Study Planner",    subtitle: "Subjects in. Timetable out.",          cat: "PLAN",     keywords: ["schedule","timetable","plan","day"] },
  { slug: "focus",           title: "Focus Dashboard",        subtitle: "Pomodoro, streaks, tasks.",            cat: "PLAN",     keywords: ["pomodoro","timer","streak","session","deep","work"] },
  { slug: "habits",          title: "Habit Tracker",          subtitle: "Build study habits that stick.",       cat: "PLAN",     keywords: ["habit","heatmap","streak","daily","routine"] },
  { slug: "deadlines",       title: "Deadline Hub",           subtitle: "Every deadline. Never miss one.",      cat: "PLAN",     keywords: ["deadline","exam","assignment","countdown","due"] },
  { slug: "circuit-breaker", title: "Circuit Breaker",        subtitle: "Can't start? Break the block.",        cat: "PLAN",     keywords: ["circuit","block","procrastination","start","motivation"] },

  // ── LEARN (3) ────────────────────────────────────────────────────────────
  { slug: "learn-lab",       title: "Learn Lab",              subtitle: "Doubt, Feynman, notes, mindmap.",      cat: "LEARN",    keywords: ["doubt","feynman","notes","mindmap","concept","learn","question","answer","connect"] },
  { slug: "language-lab",    title: "Language Lab",           subtitle: "Language analysis + vocab vault.",     cat: "LEARN",    keywords: ["language","literary","device","tone","analyse","vocab","word","definition","etymology"] },
  { slug: "syllabus",        title: "Syllabus Parser",        subtitle: "Upload PDF. Get your year mapped.",    cat: "LEARN",    keywords: ["syllabus","pdf","upload","parse","curriculum"] },

  // ── WRITE (6) ────────────────────────────────────────────────────────────
  { slug: "essay-blueprint", title: "Essay Workshop",         subtitle: "Plan, argue, or grade any essay.",     cat: "WRITE",    keywords: ["essay","blueprint","grade","argue","workshop","thesis"] },
  { slug: "research",        title: "Research Hub",           subtitle: "Deep research or plan assignment.",    cat: "WRITE",    keywords: ["research","essay","plan","outline","assignment"] },
  { slug: "grammar",         title: "Writing Polish",         subtitle: "Grammar, style, personal statement.",  cat: "WRITE",    keywords: ["grammar","writing","style","personal","statement","polish"] },
  { slug: "presentation",    title: "Presentation Planner",   subtitle: "Topic → full slide deck.",             cat: "WRITE",    keywords: ["presentation","slides","speaker","notes","deck"] },
  { slug: "debate",          title: "Debate Coach",           subtitle: "Any motion. Arguments both ways.",     cat: "WRITE",    keywords: ["debate","argument","rebuttal","motion","for","against"] },
  { slug: "model-answer",    title: "Model Answer Factory",   subtitle: "See what full marks looks like.",      cat: "WRITE",    keywords: ["model","answer","exemplar","marks","question","full"] },

  // ── PRACTISE (7) ─────────────────────────────────────────────────────────
  { slug: "exam-practice",   title: "Exam Practice Hub",      subtitle: "Papers, triage, crunch, formula.",     cat: "PRACTISE", keywords: ["past","paper","triage","crunch","formula","recall","mark","scheme","exam","cbse","jee","neet","sat","ib"] },
  { slug: "recall-studio",   title: "Recall Studio",          subtitle: "Flashcards + formula recall.",         cat: "PRACTISE", keywords: ["recall","flashcard","active","studio","drill","spaced"] },
  { slug: "exam-planner",    title: "Revision Planner",       subtitle: "Spaced revision schedule.",            cat: "PRACTISE", keywords: ["revision","planner","spaced","ebbinghaus","schedule"] },
  { slug: "exam-triage",     title: "Exam Triage",            subtitle: "48h crunch + syllabus cremator.",      cat: "PRACTISE", keywords: ["triage","crunch","cremator","revision","priority","urgent"] },
  { slug: "practice",        title: "Practice Suite",         subtitle: "Practice problems or mock exam.",      cat: "PRACTISE", keywords: ["practice","question","timed","exam","simulator","mcq","mock"] },
  { slug: "post-exam",       title: "Post-Exam Analysis",     subtitle: "Mistake DNA + exam debrief.",          cat: "PRACTISE", keywords: ["post","exam","debrief","mistake","dna","review","analyse"] },
  { slug: "revision-intel",  title: "Revision Intelligence",  subtitle: "Decay map + question predictor.",      cat: "PRACTISE", keywords: ["revision","half-life","predict","decay","forgetting","weak","topic"] },

  // ── FUTURE (4) ───────────────────────────────────────────────────────────
  { slug: "uni-match",       title: "Future Finder",          subtitle: "Unis, subjects, career path.",         cat: "FUTURE",   keywords: ["university","match","career","subject","path","future"] },
  { slug: "admissions",      title: "Admissions Engine",      subtitle: "Your real odds. 60 universities.",     cat: "FUTURE",   keywords: ["admissions","university","odds","probability","college"] },
  { slug: "interview",       title: "Interview Coach",        subtitle: "Practice. Get scored. Improve.",       cat: "FUTURE",   keywords: ["interview","practice","score","coach","job"] },
  { slug: "resume",          title: "Resume Builder",         subtitle: "For applications, not LinkedIn.",      cat: "FUTURE",   keywords: ["resume","cv","application","university","college","internship"] },

  // ── TRACK (5) ────────────────────────────────────────────────────────────
  { slug: "marks",           title: "Marks Predictor",        subtitle: "The math of your report card.",        cat: "TRACK",    keywords: ["marks","grade","predict","weighted","cbse","percentage"] },
  { slug: "coach",           title: "AI Study Coach",         subtitle: "Daily briefing + personal chat.",      cat: "TRACK",    keywords: ["coach","mentor","guide","strategy","subject","personal"] },
  { slug: "rooms",           title: "Study Rooms",            subtitle: "Silent accountability.",               cat: "TRACK",    keywords: ["room","study","accountability","partner","timer","streak"] },
  { slug: "score",           title: "Ledger Score™",          subtitle: "Your real-time exam readiness.",       cat: "TRACK",    keywords: ["score","ledger","readiness","index","metric","rating"] },
  { slug: "compare",         title: "Comparison Chart",       subtitle: "Any concepts, side by side.",          cat: "TRACK",    keywords: ["compare","contrast","concept","topic","side","difference"] },
]
