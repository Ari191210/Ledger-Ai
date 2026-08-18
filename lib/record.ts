// ═══════════════════════════════════════════════════════════════════════════
// M13-3 — THE RECORD DERIVATION.
//
// EXECUTION_PLAN M13-3: *"`/record`: pattern list and timeline; absorb
// `grade-tracker`, `/console/analytics`; 301. Done when: **≥6 months renders;
// parity retained.**"*
//
// `PRODUCT_DECISIONS` §2.4: *"**Record** absorbs `grade-tracker` and
// `/console/analytics` — the longitudinal asset. **One place, forever.**"*
// §3, route 6: *"`/record` — Proof the ledger accumulates."*
// Architecture S.4: `grade-tracker` **ADAPT** into `/record`.
//
//
// THE DONE-WHEN'S FIRST HALF — "≥6 MONTHS RENDERS" — IS A SCALE CLAIM
//
// It is not "the page has a six-month heading". It is that a student with six
// months (or six years) of record gets a page, and that getting it does not
// read the whole table. Three mechanisms, all in this file or beside it:
//
//   1. EVERY READ IS WINDOWED. `RecordWindow` carries an inclusive `fromISO`
//      and an exclusive `toISO`, and `/api/record` puts both into the query.
//      No reader here asks for "all rows".
//   2. EVERY READ IS PAGED. `RECORD_PAGE_SIZE` rows at a time through
//      `readAllPages`, which stops on a short page and refuses to loop past
//      `RECORD_MAX_PAGES`. A run that hits the ceiling says so in
//      `truncated` — it never silently reports a partial total as a total.
//   3. EVERY READ LANDS ON AN INDEX ALREADY IN THE SCHEMA. Each source's
//      windowed column is the second column of an existing
//      `(student_id, <time> DESC)` index — see `RECORD_SOURCES` below, which
//      names the index each source's query is shaped for. A range scan on
//      `(student_id, confirmed_at)` costs what the window holds; a sort of
//      every occurrence a student ever confirmed does not.
//
// The timeline BUCKETS BY MONTH, so the rendered row count is the window's
// month count (6 rows for six months, 72 for six years) and not the record's
// row count. That is what makes "≥6 months" a boundary the page crosses rather
// than a wall it hits.
//
//
// THE SECOND HALF — "PARITY RETAINED" — AND WHAT IT HONESTLY MEANS HERE
//
// Both absorbed surfaces were read in full before this was written. What they
// actually held is catalogued in `next.config.mjs` beside their redirects,
// with the two capabilities deliberately not carried over stated by name
// rather than glossed — the same accounting M8-1 and M13-2 owed and paid.
//
// The one thing both surfaces genuinely did, and the only one that survives
// contact with the record, is A SERIES OVER TIME: `/console/analytics`'s
// sectors, per-subject comparison and "recent closes", and `grade-tracker`'s
// claim to be where a student watches their standing move. That is what this
// module derives, from rows instead of from constants.
//
//
// WHAT IT READS, AND THE SAME DIVERGENCE M13-1 RECORDED
//
// M13's dependency rationale says both surfaces *"read M12's projection and
// nothing else new."* They cannot yet, for the reason M12's own completion note
// gives: *"the catch-up runner is not built … Until it exists the tables stay
// empty."* `/diagnosis` folded L1/L3 directly for that reason and recorded it;
// `/record` makes the same call, for the same reason, over a wider set of
// sources — a six-month timeline assembled from `concept_accuracy` today would
// be six months of zeroes presented as a record, which is the Law 7 failure
// this milestone exists to end.
//
// So the timeline reads what is real: `confirmed_occurrences` (`020`),
// `patterns` (`007`), `evidence` (`007`), `study_sessions` (`021`) and
// `score_history` (`005`/`010`). When the catch-up runner lands,
// `academic_record` and `concept_accuracy` become an additional, faster source
// for the same facts — never a different answer.
//
//
// WHAT IT REFUSES
//
//   · A MONTH WITH NO ROWS IS NOT A MONTH OF ZEROES. `hasRecord` is false and
//     the surface says "no record", never "0 marks lost". §4, NEVER SHAME: a
//     quiet month is not a verdict, and a zero rendered beside five real
//     figures reads as one.
//   · A SOURCE THAT DID NOT ANSWER IS NAMED, NOT ZEROED. `unreadable` carries
//     the source; the column it feeds is `null`, not `0`. A read that did not
//     happen is not the same fact as a record with nothing in it.
//   · A TRUNCATED READ IS DECLARED. `truncated` names the source, and the
//     surface says the window holds more than it listed.
//   · NOTHING IS FORECAST. There is no projection, no trend line and no
//     "at this rate" — `grade-tracker`'s predictor and heatmap are precisely
//     what S.9 and Law 7 refuse, and neither is reproduced here.
//
// No I/O, no clock, no randomness, no Supabase, no `next/*`. Every fact is an
// argument, the window included (U.3).
// ═══════════════════════════════════════════════════════════════════════════

