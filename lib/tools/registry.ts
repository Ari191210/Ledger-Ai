// The tool registry — single source of truth for /tools, /tools/[slug],
// and (later) the command palette.
//
// Cut from 59 to 25 on 2026-09-04 — the full 59 was quantity over quality:
// a grid of unbuilt tools reads as a feature-list flex, not a product.
// This is the real launch set: the 10 flagship "signature" tools plus the
// strongest of the rest, spread thin but deliberately across categories so
// the core loop (plan -> learn -> practise -> track) stays intact. The
// other 34 aren't deleted from history — see git commit a2f41c9 — they
// come back deliberately, one at a time, once these 25 are actually good.
//
// kind: "ai"   — calls the AI endpoint (lib/onboarding-aware prompt)
//       "stub" — local/UI only, no model call
// signature: the flagship tools unique to StudyLedger, called out in nav /
//            marketing. Everything else is still real, just not the hook.
// icon: a distinct Lucide icon per tool.

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
  Sigma,
  CheckSquare,
  PenSquare,
  FileCheck,
  Layers,
  RotateCcw,
  ClipboardCheck,
  Dumbbell,
  Zap,
  Dna,
  Briefcase,
  BarChart3,
  Megaphone,
  Grid3x3,
  type LucideIcon,
} from "lucide-react";

export type ToolCategory = "plan" | "learn" | "write" | "practise" | "future" | "track";

export const CATEGORIES: { id: ToolCategory; label: string; blurb: string; icon: LucideIcon }[] = [
  { id: "plan", label: "Plan", blurb: "organise the time you have", icon: CalendarDays },
  { id: "learn", label: "Learn", blurb: "build understanding", icon: NotebookPen },
  { id: "write", label: "Write", blurb: "produce written work", icon: PenSquare },
  { id: "practise", label: "Practise", blurb: "drill and test", icon: Dumbbell },
  { id: "future", label: "Future", blurb: "careers and admissions", icon: Briefcase },
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
  // ── plan (7, all signature) ─────────────────────────────────────────
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

  // ── learn (5) ─────────────────────────────────────────────────────
  { slug: "notes", name: "Notes", category: "learn", kind: "ai", icon: NotebookPen,
    blurb: "Turn raw notes into structured, exam-ready summaries." },
  { slug: "doubt", name: "Doubt Solver", category: "learn", kind: "ai", icon: HelpCircle,
    blurb: "Ask a specific question, get a specific answer — no fluff." },
  { slug: "tutor", name: "Tutor", category: "learn", kind: "ai", icon: MessageCircle,
    blurb: "A conversational walkthrough of a concept you're stuck on." },
  { slug: "syllabus", name: "Syllabus Tracker", category: "learn", kind: "ai", icon: ListTree,
    blurb: "Break your syllabus into topics and mark what's covered." },
  { slug: "formula", name: "Formula Sheet", category: "learn", kind: "ai", icon: Sigma,
    blurb: "Auto-built formula sheet for a subject or chapter." },

  // ── write (3) ─────────────────────────────────────────────────────
  { slug: "essay-grader", name: "Essay Grader", category: "write", kind: "ai", icon: CheckSquare,
    blurb: "Rubric-based feedback on an essay before you submit it." },
  { slug: "assignment", name: "Assignment Helper", category: "write", kind: "ai", icon: PenSquare,
    blurb: "Structure and draft an assignment from a prompt." },
  { slug: "model-answer", name: "Model Answer", category: "write", kind: "ai", icon: FileCheck,
    blurb: "See what a full-marks answer to a question looks like." },

  // ── practise (7, 2 signature) ─────────────────────────────────────
  { slug: "spaced-review", name: "Spaced Review", category: "practise", kind: "stub", signature: true, icon: RotateCcw,
    blurb: "Spaced-repetition queue built from your actual mistakes." },
  { slug: "mistake-dna", name: "Mistake DNA", category: "practise", kind: "stub", signature: true, icon: Dna,
    blurb: "Pattern-analyses your recurring mistakes across subjects." },
  { slug: "flashcards", name: "Flashcards", category: "practise", kind: "ai", icon: Layers,
    blurb: "Auto-generated flashcards from any topic or note." },
  { slug: "exam-sim", name: "Exam Simulator", category: "practise", kind: "ai", icon: Timer,
    blurb: "A timed, full-length practice exam under real conditions." },
  { slug: "practice", name: "Practice Sets", category: "practise", kind: "ai", icon: Dumbbell,
    blurb: "Generate a practice set targeted at your weak topics." },
  { slug: "mark-scheme", name: "Mark Scheme Analyzer", category: "practise", kind: "ai", icon: ClipboardCheck,
    blurb: "See exactly how marks are awarded on a past question." },
  { slug: "crunch", name: "Crunch Mode", category: "practise", kind: "ai", icon: Zap,
    blurb: "Last 48 hours before an exam — the highest-yield revision list." },

  // ── future (1) ────────────────────────────────────────────────────
  { slug: "career", name: "Career Explorer", category: "future", kind: "ai", icon: Briefcase,
    blurb: "Explore careers that fit your subjects and interests." },

  // ── track (2, 1 signature) ────────────────────────────────────────
  { slug: "peer-heatmap", name: "Peer Heatmap", category: "track", kind: "stub", signature: true, icon: Grid3x3,
    blurb: "Anonymised view of what topics peers are struggling with." },
  { slug: "coach", name: "Coach", category: "track", kind: "ai", icon: Megaphone,
    blurb: "A weekly briefing on what changed and what to do about it." },
];

export function toolsByCategory(category: ToolCategory): Tool[] {
  return TOOLS.filter((t) => t.category === category);
}

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
