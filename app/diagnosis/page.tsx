"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Chip,
  Control,
  Empty,
  Measure,
  Readout,
  Row,
  Rule,
  Spacer,
  Stack,
  Text,
  Track,
} from "@/components/console/primitives";
import type { Diagnosis, PatternGroup, RecurringPattern } from "@/lib/diagnosis";
import LightsToggle from "@/components/lights-toggle";

// ═══════════════════════════════════════════════════════════════════════════
// /diagnosis — M13-1, and the destination of M13-2's seven redirects.
//
// `PRODUCT_DECISIONS` §2.4: *"Six metaphors for one answer. **Merging them IS
// the product.**"* Architecture S.4: seven tools **REBUILD as one**.
//
//
// EVERY FIGURE ON THIS PAGE IS A SUM OF ROWS IT CAN NAME
//
// The page holds no arithmetic. `lib/diagnosis.ts` derives every tally from
// `confirmed_occurrences` and `patterns`, and every tally arrives carrying the
// occurrence ids it is a sum of — which this page renders, as a count and as an
// expandable trail down to the `evidence` row behind each mark.
//
// There is no constant in this file that becomes a number on the screen. The
// only literals here are labels. That is M13-1's done-when — *"every claim on
// the surface reaches a record"* — made structural rather than reviewed.
//
// WHAT THE SEVEN TOOLS DID, AND WHERE IT WENT
//
//   post-exam (DNA tab)   marks and counts by error category  →  MARKS
//   paper-autopsy         error types with mark loss, repeats →  MARKS + RECURRENCE
//   marks-obituary        per-question error class, aggregate →  MARKS + RECURRENCE
//   paper-trauma          clusters of repeated loss, severity →  RECURRENCE
//   marks-forensics       per-question mark accounting        →  the trail
//   calibration           confidence stated before answering  →  CALIBRATION
//
// All six asked a MODEL to invent those numbers from text the student retyped.
// This asks the record. The seventh, `paper-pattern`, predicted next year's
// paper from no data at all and has no honest counterpart — stated in
// `next.config.mjs` beside its redirect rather than quietly reproduced.
//
// ONE WORKSPACE, THREE MODES (`PRINCIPLES` law 8) — the pattern `/capture`
// already uses. `?view=` is read on mount so the redirects can land on the
// right mode, exactly as `/tools/dna → /tools/post-exam?tab=dna` did in M3.
//
// NO DELETION EXISTS ANYWHERE ON THIS SURFACE. Architecture P.4 records that
// `post-exam` was *"the only tool that can destroy the record"*; its target is
// *"read + status transitions only, **with deletion removed**"*. There is no
// clear, no wipe, no reset and no DELETE verb in `lib/diagnosis.ts`,
// `/api/diagnosis` or this file.
// ═══════════════════════════════════════════════════════════════════════════

type View = "marks" | "recurrence" | "calibration";

const VIEWS: ReadonlyArray<[View, string]> = [
  ["marks", "What you lost"],
  ["recurrence", "What recurs"],
  ["calibration", "What you expected"],
];

type State =
  | { kind: "loading" }
  | { kind: "ready"; diagnosis: Diagnosis }
  | { kind: "failed"; detail: string };

const DATE = (iso: string | null): string =>
  iso === null ? "date not recorded" : new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** A short, stable handle for a row. The full id is in the DOM `title` so a
 *  student (or a support conversation) can reach the exact record. */
const handle = (id: string): string => id.slice(0, 8);

