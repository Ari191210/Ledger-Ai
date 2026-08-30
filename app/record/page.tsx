"use client";

import { useCallback, useEffect, useState } from "react";
import MemoryAsk from "@/components/console/memory-ask";
import {
  Chip,
  Control,
  Empty,
  Measure,
  Panel,
  Readout,
  Row,
  Rule,
  Spacer,
  Stack,
  Text,
  Track,
} from "@/components/console/primitives";
import {
  DEFAULT_WINDOW_MONTHS,
  STATUS_LABEL,
  type AcademicRecordView,
  type RecordPattern,
  type TimelineMonth,
} from "@/lib/record";
import LightsToggle from "@/components/lights-toggle";

// ═══════════════════════════════════════════════════════════════════════════
// /record — M13-3, and the destination of `grade-tracker`'s and
// `/console/analytics`'s redirects.
//
// `PRODUCT_DECISIONS` §2.4: *"**Record** ← `grade-tracker`,
// `/console/analytics`. The longitudinal asset. **One place, forever.**"*
// §3, route 6: *"Proof the ledger accumulates."*
//
//
// WHAT THE TWO ABSORBED SURFACES ACTUALLY WERE, HAVING READ BOTH IN FULL
//
//   grade-tracker (4 tabs)
//     Marks Predictor   self-reported subject scores + weights → weighted
//                       average, grade, two GPAs, "score needed", what-if.
//                       A CALCULATOR OVER CLAIMS. Not carried over.
//     Ledger Score      the v1 index and its four pillars. M14 REBUILDS the
//                       score; reproducing the v1 breakdown here would be a
//                       second place to change it. Not carried over.
//     Peer Heatmap      its own banner says *"not aggregated from real student
//                       sessions"*. S.9. Not carried over.
//     Exam Debrief      self-reported score in, model prose out, parked in
//                       `ledger-exam-debriefs` (Level 0). §3.2 — the product
//                       does not store claims. Not carried over.
//
//   /console/analytics  an UNLINKED STRESS-TEST HARNESS whose own header says
//                       *"NOT a production surface"*. Every figure in it is a
//                       constant. What it was actually testing — sectors, a
//                       per-subject comparison, and a SERIES OF CLOSES OVER
//                       TIME — is the shape below, on rows instead.
//
// THE ONE THING BOTH GENUINELY DID IS THE ONE THING THIS PAGE DOES: show a
// standing moving over time. Every figure here is a sum of rows in a stated
// window, and `lib/record.ts` holds all of the arithmetic.
//
// ONE WORKSPACE, TWO MODES (`PRINCIPLES` law 8) — the pattern `/capture` and
// `/diagnosis` already use. `?view=` is read on mount so a redirect can land on
// the right mode, exactly as `/tools/dna → /tools/post-exam?tab=dna` did in M3.
//
// A QUIET MONTH IS NOT A ZERO. `hasRecord` is false and the month says "no
// record"; it never says "0 marks lost". §4, NEVER SHAME — *"No 'you've been
// inactive for 6 days'"* — applied to a timeline, which is the single easiest
// surface in this product to turn into a wall of reproach.
//
// NOTHING HERE IS A FORECAST. No trend line, no "at this rate", no projection.
// The two surfaces this replaces both forecast; Law 7 is why neither survives.
// ═══════════════════════════════════════════════════════════════════════════

type View = "timeline" | "patterns";

const VIEWS: ReadonlyArray<[View, string]> = [
  ["timeline", "Over time"],
  ["patterns", "What recurs"],
];

/** The windows a student can ask for. Six months is M13-3's done-when and so is
 *  the default; the longer two exist because a record that only ever shows six
 *  months is not *"one place, forever"*. `lib/record.ts` clamps anything else. */
const WINDOWS: ReadonlyArray<[number, string]> = [
  [DEFAULT_WINDOW_MONTHS, "6 months"],
  [12, "1 year"],
  [24, "2 years"],
  [60, "5 years"],
];

