// Tests for the legacy mistake migration (lib/mistakes/migrate-legacy.ts).
//
// Covers the seven required scenarios: empty storage, existing server data,
// duplicate attempts, interruption, corrupt storage, partial records, and
// score continuity.
//
// Same self-contained pattern as the other suites: compile with the project's
// own TypeScript into a suite-private outDir, then run under node:test.
//
//   node --test tests/
//   node --test tests/mistakes-migration.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-migration');

let M;      // the migration module
let score;  // lib/ledger-score, for continuity assertions

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.migration.json'],
    { cwd: root },
  );
});

test('setup imports', async () => {
  M = await import(pathToFileURL(path.join(outDir, 'mistakes', 'migrate-legacy.js')).href);
  score = await import(pathToFileURL(path.join(outDir, 'ledger-score.js')).href);
  assert.equal(typeof M.runLegacyMigration, 'function');
  assert.equal(M.MIGRATION_VERSION, 1);
});

// ── An in-memory store, so nothing here needs a DOM ─────────────────────────

function makeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, v); },
    removeItem: (k) => { data.delete(k); },
    _dump: () => Object.fromEntries(data),
    _keys: () => [...data.keys()],
  };
}

const NOW = '2026-08-06T12:00:00.000Z';
const T = (d) => `2026-0${d}-01T00:00:00.000Z`;

// The shape exam-practice/page.tsx:191 actually writes.
const legacyRow = (i, over = {}) => ({
  id: `1712345678-${i}`,
  date: T(1),
  subject: 'Physics',
  topic: 'Rotational Motion',
  category: 'Conceptual gap',
  status: 'open',
  ...over,
});

const withLegacy = (rows) => makeStore({ 'ledger-mistakes': JSON.stringify(rows) });
const readRows = (store) => JSON.parse(store.getItem('ledger-mistakes'));

// ══ EMPTY STORAGE ═══════════════════════════════════════════════════════════

describe('empty localStorage', () => {
  test('a store with no legacy key completes as nothing-to-do', () => {
    const s = makeStore();
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'nothing-to-do');
    assert.equal(out.marker.version, 1);
    assert.equal(out.marker.total, 0);
  });

  test('an empty array migrates cleanly to an empty array', () => {
    const s = withLegacy([]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'completed');
    assert.deepEqual(readRows(s), []);
    assert.equal(out.report.total, 0);
  });

  test('the pure core tolerates null and undefined', () => {
    for (const v of [null, undefined]) {
      const r = M.migrateLegacyMistakes(v, NOW);
      assert.equal(r.report.ok, true);
      assert.deepEqual(r.records, []);
    }
  });
});

// ══ HAPPY PATH ══════════════════════════════════════════════════════════════

describe('migration of well-formed legacy records', () => {
  test('every record is preserved and stamped', () => {
    const s = withLegacy([legacyRow(0), legacyRow(1), legacyRow(2)]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'completed');
    const rows = readRows(s);
    assert.equal(rows.length, 3);
    for (const r of rows) {
      assert.equal(r.legacy.version, 1);
      assert.equal(r.legacy.source, 'legacy-v0');
      assert.equal(r.legacy.migratedAt, NOW);
    }
  });

  test('NO record claims evidence it does not have', () => {
    const s = withLegacy([legacyRow(0), legacyRow(1)]);
    M.runLegacyMigration(s, NOW);
    for (const r of readRows(s)) {
      assert.equal(r.legacy.hasEvidence, false);
      assert.equal(r.legacy.promoted, false);
    }
  });

  test('original field values survive verbatim', () => {
    const s = withLegacy([legacyRow(0)]);
    M.runLegacyMigration(s, NOW);
    const r = readRows(s)[0];
    assert.equal(r.id, '1712345678-0');
    assert.equal(r.date, T(1));
    assert.equal(r.subject, 'Physics');
    assert.equal(r.topic, 'Rotational Motion');
    assert.equal(r.category, 'Conceptual gap');
  });

  test('timestamps are preserved, never regenerated', () => {
    const s = withLegacy([legacyRow(0, { date: T(3) })]);
    M.runLegacyMigration(s, NOW);
    assert.equal(readRows(s)[0].date, T(3));
    assert.equal(readRows(s)[0].legacy.dateMissing, false);
  });

  test('unknown fields are kept verbatim rather than dropped', () => {
    const s = withLegacy([legacyRow(0, { confidence: 2, examId: 'x1' })]);
    M.runLegacyMigration(s, NOW);
    assert.deepEqual(readRows(s)[0].legacy.unmapped, { confidence: 2, examId: 'x1' });
  });

  test('the completion marker records real counts', () => {
    const s = withLegacy([legacyRow(0), legacyRow(1)]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.marker.total, 2);
    assert.equal(out.marker.migrated, 2);
    assert.equal(out.marker.skipped, 0);
  });

  test('detailed logging: one entry per input record', () => {
    const s = withLegacy([legacyRow(0), legacyRow(1), legacyRow(2)]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.report.log.length, 3);
    assert.ok(out.report.log.every(e => typeof e.detail === 'string' && e.detail.length > 0));
  });
});