export default function DiagnosisPage() {
  const [view, setView] = useState<View>("marks");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = useCallback((key: string) => {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "marks" || v === "recurrence" || v === "calibration") setView(v);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/diagnosis")
      .then(async res => {
        const body = (await res.json()) as {
          ok?: boolean;
          diagnosis?: Diagnosis;
          detail?: string;
          error?: string;
        };
        if (!alive) return;
        if (!res.ok || !body.ok || !body.diagnosis) {
          setState({
            kind: "failed",
            detail: body.detail ?? body.error ?? `the record could not be read (${res.status})`,
          });
          return;
        }
        setState({ kind: "ready", diagnosis: body.diagnosis });
      })
      .catch(() => {
        if (alive) setState({ kind: "failed", detail: "the network did not answer" });
      });
    return () => {
      alive = false;
    };
  }, []);

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
          </Row>
        </Measure>
        <Rule />
      </Stack>

      <Measure>
        <Stack gap={6}>
          <Stack gap={3}>
            <Text step="title" as="h1" weight={500}>
              Diagnosis
            </Text>
            <Text step="body" tone="secondary">
              What you lost, why, and what keeps happening. Every figure here is a
              sum of marked questions you confirmed. Open any one to see the
              paper it came from.
            </Text>
          </Stack>

          <Rule />

          {state.kind === "loading" && <Text step="label">Reading your record…</Text>}

          {state.kind === "failed" && (
            <Stack gap={2}>
              <Chip tone="error">Not read</Chip>
              <Text step="body">{state.detail}</Text>
              <Text step="body" tone="secondary">
                Nothing is shown rather than an empty diagnosis: a read that did
                not happen is not the same fact as a record with nothing in it.
              </Text>
            </Stack>
          )}

          {state.kind === "ready" && state.diagnosis.occurrencesRead === 0 && (
            <Empty
              title="Nothing to diagnose yet"
              body="This screen reads marked questions you have confirmed. Once confirmed questions are on your record, the breakdown appears here."
              action={{ label: "See what to do next", href: "/today" }}
            />
          )}

          {state.kind === "ready" && state.diagnosis.occurrencesRead > 0 && (
            <Stack gap={6}>
              <Standing d={state.diagnosis} />

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

              {view === "marks" && (
                <MarksView d={state.diagnosis} open={open} toggle={toggle} />
              )}
              {view === "recurrence" && (
                <RecurrenceView d={state.diagnosis} open={open} toggle={toggle} />
              )}
              {view === "calibration" && <CalibrationView d={state.diagnosis} />}

              <Rule />
              <Provenance d={state.diagnosis} />
            </Stack>
          )}
        </Stack>
      </Measure>
    </main>
  );
}

// ── The standing figure ─────────────────────────────────────────────────────

/** Marks lost, and beside it the count of records that sum to it. The count is
 *  not decoration: a total with no reachable rows is the claim this milestone
 *  exists to make impossible. */
function Standing({ d }: { d: Diagnosis }) {
  const { marksLost, marksAvailable } = d.marksLost;
  return (
    <Stack gap={3}>
      <Readout
        value={marksLost}
        step="display"
        label={`${marksLost} marks lost across ${d.occurrencesRead} confirmed questions.`}
      />
      <Row gap={3} wrap>
        <Text step="label">
          marks lost · {d.occurrencesRead} question{d.occurrencesRead === 1 ? "" : "s"} ·{" "}
          {d.evidenceCount} paper{d.evidenceCount === 1 ? "" : "s"}
        </Text>
        <Spacer />
        {marksAvailable > 0 && (
          <Text step="label">of {marksAvailable} available on those questions</Text>
        )}
      </Row>
      {marksAvailable > 0 && (
        <Track
          value={marksLost / marksAvailable}
          label={`${marksLost} of ${marksAvailable} marks lost on questions you have confirmed`}
        />
      )}
    </Stack>
  );
}

// ── 1 · MARKS LOST BY ERROR CLASS ───────────────────────────────────────────

