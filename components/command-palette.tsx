"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const ITEMS = [
  { n: "↖",  path: "/dashboard",         label: "Dashboard"           },
  { n: "↖",  path: "/dashboard/profile", label: "Profile & Settings"  },
  { n: "14", path: "/tools/syllabus",    label: "Syllabus Parser"     },
  { n: "01", path: "/tools/planner",     label: "Smart Study Planner" },
  { n: "02", path: "/tools/marks",       label: "Marks Predictor"     },
  { n: "03", path: "/tools/notes",       label: "Notes Simplifier"    },
  { n: "04", path: "/tools/doubt",       label: "Doubt Solver"        },
  { n: "05", path: "/tools/focus",       label: "Focus Dashboard"     },
  { n: "06", path: "/tools/career",      label: "Career Pathfinder"   },
  { n: "07", path: "/tools/papers",      label: "Past Papers"         },
  { n: "08", path: "/tools/assignment",  label: "Assignment Rescue"   },
  { n: "09", path: "/tools/resume",      label: "Resume Builder"      },
  { n: "10", path: "/tools/rooms",       label: "Study Rooms"         },
  { n: "11", path: "/tools/tutor",       label: "Topic Tutor"         },
  { n: "12", path: "/tools/dna",         label: "Mistake DNA"         },
  { n: "13", path: "/tools/crunch",      label: "48-Hour Crunch"      },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [cursor,  setCursor]  = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? ITEMS.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.n.includes(query)
      )
    : ITEMS;

  const close = useCallback(() => { setOpen(false); setQuery(""); setCursor(0); }, []);

  const go = useCallback((path: string) => { router.push(path); close(); }, [router, close]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
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
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Arrow + Enter navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape")    { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); return; }
    if (e.key === "Enter" && filtered[cursor]) { go(filtered[cursor].path); }
  }

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80 }}>
      {/* Backdrop */}
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(20,20,20,0.55)" }} />

      {/* Panel */}
      <div style={{ position: "relative", width: "100%", maxWidth: 540, background: "var(--paper)", border: "2px solid var(--ink)", zIndex: 1, display: "flex", flexDirection: "column", maxHeight: "70vh" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--ink)", padding: "0 16px" }}>
          <span className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginRight: 10 }}>⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search tools, pages…"
            style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 15, border: "none", background: "transparent", color: "var(--ink)", padding: "16px 0", outline: "none" }}
          />
          <button onClick={close} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 9, padding: "0 4px" }}>ESC</button>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <div className="mono" style={{ padding: "20px 16px", color: "var(--ink-3)" }}>No results for &ldquo;{query}&rdquo;</div>
          ) : (
            filtered.map((item, i) => (
              <button key={item.path} onClick={() => go(item.path)}
                onMouseEnter={() => setCursor(i)}
                style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 16px", background: i === cursor ? "var(--ink)" : "transparent", color: i === cursor ? "var(--paper)" : "var(--ink)", border: "none", borderBottom: "1px solid var(--rule)", cursor: "pointer", textAlign: "left" }}>
                <span className="mono" style={{ fontSize: 9, opacity: 0.5, width: 20, flexShrink: 0 }}>{item.n}</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 14 }}>{item.label}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ borderTop: "1px solid var(--rule)", padding: "8px 16px", display: "flex", gap: 16 }}>
          {[["↑↓", "navigate"], ["↵", "open"], ["esc", "close"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span className="mono" style={{ fontSize: 9, padding: "1px 5px", border: "1px solid var(--rule)", color: "var(--ink-3)" }}>{k}</span>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