import {
  readOccurrence,
  readPattern,
  humanErrorType,
  type DbResult,
  type DbError,
  type OccurrenceRecord,
  type PatternRecord,
  type ReadRefusal,
  type Row,
} from "./diagnosis";
import type { ISOTimestamp, PatternStatus, UUID } from "./mistakes/types";

export type { Row, DbError, DbResult } from "./diagnosis";

// ═══════════════════════════════════════════════════════════════════════════
// THE SOURCES — each named with the index its windowed query is shaped for
// ═══════════════════════════════════════════════════════════════════════════

export interface RecordSource {
  /** The table or view. Views where a view exists: a reader that forgets
   *  `WHERE confirmed_at IS NOT NULL` counts proposals as facts. */
  readonly relation: string;
  /** The column the window is applied to, and the column rows are ordered by. */
  readonly timeColumn: string;
  /** The owner column. `score_history` predates `student_id` and uses
   *  `user_id`; stating it here is what stops a reader guessing. */
  readonly ownerColumn: string;
  /** The existing index this shape is a range scan on. Named so that a later
   *  change of `timeColumn` has to notice it is leaving the index behind. */
  readonly index: string;
  /** False when the surface can still stand without it. A supplementary source
   *  that errors is NAMED in `unreadable`, never rendered as zero. */
  readonly spine: boolean;
}

export const RECORD_SOURCES = Object.freeze({
  occurrences: Object.freeze({
    relation: "confirmed_occurrences",
    timeColumn: "confirmed_at",
    ownerColumn: "student_id",
    index: "occurrences_confirmed_idx",
    spine: true,
  }),
  patterns: Object.freeze({
    relation: "patterns",
    timeColumn: "",
    ownerColumn: "student_id",
    index: "patterns_student_status_idx",
    spine: true,
  }),
  evidence: Object.freeze({
    relation: "evidence",
    timeColumn: "captured_at",
    ownerColumn: "student_id",
    index: "evidence_student_idx",
    spine: false,
  }),
  sessions: Object.freeze({
    relation: "study_sessions",
    timeColumn: "opened_at",
    ownerColumn: "student_id",
    index: "study_sessions_student_recent_idx",
    spine: false,
  }),
  closes: Object.freeze({
    relation: "score_history",
    timeColumn: "captured_on",
    ownerColumn: "user_id",
    index: "score_history_user_date_idx",
    spine: false,
  }),
}) as Readonly<Record<RecordSourceName, RecordSource>>;

export type RecordSourceName =
  | "occurrences"
  | "patterns"
  | "evidence"
  | "sessions"
  | "closes";

// ═══════════════════════════════════════════════════════════════════════════
// THE WINDOW — the whole of the scale claim, as a value
// ═══════════════════════════════════════════════════════════════════════════

/** The done-when's floor. Six months is what M13-3 must render; it is the
 *  default because it is the promise, not because it is the limit. */
export const DEFAULT_WINDOW_MONTHS = 6;

/** Five years. A ceiling exists so that a hand-typed `?months=100000` cannot
 *  turn a range scan into a table scan. */
