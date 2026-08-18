// ═══════════════════════════════════════════════════════════════════════════
// M7-7 — ATTENTION-EVENT COMPACTION.
//
// EXECUTION_PLAN M7-7: *"Attention-event compaction and monthly partitioning.
// Done when: T6 mitigation in place before volume exists."*
//
// Architecture D.5, class **Permanent, compacted**: *"`CONCEPT_VIEWED`,
// `EXPLANATION_READ` — verbatim for 90 days; then rolled into a per-(session,
// concept) summary row `{count, total_dwell_ms, first_at, last_at}` and the raw
// rows dropped. The derived fact survives; the granularity does not."*
//
//
// THE PARTITIONING HALF OF M7-7 IS DECIDED, AND IT IS DECIDED AGAINST
//
// 015's header flagged monthly partitioning as **re-opened, not deferred**.
// `supabase/migrations/018_event_compaction.sql` §0 closes it with the full
// argument; the one-line version is that sub-partitioning by month re-breaks
// `UNIQUE (student_id, client_event_id)` one level down and restores T7, and
// that the DETACH it would buy is unusable anyway because D.5 keeps the
// permanent-verbatim classes forever, so the delete must be selective by event
// type whatever the partitioning is. **`academic_events` stays HASH (student_id)
// and nothing is sub-partitioned. Compaction is the whole of M7-7.**
//
//
// THE ONE RULE THIS FILE EXISTS TO ENFORCE
//
// **Only `CONCEPT_VIEWED` and `EXPLANATION_READ` are ever compactable.**
// Everything else in D.2 is permanent, verbatim — and that is not a policy this
// module remembers, it is a list it is built around. `COMPACTABLE_EVENT_TYPES`
// is a two-element constant, `isCompactable()` is a set membership test, and the
// tests assert that every member of `EVIDENCE_BEARING_TYPES` and every
// `MISTAKE_*` / `ASSESSMENT_*` / `QUESTION_*` type is refused. A future edit
// that widened the list would have to delete those assertions, which is a thing
// a reviewer can see.
//
// D.5.a's own words for why: compaction *"is the single exception to
// append-only"*, and the exception is bounded to a class whose loss costs
// nothing — *"treating a 400ms scroll as a permanent academic fact would be an
// over-reading that costs storage and buys nothing"*. A `QUESTION_WRONG` is the
// opposite of a 400ms scroll.
//
// D.5.a's second bound is also implemented: *"forbidden for any event class that
// any `Evidence`, `Mistake`, `AssessmentAttempt` or `ScoreSnapshot`
// references. A referenced event is permanent regardless of its class."* That is
// `referencedEventIds` below. It is empty today because nothing in the schema
// stores an event reference yet, and 018 §3 names that gap rather than implying
// it away.
//
// D.5.b — *"derivation direction is one-way"* — is why the summary carries no
// payload, no result and no ids of the rows it replaced beyond the `seq` range.
// A summary that could be inflated back into raw rows would let a replay produce
// a smoother history than the one the student lived.
//
// Imports: `./ingest/hash`, `./event-contract` (types and the type list).
// No Supabase, no `next/*`, no clock — the clock is injected.
// ═══════════════════════════════════════════════════════════════════════════

import { stableHash } from "./ingest/hash";
import { type AcademicEventType } from "./event-contract";

/** D.5's "Permanent, compacted" row, verbatim and complete. Mirrored by the
 *  CHECK on `academic_event_compactions.event_type` and by the type filter in
 *  `public.compact_attention_events()`; a test asserts all three agree. */
export const COMPACTABLE_EVENT_TYPES: readonly AcademicEventType[] = [
  "CONCEPT_VIEWED",
  "EXPLANATION_READ",
];

const COMPACTABLE = new Set<string>(COMPACTABLE_EVENT_TYPES);

/** D.5: *"verbatim for 90 days"*. */
export const COMPACTION_WINDOW_DAYS = 90;

const DAY_MS = 86_400_000;

/**
 * The only question this module asks about an event type, and it has one
 * answer per type forever. Written as a positive membership test rather than as
 * a denylist: a type added to D.2 tomorrow is permanent by default, which is
 * the safe direction to fail.
 */
export function isCompactable(eventType: string): boolean {
  return COMPACTABLE.has(eventType);
}

/** The subset of a stored event this module reads. Deliberately narrow — a
 *  planner that could see `payload` in full would be a planner that could be
 *  tempted to summarise something D.5 did not authorise. */
export interface CompactableEvent {
  event_id: string;
  student_id: string;
  seq: number;
  event_type: string;
  session_id: string | null;
  concept_id: string | null;
  received_at: string;
  occurred_at: string;
  payload?: Record<string, unknown> | null;
}