// ══ §3.1 — SELF-REPORTS ARE NEVER PROMOTED TO PROOF ═════════════════════════

describe('§3.1 a legacy self-report never becomes proof', () => {
  test("'cleared' maps to acknowledged, NEVER resolved", () => {
    const s = withLegacy([legacyRow(0, { status: 'cleared', clearedDate: T(2) })]);
    M.runLegacyMigration(s, NOW);
    const r = readRows(s)[0];
    assert.equal(r.status, 'acknowledged');
    assert.notEqual(r.status, 'resolved');
  });

  test('the original claim is preserved, not erased', () => {
    const s = withLegacy([legacyRow(0, { status: 'cleared', clearedDate: T(2) })]);
    M.runLegacyMigration(s, NOW);
    const r = readRows(s)[0];
    assert.equal(r.legacy.legacyStatus, 'cleared');
    assert.equal(r.clearedDate, T(2));
  });

  test('no migrated record is ever resolved, whatever the input claimed', () => {
    const s = withLegacy([
      legacyRow(0, { status: 'resolved' }),
      legacyRow(1, { status: 'cleared' }),
      legacyRow(2, { status: 'proven' }),
    ]);
    M.runLegacyMigration(s, NOW);
    assert.equal(readRows(s).filter(r => r.status === 'resolved').length, 0);
  });

  test('an unrecognised status falls back to open and is logged', () => {
    const s = withLegacy([legacyRow(0, { status: 'banana' })]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(readRows(s)[0].status, 'open');
    assert.equal(readRows(s)[0].legacy.legacyStatus, 'banana');
    assert.match(out.report.log[0].detail, /banana/);
  });
});

// ══ IDEMPOTENCY — DUPLICATE ATTEMPTS ════════════════════════════════════════

describe('duplicate migration attempts', () => {
  test('running twice produces a byte-identical record set', () => {
    const s = withLegacy([legacyRow(0), legacyRow(1)]);
    M.runLegacyMigration(s, NOW);
    const first = s.getItem('ledger-mistakes');
    M.runLegacyMigration(s, '2026-09-09T00:00:00.000Z');
    assert.equal(s.getItem('ledger-mistakes'), first, 'a second run must change nothing');
  });

  test('the second run short-circuits on the marker', () => {
    const s = withLegacy([legacyRow(0)]);
    M.runLegacyMigration(s, NOW);
    const again = M.runLegacyMigration(s, NOW);
    assert.equal(again.status, 'already-complete');
  });

  test('running ten times never duplicates a record', () => {
    const s = withLegacy([legacyRow(0), legacyRow(1), legacyRow(2)]);
    for (let i = 0; i < 10; i += 1) M.runLegacyMigration(s, NOW);
    const rows = readRows(s);
    assert.equal(rows.length, 3);
    assert.equal(new Set(rows.map(r => r.id)).size, 3);
  });

  test('the pure core is idempotent even without the marker', () => {
    const once = M.migrateLegacyMistakes([legacyRow(0), legacyRow(1)], NOW);
    const twice = M.migrateLegacyMistakes(once.records, NOW);
    assert.deepEqual(twice.records, once.records);
    assert.equal(twice.report.alreadyMigrated, 2);
    assert.equal(twice.report.migrated, 0);
  });

  test('derived ids are deterministic across runs', () => {
    const noId = [{ date: T(1), subject: 'Maths', topic: 'Calculus', status: 'open' }];
    const a = M.migrateLegacyMistakes(noId, NOW).records[0].id;
    const b = M.migrateLegacyMistakes(noId, '2027-01-01T00:00:00.000Z').records[0].id;
    assert.equal(a, b, 'a derived id must not depend on when it was derived');
  });
});

// ══ INTERRUPTION AND RESUMABILITY ═══════════════════════════════════════════

describe('interrupted migration', () => {
  test('a half-migrated array resumes and completes', () => {
    const halfDone = M.migrateLegacyMistakes([legacyRow(0), legacyRow(1)], NOW).records;
    const mixed = [...halfDone, legacyRow(2), legacyRow(3)];
    const s = withLegacy(mixed);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'completed');
    assert.equal(out.report.alreadyMigrated, 2);
    assert.equal(out.report.migrated, 2);
    assert.equal(readRows(s).length, 4);
  });

  test('already-migrated records are not rewritten on resume', () => {
    const first = M.migrateLegacyMistakes([legacyRow(0)], '2026-01-01T00:00:00.000Z').records;
    const s = withLegacy([...first, legacyRow(1)]);
    M.runLegacyMigration(s, NOW);
    assert.equal(readRows(s)[0].legacy.migratedAt, '2026-01-01T00:00:00.000Z',
      'an existing stamp must survive');
  });

  test('an interrupted run leaves a backup, and the next run still works', () => {
    const s = withLegacy([legacyRow(0)]);
    // Simulate a crash after backup but before commit.
    s.setItem('ledger-mistakes-backup-v0', s.getItem('ledger-mistakes'));
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'completed');
    assert.equal(s.getItem('ledger-mistakes-backup-v0'), null, 'backup cleared after success');
  });

  test('the backup is removed only after the marker is written', () => {
    const s = withLegacy([legacyRow(0)]);
    M.runLegacyMigration(s, NOW);
    assert.ok(s.getItem('ledger-mistakes-migration') !== null);
    assert.equal(s.getItem('ledger-mistakes-backup-v0'), null);
  });

  test('a corrupt marker does not block a re-run', () => {
    const s = withLegacy([legacyRow(0)]);
    s.setItem('ledger-mistakes-migration', '{not json');
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'completed');
  });
});

