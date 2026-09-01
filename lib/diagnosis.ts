// ═══════════════════════════════════════════════════════════════════════════
// M13-1 — THE DIAGNOSIS DERIVATION.
//
// EXECUTION_PLAN M13-1: *"`/diagnosis`: marks lost by error class; recurrence
// with an evidence trail. Done when: **every claim on the surface reaches a
// record.**"*
//
// `PRODUCT_DECISIONS` §2.4: *"Six metaphors for one answer. **Merging them IS
// the product.**"* Architecture S.4: `post-exam`, `paper-autopsy`,
// `marks-forensics`, `marks-obituary`, `paper-trauma`, `paper-pattern` and
// `calibration` **REBUILD as one** `/diagnosis`.
//
//
// THE DONE-WHEN, IMPLEMENTED AS A TYPE RATHER THAN A HABIT
//
// "Every claim on the surface reaches a record" is not a review checklist here.
// Every tally this module emits carries `occurrenceIds` — the ids of the rows
// that produced the figure — and every recurrence carries a `trail` of
// `EvidenceLink`s naming the occurrence AND the `evidence` row behind it. A
// figure with no ids cannot be constructed, because the tally types have no
// shape without them.
//
// That is the same instrument M9's completion payload and M10's provenance
// used: the honesty is in the data structure, so a later edit that wants to
// render an unbacked number has to add a field to do it.
//
//
// WHAT IT READS, AND THE ONE DIVERGENCE FROM THE PLAN'S ROW
//
// The plan's M13 dependency rationale says *"Both surfaces read M12's
// projection and nothing else new."* **They cannot, yet, and the plan says so
// itself** — M12's own completion note records that *"the catch-up runner is
// not built and is deliberately not M12's … Until it exists the tables stay
// empty."* A surface whose every figure came from `concept_accuracy` would
// therefore render zeroes and call them a diagnosis, which is exactly the Law 7
// failure this milestone exists to end.
//
// So this module folds **L1/L3 directly**: `confirmed_occurrences` (`020`'s
// view — the record, with proposals already absent) and `patterns` (`007`,
// written by M11's `ingestOccurrenceIntoDna`). Both are real rows a student can
// be shown. When the catch-up runner lands, `concept_accuracy` becomes an
// additional, faster source for the same facts — never a different answer.
//
// Recorded as a divergence rather than resolved by judgement, the same way
// M12-1 recorded the three-rung/five-rung disagreement.
//
//
// WHAT IT REFUSES
//
//   · An UNCONFIRMED occurrence is never counted. The caller reads `020`'s
//     view; `readOccurrence` additionally refuses a row with no `confirmed_at`,
//     so a widened query cannot turn proposals into marks lost.
//   · An occurrence carrying BOTH a cognitive and an execution error is put in
//     neither class. V.4.9: *"not silently assigned to either."* Splitting its
//     marks across both would double-count; picking one would invent a
//     classification. It is counted in `ambiguous`, in the open.
//   · A leaf pattern whose occurrences are not in the batch produces NO
//     recurrence row. A pattern the surface cannot evidence is a claim.
//   · Parent severity is MAX of descendants, derived here and never stored
//     (§4.6.2). Breadth is stated in words, never folded into the number
//     (§4.6.4).
//
// No I/O, no clock, no randomness, no Supabase, no `next/*`. Every fact is an
// argument (U.3).
// ═══════════════════════════════════════════════════════════════════════════

import type {
  CognitiveError,
  ErrorClass,
  ErrorType,
  ExecutionError,
  ISOTimestamp,
  PatternStatus,
  UUID,
} from "./mistakes/types";

export type Row = Record<string, unknown>;

/** `020`'s view. The record. Readers use this, never the table. */
export const DIAGNOSIS_OCCURRENCE_SOURCE = "confirmed_occurrences";
/** `007`'s table. M11 writes it; this module only reads. */
export const DIAGNOSIS_PATTERN_SOURCE = "patterns";

