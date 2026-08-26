"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The command palette.
//
// The single largest source of friction in a product with eleven sections and
// forty-six tools is *navigation*: every action costs a scan of the nav, a
// click, and a page load. ⌘K removes that entirely — think of a thing, type
// three letters, press enter.
//
// It searches three kinds of target at once:
//
//   • Sections — the eleven journey surfaces.
//   • Tools    — all forty-six, matched on their registry keywords, so
//                "pomodoro" finds Focus Lab without knowing the name.
//   • Records  — the student's own colleges, essays and tasks, so "purdue"
//                jumps straight to that application rather than to a list.
//
// The last of those is what makes this a system command palette rather than a
// site search: it addresses the student's data, not just our pages.
// ═══════════════════════════════════════════════════════════════════════════

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOOLS_REGISTRY } from "@/lib/tools-registry";
import { useStudent } from "@/lib/student/use-student";
import { feedback, Sound } from "@/lib/os/tactile";

type Item = {
  id: string;
  label: string;
  hint?: string;
  kind: "Section" | "Tool" | "College" | "Essay" | "Task" | "Action";
  href: string;
  /** Extra text matched against, never displayed. */
  keywords?: string;
};

const SECTIONS: Item[] = [
  { id: "s-home",   label: "Home",           kind: "Section", href: "/journey",               keywords: "dashboard overview today next" },
  { id: "s-tools",  label: "Tools",          kind: "Section", href: "/journey/tools",         keywords: "all tools everything" },
  { id: "s-acad",   label: "Academics",      kind: "Section", href: "/journey/academics",     keywords: "subjects marks grades courses weak topics" },
  { id: "s-test",   label: "Testing",        kind: "Section", href: "/journey/testing",       keywords: "sat act scores practice diagnostic" },
  { id: "s-act",    label: "Activities",     kind: "Section", href: "/journey/activities",    keywords: "extracurricular clubs leadership awards" },
  { id: "s-proj",   label: "Projects",       kind: "Section", href: "/journey/projects",      keywords: "building portfolio" },
  { id: "s-opp",    label: "Opportunities",  kind: "Section", href: "/journey/opportunities", keywords: "competitions olympiad scholarship internship" },
  { id: "s-col",    label: "Colleges",       kind: "Section", href: "/journey/colleges",      keywords: "university list reach target likely fit" },
  { id: "s-app",    label: "Applications",   kind: "Section", href: "/journey/applications",  keywords: "checklist submit recommenders" },
  { id: "s-ess",    label: "Essays",         kind: "Section", href: "/journey/essays",        keywords: "personal statement supplemental drafts" },
  { id: "s-cal",    label: "Calendar",       kind: "Section", href: "/journey/calendar",      keywords: "dates deadlines schedule" },
  { id: "s-prof",   label: "Profile",        kind: "Section", href: "/journey/profile",       keywords: "grade curriculum major settings" },
];

/** Ranks a match. Prefix hits beat word-boundary hits beat loose contains,
 *  so typing "col" surfaces "Colleges" above "Focus Lab (protocol)". */
function score(item: Item, q: string): number {
  const label = item.label.toLowerCase();
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 55;
  const hay = `${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase();
  if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(hay)) return 35;
  if (hay.includes(q)) return 18;
  return 0;
}

export function CommandPalette() {
  const router = useRouter();
  const { student } = useStudent();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // The student's own records become addressable. This is the difference
  // between searching a website and commanding a system.
  const items = useMemo<Item[]>(() => {
    const tools: Item[] = TOOLS_REGISTRY.map(t => ({
      id: `t-${t.slug}`,
      label: t.title,
      hint: t.subtitle,
      kind: "Tool",
      href: `/tools/${t.slug}`,
      keywords: (t.keywords ?? []).join(" "),
    }));

    const colleges: Item[] = student.colleges.map(c => ({
      id: `c-${c.id}`,
      label: c.name,
      hint: c.location ?? c.round,
      kind: "College",
      href: "/journey/colleges",
      keywords: `college university ${c.tier} ${c.round}`,
    }));

    const essays: Item[] = student.essays.map(e => ({
      id: `e-${e.id}`,
      label: e.title,
      hint: e.status.replace("-", " "),
      kind: "Essay",
      href: "/journey/essays",
      keywords: `essay draft ${e.kind}`,
    }));

    const tasks: Item[] = student.tasks.filter(t => !t.done).map(t => ({
      id: `k-${t.id}`,
      label: t.title,
      hint: t.dueDate ? `due ${t.dueDate}` : "no date",
      kind: "Task",
      href: "/journey",
      keywords: "task todo",
    }));

    return [...SECTIONS, ...colleges, ...essays, ...tasks, ...tools];
  }, [student]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // With no query, show the way in rather than an arbitrary slice:
      // the sections, which is what someone opening ⌘K blind wants.
      return SECTIONS.slice(0, 8);
    }
    return items
      .map(i => ({ i, s: score(i, q) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 9)
      .map(x => x.i);
  }, [query, items]);

  useEffect(() => setActive(0), [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const go = useCallback((item: Item) => {
    feedback("press");
    close();
    router.push(item.href);
  }, [close, router]);

  // ⌘K / Ctrl-K anywhere, Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        Sound.unlock();
        setOpen(v => {
          if (!v) feedback("tap");
          return !v;
        });
        return;
      }
      if (e.key === "Escape" && open) { e.preventDefault(); close(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => Math.min(a + 1, results.length - 1));
      Sound.hover();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
      Sound.hover();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) go(item);
      else feedback("nope");
    }
  }

  if (!open) {
    return (
      <button className="os-cmd-hint" onClick={() => { Sound.unlock(); feedback("tap"); setOpen(true); }}
        aria-label="Open command palette">
        <span className="os-cmd-hint-key">⌘K</span>
        <span className="os-cmd-hint-label">Jump to…</span>
      </button>
    );
  }

  return (
    <div className="os-cmd-backdrop" onMouseDown={close} role="presentation">
      <div
        className="os-cmd"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="os-cmd-field">
          <span className="os-cmd-caret" aria-hidden="true">›</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a section, tool, college or task…"
            aria-label="Search"
            spellCheck={false}
          />
          <kbd className="os-cmd-esc">esc</kbd>
        </div>

        <div className="os-cmd-list" ref={listRef}>
          {results.length === 0 ? (
            <p className="os-cmd-empty">
              Nothing matches “{query}”. Try what you want to do — “revise”,
              “past paper”, “deadline”.
            </p>
          ) : results.map((item, i) => (
            <button
              key={item.id}
              data-idx={i}
              className="os-cmd-row"
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
            >
              <span className="os-cmd-kind" data-kind={item.kind}>{item.kind}</span>
              <span className="os-cmd-label">{item.label}</span>
              {item.hint && <span className="os-cmd-hint-text">{item.hint}</span>}
              <span className="os-cmd-enter" aria-hidden="true">↵</span>
            </button>
          ))}
        </div>

        <div className="os-cmd-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span style={{ marginLeft: "auto" }}>
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
        </div>
      </div>
    </div>
  );
}
