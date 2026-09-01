// ═══════════════════════════════════════════════════════════════════════════
// M8-4 / M8-5 / M8-6 — THE OCCURRENCE ACCESS LAYER.
//
// One module writes a draft occurrence and one module confirms it, and this is
// both. `lib/evidence.ts` is its sibling: same shape, same posture, same reason
// for existing — `007_mistakes.sql` has had this table since M1 and nothing has
// ever written to it.
//
//
// THE ONE RULE THIS FILE EXISTS TO MAKE UNBREAKABLE
//
//   A row written here is ALWAYS a draft.
//
// `buildDraftOccurrence()` never emits `confirmed_at`, and there is no code
// path in this module that inserts one. Confirmation is a separate function
// (`confirmOccurrence`) that performs an UPDATE, through the CALLER'S OWN
// client, so `020`'s RLS policy decides. The database refuses a second
// confirmation; this file does not merely decline to offer one.
//
// Three refusals stand behind that, and the module relies on all three rather
// than re-implementing any (`020` §"THE ONE-WAY DOOR"):
//
//   column grant   `authenticated` may UPDATE `confirmed_at` and nothing else
//   RLS policy     `USING confirmed_at IS NULL` / `WITH CHECK ... IS NOT NULL`
//   trigger        binds the service role, which RLS does not
//
//
// WHY THE BUILDER REFUSES RATHER THAN COERCES
//
// Every validation below returns a typed refusal instead of repairing the
// input. A proposal that cannot name a concept, cannot classify an error, or
// claims more marks lost than the question was worth is not a proposal that
// should be tidied up — it is a proposal that should not become a row.
// PRINCIPLES §3.2: the product does not store claims. A coerced draft is a
// claim wearing a fact's clothes.
//
// No I/O, no clock, no Supabase client. The four verbs are injected (U.3), the
// same split `lib/evidence.ts` and `lib/ingest/supabase-store.ts` use.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  CognitiveError,
  ExecutionError,
  OccurrenceSource,
  StudentAnswer,
  UUID,
} from "./mistakes/types";

export const OCCURRENCES_TABLE = "occurrences";

/** The view `020` creates. THE RECORD. Readers use this, never the table —
 *  a reader that forgets `WHERE confirmed_at IS NOT NULL` counts proposals as
 *  facts, which is the failure M8-4's gate exists to prevent. */
export const CONFIRMED_OCCURRENCES_VIEW = "confirmed_occurrences";

/** `007`'s `occurrences_source` CHECK, in one place. */
export const OCCURRENCE_SOURCES: readonly OccurrenceSource[] = Object.freeze([
  "board-exam", "school-exam", "mock", "coaching-test",
  "homework", "past-paper", "self-test",
]);

/** `007`'s `cognitive_error` CHECK. */
export const COGNITIVE_ERRORS: readonly CognitiveError[] = Object.freeze([
  "not-known", "misconception", "wrong-method",
  "incomplete-understanding", "misapplied-rule", "cannot-recall-formula",
]);

/** `007`'s `execution_error` CHECK. */
export const EXECUTION_ERRORS: readonly ExecutionError[] = Object.freeze([
  "misread-question", "arithmetic-slip", "sign-error", "unit-error",
  "ran-out-of-time", "incomplete-answer", "missed-working",
  "transcription", "presentation",
]);

/** `020`'s `occurrences_origin_known` CHECK. `assessment` is M10-7's, reserved
 *  here so the column's domain is stated once. */
export type OccurrenceOrigin = "extraction" | "manual" | "assessment";

export const OCCURRENCE_ORIGINS: readonly OccurrenceOrigin[] =
  Object.freeze(["extraction", "manual", "assessment"]);

// ── Injection ───────────────────────────────────────────────────────────────

