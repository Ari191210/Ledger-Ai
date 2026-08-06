/**
 * In-memory IngestionStore.
 *
 * The reference implementation of the persistence contract, and the one the
 * runner's tests drive. It exists so the orchestration guarantees can be proven
 * without a database — a runner that needs Postgres to be tested is a runner
 * nobody tests properly.
 *
 * The Supabase adapter (M2-B) implements this same interface against
 * `008_ingestion.sql` and must satisfy exactly these semantics, including the
 * append-only refusal below.
 */

import type {
  IngestionStore, ReviewItem, RunRecord, RunStatus, StageId, StageRecord,
} from './types';

export class AppendOnlyViolation extends Error {
  constructor(detail: string) {
    super(`ingestion history is append-only: ${detail}`);
    this.name = 'AppendOnlyViolation';
  }
}

export function createMemoryStore(): IngestionStore & {
  _runs: Map<string, RunRecord>;
  _stages: StageRecord[];
} {
  const runs = new Map<string, RunRecord>();
  const stages: StageRecord[] = [];
  const reviews: Array<{ runId: string; stage: StageId; items: ReviewItem[]; at: string }> = [];
  let seq = 0;

  return {
    _runs: runs,
    _stages: stages,

    async createRun(run) {
      const id = run.id ?? `run-${++seq}`;
      if (runs.has(id)) throw new AppendOnlyViolation(`run '${id}' already exists`);
      const record: RunRecord = { ...run, id };
      runs.set(id, record);
      return { ...record };
    },

    async getRun(runId) {
      const r = runs.get(runId);
      return r ? { ...r } : null;
    },

    async setRunStatus(runId: string, status: RunStatus) {
      const r = runs.get(runId);
      if (!r) throw new AppendOnlyViolation(`run '${runId}' does not exist`);
      runs.set(runId, { ...r, status });
    },

    async confirmRun(runId: string, at: string) {
      const r = runs.get(runId);
      if (!r) throw new AppendOnlyViolation(`run '${runId}' does not exist`);
      // Confirmation is a one-way door. Re-confirming keeps the original moment,
      // so the record shows when the student actually decided.
      if (r.confirmedAt) return;
      runs.set(runId, { ...r, confirmedAt: at });
    },

    async appendStage(record) {
      const id = record.id ?? `stage-${++seq}`;
      if (stages.some(s => s.id === id)) {
        throw new AppendOnlyViolation(`stage record '${id}' already exists`);
      }
      if (stages.some(s => s.runId === record.runId && s.stage === record.stage && s.attempt === record.attempt)) {
        throw new AppendOnlyViolation(
          `attempt ${record.attempt} of '${record.stage}' is already written`,
        );
      }
      const written: StageRecord = { ...record, id };
      stages.push(written);
      return { ...written };
    },

    async listStages(runId) {
      return stages.filter(s => s.runId === runId).map(s => ({ ...s }));
    },

    async enqueueReview(runId, stage, items, at) {
      reviews.push({ runId, stage, items: items.map(i => ({ ...i })), at });
    },

    async listReview(runId) {
      return reviews
        .filter(r => r.runId === runId)
        .map(({ stage, items, at }) => ({ stage, items, at }));
    },
  };
}