// ═══════════════════════════════════════════════════════════════════════════
// ROW → RECORD
// ═══════════════════════════════════════════════════════════════════════════

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

const int = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;

export interface OccurrenceRecord {
  id: UUID;
  evidenceId: UUID;
  conceptId: UUID | null;
  patternId: UUID | null;
  subject: string;
  chapter: string;
  topic: string;
  questionRef: string;
  source: string;
  marksLost: number;
  marksAvailable: number;
  cognitiveError: CognitiveError | null;
  executionError: ExecutionError | null;
  confidenceBefore: 0 | 1 | 2 | 3 | null;
  occurredAt: ISOTimestamp | null;
  confirmedAt: ISOTimestamp;
}

export type ReadRefusal =
  | "no-id"
  | "no-evidence"
  | "not-confirmed"
  | "marks-unreadable"
  | "no-error-classification";

/**
 * One row of `confirmed_occurrences` → one record, or a typed refusal.
 *
 * It REFUSES rather than repairs, for `lib/occurrences.ts`'s reason: *"A
 * coerced draft is a claim wearing a fact's clothes."* A row with no
 * `evidence_id` cannot be shown as evidence of anything, and a row with
 * unreadable marks cannot contribute to a marks total — so neither becomes a
 * partially-populated record that a tally then trusts.
 */
export function readOccurrence(
  row: Row,
): { ok: true; record: OccurrenceRecord } | { ok: false; refusal: ReadRefusal } {
  const id = str(row.id);
  if (!id) return { ok: false, refusal: "no-id" };

  const evidenceId = str(row.evidence_id);
  if (!evidenceId) return { ok: false, refusal: "no-evidence" };

  const confirmedAt = str(row.confirmed_at);
  if (!confirmedAt) return { ok: false, refusal: "not-confirmed" };

  const marksLost = int(row.marks_lost);
  const marksAvailable = int(row.marks_available);
  if (marksLost === null || marksAvailable === null || marksLost < 0) {
    return { ok: false, refusal: "marks-unreadable" };
  }

  const cognitiveError = str(row.cognitive_error) as CognitiveError | null;
  const executionError = str(row.execution_error) as ExecutionError | null;
  if (!cognitiveError && !executionError) {
    // `007`'s `occurrences_has_error` should have refused this row. If one is
    // read anyway it is REPORTED, never repaired (§4.3's invariant).
    return { ok: false, refusal: "no-error-classification" };
  }

  const confidence = int(row.confidence_before);

  return {
    ok: true,
    record: {
      id,
      evidenceId,
      conceptId: str(row.concept_id),
      patternId: str(row.pattern_id),
      subject: str(row.subject) ?? "",
      chapter: str(row.chapter) ?? "",
      topic: str(row.topic) ?? "",
      questionRef: str(row.question_ref) ?? "",
      source: str(row.source) ?? "",
      marksLost,
      marksAvailable,
      cognitiveError,
      executionError,
      confidenceBefore:
        confidence === 0 || confidence === 1 || confidence === 2 || confidence === 3
          ? (confidence as 0 | 1 | 2 | 3)
          : null,
      occurredAt: str(row.created_at),
      confirmedAt,
    },
  };
}

export interface PatternRecord {
  id: UUID;
  tier: "concept" | "subject" | "global";
  conceptId: UUID | null;
  parentPatternId: UUID | null;
  subject: string | null;
  errorClass: ErrorClass;
  errorType: ErrorType;
  label: string;
  status: PatternStatus;
  severity: number | null;
  severityVersion: string | null;
}

/** One `patterns` row → one record, or null. A row with no tier is a row from
 *  somewhere `007` does not describe. */
