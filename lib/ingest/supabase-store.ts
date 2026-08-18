// ═══════════════════════════════════════════════════════════════════════════
// M8-3 — THE INGESTION STORE, AGAINST `008_ingestion.sql`.
//
// EXECUTION_PLAN M8-3: *"Wire `008_ingestion.sql` + `lib/ingest/*` for syllabus
// and paper ingestion. Done when: the append-only stage ledger has production
// importers; T12 retired for `lib/ingest/*`."*
//
// `lib/ingest/memory-store.ts` said this file was coming, by name:
//
//   > The Supabase adapter (M2-B) implements this same interface against
//   > `008_ingestion.sql` and must satisfy exactly these semantics, including
//   > the append-only refusal below.
//
// This is that adapter. It implements `IngestionStore` — the SAME interface the
// runner's tests drive against the in-memory double — so the seven guarantees
// the runner proves in `tests/ingest-runner.test.mjs` are guarantees about the
// code that now runs in production, not about a test fixture.
//
//
// WHY THE APPEND-ONLY REFUSAL IS THE DATABASE'S HERE
//
// The memory store raises `AppendOnlyViolation` from a scan of its own array.
// This one does not scan anything: `008` declares
//
//     CONSTRAINT ingestion_stages_attempt_unique UNIQUE (run_id, stage, attempt)
//
// so a second write of attempt n is refused by Postgres with `23505` and this
// module translates that into the same shape of error. Under concurrency the
// array scan would be a race and the constraint is not — which is exactly why
// `008` declares it.
//
//
// WHY THE CLIENT IS INJECTED AS FOUR VERBS
//
// `IngestionDb` is four operations, not a `SupabaseClient`. The mapping between
// `RunRecord`/`StageRecord` and `008`'s snake_case columns is the part that can
// be WRONG — a mistyped column name here silently loses a stage's output
// forever — so it is the part that has to be testable without a database (U.3).
// `app/api/capture/route.ts` supplies the twenty lines of Supabase that satisfy
// this interface; `tests/capture-pipeline.test.mjs` supplies a double that
// enforces `008`'s constraints and drives the real runner through the real
// store.
//
// SERVICE ROLE, ALWAYS. `008` gives `ingestion_stages` no INSERT policy for
// anyone — *"the history is written by the service role and is append-only by
// construction"*. A student-scoped client physically cannot write here.
// ═══════════════════════════════════════════════════════════════════════════

import type {
  IngestionStore, ReviewItem, RunRecord, RunStatus, StageId, StageRecord,
} from "./types";

export const RUNS_TABLE = "ingestion_runs";
export const STAGES_TABLE = "ingestion_stages";
export const REVIEW_TABLE = "ingestion_review";

/** Postgres `unique_violation` — `(run_id, stage, attempt)` was already written. */
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

export interface OrderBy {
  column: string;
  ascending: boolean;
}

/**
 * The four verbs `008` needs. No filters beyond equality, deliberately: the
 * ledger is read by run, and a store that could express arbitrary predicates
 * would invite readers that bypass `explainRun()`.
 */
export interface IngestionDb {
  insert(table: string, row: Row): Promise<DbResult<Row>>;
  selectOne(table: string, match: Row): Promise<DbResult<Row>>;
  selectMany(table: string, match: Row, order?: OrderBy[]): Promise<DbResult<Row[]>>;
  update(table: string, match: Row, patch: Row): Promise<DbResult<null>>;
}

/** Raised when the ledger refuses a write. Same meaning as the memory store's
 *  `AppendOnlyViolation`; a separate class so production code does not import a
 *  test double to name its errors. */
export class StageAppendConflict extends Error {
  constructor(detail: string) {
    super(`ingestion history is append-only: ${detail}`);
    this.name = "StageAppendConflict";
  }
}

export class IngestionStoreError extends Error {
  constructor(detail: string) {
    super(`ingestion store: ${detail}`);
    this.name = "IngestionStoreError";
  }
}

// ── Mapping. One direction each, and nothing else in this file writes a column
//    name, so a rename is a two-line change rather than a hunt. ──────────────

export function runToRow(run: Omit<RunRecord, "id"> & { id?: string }): Row {
  const row: Row = {
    student_id: run.studentId,
    evidence_id: run.evidenceId,
    status: run.status,
    confirmed_at: run.confirmedAt,
    replay_of: run.replayOf,
    created_at: run.createdAt,
    meta: run.meta,
  };
  if (run.id) row.id = run.id;
  return row;
}

export function rowToRun(row: Row): RunRecord {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    evidenceId: (row.evidence_id as string | null) ?? null,
    status: row.status as RunStatus,
    confirmedAt: (row.confirmed_at as string | null) ?? null,
    replayOf: (row.replay_of as string | null) ?? null,
    createdAt: String(row.created_at),
    meta: (row.meta as Record<string, unknown>) ?? {},
  };
}