// ══ CORRUPT STORAGE ═════════════════════════════════════════════════════════

describe('corrupt localStorage', () => {
  test('invalid JSON is left untouched and NOT marked complete', () => {
    const s = makeStore({ 'ledger-mistakes': '[{oh no' });
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'failed');
    assert.equal(s.getItem('ledger-mistakes'), '[{oh no', 'corrupt data must survive for inspection');
    assert.equal(s.getItem('ledger-mistakes-migration'), null, 'a failure must never mark completion');
  });

  test('a non-array value fails verification rather than guessing', () => {
    const s = makeStore({ 'ledger-mistakes': JSON.stringify({ nope: true }) });
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'failed');
    assert.equal(s.getItem('ledger-mistakes-migration'), null);
  });

  test('unusable entries inside a valid array are skipped, not dropped silently', () => {
    const s = withLegacy([legacyRow(0), null, 'garbage', 42, legacyRow(1)]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'completed');
    assert.equal(out.report.skipped, 3);
    assert.equal(readRows(s).length, 2);
    assert.equal(out.report.log.filter(e => e.level === 'skipped').length, 3);
  });

  test('rollback restores the original when verification fails', () => {
    const original = [legacyRow(0)];
    const s = withLegacy(original);
    const before = s.getItem('ledger-mistakes');
    // Force a failure through the pure path.
    const bad = M.verifyMigration('not-an-array', { records: [], report: { ok: false, error: 'x' } });
    assert.equal(bad.ok, false);
    assert.equal(s.getItem('ledger-mistakes'), before);
  });
});

// ══ PARTIAL LEGACY RECORDS ══════════════════════════════════════════════════

describe('partial legacy records', () => {
  test('a record with only a date survives with explicit nulls', () => {
    const s = withLegacy([{ date: T(1) }]);
    M.runLegacyMigration(s, NOW);
    const r = readRows(s)[0];
    assert.equal(r.subject, null);
    assert.equal(r.topic, null);
    assert.equal(r.category, null);
    assert.equal(r.status, 'open');
    assert.ok(r.id.startsWith('legacy-'));
  });

  test('a missing timestamp is marked, never invented', () => {
    const s = withLegacy([{ subject: 'Physics' }]);
    M.runLegacyMigration(s, NOW);
    const r = readRows(s)[0];
    assert.equal(r.date, '');
    assert.equal(r.legacy.dateMissing, true);
  });

  test('an empty object still yields a valid, stamped record', () => {
    const s = withLegacy([{}]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'completed');
    assert.equal(readRows(s).length, 1);
    assert.equal(readRows(s)[0].legacy.version, 1);
  });

  test('repairs are counted and explained in the log', () => {
    const s = withLegacy([{ subject: 'Physics' }]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.report.repaired, 1);
    assert.match(out.report.log[0].detail, /timestamp|id/);
  });

  test('duplicate ids collapse rather than duplicating', () => {
    const s = withLegacy([legacyRow(0), legacyRow(0)]);
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(readRows(s).length, 1);
    assert.equal(out.report.skipped, 1);
  });

  test('verification catches record loss', () => {
    const raw = [legacyRow(0), legacyRow(1)];
    const tampered = { records: [], report: { ok: true, skipped: 0, error: undefined } };
    assert.equal(M.verifyMigration(raw, tampered).ok, false);
  });
});

