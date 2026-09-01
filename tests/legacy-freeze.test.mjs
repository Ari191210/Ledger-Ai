// M7 (part 2: M7-5 … M7-7) — the legacy freeze, the retired blob sync, and
// attention-event compaction.
//
// Four kinds of assertion, the same four tests/academic-events.test.mjs uses:
//
//   1. BEHAVIOURAL, against the real compiled modules. Every done-when here is
//      a property of a pure function, so every one is provable with no database:
//
//        M7-5  the backfill is IDEMPOTENT (twice === once) and every row it
//              produces is structurally distinguishable from a live event
//        M7-6  the conflict rule fills an absent key and never adjudicates
//              between two present ones
//        M7-7  high-signal events are NEVER compacted; low-signal ones outside
//              the window are summarised exactly
//
//   2. CROSS-CHECKED AGAINST THE SQL. `COMPACTABLE_EVENT_TYPES` and the CHECK
//      in 018, and the type filter in `compact_attention_events()`, are three
//      statements of one two-element list. Nothing but a test compares them.
//
//   3. STRUCTURAL, over source and SQL — that the named functions are gone,
//      that 017/018 are additive and register themselves with a matching
//      checksum, and that every surviving caller of the sync module is
//      accounted for.
//
//   4. EXHAUSTIVE over `SYNC_KEYS` — every legacy key is either backfilled or
//      refused with a stated reason, so a key added later cannot slip through
//      unconsidered.
//
//   node --test tests/legacy-freeze.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { checksumOf, REGISTRATION_SENTINEL } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-legacy');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

// Comments name what was removed and why. Only real code counts.
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

const SQL_017 = 'supabase/migrations/017_legacy_blob_freeze.sql';
const SQL_018 = 'supabase/migrations/018_event_compaction.sql';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const OTHER   = '22222222-2222-4222-8222-222222222222';

let B; // lib/legacy-backfill.ts
let K; // lib/event-compaction.ts
let M; // lib/sync-merge.ts
let C; // lib/event-contract.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.legacy.json'],
    { cwd: root, stdio: 'inherit' },
  );
  // tsc emits extensionless relative imports; Node's ESM resolver requires the
  // extension. Same post-compile rewrite tests/academic-events.test.mjs uses.
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
  [B, K, M, C] = await Promise.all([
    load('legacy-backfill.js'),
    load('event-compaction.js'),
    load('sync-merge.js'),
    load('event-contract.js'),
  ]);
});

// A realistic frozen archive: raw localStorage strings, ragged, as real data is.
const ARCHIVE = () => ({
  'ledger-mistakes': JSON.stringify([
    { id: 'm1', date: '2026-03-04T10:00:00Z', subject: 'Physics', topic: 'Gauss law', category: 'conceptual', status: 'resolved', clearedDate: '2026-03-09' },
    { id: 'm2', date: '2026-04-01', subject: 'Maths', topic: 'Integration by parts' },
    { subject: 'Chemistry' },                       // no topic → subject is the words
    { id: 'm4' },                                   // nothing describable → refused
    'not an object',                                // wrong shape → refused
  ]),
  'ledger-papers-log': JSON.stringify([
    { subject: 'Physics', score: 42, total: 70, date: '2026-05-02' },
    { subject: 'Maths', score: 60, total: 70 },     // undated
    { score: 1, total: 2 },                         // no subject → refused
  ]),
  'ledger-weak-topics': JSON.stringify({ 'Rotational motion': 4, '  ': 9, Thermodynamics: 1 }),
  // Present, and every one of them must be refused with a stated reason.
  'ledger-focus-streak': '12',
  'ledger-checks': JSON.stringify([{ q: 10, acc: 0.8 }]),
  'ledger-plan-v1': JSON.stringify({ hours: 3 }),
  'ledger-profile': JSON.stringify({ grade: '12' }),
});