export interface DbError {
  code?: string | null;
  message: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

export type Row = Record<string, unknown>;

/**
 * The four operations occurrences need.
 *
 * `confirm` is separate from a general `update` ON PURPOSE. A general update
 * verb in this interface is an invitation for a later edit to write any column,
 * which `020`'s column grant would refuse in production and which nothing would
 * catch in review. The interface can only express the one legal transition.
 */
export interface OccurrenceDb {
  insertOccurrences(rows: Row[]): Promise<DbResult<Row[]>>;
  /** UPDATE ... SET confirmed_at = $at WHERE id = $id AND student_id = $s AND
   *  confirmed_at IS NULL — returning the rows that changed. Zero rows means
   *  the database refused, and the caller must not retry differently. */
  confirm(occurrenceId: string, studentId: string, at: string): Promise<DbResult<Row[]>>;
  listDrafts(studentId: string): Promise<DbResult<Row[]>>;
  listConfirmed(studentId: string): Promise<DbResult<Row[]>>;
}

// ── The draft ───────────────────────────────────────────────────────────────

export interface DraftOccurrenceInput {
  /** From the verified session, never from a request body (D.1.a). */
  studentId: UUID;
  /** REQUIRED — `007`: `evidence_id NOT NULL`. No occurrence without proof. */
  evidenceId: UUID;
  /** REQUIRED — `007`: `concept_id NOT NULL`. An extraction that cannot resolve
   *  a concept must decline (`ingestion_review`), never guess one. */
  conceptId: UUID;

  subject: string;
  chapter: string;
  topic: string;

  source: OccurrenceSource;
  questionRef: string;

  marksLost: number;
  marksAvailable: number;

  cognitiveError?: CognitiveError | null;
  executionError?: ExecutionError | null;

  confidenceBefore?: 0 | 1 | 2 | 3 | null;
  studentAnswer?: StudentAnswer;
  expectedAnswer?: string | null;
  markerNote?: string | null;

  origin: OccurrenceOrigin;
  ingestionRunId?: string | null;
  /** 0–1 for `extraction`. Must be absent for `manual` — a student typing what
   *  they got wrong is not a judgement call with a confidence attached. */
  proposalConfidence?: number | null;
  /** M18-2 / F.8 row 3 / `007:275` — set when this draft SUPERSEDES an earlier
   *  occurrence (a misclassification correction). `null` for every ordinary
   *  draft; nothing before M18 ever set this column. */
  supersedes?: UUID | null;
}

export type DraftRefusal =
  | "no-evidence"
  | "no-concept"
  | "no-error-classification"
  | "unknown-error-type"
  | "unknown-source"
  | "unknown-origin"
  | "marks-not-sane"
  | "confidence-out-of-range"
  | "confidence-on-manual-entry";

export type BuildDraftResult =
  | { ok: true; row: Row }
  | { ok: false; refusal: DraftRefusal; detail: string };

const refuse = (refusal: DraftRefusal, detail: string): BuildDraftResult =>
  ({ ok: false, refusal, detail });

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/**
 * The row `007` + `020` expect, or a typed refusal.
 *
 * PURE. Every value is derived from the input, and `confirmed_at` is never
 * among them — the key is absent from the returned object entirely, so an
 * insert built here cannot carry a confirmation even by accident. `020`'s
 * trigger refuses a born-confirmed row as well; this is the first of the two.
 */
export function buildDraftOccurrence(input: DraftOccurrenceInput): BuildDraftResult {
  if (!input.evidenceId) {
    return refuse("no-evidence", "an occurrence without evidence is a claim (PRINCIPLES §3.2)");
  }
  if (!input.conceptId) {
    return refuse("no-concept", "the concept could not be resolved; the record does not guess (B.4)");
  }

  const cognitive = input.cognitiveError ?? null;
  const execution = input.executionError ?? null;

  if (!cognitive && !execution) {
    // `occurrences_has_error`. A mark lost with neither classification is not a
    // diagnosable event — DECISIONS §4.3.
    return refuse("no-error-classification", "a mark lost with no classified error is not diagnosable");
  }
  if (cognitive && !COGNITIVE_ERRORS.includes(cognitive)) {
    return refuse("unknown-error-type", `'${cognitive}' is not one of 007's cognitive errors`);
  }
  if (execution && !EXECUTION_ERRORS.includes(execution)) {
    return refuse("unknown-error-type", `'${execution}' is not one of 007's execution errors`);
  }
  if (!OCCURRENCE_SOURCES.includes(input.source)) {
    return refuse("unknown-source", `'${input.source}' is not one of 007's sources`);
  }
  if (!OCCURRENCE_ORIGINS.includes(input.origin)) {
    return refuse("unknown-origin", `'${input.origin}' is not one of 020's origins`);
  }

  if (!isInt(input.marksLost) || !isInt(input.marksAvailable)) {
    return refuse("marks-not-sane", "marks are whole numbers");
  }
  if (input.marksAvailable <= 0 || input.marksLost < 0 || input.marksLost > input.marksAvailable) {
    // `occurrences_marks_sane` and the two CHECKs beside it.
    return refuse(
      "marks-not-sane",
      `${input.marksLost} of ${input.marksAvailable} is not a mark a question could carry`,
    );
  }

  const confidence = input.proposalConfidence ?? null;
  if (confidence !== null) {
    if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      return refuse("confidence-out-of-range", "proposal confidence is 0–1");
    }
    if (input.origin === "manual") {
      return refuse(
        "confidence-on-manual-entry",
        "a typed entry has no model confidence; recording one would invent a judgement",
      );
    }
  }

