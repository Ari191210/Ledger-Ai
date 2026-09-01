// M7 (part 1: M7-1 … M7-4) — the Academic Event layer and the audit trail.
//
// Four kinds of assertion live here, and the difference matters:
//
//   1. BEHAVIOURAL, against the real compiled modules. Every one of the four
//      done-when conditions is a property of a pure function, so every one is
//      PROVABLE with no database in reach:
//
//        M7-1  ordering is by server `seq`, never client `occurred_at` (R.10)
//        M7-2  an invalid event QUARANTINES — it is neither dropped nor written
//              malformed — and a duplicate `client_event_id` is idempotent
//        M7-3  a retry cannot regenerate `client_event_id` (T7)
//        M7-4  the hash chain detects an edited, deleted or reordered entry
//
//   2. CROSS-CHECKED AGAINST THE SQL. The event-type CHECK in 015 and
//      `EVENT_TYPES` in `lib/event-contract.ts` are two statements of one list;
//      the source restrictions likewise. A test that reads both and compares
//      them is the only thing that stops them drifting, because no compiler
//      sees the SQL.
//
//   3. STRUCTURAL, over source and SQL, for claims about shape rather than the
//      value of an expression — that 015/016 are additive, that neither grants
//      an UPDATE or DELETE policy, that both register themselves in the M1
//      ledger with a checksum matching their own body, and that this pass did
//      not touch `lib/sync.ts` or `components/sync-manager.tsx`. Same convention
//      as tests/concepts.test.mjs and tests/student-context.test.mjs.
//
//   4. KNOWN-ANSWER, for `lib/sha256.ts`. A hand-written hash that is wrong is
//      worse than no hash at all, so it is checked against the published
//      vectors before anything is built on it.
//
//   node --test tests/academic-events.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { checksumOf, REGISTRATION_SENTINEL } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-events');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

// Comments name what was removed and why. Only real code counts.
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

const SQL_015 = 'supabase/migrations/015_academic_events.sql';
const SQL_016 = 'supabase/migrations/016_audit_entries.sql';

let H;   // lib/sha256.ts
let C;   // lib/event-contract.ts
let I;   // lib/event-ingest.ts
let O;   // lib/event-outbox.ts
let A;   // lib/audit.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.events.json'],
    { cwd: root, stdio: 'inherit' },
  );
  // tsc emits extensionless relative imports; Node's ESM resolver requires the
  // extension. Same post-compile rewrite tests/ingest-runner.test.mjs uses.
  const walk = dir => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.js')) continue;
      fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(
        /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
        (m, a, spec, z) => (spec.endsWith('.js') ? m : `${a}${spec}.js${z}`),
      ));
    }
  };
  walk(outDir);
});

before(async () => {
  const load = f => import(pathToFileURL(path.join(outDir, f)).href);
  [H, C, I, O, A] = await Promise.all([
    load('sha256.js'),
    load('event-contract.js'),
    load('event-ingest.js'),
    load('event-outbox.js'),
    load('audit.js'),
  ]);
});

// ── fixtures ───────────────────────────────────────────────────────────────

const STUDENT = '11111111-1111-4111-8111-111111111111';
const CONCEPT = '22222222-2222-4222-8222-222222222222';

/** A valid, minimal, student-declaration event. Everything below either uses
 *  this or breaks it in exactly one way, so a failure names its own cause. */
const validDraft = (over = {}) => ({
  client_event_id: 'e1_abc123',
  schema_version: 1,
  occurred_at: '2026-08-15T10:00:00.000Z',
  event_type: 'EXTERNAL_STUDY_DECLARED',
  surface: 'web',
  source: 'student_declaration',
  payload: { declared_text: 'refraction through a prism' },
  ...over,
});

const ctx = (over = {}) => ({
  studentId: STUDENT,
  receivedAtMs: Date.parse('2026-08-15T10:00:02.000Z'),
  ...over,
});

