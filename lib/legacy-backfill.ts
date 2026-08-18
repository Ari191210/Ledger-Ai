// ═══════════════════════════════════════════════════════════════════════════
// M7-5 — THE BACKFILL FROM THE FROZEN LEGACY BLOB.
//
// EXECUTION_PLAN M7-5: *"Backfill from `user_data.blob`; freeze it read-only as
// `legacy_blob`. Done when: T2 accepted — the seam is MARKED, using
// `RECOVERY_EPOCH_MS` as precedent; pre-epoch data is never presented as
// verified."*
//
// `supabase/migrations/017_legacy_blob_freeze.sql` is the freeze. This is the
// backfill, and it reads only what that file froze — never the live `blob`.
// Reading a column live code still writes would make a second run produce
// different events, and idempotency would be a claim rather than a property.
//
//
// ═══════════════════════════════════════════════════════════════════════════
// T2, ACCEPTED RATHER THAN ARGUED WITH
// ═══════════════════════════════════════════════════════════════════════════
//
// T2: *"Backfill from the blob is lossy and cannot be made otherwise. Legacy
// mistakes have no evidence and no concept ID … Legacy `papersLog` rows have no
// per-question data, so no attempt-level evidence can be reconstructed.
// Consequence: the record has a visible seam. Mitigation: mark the epoch
// explicitly — `RECOVERY_EPOCH_MS` (`lib/ledger-score-v2.ts:75`) is the
// existing precedent — and never present pre-epoch data as verified."*
//
// So this module does three things and refuses a fourth.
//
//   IT TRANSLATES what can be translated honestly.
//   IT MARKS every row it produces as pre-epoch, structurally.
//   IT RECORDS, in its own return value, every record it refused and why.
//   IT NEVER INVENTS a concept id, an evidence id, an occurrence, a grade, a
//   date, or a per-question outcome that the legacy row did not contain.
//
//
// ═══════════════════════════════════════════════════════════════════════════
// EVERY BACKFILLED ROW IS AN `EXTERNAL_STUDY_DECLARED`, AND THAT IS THE WHOLE
// ARGUMENT
// ═══════════════════════════════════════════════════════════════════════════
//
// The temptation is to map `ledger-mistakes` → `MISTAKE_DETECTED` and
// `ledger-papers-log` → `PRACTICE_COMPLETED`, because the names line up. Both
// are wrong, for the same reason and it is not a naming reason:
//
//   · `MISTAKE_DETECTED` requires `payload.occurrence_id` (D.2), and
//     `occurrences.evidence_id` / `concept_id` are `NOT NULL` (007). A legacy
//     mistake has neither. `lib/mistakes/migrate-legacy.ts` already reached
//     this conclusion and refuses to fabricate; this module reaches it again
//     rather than quietly reversing it.
//   · `MISTAKE_DETECTED`, `PRACTICE_COMPLETED` and `ASSESSMENT_COMPLETED` are
//     all in `EVIDENCE_BEARING_TYPES`. Importing pre-epoch claims as
//     evidence-bearing would let data with no evidence behind it move a score —
//     which is `PRODUCT_PRINCIPLES` §3.2 (*"an unevidenced mistake is a claim,
//     and the product does not store claims"*) failing at exactly the moment it
//     matters most.
//
// What every one of these records actually IS, without exception, is **something
// the student typed into localStorage about their own academic activity, with no
// evidence attached, before an evidence pipeline existed**. D.2 has one type for
// that and only one:
//
//   `EXTERNAL_STUDY_DECLARED` — payload core `declared_text, subject,
//   concepts_proposed[], when, duration_claim?`; marked **C** (requires
//   confirmation); and D.2.b, load-bearing: *"deliberately not E … It moves no
//   score dimension by itself. The bridge from declaration to evidence is
//   passing the assessment about it."*
//
// `PRODUCT_PRINCIPLES` §3.5 states the same rule in the other direction:
// *"What the student tells us is a claim, and a claim is recorded as a claim.
// The route from 'I studied this' to 'this is proven' runs through assessment
// and nowhere else. We trust the student about what they studied, and never
// about whether they learned it."*
//
// A pre-epoch record is therefore not a diminished mistake, or a partial
// assessment. It is a **declaration** — and it re-enters the record as one, at
// full fidelity, with the student's own words preserved verbatim in
// `declared_text`. Nothing is lost. What it cannot do is close a gap, and it
// was never entitled to.
//
//
// ═══════════════════════════════════════════════════════════════════════════
// FOUR INDEPENDENT MARKS, SO THE SEAM SURVIVES A CARELESS READER
// ═══════════════════════════════════════════════════════════════════════════
//
//   1. `source = 'migration'`   — already in D.1's enum, and 015's RLS
//      `WITH CHECK` narrows `authenticated` to `tool | student_declaration`,
//      so a backfilled row is one a student's own client could not have
//      written. Structurally distinguishable with a `WHERE` clause.
//   2. `confirmation = 'unconfirmed'` — D.1.d: *"No downstream subsystem may
//      treat an 'unconfirmed' event as evidence."* This is the mark that does
//      the actual work: it is a one-line invariant every projection asserts, so
//      "never presented as verified" is enforced by the projections rather than
//      remembered by their authors.
//   3. `confidence = null`      — D.1.c is the SYSTEM's confidence in the
//      claim. The system has none. A number here would be a fabricated one.
//   4. `metadata.legacy`        — the epoch, the source key, the rule version,
//      and whether the date was known. For a human reading one row.
//
// `surface = 'import'` completes it, and is likewise already in D.1's enum.
//
// Precedent for the epoch constant itself is `RECOVERY_EPOCH_MS`
// (`lib/ledger-score-v2.ts:75`): *"records predating a system are archived
// rather than treated as an unclearable backlog."* That constant is NOT read,
// changed or generalised here — M7-5 must not move a score. `LEGACY_EPOCH_MS`
// below is its sibling for a different system boundary, in the same form.
//
//
// ═══════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY IS STRUCTURAL, NOT PROCEDURAL
// ═══════════════════════════════════════════════════════════════════════════
//
// `client_event_id` is a pure function of (student, source key, item identity)
// over the FROZEN archive. Same archive in, same ids out; and
// `UNIQUE (student_id, client_event_id)` (015 §2) plus `ON CONFLICT DO NOTHING`
// (D.3.6) absorbs the second run. There is no "have I run yet" flag anywhere in
// the decision path — a flag is a thing that can be wrong, and a derivation is
// not.
//
// **This is the deliberate opposite of `lib/event-outbox.ts`.** The outbox mixes
// a per-record NONCE into its id so that two byte-identical drafts get different
// ids: a student may legitimately view the same concept twice, and content-only
// hashing would swallow the second. A backfill is the inverse case — the same
// archive row MUST collapse to the same event however many times it is read —
// so there is no nonce here, on purpose. The contrast is stated because
// copying the outbox's derivation into this file would silently break the
// property this file exists to have.
//
// Imports: `./sha256`, `./ingest/hash`, `./event-contract` (types only).
// No Supabase, no `next/*`, no clock — the clock is injected.
// ═══════════════════════════════════════════════════════════════════════════

