"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The journey shell — Vision §3.
//
// Eleven sections, not forty-six tools. The nav is deliberately short: the
// vision's complaint about the old product is that opening it presented a
// menu of everything rather than a route through anything.
//
// Counts on the nav are live, so the shell itself reports the state of the
// system. A count is only shown when it is non-zero — a row of zeroes reads
// as failure rather than as an empty start.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useStudent } from "@/lib/student/use-student";
import { nextBestActions } from "@/lib/student/next-action";
import { overdue } from "@/lib/student/derive";

const SECTIONS = [
  { href: "/journey",               label: "Home" },
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

  const attention = useMemo(
    () => (hydrated ? overdue(student).length + nextBestActions(student, 3).filter(a => a.weight >= 1000).length : 0),
    [student, hydrated],
  );

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0,1fr)",
      maxWidth: 1180, margin: "0 auto", padding: "28px 20px 80px",
    }}>
      <nav aria-label="Journey sections" style={{
        display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 30,
        borderBottom: "1px solid var(--rule)", paddingBottom: 10,
      }}>
        {SECTIONS.map(s => {
          const active = s.href === "/journey" ? path === "/journey" : path.startsWith(s.href);
          const n = counts[s.href] ?? 0;
          return (
            <Link key={s.href} href={s.href} style={{
              fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
              textTransform: "uppercase", textDecoration: "none",
              padding: "6px 10px", borderRadius: "var(--radius-xs)",
              color: active ? "var(--ink)" : "var(--ink-3)",
              background: active ? "var(--rule-2)" : "transparent",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {s.label}
              {hydrated && n > 0 && (
                <span style={{
                  fontSize: 9.5, color: "var(--ink-3)",
                  border: "1px solid var(--rule)", borderRadius: 8, padding: "0 5px",
                }}>{n}</span>
              )}
              {hydrated && s.href === "/journey" && attention > 0 && (
                <span aria-label={`${attention} needing attention`} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "var(--cinnabar-ink)",
                }} />
              )}
            </Link>
          );
        })}
      </nav>
      <main>{children}</main>
    </div>
  );
}