function MarksView({
  d,
  open,
  toggle,
}: {
  d: Diagnosis;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  return (
    <Stack gap={5}>
      {d.marksLost.classes.map(c => (
        <Stack key={c.errorClass} gap={3}>
          <Row gap={3} wrap>
            <Text step="label" tone="ink" weight={600}>
              {c.errorClass === "cognitive"
                ? "Cognitive"
                : c.errorClass === "execution"
                  ? "Execution"
                  : "Unassigned"}
            </Text>
            <Spacer />
            <Readout value={c.marksLost} step="figure" label={`${c.marksLost} marks`} />
            <Text step="label">
              marks · {c.occurrenceCount} question{c.occurrenceCount === 1 ? "" : "s"}
            </Text>
          </Row>
          <Text step="body" tone="secondary">
            {c.meaning}
          </Text>
          {d.marksLost.marksLost > 0 && (
            <Track
              value={c.marksLost / d.marksLost.marksLost}
              size="compact"
              label={`${c.marksLost} of ${d.marksLost.marksLost} marks lost`}
            />
          )}

          <Stack gap={2}>
            {c.types.map(t => {
              const key = `type:${c.errorClass}:${t.errorType ?? "-"}`;
              return (
                <Stack key={key} gap={2}>
                  <Row gap={2} wrap>
                    <Text step="body">{t.label}</Text>
                    <Spacer />
                    <Text step="label">
                      {t.marksLost} mark{t.marksLost === 1 ? "" : "s"} ·{" "}
                      {t.occurrenceCount} question{t.occurrenceCount === 1 ? "" : "s"}
                    </Text>
                    <Control tier="tertiary" onClick={() => toggle(key)}>
                      {open[key] ? "Hide" : "Show"} the {t.occurrenceCount}
                    </Control>
                  </Row>
                  {open[key] && (
                    <Stack gap={1}>
                      {t.occurrenceIds.map(id => (
                        <Text key={id} step="micro" tone="secondary">
                          <span title={id}>occurrence {handle(id)}</span>
                        </Text>
                      ))}
                    </Stack>
                  )}
                </Stack>
              );
            })}
          </Stack>
          <Rule />
        </Stack>
      ))}

      {d.bySubject.length > 1 && (
        <Stack gap={3}>
          <Text step="label" tone="ink" weight={600}>
            By subject
          </Text>
          {d.bySubject.map(s => (
            <Row key={s.subject} gap={2} wrap>
              <Text step="body">{s.subject}</Text>
              <Spacer />
              <Text step="label">
                {s.marksLost} mark{s.marksLost === 1 ? "" : "s"} ·{" "}
                {s.occurrenceCount} question{s.occurrenceCount === 1 ? "" : "s"}
              </Text>
            </Row>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ── 2 · RECURRENCE, WITH THE EVIDENCE TRAIL ─────────────────────────────────

function RecurrenceView({
  d,
  open,
  toggle,
}: {
  d: Diagnosis;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  if (d.recurrence.length === 0) {
    return (
      <Stack gap={3}>
        <Text step="body">
          Nothing has recurred yet. {d.unpatterned.occurrenceCount} confirmed
          question{d.unpatterned.occurrenceCount === 1 ? " is" : "s are"} on the record
          and no repeated error has been drawn from{" "}
          {d.unpatterned.occurrenceCount === 1 ? "it" : "them"}.
        </Text>
        <Text step="body" tone="secondary">
          A pattern is an inference, and this screen will not show one it cannot
          evidence.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={5}>
      {d.recurrence.map(g => (
        <Group key={g.parentPatternId ?? g.label} g={g} open={open} toggle={toggle} />
      ))}

      {d.unpatterned.occurrenceCount > 0 && (
        <Stack gap={2}>
          <Rule />
          <Text step="label" tone="ink" weight={600}>
            Not yet part of a pattern
          </Text>
          <Text step="body" tone="secondary">
            {d.unpatterned.occurrenceCount} confirmed question
            {d.unpatterned.occurrenceCount === 1 ? "" : "s"} ·{" "}
            {d.unpatterned.marksLost} mark{d.unpatterned.marksLost === 1 ? "" : "s"}.
            The mark was lost; no repeated error has been inferred from it yet.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

function Group({
  g,
  open,
  toggle,
}: {
  g: PatternGroup;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  const key = `group:${g.parentPatternId ?? g.label}`;
  const expanded = open[key] ?? false;
  return (
    <Stack gap={3}>
      <Row gap={3} wrap>
        <Text step="body" tone="ink" weight={600}>
          {g.label}
        </Text>
        <Spacer />
        <Text step="label">
          {g.marksLost} mark{g.marksLost === 1 ? "" : "s"} · {g.recurrenceCount} time
          {g.recurrenceCount === 1 ? "" : "s"}
          {/* §4.6.4 — breadth is stated in words, never folded into severity. */}
          {g.topicCount > 1 ? ` · across ${g.topicCount} topics` : ""}
        </Text>
        <Control tier="tertiary" onClick={() => toggle(key)}>
          {expanded ? "Collapse" : "Open"}
        </Control>
      </Row>

      {expanded &&
        g.leaves.map(leaf => <Leaf key={leaf.patternId} leaf={leaf} open={open} toggle={toggle} />)}
    </Stack>
  );
}

function Leaf({
  leaf,
  open,
  toggle,
}: {
  leaf: RecurringPattern;
  open: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  const key = `leaf:${leaf.patternId}`;
  const expanded = open[key] ?? false;
  return (
    <Stack gap={2}>
      <Row gap={2} wrap>
        <Text step="body">{leaf.label}</Text>
        {leaf.status !== "open" && <Chip tone="info">{leaf.status}</Chip>}
        <Spacer />
        <Text step="label">
          {leaf.marksLost} mark{leaf.marksLost === 1 ? "" : "s"} ·{" "}
          {leaf.recurrenceCount} occurrence{leaf.recurrenceCount === 1 ? "" : "s"}
        </Text>
        <Control tier="tertiary" onClick={() => toggle(key)}>
          {expanded ? "Hide evidence" : "Evidence"}
        </Control>
      </Row>

      <Text step="micro" tone="secondary">
        first seen {DATE(leaf.firstSeenAt)} · last seen {DATE(leaf.lastSeenAt)}
        {leaf.severity !== null && leaf.severityVersion !== null
          ? ` · severity ${leaf.severity} (${leaf.severityVersion})`
          : ""}
      </Text>

      {expanded && (
        <Stack gap={2}>
          {leaf.trail.map(step => (
            <Stack key={step.occurrenceId} gap={1}>
              <Row gap={2} wrap>
                <Text step="body">
                  {step.questionRef || "question not numbered"} · {step.topic || step.subject}
                </Text>
                <Spacer />
                <Text step="label">
                  {step.marksLost} of {step.marksAvailable}
                </Text>
              </Row>
              <Text step="micro" tone="secondary">
                <span title={step.occurrenceId}>occurrence {handle(step.occurrenceId)}</span>
                {" · "}
                <span title={step.evidenceId}>evidence {handle(step.evidenceId)}</span>
                {step.source ? ` · ${step.source}` : ""} · {DATE(step.at)}
              </Text>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ── 3 · CALIBRATION ─────────────────────────────────────────────────────────

function CalibrationView({ d }: { d: Diagnosis }) {
  const { bands, rated, unrated } = d.calibration;

  if (rated === 0) {
    return (
      <Stack gap={3}>
        <Text step="body">
          None of your {unrated} confirmed question{unrated === 1 ? "" : "s"} records
          what you thought before you answered it.
        </Text>
        <Text step="body" tone="secondary">
          Nothing is estimated in its place. When a captured question carries the
          confidence you had going in, the comparison appears here.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Text step="body" tone="secondary">
        What you expected, against what the paper said. Each row is marks you lost
        on questions you had already rated.
      </Text>
      {bands.map(b => (
        <Row key={b.confidence} gap={3} wrap>
          <Text step="body">{b.label}</Text>
          <Spacer />
          <Text step="label">
            {b.marksLost} mark{b.marksLost === 1 ? "" : "s"} lost ·{" "}
            {b.occurrenceCount} question{b.occurrenceCount === 1 ? "" : "s"}
          </Text>
        </Row>
      ))}
      {unrated > 0 && (
        <Text step="micro" tone="secondary">
          {unrated} further confirmed question{unrated === 1 ? "" : "s"} carry no
          confidence and are excluded from every row above rather than assumed.
        </Text>
      )}
    </Stack>
  );
}

// ── Provenance ──────────────────────────────────────────────────────────────

/** Where the page's numbers came from, and what did not make it in. M10's
 *  discipline: the reader is told what the figure stands on. */
function Provenance({ d }: { d: Diagnosis }) {
  return (
    <Stack gap={2}>
      <Text step="micro" tone="secondary">
        Derived from {d.occurrencesRead} confirmed question
        {d.occurrencesRead === 1 ? "" : "s"} across {d.evidenceCount} captured paper
        {d.evidenceCount === 1 ? "" : "s"}. Unconfirmed proposals are not counted.
        Nothing on this screen can be deleted. The record is kept permanently.
      </Text>
      {d.refused.map(r => (
        <Text key={r.refusal} step="micro" tone="warn">
          {r.count} row{r.count === 1 ? "" : "s"} could not be read ({r.refusal}) and
          {r.count === 1 ? " is" : " are"} excluded from every figure above.
        </Text>
      ))}
    </Stack>
  );
}
