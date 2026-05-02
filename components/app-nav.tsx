"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-provider";
import { loadUserData } from "@/lib/user-data";
import { useUI } from "./ui-context";
import CommandPalette from "./command-palette";

type Tool = { slug: string; full: string; sub: string };
type Category = { label: string; tools: Tool[] };

const CATEGORIES: Category[] = [
  {
    label: "PLAN",
    tools: [
      { slug: "planner",      full: "Smart Study Planner",  sub: "Subjects in. Timetable out."          },
      { slug: "focus",        full: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks."            },
      { slug: "habits",       full: "Habit Tracker",        sub: "Build study habits that stick."       },
      { slug: "deadlines",    full: "Deadline Hub",         sub: "Every deadline. Never miss one."      },
      { slug: "exam-planner", full: "Exam Season Planner",  sub: "Spaced repetition, automatically."    },
    ],
  },
  {
    label: "LEARN",
    tools: [
      { slug: "notes",        full: "Notes Simplifier",     sub: "Textbook → plain English."            },
      { slug: "doubt",        full: "Doubt Solver",         sub: "A question, a worked answer."         },
      { slug: "tutor",        full: "Topic Tutor",          sub: "Pick a topic. Get a full lesson."     },
      { slug: "syllabus",     full: "Syllabus Parser",      sub: "Upload PDF. Get your year mapped."    },
      { slug: "mindmap",      full: "Mind Map Builder",     sub: "Any topic. Full concept breakdown."   },
      { slug: "concept-web",  full: "Concept Web",          sub: "Any concept, fully mapped."           },
      { slug: "formula",      full: "Formula Sheet",        sub: "Chapter → complete reference card."   },
      { slug: "lang-analyzer",full: "Language Analyzer",    sub: "Unseen text, fully decoded."          },
      { slug: "vocab",        full: "Vocabulary Vault",     sub: "Deep word learning with memory hooks."},
    ],
  },
  {
    label: "WRITE",
    tools: [
      { slug: "assignment",         full: "Assignment Rescue",    sub: "From prompt to outline."                  },
      { slug: "essay-grader",       full: "Essay Grader",         sub: "Paste essay. Get examiner marks."          },
      { slug: "personal-statement", full: "Personal Statement",   sub: "Score your application essay."             },
      { slug: "essay-blueprint",    full: "Essay Blueprint",      sub: "Structure before you write."               },
      { slug: "research",           full: "Research Assistant",   sub: "Any topic. Arguments, stats, angles."      },
      { slug: "presentation",       full: "Presentation Planner", sub: "Topic → full slide deck with notes."       },
      { slug: "debate",             full: "Debate Coach",         sub: "Any motion. Arguments both ways."          },
      { slug: "citation",           full: "Citation Generator",   sub: "APA, MLA, Chicago, Harvard — instantly."   },
      { slug: "lab-report",         full: "Lab Report Builder",   sub: "Turn experiments into full reports."       },
      { slug: "argument",           full: "Argument Builder",     sub: "P-E-E-L plan from any claim."              },
      { slug: "grammar",            full: "Grammar Coach",        sub: "Improve academic writing instantly."       },
      { slug: "model-answer",       full: "Model Answer Factory", sub: "See what full marks looks like."           },
    ],
  },
  {
    label: "PRACTISE",
    tools: [
      { slug: "papers",          full: "Past Papers",         sub: "CBSE, JEE, NEET, SAT, IB."             },
      { slug: "flashcards",      full: "AI Flashcards",       sub: "Topic or notes → flip cards."          },
      { slug: "exam-sim",        full: "Exam Simulator",      sub: "Timed AI exam. Full explanations."     },
      { slug: "mark-scheme",     full: "Mark Scheme Trainer", sub: "Real questions. Real marking."          },
      { slug: "paper-dissector", full: "Paper Dissector",     sub: "Decode what examiners want."            },
      { slug: "practice",        full: "Practice Problems",   sub: "Graded problems, worked solutions."     },
      { slug: "crunch",          full: "48-Hour Crunch",      sub: "Exam tomorrow. Smart triage."           },
      { slug: "dna",             full: "Mistake DNA",         sub: "See exactly where you go wrong."        },
      { slug: "predict",         full: "Question Predictor",  sub: "Predict likely exam questions."         },
      { slug: "memory-palace",   full: "Memory Palace",       sub: "Walk through it. Never forget it."      },
      { slug: "analogy",         full: "Analogy Engine",      sub: "Complex concepts, memorably explained." },
      { slug: "exam-strategy",   full: "Exam Strategy",       sub: "Personalised exam-day plan."            },
    ],
  },
  {
    label: "FUTURE",
    tools: [
      { slug: "career",          full: "Career Pathfinder",    sub: "For the 14–18 year olds."              },
      { slug: "admissions",      full: "Admissions Engine",    sub: "Your real odds. 60 universities."      },
      { slug: "resume",          full: "Resume Builder",       sub: "For applications, not LinkedIn."       },
      { slug: "interview",       full: "Interview Coach",      sub: "Practice. Get scored. Improve."        },
      { slug: "subject-picker",  full: "Subject Picker",       sub: "Find the perfect Grade 11 combination."},
      { slug: "uni-match",       full: "University Match",     sub: "Your grades. Your field. Your matches."},
      { slug: "gpa-sim",         full: "GPA Simulator",        sub: "Model your grades. Plan your GPA."     },
    ],
  },
  {
    label: "TRACK",
    tools: [
      { slug: "marks",          full: "Marks Predictor",   sub: "The math of your report card."   },
      { slug: "coach",          full: "AI Study Coach",    sub: "Daily briefing + chat."           },
      { slug: "rooms",          full: "Study Rooms",       sub: "Silent accountability."           },
      { slug: "compare",        full: "Comparison Chart",  sub: "Any concepts, side by side."      },
      { slug: "source",         full: "Source Analyzer",   sub: "OPCVL analysis in seconds."       },
      { slug: "case-study",     full: "Case Study Pro",    sub: "Business analysis in seconds."    },
      { slug: "timeline",       full: "Timeline Builder",  sub: "Annotated timelines instantly."   },
      { slug: "reading",        full: "Reading Companion", sub: "Full passage analysis + Qs."      },
      { slug: "study-guide",    full: "Study Guide",       sub: "Comprehensive guide any topic."    },
      { slug: "concept-connect",full: "Concept Connect",   sub: "Find hidden links between ideas." },
      { slug: "score",          full: "Ledger Score™",     sub: "Your real-time exam readiness."   },
    ],
  },
];

const TOOLS: Tool[] = CATEGORIES.flatMap(c => c.tools);

function ToolRow({ t, onOpen, onSplit }: { t: Tool; onOpen: (s: string) => void; onSplit: (s: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid var(--rule)", padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        background: hovered ? "rgba(226,226,222,0.5)" : "transparent",
        transition: "background 150ms",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.full}</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onOpen(t.slug)}
          style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 600, padding: "4px 10px", border: "1px solid var(--ink-2)", background: "transparent", color: "var(--ink-2)", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
        >Open</button>
        <button
          onClick={() => onSplit(t.slug)}
          style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 500, padding: "4px 10px", border: "1px solid var(--rule)", background: "transparent", color: "var(--ink-3)", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
        >Split</button>
      </div>
    </div>
  );
}