import { sha256Hex } from "./sha256";
import { stableStringify } from "./ingest/hash";
import {
  EVENT_SCHEMA_VERSION,
  type AcademicEventInsert,
} from "./event-contract";

/**
 * THE SEAM (T2), as a repository constant.
 *
 * Everything in a student's `legacy_blob` predates the event layer. Nothing at
 * or before this instant is verified academic evidence, and no surface may
 * present it as such. `user_data.legacy_blob_frozen_at` is the per-student
 * observation of the same boundary; this is the build's statement of it.
 *
 * Same form and same purpose as `RECOVERY_EPOCH_MS`
 * (`lib/ledger-score-v2.ts:75`). Deliberately a separate constant: that one
 * governs which mistakes are clearable, this one governs which events are
 * verifiable, and collapsing two epochs into one would make a change to either
 * silently move the other.
 */
export const LEGACY_EPOCH_MS = Date.parse("2026-08-15T00:00:00Z");

/** Prefix and version of the id derivation below. Bumping it re-imports
 *  everything under new ids, so it changes only when the derivation changes. */
export const BACKFILL_ID_VERSION = "bf1";

/** `metadata.ingest_rule_version` (D.1.e). Which mapping produced the row. */
export const BACKFILL_RULE_VERSION = 1;

/**
 * The legacy keys this module reads. Everything else in `SYNC_KEYS` is refused
 * with a reason — see `REFUSED_KEYS` below, which is the honest half of the
 * table and is exported so a test can assert the two partition `SYNC_KEYS`.
 */
