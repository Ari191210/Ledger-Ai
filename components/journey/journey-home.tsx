"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The journey home — Vision §4 and §27.
//
// Answers three questions in this order, and refuses to answer any of them
// with invented data:
//
//   WHERE AM I?           journey status, and only across tracked areas
//   WHAT DO I DO NEXT?    the prioritised queue, each item citing its source
//   WHAT IS COMING?       real dates from real records
//
// When there is nothing to say, it asks for the missing input instead of
// filling the space. An empty dashboard that states what it needs is more
// useful, and more trustworthy, than a full one built from defaults.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useMemo } from "react";
import { useStudent } from "@/lib/student/use-student";
import {
  journeyStatus, journeyAreas, upcoming, overdue, formatDeadline,
  overallProfileStrength, profileStrength,
} from "@/lib/student/derive";
import { nextBestActions, setupPrompts } from "@/lib/student/next-action";
import { toggleTask } from "@/lib/student/actions";
import {
  PageHead, Panel, Figure, Basis, Meter, EmptyState, Pill,
} from "./primitives";

export default function JourneyHome() {
  const { student, update, hydrated } = useStudent();

  const status   = useMemo(() => journeyStatus(student), [student]);
  const areas    = useMemo(() => journeyAreas(student), [student]);
  const actions  = useMemo(() => nextBestActions(student, 5), [student]);
  const prompts  = useMemo(() => setupPrompts(student), [student]);
  const soon     = useMemo(() => upcoming(student, 60, 6), [student]);
  const late     = useMemo(() => overdue(student), [student]);
  const strength = useMemo(() => overallProfileStrength(student), [student]);
  const dims     = useMemo(() => profileStrength(student), [student]);

  const openTasks = student.tasks.filter(t => !t.done);
  const name = student.profile.name?.trim();

  // Before hydration the store has not been read, so "empty" would be a lie.
  // Reserve the space rather than flashing an empty state that is about to
  // be replaced by real data.
  if (!hydrated) {
    return (
      <div style={{ minHeight: "60vh" }}>
        <PageHead title="Your journey" sub="Reading your record." />
      </div>
    );
  }

  const greeting = greetingFor(new Date());

  return (
    <div>
      <PageHead
        title={name ? `${greeting}, ${name}` : greeting}
        sub="Where you stand, what to do next, and what is coming. Every figure here is computed from records you entered; nothing is estimated."
      />

      {/* ── WHERE AM I ─────────────────────────────────────────────────── */}
      <Panel
        title="Where you stand"
        meta={status.available ? `${status.tracked} of ${status.total} areas tracked` : "nothing tracked yet"}
      >
        {status.available ? (
          <>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 18 }}>
              <Figure
                label="Journey on track" value={status.percent} suffix="%"
                available big
                basis={`Mean of the ${status.tracked} area${status.tracked === 1 ? "" : "s"} you are tracking. Untracked areas are not counted as zero — they appear below as things to start.`}
              />
              <Figure
                label="Profile strength"
                value={strength.available ? strength.score : undefined}
                suffix=" / 10"
                available={strength.available} big
                basis={strength.available
                  ? `Across ${strength.measured} dimension${strength.measured === 1 ? "" : "s"} with recorded evidence.`
                  : "No evidence recorded yet."}
              />
              <Figure
                label="Open tasks" value={openTasks.length} available
                basis={late.length ? `${late.length} deadline${late.length === 1 ? "" : "s"} already passed.` : "Nothing overdue."}
              />
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {areas.map(a => (
                <div key={a.area} style={{
                  display: "grid", gridTemplateColumns: "150px 1fr 44px",
                  gap: 12, alignItems: "center",
                }}>
                  <span style={{
                    fontSize: 12.5,
                    color: a.available ? "var(--ink-2)" : "var(--ink-3)",
                  }}>{a.label}</span>
                  <div>
                    <Meter percent={a.percent} available={a.available} />
                    <Basis>{a.basis}</Basis>
                  </div>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 12, textAlign: "right",
                    color: a.available ? "var(--ink)" : "var(--ink-3)",
                  }}>{a.available ? `${a.percent}%` : "—"}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="Nothing is being tracked yet"
            detail="StudyLedger reports on what you record. Add a college, a test you are planning, or your activities, and this becomes a real picture of where you stand rather than a set of zeroes."
            href="/journey/colleges" cta="Add your first college"
          />
        )}
      </Panel>

      {/* ── WHAT SHOULD I DO NEXT ──────────────────────────────────────── */}
      <Panel
        title="Your next best actions"
        meta={actions.length ? "ranked by urgency and impact" : "nothing to recommend yet"}
      >
        {actions.length > 0 ? (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {actions.map((a, i) => (
              <li key={a.id} style={{
                border: "1px solid var(--rule)",
                borderLeft: `3px solid ${i === 0 ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                borderRadius: "var(--radius-xs)", padding: "12px 14px",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  {i === 0 && <Pill tone="critical">Do this next</Pill>}
                  <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{a.title}</span>
                  {a.dueDate && (
                    <Pill tone={isOverdue(a.dueDate) ? "critical" : "warn"}>
                      {formatDeadline(a.dueDate)}
                    </Pill>
                  )}
                  {a.estimateMinutes && <Pill>{a.estimateMinutes} min</Pill>}
                </div>
                {/* The reason is not decoration: it is the answer to "why am I
                    being told this?", and it always quotes a real record. */}
                <Basis>{a.reason}</Basis>
                <Link href={a.href} style={{
                  display: "inline-block", marginTop: 8, fontSize: 12,
                  fontFamily: "var(--mono)", color: "var(--cinnabar-ink)",
                  textDecoration: "none",
                }}>{a.cta} →</Link>
              </li>
            ))}
          </ol>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0, lineHeight: 1.55 }}>
              There is nothing to recommend, because there is nothing recorded to reason about.
              StudyLedger does not produce generic advice — it needs your actual record first.
            </p>
            {prompts.map(p => (
              <div key={p.title} style={{
                border: "1px dashed var(--rule)", borderRadius: "var(--radius-xs)",
                padding: "10px 12px",
              }}>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{p.title}</div>
                <Basis>{p.detail}</Basis>
                <Link href={p.href} style={{
                  display: "inline-block", marginTop: 6, fontSize: 12,
                  fontFamily: "var(--mono)", color: "var(--cinnabar-ink)", textDecoration: "none",
                }}>{p.cta} →</Link>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── TODAY ──────────────────────────────────────────────────────── */}
      {openTasks.length > 0 && (
        <Panel title="Today" meta={`${openTasks.length} open`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {openTasks.slice(0, 8).map(t => (
              <li key={t.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox" checked={t.done}
                  onChange={() => update(s => toggleTask(s, t.id))}
                  aria-label={`Mark "${t.title}" done`}
                  style={{ accentColor: "var(--cinnabar-ink)", width: 15, height: 15 }}
                />
                <span style={{ fontSize: 13.5, color: "var(--ink-2)", flex: 1 }}>{t.title}</span>
                {t.dueDate && (
                  <Pill tone={isOverdue(t.dueDate) ? "critical" : "neutral"}>
                    {formatDeadline(t.dueDate)}
                  </Pill>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ── UPCOMING ───────────────────────────────────────────────────── */}
      <Panel title="Upcoming" meta={soon.length ? "next 60 days" : "no dates recorded"}>
        {late.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.07em",
              textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 6,
            }}>Passed</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {late.slice(0, 4).map(e => (
                <li key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--ink-2)", flex: 1 }}>{e.title}</span>
                  <Pill tone="critical">{formatDeadline(e.date)}</Pill>
                </li>
              ))}
            </ul>
          </div>
        )}
        {soon.length > 0 ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {soon.map(e => (
              <li key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13.5, color: "var(--ink-2)", flex: 1 }}>{e.title}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)",
                }}>{formatDeadline(e.date)}</span>
              </li>
            ))}
          </ul>
        ) : late.length === 0 && (
          <EmptyState
            title="No dates are being tracked"
            detail="Deadlines appear here automatically once you record a college, a test date, an essay or an opportunity. You never enter a date twice."
            href="/journey/colleges" cta="Add a college"
          />
        )}
      </Panel>

      {/* ── PROFILE INSIGHT ────────────────────────────────────────────── */}
      {strength.available && (
        <Panel title="Profile" meta="evidence recorded, not a prediction">
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 18,
          }}>
            {dims.map(d => (
              <Figure
                key={d.key} label={d.label}
                value={d.available ? d.score : undefined} suffix=" / 10"
                available={d.available} basis={d.basis}
              />
            ))}
          </div>
          <Basis>
            These count documented evidence. They are not a prediction of any admissions
            outcome, and a low score means the evidence is not recorded — not that the work
            was not done.
          </Basis>
        </Panel>
      )}
    </div>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function isOverdue(date: string): boolean {
  const today = new Date();
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return date < t;
}
