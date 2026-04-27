"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "./ui-context";

const TOOLS = [
  { n: "01", slug: "planner",          full: "Smart Study Planner",  sub: "Subjects in. Timetable out."              },
  { n: "02", slug: "marks",            full: "Marks Predictor",      sub: "The math of your report card."            },
  { n: "03", slug: "notes",            full: "Notes Simplifier",     sub: "Textbook → plain English."                },
  { n: "04", slug: "doubt",            full: "Doubt Solver",         sub: "A question, a worked answer."             },
  { n: "05", slug: "focus",            full: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks."                },
  { n: "06", slug: "career",           full: "Career Pathfinder",    sub: "For the 14–18 year olds."                 },
  { n: "07", slug: "papers",           full: "Past Papers",          sub: "CBSE, JEE, NEET, SAT, IB."               },
  { n: "08", slug: "assignment",       full: "Assignment Rescue",    sub: "From prompt to outline."                  },
  { n: "09", slug: "resume",           full: "Resume Builder",       sub: "For applications, not LinkedIn."          },
  { n: "10", slug: "rooms",            full: "Study Rooms",          sub: "Silent accountability."                   },
  { n: "11", slug: "tutor",            full: "Topic Tutor",          sub: "Pick a topic. Get a full lesson."         },
  { n: "12", slug: "dna",              full: "Mistake DNA",          sub: "See exactly where you go wrong."          },
  { n: "13", slug: "crunch",           full: "48-Hour Crunch",       sub: "Exam tomorrow. Smart triage."             },
  { n: "14", slug: "syllabus",         full: "Syllabus Parser",      sub: "Upload PDF. Get your year mapped."        },
  { n: "15", slug: "formula",          full: "Formula Sheet",        sub: "Chapter → complete reference card."       },
  { n: "16", slug: "admissions",       full: "Admissions Engine",    sub: "Your real odds. 60 universities."         },
  { n: "17", slug: "flashcards",       full: "AI Flashcards",        sub: "Topic or notes → flip cards."             },
  { n: "18", slug: "essay-grader",     full: "Essay Grader",         sub: "Paste essay. Get examiner marks."         },
  { n: "19", slug: "personal-statement", full: "Personal Statement", sub: "Score your application essay."            },
  { n: "20", slug: "interview",        full: "Interview Coach",      sub: "Practice. Get scored. Improve."           },
  { n: "21", slug: "mindmap",          full: "Mind Map Builder",     sub: "Any topic. Full concept breakdown."       },
  { n: "22", slug: "citation",         full: "Citation Generator",   sub: "APA, MLA, Chicago, Harvard — instantly." },
  { n: "23", slug: "presentation",     full: "Presentation Planner", sub: "Topic → full slide deck with notes."      },
  { n: "24", slug: "debate",           full: "Debate Coach",         sub: "Any motion. Arguments both ways."         },
  { n: "25", slug: "habits",           full: "Habit Tracker",        sub: "Build study habits that stick."           },
  { n: "26", slug: "deadlines",        full: "Deadline Hub",         sub: "Every deadline. Never miss one."          },
  { n: "27", slug: "exam-sim",         full: "Exam Simulator",       sub: "Timed AI exam. Full explanations."        },
  { n: "28", slug: "gpa-sim",          full: "GPA Simulator",        sub: "Model your grades. Plan your GPA."        },
  { n: "29", slug: "vocab",            full: "Vocabulary Vault",     sub: "Deep word learning with memory hooks."    },
  { n: "30", slug: "research",         full: "Research Assistant",   sub: "Any topic. Arguments, stats, angles."     },
  { n: "★",  slug: "score",            full: "Ledger Score™",        sub: "Your real-time exam readiness."           },
];

export default function ToolsSidebar() {
  const { sidebarOpen, setSidebarOpen, setSplitSlug } = useUI();
  const router = useRouter();
  const [q, setQ] = useState("");

  const close = useCallback(() => { setSidebarOpen(false); setQ(""); }, [setSidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, close]);

  const filtered = TOOLS.filter(t =>
    q ? (t.full.toLowerCase().includes(q.toLowerCase()) || t.sub.toLowerCase().includes(q.toLowerCase()) || t.n.includes(q)) : true
  );

  function openTool(slug: string) { router.push(`/tools/${slug}`); close(); }
  function splitTool(slug: string) { setSplitSlug(slug); close(); }

  return (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          onClick={close}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 199, backdropFilter: "blur(1px)" }}
        />
      )}

      {/* Slide-in panel */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 380,
        background: "var(--paper)", borderRight: "2px solid var(--ink)",
        zIndex: 200, display: "flex", flexDirection: "column",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
        overflowX: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ink)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>
              Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.08em", marginTop: 2 }}>30 TOOLS · CHOOSE OR SPLIT</div>
          </div>
          <button onClick={close} style={{ fontFamily: "var(--mono)", fontSize: 11, background: "none", border: "1px solid var(--rule)", padding: "5px 10px", cursor: "pointer", color: "var(--ink-3)" }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search tools…"
            autoFocus={sidebarOpen}
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        {/* Split view tip */}
        <div style={{ padding: "8px 16px", background: "var(--paper-2)", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", lineHeight: 1.5 }}>
            <span style={{ color: "var(--cinnabar-ink)" }}>→ Open</span> navigates · <span style={{ color: "#1a6091" }}>⊞ Split</span> adds a second tool alongside this one
          </div>
        </div>

        {/* Tool list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No tools match &ldquo;{q}&rdquo;</div>
          ) : filtered.map((t) => (
            <div key={t.slug} style={{ borderBottom: "1px solid var(--rule)", padding: "11px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: 9, color: t.n === "★" ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>{t.n}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.full}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => openTool(t.slug)}
                  style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 8px", border: "1px solid var(--ink)", background: "var(--paper)", color: "var(--cinnabar-ink)", cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                  → Open
                </button>
                <button
                  onClick={() => splitTool(t.slug)}
                  title="Open alongside current tool"
                  style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 8px", border: "1px solid #1a6091", background: "var(--paper)", color: "#1a6091", cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                  ⊞ Split
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--rule)", flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Press Esc to close · {filtered.length} of {TOOLS.length} tools</div>
        </div>
      </div>
    </>
  );
}