export const MAX_WINDOW_MONTHS = 60;

/** Rows per request. Supabase's PostgREST caps a response anyway; stating the
 *  page here is what makes the cap ours and therefore testable. */
export const RECORD_PAGE_SIZE = 500;

/** 10,000 rows per source. Reached only by a record far past anything this
 *  product has produced — and when it is reached, `truncated` says so. */
export const RECORD_MAX_PAGES = 20;

export interface RecordWindow {
  /** Inclusive. The first instant of the first month in the window. */
  fromISO: ISOTimestamp;
  /** Exclusive. The first instant of the month AFTER the last one. */
  toISO: ISOTimestamp;
  months: number;
  /** `YYYY-MM`, oldest first. Length is exactly `months`. */
  monthKeys: string[];
}

const MONTH_NAMES = Object.freeze([
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]);

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** `YYYY-MM` from an ISO timestamp or a `YYYY-MM-DD` date. Lexical, because
 *  both forms already sort correctly as text and parsing a date to bucket it
 *  would introduce the timezone question this module has no clock to answer. */
export const monthKeyOf = (iso: string): string => iso.slice(0, 7);

/** `Mar 2026` from `2026-03`. Presentation only. */
export function monthLabel(key: string): string {
  const year = key.slice(0, 4);
  const monthIndex = Number(key.slice(5, 7)) - 1;
  const name = MONTH_NAMES[monthIndex];
  return name ? `${name} ${year}` : key;
}

/**
 * The window ending with the month `nowISO` falls in, `months` months long.
 *
 * Month arithmetic is done on the calendar and not on a day count: 6 × 30 days
 * is not six months, and a timeline whose buckets drift is a timeline whose
 * oldest bucket is half a month. `clampMonths` is applied here rather than at
 * the caller so that no caller can skip it.
 */
export function buildWindow(nowISO: string, months: number = DEFAULT_WINDOW_MONTHS): RecordWindow {
  const span = clampMonths(months);
  const year = Number(nowISO.slice(0, 4));
  const month = Number(nowISO.slice(5, 7)); // 1-12

  // Zero-based absolute month index, so subtraction crosses years for free.
  const endIndex = year * 12 + (month - 1);
  const startIndex = endIndex - (span - 1);

  const keys: string[] = [];
  for (let i = startIndex; i <= endIndex; i++) keys.push(keyOfIndex(i));

  return {
    fromISO: `${keyOfIndex(startIndex)}-01T00:00:00.000Z`,
    toISO: `${keyOfIndex(endIndex + 1)}-01T00:00:00.000Z`,
    months: span,
    monthKeys: keys,
  };
}

const keyOfIndex = (index: number): string =>
  `${String(Math.floor(index / 12)).padStart(4, "0")}-${pad2((index % 12) + 1)}`;

export function clampMonths(months: number): number {
  if (!Number.isFinite(months)) return DEFAULT_WINDOW_MONTHS;
  const n = Math.trunc(months);
  if (n < 1) return 1;
  if (n > MAX_WINDOW_MONTHS) return MAX_WINDOW_MONTHS;
  return n;
}

/** In-window test, applied to rows as well as to queries. The query already
 *  narrows; this is the second refusal, so a widened query cannot smuggle a row
 *  from outside the window into a month bucket that does not exist. */
export const inWindow = (w: RecordWindow, iso: string | null): boolean =>
  iso !== null && iso >= w.fromISO && iso < w.toISO;

// ═══════════════════════════════════════════════════════════════════════════
// THE PATTERN LIST — `007`'s rows, counted from occurrences that can be listed
// ═══════════════════════════════════════════════════════════════════════════

/**
 * One line of the pattern list.
 *
 * `occurrenceCount` is COUNTED FROM `occurrenceIds`, never read from
 * `patterns.recurrence_count`, for the reason M13-1 gives: the stored counter
 * is derived over all occurrences including unconfirmed ones, so reading it
 * would let the screen claim nine and be able to list one.
 *
 * `severity` is `007`'s stored, derived column with the version that produced
 * it. It is never recomputed here — M11-2 owns that derivation.
 */
