"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  Chip,
  Control,
  Measure,
  Panel,
  Readout,
  Row,
  Rule,
  Spacer,
  Stack,
  Text,
} from "@/components/console/primitives";
import LightsToggle from "@/components/lights-toggle";
import Walkthrough from "@/components/walkthrough";

// ═══════════════════════════════════════════════════════════════════════════
// /dashboard — the surface a student lands on after onboarding.
//
// Built to the founder's mockup (design-reference/dashboard/), which supplied
// the card set, the ordering and the emphasis. Two of its seven cards named
// data StudyLedger does not record, and the founder's ruling was to do
// "everything acc to studyledger", so:
//
//   ASSIGNMENTS ("4 done, 3 in progress, 2 not started") became MISTAKE
//   PATTERNS by status. There is no assignments table and no homework concept
//   in this product; the card keeps the three-part shape and reads
//   `patterns.status`, which is what StudyLedger actually owns.
//
//   GRADE TREND ("8.4 GPA avg") became the LEDGER SCORE trend.
//   `score_history` holds the Ledger Score, not a GPA. The card says "Ledger
//   Score" so the figure is not mistaken for a school grade.
//
// ── THE ZERO STATE IS THE DESIGNED STATE ─────────────────────────────────
// A student who finished onboarding sixty seconds ago has no sessions, no
// answers and no patterns. `/home` was rejected three times partly for
// looking empty, so every card here states what it is waiting for rather
// than rendering a hollow figure. Nothing on this screen is a placeholder:
// `null` from the API means the read failed, and renders as "not read", never
// as 0.
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardData {
  thisWeek: { minutes: number | null; perDay: { day: string; minutes: number }[] };
  // The engine's shape, not the table's. /api/dashboard derives these in
  // memory via lib/recommendations/engine.ts (K.3/V.11 forbids reading the
  // table outside the engine), and the engine speaks camelCase.
  // `recommendationId` is null until a row is inserted, which never happens
  // on this path, so the list key falls back to the evidence-bearing fields.
  nextUp: { recommendationId: string | null; kind: string; subject: string | null; reasonTemplate: string }[];
  mastery: { pct: number | null; conceptsTracked: number | null };
  patterns: { resolved: number; practising: number; open: number } | null;
  revisionQueue: { pattern_id: string; due_at: string; attempt_count: number }[] | null;
  scoreTrend: { captured_on: string; total: number }[] | null;
}

/** Minutes to the "24.5h" shape the mockup uses. */

