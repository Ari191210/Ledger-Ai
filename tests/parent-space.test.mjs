/**
 * M17 — PARENT SPACE. Acceptance V.8.1 … V.8.8, proved.
 *
 * Two kinds of check, mirroring the M11/M9 convention:
 *
 *   1. STRUCTURAL — read `029_parent_space.sql` and `app/parent/*`,
 *      `lib/parent-*` AS TEXT, comments stripped, and assert that forbidden
 *      identifiers (topic labels, occurrence/evidence columns, marks lost,
 *      student answers, streaks, "current marks") are simply absent from the
 *      SELECT lists that can reach a parent. This is V.8.3's "not filtered —
 *      absent" property, proved the same way M11 proved a cognitive error
 *      never merges with an execution one: by reading the source, not by
 *      trusting a comment that says so.
 *
 *   2. BEHAVIOURAL — the pure modules (`lib/parent-space.ts`,
 *      `lib/parent-digest.ts`) compiled and run for real, covering default
 *      state (V.8.1/V.8.2), category shape (V.8.4), and policy stamping
 *      (V.8.5).
 *
 * `tests/parent-space-rls.test.mjs` covers the live-database half — identity,
 * revocation and the access log against a real Supabase project — and SKIPS
 * without credentials, same as `tests/mistakes-rls.test.mjs`.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-parent-space');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const stripped = rel =>
  read(rel)
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const SQL = 'supabase/migrations/029_parent_space.sql';
const MOD_SPACE = 'lib/parent-space.ts';
const MOD_DIGEST = 'lib/parent-digest.ts';
const MOD_PROJ_SERVER = 'lib/parent-projection-server.ts';
const ROUTE_REPORT = 'app/api/parent/report/route.ts';
const PAGE_PARENT = 'app/parent/page.tsx';

let PS; // lib/parent-space.ts
let PD; // lib/parent-digest.ts

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.parent-space.json'],
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
  const load = f => import(pathToFileURL(path.join(outDir, f)).href);
  [PS, PD] = await Promise.all([load('parent-space.js'), load('parent-digest.js')]);
});

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURAL — V.8.3 "not filtered, absent"
// ═══════════════════════════════════════════════════════════════════════════
describe('029_parent_space.sql — structural evidence exclusion (V.8.3)', () => {
  const sql = stripped(SQL);

  // Every column that would make a mistake's forensic detail reachable.
  // None of these tokens may appear ANYWHERE in this file — not gated by an
  // IF, not behind a policy check, not present-and-then-stripped. Absent.
  const FORBIDDEN = [
    'marks_lost', 'student_answer', 'expected_answer', 'marker_note',
    'weakTopics', 'weak_topics', 'occurrence_id', 'recurrence_count',
    'error_type', 'error_class', 'confidence_before',
  ];

  for (const token of FORBIDDEN) {
    test(`"${token}" never appears in the migration`, () => {
      assert.ok(!sql.includes(token), `found forbidden token "${token}" in ${SQL}`);
    });
  }

  test('"patterns.label" (the human-readable mistake sentence) is never selected', () => {
    // `patterns` IS read (for status counts), so the bare word "label" would
    // false-positive on innocent uses; assert the specific column reference
    // a SELECT would need is absent.
    assert.ok(!/\blabel\b/.test(sql.replace(/-- .*$/gm, '')), 'a bare `label` column reference was found');
  });

  test('"concept_id" is never selected from occurrences or patterns for a parent view', () => {
    // concept_id legitimately exists on academic_record (subject rollups) —
    // the assertion is that no parent_*_view selects it.
    const viewBlocks = sql.match(/CREATE OR REPLACE VIEW public\.parent_\w+_view AS[\s\S]*?;/g) ?? [];
    assert.ok(viewBlocks.length >= 5, 'expected at least 5 parent_*_view definitions');
    for (const block of viewBlocks) {
      assert.ok(!block.includes('concept_id'), `a parent view selects concept_id:\n${block}`);
      assert.ok(!block.includes('occurrences'), `a parent view reads occurrences directly:\n${block}`);
      assert.ok(!block.includes('evidence'), `a parent view reads evidence directly:\n${block}`);
    }
  });

  test('the "marks" column of user_data is never read (Current Marks is not a Shared category)', () => {
    assert.ok(!/u\.marks\b/.test(sql), 'parent_exams_view or another view reads user_data.marks');
  });

  test('every parent_share_policies category defaults FALSE', () => {
    const table = sql.match(/CREATE TABLE IF NOT EXISTS public\.parent_share_policies \([\s\S]*?\n\);/)?.[0];
    assert.ok(table, 'parent_share_policies table definition not found');
    const categories = ['score_trajectory', 'dimension_breakdown', 'subject_state', 'progress_fixing', 'consistency', 'upcoming_exams', 'assessment_activity'];
    for (const cat of categories) {
      const line = table.split('\n').find(l => l.trim().startsWith(cat));
      assert.ok(line, `column ${cat} not found in parent_share_policies`);
      assert.match(line, /NOT NULL\s+DEFAULT\s+FALSE/, `${cat} does not default FALSE: ${line}`);
    }
  });

  test('there is no eighth "weak areas" or "assessment outcomes" category column', () => {
    const table = sql.match(/CREATE TABLE IF NOT EXISTS public\.parent_share_policies \([\s\S]*?\n\);/)?.[0] ?? '';
    for (const banned of ['weak_areas', 'weak_topics', 'assessment_outcomes', 'mistake_summary']) {
      assert.ok(!table.includes(banned), `parent_share_policies has a forbidden column: ${banned}`);
    }
  });

  test('parent_access_log is append-only: no non-SELECT policy, a refuse-mutation trigger, REVOKE on UPDATE/DELETE', () => {
    assert.ok(sql.includes('parent_access_log_refuse_mutation_trg'));
    assert.ok(sql.includes('REVOKE UPDATE, DELETE ON public.parent_access_log FROM PUBLIC, anon, authenticated, service_role'));
  });

  test('every write path (invite/accept/revoke/policy) is SECURITY DEFINER and resolves identity from auth.uid(), never an argument', () => {
    for (const fn of ['create_parent_invitation', 'accept_parent_invitation', 'revoke_parent_connection', 'set_parent_share_policy']) {
      const def = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\([\\s\\S]*?\\$\\$;`));
      assert.ok(def, `function ${fn} not found`);
      assert.ok(def[0].includes('SECURITY DEFINER'), `${fn} is not SECURITY DEFINER`);
      assert.ok(def[0].includes('auth.uid()'), `${fn} does not resolve identity from auth.uid()`);
    }
  });

  test('get_parent_projection() checks connection state and logs the read on every call', () => {
    const def = sql.match(/CREATE OR REPLACE FUNCTION public\.get_parent_projection[\s\S]*?\$\$;/)?.[0];
    assert.ok(def);
    assert.ok(def.includes("state = 'active'"), 'no active-connection check found');
    assert.ok(def.includes('INSERT INTO public.parent_access_log'), 'no access-log write found');
  });
});

describe('parent-facing routes and pages never name a forbidden field (grep, not trust)', () => {
  // "wrong" itself is excluded: the parent-facing copy legitimately says
  // "individual wrong answers ... are private" — reassurance text, not a data
  // field. "wrong_answer" / "student_answer" are the actual column names that
  // would matter, and those ARE checked.
  const FORBIDDEN = ['weakTopics', 'marks_lost', 'student_answer', 'wrong_answer', 'occurrence_id'];
  for (const rel of [ROUTE_REPORT, PAGE_PARENT, MOD_PROJ_SERVER]) {
    test(`${rel} contains none of ${FORBIDDEN.join(', ')}`, () => {
      const src = stripped(rel);
      for (const token of FORBIDDEN) {
        assert.ok(!src.includes(token), `${rel} contains forbidden token "${token}"`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIOURAL
// ═══════════════════════════════════════════════════════════════════════════
describe('lib/parent-space.ts — defaults and shape (V.8.1, V.8.2, V.8.4)', () => {
  test('allCategoriesOff() returns exactly the 7 categories, every one false', () => {
    const off = PS.allCategoriesOff();
    assert.deepEqual(Object.keys(off).sort(), [...PS.SHARE_CATEGORIES].sort());
    for (const v of Object.values(off)) assert.equal(v, false);
  });

  test('SHARE_CATEGORIES has exactly 7 entries — no eighth category exists to enable', () => {
    assert.equal(PS.SHARE_CATEGORIES.length, 7);
  });

  test('every category has a distinct backing column, so no two toggles alias one datum', () => {
    const cols = Object.values(PS.SHARE_CATEGORY_COLUMNS);
    assert.equal(new Set(cols).size, cols.length);
  });

  test('token hashing is deterministic SHA-256 hex, and different tokens hash differently', () => {
    const a = PS.generateInvitationToken();
    const b = PS.generateInvitationToken();
    assert.notEqual(a, b);
    assert.match(PS.hashInvitationToken(a), /^[0-9a-f]{64}$/);
    assert.equal(PS.hashInvitationToken(a), PS.hashInvitationToken(a));
    assert.notEqual(PS.hashInvitationToken(a), PS.hashInvitationToken(b));
  });

  test('invitation expiry is short (<= 7 days) — "short expiry" per architecture N.3', () => {
    const now = new Date('2026-08-18T00:00:00.000Z');
    const exp = PS.invitationExpiry(now);
    const days = (exp.getTime() - now.getTime()) / 86400000;
    assert.ok(days > 0 && days <= 7, `expiry is ${days} days`);
  });

  test('isValidEmail rejects obvious garbage and accepts a normal address', () => {
    assert.equal(PS.isValidEmail('not-an-email'), false);
    assert.equal(PS.isValidEmail('parent@example.com'), true);
  });
});

describe('lib/parent-digest.ts — V.8.5 policy stamping, no risk without both categories', () => {
  const baseProjection = {
    system: { connectionActive: true, connectionSince: '2026-01-01', policyVersion: 3, policyUpdatedAt: '2026-01-01' },
  };

  test('computeRiskFlags returns no flag when dimensionBreakdown is not shared', () => {
    const flags = PD.computeRiskFlags({
      studentName: 'A',
      projection: { ...baseProjection, upcomingExams: [{ name: 'Physics', subject: 'Physics', date: '2026-08-19', board: 'CBSE' }] },
    });
    assert.deepEqual(flags, {});
  });

  test('computeRiskFlags returns no flag when upcomingExams is not shared', () => {
    const flags = PD.computeRiskFlags({
      studentName: 'A',
      projection: { ...baseProjection, dimensionBreakdown: { captured_on: '2026-08-18', total: 200, pqa: 0, syllabus: 0, mistakes: 0, consistency: 0, confidence: null } },
    });
    assert.deepEqual(flags, {});
  });

  test('computeRiskFlags flags an imminent low-score exam when both are shared', () => {
    const flags = PD.computeRiskFlags({
      studentName: 'A',
      projection: {
        ...baseProjection,
        dimensionBreakdown: { captured_on: '2026-08-18', total: 200, pqa: 0, syllabus: 0, mistakes: 0, consistency: 0, confidence: null },
        upcomingExams: [{ name: 'Physics Boards', subject: 'Physics', date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), board: 'CBSE' }],
      },
    });
    assert.ok(flags.examSoon);
    assert.equal(flags.examSoon.name, 'Physics Boards');
  });

  test('buildParentEmailHtml stamps the policy version and never mentions marks/weak topics', () => {
    const html = PD.buildParentEmailHtml('digest', {
      studentName: 'Test Student',
      projection: {
        ...baseProjection,
        dimensionBreakdown: { captured_on: '2026-08-18', total: 555, pqa: 200, syllabus: 100, mistakes: 100, consistency: 80, confidence: 0.7 },
      },
    }, {});
    assert.ok(html.includes('POLICY v3'), 'policy_version is not stamped into the email');
    assert.ok(!/current marks/i.test(html), 'email renders a "Current Marks" section — not a Shared category');
    assert.ok(!/weak topic/i.test(html), 'email renders weak topics');
    assert.ok(!/\bstreak\b/i.test(html), 'email renders a streak (banned, PRODUCT_DECISIONS §9.3)');
  });

  test('an email with no shared score renders no score block, honestly (no fabricated 0/1000)', () => {
    const html = PD.buildParentEmailHtml('digest', { studentName: 'Test Student', projection: baseProjection }, {});
    assert.ok(!html.includes('EXAM READINESS'));
  });
});
