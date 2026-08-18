// ═══════════════════════════════════════════════════════════════════════════
// M12-2 — PER-CONCEPT ACCURACY, WATERMARKED AND INCREMENTAL.
//
// EXECUTION_PLAN M12-2: *"Per-concept accuracy, watermarked and incremental.
// Done when: U.2 qualification 1: no queue is introduced."*
//
// U.2 qualification 1, in full, because it is the whole specification: *"Fan-out
// is not a queue. Real-time projection updates on every event, at scale, would
// want a message broker. The stack lacks one, and the architecture is
// deliberately designed so it does not need one: projections are **watermarked
// and incremental**, updated synchronously for the cheap ones (session state,
// Today invalidation) and by scheduled catch-up for the expensive ones (score,
// record, personal model)."*
//
// T6 is the risk it answers: *"10⁵–10⁶ events per student-lifetime … Naive
// recompute-on-read will not hold. Mitigation: watermarked incremental
// projections."*
//
//
// WHAT "WATERMARKED AND INCREMENTAL" MEANS HERE, PRECISELY
//
// A run is `(prior state, prior watermark) + (events with seq > watermark) →
// (new state, new watermark)`. Three properties follow, and all three are
// tested rather than asserted in prose:
//
//   1. AN EVENT AT OR BELOW THE WATERMARK IS NEVER FOLDED AGAIN. Not skipped
//      by a `seen` set, not deduplicated after the fact — never read into the
//      fold at all. That is what makes a second run over the same stream a
//      no-op instead of a doubling.
//   2. A RUN WITH NO NEW EVENTS DOES NO WORK AND WRITES NOTHING.
//      `advanceAccuracy()` returns `changed: false` and the IDENTICAL state
//      object it was handed (`===`, asserted by a test), so a caller that
//      persists on `changed` cannot write a redundant row.
//   3. THE WATERMARK IS THE SERVER'S `seq`, NEVER `occurred_at`. R.10:
//      *"Ordering: by server `seq`, never by client `occurred_at`."* A
//      projection watermarked on a client timestamp could be walked backwards
//      by a client with a wrong clock, and every event between the two marks
//      would be consumed twice.
//
// **NO QUEUE IS INTRODUCED, AND NONE COULD BE.** This module has no transport,
// no subscription, no callback and no `await` — it is a fold. The catch-up is
// driven by `app/api/cron/projection-consistency/route.ts` and by any future
// scheduled rebuild, which is U.2's *"Vercel cron + GitHub Actions covers
// scheduled work; the split already exists"*.
//
//
// THE INPUT IS THE EVENT STREAM (L1), AND THAT IS NOT AN ACCIDENT
//
// H.1 puts this projection in **L2**, whose defining property is *"rebuildable
// from L1 by replay"*, and H.1.a's layering rule is *"a layer may read downward
// and may never write downward."* `assessment_attempts` is also L1 and also
// carries the grade — but it carries no `seq`, so a projection folded over it
// would have no watermark to check, and M12-3's whole job is checking a
// watermark against the stream. A projection nobody can verify is the T8 defect
// with extra steps.
//
// **A GAP, NAMED RATHER THAN PAPERED OVER:** `QUESTION_WRONG` is emitted today
// (`app/api/assessment/answer/route.ts` builds the draft and the client's
// outbox appends it); `QUESTION_CORRECT` is a declared contract type
// (`lib/event-contract.ts`) with **no emitter yet**. Until one exists this
// projection sees wrong answers and not right ones, and `accuracyOf()` returns
// the honest reading of what it saw rather than a flattering one. Wiring the
// emitter means editing M10's answer route, which is outside this milestone's
// scope; it is recorded in EXECUTION_PLAN's M12 completion note as the one
// follow-up this projection needs before its numbers are presentable.
//
// No I/O, no clock, no randomness, no Supabase, no `next/*`. Imports one type.
// ═══════════════════════════════════════════════════════════════════════════

import type { AcademicEventType } from "./event-contract";

/** The projection's name in `026`'s `projection_watermarks`. Spelled once. */
export const ACCURACY_PROJECTION = "concept_accuracy";

/** `026`'s cache table for the counters below. */
export const CONCEPT_ACCURACY_TABLE = "concept_accuracy";

/**
 * The event types this fold consumes, and the verdict each one carries.
 *
 * A POSITIVE LIST, for `isCompactable()`'s reason: a type added to D.2 tomorrow
 * contributes nothing by default, which is the safe direction to fail. A
 * projection that treated "not in the wrong list" as correct would score every
 * future event type as a right answer.
 */
export const ACCURACY_EVENT_TYPES: Readonly<Partial<Record<AcademicEventType, boolean>>> = {
  QUESTION_CORRECT: true,
  QUESTION_WRONG: false,
};

export const isAccuracyEvent = (t: string): boolean =>
  Object.prototype.hasOwnProperty.call(ACCURACY_EVENT_TYPES, t);

