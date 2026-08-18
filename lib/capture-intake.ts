// ═══════════════════════════════════════════════════════════════════════════
// M8-3 — THE FIRST PRODUCTION IMPORTER OF `lib/ingest/*`.
//
// Architecture S.1, the ingestion pipeline row: **KEEP + WIRE**, with the
// reason stated as a defect — *"**Zero production importers** —
// `lib/ingest/{runner,hash,memory-store,types}.ts` are referenced only by
// `tests/ingest-runner.test.mjs`."* Risk T12: dark code decays.
//
// This module is the wire. It is small on purpose: everything it needs already
// exists, and re-implementing any of it here would leave the original dark.
//
//   `createRegistry`  validates the pipeline shape          — runner.ts
//   `runPipeline`     executes, memoises, persists, retries — runner.ts
//   `stableHash`      decides whether a stage must run      — hash.ts
//   `IngestionStore`  the append-only ledger contract       — types.ts
//   `createSupabaseIngestionStore` the `008` implementation — supabase-store.ts
//
//
// WHAT THIS PASS DOES, AND WHAT IT REFUSES TO DO
//
// It registers exactly ONE stage — `intake` — and runs the pipeline slice
// `intake → intake`. Nothing reads the paper. There is no model call, no vision
// call and no extraction, and the file imports nothing that could make one.
//
// That is the milestone boundary, not a stub: M8-4 is *"extraction → draft
// occurrences"* and its done-when is *"nothing is written to the record without
// passing a gate"*. Shipping the stage LEDGER first is what gives M8-4
// somewhere to write its attempts, its confidences and its refusals — and what
// lets a paper captured today be re-read in 2030 against a better model without
// re-photographing it (`008`'s own header).
//
// After this runs, a captured paper sits at: `intake` succeeded, run status
// `running`, twelve stages `not-run`. In the pipeline's vocabulary that is
// "received, queued for extraction". `explainRun()` will say exactly that,
// today, with no extra code.
//
// ── AMENDED 2026-08-15, M8-4 ────────────────────────────────────────────────
//
// The three paragraphs above are still exactly true OF CAPTURE, and `capture
// Registry()` below is byte-unchanged: uploading a paper still registers one
// stage and still reads nothing. What M8-4 added is a SECOND registry —
// `extractionRegistry()` — used by a second endpoint the student reaches by
// asking for a reading. So "there is no extraction" became "extraction is a
// separate, explicit act", which is the sentence the boundary was always going
// to become.
//
// This file STILL imports nothing that could call a model. `ProposeDeps`
// carries the model in as an interface; the Anthropic client lives in
// `app/api/capture/extract/route.ts` and nowhere else in the capture path.
//
//
// WHY `intake`'s OUTPUT IS THE EVIDENCE DESCRIPTOR
//
// A stage's output is stored verbatim so replay is free. `intake`'s honest
// output is what the system actually knows once the bytes are safe: which
// evidence row, which object, how many bytes, what type, what the student said
// it was. It contains no interpretation of the paper, because nothing has
// interpreted it. `confidence` is left unset — types.ts: *"Absent means 'not a
// judgement call'"*, and receiving a file is not one.
//
// No clock is read here. The runner injects `now` (determinism), and this
// module hands the injection through rather than reaching for `Date`.
// ═══════════════════════════════════════════════════════════════════════════

import { createRegistry, runPipeline, type PipelineResult, type StageRegistry } from "./ingest/runner";
import type {
  AnyStage, IngestionStore, RunRecord, RunnerLogger, Stage, StageContext, StageId, StageOutcome,
} from "./ingest/types";
import type { CaptureKind } from "./storage";
import {
  createPreprocessStage,
  createProposeStage,
  type ProposeDeps,
  type ProposeOutput,
} from "./capture-extraction";

/** Bump when `intake`'s output shape changes. `(inputHash, version)` is the
 *  memo key, so a bump forces honest re-execution on the next run. */
export const INTAKE_VERSION = "1";