  const answer: StudentAnswer = input.studentAnswer ?? { kind: "text", text: "" };

  return {
    ok: true,
    row: {
      student_id: input.studentId,
      evidence_id: input.evidenceId,
      source: input.source,
      subject: input.subject,
      chapter: input.chapter,
      topic: input.topic,
      concept_id: input.conceptId,
      question_ref: input.questionRef,
      marks_lost: input.marksLost,
      marks_available: input.marksAvailable,
      cognitive_error: cognitive,
      execution_error: execution,
      confidence_before: input.confidenceBefore ?? null,
      student_answer: answer,
      expected_answer: input.expectedAnswer ?? null,
      marker_note: input.markerNote ?? null,
      // `pattern_id` is left unset. Merge is M11's, and an occurrence may exist
      // before a pattern claims it (`007`: NULL passes under MATCH SIMPLE).
      origin: input.origin,
      ingestion_run_id: input.ingestionRunId ?? null,
      proposal_confidence: confidence,
      supersedes: input.supersedes ?? null,
      // NO `confirmed_at`. Not `null`, ABSENT — so a diff of this object against
      // a confirmed row shows the column was never in this module's vocabulary.
    },
  };
}

// ── Writing ─────────────────────────────────────────────────────────────────

export interface WriteDraftsResult {
  /** Rows the database accepted, as stored. */
  written: Row[];
  /** Inputs the BUILDER refused, with the reason. Never silently dropped:
   *  a refusal is a thing the student is shown, and is what routes them to the
   *  manual path (M8-6). */
  refused: Array<{ index: number; refusal: DraftRefusal; detail: string }>;
  /** Set when the database itself refused the batch. */
  error: DbError | null;
}

/**
 * Write draft occurrences.
 *
 * Every row goes through `buildDraftOccurrence`, so an unbuildable proposal
 * never reaches the table — and the batch is not abandoned because one member
 * of it was wrong. Two proposals from one paper are independent readings.
 */
export async function writeDraftOccurrences(
  db: OccurrenceDb,
  inputs: readonly DraftOccurrenceInput[],
): Promise<WriteDraftsResult> {
  const rows: Row[] = [];
  const refused: WriteDraftsResult["refused"] = [];

  inputs.forEach((input, index) => {
    const built = buildDraftOccurrence(input);
    if (built.ok) rows.push(built.row);
    else refused.push({ index, refusal: built.refusal, detail: built.detail });
  });

  if (rows.length === 0) return { written: [], refused, error: null };

  const { data, error } = await db.insertOccurrences(rows);
  if (error) return { written: [], refused, error };
  return { written: data ?? [], refused, error: null };
}

// ── Confirming (M8-5) ───────────────────────────────────────────────────────

