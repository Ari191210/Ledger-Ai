// M8-2 / M8-3 — CAPTURE, DEDUP, AND THE STAGE LEDGER, against the shipped path.
//
// `tests/ingest-runner.test.mjs` already proves the runner's seven guarantees
// against the in-memory store. It proves nothing about production, which is
// exactly the T12 complaint architecture S.1 files against `lib/ingest/*`:
// *"Zero production importers."*
//
// This suite drives the code that actually ships:
//
//   `captureEvidence()`               lib/evidence.ts       (M8-2)
//   `createSupabaseIngestionStore()`  lib/ingest/supabase-store.ts (M8-3)
//   `beginCaptureIngestion()`         lib/capture-intake.ts (M8-3)
//   `runPipeline()`                   lib/ingest/runner.ts  — through the above
//
// The doubles below are not convenient stubs: each enforces the constraint the
// migration actually declares, and refuses the same way Postgres refuses.
//
//   evidence          UNIQUE (student_id, content_hash)   — 007, `evidence_student_hash_unique`
//   ingestion_stages  UNIQUE (run_id, stage, attempt)     — 008, `ingestion_stages_attempt_unique`
//   ingestion_stages  outcome-shape CHECK                 — 008
//
// So "re-uploading the same paper creates one evidence row" is demonstrated
// against the constraint's behaviour, not asserted about the application's
// intentions. `tests/mistakes-rls.test.mjs` is the companion that proves the
// constraint is really in the live database.
//
//   node --test tests/capture-pipeline.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-capture');

let E;  // lib/evidence
let S;  // lib/storage
let C;  // lib/capture-intake
let ST; // lib/ingest/supabase-store
let R;  // lib/ingest/runner
let T;  // lib/ingest/types

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.capture.json'],
    { cwd: root },
  );
  // tsc emits extensionless relative imports; Node's ESM resolver requires the
  // extension. Same post-compile rewrite the other suites use.
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(
        /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
        (m, a, spec, z) => (spec.endsWith('.js') ? m : `${a}${spec}.js${z}`),
      ));
    }
  };
  walk(outDir);
});

test('setup imports', async () => {
  const load = (f) => import(pathToFileURL(path.join(outDir, f)).href);
  E = await load('evidence.js');
  S = await load('storage.js');
  C = await load('capture-intake.js');
  ST = await load('ingest/supabase-store.js');
  R = await load('ingest/runner.js');
  T = await load('ingest/types.js');
  assert.equal(typeof E.captureEvidence, 'function');
  assert.equal(typeof C.beginCaptureIngestion, 'function');
  assert.equal(typeof ST.createSupabaseIngestionStore, 'function');
});

// ── Doubles ─────────────────────────────────────────────────────────────────

const STUDENT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

/** `evidence`, with 007's unique constraint enforced the way Postgres does. */
function fakeEvidenceDb() {
  const rows = [];
  let seq = 0;
  const inserts = [];

  return {
    rows,
    inserts,
    async insertEvidence(row) {
      inserts.push(row);
      const clash = rows.find(
        r => r.student_id === row.student_id && r.content_hash === row.content_hash,
      );
      if (clash) {
        return {
          data: null,
          error: {
            code: '23505',
            message:
              'duplicate key value violates unique constraint "evidence_student_hash_unique"',
          },
        };
      }
      const written = { id: `ev-${++seq}`, created_at: '2026-08-15T00:00:00.000Z', ...row };
      rows.push(written);
      return { data: { ...written }, error: null };
    },
    async findEvidenceByHash(studentId, contentHash) {
      const found = rows.find(r => r.student_id === studentId && r.content_hash === contentHash);
      return { data: found ? { ...found } : null, error: null };
    },
  };
}

function fakeStorage() {
  const objects = new Map();
  const calls = [];
  return {
    objects,
    calls,
    async upload(p, bytes, options) {
      calls.push({ path: p, options });
      objects.set(p, { bytes: Buffer.from(bytes), contentType: options.contentType });
      return { error: null };
    },
  };
}

