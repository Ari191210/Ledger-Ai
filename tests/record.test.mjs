// M13-3 / M13-4 — `/record` EXISTS, SIX MONTHS (AND SIX YEARS) RENDER WITHOUT
// AN UNBOUNDED READ, THE TWO SURFACES IT ABSORBS REDIRECT INTO IT, AND THE
// MORBID METAPHOR FAMILY IS GONE FROM EVERY WORD A STUDENT CAN READ.
//
// Three instruments in one file, the same pairing `tests/diagnosis.test.mjs`
// uses between its two:
//
//   · BEHAVIOURAL proof over the real, compiled `lib/record.ts`, because
//     M13-3's done-when — *"≥6 months renders; parity retained"* — is a claim
//     about arithmetic and about query shape, and the only honest way to assert
//     it is to build a synthetic record that genuinely spans the range, derive
//     the surface from it, and count the queries the derivation asked for.
//
//   · STRUCTURAL fences over source and config, because "the route exists",
//     "the two redirect", "the shell is reused rather than reinvented" and "no
//     write verb exists" are claims about the shape of the tree, and this
//     repository has no React test renderer.
//
//   · A REPOSITORY-WIDE CONTENT AUDIT for M13-4, because *"zero uses of
//     obituary/autopsy/coroner/trauma/forensics"* is a claim about the WHOLE
//     tree and not about the pages this milestone happened to touch. It walks
//     every source file in the product and fails on any banned word that
//     survives in something a student can read.
//
//   node --test tests/record.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-record');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

/** Comments explain; only real code counts. Same convention as
 *  tests/diagnosis.test.mjs and tests/home-shell.test.mjs. */
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

let R; // lib/record

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.record.json'],
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
  R = await import(pathToFileURL(path.join(outDir, 'record.js')).href);
  assert.equal(typeof R.buildWindow, 'function');
  assert.equal(typeof R.buildRecord, 'function');
  assert.equal(typeof R.loadRecord, 'function');
});

// ══ FIXTURES — rows shaped exactly as the five relations return them ═════════

const STUDENT = '11111111-1111-4111-8111-111111111111';
const NOW = '2026-08-17T12:00:00.000Z';

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

let seq = 0;
const occ = (over = {}) => ({
  id: uuid(++seq),
  student_id: STUDENT,
  evidence_id: uuid(900000 + seq),
  concept_id: uuid(800000),
  pattern_id: uuid(700001),
  subject: 'Physics',
  chapter: 'Rotational Motion',
  topic: 'Torque',
  question_ref: 'Q7(b)',
  source: 'school-exam',
  marks_lost: 3,
  marks_available: 5,
  cognitive_error: null,
  execution_error: 'sign-error',
  confidence_before: null,
  created_at: '2026-08-01T00:00:00.000Z',
  confirmed_at: '2026-08-02T00:00:00.000Z',
  ...over,
});

const leaf = (over = {}) => ({
  id: uuid(700001),
  student_id: STUDENT,
  tier: 'concept',
  concept_id: uuid(800000),
  parent_pattern_id: uuid(600001),
  subject: 'Physics',
  error_class: 'execution',
  error_type: 'sign-error',
  label: 'Sign error: Torque',
  status: 'open',
  severity: 61,
  severity_version: 'severity-factors@1',
  ...over,
});

const parentRow = () => ({
  id: uuid(600001),
  student_id: STUDENT,
  tier: 'subject',
  concept_id: null,
  parent_pattern_id: null,
  subject: 'Physics',
  error_class: 'execution',
  error_type: 'sign-error',
  label: 'Sign errors in Physics',
  status: 'open',
  severity: null,
  severity_version: null,
});

const emptyRows = over => ({
  occurrenceRows: [],
  patternRows: [],
  evidenceRows: [],
  sessionRows: [],
  closeRows: [],
  unreadable: [],
  truncated: [],
  ...over,
});

// ══ THE WINDOW — the whole of the scale claim, as a value ═══════════════════