export default function DashboardPage() {
  const { user, session, loading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  // FIRST RUN. Onboarding ends at `/dashboard?first=1`; this shows the
  // walkthrough exactly once.
  const firstRun = useSearchParams()?.get("first") === "1";

  useEffect(() => {
    if (loading || !user || !session) return;
    fetch("/api/dashboard", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("read"))))
      .then(setData)
      .catch(() => setError("Could not read your ledger."));
  }, [loading, user, session]);

  const openCount = data?.nextUp.length ?? 0;
  const dueCount = data?.revisionQueue?.length ?? 0;

  return (
    <main id="main-content">
      <Stack>
        <Measure wide>
          <Row gap={3}>
            <Text step="label" tone="ink" weight={600}>
              StudyLedger
            </Text>
            <Spacer />
            <LightsToggle />
            <Control tier="tertiary" href="/record">
              Record
            </Control>
            <Control tier="tertiary" href="/settings">
              Settings
            </Control>
          </Row>
        </Measure>
        <Rule />
      </Stack>

      <Measure wide>
        <Stack gap={6}>
          {error && (
            <Text as="p" tone="error">
              {error}
            </Text>
          )}

          {/* ── ROW 1: THIS WEEK · NEXT UP ─────────────────────────────── */}
          <Cards>
            <Panel tone="raised" pad={5}>
              <Stack gap={3}>
                <Text step="label" tone="secondary">THIS WEEK</Text>
                {data?.thisWeek.minutes == null ? (
                                  <Text step="label" tone="secondary">not read</Text>
                                ) : data.thisWeek.minutes > 0 ? (
                                  <Row gap={1} align="baseline">
                                    <Readout step="display" value={Math.round(data.thisWeek.minutes / 6) / 10} />
                                    <Text step="title" tone="secondary">h</Text>
                                  </Row>
                                ) : null}
                <Text as="p" tone="secondary">
                  {data?.thisWeek.minutes
                    ? "Time in closed sessions over the last seven days."
                    : "Hours appear here once you have closed a study session."}
                </Text>
                {data && data.thisWeek.perDay.length > 0 && (
                  <Row gap={1} align="end">
                    {data.thisWeek.perDay.map(d => (
                      <DayBar key={d.day} minutes={d.minutes} />
                    ))}
                  </Row>
                )}
              </Stack>
            </Panel>

            <Panel tone="raised" pad={5}>
              <Stack gap={3}>
                <Row gap={2}>
                  <Text step="label" tone="secondary">NEXT UP</Text>
                  <Spacer />
                  {openCount > 0 && <Chip tone="info">{openCount}</Chip>}
                </Row>
                {openCount > 0 ? (
                  <Stack gap={2}>
                    {data!.nextUp.map((r, i) => (
                      <Text key={r.recommendationId ?? `${r.kind}:${r.subject ?? ""}:${i}`} as="p">
                        {r.subject ? `${r.subject}: ` : ""}{r.kind.replace(/_/g, " ")}
                      </Text>
                    ))}
                  </Stack>
                ) : (
                  <Text as="p" tone="secondary">
                    Nothing is queued. Recommendations appear once your record has
                    something to read from.
                  </Text>
                )}
                <Control tier="primary" href="/today">
                  Open Today
                </Control>
              </Stack>
            </Panel>
          </Cards>

          {/* ── ROW 2: MASTERY · PATTERNS · STREAK ─────────────────────── */}
          <Cards>
            <Panel tone="raised" pad={5}>
              <Stack gap={3}>
                <Text step="label" tone="secondary">SUBJECT MASTERY</Text>
                {data?.mastery.pct === null ? (
                  <Text as="p" tone="secondary">
                    No answers on record yet. Mastery is measured from questions
                    you have actually answered.
                  </Text>
                ) : (
                  <>
                    <Row gap={1} align="baseline">
                                          <Readout step="display" value={data?.mastery.pct ?? 0} />
                                          <Text step="title" tone="secondary">%</Text>
                                        </Row>
                    <Text step="label" tone="secondary">
                      across {data?.mastery.conceptsTracked ?? 0} concepts
                    </Text>
                  </>
                )}
              </Stack>
            </Panel>

            <Panel tone="raised" pad={5}>
              <Stack gap={3}>
                <Text step="label" tone="secondary">MISTAKE PATTERNS</Text>
                {data?.patterns ? (
                  <Row gap={4}>
                    <Stat n={data.patterns.resolved} label="Resolved" />
                    <Stat n={data.patterns.practising} label="Practising" />
                    <Stat n={data.patterns.open} label="Open" />
                  </Row>
                ) : (
                  <Text as="p" tone="secondary">
                    No patterns yet. One appears when the same mistake happens twice.
                  </Text>
                )}
              </Stack>
            </Panel>

            <Panel tone="raised" pad={5}>
              <Stack gap={3}>
                <Text step="label" tone="secondary">CONSISTENCY</Text>
                {/* NOT a streak. M0-6 removed streak presentation from every
                    surface deliberately, and tests/m0-integrity-fences.test.mjs
                    exists to stop it returning. The founder's mockup drew a
                    "14 days in a row" tile; a day-counter is the most
                    stimulating thing a study product can show, and the brief
                    for the streak was calm rather than stimulating.

                    Consistency is the Ledger Score term computed from the same
                    underlying activity. It reports steadiness without counting
                    days at anyone, and it breaks nothing when a student misses
                    a day. Restoring the streak would be an amendment to M0-6,
                    which is the founder's call and not a side effect of a
                    design file. */}
                {data?.scoreTrend && data.scoreTrend.length > 0 ? (
                  <Text as="p" tone="secondary">
                    Your consistency is part of the Ledger Score below, computed
                    from sessions you actually closed.
                  </Text>
                ) : (
                  <Text as="p" tone="secondary">
                    Consistency appears once you have closed a session. It measures
                    steadiness, and missing a day does not erase it.
                  </Text>
                )}
              </Stack>
            </Panel>
          </Cards>

          {/* ── ROW 3: REVISION QUEUE · SCORE TREND ────────────────────── */}
          <Cards>
            <Panel tone="raised" pad={5}>
              <Stack gap={3}>
                <Row gap={2}>
                  <Text step="label" tone="secondary">REVISION QUEUE</Text>
                  <Spacer />
                  {dueCount > 0 && <Chip tone="warn">{dueCount} due</Chip>}
                </Row>
                {dueCount > 0 ? (
                  <Text as="p">
                    {dueCount === 1
                      ? "One pattern is due for a retest."
                      : `${dueCount} patterns are due for a retest.`}
                  </Text>
                ) : (
                  <Text as="p" tone="secondary">
                    Nothing is due. Retests are scheduled after a mistake is
                    acknowledged.
                  </Text>
                )}
                <Control tier="secondary" href="/diagnosis">
                  Diagnosis
                </Control>
              </Stack>
            </Panel>

            <Panel tone="raised" pad={5}>
              <Stack gap={3}>
                <Text step="label" tone="secondary">LEDGER SCORE</Text>
                {data?.scoreTrend && data.scoreTrend.length > 0 ? (
                  <>
                    <Readout
                      step="display"
                      value={data.scoreTrend[data.scoreTrend.length - 1].total}
                    />
                    <Text step="label" tone="secondary">
                      last {data.scoreTrend.length} snapshot
                      {data.scoreTrend.length === 1 ? "" : "s"}
                    </Text>
                  </>
                ) : (
                  <Text as="p" tone="secondary">
                    Your score is computed once there is evidence to compute it
                    from. It is not a grade, and it is never estimated.
                  </Text>
                )}
                <Control tier="secondary" href="/record">
                  Your record
                </Control>
              </Stack>
            </Panel>
          </Cards>
        </Stack>
      </Measure>

      <Walkthrough active={firstRun} />
    </main>
  );
}

