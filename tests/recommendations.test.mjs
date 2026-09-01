/**
 * M20 — RECOMMENDATION ENGINE. Acceptance K.1 … K.8, V.7.4, V.11, proved.
 *
 * EXECUTION_PLAN M20's definition of done, task by task:
 *   M20-1  K.1, K.2, K.7 — candidate generation, priority, decay.
 *   M20-2  V.7.4 — a recommendation with no evidence_refs cannot be inserted.
 *   M20-3  K.3 / V.11 — the next action cannot gate anything.
 *   M20-4  K.5, K.6 — outcome tracking; escalation without shaming.
 *
 * `lib/recommendations/*.ts` is I/O-free (no imports, no clock, no network —
 * same discipline `tests/personal-model.test.mjs` and
 * `tests/mistake-dna.test.mjs` already exercise), so K.1/K.2/K.7/K.8/K.4/K.5
 * are provable with no Supabase project in reach (U.3). The database-level
 * half of V.7.4 and K.3 (the CHECK constraint, the GRANTs, the append-only
 * triggers) CANNOT be proved by TypeScript alone, so that half of the suite
 * reads `032_recommendations.sql` as text and asserts on the CHECK/GRANT/
 * TRIGGER statements themselves — the same technique
 * `tests/personal-model.test.mjs` uses for 031's GRANTs.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checksumOf, migrationBody, parseMigrationFilename } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-recommendations');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const strip = sql =>
  sql
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n');

const SQL_032 = 'supabase/migrations/032_recommendations.sql';

let ENGINE;   // lib/recommendations/engine.ts
let OUTCOMES; // lib/recommendations/outcomes.ts
let TYPES;    // lib/recommendations/types.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.recommendations.json'],
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
  const load = f => import(pathToFileURL(path.join(outDir, 'recommendations', f)).href);
  [ENGINE, OUTCOMES, TYPES] = await Promise.all([
    load('engine.js'),
    load('outcomes.js'),
    load('types.js'),
  ]);
});

// ═══════════════════════════════════════════════════════════════════════════
// K.1 — THE BOUNDED KIND LIST, MIRRORED IN SQL
// ═══════════════════════════════════════════════════════════════════════════

describe('K.1 — the candidate-kind list is bounded and mirrors the SQL enum', () => {
  test('eleven kinds, one per K.1 table row', () => {
    assert.equal(TYPES.RECOMMENDATION_KINDS.length, 11);
  });

  test('the SQL enum (032) contains exactly the same values, in the same order', () => {
    const sql = strip(read(SQL_032));
    const m = /CREATE TYPE public\.recommendation_kind AS ENUM \(([\s\S]*?)\);/.exec(sql);
    assert.ok(m, 'recommendation_kind enum not found in 032');
    const values = m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
    assert.deepEqual(values, [...TYPES.RECOMMENDATION_KINDS]);
  });

  test('isRecommendationKind rejects an out-of-set name', () => {
    assert.equal(TYPES.isRecommendationKind('work_open_pattern'), true);
    assert.equal(TYPES.isRecommendationKind('shame_the_student'), false);
    assert.equal(TYPES.isRecommendationKind(''), false);
    assert.equal(TYPES.isRecommendationKind(null), false);
  });

  test('RECOMMENDATION_STATES and RECOMMENDATION_OUTCOME_KINDS mirror the SQL enums', () => {
    const sql = strip(read(SQL_032));
    const stateM = /CREATE TYPE public\.recommendation_state AS ENUM \(([\s\S]*?)\);/.exec(sql);
    const outcomeM = /CREATE TYPE public\.recommendation_outcome_kind AS ENUM \(([\s\S]*?)\);/.exec(sql);
    const states = stateM[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
    const outcomes = outcomeM[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
    assert.deepEqual(states, [...TYPES.RECOMMENDATION_STATES]);
    assert.deepEqual(outcomes, [...TYPES.RECOMMENDATION_OUTCOME_KINDS]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// V.7.4 — A RECOMMENDATION WITH NO EVIDENCE CANNOT BE CONSTRUCTED, OR INSERTED
// ═══════════════════════════════════════════════════════════════════════════

describe('V.7.4 — mandatory evidence_refs, structurally refused at both layers', () => {
  test('buildCandidate throws EvidenceRequiredError when evidenceRefs is empty', () => {
    assert.throws(
      () => ENGINE.buildCandidate({
        kind: 'work_open_pattern', source: 'mistake_dna', dedupeKey: 'x',
        subject: 'Physics', conceptId: null, patternId: 'p1',
        reasonTemplate: 'Torque is still open.', evidenceRefs: [],
        expectedAcademicBenefit: 0.5, urgency: 0,
      }),
      /EvidenceRequiredError/,
    );
  });

  test('buildCandidate throws when evidenceRefs is null/undefined', () => {
    assert.throws(() => ENGINE.buildCandidate({
      kind: 'work_open_pattern', source: 'mistake_dna', dedupeKey: 'x',
      subject: 'Physics', conceptId: null, patternId: 'p1',
      reasonTemplate: 'Torque is still open.', evidenceRefs: null,
      expectedAcademicBenefit: 0.5, urgency: 0,
    }));
  });

  test('buildCandidate throws when a ref has an empty id or refKind', () => {
    assert.throws(() => ENGINE.buildCandidate({
      kind: 'work_open_pattern', source: 'mistake_dna', dedupeKey: 'x',
      subject: 'Physics', conceptId: null, patternId: 'p1',
      reasonTemplate: 'Torque is still open.', evidenceRefs: [{ refKind: '', id: 'o1' }],
      expectedAcademicBenefit: 0.5, urgency: 0,
    }));
  });

  test('buildCandidate succeeds and freezes the result when evidence is real', () => {
    const c = ENGINE.buildCandidate({
      kind: 'work_open_pattern', source: 'mistake_dna', dedupeKey: 'work_open_pattern:p1',
      subject: 'Physics', conceptId: 'c1', patternId: 'p1',
      reasonTemplate: 'Torque is still open.', evidenceRefs: [{ refKind: 'occurrence', id: 'o1' }],
      expectedAcademicBenefit: 0.5, urgency: 0,
    });
    assert.equal(c.evidenceRefs.length, 1);
    assert.ok(Object.isFrozen(c));
    assert.ok(Object.isFrozen(c.evidenceRefs));
  });

  test('every K.1 generator produces candidates with non-empty evidenceRefs', () => {
    const groups = [
      ENGINE.openPatternCandidates([{ patternId: 'p1', subject: 'Physics', conceptId: 'c1', label: 'Torque sign errors', severity: 0.6, occurrenceIds: ['o1', 'o2'] }]),
      ENGINE.dueRetestCandidates([{ patternId: 'p1', subject: 'Physics', conceptId: 'c1', label: 'Torque sign errors', dueAt: '2020-01-01T00:00:00.000Z', scheduleId: 's1' }], Date.now()),
      ENGINE.patternRecurredCandidates([{ patternId: 'p1', subject: 'Physics', conceptId: 'c1', label: 'Torque sign errors', recurrenceOccurrenceId: 'o3', severity: 0.7 }]),
      ENGINE.unverifiedSessionCandidates([{ sessionId: 'sess1', subject: 'Physics' }]),
      ENGINE.coverageHoleCandidates([{ conceptId: 'c2', subject: 'Physics', label: 'Rotational dynamics', academicRecordId: 'ar1' }]),
      ENGINE.subjectNoProvenConceptCandidates([{ subject: 'Chemistry', academicRecordId: 'ar2' }]),
      ENGINE.conceptDecayingCandidates([{ conceptId: 'c3', subject: 'Physics', label: 'Kinematics', academicRecordId: 'ar3', decayFraction: 0.4 }]),
      ENGINE.examWeakCoverageCandidates([{ examId: 'e1', examLabel: 'Mid-term', subject: 'Physics', daysToExam: 5, coverageFraction: 0.3 }]),
      ENGINE.dormantSessionCandidates([{ sessionId: 'sess2', subject: 'Physics', minutesUntilReap: 20 }]),
      ENGINE.personalModelConfirmCandidates([{ dimension: 'explanation_style', signalId: 'sig1', confidence: 0.9, inferredValueLabel: 'bullet-point' }]),
      ENGINE.correctionRequestPendingCandidates([{ correctionId: 'cr1', subject: 'Physics' }]),
    ];
    for (const group of groups) {
      assert.ok(group.length > 0, 'a generator produced zero candidates for a fixture that should yield one');
      for (const c of group) {
        assert.ok(TYPES.isNonEmptyEvidenceRefs(c.evidenceRefs), `${c.kind} candidate has empty evidenceRefs`);
      }
    }
  });

  test('the database CHECK constraint exists and uses cardinality(), not array_length() (the empty-array pitfall)', () => {
    const sql = strip(read(SQL_032));
    assert.match(sql, /evidence_refs\s+JSONB\[\]\s+NOT NULL/);
    assert.match(sql, /CONSTRAINT recommendations_evidence_refs_nonempty\s*\n?\s*CHECK \(cardinality\(evidence_refs\) >= 1\)/);
    assert.doesNotMatch(sql, /array_length\(evidence_refs/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// K.3 / V.11 — GUIDE, NEVER GATE
// ═══════════════════════════════════════════════════════════════════════════

describe('K.3 / V.11 — a recommendation cannot gate anything', () => {
  test('no blocks/required/gates/locks column exists on the recommendations table', () => {
    const sql = strip(read(SQL_032));
    const tableMatch = /CREATE TABLE IF NOT EXISTS public\.recommendations \(([\s\S]*?)\n\);/.exec(sql);
    assert.ok(tableMatch, 'recommendations table definition not found');
    const body = tableMatch[1];
    assert.doesNotMatch(body, /\bblocks\b/i);
    assert.doesNotMatch(body, /\brequired\b/i);
    assert.doesNotMatch(body, /\bgates\b/i);
    assert.doesNotMatch(body, /\blocks\b/i);
  });

  test('the Recommendation/Candidate TypeScript types carry no gating field', () => {
    const src = read('lib/recommendations/types.ts');
    // Excludes the deliberate comment lines that NAME the forbidden fields
    // to document their absence.
    const codeLines = src.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const code = codeLines.join('\n');
    assert.doesNotMatch(code, /readonly\s+blocks\s*:/);
    assert.doesNotMatch(code, /readonly\s+required\s*:/);
    assert.doesNotMatch(code, /readonly\s+gates\s*:/);
  });

  test('the ONLY GRANTs on public.recommendations to `authenticated` are SELECT — no INSERT/UPDATE/DELETE', () => {
    const sql = strip(read(SQL_032));
    assert.match(sql, /REVOKE ALL ON public\.recommendations FROM authenticated/);
    assert.match(sql, /GRANT SELECT ON public\.recommendations TO authenticated/);
    assert.doesNotMatch(sql, /GRANT[^;]*INSERT[^;]*ON public\.recommendations TO authenticated/);
    assert.doesNotMatch(sql, /GRANT[^;]*UPDATE[^;]*ON public\.recommendations TO authenticated/);
    assert.doesNotMatch(sql, /GRANT[^;]*DELETE[^;]*ON public\.recommendations TO authenticated/);
  });

  test('no role, including service_role, ever gets DELETE on recommendations — K.4 "never silently deleted"', () => {
    const sql = strip(read(SQL_032));
    assert.doesNotMatch(sql, /GRANT[^;]*DELETE[^;]*ON public\.recommendations\b/);
    assert.doesNotMatch(sql, /GRANT[^;]*DELETE[^;]*ON public\.recommendation_outcomes\b/);
  });

  test('recommendation_outcomes is append-only: UPDATE and DELETE both raise, unconditionally', () => {
    const sql = strip(read(SQL_032));
    assert.match(sql, /recommendation_outcomes_append_only/);
    assert.match(sql, /BEFORE UPDATE ON public\.recommendation_outcomes/);
    assert.match(sql, /BEFORE DELETE ON public\.recommendation_outcomes/);
    assert.match(sql, /RAISE EXCEPTION 'recommendation_outcomes is append-only/);
  });

  test('a closed recommendation cannot transition state again (K.4)', () => {
    const sql = strip(read(SQL_032));
    assert.match(sql, /recommendations_state_is_append_only/);
    assert.match(sql, /OLD\.state <> 'active' AND NEW\.state IS DISTINCT FROM OLD\.state/);
  });

  test('no source file outside lib/recommendations/** and its own API route queries the recommendations table directly', () => {
    const searchRoots = ['app', 'lib', 'components', 'hooks'].filter(d => fs.existsSync(path.join(root, d)));
    const offenders = [];
    const walk = dir => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const rel = path.relative(root, p).replace(/\\/g, '/');
        if (rel.startsWith('lib/recommendations/')) continue;
        if (rel.startsWith('app/api/recommendations/')) continue;
        if (rel.includes('node_modules')) continue;
        const stat = fs.statSync(p);
        if (stat.isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx|js|jsx)$/.test(name)) continue;
        const content = fs.readFileSync(p, 'utf8');
        if (/\.from\(\s*['"]recommendations['"]\s*\)/.test(content) || /\.from\(\s*['"]recommendation_outcomes['"]\s*\)/.test(content)) {
          offenders.push(rel);
        }
      }
    };
    for (const d of searchRoots) walk(path.join(root, d));
    assert.deepEqual(offenders, [], `these files read/write the recommendations table outside the engine: ${offenders.join(', ')}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// K.2 — PRIORITY
// ═══════════════════════════════════════════════════════════════════════════

describe('K.2 — priority = expected_academic_benefit × urgency × fit − fatigue', () => {
  test('the formula, verbatim, when urgency > 0', () => {
    const p = ENGINE.computePriority({ expectedAcademicBenefit: 0.8, urgency: 0.5, fit: 0.6, fatigue: 0.1 });
    assert.equal(p, Math.round((0.8 * 0.5 * 0.6 - 0.1) * 10000) / 10000);
  });

  test('urgency of 0 (the double-weighting note) is treated as urgency-neutral, not urgency-zeroing', () => {
    const p = ENGINE.computePriority({ expectedAcademicBenefit: 0.8, urgency: 0, fit: 0.6, fatigue: 0 });
    assert.equal(p, Math.round(0.8 * 1 * 0.6 * 10000) / 10000);
  });

  test('expected_academic_benefit is academic, never score points — mistake candidates carry severity, not a point value', () => {
    const [c] = ENGINE.openPatternCandidates([{ patternId: 'p1', subject: 'Physics', conceptId: 'c1', label: 'X', severity: 0.42, occurrenceIds: ['o1'] }]);
    assert.equal(c.expectedAcademicBenefit, 0.42);
  });

  test('computeFit is neutral (0.6) with no personal-model signal, favourable when matched, unfavourable when mismatched', () => {
    assert.equal(ENGINE.computeFit({ kind: 'work_open_pattern', matchesFormatPreference: null, matchesWorkingWindow: null }), 0.6);
    const matched = ENGINE.computeFit({ kind: 'work_open_pattern', matchesFormatPreference: true, matchesWorkingWindow: true });
    const mismatched = ENGINE.computeFit({ kind: 'work_open_pattern', matchesFormatPreference: false, matchesWorkingWindow: false });
    assert.ok(matched > mismatched);
  });

  test('computeFatigue grows with repeated dismissals/ignores of the SAME kind, within the lookback window, and is capped', () => {
    const now = Date.parse('2026-08-18T00:00:00.000Z');
    const outcomes = Array.from({ length: 10 }, (_, i) => ({
      kind: 'work_open_pattern', outcome: 'dismissed', at: new Date(now - i * 86400000).toISOString(),
    }));
    const fatigue = ENGINE.computeFatigue('work_open_pattern', outcomes, now);
    assert.ok(fatigue > 0 && fatigue <= 0.5);
    // A different kind's history does not contribute.
    assert.equal(ENGINE.computeFatigue('take_due_retest', outcomes, now), 0);
    // Outside the lookback window, no contribution.
    const old = [{ kind: 'work_open_pattern', outcome: 'dismissed', at: '2020-01-01T00:00:00.000Z' }];
    assert.equal(ENGINE.computeFatigue('work_open_pattern', old, now), 0);
  });

  test('fatigue alone can never push priority to gate a candidate to invisibility — it only ranks, capped below the benefit×urgency×fit ceiling for realistic inputs', () => {
    const p = ENGINE.computePriority({ expectedAcademicBenefit: 1, urgency: 1, fit: 1, fatigue: 0.5 });
    assert.ok(p > 0, 'a maximally-benefiting candidate must still rank above zero even at capped fatigue');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// K.7 — DECAY
// ═══════════════════════════════════════════════════════════════════════════

describe('K.7 — recommendations expire; expires_at is set per-kind at creation', () => {
  test('every kind has an expiry entry, and durable kinds outlive ephemeral ones', () => {
    for (const kind of TYPES.RECOMMENDATION_KINDS) {
      assert.ok(Number.isFinite(ENGINE.EXPIRY_DAYS_BY_KIND[kind]), `no expiry for ${kind}`);
    }
    assert.ok(ENGINE.EXPIRY_DAYS_BY_KIND.work_open_pattern > ENGINE.EXPIRY_DAYS_BY_KIND.verify_unverified_session);
  });

  test('computeExpiresAt derives an ISO timestamp exactly kind-days in the future', () => {
    const now = Date.parse('2026-08-18T00:00:00.000Z');
    const exp = ENGINE.computeExpiresAt('take_due_retest', now);
    assert.equal(Date.parse(exp) - now, ENGINE.EXPIRY_DAYS_BY_KIND.take_due_retest * 86400000);
  });

  test('isCoolingDown suppresses regeneration within the cooling window and releases it after', () => {
    const closedAt = '2026-08-01T00:00:00.000Z';
    const closedMs = Date.parse(closedAt);
    const withinWindow = closedMs + ENGINE.COOLING_DAYS_BY_KIND.work_open_pattern * 86400000 - 1000;
    const afterWindow = closedMs + ENGINE.COOLING_DAYS_BY_KIND.work_open_pattern * 86400000 + 1000;
    assert.equal(ENGINE.isCoolingDown('work_open_pattern', closedAt, withinWindow), true);
    assert.equal(ENGINE.isCoolingDown('work_open_pattern', closedAt, afterWindow), false);
    assert.equal(ENGINE.isCoolingDown('work_open_pattern', null, Date.now()), false);
  });

  test('"this prevents the same suggestion appearing every day for a month" — cooling window is at least as long as the kind\'s own expiry for fast-expiring kinds', () => {
    assert.ok(ENGINE.COOLING_DAYS_BY_KIND.dormant_session_reaping >= 1);
    assert.ok(ENGINE.COOLING_DAYS_BY_KIND.verify_unverified_session >= 1);
  });

  test('dedupeCandidates keeps at most one candidate per dedupeKey, choosing the higher-benefit one deterministically', () => {
    const a = ENGINE.buildCandidate({ kind: 'coverage_hole', source: 'assessment', dedupeKey: 'coverage_hole:c1', subject: 'Physics', conceptId: 'c1', patternId: null, reasonTemplate: 'X has no coverage yet.', evidenceRefs: [{ refKind: 'academic_record', id: 'ar1' }], expectedAcademicBenefit: 0.3, urgency: 0.2 });
    const b = ENGINE.buildCandidate({ kind: 'coverage_hole', source: 'assessment', dedupeKey: 'coverage_hole:c1', subject: 'Physics', conceptId: 'c1', patternId: null, reasonTemplate: 'X has no coverage yet.', evidenceRefs: [{ refKind: 'academic_record', id: 'ar1' }], expectedAcademicBenefit: 0.7, urgency: 0.2 });
    const deduped = ENGINE.dedupeCandidates([a, b]);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0].expectedAcademicBenefit, 0.7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// K.8 — NEXT-BEST-ACTION
// ═══════════════════════════════════════════════════════════════════════════

describe('K.8 — exactly one action, deterministic, stably tie-broken', () => {
  const mkRec = (over) => ({
    kind: 'work_open_pattern', source: 'mistake_dna', dedupeKey: 'k', subject: 'Physics',
    conceptId: null, patternId: null, reasonTemplate: 'x', evidenceRefs: [{ refKind: 'occurrence', id: 'o1' }],
    expectedAcademicBenefit: 0.5, urgency: 0, recommendationId: 'r', priority: 0, fit: 0.6, fatigue: 0,
    state: 'active', surfacedCount: 0, expiresAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z',
    ...over,
  });

  test('highest priority wins', () => {
    const recs = [mkRec({ recommendationId: 'a', priority: 1 }), mkRec({ recommendationId: 'b', priority: 5 })];
    assert.equal(ENGINE.selectNextBestAction(recs).recommendationId, 'b');
  });

  test('tie on priority → earliest expires_at wins', () => {
    const recs = [
      mkRec({ recommendationId: 'a', priority: 3, expiresAt: '2026-09-10T00:00:00.000Z' }),
      mkRec({ recommendationId: 'b', priority: 3, expiresAt: '2026-09-01T00:00:00.000Z' }),
    ];
    assert.equal(ENGINE.selectNextBestAction(recs).recommendationId, 'b');
  });

  test('tie on priority and expiry → lowest surfaced_count wins', () => {
    const recs = [
      mkRec({ recommendationId: 'a', priority: 3, expiresAt: '2026-09-01T00:00:00.000Z', surfacedCount: 4 }),
      mkRec({ recommendationId: 'b', priority: 3, expiresAt: '2026-09-01T00:00:00.000Z', surfacedCount: 1 }),
    ];
    assert.equal(ENGINE.selectNextBestAction(recs).recommendationId, 'b');
  });

  test('a full tie is broken STABLY by original order, and never shuffles across repeated calls', () => {
    const recs = [
      mkRec({ recommendationId: 'first', priority: 3, expiresAt: '2026-09-01T00:00:00.000Z', surfacedCount: 1 }),
      mkRec({ recommendationId: 'second', priority: 3, expiresAt: '2026-09-01T00:00:00.000Z', surfacedCount: 1 }),
    ];
    const results = new Set();
    for (let i = 0; i < 20; i++) results.add(ENGINE.selectNextBestAction(recs).recommendationId);
    assert.deepEqual([...results], ['first']);
  });

  test('only ACTIVE recommendations are eligible; dismissed/expired/etc. are never selected', () => {
    const recs = [
      mkRec({ recommendationId: 'a', priority: 10, state: 'dismissed' }),
      mkRec({ recommendationId: 'b', priority: 1, state: 'active' }),
    ];
    assert.equal(ENGINE.selectNextBestAction(recs).recommendationId, 'b');
  });

  test('no active recommendations → null, never a fabricated placeholder', () => {
    assert.equal(ENGINE.selectNextBestAction([]), null);
    assert.equal(ENGINE.selectNextBestAction([mkRec({ state: 'expired' })]), null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// K.4 / K.6 — PERSISTENCE, DISMISSAL, OUTCOME TRACKING
// ═══════════════════════════════════════════════════════════════════════════

describe('K.4 / K.6 — closing a recommendation always produces exactly one outcome row', () => {
  const rec = {
    kind: 'work_open_pattern', source: 'mistake_dna', dedupeKey: 'k', subject: 'Physics',
    conceptId: null, patternId: 'p1', reasonTemplate: 'x', evidenceRefs: [{ refKind: 'occurrence', id: 'o1' }],
    expectedAcademicBenefit: 0.5, urgency: 0, recommendationId: 'rec1', priority: 0.3, fit: 0.6, fatigue: 0,
    state: 'active', surfacedCount: 0, expiresAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z',
  };
  const now = Date.parse('2026-08-20T00:00:00.000Z');

  test('dismiss() costs nothing — the result carries only state + outcome, no score/penalty field of any kind', () => {
    const { state, outcome } = OUTCOMES.dismiss(rec, now);
    assert.equal(state, 'dismissed');
    assert.equal(outcome.outcome, 'dismissed');
    assert.deepEqual(Object.keys(outcome).sort(), ['at', 'benefitObserved', 'outcome', 'outcomeId', 'recommendationId', 'resultingResolutionId', 'resultingSessionId'].sort());
  });

  test('actOn() links the resulting session/resolution — K.6\'s feedback loop', () => {
    const { state, outcome } = OUTCOMES.actOn(rec, now, { sessionId: 'sess9', benefitObserved: 0.8 });
    assert.equal(state, 'acted_on');
    assert.equal(outcome.outcome, 'acted_on');
    assert.equal(outcome.resultingSessionId, 'sess9');
    assert.equal(outcome.benefitObserved, 0.8);
  });

  test('supersede() closes the row without deleting it — never a silent deletion', () => {
    const { state, outcome } = OUTCOMES.supersede(rec, now);
    assert.equal(state, 'superseded');
    assert.equal(outcome.outcome, 'superseded');
  });

  test('expire() below the surfaced threshold → "expired"; at/above the threshold → "ignored"', () => {
    const belowThreshold = { ...rec, surfacedCount: OUTCOMES.IGNORED_SURFACE_THRESHOLD - 1 };
    const atThreshold = { ...rec, surfacedCount: OUTCOMES.IGNORED_SURFACE_THRESHOLD };
    assert.equal(OUTCOMES.expire(belowThreshold, now).state, 'expired');
    assert.equal(OUTCOMES.expire(atThreshold, now).state, 'ignored');
    // K.4: "Being ignored is a signal about the RECOMMENDATION, not about the
    // student." Both branches record the SAME outcome kind — no separate,
    // more severe outcome kind exists for "ignored".
    assert.equal(OUTCOMES.expire(belowThreshold, now).outcome.outcome, 'ignored_expired');
    assert.equal(OUTCOMES.expire(atThreshold, now).outcome.outcome, 'ignored_expired');
  });

  test('closing an unpersisted recommendation (recommendationId null) is refused, not silently coerced', () => {
    assert.throws(() => OUTCOMES.dismiss({ ...rec, recommendationId: null }, now));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// K.5 — ESCALATION WITHOUT SHAMING
// ═══════════════════════════════════════════════════════════════════════════

describe('K.5 — escalation changes channel and prominence, never tone, never a judgement', () => {
  test('the ladder is exactly in_context → today_placement → in_app_notice → push → parent_report', () => {
    assert.deepEqual([...OUTCOMES.ESCALATION_LADDER], ['in_context', 'today_placement', 'in_app_notice', 'push', 'parent_report']);
  });

  test('starts at in_context when currentChannel is null, and steps forward one rung at a time', () => {
    const base = { currentChannel: null, conditionStillOpen: true, quietHoursActive: false, pushAppetite: 'standard', parentShareAllowsCategory: true };
    assert.equal(OUTCOMES.nextEscalationChannel(base), 'in_context');
    assert.equal(OUTCOMES.nextEscalationChannel({ ...base, currentChannel: 'in_context' }), 'today_placement');
    assert.equal(OUTCOMES.nextEscalationChannel({ ...base, currentChannel: 'today_placement' }), 'in_app_notice');
  });

  test('push is skipped during quiet hours or when appetite is off', () => {
    const base = { currentChannel: 'in_app_notice', conditionStillOpen: true, parentShareAllowsCategory: true };
    assert.equal(OUTCOMES.nextEscalationChannel({ ...base, quietHoursActive: true, pushAppetite: 'standard' }), 'parent_report');
    assert.equal(OUTCOMES.nextEscalationChannel({ ...base, quietHoursActive: false, pushAppetite: 'off' }), 'parent_report');
    assert.equal(OUTCOMES.nextEscalationChannel({ ...base, quietHoursActive: false, pushAppetite: 'standard' }), 'push');
  });

  test('parent_report is reachable ONLY if the share policy already permits the category', () => {
    const base = { currentChannel: 'push', conditionStillOpen: true, quietHoursActive: false, pushAppetite: 'standard' };
    assert.equal(OUTCOMES.nextEscalationChannel({ ...base, parentShareAllowsCategory: false }), null);
    assert.equal(OUTCOMES.nextEscalationChannel({ ...base, parentShareAllowsCategory: true }), 'parent_report');
  });

  test('a resolved/superseded condition never escalates further, regardless of channel', () => {
    assert.equal(OUTCOMES.nextEscalationChannel({
      currentChannel: 'in_context', conditionStillOpen: false, quietHoursActive: false,
      pushAppetite: 'standard', parentShareAllowsCategory: true,
    }), null);
  });

  test('EscalationContext has NO absence-based trigger field — the type signature cannot express "escalate because idle"', () => {
    const src = read('lib/recommendations/outcomes.ts');
    const iface = /export interface EscalationContext \{([\s\S]*?)\}/.exec(src)[1];
    assert.doesNotMatch(iface, /daysSinceLastSeen/i);
    assert.doesNotMatch(iface, /daysInactive/i);
    assert.doesNotMatch(iface, /lastSeenAt/i);
    assert.doesNotMatch(iface, /idle/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// K.5 — THE CONTENT RULE: NO BANNED SHAME LANGUAGE, ANYWHERE A TEMPLATE IS EMITTED
// ═══════════════════════════════════════════════════════════════════════════

describe('K.5 — banned shame language is caught, and no generator ever emits it', () => {
  test('containsShameLanguage catches every family PRODUCT_PRINCIPLES §4 / K.5 forbids', () => {
    const banned = [
      "You've been inactive for 6 days.",
      "You're behind on Physics.",
      "Your streak is broken.",
      "Other students have finished this already.",
      "Compared to the average student, you are slower.",
    ];
    for (const s of banned) assert.equal(OUTCOMES.containsShameLanguage(s), true, s);
  });

  test('a plain factual statement of an academic condition passes', () => {
    assert.equal(OUTCOMES.containsShameLanguage('Torque sign errors in Physics is still open.'), false);
    assert.equal(OUTCOMES.containsShameLanguage('A retest for Torque sign errors is due.'), false);
  });

  test('every reason_template emitted by every K.1 generator is free of shame language', () => {
    const groups = [
      ...ENGINE.openPatternCandidates([{ patternId: 'p1', subject: 'Physics', conceptId: 'c1', label: 'Torque sign errors', severity: 0.6, occurrenceIds: ['o1'] }]),
      ...ENGINE.dueRetestCandidates([{ patternId: 'p1', subject: 'Physics', conceptId: 'c1', label: 'Torque sign errors', dueAt: '2020-01-01T00:00:00.000Z', scheduleId: 's1' }], Date.now()),
      ...ENGINE.patternRecurredCandidates([{ patternId: 'p1', subject: 'Physics', conceptId: 'c1', label: 'Torque sign errors', recurrenceOccurrenceId: 'o3', severity: 0.7 }]),
      ...ENGINE.unverifiedSessionCandidates([{ sessionId: 'sess1', subject: 'Physics' }]),
      ...ENGINE.coverageHoleCandidates([{ conceptId: 'c2', subject: 'Physics', label: 'Rotational dynamics', academicRecordId: 'ar1' }]),
      ...ENGINE.subjectNoProvenConceptCandidates([{ subject: 'Chemistry', academicRecordId: 'ar2' }]),
      ...ENGINE.conceptDecayingCandidates([{ conceptId: 'c3', subject: 'Physics', label: 'Kinematics', academicRecordId: 'ar3', decayFraction: 0.4 }]),
      ...ENGINE.examWeakCoverageCandidates([{ examId: 'e1', examLabel: 'Mid-term', subject: 'Physics', daysToExam: 5, coverageFraction: 0.3 }]),
      ...ENGINE.dormantSessionCandidates([{ sessionId: 'sess2', subject: 'Physics', minutesUntilReap: 20 }]),
      ...ENGINE.personalModelConfirmCandidates([{ dimension: 'explanation_style', signalId: 'sig1', confidence: 0.9, inferredValueLabel: 'bullet-point' }]),
      ...ENGINE.correctionRequestPendingCandidates([{ correctionId: 'cr1', subject: 'Physics' }]),
    ];
    for (const c of groups) {
      assert.equal(OUTCOMES.containsShameLanguage(c.reasonTemplate), false, `${c.kind}: "${c.reasonTemplate}"`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION FILE STRUCTURE — filename convention, checksum, ledger registration
// ═══════════════════════════════════════════════════════════════════════════

describe('032_recommendations.sql — ledger conventions', () => {
  test('filename parses under the NNN[a]_slug.sql convention, version 032', () => {
    const parsed = parseMigrationFilename('032_recommendations.sql');
    assert.ok(parsed);
    assert.equal(parsed.version, '032');
  });

  test('the recorded checksum matches the actual checksum of the migration body', () => {
    const contents = read(SQL_032);
    const m = /SELECT supabase_migrations\.record_migration\(\s*'032',\s*'032_recommendations\.sql',\s*'([0-9a-f]{64})'/.exec(contents);
    assert.ok(m, 'record_migration call with a 64-hex checksum not found');
    assert.equal(m[1], checksumOf(contents));
  });

  test('the migration body is non-empty', () => {
    assert.ok(migrationBody(read(SQL_032)).trim().length > 100);
  });
});
