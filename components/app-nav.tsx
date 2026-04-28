"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-provider";
import { loadUserData } from "@/lib/user-data";
import { useUI } from "./ui-context";
import CommandPalette from "./command-palette";

const TOOLS = [
  { n: "01", slug: "planner",            full: "Smart Study Planner",  sub: "Subjects in. Timetable out."              },
  { n: "02", slug: "marks",              full: "Marks Predictor",      sub: "The math of your report card."            },
  { n: "03", slug: "notes",              full: "Notes Simplifier",     sub: "Textbook → plain English."                },
  { n: "04", slug: "doubt",              full: "Doubt Solver",         sub: "A question, a worked answer."             },
  { n: "05", slug: "focus",              full: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks."                },
  { n: "06", slug: "career",             full: "Career Pathfinder",    sub: "For the 14–18 year olds."                 },
  { n: "07", slug: "papers",             full: "Past Papers",          sub: "CBSE, JEE, NEET, SAT, IB."               },
  { n: "08", slug: "assignment",         full: "Assignment Rescue",    sub: "From prompt to outline."                  },
  { n: "09", slug: "resume",             full: "Resume Builder",       sub: "For applications, not LinkedIn."          },
  { n: "10", slug: "rooms",              full: "Study Rooms",          sub: "Silent accountability."                   },
  { n: "11", slug: "tutor",              full: "Topic Tutor",          sub: "Pick a topic. Get a full lesson."         },
  { n: "12", slug: "dna",               full: "Mistake DNA",          sub: "See exactly where you go wrong."          },
  { n: "13", slug: "crunch",             full: "48-Hour Crunch",       sub: "Exam tomorrow. Smart triage."             },
  { n: "14", slug: "syllabus",           full: "Syllabus Parser",      sub: "Upload PDF. Get your year mapped."        },
  { n: "15", slug: "formula",            full: "Formula Sheet",        sub: "Chapter → complete reference card."       },
  { n: "16", slug: "admissions",         full: "Admissions Engine",    sub: "Your real odds. 60 universities."         },
  { n: "17", slug: "flashcards",         full: "AI Flashcards",        sub: "Topic or notes → flip cards."             },
  { n: "18", slug: "essay-grader",       full: "Essay Grader",         sub: "Paste essay. Get examiner marks."         },
  { n: "19", slug: "personal-statement", full: "Personal Statement",   sub: "Score your application essay."            },
  { n: "20", slug: "interview",          full: "Interview Coach",      sub: "Practice. Get scored. Improve."           },
  { n: "21", slug: "mindmap",            full: "Mind Map Builder",     sub: "Any topic. Full concept breakdown."       },
  { n: "22", slug: "citation",           full: "Citation Generator",   sub: "APA, MLA, Chicago, Harvard — instantly." },
  { n: "23", slug: "presentation",       full: "Presentation Planner", sub: "Topic → full slide deck with notes."      },
  { n: "24", slug: "debate",             full: "Debate Coach",         sub: "Any motion. Arguments both ways."         },
  { n: "25", slug: "habits",             full: "Habit Tracker",        sub: "Build study habits that stick."           },
  { n: "26", slug: "deadlines",          full: "Deadline Hub",         sub: "Every deadline. Never miss one."          },
  { n: "27", slug: "exam-sim",           full: "Exam Simulator",       sub: "Timed AI exam. Full explanations."        },
  { n: "28", slug: "gpa-sim",            full: "GPA Simulator",        sub: "Model your grades. Plan your GPA."        },
  { n: "29", slug: "vocab",              full: "Vocabulary Vault",     sub: "Deep word learning with memory hooks."    },
  { n: "30", slug: "research",           full: "Research Assistant",   sub: "Any topic. Arguments, stats, angles."     },
  { n: "31", slug: "coach",             full: "AI Study Coach",       sub: "Your personal AI. Daily briefing + chat." },
  { n: "32", slug: "mark-scheme",       full: "Mark Scheme Trainer",  sub: "Real questions. Real marking."            },
  { n: "33", slug: "subject-picker",    full: "Subject Picker",       sub: "Find the perfect Grade 11 combination."   },
  { n: "34", slug: "essay-blueprint",   full: "Essay Blueprint",      sub: "Structure before you write."             },
  { n: "35", slug: "concept-web",       full: "Concept Web",          sub: "Any concept, fully mapped."              },
  { n: "36", slug: "exam-planner",      full: "Exam Season Planner",  sub: "Spaced repetition, automatically."        },
  { n: "37", slug: "paper-dissector",   full: "Paper Dissector",      sub: "Decode what examiners want."             },
  { n: "38", slug: "lang-analyzer",     full: "Language Analyzer",    sub: "Unseen text, fully decoded."             },
  { n: "39", slug: "lab-report",        full: "Lab Report Builder",   sub: "Turn experiments into full reports."      },
  { n: "40", slug: "uni-match",         full: "University Match",     sub: "Your grades. Your field. Your matches."   },
  { n: "★",  slug: "score",             full: "Ledger Score™",        sub: "Your real-time exam readiness."           },
];

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
    !q || t.full.toLowerCase().includes(q.toLowerCase()) || t.sub.toLowerCase().includes(q.toLowerCase()) || t.n.includes(q)
  );

  return (
    <>
      <CommandPalette />

      {/* ── Top nav bar ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--paper)", borderBottom: "1px solid var(--ink)", display: "flex", alignItems: "stretch", height: 49 }}>

        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "0 18px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
          </span>
        </Link>

        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", padding: "0 16px", borderRight: "1px solid var(--rule)", background: path === "/dashboard" ? "var(--ink)" : "transparent", color: path === "/dashboard" ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
          ← Home
        </Link>

        <Link href="/tools/score" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "0 14px", borderRight: "1px solid var(--rule)", background: path === "/tools/score" ? "var(--cinnabar-ink)" : "transparent", color: path === "/tools/score" ? "var(--paper)" : "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>
          <span>★</span><span>Score</span>
        </Link>

        {/* Tools button — opens sidebar via local state */}
        <button
          onClick={() => setOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 18px", background: open ? "var(--ink)" : "transparent", border: "none", borderRight: "1px solid var(--rule)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: open ? "var(--paper)" : "var(--ink)", flexShrink: 0, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 13 }}>⊞</span>
          <span>Tools</span>
        </button>

        {splitSlug && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 14px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
            <span className="mono" style={{ fontSize: 9, color: "#1a6091", letterSpacing: "0.06em" }}>⊞ SPLIT ACTIVE</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {user && (
          <div style={{ display: "flex", alignItems: "center", borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
            <Link href="/dashboard/profile" style={{ textDecoration: "none", height: "100%", display: "flex", alignItems: "center", padding: "0 14px", gap: 7, background: isProfile ? "var(--ink)" : "transparent", borderRight: "1px solid var(--rule)" }}>
              <div style={{ width: 20, height: 20, background: isProfile ? "var(--paper)" : "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 12, color: isProfile ? "var(--ink)" : "var(--paper)", lineHeight: 1 }}>{initial}</span>
              </div>
              <span className="mono nav-username" style={{ color: isProfile ? "var(--paper)" : "var(--ink-3)", fontSize: 9, whiteSpace: "nowrap" }}>@{short}</span>
            </Link>
            <button onClick={handleSignOut} style={{ height: "100%", padding: "0 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
              Out
            </button>
          </div>
        )}
      </nav>

      {/* ── Sidebar backdrop ── */}
      {open && (
        <div onClick={closeSidebar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 199 }} />
      )}

      {/* ── Slide-in sidebar panel ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 380,
        background: "var(--paper)", borderRight: "2px solid var(--ink)",
        zIndex: 200, display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>
              Ledger<span style={{ color: "var(--cinnabar-ink)" }}>.</span>
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.08em", marginTop: 2 }}>30 TOOLS · OPEN OR SPLIT</div>
          </div>
          <button onClick={closeSidebar} style={{ fontFamily: "var(--mono)", fontSize: 11, background: "none", border: "1px solid var(--rule)", padding: "5px 10px", cursor: "pointer", color: "var(--ink-3)" }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search tools…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        {/* Hint */}
        <div style={{ padding: "8px 16px", background: "var(--paper-2)", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)" }}>→ Open</span>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}> navigates · </span>
          <span className="mono" style={{ fontSize: 9, color: "#1a6091" }}>⊞ Split</span>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}> opens a second tool alongside</span>
        </div>

        {/* Tool list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No tools match &ldquo;{q}&rdquo;</div>
          ) : filtered.map(t => (
            <div key={t.slug} style={{ borderBottom: "1px solid var(--rule)", padding: "11px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: 9, color: t.n === "★" ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>{t.n}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.full}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => openTool(t.slug)} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 8px", border: "1px solid var(--ink)", background: "var(--paper)", color: "var(--cinnabar-ink)", cursor: "pointer", letterSpacing: "0.03em" }}>→ Open</button>
                <button onClick={() => splitTool(t.slug)} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 8px", border: "1px solid #1a6091", background: "var(--paper)", color: "#1a6091", cursor: "pointer", letterSpacing: "0.03em" }}>⊞ Split</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--rule)", flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Esc to close · {filtered.length}/{TOOLS.length} tools</span>
        </div>
      </div>
    </>
  );
}
