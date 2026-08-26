"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The academic OS shell.
//
// A sticky, translucent system bar rather than a sidebar of forty-six tools.
// The vision's complaint about the old product is that opening it presented a
// menu of everything and a route through nothing — so the bar carries the five
// surfaces opened daily, seven more sit under "More", and every tool lives on
// its own page. ⌘K reaches all of it, including the student's own records.
//
// Counts are live and only shown when non-zero: a row of zeroes reads as
// failure, where an absent count reads as an empty start.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStudent } from "@/lib/student/use-student";
import { overdue } from "@/lib/student/derive";
import { nextBestActions } from "@/lib/student/next-action";
import { TactileProvider } from "@/components/os/tactile-provider";
import { CommandPalette } from "@/components/os/command-palette";

// The daily five. Everything else lives in ⌘K and on the Tools page —
// a nav that lists every destination is a nav nobody reads.
const SECTIONS = [
  { href: "/journey",              label: "Home" },
  { href: "/journey/tools",        label: "Tools" },
  { href: "/journey/colleges",     label: "Colleges" },
  { href: "/journey/applications", label: "Applications" },
  { href: "/journey/calendar",     label: "Calendar" },
] as const;

/* Reachable from ⌘K, from the Tools page, and by direct link. Kept out of the
   bar so the five above stay legible at a glance. */
const MORE = [
  { href: "/journey/academics",     label: "Academics" },
  { href: "/journey/testing",       label: "Testing" },
  { href: "/journey/activities",    label: "Activities" },
  { href: "/journey/projects",      label: "Projects" },
  { href: "/journey/opportunities", label: "Opportunities" },
  { href: "/journey/essays",        label: "Essays" },
  { href: "/journey/profile",       label: "Profile" },
] as const;

export default function JourneyShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { student, hydrated } = useStudent();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  // Close the overflow menu on an outside click, on Escape, and on navigation.
  // A menu that survives the click that navigated is a menu left hanging over
  // the page you just asked for.
  useEffect(() => setMoreOpen(false), [path]);
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const counts = useMemo(() => ({
    "/journey/colleges":      student.colleges.length,
    "/journey/applications":  student.applications.filter(a => !a.submitted).length,
    "/journey/essays":        student.essays.filter(e => e.status !== "final").length,
    "/journey/opportunities": student.opportunities.filter(o => o.stage === "saved" || o.stage === "interested").length,
    "/journey/projects":      student.projects.filter(p => p.status !== "archived").length,
    "/journey/activities":    student.activities.length,
  } as Record<string, number>), [student]);

  // The dot on Home means something needs attention today: a date already
  // passed, or an action the engine ranked as urgent.
  const attention = useMemo(
    () => (hydrated
      ? overdue(student).length + nextBestActions(student, 3).filter(a => a.weight >= 1000).length
      : 0),
    [student, hydrated],
  );

  return (
    <div data-os>
      <div className="os-bar">
        <div className="os-bar-inner">
          <Link href="/journey" className="os-wordmark">StudyLedger</Link>
          <nav className="os-nav" aria-label="Sections">
            {SECTIONS.map(s => {
              const active = s.href === "/journey" ? path === "/journey" : path.startsWith(s.href);
              const n = counts[s.href] ?? 0;
              return (
                <Link key={s.href} href={s.href} className="os-nav-item" data-active={active}>
                  {s.label}
                  {hydrated && n > 0 && <span className="os-nav-count os-num">{n}</span>}
                  {hydrated && s.href === "/journey" && attention > 0 && (
                    <span className="os-dot" aria-label={`${attention} need attention`} />
                  )}
                </Link>
              );
            })}

            <div className="os-more" ref={moreRef}>
              <button
                className="os-nav-item os-more-btn"
                data-active={MORE.some(m => path.startsWith(m.href))}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => setMoreOpen(v => !v)}
              >
                More
                <span className="os-more-chev" data-open={moreOpen} aria-hidden="true">▾</span>
              </button>
              {moreOpen && (
                <div className="os-more-menu" role="menu">
                  {MORE.map(m => {
                    const n = counts[m.href] ?? 0;
                    return (
                      <Link key={m.href} href={m.href} role="menuitem"
                        className="os-more-item" data-active={path.startsWith(m.href)}>
                        {m.label}
                        {hydrated && n > 0 && <span className="os-nav-count os-num">{n}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
      <main className="os-shell" id="main-content">{children}</main>
      <TactileProvider />
      <CommandPalette />
    </div>
  );
}