export type ConfirmRefusal =
  /** The UPDATE matched no row. Under `020`'s policy that means one of: the row
   *  is already confirmed, it is not this student's, or it does not exist —
   *  and the three are DELIBERATELY not distinguished. Telling a caller which
   *  one it was is an ownership oracle over another student's occurrence ids. */
  | "refused"
  /** The database raised. `020`'s trigger does this on an un-confirm attempt. */
  | "rejected";

export type ConfirmResult =
  | { ok: true; occurrence: Row }
  | { ok: false; refusal: ConfirmRefusal; detail: string };

/**
 * Confirm one draft occurrence. THE GATE.
 *
 * MUST be called with a client carrying the STUDENT'S OWN credentials, not the
 * service role: the whole point of M8-5 is that `020`'s RLS policy is the
 * enforcement, and RLS does not apply to the service role. The endpoint
 * (`app/api/capture/confirm/route.ts`) uses `createStudentServerClient()` for
 * exactly this reason, and says so.
 *
 * The `confirmed_at IS NULL` predicate in the statement is NOT the enforcement
 * either — it is the same predicate the policy already applies, restated so the
 * refusal comes back as "zero rows" rather than as a policy error. Deleting it
 * would change nothing about what the database permits.
 */
export async function confirmOccurrence(
  db: OccurrenceDb,
  args: { occurrenceId: string; studentId: string; at: string },
): Promise<ConfirmResult> {
  const { data, error } = await db.confirm(args.occurrenceId, args.studentId, args.at);

  if (error) {
    return { ok: false, refusal: "rejected", detail: error.message };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      refusal: "refused",
      detail: "this is not an unconfirmed occurrence of yours",
    };
  }
  return { ok: true, occurrence: data[0] };
}

/** Confirm several drafts. Each is its own decision and its own statement —
 *  one refusal does not cancel the others, because a student confirming four
 *  of five proposals has confirmed four. */
export async function confirmOccurrences(
  db: OccurrenceDb,
  args: { occurrenceIds: readonly string[]; studentId: string; at: string },
): Promise<{
  confirmed: Row[];
  refused: Array<{ occurrenceId: string; refusal: ConfirmRefusal; detail: string }>;
}> {
  const confirmed: Row[] = [];
  const refused: Array<{ occurrenceId: string; refusal: ConfirmRefusal; detail: string }> = [];

  for (const occurrenceId of args.occurrenceIds) {
    const result = await confirmOccurrence(db, {
      occurrenceId,
      studentId: args.studentId,
      at: args.at,
    });
    if (result.ok) confirmed.push(result.occurrence);
    else refused.push({ occurrenceId, refusal: result.refusal, detail: result.detail });
  }

  return { confirmed, refused };
}

// ── Reading ─────────────────────────────────────────────────────────────────

/** True for a row that is part of the record. The single predicate; nothing in
 *  this codebase should re-express it as `row.confirmed_at != null` inline. */
export const isConfirmed = (row: Row): boolean =>
  row.confirmed_at !== null && row.confirmed_at !== undefined;

export const isDraft = (row: Row): boolean => !isConfirmed(row);

/** What is waiting for the student to look at. */
export async function listDraftOccurrences(
  db: OccurrenceDb,
  studentId: string,
): Promise<{ drafts: Row[]; error: DbError | null }> {
  const { data, error } = await db.listDrafts(studentId);
  if (error) return { drafts: [], error };
  // Belt and braces: the query filters, and so does this. A store
  // implementation that quietly widened its predicate would otherwise leak
  // confirmed rows into a surface that offers a confirm button.
  return { drafts: (data ?? []).filter(isDraft), error: null };
}

/** THE RECORD. Reads `020`'s view, so the filter is the database's. */
export async function listConfirmedOccurrences(
  db: OccurrenceDb,
  studentId: string,
): Promise<{ occurrences: Row[]; error: DbError | null }> {
  const { data, error } = await db.listConfirmed(studentId);
  if (error) return { occurrences: [], error };
  return { occurrences: (data ?? []).filter(isConfirmed), error: null };
}
