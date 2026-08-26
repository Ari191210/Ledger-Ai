"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The academic OS shell.
//
// A sticky, translucent system bar rather than a sidebar of forty-six tools.
// The vision's complaint about the old product is that opening it presented a
// menu of everything and a route through nothing, so this is eleven sections
// and no more.
//
// Counts are live and only shown when non-zero: a row of zeroes reads as
// failure, where an absent count reads as an empty start.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useStudent } from "@/lib/student/use-student";
import { overdue } from "@/lib/student/derive";
import { nextBestActions } from "@/lib/student/next-action";
import { TactileProvider } from "@/components/os/tactile-provider";

const SECTIONS = [
  { href: "/journey",               label: "Home" },
  { href: "/journey/tools",         label: "Tools" },
  { href: "/journey/academics",     label: "Academics" },
  { href: "/journey/testing",       label: "Testing" },
  { href: "/journey/activities",    label: "Activities" },
  { href: "/journey/projects",      label: "Projects" },
  { href: "/journey/opportunities", label: "Opportunities" },
  { href: "/journey/colleges",      label: "Colleges" },
  { href: "/journey/applications",  label: "Applications" },
  { href: "/journey/essays",        label: "Essays" },
  { href: "/journey/calendar",      label: "Calendar" },
  { href: "/journey/profile",       label: "Profile" },
] as const;

export default function JourneyShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { student, hydrated } = useStudent();

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
          </nav>
        </div>
      </div>
      <main className="os-shell" id="main-content">{children}</main>
      <TactileProvider />
    </div>
  );
}
