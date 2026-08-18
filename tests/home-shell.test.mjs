// M3 — ONE SHELL. `/dashboard` + `/console` → `/home`.
//
// Architecture T10: two shells both computing the Ledger Score and both
// rendering a next action guarantee divergence once the event layer lands
// under them. `PRODUCT_DECISIONS` §2.4 merged them; this asserts the merge
// actually happened and cannot silently un-happen.
//
// These are structural fences over source and config, not render tests: the
// repository has no React test renderer, and the claims M3 makes ("no OTHER
// route computes the score", "the routes still resolve", "the redirect is
// permanent") are claims about the shape of the tree, which is exactly what
// source assertions can prove.
//
//   node --test tests/home-shell.test.mjs
//
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

// Comments here name what was removed and why, by symbol. Only real code
// counts — same convention as tests/m0-integrity-fences.test.mjs.
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

// Every page in the app router, so "no OTHER route" is measured rather than
// assumed.
function pages(dir = 'app', out = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) pages(rel, out);
    else if (e.name === 'page.tsx') out.push(rel);
  }
  return out;
}

// ══ M3-1 — ONE SHELL ════════════════════════════════════════════════════════

describe('M3-1: /home is the shell', () => {
  test('the route exists, with its own layout', () => {
    assert.ok(exists('app/home/page.tsx'), '/home has no page');
    assert.ok(exists('app/home/layout.tsx'), '/home has no shell layout');
  });

  test('it reads the score through the unchanged engine', () => {
    const src = read('app/home/page.tsx');
    assert.match(src, /computeLedgerScore\(\)/,
      '/home does not compute the Ledger Score');
    assert.match(src, /from ["']@\/lib\/ledger-score["']/,
      '/home does not read lib/ledger-score');
    // M3 may not touch the engine. If it had, the score would have moved for
    // every student in a milestone whose brief is structural.
    assert.ok(!/ledger-score-v2/.test(src), '/home reaches into the v2 engine');
  });

  test('it renders ONE next action, from an existing engine', () => {
    const src = code('app/home/page.tsx');
    assert.match(src, /deriveNextMove\(/, '/home derives no next move');
    assert.match(src, /from ["']@\/lib\/console\/next-move["']/,
      '/home does not source the move from lib/console/next-move');
    // Exactly one. A second call would be a second move on one surface, which
    // is the failure `PRODUCT_DECISIONS` §2.1 exists to prevent.
    assert.equal((src.match(/deriveNextMove\(/g) || []).length, 1,
      '/home derives more than one move');
    // And not a third engine invented here (M20 owns that decision).
    assert.ok(!/RecommendedAction/.test(src),
      '/home mounts the dashboard recommendation surface as well — two engines again');
  });

  test('the shell reuses the console vocabulary rather than a new one', () => {
    const src = read('app/home/page.tsx');
    assert.match(src, /@\/components\/console\/primitives/,
      '/home invents its own layout vocabulary');
  });
});

describe('M3-1: /dashboard and /console redirect', () => {
  const config = read('next.config.mjs');

  for (const source of ['/dashboard', '/console']) {
    test(`${source} redirects permanently to /home in next.config.mjs`, () => {
      const row = new RegExp(
        `source:\\s*["']${source}["'][^}]*destination:\\s*["']/home["'][^}]*permanent:\\s*true`,
      );
      assert.match(config, row, `${source} has no permanent redirect to /home`);
    });
  }

  for (const rel of ['app/dashboard/page.tsx', 'app/console/page.tsx']) {
    test(`${rel} renders nothing of its own`, () => {
      const src = code(rel);
      assert.match(src, /permanentRedirect\(["']\/home["']\)/,
        `${rel} does not redirect at the route level`);
      assert.ok(!/computeLedgerScore/.test(src),
        `${rel} computes the score again — T10 has returned`);
    });
  }

  test('the sub-routes of both segments are NOT redirected (§2.5)', () => {
    // §2.4 merges /console/work, /console/practice and /console/analytics into
    // Capture, Practise and Record — later milestones, not this one. A prefix
    // redirect here would 301 them into a shell that cannot do their work.
    for (const rel of [
      'app/dashboard/profile/page.tsx', 'app/dashboard/saved/page.tsx',
      'app/console/ai/page.tsx', 'app/console/analytics/page.tsx',
      'app/console/practice/page.tsx', 'app/console/work/page.tsx',
    ]) {
      assert.ok(exists(rel), `${rel} was deleted; §2.5 says unlinked, not deleted`);
    }
    assert.ok(!/source:\s*["']\/console\/:path\*["']/.test(config),
      'a wildcard /console redirect would swallow four unmerged routes');
    assert.ok(!/source:\s*["']\/dashboard\/:path\*["']/.test(config),
      'a wildcard /dashboard redirect would swallow profile and saved');
  });
});

// ══ M3-2 — EXAM-DAY IS A STATE, NOT A ROUTE ═════════════════════════════════

describe('M3-2: exam-day activates on proximity', () => {
  test('proximity is a presence signal, never an absence one', () => {
    const src = code('lib/exam-day.ts');
    // A dated paper that exists is the only trigger. Architecture M.5.4 —
    // a T3-style promotion may never be driven by inactivity or a missed day,
    // which is what stops the state becoming a shame channel.
    assert.ok(!/inactiv|streak|lastStudied|daysSince/i.test(src),
      'exam proximity reads an absence signal');
  });

  test('/home renders the exam-day panel on proximity', () => {
    const src = read('app/home/page.tsx');
    assert.match(src, /examProximity\(/, '/home computes no proximity');
    assert.match(src, /<ExamDayPanel/, '/home never renders the exam-day state');
  });

  test('the panel is sourced from the route’s own logic, not a copy', () => {
    const panel = code('components/home/exam-day-panel.tsx');
    assert.match(panel, /from ["']@\/lib\/exam-day["']/,
      'the panel does not read the extracted exam-day logic');
    assert.match(panel, /getGaps/, 'the panel builds its own gap list');

    // The extraction is real: the route imports the same functions, and its
    // module-private copies are gone. Two definitions of "your gaps" is the
    // divergence M3 exists to end.
    const route = code('app/tools/exam-day/page.tsx');
    assert.match(route, /from ["']@\/lib\/exam-day["']/,
      'the route kept its own copy of the logic');
    assert.ok(!/^function getGaps\(/m.test(route),
      'the route still declares its own getGaps');
  });

  test('the three absorbed routes still resolve standalone', () => {
    for (const slug of ['exam-day', 'panic-triage', 'exam-triage']) {
      assert.ok(exists(`app/tools/${slug}/page.tsx`),
        `/tools/${slug} was deleted — §1.4's deletion gate forbids it`);
    }
    const config = read('next.config.mjs');
    for (const slug of ['exam-day', 'panic-triage', 'exam-triage']) {
      assert.ok(!new RegExp(`source:\\s*["']/tools/${slug}["']`).test(config),
        `/tools/${slug} was redirected away; it must still resolve directly`);
    }
  });

  test('the near-exam window matches the parent digest’s, by assertion', () => {
    // lib/exam-day mirrors EXAM_RISK_WINDOW_DAYS rather than importing it
    // (that module carries the parent email HTML). The mirror is only safe if
    // drift fails here.
    const near = /EXAM_NEAR_DAYS\s*=\s*(\d+)/.exec(read('lib/exam-day.ts'));
    const risk = /EXAM_RISK_WINDOW_DAYS\s*=\s*(\d+)/.exec(read('lib/parent-digest.ts'));
    assert.ok(near && risk, 'one of the two window constants is missing');
    assert.equal(near[1], risk[1],
      'the Home exam window drifted from the parent-digest exam window');
  });
});

// ══ M3-3 — NO SECOND SCORE SHELL ════════════════════════════════════════════

describe('M3-3: no route besides /home renders the score as a shell', () => {
  // The criterion is about competing SHELLS, not about every surface that may
  // show a score-related figure. Two exemptions, both deliberate and both
  // named rather than pattern-matched:
  //
  //   /tools/grade-tracker — the score BREAKDOWN tool. §2.4 merges it into
  //     Record, which is a later milestone; it is a tool the student opens on
  //     purpose, not a shell they land in, and it answers "how is the score
  //     made up", which Home does not.
  //   /parent              — a different audience entirely. M17 replaced the
  //     unauthenticated `/parent/[code]` (which computed the score
  //     server-side) with `app/parent/page.tsx`, which renders only what
  //     `get_parent_projection()` returns — it does not call
  //     computeLedgerScore/computeScoreFromInputs at all, so it does not need
  //     an entry here; kept out of ALLOWED deliberately, as a second fence
  //     against a future edit re-adding client-side score computation to it.
  //   /tools/learn-lab     — computes a projected DELTA for a note it just
  //     saved ("this added +N"). It renders no total, no tier and no pillars,
  //     so it is feedback on an action, not a second reading of the score.
  const ALLOWED = new Set([
    'app/home/page.tsx',
    'app/tools/grade-tracker/page.tsx',
    'app/tools/learn-lab/page.tsx',
  ]);

  test('no other page computes the score', () => {
    const offenders = pages()
      .filter(rel => !ALLOWED.has(rel))
      .filter(rel => /computeLedgerScore|computeScoreFromInputs\s*\(/.test(code(rel)));
    assert.deepEqual(offenders, [],
      `a second score-rendering surface exists: ${offenders.join(', ')}`);
  });

  // Retiring a shell may not delete a capability (§1.3). Three of the
  // dashboard's panels were the product's ONLY host for something, so they
  // moved to Settings rather than dying with it.
  test('the capabilities that only the dashboard hosted survive', () => {
    const settings = code('app/dashboard/profile/page.tsx');
    for (const mounted of ['ExamSchedule', 'SharePanel', 'PushOptIn']) {
      assert.match(settings, new RegExp(`<${mounted}`),
        `${mounted} lost its only host when the dashboard was retired`);
    }
    // The one write path for a dated paper — which M3-2's proximity, the
    // parent digest and the risk-alert cron all read.
    assert.match(code('components/settings/exam-schedule.tsx'),
      /patchUserData\(userId, "exams"/,
      'nothing writes user_data.exams any more');
    // M17 replaced the bare `parentCode` mint (`patchUserData(userId,
    // "parentCode", …)`) with a real invitation flow — SharePanel now POSTs
    // to /api/parent/invite, which mints a single-use, hashed, short-expiry
    // token via create_parent_invitation() (029_parent_space.sql §6.1), never
    // by writing a code onto user_data directly. Assert the new mechanism is
    // present AND the old one is truly gone, not merely unasserted.
    const shareSrc = code('components/settings/share-panel.tsx');
    assert.match(shareSrc, /\/api\/parent\/invite/,
      'SharePanel no longer calls the parent-invitation endpoint');
    assert.ok(!/patchUserData\(userId, "parentCode"/.test(shareSrc),
      'the bare parentCode mint reappeared in SharePanel');
  });

  test('the moved panels carry no streak presentation (M0-6 holds)', () => {
    const SHAME = /day streak|Study Streak|Current Streak|Streak shield|streak break|break(ing)? your streak|days running|best streak|in a row|don'?t miss a day/i;
    for (const rel of ['components/settings/exam-schedule.tsx',
                       'components/settings/share-panel.tsx']) {
      const m = code(rel).match(SHAME);
      assert.equal(m, null, `${rel}: streak copy re-entered the product (${m && m[0]})`);
    }
    // §9.2 — per-topic miss counts are not a parent-visible category at any
    // setting, so the share copy may not promise them either.
    assert.ok(!/weak topics/i.test(code('components/settings/share-panel.tsx')),
      'the parent-share copy promises weak topics again');
  });

  test('the retired dashboard mounts none of its score components', () => {
    const src = code('app/dashboard/page.tsx');
    for (const gone of ['LedgerScoreWidget', 'ScoreRing', 'PersonalEdition',
                        'AcademicMarkets', 'Coverage', 'ByTheNumbers']) {
      assert.ok(!new RegExp(`<${gone}`).test(src),
        `the dashboard still mounts ${gone}`);
    }
  });
});
