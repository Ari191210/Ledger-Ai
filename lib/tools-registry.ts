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
  // ── PLAN (7) ──────────────────────────────────────────────────────────────
  { slug: "planner",          title: "Smart Study Planner",     subtitle: "Subjects in. Timetable out.",                cat: "PLAN",     keywords: ["schedule","timetable","plan","day"] },
  { slug: "focus",            title: "Focus Dashboard",         subtitle: "Pomodoro, streaks, tasks.",                  cat: "PLAN",     keywords: ["pomodoro","timer","streak","session"] },
  { slug: "habits",           title: "Habit Tracker",           subtitle: "Build study habits that stick.",             cat: "PLAN",     keywords: ["habit","heatmap","streak","daily"] },
  { slug: "deadlines",        title: "Deadline Hub",            subtitle: "Every deadline. Never miss one.",            cat: "PLAN",     keywords: ["deadline","exam","assignment","countdown"] },
  { slug: "debt-meter",       title: "Cognitive Debt Meter",    subtitle: "See what you owe your future self.",         cat: "PLAN",     keywords: ["debt","cognitive","meter","procrastination"] },
  { slug: "circadian",        title: "Circadian Study Window",  subtitle: "Study at your biological peak.",             cat: "PLAN",     keywords: ["sleep","chronotype","peak","circadian"] },
  { slug: "circuit-breaker",  title: "Circuit Breaker",         subtitle: "Can't start? Break the block.",              cat: "PLAN",     keywords: ["circuit","break","pattern","habit","block"] },

  // ── LEARN (3 hubs + 1 standalone) ────────────────────────────────────────
  { slug: "learn-lab",        title: "Learn Lab",               subtitle: "Doubt, Feynman, notes, mindmap, connect.",   cat: "LEARN",    keywords: ["doubt","feynman","notes","mindmap","concept","learn","study","question","answer","formula","recall"] },
  { slug: "language-lab",     title: "Language Lab",            subtitle: "Language analysis + vocabulary vault.",      cat: "LEARN",    keywords: ["language","literary","device","tone","analyse","vocab","word","definition","etymology"] },
  { slug: "syllabus",         title: "Syllabus Parser",         subtitle: "Upload PDF. Get your year mapped.",          cat: "LEARN",    keywords: ["syllabus","pdf","upload","parse","curriculum"] },

  // ── WRITE (8) ────────────────────────────────────────────────────────────
  { slug: "essay-blueprint",  title: "Essay Workshop",          subtitle: "Plan. Argue. Grade. One page.",              cat: "WRITE",    keywords: ["essay","blueprint","grade","argue","workshop","thesis"] },
  { slug: "research",         title: "Research Hub",            subtitle: "Research any topic. Plan any assignment.",   cat: "WRITE",    keywords: ["research","essay","plan","outline","assignment"] },
  { slug: "grammar",          title: "Writing Polish",          subtitle: "Grammar, style, and personal statement.",    cat: "WRITE",    keywords: ["grammar","writing","style","personal","statement","polish"] },
  { slug: "presentation",     title: "Presentation Planner",    subtitle: "Topic → full slide deck with notes.",        cat: "WRITE",    keywords: ["presentation","slides","speaker","notes","deck"] },
  { slug: "debate",           title: "Debate Coach",            subtitle: "Any motion. Arguments both ways.",           cat: "WRITE",    keywords: ["debate","argument","rebuttal","motion","for","against"] },
  { slug: "citation",         title: "Citation Generator",      subtitle: "APA, MLA, Chicago, Harvard.",                cat: "WRITE",    keywords: ["citation","reference","bibliography","apa","mla","harvard"] },
  { slug: "lab-report",       title: "Lab Report Writer",       subtitle: "Hypothesis to discussion, complete.",        cat: "WRITE",    keywords: ["lab","report","hypothesis","experiment","science"] },
  { slug: "model-answer",     title: "Model Answer Factory",    subtitle: "Produce full-marks exemplars.",              cat: "WRITE",    keywords: ["model","answer","exemplar","marks","question"] },

  // ── PRACTISE (10) ────────────────────────────────────────────────────────
  { slug: "exam-practice",    title: "Exam Practice Hub",       subtitle: "Past papers, triage, crunch, formula.",      cat: "PRACTISE", keywords: ["past","paper","triage","crunch","formula","recall","mark","scheme","exam","cbse","jee","neet","sat","ib"] },
  { slug: "recall-studio",    title: "Recall Studio",           subtitle: "Flashcards + formula recall drills.",        cat: "PRACTISE", keywords: ["recall","flashcard","active","studio","retrieve","topic","drill"] },
  { slug: "exam-planner",     title: "Revision Planner",        subtitle: "All your exams. Spaced revision built in.",  cat: "PRACTISE", keywords: ["revision","planner","spaced","ebbinghaus","schedule"] },
  { slug: "practice",         title: "Practice Suite",          subtitle: "Targeted questions. Timed exam mode.",       cat: "PRACTISE", keywords: ["practice","question","timed","exam","simulator","mcq"] },
  { slug: "exam-triage",      title: "Exam Triage",             subtitle: "48-hour crunch + syllabus cremator.",        cat: "PRACTISE", keywords: ["triage","crunch","urgent","cremator","revision","priority"] },
  { slug: "post-exam",        title: "Post-Exam Analysis",      subtitle: "Mistake DNA + exam debrief.",                cat: "PRACTISE", keywords: ["post","exam","debrief","mistake","dna","review","learn"] },
  { slug: "revision-intel",   title: "Revision Intelligence",   subtitle: "Decay map + question predictor.",            cat: "PRACTISE", keywords: ["revision","half-life","predict","decay","forgetting","weak","topic"] },
  { slug: "memory-toolkit",   title: "Memory Toolkit",          subtitle: "Memory palace + analogy engine.",            cat: "PRACTISE", keywords: ["memory","palace","loci","analogy","metaphor","toolkit","remember"] },
  { slug: "exam-strategy",    title: "Exam Strategy",           subtitle: "Personalised exam-day plan.",                cat: "PRACTISE", keywords: ["exam","strategy","day","technique","time","paper"] },
  { slug: "last-night",       title: "Last Night Triage",       subtitle: "12 hours left. What to actually study.",     cat: "PRACTISE", keywords: ["last","night","tomorrow","prep","essentials","urgent"] },

  // ── FUTURE (5) ───────────────────────────────────────────────────────────
  { slug: "uni-match",        title: "Future Finder",           subtitle: "Universities, subjects, and your path.",     cat: "FUTURE",   keywords: ["university","match","career","subject","path","future"] },
  { slug: "admissions",       title: "Admissions Engine",       subtitle: "Your real odds. 60 universities.",           cat: "FUTURE",   keywords: ["admissions","university","odds","probability","college"] },
  { slug: "resume",           title: "Resume Builder",          subtitle: "For applications, not LinkedIn.",            cat: "FUTURE",   keywords: ["resume","cv","application","university","college","internship"] },
  { slug: "interview",        title: "Interview Coach",         subtitle: "Practice. Get scored. Improve.",             cat: "FUTURE",   keywords: ["interview","practice","score","coach","university","job"] },
  { slug: "gpa-sim",          title: "GPA Simulator",           subtitle: "Model your grades. Plan your GPA.",          cat: "FUTURE",   keywords: ["gpa","grade","simulate","target","weighted","scale"] },

  // ── TRACK (11) ───────────────────────────────────────────────────────────
  { slug: "marks",            title: "Marks Predictor",         subtitle: "The math of your report card.",              cat: "TRACK",    keywords: ["marks","grade","predict","weighted","cbse","percentage"] },
  { slug: "coach",            title: "AI Study Coach",          subtitle: "Daily briefing + personal chat.",            cat: "TRACK",    keywords: ["coach","mentor","guide","strategy","subject","personal"] },
  { slug: "rooms",            title: "Study Rooms",             subtitle: "Silent accountability.",                     cat: "TRACK",    keywords: ["room","study","accountability","partner","timer","streak"] },
  { slug: "peer-heatmap",     title: "Peer Heatmap",            subtitle: "Where students in your grade are stuck.",    cat: "TRACK",    keywords: ["peer","heatmap","struggle","class","grade","topic"] },
  { slug: "compare",          title: "Comparison Chart",        subtitle: "Any concepts, side by side.",                cat: "TRACK",    keywords: ["compare","contrast","concept","topic","side","difference"] },
  { slug: "source",           title: "Text Analyst",            subtitle: "Source analysis and comprehension.",         cat: "TRACK",    keywords: ["source","text","opcvl","analysis","reading","comprehension"] },
  { slug: "case-study",       title: "Case Study Pro",          subtitle: "Business scenarios, fully analysed.",        cat: "TRACK",    keywords: ["case","study","business","swot","porter","analysis"] },
  { slug: "timeline",         title: "Timeline Builder",        subtitle: "History, chronologically mapped.",           cat: "TRACK",    keywords: ["timeline","history","event","date","chronological"] },
  { slug: "study-guide",      title: "Study Guide Builder",     subtitle: "Complete revision guide in minutes.",        cat: "TRACK",    keywords: ["study","guide","revision","summary","topic","chapter"] },
  { slug: "score",            title: "Ledger Score™",           subtitle: "Your real-time exam readiness.",             cat: "TRACK",    keywords: ["score","ledger","readiness","index","metric","rating"] },
  { slug: "exam-debrief",     title: "Exam Debrief",            subtitle: "Log every exam. Find your patterns.",        cat: "TRACK",    keywords: ["debrief","exam","review","post","analysis","log"] },
]