export const BACKFILLED_KEYS = [
  "ledger-mistakes",
  "ledger-papers-log",
  "ledger-weak-topics",
] as const;

export type BackfilledKey = (typeof BACKFILLED_KEYS)[number];

/**
 * Every other synced key, with the reason it produces no event. Written as data
 * rather than as prose so a test can assert that BACKFILLED_KEYS ∪ REFUSED_KEYS
 * covers `SYNC_KEYS` exactly — a key added to the sync layer later cannot slip
 * through unconsidered.
 */
export const REFUSED_KEYS: Readonly<Record<string, string>> = {
  "ledger-checks":
    "coverage proof checks are the v2 engine's proof gate; importing them would launder a pre-epoch proof into a record whose whole claim is that proof is earned (§3.1)",
  "ledger-focus-streak":
    "streaks are never shipped (PRINCIPLES §4.2) and M14-2 deletes the term from scoring; importing one would resurrect a banned concept",
  "ledger-focus-last": "the streak's companion stamp — refused with it",
  "ledger-focus-shield": "a streak-protection token; refused with the streak",
  "ledger-last-event":
    "the active-day stamp is a client claim about a server-observable fact; R.10/M14-8 says such a claim is admissible only when the server agrees, and pre-epoch there is nothing to agree with",
  "ledger-notes-history":
    "note-taking is not academic evidence and D.2 has no type for it; the score's coverage term reads it, which is M14's problem and not M7's to import",
  "ledger-syllabus":
    "a syllabus is reference data, not an academic act; M6's concept model and M8-3's ingestion own it",
  "ledger-syllabus-subjects": "reference data — refused with the syllabus",
  "ledger-plan-v1": "a plan is an intention, and D.2 has no event for an intention",
  "ledger-deadlines": "calendar data, not academic activity",
  "ledger-habits-list": "habit tracking is not academic evidence",
  "ledger-habits-log": "habit tracking is not academic evidence",
  "ledger-formula-history": "tool output, not an academic act",
  "ledger-career-answers": "career questionnaire answers are not academic activity",
  "ledger-career-output": "career questionnaire output is not academic activity",
  "ledger-profile":
    "profile fields; M5 already owns them as flat columns plus a version chain in `students`, and re-importing them as events would be a second source of truth for identity",
  "ledger-onboarding-done":
    "a UI completion flag, not an academic act; M5-2 made the server column authoritative for it and D.2 has no event type for finishing a form",
  "ledger-workspace":
    "a workspace choice (material/voice/pressure/temperament) is a display preference, not academic evidence; D.2 has no event type for choosing a font pack, and B.14 is explicit that a preference may change how a fact is presented and must never change the fact",
};

// ═══════════════════════════════════════════════════════════════════════════
// THE PLAN
// ═══════════════════════════════════════════════════════════════════════════

export type RefusalCode =
  | "KEY_NOT_BACKFILLABLE"
  | "UNPARSEABLE"
  | "WRONG_SHAPE"
  | "NO_DESCRIBABLE_CONTENT";

export interface RefusedRecord {
  key: string;
  code: RefusalCode;
  detail: string;
  /** The original value, verbatim, so nothing is lost by being refused. */
  raw?: unknown;
}

export interface BackfillPlan {
  studentId: string;
  /** Ready to insert. `event_id`, `seq`, `received_at` and `clock_skew_ms` are
   *  assigned by 015's trigger and are absent by construction. */
  rows: AcademicEventInsert[];
  refused: RefusedRecord[];
  /** Per source key, how many rows it produced. For the run's audit entry. */
  counts: Record<string, number>;
}

