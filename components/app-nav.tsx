"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-provider";
import { loadUserData } from "@/lib/user-data";
import { useUI } from "./ui-context";
import CommandPalette from "./command-palette";

type Tool = { slug: string; full: string; sub: string };
type Category = { label: string; color: string; tools: Tool[] };

const CATEGORIES: Category[] = [
  {
    label: "PLAN", color: "var(--sage)",
    tools: [
      { slug: "planner",      full: "Smart Study Planner",  sub: "Subjects in. Timetable out."          },
      { slug: "focus",        full: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks."            },
      { slug: "habits",       full: "Habit Tracker",        sub: "Build study habits that stick."       },
      { slug: "deadlines",    full: "Deadline Hub",         sub: "Every deadline. Never miss one."      },
      { slug: "exam-planner", full: "Exam Season Planner",  sub: "Spaced repetition, automatically."    },
    ],
  },
  {
    label: "LEARN", color: "var(--slate)",
    tools: [
      { slug: "notes",        full: "Study Engine",         sub: "Simplify notes or learn any topic."   },
      { slug: "doubt",        full: "Doubt Solver",         sub: "A question, a worked answer."         },
      { slug: "syllabus",     full: "Syllabus Parser",      sub: "Upload PDF. Get your year mapped."    },
      { slug: "mindmap",      full: "Mind Map Builder",     sub: "Any topic. Full concept breakdown."   },
      { slug: "formula",      full: "Formula Sheet",        sub: "Chapter → complete reference card."   },
      { slug: "lang-analyzer",full: "Language Analyzer",    sub: "Unseen text, fully decoded."          },
      { slug: "vocab",        full: "Vocabulary Vault",     sub: "Deep word learning with memory hooks."},
    ],
  },
  {
    label: "WRITE", color: "var(--ochre)",
    tools: [
      { slug: "essay-blueprint",    full: "Essay Workshop",       sub: "Plan, argue, or grade any essay."    },
      { slug: "research",           full: "Research Hub",         sub: "Deep research or plan your assignment."},
      { slug: "grammar",            full: "Writing Polish",       sub: "Polish writing or score your statement."},
      { slug: "presentation",       full: "Presentation Planner", sub: "Topic → full slide deck with notes."  },
      { slug: "debate",             full: "Debate Coach",         sub: "Any motion. Arguments both ways."     },
      { slug: "citation",           full: "Citation Generator",   sub: "APA, MLA, Chicago, Harvard."          },
      { slug: "lab-report",         full: "Lab Report Builder",   sub: "Turn experiments into full reports."  },
      { slug: "model-answer",       full: "Model Answer Factory", sub: "See what full marks looks like."      },
    ],
  },
  {
    label: "PRACTISE", color: "var(--cinnabar-ink)",
    tools: [
      { slug: "papers",        full: "Past Papers",         sub: "CBSE, JEE, NEET, SAT, IB."             },
      { slug: "flashcards",    full: "AI Flashcards",       sub: "Topic or notes → flip cards."           },
      { slug: "practice",      full: "Practice Suite",      sub: "Targeted questions. Timed exam mode."   },
      { slug: "mark-scheme",   full: "Question Decoder",    sub: "Mark schemes and paper anatomy."        },
      { slug: "crunch",        full: "48-Hour Crunch",      sub: "Exam tomorrow. Smart triage."           },
      { slug: "dna",           full: "Mistake DNA",         sub: "See exactly where you go wrong."        },
      { slug: "predict",       full: "Question Predictor",  sub: "Predict likely exam questions."         },
      { slug: "memory-palace", full: "Memory Palace",       sub: "Walk through it. Never forget it."      },
      { slug: "analogy",       full: "Analogy Engine",      sub: "Complex concepts, memorably explained." },
    ],
  },
  {
    label: "FUTURE", color: "var(--plum)",
    tools: [
      { slug: "admissions",   full: "Admissions Engine",   sub: "Your real odds. 60 universities."       },
      { slug: "resume",       full: "Resume Builder",      sub: "For applications, not LinkedIn."        },
      { slug: "interview",    full: "Interview Coach",     sub: "Practice. Get scored. Improve."         },
      { slug: "uni-match",    full: "Future Finder",       sub: "Universities, subjects, your path."     },
      { slug: "gpa-sim",      full: "GPA Simulator",       sub: "Model your grades. Plan your GPA."      },
    ],
  },
  {
    label: "TRACK", color: "var(--teal)",
    tools: [
      { slug: "marks",          full: "Marks Predictor",   sub: "The math of your report card."          },
      { slug: "coach",          full: "Academic Coach",    sub: "Personal guidance, any subject."         },
      { slug: "rooms",          full: "Study Rooms",       sub: "Silent accountability."                  },
      { slug: "compare",        full: "Topic Comparer",    sub: "Two concepts, side by side."             },
      { slug: "source",         full: "Text Analyst",      sub: "Source analysis and comprehension."      },
      { slug: "case-study",     full: "Case Study Pro",    sub: "Business analysis in seconds."           },
      { slug: "timeline",       full: "Timeline Builder",  sub: "Annotated timelines instantly."          },
      { slug: "study-guide",    full: "Study Guide Builder",sub: "Complete revision guide in minutes."    },
      { slug: "score",          full: "Ledger Score™",     sub: "Your real-time exam readiness."          },
    ],
  },
];

const TOTAL_TOOLS = CATEGORIES.reduce((n, c) => n + c.tools.length, 0);

function ToolRow({ t, color, onOpen, onSplit }: { t: Tool; color: string; onOpen: (s: string) => void; onSplit: (s: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid var(--rule)", padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        borderLeft: hovered ? `3px solid ${color}` : "3px solid transparent",
        background: hovered ? "var(--paper)" : "transparent",
        transition: "background 140ms ease, border-color 140ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.full}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", marginTop: 3, letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onOpen(t.slug)}
          aria-label={`Open ${t.full}`}
          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--ink-2)", background: "transparent", color: "var(--ink-2)", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 0, boxShadow: "none", backdropFilter: "none" }}
        >Open</button>
        <button
          onClick={() => onSplit(t.slug)}
          aria-label={`Split view with ${t.full}`}
          style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--rule)", background: "transparent", color: "var(--ink-3)", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 0, boxShadow: "none", backdropFilter: "none" }}
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

  useEffect(() => {
    try { setEmbedded(window.self !== window.top); } catch { setEmbedded(true); }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      setDisplayName(ud?.username || user.email?.split("@")[0] || "");
    });
  }, [user]);

  const closeSidebar = useCallback(() => { setOpen(false); }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeSidebar(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeSidebar]);

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  }

  async function handleSignOut() { await signOut(); router.push("/auth"); }
  function openTool(slug: string)  { router.push(`/tools/${slug}`); closeSidebar(); }
  function splitTool(slug: string) { setSplitSlug(slug); closeSidebar(); }

  if (embedded) return null;

  const short     = displayName.length > 14 ? displayName.slice(0, 12) + "…" : displayName;
  const isProfile = path === "/dashboard/profile";
  const initial   = (displayName || "?")[0].toUpperCase();

  const navLink = (href: string, label: string, extra?: React.ReactNode, mobileHide?: boolean) => {
    const active = path === href;
    return (
      <Link href={href} className={mobileHide ? "mob-hide" : undefined} style={{
        textDecoration: "none", display: "flex", alignItems: "center", gap: 6, padding: "0 16px",
        borderRight: "1px solid var(--rule)",
        background: active ? "var(--paper-2)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-2)",
        fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
        height: "100%", transition: "background 160ms ease, color 160ms ease",
      }}>
        {extra}{label}
      </Link>
    );
  };

  return (
    <>
      <CommandPalette />

      {/* ── Top nav bar ── */}
      <nav role="navigation" aria-label="Main navigation" className="gl-pane" style={{
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: "1px solid var(--rule)",
        display: "flex", alignItems: "stretch", height: 52,
      }}>
        <Link href="/" aria-label="Ledger — home" style={{
          textDecoration: "none", display: "flex", alignItems: "center", padding: "0 20px",
          borderRight: "1px solid var(--rule)", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 700, fontSize: 16, color: "var(--ink)", letterSpacing: "0.1em" }}>
            LEDGER
          </span>
        </Link>

        {navLink("/dashboard", "Dashboard", undefined, true)}
        {navLink("/tools/personalise", "Themes", undefined, true)}

        <Link href="/tools/score" className="mob-hide" style={{
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
          aria-label="Open tools panel"
          aria-expanded={open}
          aria-haspopup="dialog"
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "0 18px",
            background: open ? "var(--paper-2)" : "transparent", border: "none",
            borderRight: "1px solid var(--rule)", cursor: "pointer",
            fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--ink)", flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 12 }}>⊞</span><span>Tools</span>
        </button>

        {splitSlug && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 14px", borderRight: "1px solid var(--rule)", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--slate)", letterSpacing: "0.08em", textTransform: "uppercase" }}>⊞ Split Active</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* ⌘K — opens command palette */}
        <button
          onClick={openPalette}
          aria-label="Open command palette (Ctrl+K)"
          title="Command palette — Ctrl+K / ⌘K"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            height: "100%", padding: "0 14px",
            background: "none", border: "none", borderLeft: "1px solid var(--rule)",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          <span style={{
            fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em",
            color: "var(--ink-3)", padding: "2px 6px",
            border: "1px solid var(--rule)",
          }}>⌘K</span>
        </button>

        {user && (
          <div style={{ display: "flex", alignItems: "center", borderLeft: "1px solid var(--rule)", flexShrink: 0 }}>
            <Link href="/dashboard/profile" style={{
              textDecoration: "none", height: "100%", display: "flex", alignItems: "center",
              padding: "0 14px", gap: 8,
              background: isProfile ? "var(--paper-2)" : "transparent",
              borderRight: "1px solid var(--rule)",
            }}>
              <div style={{ width: 22, height: 22, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 700, fontSize: 11, color: "var(--paper)", lineHeight: 1 }}>{initial}</span>
              </div>
              <span className="mono nav-username" style={{ color: "var(--ink-3)", fontSize: 9, whiteSpace: "nowrap" }}>@{short}</span>
            </Link>
            <button onClick={handleSignOut} aria-label="Sign out" style={{
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
        <div
          onClick={closeSidebar}
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, background: "rgba(24,36,27,0.45)", zIndex: 199 }}
        />
      )}

      {/* ── Slide-in sidebar — browse by category, open or split ── */}
      <div
        role="dialog"
        aria-label="Tools panel"
        aria-modal="true"
        aria-hidden={!open}
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: "min(360px, calc(100vw - 32px))",
          background: "var(--paper-2)", borderRight: "1px solid var(--rule)",
          zIndex: 200, display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: "0 20px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 700, fontSize: 15, color: "var(--ink)", letterSpacing: "0.08em" }}>LEDGER</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{TOTAL_TOOLS} tools</span>
          </div>
          <button
            onClick={closeSidebar}
            aria-label="Close tools panel"
            style={{ fontFamily: "var(--mono)", fontSize: 9, background: "none", border: "1px solid var(--rule)", padding: "4px 10px", cursor: "pointer", color: "var(--ink-3)", letterSpacing: "0.04em", borderRadius: 0, boxShadow: "none", backdropFilter: "none" }}
          >✕ Esc</button>
        </div>

        {/* ⌘K search prompt */}
        <button
          onClick={() => { closeSidebar(); openPalette(); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "11px 16px", background: "none", border: "none",
            borderBottom: "1px solid var(--rule)",
            cursor: "pointer", textAlign: "left", flexShrink: 0,
            borderRadius: 0, boxShadow: "none", backdropFilter: "none",
          }}
        >
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", flex: 1 }}>Search all tools…</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", padding: "2px 6px", border: "1px solid var(--rule)", letterSpacing: "0.06em", flexShrink: 0 }}>⌘K</span>
        </button>

        {/* Split hint */}
        <div style={{ padding: "7px 16px", borderBottom: "1px solid var(--rule)", flexShrink: 0, background: "color-mix(in srgb, var(--ink) 3%, transparent)" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
            Open navigates · <span style={{ color: "var(--slate)" }}>Split</span> opens a second tool alongside
          </span>
        </div>

        {/* Tool list — always browsing by category */}
        <div role="list" style={{ flex: 1, overflowY: "auto" }}>
          {CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div style={{ padding: "7px 16px", borderBottom: "1px solid var(--rule)", borderTop: "1px solid var(--rule)", borderLeft: `3px solid ${cat.color}` }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: cat.color, letterSpacing: "0.14em", textTransform: "uppercase" }}>{cat.label}</span>
              </div>
              {cat.tools.map(t => <ToolRow key={t.slug} t={t} color={cat.color} onOpen={openTool} onSplit={splitTool} />)}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--rule)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.06em" }}>Esc to close</span>
          <Link href="/dashboard" onClick={closeSidebar} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", textDecoration: "none", letterSpacing: "0.06em" }}>
            → All tools
          </Link>
        </div>
      </div>
    </>
  );
}
