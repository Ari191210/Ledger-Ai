// ═══════════════════════════════════════════════════════════════════════════
// M8-2 — THE EVIDENCE ACCESS LAYER.
//
// EXECUTION_PLAN M8-2: *"Wire the `evidence` table; photo → storage + evidence
// record with `content_hash` dedup. Done when: re-uploading the same paper
// creates one evidence row."*
//
// `007_mistakes.sql` has had this table since M1 and nothing has ever written a
// row to it. This module is the writer, and it is the only one.
//
//
// THE DEDUP IS THE DATABASE'S, NOT THIS FILE'S
//
// `007` already declares it:
//
//     CONSTRAINT evidence_student_hash_unique UNIQUE (student_id, content_hash)
//
// So `captureEvidence()` does NOT "check whether it exists and then insert".
// That shape is a race: two tabs uploading the same photograph a millisecond
// apart both see nothing, both insert, and the student's paper becomes two
// pieces of evidence with two futures. Instead it INSERTS FIRST and treats
// `23505` — Postgres's unique_violation — as the answer "you already have
// this", then reads back the row that won. The constraint decides; this file
// only interprets the verdict. That is the same reasoning `lib/events.ts`
// states for `ON CONFLICT DO NOTHING`: *"the only place it can be learned
// without a race."*
//
// A test proves the interpretation against a double that enforces the
// constraint the way Postgres does, and `tests/mistakes-rls.test.mjs`'s
// live-database companion proves the constraint itself is really there.
//
//
// EVIDENCE IS IMMUTABLE (§4.9)
//
// `007` gives `evidence` a SELECT policy and an INSERT policy and NO update or
// delete policy, on purpose. This module mirrors that exactly: it exports a
// write and a read, and there is no `updateEvidence`, no `deleteEvidence` and
// no code path that could produce one. A correction to the record appends; it
// never edits what was photographed.
//
// The Supabase client is INJECTED (U.3). `app/api/capture/route.ts` supplies
// the service-role implementation; the tests supply a double.
// ═══════════════════════════════════════════════════════════════════════════

import { sha256Bytes, toHex } from "./sha256";
import {
  MAX_EVIDENCE_BYTES,
  evidenceTypeFor,
  storeEvidenceObject,
  storageRefFor,
  type CaptureKind,
  type EvidenceStorage,
  type EvidenceType,
} from "./storage";

export const EVIDENCE_TABLE = "evidence";

/** Postgres `unique_violation`. The whole dedup rests on this one code. */
export const UNIQUE_VIOLATION = "23505";

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
 * The two operations evidence needs. Narrow on purpose: a wider interface
 * would let a later edit reach for an UPDATE that `007` refuses to grant.
 */
export interface EvidenceDb {
  insertEvidence(row: Row): Promise<DbResult<Row>>;
  findEvidenceByHash(studentId: string, contentHash: string): Promise<DbResult<Row>>;
}

/** A row as `007` stores it. Snake_case because that is what the table uses and
 *  a second naming convention in the middle is where drift starts. */
export interface EvidenceRow {
  id: string;
  student_id: string;
  type: EvidenceType;
  storage_ref: string;
  content_hash: string;
  captured_at: string;
  source_description: string;
  verified_by: "ai" | "student" | "both";
  created_at?: string;
}

export interface CaptureEvidenceInput {
  /** From the verified session, never from a request body (D.1.a). */
  studentId: string;
  bytes: Uint8Array;
  contentType: string;
  /** What the student was capturing. Recorded on the ingestion run, not here —
   *  `007` is frozen and gains no column for it. */
  kind: CaptureKind;
  /** ISO. Injected, never `new Date()` inside this module. */
  capturedAt: string;
  /** The student's own words about what this is. Never invented. */
  sourceDescription?: string;
}

export type CaptureEvidenceResult =
  | {
      ok: true;
      evidence: EvidenceRow;
      /** True when the constraint refused a second row — the paper was already
       *  captured. THE DONE-WHEN OF M8-2. */
      deduped: boolean;
      contentHash: string;
    }
  | { ok: false; code: CaptureRefusal; detail: string };

export type CaptureRefusal =
  | "empty"
  | "too_large"
  | "unsupported_type"
  | "storage_failed"
  | "write_failed";