export function readPattern(row: Row): PatternRecord | null {
  const id = str(row.id);
  const tier = str(row.tier);
  const errorClass = str(row.error_class);
  const errorType = str(row.error_type);
  if (!id || !tier || !errorClass || !errorType) return null;
  if (tier !== "concept" && tier !== "subject" && tier !== "global") return null;

  return {
    id,
    tier,
    conceptId: str(row.concept_id),
    parentPatternId: str(row.parent_pattern_id),
    subject: str(row.subject),
    errorClass: errorClass as ErrorClass,
    errorType: errorType as ErrorType,
    label: str(row.label) ?? "",
    status: (str(row.status) ?? "open") as PatternStatus,
    severity: int(row.severity),
    severityVersion: str(row.severity_version),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ERROR-CLASS SPLIT (§4.5) — the product's core language
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `ambiguous` is not a third error class. §4.5 has exactly two. It is the name
 * for an occurrence whose class the record does not determine — V.4.9's
 * *"returns `ambiguous-error-classification` and is not silently assigned to
 * either"*, carried up to the surface instead of being hidden by a default.
 */
export type ClassBucket = ErrorClass | "ambiguous";

export const CLASS_BUCKETS: readonly ClassBucket[] = Object.freeze([
  "cognitive",
  "execution",
  "ambiguous",
]);

/** §4.5's plain-English gloss, verbatim in intent. Presentation only. */
export const CLASS_MEANING: Readonly<Record<ClassBucket, string>> = Object.freeze({
  cognitive: "You did not know it. Fixed by learning.",
  execution: "You knew it and lost the mark anyway. Fixed by process.",
  ambiguous: "Both a cognitive and an execution error are recorded. Not assigned to either.",
});

const HUMAN: Readonly<Record<string, string>> = Object.freeze({
  "not-known": "Not known",
  misconception: "Misconception",
  "wrong-method": "Wrong method",
  "incomplete-understanding": "Incomplete understanding",
  "misapplied-rule": "Misapplied rule",
  "cannot-recall-formula": "Cannot recall the formula",
  "misread-question": "Misread question",
  "arithmetic-slip": "Arithmetic slip",
  "sign-error": "Sign error",
  "unit-error": "Unit error",
  "ran-out-of-time": "Ran out of time",
  "incomplete-answer": "Incomplete answer",
  "missed-working": "Missed working",
  transcription: "Transcription",
  presentation: "Presentation",
});

/** The same table `lib/mistakes/store.ts:labelFor` reads. Built from the error
 *  type on the row, never from a model. */
export const humanErrorType = (t: string): string => HUMAN[t] ?? t;

/** Which bucket one record falls in. Total, and it never guesses. */
export function bucketOf(o: OccurrenceRecord): ClassBucket {
  if (o.cognitiveError && o.executionError) return "ambiguous";
  return o.cognitiveError ? "cognitive" : "execution";
}

/** The specific error, or null when the bucket is `ambiguous` — the point of
 *  the bucket being that no single type is determined. */
export const errorTypeOf = (o: OccurrenceRecord): ErrorType | null => {
  if (o.cognitiveError && o.executionError) return null;
  return (o.cognitiveError ?? o.executionError) as ErrorType;
};

// ═══════════════════════════════════════════════════════════════════════════
// THE TALLIES — every one carries the ids that produced it
// ═══════════════════════════════════════════════════════════════════════════

export interface ErrorTypeTally {
  errorClass: ClassBucket;
  errorType: ErrorType | null;
  label: string;
  marksLost: number;
  marksAvailable: number;
  occurrenceCount: number;
  /** THE DONE-WHEN. The rows this figure is a sum of. */
  occurrenceIds: UUID[];
}

export interface ClassTally {
  errorClass: ClassBucket;
  meaning: string;
  marksLost: number;
  marksAvailable: number;
  occurrenceCount: number;
  types: ErrorTypeTally[];
  occurrenceIds: UUID[];
}

export interface MarksLostByErrorClass {
  classes: ClassTally[];
  marksLost: number;
  marksAvailable: number;
  occurrenceCount: number;
}

/** Deterministic: marks lost descending, then error type alphabetically, so two
 *  runs over the same rows produce the same order (U.3). */
const byMarksThenName = (
  a: { marksLost: number; label: string },
  b: { marksLost: number; label: string },
): number => (b.marksLost - a.marksLost) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

export function marksLostByErrorClass(records: readonly OccurrenceRecord[]): MarksLostByErrorClass {
  const perType = new Map<string, ErrorTypeTally>();

  for (const o of records) {
    const errorClass = bucketOf(o);
    const errorType = errorTypeOf(o);
    const key = `${errorClass}::${errorType ?? "-"}`;
    const tally =
      perType.get(key) ??
      {
        errorClass,
        errorType,
        label: errorType ? humanErrorType(errorType) : "Unassigned",
        marksLost: 0,
        marksAvailable: 0,
        occurrenceCount: 0,
        occurrenceIds: [],
      };
    tally.marksLost += o.marksLost;
    tally.marksAvailable += o.marksAvailable;
    tally.occurrenceCount += 1;
    tally.occurrenceIds.push(o.id);
    perType.set(key, tally);
  }

  const classes: ClassTally[] = [];
  for (const errorClass of CLASS_BUCKETS) {
    const types = [...perType.values()].filter(t => t.errorClass === errorClass).sort(byMarksThenName);
    if (types.length === 0) continue;
    classes.push({
      errorClass,
      meaning: CLASS_MEANING[errorClass],
      marksLost: types.reduce((n, t) => n + t.marksLost, 0),
      marksAvailable: types.reduce((n, t) => n + t.marksAvailable, 0),
      occurrenceCount: types.reduce((n, t) => n + t.occurrenceCount, 0),
      types,
      occurrenceIds: types.flatMap(t => t.occurrenceIds),
    });
  }

  return {
    classes,
    marksLost: records.reduce((n, o) => n + o.marksLost, 0),
    marksAvailable: records.reduce((n, o) => n + o.marksAvailable, 0),
    occurrenceCount: records.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RECURRENCE, WITH AN EVIDENCE TRAIL
// ═══════════════════════════════════════════════════════════════════════════

/** One step of the trail. The occurrence AND the `evidence` row behind it, so a
 *  claim reaches proof and not merely another derived table. */
export interface EvidenceLink {
  occurrenceId: UUID;
  evidenceId: UUID;
  questionRef: string;
  subject: string;
  topic: string;
  source: string;
  marksLost: number;
  marksAvailable: number;
  at: ISOTimestamp | null;
}

export interface RecurringPattern {
  patternId: UUID;
  label: string;
  errorClass: ErrorClass;
  errorType: ErrorType;
  subject: string | null;
  conceptId: UUID | null;
  status: PatternStatus;
  /** `007`'s stored, derived column, with the version of the derivation that
   *  produced it (M11-2's `SeverityProvenance`). Never recomputed here. */
  severity: number | null;
  severityVersion: string | null;
  /** COUNTED FROM THE TRAIL, not read from `patterns.recurrence_count`. The
   *  stored counter is computed over all occurrences including unconfirmed
   *  ones; this surface may only claim what it can list. */
  recurrenceCount: number;
  marksLost: number;
  firstSeenAt: ISOTimestamp | null;
  lastSeenAt: ISOTimestamp | null;
  /** Never empty. A leaf with no listed occurrence is not returned at all. */
  trail: EvidenceLink[];
}

/**
 * §4.4.5's parent summary — *"You've lost 31 marks to sign errors across 4
 * topics"* — with §4.6.2's derivation and §4.6.4's refusal.
 */
export interface PatternGroup {
  /** Null when the leaves' parent row was not in the batch. The group still
   *  stands: it is a view over leaves, and leaves are what hold the truth. */
  parentPatternId: UUID | null;
  label: string;
  errorClass: ErrorClass;
  subject: string | null;
  /** MAX across descendant leaves (§4.6.2). Derived on demand, never stored. */
  severity: number | null;
  marksLost: number;
  recurrenceCount: number;
  /** Breadth, in words rather than folded into `severity` (§4.6.4). */
  topicCount: number;
  leaves: RecurringPattern[];
}

const earlier = (a: string | null, b: string | null): string | null =>
  a === null ? b : b === null ? a : a < b ? a : b;
const later = (a: string | null, b: string | null): string | null =>
  a === null ? b : b === null ? a : a > b ? a : b;

/**
 * Leaf patterns with their evidence, grouped under their parents.
 *
 * A leaf is returned only when at least one CONFIRMED occurrence in the batch
 * points at it. That is the done-when, enforced by construction: there is no
 * code path that emits a recurrence whose trail is empty.
 */
export function recurrenceWithEvidence(
  records: readonly OccurrenceRecord[],
  patterns: readonly PatternRecord[],
): PatternGroup[] {
  const byId = new Map(patterns.map(p => [p.id, p]));
  const trails = new Map<UUID, EvidenceLink[]>();

  for (const o of records) {
    if (!o.patternId) continue;
    const leaf = byId.get(o.patternId);
    // `007`'s composite FK makes a non-leaf target impossible; this is the
    // second refusal, so a widened query cannot attach evidence to a parent
    // (§4.4.2: parents never own occurrences).
    if (!leaf || leaf.tier !== "concept") continue;
    const trail = trails.get(o.patternId) ?? [];
    trail.push({
      occurrenceId: o.id,
      evidenceId: o.evidenceId,
      questionRef: o.questionRef,
      subject: o.subject,
      topic: o.topic,
      source: o.source,
      marksLost: o.marksLost,
      marksAvailable: o.marksAvailable,
      at: o.occurredAt,
    });
    trails.set(o.patternId, trail);
  }

  const leaves: RecurringPattern[] = [];
  for (const [patternId, trail] of trails) {
    const p = byId.get(patternId);
    if (!p) continue;
    trail.sort((a, b) => (a.at ?? "") < (b.at ?? "") ? 1 : (a.at ?? "") > (b.at ?? "") ? -1 : 0);
    let first: string | null = null;
    let last: string | null = null;
    for (const step of trail) {
      first = earlier(first, step.at);
      last = later(last, step.at);
    }
    leaves.push({
      patternId,
      label: p.label,
      errorClass: p.errorClass,
      errorType: p.errorType,
      subject: p.subject,
      conceptId: p.conceptId,
      status: p.status,
      severity: p.severity,
      severityVersion: p.severityVersion,
      recurrenceCount: trail.length,
      marksLost: trail.reduce((n, s) => n + s.marksLost, 0),
      firstSeenAt: first,
      lastSeenAt: last,
      trail,
    });
  }

  // ── The roll-up. §4.4.6: the hierarchy IS the aggregation mechanism ───────
  const groups = new Map<string, PatternGroup>();
  for (const leaf of leaves) {
    const parentId = leafParentOf(leaf, byId);
    const key = parentId ?? `${leaf.errorClass}::${leaf.errorType}::${leaf.subject ?? ""}`;
    const parentRow = parentId ? byId.get(parentId) ?? null : null;
    const group =
      groups.get(key) ??
      {
        parentPatternId: parentId,
        label: parentRow?.label ?? `${humanErrorType(leaf.errorType)}${leaf.subject ? ` in ${leaf.subject}` : ""}`,
        errorClass: leaf.errorClass,
        subject: leaf.subject,
        severity: null,
        marksLost: 0,
        recurrenceCount: 0,
        topicCount: 0,
        leaves: [],
      };
    group.leaves.push(leaf);
    group.marksLost += leaf.marksLost;
    group.recurrenceCount += leaf.recurrenceCount;
    // §4.6.2 — MAXIMUM, never an average. An average dilutes, so a fifth milder
    // instance would make a worsening problem look improved (§4.6.4).
    group.severity =
      leaf.severity === null ? group.severity
      : group.severity === null ? leaf.severity
      : Math.max(group.severity, leaf.severity);
    groups.set(key, group);
  }

  const out = [...groups.values()];
  for (const g of out) {
    g.topicCount = new Set(g.leaves.map(l => l.conceptId ?? l.patternId)).size;
    // §4.4.5 — ranking operates on leaves; the group is positioned by its worst.
    g.leaves.sort((a, b) =>
      (b.severity ?? -1) - (a.severity ?? -1) ||
      b.marksLost - a.marksLost ||
      (a.label < b.label ? -1 : a.label > b.label ? 1 : 0),
    );
  }

  // §4.6.3's deterministic, total ordering: worst leaf severity, then
  // unresolved descendant count, then descendant marks lost.
  out.sort((a, b) =>
    (b.severity ?? -1) - (a.severity ?? -1) ||
    unresolved(b) - unresolved(a) ||
    b.marksLost - a.marksLost ||
    (a.label < b.label ? -1 : a.label > b.label ? 1 : 0),
  );
  return out;
}

const unresolved = (g: PatternGroup): number =>
  g.leaves.filter(l => l.status !== "resolved").length;

/** A leaf's parent id, taken from the leaf's own row. Nothing is computed
 *  downward (§4.4.1: *"Parents derive their meaning from children. Children
 *  never derive from parents."*). */
function leafParentOf(leaf: RecurringPattern, byId: Map<UUID, PatternRecord>): UUID | null {
  return byId.get(leaf.patternId)?.parentPatternId ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATION — `calibration`'s one durable idea, from the record
// ═══════════════════════════════════════════════════════════════════════════

/**
 * §4.3 types `confidenceBefore` as *"what the student thought before
 * answering"* and §4.5's split is what makes it readable. The absorbed
 * `calibration` tool asked the same question of AI-invented questions and threw
 * the answer away; this asks it of marks the student actually lost.
 *
 * **It is never shown when nothing carries a confidence.** V.6.1's posture
 * applied to a ratio: no evidence is not zero calibration.
 */
export const CONFIDENCE_LABEL: Readonly<Record<0 | 1 | 2 | 3, string>> = Object.freeze({
  0: "Guessed",
  1: "Unsure",
  2: "Fairly sure",
  3: "Certain",
});

export interface CalibrationBand {
  confidence: 0 | 1 | 2 | 3;
  label: string;
  occurrenceCount: number;
  marksLost: number;
  occurrenceIds: UUID[];
}

export interface Calibration {
  bands: CalibrationBand[];
  /** Occurrences carrying a confidence. The denominator of every band. */
  rated: number;
  /** Occurrences carrying none. Stated, never excluded silently. */
  unrated: number;
}

export function calibration(records: readonly OccurrenceRecord[]): Calibration {
  const bands = new Map<0 | 1 | 2 | 3, CalibrationBand>();
  let rated = 0;
  let unrated = 0;

  for (const o of records) {
    if (o.confidenceBefore === null) {
      unrated++;
      continue;
    }
    rated++;
    const band =
      bands.get(o.confidenceBefore) ??
      {
        confidence: o.confidenceBefore,
        label: CONFIDENCE_LABEL[o.confidenceBefore],
        occurrenceCount: 0,
        marksLost: 0,
        occurrenceIds: [],
      };
    band.occurrenceCount++;
    band.marksLost += o.marksLost;
    band.occurrenceIds.push(o.id);
    bands.set(o.confidenceBefore, band);
  }

  return {
    bands: [...bands.values()].sort((a, b) => b.confidence - a.confidence),
    rated,
    unrated,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE WHOLE SURFACE, IN ONE VALUE
// ═══════════════════════════════════════════════════════════════════════════

export interface SubjectTally {
  subject: string;
  marksLost: number;
  marksAvailable: number;
  occurrenceCount: number;
  occurrenceIds: UUID[];
}

export interface Diagnosis {
  /** Rows that became records. */
  occurrencesRead: number;
  /** Rows that did not, with the reason. Counted, never silently dropped. */
  refused: Array<{ refusal: ReadRefusal; count: number }>;
  marksLost: MarksLostByErrorClass;
  recurrence: PatternGroup[];
  /**
   * Confirmed occurrences with `pattern_id IS NULL` — a legal, permanent state
   * (`lib/mistakes/store.ts`: *"the fact happened and no inference has been
   * drawn from it yet"*). Shown as itself, never folded into a pattern.
   */
  unpatterned: { occurrenceCount: number; marksLost: number; occurrenceIds: UUID[] };
  calibration: Calibration;
  bySubject: SubjectTally[];
  /** Distinct `evidence` rows the whole surface stands on. */
  evidenceCount: number;
}

/** The zero state. Not zeroes presented as a diagnosis — an EMPTY diagnosis,
 *  which the surface renders as an invitation to capture a paper. */
export const isEmpty = (d: Diagnosis): boolean => d.occurrencesRead === 0;

export function buildDiagnosis(
  occurrenceRows: readonly Row[],
  patternRows: readonly Row[],
): Diagnosis {
  const records: OccurrenceRecord[] = [];
  const refusals = new Map<ReadRefusal, number>();

  for (const row of occurrenceRows) {
    const read = readOccurrence(row);
    if (read.ok) records.push(read.record);
    else refusals.set(read.refusal, (refusals.get(read.refusal) ?? 0) + 1);
  }

  const patterns = patternRows
    .map(readPattern)
    .filter((p): p is PatternRecord => p !== null);

  const subjects = new Map<string, SubjectTally>();
  for (const o of records) {
    const key = o.subject || "Unassigned";
    const t =
      subjects.get(key) ??
      { subject: key, marksLost: 0, marksAvailable: 0, occurrenceCount: 0, occurrenceIds: [] };
    t.marksLost += o.marksLost;
    t.marksAvailable += o.marksAvailable;
    t.occurrenceCount++;
    t.occurrenceIds.push(o.id);
    subjects.set(key, t);
  }

  const loose = records.filter(o => o.patternId === null);

  return {
    occurrencesRead: records.length,
    refused: [...refusals.entries()].map(([refusal, count]) => ({ refusal, count })),
    marksLost: marksLostByErrorClass(records),
    recurrence: recurrenceWithEvidence(records, patterns),
    unpatterned: {
      occurrenceCount: loose.length,
      marksLost: loose.reduce((n, o) => n + o.marksLost, 0),
      occurrenceIds: loose.map(o => o.id),
    },
    calibration: calibration(records),
    bySubject: [...subjects.values()].sort(
      (a, b) => b.marksLost - a.marksLost || (a.subject < b.subject ? -1 : 1),
    ),
    evidenceCount: new Set(records.map(o => o.evidenceId)).size,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ACCESS LAYER — verbs, never a client (U.3)
// ═══════════════════════════════════════════════════════════════════════════

export interface DbError {
  code?: string | null;
  message: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

/**
 * The two reads `/diagnosis` needs. **There is no third verb, and there is no
 * write verb of any kind.**
 *
 * That is deliberate and is the M13-2 done-when *"`post-exam` reaches
 * integration Level 3 with deletion removed"* expressed as a type: the surface
 * that replaces the only tool which could ever destroy the record
 * (architecture P.4: *"`post-exam` … `:140` deletes it … effective level:
 * negative"*) cannot express a delete, an update or an insert. A later edit
 * that wanted one would have to widen this interface in a diff.
 */
export interface DiagnosisDb {
  listConfirmedOccurrences(studentId: UUID): Promise<DbResult<Row[]>>;
  listPatterns(studentId: UUID): Promise<DbResult<Row[]>>;
}

export type DiagnosisResult =
  | { ok: true; diagnosis: Diagnosis }
  | { ok: false; error: DbError };

/** Read the record and derive the surface. Two queries, no writes. */
export async function loadDiagnosis(
  db: DiagnosisDb,
  studentId: UUID,
): Promise<DiagnosisResult> {
  const [occurrences, patterns] = await Promise.all([
    db.listConfirmedOccurrences(studentId),
    db.listPatterns(studentId),
  ]);

  if (occurrences.error) return { ok: false, error: occurrences.error };
  if (patterns.error) return { ok: false, error: patterns.error };

  return {
    ok: true,
    diagnosis: buildDiagnosis(occurrences.data ?? [], patterns.data ?? []),
  };
}