/** D.5's summary shape, plus the range D.5.a requires the audit entry to carry. */
export interface CompactionSummary {
  student_id: string;
  session_id: string | null;
  concept_id: string | null;
  event_type: AcademicEventType;
  event_count: number;
  total_dwell_ms: number;
  first_at: string;
  last_at: string;
  min_seq: number;
  max_seq: number;
  /** NULL-safe stable identity of the group — see 018 §1 for why a TEXT key
   *  rather than a composite UNIQUE over two nullable UUID columns. */
  group_key: string;
}

export interface CompactionPlan {
  summaries: CompactionSummary[];
  /** Exactly the raw rows the summaries replace. Nothing else is ever here. */
  deleteEventIds: string[];
  /** The cutoff the delete must be bounded by, so the SQL side can re-check it. */
  olderThanIso: string;
  /** Why each retained event was retained. Not required by anything — it is
   *  what makes "high-signal events are never compacted" a thing a test can
   *  observe rather than infer from an absence. */
  retained: Array<{ event_id: string; reason: RetentionReason }>;
}

export type RetentionReason =
  | "PERMANENT_TYPE"
  | "INSIDE_WINDOW"
  | "REFERENCED";

export interface CompactionOptions {
  /** Server clock, injected. */
  nowMs: number;
  windowDays?: number;
  /**
   * D.5.a: *"A referenced event is permanent regardless of its class."* Event
   * ids referenced by any `Evidence`, `Mistake`, `AssessmentAttempt` or
   * `ScoreSnapshot`. Empty today — nothing in the schema stores one yet — and
   * wired by the milestone that first does (018 §3 names the gap).
   */
  referencedEventIds?: ReadonlySet<string> | readonly string[];
}

/**
 * The whole decision, as one pure function.
 *
 * Every event lands in exactly one of two places: a summary group plus the
 * delete list, or `retained` with a reason. There is no third outcome and
 * nothing is dropped silently — `summaries.reduce(count) === deleteEventIds.length`
 * and `deleteEventIds.length + retained.length === events.length` are both
 * asserted by the tests.
 */
export function planCompaction(
  events: readonly CompactableEvent[],
  opts: CompactionOptions,
): CompactionPlan {
  const windowDays = opts.windowDays ?? COMPACTION_WINDOW_DAYS;
  const olderThanMs = opts.nowMs - windowDays * DAY_MS;
  const olderThanIso = new Date(olderThanMs).toISOString();

  const referenced =
    opts.referencedEventIds instanceof Set
      ? (opts.referencedEventIds as ReadonlySet<string>)
      : new Set<string>(opts.referencedEventIds ?? []);

  const groups = new Map<string, CompactionSummary>();
  const deleteEventIds: string[] = [];
  const retained: CompactionPlan["retained"] = [];

  for (const e of events) {
    // Order matters only for the message, not the outcome — a permanent type
    // is retained whether or not it is also referenced or recent. Type first,
    // because it is the reason a reader most needs to see.
    if (!isCompactable(e.event_type)) {
      retained.push({ event_id: e.event_id, reason: "PERMANENT_TYPE" });
      continue;
    }
    if (referenced.has(e.event_id)) {
      retained.push({ event_id: e.event_id, reason: "REFERENCED" });
      continue;
    }
    // R.10 again: the window is measured in SERVER time. `occurred_at` is the
    // client's claim, and a forged one could otherwise age a row out early.
    const receivedMs = Date.parse(e.received_at);
    if (!Number.isFinite(receivedMs) || receivedMs >= olderThanMs) {
      retained.push({ event_id: e.event_id, reason: "INSIDE_WINDOW" });
      continue;
    }

    const key = groupKey(e.student_id, e.session_id, e.concept_id, e.event_type);
    const existing = groups.get(key);
    const dwell = dwellMs(e.payload);

    if (!existing) {
      groups.set(key, {
        student_id: e.student_id,
        session_id: e.session_id,
        concept_id: e.concept_id,
        event_type: e.event_type as AcademicEventType,
        event_count: 1,
        total_dwell_ms: dwell,
        first_at: e.received_at,
        last_at: e.received_at,
        min_seq: e.seq,
        max_seq: e.seq,
        group_key: key,
      });
    } else {
      existing.event_count += 1;
      existing.total_dwell_ms += dwell;
      if (e.received_at < existing.first_at) existing.first_at = e.received_at;
      if (e.received_at > existing.last_at) existing.last_at = e.received_at;
      if (e.seq < existing.min_seq) existing.min_seq = e.seq;
      if (e.seq > existing.max_seq) existing.max_seq = e.seq;
    }

    deleteEventIds.push(e.event_id);
  }

  return {
    summaries: [...groups.values()].sort((a, b) => a.min_seq - b.min_seq),
    deleteEventIds,
    olderThanIso,
    retained,
  };
}