/** Everything `intake` knows, and the entirety of what it may know. */
export interface IntakeFacts {
  evidenceId: string;
  contentHash: string;
  storageRef: string;
  byteSize: number;
  contentType: string;
  kind: CaptureKind;
  /** `007`'s `type` value for this evidence: photo | pdf | manual. */
  evidenceType: string;
}

export interface IntakeOutput extends IntakeFacts {
  /** The stage the run is waiting for. Named rather than implied so a reader of
   *  `ingestion_stages.output` in 2030 can see where the run stopped and why. */
  awaiting: StageId;
}

/**
 * The `intake` stage.
 *
 * `buildInput` is pure and closes over facts decided before the run started, so
 * two runs over the same evidence hash identically and the second is REUSED
 * rather than re-executed — the runner's idempotency guarantee, exercised by
 * production rather than only by a test.
 */
export function createIntakeStage(facts: IntakeFacts): Stage<IntakeFacts, IntakeOutput> {
  return {
    id: "intake",
    version: INTAKE_VERSION,
    dependsOn: [],
    buildInput: (_ctx: StageContext) => ({ ...facts }),
    run: async (input: IntakeFacts): Promise<StageOutcome<IntakeOutput>> => {
      // The bytes are already in storage and the evidence row already exists —
      // `lib/evidence.ts` did both before this ran, because a stage that could
      // fail after writing the record would make the ledger disagree with the
      // record. So `intake` records what happened; it does not perform it.
      if (!input.evidenceId) {
        return {
          status: "failed",
          reason: "intake has no evidence to record",
          // Not retryable: a run with no evidence will never acquire one by
          // being tried again. It needs a new capture.
          retryable: false,
        };
      }
      return { status: "succeeded", output: { ...input, awaiting: "preprocess" } };
    },
  };
}

/** The registry CAPTURE uses. One stage, validated by the same
 *  `createRegistry` the full thirteen will be validated by.
 *
 *  Still one stage after M8-4, deliberately: storing a paper and reading it are
 *  two decisions a student makes at two moments, and the upload endpoint must
 *  not be able to spend a model call on a paper nobody asked it to read.
 *  Extraction has its own registry below and its own endpoint. */
export function captureRegistry(facts: IntakeFacts): StageRegistry {
  return createRegistry([createIntakeStage(facts) as AnyStage]);
}

// ═══════════════════════════════════════════════════════════════════════════
// M8-4 — THE EXTRACTION SLICE
//
// `intake → preprocess → propose`. Three stages, all `propose` PHASE, so the
// runner's confirmation gate has nothing to block here and — more to the point
// — nothing in this slice CAN write to the academic record, because the four
// commit stages are still unregistered.
//
// `intake` is included rather than assumed: `preprocess` declares a dependency
// on it, and the runner refuses to hand a stage an output it did not declare.
// Because the paper's intake attempt is already in the ledger with an unchanged
// input hash, the runner REUSES it — extraction costs one stored row to read,
// not a second intake.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The registry EXTRACTION uses.
 *
 * The model arrives as `ProposeDeps`, never as a client this module imports:
 * `lib/capture-intake.ts` still contains no Anthropic import, no API key and no
 * fetch, and `app/api/capture/extract/route.ts` is the only file in the capture
 * path that does.
 */
export function extractionRegistry(facts: IntakeFacts, deps: ProposeDeps): StageRegistry {
  return createRegistry([
    createIntakeStage(facts) as AnyStage,
    createPreprocessStage() as AnyStage,
    createProposeStage(deps) as AnyStage,
  ]);
}

export interface RunExtractionOptions {
  store: IngestionStore;
  runId: string;
  facts: IntakeFacts;
  deps: ProposeDeps;
  now: () => string;
  logger?: RunnerLogger;
}

export interface RunExtractionResult {
  runId: string;
  status: RunRecord["status"];
  executed: StageId[];
  reused: StageId[];
  stoppedAt?: { stage: StageId; reason: string };
  /** The `propose` stage's output, when it succeeded. `null` on review or
   *  failure — and `null` is the degradation path, not an error: the caller
   *  shows the review items and offers the manual entry form (M8-6). */
  proposed: ProposeOutput | null;
}