export interface RecordPattern {
  patternId: UUID;
  label: string;
  errorClass: "cognitive" | "execution";
  errorType: string;
  errorTypeLabel: string;
  subject: string | null;
  conceptId: UUID | null;
  status: PatternStatus;
  severity: number | null;
  severityVersion: string | null;
  /** Occurrences IN THE WINDOW attached to this pattern. */
  occurrenceCount: number;
  marksLost: number;
  /** First and last IN THE WINDOW. A pattern older than the window says so via
   *  `olderThanWindow`, rather than claiming it began when the window did. */
  firstSeenAt: ISOTimestamp | null;
  lastSeenAt: ISOTimestamp | null;
  /** True when the pattern row exists but no occurrence in the window points at
   *  it: it is on the record and quiet in this period. Stated, not hidden. */
  quietInWindow: boolean;
  occurrenceIds: UUID[];
}

/** §4.4.4's lifecycle, in the order a student reads it. `dormant` and
 *  `resolved` sit last because a list that opens with resolved rows buries the
 *  live ones. */
const STATUS_ORDER: Readonly<Record<PatternStatus, number>> = Object.freeze({
  open: 0,
  recurred: 1,
  acknowledged: 2,
  practising: 3,
  dormant: 4,
  resolved: 5,
});

export const STATUS_LABEL: Readonly<Record<PatternStatus, string>> = Object.freeze({
  open: "Open",
  recurred: "Recurred",
  acknowledged: "Acknowledged",
  practising: "Practising",
  dormant: "Quiet",
  resolved: "Resolved",
});

/**
 * Leaf patterns with their in-window weight.
 *
 * ONLY LEAVES. §4.4.2: parents never own occurrences, and a parent row in a
 * list of "what you keep getting wrong" would be a heading pretending to be an
 * entry. `/diagnosis` groups leaves under parents because it is answering
 * *what recurs*; `/record` lists them flat because it is answering *what is on
 * the record*, and the roll-up already has a home.
 */
export function patternList(
  records: readonly OccurrenceRecord[],
  patterns: readonly PatternRecord[],
): RecordPattern[] {
  const byPattern = new Map<UUID, OccurrenceRecord[]>();
  for (const o of records) {
    if (!o.patternId) continue;
    const list = byPattern.get(o.patternId) ?? [];
    list.push(o);
    byPattern.set(o.patternId, list);
  }

  const out: RecordPattern[] = [];
  for (const p of patterns) {
    if (p.tier !== "concept") continue; // leaves only (§4.4.2)
    const attached = byPattern.get(p.id) ?? [];

    let first: string | null = null;
    let last: string | null = null;
    let marksLost = 0;
    for (const o of attached) {
      const at = o.occurredAt ?? o.confirmedAt;
      if (first === null || at < first) first = at;
      if (last === null || at > last) last = at;
      marksLost += o.marksLost;
    }

    out.push({
      patternId: p.id,
      label: p.label,
      errorClass: p.errorClass,
      errorType: p.errorType,
      errorTypeLabel: humanErrorType(p.errorType),
      subject: p.subject,
      conceptId: p.conceptId,
      status: p.status,
      severity: p.severity,
      severityVersion: p.severityVersion,
      occurrenceCount: attached.length,
      marksLost,
      firstSeenAt: first,
      lastSeenAt: last,
      quietInWindow: attached.length === 0,
      occurrenceIds: attached.map(o => o.id),
    });
  }

  // Deterministic and total: live before settled, then worst severity, then
  // weight, then name. Two runs over the same rows produce the same order.
  out.sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    (b.severity ?? -1) - (a.severity ?? -1) ||
    b.marksLost - a.marksLost ||
    b.occurrenceCount - a.occurrenceCount ||
    (a.label < b.label ? -1 : a.label > b.label ? 1 : 0),
  );
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE TIMELINE — one row per month in the window, never one row per record
// ═══════════════════════════════════════════════════════════════════════════