export interface PlanOptions {
  /** The instant the archive was frozen for THIS student
   *  (`user_data.legacy_blob_frozen_at`). Defaults to `LEGACY_EPOCH_MS`. */
  frozenAtMs?: number;
}

/**
 * The whole mapping, as one pure function.
 *
 * @param studentId  from the archive row, never from a request body (D.1.a).
 * @param blob       the FROZEN `legacy_blob`: key → raw localStorage string.
 */
export function planLegacyBackfill(
  studentId: string,
  blob: Record<string, unknown> | null | undefined,
  opts: PlanOptions = {},
): BackfillPlan {
  const frozenAtMs = opts.frozenAtMs ?? LEGACY_EPOCH_MS;
  const frozenAtIso = new Date(frozenAtMs).toISOString();

  const rows: AcademicEventInsert[] = [];
  const refused: RefusedRecord[] = [];
  const counts: Record<string, number> = {};

  if (!blob || typeof blob !== "object") {
    return { studentId, rows, refused, counts };
  }

  const emit = (key: BackfilledKey, item: BackfillItem) => {
    rows.push(buildRow(studentId, key, item, frozenAtMs, frozenAtIso));
    counts[key] = (counts[key] ?? 0) + 1;
  };

  for (const key of BACKFILLED_KEYS) {
    const raw = (blob as Record<string, unknown>)[key];
    if (raw === undefined || raw === null || raw === "") continue;

    const parsed = parseLegacy(raw);
    if (parsed === PARSE_FAILED) {
      refused.push({
        key,
        code: "UNPARSEABLE",
        detail: `${key} is not parseable JSON; it is preserved verbatim in legacy_blob and nothing is derived from it`,
        raw,
      });
      continue;
    }

    if (key === "ledger-mistakes") mapMistakes(parsed, refused, emit);
    else if (key === "ledger-papers-log") mapPapers(parsed, refused, emit);
    else mapWeakTopics(parsed, refused, emit);
  }

  return { studentId, rows, refused, counts };
}

// ── the three mappings ─────────────────────────────────────────────────────

/** What every mapping produces: the student's own words, plus whatever address
 *  and time the legacy row happened to carry. Nothing here is inferred. */
interface BackfillItem {
  /** Stable identity of this item WITHIN its key, for the id derivation. */
  itemKey: string;
  declaredText: string;
  subject: string | null;
  chapter: string | null;
  /** ISO-8601, or null when the legacy row carried no usable date. NEVER
   *  invented — a null becomes `occurred_at = the freeze epoch` plus an explicit
   *  `occurred_at_unknown` flag, which is a different claim from a guess. */
  occurredAt: string | null;
  /** Everything the legacy row carried that this mapping did not use. Kept so
   *  the event is not a lossier copy of a row that still exists. */
  original: Record<string, unknown>;
}

/**
 * `ledger-mistakes` → one declaration per entry.
 *
 * LOSSY, IN NAMED PLACES:
 *   · `status` / `clearedDate` are carried in `payload.legacy.original` and are
 *     NOT mapped onto the mistake lifecycle. A pre-epoch `resolved` is a
 *     self-report, and §3.1 — *"a student may never mark their own mistake
 *     fixed"* — makes importing it as a resolution the single worst thing this
 *     module could do.
 *   · `category` is not mapped to an error class. G's taxonomy is M11's, and
 *     guessing a class from a free-text label is exactly the *"ambiguous
 *     classification is refused, not guessed"* case (V.4.9).
 *   · `concept_id` stays NULL. `declared_text` carries the topic verbatim and
 *     M6's resolver may address it later; that is V.2.4's legal unresolved
 *     state, not a defect.
 */
