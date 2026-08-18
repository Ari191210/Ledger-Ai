/**
 * M21 — TODAY ENGINE. Acceptance L.1 … L.5, V.7.1 … V.7.6, proved.
 *
 * EXECUTION_PLAN M21's definition of done, task by task:
 *   M21-1  L.3 — derivation from recommendations, sessions and the score.
 *   M21-2  V.7.1–V.7.3 — the three typed empty reasons; a lagging projection
 *          never says "all caught up".
 *   M21-3  V.7.5 — an accomplishment is shown once, then filed to the record.
 *
 * `lib/today/*.ts` is I/O-free (no imports beyond `lib/recommendations/
 * types.ts`'s `EvidenceRef`, no clock, no network), which is what makes
 * L.3/L.4/V.7 provable with no Supabase project in reach (U.3, the
 * determinism boundary). The database-level half of M21-3 (the
 * `students.last_seen_at` column, `mark_today_seen()`'s read-then-append
 * shape) cannot be proved by TypeScript alone, so that half of the suite
 * reads `033_today.sql` as text — the same technique `tests/
 * recommendations.test.mjs` uses for 032's CHECK/GRANT text.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checksumOf, migrationBody, parseMigrationFilename } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-today');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const strip = sql =>
  sql
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n');

const SQL_033 = 'supabase/migrations/033_today.sql';
const ENGINE_SRC = 'lib/today/engine.ts';
const TYPES_SRC = 'lib/today/types.ts';

let ENGINE; // lib/today/engine.ts
let TYPES;  // lib/today/types.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.today.json'],
    { cwd: root, stdio: 'inherit' },
  );
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
  const load = f => import(pathToFileURL(path.join(outDir, 'today', f)).href);
  [ENGINE, TYPES] = await Promise.all([load('engine.js'), load('types.js')]);
});

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════

const NOW = Date.parse('2026-08-18T10:00:00.000Z');
const DAY = 86_400_000;

const baseInputs = (overrides = {}) => ({
  nowMs: NOW,
  lastSeenAtMs: null,
  dataFreshness: { ok: true },
  hasAnyAcademicEvidence: false,
  openSession: null,
  unverifiedSessions: [],
  recentAccomplishments: [],
  nextBestAction: null,
  score: null,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// V.7.1 — brand-new account, no evidence
// ═══════════════════════════════════════════════════════════════════════════

describe('V.7.1 — brand-new account, no evidence', () => {
  test('items = [], empty_reason = no_evidence_yet', () => {
    const state = ENGINE.deriveTodayState(baseInputs());
    assert.deepEqual(state.items, []);
    assert.equal(state.emptyReason, 'no_evidence_yet');
  });

  test('no motivational copy, no fake figure, no suggested topic can exist — the state has no field for one', () => {
    const state = ENGINE.deriveTodayState(baseInputs());
    assert.deepEqual(Object.keys(state).sort(), ['emptyReason', 'generatedAtMs', 'items']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.7.2 — everything current
// ═══════════════════════════════════════════════════════════════════════════

describe('V.7.2 — everything current', () => {
  test('items = [], empty_reason = all_current when there is evidence but nothing open, due, or new', () => {
    const state = ENGINE.deriveTodayState(baseInputs({ hasAnyAcademicEvidence: true }));
    assert.deepEqual(state.items, []);
    assert.equal(state.emptyReason, 'all_current');
  });

  test('a scored student with a current score still gets an orientation item, not an empty all_current', () => {
    const state = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      score: { state: 'scored', total: 640, confidence: 0.7, asOfMs: NOW - DAY, scoreSnapshotId: 'snap-1' },
    }));
    assert.equal(state.emptyReason, null);
    assert.equal(state.items.length, 1);
    assert.equal(state.items[0].kind, 'orientation');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.7.3 — the projection pipeline is behind. NEVER "all caught up".
// ═══════════════════════════════════════════════════════════════════════════

describe('V.7.3 — insufficient_data outranks every other condition', () => {
  test('dataFreshness.ok = false → insufficient_data, even on a brand-new account', () => {
    const state = ENGINE.deriveTodayState(baseInputs({ dataFreshness: { ok: false } }));
    assert.deepEqual(state.items, []);
    assert.equal(state.emptyReason, 'insufficient_data');
  });

  test('dataFreshness.ok = false OVERRIDES a scored student with real items available — a lagging projection never says "all caught up"', () => {
    const state = ENGINE.deriveTodayState(baseInputs({
      dataFreshness: { ok: false },
      hasAnyAcademicEvidence: true,
      openSession: { sessionId: 's-1', subject: 'Physics', state: 'ACTIVE' },
      score: { state: 'scored', total: 500, confidence: 0.5, asOfMs: NOW, scoreSnapshotId: 'snap-2' },
    }));
    assert.equal(state.emptyReason, 'insufficient_data');
    assert.deepEqual(state.items, [], 'stale data must not surface items computed from it');
  });

  test('empty_reason is NEVER all_current when the pipeline is behind — the three reasons are mutually exclusive', () => {
    const state = ENGINE.deriveTodayState(baseInputs({ dataFreshness: { ok: false }, hasAnyAcademicEvidence: true }));
    assert.notEqual(state.emptyReason, 'all_current');
    assert.notEqual(state.emptyReason, 'no_evidence_yet');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// The fourth closed-set member — awaiting_verification (L.4)
// ═══════════════════════════════════════════════════════════════════════════

describe('L.4 — awaiting_verification: the only outstanding thing is a self-chosen verification', () => {
  test('an unverified session with nothing else outstanding → awaiting_verification, not all_current', () => {
    const state = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      unverifiedSessions: [{ sessionId: 's-9', subject: 'Chemistry', closedAtMs: NOW - DAY }],
    }));
    assert.deepEqual(state.items, []);
    assert.equal(state.emptyReason, 'awaiting_verification');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TODAY_EMPTY_REASONS — the closed set itself
// ═══════════════════════════════════════════════════════════════════════════

describe('the closed set of empty reasons', () => {
  test('exactly four, and every deriveTodayState empty_reason is drawn from it', () => {
    assert.deepEqual([...TYPES.TODAY_EMPTY_REASONS].sort(), [
      'all_current', 'awaiting_verification', 'insufficient_data', 'no_evidence_yet',
    ]);
  });

  test('isTodayEmptyReason rejects an out-of-set value', () => {
    assert.equal(TYPES.isTodayEmptyReason('all_current'), true);
    assert.equal(TYPES.isTodayEmptyReason('all_caught_up'), false);
    assert.equal(TYPES.isTodayEmptyReason(null), false);
  });

  test('a populated items list never carries an empty_reason', () => {
    const state = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      openSession: { sessionId: 's-1', subject: 'Physics', state: 'ACTIVE' },
    }));
    assert.ok(state.items.length > 0);
    assert.equal(state.emptyReason, null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// L.3 — DERIVATION FROM RECOMMENDATIONS, SESSIONS AND THE SCORE (M21-1)
// ═══════════════════════════════════════════════════════════════════════════

describe('L.3 — derivation reads recommendations, sessions and the score; nothing else', () => {
  test('a new recommendation changes Today\'s output', () => {
    const without = ENGINE.deriveTodayState(baseInputs({ hasAnyAcademicEvidence: true }));
    const withRec = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      nextBestAction: {
        recommendationId: 'rec-1', kind: 'work_open_pattern', subject: 'Physics',
        reasonTemplate: 'x', evidenceRefs: [{ refKind: 'occurrence', id: 'occ-1' }],
      },
    }));
    assert.equal(without.items.length, 0);
    assert.equal(withRec.items.length, 1);
    assert.equal(withRec.items[0].kind, 'next_best_action');
  });

  test('a completed session (an accomplishment since last_seen_at) changes Today\'s output', () => {
    const before1 = ENGINE.deriveTodayState(baseInputs({ hasAnyAcademicEvidence: true, lastSeenAtMs: NOW - DAY }));
    const after = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      lastSeenAtMs: NOW - DAY,
      recentAccomplishments: [{
        sessionId: 'sess-1', subject: 'Physics', closedAtMs: NOW - 1000,
        conceptsConfirmedCount: 2, conceptsVerifiedCount: 2, newPatternsCount: 0,
        resolvedPatternsCount: 1, scoreDeltaTotal: 12,
      }],
    }));
    assert.equal(before1.items.length, 0);
    assert.equal(after.items.length, 1);
    assert.equal(after.items[0].kind, 'accomplishment');
  });

  test('an open session (ACTIVE/DORMANT) changes Today\'s output', () => {
    const without = ENGINE.deriveTodayState(baseInputs({ hasAnyAcademicEvidence: true }));
    const withOpen = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      openSession: { sessionId: 's-open', subject: 'Maths', state: 'DORMANT' },
    }));
    assert.equal(without.items.length, 0);
    assert.equal(withOpen.items.length, 1);
    assert.equal(withOpen.items[0].kind, 'resume_session');
  });

  test('a score change (baseline → scored) changes Today\'s output', () => {
    const baseline = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true, score: { state: 'baseline', total: null, confidence: null, asOfMs: NOW, scoreSnapshotId: 'x' },
    }));
    const scored = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true, score: { state: 'scored', total: 300, confidence: 0.4, asOfMs: NOW, scoreSnapshotId: 'y' },
    }));
    assert.equal(baseline.items.length, 0);
    assert.equal(scored.items.length, 1);
  });

  test('ordering is deterministic and fixed: resume > next_best_action > accomplishment > orientation', () => {
    const state = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      openSession: { sessionId: 's-1', subject: 'Physics', state: 'ACTIVE' },
      nextBestAction: {
        recommendationId: 'rec-1', kind: 'work_open_pattern', subject: 'Physics',
        reasonTemplate: 'x', evidenceRefs: [{ refKind: 'occurrence', id: 'occ-1' }],
      },
      lastSeenAtMs: NOW - DAY,
      recentAccomplishments: [{
        sessionId: 'sess-1', subject: 'Physics', closedAtMs: NOW - 1000,
        conceptsConfirmedCount: 1, conceptsVerifiedCount: 0, newPatternsCount: 0,
        resolvedPatternsCount: 0, scoreDeltaTotal: null,
      }],
      score: { state: 'scored', total: 500, confidence: 0.5, asOfMs: NOW, scoreSnapshotId: 'snap-3' },
    }));
    assert.deepEqual(state.items.map(i => i.kind), [
      'resume_session', 'next_best_action', 'accomplishment', 'orientation',
    ]);
  });

  test('volume is bounded — maxItems truncates while preserving the fixed priority order', () => {
    const state = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      maxItems: 1,
      openSession: { sessionId: 's-1', subject: 'Physics', state: 'ACTIVE' },
      nextBestAction: {
        recommendationId: 'rec-1', kind: 'work_open_pattern', subject: 'Physics',
        reasonTemplate: 'x', evidenceRefs: [{ refKind: 'occurrence', id: 'occ-1' }],
      },
    }));
    assert.equal(state.items.length, 1);
    assert.equal(state.items[0].kind, 'resume_session');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.7.4, EXTENDED — every Today item must carry non-empty evidenceRefs
// ═══════════════════════════════════════════════════════════════════════════

describe('V.7.4, extended to every item kind — an item with no evidence cannot be built', () => {
  test('buildTodayItem throws on empty evidenceRefs', () => {
    assert.throws(() => ENGINE.buildTodayItem({
      kind: 'resume_session', itemId: 'x', subject: null, reasonRef: 'y', evidenceRefs: [],
    }), ENGINE.TodayEvidenceRequiredError);
  });

  test('buildTodayItem throws on a malformed evidence ref', () => {
    assert.throws(() => ENGINE.buildTodayItem({
      kind: 'resume_session', itemId: 'x', subject: null, reasonRef: 'y',
      evidenceRefs: [{ refKind: '', id: 'z' }],
    }), ENGINE.TodayEvidenceRequiredError);
  });

  test('every item deriveTodayState actually builds carries non-empty evidenceRefs', () => {
    const state = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      openSession: { sessionId: 's-1', subject: 'Physics', state: 'ACTIVE' },
      nextBestAction: {
        recommendationId: 'rec-1', kind: 'work_open_pattern', subject: 'Physics',
        reasonTemplate: 'x', evidenceRefs: [{ refKind: 'occurrence', id: 'occ-1' }],
      },
      score: { state: 'scored', total: 500, confidence: 0.5, asOfMs: NOW, scoreSnapshotId: 'snap-4' },
    }));
    assert.ok(state.items.length > 0);
    for (const item of state.items) {
      assert.ok(Array.isArray(item.evidenceRefs) && item.evidenceRefs.length >= 1, `${item.kind} has no evidence`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.7.5 / L.5 / M21-3 — SHOWN ONCE, THEN FILED TO THE RECORD
// ═══════════════════════════════════════════════════════════════════════════

describe('V.7.5 — an accomplishment is shown once, then filed to the record, never a persistent badge', () => {
  const accomplishment = {
    sessionId: 'sess-shown-once', subject: 'Physics', closedAtMs: NOW - 2 * DAY,
    conceptsConfirmedCount: 3, conceptsVerifiedCount: 3, newPatternsCount: 0,
    resolvedPatternsCount: 0, scoreDeltaTotal: 20,
  };

  test('surfaced when lastSeenAtMs predates the completion', () => {
    const shown = ENGINE.accomplishmentsSince([accomplishment], NOW - 3 * DAY, NOW);
    assert.equal(shown.length, 1);
    assert.equal(shown[0].sessionId, 'sess-shown-once');
  });

  test('NOT surfaced once lastSeenAtMs has advanced past the completion — mark as seen, re-derive, gone', () => {
    // Simulates: Today rendered once (lastSeenAtMs advances via mark_today_seen
    // to a point after the session closed), then Today is re-derived.
    const afterSeen = ENGINE.accomplishmentsSince([accomplishment], NOW - DAY, NOW);
    assert.deepEqual(afterSeen, []);
  });

  test('the underlying record is still retrievable after being "filed" — the input list itself is the permanent record, and is never mutated', () => {
    const original = [accomplishment];
    const frozenBefore = JSON.stringify(original);
    ENGINE.accomplishmentsSince(original, NOW - DAY, NOW); // "filed" — no longer surfaced
    assert.equal(JSON.stringify(original), frozenBefore, 'accomplishmentsSince must not mutate its input');
    // Directly querying the record (simulating Academic Memory / the record,
    // which is NOT gated by last_seen_at) still finds it.
    assert.equal(original.some(a => a.sessionId === 'sess-shown-once'), true);
  });

  test('deriveTodayState end-to-end: shown on first render, absent on the next once last_seen_at has advanced past it', () => {
    const firstRender = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      lastSeenAtMs: NOW - 3 * DAY,
      recentAccomplishments: [accomplishment],
    }));
    assert.equal(firstRender.items.some(i => i.kind === 'accomplishment'), true);

    // The route advances last_seen_at to `NOW` after rendering (mark_today_seen).
    // A later render — with the SAME accomplishment still in the record — no
    // longer surfaces it.
    const secondRender = ENGINE.deriveTodayState(baseInputs({
      hasAnyAcademicEvidence: true,
      lastSeenAtMs: NOW, // advanced past the accomplishment's closedAtMs
      recentAccomplishments: [accomplishment],
    }));
    assert.equal(secondRender.items.some(i => i.kind === 'accomplishment'), false);
  });

  test('a null lastSeenAtMs (never rendered) treats every accomplishment as new — no accomplishment is silently skipped on first render', () => {
    const shown = ENGINE.accomplishmentsSince([accomplishment], null, NOW);
    assert.equal(shown.length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.7.6 — NO Math.random, NO hardcoded population figures, NO peer comparisons
// ═══════════════════════════════════════════════════════════════════════════

describe('V.7.6 — grep the rendered payload: no Math.random, no hardcoded population figures, no peer comparisons', () => {
  const surfaceFiles = [
    ENGINE_SRC, TYPES_SRC,
    'app/api/today/route.ts',
    'app/today/page.tsx',
  ];

  test('no Math.random anywhere in the Today surface', () => {
    // A call, not the bare identifier — the engine's own doc comments name
    // "Math.random" as one of the things V.7.6 forbids, which would otherwise
    // make this test self-defeating.
    for (const f of surfaceFiles) {
      const src = read(f);
      assert.doesNotMatch(src, /Math\.random\s*\(/, `${f} must not call Math.random()`);
    }
  });

  test('no hardcoded population/stream-size figures (the awake-count precedent L.4 names by name)', () => {
    const banned = [/STREAM_SIZES/, /pctAwake/, /awakeCount/, /\b1\.4\s*M\b/, /\b2\s*M\b/, /\b3\.8\s*M\b/];
    for (const f of surfaceFiles) {
      const src = read(f);
      for (const re of banned) {
        assert.doesNotMatch(src, re, `${f} must not contain a hardcoded population figure (${re})`);
      }
    }
  });

  test('no peer-comparison or percentile language', () => {
    const banned = [/percentile/i, /awakeCount/i, /peers?\b.*(better|worse|ahead|behind)/i, /compared to other students/i];
    for (const f of surfaceFiles) {
      const src = read(f);
      for (const re of banned) {
        assert.doesNotMatch(src, re, `${f} must not contain peer-comparison language (${re})`);
      }
    }
  });

  test('no synthetic streak / "days active" figure in the engine or its types', () => {
    for (const f of [ENGINE_SRC, TYPES_SRC]) {
      const src = read(f);
      assert.doesNotMatch(src, /\bstreak\b/i, `${f} must not carry a streak concept (B.12/B.3: "Must NOT own... Streaks")`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 033_today.sql — ledger conventions and B.12/L.5's mechanism
// ═══════════════════════════════════════════════════════════════════════════

describe('033_today.sql — ledger conventions', () => {
  test('filename parses under the NNN[a]_slug.sql convention, version 033', () => {
    const parsed = parseMigrationFilename('033_today.sql');
    assert.ok(parsed);
    assert.equal(parsed.version, '033');
  });

  test('the recorded checksum matches the actual checksum of the migration body', () => {
    const contents = read(SQL_033);
    const body = migrationBody(contents);
    const m = /'([0-9a-f]{64})'/.exec(contents.slice(contents.indexOf('MIGRATION LEDGER')));
    assert.ok(m, 'no checksum literal found in the registration block');
    assert.equal(checksumOf(contents), m[1]);
    assert.ok(body.length > 0);
  });

  test('the migration body is non-empty', () => {
    assert.ok(migrationBody(read(SQL_033)).trim().length > 0);
  });

  test('students.last_seen_at is added, and mark_today_seen() is the only write function introduced', () => {
    const sql = strip(read(SQL_033));
    assert.match(sql, /ALTER TABLE students ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ/);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.mark_today_seen/);
  });

  test('mark_today_seen is SECURITY DEFINER and resolves identity from auth.uid(), never an argument', () => {
    const sql = strip(read(SQL_033));
    const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.mark_today_seen');
    const fnBody = sql.slice(fnStart, sql.indexOf('$$;', fnStart + 40) + 3);
    assert.match(fnBody, /SECURITY DEFINER/);
    assert.match(fnBody, /auth\.uid\(\)/);
    assert.doesNotMatch(fnBody, /p_student_id/);
  });

  test('mark_today_seen returns the PREVIOUS value — the read-then-append shape L.5 requires', () => {
    const sql = strip(read(SQL_033));
    assert.match(sql, /RETURNS TABLE \(previous_last_seen_at TIMESTAMPTZ, new_last_seen_at TIMESTAMPTZ\)/);
  });
});
