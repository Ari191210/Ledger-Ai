// Tests for the ingestion stage runner (lib/ingest/).
//
// The runner makes seven architectural guarantees — deterministic, resumable,
// idempotent, observable, append-only, explainable, dependency-isolated. Each
// one is asserted here directly, not inferred from happy-path behaviour.
//
//   node --test tests/
//   node --test tests/ingest-runner.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-ingest');

let R;  // runner
let T;  // types
let S;  // memory store
let H;  // hash

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.ingest.json'],
    { cwd: root },
  );
  // tsc emits extensionless relative imports; Node's ESM resolver requires the
  // extension. Same post-compile rewrite the other suites use for path aliases.
  const dir = path.join(outDir, 'ingest');
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
    const p = path.join(dir, f);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(
      /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
      (m, a, spec, z) => (spec.endsWith('.js') ? m : `${a}${spec}.js${z}`),
    ));
  }
});

test('setup imports', async () => {
  const load = (f) => import(pathToFileURL(path.join(outDir, 'ingest', f)).href);
  R = await load('runner.js');
  T = await load('types.js');
  S = await load('memory-store.js');
  H = await load('hash.js');
  assert.equal(typeof R.runPipeline, 'function');
  assert.equal(T.STAGE_ORDER.length, 13);
});

// ── Harness ─────────────────────────────────────────────────────────────────

const T0 = '2026-08-06T10:00:00.000Z';
let tick = 0;
const clock = () => { tick += 1; return new Date(Date.parse(T0) + tick * 1000).toISOString(); };
const ms = () => tick * 1000;

/** A stage that always succeeds, recording every call for assertions. */
function stubStage(id, opts = {}) {
  const calls = [];
  return {
    id,
    version: opts.version ?? 'v1',
    dependsOn: opts.dependsOn ?? [],
    maxAttempts: opts.maxAttempts,
    buildInput: opts.buildInput ?? ((ctx) => ({ stage: id, run: ctx.runId })),
    async run(input, ctx) {
      calls.push({ input, attempt: ctx.attempt });
      if (opts.behaviour) return opts.behaviour(input, ctx, calls.length);
      return { status: 'succeeded', output: opts.output ?? { ok: id }, confidence: opts.confidence, model: opts.model };
    },
    calls,
  };
}

async function newRun(store, over = {}) {
  return store.createRun({
    studentId: 'student-1', evidenceId: 'ev-1', status: 'running',
    confirmedAt: null, replayOf: null, createdAt: T0, meta: {}, ...over,
  });
}

const proposeOnly = ['intake', 'preprocess', 'vision-read'];

// ══ STAGE ORDERING AND REGISTRY ═════════════════════════════════════════════

describe('registry — ordering and dependency validation', () => {
  test('accepts a well-ordered pipeline', () => {
    const reg = R.createRegistry([
      stubStage('intake'),
      stubStage('preprocess', { dependsOn: ['intake'] }),
    ]);
    assert.equal(reg.ordered.length, 2);
  });

  test('orders stages canonically regardless of registration order', () => {
    const reg = R.createRegistry([stubStage('segment'), stubStage('intake'), stubStage('preprocess')]);
    assert.deepEqual(reg.ordered.map(s => s.id), ['intake', 'preprocess', 'segment']);
  });

  test('rejects a dependency that runs LATER in the pipeline', () => {
    assert.throws(
      () => R.createRegistry([stubStage('intake', { dependsOn: ['segment'] })]),
      /not earlier in the pipeline/,
    );
  });

  test('rejects self-dependency', () => {
    assert.throws(() => R.createRegistry([stubStage('intake', { dependsOn: ['intake'] })]), /depends on itself/);
  });

  test('rejects an unknown stage id', () => {
    assert.throws(() => R.createRegistry([{ ...stubStage('intake'), id: 'nonsense' }]), /unknown stage id/);
  });

  test('rejects a duplicate registration', () => {
    assert.throws(() => R.createRegistry([stubStage('intake'), stubStage('intake')]), /registered twice/);
  });

  test('rejects a stage with no version', () => {
    assert.throws(() => R.createRegistry([{ ...stubStage('intake'), version: '' }]), /has no version/);
  });

  test('a cyclic pipeline is unconstructable', () => {
    assert.throws(() => R.createRegistry([
      stubStage('preprocess', { dependsOn: ['segment'] }),
      stubStage('segment', { dependsOn: ['preprocess'] }),
    ]), /not earlier in the pipeline/);
  });
});