function mapMistakes(
  parsed: unknown,
  refused: RefusedRecord[],
  emit: (key: BackfilledKey, item: BackfillItem) => void,
): void {
  if (!Array.isArray(parsed)) {
    refused.push({
      key: "ledger-mistakes",
      code: "WRONG_SHAPE",
      detail: "ledger-mistakes is not an array",
      raw: parsed,
    });
    return;
  }

  parsed.forEach((entry, index) => {
    if (!isRecord(entry)) {
      refused.push({
        key: "ledger-mistakes",
        code: "WRONG_SHAPE",
        detail: `entry ${index} is not an object`,
        raw: entry,
      });
      return;
    }

    const topic = str(entry.topic);
    const subject = str(entry.subject);
    const declaredText = topic ?? subject;

    if (!declaredText) {
      refused.push({
        key: "ledger-mistakes",
        code: "NO_DESCRIBABLE_CONTENT",
        detail: `entry ${index} names neither a topic nor a subject, so there is nothing the student said to preserve`,
        raw: entry,
      });
      return;
    }

    emit("ledger-mistakes", {
      // `id` where the legacy row has one — that is the identity the student's
      // own device used. Falling back to the content plus the index keeps two
      // genuinely different entries apart without inventing an id.
      itemKey: str(entry.id) ?? `${index}:${declaredText}`,
      declaredText,
      subject,
      chapter: null,
      occurredAt: isoOrNull(entry.date),
      original: entry,
    });
  });
}

/**
 * `ledger-papers-log` → one declaration per paper.
 *
 * LOSSY, AND T2 SAYS SO IN ADVANCE: *"Legacy `papersLog` rows have no
 * per-question data, so no attempt-level evidence can be reconstructed."*
 * `score` and `total` are carried in `payload.legacy.original` as figures the
 * student reported, and are deliberately NOT written to `result` — `result` is
 * the outcome field for types that HAVE one (D.1), and reading a self-reported
 * mark as an outcome is how a claim becomes evidence without passing through
 * assessment.
 */
function mapPapers(
  parsed: unknown,
  refused: RefusedRecord[],
  emit: (key: BackfilledKey, item: BackfillItem) => void,
): void {
  if (!Array.isArray(parsed)) {
    refused.push({
      key: "ledger-papers-log",
      code: "WRONG_SHAPE",
      detail: "ledger-papers-log is not an array",
      raw: parsed,
    });
    return;
  }

  parsed.forEach((entry, index) => {
    if (!isRecord(entry)) {
      refused.push({
        key: "ledger-papers-log",
        code: "WRONG_SHAPE",
        detail: `entry ${index} is not an object`,
        raw: entry,
      });
      return;
    }

    const subject = str(entry.subject);
    if (!subject) {
      refused.push({
        key: "ledger-papers-log",
        code: "NO_DESCRIBABLE_CONTENT",
        detail: `entry ${index} names no subject, so the declaration would say nothing`,
        raw: entry,
      });
      return;
    }

    const date = isoOrNull(entry.date);
    emit("ledger-papers-log", {
      itemKey: str(entry.id) ?? `${index}:${subject}:${date ?? "undated"}`,
      declaredText: `Practised a ${subject} paper`,
      subject,
      chapter: null,
      occurredAt: date,
      original: entry,
    });
  });
}

/**
 * `ledger-weak-topics` → one declaration per topic.
 *
 * The value is a self-reported miss count. It is carried verbatim and is not
 * read as a figure by anything — `PRODUCT_DECISIONS` J.4 / M14-7 is explicit
 * that the product must *"stop calling a self-report a score"*, and §3.4
 * removed weak topics from the parent surface entirely (M0-1, M0-2). It enters
 * as what it is: the student saying which topics they found hard.
 */