// ═══════════════════════════════════════════════════════════════════════════
describe('lib/sha256.ts — known answers before anything is built on it', () => {
  test('matches the published SHA-256 vectors', () => {
    assert.equal(
      H.sha256Hex(''),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    assert.equal(
      H.sha256Hex('abc'),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    assert.equal(
      H.sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  test('agrees with node:crypto across lengths that cross block boundaries', () => {
    // 55, 56 and 64 bytes are the three padding edge cases. A hand-written
    // SHA-256 that is wrong is almost always wrong at exactly these.
    for (const n of [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 1000]) {
      const s = 'x'.repeat(n);
      assert.equal(
        H.sha256Hex(s),
        createHash('sha256').update(s, 'utf8').digest('hex'),
        `length ${n}`,
      );
    }
  });

  test('handles multi-byte UTF-8, which every declared_text will contain', () => {
    const s = 'प्रकाश का अपवर्तन — refraction · 屈折';
    assert.equal(H.sha256Hex(s), createHash('sha256').update(s, 'utf8').digest('hex'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M7-1 — R.10: ordering by server `seq`, never client `occurred_at`
// ═══════════════════════════════════════════════════════════════════════════
describe('M7-1 · server seq is the only ordering authority (R.10, D.4)', () => {
  /**
   * The adversarial case, and the only one that matters: a client whose
   * `occurred_at` values are in exactly the WRONG order — because its clock is
   * wrong, or because it is lying. If ordering were by the client's claim, the
   * record would read backwards.
   */
  const forged = [
    { seq: 1, event_type: 'QUESTION_STARTED',   occurred_at: '2026-08-15T23:59:00.000Z' },
    { seq: 2, event_type: 'QUESTION_ATTEMPTED', occurred_at: '2026-08-15T12:00:00.000Z' },
    { seq: 3, event_type: 'QUESTION_WRONG',     occurred_at: '2020-01-01T00:00:00.000Z' },
    { seq: 4, event_type: 'MISTAKE_DETECTED',   occurred_at: '2026-08-15T06:00:00.000Z' },
  ];

  test('orderEvents restores the true order from a shuffled stream', () => {
    const shuffled = [forged[2], forged[0], forged[3], forged[1]];
    assert.deepEqual(
      I.orderEvents(shuffled).map(e => e.seq),
      [1, 2, 3, 4],
    );
  });

  test('the recovered order is the server order even though occurred_at descends', () => {
    const ordered = I.orderEvents([...forged].reverse());

    assert.deepEqual(
      ordered.map(e => e.event_type),
      ['QUESTION_STARTED', 'QUESTION_ATTEMPTED', 'QUESTION_WRONG', 'MISTAKE_DETECTED'],
      'the causally correct order, which occurred_at contradicts at every step',
    );

    // Proof that the fixture really is adversarial: sorting by the client's
    // claim produces a DIFFERENT and wrong answer.
    const byClaim = [...forged].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at));
    assert.notDeepEqual(byClaim.map(e => e.seq), [1, 2, 3, 4]);
    assert.deepEqual(byClaim.map(e => e.seq), [3, 4, 2, 1]);
  });

  test('isInSeqOrder rejects a stream with a repeated or reversed position', () => {
    assert.equal(I.isInSeqOrder(forged), true);
    assert.equal(I.isInSeqOrder([forged[1], forged[0]]), false);
    assert.equal(I.isInSeqOrder([{ seq: 5 }, { seq: 5 }]), false);
  });

  test('orderEvents reads no field but seq — an event with no timestamp sorts fine', () => {
    assert.deepEqual(I.orderEvents([{ seq: 9 }, { seq: 2 }]).map(e => e.seq), [2, 9]);
  });

  test('a client may not supply any server-assigned field', () => {
    assert.deepEqual([...C.SERVER_ASSIGNED_FIELDS].sort(), [
      'clock_skew_ms', 'event_id', 'received_at', 'seq', 'session_id', 'student_id',
    ]);

    for (const field of C.SERVER_ASSIGNED_FIELDS) {
      const r = C.validateEventDraft(validDraft({ [field]: field === 'seq' ? 1 : STUDENT }));
      assert.equal(r.ok, false, `${field} must be refused`);
      assert.ok(
        r.problems.some(p => p.code === 'SERVER_ASSIGNED_FIELD_PRESENT' && p.field === field),
        `${field} must be refused as SERVER_ASSIGNED_FIELD_PRESENT, not silently stripped`,
      );
    }
  });

  test('student_id comes from the context, never the body (D.1.a)', () => {
    const other = '33333333-3333-4333-8333-333333333333';
    const d = I.decideIngest(validDraft(), ctx({ studentId: other }));
    assert.equal(d.outcome, 'append');
    assert.equal(d.row.student_id, other);
  });

  test('clock skew is retained, not reconciled (D.1.b)', () => {
    const d = I.decideIngest(validDraft(), ctx());
    assert.equal(d.outcome, 'append');
    assert.equal(d.clockSkewMs, 2000);
    // The claim itself survives untouched — that is the half that makes the
    // IST/UTC day-boundary bug diagnosable rather than silent.
    assert.equal(d.row.occurred_at, '2026-08-15T10:00:00.000Z');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M7-2 — D.3: validation, dedup, quarantine
// ═══════════════════════════════════════════════════════════════════════════
describe('M7-2 · invalid events quarantine rather than corrupt (D.3)', () => {
  test('a valid event is appended', () => {
    const d = I.decideIngest(validDraft(), ctx());
    assert.equal(d.outcome, 'append');
    assert.equal(d.row.event_type, 'EXTERNAL_STUDY_DECLARED');
    assert.equal(d.row.confirmation, 'not_required');
    assert.equal(d.row.session_id, null, 'E.4 is M9; session-less is legal, not missing');
  });

  test('the THREE outcomes are the only outcomes — there is no silent drop', () => {
    // Every possible decision is one of these two here plus `duplicate`, which
    // only the database can produce. Nothing returns undefined, nothing throws,
    // nothing returns "ignored".
    const cases = [
      validDraft(),
      validDraft({ event_type: 'NOT_A_REAL_TYPE' }),
      null,
      'a string',
      [],
      {},
      { client_event_id: 'x' },
    ];
    for (const c of cases) {
      const d = I.decideIngest(c, ctx());
      assert.ok(['append', 'quarantine'].includes(d.outcome), `${JSON.stringify(c)} → ${d.outcome}`);
    }
  });

  test('an unknown event_type quarantines with a typed problem and the raw body kept', () => {
    const bad = validDraft({ event_type: 'DEFINITELY_NOT_A_TYPE' });
    const d = I.decideIngest(bad, ctx());

    assert.equal(d.outcome, 'quarantine');
    assert.ok(d.problems.some(p => p.code === 'UNKNOWN_EVENT_TYPE'));

    const row = I.quarantineRowFor(d, bad, STUDENT);
    assert.equal(row.student_id, STUDENT);
    assert.equal(row.client_event_id, 'e1_abc123');
    assert.equal(row.event_type, 'DEFINITELY_NOT_A_TYPE');
    assert.deepEqual(row.raw_body, bad, 'the body is stored VERBATIM — the entire point');
    assert.ok(Array.isArray(row.problems) && row.problems.length > 0);
  });

  test('a malformed event is never coerced into a valid-looking row', () => {
    // The failure mode this rules out: a validator that "helps" by defaulting a
    // missing event_type, which writes a fact the student never claimed.
    const d = I.decideIngest(validDraft({ event_type: undefined, payload: undefined }), ctx());
    assert.equal(d.outcome, 'quarantine');
    assert.equal(d.row, undefined, 'a quarantine decision carries no row to insert');
  });

  test('EVERY problem is reported, not just the first', () => {
    const d = I.decideIngest(
      { client_event_id: 'x', schema_version: 99, occurred_at: 'not a date', event_type: 'NOPE', surface: 'fax', source: 'vibes', payload: 'not an object' },
      ctx(),
    );
    assert.equal(d.outcome, 'quarantine');
    const codes = new Set(d.problems.map(p => p.code));
    for (const expected of ['UNSUPPORTED_SCHEMA_VERSION', 'BAD_TIMESTAMP', 'UNKNOWN_EVENT_TYPE', 'BAD_ENUM', 'MISSING_FIELD']) {
      assert.ok(codes.has(expected), `expected ${expected} among ${[...codes].join(', ')}`);
    }
  });

  test('an unknown envelope field is refused, not ignored (D.3.2)', () => {
    const d = I.decideIngest(validDraft({ score_delta: 500 }), ctx());
    assert.equal(d.outcome, 'quarantine');
    assert.ok(d.problems.some(p => p.code === 'UNKNOWN_FIELD' && p.field === 'score_delta'));
  });

  test('D.2.a — MISTAKE_RESOLVED is refused from a tool or a student', () => {
    for (const source of ['tool', 'student_declaration']) {
      const d = I.decideIngest(
        validDraft({
          event_type: 'MISTAKE_RESOLVED',
          source,
          tool_slug: 'exam-practice',
          payload: { pattern_id: 'p1', resolution_id: 'r1' },
        }),
        ctx(),
      );
      assert.equal(d.outcome, 'quarantine', `source=${source} must be refused`);
      assert.ok(d.problems.some(p => p.code === 'SOURCE_MAY_NOT_EMIT'));
    }

    const ok = I.decideIngest(
      validDraft({ event_type: 'MISTAKE_RESOLVED', source: 'system', payload: { pattern_id: 'p1', resolution_id: 'r1' } }),
      ctx(),
    );
    assert.equal(ok.outcome, 'append', 'the system may resolve');
  });

  test('D.3.4 — a tool that does not declare a type may not emit it', () => {
    const lookup = slug => (slug === 'recall-studio' ? { slug, emits: ['CONCEPT_VIEWED'] } : null);

    const undeclared = I.decideIngest(
      validDraft({ source: 'tool', tool_slug: 'recall-studio', event_type: 'QUESTION_CORRECT', payload: { question_id: 'q', attempt_id: 'a' } }),
      ctx({ toolLookup: lookup }),
    );
    assert.equal(undeclared.outcome, 'quarantine');
    assert.ok(undeclared.problems.some(p => p.code === 'TOOL_MAY_NOT_EMIT'));

    const unknownTool = I.decideIngest(
      validDraft({ source: 'tool', tool_slug: 'not-a-tool', event_type: 'CONCEPT_VIEWED', payload: { concept_ref: CONCEPT } }),
      ctx({ toolLookup: lookup }),
    );
    assert.equal(unknownTool.outcome, 'quarantine');
    assert.ok(unknownTool.problems.some(p => p.code === 'TOOL_NOT_IN_REGISTRY'));

    const declared = I.decideIngest(
      validDraft({ source: 'tool', tool_slug: 'recall-studio', event_type: 'CONCEPT_VIEWED', payload: { concept_ref: CONCEPT } }),
      ctx({ toolLookup: lookup }),
    );
    assert.equal(declared.outcome, 'append');
  });

  test('a source of "tool" without a tool_slug is refused', () => {
    const d = I.decideIngest(validDraft({ source: 'tool', event_type: 'CONCEPT_VIEWED', payload: { concept_ref: CONCEPT } }), ctx());
    assert.equal(d.outcome, 'quarantine');
    assert.ok(d.problems.some(p => p.code === 'MISSING_FIELD' && p.field === 'tool_slug'));
  });

  test('D.1.c — confidence is the SYSTEM\'s 0..1, and 0..3 is refused', () => {
    assert.equal(I.decideIngest(validDraft({ confidence: 0.5 }), ctx()).outcome, 'append');
    assert.equal(I.decideIngest(validDraft({ confidence: 0 }), ctx()).outcome, 'append');
    const bad = I.decideIngest(validDraft({ confidence: 3 }), ctx());
    assert.equal(bad.outcome, 'quarantine');
    assert.ok(bad.problems.some(p => p.code === 'BAD_CONFIDENCE'));

    // The student's own confidence is a payload field and is unconstrained here.
    assert.equal(
      I.decideIngest(validDraft({ payload: { declared_text: 'x', confidence_before: 3 } }), ctx()).outcome,
      'append',
    );
  });

  test('EVENT_SUPERSEDED must name what it supersedes (C.2 — the only edit)', () => {
    const d = I.decideIngest(validDraft({ event_type: 'EVENT_SUPERSEDED', source: 'system', payload: { reason: 'wrong concept' } }), ctx());
    assert.equal(d.outcome, 'quarantine');
    assert.ok(d.problems.some(p => p.code === 'MISSING_SUPERSEDES'));

    const ok = I.decideIngest(
      validDraft({
        event_type: 'EVENT_SUPERSEDED',
        source: 'system',
        payload: { reason: 'wrong concept' },
        supersedes_event_id: CONCEPT,
      }),
      ctx(),
    );
    assert.equal(ok.outcome, 'append');
  });

  test('an oversized payload is refused (D.3.7)', () => {
    const d = I.decideIngest(validDraft({ payload: { declared_text: 'x'.repeat(C.MAX_PAYLOAD_BYTES + 1) } }), ctx());
    assert.equal(d.outcome, 'quarantine');
    assert.ok(d.problems.some(p => p.code === 'PAYLOAD_TOO_LARGE'));
  });

  test('per-type payload cores from D.2 are required', () => {
    const d = I.decideIngest(validDraft({ event_type: 'QUESTION_CORRECT', source: 'assessment', payload: {} }), ctx());
    assert.equal(d.outcome, 'quarantine');
    assert.ok(d.problems.some(p => p.code === 'PAYLOAD_SHAPE' && p.field === 'payload.question_id'));
    assert.ok(d.problems.some(p => p.code === 'PAYLOAD_SHAPE' && p.field === 'payload.attempt_id'));
  });

  test('the batch gate refuses an oversized batch and the rate cap, wholesale', () => {
    assert.equal(I.readBatch({ events: [validDraft()] }).ok, true);
    assert.equal(I.readBatch([validDraft()]).ok, true);
    assert.equal(I.readBatch(validDraft()).ok, true, 'a bare event is a batch of one');

    const tooMany = I.readBatch({ events: Array.from({ length: C.MAX_BATCH_SIZE + 1 }, validDraft) });
    assert.equal(tooMany.ok, false);
    assert.equal(tooMany.code, 'BATCH_TOO_LARGE');

    const rateLimited = I.readBatch({ events: [validDraft()] }, C.MAX_EVENTS_PER_MINUTE);
    assert.equal(rateLimited.ok, false);
    assert.equal(rateLimited.code, 'RATE_LIMIT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M7-3 — T7: a retry cannot regenerate client_event_id
// ═══════════════════════════════════════════════════════════════════════════
describe('M7-3 · the outbox id survives a retry, a crash and a reload (T7)', () => {
  /** A store that records every write, so "persisted BEFORE the first attempt"
   *  is an observation and not a claim. */
  const spyStore = () => {
    const writes = [];
    let value = null;
    return {
      writes,
      read: () => value,
      write: s => {
        writes.push(s);
        value = s;
      },
    };
  };

  const draft = () => ({
    event_type: 'QUESTION_WRONG',
    surface: 'web',
    source: 'assessment',
    payload: { question_id: 'q-7', attempt_id: 'a-1' },
    occurred_at: '2026-08-15T10:00:00.000Z',
  });

  test('enqueue persists the record BEFORE it returns', () => {
    const store = spyStore();
    let nonces = 0;
    const outbox = O.createOutbox(store, { now: () => 0, nonce: () => `n${nonces++}` });

    const record = outbox.enqueue(draft());

    assert.equal(store.writes.length, 1, 'exactly one durable write, at enqueue');
    const persisted = JSON.parse(store.writes[0]).records[0];
    assert.equal(persisted.client_event_id, record.client_event_id);
    assert.equal(persisted.nonce, record.nonce);
    assert.equal(persisted.state, 'pending');
    assert.equal(persisted.attempts, 0, 'nothing has been attempted yet');
  });

  test('THE T7 CASE — a failed attempt then a retry uses the SAME id', async () => {
    const store = spyStore();
    let nonces = 0;
    const outbox = O.createOutbox(store, { now: () => 0, nonce: () => `n${nonces++}` });

    const original = outbox.enqueue(draft());

    // Attempt one: the network dies. `flushOutbox` marks the attempt and
    // returns without marking anything sent.
    const first = await O.flushOutbox(outbox, async () => {
      throw new Error('ETIMEDOUT — the train went into a tunnel');
    });
    assert.deepEqual(first, { attempted: 1, sent: 0, quarantined: 0, failed: 1 });

    // Attempt two, from a FRESH outbox over the same persisted bytes — i.e.
    // the tab was closed and reopened between the two attempts.
    const reloaded = O.createOutbox(store, { now: () => 999, nonce: () => 'A-DIFFERENT-NONCE' });
    const pending = reloaded.pending();

    assert.equal(pending.length, 1);
    assert.equal(
      pending[0].client_event_id,
      original.client_event_id,
      'a retry after a crash MUST reuse the id — regenerating it defeats dedup entirely (T7)',
    );
    assert.equal(pending[0].nonce, original.nonce, 'the nonce is persisted, never re-drawn');
    assert.equal(pending[0].attempts, 1, 'the failed attempt was recorded, and changed nothing else');
  });

  test('the id is reproducible from the persisted record alone', () => {
    const store = spyStore();
    const outbox = O.createOutbox(store, { now: () => 0, nonce: () => 'fixed-nonce' });
    const record = outbox.enqueue(draft());

    assert.equal(
      O.deriveClientEventId(record.draft, record.nonce),
      record.client_event_id,
      'the id is a pure function of (draft, nonce) — which is why a retry cannot differ',
    );
  });

  test('markAttempt, markSent and markQuarantined never touch the id', async () => {
    const store = spyStore();
    const outbox = O.createOutbox(store, { now: () => 0, nonce: () => 'fixed-nonce' });
    const id = outbox.enqueue(draft()).client_event_id;

    assert.equal(outbox.markAttempt(id).client_event_id, id);
    assert.equal(outbox.markAttempt(id).client_event_id, id);
    assert.equal(outbox.markSent(id, 'srv-1').client_event_id, id);
    assert.equal(outbox.get(id).attempts, 2);
    assert.equal(outbox.get(id).server_event_id, 'srv-1');
  });

  test('two enqueues of BYTE-IDENTICAL content get different ids', () => {
    // A student may legitimately view the same concept twice in one minute.
    // Content-only hashing would collapse the second into the first and lose a
    // real event — which is why the nonce is inside the preimage.
    let n = 0;
    const outbox = O.createOutbox(O.memoryOutboxStore(), { now: () => 0, nonce: () => `n${n++}` });
    const a = outbox.enqueue(draft());
    const b = outbox.enqueue(draft());
    assert.notEqual(a.client_event_id, b.client_event_id);
    assert.equal(outbox.pending().length, 2);
  });

  test('the same (draft, nonce) hashes the same regardless of key order', () => {
    const one = O.deriveClientEventId(
      { event_type: 'CONCEPT_VIEWED', surface: 'web', source: 'tool', occurred_at: '2026-01-01T00:00:00.000Z', schema_version: 1, payload: { a: 1, b: 2 } },
      'nonce',
    );
    const two = O.deriveClientEventId(
      { payload: { b: 2, a: 1 }, schema_version: 1, occurred_at: '2026-01-01T00:00:00.000Z', source: 'tool', surface: 'web', event_type: 'CONCEPT_VIEWED' },
      'nonce',
    );
    assert.equal(one, two, 'canonical JSON — two runtimes with different insertion orders must agree');
  });

  test('the envelope the outbox sends carries no server-assigned field', () => {
    const outbox = O.createOutbox(O.memoryOutboxStore(), { now: () => 0, nonce: () => 'n' });
    const envelope = O.toEnvelope(outbox.enqueue(draft()));

    for (const f of C.SERVER_ASSIGNED_FIELDS) {
      assert.ok(!(f in envelope), `${f} must not be sent — D.1 rejects a body that carries one`);
    }
    assert.doesNotThrow(() => O.assertNoServerFields(envelope));
    assert.throws(() => O.assertNoServerFields({ ...envelope, seq: 1 }), /server-assigned field seq/);

    // And the envelope it produces is one the real validator accepts.
    assert.equal(C.validateEventDraft(envelope).ok, true);
  });

  test('a flush that reaches the server marks each record by its own id', async () => {
    let n = 0;
    const outbox = O.createOutbox(O.memoryOutboxStore(), { now: () => 0, nonce: () => `n${n++}` });
    const good = outbox.enqueue(draft());
    const bad = outbox.enqueue({ ...draft(), payload: {} });

    const result = await O.flushOutbox(outbox, async envelopes => envelopes.map(e => ({
      client_event_id: e.client_event_id,
      outcome: e.payload.question_id ? 'appended' : 'quarantined',
      event_id: e.payload.question_id ? 'srv-x' : null,
      detail: e.payload.question_id ? undefined : 'PAYLOAD_SHAPE',
    })));

    assert.deepEqual(result, { attempted: 2, sent: 1, quarantined: 1, failed: 0 });
    assert.equal(outbox.get(good.client_event_id).state, 'sent');
    assert.equal(outbox.get(bad.client_event_id).state, 'quarantined');
    assert.equal(outbox.get(bad.client_event_id).refusal, 'PAYLOAD_SHAPE');
    assert.equal(outbox.pending().length, 0, 'neither is retried: one landed, one never will');
  });

  test('a server that answers "duplicate" is success, and the record stops retrying', async () => {
    const outbox = O.createOutbox(O.memoryOutboxStore(), { now: () => 0, nonce: () => 'n' });
    const rec = outbox.enqueue(draft());

    const result = await O.flushOutbox(outbox, async envelopes => envelopes.map(e => ({
      client_event_id: e.client_event_id,
      outcome: 'duplicate',
      event_id: 'srv-already-there',
    })));

    assert.equal(result.sent, 1);
    assert.equal(outbox.get(rec.client_event_id).state, 'sent');
    assert.equal(outbox.get(rec.client_event_id).server_event_id, 'srv-already-there');
  });

  test('IDEMPOTENCE END TO END — a retried submission creates one event, not two', () => {
    // The server side of T7, modelled exactly as 015 enforces it: a table keyed
    // by (student_id, client_event_id) with ON CONFLICT DO NOTHING.
    const table = new Map();
    let seq = 0;
    const ingest = envelope => {
      const decision = I.decideIngest(envelope, ctx());
      assert.equal(decision.outcome, 'append');
      const key = `${decision.row.student_id}::${decision.row.client_event_id}`;
      if (table.has(key)) return { outcome: 'duplicate', event_id: table.get(key).event_id };
      seq += 1;
      const row = { ...decision.row, event_id: `ev-${seq}`, seq };
      table.set(key, row);
      return { outcome: 'appended', event_id: row.event_id };
    };

    const outbox = O.createOutbox(O.memoryOutboxStore(), { now: () => 0, nonce: () => 'n' });
    const rec = outbox.enqueue(draft());
    const envelope = O.toEnvelope(rec);

    const first = ingest(envelope);
    const second = ingest(envelope); // the retry
    const third = ingest(O.toEnvelope(outbox.get(rec.client_event_id))); // after a reload

    assert.equal(first.outcome, 'appended');
    assert.equal(second.outcome, 'duplicate');
    assert.equal(third.outcome, 'duplicate');
    assert.equal(first.event_id, second.event_id);
    assert.equal(first.event_id, third.event_id);
    assert.equal(table.size, 1, 'three submissions, one event');
  });

  test('a corrupt outbox blob does not throw and does not fabricate', () => {
    const outbox = O.createOutbox(O.memoryOutboxStore('{not json at all'), { now: () => 0, nonce: () => 'n' });
    assert.deepEqual(outbox.all(), []);
    assert.equal(outbox.enqueue(draft()).state, 'pending');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M7-4 — O.6: the audit chain
// ═══════════════════════════════════════════════════════════════════════════
describe('M7-4 · the audit hash chain detects tampering (O.6)', () => {
  const entryContent = (i, over = {}) => ({
    actor: 'system',
    action: 'correction_resolved',
    student_id: STUDENT,
    target_table: 'academic_events',
    target_id: `ev-${i}`,
    reason: `correction ${i}`,
    details: { index: i },
    policy_version: 'v1',
    at: `2026-08-1${i}T00:00:00.000Z`,
    ...over,
  });

  const chainOf = n => A.buildAuditChain(Array.from({ length: n }, (_, i) => entryContent(i + 1)));

  test('a well-formed chain verifies, and starts at genesis', () => {
    const chain = chainOf(5);
    assert.equal(chain[0].before_hash, A.AUDIT_CHAIN_GENESIS);
    for (let i = 1; i < chain.length; i += 1) {
      assert.equal(chain[i].before_hash, chain[i - 1].after_hash, `link ${i}`);
    }
    const verdict = A.verifyAuditChain(chain);
    assert.equal(verdict.ok, true, JSON.stringify(verdict.faults));
    assert.equal(verdict.tip, chain[4].after_hash);
  });

  test('EDITING an entry is detected — CONTENT_TAMPERED', () => {
    const chain = chainOf(5);
    // The realistic attack: quietly change what a past action claimed to be.
    chain[2] = { ...chain[2], reason: 'nothing to see here', details: { index: 999 } };

    const verdict = A.verifyAuditChain(chain);
    assert.equal(verdict.ok, false);
    assert.equal(verdict.tip, null);
    assert.ok(verdict.faults.some(f => f.index === 2 && f.kind === 'CONTENT_TAMPERED'));
  });

  test('editing an entry AND fixing its own hash is still detected — BROKEN_LINK', () => {
    const chain = chainOf(5);
    const tampered = { ...chain[2], reason: 'nothing to see here' };
    chain[2] = { ...tampered, after_hash: A.auditHash(tampered, tampered.before_hash) };

    const verdict = A.verifyAuditChain(chain);
    assert.equal(verdict.ok, false);
    assert.ok(
      verdict.faults.some(f => f.index === 3 && f.kind === 'BROKEN_LINK'),
      'the NEXT entry no longer links — which is what makes the chain a chain',
    );
    // Entry 2 itself now hashes correctly. Without the linkage check, this
    // attack would succeed.
    assert.ok(!verdict.faults.some(f => f.index === 2 && f.kind === 'CONTENT_TAMPERED'));
  });

  test('DELETING an entry is detected', () => {
    const chain = chainOf(5);
    chain.splice(2, 1);
    const verdict = A.verifyAuditChain(chain);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.faults.some(f => f.kind === 'BROKEN_LINK' && f.index === 2));
  });

  test('REORDERING two entries is detected', () => {
    const chain = chainOf(5);
    [chain[1], chain[3]] = [chain[3], chain[1]];
    const verdict = A.verifyAuditChain(chain);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.faults.some(f => f.kind === 'BROKEN_LINK'));
  });

  test('INSERTING a forged entry mid-chain is detected', () => {
    const chain = chainOf(5);
    const forged = A.linkAuditEntry(entryContent(99, { action: 'deletion' }), A.AUDIT_CHAIN_GENESIS);
    chain.splice(2, 0, forged);
    const verdict = A.verifyAuditChain(chain);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.faults.some(f => f.index === 2 && f.kind === 'BROKEN_LINK'));
  });

  test('TRUNCATING the chain from the front is detected', () => {
    const chain = chainOf(5);
    const verdict = A.verifyAuditChain(chain.slice(2));
    assert.equal(verdict.ok, false);
    assert.ok(verdict.faults.some(f => f.index === 0 && f.kind === 'BROKEN_LINK'));
  });

  test('an entry hashed with an unknown version is flagged, not silently accepted', () => {
    const chain = chainOf(2);
    chain[1] = { ...chain[1], hash_version: 'a99' };
    const verdict = A.verifyAuditChain(chain);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.faults.some(f => f.kind === 'UNKNOWN_HASH_VERSION'));
  });

  test('every field of the content is covered by the hash', () => {
    const base = entryContent(1);
    const tip = A.AUDIT_CHAIN_GENESIS;
    const baseline = A.auditHash(base, tip);

    const mutations = {
      actor: 'student',
      action: 'deletion',
      student_id: '44444444-4444-4444-8444-444444444444',
      target_table: 'occurrences',
      target_id: 'other',
      reason: 'different',
      details: { index: 2 },
      policy_version: 'v2',
      at: '2026-09-01T00:00:00.000Z',
    };
    for (const [field, value] of Object.entries(mutations)) {
      assert.notEqual(
        A.auditHash({ ...base, [field]: value }, tip),
        baseline,
        `${field} must change the hash — a field outside the preimage is a field an attacker may edit freely`,
      );
    }

    // And the link itself is covered, which is what makes the chain load-bearing.
    assert.notEqual(A.auditHash(base, 'f'.repeat(64)), baseline);
  });

  test('the action vocabulary covers everything O.6 enumerates', () => {
    for (const required of [
      'correction_requested', 'correction_resolved', 'dispute_opened', 'dispute_resolved',
      'deletion', 'export', 'parent_read', 'policy_change', 'score_restatement', 'compaction_run',
    ]) {
      assert.ok(A.AUDIT_ACTIONS.includes(required), `O.6 requires ${required}`);
    }
    assert.deepEqual([...A.AUDIT_ACTORS], ['student', 'system', 'service_role', 'parent'], 'C.2');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// The SQL, cross-checked against the TypeScript
// ═══════════════════════════════════════════════════════════════════════════
describe('015 / 016 · the migrations agree with the contract', () => {
  test('the event_type CHECK in 015 is exactly EVENT_TYPES', () => {
    const sql = read(SQL_015);
    const block = /event_type\s+TEXT\s+NOT NULL CHECK \(event_type IN \(([\s\S]*?)\)\),/.exec(sql);
    assert.ok(block, 'the event_type CHECK could not be located');

    const inSql = [...block[1].matchAll(/'([A-Z_]+)'/g)].map(m => m[1]).sort();
    const inTs = [...C.EVENT_TYPES].sort();

    assert.deepEqual(
      inSql,
      inTs,
      'the SQL CHECK and lib/event-contract.ts EVENT_TYPES are two statements of one list; no compiler sees the SQL, so this test is what stops them drifting',
    );
  });

  test('every D.2 event type the milestone brief names is present', () => {
    for (const t of [
      'CONCEPT_VIEWED', 'EXPLANATION_READ', 'QUESTION_STARTED', 'QUESTION_ATTEMPTED',
      'QUESTION_CORRECT', 'QUESTION_WRONG', 'PRACTICE_COMPLETED', 'REVISION_COMPLETED',
      'EXTERNAL_STUDY_DECLARED', 'CONCEPT_CONFIRMED', 'ASSESSMENT_STARTED',
      'ASSESSMENT_COMPLETED', 'MISTAKE_DETECTED', 'MISTAKE_CORRECTED', 'MISTAKE_RETESTED',
      'MISTAKE_RESOLVED',
    ]) {
      assert.ok(C.EVENT_TYPES.includes(t), `Part D names ${t}`);
      assert.ok(read(SQL_015).includes(`'${t}'`), `015 must accept ${t}`);
    }
  });

  test('the SQL enforces the same source restrictions the validator does', () => {
    const sql = read(SQL_015);
    // Anything the TypeScript refuses from a student must also be refused by a
    // CHECK, so a direct insert that bypasses the endpoint cannot write it.
    for (const t of ['MISTAKE_RESOLVED', 'MISTAKE_RECURRED', 'SESSION_VERIFIED']) {
      assert.match(sql, new RegExp(`academic_events_system_only[\\s\\S]*'${t}'`));
    }
    assert.match(sql, /academic_events_graded_only[\s\S]*'ASSESSMENT_COMPLETED'/);
    assert.match(sql, /academic_events_supersede_shape/);
  });

  test('015 carries the R.10 dedup constraint and the seq ordering key', () => {
    const sql = code(SQL_015);
    assert.match(sql, /UNIQUE \(student_id, client_event_id\)/);
    assert.match(sql, /UNIQUE \(student_id, seq\)/);
    assert.match(sql, /PARTITION BY HASH \(student_id\)/);
  });

  test('seq is assigned by a trigger, so no INSERT can choose its own', () => {
    const sql = code(SQL_015);
    assert.match(sql, /NEW\.seq\s*:=\s*nextval\('public\.academic_events_seq'\)/);
    assert.match(sql, /BEFORE INSERT ON public\.academic_events/);
    // A DEFAULT would be overridable by naming the column. It must not be one.
    assert.doesNotMatch(sql, /seq\s+BIGINT\s+NOT NULL DEFAULT/);
    assert.doesNotMatch(sql, /seq\s+BIGSERIAL/);
  });

  test('015 grants no UPDATE or DELETE policy on the event table (C.2)', () => {
    const sql = code(SQL_015);
    const policies = [...sql.matchAll(/CREATE POLICY\s+(\w+)\s+ON\s+public\.academic_events\s+FOR\s+(\w+)/g)];
    assert.ok(policies.length > 0, 'policies must exist to be checked');
    for (const [, name, cmd] of policies) {
      assert.ok(['SELECT', 'INSERT'].includes(cmd), `${name} is FOR ${cmd} — C.2 says immutability is absolute`);
    }
    assert.match(sql, /REVOKE UPDATE, DELETE ON public\.academic_events\s+FROM anon, authenticated/);
  });

  test('the quarantine table exists, is student-readable and is not student-writable', () => {
    const sql = code(SQL_015);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.academic_event_quarantine/);
    assert.match(sql, /raw_body\s+JSONB\s+NOT NULL/);
    assert.match(sql, /problems\s+JSONB\s+NOT NULL/);
    assert.match(sql, /academic_event_quarantine_select_own[\s\S]*FOR SELECT/);
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.academic_event_quarantine/);
  });

  test('016 makes audit_entries append-only for everyone, service role included (O.6)', () => {
    const sql = code(SQL_016);
    assert.match(sql, /BEFORE UPDATE OR DELETE ON public\.audit_entries/);
    assert.match(sql, /REVOKE UPDATE, DELETE ON public\.audit_entries FROM PUBLIC, anon, authenticated, service_role/);

    const policies = [...sql.matchAll(/CREATE POLICY\s+(\w+)\s+ON\s+public\.audit_entries\s+FOR\s+(\w+)/g)];
    assert.ok(policies.length > 0);
    for (const [, name, cmd] of policies) {
      assert.equal(cmd, 'SELECT', `${name} is FOR ${cmd} — O.6 says service-role INSERT only`);
    }
  });

  test('016 makes the chain unforkable and refuses a gap at write time', () => {
    const sql = code(SQL_016);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS audit_entries_before_hash_unique/);
    assert.match(sql, /p_before_hash IS DISTINCT FROM v_tip/);
    assert.match(sql, /pg_advisory_xact_lock/);
  });

  test('016 mirrors the AUDIT_ACTIONS vocabulary', () => {
    const sql = read(SQL_016);
    const block = /action\s+TEXT\s+NOT NULL CHECK \(action IN \(([\s\S]*?)\)\),/.exec(sql);
    assert.ok(block, 'the action CHECK could not be located');
    assert.deepEqual(
      [...block[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort(),
      [...A.AUDIT_ACTIONS].sort(),
    );
  });

  test('both migrations are additive — no DROP TABLE, no ALTER of a prior table', () => {
    for (const f of [SQL_015, SQL_016]) {
      const sql = code(f);
      assert.doesNotMatch(sql, /DROP TABLE/i, `${f} drops a table`);
      assert.doesNotMatch(sql, /DROP COLUMN/i, `${f} drops a column`);
      assert.doesNotMatch(sql, /TRUNCATE/i, `${f} truncates`);
      // The only ALTERs permitted are on the two tables these files create.
      for (const [, table] of sql.matchAll(/ALTER TABLE\s+(?:IF EXISTS\s+)?([\w.]+)/g)) {
        assert.ok(
          /academic_events|academic_event_quarantine|audit_entries/.test(table),
          `${f} alters ${table}, which it did not create`,
        );
      }
    }
  });

  test('both migrations register themselves in the M1 ledger with a matching checksum', () => {
    for (const f of [SQL_015, SQL_016]) {
      const contents = read(f);
      assert.ok(contents.includes(REGISTRATION_SENTINEL), `${f} has no ledger registration`);
      assert.ok(
        contents.includes(checksumOf(contents)),
        `${f}'s recorded checksum does not match its own body — the CI gate would call it DIVERGENT`,
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// The boundary of this pass
// ═══════════════════════════════════════════════════════════════════════════
describe('M7 part 1 · what this pass deliberately did not do', () => {
  // AMENDED 2026-08-15 (M7-6). This test used to assert the OPPOSITE — that
  // `pushToCloud` and the merge-by-string-length were still present, because
  // M7-1..M7-4 deliberately did not touch them. M7-6 has now deleted both, so
  // the assertion is inverted rather than removed: the boundary of part 1 is
  // still a real fact about that pass, and what changed is which side of it the
  // repository is on. The behavioural proof of the replacement lives in
  // tests/legacy-freeze.test.mjs.
  test('the legacy blob sync was retired by M7-6, not by this pass', () => {
    // `code()`, not `read()`: both files now QUOTE the deleted lines in their
    // headers so a reader can see what went and why. A comment naming a defect
    // is the opposite of the defect, and a test that could not tell them apart
    // would punish the explanation.
    const sync = code('lib/sync.ts');
    const manager = code('components/sync-manager.tsx');
    assert.doesNotMatch(sync, /export async function pushToCloud/);
    assert.doesNotMatch(sync, /value\.length > local\.length/);
    assert.doesNotMatch(manager, /PUSH_INTERVAL_MS/);
    // What M7-1..M7-4 built is still untouched by it: no event-layer module
    // reaches for the sync path, asserted independently below.
    assert.match(sync, /flushLegacyBlob/);
  });

  test('nothing in the new event layer imports the legacy sync', () => {
    for (const f of ['lib/events.ts', 'lib/event-contract.ts', 'lib/event-ingest.ts', 'lib/event-outbox.ts', 'lib/audit.ts', 'app/api/events/route.ts']) {
      assert.doesNotMatch(code(f), /from ['"].*\/sync['"]/, `${f} imports lib/sync.ts`);
      assert.doesNotMatch(code(f), /sync-manager/, `${f} reaches for the sync manager`);
    }
  });

  test('the pure modules stay pure — no Supabase, no next/*, no clock at module scope', () => {
    for (const f of ['lib/event-contract.ts', 'lib/event-ingest.ts', 'lib/audit.ts', 'lib/sha256.ts']) {
      const src = code(f);
      assert.doesNotMatch(src, /supabase/i, `${f} reaches for a database`);
      assert.doesNotMatch(src, /from ['"]next\//, `${f} imports from next/*`);
      assert.doesNotMatch(src, /Date\.now\(\)/, `${f} reads a clock instead of being given one`);
    }
  });

  test('the ingest endpoint takes its identity from the session, never the body', () => {
    const src = code('app/api/events/route.ts');
    assert.match(src, /createStudentServerClient/);
    assert.match(src, /auth\.getUser/);
    assert.match(src, /userData\?\.user\?\.id/);
    assert.doesNotMatch(src, /body\.student_id|body\.studentId/);
  });

  test('no tool is wired to emit yet — every manifest still declares emits_events: []', () => {
    const registry = read('lib/tools-registry.ts');
    const declarations = [...registry.matchAll(/emits_events:\s*\[([^\]]*)\]/g)].map(m => m[1].trim());
    assert.ok(declarations.length > 0);
    for (const d of declarations) {
      assert.equal(d, '', 'M7 builds the pipe; wiring a tool to emit is a later milestone');
    }
  });
});