// ═══════════════════════════════════════════════════════════════════════════
// M7-5 — THE BACKFILL
// ═══════════════════════════════════════════════════════════════════════════
describe('M7-5 · backfill from the frozen legacy blob', () => {
  test('IDEMPOTENT: planning twice produces byte-identical rows', () => {
    const a = B.planLegacyBackfill(STUDENT, ARCHIVE());
    const b = B.planLegacyBackfill(STUDENT, ARCHIVE());
    assert.deepEqual(a.rows, b.rows);
    assert.deepEqual(a.refused, b.refused);
    assert.deepEqual(a.counts, b.counts);
  });

  test('IDEMPOTENT, the way the database sees it: every client_event_id is unique and stable', () => {
    const first  = B.planLegacyBackfill(STUDENT, ARCHIVE());
    const second = B.planLegacyBackfill(STUDENT, ARCHIVE());

    const ids = first.rows.map(r => r.client_event_id);
    assert.equal(new Set(ids).size, ids.length, 'two rows share a client_event_id — the dedup constraint would drop one');

    // Replay both runs against a table keyed the way 015 keys it. The second
    // run inserts NOTHING — which is what "safe to re-run" means, and it is
    // observed here rather than asserted in a comment.
    const table = new Map();
    const insert = rows => {
      let inserted = 0;
      for (const r of rows) {
        const key = `${r.student_id}|${r.client_event_id}`;
        if (table.has(key)) continue;      // ON CONFLICT DO NOTHING
        table.set(key, r);
        inserted += 1;
      }
      return inserted;
    };

    const firstRun  = insert(first.rows);
    const secondRun = insert(second.rows);

    assert.ok(firstRun > 0, 'the first run inserted nothing at all');
    assert.equal(secondRun, 0, 'the second run inserted rows — the backfill is not idempotent');
    assert.equal(table.size, firstRun);
  });

  test('the id is nonce-free, unlike the outbox — and namespaced by student', () => {
    const a = B.deriveBackfillEventId(STUDENT, 'ledger-mistakes', 'm1');
    const b = B.deriveBackfillEventId(STUDENT, 'ledger-mistakes', 'm1');
    assert.equal(a, b, 'the derivation is not deterministic');

    assert.notEqual(a, B.deriveBackfillEventId(OTHER, 'ledger-mistakes', 'm1'));
    assert.notEqual(a, B.deriveBackfillEventId(STUDENT, 'ledger-papers-log', 'm1'));
    assert.notEqual(a, B.deriveBackfillEventId(STUDENT, 'ledger-mistakes', 'm2'));
    assert.match(a, /^bf1_[0-9a-f]{40}$/);
  });

  test('every backfilled row is STRUCTURALLY distinguishable from a live event', () => {
    const { rows } = B.planLegacyBackfill(STUDENT, ARCHIVE());
    assert.ok(rows.length > 0);

    for (const r of rows) {
      // Mark 1 — a source a student's own client cannot write (015 §5's
      // WITH CHECK narrows `authenticated` to tool | student_declaration).
      assert.equal(r.source, 'migration');
      assert.equal(r.surface, 'import');
      // Mark 2 — D.1.d. THE load-bearing one: no downstream subsystem may
      // treat an 'unconfirmed' event as evidence.
      assert.equal(r.confirmation, 'unconfirmed');
      // Mark 3 — D.1.c. The system has no confidence in a pre-epoch claim.
      assert.equal(r.confidence, null);
      // Mark 4 — for a human reading one row.
      assert.equal(r.metadata.backfill, true);
      assert.equal(r.metadata.legacy_epoch_ms, B.LEGACY_EPOCH_MS);
      assert.equal(r.metadata.ingest_rule_version, B.BACKFILL_RULE_VERSION);
      // A single WHERE clause separates the whole seam.
      assert.ok(r.client_event_id.startsWith('bf1_'));
    }
  });

  test('NOTHING backfilled is evidence-bearing — T2 accepted, not argued with', () => {
    const { rows } = B.planLegacyBackfill(STUDENT, ARCHIVE());
    const evidenceBearing = new Set(C.EVIDENCE_BEARING_TYPES);

    for (const r of rows) {
      assert.equal(r.event_type, 'EXTERNAL_STUDY_DECLARED');
      assert.ok(!evidenceBearing.has(r.event_type),
        `${r.event_type} is evidence-bearing — a pre-epoch claim would move a score`);
    }
    // D.2.b, the reason this type and no other.
    assert.ok(!evidenceBearing.has('EXTERNAL_STUDY_DECLARED'));
  });

  test('it fabricates no concept, no evidence, no occurrence, no session and no grade', () => {
    const { rows } = B.planLegacyBackfill(STUDENT, ARCHIVE());
    for (const r of rows) {
      assert.equal(r.concept_id, null, 'a concept was guessed (V.4.9 refuses this)');
      assert.equal(r.evidence_id, null, 'evidence was fabricated (§3.2)');
      assert.equal(r.session_id, null, 'a session nobody sat was invented');
      assert.equal(r.assessment_id, null);
      assert.equal(r.question_id, null);
      assert.equal(r.result, null, 'a self-reported mark was written as an outcome');
      assert.equal(r.payload.occurrence_id, undefined);
    }
  });

  test('a pre-epoch "resolved" is carried verbatim and never read as a resolution (§3.1)', () => {
    const { rows } = B.planLegacyBackfill(STUDENT, ARCHIVE());
    const m1 = rows.find(r => r.declared_text === 'Gauss law');
    assert.ok(m1, 'the mistake with a topic was not backfilled');
    assert.equal(m1.payload.legacy.original.status, 'resolved');
    assert.equal(m1.payload.legacy.original.clearedDate, '2026-03-09');
    // …and none of that reaches a field anything reads as a lifecycle state.
    assert.equal(m1.event_type, 'EXTERNAL_STUDY_DECLARED');
    assert.equal(m1.confirmation, 'unconfirmed');
  });

  test('a missing date is MARKED, never invented; a future date is clamped to the seam', () => {
    const { rows } = B.planLegacyBackfill(STUDENT, ARCHIVE());

    const undated = rows.find(r => r.declared_text === 'Rotational motion');
    assert.ok(undated);
    assert.equal(undated.payload.legacy.occurred_at_unknown, true);
    assert.equal(undated.payload.when, null);
    assert.equal(Date.parse(undated.occurred_at), B.LEGACY_EPOCH_MS);

    const dated = rows.find(r => r.declared_text === 'Gauss law');
    assert.equal(dated.payload.legacy.occurred_at_unknown, false);
    assert.equal(dated.occurred_at, '2026-03-04T10:00:00.000Z');

    // A device whose clock ran ahead cannot put an event after the seam.
    const future = B.planLegacyBackfill(STUDENT, {
      'ledger-mistakes': JSON.stringify([{ id: 'x', topic: 'Optics', date: '2099-01-01' }]),
    });
    assert.equal(Date.parse(future.rows[0].occurred_at), B.LEGACY_EPOCH_MS);
    assert.equal(future.rows[0].payload.legacy.original.date, '2099-01-01');
  });

  test('what it refuses, it REPORTS — with the original attached', () => {
    const { refused } = B.planLegacyBackfill(STUDENT, ARCHIVE());
    const codes = refused.map(r => r.code);

    assert.ok(codes.includes('NO_DESCRIBABLE_CONTENT'), 'a contentless entry was silently dropped');
    assert.ok(codes.includes('WRONG_SHAPE'), 'a malformed entry was silently dropped');
    for (const r of refused) {
      assert.ok(r.detail.length > 0, 'a refusal with no reason is not a refusal');
      assert.notEqual(r.raw, undefined, 'the refused value was not preserved');
    }
  });

  test('unparseable JSON is refused, not coerced, and never throws', () => {
    const plan = B.planLegacyBackfill(STUDENT, { 'ledger-mistakes': '{{{not json' });
    assert.equal(plan.rows.length, 0);
    assert.equal(plan.refused[0].code, 'UNPARSEABLE');
  });

  test('twelve hostile archives produce no throw and no fabricated row', () => {
    const hostile = [
      null, undefined, {}, [], 'string', 42, true,
      { 'ledger-mistakes': null },
      { 'ledger-mistakes': '[]' },
      { 'ledger-mistakes': '{"not":"an array"}' },
      { 'ledger-papers-log': '"a string"' },
      { 'ledger-weak-topics': '[1,2,3]' },
    ];
    for (const blob of hostile) {
      const plan = B.planLegacyBackfill(STUDENT, blob);
      assert.ok(Array.isArray(plan.rows));
      assert.equal(plan.rows.length, 0, `${JSON.stringify(blob)} produced a row out of nothing`);
    }
  });

  test('BACKFILLED_KEYS and REFUSED_KEYS partition SYNC_KEYS exactly', () => {
    const src = read('lib/sync.ts');
    const body = src.slice(src.indexOf('export const SYNC_KEYS'), src.indexOf('] as const;'));
    const syncKeys = [...body.matchAll(/"([a-z0-9-]+)"/g)].map(m => m[1]);
    assert.ok(syncKeys.length >= 20);

    const considered = new Set([...B.BACKFILLED_KEYS, ...Object.keys(B.REFUSED_KEYS)]);
    for (const k of syncKeys) {
      assert.ok(considered.has(k), `${k} is synced but neither backfilled nor refused — it slipped through unconsidered`);
    }
    for (const k of B.BACKFILLED_KEYS) {
      assert.ok(!(k in B.REFUSED_KEYS), `${k} is both backfilled and refused`);
    }
    for (const [k, reason] of Object.entries(B.REFUSED_KEYS)) {
      assert.ok(reason.length > 20, `${k} is refused without a stated reason`);
    }
  });

  test('the streak is never imported (PRINCIPLES §4.2)', () => {
    const plan = B.planLegacyBackfill(STUDENT, {
      'ledger-focus-streak': '99',
      'ledger-focus-last': '2026-08-01',
    });
    assert.equal(plan.rows.length, 0);
    assert.ok('ledger-focus-streak' in B.REFUSED_KEYS);
  });

  test('runLegacyBackfill: a failed append leaves the archive UNMARKED so it retries', async () => {
    const marked = [];
    const audits = [];
    const report = await B.runLegacyBackfill({
      listArchives: async () => [
        { student_id: STUDENT, legacy_blob: ARCHIVE(), legacy_blob_frozen_at: '2026-08-15T00:00:00Z' },
        { student_id: OTHER,   legacy_blob: ARCHIVE(), legacy_blob_frozen_at: '2026-08-15T00:00:00Z' },
      ],
      appendEvents: async rows =>
        rows[0].student_id === OTHER
          ? { inserted: 0, error: 'connection reset' }
          : { inserted: rows.length },
      markBackfilled: async (id, n) => { marked.push([id, n]); },
      recordAudit: async e => { audits.push(e); },
    });

    assert.equal(report.students, 2);
    assert.equal(report.errors.length, 1);
    assert.equal(report.errors[0].studentId, OTHER);
    assert.deepEqual(marked.map(m => m[0]), [STUDENT], 'the failed student was marked done');
    assert.deepEqual(audits.map(a => a.studentId), [STUDENT]);
    assert.ok(audits[0].refused.length > 0, 'the audit entry lost the refusals');
  });

  test('runLegacyBackfill: the second run inserts zero', async () => {
    const table = new Set();
    const run = () => B.runLegacyBackfill({
      listArchives: async () => [
        { student_id: STUDENT, legacy_blob: ARCHIVE(), legacy_blob_frozen_at: '2026-08-15T00:00:00Z' },
      ],
      appendEvents: async rows => {
        let inserted = 0;
        for (const r of rows) {
          const key = `${r.student_id}|${r.client_event_id}`;
          if (table.has(key)) continue;
          table.add(key);
          inserted += 1;
        }
        return { inserted };
      },
      markBackfilled: async () => {},
      recordAudit: async () => {},
    });

    const first = await run();
    const second = await run();
    assert.ok(first.inserted > 0);
    assert.equal(second.inserted, 0, 'running the backfill twice double-inserted');
    assert.equal(second.planned, first.planned, 'the plan changed between runs');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M7-6 — THE RETIRED BLOB SYNC
// ═══════════════════════════════════════════════════════════════════════════
describe('M7-6 · the whole-blob upsert and the merge-by-string-length are gone', () => {
  test('pushToCloud no longer exists in lib/sync.ts', () => {
    const src = read('lib/sync.ts');
    assert.doesNotMatch(src, /export async function pushToCloud/, 'pushToCloud is still exported');
    assert.doesNotMatch(code('lib/sync.ts'), /pushToCloud/, 'pushToCloud still appears in real code');
  });

  test('the merge-by-string-length is deleted, and nothing compares lengths anywhere', () => {
    const src = code('lib/sync.ts');
    assert.doesNotMatch(src, /value\.length\s*>\s*local\.length/);
    assert.doesNotMatch(code('lib/sync-merge.ts'), /\.length\s*[<>]\s*\w+\.length/,
      'the replacement rule compares lengths — it was supposed to stop adjudicating');
  });

  test('the 15-second interval is deleted from the sync manager', () => {
    const src = code('components/sync-manager.tsx');
    assert.doesNotMatch(src, /PUSH_INTERVAL_MS/, 'the interval constant survives');
    assert.doesNotMatch(src, /setInterval/, 'the sync manager still runs a timer');
    assert.doesNotMatch(src, /pushToCloud/);
    // The two moments that actually matter are still covered.
    assert.match(src, /visibilitychange/);
    assert.match(src, /pagehide/);
  });

  test('every surviving caller of the sync module is accounted for', () => {
    // If this list grows, the new call site has to be read and classified —
    // which is the point of asserting it rather than grepping once by hand.
    const callers = ['components/sync-manager.tsx', 'components/auth-provider.tsx'];
    for (const f of callers) {
      const src = code(f);
      assert.doesNotMatch(src, /pushToCloud/, `${f} still calls the deleted whole-blob upsert`);
      assert.match(src, /flushLegacyBlob|pullFromCloud/, `${f} imports lib/sync.ts but calls nothing from it`);
    }
    // And nothing else in the repository reaches for it.
    const roots = ['app', 'lib', 'components', 'hooks'];
    const offenders = [];
    const walk = dir => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(name)) continue;
        const rel = path.relative(root, p).replace(/\\/g, '/');
        if (rel === 'lib/sync.ts' || callers.includes(rel)) continue;
        if (/from\s+["']@?[./\w]*\/sync["']/.test(fs.readFileSync(p, 'utf8'))) offenders.push(rel);
      }
    };
    for (const r of roots) walk(path.join(root, r));
    assert.deepEqual(offenders, [], `unlisted importers of lib/sync.ts: ${offenders.join(', ')}`);
  });

  test('the academic half of the legacy flush is a named, exported list', () => {
    const src = read('lib/sync.ts');
    assert.match(src, /export const ACADEMIC_KEYS/);
    assert.match(src, /export const DEVICE_KEYS/);
    // The removal condition is written into the file, as M1-3/M5-2/M6-1 each
    // wrote their own. A shim with no removal condition is a permanent shim.
    assert.match(src, /REMOVE `flushLegacyBlob\(\)`/);
  });

  test('nothing in the repository WRITES user_data.legacy_blob', () => {
    // Reading it is the whole point (`LegacyArchive` in lib/legacy-backfill.ts
    // is a read shape). What must not exist is a write: `legacy_blob` naming a
    // key inside an upsert/insert/update payload. 017's trigger refuses one
    // anyway; this asserts the repository does not even attempt it.
    const offenders = [];
    const walk = dir => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(name)) continue;
        const src = fs.readFileSync(p, 'utf8');
        for (const m of src.matchAll(/\.(upsert|insert|update)\s*\(/g)) {
          if (/legacy_blob\s*:/.test(src.slice(m.index, m.index + 400))) {
            offenders.push(path.relative(root, p));
          }
        }
      }
    };
    for (const r of ['app', 'lib', 'components', 'hooks']) walk(path.join(root, r));
    assert.deepEqual(offenders, [], 'the frozen archive has a live write path');
  });

  // ── the rule itself, behaviourally ──────────────────────────────────────
  const KEYS = ['ledger-mistakes', 'ledger-papers-log'];
  const store = initial => {
    const map = new Map(Object.entries(initial));
    return { map, get: k => (map.has(k) ? map.get(k) : null), set: (k, v) => map.set(k, v) };
  };

  test('an absent key is FILLED', () => {
    const s = store({});
    const r = M.hydrateAbsentOnly({ 'ledger-mistakes': '[{"id":"a"}]' }, s, KEYS);
    assert.equal(r.wrote, true);
    assert.deepEqual(r.filled, ['ledger-mistakes']);
    assert.equal(s.map.get('ledger-mistakes'), '[{"id":"a"}]');
  });

  test('a present key is KEPT — even when the cloud copy is longer', () => {
    // The exact case the deleted line got wrong: a corrected local record with
    // FEWER entries, against a stale cloud record with more.
    const corrected = '[{"id":"a"}]';
    const stale = '[{"id":"a"},{"id":"b"},{"id":"c"}]';
    assert.ok(stale.length > corrected.length, 'fixture does not exercise the old rule');

    const s = store({ 'ledger-mistakes': corrected });
    const r = M.hydrateAbsentOnly({ 'ledger-mistakes': stale }, s, KEYS);
    assert.equal(r.wrote, false);
    assert.deepEqual(r.kept, ['ledger-mistakes']);
    assert.equal(s.map.get('ledger-mistakes'), corrected, 'the stale longer copy overwrote the corrected one');
  });

  test('a present key is KEPT when the cloud copy is shorter, too — the rule is symmetric', () => {
    const s = store({ 'ledger-mistakes': '[{"id":"a"},{"id":"b"}]' });
    const r = M.hydrateAbsentOnly({ 'ledger-mistakes': '[]' }, s, KEYS);
    assert.equal(r.wrote, false);
    assert.equal(s.map.get('ledger-mistakes'), '[{"id":"a"},{"id":"b"}]');
  });

  test('an empty local value counts as absent, and an unknown key is ignored', () => {
    const s = store({ 'ledger-mistakes': '' });
    const r = M.hydrateAbsentOnly(
      { 'ledger-mistakes': '[1]', 'ledger-not-a-key': 'x', 'ledger-papers-log': 42 },
      s, KEYS,
    );
    assert.deepEqual(r.filled, ['ledger-mistakes']);
    assert.ok(r.ignored.includes('ledger-not-a-key'));
    assert.ok(r.ignored.includes('ledger-papers-log'), 'a non-string value was written');
  });

  test('hostile cloud payloads produce no write and no throw', () => {
    for (const cloud of [null, undefined, 'str', 42, [], true]) {
      const s = store({});
      const r = M.hydrateAbsentOnly(cloud, s, KEYS);
      assert.equal(r.wrote, false);
      assert.equal(s.map.size, 0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M7-7 — COMPACTION
// ═══════════════════════════════════════════════════════════════════════════
describe('M7-7 · attention-event compaction', () => {
  const DAY = 86_400_000;
  const NOW = Date.parse('2026-08-15T00:00:00Z');
  const at = daysAgo => new Date(NOW - daysAgo * DAY).toISOString();

  let n = 0;
  const ev = (over) => ({
    event_id: `e${++n}`,
    student_id: STUDENT,
    seq: n,
    event_type: 'CONCEPT_VIEWED',
    session_id: 's1',
    concept_id: 'c1',
    received_at: at(200),
    occurred_at: at(200),
    payload: { dwell_ms: 1000 },
    ...over,
  });

  test('ONLY the two D.5 classes are compactable — every other type is refused', () => {
    assert.deepEqual([...K.COMPACTABLE_EVENT_TYPES], ['CONCEPT_VIEWED', 'EXPLANATION_READ']);

    for (const t of C.EVENT_TYPES) {
      const expected = t === 'CONCEPT_VIEWED' || t === 'EXPLANATION_READ';
      assert.equal(K.isCompactable(t), expected, `${t} compactability is wrong`);
    }
    // Named explicitly, because these are the ones whose loss would be a lie.
    for (const t of C.EVIDENCE_BEARING_TYPES) {
      assert.equal(K.isCompactable(t), false, `${t} is evidence-bearing and must never be compacted`);
    }
    for (const t of C.EVENT_TYPES.filter(x => /^(MISTAKE_|ASSESSMENT_|QUESTION_|SESSION_|CORRECTION_)/.test(x))) {
      assert.equal(K.isCompactable(t), false, `${t} must remain individually auditable`);
    }
    assert.equal(K.isCompactable('SOMETHING_NEW'), false, 'an unknown type defaults to compactable');
  });

  test('high-signal events outside the window are RETAINED, and the reason is stated', () => {
    const events = [
      ev({ event_type: 'QUESTION_WRONG', received_at: at(900) }),
      ev({ event_type: 'MISTAKE_RESOLVED', received_at: at(900) }),
      ev({ event_type: 'ASSESSMENT_COMPLETED', received_at: at(900) }),
      ev({ event_type: 'EXTERNAL_STUDY_DECLARED', received_at: at(900) }),
    ];
    const plan = K.planCompaction(events, { nowMs: NOW });

    assert.deepEqual(plan.deleteEventIds, [], 'a high-signal event was scheduled for deletion');
    assert.equal(plan.summaries.length, 0);
    assert.equal(plan.retained.length, 4);
    for (const r of plan.retained) assert.equal(r.reason, 'PERMANENT_TYPE');
  });

  test('low-signal events INSIDE the window are retained — 90 days verbatim', () => {
    const plan = K.planCompaction(
      [ev({ received_at: at(89) }), ev({ received_at: at(91) })],
      { nowMs: NOW },
    );
    assert.equal(plan.deleteEventIds.length, 1);
    assert.equal(plan.retained.length, 1);
    assert.equal(plan.retained[0].reason, 'INSIDE_WINDOW');
  });

  test('D.5.a: a REFERENCED event is permanent regardless of its class', () => {
    const keep = ev({ event_id: 'referenced-one', received_at: at(400) });
    const plan = K.planCompaction([keep, ev({ received_at: at(400) })], {
      nowMs: NOW,
      referencedEventIds: ['referenced-one'],
    });
    assert.ok(!plan.deleteEventIds.includes('referenced-one'));
    assert.equal(plan.retained.find(r => r.event_id === 'referenced-one').reason, 'REFERENCED');
    assert.equal(plan.deleteEventIds.length, 1);
  });

  test('the summary is D.5\'s shape, computed exactly', () => {
    const events = [
      ev({ received_at: at(300), payload: { dwell_ms: 1500 } }),
      ev({ received_at: at(250), payload: { dwell_ms: 500 } }),
      ev({ received_at: at(200), payload: { dwell_ms: 0 } }),
      ev({ received_at: at(210), payload: null }),               // no dwell → 0
      ev({ received_at: at(205), payload: { dwell_ms: -9 } }),    // nonsense → 0
    ];
    const plan = K.planCompaction(events, { nowMs: NOW });

    assert.equal(plan.summaries.length, 1, 'one (session, concept, type) group');
    const s = plan.summaries[0];
    assert.equal(s.event_count, 5);
    assert.equal(s.total_dwell_ms, 2000);
    assert.equal(s.first_at, at(300));
    assert.equal(s.last_at, at(200));
    assert.equal(s.min_seq, events[0].seq);
    assert.equal(s.max_seq, events[4].seq);
    assert.equal(plan.deleteEventIds.length, 5);
  });

  test('D.5.b: the summary carries nothing a raw row could be rebuilt from', () => {
    const plan = K.planCompaction([ev({ payload: { dwell_ms: 7, secret: 'x' } })], { nowMs: NOW });
    const s = plan.summaries[0];
    assert.equal(s.payload, undefined);
    assert.equal(s.result, undefined);
    assert.equal(s.event_ids, undefined, 'the summary names the rows it replaced — derivation is one-way (D.5.b)');
    assert.deepEqual(
      Object.keys(s).sort(),
      ['concept_id', 'event_count', 'event_type', 'first_at', 'group_key', 'last_at', 'max_seq', 'min_seq', 'session_id', 'student_id', 'total_dwell_ms'],
    );
  });

  test('groups do not merge across student, session, concept or type', () => {
    const events = [
      ev({}),
      ev({ session_id: 's2' }),
      ev({ concept_id: 'c2' }),
      ev({ event_type: 'EXPLANATION_READ' }),
      ev({ student_id: OTHER }),
      ev({ session_id: null, concept_id: null }),
    ];
    const plan = K.planCompaction(events, { nowMs: NOW });
    assert.equal(plan.summaries.length, 6);
    assert.equal(new Set(plan.summaries.map(s => s.group_key)).size, 6);
  });

  test('a session-less, concept-less group is stable and NULL-safe', () => {
    const a = K.groupKey(STUDENT, null, null, 'CONCEPT_VIEWED');
    assert.equal(a, K.groupKey(STUDENT, null, null, 'CONCEPT_VIEWED'));
    assert.notEqual(a, K.groupKey(STUDENT, null, 'c1', 'CONCEPT_VIEWED'));
    assert.notEqual(a, K.groupKey(STUDENT, 'c1', null, 'CONCEPT_VIEWED'));
  });

  test('every event lands in exactly one place — nothing is dropped silently', () => {
    const events = [
      ev({ event_type: 'QUESTION_WRONG', received_at: at(900) }),
      ev({ received_at: at(10) }),
      ev({ received_at: at(400) }),
      ev({ received_at: at(400), event_id: 'ref' }),
    ];
    const plan = K.planCompaction(events, { nowMs: NOW, referencedEventIds: ['ref'] });
    assert.equal(plan.deleteEventIds.length + plan.retained.length, events.length);
    assert.equal(
      plan.summaries.reduce((n2, s) => n2 + s.event_count, 0),
      plan.deleteEventIds.length,
      'the summaries and the delete list disagree about how many rows were compacted',
    );
  });

  test('the window is measured in SERVER time — a forged occurred_at cannot age a row out', () => {
    const forged = ev({ received_at: at(1), occurred_at: at(9000) });
    const plan = K.planCompaction([forged], { nowMs: NOW });
    assert.deepEqual(plan.deleteEventIds, []);
    assert.equal(plan.retained[0].reason, 'INSIDE_WINDOW');
  });

  test('runCompaction writes the summary BEFORE deleting, and deletes nothing if the write fails', async () => {
    const calls = [];
    const report = await K.runCompaction({
      listCandidates: async () => [ev({ received_at: at(400) }), ev({ received_at: at(400) })],
      writeSummaries: async s => { calls.push('write'); return { written: s.length }; },
      deleteRaw: async (_s, ids) => { calls.push('delete'); return { deleted: ids.length }; },
      recordAudit: async e => { calls.push(`audit:${e.deleted}`); },
    }, { nowMs: NOW, runId: 'run-1' });

    assert.deepEqual(calls, ['write', 'delete', 'audit:2']);
    assert.equal(report.rawDeleted, 2);

    const failed = [];
    await K.runCompaction({
      listCandidates: async () => [ev({ received_at: at(400) })],
      writeSummaries: async () => ({ written: 0, error: 'disk full' }),
      deleteRaw: async () => { failed.push('delete'); return { deleted: 1 }; },
      recordAudit: async () => { failed.push('audit'); },
    }, { nowMs: NOW, runId: 'run-2' });

    assert.deepEqual(failed, [], 'raw rows were deleted after the summary write failed');
  });

  test('D.5.a: the run is audited with the count and the range', async () => {
    const audits = [];
    await K.runCompaction({
      listCandidates: async () => [ev({ received_at: at(400) }), ev({ received_at: at(300) })],
      writeSummaries: async s => ({ written: s.length }),
      deleteRaw: async (_s, ids) => ({ deleted: ids.length }),
      recordAudit: async e => audits.push(e),
    }, { nowMs: NOW, runId: 'run-3' });

    assert.equal(audits.length, 1);
    assert.equal(audits[0].runId, 'run-3');
    assert.equal(audits[0].deleted, 2);
    assert.equal(typeof audits[0].minSeq, 'number');
    assert.equal(typeof audits[0].maxSeq, 'number');
    assert.ok(audits[0].olderThanIso);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// THE SQL, CROSS-CHECKED
// ═══════════════════════════════════════════════════════════════════════════
describe('017 and 018 · structural', () => {
  test('both register themselves in the M1 ledger with a matching checksum', () => {
    for (const f of [SQL_017, SQL_018]) {
      const contents = read(f);
      assert.ok(contents.includes(REGISTRATION_SENTINEL), `${f} has no ledger registration`);
      assert.ok(
        contents.includes(checksumOf(contents)),
        `${f}'s recorded checksum does not match its own body — the CI gate would call it DIVERGENT`,
      );
    }
  });

  test('neither drops, renames or truncates anything', () => {
    for (const f of [SQL_017, SQL_018]) {
      const sql = code(f);
      assert.doesNotMatch(sql, /DROP TABLE/i, `${f} drops a table`);
      assert.doesNotMatch(sql, /DROP COLUMN/i, `${f} drops a column`);
      assert.doesNotMatch(sql, /RENAME/i, `${f} renames something`);
      assert.doesNotMatch(sql, /TRUNCATE/i, `${f} truncates`);
    }
  });

  test('017 alters only user_data, and only by adding columns', () => {
    const sql = code(SQL_017);
    for (const [, table] of sql.matchAll(/ALTER TABLE\s+(?:IF EXISTS\s+)?([\w.]+)/g)) {
      assert.equal(table, 'public.user_data', `017 alters ${table}`);
    }
    assert.match(sql, /ADD COLUMN IF NOT EXISTS legacy_blob\b/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS legacy_blob_frozen_at/);
  });

  test('017 freezes legacy_blob with a trigger, a REVOKE and a WHERE-guarded one-time copy', () => {
    const sql = code(SQL_017);
    // The freeze itself.
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.user_data_legacy_blob_is_frozen/);
    assert.match(sql, /BEFORE UPDATE ON public\.user_data/);
    assert.match(sql, /NEW\.legacy_blob IS DISTINCT FROM OLD\.legacy_blob/);
    assert.match(sql, /REVOKE UPDATE \(legacy_blob/);
    // Idempotency: the copy runs once, and a re-run finds no rows.
    assert.match(sql, /WHERE legacy_blob IS NULL/);
    // It does NOT freeze the live `blob` — the six readers are still fed.
    assert.doesNotMatch(sql, /NEW\.blob IS DISTINCT FROM OLD\.blob/);
  });

  test('018 names the same two compactable types as lib/event-compaction.ts', () => {
    const sql = read(SQL_018);
    // The CHECK on the summary table, and the filter inside the delete
    // function. Both must equal COMPACTABLE_EVENT_TYPES.
    const occurrences = [...sql.matchAll(/IN \('CONCEPT_VIEWED','EXPLANATION_READ'\)/g)];
    assert.ok(occurrences.length >= 3,
      `expected the two compactable types in the CHECK, the guard and the delete — found ${occurrences.length}`);
    assert.equal(K.COMPACTABLE_EVENT_TYPES.join(','), 'CONCEPT_VIEWED,EXPLANATION_READ');
  });

  test('018 refuses to delete anything outside the two classes or inside the window', () => {
    const sql = code(SQL_018);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.compact_attention_events/);
    assert.match(sql, /event_type NOT IN \('CONCEPT_VIEWED','EXPLANATION_READ'\)/);
    assert.match(sql, /e\.received_at >= p_older_than/);
    assert.match(sql, /RAISE EXCEPTION/);
    // Service role only.
    assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.compact_attention_events[\s\S]*?FROM anon, authenticated/);
  });

  test('018 asserts, rather than assumes, that the partition key is still HASH', () => {
    // 015's header flagged monthly partitioning as re-opened; 018 §0 closes it
    // and this is the assertion that makes a later reversal loud.
    const sql = code(SQL_018);
    assert.match(sql, /partstrat/);
    assert.match(sql, /IS DISTINCT FROM 'h'/);
    assert.doesNotMatch(sql, /PARTITION BY RANGE/i, '018 introduced time partitioning after arguing against it');
  });

  test('018 keeps the summary table append-only and service-role-write-only', () => {
    const sql = code(SQL_018);
    assert.match(sql, /academic_event_compactions_refuse_update/);
    assert.match(sql, /BEFORE UPDATE ON public\.academic_event_compactions/);
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.academic_event_compactions FROM anon, authenticated/);
    const policies = [...sql.matchAll(/CREATE POLICY (\w+) ON public\.academic_event_compactions\s+FOR (\w+)/g)];
    assert.ok(policies.length > 0);
    for (const [, , cmd] of policies) assert.equal(cmd, 'SELECT');
  });

  test('the new modules stay pure — no Supabase, no next/*, no clock at module scope', () => {
    for (const f of ['lib/legacy-backfill.ts', 'lib/event-compaction.ts', 'lib/sync-merge.ts']) {
      const src = code(f);
      assert.doesNotMatch(src, /supabase/i, `${f} reaches for a database`);
      assert.doesNotMatch(src, /from ['"]next\//, `${f} imports from next/*`);
      assert.doesNotMatch(src, /Date\.now\(\)/, `${f} reads a clock instead of being given one`);
    }
  });

  test('the score engines were not touched by this pass', () => {
    for (const f of ['lib/ledger-score.ts', 'lib/ledger-score-v2.ts']) {
      const src = read(f);
      assert.doesNotMatch(src, /legacy-backfill|event-compaction|academic_events/,
        `${f} was edited — M7 moves no score`);
    }
    // RECOVERY_EPOCH_MS is cited as a PRECEDENT and is not read, changed or
    // generalised. LEGACY_EPOCH_MS is its sibling, not its replacement.
    assert.match(read('lib/ledger-score-v2.ts'), /export const RECOVERY_EPOCH_MS = Date\.parse\("2026-07-17T00:00:00Z"\)/);
    assert.equal(B.LEGACY_EPOCH_MS, Date.parse('2026-08-15T00:00:00Z'));
    assert.notEqual(B.LEGACY_EPOCH_MS, Date.parse('2026-07-17T00:00:00Z'));
  });
});