export default function AppNav() {
  const path   = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { splitSlug, setSplitSlug } = useUI();

  const [displayName, setDisplayName] = useState("");
  const [embedded, setEmbedded]       = useState(false);
  const [open, setOpen]               = useState(false);
  const [q, setQ]                     = useState("");

  useEffect(() => {
    try { setEmbedded(window.self !== window.top); } catch { setEmbedded(true); }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      setDisplayName(ud?.username || user.email?.split("@")[0] || "");
    });
  }, [user]);

  const closeSidebar = useCallback(() => { setOpen(false); setQ(""); }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeSidebar(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeSidebar]);

  async function handleSignOut() { await signOut(); router.push("/auth"); }
  function openTool(slug: string)  { router.push(`/tools/${slug}`); closeSidebar(); }
  function splitTool(slug: string) { setSplitSlug(slug); closeSidebar(); }

  if (embedded) return null;

  const short     = displayName.length > 14 ? displayName.slice(0, 12) + "…" : displayName;
  const isProfile = path === "/dashboard/profile";
  const initial   = (displayName || "?")[0].toUpperCase();
  const filtered  = TOOLS.filter(t =>
    !q || t.full.toLowerCase().includes(q.toLowerCase()) || t.sub.toLowerCase().includes(q.toLowerCase())
  );

  const navLink = (href: string, label: string, extra?: React.ReactNode) => {
    const active = path === href;
    return (
      <Link href={href} style={{
        textDecoration: "none", display: "flex", alignItems: "center", gap: 6, padding: "0 16px",
        borderRight: "1px solid var(--rule)",
        background: active ? "var(--paper-2)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-2)",
        fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
        height: "100%", transition: "background 150ms",
      }}>
        {extra}{label}
      </Link>
    );
  };

  return (
    <>
      <CommandPalette />

      {/* ── Top nav bar ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--paper)", borderBottom: "1px solid var(--rule)",
        display: "flex", alignItems: "stretch", height: 52,
      }}>
        <Link href="/" style={{
          textDecoration: "none", display: "flex", alignItems: "center", padding: "0 20px",
          borderRight: "1px solid var(--rule)", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 500, fontSize: 18, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            Ledger
          </span>
        </Link>

        {navLink("/dashboard", "Dashboard")}

        <Link href="/tools/score" style={{
          textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "0 14px",
          borderRight: "1px solid var(--rule)",
          background: path === "/tools/score" ? "var(--paper-2)" : "transparent",
          color: path === "/tools/score" ? "var(--ink)" : "var(--cinnabar-ink)",
          fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
          height: "100%",
        }}>
          <span>★</span><span>Score</span>
        </Link>

        <button
          onClick={() => setOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "0 18px",
            background: open ? "var(--paper-2)" : "transparent", border: "none",
            borderRight: "1px solid var(--rule)", cursor: "pointer",
            fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--ink)", flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 12 }}>⊞</span><span>Tools</span>
        </button>

        {splitSlug && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 14px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 600, color: "#1a6091", letterSpacing: "0.08em", textTransform: "uppercase" }}>⊞ Split Active</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {user && (
          <div style={{ display: "flex", alignItems: "center", borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
            <Link href="/dashboard/profile" style={{
              textDecoration: "none", height: "100%", display: "flex", alignItems: "center",
              padding: "0 14px", gap: 8,
              background: isProfile ? "var(--paper-2)" : "transparent",
              borderRight: "1px solid var(--rule)",
            }}>
              <div style={{ width: 22, height: 22, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 500, fontSize: 12, color: "var(--paper)", lineHeight: 1 }}>{initial}</span>
              </div>
              <span className="mono nav-username" style={{ color: "var(--ink-3)", fontSize: 9, whiteSpace: "nowrap" }}>@{short}</span>
            </Link>
            <button onClick={handleSignOut} style={{
              height: "100%", padding: "0 16px", background: "none", border: "none", cursor: "pointer",
              fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap",
            }}>
              Out
            </button>
          </div>
        )}
      </nav>

      {/* ── Sidebar backdrop ── */}
      {open && (
        <div onClick={closeSidebar} style={{ position: "fixed", inset: 0, background: "rgba(24,36,27,0.45)", zIndex: 199 }} />
      )}

      {/* ── Slide-in sidebar panel ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 360,
        background: "var(--paper-2)", borderRight: "1px solid var(--rule)",
        zIndex: 200, display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 500, fontSize: 18, color: "var(--ink)", letterSpacing: "-0.01em" }}>Ledger</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 3 }}>55 Tools · Open or Split</div>
          </div>
          <button onClick={closeSidebar} style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, background: "none", border: "1px solid var(--rule)", padding: "5px 10px", cursor: "pointer", color: "var(--ink-3)", letterSpacing: "0.04em" }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search tools…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "8px 12px", color: "var(--ink)", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        {/* Hint */}
        <div style={{ padding: "7px 16px", background: "rgba(226,226,222,0.4)", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 600, color: "var(--cinnabar-ink)" }}>→ Open</span>
          <span style={{ fontFamily: "var(--sans)", fontSize: 10, color: "var(--ink-3)" }}> navigates · </span>
          <span style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 600, color: "#1a6091" }}>⊞ Split</span>
          <span style={{ fontFamily: "var(--sans)", fontSize: 10, color: "var(--ink-3)" }}> opens a second tool alongside</span>
        </div>

        {/* Tool list */}
        <div className="nav-tools-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No tools match &ldquo;{q}&rdquo;</div>
          ) : q ? (
            filtered.map(t => <ToolRow key={t.slug} t={t} onOpen={openTool} onSplit={splitTool} />)
          ) : (
            CATEGORIES.map(cat => (
              <div key={cat.label}>
                <div style={{ padding: "7px 16px", background: "rgba(226,226,222,0.45)", borderBottom: "1px solid var(--rule)", borderTop: "1px solid var(--rule)" }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{cat.label}</span>
                </div>
                {cat.tools.map(t => <ToolRow key={t.slug} t={t} onOpen={openTool} onSplit={splitTool} />)}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--rule)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--sans)", fontSize: 10, color: "var(--ink-3)" }}>Esc to close · {filtered.length}/{TOOLS.length} tools</span>
        </div>
      </div>
    </>
  );
}
