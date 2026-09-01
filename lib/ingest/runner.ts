/**
 * THE STAGE RUNNER — the only coordinator in the ingestion pipeline.
 *
 * It owns execution, ordering, persistence, retries, resume, logging, timing
 * and failure handling. Stages own transformation. Nothing else is shared.
 *
 * SEVEN GUARANTEES, and the mechanism behind each:
 *
 *   deterministic  every stage is memoised on (version, inputHash); the clock
 *                  is injected, never read
 *   resumable      the last successful attempt per stage is found in the
 *                  append-only ledger, and execution continues from there
 *   idempotent     an unchanged input hash reuses stored output instead of
 *                  re-executing — re-running a finished run is free and inert
 *   observable     every attempt is persisted with timing, model, confidence
 *                  and reason; a logger streams the same events live
 *   append-only    the store exposes no way to edit a stage record; a retry
 *                  appends attempt n+1
 *   explainable    stored output plus review items answer "why?" with data
 *   isolated       a stage may only read outputs it declared; an undeclared
 *                  read throws rather than silently coupling two stages
 *
 * REPLAY. `startReplay()` creates a NEW run pointing at the original. History
 * is never overwritten, and because a replay begins unconfirmed, it cannot
 * reach the commit phase without a fresh human decision.
 */

import {
  STAGE_ORDER, STAGE_PHASE, stageIndex,
  type AnyStage, type IngestionStore, type RunnerLogger, type RunRecord,
  type RunStatus, type Stage, type StageContext, type StageId, type StageRecord,
} from './types';
import { stableHash } from './hash';

export class DependencyViolation extends Error {
  constructor(readonly stage: StageId, readonly attempted: StageId, detail: string) {
    super(`stage '${stage}' ${detail} '${attempted}'`);
    this.name = 'DependencyViolation';
  }
}

export class RegistryError extends Error {
  constructor(message: string) { super(message); this.name = 'RegistryError'; }
}

export const DEFAULT_MAX_ATTEMPTS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY — ordering is validated once, not hoped for
// ═══════════════════════════════════════════════════════════════════════════

export interface StageRegistry {
  readonly stages: ReadonlyMap<StageId, AnyStage>;
  readonly ordered: readonly AnyStage[];
}

/**
 * Validate and freeze a set of stages.
 *
 * Rejects duplicate ids, unknown ids, self-dependency, and any dependency that
 * does not appear EARLIER in STAGE_ORDER. A cyclic or out-of-order pipeline is
 * therefore unconstructable rather than merely untested.
 */