type State =
  | { kind: "loading" }
  | { kind: "ready"; record: AcademicRecordView }
  | { kind: "failed"; detail: string };

const DATE = (iso: string | null): string =>
  iso === null
    ? "date not recorded"
    : new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** A short, stable handle for a row. The full id is in the DOM `title` so a
 *  student (or a support conversation) can reach the exact record. */
const handle = (id: string): string => id.slice(0, 8);

export default function RecordPage() {
  const [view, setView] = useState<View>("timeline");
  const [months, setMonths] = useState<number>(DEFAULT_WINDOW_MONTHS);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = useCallback((key: string) => {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "timeline" || v === "patterns") setView(v);
    const m = Number(params.get("months"));
    if (Number.isFinite(m) && WINDOWS.some(([n]) => n === m)) setMonths(m);
  }, []);

  useEffect(() => {
    let alive = true;
    setState({ kind: "loading" });
    fetch(`/api/record?months=${months}`)
      .then(async res => {
        const body = (await res.json()) as {
          ok?: boolean;
          record?: AcademicRecordView;
          detail?: string;
          error?: string;
        };
        if (!alive) return;
        if (!res.ok || !body.ok || !body.record) {
          setState({
            kind: "failed",
            detail: body.detail ?? body.error ?? `the record could not be read (${res.status})`,
          });
          return;
        }
        setState({ kind: "ready", record: body.record });
      })
      .catch(() => {
        if (alive) setState({ kind: "failed", detail: "the network did not answer" });
      });
    return () => {
      alive = false;
    };
  }, [months]);

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
            <Control tier="tertiary" href="/diagnosis">
              Diagnosis
            </Control>
            <Control tier="tertiary" href="/capture">
              Capture
            </Control>
          </Row>
        </Measure>
        <Rule />
      </Stack>

      <Measure>
        <Stack gap={6}>
          <Stack gap={3}>
            <Text step="title" as="h1" weight={500}>
              Record
            </Text>
            <Text step="body" tone="secondary">
              What you have accumulated, month by month, and the errors that keep
              coming back. Nothing here is predicted — every figure is a sum of
              questions you confirmed and papers you captured.
            </Text>
          </Stack>

          <Row gap={2} wrap>
            {WINDOWS.map(([n, label]) => (
              <Control
                key={n}
                tier={months === n ? "primary" : "tertiary"}
                onClick={() => setMonths(n)}
              >
                {label}
              </Control>
            ))}
          </Row>

          <MemoryAsk />

          <Rule />

          {state.kind === "loading" && <Text step="label">Reading your record…</Text>}

          {state.kind === "failed" && (
            <Stack gap={2}>
              <Chip tone="error">Not read</Chip>
              <Text step="body">{state.detail}</Text>
              <Text step="body" tone="secondary">
                Nothing is shown rather than an empty record: a read that did not
                happen is not the same fact as a record with nothing in it.
              </Text>
            </Stack>
          )}

          {state.kind === "ready" && isEmpty(state.record) && (
            <Empty
              title="Your record starts with one paper"
              body="This screen shows what has accumulated — marks, papers, sessions and the errors that repeat. Capture a marked paper and confirm what it found, and the first month appears here."
              action={{ label: "Capture a paper", href: "/capture" }}
            />
          )}

          {state.kind === "ready" && !isEmpty(state.record) && (
            <Stack gap={6}>
              <Standing r={state.record} />

              <Row gap={2}>
                {VIEWS.map(([v, label]) => (
                  <Control
                    key={v}
                    tier={view === v ? "primary" : "tertiary"}
                    onClick={() => setView(v)}
                  >
                    {label}
                  </Control>
                ))}
              </Row>

              {view === "timeline" && (
                <TimelineView r={state.record} open={open} toggle={toggle} />
              )}
              {view === "patterns" && (
                <PatternsView r={state.record} open={open} toggle={toggle} />
              )}

              <Rule />
              <Provenance r={state.record} />
            </Stack>
          )}
        </Stack>
      </Measure>
    </main>
  );
}

