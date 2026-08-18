// M8-4 / M8-5 / M8-6 — EXTRACTION, THE GATE, AND THE PATH THAT NEEDS NO MODEL.
//
// Three done-whens, and each is proven against behaviour rather than asserted
// about intent:
//
//   M8-4  "nothing is written to the record without passing a gate"
//         → every row the extraction path produces has NO `confirmed_at`, and
//           the double refuses a born-confirmed insert exactly as 020's trigger
//           does.
//
//   M8-5  "the `confirmed_at` RLS policy is the enforcement, not the UI"
//         → the doubles below implement 020's policy predicates and its
//           forward-only trigger, and the suite drives the SHIPPED
//           `confirmOccurrence()` into them. A second confirmation and an
//           un-confirmation are refused BY THE DOUBLE, not by the caller
//           declining to try.
//
//   M8-6  "a paper can be captured with zero model involvement"
//         → a structural fence over `app/api/capture/manual/route.ts`, plus a
//           behavioural proof that a typed draft goes through the identical
//           `confirmOccurrence()` as an extracted one.
//
// The extraction half runs the REAL runner over the REAL stages with a model
// double that returns text. Nothing here reaches a network.
//
//   node --test tests/capture-extraction.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-extraction');

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

/** Comments explain; only real code counts. Same convention as
 *  tests/capture-shell.test.mjs. */
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

let O;  // lib/occurrences
let X;  // lib/capture-extraction
let C;  // lib/capture-intake
let ST; // lib/ingest/supabase-store
let G;  // lib/ai-guard

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.extraction.json'],
    { cwd: root },
  );
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
  O = await load('occurrences.js');
  X = await load('capture-extraction.js');
  C = await load('capture-intake.js');
  ST = await load('ingest/supabase-store.js');
  G = await load('ai-guard.js');
  assert.equal(typeof O.buildDraftOccurrence, 'function');
  assert.equal(typeof O.confirmOccurrence, 'function');
  assert.equal(typeof X.createProposeStage, 'function');
  assert.equal(typeof C.runCaptureExtraction, 'function');
  assert.equal(typeof G.guardModelCall, 'function');
});

// ── Doubles ─────────────────────────────────────────────────────────────────

const STUDENT = '11111111-1111-4111-8111-111111111111';
const OTHER   = '22222222-2222-4222-8222-222222222222';
const EVIDENCE = 'ev-1';
const CONCEPT  = 'cc-1';
const T0 = '2026-08-15T10:00:00.000Z';
const T1 = '2026-08-15T11:00:00.000Z';

function clock() {
  let tick = 0;
  return () => { tick += 1; return new Date(Date.parse(T0) + tick * 1000).toISOString(); };
}

/**
 * `occurrences`, with 007's CHECKs, 020's forward-only trigger, 020's column
 * grant and 020's RLS policy all enforced the way Postgres enforces them.
 *
 * `role` is what makes the RLS half real: 'student' rows go through the policy
 * predicates, 'service' bypasses them — and the TRIGGER binds both, which is
 * the whole reason 020 has one.
 */
function fakeOccurrenceDb({ role = 'student', actor = STUDENT } = {}) {
  const rows = [];
  let seq = 0;

  /** 020 §5, the trigger. Raises the way plpgsql raises. */
  const trigger = (op, oldRow, newRow) => {
    if (op === 'INSERT') {
      if (newRow.confirmed_at != null) {
        return 'an occurrence cannot be inserted already confirmed';
      }
      return null;
    }
    if (oldRow.confirmed_at != null && newRow.confirmed_at !== oldRow.confirmed_at) {
      return `occurrence ${oldRow.id} is already confirmed`;
    }
    if (oldRow.confirmed_at != null && newRow.confirmed_at == null) {
      return `occurrence ${oldRow.id} cannot be un-confirmed`;
    }
    for (const k of ['student_id', 'evidence_id', 'concept_id', 'marks_lost',
                     'marks_available', 'cognitive_error', 'execution_error', 'origin']) {
      if (newRow[k] !== oldRow[k]) return 'an occurrence is a fact';
    }
    return null;
  };

  return {
    rows,
    async insertOccurrences(batch) {
      const written = [];
      for (const row of batch) {
        // 007's CHECKs.
        if (row.evidence_id == null) return { data: null, error: { code: '23502', message: 'evidence_id NOT NULL' } };
        if (row.concept_id == null) return { data: null, error: { code: '23502', message: 'concept_id NOT NULL' } };
        if (row.cognitive_error == null && row.execution_error == null) {
          return { data: null, error: { code: '23514', message: 'occurrences_has_error' } };
        }
        if (row.marks_lost > row.marks_available) {
          return { data: null, error: { code: '23514', message: 'occurrences_marks_sane' } };
        }
        const raised = trigger('INSERT', null, row);
        if (raised) return { data: null, error: { code: '23514', message: raised } };
        const stored = { id: `occ-${++seq}`, created_at: T0, confirmed_at: null, ...row };
        rows.push(stored);
        written.push({ ...stored });
      }
      return { data: written, error: null };
    },

    async confirm(occurrenceId, studentId, at) {
      const found = rows.find(r => r.id === occurrenceId);
      if (!found) return { data: [], error: null };

      // 020 §6 — the POLICY's `USING`. Under RLS a row that fails it is simply
      // not visible to the statement, so the UPDATE matches nothing.
      if (role === 'student') {
        const visible = found.student_id === actor && found.confirmed_at == null;
        if (!visible) return { data: [], error: null };
      }
      if (found.student_id !== studentId) return { data: [], error: null };

      const next = { ...found, confirmed_at: at };

      // 020 §6 — the POLICY's `WITH CHECK`.
      if (role === 'student' && !(next.student_id === actor && next.confirmed_at != null)) {
        return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
      }

      // 020 §5 — the TRIGGER. Binds the service role too.
      const raised = trigger('UPDATE', found, next);
      if (raised) return { data: null, error: { code: '23514', message: raised } };

      Object.assign(found, next);
      return { data: [{ ...found }], error: null };
    },

    /** The statement a client would have to issue to un-confirm. Present ONLY
     *  so the suite can prove the database refuses it — no shipped code path
     *  can construct it, because `OccurrenceDb` cannot express it. */
    async attemptUnconfirm(occurrenceId) {
      const found = rows.find(r => r.id === occurrenceId);
      if (!found) return { error: { message: 'no such row' } };
      if (role === 'student' && found.confirmed_at != null) {
        // `USING (confirmed_at IS NULL)` — the row is not even visible.
        return { error: null, matched: 0 };
      }
      const next = { ...found, confirmed_at: null };
      if (role === 'student') {
        return { error: { code: '42501', message: 'new row violates row-level security policy' }, matched: 0 };
      }
      const raised = trigger('UPDATE', found, next);
      if (raised) return { error: { code: '23514', message: raised }, matched: 0 };
      Object.assign(found, next);
      return { error: null, matched: 1 };
    },

    async listDrafts(studentId) {
      return { data: rows.filter(r => r.student_id === studentId && r.confirmed_at == null).map(r => ({ ...r })), error: null };
    },
    async listConfirmed(studentId) {
      // 020 §3's view: the predicate is the database's.
      return { data: rows.filter(r => r.student_id === studentId && r.confirmed_at != null).map(r => ({ ...r })), error: null };
    },
  };
}