// ══ SEQUENTIAL EXECUTION ════════════════════════════════════════════════════

describe('sequential execution', () => {
  test('runs every stage once, in canonical order', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const order = [];
    const stages = proposeOnly.map(id => stubStage(id, {
      behaviour: () => { order.push(id); return { status: 'succeeded', output: { id } }; },
    }));

    const res = await R.runPipeline({
      store, registry: R.createRegistry(stages), runId: run.id,
      to: 'vision-read', now: clock, clockMs: ms,
    });

    assert.deepEqual(order, proposeOnly);
    assert.deepEqual(res.executed, proposeOnly);
    assert.equal(res.reused.length, 0);
  });

  test('a stage receives its declared dependency output', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    let seen;
    const stages = [
      stubStage('intake', { output: { pages: 3 } }),
      stubStage('preprocess', {
        dependsOn: ['intake'],
        buildInput: (ctx) => ({ from: ctx.output('intake') }),
        behaviour: (input) => { seen = input; return { status: 'succeeded', output: {} }; },
      }),
    ];
    await R.runPipeline({ store, registry: R.createRegistry(stages), runId: run.id, to: 'preprocess', now: clock, clockMs: ms });
    assert.deepEqual(seen, { from: { pages: 3 } });
  });

  test('the run is marked completed only when the last stage finishes', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const res = await R.runPipeline({
      store, registry: R.createRegistry([stubStage('intake')]), runId: run.id,
      to: 'vision-read', now: clock, clockMs: ms,
    });
    assert.equal(res.status, 'running', 'a partial slice is not a completed run');
  });
});

// ══ DEPENDENCY ISOLATION ════════════════════════════════════════════════════

describe('dependency isolation', () => {
  test('reading an UNDECLARED output throws DependencyViolation', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stages = [
      stubStage('intake'),
      stubStage('preprocess', { dependsOn: [], buildInput: (ctx) => ({ x: ctx.output('intake') }) }),
    ];
    await assert.rejects(
      R.runPipeline({ store, registry: R.createRegistry(stages), runId: run.id, to: 'preprocess', now: clock, clockMs: ms }),
      /never declared/,
    );
  });

  test('reading a declared but not-yet-succeeded output throws', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stages = [
      stubStage('preprocess', { dependsOn: ['intake'], buildInput: (ctx) => ({ x: ctx.output('intake') }) }),
    ];
    await assert.rejects(
      R.runPipeline({ store, registry: R.createRegistry(stages), runId: run.id, from: 'preprocess', to: 'preprocess', now: clock, clockMs: ms }),
      /has not succeeded/,
    );
  });

  test('a dependency violation is never swallowed as a retryable failure', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stages = [stubStage('intake', {
      behaviour: (i, ctx) => { ctx.output('preprocess'); return { status: 'succeeded', output: {} }; },
    })];
    await assert.rejects(
      R.runPipeline({ store, registry: R.createRegistry(stages), runId: run.id, to: 'intake', now: clock, clockMs: ms }),
      /DependencyViolation|never declared/,
    );
    const recs = await store.listStages(run.id);
    assert.equal(recs.length, 0, 'a bug must not be recorded as a stage failure');
  });
});

// ══ RETRIES ═════════════════════════════════════════════════════════════════