/**
 * `EVENT_SUPERSEDED` is D.2's correction append and F.4.b's revocation carrier.
 * It is deliberately NOT folded here: a superseded attempt must be REMOVED from
 * the tally, and removal is not expressible in a forward-only fold over
 * counters. F.4.b's own answer is *"replay from checkpoint rather than
 * patching"* (O.4, T8's mitigation), so a revocation resets this projection's
 * watermark for the affected student and the fold runs again from zero over the
 * surviving stream. `requiresRebuild()` is where that decision is stated.
 */
export const REBUILD_TRIGGER_TYPES: readonly AcademicEventType[] = ["EVENT_SUPERSEDED"];

const REBUILD = new Set<string>(REBUILD_TRIGGER_TYPES);

export const requiresRebuild = (t: string): boolean => REBUILD.has(t);

// ═══════════════════════════════════════════════════════════════════════════
// THE STATE
// ═══════════════════════════════════════════════════════════════════════════

/** Per-concept counters. Integers only — an accuracy RATIO is computed on read
 *  by `accuracyOf()` and never stored, so a change to how the ratio is
 *  expressed can never require rewriting stored history (H.2). */
export interface AccuracyCounters {
  concept_ref: string;
  concept_id: string | null;
  answered: number;
  correct: number;
  wrong: number;
  /** The `seq` of the last event that moved these counters. Per-concept, so a
   *  reader can tell a stale concept from a stale student. */
  last_seq: number;
}

/** C.3's watermark, as a value. `input_watermark_event_id` is the column
 *  `study_sessions` and `ScoreSnapshot` already carry; `seq` is carried
 *  alongside it because `seq` is what ORDERS, and an id alone cannot be
 *  compared (R.10). */
export interface Watermark {
  last_seq: number;
  last_event_id: string | null;
  /** How many events this projection has ever folded. M12-3 compares it against
   *  the stream's own count and reports a disagreement (T8). */
  events_processed: number;
}

export interface AccuracyState {
  student_id: string;
  watermark: Watermark;
  /** Keyed by `concept_ref` — never by `concept_id`, for the reason
   *  `projectCoverage()` gives: B.4's unresolved concepts are first-class and
   *  keying on the id would merge every one of them into a NULL bucket. */
  concepts: Readonly<Record<string, AccuracyCounters>>;
}

/** The zero state. `last_seq = 0` and not `-1`: `academic_events_seq` is a
 *  Postgres sequence starting at 1, so `seq > 0` admits the whole stream. */
export const emptyAccuracyState = (student_id: string): AccuracyState => ({
  student_id,
  watermark: { last_seq: 0, last_event_id: null, events_processed: 0 },
  concepts: {},
});

/** The narrow shape the fold reads from an `academic_events` row. Deliberately
 *  minimal: a fold that could see `payload` in full is a fold one careless edit
 *  away from scoring something D.2 never authorised. */
export interface AccuracyEvent {
  event_id: string;
  seq: number;
  event_type: string;
  concept_id: string | null;
  /** M10 stamps the manifest's `concept_ref` on the question; the event carries
   *  it in `payload.concept_ref` where present. NULL falls back to the id. */
  concept_ref: string | null;
}

