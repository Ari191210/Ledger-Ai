"use client";
import { useUI } from "./ui-context";

const TOOL_NAMES: Record<string, string> = {
  planner: "Smart Study Planner", marks: "Marks Predictor", notes: "Notes Simplifier",
  doubt: "Doubt Solver", focus: "Focus Dashboard", career: "Career Pathfinder",
  papers: "Past Papers", assignment: "Assignment Rescue", resume: "Resume Builder",
  rooms: "Study Rooms", tutor: "Topic Tutor", dna: "Mistake DNA",
  crunch: "48-Hour Crunch", syllabus: "Syllabus Parser", formula: "Formula Sheet",
  admissions: "Admissions Engine", flashcards: "AI Flashcards", "essay-grader": "Essay Grader",
  "personal-statement": "Personal Statement", interview: "Interview Coach",
  mindmap: "Mind Map Builder", citation: "Citation Generator", presentation: "Presentation Planner",
  debate: "Debate Coach", habits: "Habit Tracker", deadlines: "Deadline Hub",
  "exam-sim": "Exam Simulator", "gpa-sim": "GPA Simulator", vocab: "Vocabulary Vault",
  research: "Research Assistant", score: "Ledger Score™",
};

export default function SplitView({ children }: { children: React.ReactNode }) {
  const { splitSlug, setSplitSlug } = useUI();

  if (!splitSlug) return <>{children}</>;

  const toolName = TOOL_NAMES[splitSlug] || splitSlug;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>
      {/* Left panel — current tool */}
      <div style={{ flex: 1, overflowY: "auto", borderRight: "2px solid var(--ink)", minWidth: 0 }}>
        {children}
      </div>

      {/* Right panel — second tool in iframe */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Split panel header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 36, borderBottom: "1px solid var(--ink)", background: "var(--paper-2)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="mono" style={{ fontSize: 9, color: "#1a6091" }}>⊞ SPLIT</span>
            <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{toolName}</span>
          </div>
          <button
            onClick={() => setSplitSlug(null)}
            style={{ fontFamily: "var(--mono)", fontSize: 9, background: "none", border: "1px solid var(--rule)", padding: "3px 10px", cursor: "pointer", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
            ✕ Close split
          </button>
        </div>

        {/* Iframe */}
        <iframe
          key={splitSlug}
          src={`/tools/${splitSlug}`}
          style={{ flex: 1, border: "none", width: "100%", display: "block" }}
          title={toolName}
        />
      </div>
    </div>
  );
}