/**
 * NULL-safe and order-fixed. `stableHash` rather than a join on a separator,
 * because a session id and a concept id are both free-form to this function and
 * a separator that appears in one would make two different groups collide.
 */
export function groupKey(
  studentId: string,
  sessionId: string | null,
  conceptId: string | null,
  eventType: string,
): string {
  return stableHash({
    student_id: studentId,
    session_id: sessionId ?? null,
    concept_id: conceptId ?? null,
    event_type: eventType,
  });
}

/** D.5's `total_dwell_ms`. A missing or nonsensical dwell contributes zero
 *  rather than being guessed — a summed guess is a figure nobody measured. */
function dwellMs(payload: Record<string, unknown> | null | undefined): number {
  const v = payload?.dwell_ms;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 0;
  return Math.round(v);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RUN — adapters injected, same pattern as `lib/legacy-backfill.ts`
//
// D.5.a fixes the ORDER, and it is the one thing about the run that is not
// negotiable: **the summary is written before the raw rows are deleted.** A
// crash between them leaves a summary with its raw rows still present, which the
// unique index on `(student_id, group_key, min_seq, max_seq)` (018 §1) absorbs
// on the retry. The other order loses the events outright.
// ═══════════════════════════════════════════════════════════════════════════

export interface CompactionAdapters {
  /** Compactable-type rows outside the window, oldest first. */
  listCandidates(limit: number): Promise<CompactableEvent[]>;
  /** `INSERT … ON CONFLICT (student_id, group_key, min_seq, max_seq) DO NOTHING`. */
  writeSummaries(summaries: CompactionSummary[]): Promise<{ written: number; error?: string }>;
  /** `public.compact_attention_events(student, ids, older_than)` — 018 §3, which
   *  re-checks the type and the window in SQL before it deletes anything. */
  deleteRaw(studentId: string, eventIds: string[], olderThanIso: string): Promise<{ deleted: number; error?: string }>;
  /** D.5.a: *"recorded in `AuditEntry` with the count and the range"*. */
  recordAudit(entry: {
    runId: string;
    studentId: string;
    summaries: number;
    deleted: number;
    minSeq: number | null;
    maxSeq: number | null;
    olderThanIso: string;
  }): Promise<void>;
}

export interface CompactionReport {
  runId: string;
  candidates: number;
  summariesWritten: number;
  rawDeleted: number;
  retained: number;
  errors: Array<{ studentId: string; detail: string }>;
}

export async function runCompaction(
  adapters: CompactionAdapters,
  opts: CompactionOptions & { limit?: number; runId: string },
): Promise<CompactionReport> {
  const events = await adapters.listCandidates(opts.limit ?? 5000);
  const plan = planCompaction(events, opts);

  const report: CompactionReport = {
    runId: opts.runId,
    candidates: events.length,
    summariesWritten: 0,
    rawDeleted: 0,
    retained: plan.retained.length,
    errors: [],
  };

  // Grouped by student because 018 §3's function is scoped to one, which is
  // deliberate: a delete that could span students is a delete whose blast
  // radius is the whole table.
  const byStudent = new Map<string, { summaries: CompactionSummary[]; ids: string[] }>();
  for (const s of plan.summaries) {
    const bucket = byStudent.get(s.student_id) ?? { summaries: [], ids: [] };
    bucket.summaries.push(s);
    byStudent.set(s.student_id, bucket);
  }
  const summaryKeys = new Set(plan.summaries.map(s => s.group_key));
  for (const e of events) {
    if (!plan.deleteEventIds.includes(e.event_id)) continue;
    const key = groupKey(e.student_id, e.session_id, e.concept_id, e.event_type);
    if (!summaryKeys.has(key)) continue;
    byStudent.get(e.student_id)?.ids.push(e.event_id);
  }

  for (const [studentId, bucket] of byStudent) {
    const written = await adapters.writeSummaries(bucket.summaries);
    if (written.error) {
      report.errors.push({ studentId, detail: `summaries: ${written.error}` });
      // Nothing is deleted. The raw rows are still the record.
      continue;
    }
    report.summariesWritten += written.written;

    const deleted = await adapters.deleteRaw(studentId, bucket.ids, plan.olderThanIso);
    if (deleted.error) {
      report.errors.push({ studentId, detail: `delete: ${deleted.error}` });
    } else {
      report.rawDeleted += deleted.deleted;
    }

    await adapters.recordAudit({
      runId: opts.runId,
      studentId,
      summaries: bucket.summaries.length,
      deleted: deleted.deleted ?? 0,
      minSeq: bucket.summaries.reduce<number | null>(
        (m, s) => (m === null || s.min_seq < m ? s.min_seq : m), null),
      maxSeq: bucket.summaries.reduce<number | null>(
        (m, s) => (m === null || s.max_seq > m ? s.max_seq : m), null),
      olderThanIso: plan.olderThanIso,
    });
  }

  return report;
}