describe('the window', () => {
  test('six months is six calendar months, not 180 days', () => {
    const w = R.buildWindow(NOW, 6);
    assert.equal(w.months, 6);
    assert.deepEqual(w.monthKeys, ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
    assert.equal(w.fromISO, '2026-03-01T00:00:00.000Z');
    assert.equal(w.toISO, '2026-09-01T00:00:00.000Z');
  });

  test('the window crosses a year boundary without arithmetic drift', () => {
    const w = R.buildWindow('2026-02-14T00:00:00.000Z', 6);
    assert.deepEqual(w.monthKeys, ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
    assert.equal(w.fromISO, '2025-09-01T00:00:00.000Z');
  });

  test('the key count always equals the month count, for every window offered', () => {
    for (const months of [1, 6, 12, 24, 60]) {
      const w = R.buildWindow(NOW, months);
      assert.equal(w.monthKeys.length, months, `${months} months produced ${w.monthKeys.length} keys`);
      assert.equal(new Set(w.monthKeys).size, months, 'a month key repeated');
    }
  });

  test('a hand-typed ?months cannot turn a range scan into a table scan', () => {
    assert.equal(R.clampMonths(100000), R.MAX_WINDOW_MONTHS);
    assert.equal(R.clampMonths(-5), 1);
    assert.equal(R.clampMonths(Number.NaN), R.DEFAULT_WINDOW_MONTHS);
    assert.equal(R.buildWindow(NOW, 100000).months, R.MAX_WINDOW_MONTHS);
  });

  test('the window is half-open — its last instant belongs to the next window', () => {
    const w = R.buildWindow(NOW, 6);
    assert.equal(R.inWindow(w, w.fromISO), true, 'the window is not inclusive at its start');
    assert.equal(R.inWindow(w, w.toISO), false, 'the window is inclusive at its end and will double-count');
    assert.equal(R.inWindow(w, '2026-02-28T23:59:59.999Z'), false);
    assert.equal(R.inWindow(w, null), false);
  });
});

// ══ THE DONE-WHEN, HALF ONE — ≥6 MONTHS RENDERS ════════════════════════════

/** A synthetic record that genuinely spans `months` months: one confirmed
 *  occurrence, one captured paper, one session and one score close per month. */
function syntheticRecord(months, perMonth = 1) {
  const w = R.buildWindow(NOW, months);
  const occurrenceRows = [];
  const evidenceRows = [];
  const sessionRows = [];
  const closeRows = [];
  for (const key of w.monthKeys) {
    for (let i = 0; i < perMonth; i++) {
      const day = String(1 + (i % 27)).padStart(2, '0');
      const at = `${key}-${day}T09:00:00.000Z`;
      occurrenceRows.push(occ({
        created_at: at,
        confirmed_at: at,
        marks_lost: 2,
        marks_available: 4,
      }));
      evidenceRows.push({ id: uuid(910000 + evidenceRows.length), captured_at: at });
      sessionRows.push({ session_id: uuid(920000 + sessionRows.length), opened_at: at, state: 'VERIFIED' });
    }
    closeRows.push({
      captured_on: `${key}-28`, total: 400, pqa: 179, syllabus: 0, mistakes: 200, consistency: 21,
    });
  }
  return { w, rows: emptyRows({
    occurrenceRows,
    patternRows: [leaf(), parentRow()],
    evidenceRows,
    sessionRows,
    closeRows,
  }) };
}

describe('M13-3 done-when: ≥6 months renders', () => {
  test('six months renders six months, every one of them present', () => {
    const { w, rows } = syntheticRecord(6);
    const rec = R.buildRecord(w, rows);
    assert.equal(rec.timeline.months.length, 6);
    assert.equal(rec.timeline.monthsWithRecord, 6);
    assert.deepEqual(
      rec.timeline.months.map(m => m.month),
      ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
    );
    assert.equal(rec.totals.occurrenceCount, 6);
    assert.equal(rec.totals.marksLost, 12);
    assert.equal(rec.totals.papersCaptured, 6);
    assert.equal(rec.totals.sessionsVerified, 6);
  });

  test('the months are ordered oldest first, and the order is total', () => {
    const { w, rows } = syntheticRecord(24);
    const keys = R.buildRecord(w, rows).timeline.months.map(m => m.month);
    assert.deepEqual(keys, [...keys].sort(), 'the timeline is not in chronological order');
  });

  test('SIX YEARS renders, and costs a row per MONTH — not a row per record', () => {
    // The scale claim, made concrete. 60 months × 40 confirmed questions each
    // is 2,400 rows of record; the timeline the surface renders is 60 rows.
    const { w, rows } = syntheticRecord(60, 40);
    assert.equal(rows.occurrenceRows.length, 2400);
    const rec = R.buildRecord(w, rows);
    assert.equal(rec.timeline.months.length, 60, 'a five-year window did not bucket by month');
    assert.equal(rec.totals.occurrenceCount, 2400);
    assert.equal(rec.totals.marksLost, 4800);
    // Every month carries the ids it is a sum of — the M13-1 discipline, kept.
    for (const m of rec.timeline.months) {
      assert.equal(m.occurrenceIds.length, m.occurrenceCount, `${m.month} claims a count it cannot list`);
    }
  });

  test('every figure is a sum of the ids beside it — no month can claim what it cannot list', () => {
    const { w, rows } = syntheticRecord(12, 3);
    const rec = R.buildRecord(w, rows);
    const byId = new Map(rows.occurrenceRows.map(r => [r.id, r]));
    for (const m of rec.timeline.months) {
      const summed = m.occurrenceIds.reduce((n, id) => n + byId.get(id).marks_lost, 0);
      assert.equal(summed, m.marksLost, `${m.label} claims ${m.marksLost} and its rows sum to ${summed}`);
    }
    const total = rec.timeline.months.reduce((n, m) => n + m.marksLost, 0);
    assert.equal(total, rec.totals.marksLost, 'the standing figure is not the sum of the months');
  });

  test('a row outside the window cannot reach a bucket, even if the query returned it', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows({
      occurrenceRows: [
        occ({ created_at: '2025-01-05T00:00:00.000Z', confirmed_at: '2025-01-06T00:00:00.000Z' }),
        occ({ created_at: '2026-05-05T00:00:00.000Z', confirmed_at: '2026-05-06T00:00:00.000Z' }),
      ],
      patternRows: [leaf(), parentRow()],
    }));
    assert.equal(rec.totals.occurrenceCount, 1, 'a row from before the window was counted');
    assert.equal(rec.timeline.months.find(m => m.month === '2026-05').occurrenceCount, 1);
  });
});

