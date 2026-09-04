// The tool registry — single source of truth for /tools, /tools/[slug],
// and (later) the command palette. Adapted from the pre-rebuild product
// (60 tools, validated) with the redundant "Score" tool dropped — that's
// the /score page now, not a tool.
//
// kind: "ai"   — calls the AI endpoint (lib/onboarding-aware prompt)
//       "stub" — local/UI only, no model call
// signature: the flagship tools unique to StudyLedger, called out in nav /
//            marketing. Everything else is still real, just not the hook.
// icon: a distinct Lucide icon per tool — the grid reads as 59 marks, not
//       6 repeated category icons.

import {
  CalendarDays,
  Timer,
  Repeat,
  AlarmClock,
  Flag,
  Gauge,
  Sunrise,
  NotebookPen,
  HelpCircle,
  MessageCircle,
  ListTree,
  GitBranch,
  Share2,
  Sigma,
  Languages,
  Type,
  PenSquare,
  CheckSquare,
  User,
  LayoutTemplate,
  Search,
  Presentation,
  Swords,
  Quote,
  FlaskConical,
  MessagesSquare,
  SpellCheck,
  FileCheck,
  FileStack,
  Layers,
  RotateCcw,
  ClipboardCheck,
  Scissors,
  Dumbbell,
  Zap,
  Dna,
  TrendingUp,
  Building2,
  ArrowLeftRight,
  Puzzle,
  Briefcase,
  GraduationCap,
  FileText,
  Mic,
  SlidersHorizontal,
  Landmark,
  Calculator,
  BarChart3,
  Megaphone,
  Users,
  Grid3x3,
  GitCompare,
  ShieldCheck,
  FolderOpen,
  History,
  BookMarked,
  BookOpenCheck,
  Link2,
  type LucideIcon,
} from "lucide-react";

export type ToolCategory = "plan" | "learn" | "write" | "practise" | "future" | "track";

export const CATEGORIES: { id: ToolCategory; label: string; blurb: string; icon: LucideIcon }[] = [
  { id: "plan", label: "Plan", blurb: "organise the time you have", icon: CalendarDays },
  { id: "learn", label: "Learn", blurb: "build understanding", icon: NotebookPen },
  { id: "write", label: "Write", blurb: "produce written work", icon: PenSquare },
  { id: "practise", label: "Practise", blurb: "drill and test", icon: Dumbbell },
  { id: "future", label: "Future", blurb: "careers and admissions", icon: GraduationCap },
  { id: "track", label: "Track", blurb: "measure and hold accountable", icon: BarChart3 },
];

export type Tool = {
  slug: string;
  name: string;
  category: ToolCategory;
  blurb: string;
  kind: "ai" | "stub";
  icon: LucideIcon;
  signature?: boolean;
};

