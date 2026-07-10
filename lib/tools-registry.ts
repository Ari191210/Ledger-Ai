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
  // ── PLAN (2) ──────────────────────────────────────────────────────────────
  { slug: "study-command", title: "Study Command",  subtitle: "Planner, habits, coach, deadlines.",  cat: "PLAN",     keywords: ["planner","schedule","timetable","plan","day","habit","heatmap","streak","daily","routine","deadline","exam","assignment","countdown","due","coach","mentor","guide","strategy","personal"] },
  { slug: "focus-lab",     title: "Focus Lab",      subtitle: "Deep focus. Pomodoro. Break blocks.", cat: "PLAN",     keywords: ["pomodoro","timer","focus","session","deep","work","circuit","block","procrastination","start","motivation","debt","circadian","brain","budget"] },

  // ── LEARN (3) ────────────────────────────────────────────────────────────
  { slug: "learn-lab",    title: "Learn Lab",       subtitle: "Doubt, Feynman, notes, mindmap.",        cat: "LEARN",    keywords: ["doubt","feynman","notes","mindmap","concept","learn","question","answer","connect","connect","concept-connect"] },
  { slug: "language-lab", title: "Language Lab",    subtitle: "Language analysis + vocab vault.",        cat: "LEARN",    keywords: ["language","literary","device","tone","analyse","vocab","word","definition","etymology","lang","analyzer"] },
  { slug: "syllabus",     title: "Syllabus Parser", subtitle: "Upload PDF. Get your year mapped.",       cat: "LEARN",    keywords: ["syllabus","pdf","upload","parse","curriculum"] },

  // ── WRITE (9) ────────────────────────────────────────────────────────────
  { slug: "writing-tools",     title: "Writing Tools",         subtitle: "Essay workshop + writing polish.",         cat: "WRITE",    keywords: ["essay","blueprint","grade","argue","workshop","thesis","grammar","writing","style","personal","statement","polish"] },
  { slug: "research-suite",    title: "Research Suite",        subtitle: "Deep research or plan assignment.",        cat: "WRITE",    keywords: ["research","essay","plan","outline","assignment","source"] },
  { slug: "presentation",      title: "Presentation Planner",  subtitle: "Topic → full slide deck.",                cat: "WRITE",    keywords: ["presentation","slides","speaker","notes","deck"] },
  { slug: "debate",            title: "Debate Coach",          subtitle: "Any motion. Arguments both ways.",         cat: "WRITE",    keywords: ["debate","argument","rebuttal","motion","for","against"] },
  { slug: "citation",          title: "Citation Builder",      subtitle: "Cite anything. Any style.",               cat: "WRITE",    keywords: ["citation","cite","harvard","apa","mla","chicago","reference","bibliography"] },
  { slug: "lab-report",        title: "Lab Report Writer",     subtitle: "Lab data → structured report.",           cat: "WRITE",    keywords: ["lab","report","experiment","method","results","conclusion","biology","chemistry","physics"] },
  { slug: "model-answer",      title: "Model Answer Factory",  subtitle: "See what full marks looks like.",          cat: "WRITE",    keywords: ["model","answer","exemplar","marks","question","full"] },
  { slug: "reference-builder", title: "Reference Builder",     subtitle: "Build your source list.",                 cat: "WRITE",    keywords: ["reference","bibliography","source","list","export","citation"] },
  { slug: "report-tools",      title: "Report Tools",          subtitle: "Case studies, business reports, more.",   cat: "WRITE",    keywords: ["report","case","study","business","academic","structure"] },

  // ── PRACTISE (14) ─────────────────────────────────────────────────────────
  { slug: "exam-practice",      title: "Exam Practice Hub",      subtitle: "Papers, triage, crunch, formula.",      cat: "PRACTISE", keywords: ["past","paper","triage","crunch","formula","recall","mark","scheme","exam","cbse","jee","neet","sat","ib","papers"] },
  { slug: "recall-studio",      title: "Recall Studio",          subtitle: "Flashcards + formula recall.",          cat: "PRACTISE", keywords: ["recall","flashcard","active","studio","drill","spaced"] },
  { slug: "exam-planner",       title: "Revision Planner",       subtitle: "Spaced revision schedule.",            cat: "PRACTISE", keywords: ["revision","planner","spaced","ebbinghaus","schedule","half-life","predict","decay","forgetting","weak","topic","revision-intel"] },
  { slug: "exam-triage",        title: "Exam Triage",            subtitle: "48h crunch + syllabus cremator.",       cat: "PRACTISE", keywords: ["triage","crunch","cremator","revision","priority","urgent","last","night","last-night","skip","chapter","rank"] },
  { slug: "practice",           title: "Practice Suite",         subtitle: "Practice problems or mock exam.",       cat: "PRACTISE", keywords: ["practice","question","timed","exam","simulator","mcq","mock"] },
  { slug: "post-exam",          title: "Post-Exam Analysis",     subtitle: "Mistake DNA + exam debrief.",           cat: "PRACTISE", keywords: ["post","exam","debrief","mistake","dna","error","fingerprint","conceptual","calculation","careless","pattern","review","analyse","strategy"] },
  { slug: "memory-toolkit",     title: "Memory Toolkit",         subtitle: "Analogy + memory palace.",              cat: "PRACTISE", keywords: ["memory","palace","analogy","mnemonic","recall","visual","technique"] },
  { slug: "flashcards",         title: "Flashcard Studio",       subtitle: "Active recall, anytime.",               cat: "PRACTISE", keywords: ["flashcard","card","flip","active","recall","spaced","repetition"] },
  { slug: "exam-sim",           title: "Exam Simulator",         subtitle: "Full timed mock exam.",                 cat: "PRACTISE", keywords: ["exam","simulator","timed","mock","full","test","cbse","jee","ib","sat"] },
  { slug: "exam-day",           title: "Exam-Day Mode",          subtitle: "Morning of the paper. Just the gaps.",  cat: "PRACTISE", keywords: ["exam","day","morning","gap","missed","wrong","sweep","final","revision","lock","calm","last","minute"] },
  { slug: "forgetting-forecast",title: "Forgetting Forecast",    subtitle: "See when you'll forget.",               cat: "PRACTISE", keywords: ["forget","forgetting","decay","ebbinghaus","curve","review","interval"] },
  { slug: "calibration",        title: "Confidence Calibrator",  subtitle: "Know what you actually know.",          cat: "PRACTISE", keywords: ["confidence","calibration","blind","spot","self","assess","overconfidence"] },
  // "dna" merged into post-exam (?tab=dna) and "cremator" into exam-triage
  // (?tab=cremator) — old routes 301 in next.config.mjs; keywords live on
  // the surviving entries.
  { slug: "paper-pattern",      title: "Paper Pattern Analyser", subtitle: "Decode what examiners want.",                       cat: "PRACTISE", keywords: ["paper","pattern","examiner","question","type","frequency","mark","allocation"] },
  { slug: "paper-autopsy",      title: "Paper Autopsy",          subtitle: "Dissect every mark you lost.",                     cat: "PRACTISE", keywords: ["paper","autopsy","answer","mark","lost","error","subtopic","drill","breakdown"] },
  { slug: "marks-obituary",     title: "Marks Obituary",         subtitle: "Write the obituary. Get the autopsy.",             cat: "PRACTISE", keywords: ["marks","obituary","coroner","cause","death","lost","prevention","forensic"] },
  { slug: "panic-triage",       title: "Paper Panic Triage",     subtitle: "2AM before the exam — what to do right now.",      cat: "PRACTISE", keywords: ["panic","triage","night","before","crunch","last","minute","rescue","plan"] },
  { slug: "marks-forensics",    title: "Marks Forensics",        subtitle: "Paste your answer. Know exactly which line lost you marks.", cat: "PRACTISE", keywords: ["marks","forensics","answer","line","lost","mark","scheme","breakdown"] },
  { slug: "paper-trauma",       title: "Paper Trauma Map",       subtitle: "Find the questions that broke you — and why you'll see them again.", cat: "PRACTISE", keywords: ["paper","trauma","mock","questions","broke","pattern","neutralise","results"] },

  // ── FUTURE (4) ───────────────────────────────────────────────────────────
  { slug: "admissions", title: "Admissions Engine", subtitle: "Your real odds. 60 universities.",    cat: "FUTURE",   keywords: ["admissions","university","odds","probability","college","uni","match","career","subject","path","future","applications","prep"] },
  { slug: "resume",     title: "Resume Builder",    subtitle: "For applications, not LinkedIn.",     cat: "FUTURE",   keywords: ["resume","cv","application","university","college","internship"] },
  { slug: "interview",  title: "Interview Coach",   subtitle: "Practice. Get scored. Improve.",      cat: "FUTURE",   keywords: ["interview","practice","score","coach","job"] },
  { slug: "gpa-sim",    title: "GPA Simulator",     subtitle: "Simulate your GPA trajectory.",       cat: "FUTURE",   keywords: ["gpa","grade","simulate","trajectory","target","percentage","weighted"] },

  // ── TRACK (9) ────────────────────────────────────────────────────────────
  { slug: "grade-tracker",  title: "Grade Tracker",         subtitle: "Marks, score, heatmap, debrief.",   cat: "TRACK",    keywords: ["marks","grade","predict","weighted","cbse","percentage","score","ledger","readiness","index","metric","rating","peer","heatmap","debrief"] },
  { slug: "rooms",          title: "Study Rooms",           subtitle: "Silent accountability.",            cat: "TRACK",    keywords: ["room","study","accountability","partner","timer","streak"] },
  { slug: "compare",        title: "Comparison Chart",      subtitle: "Any concepts, side by side.",       cat: "TRACK",    keywords: ["compare","contrast","concept","topic","side","difference"] },
  { slug: "source",         title: "Source Analyser",       subtitle: "Analyse any source.",               cat: "TRACK",    keywords: ["source","primary","secondary","origin","purpose","value","limitation","context"] },
  { slug: "case-study",     title: "Case Study Decoder",    subtitle: "Deconstruct any case study.",       cat: "TRACK",    keywords: ["case","study","business","deconstruct","framework","analysis","lesson"] },
  { slug: "timeline",       title: "Timeline Builder",      subtitle: "Build any historical timeline.",    cat: "TRACK",    keywords: ["timeline","chronology","history","event","sequence","period","date"] },
  { slug: "study-guide",    title: "Study Guide Generator", subtitle: "One topic. One clean guide.",       cat: "TRACK",    keywords: ["study","guide","generate","topic","notes","key","points","definitions","questions"] },
  { slug: "analysis-hub",   title: "Analysis Hub",          subtitle: "Analyse anything deeply.",          cat: "TRACK",    keywords: ["analysis","analyse","deep","text","data","event","concept","academic","breakdown"] },
  { slug: "silent-topics",  title: "Silent Topic Finder",   subtitle: "Find what you've been avoiding.",   cat: "TRACK",    keywords: ["silent","topic","avoid","map","syllabus","dodging","reentry","cinnabar","gap"] },
  { slug: "personalise",    title: "Personalise",           subtitle: "Your study profile.",               cat: "TRACK",    keywords: ["personalise","profile","grade","board","subject","preference","tailor","settings"] },
]