/** `008`'s three tables, with its two structural refusals. */
function fakeIngestionDb() {
  const tables = { ingestion_runs: [], ingestion_stages: [], ingestion_review: [] };
  let seq = 0;

  const matches = (row, match) =>
    Object.entries(match).every(([k, v]) => (row[k] ?? null) === (v ?? null));

  return {
    tables,
    async insert(table, row) {
      if (table === 'ingestion_stages') {
        // UNIQUE (run_id, stage, attempt)
        const clash = tables[table].find(
          r => r.run_id === row.run_id && r.stage === row.stage && r.attempt === row.attempt,
        );
        if (clash) {
          return {
            data: null,
            error: {
              code: '23505',
              message:
                'duplicate key value violates unique constraint "ingestion_stages_attempt_unique"',
            },
          };
        }
        // outcome-shape CHECK
        const shaped =
          (row.status === 'succeeded' && row.output !== null && row.failure_reason === null) ||
          (row.status !== 'succeeded' && row.failure_reason !== null);
        if (!shaped) {
          return {
            data: null,
            error: { code: '23514', message: 'ingestion_stages_outcome_shape violated' },
          };
        }
      }
      const written = { id: row.id ?? `${table}-${++seq}`, ...row };
      tables[table].push(written);
      return { data: { ...written }, error: null };
    },
    async selectOne(table, match) {
      const found = tables[table].find(r => matches(r, match));
      return { data: found ? { ...found } : null, error: null };
    },
    async selectMany(table, match, order) {
      let out = tables[table].filter(r => matches(r, match)).map(r => ({ ...r }));
      for (const o of [...(order ?? [])].reverse()) {
        out = out.sort((a, b) => {
          const x = String(a[o.column] ?? '');
          const y = String(b[o.column] ?? '');
          return o.ascending ? x.localeCompare(y) : y.localeCompare(x);
        });
      }
      return { data: out, error: null };
    },
    async update(table, match, patch) {
      for (const r of tables[table]) if (matches(r, match)) Object.assign(r, patch);
      return { data: null, error: null };
    },
  };
}

const bytesOf = (s) => new TextEncoder().encode(s);

const T0 = '2026-08-15T10:00:00.000Z';
function clock() {
  let tick = 0;
  return () => { tick += 1; return new Date(Date.parse(T0) + tick * 1000).toISOString(); };
}

const PAPER = bytesOf('a photograph of a marked physics paper');

async function capture(deps, overrides = {}) {
  return E.captureEvidence(deps, {
    studentId: STUDENT,
    bytes: PAPER,
    contentType: 'image/jpeg',
    kind: 'paper',
    capturedAt: T0,
    sourceDescription: 'Physics unit test',
    ...overrides,
  });
}

// ══ M8-2 — THE EVIDENCE TABLE ═══════════════════════════════════════════════

describe('M8-2: the content hash', () => {
  test('is SHA-256 of the bytes, not the pipeline`s FNV hash', () => {
    // Against node:crypto, so the claim is "cryptographic digest", verified,
    // rather than "some stable hash".
    const expected = crypto.createHash('sha256').update(Buffer.from(PAPER)).digest('hex');
    assert.equal(E.contentHashOf(PAPER), expected);
    assert.equal(E.contentHashOf(PAPER).length, 64);
  });

  test('one changed byte is a different paper', () => {
    assert.notEqual(E.contentHashOf(PAPER), E.contentHashOf(bytesOf('a photograph of a marked physics papeR')));
  });

  test('the storage key is owner-scoped and hash-addressed', () => {
    const h = E.contentHashOf(PAPER);
    assert.equal(S.storagePathFor(STUDENT, h), `${STUDENT}/${h}`);
    assert.equal(S.storageRefFor(STUDENT, h), `evidence/${STUDENT}/${h}`);
    // The first segment is what 019's policy compares to auth.uid().
    assert.equal(S.storagePathFor(STUDENT, h).split('/')[0], STUDENT);
  });
});