// ══ THE SCALE CLAIM AT THE QUERY LAYER — bounded, windowed, paged ══════════

/** A `RecordDb` double that records every request it is asked for. It answers
 *  from a fixed row set so the assertions are about SHAPE, not about data. */
function countingDb(rowsPerSource = {}) {
  const asked = [];
  const page = (rows, p) => rows.slice(p.page * p.pageSize, p.page * p.pageSize + p.pageSize);
  const verb = (name, rows) => async (studentId, a, b) => {
    // `listPatterns` takes (studentId, page); the rest take (studentId, w, page).
    const p = b ?? a;
    asked.push({ source: name, page: p.page, pageSize: p.pageSize });
    return { data: page(rows, p), error: null };
  };
  return {
    asked,
    db: {
      listConfirmedOccurrences: verb('occurrences', rowsPerSource.occurrences ?? []),
      listPatterns: verb('patterns', rowsPerSource.patterns ?? []),
      listEvidence: verb('evidence', rowsPerSource.evidence ?? []),
      listSessions: verb('sessions', rowsPerSource.sessions ?? []),
      listCloses: verb('closes', rowsPerSource.closes ?? []),
    },
  };
}

describe('M13-3 done-when: six months does not read the whole table', () => {
  test('every read is paged, and a short page ends the loop', async () => {
    const { asked, db } = countingDb();
    const res = await R.loadRecord(db, STUDENT, R.buildWindow(NOW, 6));
    assert.equal(res.ok, true);
    // Five sources, one page each, because every source came back short.
    assert.equal(asked.length, 5, `expected one page per source, got ${asked.length}`);
    for (const a of asked) {
      assert.equal(a.page, 0);
      assert.equal(a.pageSize, R.RECORD_PAGE_SIZE, 'a read was issued without the page size');
    }
  });

  test('a record larger than one page is paged rather than asked for whole', async () => {
    const rows = Array.from({ length: R.RECORD_PAGE_SIZE * 2 + 7 }, () => occ());
    const { asked, db } = countingDb({ occurrences: rows });
    const res = await R.loadRecord(db, STUDENT, R.buildWindow(NOW, 6));
    assert.equal(res.ok, true);
    const occPages = asked.filter(a => a.source === 'occurrences');
    assert.equal(occPages.length, 3, 'the pager did not walk the pages it needed');
    assert.deepEqual(occPages.map(a => a.page), [0, 1, 2]);
    assert.equal(res.record.truncated.includes('occurrences'), false);
  });

  test('the pager REFUSES to loop for ever, and says so rather than reporting a partial total as a total', async () => {
    const rows = Array.from({ length: R.RECORD_PAGE_SIZE * (R.RECORD_MAX_PAGES + 5) }, () => occ());
    const { asked, db } = countingDb({ occurrences: rows });
    const res = await R.loadRecord(db, STUDENT, R.buildWindow(NOW, 60));
    assert.equal(res.ok, true);
    assert.equal(
      asked.filter(a => a.source === 'occurrences').length, R.RECORD_MAX_PAGES,
      'the pager ran past its ceiling',
    );
    assert.ok(res.record.truncated.includes('occurrences'), 'a truncated read was reported as complete');
  });

  test('the endpoint puts the window on the column that heads an existing index', () => {
    const route = code('app/api/record/route.ts');
    // Every windowed read goes through one helper, so no source can become
    // unbounded without deleting shared code.
    assert.match(route, /\.gte\(source\.timeColumn/, 'the window is not applied to the time column');
    assert.match(route, /\.lt\(source\.timeColumn/, 'the window has no upper bound');
    assert.match(route, /\.range\(lo, hi\)/, 'a read was issued without a row range');
    // And there is no read anywhere in the route that skips the range.
    const selects = route.match(/\.select\("\*"\)/g) ?? [];
    const ranges = route.match(/\.range\(/g) ?? [];
    assert.equal(selects.length, ranges.length, 'a select was issued without a matching range');
  });

  test('each source names the index its shape is a range scan on', () => {
    for (const name of ['occurrences', 'evidence', 'sessions', 'closes', 'patterns']) {
      const s = R.RECORD_SOURCES[name];
      assert.ok(s, `${name} is not a declared source`);
      assert.ok(s.index.length > 0, `${name} does not name the index it relies on`);
      assert.ok(s.ownerColumn.length > 0, `${name} does not name its owner column`);
    }
    // The one that predates `student_id`. Guessing it would read nothing.
    assert.equal(R.RECORD_SOURCES.closes.ownerColumn, 'user_id');
    // The record, never the table.
    assert.equal(R.RECORD_SOURCES.occurrences.relation, 'confirmed_occurrences');
  });

  test('every index this route relies on actually exists in a migration', () => {
    const sql = [
      '007_mistakes.sql', '020_occurrence_confirmation.sql',
      '021_study_sessions.sql', '005_score_history.sql',
    ].map(f => read(`supabase/migrations/${f}`)).join('\n');
    for (const name of ['occurrences', 'evidence', 'sessions', 'closes', 'patterns']) {
      assert.ok(
        sql.includes(R.RECORD_SOURCES[name].index),
        `${name} names an index (${R.RECORD_SOURCES[name].index}) that no migration creates`,
      );
    }
  });
});

// ══ NEVER SHAME — a quiet month is not a month of zero ═════════════════════

describe('§4: a quiet month is a different fact from a zero', () => {
  test('a month with nothing recorded says so; it does not report 0', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows({
      occurrenceRows: [occ({ created_at: '2026-08-04T00:00:00.000Z', confirmed_at: '2026-08-04T00:00:00.000Z' })],
      patternRows: [leaf(), parentRow()],
    }));
    const quiet = rec.timeline.months.filter(m => !m.hasRecord);
    assert.equal(quiet.length, 5, 'a quiet month was not marked as such');
    assert.equal(rec.timeline.monthsWithRecord, 1);
  });

  test('an unreadable source is NAMED, and its column is null rather than zero', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows({
      occurrenceRows: [occ({ created_at: '2026-08-04T00:00:00.000Z', confirmed_at: '2026-08-04T00:00:00.000Z' })],
      patternRows: [leaf(), parentRow()],
      evidenceRows: null,
      unreadable: [{ source: 'evidence', message: 'relation does not exist' }],
    }));
    assert.equal(rec.totals.papersCaptured, null, 'an unread source was rendered as zero');
    for (const m of rec.timeline.months) {
      assert.equal(m.papersCaptured, null, `${m.month} shows a paper count it never read`);
    }
    assert.deepEqual(rec.unreadable.map(u => u.source), ['evidence']);
  });

  test('a supplementary source that errors degrades; the spine that errors FAILS', async () => {
    const failing = message => async () => ({ data: null, error: { message } });
    const ok = async () => ({ data: [], error: null });

    const degraded = await R.loadRecord({
      listConfirmedOccurrences: ok, listPatterns: ok,
      listEvidence: failing('no evidence table'), listSessions: ok, listCloses: ok,
    }, STUDENT, R.buildWindow(NOW, 6));
    assert.equal(degraded.ok, true, 'a missing supplementary source took the whole surface down');
    assert.deepEqual(degraded.record.unreadable.map(u => u.source), ['evidence']);

    const failed = await R.loadRecord({
      listConfirmedOccurrences: failing('permission denied'), listPatterns: ok,
      listEvidence: ok, listSessions: ok, listCloses: ok,
    }, STUDENT, R.buildWindow(NOW, 6));
    assert.equal(failed.ok, false, 'a read that did not happen was reported as an empty record');
    assert.equal(failed.error.message, 'permission denied');
  });

  test('an empty record is EMPTY, never a record of zeroes', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows());
    assert.equal(R.isEmptyRecord(rec), true);
    assert.equal(rec.timeline.months.length, 6, 'an empty record still knows the window it read');
    assert.equal(rec.timeline.monthsWithRecord, 0);
    assert.equal(rec.latestClose, null);
  });
});