describe('failed stage retry', () => {
  test('a retryable failure is retried up to the limit, then fails the run', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', {
      behaviour: () => ({ status: 'failed', reason: 'timeout', retryable: true }),
    });
    const res = await R.runPipeline({
      store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake',
      now: clock, clockMs: ms, maxAttempts: 3,
    });
    assert.equal(res.status, 'failed');
    assert.equal(stage.calls.length, 3);
    const recs = await store.listStages(run.id);
    assert.deepEqual(recs.map(r => r.attempt), [1, 2, 3]);
  });

  test('a NON-retryable failure stops immediately', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', {
      behaviour: () => ({ status: 'failed', reason: 'corrupt file', retryable: false }),
    });
    const res = await R.runPipeline({
      store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms,
    });
    assert.equal(res.status, 'failed');
    assert.equal(stage.calls.length, 1, 'a permanent failure must not be retried');
  });

  test('a stage that succeeds on retry continues the pipeline', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const flaky = stubStage('intake', {
      behaviour: (i, ctx, n) => n < 3
        ? { status: 'failed', reason: 'rate limited', retryable: true }
        : { status: 'succeeded', output: { ok: true } },
    });
    const res = await R.runPipeline({
      store, registry: R.createRegistry([flaky, stubStage('preprocess', { dependsOn: ['intake'] })]),
      runId: run.id, to: 'preprocess', now: clock, clockMs: ms,
    });
    assert.deepEqual(res.executed, ['intake', 'preprocess']);
    const recs = await store.listStages(run.id);
    assert.deepEqual(recs.filter(r => r.stage === 'intake').map(r => r.status), ['failed', 'failed', 'succeeded']);
  });

  test('a thrown exception becomes a retryable failure, not a crash', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', { behaviour: () => { throw new Error('boom'); } });
    const res = await R.runPipeline({
      store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake',
      now: clock, clockMs: ms, maxAttempts: 2,
    });
    assert.equal(res.status, 'failed');
    const recs = await store.listStages(run.id);
    assert.equal(recs[0].failureReason, 'boom');
  });

  test('a per-stage maxAttempts overrides the runner default', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', {
      maxAttempts: 5,
      behaviour: () => ({ status: 'failed', reason: 'x', retryable: true }),
    });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms, maxAttempts: 2 });
    assert.equal(stage.calls.length, 5);
  });
});

// ══ RESUME ══════════════════════════════════════════════════════════════════

describe('resume', () => {
  test('a crash at stage 3 resumes at stage 3, not stage 1', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);

    const a = stubStage('intake');
    const b = stubStage('preprocess', { dependsOn: ['intake'] });
    const failing = stubStage('vision-read', {
      dependsOn: ['preprocess'],
      behaviour: () => ({ status: 'failed', reason: 'model down', retryable: false }),
    });

    const first = await R.runPipeline({
      store, registry: R.createRegistry([a, b, failing]), runId: run.id, to: 'vision-read', now: clock, clockMs: ms,
    });
    assert.equal(first.status, 'failed');
    assert.equal(a.calls.length, 1);
    assert.equal(b.calls.length, 1);

    // Model recovers. Re-run the same pipeline.
    const fixed = stubStage('vision-read', { dependsOn: ['preprocess'] });
    const second = await R.runPipeline({
      store, registry: R.createRegistry([a, b, fixed]), runId: run.id, to: 'vision-read', now: clock, clockMs: ms,
    });

    assert.deepEqual(second.reused, ['intake', 'preprocess'], 'earlier stages must not re-run');
    assert.deepEqual(second.executed, ['vision-read']);
    assert.equal(a.calls.length, 1, 'intake ran exactly once across both invocations');
  });

  test('attempt numbering continues across invocations, never restarts', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', {
      behaviour: (i, c, n) => n < 3 ? { status: 'failed', reason: 'x', retryable: true } : { status: 'succeeded', output: {} },
    });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms, maxAttempts: 2 });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms, maxAttempts: 4 });
    const recs = await store.listStages(run.id);
    assert.deepEqual(recs.map(r => r.attempt), [1, 2, 3], 'numbering continues from where it stopped');
    assert.equal(recs[2].status, 'succeeded');
  });

  test('the attempt budget is TOTAL — a resume cannot grant fresh retries', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', { behaviour: () => ({ status: 'failed', reason: 'x', retryable: true }) });
    const opts = { store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms, maxAttempts: 2 };

    await R.runPipeline(opts);
    assert.equal(stage.calls.length, 2);

    const again = await R.runPipeline(opts);
    assert.equal(again.status, 'failed');
    assert.match(again.stoppedAt.reason, /budget exhausted/);
    assert.equal(stage.calls.length, 2, 'an exhausted stage must not burn more model calls');
    assert.equal((await store.listStages(run.id)).length, 2, 'no phantom record for a non-execution');
  });
});

// ══ IDEMPOTENCY AND DETERMINISM ═════════════════════════════════════════════