describe('M8-2: re-uploading the same paper creates ONE evidence row', () => {
  test('the done-when, end to end', async () => {
    const db = fakeEvidenceDb();
    const storage = fakeStorage();

    const first = await capture({ db, storage });
    const second = await capture({ db, storage });

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(db.rows.length, 1, 'the same paper became two evidence rows');

    assert.equal(first.deduped, false);
    assert.equal(second.deduped, true);
    // The second upload resolves to the SAME row — every occurrence built on
    // this paper references one id, forever.
    assert.equal(second.evidence.id, first.evidence.id);
  });

  test('the dedup is the CONSTRAINT`s verdict, not a pre-flight check', async () => {
    const db = fakeEvidenceDb();
    const storage = fakeStorage();

    await capture({ db, storage });
    await capture({ db, storage });

    // Both attempts reached the database. A "select, then insert if absent"
    // implementation would show one insert here — and would be a race: two
    // tabs uploading a millisecond apart would both find nothing and both
    // write. Two inserts, one row, is the proof that Postgres decided.
    assert.equal(db.inserts.length, 2, 'the second upload never attempted an insert');
    assert.equal(db.rows.length, 1);
  });

  test('and one object, because the key is the hash', async () => {
    const db = fakeEvidenceDb();
    const storage = fakeStorage();
    await capture({ db, storage });
    await capture({ db, storage });

    assert.equal(storage.objects.size, 1, 'a duplicate upload orphaned a second object');
    assert.equal(storage.calls.length, 2);
    assert.equal(storage.calls[0].path, storage.calls[1].path);
    assert.equal(storage.calls[0].options.upsert, true);
  });

  test('the constraint is recognised by name when the code is missing', () => {
    assert.equal(E.isDuplicateEvidence({ code: '23505', message: 'x' }), true);
    assert.equal(
      E.isDuplicateEvidence({ message: 'violates unique constraint "evidence_student_hash_unique"' }),
      true,
    );
    assert.equal(E.isDuplicateEvidence({ code: '23514', message: 'some check' }), false);
    assert.equal(E.isDuplicateEvidence(null), false);
  });

  test('two different papers are two rows', async () => {
    const db = fakeEvidenceDb();
    const storage = fakeStorage();
    await capture({ db, storage });
    await capture({ db, storage }, { bytes: bytesOf('a different paper') });
    assert.equal(db.rows.length, 2);
  });

  test('the same bytes from a DIFFERENT student are that student`s own evidence', async () => {
    // The constraint is (student_id, content_hash). Two students photographing
    // the same printed question paper each own a row; neither can see the
    // other's (007's RLS), and neither dedups the other away.
    const db = fakeEvidenceDb();
    const storage = fakeStorage();
    await capture({ db, storage });
    const other = await capture({ db, storage }, { studentId: OTHER });
    assert.equal(db.rows.length, 2);
    assert.equal(other.deduped, false);
  });
});