export const TOOLS: Tool[] = [
  // ── plan ──────────────────────────────────────────────────────────
  { slug: "planner", name: "Planner", category: "plan", kind: "ai", signature: true, icon: CalendarDays,
    blurb: "Daily and weekly study plan built from your syllabus and deadlines." },
  { slug: "focus", name: "Focus", category: "plan", kind: "ai", signature: true, icon: Timer,
    blurb: "Pomodoro timer wired to your streak and Ledger Score." },
  { slug: "habits", name: "Habits", category: "plan", kind: "ai", signature: true, icon: Repeat,
    blurb: "Track the study habits that actually move your score." },
  { slug: "deadlines", name: "Deadlines", category: "plan", kind: "ai", signature: true, icon: AlarmClock,
    blurb: "Every submission, test, and exam date in one countdown list." },
  { slug: "exam-planner", name: "Exam Planner", category: "plan", kind: "ai", signature: true, icon: Flag,
    blurb: "Reverse-planned prep schedule counting back from your target exam." },
  { slug: "debt-meter", name: "Debt Meter", category: "plan", kind: "stub", signature: true, icon: Gauge,
    blurb: "How far behind syllabus you are, in one honest number." },
  { slug: "circadian", name: "Circadian", category: "plan", kind: "stub", signature: true, icon: Sunrise,
    blurb: "Recommends what to study when, based on your energy patterns." },

  // ── learn ─────────────────────────────────────────────────────────
  { slug: "notes", name: "Notes", category: "learn", kind: "ai", icon: NotebookPen,
    blurb: "Turn raw notes into structured, exam-ready summaries." },
  { slug: "doubt", name: "Doubt Solver", category: "learn", kind: "ai", icon: HelpCircle,
    blurb: "Ask a specific question, get a specific answer — no fluff." },
  { slug: "tutor", name: "Tutor", category: "learn", kind: "ai", icon: MessageCircle,
    blurb: "A conversational walkthrough of a concept you're stuck on." },
  { slug: "syllabus", name: "Syllabus Tracker", category: "learn", kind: "ai", icon: ListTree,
    blurb: "Break your syllabus into topics and mark what's covered." },
  { slug: "mindmap", name: "Mindmap", category: "learn", kind: "ai", icon: GitBranch,
    blurb: "Generate a mind map from a topic or a chunk of notes." },
  { slug: "concept-web", name: "Concept Web", category: "learn", kind: "ai", icon: Share2,
    blurb: "See how concepts across chapters connect to each other." },
  { slug: "formula", name: "Formula Sheet", category: "learn", kind: "ai", icon: Sigma,
    blurb: "Auto-built formula sheet for a subject or chapter." },
  { slug: "language-analyzer", name: "Language Analyzer", category: "learn", kind: "ai", icon: Languages,
    blurb: "Breaks down a passage's structure, tone, and devices." },
  { slug: "vocab", name: "Vocab Builder", category: "learn", kind: "ai", icon: Type,
    blurb: "Targeted vocabulary drills for your board and exam." },

  // ── write ─────────────────────────────────────────────────────────
  { slug: "assignment", name: "Assignment Helper", category: "write", kind: "ai", icon: PenSquare,
    blurb: "Structure and draft an assignment from a prompt." },
  { slug: "essay-grader", name: "Essay Grader", category: "write", kind: "ai", icon: CheckSquare,
    blurb: "Rubric-based feedback on an essay before you submit it." },
  { slug: "personal-statement", name: "Personal Statement", category: "write", kind: "ai", icon: User,
    blurb: "Build and refine a personal statement or SOP." },
  { slug: "essay-blueprint", name: "Essay Blueprint", category: "write", kind: "ai", icon: LayoutTemplate,
    blurb: "Outline an essay's structure before you write a word." },
  { slug: "research", name: "Research Assistant", category: "write", kind: "ai", icon: Search,
    blurb: "Organise sources and findings for a research task." },
  { slug: "presentation", name: "Presentation Builder", category: "write", kind: "ai", icon: Presentation,
    blurb: "Turn a topic into a slide-by-slide presentation outline." },
  { slug: "debate", name: "Debate Prep", category: "write", kind: "ai", icon: Swords,
    blurb: "Arguments and rebuttals for both sides of a motion." },
  { slug: "citation", name: "Citation Generator", category: "write", kind: "stub", icon: Quote,
    blurb: "Format citations in APA, MLA, or Chicago style." },
  { slug: "lab-report", name: "Lab Report", category: "write", kind: "ai", icon: FlaskConical,
    blurb: "Structure a lab report from your observations and data." },
  { slug: "argument", name: "Argument Builder", category: "write", kind: "ai", icon: MessagesSquare,
    blurb: "Build a structured argument with evidence and counters." },
  { slug: "grammar", name: "Grammar Checker", category: "write", kind: "ai", icon: SpellCheck,
    blurb: "Line edit for grammar, clarity, and tone." },
  { slug: "model-answer", name: "Model Answer", category: "write", kind: "ai", icon: FileCheck,
    blurb: "See what a full-marks answer to a question looks like." },

  // ── practise ──────────────────────────────────────────────────────
  { slug: "papers", name: "Past Papers", category: "practise", kind: "stub", icon: FileStack,
    blurb: "Board and exam past papers, organised by year and topic." },
  { slug: "flashcards", name: "Flashcards", category: "practise", kind: "ai", icon: Layers,
    blurb: "Auto-generated flashcards from any topic or note." },
  { slug: "spaced-review", name: "Spaced Review", category: "practise", kind: "stub", signature: true, icon: RotateCcw,
    blurb: "Spaced-repetition queue built from your actual mistakes." },
  { slug: "exam-sim", name: "Exam Simulator", category: "practise", kind: "ai", icon: Timer,
    blurb: "A timed, full-length practice exam under real conditions." },
  { slug: "mark-scheme", name: "Mark Scheme Analyzer", category: "practise", kind: "ai", icon: ClipboardCheck,
    blurb: "See exactly how marks are awarded on a past question." },
  { slug: "paper-dissector", name: "Paper Dissector", category: "practise", kind: "ai", icon: Scissors,
    blurb: "Breaks a past paper into topics, weightage, and difficulty." },
  { slug: "practice", name: "Practice Sets", category: "practise", kind: "ai", icon: Dumbbell,
    blurb: "Generate a practice set targeted at your weak topics." },
  { slug: "crunch", name: "Crunch Mode", category: "practise", kind: "ai", icon: Zap,
    blurb: "Last 48 hours before an exam — the highest-yield revision list." },
  { slug: "mistake-dna", name: "Mistake DNA", category: "practise", kind: "stub", signature: true, icon: Dna,
    blurb: "Pattern-analyses your recurring mistakes across subjects." },
  { slug: "predict", name: "Predict", category: "practise", kind: "ai", icon: TrendingUp,
    blurb: "Likely topics for your next exam, from historical patterns." },
  { slug: "memory-palace", name: "Memory Palace", category: "practise", kind: "ai", icon: Building2,
    blurb: "Build a memory-palace mnemonic for a list you need to retain." },
  { slug: "analogy", name: "Analogy Generator", category: "practise", kind: "ai", icon: ArrowLeftRight,
    blurb: "Explains a hard concept through a concrete analogy." },
  { slug: "exam-strategy", name: "Exam Strategy", category: "practise", kind: "ai", icon: Puzzle,
    blurb: "Time allocation and question-order strategy for exam day." },

  // ── future ────────────────────────────────────────────────────────
  { slug: "career", name: "Career Explorer", category: "future", kind: "ai", icon: Briefcase,
    blurb: "Explore careers that fit your subjects and interests." },
  { slug: "admissions", name: "Admissions Guide", category: "future", kind: "ai", icon: GraduationCap,
    blurb: "What each admission process actually requires, and when." },
  { slug: "resume", name: "Resume Builder", category: "future", kind: "stub", icon: FileText,
    blurb: "Build a resume for internships, programs, or applications." },
  { slug: "interview", name: "Interview Prep", category: "future", kind: "ai", icon: Mic,
    blurb: "Mock interview questions for a program or role." },
  { slug: "subject-picker", name: "Subject Picker", category: "future", kind: "ai", icon: SlidersHorizontal,
    blurb: "Stream and elective advice based on your goals." },
  { slug: "uni-match", name: "Uni Match", category: "future", kind: "ai", icon: Landmark,
    blurb: "Universities and programs that fit your profile." },
  { slug: "gpa-sim", name: "GPA Simulator", category: "future", kind: "stub", icon: Calculator,
    blurb: "Model how future grades affect your overall GPA." },

  // ── track ─────────────────────────────────────────────────────────
  { slug: "marks", name: "Marks Tracker", category: "track", kind: "stub", icon: BarChart3,
    blurb: "Log test and exam marks, see the trend over time." },
  { slug: "coach", name: "Coach", category: "track", kind: "ai", icon: Megaphone,
    blurb: "A weekly briefing on what changed and what to do about it." },
  { slug: "rooms", name: "Study Rooms", category: "track", kind: "stub", icon: Users,
    blurb: "Real-time accountability rooms with a bail pact." },
  { slug: "peer-heatmap", name: "Peer Heatmap", category: "track", kind: "stub", signature: true, icon: Grid3x3,
    blurb: "Anonymised view of what topics peers are struggling with." },
  { slug: "compare", name: "Compare", category: "track", kind: "ai", icon: GitCompare,
    blurb: "Benchmark your pace against your own goals, not other people." },
  { slug: "source", name: "Source Verifier", category: "track", kind: "ai", icon: ShieldCheck,
    blurb: "Checks whether a source is reliable enough to cite." },
  { slug: "case-study", name: "Case Study Bank", category: "track", kind: "ai", icon: FolderOpen,
    blurb: "Relevant case studies for a topic, subject, or essay." },
  { slug: "timeline", name: "Timeline Builder", category: "track", kind: "ai", icon: History,
    blurb: "Turn a sequence of events into a visual timeline." },
  { slug: "reading", name: "Reading Tracker", category: "track", kind: "stub", icon: BookMarked,
    blurb: "Track assigned and extra reading against deadlines." },
  { slug: "study-guide", name: "Study Guide", category: "track", kind: "ai", icon: BookOpenCheck,
    blurb: "Consolidated study guide generated for an upcoming test." },
  { slug: "concept-connect", name: "Concept Connect", category: "track", kind: "ai", icon: Link2,
    blurb: "Links a new concept back to what you already know." },
];

export function toolsByCategory(category: ToolCategory): Tool[] {
  return TOOLS.filter((t) => t.category === category);
}

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