function mapWeakTopics(
  parsed: unknown,
  refused: RefusedRecord[],
  emit: (key: BackfilledKey, item: BackfillItem) => void,
): void {
  if (!isRecord(parsed)) {
    refused.push({
      key: "ledger-weak-topics",
      code: "WRONG_SHAPE",
      detail: "ledger-weak-topics is not an object",
      raw: parsed,
    });
    return;
  }

  for (const [topic, value] of Object.entries(parsed)) {
    const trimmed = topic.trim();
    if (!trimmed) continue;
    emit("ledger-weak-topics", {
      itemKey: trimmed,
      declaredText: trimmed,
      subject: null,
      chapter: null,
      // A weak-topic tally carries no date at all. It is never given one.
      occurredAt: null,
      original: { topic: trimmed, reported_count: value },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ROW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deterministic, nonce-free — see the header for why this is the opposite of
 * `deriveClientEventId()` in `lib/event-outbox.ts`.
 *
 * The student id is inside the preimage as well as being the partition key, so
 * two students with identical legacy rows still get distinct ids and a copied
 * archive can never be attributed to the wrong stream.
 */
export function deriveBackfillEventId(
  studentId: string,
  sourceKey: string,
  itemKey: string,
): string {
  const preimage = stableStringify({
    v: BACKFILL_ID_VERSION,
    rule: BACKFILL_RULE_VERSION,
    student_id: studentId,
    source_key: sourceKey,
    item_key: itemKey,
  });
  return `${BACKFILL_ID_VERSION}_${sha256Hex(preimage).slice(0, 40)}`;
}

function buildRow(
  studentId: string,
  key: BackfilledKey,
  item: BackfillItem,
  frozenAtMs: number,
  frozenAtIso: string,
): AcademicEventInsert {
  const occurredAtUnknown = item.occurredAt === null;

  // A legacy date later than the freeze is a clock fault in a device that is no
  // longer authoritative about anything. It is clamped to the seam and the
  // original is kept in `legacy.original`, rather than being let through to
  // poison every "when did this happen" query (D.1.b, and 015 §3's own bound).
  const occurredAt =
    occurredAtUnknown || Date.parse(item.occurredAt as string) > frozenAtMs
      ? frozenAtIso
      : (item.occurredAt as string);

  return {
    client_event_id: deriveBackfillEventId(studentId, key, item.itemKey),
    schema_version: EVENT_SCHEMA_VERSION,
    occurred_at: occurredAt,

    // D.2's one honest type for an unevidenced student claim. See the header.
    event_type: "EXTERNAL_STUDY_DECLARED",
    surface: "import",
    source: "migration",

    // MARK 2 of 4, and the one that does the work. D.1.d: no downstream
    // subsystem may treat an 'unconfirmed' event as evidence.
    confirmation: "unconfirmed",
    // MARK 3 of 4. The system has no confidence in a pre-epoch claim (D.1.c).
    confidence: null,

    student_id: studentId,
    // E.4's resolver is M9. A pre-epoch declaration belongs to no session and
    // never will — inventing one would be a session nobody sat.
    session_id: null,

    tool_slug: null,
    device_id: null,
    subject: item.subject,
    chapter: item.chapter,
    // NEVER resolved here. M6's resolver may address `declared_text` later;
    // guessing a concept is V.2.4's refusal, not a defect (V.4.9).
    concept_id: null,
    declared_text: item.declaredText,
    assessment_id: null,
    question_id: null,

    payload: {
      // D.2's required core for this type.
      declared_text: item.declaredText,
      subject: item.subject,
      // The student proposed nothing — this is a machine reading of their old
      // notes, not a conversation. An empty list is the honest value.
      concepts_proposed: [],
      when: occurredAtUnknown ? null : occurredAt,
      legacy: {
        source_key: key,
        occurred_at_unknown: occurredAtUnknown,
        // Verbatim. The event must not be a lossier copy of a row that still
        // exists in `legacy_blob` — a reader of one should never have to open
        // the other to know what was there.
        original: item.original,
      },
    },
    // `result` stays null on purpose: a self-reported mark is not an outcome.
    result: null,
    evidence_id: null,

    // MARK 4 of 4 — for a human reading a single row.
    metadata: {
      backfill: true,
      legacy_epoch_ms: LEGACY_EPOCH_MS,
      frozen_at: frozenAtIso,
      source_key: key,
      ingest_rule_version: BACKFILL_RULE_VERSION,
      id_version: BACKFILL_ID_VERSION,
    },
    supersedes_event_id: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RUN — adapters injected, so the decision above stays testable
//
// The same shape `lib/event-outbox.ts` uses for its store. The caller supplies
// the three things this module refuses to contain: how archives are read, how
// rows reach `academic_events`, and how the run is audited.
// ═══════════════════════════════════════════════════════════════════════════

export interface LegacyArchive {
  student_id: string;
  legacy_blob: Record<string, unknown> | null;
  legacy_blob_frozen_at: string | null;
}

export interface BackfillAdapters {
  /** Archives that have not been backfilled yet. Paged by the caller. */
  listArchives(limit: number): Promise<LegacyArchive[]>;
  /**
   * `INSERT … ON CONFLICT (student_id, client_event_id) DO NOTHING`. The count
   * is of rows the table actually accepted, so a second run reports zero and
   * that zero is the idempotency, observed.
   */
  appendEvents(rows: AcademicEventInsert[]): Promise<{ inserted: number; error?: string }>;
  /** Stamp `legacy_backfill_at` / `legacy_backfill_events` (017 §4). */
  markBackfilled(studentId: string, eventCount: number): Promise<void>;
  /** One `AuditEntry` per student, per O.6. Never throws — see `lib/events.ts`. */
  recordAudit(entry: {
    studentId: string;
    inserted: number;
    planned: number;
    refused: RefusedRecord[];
    counts: Record<string, number>;
  }): Promise<void>;
}

export interface BackfillReport {
  students: number;
  planned: number;
  inserted: number;
  refused: number;
  errors: Array<{ studentId: string; detail: string }>;
}

/**
 * Backfill a page of archives.
 *
 * SAFE TO RE-RUN, and not because of a flag: every id is derived, so the second
 * run's `inserted` is zero. A student whose append errors is left unmarked and
 * is picked up by the next run, which is why the mark is written AFTER the
 * append and never before.
 */
export async function runLegacyBackfill(
  adapters: BackfillAdapters,
  opts: { limit?: number } = {},
): Promise<BackfillReport> {
  const archives = await adapters.listArchives(opts.limit ?? 100);

  const report: BackfillReport = {
    students: 0,
    planned: 0,
    inserted: 0,
    refused: 0,
    errors: [],
  };

  for (const archive of archives) {
    const frozenAtMs = archive.legacy_blob_frozen_at
      ? Date.parse(archive.legacy_blob_frozen_at)
      : LEGACY_EPOCH_MS;

    const plan = planLegacyBackfill(archive.student_id, archive.legacy_blob, {
      frozenAtMs: Number.isNaN(frozenAtMs) ? LEGACY_EPOCH_MS : frozenAtMs,
    });

    report.students += 1;
    report.planned += plan.rows.length;
    report.refused += plan.refused.length;

    let inserted = 0;
    if (plan.rows.length > 0) {
      const result = await adapters.appendEvents(plan.rows);
      if (result.error) {
        report.errors.push({ studentId: archive.student_id, detail: result.error });
        // Deliberately NOT marked. An unmarked archive is retried; a marked one
        // with a failed append would be a student whose record silently never
        // arrived.
        continue;
      }
      inserted = result.inserted;
      report.inserted += inserted;
    }

    // O.6 — the run is recorded even when it inserted nothing, because "this
    // student's archive produced no events, and here is what was refused" is
    // exactly the thing a dispute a year from now needs to see.
    await adapters.recordAudit({
      studentId: archive.student_id,
      inserted,
      planned: plan.rows.length,
      refused: plan.refused,
      counts: plan.counts,
    });

    await adapters.markBackfilled(archive.student_id, inserted);
  }

  return report;
}

// ── helpers ────────────────────────────────────────────────────────────────

const PARSE_FAILED = Symbol("parse-failed");

function parseLegacy(raw: unknown): unknown {
  // `legacy_blob` holds raw localStorage STRINGS (`lib/sync.ts` reads
  // `getItem`), but a JSONB round-trip through an older writer could have left
  // a value already decoded. Both are accepted; neither is coerced.
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return PARSE_FAILED;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, 2000) : null;
}

/** A date, or null. Never a guess, never today's date, never zero. */
function isoOrNull(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const ms = typeof v === "number" ? v : Date.parse(v);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}
