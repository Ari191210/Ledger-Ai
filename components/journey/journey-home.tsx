"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The academic OS home — Vision §4 and §27.
//
// Answers three questions, in this order, and refuses to answer any of them
// with invented data:
//
//   WHERE AM I?         journey status, across tracked areas only
//   WHAT DO I DO NEXT?  the prioritised queue, each item citing its source
//   WHAT IS COMING?     real dates, from real records
//
// When there is nothing to say it asks for the missing input rather than
// filling the space. An empty dashboard that states what it needs is more
// useful, and far more trustworthy, than a full one built from defaults.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useMemo } from "react";
import { useStudent } from "@/lib/student/use-student";
import {
  journeyStatus, journeyAreas, upcoming, overdue, formatDeadline, today,
  overallProfileStrength, profileStrength,
} from "@/lib/student/derive";
import { nextBestActions, setupPrompts } from "@/lib/student/next-action";
import { toggleTask } from "@/lib/student/actions";
import { PageHead, Card, Figure, Basis, Meter, Empty, Pill, Section } from "./primitives";

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
  // Reserve the space rather than flashing a state about to be replaced.
  if (!hydrated) {
    return (
      <div style={{ minHeight: "60vh" }}>
        <PageHead title="Your journey" sub="Reading your record." />
      </div>
    );
  }

  return (
    <div>
      <PageHead
        eyebrow={new Date().toLocaleDateString("en-GB", {
          weekday: "long", day: "numeric", month: "long",
        })}
        title={name ? `${greetingFor(new Date())}, ${name}` : greetingFor(new Date())}
        sub="Where you stand, what to do next, and what is coming. Every figure here is computed from records you entered — nothing is estimated."
      />

      {/* ── WHERE AM I ─────────────────────────────────────────────────── */}
      <Card
        title="Where you stand"
        meta={status.available ? `${status.tracked} of ${status.total} areas tracked` : undefined}
      >
        {status.available ? (
          <>
            <div style={{ display: "flex", gap: 44, flexWrap: "wrap", marginBottom: 22 }}>
              <Figure
                label="Journey on track" value={status.percent} unit="%" available size="lg"
                basis={`Mean of the ${status.tracked} area${status.tracked === 1 ? "" : "s"} you are tracking. Untracked areas are not counted as zero — they appear below as things to begin.`}
              />
              <Figure
                label="Profile strength"
                value={strength.available ? strength.score : undefined} unit="/10"
                available={strength.available} size="lg"
                basis={strength.available
                  ? `Across ${strength.measured} dimension${strength.measured === 1 ? "" : "s"} with recorded evidence.`
                  : "No evidence recorded yet."}
              />
              <Figure
                label="Open tasks" value={openTasks.length} available size="lg"
                basis={late.length
                  ? `${late.length} deadline${late.length === 1 ? "" : "s"} already passed.`
                  : "Nothing overdue."}
              />
            </div>

            <div className="os-areas">
              {areas.map(a => (
                <div key={a.area} className="os-area-row">
                  <span className="os-area-name" style={{
                    color: a.available ? "var(--os-ink-2)" : "var(--os-ink-4)",
                  }}>{a.label}</span>
                  <div className="os-area-meter">
                    <Meter percent={a.percent} available={a.available} />
                    <Basis>{a.basis}</Basis>
                  </div>
                  <span className="os-num os-area-value" style={{
                    color: a.available ? "var(--os-ink)" : "var(--os-ink-4)",
                    fontWeight: a.available ? 550 : 400,
                  }}>{a.available ? `${a.percent}%` : "—"}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title="Nothing is being tracked yet"
            body="StudyLedger reports on what you record. Add a college, a test you are planning, or your activities, and this becomes a real picture of where you stand rather than a set of zeroes."
            href="/journey/colleges" cta="Add your first college"
          />
        )}
      </Card>

      {/* ── WHAT SHOULD I DO NEXT ──────────────────────────────────────── */}
      <Section>Your next best actions</Section>

      {actions.length > 0 ? (
        <div className="os-stack-sm">
          {actions.map((a, i) => (
            <Link key={a.id} href={a.href} className="os-action" data-rank={i}>
              <div className="os-row" style={{ gap: 9, marginBottom: 5 }}>
                {i === 0 && <Pill tone="accent">Do this next</Pill>}
                <span className="os-action-title">{a.title}</span>
                {a.dueDate && (
                  <Pill tone={a.dueDate < today() ? "risk" : "warn"}>
                    {formatDeadline(a.dueDate)}
                  </Pill>
                )}
                {a.estimateMinutes && <Pill>{a.estimateMinutes} min</Pill>}
              </div>
              {/* The reason is not decoration. It is the answer to "why am I
                  being told this?", and it always quotes a real record. */}
              <Basis>{a.reason}</Basis>
              <span className="os-link" style={{ display: "inline-block", marginTop: 9 }}>
                {a.cta} &rarr;
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <p style={{ fontSize: 14, color: "var(--os-ink-3)", margin: "0 0 16px", lineHeight: 1.6 }}>
            There is nothing to recommend, because there is nothing recorded to reason about.
            StudyLedger does not produce generic advice — it needs your record first.
          </p>
          <div className="os-stack-sm">
            {prompts.map(p => (
              <Link key={p.title} href={p.href} className="os-action">
                <div className="os-action-title">{p.title}</div>
                <Basis>{p.detail}</Basis>
                <span className="os-link" style={{ display: "inline-block", marginTop: 8 }}>
                  {p.cta} &rarr;
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* ── TODAY ──────────────────────────────────────────────────────── */}
      {openTasks.length > 0 && (
        <>
          <Section>Today</Section>
          <Card meta={`${openTasks.length} open`}>
            <ul className="os-list">
              {openTasks.slice(0, 8).map(t => (
                <li key={t.id}>
                  <input
                    type="checkbox" checked={t.done}
                    onChange={() => update(s => toggleTask(s, t.id))}
                    aria-label={`Mark "${t.title}" done`}
                  />
                  <span className="os-list-title">{t.title}</span>
                  {t.dueDate && (
                    <Pill tone={t.dueDate < today() ? "risk" : "neutral"}>
                      {formatDeadline(t.dueDate)}
                    </Pill>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {/* ── UPCOMING ───────────────────────────────────────────────────── */}
      <Section>Upcoming</Section>
      <Card meta={soon.length ? "next 60 days" : undefined}>
        {late.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div className="os-figure-label" style={{ color: "var(--os-risk)" }}>Passed</div>
            <ul className="os-list">
              {late.slice(0, 4).map(e => (
                <li key={e.id}>
                  <span className="os-list-title">{e.title}</span>
                  <Pill tone="risk">{formatDeadline(e.date)}</Pill>
                </li>
              ))}
            </ul>
          </div>
        )}
        {soon.length > 0 ? (
          <ul className="os-list">
            {soon.map(e => (
              <li key={e.id}>
                <span className="os-list-title">{e.title}</span>
                <span className="os-num" style={{ fontSize: 12.5, color: "var(--os-ink-4)" }}>
                  {formatDeadline(e.date)}
                </span>
              </li>
            ))}
          </ul>
        ) : late.length === 0 && (
          <Empty
            title="No dates are being tracked"
            body="Deadlines appear here automatically once you record a college, a test date, an essay or an opportunity. You never enter a date twice."
            href="/journey/colleges" cta="Add a college"
          />
        )}
      </Card>

      {/* ── PROFILE ────────────────────────────────────────────────────── */}
      {strength.available && (
        <>
          <Section>Profile</Section>
          <Card meta="evidence recorded, not a prediction">
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))", gap: 22,
            }}>
              {dims.map(d => (
                <Figure
                  key={d.key} label={d.label}
                  value={d.available ? d.score : undefined} unit="/10"
                  available={d.available} basis={d.basis}
                />
              ))}
            </div>
            <Basis>
              These count documented evidence. They are not a prediction of any admissions
              outcome, and a low score means the evidence is not recorded — not that the work
              was not done.
            </Basis>
          </Card>
        </>
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