export function createRegistry(stages: readonly AnyStage[]): StageRegistry {
  const map = new Map<StageId, AnyStage>();

  for (const stage of stages) {
    if (!STAGE_ORDER.includes(stage.id)) {
      throw new RegistryError(`unknown stage id '${stage.id}'`);
    }
    if (map.has(stage.id)) {
      throw new RegistryError(`stage '${stage.id}' registered twice`);
    }
    if (!stage.version || typeof stage.version !== 'string') {
      throw new RegistryError(`stage '${stage.id}' has no version`);
    }
    map.set(stage.id, stage);
  }

  for (const stage of map.values()) {
    for (const dep of stage.dependsOn) {
      if (dep === stage.id) {
        throw new RegistryError(`stage '${stage.id}' depends on itself`);
      }
      if (!STAGE_ORDER.includes(dep)) {
        throw new RegistryError(`stage '${stage.id}' depends on unknown stage '${dep}'`);
      }
      if (stageIndex(dep) >= stageIndex(stage.id)) {
        throw new RegistryError(
          `stage '${stage.id}' depends on '${dep}', which is not earlier in the pipeline`,
        );
      }
    }
  }

  const ordered = STAGE_ORDER.map(id => map.get(id)).filter((s): s is AnyStage => Boolean(s));
  return { stages: map, ordered };
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNNING
// ═══════════════════════════════════════════════════════════════════════════

export interface RunPipelineOptions {
  store: IngestionStore;
  registry: StageRegistry;
  runId: string;
  /** Inclusive slice bounds. Defaults to the whole pipeline. */
  from?: StageId;
  to?: StageId;
  /** Injected clock. Determinism depends on the runner never reading one. */
  now: () => string;
  maxAttempts?: number;
  logger?: RunnerLogger;
  /** Monotonic milliseconds, for durations. Injected for testability. */
  clockMs?: () => number;
}

export interface PipelineResult {
  runId: string;
  status: RunStatus;
  /** Stages that actually executed this call. */
  executed: StageId[];
  /** Stages skipped because a matching successful attempt already existed. */
  reused: StageId[];
  stoppedAt?: { stage: StageId; reason: string };
}

interface Memo {
  output: unknown;
  inputHash: string;
  version: string;
}

/** The newest successful attempt per stage, keyed for memo lookup. */
function successIndex(records: readonly StageRecord[]): Map<StageId, StageRecord> {
  const best = new Map<StageId, StageRecord>();
  for (const r of records) {
    if (r.status !== 'succeeded') continue;
    const current = best.get(r.stage);
    if (!current || r.attempt >= current.attempt) best.set(r.stage, r);
  }
  return best;
}

function nextAttempt(records: readonly StageRecord[], stage: StageId): number {
  let max = 0;
  for (const r of records) if (r.stage === stage && r.attempt > max) max = r.attempt;
  return max + 1;
}

export async function runPipeline(options: RunPipelineOptions): Promise<PipelineResult> {
  const {
    store, registry, runId, now, logger,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    clockMs = () => Date.now(),
  } = options;

  const run = await store.getRun(runId);
  if (!run) throw new RegistryError(`run '${runId}' does not exist`);

  const startIdx = options.from ? stageIndex(options.from) : 0;
  const endIdx = options.to ? stageIndex(options.to) : STAGE_ORDER.length - 1;
  if (startIdx < 0 || endIdx < 0) throw new RegistryError('replay bounds name an unknown stage');
  if (startIdx > endIdx) throw new RegistryError('replay bounds are inverted');

  const slice = registry.ordered.filter(s => {
    const i = stageIndex(s.id);
    return i >= startIdx && i <= endIdx;
  });

  let records = await store.listStages(runId);
  const memo = new Map<StageId, Memo>();
  for (const [stage, record] of successIndex(records)) {
    memo.set(stage, { output: record.output, inputHash: record.inputHash, version: record.version });
  }

  const executed: StageId[] = [];
  const reused: StageId[] = [];
  const emit = (e: Parameters<RunnerLogger>[0]) => logger?.(e);

  const finish = async (status: RunStatus, stoppedAt?: PipelineResult['stoppedAt']): Promise<PipelineResult> => {
    await store.setRunStatus(runId, status);
    emit({ type: 'run-finished', status });
    return { runId, status, executed, reused, stoppedAt };
  };

  for (const stage of slice) {
    // ── THE CONFIRMATION GATE ───────────────────────────────────────────
    // Mechanical, not procedural. A commit stage cannot execute against an
    // unconfirmed run, so no code path — including a replay — can write to
    // the academic record without an explicit human decision.
    if (STAGE_PHASE[stage.id] === 'commit' && !run.confirmedAt) {
      emit({ type: 'gate-blocked', stage: stage.id });
      return finish('awaiting-confirmation', {
        stage: stage.id,
        reason: 'the student has not confirmed the proposals',
      });
    }

    const buildCtx = (attempt: number): StageContext => ({
      runId,
      studentId: run.studentId,
      evidenceId: run.evidenceId,
      now: now(),
      attempt,
      output<T>(id: StageId): T {
        if (!stage.dependsOn.includes(id)) {
          throw new DependencyViolation(stage.id, id, 'read an output it never declared:');
        }
        const found = memo.get(id);
        if (!found) {
          throw new DependencyViolation(stage.id, id, 'depends on a stage that has not succeeded:');
        }
        return found.output as T;
      },
    });

    // ── Input, and the memo check that makes re-running free ────────────
    const input = stage.buildInput(buildCtx(nextAttempt(records, stage.id)));
    const inputHash = stableHash(input);

    const prior = memo.get(stage.id);
    if (prior && prior.inputHash === inputHash && prior.version === stage.version) {
      reused.push(stage.id);
      emit({ type: 'stage-reused', stage: stage.id, inputHash });
      continue;
    }

    // ── Execute, with retries ───────────────────────────────────────────
    // The attempt budget is TOTAL across invocations, not per invocation.
    // Otherwise a resumed run would grant a fresh set of retries every time it
    // was nudged, and a permanently broken stage would burn model calls
    // forever. A genuinely exhausted stage needs a replay — a new run, with a
    // new history — which is an explicit decision rather than an accident.
    const limit = stage.maxAttempts ?? maxAttempts;
    let attempt = nextAttempt(records, stage.id);

    if (attempt > limit) {
      const reason = `attempt budget exhausted (${limit} attempts already recorded)`;
      emit({ type: 'stage-failed', stage: stage.id, attempt: attempt - 1, reason });
      return finish('failed', { stage: stage.id, reason });
    }

    let settled = false;

    while (!settled) {
      const ctx = buildCtx(attempt);
      const startedAt = now();
      const t0 = clockMs();
      emit({ type: 'stage-start', stage: stage.id, attempt, inputHash });

      let outcome: Awaited<ReturnType<Stage['run']>>;
      try {
        outcome = await (stage as Stage<unknown, unknown>).run(input, ctx);
      } catch (err) {
        if (err instanceof DependencyViolation) throw err; // a bug, not a failure
        outcome = {
          status: 'failed',
          reason: err instanceof Error ? err.message : String(err),
          retryable: true,
        };
      }

      const completedAt = now();
      const durationMs = Math.max(0, clockMs() - t0);

      const written = await store.appendStage({
        runId,
        stage: stage.id,
        attempt,
        version: stage.version,
        inputHash,
        status: outcome.status,
        output: outcome.status === 'succeeded' ? outcome.output : null,
        confidence: outcome.status === 'succeeded' ? outcome.confidence ?? null : null,
        model: outcome.status === 'succeeded' ? outcome.model ?? null : null,
        startedAt,
        completedAt,
        durationMs,
        failureReason: outcome.status === 'succeeded' ? null : outcome.reason,
      });
      records = [...records, written];

      if (outcome.status === 'succeeded') {
        memo.set(stage.id, { output: outcome.output, inputHash, version: stage.version });
        executed.push(stage.id);
        emit({
          type: 'stage-succeeded', stage: stage.id, attempt, durationMs,
          confidence: outcome.confidence ?? null,
        });
        settled = true;
        break;
      }

      if (outcome.status === 'review') {
        await store.enqueueReview(runId, stage.id, outcome.items, completedAt);
        emit({ type: 'stage-review', stage: stage.id, reason: outcome.reason, items: outcome.items.length });
        return finish('awaiting-review', { stage: stage.id, reason: outcome.reason });
      }

      // failed
      if (outcome.retryable && attempt < limit) {
        emit({ type: 'stage-retry', stage: stage.id, attempt, reason: outcome.reason });
        attempt += 1;
        continue;
      }

      emit({ type: 'stage-failed', stage: stage.id, attempt, reason: outcome.reason });
      return finish('failed', { stage: stage.id, reason: outcome.reason });
    }
  }

  const reachedEnd = endIdx === STAGE_ORDER.length - 1;
  return finish(reachedEnd ? 'completed' : 'running');
}

// ═══════════════════════════════════════════════════════════════════════════
// REPLAY — a new history, never an overwritten one
// ═══════════════════════════════════════════════════════════════════════════

export interface StartReplayOptions {
  store: IngestionStore;
  /** The run to replay. Left completely untouched. */
  sourceRunId: string;
  now: () => string;
  /** Optional provenance: why this replay exists. */
  reason?: string;
  id?: string;
}

/**
 * Begin a replay of an earlier run.
 *
 * Creates a NEW run that points at the original through `replayOf`, sharing its
 * evidence so the paper is never re-uploaded. The original run's records are
 * not read for reuse and not modified — a replay is a second opinion, not an
 * edit.
 *
 * The new run starts UNCONFIRMED. A replay of S2→S7 therefore cannot leak into
 * S10+ however it is invoked; reaching the record requires the student to look
 * at the new proposals and accept them.
 */
export async function startReplay(options: StartReplayOptions): Promise<RunRecord> {
  const { store, sourceRunId, now, reason, id } = options;

  const source = await store.getRun(sourceRunId);
  if (!source) throw new RegistryError(`cannot replay '${sourceRunId}': it does not exist`);

  return store.createRun({
    id,
    studentId: source.studentId,
    evidenceId: source.evidenceId,
    status: 'running',
    confirmedAt: null,
    replayOf: source.replayOf ?? source.id,
    createdAt: now(),
    meta: { ...source.meta, replayReason: reason ?? null, replayedFrom: sourceRunId },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// INSPECTION — the pipeline explains itself
// ═══════════════════════════════════════════════════════════════════════════

export interface StageSummary {
  stage: StageId;
  phase: 'propose' | 'commit';
  status: StageRecord['status'] | 'not-run';
  attempts: number;
  durationMs: number;
  confidence: number | null;
  model: string | null;
  version: string | null;
  inputHash: string | null;
  failureReason: string | null;
}

/** A human-readable account of everything the pipeline did, and believed. */
export async function explainRun(store: IngestionStore, runId: string): Promise<{
  run: RunRecord | null;
  stages: StageSummary[];
  totalDurationMs: number;
}> {
  const run = await store.getRun(runId);
  const records = await store.listStages(runId);
  const latest = new Map<StageId, StageRecord>();
  const attempts = new Map<StageId, number>();
  let totalDurationMs = 0;

  for (const r of records) {
    totalDurationMs += r.durationMs;
    attempts.set(r.stage, (attempts.get(r.stage) ?? 0) + 1);
    const current = latest.get(r.stage);
    if (!current || r.attempt >= current.attempt) latest.set(r.stage, r);
  }

  const stages: StageSummary[] = STAGE_ORDER.map(id => {
    const r = latest.get(id);
    return {
      stage: id,
      phase: STAGE_PHASE[id],
      status: r?.status ?? 'not-run',
      attempts: attempts.get(id) ?? 0,
      durationMs: r?.durationMs ?? 0,
      confidence: r?.confidence ?? null,
      model: r?.model ?? null,
      version: r?.version ?? null,
      inputHash: r?.inputHash ?? null,
      failureReason: r?.failureReason ?? null,
    };
  });

  return { run, stages, totalDurationMs };
}