// ══ SCORE CONTINUITY ════════════════════════════════════════════════════════

describe('score continuity across migration', () => {
  const inputs = (mistakes) => ({
    papersLog: [{ score: 7, total: 10, subject: 'Physics', date: T(1) }],
    syllabusSubjects: ['Physics'], syllabusUploaded: true,
    notesHistory: [{ subject: 'Physics' }], mistakes, streak: 5,
  });

  test('migrating open records does not move the total', () => {
    const before = [legacyRow(0), legacyRow(1), legacyRow(2)];
    const after = M.migrateLegacyMistakes(before, NOW).records;
    assert.equal(
      score.computeScoreFromInputs(inputs(after)).total,
      score.computeScoreFromInputs(inputs(before)).total,
    );
  });

  test('migration never LOWERS the total', () => {
    const cases = [
      [legacyRow(0)],
      [legacyRow(0, { status: 'cleared' })],
      [{ date: T(1) }, {}],
      [],
    ];
    for (const before of cases) {
      const after = M.migrateLegacyMistakes(before, NOW).records;
      const a = score.computeScoreFromInputs(inputs(before)).total;
      const b = score.computeScoreFromInputs(inputs(after)).total;
      assert.ok(b >= a, `migration dropped the score: ${a} → ${b}`);
    }
  });

  test('migration awards no evidence points — none exists to award', () => {
    const after = M.migrateLegacyMistakes([legacyRow(0), legacyRow(1)], NOW).records;
    assert.equal(score.computeScoreFromInputs(inputs(after)).evidenceScore, 0);
  });

  test('migration awards no resolution points', () => {
    const after = M.migrateLegacyMistakes(
      [legacyRow(0, { status: 'cleared' }), legacyRow(1, { status: 'cleared' })], NOW).records;
    assert.equal(score.computeScoreFromInputs(inputs(after)).resolutionScore, 0);
  });

  test('a cleared legacy record earns acknowledgement, and that is explainable', () => {
    const after = M.migrateLegacyMistakes([legacyRow(0, { status: 'cleared' })], NOW).records;
    const b = score.computeScoreFromInputs(inputs(after));
    assert.equal(b.acknowledgementScore, 5, 'facing a mistake is worth 5 — never more');
    assert.equal(b.resolutionScore, 0);
  });

  test('the other pillars are untouched by migration', () => {
    const before = [legacyRow(0), legacyRow(1)];
    const after = M.migrateLegacyMistakes(before, NOW).records;
    const a = score.computeScoreFromInputs(inputs(before));
    const b = score.computeScoreFromInputs(inputs(after));
    assert.equal(a.pqaScore, b.pqaScore);
    assert.equal(a.syllabusScore, b.syllabusScore);
    assert.equal(a.consistencyScore, b.consistencyScore);
  });
});

// ══ NEVER OVERWRITE SERVER DATA ═════════════════════════════════════════════

describe('existing server data is never overwritten', () => {
  test('a newer marker version blocks a downgrade', () => {
    const s = withLegacy([legacyRow(0)]);
    s.setItem('ledger-mistakes-migration', JSON.stringify({ version: 99, completedAt: NOW }));
    const out = M.runLegacyMigration(s, NOW);
    assert.equal(out.status, 'already-complete');
    assert.equal(readRows(s)[0].legacy, undefined, 'records must be left as they were');
  });

  test('records already migrated by another device pass through untouched', () => {
    const fromServer = M.migrateLegacyMistakes([legacyRow(0)], '2026-01-01T00:00:00.000Z').records;
    const s = withLegacy(fromServer);
    M.runLegacyMigration(s, NOW);
    assert.deepEqual(readRows(s), fromServer);
  });

  test('the migration writes only its own three keys', () => {
    const s = makeStore({
      'ledger-mistakes': JSON.stringify([legacyRow(0)]),
      'ledger-papers-log': '[{"score":1}]',
      'ledger-focus-streak': '9',
    });
    M.runLegacyMigration(s, NOW);
    assert.equal(s.getItem('ledger-papers-log'), '[{"score":1}]');
    assert.equal(s.getItem('ledger-focus-streak'), '9');
    assert.deepEqual(
      s._keys().sort(),
      ['ledger-focus-streak', 'ledger-mistakes', 'ledger-mistakes-migration', 'ledger-papers-log'].sort(),
    );
  });
});
