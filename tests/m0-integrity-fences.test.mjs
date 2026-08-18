// Regression fences for M0-6 (streak presentation and streak-at-risk
// notifications) and M0-10 (the client-side mistake status write).
//
// Both fixes are *subtractions*, so there is no new function to unit-test —
// the safety of the product now rests on certain code not existing. These
// suites assert that absence, the same way `reference-builder-render.test.mjs`
// asserts the absence of a raw-HTML sink.
//
// What is deliberately NOT asserted here: that `ledger-focus-streak` stops
// being written. It is still written, because `lib/ledger-score.ts` reads it
// directly as the raw input to the Consistency term. Deleting the write would
// silently move every student's score, which M0 must not do; deleting the
// *term* is M14-2. M0-6 removes the presentation and the notification, not the
// storage.
//
//   node --test tests/
//   node --test tests/m0-integrity-fences.test.mjs
//
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Comments in this repo describe what was removed and why, by name. Only real
// code matters, so strip line and block comments before asserting.
const codeOf = (rel) =>
  fs.readFileSync(path.join(root, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

// ── M0-6: no streak-at-risk notification ────────────────────────────────────

describe('M0-6: the notification engine cannot express a streak send', () => {
  const src = codeOf('lib/notifications.ts');

  test('no "streak" notification type exists', () => {
    assert.ok(!/["']streak["']/.test(src), 'a "streak" notification type reappeared');
  });

  test('the engine does not read the streak, its last date or its shield', () => {
    assert.ok(!/@\/lib\/streak/.test(src), 'lib/streak is imported again');
    assert.ok(!/shieldUsedMonth|shieldAvailable/.test(src), 'the streak shield reached the engine again');
    assert.ok(!/\bstreak\b/.test(src), 'a streak input reached the engine again');
  });

  test('the cron does not feed a streak into the engine', () => {
    const cron = codeOf('app/api/cron/notifications/route.ts');
    assert.ok(!/ledger-focus-streak|ledger-focus-shield/.test(cron),
      'the notifications cron reads the streak again');
  });
});

// ── M0-6: no streak presentation ────────────────────────────────────────────

describe('M0-6: no surface presents a streak to the student or a parent', () => {
  test('the focus context exposes no streak or shield', () => {
    const src = codeOf('lib/focus-context.tsx');
    const shape = src.match(/export type FocusCtx = \{([\s\S]*?)\n\};/);
    assert.ok(shape, 'FocusCtx shape not found');
    assert.ok(!/streak|shield/i.test(shape[1]),
      'FocusCtx exposes a streak or shield again — a consumer could render a counter');
    const provided = src.match(/<FocusContext\.Provider value=\{\{([\s\S]*?)\}\}/);
    assert.ok(provided, 'FocusContext provider value not found');
    assert.ok(!/streak|shield/i.test(provided[1]), 'the provider hands out a streak again');
  });

  // The copy patterns a streak is actually rendered with. A bare "streak"
  // token is not asserted, because the word legitimately survives in scoring
  // field names (`ScoreBreakdown.streak`) until M14-2 deletes the term.
  const SHAME_COPY = /day streak|Study Streak|Current Streak|Streak shield|break(ing)? your streak|days running|best streak|in a row|don'?t miss a day/i;

  // M17 replaced `app/parent/[code]/page.tsx` and `app/api/parent/[code]/route.ts`
  // outright (the unauthenticated parentCode path is gone — M17-1's own
  // done-when). The fence for "no streak surface" now points at their
  // replacements, `app/parent/page.tsx` and `app/api/parent/report/route.ts`.
  const SURFACES = [
    'app/tools/focus-lab/page.tsx',
    'app/dashboard/page.tsx',
    'app/parent/page.tsx',
    'components/dashboard/masthead.tsx',
    'components/dashboard/by-the-numbers.tsx',
    'components/dashboard/academic-markets.tsx',
  ];

  for (const rel of SURFACES) {
    test(`${rel} renders no streak counter or cliff copy`, () => {
      const m = codeOf(rel).match(SHAME_COPY);
      assert.equal(m, null, `${rel}: streak presentation reappeared (${m && m[0]})`);
    });
  }

  test('the parent projection does not select the streak/focus column (M17: structurally, via the views in 029_parent_space.sql)', () => {
    // SQL comments use `--`, and documentation lives in `COMMENT ON ... IS
    // '…'` string literals — neither form is stripped by `codeOf` (it only
    // strips `//` and `/* */`, the JS/TS forms). 029_parent_space.sql
    // documents its own absence of a streak column inside exactly such a
    // `COMMENT ON VIEW` string ("No streak column — banned outright") and a
    // `--` line comment ("a count, not a streak") — design prose, not a
    // leaked reference. Strip both before asserting, so the assertion tests
    // real column/identifier references, not prose explaining why the word
    // is banned.
    const sql = codeOf('supabase/migrations/029_parent_space.sql')
      .replace(/COMMENT ON [\s\S]*?;/g, '')
      .replace(/--.*$/gm, '');
    assert.ok(!/\bfocus\b/.test(sql), 'a parent-space view or function references `focus` — absent, not filtered');
    assert.ok(!/\bstreak\b/.test(sql), 'a parent-space view or function references `streak` — absent, not filtered');
    const route = codeOf('app/api/parent/report/route.ts');
    assert.ok(!/\bfocus\b/.test(route) && !/\bstreak\b/i.test(route), 'the parent report route references streak/focus');
  });
});

// ── M0-10: no client-side claim of mistake resolution ───────────────────────

describe('M0-10: no client path marks a mistake resolved', () => {
  test('exam-practice never writes a mistake status', () => {
    const src = codeOf('app/tools/exam-practice/page.tsx');
    assert.ok(!/\.status\s*=[^=]/.test(src), 'a mistake status assignment reappeared');
    assert.ok(!/clearedDate/.test(src), 'a clearedDate write reappeared');
    assert.ok(!/["']cleared["']/.test(src), 'the "cleared" status literal reappeared');
    assert.ok(!/mistake_cleared/.test(src), 'a mistake-cleared active-day stamp reappeared');
  });

  test('exam-practice may still OPEN a mistake — capture is not the defect', () => {
    const src = codeOf('app/tools/exam-practice/page.tsx');
    assert.ok(/status:\s*["']open["']/.test(src),
      'the mistake capture path was removed; M0-10 removes resolution, not recording');
  });

  // Nothing rendered in the browser may set a mistake to a resolved-looking
  // state. `lib/mistakes/*` is excluded deliberately: that is the server-side
  // domain engine, and it is the only thing allowed to resolve anything.
  test('no page or component assigns a resolved-looking mistake status', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        const rel = path.relative(root, p).replace(/\\/g, '/');
        const code = codeOf(rel);
        if (/status\s*[:=]\s*["'](cleared|resolved)["']/.test(code)) offenders.push(rel);
      }
    };
    walk(path.join(root, 'app'));
    walk(path.join(root, 'components'));
    assert.deepEqual(offenders, [],
      `client surfaces claiming mistake resolution: ${offenders.join(', ')}`);
  });
});