export interface AccuracyAdvance {
  state: AccuracyState;
  /** Events actually folded. */
  processed: number;
  /** Events handed in but AT OR BELOW the incoming watermark — the count that
   *  proves incrementality: on a second run over the same stream this equals
   *  the batch size and `processed` is zero. */
  skipped_at_or_below_watermark: number;
  /** Events past the watermark that carried no usable concept, or whose type
   *  this projection does not consume. Counted, never silently dropped. */
  ignored: number;
  /** `false` when nothing moved. A caller persists only on `true`. */
  changed: boolean;
  /** Set when the batch contained a correction that a forward fold cannot
   *  apply. The caller resets the watermark and replays (O.4). */
  rebuild_required: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE FOLD
// ═══════════════════════════════════════════════════════════════════════════

const refOf = (e: AccuracyEvent): string | null =>
  (e.concept_ref && e.concept_ref.length > 0 ? e.concept_ref : null) ?? e.concept_id ?? null;

/**
 * **THE INCREMENT.** Pure, total, and it cannot throw.
 *
 * The single line that makes this incremental rather than a recompute is the
 * `e.seq <= prior.watermark.last_seq` guard: an event at or below the mark is
 * counted in `skipped_at_or_below_watermark` and never reaches the counters.
 * Everything else in this function is bookkeeping around that one comparison.
 *
 * The input need not be sorted — the fold takes the MAXIMUM `seq` it saw rather
 * than the last one, so an out-of-order page from PostgREST cannot leave the
 * watermark behind the events it already consumed. It is nonetheless read in
 * `seq` order by every caller, because `listEventsForStudent()` has no
 * parameter that could ask for another ordering (R.10).
 */
export function advanceAccuracy(
  prior: AccuracyState,
  events: readonly AccuracyEvent[],
): AccuracyAdvance {
  let processed = 0;
  let skipped = 0;
  let ignored = 0;
  let rebuild = false;

  const next: Record<string, AccuracyCounters> = {};
  for (const [k, v] of Object.entries(prior.concepts)) next[k] = { ...v };

  let maxSeq = prior.watermark.last_seq;
  let maxEventId = prior.watermark.last_event_id;

  for (const e of events) {
    // THE WATERMARK. Everything at or below it has already been folded, once.
    if (!Number.isFinite(e.seq) || e.seq <= prior.watermark.last_seq) {
      skipped++;
      continue;
    }

    if (e.seq > maxSeq) {
      maxSeq = e.seq;
      maxEventId = e.event_id;
    }

    if (requiresRebuild(e.event_type)) {
      // Counted as processed — the watermark still advances past it, because a
      // watermark that stalled on a correction would make every later run
      // re-read the same tail forever. The REBUILD is the caller's response.
      rebuild = true;
      processed++;
      continue;
    }

    const verdict = ACCURACY_EVENT_TYPES[e.event_type as AcademicEventType];
    const ref = refOf(e);
    if (verdict === undefined || ref === null) {
      // Past the mark, so the watermark moves; not this projection's business,
      // so no counter does. B.4's unresolved-but-unnamed case lands here rather
      // than in a bucket keyed on null.
      ignored++;
      processed++;
      continue;
    }

    const row = next[ref] ?? {
      concept_ref: ref,
      concept_id: e.concept_id,
      answered: 0,
      correct: 0,
      wrong: 0,
      last_seq: 0,
    };
    row.answered++;
    if (verdict) row.correct++;
    else row.wrong++;
    if (e.seq > row.last_seq) row.last_seq = e.seq;
    if (row.concept_id === null && e.concept_id !== null) row.concept_id = e.concept_id;
    next[ref] = row;
    processed++;
  }

  if (processed === 0) {
    // PROPERTY 2. The same object, not an equal one — a caller may compare by
    // identity to decide whether to write, and a test asserts `===`.
    return {
      state: prior,
      processed: 0,
      skipped_at_or_below_watermark: skipped,
      ignored: 0,
      changed: false,
      rebuild_required: false,
    };
  }

  return {
    state: {
      student_id: prior.student_id,
      watermark: {
        last_seq: maxSeq,
        last_event_id: maxEventId,
        events_processed: prior.watermark.events_processed + processed,
      },
      concepts: next,
    },
    processed,
    skipped_at_or_below_watermark: skipped,
    ignored,
    changed: true,
    rebuild_required: rebuild,
  };
}

/**
 * O.4's replay-from-checkpoint, as the one operation that is allowed to undo.
 *
 * It does not "fix" anything — it discards the derived state and lets the fold
 * run again over L1. H.2: L2 *"may be truncated and rebuilt at any time. That
 * property is a hard requirement, not an optimisation."*
 */
export const rebuildAccuracyFrom = (
  student_id: string,
  events: readonly AccuracyEvent[],
): AccuracyAdvance => advanceAccuracy(emptyAccuracyState(student_id), events);

// ═══════════════════════════════════════════════════════════════════════════
// READING IT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The ratio, or **null**.
 *
 * V.6.1/V.6.2 and J.4: *"a new account has NO score, not zero."* Zero answered
 * questions is not zero accuracy; it is no evidence, and the type says so. A
 * caller that wants a number for a concept nobody has been tested on has to
 * write the fallback itself, in the open.
 */
export function accuracyOf(c: Pick<AccuracyCounters, "answered" | "correct"> | undefined): number | null {
  if (!c || c.answered <= 0) return null;
  return c.correct / c.answered;
}

/** F.3's *"prior accuracy on the concept, 0–1, from `AcademicRecord`"* — the
 *  exact field `ConceptGenerationInput.prior_accuracy` (M10-1) is typed for, so
 *  the assessment blueprint reads this projection rather than inventing one.
 *  `undefined` and not `null`, because that is the shape M10 already declared
 *  for "no prior evidence". */
export const priorAccuracyFor = (
  state: AccuracyState,
  concept_ref: string,
): number | undefined => accuracyOf(state.concepts[concept_ref]) ?? undefined;

/** The rows `026`'s `concept_accuracy` table stores, deterministically ordered
 *  so two runs produce byte-identical batches (U.3). */
export function accuracyRows(state: AccuracyState): Array<Record<string, unknown>> {
  return Object.values(state.concepts)
    .sort((a, b) => (a.concept_ref < b.concept_ref ? -1 : 1))
    .map(c => ({
      student_id: state.student_id,
      concept_ref: c.concept_ref,
      concept_id: c.concept_id,
      answered: c.answered,
      correct: c.correct,
      wrong: c.wrong,
      last_seq: c.last_seq,
    }));
}

/** One arm, again. Accuracy is an INPUT to J.2's Verified Performance and is
 *  not itself a score; converting it is M14's decision and this fence is what
 *  keeps the conversion visible when it happens. */
export type AccuracyScoreEffect = { kind: "none" };

export const accuracyScoreEffect = (_c: AccuracyCounters): AccuracyScoreEffect => ({ kind: "none" });