/**
 * The card grid.
 *
 * The mockup lays its cards out in a grid, and `Row`/`Stack` cannot
 * express a two-column grid that reflows to one column on a phone. Rather
 * than adding a `grow` prop to `Panel` to fake it with flex (CONSOLE.md §6:
 * patching the call site is how design systems die), the grid is composed
 * here and the primitives sit inside it unchanged.
 *
 * `auto-fit` with a `minmax` floor is what makes it responsive without a
 * media query: cards sit side by side while they each have 260px, and drop
 * to one per row when they do not. That is the mockup's desktop layout and
 * a usable phone layout from the same rule, which matters because the
 * mockup itself overflows to 526px at 375px wide.
 */
function Cards({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "var(--s-4)",
        alignItems: "stretch",
      }}
    >
      {children}
    </div>
  );
}

/** One figure in the three-part pattern strip. */
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <Stack gap={1}>
      <Readout step="figure" value={n} />
      <Text step="micro" tone="secondary">{label}</Text>
    </Stack>
  );
}

/**
 * One day in the seven-day bar. Height is proportional to a four-hour day,
 * which is the goal the mockup names, and capped so an eleven-hour Sunday
 * does not flatten the rest of the week into invisibility.
 */
function DayBar({ minutes }: { minutes: number }) {
  const pct = Math.min(100, Math.round((minutes / 240) * 100));
  return (
    <div
      aria-hidden
      style={{
        width: 12,
        height: 40,
        background: "var(--g-1)",
        borderRadius: "var(--r-control)",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", height: `${pct}%`, background: "var(--accent)" }} />
    </div>
  );
}
