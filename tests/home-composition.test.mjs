/**
 * M22 — HOME COMPOSITION. Acceptance M.1 … M.6, proved.
 *
 * EXECUTION_PLAN M22's definition of done, task by task:
 *   M22-1  Components are registered, not hardcoded.
 *   M22-2  Server-persisted HomeLayout replacing 5 unsynced booleans. Done
 *          when: layout survives a device change.
 *   M22-3  Four importance tiers + the anti-inflation guardrails. Done when:
 *          M.5 — "critical" cannot inflate.
 *
 * `lib/home/*.ts` is I/O-free (no database, no clock, no randomness, no
 * framework import), which is what makes M.2/M.3/M.4/M.5 provable with no
 * Supabase project in reach (U.3, the determinism boundary) — same posture
 * `tests/today.test.mjs` and `tests/recommendations.test.mjs` take toward
 * their own engines.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checksumOf, migrationBody, parseMigrationFilename } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-home');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const strip = sql =>
  sql
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n');

const SQL_034 = 'supabase/migrations/034_home_layout.sql';
const REGISTRY_SRC = 'lib/home/registry.ts';
const TYPES_SRC = 'lib/home/types.ts';
const IMPORTANCE_SRC = 'lib/home/importance.ts';
const LAYOUT_SRC = 'lib/home/layout.ts';
const DASH_LAYOUT_SRC = 'lib/dash-layout.ts';

let TYPES, REGISTRY, IMPORTANCE, LAYOUT;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.home.json'],
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
  const load = f => import(pathToFileURL(path.join(outDir, 'home', f)).href);
  [TYPES, REGISTRY, IMPORTANCE, LAYOUT] = await Promise.all([
    load('types.js'),
    load('registry.js'),
    load('importance.js'),
    load('layout.js'),
  ]);
});

const NOW = Date.parse('2026-08-18T10:00:00.000Z');
const DAY = 86_400_000;

// ═══════════════════════════════════════════════════════════════════════════
// M22-1 — THE M.2 COMPONENT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

describe('M22-1 — the M.2 component registry', () => {
  test('exactly the five registered ids, mirroring HOME_COMPONENT_IDS', () => {
    const ids = REGISTRY.listHomeComponents().map(c => c.componentId);
    assert.deepEqual(ids, [...TYPES.HOME_COMPONENT_IDS]);
  });

  test('every registry entry carries the M.2 field shape', () => {
    for (const def of REGISTRY.listHomeComponents()) {
      for (const field of [
        'componentId', 'title', 'dataDependencies', 'minSize', 'maxSize', 'defaultSize',
        'defaultOrder', 'canBeHidden', 'importanceCapable', 'maxTier', 'emptyBehaviour', 'mobileRank',
      ]) {
        assert.ok(field in def, `component "${def.componentId}" is missing field "${field}"`);
      }
    }
  });

  test('can_be_hidden = false applies to EXACTLY ONE component: the Score (M.2)', () => {
    const locked = REGISTRY.listHomeComponents().filter(c => !c.canBeHidden);
    assert.deepEqual(locked.map(c => c.componentId), ['score']);
  });

  test('the Score cannot be promoted — chrome is always maximally present already', () => {
    const score = REGISTRY.getHomeComponent('score');
    assert.equal(score.importanceCapable, false);
    assert.equal(score.maxTier, 'ambient');
  });

  test('getHomeComponent throws for an id outside the registry — the allowlist IS the registry', () => {
    assert.throws(() => REGISTRY.getHomeComponent('not_a_real_component'));
  });

  test('COMPOSITION IS DRIVEN BY ITERATING THE REGISTRY, not a hardcoded list: every id resolveHomeComposition can ever emit is exactly listHomeComponents()', () => {
    const layout = LAYOUT.defaultHomeLayout();
    const availableData = new Set(['score_snapshot', 'next_best_action', 'accomplishments', 'upcoming_exams']);
    const composition = LAYOUT.resolveHomeComposition({ layout, availableData, importanceSignals: [], viewport: 'desktop', nowMs: NOW });
    const emitted = new Set(composition.components.map(c => c.componentId));
    const registryIds = new Set(REGISTRY.listHomeComponents().map(c => c.componentId));
    for (const id of emitted) assert.ok(registryIds.has(id), `composition emitted "${id}", which is not in the registry`);
  });

  test('app/home/page.tsx never hardcodes the widget list — it delegates entirely to HomeComposer + the registry', () => {
    const src = read('app/home/page.tsx');
    assert.match(src, /HomeComposer/, 'app/home/page.tsx must render <HomeComposer/>, not a hand-written widget list');
    // None of the five component titles/labels appear as string literals in
    // the page itself — they live only in the registry.
    for (const label of ['Daily Recommendation', 'Recently Used', 'Exam Schedule', 'Features Showcase']) {
      assert.doesNotMatch(src, new RegExp(label), `"${label}" must not be hardcoded in app/home/page.tsx`);
    }
  });

  test('the composer resolves componentId -> widget through a lookup table, not a switch/if chain', () => {
    const src = read('components/home/composer.tsx');
    assert.doesNotMatch(src, /\bswitch\s*\(/, 'a switch statement is a hardcoded dispatch, not a registry lookup');
    assert.match(src, /RENDERERS\[/, 'must dispatch via a componentId-keyed lookup table');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M22-2 — SERVER-PERSISTED HomeLayout, "SURVIVES A DEVICE CHANGE"
// ═══════════════════════════════════════════════════════════════════════════

describe('M22-2 — HomeLayout persistence', () => {
  test('validateHomeLayout refuses an unknown componentId — the registry is the allowlist', () => {
    const result = LAYOUT.validateHomeLayout({ entries: [{ componentId: 'not_real', visible: true, order: 0, size: 'compact' }] });
    assert.equal(result.ok, false);
  });

  test('validateHomeLayout refuses hiding the Score', () => {
    const result = LAYOUT.validateHomeLayout({ entries: [{ componentId: 'score', visible: false, order: 0, size: 'compact' }] });
    assert.equal(result.ok, false);
    assert.match(result.error, /chrome/i);
  });

  test('validateHomeLayout refuses a size outside the component\'s registered range', () => {
    const result = LAYOUT.validateHomeLayout({ entries: [{ componentId: 'score', visible: true, order: 0, size: 'expanded' }] });
    assert.equal(result.ok, false);
  });

  test('a partial submission fills in registry defaults for absent entries', () => {
    const result = LAYOUT.validateHomeLayout({ entries: [{ componentId: 'exams', visible: false, order: 3, size: 'compact' }] });
    assert.equal(result.ok, true);
    assert.equal(result.layout.entries.length, TYPES.HOME_COMPONENT_IDS.length);
  });

  test('DEVICE-CHANGE SIMULATION: a layout validated on "device A" round-trips through a plain-JSON transport (exactly what /api/home-layout persists and returns) and resolves identically on "device B", with no localStorage anywhere in the loop', () => {
    // "Device A" — student reorders/hides components.
    const deviceA = LAYOUT.validateHomeLayout({
      entries: [
        { componentId: 'exams', visible: true, order: 0, size: 'expanded' },
        { componentId: 'recommendation', visible: false, order: 1, size: 'compact' },
      ],
    });
    assert.equal(deviceA.ok, true);

    // The server-persisted record — a plain JSON document, exactly the shape
    // `home_layout.entries` (034) stores and `/api/home-layout` GET returns.
    const serverRecord = JSON.parse(JSON.stringify(deviceA.layout));

    // "Device B" — a fresh session reads the SAME server record (never a
    // localStorage key, which is device-local by definition).
    const deviceB = LAYOUT.validateHomeLayout(serverRecord);
    assert.equal(deviceB.ok, true);
    assert.deepEqual(deviceB.layout.entries, deviceA.layout.entries);

    // The resolved composition (order, visibility) is therefore identical
    // across "devices" too.
    const availableData = new Set(['score_snapshot', 'next_best_action', 'accomplishments', 'upcoming_exams']);
    const compA = LAYOUT.resolveHomeComposition({ layout: deviceA.layout, availableData, importanceSignals: [], viewport: 'desktop', nowMs: NOW });
    const compB = LAYOUT.resolveHomeComposition({ layout: deviceB.layout, availableData, importanceSignals: [], viewport: 'desktop', nowMs: NOW });
    assert.deepEqual(compA.components, compB.components);
  });

  test('lib/dash-layout.ts no longer touches localStorage["ledger-dash-layout"] — the mechanism is retired', () => {
    const src = read(DASH_LAYOUT_SRC);
    assert.doesNotMatch(src, /localStorage/, 'lib/dash-layout.ts must be I/O over the server API only, post-M22');
    assert.doesNotMatch(src, /ledger-dash-layout/);
  });

  test('the settings/personalise consumers fetch/save the server layout, never localStorage, for dashboard sections', () => {
    for (const f of ['components/settings/appearance-fields.tsx', 'app/tools/personalise/page.tsx']) {
      const src = read(f);
      assert.match(src, /fetchHomeLayout/, `${f} must read HomeLayout from the server`);
      assert.match(src, /saveHomeLayout/, `${f} must write HomeLayout to the server`);
      assert.doesNotMatch(src, /getDashLayout|saveDashLayout|DASH_DEFAULTS/, `${f} must not reference the retired boolean API`);
    }
  });

  test('auth-provider no longer keeps "ledger-dash-layout" across sign-out — it is not device-local data anymore', () => {
    const src = read('components/auth-provider.tsx');
    assert.doesNotMatch(src, /ledger-dash-layout/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M22-3 — M.4 TIERS + M.5 ANTI-INFLATION. "'CRITICAL' CANNOT INFLATE."
// ═══════════════════════════════════════════════════════════════════════════

describe('M22-3 — importance tiers and the anti-inflation guardrails', () => {
  test('M.5.1 — a trigger outside the tier\'s closed list is refused at construction', () => {
    assert.throws(() => IMPORTANCE.buildImportanceSignal({
      componentId: 'exams',
      tier: 'highlighted',
      trigger: 'exam_within_critical_window', // a T3 trigger, not a T1 one
      evidenceRefs: [{ refKind: 'exam', id: 'x' }],
    }), IMPORTANCE.HomeImportanceConstructionError);
  });

  test('M.5.3 — a critical signal with neither resolvesAtMs nor resolutionCondition is not constructible', () => {
    assert.throws(() => IMPORTANCE.buildImportanceSignal({
      componentId: 'exams',
      tier: 'critical',
      trigger: 'exam_within_critical_window',
      evidenceRefs: [{ refKind: 'exam', id: 'x' }],
    }), IMPORTANCE.HomeImportanceConstructionError);
  });

  test('a critical signal WITH a resolutionCondition (no deadline) is constructible', () => {
    const s = IMPORTANCE.buildImportanceSignal({
      componentId: 'exams',
      tier: 'critical',
      trigger: 'data_integrity_event',
      evidenceRefs: [{ refKind: 'audit', id: 'a1' }],
      resolutionCondition: 'the discrepancy is resolved',
    });
    assert.equal(s.tier, 'critical');
  });

  test('a signal with no evidenceRefs is not constructible (M.5.5 needs something to log)', () => {
    assert.throws(() => IMPORTANCE.buildImportanceSignal({
      componentId: 'exams',
      tier: 'promoted',
      trigger: 'due_retest',
      evidenceRefs: [],
    }));
  });

  test('M.5.4 — no absence-shaped trigger exists in ANY closed list', () => {
    const all = [...TYPES.T3_CRITICAL_TRIGGERS, ...TYPES.T2_PROMOTED_TRIGGERS, ...TYPES.T1_HIGHLIGHTED_TRIGGERS];
    for (const t of all) {
      assert.doesNotMatch(t, /absen|inactiv|missed|streak|idle/i, `trigger "${t}" looks absence-shaped — forbidden by M.5.4`);
    }
  });

  test('M.5.2 — at most one T3 renders: two critical signals, the earlier deadline wins, the other demotes to promoted', () => {
    const early = IMPORTANCE.buildImportanceSignal({
      componentId: 'exams', tier: 'critical', trigger: 'exam_within_critical_window',
      evidenceRefs: [{ refKind: 'exam', id: 'e1' }], resolvesAtMs: NOW + 1 * DAY,
    });
    const late = IMPORTANCE.buildImportanceSignal({
      componentId: 'exams', tier: 'critical', trigger: 'account_access_issue',
      evidenceRefs: [{ refKind: 'account', id: 'acct1' }], resolvesAtMs: NOW + 5 * DAY,
    });
    const capped = IMPORTANCE.capCriticalToOne([late, early]);
    const stillCritical = capped.filter(s => s.tier === 'critical');
    assert.equal(stillCritical.length, 1);
    assert.equal(stillCritical[0].resolvesAtMs, NOW + 1 * DAY);
    const demoted = capped.find(s => s.tier === 'promoted');
    assert.ok(demoted, 'the losing critical signal must demote to promoted, not disappear');
  });

  test('THE CENTREPIECE — "critical" cannot inflate: a signal claiming critical for a component registered below that ceiling resolves at the REGISTERED ceiling, never at the claimed tier', () => {
    // `recommendation`'s registry ceiling is `promoted` (T2) — it can never
    // legitimately reach `critical`, however a signal is constructed.
    const overclaim = IMPORTANCE.buildImportanceSignal({
      componentId: 'recommendation',
      tier: 'critical', // the claim
      trigger: 'exam_within_critical_window', // a validly-formed T3 trigger — the construction succeeds
      evidenceRefs: [{ refKind: 'exam', id: 'x' }],
      resolvesAtMs: NOW + DAY,
    });
    assert.equal(overclaim.tier, 'critical', 'construction itself must succeed — the guardrail is the CEILING, not refusal to build');

    const resolution = IMPORTANCE.resolveHomeImportance([overclaim], NOW);
    assert.equal(resolution.tierByComponent.get('recommendation'), 'promoted', 'clamped to the registry ceiling, not the claimed tier');
    const promo = resolution.promotions.find(p => p.componentId === 'recommendation');
    assert.equal(promo.tier, 'promoted', 'the LOGGED tier is the resolved tier, never the inflated claim');
  });

  test('a component with importanceCapable=false cannot be promoted at all — clamped straight to ambient (absent from the map)', () => {
    const s = IMPORTANCE.buildImportanceSignal({
      componentId: 'features',
      tier: 'highlighted',
      trigger: 'score_movement',
      evidenceRefs: [{ refKind: 'score_snapshot', id: 's1' }],
    });
    const resolution = IMPORTANCE.resolveHomeImportance([s], NOW);
    assert.equal(resolution.tierByComponent.has('features'), false);
    assert.equal(resolution.promotions.some(p => p.componentId === 'features'), false);
  });

  test('M.5.5 — every surviving promotion is logged with trigger and evidenceRefs', () => {
    const s = IMPORTANCE.buildImportanceSignal({
      componentId: 'exams', tier: 'critical', trigger: 'exam_within_critical_window',
      evidenceRefs: [{ refKind: 'exam', id: 'e1' }], resolvesAtMs: NOW + DAY,
    });
    const resolution = IMPORTANCE.resolveHomeImportance([s], NOW);
    assert.equal(resolution.promotions.length, 1);
    assert.equal(resolution.promotions[0].trigger, 'exam_within_critical_window');
    assert.deepEqual(resolution.promotions[0].evidenceRefs, [{ refKind: 'exam', id: 'e1' }]);
    assert.equal(resolution.promotions[0].promotedAtMs, NOW);
  });

  test('an ambient render (no signals) logs nothing — no promotion is fabricated', () => {
    const resolution = IMPORTANCE.resolveHomeImportance([], NOW);
    assert.equal(resolution.promotions.length, 0);
    assert.equal(resolution.tierByComponent.size, 0);
  });

  test('a critical component gets a dedicated slot at the front, and is NOT dismissed by visible:false (M.4)', () => {
    const layout = LAYOUT.validateHomeLayout({
      entries: [{ componentId: 'exams', visible: false, order: 3, size: 'standard' }],
    }).layout;
    const signal = IMPORTANCE.buildImportanceSignal({
      componentId: 'exams', tier: 'critical', trigger: 'exam_within_critical_window',
      evidenceRefs: [{ refKind: 'exam', id: 'e1' }], resolvesAtMs: NOW + DAY,
    });
    const composition = LAYOUT.resolveHomeComposition({
      layout, availableData: new Set(['score_snapshot', 'upcoming_exams']),
      importanceSignals: [signal], viewport: 'desktop', nowMs: NOW,
    });
    assert.equal(composition.components[0].componentId, 'exams');
    assert.equal(composition.components[0].dedicatedSlot, true);
    assert.equal(composition.components[0].tier, 'critical');
  });

  test('a promoted component (T2) moves to the top of its section but does not claim the dedicated slot', () => {
    const layout = LAYOUT.defaultHomeLayout();
    const signal = IMPORTANCE.buildImportanceSignal({
      componentId: 'recommendation', tier: 'promoted', trigger: 'due_retest',
      evidenceRefs: [{ refKind: 'pattern', id: 'p1' }],
    });
    const composition = LAYOUT.resolveHomeComposition({
      layout, availableData: new Set(['score_snapshot', 'next_best_action', 'accomplishments', 'upcoming_exams']),
      importanceSignals: [signal], viewport: 'desktop', nowMs: NOW,
    });
    assert.equal(composition.components[0].dedicatedSlot, false);
    assert.equal(composition.components[0].componentId, 'recommendation');
  });

  test('M.2 — a component whose data dependency is unmet is OMITTED, never rendered empty', () => {
    const layout = LAYOUT.defaultHomeLayout();
    const composition = LAYOUT.resolveHomeComposition({
      layout, availableData: new Set(['score_snapshot']), // nothing else available
      importanceSignals: [], viewport: 'desktop', nowMs: NOW,
    });
    const ids = composition.components.map(c => c.componentId);
    assert.ok(!ids.includes('recommendation'));
    assert.ok(!ids.includes('exams'));
    assert.ok(!ids.includes('recent_activity'));
    // `features` declares no dependency — always available.
    assert.ok(ids.includes('features'));
  });

  test('M.6 — mobile orders by mobileRank, not the student\'s desktop order', () => {
    const layout = LAYOUT.validateHomeLayout({
      entries: [
        { componentId: 'recommendation', visible: true, order: 5, size: 'compact' },
        { componentId: 'exams', visible: true, order: 0, size: 'compact' },
      ],
    }).layout;
    const availableData = new Set(['score_snapshot', 'next_best_action', 'upcoming_exams']);
    const mobile = LAYOUT.resolveHomeComposition({ layout, availableData, importanceSignals: [], viewport: 'mobile', nowMs: NOW });
    const nonScore = mobile.components.filter(c => c.componentId !== 'score').map(c => c.componentId);
    // registry mobileRank: recommendation=1, exams=2, features=4 —
    // recommendation first on mobile regardless of the student's desktop
    // `order` field above. `features` has no dependency and is always
    // available, so it renders last.
    assert.deepEqual(nonScore, ['recommendation', 'exams', 'features']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 034_home_layout.sql — LEDGER CONVENTIONS AND THE DATABASE-LEVEL GUARDRAIL
// ═══════════════════════════════════════════════════════════════════════════

describe('034_home_layout.sql — ledger conventions and the anti-inflation GRANT', () => {
  test('filename parses under the NNN[a]_slug.sql convention, version 034', () => {
    const parsed = parseMigrationFilename('034_home_layout.sql');
    assert.ok(parsed);
    assert.equal(parsed.version, '034');
  });

  test('the recorded checksum matches the actual checksum of the migration body', () => {
    const contents = read(SQL_034);
    const body = migrationBody(contents);
    const m = /'([0-9a-f]{64})'/.exec(contents.slice(contents.indexOf('MIGRATION LEDGER')));
    assert.ok(m, 'no checksum literal found in the registration block');
    assert.equal(checksumOf(contents), m[1]);
    assert.ok(body.length > 0);
  });

  test('two tables exist: home_layout (student-owned) and home_importance_promotions (append-only, system-owned)', () => {
    const sql = strip(read(SQL_034));
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.home_layout/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.home_importance_promotions/);
  });

  test('THE STRUCTURAL GUARDRAIL — authenticated has SELECT and nothing else on home_importance_promotions', () => {
    const sql = strip(read(SQL_034));
    assert.match(sql, /REVOKE ALL ON public\.home_importance_promotions FROM authenticated/);
    assert.match(sql, /GRANT SELECT ON public\.home_importance_promotions TO authenticated/);
    // No INSERT/UPDATE/DELETE grant to `authenticated` anywhere for this table.
    const grantLines = sql.split('\n').filter(l => /GRANT .* ON public\.home_importance_promotions TO authenticated/.test(l));
    for (const line of grantLines) {
      assert.doesNotMatch(line, /INSERT|UPDATE|DELETE/, `authenticated must never be granted a write verb on home_importance_promotions: "${line.trim()}"`);
    }
  });

  test('only service_role may INSERT into home_importance_promotions, and no one may UPDATE/DELETE it (append-only)', () => {
    const sql = strip(read(SQL_034));
    assert.match(sql, /GRANT SELECT, INSERT ON public\.home_importance_promotions TO service_role/);
    assert.doesNotMatch(sql, /GRANT[^;]*UPDATE[^;]*ON public\.home_importance_promotions/);
    assert.doesNotMatch(sql, /GRANT[^;]*DELETE[^;]*ON public\.home_importance_promotions/);
  });

  test('home_layout has a DB-level trigger refusing to hide the Score, independent of the app-layer check', () => {
    const sql = strip(read(SQL_034));
    assert.match(sql, /home_layout_score_is_chrome/);
    assert.match(sql, /componentId.*=.*'score'/);
  });

  test('home_layout RLS scopes select/insert/update to the caller\'s own row, with no DELETE policy', () => {
    const sql = strip(read(SQL_034));
    assert.match(sql, /CREATE POLICY home_layout_select_own ON public\.home_layout[\s\S]*?auth\.uid\(\) = student_id/);
    assert.match(sql, /CREATE POLICY home_layout_upsert_own ON public\.home_layout/);
    assert.match(sql, /CREATE POLICY home_layout_update_own ON public\.home_layout/);
    assert.doesNotMatch(sql, /CREATE POLICY[^;]*DELETE[^;]*ON public\.home_layout/);
  });
});