describe('M8-2: the row 007 gets', () => {
  test('is shaped exactly as the frozen schema requires', async () => {
    const db = fakeEvidenceDb();
    const storage = fakeStorage();
    const res = await capture({ db, storage });

    const row = db.rows[0];
    assert.equal(row.student_id, STUDENT);
    assert.equal(row.type, 'photo');                    // CHECK (photo|pdf|manual)
    assert.equal(row.verified_by, 'student');           // CHECK (ai|student|both)
    assert.equal(row.storage_ref, `evidence/${STUDENT}/${res.contentHash}`);
    assert.deepEqual(row.crop_regions, []);             // nothing has read the page
    assert.equal(row.captured_at, T0);
    assert.equal(row.source_description, 'Physics unit test');
    // No column 007 does not have. A row with an extra key would be rejected
    // by PostgREST at runtime, which is a production 500, not a type error.
    const allowed = new Set([
      'student_id', 'type', 'storage_ref', 'content_hash', 'crop_regions',
      'captured_at', 'source_description', 'verified_by',
    ]);
    for (const k of Object.keys(row)) {
      if (k === 'id' || k === 'created_at') continue;
      assert.ok(allowed.has(k), `evidence insert carries unknown column '${k}'`);
    }
  });

  test('a PDF and pasted text are typed by 007`s CHECK, never guessed', async () => {
    assert.equal(S.evidenceTypeFor('image/png'), 'photo');
    assert.equal(S.evidenceTypeFor('application/pdf'), 'pdf');
    assert.equal(S.evidenceTypeFor('text/plain; charset=utf-8'), 'manual');
    assert.equal(S.evidenceTypeFor('application/zip'), null);

    const db = fakeEvidenceDb();
    const storage = fakeStorage();
    const refused = await capture({ db, storage }, { contentType: 'application/zip' });
    assert.equal(refused.ok, false);
    assert.equal(refused.code, 'unsupported_type');
    assert.equal(db.inserts.length, 0, 'an unsupported type reached the table');
  });

  test('nothing is stored when there is nothing to store', async () => {
    const db = fakeEvidenceDb();
    const storage = fakeStorage();
    const empty = await capture({ db, storage }, { bytes: new Uint8Array(0) });
    assert.equal(empty.ok, false);
    assert.equal(empty.code, 'empty');
    assert.equal(storage.calls.length, 0);
  });

  test('a failed upload never writes a row pointing at nothing', async () => {
    const db = fakeEvidenceDb();
    const storage = {
      async upload() { return { error: { message: 'bucket unavailable' } }; },
    };
    const res = await capture({ db, storage });
    assert.equal(res.ok, false);
    assert.equal(res.code, 'storage_failed');
    assert.equal(db.inserts.length, 0);
  });
});

// ══ M8-3 — THE STAGE LEDGER ═════════════════════════════════════════════════