describe('idempotency and determinism', () => {
  test('re-running a completed pipeline executes nothing', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stages = proposeOnly.map(id => stubStage(id));
    const reg = R.createRegistry(stages);

    await R.runPipeline({ store, registry: reg, runId: run.id, to: 'vision-read', now: clock, clockMs: ms });
    const again = await R.runPipeline({ store, registry: reg, runId: run.id, to: 'vision-read', now: clock, clockMs: ms });

    assert.deepEqual(again.executed, []);
    assert.deepEqual(again.reused, proposeOnly);
    for (const s of stages) assert.equal(s.calls.length, 1);
  });

  test('an unchanged input hash reuses stored output', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake');
    const reg = R.createRegistry([stage]);
    await R.runPipeline({ store, registry: reg, runId: run.id, to: 'intake', now: clock, clockMs: ms });
    await R.runPipeline({ store, registry: reg, runId: run.id, to: 'intake', now: clock, clockMs: ms });
    assert.equal(stage.calls.length, 1);
  });

  test('a VERSION bump forces honest re-execution', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    await R.runPipeline({ store, registry: R.createRegistry([stubStage('intake', { version: 'v1' })]), runId: run.id, to: 'intake', now: clock, clockMs: ms });

    const v2 = stubStage('intake', { version: 'v2' });
    const res = await R.runPipeline({ store, registry: R.createRegistry([v2]), runId: run.id, to: 'intake', now: clock, clockMs: ms });
    assert.deepEqual(res.executed, ['intake']);
    assert.equal(v2.calls.length, 1);
  });

  test('a CHANGED input forces re-execution', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    await R.runPipeline({ store, registry: R.createRegistry([stubStage('intake', { buildInput: () => ({ a: 1 }) })]), runId: run.id, to: 'intake', now: clock, clockMs: ms });
    const changed = stubStage('intake', { buildInput: () => ({ a: 2 }) });
    const res = await R.runPipeline({ store, registry: R.createRegistry([changed]), runId: run.id, to: 'intake', now: clock, clockMs: ms });
    assert.deepEqual(res.executed, ['intake']);
  });

  test('hashing is key-order independent', () => {
    assert.equal(H.stableHash({ a: 1, b: 2 }), H.stableHash({ b: 2, a: 1 }));
    assert.notEqual(H.stableHash({ a: 1 }), H.stableHash({ a: 2 }));
  });

  test('hashing is stable across calls and array order sensitive', () => {
    assert.equal(H.stableHash([1, 2, 3]), H.stableHash([1, 2, 3]));
    assert.notEqual(H.stableHash([1, 2, 3]), H.stableHash([3, 2, 1]));
    assert.match(H.stableHash({ x: 1 }), /^[0-9a-f]{32}$/);
  });

  test('the runner never reads a real clock', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const fixed = () => '2030-01-01T00:00:00.000Z';
    await R.runPipeline({ store, registry: R.createRegistry([stubStage('intake')]), runId: run.id, to: 'intake', now: fixed, clockMs: () => 0 });
    const recs = await store.listStages(run.id);
    assert.equal(recs[0].startedAt, '2030-01-01T00:00:00.000Z');
    assert.equal(recs[0].completedAt, '2030-01-01T00:00:00.000Z');
    assert.equal(recs[0].durationMs, 0);
  });
});

// ══ APPEND-ONLY HISTORY ═════════════════════════════════════════════════════

describe('append-only history', () => {
  test('every attempt is recorded, including failures', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', {
      behaviour: (i, c, n) => n < 2 ? { status: 'failed', reason: 'x', retryable: true } : { status: 'succeeded', output: {} },
    });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms });
    const recs = await store.listStages(run.id);
    assert.equal(recs.length, 2);
    assert.equal(recs[0].status, 'failed');
    assert.equal(recs[1].status, 'succeeded');
  });

  test('the store refuses to rewrite an attempt', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const base = {
      runId: run.id, stage: 'intake', attempt: 1, version: 'v1', inputHash: 'h',
      status: 'succeeded', output: {}, confidence: null, model: null,
      startedAt: T0, completedAt: T0, durationMs: 0, failureReason: null,
    };
    await store.appendStage(base);
    await assert.rejects(() => store.appendStage(base), /append-only/);
  });

  test('the store exposes no way to update a stage record', () => {
    const store = S.createMemoryStore();
    for (const forbidden of ['updateStage', 'deleteStage', 'setStage', 'editStage']) {
      assert.equal(store[forbidden], undefined, `${forbidden} must not exist`);
    }
  });

  test('earlier records are untouched by later ones', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', {
      behaviour: (i, c, n) => n < 3 ? { status: 'failed', reason: `fail-${n}`, retryable: true } : { status: 'succeeded', output: {} },
    });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms });
    const recs = await store.listStages(run.id);
    assert.equal(recs[0].failureReason, 'fail-1');
    assert.equal(recs[1].failureReason, 'fail-2');
  });
});