/** A recorded close of the index. `005`'s row, read and not recomputed.
 *  M14-5 adds `formula_version`; until it does, a close is presented as *what
 *  the index read that day*, which is what it is. */
export interface RecordedClose {
  capturedOn: string;
  total: number;
  pqa: number;
  syllabus: number;
  mistakes: number;
  consistency: number;
}

export interface TimelineMonth {
  /** `YYYY-MM`. */
  month: string;
  /** `Mar 2026`. */
  label: string;
  /** FALSE means nothing was recorded, which is a different fact from zero. */
  hasRecord: boolean;
  occurrenceCount: number;
  marksLost: number;
  marksAvailable: number;
  /** `null` when `evidence` could not be read — never `0` in that case. */
  papersCaptured: number | null;
  /** `null` when `study_sessions` could not be read. */
  sessionsOpened: number | null;
  sessionsVerified: number | null;
  /** The LAST close recorded in the month. `null` when none was, or when
   *  `score_history` could not be read. */
  close: RecordedClose | null;
  subjects: Array<{ subject: string; marksLost: number; occurrenceCount: number }>;
  occurrenceIds: UUID[];
}

export interface Timeline {
  /** Oldest first. Length is exactly `window.months` — every month in the
   *  window is present, including the quiet ones. */
  months: TimelineMonth[];
  /** Months carrying at least one recorded fact. */
  monthsWithRecord: number;
  /** The earliest and latest recorded fact IN THE WINDOW. */
  firstRecordAt: ISOTimestamp | null;
  lastRecordAt: ISOTimestamp | null;
}

export interface TimelineInputs {
  occurrences: readonly OccurrenceRecord[];
  /** `captured_at` of each `evidence` row, or null when unread. */
  evidenceCapturedAt: readonly string[] | null;
  /** `{ openedAt, state }` per `study_sessions` row, or null when unread. */
  sessions: readonly { openedAt: string; state: string }[] | null;
  /** `score_history` rows, or null when unread. */
  closes: readonly RecordedClose[] | null;
}

