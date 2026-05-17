"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const TOOLS = [
  // PLAN
  { name: "Exam Planner",        slug: "exam-planner",   category: "PLAN"     },
  { name: "Study Planner",       slug: "planner",        category: "PLAN"     },
  { name: "Deadlines",           slug: "deadlines",      category: "PLAN"     },
  { name: "Exam Triage",         slug: "exam-triage",    category: "PLAN"     },
  { name: "Circuit Breaker",     slug: "circuit-breaker",category: "PLAN"     },
  { name: "Circadian",           slug: "circadian",      category: "PLAN"     },
  { name: "Brain Budget",        slug: "brain-budget",   category: "PLAN"     },
  // LEARN
  { name: "Half-Life",           slug: "half-life",      category: "LEARN"    },
  { name: "Analogy Engine",      slug: "analogy",        category: "LEARN"    },
  { name: "Concept Connect",     slug: "concept-connect",category: "LEARN"    },
  { name: "Memory Palace",       slug: "memory-palace",  category: "LEARN"    },
  { name: "Memory Toolkit",      slug: "memory-toolkit", category: "LEARN"    },
  { name: "Recall Studio",       slug: "recall-studio",  category: "LEARN"    },
  { name: "Flashcards",          slug: "flashcards",     category: "LEARN"    },
  { name: "Language Lab",        slug: "language-lab",   category: "LEARN"    },
  { name: "Vocab Builder",       slug: "vocab",          category: "LEARN"    },
  // WRITE
  { name: "Notes Simplifier",    slug: "notes",          category: "WRITE"    },
  { name: "Essay Blueprint",     slug: "essay-blueprint",category: "WRITE"    },
  { name: "Grammar Fix",         slug: "grammar",        category: "WRITE"    },
  { name: "Citation Builder",    slug: "citation",       category: "WRITE"    },
  { name: "Lab Report",          slug: "lab-report",     category: "WRITE"    },
  { name: "Presentation Builder",slug: "presentation",   category: "WRITE"    },
  { name: "Writing Tools",       slug: "writing-tools",  category: "WRITE"    },
  { name: "Reference Builder",   slug: "reference-builder",category: "WRITE"  },
  { name: "Model Answer",        slug: "model-answer",   category: "WRITE"    },
  { name: "Study Guide",         slug: "study-guide",    category: "WRITE"    },
  { name: "Case Study",          slug: "case-study",     category: "WRITE"    },
  { name: "Research Suite",      slug: "research-suite", category: "WRITE"    },
  // PRACTISE
  { name: "Doubt Solver",        slug: "doubt",          category: "PRACTISE" },
  { name: "Practice Questions",  slug: "practice",       category: "PRACTISE" },
  { name: "Mark Scheme",         slug: "mark-scheme",    category: "PRACTISE" },
  { name: "Paper Triage",        slug: "paper-triage",   category: "PRACTISE" },
  { name: "Past Papers",         slug: "papers",         category: "PRACTISE" },
  { name: "Exam Debrief",        slug: "exam-debrief",   category: "PRACTISE" },
  { name: "Debate Practice",     slug: "debate",         category: "PRACTISE" },
  { name: "Interview Prep",      slug: "interview",      category: "PRACTISE" },
  { name: "Formula Recall",      slug: "formula-recall", category: "PRACTISE" },
  { name: "Exam Strategy",       slug: "exam-strategy",  category: "PRACTISE" },
  { name: "Post-Exam",           slug: "post-exam",      category: "PRACTISE" },
  { name: "Crunch Mode",         slug: "crunch",         category: "PRACTISE" },
  { name: "Source Analyser",     slug: "source",         category: "PRACTISE" },
  // TRACK
  { name: "Grade Tracker",       slug: "grade-tracker",  category: "TRACK"    },
  { name: "Marks Predictor",     slug: "marks",          category: "TRACK"    },
  { name: "Ledger Score",        slug: "score",          category: "TRACK"    },
  { name: "GPA Simulator",       slug: "gpa-sim",        category: "TRACK"    },
  { name: "Peer Heatmap",        slug: "peer-heatmap",   category: "TRACK"    },
  { name: "Syllabus Tracker",    slug: "syllabus",       category: "TRACK"    },
  { name: "Habits",              slug: "habits",         category: "TRACK"    },
  { name: "Debt Meter",          slug: "debt-meter",     category: "TRACK"    },
  { name: "DNA Report",          slug: "dna",            category: "TRACK"    },
  { name: "Revision Intel",      slug: "revision-intel", category: "TRACK"    },
  { name: "Analysis Hub",        slug: "analysis-hub",   category: "TRACK"    },
  { name: "Report Tools",        slug: "report-tools",   category: "TRACK"    },
  // FUTURE
  { name: "Study Rooms",         slug: "rooms",          category: "FUTURE"   },
  { name: "Focus Lab",           slug: "focus-lab",      category: "FUTURE"   },
  { name: "Student Command",     slug: "study-command",  category: "FUTURE"   },
  { name: "Uni Match",           slug: "uni-match",      category: "FUTURE"   },
  { name: "Admissions",          slug: "admissions",     category: "FUTURE"   },
  { name: "Applications",        slug: "applications",   category: "FUTURE"   },
  { name: "Uni Prep",            slug: "uni-prep",       category: "FUTURE"   },
];

