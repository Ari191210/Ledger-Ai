"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useUI } from "./ui-context";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TOOL_NAMES: Record<string, string> = {
  planner: "Smart Study Planner",     marks: "Marks Predictor",
  notes: "Notes Simplifier",          doubt: "Doubt Solver",
  focus: "Focus Dashboard",           career: "Career Pathfinder",
  papers: "Past Papers",              assignment: "Assignment Rescue",
  resume: "Resume Builder",           rooms: "Study Rooms",
  tutor: "Topic Tutor",               dna: "Mistake DNA",
  crunch: "48-Hour Crunch",           syllabus: "Syllabus Parser",
  formula: "Formula Sheet",           admissions: "Admissions Engine",
  flashcards: "AI Flashcards",        "essay-grader": "Essay Grader",
  "personal-statement": "Personal Statement", interview: "Interview Coach",
  mindmap: "Mind Map Builder",        citation: "Citation Generator",
  presentation: "Presentation Planner", debate: "Debate Coach",
  habits: "Habit Tracker",            deadlines: "Deadline Hub",
  "exam-sim": "Exam Simulator",       "gpa-sim": "GPA Simulator",
  vocab: "Vocabulary Vault",          research: "Research Assistant",
  score: "Ledger Score™",             coach: "AI Study Coach",
  "mark-scheme": "Mark Scheme Trainer", "subject-picker": "Subject Picker",
  "essay-blueprint": "Essay Blueprint", "concept-web": "Concept Web",
  "exam-planner": "Exam Season Planner", "paper-dissector": "Paper Dissector",
  "lang-analyzer": "Language Analyzer", "lab-report": "Lab Report Builder",
  "uni-match": "University Match",    compare: "Comparison Chart",
  source: "Source Analyzer",          practice: "Practice Problems",
  argument: "Argument Builder",
};

export default function SplitView({ children }: { children: React.ReactNode }) {
  const { splitSlug, setSplitSlug } = useUI();
  const mainRef  = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Re-runs on every route change so each tool page gets a fresh entrance.
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // 1. Header slides down
    tl.fromTo(
      "header",
      { autoAlpha: 0, y: -22 },
      { autoAlpha: 1, y: 0, duration: 0.44, clearProps: "opacity,transform,visibility" }
    );

    // 2. Cascade the content panels.
    // Most tool pages: main > div (grid) > [input, output].
    // If main has exactly one child whose children are the real panels, go one
    // level deeper so input and output enter with separate stagger beats.
    // Fallback: animate direct children of main as a single beat.
    const mainEl = mainRef.current?.querySelector<HTMLElement>("main");
    if (mainEl) {
      const direct = Array.from(mainEl.children) as HTMLElement[];
      const cascadeTargets: HTMLElement[] =
        direct.length === 1 && direct[0].children.length > 1
          ? (Array.from(direct[0].children) as HTMLElement[])
          : direct;

      tl.fromTo(
        cascadeTargets,
        { autoAlpha: 0, y: 48, scale: 0.983, transformOrigin: "top center" },
        {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.68,
          stagger: 0.13,
          clearProps: "opacity,transform,visibility,scale",
        },
        "-=0.26"
      );
    }

    ScrollTrigger.batch(".gsap-reveal", {
      onEnter: els => gsap.from(els, {
        opacity: 0, y: 20, duration: 0.5, stagger: 0.07,
        ease: "power2.out", clearProps: "opacity,transform",
      }),
      start: "top 90%", once: true,
    });
  }, { scope: mainRef, dependencies: [pathname], revertOnUpdate: true });

  // Always render the same container — never an early return with a different tree.
  // If we swapped to <>{children}</> when splitSlug is null, React would unmount/remount
  // the main tool on every split toggle, destroying all generated results.
  return (
    // tool-split-wrap: uses 100dvh so mobile browser address-bar changes don't overflow.
    // nav is 52px; 49px was a long-standing off-by-one.
    <div className="tool-split-wrap">

      {/* Main panel — always mounted, state always preserved */}
      <div ref={mainRef} style={{
        flex: 1, overflowY: "auto", minWidth: 0,
        borderRight: splitSlug ? "2px solid var(--ink)" : "none",
      }}>
        {children}
      </div>

      {/* Split panel — hidden on mobile (mob-hide), isolated via iframe on desktop */}
      {splitSlug && (
        <div className="mob-hide" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 36, borderBottom: "1px solid var(--ink)", background: "var(--paper-2)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="mono" style={{ fontSize: 9, color: "#1a6091" }}>⊞ SPLIT</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                {TOOL_NAMES[splitSlug] || splitSlug}
              </span>
            </div>
            <button
              onClick={() => setSplitSlug(null)}
              style={{ fontFamily: "var(--mono)", fontSize: 9, background: "none", border: "1px solid var(--rule)", padding: "3px 10px", cursor: "pointer", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
              ✕ Close split
            </button>
          </div>
          <iframe
            key={splitSlug}
            src={`/tools/${splitSlug}`}
            style={{ flex: 1, border: "none", width: "100%", display: "block" }}
            title={TOOL_NAMES[splitSlug] || splitSlug}
          />
        </div>
      )}
    </div>
  );
}