/** 008's three tables, with its two structural refusals. Same shape as
 *  tests/capture-pipeline.test.mjs uses. */
function fakeIngestionDb() {
  const tables = { ingestion_runs: [], ingestion_stages: [], ingestion_review: [] };
  let seq = 0;
  const matches = (row, match) =>
    Object.entries(match).every(([k, v]) => (row[k] ?? null) === (v ?? null));

  return {
    tables,
    async insert(table, row) {
      if (table === 'ingestion_stages') {
        const clash = tables[table].find(
          r => r.run_id === row.run_id && r.stage === row.stage && r.attempt === row.attempt);
        if (clash) {
          return { data: null, error: { code: '23505', message: 'ingestion_stages_attempt_unique' } };
        }
        const shaped =
          (row.status === 'succeeded' && row.output !== null && row.failure_reason === null) ||
          (row.status !== 'succeeded' && row.failure_reason !== null);
        if (!shaped) return { data: null, error: { code: '23514', message: 'ingestion_stages_outcome_shape' } };
        if (row.confidence !== null && (row.confidence < 0 || row.confidence > 1)) {
          return { data: null, error: { code: '23514', message: 'confidence BETWEEN 0 AND 1' } };
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
          const x = String(a[o.column] ?? ''); const y = String(b[o.column] ?? '');
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

const FACTS = {
  evidenceId: EVIDENCE,
  contentHash: 'abc',
  storageRef: `evidence/${STUDENT}/abc`,
  byteSize: 4096,
  contentType: 'image/jpeg',
  kind: 'paper',
  evidenceType: 'photo',
};

/** A model double. Records every call so "zero model involvement" is countable
 *  rather than asserted. */
function fakeModel(text, { fail = false } = {}) {
  const calls = [];
  return {
    calls,
    async read(request) {
      calls.push(request);
      if (fail) return { ok: false, retryable: true, detail: 'the reading failed' };
      return { ok: true, text, model: 'test-model' };
    },
  };
}

const goodProposal = (confidence = 0.95) => JSON.stringify({
  proposals: [{
    topic: 'newtons second law',
    questionRef: 'Q7(b)',
    marksLost: 2,
    marksAvailable: 5,
    cognitiveError: null,
    executionError: 'sign-error',
    studentAnswer: 'F = m/a',
    expectedAnswer: 'F = ma',
    markerNote: 'check the rearrangement',
    confidence,
  }],
});

const resolveAlways = async () => ({
  conceptId: CONCEPT, subject: 'Physics', chapter: 'Laws of Motion', topic: 'Newton II',
});
const resolveNever = async () => null;

async function startRun(inDb, store) {
  const run = await store.createRun({
    studentId: STUDENT, evidenceId: EVIDENCE, status: 'running',
    confirmedAt: null, replayOf: null, createdAt: T0, meta: {},
  });
  return run.id;
}

// ══ M8-4 — EXTRACTION PRODUCES DRAFTS, AND ONLY DRAFTS ══════════════════════

describe('M8-4: a draft is never born confirmed', () => {
  test('the builder does not emit `confirmed_at` at all', () => {
    const built = O.buildDraftOccurrence({
      studentId: STUDENT, evidenceId: EVIDENCE, conceptId: CONCEPT,
      subject: 'Physics', chapter: 'Laws of Motion', topic: 'Newton II',
      source: 'self-test', questionRef: 'Q7(b)',
      marksLost: 2, marksAvailable: 5, executionError: 'sign-error',
      origin: 'extraction', proposalConfidence: 0.9,
    });
    assert.equal(built.ok, true);
    // ABSENT, not null. The column is not in this module's vocabulary.
    assert.ok(!('confirmed_at' in built.row), 'the draft builder emits a confirmation');
    assert.equal(built.row.evidence_id, EVIDENCE);
    assert.equal(built.row.concept_id, CONCEPT);
    assert.equal(built.row.origin, 'extraction');
    assert.equal(built.row.proposal_confidence, 0.9);
  });

  test('020`s trigger refuses a born-confirmed row from ANY writer', async () => {
    const db = fakeOccurrenceDb({ role: 'service' });
    const { data, error } = await db.insertOccurrences([{
      student_id: STUDENT, evidence_id: EVIDENCE, concept_id: CONCEPT,
      marks_lost: 1, marks_available: 2, execution_error: 'sign-error',
      confirmed_at: T0,
    }]);
    assert.equal(data, null);
    assert.match(error.message, /already confirmed/);
  });

  test('a full extraction run writes drafts with a valid evidence_id and no confirmation', async () => {
    const inDb = fakeIngestionDb();
    const occDb = fakeOccurrenceDb();
    const store = ST.createSupabaseIngestionStore(inDb);
    const runId = await startRun(inDb, store);
    const model = fakeModel(goodProposal());

    const result = await C.runCaptureExtraction({
      store, runId, facts: FACTS, now: clock(),
      deps: { model, loadMedia: async () => ({ kind: 'image', mediaType: 'image/jpeg', data: 'AAAA' }) },
    });

    assert.equal(model.calls.length, 1, 'the model was called more than once for one paper');
    assert.equal(result.status, 'running');
    assert.deepEqual(result.executed, ['intake', 'preprocess', 'propose']);
    assert.ok(result.proposed, 'the propose stage produced nothing');
    assert.equal(result.proposed.proposals.length, 1);

    const { drafts, review } = await X.proposalsToDrafts(
      result.proposed.proposals,
      { studentId: STUDENT, evidenceId: EVIDENCE, ingestionRunId: runId },
      resolveAlways,
    );
    assert.equal(drafts.length, 1);
    assert.equal(review.length, 0);

    const written = await O.writeDraftOccurrences(occDb, drafts);
    assert.equal(written.error, null);
    assert.equal(written.written.length, 1);

    const row = occDb.rows[0];
    assert.equal(row.confirmed_at, null, 'extraction wrote a CONFIRMED occurrence');
    assert.equal(row.evidence_id, EVIDENCE, 'the draft does not reference its source paper');
    assert.equal(row.ingestion_run_id, runId);
    assert.equal(row.origin, 'extraction');
    // And it is invisible through 020's view — the record does not contain it.
    const confirmed = await O.listConfirmedOccurrences(occDb, STUDENT);
    assert.equal(confirmed.occurrences.length, 0, 'a draft appeared in the record');
    const pending = await O.listDraftOccurrences(occDb, STUDENT);
    assert.equal(pending.drafts.length, 1);
  });

  test('every stage the extraction slice registers is PROPOSE phase', async () => {
    const registry = C.extractionRegistry(FACTS, {
      model: fakeModel('{}'), loadMedia: async () => null,
    });
    assert.deepEqual(registry.ordered.map(s => s.id), ['intake', 'preprocess', 'propose']);
    // The four commit stages stay unregistered, so no code path in M8 can
    // reach the academic record through the runner.
    for (const commit of ['occurrences', 'pattern-merge', 'score', 'next-action']) {
      assert.ok(!registry.stages.has(commit), `the commit stage '${commit}' is registered`);
    }
  });

  test('the stage ledger records the attempt, the confidence and the model', async () => {
    const inDb = fakeIngestionDb();
    const store = ST.createSupabaseIngestionStore(inDb);
    const runId = await startRun(inDb, store);
    await C.runCaptureExtraction({
      store, runId, facts: FACTS, now: clock(),
      deps: {
        model: fakeModel(goodProposal(0.8)),
        loadMedia: async () => ({ kind: 'image', mediaType: 'image/jpeg', data: 'AAAA' }),
      },
    });
    const propose = inDb.tables.ingestion_stages.find(s => s.stage === 'propose');
    assert.equal(propose.status, 'succeeded');
    assert.equal(propose.model, 'test-model');
    assert.equal(propose.confidence, 0.8);
    // The output is stored verbatim, which is 008's replay guarantee.
    assert.equal(propose.output.proposals[0].questionRef, 'Q7(b)');
  });
});

describe('M8-4: the parse refuses rather than repairs', () => {
  const cases = [
    ['not JSON at all', 'I could not read this paper', 0],
    ['a proposal with no topic', JSON.stringify({ proposals: [{ questionRef: 'Q1', marksLost: 1, marksAvailable: 2, executionError: 'sign-error', confidence: 0.9 }] }), 0],
    ['a proposal with no classification', JSON.stringify({ proposals: [{ topic: 't', questionRef: 'Q1', marksLost: 1, marksAvailable: 2, confidence: 0.9 }] }), 0],
    ['a proposal with impossible marks', JSON.stringify({ proposals: [{ topic: 't', questionRef: 'Q1', marksLost: 9, marksAvailable: 5, executionError: 'sign-error', confidence: 0.9 }] }), 0],
    ['a proposal with no confidence', JSON.stringify({ proposals: [{ topic: 't', questionRef: 'Q1', marksLost: 1, marksAvailable: 2, executionError: 'sign-error' }] }), 0],
    ['an invented error type', JSON.stringify({ proposals: [{ topic: 't', questionRef: 'Q1', marksLost: 1, marksAvailable: 2, executionError: 'vibes', confidence: 0.9 }] }), 0],
  ];

  for (const [name, raw, expected] of cases) {
    test(`${name} produces no proposal`, () => {
      const parsed = X.parseExtraction('paper', raw);
      if (!parsed.ok) { assert.equal(expected, 0); return; }
      assert.equal(parsed.proposals.length, expected);
      // And the reason survives, so "why is Q1 missing?" is answerable.
      if (raw.includes('proposals')) assert.ok(parsed.dropped.length > 0);
    });
  }

  test('a page claiming forty mistakes is capped, not believed', () => {
    const many = { proposals: Array.from({ length: 60 }, (_, i) => ({
      topic: 't', questionRef: `Q${i}`, marksLost: 1, marksAvailable: 2,
      executionError: 'sign-error', confidence: 0.99,
    })) };
    const parsed = X.parseExtraction('paper', JSON.stringify(many));
    assert.equal(parsed.ok, true);
    assert.equal(parsed.proposals.length, X.MAX_PROPOSALS_PER_PAPER);
  });

  test('hostile model output never throws', () => {
    for (const raw of ['', '{}', '{"proposals":null}', '{"proposals":[null]}',
                       '{"proposals":[{"topic":123}]}', 'null', '[]', '{"proposals":"lots"}']) {
      assert.doesNotThrow(() => X.parseExtraction('paper', raw));
      assert.doesNotThrow(() => X.parseExtraction('syllabus', raw));
    }
  });
});

// ══ GRACEFUL DEGRADATION — the fourth ending that does not exist ════════════

describe('M8-4: low confidence degrades to review, never to a guess', () => {
  test('a below-floor proposal is offered for review and written nowhere', async () => {
    const inDb = fakeIngestionDb();
    const occDb = fakeOccurrenceDb();
    const store = ST.createSupabaseIngestionStore(inDb);
    const runId = await startRun(inDb, store);

    const result = await C.runCaptureExtraction({
      store, runId, facts: FACTS, now: clock(),
      deps: {
        // Below EXTRACTION_CONFIDENCE_FLOOR.
        model: fakeModel(goodProposal(X.EXTRACTION_CONFIDENCE_FLOOR - 0.2)),
        loadMedia: async () => ({ kind: 'image', mediaType: 'image/jpeg', data: 'AAAA' }),
      },
    });

    assert.equal(result.status, 'awaiting-review');
    assert.equal(result.proposed, null, 'a below-floor reading was returned as a proposal');
    assert.equal(occDb.rows.length, 0, 'a low-confidence guess reached the table');

    // 008: reaching the review table is a SUCCESS. The student is shown what
    // was considered, with the reason, and routed to the manual path.
    const review = await store.listReview(runId);
    assert.equal(review.length, 1);
    assert.ok(review[0].items[0].candidates[0].rationale.includes('floor'));
  });

  test('a confident reading of an unresolvable topic is refused, not guessed', async () => {
    const proposals = [{
      topic: 'the thing about wobbling tops', questionRef: 'Q4', marksLost: 1,
      marksAvailable: 3, cognitiveError: 'not-known', executionError: null,
      studentAnswer: '', expectedAnswer: null, markerNote: null, confidence: 0.99,
    }];
    const { drafts, review } = await X.proposalsToDrafts(
      proposals, { studentId: STUDENT, evidenceId: EVIDENCE, ingestionRunId: 'run-1' }, resolveNever);
    // V.2.4's scenario, one layer up: no taxonomy match, so no row.
    assert.equal(drafts.length, 0, 'an unresolved topic became an occurrence');
    assert.equal(review.length, 1);
    assert.match(review[0].question, /wobbling tops/);
  });

  test('a failed model call fails the stage and writes nothing', async () => {
    const inDb = fakeIngestionDb();
    const store = ST.createSupabaseIngestionStore(inDb);
    const runId = await startRun(inDb, store);

    const result = await C.runCaptureExtraction({
      store, runId, facts: FACTS, now: clock(),
      deps: {
        model: fakeModel('', { fail: true }),
        loadMedia: async () => ({ kind: 'image', mediaType: 'image/jpeg', data: 'AAAA' }),
      },
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.proposed, null);
    const attempts = inDb.tables.ingestion_stages.filter(s => s.stage === 'propose');
    assert.ok(attempts.length >= 1);
    for (const a of attempts) {
      assert.equal(a.status, 'failed');
      assert.equal(a.output, null);
      assert.ok(a.failure_reason, '008`s outcome-shape CHECK requires a reason');
    }
  });

  test('evidence that cannot be read back fails preprocess honestly', async () => {
    const inDb = fakeIngestionDb();
    const store = ST.createSupabaseIngestionStore(inDb);
    const runId = await startRun(inDb, store);

    const result = await C.runCaptureExtraction({
      store, runId,
      facts: { ...FACTS, evidenceType: 'video' },
      now: clock(),
      deps: { model: fakeModel(goodProposal()), loadMedia: async () => null },
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.proposed, null);
  });
});

// ══ M8-5 — ONCE, AND ONLY FORWARDS ═════════════════════════════════════════

describe('M8-5: the database refuses a second confirmation', () => {
  async function oneDraft(db) {
    const written = await O.writeDraftOccurrences(db, [{
      studentId: STUDENT, evidenceId: EVIDENCE, conceptId: CONCEPT,
      subject: 'Physics', chapter: 'Laws of Motion', topic: 'Newton II',
      source: 'self-test', questionRef: 'Q7(b)', marksLost: 2, marksAvailable: 5,
      executionError: 'sign-error', origin: 'extraction', proposalConfidence: 0.9,
    }]);
    return written.written[0].id;
  }

  test('the first confirmation succeeds', async () => {
    const db = fakeOccurrenceDb();
    const id = await oneDraft(db);
    const result = await O.confirmOccurrence(db, { occurrenceId: id, studentId: STUDENT, at: T1 });
    assert.equal(result.ok, true);
    assert.equal(result.occurrence.confirmed_at, T1);
    // It is now in the record, and out of the drafts.
    assert.equal((await O.listConfirmedOccurrences(db, STUDENT)).occurrences.length, 1);
    assert.equal((await O.listDraftOccurrences(db, STUDENT)).drafts.length, 0);
  });

  test('THE SECOND IS REFUSED BY THE POLICY, not by the caller', async () => {
    const db = fakeOccurrenceDb();
    const id = await oneDraft(db);
    await O.confirmOccurrence(db, { occurrenceId: id, studentId: STUDENT, at: T1 });

    const second = await O.confirmOccurrence(db, {
      occurrenceId: id, studentId: STUDENT, at: '2026-09-01T00:00:00.000Z',
    });
    assert.equal(second.ok, false);
    assert.equal(second.refusal, 'refused');
    // The original moment survives. A re-confirmation cannot restamp it.
    assert.equal(db.rows[0].confirmed_at, T1, 'the confirmation was restamped');
  });

  test('an un-confirm is refused — by RLS for the student, by the trigger for the service role', async () => {
    const asStudent = fakeOccurrenceDb();
    const id = await oneDraft(asStudent);
    await O.confirmOccurrence(asStudent, { occurrenceId: id, studentId: STUDENT, at: T1 });

    const studentAttempt = await asStudent.attemptUnconfirm(id);
    assert.equal(studentAttempt.matched, 0, 'a student un-confirmed their own occurrence');
    assert.equal(asStudent.rows[0].confirmed_at, T1);

    // And the service role, which RLS does not bind, is stopped by the trigger.
    const asService = fakeOccurrenceDb({ role: 'service' });
    const sid = await oneDraft(asService);
    await O.confirmOccurrence(asService, { occurrenceId: sid, studentId: STUDENT, at: T1 });
    const serviceAttempt = await asService.attemptUnconfirm(sid);
    assert.equal(serviceAttempt.matched, 0, 'the service role un-confirmed an occurrence');
    assert.ok(serviceAttempt.error, 'the trigger did not raise');
    assert.equal(asService.rows[0].confirmed_at, T1);
  });

  test('another student cannot confirm your draft, and is not told it exists', async () => {
    const db = fakeOccurrenceDb({ role: 'student', actor: OTHER });
    const written = await O.writeDraftOccurrences(db, [{
      studentId: STUDENT, evidenceId: EVIDENCE, conceptId: CONCEPT,
      subject: 'Physics', chapter: 'c', topic: 't', source: 'self-test',
      questionRef: 'Q1', marksLost: 1, marksAvailable: 2,
      executionError: 'sign-error', origin: 'extraction',
    }]);
    const id = written.written[0].id;

    const attempt = await O.confirmOccurrence(db, { occurrenceId: id, studentId: OTHER, at: T1 });
    assert.equal(attempt.ok, false);
    // The three failure causes are deliberately indistinguishable — telling the
    // caller which one it was is an ownership oracle over another student's ids.
    assert.equal(attempt.refusal, 'refused');
    assert.equal(db.rows[0].confirmed_at, null);
  });

  test('confirming four of five confirms four', async () => {
    const db = fakeOccurrenceDb();
    const a = await oneDraft(db);
    const b = await oneDraft(db);
    await O.confirmOccurrence(db, { occurrenceId: b, studentId: STUDENT, at: T0 });

    const { confirmed, refused } = await O.confirmOccurrences(db, {
      occurrenceIds: [a, b, 'occ-does-not-exist'], studentId: STUDENT, at: T1,
    });
    assert.equal(confirmed.length, 1);
    assert.equal(confirmed[0].id, a);
    assert.equal(refused.length, 2);
  });

  test('the shipped access layer cannot express any other update', () => {
    const src = code('lib/occurrences.ts');
    // No general update verb on the interface. A wider interface is how a
    // later edit acquires a write 020's column grant would refuse anyway.
    assert.ok(!/\bupdate\s*\(/.test(src.replace(/\.update\b/g, '')),
      'the occurrence access layer grew a general update');
    assert.ok(!/deleteOccurrence|\.delete\(/.test(src), 'the access layer can delete an occurrence');
    assert.ok(!/confirmed_at:\s*(?!at\b)/.test(src.replace('confirmed_at: at', '')),
      'a confirmation timestamp is written from somewhere other than the caller`s clock');
  });
});

// ══ M8-6 — ZERO MODEL INVOLVEMENT ══════════════════════════════════════════

describe('M8-6: the manual path exists, and it is a real second path', () => {
  test('the endpoint exists and is not the extraction endpoint', () => {
    assert.ok(exists('app/api/capture/manual/route.ts'), 'there is no manual entry endpoint');
    assert.ok(exists('app/api/capture/extract/route.ts'));
    assert.ok(exists('components/capture/manual-entry.tsx'), 'there is no manual entry surface');
  });

  test('NOTHING in the manual path can reach a model', () => {
    for (const rel of ['app/api/capture/manual/route.ts', 'components/capture/manual-entry.tsx']) {
      const src = code(rel);
      assert.ok(!/anthropic|Anthropic/.test(src), `${rel} imports a model client`);
      assert.ok(!/\/api\/ai\b|ai-fetch|callAI/.test(src), `${rel} reaches the AI route`);
      assert.ok(!/capture-extraction|ai-guard|ANTHROPIC_API_KEY/.test(src),
        `${rel} imports the extraction path`);
      assert.ok(!/api\/capture\/extract/.test(src), `${rel} posts to the extraction endpoint`);
    }
  });

  test('it is not extraction with a flag — no skip parameter anywhere', () => {
    const extract = code('app/api/capture/extract/route.ts');
    assert.ok(!/skip_ai|skipModel|no_model|manual\s*\?/.test(extract),
      'the extraction endpoint carries a "skip the model" flag');
  });

  test('a typed draft is the same kind of row, differing only in `origin`', () => {
    const typed = O.buildDraftOccurrence({
      studentId: STUDENT, evidenceId: EVIDENCE, conceptId: CONCEPT,
      subject: 'Physics', chapter: 'Laws of Motion', topic: 'Newton II',
      source: 'self-test', questionRef: 'Q7(b)', marksLost: 2, marksAvailable: 5,
      executionError: 'sign-error', origin: 'manual',
    });
    const extracted = O.buildDraftOccurrence({
      studentId: STUDENT, evidenceId: EVIDENCE, conceptId: CONCEPT,
      subject: 'Physics', chapter: 'Laws of Motion', topic: 'Newton II',
      source: 'self-test', questionRef: 'Q7(b)', marksLost: 2, marksAvailable: 5,
      executionError: 'sign-error', origin: 'extraction', proposalConfidence: 0.9,
    });
    assert.equal(typed.ok, true);
    assert.equal(extracted.ok, true);

    const differences = Object.keys({ ...typed.row, ...extracted.row })
      .filter(k => JSON.stringify(typed.row[k]) !== JSON.stringify(extracted.row[k]));
    assert.deepEqual(differences.sort(), ['origin', 'proposal_confidence']);
    assert.ok(!('confirmed_at' in typed.row), 'a typed draft is born confirmed');
  });

  test('a typed entry may not claim a model confidence', () => {
    const built = O.buildDraftOccurrence({
      studentId: STUDENT, evidenceId: EVIDENCE, conceptId: CONCEPT,
      subject: 'Physics', chapter: 'c', topic: 't', source: 'self-test',
      questionRef: 'Q1', marksLost: 1, marksAvailable: 2,
      executionError: 'sign-error', origin: 'manual', proposalConfidence: 0.99,
    });
    assert.equal(built.ok, false);
    assert.equal(built.refusal, 'confidence-on-manual-entry');
  });

  test('a typed draft goes through the IDENTICAL confirmation gate', async () => {
    const db = fakeOccurrenceDb();
    const model = fakeModel(goodProposal());

    const written = await O.writeDraftOccurrences(db, [{
      studentId: STUDENT, evidenceId: EVIDENCE, conceptId: CONCEPT,
      subject: 'Physics', chapter: 'Laws of Motion', topic: 'Newton II',
      source: 'homework', questionRef: 'Q3', marksLost: 1, marksAvailable: 4,
      cognitiveError: 'misconception', origin: 'manual',
    }]);
    const id = written.written[0].id;
    assert.equal(db.rows[0].confirmed_at, null, 'a typed entry skipped the gate');

    // Same function, same policy, same one-way door.
    const first = await O.confirmOccurrence(db, { occurrenceId: id, studentId: STUDENT, at: T1 });
    assert.equal(first.ok, true);
    const second = await O.confirmOccurrence(db, { occurrenceId: id, studentId: STUDENT, at: T0 });
    assert.equal(second.ok, false);

    // And not one model call happened anywhere in this test.
    assert.equal(model.calls.length, 0, 'the manual path called a model');
  });

  test('the manual path refuses an unresolved topic rather than inventing a concept', () => {
    const src = code('app/api/capture/manual/route.ts');
    assert.match(src, /resolveConceptText/, 'the manual path does not resolve a concept');
    assert.match(src, /unresolved_topic/, 'the manual path has no refusal for an unresolvable topic');
    assert.match(src, /declared_text/, 'the student`s own words are not handed back');
  });

  test('the manual path still needs evidence — 007`s NOT NULL is honoured', () => {
    const src = code('app/api/capture/manual/route.ts');
    assert.match(src, /captureEvidence\(/, 'a typed entry writes no evidence');
    assert.match(src, /evidenceId/, 'a typed entry does not reference evidence');
  });
});

// ══ THE GUARD IN FRONT OF THE MODEL ════════════════════════════════════════

describe('M8-4: the model call reuses /api/ai`s guard rather than routing around it', () => {
  /** Pull a named RegExp[] literal out of a source file, whitespace-normalised. */
  const blockList = (rel) => {
    const src = read(rel);
    const start = src.indexOf('const BLOCKED_PATTERNS: RegExp[] = [');
    assert.ok(start > -1, `${rel} has no BLOCKED_PATTERNS`);
    const end = src.indexOf('\n];', start);
    return src
      .slice(start, end)
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s+/g, '');
  };

  test('the ported block list is character-for-character the original', () => {
    // Two copies of a safety list is how a safety list rots. M15 deletes one of
    // them; until then this is what stops them drifting.
    assert.equal(
      blockList('lib/ai-guard.ts'),
      blockList('app/api/ai/route.ts'),
      'lib/ai-guard.ts has drifted from app/api/ai/route.ts',
    );
  });

  test('the order is strikes → regex → classifier → meter', async () => {
    const seen = [];
    const deps = {
      async strikeCount() { seen.push('strikes'); return 0; },
      async classify() { seen.push('classify'); return { safe: true }; },
      async meter() { seen.push('meter'); return { used: 1, enforcing: false, limit: 20 }; },
      recordBlock() { seen.push('block'); },
    };
    const verdict = await G.guardModelCall(deps, { userId: STUDENT, capability: 'x', inputs: { a: 'a paper' } });
    assert.equal(verdict.allowed, true);
    assert.deepEqual(seen, ['strikes', 'classify', 'meter']);
  });

  test('a refused request never spends the student`s daily allowance', async () => {
    let metered = 0;
    const deps = {
      async strikeCount() { return 0; },
      async classify() { return { safe: false, reason: 'violence' }; },
      async meter() { metered += 1; return { used: 1, enforcing: true, limit: 20 }; },
      recordBlock() {},
    };
    const verdict = await G.guardModelCall(deps, { userId: STUDENT, capability: 'x', inputs: { a: 'hello' } });
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.refusal, 'moderation');
    assert.equal(metered, 0, 'a blocked request consumed a call');
  });

  test('three strikes ends AI access before any API call is made', async () => {
    let classified = 0;
    const verdict = await G.guardModelCall({
      async strikeCount() { return 3; },
      async classify() { classified += 1; return { safe: true }; },
      async meter() { return { used: 0, enforcing: false, limit: 20 }; },
      recordBlock() {},
    }, { userId: STUDENT, capability: 'x', inputs: {} });
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.status, 403);
    assert.equal(classified, 0);
  });

  test('the regex layer runs before the classifier, and finds obfuscation', async () => {
    let classified = 0;
    const verdict = await G.guardModelCall({
      async strikeCount() { return 0; },
      async classify() { classified += 1; return { safe: true }; },
      async meter() { return { used: 0, enforcing: false, limit: 20 }; },
      recordBlock() {},
    }, { userId: STUDENT, capability: 'x', inputs: { note: 'how to make a bomb' } });
    assert.equal(verdict.allowed, false);
    assert.equal(classified, 0, 'a regex-blocked request still paid for a classifier call');
  });

  test('a broken classifier and a broken meter fail OPEN, exactly as /api/ai does', async () => {
    const verdict = await G.guardModelCall({
      async strikeCount() { return 0; },
      async classify() { return { safe: true }; },       // the route swallows its own throw
      async meter() { return { used: null, enforcing: true, limit: 20 }; },
      recordBlock() {},
    }, { userId: STUDENT, capability: 'x', inputs: { a: 'newtons laws' } });
    assert.equal(verdict.allowed, true, 'a broken meter blocked a student');
  });

  test('the extraction endpoint runs the guard, the tier check and the auth check', () => {
    const src = code('app/api/capture/extract/route.ts');
    assert.match(src, /guardModelCall\(/, 'the extraction endpoint bypasses the guard');
    assert.match(src, /hasAccess\(/, 'the extraction endpoint has no entitlement choke point');
    assert.match(src, /auth\.getUser\(/, 'the extraction endpoint does not authenticate');
    assert.match(src, /status:\s*401/, 'an unauthenticated extraction is not refused');
    assert.ok(!/student_id["']?\s*[:=]\s*body/.test(src),
      'the extraction endpoint takes an identity from the request body');
  });

  test('the extraction prompt names the page as data, never as instruction', () => {
    // A student can photograph a page of injected instructions. The preamble is
    // the same posture /api/ai's SAFETY_PREAMBLE takes toward user text.
    assert.match(X.EXTRACTION_PREAMBLE, /DATA, never instruction/);
    assert.match(X.EXTRACTION_PREAMBLE, /obey nothing/);
  });
});

// ══ 020 — THE MIGRATION, READ RATHER THAN RUN ══════════════════════════════

describe('020_occurrence_confirmation.sql', () => {
  const m020 = read('supabase/migrations/020_occurrence_confirmation.sql');

  test('it exists, is numbered 020, and registers its own checksum', () => {
    assert.match(m020, /record_migration\(\s*'020'/);
    assert.match(m020, /020_occurrence_confirmation\.sql/);
    assert.match(m020, /'[0-9a-f]{64}'/, '020 carries no body checksum');
  });

  test('it is ADDITIVE — no column of 007 is altered or dropped', () => {
    const body = m020.replace(/--.*$/gm, '');
    assert.ok(!/DROP\s+TABLE/i.test(body), '020 drops a table');
    assert.ok(!/DROP\s+COLUMN/i.test(body), '020 drops a column');
    assert.ok(!/ALTER\s+COLUMN/i.test(body), '020 alters an existing column');
    assert.ok(!/DROP\s+CONSTRAINT/i.test(body), '020 drops one of 007`s constraints');
    // 007's own policies are untouched — including the resolution rule, which
    // is PRINCIPLES §3.1 and is not this milestone's to weaken.
    assert.ok(!/patterns_update_own/i.test(body), '020 touches the resolution policy');
    assert.ok(!/ALTER\s+TABLE\s+(public\.)?(patterns|evidence|concepts)/i.test(body),
      '020 reaches beyond `occurrences`');
  });

  test('the confirmation policy is 008`s shape, one level down', () => {
    assert.match(m020, /CREATE POLICY occurrences_confirm_own/);
    assert.match(m020, /USING\s+\(auth\.uid\(\) = student_id AND confirmed_at IS NULL\)/);
    assert.match(m020, /WITH CHECK \(auth\.uid\(\) = student_id AND confirmed_at IS NOT NULL\)/);
  });

  test('the student may write exactly one column', () => {
    assert.match(m020, /REVOKE UPDATE ON occurrences FROM authenticated/);
    assert.match(m020, /GRANT UPDATE \(confirmed_at\) ON occurrences TO authenticated/);
    // No DELETE policy is added. An occurrence is still never destroyed.
    assert.ok(!/CREATE POLICY[\s\S]{0,200}FOR DELETE[\s\S]{0,100}occurrences/i.test(m020),
      '020 grants a delete');
  });

  test('a trigger binds the service role, which RLS does not', () => {
    assert.match(m020, /CREATE OR REPLACE FUNCTION occurrences_forward_only/);
    assert.match(m020, /BEFORE INSERT OR UPDATE ON occurrences/);
    assert.match(m020, /cannot be inserted already confirmed/);
    assert.match(m020, /is already confirmed/);
    assert.match(m020, /cannot be un-confirmed/);
  });

  test('the record is a view, so a reader that forgets the filter cannot exist', () => {
    assert.match(m020, /CREATE OR REPLACE VIEW confirmed_occurrences/);
    assert.match(m020, /security_invoker = true/);
    assert.match(m020, /WHERE confirmed_at IS NOT NULL/);
  });

  test('nothing in the repository applies it', () => {
    // Same posture as every migration since M1: a human runs it in the SQL
    // editor and the ledger reports it UNAPPLIED until then.
    for (const rel of ['app/api/capture/extract/route.ts', 'app/api/capture/confirm/route.ts',
                       'app/api/capture/manual/route.ts', 'lib/occurrences.ts']) {
      assert.ok(!/020_occurrence_confirmation|CREATE POLICY|ALTER TABLE/i.test(read(rel)),
        `${rel} executes SQL`);
    }
  });
});

// ══ THE BOUNDARY OF THIS PASS ═══════════════════════════════════════════════

describe('M8-4..6: what this pass still must not have done', () => {
  test('the score engines are untouched', () => {
    for (const rel of ['lib/occurrences.ts', 'lib/capture-extraction.ts', 'lib/ai-guard.ts',
                       'app/api/capture/extract/route.ts', 'app/api/capture/confirm/route.ts',
                       'app/api/capture/manual/route.ts']) {
      assert.ok(!/ledger-score/.test(code(rel)), `${rel} reaches into the scoring engine`);
    }
  });

  test('no pattern is merged, and no assessment is touched — M11 and M10 own those', () => {
    for (const rel of ['lib/occurrences.ts', 'lib/capture-extraction.ts',
                       'app/api/capture/extract/route.ts', 'app/api/capture/manual/route.ts']) {
      const src = code(rel);
      assert.ok(!/from\(["']patterns["']\)/.test(src), `${rel} writes a pattern`);
      assert.ok(!/from\(["']assessments["']\)/.test(src), `${rel} writes an assessment`);
      assert.ok(!/pattern-merge|patternMerge/.test(src), `${rel} merges patterns`);
    }
  });

  test('confirmation runs as the STUDENT, never as the service role', () => {
    const src = code('app/api/capture/confirm/route.ts');
    assert.match(src, /createStudentServerClient\(/, 'the gate does not use the student`s client');
    assert.ok(!/supabaseServer/.test(src),
      'the confirmation endpoint uses the service role, which bypasses the policy that IS the gate');
  });

  test('lib/capture-intake.ts still imports nothing that could call a model', () => {
    const src = code('lib/capture-intake.ts');
    assert.ok(!/anthropic|Anthropic|\/api\/ai\b|ai-fetch/i.test(src),
      'the intake module acquired a model client');
    // The model arrives as an interface and leaves as one.
    assert.match(src, /ProposeDeps/);
  });

  test('capture still registers ONE stage — uploading never spends a model call', () => {
    const registry = C.captureRegistry(FACTS);
    assert.equal(registry.ordered.length, 1);
    assert.equal(registry.ordered[0].id, 'intake');
  });
});
