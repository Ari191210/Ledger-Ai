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
// ── WHY THIS EXISTS AGAIN ────────────────────────────────────────────────
// `/dashboard` was retired into `/home` (M3-3), and `/home` was then deleted
// after three rejected visual passes (PRODUCT_DECISIONS §7.6). Onboarding
// has since pointed at `/capture` and then at `/today`, neither of which was
// a decision so much as whatever route still existed.
//
// The founder's instruction, 2026-09-01: *"after onboarding it should
// redirect to the dashboard"*, and *"i want today to be a button on the
// dashboard and not just open aise hi"* — Today should be something a
// student CHOOSES to open, not the room they are dropped into.
//
// So Today is a card here, with a count on it. Opening it is a decision.
//
// ── WHAT THIS SCREEN MAY SAY ─────────────────────────────────────────────
// Every figure below is read from the student's own record or is absent.
// There is no placeholder number, no peer comparison, no "students like you"
// (V.7.6). A student who finished onboarding sixty seconds ago has nothing
// on record, and this screen has to be correct and calm in exactly that
// state — six empty boxes on day one is what killed `/home`.
//
// The zero case is therefore the DESIGNED case, not the degraded one: the
// panels state what they are waiting for, in a sentence, and the actions
// that would produce the first data are the only things emphasised.
// ═══════════════════════════════════════════════════════════════════════════

interface TodaySummary {
  items: { itemId: string; kind: string; title?: string }[];
  emptyReason: string | null;
}

/** Exactly the fields this screen reads, from `RecordTotals` in lib/record.ts.
 *  `papersCaptured` and `sessionsOpened` are `number | null` at the source and
 *  stay nullable here: null means THAT SOURCE DID NOT ANSWER, and showing it
 *  as 0 would be the product asserting a fact it does not have. */
interface RecordTotals {
  occurrenceCount: number;
  papersCaptured: number | null;
  sessionsOpened: number | null;
  patternsLive: number;
}

export default function DashboardPage() {
  const { user, session, loading } = useAuth();
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [record, setRecord] = useState<RecordTotals | null>(null);
  const [error, setError] = useState("");

  // FIRST RUN. Onboarding finishes with `router.replace("/dashboard?first=1")`
  // and this is the flag that shows the walkthrough exactly once.
  const firstRun = useSearchParams()?.get("first") === "1";

  useEffect(() => {
    if (loading || !user || !session) return;
    const auth = { Authorization: `Bearer ${session.access_token}` };

    // Both reads are independent: one failing must not blank the other, so
    // each settles on its own rather than through Promise.all.
    fetch("/api/today", { headers: auth })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("today"))))
      .then(setToday)
      .catch(() => setError("Could not read your current state."));

    fetch("/api/record", { headers: auth })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("record"))))
      .then(body => setRecord(body?.record?.totals ?? null))
      .catch(() => { /* the record panel shows its waiting state instead */ });
  }, [loading, user, session]);

  const openCount = today?.items.length ?? 0;

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
          <Stack gap={2}>
            <Text step="title" as="h1" weight={500}>
              Your ledger
            </Text>
            <Text as="p" tone="secondary">
              Everything you record is filed here, permanently.
            </Text>
          </Stack>

          {error && (
            <Text as="p" tone="error">
              {error}
            </Text>
          )}

          {/* ── TODAY, as a card you choose to open ──────────────────────
              The founder's point: Today should not "just open aise hi". It
              carries its own count, so the decision to open it is informed
              rather than blind. */}
          <Panel tone="raised" pad={5}>
            <Stack gap={3}>
              <Row gap={2}>
                <Text step="label" tone="secondary">
                  TODAY
                </Text>
                <Spacer />
                {openCount > 0 && (
                  <Chip tone="info">
                    {openCount} open
                  </Chip>
                )}
              </Row>

              {openCount > 0 ? (
                <Text as="p">
                  {openCount === 1
                    ? "One thing is waiting for you."
                    : `${openCount} things are waiting for you.`}
                </Text>
              ) : (
                <Text as="p" tone="secondary">
                  Nothing is due right now. Today fills as your record grows.
                </Text>
              )}

              <Row gap={3}>
                <Control tier="primary" href="/today">
                  Open Today
                </Control>
              </Row>
            </Stack>
          </Panel>

          {/* ── WHAT IS ON RECORD ────────────────────────────────────────
              Four figures, each from the student's own data. On day one they
              are all zero, and the copy under them says what that means
              rather than dressing it up. */}
          <Stack gap={3}>
            <Text step="label" tone="secondary">
              ON RECORD
            </Text>
            <Row gap={4} wrap>
              {/* Each figure is the student's own. A NULL is not a zero: it
                  means that source did not answer, and `Stat` says so in
                  words rather than printing a number nobody can trust. */}
              <Stat label="OCCURRENCES" value={record?.occurrenceCount ?? null} />
              <Stat label="PAPERS" value={record?.papersCaptured ?? null} />
              <Stat label="SESSIONS" value={record?.sessionsOpened ?? null} />
              <Stat label="OPEN PATTERNS" value={record?.patternsLive ?? null} />
            </Row>
            {!record && (
              <Text step="label" tone="secondary">
                Reading your record…
              </Text>
            )}
          </Stack>

          <Rule />

          {/* ── THE REST OF THE PRODUCT ──────────────────────────────────
              Named plainly. A student who wants the long view goes to the
              record; one who wants the breakdown goes to diagnosis. */}
          <Stack gap={3}>
            <Text step="label" tone="secondary">
              GO TO
            </Text>
            <Row gap={3} wrap>
              <Control tier="secondary" href="/record">
                Your record
              </Control>
              <Control tier="secondary" href="/diagnosis">
                Diagnosis
              </Control>
              <Control tier="secondary" href="/tools">
                Tools
              </Control>
            </Row>
          </Stack>
        </Stack>
      </Measure>

      <Walkthrough active={firstRun} />
    </main>
  );
}


/**
 * One figure on the record strip.
 *
 * `value === null` is a real state, not a loading state: `RecordTotals`
 * returns null for a source that could not be read, and lib/record.ts is
 * explicit that those columns are "null, never 0". Printing 0 there would
 * be the product asserting something it does not know, so the panel says
 * "not read" instead and the number is simply absent.
 */
function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <Panel tone="recessed" pad={4}>
      <Stack gap={1}>
        {value === null ? (
          <Text step="label" tone="secondary">not read</Text>
        ) : (
          // `figure`, not `display`. On day one every one of these is 0, and
          // at `display` the four zeros were the loudest thing on a new
          // student's first screen. A count is a quiet fact until there is
          // something to count; `display` is for a figure that has earned the
          // attention.
          <Readout step="figure" value={value} />
        )}
        <Text step="micro" tone="secondary">{label}</Text>
      </Stack>
    </Panel>
  );
}