const QUICK_ACTIONS = [
  { name: "Dashboard",           path: "/dashboard",         category: "NAV"  },
  { name: "Profile & Settings",  path: "/dashboard/profile", category: "NAV"  },
  { name: "Ledger Score",        path: "/tools/score",       category: "NAV"  },
  { name: "Themes",              path: "/tools/personalise", category: "NAV"  },
];

type Item =
  | { kind: "tool";   name: string; slug: string; category: string }
  | { kind: "action"; name: string; path: string; category: string };

function buildItems(): Item[] {
  return [
    ...QUICK_ACTIONS.map(a => ({ kind: "action" as const, ...a })),
    ...TOOLS.map(t => ({ kind: "tool" as const, ...t })),
  ];
}

const ALL_ITEMS = buildItems();

export default function CommandPalette() {
  const router  = useRouter();
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState("");
  const [cursor, setCursor] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);
  const itemRefs   = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered: Item[] = query.trim()
    ? ALL_ITEMS.filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.category.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_ITEMS;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const go = useCallback((item: Item) => {
    const path = item.kind === "tool" ? `/tools/${item.slug}` : item.path;
    router.push(path);
    close();
  }, [router, close]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
        setQuery("");
        setCursor(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = itemRefs.current[cursor];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape")    { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); return; }
    if (e.key === "Enter" && filtered[cursor]) { go(filtered[cursor]); }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes cp-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cp-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes cp-panel-in  { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cp-panel-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.96) translateY(-8px); } }

        .cp-backdrop {
          position: fixed; inset: 0; z-index: 9990;
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 80px;
          background: rgba(8, 8, 8, 0.60);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .cp-backdrop[data-open="true"]  { animation: cp-backdrop-in  180ms ease-out forwards; }
        .cp-backdrop[data-open="false"] { animation: cp-backdrop-out 140ms ease-in  forwards; }

        .cp-panel {
          position: relative; z-index: 1;
          width: 100%; max-width: 560px;
          background: var(--paper-2);
          border: 1px solid var(--rule);
          border-radius: 16px;
          display: flex; flex-direction: column;
          max-height: calc(100vh - 120px);
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3);
        }
        .cp-panel[data-open="true"]  { animation: cp-panel-in  180ms ease-out forwards; }
        .cp-panel[data-open="false"] { animation: cp-panel-out 140ms ease-in  forwards; }

        .cp-search-wrap {
          display: flex; align-items: center; gap: 10;
          padding: 0 20px;
          border-bottom: 1px solid var(--rule);
        }
        .cp-search-icon {
          font-size: 14px; color: var(--ink-3); flex-shrink: 0; opacity: 0.6;
        }
        .cp-search-input {
          flex: 1;
          font-family: var(--sans);
          font-size: 18px;
          font-weight: 400;
          color: var(--ink);
          background: transparent;
          border: none;
          outline: none;
          padding: 20px 0;
          letter-spacing: -0.01em;
        }
        .cp-search-input::placeholder { color: var(--ink-3); }
        .cp-esc-btn {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.06em;
          padding: 3px 7px;
          border: 1px solid var(--rule);
          border-radius: 4px;
          background: transparent;
          color: var(--ink-3);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 120ms ease, border-color 120ms ease;
        }
        .cp-esc-btn:hover { color: var(--ink); border-color: var(--ink-2); }

        .cp-results { overflow-y: auto; flex: 1; padding: 8px 8px; }

        .cp-item {
          display: flex; align-items: center; gap: 12;
          width: 100%; padding: 10px 12px;
          background: transparent;
          border: none; border-radius: 10px;
          cursor: pointer; text-align: left;
          transition: background 80ms ease;
        }
        .cp-item[data-active="true"] {
          background: color-mix(in srgb, var(--ink) 8%, transparent);
        }
        .cp-item-name {
          flex: 1;
          font-family: var(--sans);
          font-size: 14px;
          font-weight: 500;
          color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cp-item-badge {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-3);
          flex-shrink: 0;
          padding: 2px 6px;
          border: 1px solid var(--rule);
          border-radius: 4px;
        }
        .cp-item[data-active="true"] .cp-item-badge {
          border-color: color-mix(in srgb, var(--ink) 20%, transparent);
        }
        .cp-item-icon {
          font-size: 11px; color: var(--ink-3); flex-shrink: 0; opacity: 0.5;
        }

        .cp-empty {
          padding: 40px 20px; text-align: center;
          font-family: var(--sans); font-size: 14px; color: var(--ink-3);
        }

        .cp-footer {
          border-top: 1px solid var(--rule);
          padding: 10px 20px;
          display: flex; align-items: center; gap: 16;
          flex-shrink: 0;
        }
        .cp-hint {
          display: flex; align-items: center; gap: 5;
        }
        .cp-hint-key {
          font-family: var(--mono); font-size: 9px; letter-spacing: 0.04em;
          padding: 2px 5px; border: 1px solid var(--rule); border-radius: 4px;
          color: var(--ink-3);
        }
        .cp-hint-label {
          font-family: var(--mono); font-size: 9px; color: var(--ink-3);
        }
        .cp-count {
          margin-left: auto;
          font-family: var(--mono); font-size: 9px; color: var(--ink-3); opacity: 0.5;
        }
      `}</style>

      {open && (
        <div
          className="cp-backdrop"
          data-open="true"
          onClick={close}
          role="presentation"
        >
          <div
            className="cp-panel"
            data-open="true"
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            {/* Search header */}
            <div className="cp-search-wrap">
              <span className="cp-search-icon" aria-hidden="true">⌘</span>
              <input
                ref={inputRef}
                className="cp-search-input"
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search 55 tools…"
                aria-label="Search tools and actions"
                autoComplete="off"
                spellCheck={false}
              />
              <button className="cp-esc-btn" onClick={close} tabIndex={-1}>ESC</button>
            </div>

            {/* Results */}
            <div className="cp-results" ref={listRef} role="listbox" aria-label="Results">
              {filtered.length === 0 ? (
                <div className="cp-empty">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((item, i) => (
                  <button
                    key={item.kind === "tool" ? item.slug : item.path}
                    ref={el => { itemRefs.current[i] = el; }}
                    className="cp-item"
                    data-active={i === cursor ? "true" : "false"}
                    role="option"
                    aria-selected={i === cursor}
                    onClick={() => go(item)}
                    onMouseEnter={() => setCursor(i)}
                  >
                    <span className="cp-item-icon" aria-hidden="true">
                      {item.category === "NAV" ? "↗" : "→"}
                    </span>
                    <span className="cp-item-name">{item.name}</span>
                    <span className="cp-item-badge">{item.category}</span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="cp-footer">
              <div className="cp-hint">
                <span className="cp-hint-key">↑↓</span>
                <span className="cp-hint-label">navigate</span>
              </div>
              <div className="cp-hint">
                <span className="cp-hint-key">↵</span>
                <span className="cp-hint-label">open</span>
              </div>
              <div className="cp-hint">
                <span className="cp-hint-key">esc</span>
                <span className="cp-hint-label">close</span>
              </div>
              <span className="cp-count">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