// ══ THE PATTERN LIST ═══════════════════════════════════════════════════════

describe('the pattern list', () => {
  test('leaves only — a parent is a heading, not an entry (§4.4.2)', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows({
      occurrenceRows: [occ({ created_at: '2026-08-01T00:00:00.000Z', confirmed_at: '2026-08-01T00:00:00.000Z' })],
      patternRows: [leaf(), parentRow()],
    }));
    assert.equal(rec.patterns.length, 1);
    assert.equal(rec.patterns[0].patternId, uuid(700001));
  });

  test('the count is COUNTED from the trail, never read from recurrence_count', () => {
    const w = R.buildWindow(NOW, 6);
    // A stored counter that would let the screen claim nine and list two.
    const rows = emptyRows({
      occurrenceRows: [
        occ({ created_at: '2026-08-01T00:00:00.000Z', confirmed_at: '2026-08-01T00:00:00.000Z' }),
        occ({ created_at: '2026-07-01T00:00:00.000Z', confirmed_at: '2026-07-01T00:00:00.000Z' }),
      ],
      patternRows: [{ ...leaf(), recurrence_count: 9 }, parentRow()],
    });
    const p = R.buildRecord(w, rows).patterns[0];
    assert.equal(p.occurrenceCount, 2, 'the stored counter leaked onto the surface');
    assert.equal(p.occurrenceIds.length, 2);
    assert.equal(p.marksLost, 6);
    assert.equal(p.firstSeenAt, '2026-07-01T00:00:00.000Z');
    assert.equal(p.lastSeenAt, '2026-08-01T00:00:00.000Z');
  });

  test('a pattern with no occurrence in the window is QUIET, not deleted', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows({ patternRows: [leaf(), parentRow()] }));
    assert.equal(rec.patterns.length, 1);
    assert.equal(rec.patterns[0].quietInWindow, true);
    assert.equal(rec.patterns[0].occurrenceCount, 0);
  });

  test('severity is `007`s stored column with its version — never recomputed here', () => {
    const w = R.buildWindow(NOW, 6);
    const p = R.buildRecord(w, emptyRows({
      patternRows: [leaf({ severity: 77, severity_version: 'severity-factors@1' }), parentRow()],
    })).patterns[0];
    assert.equal(p.severity, 77);
    assert.equal(p.severityVersion, 'severity-factors@1');
    const src = code('lib/record.ts');
    assert.doesNotMatch(src, /severity\s*=\s*[^;]*Math\./, 'severity is being computed on the record surface');
  });

  test('the order is deterministic and total — live first, then worst, then weight', () => {
    const w = R.buildWindow(NOW, 6);
    const rows = emptyRows({
      patternRows: [
        leaf({ id: uuid(700001), status: 'resolved', severity: 90, label: 'A' }),
        leaf({ id: uuid(700002), status: 'open', severity: 20, label: 'B' }),
        leaf({ id: uuid(700003), status: 'open', severity: 55, label: 'C' }),
        parentRow(),
      ],
    });
    const first = R.buildRecord(w, rows).patterns.map(p => p.label);
    const again = R.buildRecord(w, rows).patterns.map(p => p.label);
    assert.deepEqual(first, ['C', 'B', 'A'], 'a resolved pattern outranked two live ones');
    assert.deepEqual(first, again, 'two runs over the same rows produced two orders');
  });

  test('an unconfirmed occurrence is never counted, and the refusal is reported', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows({
      occurrenceRows: [occ({ confirmed_at: null, created_at: '2026-08-01T00:00:00.000Z' })],
      patternRows: [leaf(), parentRow()],
    }));
    assert.equal(rec.totals.occurrenceCount, 0, 'a proposal was counted as a fact');
    assert.deepEqual(rec.refused, [{ refusal: 'not-confirmed', count: 1 }]);
  });
});