/** Mirrors `isEmptyRecord` in `lib/record.ts`. Kept as a call on the value the
 *  endpoint returned rather than re-derived, so the page and the module cannot
 *  disagree about what "empty" means. */
function isEmpty(r: AcademicRecordView): boolean {
  return (
    r.totals.occurrenceCount === 0 &&
    r.totals.patternsListed === 0 &&
    (r.totals.papersCaptured ?? 0) === 0 &&
    (r.totals.sessionsOpened ?? 0) === 0 &&
    r.latestClose === null
  );
}

// ── The standing figure ─────────────────────────────────────────────────────

/** What the window holds, and beside it what it is a sum of. A total with no
 *  reachable rows is the claim this milestone exists to make impossible. */
function Standing({ r }: { r: AcademicRecordView }) {
  const { totals, timeline, window: w } = r;
  return (
    <Stack gap={3}>
      <Readout
        value={totals.marksLost}
        step="display"
        label={`${totals.marksLost} marks lost across ${totals.occurrenceCount} confirmed questions in the last ${w.months} months.`}
      />
      <Row gap={3} wrap>
        <Text step="label">
          marks lost · {totals.occurrenceCount}{" "}
          {plural(totals.occurrenceCount, "question", "questions")} ·{" "}
          {timeline.monthsWithRecord} of {w.months}{" "}
          {plural(w.months, "month", "months")} with a record
        </Text>
        <Spacer />
        {totals.marksAvailable > 0 && (
          <Text step="label">of {totals.marksAvailable} available on those questions</Text>
        )}
      </Row>
      {totals.marksAvailable > 0 && (
        <Track
          value={totals.marksLost / totals.marksAvailable}
          label={`${totals.marksLost} of ${totals.marksAvailable} marks lost on questions you have confirmed`}
        />
      )}

      <Row gap={4} wrap>
        <Text step="label">
          {totals.papersCaptured === null
            ? "papers — not read"
            : `${totals.papersCaptured} ${plural(totals.papersCaptured, "paper", "papers")} captured`}
        </Text>
        <Text step="label">
          {totals.sessionsVerified === null
            ? "sessions — not read"
            : `${totals.sessionsVerified} verified ${plural(totals.sessionsVerified, "session", "sessions")}`}
        </Text>
        <Text step="label">
          {totals.patternsLive} live {plural(totals.patternsLive, "pattern", "patterns")}
          {totals.patternsResolved > 0 ? ` · ${totals.patternsResolved} resolved` : ""}
        </Text>
      </Row>

      {r.latestClose !== null && (
        <Text step="micro" tone="secondary">
          Last recorded close: {r.latestClose.total} on {DATE(`${r.latestClose.capturedOn}T00:00:00.000Z`)}.
          That is what the index read on that day, kept as it was recorded.
        </Text>
      )}
    </Stack>
  );
}

// ── 1 · THE TIMELINE ────────────────────────────────────────────────────────

/**
 * One row per month in the window, newest first — `/console/analytics`'s
 * "recent closes" reading order, which is the one thing about that harness that
 * was right. The row count is the window's month count, never the record's row
 * count, which is what lets six years render in the same shape as six months.
 */
