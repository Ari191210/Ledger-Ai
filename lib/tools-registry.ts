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
  { slug: "planner",          title: "Smart Study Planner",     subtitle: "Subjects in. Timetable out.",                cat: "PLAN",     keywords: ["schedule","timetable","plan","day"] },
  { slug: "focus",            title: "Focus Dashboard",         subtitle: "Pomodoro, streaks, tasks.",                  cat: "PLAN",     keywords: ["pomodoro","timer","streak","session"] },
  { slug: "habits",           title: "Habit Tracker",           subtitle: "Build study habits that stick.",             cat: "PLAN",     keywords: ["habit","heatmap","streak","daily"] },
  { slug: "deadlines",        title: "Deadline Hub",            subtitle: "Every deadline. Never miss one.",            cat: "PLAN",     keywords: ["deadline","exam","assignment","countdown"] },
  { slug: "circadian",        title: "Circadian Study Window",  subtitle: "Study at your biological peak.",             cat: "PLAN",     keywords: ["sleep","chronotype","peak","circadian"] },
  { slug: "brain-budget",     title: "Brain Budget",            subtitle: "Allocate cognitive energy wisely.",          cat: "PLAN",     keywords: ["energy","cognitive","budget","rest"] },
  { slug: "study-command",    title: "Study Command",           subtitle: "Command centre for your study day.",         cat: "PLAN",     keywords: ["dashboard","command","overview","today"] },
  { slug: "focus-lab",        title: "Focus Lab",               subtitle: "Deep work without distraction.",             cat: "PLAN",     keywords: ["deep","work","distraction","focus"] },

  { slug: "notes",            title: "Study Engine",            subtitle: "Simplify chapters. Get a full lesson.",      cat: "LEARN",    keywords: ["notes","simplify","lesson","chapter","summary"] },
  { slug: "doubt",            title: "Doubt Solver",            subtitle: "A question, a worked answer.",               cat: "LEARN",    keywords: ["doubt","question","solve","answer","help"] },
  { slug: "syllabus",         title: "Syllabus Parser",         subtitle: "Upload PDF. Get your year mapped.",          cat: "LEARN",    keywords: ["syllabus","pdf","upload","parse","curriculum"] },
  { slug: "formula",          title: "Formula Sheet",           subtitle: "Chapter → complete reference card.",         cat: "LEARN",    keywords: ["formula","equation","physics","chemistry","maths"] },
  { slug: "mindmap",          title: "Mind Map Builder",        subtitle: "Any topic. Full concept breakdown.",         cat: "LEARN",    keywords: ["mindmap","concept","branch","visual","map"] },
  { slug: "vocab",            title: "Vocabulary Vault",        subtitle: "Deep word learning with memory hooks.",      cat: "LEARN",    keywords: ["vocab","word","definition","etymology","language"] },
  { slug: "lang-analyzer",    title: "Language Analyzer",       subtitle: "Deep linguistic analysis of any text.",      cat: "LEARN",    keywords: ["language","literary","device","tone","analyse"] },
  { slug: "formula-recall",   title: "Formula Recall",          subtitle: "Drill formulas until they stick.",           cat: "LEARN",    keywords: ["formula","recall","drill","memory","equation"] },
  { slug: "revision-intel",   title: "Revision Intelligence",   subtitle: "Smart topic prioritisation.",                cat: "LEARN",    keywords: ["revision","priority","topic","smart","weak"] },
  { slug: "analysis-hub",     title: "Analysis Hub",            subtitle: "Analyse any concept in depth.",              cat: "LEARN",    keywords: ["analysis","concept","depth","breakdown"] },
  { slug: "language-lab",     title: "Language Lab",            subtitle: "Language skills across subjects.",           cat: "LEARN",    keywords: ["language","skills","writing","reading"] },

  { slug: "citation",         title: "Citation Generator",      subtitle: "APA, MLA, Chicago, Harvard.",                cat: "WRITE",    keywords: ["citation","reference","bibliography","apa","mla","harvard"] },
  { slug: "presentation",     title: "Presentation Planner",    subtitle: "Topic → full slide deck with notes.",        cat: "WRITE",    keywords: ["presentation","slides","speaker","notes","deck"] },
  { slug: "debate",           title: "Debate Coach",            subtitle: "Any motion. Arguments both ways.",           cat: "WRITE",    keywords: ["debate","argument","rebuttal","motion","for","against"] },
  { slug: "research",         title: "Research Hub",            subtitle: "Research any topic. Plan any assignment.",   cat: "WRITE",    keywords: ["research","essay","plan","outline","assignment"] },
  { slug: "essay-blueprint",  title: "Essay Workshop",          subtitle: "Plan. Argue. Grade. One page.",              cat: "WRITE",    keywords: ["essay","blueprint","grade","argue","workshop","thesis"] },
  { slug: "lab-report",       title: "Lab Report Writer",       subtitle: "Hypothesis to discussion, complete.",        cat: "WRITE",    keywords: ["lab","report","hypothesis","experiment","science"] },
  { slug: "grammar",          title: "Writing Polish",          subtitle: "Grammar, style, and personal statement.",    cat: "WRITE",    keywords: ["grammar","writing","style","personal","statement","polish"] },
  { slug: "model-answer",     title: "Model Answer Factory",    subtitle: "Produce full-marks exemplars.",              cat: "WRITE",    keywords: ["model","answer","exemplar","marks","question"] },
  { slug: "reference-builder",title: "Reference Builder",       subtitle: "Build your bibliography fast.",              cat: "WRITE",    keywords: ["reference","bibliography","source","build"] },
  { slug: "writing-tools",    title: "Writing Tools",           subtitle: "All writing aids in one place.",             cat: "WRITE",    keywords: ["writing","tools","aid","prose","draft"] },
  { slug: "report-tools",     title: "Report Tools",            subtitle: "Structured reports for any subject.",        cat: "WRITE",    keywords: ["report","structure","subject","write"] },

  { slug: "papers",           title: "Past Papers",             subtitle: "CBSE, JEE, NEET, SAT, IB.",                 cat: "PRACTISE", keywords: ["past","paper","exam","cbse","jee","neet","sat","ib","mock"] },
  { slug: "dna",              title: "Mistake DNA",             subtitle: "See exactly where you go wrong.",           cat: "PRACTISE", keywords: ["mistake","error","wrong","analyse","dna","pattern"] },
  { slug: "crunch",           title: "48-Hour Crunch",          subtitle: "Exam tomorrow. Smart triage.",              cat: "PRACTISE", keywords: ["crunch","triage","urgent","48","tomorrow","revision"] },
  { slug: "flashcards",       title: "AI Flashcards",           subtitle: "Topic or notes → flip cards.",              cat: "PRACTISE", keywords: ["flashcard","flip","card","quiz","drill","spaced"] },
  { slug: "exam-planner",     title: "Revision Planner",        subtitle: "All your exams. Spaced revision built in.", cat: "PRACTISE", keywords: ["revision","planner","spaced","ebbinghaus","schedule"] },
  { slug: "mark-scheme",      title: "Question Decoder",        subtitle: "Mark schemes. Paper anatomy.",              cat: "PRACTISE", keywords: ["mark","scheme","decode","question","marks","examiner"] },
  { slug: "practice",         title: "Practice Suite",          subtitle: "Targeted questions. Timed exam mode.",      cat: "PRACTISE", keywords: ["practice","question","timed","exam","simulator","mcq"] },
  { slug: "predict",          title: "Question Predictor",      subtitle: "What will the examiner ask next?",          cat: "PRACTISE", keywords: ["predict","question","examiner","likelihood","next"] },
  { slug: "memory-palace",    title: "Memory Palace Builder",   subtitle: "Remember anything with Method of Loci.",    cat: "PRACTISE", keywords: ["memory","palace","loci","remember","memorise","method"] },
  { slug: "analogy",          title: "Analogy Engine",          subtitle: "Turn complexity into understanding.",        cat: "PRACTISE", keywords: ["analogy","understand","complex","metaphor","explain"] },
  { slug: "exam-strategy",    title: "Exam Strategy",           subtitle: "How to work the paper on exam day.",        cat: "PRACTISE", keywords: ["exam","strategy","day","technique","time","paper"] },
  { slug: "exam-debrief",     title: "Exam Debrief",            subtitle: "Analyse what went right and wrong.",        cat: "PRACTISE", keywords: ["debrief","exam","review","post","analysis"] },
  { slug: "post-exam",        title: "Post-Exam Review",        subtitle: "Learn from every exam you sit.",            cat: "PRACTISE", keywords: ["post","exam","review","learn","debrief"] },
  { slug: "half-life",        title: "Half-Life Drill",         subtitle: "Spaced repetition by forgetting curve.",    cat: "PRACTISE", keywords: ["spaced","repetition","forgetting","curve","drill"] },
  { slug: "paper-triage",     title: "Paper Triage",            subtitle: "Sort past papers by difficulty and topic.", cat: "PRACTISE", keywords: ["triage","paper","difficulty","sort","topic"] },
  { slug: "last-night",       title: "Last Night Prep",         subtitle: "Exam tomorrow. Cover the essentials.",      cat: "PRACTISE", keywords: ["last","night","tomorrow","prep","essentials","urgent"] },
  { slug: "recall-studio",    title: "Recall Studio",           subtitle: "Active recall for any topic.",              cat: "PRACTISE", keywords: ["recall","active","studio","retrieve","topic"] },
  { slug: "memory-toolkit",   title: "Memory Toolkit",          subtitle: "Techniques to make anything stick.",        cat: "PRACTISE", keywords: ["memory","toolkit","technique","stick","remember"] },

  { slug: "resume",           title: "Resume Builder",          subtitle: "For applications, not LinkedIn.",           cat: "FUTURE",   keywords: ["resume","cv","application","university","college","internship"] },
  { slug: "admissions",       title: "Admissions Engine",       subtitle: "Your real odds. 60 universities.",          cat: "FUTURE",   keywords: ["admissions","university","odds","probability","college"] },
  { slug: "interview",        title: "Interview Coach",         subtitle: "Practice. Get scored. Improve.",            cat: "FUTURE",   keywords: ["interview","practice","score","coach","university","job"] },
  { slug: "gpa-sim",          title: "GPA Simulator",           subtitle: "Model your grades. Plan your GPA.",         cat: "FUTURE",   keywords: ["gpa","grade","simulate","target","weighted","scale"] },
  { slug: "uni-match",        title: "Future Finder",           subtitle: "Universities, subjects, and your path.",    cat: "FUTURE",   keywords: ["university","match","career","subject","path","future"] },
  { slug: "uni-prep",         title: "University Prep",         subtitle: "Get ready for university life.",            cat: "FUTURE",   keywords: ["university","prep","ready","life","skills"] },
  { slug: "applications",     title: "Applications Tracker",    subtitle: "Track every application in one place.",     cat: "FUTURE",   keywords: ["application","track","deadline","university","college"] },

  { slug: "marks",            title: "Marks Predictor",         subtitle: "The math of your report card.",             cat: "TRACK",    keywords: ["marks","grade","predict","weighted","cbse","percentage"] },
  { slug: "rooms",            title: "Study Rooms",             subtitle: "Silent accountability.",                    cat: "TRACK",    keywords: ["room","study","accountability","partner","timer","streak"] },
  { slug: "coach",            title: "Academic Coach",          subtitle: "Personal guidance, any subject.",           cat: "TRACK",    keywords: ["coach","mentor","guide","strategy","subject","personal"] },
  { slug: "compare",          title: "Topic Comparer",          subtitle: "Two concepts. Side-by-side.",               cat: "TRACK",    keywords: ["compare","contrast","concept","topic","side","difference"] },
  { slug: "source",           title: "Text Analyst",            subtitle: "Source analysis and comprehension.",        cat: "TRACK",    keywords: ["source","text","opcvl","analysis","reading","comprehension"] },
  { slug: "case-study",       title: "Case Study Pro",          subtitle: "Business scenarios, fully analysed.",       cat: "TRACK",    keywords: ["case","study","business","swot","porter","analysis"] },
  { slug: "timeline",         title: "Timeline Builder",        subtitle: "History, chronologically mapped.",          cat: "TRACK",    keywords: ["timeline","history","event","date","chronological"] },
  { slug: "study-guide",      title: "Study Guide Builder",     subtitle: "Complete revision guide in minutes.",       cat: "TRACK",    keywords: ["study","guide","revision","summary","topic","chapter"] },
  { slug: "concept-connect",  title: "Concept Connect",         subtitle: "Bridge ideas across subjects.",             cat: "TRACK",    keywords: ["concept","connect","bridge","cross","subject","link"] },
  { slug: "score",            title: "Ledger Score",            subtitle: "Your real-time exam readiness.",            cat: "TRACK",    keywords: ["score","ledger","readiness","index","metric","rating"] },
  { slug: "debt-meter",       title: "Cognitive Debt Meter",    subtitle: "See what you owe your future self.",        cat: "TRACK",    keywords: ["debt","cognitive","meter","procrastination","cost"] },
  { slug: "peer-heatmap",     title: "Peer Heatmap",            subtitle: "Where students in your grade are stuck.",   cat: "TRACK",    keywords: ["peer","heatmap","struggle","class","grade","topic"] },
  { slug: "grade-tracker",    title: "Grade Tracker",           subtitle: "Track every score across subjects.",        cat: "TRACK",    keywords: ["grade","tracker","score","subject","history","trend"] },
  { slug: "research-suite",   title: "Research Suite",          subtitle: "Full research toolkit in one place.",       cat: "TRACK",    keywords: ["research","suite","toolkit","comprehensive"] },
  { slug: "circuit-breaker",  title: "Circuit Breaker",         subtitle: "Break bad study patterns.",                 cat: "TRACK",    keywords: ["circuit","break","pattern","habit","reset"] },
  { slug: "personalise",      title: "Personalise",             subtitle: "Customise your Ledger experience.",         cat: "TRACK",    keywords: ["personalise","customize","settings","profile","preference"] },
  { slug: "exam-triage",      title: "Exam Triage",             subtitle: "Prioritise topics under time pressure.",    cat: "TRACK",    keywords: ["triage","exam","priority","time","pressure","topic"] },
]