// ══ THE CLOSES — `/console/analytics`s series, on rows instead of constants ══

describe('the recorded closes', () => {
  test('the latest close in the window is the one shown', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows({
      closeRows: [
        { captured_on: '2026-07-10', total: 350, pqa: 1, syllabus: 2, mistakes: 3, consistency: 4 },
        { captured_on: '2026-08-14', total: 379, pqa: 1, syllabus: 2, mistakes: 3, consistency: 4 },
        { captured_on: '2026-08-02', total: 362, pqa: 1, syllabus: 2, mistakes: 3, consistency: 4 },
      ],
    }));
    assert.equal(rec.latestClose.total, 379);
    assert.equal(rec.latestClose.capturedOn, '2026-08-14');
    // Within a month, the month carries its LAST close, not its first.
    assert.equal(rec.timeline.months.find(m => m.month === '2026-08').close.total, 379);
  });

  test('a close outside the window is not the latest close', () => {
    const w = R.buildWindow(NOW, 6);
    const rec = R.buildRecord(w, emptyRows({
      closeRows: [{ captured_on: '2024-01-01', total: 999, pqa: 0, syllabus: 0, mistakes: 0, consistency: 0 }],
    }));
    assert.equal(rec.latestClose, null);
  });

  test('a close with no readable total is refused rather than rendered as zero', () => {
    assert.equal(R.readClose({ captured_on: '2026-08-01' }), null);
    assert.equal(R.readClose({ total: 400 }), null);
  });
});

// ══ M13-3 — THE SURFACE EXISTS AND THE TWO REDIRECT ════════════════════════