// ══ THE CONFIRMATION GATE ═══════════════════════════════════════════════════

describe('the confirmation gate', () => {
  const full = () => [
    stubStage('intake'),
    stubStage('propose', { dependsOn: ['intake'] }),
    stubStage('occurrences', { dependsOn: ['propose'] }),
  ];

  test('an unconfirmed run STOPS before the first commit stage', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stages = full();
    const res = await R.runPipeline({ store, registry: R.createRegistry(stages), runId: run.id, now: clock, clockMs: ms });
    assert.equal(res.status, 'awaiting-confirmation');
    assert.equal(res.stoppedAt.stage, 'occurrences');
    assert.equal(stages[2].calls.length, 0, 'occurrences must never run unconfirmed');
  });

  test('propose-phase stages still complete before the gate', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const res = await R.runPipeline({ store, registry: R.createRegistry(full()), runId: run.id, now: clock, clockMs: ms });
    assert.deepEqual(res.executed, ['intake', 'propose']);
  });

  test('after confirmation the commit phase runs', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stages = full();
    const reg = R.createRegistry(stages);
    await R.runPipeline({ store, registry: reg, runId: run.id, now: clock, clockMs: ms });
    await store.confirmRun(run.id, clock());
    const res = await R.runPipeline({ store, registry: reg, runId: run.id, now: clock, clockMs: ms });
    assert.equal(res.status, 'completed');
    assert.equal(stages[2].calls.length, 1);
  });

  test('confirmation is a one-way door — the first moment is kept', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    await store.confirmRun(run.id, 'first');
    await store.confirmRun(run.id, 'second');
    assert.equal((await store.getRun(run.id)).confirmedAt, 'first');
  });

  test('no commit stage can run on ANY unconfirmed run, even in isolation', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const commit = stubStage('score');
    const res = await R.runPipeline({
      store, registry: R.createRegistry([commit]), runId: run.id,
      from: 'score', to: 'score', now: clock, clockMs: ms,
    });
    assert.equal(res.status, 'awaiting-confirmation');
    assert.equal(commit.calls.length, 0);
  });
});

// ══ REVIEW — never guess ════════════════════════════════════════════════════

describe('review queue', () => {
  test('a review outcome pauses the run and is NOT a failure', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('concept-match', {
      behaviour: () => ({
        status: 'review', reason: 'no concept above the floor',
        items: [{ question: 'Q7(b)', candidates: [{ label: 'Angular momentum', confidence: 0.41, rationale: 'weak lexical overlap' }] }],
      }),
    });
    const res = await R.runPipeline({
      store, registry: R.createRegistry([stage]), runId: run.id,
      from: 'concept-match', to: 'concept-match', now: clock, clockMs: ms,
    });
    assert.equal(res.status, 'awaiting-review');
    const queued = await store.listReview(run.id);
    assert.equal(queued.length, 1);
    assert.equal(queued[0].items[0].candidates[0].confidence, 0.41);
  });

  test('a review outcome is never retried — declining is the correct answer', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('concept-match', {
      behaviour: () => ({ status: 'review', reason: 'unsure', items: [] }),
    });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, from: 'concept-match', to: 'concept-match', now: clock, clockMs: ms, maxAttempts: 3 });
    assert.equal(stage.calls.length, 1);
  });

  test('review records carry the alternatives considered', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('concept-match', {
      behaviour: () => ({
        status: 'review', reason: 'tie',
        items: [{ question: 'Q3', candidates: [
          { label: 'Bernoulli', confidence: 0.52, rationale: 'mentions pressure' },
          { label: 'Continuity', confidence: 0.49, rationale: 'mentions flow rate' },
        ] }],
      }),
    });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, from: 'concept-match', to: 'concept-match', now: clock, clockMs: ms });
    const q = await store.listReview(run.id);
    assert.equal(q[0].items[0].candidates.length, 2, 'the student sees what was weighed');
  });
});

