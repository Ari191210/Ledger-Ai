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
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from("header", { opacity: 0, y: -18, duration: 0.5 })
      .from("main",   { opacity: 0, y: 28,  duration: 0.65 }, "-=0.3");

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
    <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

      {/* Main panel — always mounted, state always preserved */}
      <div ref={mainRef} style={{
        flex: 1, overflowY: "auto", minWidth: 0,
        borderRight: splitSlug ? "2px solid var(--ink)" : "none",
      }}>
        {children}
      </div>

      {/* Split panel — conditionally shown, isolated in iframe so it never shares state */}
      {splitSlug && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
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
