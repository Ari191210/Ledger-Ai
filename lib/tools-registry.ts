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
  // ── PLAN (3) ──────────────────────────────────────────────────────────────
  { slug: "planner",         title: "Smart Study Planner", subtitle: "Subjects in. Timetable out.",        cat: "PLAN",     keywords: ["schedule","timetable","plan","day","deadline","habit","circadian"] },
  { slug: "focus",           title: "Focus Dashboard",     subtitle: "Pomodoro, streaks, tasks.",          cat: "PLAN",     keywords: ["pomodoro","timer","streak","session","deep","work"] },
  { slug: "habits",          title: "Habit Tracker",       subtitle: "Build study habits that stick.",     cat: "PLAN",     keywords: ["habit","heatmap","streak","daily","routine","debt"] },

  // ── LEARN (3) ────────────────────────────────────────────────────────────
  { slug: "learn-lab",       title: "Learn Lab",           subtitle: "Doubt, Feynman, notes, mindmap.",   cat: "LEARN",    keywords: ["doubt","feynman","notes","mindmap","concept","learn","study","question","answer"] },
  { slug: "language-lab",    title: "Language Lab",        subtitle: "Language analysis + vocab vault.",  cat: "LEARN",    keywords: ["language","literary","device","tone","analyse","vocab","word","definition","etymology"] },
  { slug: "syllabus",        title: "Syllabus Parser",     subtitle: "Upload PDF. Get your year mapped.", cat: "LEARN",    keywords: ["syllabus","pdf","upload","parse","curriculum"] },

  // ── WRITE (3) ────────────────────────────────────────────────────────────
  { slug: "essay-blueprint", title: "Essay Workshop",      subtitle: "Plan, argue, or grade any essay.",  cat: "WRITE",    keywords: ["essay","blueprint","grade","argue","workshop","thesis","debate","citation","model","answer"] },
  { slug: "research",        title: "Research Hub",        subtitle: "Deep research or plan assignment.", cat: "WRITE",    keywords: ["research","essay","plan","outline","assignment","presentation","lab","report"] },
  { slug: "grammar",         title: "Writing Polish",      subtitle: "Grammar, style, personal statement.", cat: "WRITE",  keywords: ["grammar","writing","style","personal","statement","polish","proofread"] },

  // ── PRACTISE (4) ─────────────────────────────────────────────────────────
  { slug: "exam-practice",   title: "Exam Practice Hub",   subtitle: "Papers, triage, crunch, formula.",  cat: "PRACTISE", keywords: ["past","paper","triage","crunch","formula","recall","mark","scheme","exam","cbse","jee","neet","sat","ib"] },
  { slug: "recall-studio",   title: "Recall Studio",       subtitle: "Flashcards + formula recall.",      cat: "PRACTISE", keywords: ["recall","flashcard","active","studio","drill","memory","spaced"] },
  { slug: "exam-planner",    title: "Revision Planner",    subtitle: "Spaced revision schedule.",         cat: "PRACTISE", keywords: ["revision","planner","spaced","ebbinghaus","schedule","half-life","predict"] },
  { slug: "exam-triage",     title: "Exam Triage",         subtitle: "48h crunch + syllabus cremator.",   cat: "PRACTISE", keywords: ["triage","crunch","cremator","revision","priority","last","night","strategy","post","exam","debrief","mistake","dna"] },

  // ── FUTURE (3) ───────────────────────────────────────────────────────────
  { slug: "uni-match",       title: "Future Finder",       subtitle: "Unis, subjects, career path.",      cat: "FUTURE",   keywords: ["university","match","career","subject","path","future","gpa","grade"] },
  { slug: "admissions",      title: "Admissions Engine",   subtitle: "Your real odds. 60 universities.",  cat: "FUTURE",   keywords: ["admissions","university","odds","probability","college","resume","cv"] },
  { slug: "interview",       title: "Interview Coach",     subtitle: "Practice. Get scored. Improve.",    cat: "FUTURE",   keywords: ["interview","practice","score","coach","university","job"] },

  // ── TRACK (3) ────────────────────────────────────────────────────────────
  { slug: "marks",           title: "Marks Predictor",     subtitle: "The math of your report card.",     cat: "TRACK",    keywords: ["marks","grade","predict","weighted","cbse","percentage","gpa","score","compare","source","timeline","study","guide"] },
  { slug: "coach",           title: "AI Study Coach",      subtitle: "Daily briefing + personal chat.",   cat: "TRACK",    keywords: ["coach","mentor","guide","strategy","subject","personal","peer","heatmap"] },
  { slug: "rooms",           title: "Study Rooms",         subtitle: "Silent accountability.",            cat: "TRACK",    keywords: ["room","study","accountability","partner","timer","streak"] },
]