// ══ REPLAY ══════════════════════════════════════════════════════════════════

describe('replay', () => {
  test('replay creates a NEW run and never touches the original', async () => {
    const store = S.createMemoryStore();
    const original = await newRun(store);
    await R.runPipeline({ store, registry: R.createRegistry([stubStage('intake')]), runId: original.id, to: 'intake', now: clock, clockMs: ms });
    const before = await store.listStages(original.id);

    const replay = await R.startReplay({ store, sourceRunId: original.id, now: clock, reason: 'better model' });

    assert.notEqual(replay.id, original.id);
    assert.equal(replay.replayOf, original.id);
    assert.deepEqual(await store.listStages(original.id), before, 'original history is immutable');
  });

  test('a replay shares the evidence — the paper is never re-uploaded', async () => {
    const store = S.createMemoryStore();
    const original = await newRun(store, { evidenceId: 'ev-99' });
    const replay = await R.startReplay({ store, sourceRunId: original.id, now: clock });
    assert.equal(replay.evidenceId, 'ev-99');
  });

  test('a replay starts UNCONFIRMED, so it cannot reach the record', async () => {
    const store = S.createMemoryStore();
    const original = await newRun(store, { confirmedAt: '2026-01-01T00:00:00.000Z' });
    const replay = await R.startReplay({ store, sourceRunId: original.id, now: clock });
    assert.equal(replay.confirmedAt, null, 'a confirmed original must not confer confirmation');

    const commit = stubStage('occurrences');
    const res = await R.runPipeline({
      store, registry: R.createRegistry([commit]), runId: replay.id,
      from: 'occurrences', to: 'occurrences', now: clock, clockMs: ms,
    });
    assert.equal(res.status, 'awaiting-confirmation');
    assert.equal(commit.calls.length, 0);
  });

  test('a replay of S2→S7 executes only that slice', async () => {
    const store = S.createMemoryStore();
    const original = await newRun(store);
    const replay = await R.startReplay({ store, sourceRunId: original.id, now: clock });

    const stages = ['vision-read', 'segment', 'annotations', 'answers', 'candidates', 'concept-match']
      .map(id => stubStage(id));
    const res = await R.runPipeline({
      store, registry: R.createRegistry(stages), runId: replay.id,
      from: 'vision-read', to: 'concept-match', now: clock, clockMs: ms,
    });
    assert.deepEqual(res.executed, ['vision-read', 'segment', 'annotations', 'answers', 'candidates', 'concept-match']);
    assert.equal(res.status, 'running', 'a partial slice never reports completed');
  });

  test('a chain of replays stays flat — replayOf points at the ORIGINAL', async () => {
    const store = S.createMemoryStore();
    const original = await newRun(store);
    const first = await R.startReplay({ store, sourceRunId: original.id, now: clock });
    const second = await R.startReplay({ store, sourceRunId: first.id, now: clock });
    assert.equal(second.replayOf, original.id);
  });

  test('a replay does not inherit the original’s stage history', async () => {
    const store = S.createMemoryStore();
    const original = await newRun(store);
    const stage = stubStage('intake');
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: original.id, to: 'intake', now: clock, clockMs: ms });

    const replay = await R.startReplay({ store, sourceRunId: original.id, now: clock });
    const res = await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: replay.id, to: 'intake', now: clock, clockMs: ms });

    assert.deepEqual(res.executed, ['intake'], 'a replay is a second opinion, not a cache hit');
    assert.equal(stage.calls.length, 2);
  });

  test('replaying a run that does not exist is refused', async () => {
    const store = S.createMemoryStore();
    await assert.rejects(R.startReplay({ store, sourceRunId: 'ghost', now: clock }), /does not exist/);
  });

  test('inverted replay bounds are refused', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    await assert.rejects(
      R.runPipeline({ store, registry: R.createRegistry([]), runId: run.id, from: 'score', to: 'intake', now: clock, clockMs: ms }),
      /inverted/,
    );
  });
});

// ══ OBSERVABILITY AND EXPLAINABILITY ════════════════════════════════════════