describe('M13-3: /record exists and reuses the established shell', () => {
  test('the route, its layout and its endpoint exist', () => {
    assert.ok(exists('app/record/page.tsx'));
    assert.ok(exists('app/record/layout.tsx'));
    assert.ok(exists('app/api/record/route.ts'));
    assert.ok(exists('lib/record.ts'));
  });

  test('the shell is /home`s and /diagnosis`s, imported rather than reinvented', () => {
    const layout = code('app/record/layout.tsx');
    assert.match(layout, /AuthGuard/, 'the record surface is not behind the auth guard');
    assert.match(layout, /VitalityShell/, 'the record surface invented its own token host');
    assert.match(layout, /console\/console\.css/, 'the record surface invented its own stylesheet');
    assert.match(layout, /robots:\s*\{\s*index:\s*false/, 'a private student record is indexable');
  });

  test('the page renders through the Console primitives, not through bespoke markup', () => {
    const page = code('app/record/page.tsx');
    assert.match(page, /from "@\/components\/console\/primitives"/);
    assert.doesNotMatch(page, /className="mono"/, 'the page reached for the legacy editorial classes');
  });

  test('the page holds no arithmetic — lib/record.ts owns every figure', () => {
    const page = code('app/record/page.tsx');
    // The only division on the page is a Track ratio, which is presentation.
    const derivations = page.match(/reduce\(/g) ?? [];
    assert.equal(derivations.length, 0, 'the page derives a figure instead of rendering one');
  });

  test('NO WRITE VERB EXISTS — not in the interface, not in the endpoint', () => {
    const lib = code('lib/record.ts');
    assert.doesNotMatch(lib, /\b(insert|update|upsert|delete)\s*\(/i, 'a write verb reached lib/record.ts');
    const route = code('app/api/record/route.ts');
    assert.match(route, /export async function GET/);
    for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.doesNotMatch(
        route, new RegExp(`export\\s+(async\\s+)?function\\s+${verb}\\b`),
        `/api/record exports ${verb}; the record is not editable from a read surface`,
      );
    }
  });

  test('the endpoint uses the student`s own client, never the service role', () => {
    const route = code('app/api/record/route.ts');
    assert.match(route, /createStudentServerClient/);
    assert.doesNotMatch(route, /supabaseServer|service_role|SERVICE_ROLE/,
      'the record endpoint can bypass RLS');
  });

  test('lib/record.ts is I/O-free — no client, no clock, no next/*', () => {
    const lib = code('lib/record.ts');
    assert.doesNotMatch(lib, /from ["']next\//, 'lib/record.ts imports from next/*');
    assert.doesNotMatch(lib, /supabase/i, 'lib/record.ts reaches for a database client');
    assert.doesNotMatch(lib, /Date\.now\(\)|new Date\(\)/, 'lib/record.ts reads a clock');
    assert.doesNotMatch(lib, /Math\.random/, 'lib/record.ts is not deterministic');
  });
});

describe('M13-3: grade-tracker and /console/analytics are absorbed', () => {
  const TWO = {
    '/tools/grade-tracker': '/record',
    '/console/analytics': '/record',
  };

  test('both redirect, permanently, to /record', () => {
    const cfg = read('next.config.mjs');
    for (const [source, destination] of Object.entries(TWO)) {
      const re = new RegExp(
        `source:\\s*"${source.replace(/\//g, '\\/')}"\\s*,\\s*destination:\\s*"${destination.replace(/\//g, '\\/')}"\\s*,\\s*permanent:\\s*true`,
      );
      assert.match(cfg, re, `${source} does not permanently redirect to ${destination}`);
    }
  });

  test('the redirects are exact-path — no wildcard swallows a route M13 does not merge', () => {
    const cfg = read('next.config.mjs');
    assert.doesNotMatch(cfg, /source:\s*"\/console\/:/, 'a wildcard redirect was added under /console');
    assert.doesNotMatch(cfg, /destination:\s*"\/record[^"]*"\s*,\s*permanent:\s*false/,
      'a temporary record redirect exists');
    // The four `/console/*` children M3 deliberately kept still resolve.
    for (const kept of ['ai', 'practice', 'work']) {
      assert.doesNotMatch(
        cfg, new RegExp(`source:\\s*"\\/console\\/${kept}"`),
        `/console/${kept} was redirected by M13-3, which merges analytics and not the rest`,
      );
    }
  });

  test('neither page file was gutted — M8`s precedent, not M3`s stub', () => {
    for (const rel of ['app/tools/grade-tracker/page.tsx', 'app/console/analytics/page.tsx']) {
      assert.ok(exists(rel), `${rel} was deleted; §2.3 keeps the repository whole`);
      assert.ok(read(rel).length > 500, `${rel} was reduced to a stub`);
    }
  });

  test('what did not survive the merge is STATED in the config, not glossed', () => {
    const cfg = read('next.config.mjs');
    const block = cfg.slice(cfg.indexOf('M13-3 — THE LONGITUDINAL ASSET'));
    assert.ok(block.length > 0, 'M13-3 added redirects with no accounting beside them');
    assert.match(block, /WHAT THE STUDENT LOSES TODAY/, 'the merge does not account for what it dropped');
    for (const dropped of ['MARKS PREDICTOR', 'LEDGER SCORE TAB', 'PEER HEATMAP', 'EXAM DEBRIEF']) {
      assert.ok(block.includes(dropped), `${dropped} was dropped without being named`);
    }
  });

  test('the score formula is NOT reimplemented here — M14 owns it', () => {
    const lib = code('lib/record.ts');
    const page = code('app/record/page.tsx');
    for (const src of [lib, page]) {
      assert.doesNotMatch(src, /ledger-score/, 'the record surface imports the score engine M14 rebuilds');
      assert.doesNotMatch(src, /computeLedgerScore|scoreTier/, 'the v1 score was reimplemented on /record');
    }
    // What IS carried is the RECORDED close — a fact, not a formula.
    assert.match(lib, /score_history/, 'the recorded closes are not read');
  });

  test('the fabricated surfaces are not reproduced — S.9 and Law 7', () => {
    const lib = code('lib/record.ts');
    const page = code('app/record/page.tsx');
    for (const src of [lib, page]) {
      assert.doesNotMatch(src, /HEAT_DATA|heatColor|examiner obsession/i, 'the illustrative heatmap came along');
      // No forecast MACHINERY, and no forecast LANGUAGE. The page is allowed to
      // say that nothing is predicted; it is not allowed to predict.
      assert.doesNotMatch(src, /score-projection|scoreProjection|projectScore|currentInputs/,
        'a projection module was imported onto the record');
      assert.doesNotMatch(src, /at this rate|on track to|you will reach|expected to/i,
        'the record forecasts in prose');
    }
    // And it says so, which is what a student reads instead of a trend line.
    assert.match(page, /Nothing here is predicted/,
      'the record does not tell the reader it is not forecasting');
  });
});

// ══ M13-4 — THE MORBID METAPHOR FAMILY, RETIRED REPOSITORY-WIDE ════════════

/**
 * `PRODUCT_PRINCIPLES` §4.1, verbatim: *"Obituary · autopsy · coroner · cause
 * of death · trauma · cremator · forensics … Banned, not softened."*
 *
 * THE SCOPE DECISION THIS AUDIT ENCODES, stated once here rather than argued
 * per file. The done-when is *"zero uses … in all surviving copy"*, and COPY is
 * what a student can read. Three categories are therefore treated differently,
 * and the third is asserted to still be clean:
 *
 *   1. COPY — a string literal that reaches the screen, an AI prompt that tells
 *      a model to write in the metaphor, a label, a share text, a placeholder.
 *      **Zero tolerance.** That is what this audit walks the tree for.
 *   2. IDENTIFIERS — route paths (`/tools/paper-autopsy`), file names, type
 *      names (`TraumaMapResult`), AI capability keys (`paper_trauma_map`), JSON
 *      wire fields (`trauma_signature`), localStorage keys
 *      (`forensics_sessions`) and CSS scope comments. **Deliberately kept.**
 *      They are never rendered; renaming the route paths would break the 301s
 *      M13-2 built, and renaming the capability keys and wire fields would
 *      orphan every `ai_history` row and every saved session already stored
 *      under them — a real regression traded for no word removed from any
 *      screen. `PRODUCT_DECISIONS` §2.5 and S.4 both keep the URLs resolving.
 *   3. SUBJECT MATTER — `lib/papers-data.ts` carries two CBSE Psychology
 *      multiple-choice questions about post-traumatic stress disorder. That is
 *      the syllabus, not the product's voice: §4.1 bans the metaphor family as
 *      BRANDING for a student's marks, and deleting a real exam question
 *      because it names a clinical condition would corrupt the question bank to
 *      satisfy a copy rule. **Excluded, by name, below.**
 */
const BANNED = ['obituary', 'autopsy', 'coroner', 'cause of death', 'trauma', 'cremator', 'forensic'];

/** Files walked. The whole product tree — not the pages this milestone
 *  touched. */
const AUDIT_DIRS = ['app', 'lib', 'components', 'hooks', 'design-system'];
const AUDIT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css']);

function auditFiles() {
  const out = [];
  const walk = dir => {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      if (e.isDirectory()) { walk(rel); continue; }
      if (AUDIT_EXT.has(path.extname(e.name))) out.push(rel);
    }
  };
  for (const d of AUDIT_DIRS) walk(d);
  return out;
}

/**
 * Every string a reader could see, pulled out of a source file.
 *
 * Comments are stripped first (a comment naming the ban is not a use of it),
 * then the file's string and template literals are collected. An identifier is
 * not a string literal, so `paper_trauma_map` as a `case` label or a type name
 * never reaches this function — which is exactly the category-2 line above,
 * enforced by the extractor rather than by an allowlist.
 */
function readableStrings(rel) {
  const src = code(rel);
  const strings = [];
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(src)) !== null) strings.push(m[1] ?? m[2] ?? m[3] ?? '');
  // JSX text nodes are not string literals. Take everything between tags too.
  for (const t of src.match(/>[^<>{}]{3,}</g) ?? []) strings.push(t.slice(1, -1));
  return strings.map(s =>
    s
      // `${result.trauma_signature}` inside a template literal is CODE reading
      // a field, not a word on the screen. Category 2 again — the extractor
      // removes it rather than an allowlist excusing it.
      .replace(/\$\{[^}]*\}/g, ' ')
      // A quoted snake_case token inside an AI prompt is the JSON wire schema
      // the model must return (`"trauma_signature": "..."`). Same category.
      .replace(/"[a-z0-9_]+"/g, ' '),
  );
}