/** SHA-256 of the bytes, 64 lowercase hex characters.
 *
 *  `lib/sha256.ts` rather than `lib/ingest/hash.ts`, and the choice is the same
 *  one M7 argued: the ingest hash is FNV-1a and its own header says it "is not
 *  cryptographic, and deliberately so". `content_hash` decides whether two
 *  uploads are THE SAME PAPER, and a collision there merges two students'
 *  academic evidence — that is a protection claim, so it gets a protecting
 *  hash. */
export function contentHashOf(bytes: Uint8Array): string {
  return toHex(sha256Bytes(bytes));
}

/** The row `007` expects. Pure — every value is derived from the input. */
export function buildEvidenceInsert(
  input: CaptureEvidenceInput,
  contentHash: string,
  type: EvidenceType,
): Row {
  return {
    student_id: input.studentId,
    type,
    storage_ref: storageRefFor(input.studentId, contentHash),
    content_hash: contentHash,
    // `007` defaults this to '[]'. Capture crops nothing: a crop region is a
    // claim about where on the page a mistake is, and no one has read the page
    // yet (that is M8-4).
    crop_regions: [],
    captured_at: input.capturedAt,
    source_description: input.sourceDescription ?? "",
    // The student took the photograph and the student vouches for it. `ai` and
    // `both` become available when extraction ships (M8-4) — writing `ai` today
    // would claim a model had verified something no model has seen.
    verified_by: "student",
  };
}

/** True when the database refused the insert because the paper is already
 *  captured, rather than for any other reason. */
export function isDuplicateEvidence(error: DbError | null): boolean {
  if (!error) return false;
  if (error.code === UNIQUE_VIOLATION) return true;
  // PostgREST surfaces the constraint name in the message; some transports drop
  // the code. Matching the constraint by NAME is still the database's verdict,
  // not a guess about what went wrong.
  return /evidence_student_hash_unique/i.test(error.message ?? "");
}

/**
 * Capture one piece of evidence: bytes → storage → row.
 *
 * ORDER MATTERS AND IS DELIBERATE. The object is written before the row. If the
 * row then conflicts, the object that is already there is byte-identical to the
 * one that was there before (the key is the hash), so the duplicate path leaves
 * the store exactly as it found it. The reverse order would leave a row
 * pointing at an object that does not exist if the upload failed — a piece of
 * evidence that cannot be looked at, which is worse than no row.
 */
export async function captureEvidence(
  deps: { db: EvidenceDb; storage: EvidenceStorage },
  input: CaptureEvidenceInput,
): Promise<CaptureEvidenceResult> {
  if (input.bytes.length === 0) {
    return { ok: false, code: "empty", detail: "nothing was uploaded" };
  }
  if (input.bytes.length > MAX_EVIDENCE_BYTES) {
    return {
      ok: false,
      code: "too_large",
      detail: `${input.bytes.length} bytes exceeds the ${MAX_EVIDENCE_BYTES}-byte cap`,
    };
  }

  const type = evidenceTypeFor(input.contentType);
  if (!type) {
    return {
      ok: false,
      code: "unsupported_type",
      detail: `'${input.contentType}' is not an image, a PDF or plain text`,
    };
  }

  const contentHash = contentHashOf(input.bytes);

  const stored = await storeEvidenceObject(deps.storage, {
    studentId: input.studentId,
    contentHash,
    bytes: input.bytes,
    contentType: input.contentType,
  });
  if (!stored.ok) {
    return { ok: false, code: "storage_failed", detail: stored.detail };
  }

  const { data, error } = await deps.db.insertEvidence(
    buildEvidenceInsert(input, contentHash, type),
  );

  if (!error && data) {
    return { ok: true, evidence: data as unknown as EvidenceRow, deduped: false, contentHash };
  }

  if (isDuplicateEvidence(error)) {
    // The constraint won. Read back the row that exists — that row, not a new
    // one, is what every occurrence built on this paper will reference.
    const existing = await deps.db.findEvidenceByHash(input.studentId, contentHash);
    if (existing.data) {
      return {
        ok: true,
        evidence: existing.data as unknown as EvidenceRow,
        deduped: true,
        contentHash,
      };
    }
    return {
      ok: false,
      code: "write_failed",
      detail: existing.error?.message ?? "duplicate evidence could not be read back",
    };
  }

  return { ok: false, code: "write_failed", detail: error?.message ?? "insert returned no row" };
}