describe('observability', () => {
  test('every field of the failure model is recorded', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('vision-read', { confidence: 0.93, model: 'claude-sonnet-5' });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, from: 'vision-read', to: 'vision-read', now: clock, clockMs: ms });

    const [r] = await store.listStages(run.id);
    for (const field of ['startedAt', 'completedAt', 'durationMs', 'attempt', 'model', 'version', 'inputHash', 'output', 'confidence', 'status']) {
      assert.notEqual(r[field], undefined, `${field} must be recorded`);
    }
    assert.equal(r.confidence, 0.93);
    assert.equal(r.model, 'claude-sonnet-5');
    assert.equal(r.failureReason, null);
  });

  test('a failure records its reason and no output', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', { behaviour: () => ({ status: 'failed', reason: 'unreadable', retryable: false }) });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms });
    const [r] = await store.listStages(run.id);
    assert.equal(r.failureReason, 'unreadable');
    assert.equal(r.output, null);
    assert.equal(r.confidence, null);
  });

  test('the logger streams the full lifecycle', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const events = [];
    const stage = stubStage('intake', {
      behaviour: (i, c, n) => n < 2 ? { status: 'failed', reason: 'x', retryable: true } : { status: 'succeeded', output: {} },
    });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms, logger: e => events.push(e.type) });
    assert.deepEqual(events, ['stage-start', 'stage-retry', 'stage-start', 'stage-succeeded', 'run-finished']);
  });

  test('explainRun accounts for all 13 stages', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    await R.runPipeline({ store, registry: R.createRegistry([stubStage('intake')]), runId: run.id, to: 'intake', now: clock, clockMs: ms });
    const x = await R.explainRun(store, run.id);
    assert.equal(x.stages.length, 13);
    assert.equal(x.stages.find(s => s.stage === 'intake').status, 'succeeded');
    assert.equal(x.stages.find(s => s.stage === 'score').status, 'not-run');
  });

  test('explainRun reports attempts and total duration', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const stage = stubStage('intake', {
      behaviour: (i, c, n) => n < 3 ? { status: 'failed', reason: 'x', retryable: true } : { status: 'succeeded', output: {} },
    });
    await R.runPipeline({ store, registry: R.createRegistry([stage]), runId: run.id, to: 'intake', now: clock, clockMs: ms });
    const x = await R.explainRun(store, run.id);
    assert.equal(x.stages.find(s => s.stage === 'intake').attempts, 3);
    assert.ok(x.totalDurationMs >= 0);
  });

  test('every stage is labelled with its phase', async () => {
    const store = S.createMemoryStore();
    const run = await newRun(store);
    const x = await R.explainRun(store, run.id);
    assert.equal(x.stages.find(s => s.stage === 'propose').phase, 'propose');
    assert.equal(x.stages.find(s => s.stage === 'occurrences').phase, 'commit');
  });
});

// ══ CONTRACT SHAPE ══════════════════════════════════════════════════════════

describe('the pipeline contract', () => {
  test('13 stages, 9 propose and 4 commit', () => {
    const phases = T.STAGE_ORDER.map(id => T.STAGE_PHASE[id]);
    assert.equal(phases.filter(p => p === 'propose').length, 9);
    assert.equal(phases.filter(p => p === 'commit').length, 4);
  });

  test('the gate falls between propose and occurrences', () => {
    assert.equal(T.STAGE_PHASE['propose'], 'propose');
    assert.equal(T.STAGE_PHASE['occurrences'], 'commit');
    assert.equal(T.stageIndex('occurrences'), T.stageIndex('propose') + 1);
  });

  test('no commit stage precedes any propose stage', () => {
    const firstCommit = T.STAGE_ORDER.findIndex(id => T.STAGE_PHASE[id] === 'commit');
    const lastPropose = T.STAGE_ORDER.map(id => T.STAGE_PHASE[id]).lastIndexOf('propose');
    assert.ok(firstCommit > lastPropose);
  });

  test('running a run that does not exist is refused', async () => {
    const store = S.createMemoryStore();
    await assert.rejects(
      R.runPipeline({ store, registry: R.createRegistry([]), runId: 'ghost', now: clock, clockMs: ms }),
      /does not exist/,
    );
  });
});