/** Identifier-shaped tokens — `paper_trauma_map`, `forensics_sessions`,
 *  `/tools/paper-autopsy`, `paper_autopsy_history`. A string literal that IS an
 *  identifier is category 2; a string literal that is a SENTENCE is category 1.
 *  The test below asserts the distinction rather than assuming it. */
const isIdentifier = s => /^[A-Za-z0-9_\-./@]+$/.test(s.trim());

/** Category 3, by name and with its reason recorded above. */
const SUBJECT_MATTER = new Set(['lib/papers-data.ts']);

describe('M13-4: the morbid metaphor family is retired from all surviving copy', () => {
  test('PRODUCT_PRINCIPLES §4.1 still bans exactly the words this audit walks for', () => {
    const principles = read('PRODUCT_PRINCIPLES.md');
    const section = principles.slice(principles.indexOf('## 4.1'));
    for (const word of BANNED) {
      assert.ok(
        section.toLowerCase().includes(word),
        `§4.1 no longer names "${word}" — this audit and the principle have drifted apart`,
      );
    }
  });

  test('ZERO banned words in any string a student can read, ACROSS THE WHOLE TREE', () => {
    const offences = [];
    for (const rel of auditFiles()) {
      if (SUBJECT_MATTER.has(rel)) continue;
      for (const s of readableStrings(rel)) {
        if (isIdentifier(s)) continue;
        const lower = s.toLowerCase();
        for (const word of BANNED) {
          if (lower.includes(word)) offences.push(`${rel}: "${s.slice(0, 120)}" (${word})`);
        }
      }
    }
    assert.deepEqual(offences, [], `banned copy survives:\n  ${offences.join('\n  ')}`);
  });

  test('the four tools that carried the family no longer carry it in the registry', () => {
    const reg = code('lib/tools-registry.ts');
    for (const slug of ['paper-autopsy', 'marks-obituary', 'marks-forensics', 'paper-trauma']) {
      const line = reg.split('\n').find(l => l.includes(`slug: "${slug}"`));
      assert.ok(line, `${slug} left the registry; §1.4's deletion gate forbids that`);
      for (const word of BANNED) {
        // The slug itself is category 2 and is stripped before the check.
        const rest = line.replace(new RegExp(`slug:\\s*"${slug}"`), '');
        assert.ok(
          !rest.toLowerCase().includes(word),
          `${slug}'s registry copy still says "${word}"`,
        );
      }
    }
  });

  test('the AI prompts no longer instruct a model to write in the metaphor', () => {
    const route = code('app/api/ai/route.ts');
    // The prompt bodies are template literals. Every banned word left in this
    // file must be an identifier — a case label, a params key or a JSON field.
    for (const line of route.split('\n')) {
      const lower = line.toLowerCase();
      for (const word of BANNED) {
        if (!lower.includes(word)) continue;
        const identifierUse =
          /case\s+"[a-z_]*"/.test(line) ||
          /^\s*[a-z_]+:\s*\[/.test(line) ||
          /"[a-z_]*(trauma|autopsy|obituary|forensic|cremator)[a-z_]*"\s*:/.test(lower) ||
          /ToolName|validTools|\|\s*"/.test(line) ||
          /that field name is a wire contract/.test(line);
        assert.ok(
          identifierUse,
          `app/api/ai/route.ts writes "${word}" as prose, not as an identifier:\n    ${line.trim().slice(0, 200)}`,
        );
      }
    }
  });

  test('the identifiers M13-4 deliberately kept are still intact, so nothing broke', () => {
    // Category 2, asserted rather than assumed: the routes still resolve, the
    // wire contracts still match, and the stored history is still readable.
    for (const slug of ['paper-autopsy', 'marks-obituary', 'marks-forensics', 'paper-trauma']) {
      assert.ok(exists(`app/tools/${slug}/page.tsx`), `${slug}'s page was renamed away`);
    }
    const cfg = read('next.config.mjs');
    assert.match(cfg, /source:\s*"\/tools\/paper-autopsy"/, 'M13-2`s redirect lost its source path');
    assert.match(cfg, /source:\s*"\/tools\/cremator"/, 'M3`s redirect lost its source path');
    // M15-3 moved the 86-arm switch out of app/api/ai/route.ts into
    // per-capability modules under lib/ai-capabilities/prompts/ — a capability
    // key now lives as `export const <key>` there, not as `case "<key>"` in
    // the route. The wire contract this test guards (a capability name is
    // still reachable, unrenamed) is unchanged; only where it is declared
    // moved, which is M15-3's whole point.
    const promptFiles = ['group-01', 'group-02', 'group-03', 'group-04', 'group-05']
      .map(f => read(`lib/ai-capabilities/prompts/${f}.ts`))
      .join('\n');
    for (const key of ['paper_autopsy', 'marks_obituary', 'marks_forensics', 'paper_trauma_map', 'cremator']) {
      assert.ok(
        promptFiles.includes(`export const ${key}:`),
        `the ${key} capability key was renamed; ai_invocations is now orphaned`,
      );
    }
    assert.ok(
      read('app/tools/paper-trauma/page.tsx').includes('trauma_signature'),
      'the trauma_signature wire field was renamed; stored results no longer parse',
    );
  });
});