export function stageToRow(record: Omit<StageRecord, "id"> & { id?: string }): Row {
  const row: Row = {
    run_id: record.runId,
    stage: record.stage,
    attempt: record.attempt,
    version: record.version,
    input_hash: record.inputHash,
    status: record.status,
    // `008`'s outcome-shape CHECK: succeeded means output and no reason;
    // anything else means a reason and no output. The runner already produces
    // exactly that pair, so this mapping passes it through rather than
    // "helpfully" filling either side in.
    output: record.output ?? null,
    confidence: record.confidence,
    model: record.model,
    started_at: record.startedAt,
    completed_at: record.completedAt,
    duration_ms: record.durationMs,
    failure_reason: record.failureReason,
  };
  if (record.id) row.id = record.id;
  return row;
}

export function rowToStage(row: Row): StageRecord {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    stage: row.stage as StageId,
    attempt: Number(row.attempt),
    version: String(row.version),
    inputHash: String(row.input_hash),
    status: row.status as StageRecord["status"],
    output: row.output ?? null,
    confidence: (row.confidence as number | null) ?? null,
    model: (row.model as string | null) ?? null,
    startedAt: String(row.started_at),
    completedAt: String(row.completed_at),
    durationMs: Number(row.duration_ms),
    failureReason: (row.failure_reason as string | null) ?? null,
  };
}

// ── The store ───────────────────────────────────────────────────────────────

export function createSupabaseIngestionStore(db: IngestionDb): IngestionStore {
  const readRun = async (runId: string): Promise<RunRecord | null> => {
    const { data, error } = await db.selectOne(RUNS_TABLE, { id: runId });
    if (error) throw new IngestionStoreError(error.message);
    return data ? rowToRun(data) : null;
  };

  return {
    async createRun(run) {
      const { data, error } = await db.insert(RUNS_TABLE, runToRow(run));
      if (error || !data) {
        throw new IngestionStoreError(error?.message ?? "createRun returned no row");
      }
      return rowToRun(data);
    },

    async getRun(runId) {
      return readRun(runId);
    },

    async setRunStatus(runId, status) {
      const { error } = await db.update(RUNS_TABLE, { id: runId }, { status });
      if (error) throw new IngestionStoreError(error.message);
    },

    async confirmRun(runId, at) {
      // Confirmation is a one-way door (`008`'s `ingestion_runs_confirm_own`
      // policy: `USING (confirmed_at IS NULL)`). The read-then-write here is
      // the SERVICE-ROLE path and is not the enforcement — the RLS policy is,
      // for the student path that M8-5 builds. This branch preserves the
      // original moment rather than restamping it, which is the same behaviour
      // the memory store documents.
      const existing = await readRun(runId);
      if (!existing) throw new IngestionStoreError(`run '${runId}' does not exist`);
      if (existing.confirmedAt) return;

      const { error } = await db.update(
        RUNS_TABLE,
        { id: runId },
        { confirmed_at: at, status: "running" },
      );
      if (error) throw new IngestionStoreError(error.message);
    },

    async appendStage(record) {
      const { data, error } = await db.insert(STAGES_TABLE, stageToRow(record));

      if (error) {
        if (error.code === UNIQUE_VIOLATION || /ingestion_stages_attempt_unique/i.test(error.message)) {
          throw new StageAppendConflict(
            `attempt ${record.attempt} of '${record.stage}' is already written`,
          );
        }
        throw new IngestionStoreError(error.message);
      }
      if (!data) throw new IngestionStoreError("appendStage returned no row");

      return rowToStage(data);
    },

    async listStages(runId) {
      const { data, error } = await db.selectMany(STAGES_TABLE, { run_id: runId }, [
        { column: "started_at", ascending: true },
        { column: "attempt", ascending: true },
      ]);
      if (error) throw new IngestionStoreError(error.message);
      return (data ?? []).map(rowToStage);
    },

    async enqueueReview(runId, stage, items, at) {
      const { error } = await db.insert(REVIEW_TABLE, {
        run_id: runId,
        stage,
        items,
        created_at: at,
      });
      if (error) throw new IngestionStoreError(error.message);
    },

    async listReview(runId) {
      const { data, error } = await db.selectMany(REVIEW_TABLE, { run_id: runId }, [
        { column: "created_at", ascending: true },
      ]);
      if (error) throw new IngestionStoreError(error.message);
      return (data ?? []).map(row => ({
        stage: row.stage as StageId,
        items: (row.items as ReviewItem[]) ?? [],
        at: String(row.created_at),
      }));
    },
  };
}

/**
 * The run that already exists for a piece of evidence, if any.
 *
 * Not part of `IngestionStore`: the runner never asks this question, capture
 * does. It is what makes re-uploading the same paper produce ONE run as well as
 * one evidence row — without it, the dedup in `lib/evidence.ts` would hand the
 * same evidence to a fresh run every time and the ledger would fill with
 * identical histories.
 */
export async function findRunIdForEvidence(
  db: IngestionDb,
  studentId: string,
  evidenceId: string,
): Promise<string | null> {
  const { data, error } = await db.selectMany(
    RUNS_TABLE,
    { student_id: studentId, evidence_id: evidenceId },
    [{ column: "created_at", ascending: true }],
  );
  if (error || !data || data.length === 0) return null;
  // The FIRST run for this evidence. A replay creates a later row pointing at
  // it (`replay_of`), and returning the replay would resume the second opinion
  // instead of the original reading.
  return String(data[0].id);
}