export function buildTimeline(w: RecordWindow, input: TimelineInputs): Timeline {
  const months = new Map<string, TimelineMonth>();
  for (const key of w.monthKeys) {
    months.set(key, {
      month: key,
      label: monthLabel(key),
      hasRecord: false,
      occurrenceCount: 0,
      marksLost: 0,
      marksAvailable: 0,
      papersCaptured: input.evidenceCapturedAt === null ? null : 0,
      sessionsOpened: input.sessions === null ? null : 0,
      sessionsVerified: input.sessions === null ? null : 0,
      close: null,
      subjects: [],
      occurrenceIds: [],
    });
  }

  const perMonthSubjects = new Map<string, Map<string, { marksLost: number; occurrenceCount: number }>>();
  let firstRecordAt: string | null = null;
  let lastRecordAt: string | null = null;

  const mark = (at: string): TimelineMonth | null => {
    if (!inWindow(w, at)) return null;
    const bucket = months.get(monthKeyOf(at));
    if (!bucket) return null;
    bucket.hasRecord = true;
    if (firstRecordAt === null || at < firstRecordAt) firstRecordAt = at;
    if (lastRecordAt === null || at > lastRecordAt) lastRecordAt = at;
    return bucket;
  };

  for (const o of input.occurrences) {
    const at = o.occurredAt ?? o.confirmedAt;
    const bucket = mark(at);
    if (!bucket) continue;
    bucket.occurrenceCount += 1;
    bucket.marksLost += o.marksLost;
    bucket.marksAvailable += o.marksAvailable;
    bucket.occurrenceIds.push(o.id);

    const key = o.subject || "Unassigned";
    const perSubject = perMonthSubjects.get(bucket.month) ?? new Map();
    const tally = perSubject.get(key) ?? { marksLost: 0, occurrenceCount: 0 };
    tally.marksLost += o.marksLost;
    tally.occurrenceCount += 1;
    perSubject.set(key, tally);
    perMonthSubjects.set(bucket.month, perSubject);
  }

  if (input.evidenceCapturedAt !== null) {
    for (const at of input.evidenceCapturedAt) {
      const bucket = mark(at);
      if (bucket && bucket.papersCaptured !== null) bucket.papersCaptured += 1;
    }
  }

  if (input.sessions !== null) {
    for (const s of input.sessions) {
      const bucket = mark(s.openedAt);
      if (!bucket) continue;
      if (bucket.sessionsOpened !== null) bucket.sessionsOpened += 1;
      if (bucket.sessionsVerified !== null && s.state === "VERIFIED") bucket.sessionsVerified += 1;
    }
  }

  if (input.closes !== null) {
    for (const c of input.closes) {
      // `captured_on` is a DATE. Widened to the day's first instant for the
      // window test, which is what a DATE means as an instant.
      const at = `${c.capturedOn}T00:00:00.000Z`;
      const bucket = mark(at);
      if (!bucket) continue;
      if (bucket.close === null || c.capturedOn > bucket.close.capturedOn) bucket.close = c;
    }
  }

  const out = w.monthKeys.map(key => {
    const bucket = months.get(key)!;
    const perSubject = perMonthSubjects.get(key);
    bucket.subjects = perSubject
      ? [...perSubject.entries()]
          .map(([subject, t]) => ({ subject, ...t }))
          .sort((a, b) => b.marksLost - a.marksLost || (a.subject < b.subject ? -1 : 1))
      : [];
    return bucket;
  });

  return {
    months: out,
    monthsWithRecord: out.filter(m => m.hasRecord).length,
    firstRecordAt,
    lastRecordAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE WHOLE SURFACE, IN ONE VALUE
// ═══════════════════════════════════════════════════════════════════════════

export interface RecordTotals {
  occurrenceCount: number;
  marksLost: number;
  marksAvailable: number;
  papersCaptured: number | null;
  sessionsOpened: number | null;
  sessionsVerified: number | null;
  patternsListed: number;
  patternsLive: number;
  patternsResolved: number;
}

export interface AcademicRecordView {
  window: RecordWindow;
  totals: RecordTotals;
  timeline: Timeline;
  patterns: RecordPattern[];
  /** Rows that could not be read, with the reason. Counted, never dropped. */
  refused: Array<{ refusal: ReadRefusal; count: number }>;
  /** Sources that did not answer. Their columns are `null`, never `0`. */
  unreadable: Array<{ source: RecordSourceName; message: string }>;
  /** Sources whose window held more rows than the page ceiling admits. */
  truncated: RecordSourceName[];
  /** The most recent close in the window, or null. `/console/analytics`'s
   *  "recent closes" panel, on rows instead of on constants. */
  latestClose: RecordedClose | null;
}

/** The zero state. Not zeroes presented as a record — an EMPTY record, which
 *  the surface renders as an invitation rather than as a standing. */
export const isEmptyRecord = (r: AcademicRecordView): boolean =>
  r.totals.occurrenceCount === 0 &&
  r.totals.patternsListed === 0 &&
  (r.totals.papersCaptured ?? 0) === 0 &&
  (r.totals.sessionsOpened ?? 0) === 0 &&
  r.latestClose === null;

export interface RecordRows {
  occurrenceRows: readonly Row[];
  patternRows: readonly Row[];
  evidenceRows: readonly Row[] | null;
  sessionRows: readonly Row[] | null;
  closeRows: readonly Row[] | null;
  unreadable: Array<{ source: RecordSourceName; message: string }>;
  truncated: RecordSourceName[];
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : 0);

export function readClose(row: Row): RecordedClose | null {
  const capturedOn = str(row.captured_on);
  if (!capturedOn) return null;
  if (typeof row.total !== "number" || !Number.isFinite(row.total)) return null;
  return {
    capturedOn: capturedOn.slice(0, 10),
    total: Math.trunc(row.total),
    pqa: num(row.pqa),
    syllabus: num(row.syllabus),
    mistakes: num(row.mistakes),
    consistency: num(row.consistency),
  };
}

export function buildRecord(w: RecordWindow, rows: RecordRows): AcademicRecordView {
  const records: OccurrenceRecord[] = [];
  const refusals = new Map<ReadRefusal, number>();
  for (const row of rows.occurrenceRows) {
    const read = readOccurrence(row);
    if (read.ok) {
      // The second refusal. The query already windowed; this is what stops a
      // widened query putting a row in a month bucket the window does not hold.
      if (inWindow(w, read.record.occurredAt ?? read.record.confirmedAt)) records.push(read.record);
    } else {
      refusals.set(read.refusal, (refusals.get(read.refusal) ?? 0) + 1);
    }
  }

  const patterns = rows.patternRows
    .map(readPattern)
    .filter((p): p is PatternRecord => p !== null);

  const evidenceCapturedAt =
    rows.evidenceRows === null
      ? null
      : rows.evidenceRows
          .map(r => str(r.captured_at))
          .filter((v): v is string => v !== null && inWindow(w, v));

  const sessions =
    rows.sessionRows === null
      ? null
      : rows.sessionRows
          .map(r => ({ openedAt: str(r.opened_at), state: str(r.state) ?? "" }))
          .filter((s): s is { openedAt: string; state: string } =>
            s.openedAt !== null && inWindow(w, s.openedAt))
          .map(s => ({ openedAt: s.openedAt, state: s.state }));

  const closes =
    rows.closeRows === null
      ? null
      : rows.closeRows
          .map(readClose)
          .filter((c): c is RecordedClose => c !== null && inWindow(w, `${c.capturedOn}T00:00:00.000Z`));

  const timeline = buildTimeline(w, { occurrences: records, evidenceCapturedAt, sessions, closes });
  const list = patternList(records, patterns);

  const sumOr = (
    pick: (m: TimelineMonth) => number | null,
  ): number | null =>
    timeline.months.reduce<number | null>(
      (acc, m) => (acc === null || pick(m) === null ? null : acc + (pick(m) as number)),
      0,
    );

  const settled = (s: PatternStatus): boolean => s === "resolved" || s === "dormant";

  const latestClose =
    closes === null || closes.length === 0
      ? null
      : closes.reduce((best, c) => (c.capturedOn > best.capturedOn ? c : best));

  return {
    window: w,
    totals: {
      occurrenceCount: records.length,
      marksLost: records.reduce((n, o) => n + o.marksLost, 0),
      marksAvailable: records.reduce((n, o) => n + o.marksAvailable, 0),
      papersCaptured: sumOr(m => m.papersCaptured),
      sessionsOpened: sumOr(m => m.sessionsOpened),
      sessionsVerified: sumOr(m => m.sessionsVerified),
      patternsListed: list.length,
      patternsLive: list.filter(p => !settled(p.status)).length,
      patternsResolved: list.filter(p => p.status === "resolved").length,
    },
    timeline,
    patterns: list,
    refused: [...refusals.entries()].map(([refusal, count]) => ({ refusal, count })),
    unreadable: rows.unreadable,
    truncated: rows.truncated,
    latestClose,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ACCESS LAYER — verbs, never a client (U.3), and not one of them writes
// ═══════════════════════════════════════════════════════════════════════════

export interface PageRequest {
  /** Zero-based. `offset = page * RECORD_PAGE_SIZE`. */
  page: number;
  pageSize: number;
}

/**
 * The five reads `/record` needs. **There is no sixth verb, and there is no
 * write verb of any kind** — the same construction `DiagnosisDb` uses, for the
 * same reason: the surface that replaces the tools which could destroy a record
 * cannot express a delete, an update or an insert, and widening it would show
 * up in a diff.
 *
 * Every read takes the WINDOW and a PAGE. There is no "list everything" verb to
 * call by accident.
 */
export interface RecordDb {
  listConfirmedOccurrences(studentId: UUID, w: RecordWindow, p: PageRequest): Promise<DbResult<Row[]>>;
  listPatterns(studentId: UUID, p: PageRequest): Promise<DbResult<Row[]>>;
  listEvidence(studentId: UUID, w: RecordWindow, p: PageRequest): Promise<DbResult<Row[]>>;
  listSessions(studentId: UUID, w: RecordWindow, p: PageRequest): Promise<DbResult<Row[]>>;
  listCloses(studentId: UUID, w: RecordWindow, p: PageRequest): Promise<DbResult<Row[]>>;
}

export type RecordResult =
  | { ok: true; record: AcademicRecordView }
  | { ok: false; error: DbError };

interface PagedRead {
  rows: Row[] | null;
  error: DbError | null;
  truncated: boolean;
}

/**
 * Page a windowed read until a short page arrives.
 *
 * THIS IS THE ≥6-MONTH GUARANTEE'S SECOND MECHANISM. A six-month record is not
 * assumed to be small: it is read `RECORD_PAGE_SIZE` rows at a time, the loop
 * stops the moment a page comes back short, and it refuses to run past
 * `RECORD_MAX_PAGES` — so a pathological record costs a bounded number of
 * bounded queries rather than one unbounded one. `truncated` carries the
 * ceiling upward instead of letting a partial total be rendered as a total.
 */
export async function readAllPages(
  read: (p: PageRequest) => Promise<DbResult<Row[]>>,
): Promise<PagedRead> {
  const rows: Row[] = [];
  for (let page = 0; page < RECORD_MAX_PAGES; page++) {
    const { data, error } = await read({ page, pageSize: RECORD_PAGE_SIZE });
    if (error) return { rows: null, error, truncated: false };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < RECORD_PAGE_SIZE) return { rows, error: null, truncated: false };
  }
  return { rows, error: null, truncated: true };
}

/**
 * Read the record and derive the surface.
 *
 * THE SPINE FAILS LOUDLY; THE REST DEGRADES BY NAME. `confirmed_occurrences`
 * and `patterns` are what the surface IS, so a failure to read either is
 * returned as a failure — never as an empty record, because *"a read that did
 * not happen is not the same fact as a record with nothing in it."* `evidence`,
 * `study_sessions` and `score_history` each enrich the timeline; when one does
 * not answer, its columns are `null` and it is named in `unreadable`, so the
 * page can say which figure is missing instead of showing a zero.
 */
export async function loadRecord(
  db: RecordDb,
  studentId: UUID,
  w: RecordWindow,
): Promise<RecordResult> {
  const [occurrences, patterns, evidence, sessions, closes] = await Promise.all([
    readAllPages(p => db.listConfirmedOccurrences(studentId, w, p)),
    readAllPages(p => db.listPatterns(studentId, p)),
    readAllPages(p => db.listEvidence(studentId, w, p)),
    readAllPages(p => db.listSessions(studentId, w, p)),
    readAllPages(p => db.listCloses(studentId, w, p)),
  ]);

  if (occurrences.error) return { ok: false, error: occurrences.error };
  if (patterns.error) return { ok: false, error: patterns.error };

  const unreadable: Array<{ source: RecordSourceName; message: string }> = [];
  const truncated: RecordSourceName[] = [];
  const supplementary: Array<[RecordSourceName, PagedRead]> = [
    ["evidence", evidence],
    ["sessions", sessions],
    ["closes", closes],
  ];
  for (const [source, read] of supplementary) {
    if (read.error) unreadable.push({ source, message: read.error.message });
    else if (read.truncated) truncated.push(source);
  }
  if (occurrences.truncated) truncated.push("occurrences");
  if (patterns.truncated) truncated.push("patterns");

  return {
    ok: true,
    record: buildRecord(w, {
      occurrenceRows: occurrences.rows ?? [],
      patternRows: patterns.rows ?? [],
      evidenceRows: evidence.error ? null : evidence.rows ?? [],
      sessionRows: sessions.error ? null : sessions.rows ?? [],
      closeRows: closes.error ? null : closes.rows ?? [],
      unreadable,
      truncated,
    }),
  };
}