function TimelineView({
  r,
  open,
  toggle,
}: {
  r: AcademicRecordView;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  const months = [...r.timeline.months].reverse();
  const peak = Math.max(1, ...months.map(m => m.marksLost));

  return (
    <Stack gap={4}>
      <Text step="body" tone="secondary">
        Every month in the window is listed, including the quiet ones. A month
        with nothing recorded says so — it is not counted as a month of zero.
      </Text>
      {months.map(m => (
        <Month key={m.month} m={m} peak={peak} open={open} toggle={toggle} />
      ))}
    </Stack>
  );
}

function Month({
  m,
  peak,
  open,
  toggle,
}: {
  m: TimelineMonth;
  peak: number;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  const key = `month:${m.month}`;
  const expanded = open[key] ?? false;

  if (!m.hasRecord) {
    return (
      <Row gap={3} wrap>
        <Text step="body" tone="secondary">
          {m.label}
        </Text>
        <Spacer />
        <Text step="label" tone="secondary">
          no record
        </Text>
      </Row>
    );
  }

  return (
    <Stack gap={2}>
      <Row gap={3} wrap>
        <Text step="body" tone="ink" weight={600}>
          {m.label}
        </Text>
        <Spacer />
        <Readout value={m.marksLost} step="figure" label={`${m.label}: ${m.marksLost} marks lost`} />
        <Text step="label">
          marks · {m.occurrenceCount} {plural(m.occurrenceCount, "question", "questions")}
        </Text>
        {m.occurrenceCount > 0 && (
          <Control tier="tertiary" onClick={() => toggle(key)}>
            {expanded ? "Hide" : "Open"}
          </Control>
        )}
      </Row>

      <Track
        value={m.marksLost / peak}
        size="compact"
        label={`${m.marksLost} marks lost in ${m.label}`}
      />

      <Row gap={3} wrap>
        {m.papersCaptured !== null && m.papersCaptured > 0 && (
          <Text step="micro" tone="secondary">
            {m.papersCaptured} {plural(m.papersCaptured, "paper", "papers")} captured
          </Text>
        )}
        {m.sessionsOpened !== null && m.sessionsOpened > 0 && (
          <Text step="micro" tone="secondary">
            {m.sessionsOpened} {plural(m.sessionsOpened, "session", "sessions")}
            {m.sessionsVerified !== null && m.sessionsVerified > 0
              ? ` · ${m.sessionsVerified} verified`
              : ""}
          </Text>
        )}
        {m.close !== null && (
          <Text step="micro" tone="secondary">
            close {m.close.total} on {m.close.capturedOn}
          </Text>
        )}
      </Row>

      {expanded && (
        <Stack gap={2}>
          {m.subjects.map(s => (
            <Row key={s.subject} gap={2} wrap>
              <Text step="body">{s.subject}</Text>
              <Spacer />
              <Text step="label">
                {s.marksLost} {plural(s.marksLost, "mark", "marks")} ·{" "}
                {s.occurrenceCount} {plural(s.occurrenceCount, "question", "questions")}
              </Text>
            </Row>
          ))}
          <Stack gap={1}>
            {m.occurrenceIds.map(id => (
              <Text key={id} step="micro" tone="secondary">
                <span title={id}>occurrence {handle(id)}</span>
              </Text>
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

// ── 2 · THE PATTERN LIST ────────────────────────────────────────────────────

/**
 * Leaves only (§4.4.2 — parents never own occurrences). `/diagnosis` groups
 * them under their parents because it is answering *what recurs*; this lists
 * them flat with their standing, because the record's question is *what is on
 * it*.
 */
function PatternsView({
  r,
  open,
  toggle,
}: {
  r: AcademicRecordView;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  if (r.patterns.length === 0) {
    return (
      <Stack gap={3}>
        <Text step="body">
          No repeated error has been drawn from your record yet.
        </Text>
        <Text step="body" tone="secondary">
          A pattern is an inference, and this screen will not list one it cannot
          evidence.
        </Text>
      </Stack>
    );
  }

  const live = r.patterns.filter(p => !p.quietInWindow);
  const quiet = r.patterns.filter(p => p.quietInWindow);

  return (
    <Stack gap={5}>
      {live.map(p => (
        <PatternRow key={p.patternId} p={p} open={open} toggle={toggle} />
      ))}

      {quiet.length > 0 && (
        <Stack gap={3}>
          <Rule />
          <Text step="label" tone="ink" weight={600}>
            On the record, quiet in this window
          </Text>
          <Text step="body" tone="secondary">
            {quiet.length} {plural(quiet.length, "pattern", "patterns")} with no
            confirmed question in the last {r.window.months} months. Still on the
            record — a pattern is not removed by a quiet period.
          </Text>
          {quiet.map(p => (
            <Row key={p.patternId} gap={2} wrap>
              <Text step="body" tone="secondary">
                {p.label}
              </Text>
              <Chip tone="neutral">{STATUS_LABEL[p.status]}</Chip>
              <Spacer />
              <Text step="micro" tone="secondary">
                <span title={p.patternId}>pattern {handle(p.patternId)}</span>
              </Text>
            </Row>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function PatternRow({
  p,
  open,
  toggle,
}: {
  p: RecordPattern;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  const key = `pattern:${p.patternId}`;
  const expanded = open[key] ?? false;
  return (
    <Stack gap={2}>
      <Row gap={3} wrap>
        <Text step="body" tone="ink" weight={600}>
          {p.label}
        </Text>
        <Chip tone={p.status === "resolved" ? "progress" : "info"}>
          {STATUS_LABEL[p.status]}
        </Chip>
        <Spacer />
        <Text step="label">
          {p.marksLost} {plural(p.marksLost, "mark", "marks")} ·{" "}
          {p.occurrenceCount} {plural(p.occurrenceCount, "occurrence", "occurrences")}
        </Text>
        <Control tier="tertiary" onClick={() => toggle(key)}>
          {expanded ? "Hide" : "Show"} the {p.occurrenceCount}
        </Control>
      </Row>

      <Text step="micro" tone="secondary">
        {p.errorClass === "cognitive" ? "Cognitive" : "Execution"} · {p.errorTypeLabel}
        {p.subject ? ` · ${p.subject}` : ""} · first seen {DATE(p.firstSeenAt)} · last seen{" "}
        {DATE(p.lastSeenAt)}
        {p.severity !== null && p.severityVersion !== null
          ? ` · severity ${p.severity} (${p.severityVersion})`
          : ""}
      </Text>

      {expanded && (
        <Panel tone="raised" pad={3} bordered>
          <Stack gap={1}>
            {p.occurrenceIds.map(id => (
              <Text key={id} step="micro" tone="secondary">
                <span title={id}>occurrence {handle(id)}</span>
              </Text>
            ))}
          </Stack>
        </Panel>
      )}
    </Stack>
  );
}

// ── Provenance ──────────────────────────────────────────────────────────────

/** Where the page's numbers came from, and what did not make it in. M10's
 *  discipline, and M13-1's: the reader is told what the figure stands on. */
function Provenance({ r }: { r: AcademicRecordView }) {
  return (
    <Stack gap={2}>
      <Text step="micro" tone="secondary">
        Derived from {r.totals.occurrenceCount} confirmed{" "}
        {plural(r.totals.occurrenceCount, "question", "questions")} between{" "}
        {DATE(r.window.fromISO)} and now. Unconfirmed proposals are not counted.
        Nothing on this screen can be deleted — the record is kept permanently.
      </Text>
      {r.refused.map(x => (
        <Text key={x.refusal} step="micro" tone="warn">
          {x.count} {plural(x.count, "row", "rows")} could not be read ({x.refusal}) and{" "}
          {plural(x.count, "is", "are")} excluded from every figure above.
        </Text>
      ))}
      {r.unreadable.map(x => (
        <Text key={x.source} step="micro" tone="warn">
          {x.source} did not answer ({x.message}), so the figures it feeds are shown
          as not read rather than as zero.
        </Text>
      ))}
      {r.truncated.length > 0 && (
        <Text step="micro" tone="warn">
          This window holds more rows than one read returns ({r.truncated.join(", ")}).
          The figures above cover what was listed and are a floor, not a total.
        </Text>
      )}
    </Stack>
  );
}
