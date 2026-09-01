/**
 * THE INGESTION CONTRACT.
 *
 * One interface, thirteen stages, one coordinator.
 *
 * A stage transforms typed input into typed output and stops. It does not know
 * what ran before it, what runs after it, or what consumes its output. The
 * runner owns execution, ordering, persistence, retries, resume, logging,
 * timing and failure handling — and nothing else owns any of those.
 *
 * This file is the architectural boundary. If a stage ever needs something not
 * expressible here, that is a design conversation, not a workaround.
 */

// ═══════════════════════════════════════════════════════════════════════════
// STAGES — the fixed pipeline
// ═══════════════════════════════════════════════════════════════════════════

export type StageId =
  | 'intake'
  | 'preprocess'
  | 'vision-read'
  | 'segment'
  | 'annotations'
  | 'answers'
  | 'candidates'
  | 'concept-match'
  | 'propose'
  // ── the confirmation gate sits here ──
  | 'occurrences'
  | 'pattern-merge'
  | 'score'
  | 'next-action';

/** Canonical order. A stage may only depend on stages earlier in this list. */
export const STAGE_ORDER: readonly StageId[] = Object.freeze([
  'intake', 'preprocess', 'vision-read', 'segment', 'annotations', 'answers',
  'candidates', 'concept-match', 'propose',
  'occurrences', 'pattern-merge', 'score', 'next-action',
]);

/**
 * `propose` stages read a paper and produce suggestions. They may be wrong,
 * and nothing they do reaches the permanent record.
 *
 * `commit` stages write the academic record. The runner refuses to execute one
 * until the student has confirmed — PRODUCT_PRINCIPLES §3.2 and the M2-4 gate.
 */
export type StagePhase = 'propose' | 'commit';

export const STAGE_PHASE: Readonly<Record<StageId, StagePhase>> = Object.freeze({
  'intake': 'propose',
  'preprocess': 'propose',
  'vision-read': 'propose',
  'segment': 'propose',
  'annotations': 'propose',
  'answers': 'propose',
  'candidates': 'propose',
  'concept-match': 'propose',
  'propose': 'propose',
  'occurrences': 'commit',
  'pattern-merge': 'commit',
  'score': 'commit',
  'next-action': 'commit',
});

export const stageIndex = (id: StageId): number => STAGE_ORDER.indexOf(id);

// ═══════════════════════════════════════════════════════════════════════════
// OUTCOMES — a stage never throws for an expected condition
// ═══════════════════════════════════════════════════════════════════════════

export type StageStatus = 'succeeded' | 'failed' | 'review';

export interface ReviewItem {
  /** What could not be decided. */
  question: string;
  /** The options considered, best first. Never empty. */
  candidates: Array<{ label: string; confidence: number; rationale: string }>;
}

export type StageOutcome<O> =
  | {
      status: 'succeeded';
      output: O;
      /** 0–1. Absent means "not a judgement call". */
      confidence?: number;
      /** Which model produced this, if any. Recorded for replay. */
      model?: string;
    }
  | {
      /**
       * Below the confidence floor. NOT a failure — the stage did its job and
       * correctly declined to guess. The run pauses for a human.
       */
      status: 'review';
      reason: string;
      items: ReviewItem[];
    }
  | {
      status: 'failed';
      reason: string;
      /** Retryable failures are transient: timeouts, rate limits, 5xx. */
      retryable: boolean;
    };

// ═══════════════════════════════════════════════════════════════════════════
// THE STAGE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface StageContext {
  readonly runId: string;
  readonly studentId: string;
  readonly evidenceId: string | null;
  /** Injected — never `Date.now()`. Determinism depends on it. */
  readonly now: string;
  readonly attempt: number;
  /**
   * Read a declared dependency's output.
   *
   * Throws if the stage did not declare `id` in `dependsOn`. That is the
   * dependency-isolation guarantee: a stage cannot reach sideways into the
   * pipeline, and an undeclared read is a bug the runner surfaces immediately.
   */
  output<T = unknown>(id: StageId): T;
}

export interface Stage<I = unknown, O = unknown> {
  readonly id: StageId;
  /**
   * Bump when the stage's logic changes in a way that invalidates stored
   * output. The runner treats (inputHash, version) as the memo key, so a
   * version bump forces re-execution and a replay reproduces old behaviour.
   */
  readonly version: string;
  /** Must all appear earlier in STAGE_ORDER. Validated at registration. */
  readonly dependsOn: readonly StageId[];
  /** Attempts before giving up. Defaults to the runner's setting. */
  readonly maxAttempts?: number;
  /** Build this stage's input from its declared dependencies. Must be pure. */
  buildInput(ctx: StageContext): I;
  run(input: I, ctx: StageContext): Promise<StageOutcome<O>>;
}

export type AnyStage = Stage<never, unknown>;

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE — append-only history
// ═══════════════════════════════════════════════════════════════════════════

export type RunStatus =
  | 'running'
  | 'awaiting-confirmation'
  | 'awaiting-review'
  | 'completed'
  | 'failed';

export interface RunRecord {
  id: string;
  studentId: string;
  evidenceId: string | null;
  status: RunStatus;
  /** Set once, by the student. Until then no commit stage may execute. */
  confirmedAt: string | null;
  /** Set when this run is a replay of an earlier one. Never mutated. */
  replayOf: string | null;
  createdAt: string;
  /** Free-form provenance: source filename, upload channel, client version. */
  meta: Record<string, unknown>;
}

/**
 * One attempt at one stage. APPEND ONLY — a retry appends attempt n+1, it
 * never edits attempt n. The full history of what the pipeline believed, and
 * when, is therefore reconstructable forever.
 */
export interface StageRecord {
  id: string;
  runId: string;
  stage: StageId;
  attempt: number;
  version: string;
  inputHash: string;
  status: StageStatus;
  /** The stage's typed output, verbatim. Null unless status is 'succeeded'. */
  output: unknown;
  confidence: number | null;
  model: string | null;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  failureReason: string | null;
}

export interface IngestionStore {
  createRun(run: Omit<RunRecord, 'id'> & { id?: string }): Promise<RunRecord>;
  getRun(runId: string): Promise<RunRecord | null>;
  setRunStatus(runId: string, status: RunStatus): Promise<void>;
  confirmRun(runId: string, at: string): Promise<void>;
  /** APPEND ONLY. Implementations must never update an existing row. */
  appendStage(record: Omit<StageRecord, 'id'> & { id?: string }): Promise<StageRecord>;
  /** Chronological. Every attempt, including failures. */
  listStages(runId: string): Promise<StageRecord[]>;
  enqueueReview(runId: string, stage: StageId, items: readonly ReviewItem[], at: string): Promise<void>;
  listReview(runId: string): Promise<Array<{ stage: StageId; items: ReviewItem[]; at: string }>>;
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNNER OBSERVABILITY
// ═══════════════════════════════════════════════════════════════════════════

export type RunnerEvent =
  | { type: 'stage-start'; stage: StageId; attempt: number; inputHash: string }
  | { type: 'stage-reused'; stage: StageId; inputHash: string }
  | { type: 'stage-succeeded'; stage: StageId; attempt: number; durationMs: number; confidence: number | null }
  | { type: 'stage-retry'; stage: StageId; attempt: number; reason: string }
  | { type: 'stage-failed'; stage: StageId; attempt: number; reason: string }
  | { type: 'stage-review'; stage: StageId; reason: string; items: number }
  | { type: 'gate-blocked'; stage: StageId }
  | { type: 'run-finished'; status: RunStatus };

export type RunnerLogger = (event: RunnerEvent) => void;