describe('M8-3: lib/ingest has a production call site', () => {
  test('the capture registry is the real registry, with one propose stage', () => {
    const facts = {
      evidenceId: 'ev-1', contentHash: 'abc', storageRef: 'evidence/x/abc',
      byteSize: 10, contentType: 'image/jpeg', kind: 'paper', evidenceType: 'photo',
    };
    const registry = C.captureRegistry(facts);
    assert.equal(registry.ordered.length, 1);
    assert.equal(registry.ordered[0].id, 'intake');
    // Extraction is M8-4. A commit-phase stage registered here would be able to
    // reach the academic record, which is precisely what this pass must not do.
    assert.equal(T.STAGE_PHASE.intake, 'propose');
    for (const s of registry.ordered) {
      assert.equal(T.STAGE_PHASE[s.id], 'propose', `${s.id} is a commit stage`);
    }
  });

  test('capturing a paper writes one run and one intake stage to 008', async () => {
    const evDb = fakeEvidenceDb();
    const storage = fakeStorage();
    const inDb = fakeIngestionDb();
    const now = clock();

    const captured = await capture({ db: evDb, storage });
    const store = ST.createSupabaseIngestionStore(inDb);

    const result = await C.beginCaptureIngestion({
      store,
      studentId: STUDENT,
      facts: {
        evidenceId: captured.evidence.id,
        contentHash: captured.contentHash,
        storageRef: captured.evidence.storage_ref,
        byteSize: PAPER.length,
        contentType: 'image/jpeg',
        kind: 'paper',
        evidenceType: captured.evidence.type,
      },
      meta: { filename: 'physics.jpg', channel: 'web' },
      now,
    });

    assert.equal(result.created, true);
    assert.deepEqual(result.executed, ['intake']);
    // `running` is the honest state: intake succeeded, twelve stages have not
    // been built yet. It is NOT `completed`, which would claim the paper had
    // been read.
    assert.equal(result.status, 'running');

    assert.equal(inDb.tables.ingestion_runs.length, 1);
    const run = inDb.tables.ingestion_runs[0];
    assert.equal(run.student_id, STUDENT);
    assert.equal(run.evidence_id, captured.evidence.id);
    assert.equal(run.confirmed_at, null, 'a run must begin unconfirmed');
    assert.equal(run.replay_of, null);
    assert.equal(run.meta.filename, 'physics.jpg');

    assert.equal(inDb.tables.ingestion_stages.length, 1);
    const stage = inDb.tables.ingestion_stages[0];
    assert.equal(stage.run_id, run.id);
    assert.equal(stage.stage, 'intake');
    assert.equal(stage.attempt, 1);
    assert.equal(stage.status, 'succeeded');
    assert.equal(stage.failure_reason, null);
    assert.equal(stage.version, C.INTAKE_VERSION);
    assert.equal(typeof stage.input_hash, 'string');
    assert.ok(stage.duration_ms >= 0);
    // The output is stored verbatim, which is what makes replay free (008).
    assert.equal(stage.output.evidenceId, captured.evidence.id);
    assert.equal(stage.output.contentHash, captured.contentHash);
    assert.equal(stage.output.storageRef, captured.evidence.storage_ref);
    assert.equal(stage.output.byteSize, PAPER.length);
    assert.equal(stage.output.awaiting, 'preprocess');
    // No model touched this. `model` and `confidence` are null because intake
    // is not a judgement call (types.ts).
    assert.equal(stage.model, null);
    assert.equal(stage.confidence, null);
  });

  test('a syllabus goes through the same ledger — S.4`s ADAPT, wired', async () => {
    const evDb = fakeEvidenceDb();
    const storage = fakeStorage();
    const inDb = fakeIngestionDb();

    const captured = await capture({ db: evDb, storage }, {
      bytes: bytesOf('Class 11 Physics\n1. Units and measurement\n2. Kinematics'),
      contentType: 'text/plain',
      kind: 'syllabus',
    });
    assert.equal(captured.evidence.type, 'manual');

    const store = ST.createSupabaseIngestionStore(inDb);
    const result = await C.beginCaptureIngestion({
      store, studentId: STUDENT, now: clock(),
      facts: {
        evidenceId: captured.evidence.id,
        contentHash: captured.contentHash,
        storageRef: captured.evidence.storage_ref,
        byteSize: 60, contentType: 'text/plain', kind: 'syllabus', evidenceType: 'manual',
      },
      meta: { channel: 'web', kind: 'syllabus' },
    });

    assert.equal(result.status, 'running');
    assert.equal(inDb.tables.ingestion_stages[0].output.kind, 'syllabus');
  });

  test('re-uploading the same paper resumes ONE run and re-executes nothing', async () => {
    const evDb = fakeEvidenceDb();
    const storage = fakeStorage();
    const inDb = fakeIngestionDb();
    const store = ST.createSupabaseIngestionStore(inDb);
    const now = clock();

    const factsFor = (c) => ({
      evidenceId: c.evidence.id,
      contentHash: c.contentHash,
      storageRef: c.evidence.storage_ref,
      byteSize: PAPER.length,
      contentType: 'image/jpeg',
      kind: 'paper',
      evidenceType: c.evidence.type,
    });

    const first = await capture({ db: evDb, storage });
    const runA = await C.beginCaptureIngestion({
      store, studentId: STUDENT, facts: factsFor(first), now,
      existingRunId: await ST.findRunIdForEvidence(inDb, STUDENT, first.evidence.id),
    });

    const second = await capture({ db: evDb, storage });
    const runB = await C.beginCaptureIngestion({
      store, studentId: STUDENT, facts: factsFor(second), now,
      existingRunId: await ST.findRunIdForEvidence(inDb, STUDENT, second.evidence.id),
    });

    assert.equal(second.deduped, true);
    assert.equal(runB.runId, runA.runId, 'the same paper started a second run');
    assert.equal(runB.created, false);
    // The runner's idempotency guarantee, exercised by production: an unchanged
    // input hash reuses the stored attempt instead of appending a second one.
    assert.deepEqual(runB.reused, ['intake']);
    assert.deepEqual(runB.executed, []);
    assert.equal(inDb.tables.ingestion_runs.length, 1);
    assert.equal(inDb.tables.ingestion_stages.length, 1);
  });

  test('the ledger is append-only, and 008`s constraint is what says so', async () => {
    const inDb = fakeIngestionDb();
    const store = ST.createSupabaseIngestionStore(inDb);

    const run = await store.createRun({
      studentId: STUDENT, evidenceId: 'ev-1', status: 'running',
      confirmedAt: null, replayOf: null, createdAt: T0, meta: {},
    });

    const record = {
      runId: run.id, stage: 'intake', attempt: 1, version: '1', inputHash: 'h',
      status: 'succeeded', output: { ok: true }, confidence: null, model: null,
      startedAt: T0, completedAt: T0, durationMs: 1, failureReason: null,
    };

    await store.appendStage(record);
    await assert.rejects(
      () => store.appendStage(record),
      (err) => err.name === 'StageAppendConflict',
      'a second write of attempt 1 was accepted',
    );
    assert.equal(inDb.tables.ingestion_stages.length, 1);
  });

  test('the store round-trips every column 008 declares', async () => {
    const inDb = fakeIngestionDb();
    const store = ST.createSupabaseIngestionStore(inDb);

    const run = await store.createRun({
      studentId: STUDENT, evidenceId: 'ev-9', status: 'running',
      confirmedAt: null, replayOf: null, createdAt: T0, meta: { channel: 'web' },
    });
    const read = await store.getRun(run.id);
    assert.deepEqual(read, run);

    const written = await store.appendStage({
      runId: run.id, stage: 'intake', attempt: 1, version: '2', inputHash: 'hash',
      status: 'succeeded', output: { a: 1 }, confidence: 0.5, model: 'none',
      startedAt: T0, completedAt: T0, durationMs: 12, failureReason: null,
    });
    const [listed] = await store.listStages(run.id);
    assert.deepEqual(listed, written);
    assert.equal(listed.durationMs, 12);
    assert.equal(listed.confidence, 0.5);

    await store.setRunStatus(run.id, 'awaiting-confirmation');
    assert.equal((await store.getRun(run.id)).status, 'awaiting-confirmation');

    // Confirmation is a one-way door: re-confirming keeps the first moment.
    await store.confirmRun(run.id, '2026-08-15T12:00:00.000Z');
    await store.confirmRun(run.id, '2026-08-15T13:00:00.000Z');
    assert.equal((await store.getRun(run.id)).confirmedAt, '2026-08-15T12:00:00.000Z');
  });

  test('explainRun answers "where is my paper" from the shipped store', async () => {
    const evDb = fakeEvidenceDb();
    const storage = fakeStorage();
    const inDb = fakeIngestionDb();
    const store = ST.createSupabaseIngestionStore(inDb);

    const captured = await capture({ db: evDb, storage });
    const { runId } = await C.beginCaptureIngestion({
      store, studentId: STUDENT, now: clock(),
      facts: {
        evidenceId: captured.evidence.id, contentHash: captured.contentHash,
        storageRef: captured.evidence.storage_ref, byteSize: PAPER.length,
        contentType: 'image/jpeg', kind: 'paper', evidenceType: 'photo',
      },
    });

    const explained = await R.explainRun(store, runId);
    assert.equal(explained.stages.length, 13);
    const byId = Object.fromEntries(explained.stages.map(s => [s.stage, s]));
    assert.equal(byId.intake.status, 'succeeded');
    // Everything after intake is honestly not-run. This pass built the ledger,
    // not the reading.
    for (const id of T.STAGE_ORDER.slice(1)) {
      assert.equal(byId[id].status, 'not-run', `${id} claims to have run`);
    }
  });

  test('a run with no evidence fails rather than inventing one', async () => {
    const inDb = fakeIngestionDb();
    const store = ST.createSupabaseIngestionStore(inDb);
    const result = await C.beginCaptureIngestion({
      store, studentId: STUDENT, now: clock(),
      facts: {
        evidenceId: '', contentHash: 'x', storageRef: 'evidence/x/x',
        byteSize: 0, contentType: 'image/jpeg', kind: 'paper', evidenceType: 'photo',
      },
    });
    assert.equal(result.status, 'failed');
    const stage = inDb.tables.ingestion_stages[0];
    assert.equal(stage.status, 'failed');
    assert.equal(stage.output, null);
    assert.ok(stage.failure_reason, '008`s outcome-shape CHECK requires a reason');
  });
});