/**
 * Read a captured paper. THE M8-4 ENTRY POINT.
 *
 * Returns the proposals; it does NOT write them. Writing a draft occurrence is
 * `lib/occurrences.ts`'s job and the endpoint's decision, which keeps the one
 * module that can reach `occurrences` separate from the one module that talks
 * to a model. Neither can do the other's half alone.
 */
export async function runCaptureExtraction(
  options: RunExtractionOptions,
): Promise<RunExtractionResult> {
  const { store, runId, facts, deps, now, logger } = options;

  const result: PipelineResult = await runPipeline({
    store,
    registry: extractionRegistry(facts, deps),
    runId,
    from: "intake",
    to: "propose",
    now,
    logger,
  });

  let proposed: ProposeOutput | null = null;
  if (result.status !== "failed" && !result.stoppedAt) {
    // Read the ledger rather than the runner's return value: the stored row IS
    // the record of what the stage said, and reading it back proves the thing
    // that was persisted is the thing the caller acts on.
    const stages = await store.listStages(runId);
    const latest = stages
      .filter(s => s.stage === "propose" && s.status === "succeeded")
      .sort((a, b) => a.attempt - b.attempt)
      .pop();
    proposed = (latest?.output as ProposeOutput | undefined) ?? null;
  }

  return {
    runId,
    status: result.status,
    executed: result.executed,
    reused: result.reused,
    stoppedAt: result.stoppedAt,
    proposed,
  };
}

export interface BeginIngestionOptions {
  store: IngestionStore;
  studentId: string;
  facts: IntakeFacts;
  /** Provenance: source filename, upload channel, client version (`008`'s own
   *  description of `meta`). Never anything derived from reading the paper. */
  meta?: Record<string, unknown>;
  /** Injected clock, ISO strings. */
  now: () => string;
  /** Reuse this run instead of creating one — the same paper, uploaded twice.
   *  `findRunIdForEvidence()` supplies it. */
  existingRunId?: string | null;
  logger?: RunnerLogger;
}

export interface BeginIngestionResult {
  runId: string;
  /** `running` here means "intake done, extraction not yet built". */
  status: RunRecord["status"];
  /** False when an existing run for this evidence was resumed. */
  created: boolean;
  executed: StageId[];
  reused: StageId[];
}

/**
 * Put a captured piece of evidence into the stage ledger.
 *
 * THE PRODUCTION CALL SITE. `app/api/capture/route.ts` calls this after
 * `captureEvidence()` succeeds, for a paper and for a syllabus alike — S.4
 * marks `exam-practice` REBUILD into `/capture` (papers) and `syllabus` ADAPT
 * into `/capture` (syllabus ingestion), *"wired to `008_ingestion.sql`"*, and
 * this is the single function both of those flows go through.
 */
export async function beginCaptureIngestion(
  options: BeginIngestionOptions,
): Promise<BeginIngestionResult> {
  const { store, studentId, facts, meta = {}, now, existingRunId, logger } = options;

  let runId = existingRunId ?? null;
  let created = false;

  if (!runId) {
    const run = await store.createRun({
      studentId,
      evidenceId: facts.evidenceId,
      status: "running",
      // A run begins UNCONFIRMED, always. The confirmation gate in the runner
      // reads this, and it is what stops any future commit stage reaching the
      // academic record without the student's decision (M8-5).
      confirmedAt: null,
      replayOf: null,
      createdAt: now(),
      meta,
    });
    runId = run.id;
    created = true;
  }

  const result: PipelineResult = await runPipeline({
    store,
    registry: captureRegistry(facts),
    runId,
    from: "intake",
    to: "intake",
    now,
    logger,
  });

  return {
    runId,
    status: result.status,
    created,
    executed: result.executed,
    reused: result.reused,
  };
}
