// M16 — SETTINGS AND LEGAL.
//
//   M16-1 `/settings` absorbs `/dashboard/profile` and `/tools/personalise`;
//         both 301 to it. `PRODUCT_DECISIONS` §2.4, §3 route 8.
//   M16-2 `/legal` — one route, four sections; the four `/legal/*` routes 301
//         into it, each landing on its own section. §2.4, §3 route 9.
//   M16-3 Parent access controls surfaced in `/settings` — satisfied by
//         carrying `SharePanel` (M3-3's extraction of the dashboard's parent
//         mechanism) into the new page unchanged; M17's structural rebuild
//         of that mechanism is out of this milestone's scope.
//
// STRUCTURAL fences over source and config, the same pairing
// `tests/record.test.mjs` and `tests/diagnosis.test.mjs` use for their own
// M13 sections: this repository has no React test renderer, so "the route
// exists", "the four redirect", "the shell is reused rather than reinvented"
// and "no page was gutted" are all claims about the shape of the tree.
//
//   node --test tests/settings-legal.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

/** Comments explain; only real code counts. Same convention as
 *  tests/record.test.mjs and tests/diagnosis.test.mjs. */
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const cfg = () => read('next.config.mjs');

/** Matches one `next.config.mjs` redirect entry regardless of surrounding
 *  whitespace, same helper shape `tests/record.test.mjs` uses. */
function redirectsTo(source, destination) {
  const re = new RegExp(
    `source:\\s*"${source.replace(/[/?]/g, '\\$&')}"\\s*,\\s*destination:\\s*"${destination.replace(/[/?=]/g, '\\$&')}"\\s*,\\s*permanent:\\s*true`,
  );
  return re.test(cfg());
}

// ══ M16-1 — /settings EXISTS AND REUSES THE ESTABLISHED SHELL ═══════════════

describe('M16-1: /settings exists and reuses the Console shell', () => {
  test('the route and its layout exist', () => {
    assert.ok(exists('app/settings/page.tsx'));
    assert.ok(exists('app/settings/layout.tsx'));
  });

  test('the shell is /home`s, /capture`s, /diagnosis`s and /record`s, imported rather than reinvented', () => {
    const layout = code('app/settings/layout.tsx');
    assert.match(layout, /AuthGuard/, 'settings is not behind the auth guard');
    assert.match(layout, /VitalityShell/, 'settings invented its own token host');
    assert.match(layout, /console\/console\.css/, 'settings invented its own stylesheet');
    assert.match(layout, /robots:\s*\{\s*index:\s*false/, 'a private profile editor is indexable');
  });

  test('the page composes the four absorbed surfaces, not a stub', () => {
    const page = code('app/settings/page.tsx');
    assert.match(page, /ProfileIdentityCard/);
    assert.match(page, /StudyProfileCard/);
    assert.match(page, /AppearanceFields/);
    assert.match(page, /ExamSchedule/);
    assert.match(page, /SharePanel/);
    assert.match(page, /PushOptIn/);
  });

  test('the extracted field components exist and are non-trivial', () => {
    for (const rel of [
      'components/settings/profile-fields.tsx',
      'components/settings/appearance-fields.tsx',
    ]) {
      assert.ok(exists(rel), `${rel} is missing`);
      assert.ok(read(rel).length > 1000, `${rel} was reduced to a stub`);
    }
  });

  test('/settings is a protected route — it renders the same student data /dashboard/profile and /tools/personalise did', () => {
    const routes = code('lib/auth-routes.ts');
    assert.match(routes, /"\/settings"/, '/settings is not in PROTECTED_PREFIXES');
    // And it must not also be public.
    const publicBlock = routes.slice(routes.indexOf('PUBLIC_ROUTES'), routes.indexOf('SIGN_IN_PATH'));
    assert.doesNotMatch(publicBlock, /"\/settings"/, '/settings is listed as both protected and public');
  });
});

describe('M16-1: /dashboard/profile and /tools/personalise are absorbed', () => {
  test('both redirect, permanently, to /settings', () => {
    assert.ok(redirectsTo('/dashboard/profile', '/settings'), '/dashboard/profile does not permanently redirect to /settings');
    assert.ok(redirectsTo('/tools/personalise', '/settings'), '/tools/personalise does not permanently redirect to /settings');
  });

  test('the redirects are exact-path — no wildcard swallows a route M16 does not merge', () => {
    const c = cfg();
    assert.doesNotMatch(c, /source:\s*"\/dashboard\/:/, 'a wildcard redirect was added under /dashboard');
    // The other /dashboard and /tools children M3/M8/M13 deliberately kept
    // resolving must still be untouched by this milestone's block.
    for (const kept of ['/dashboard/saved']) {
      assert.doesNotMatch(
        c, new RegExp(`M16[^]*?source:\\s*"${kept.replace('/', '\\/')}"`),
        `${kept} was redirected by M16, which does not merge it`,
      );
    }
  });

  test('neither source page file was gutted — M8`s precedent, not M3`s stub', () => {
    for (const rel of ['app/dashboard/profile/page.tsx', 'app/tools/personalise/page.tsx']) {
      assert.ok(exists(rel), `${rel} was deleted; §2.3 keeps the repository whole`);
      assert.ok(read(rel).length > 500, `${rel} was reduced to a stub`);
    }
  });

  test('live navigation no longer points at the retired routes', () => {
    // The command palette and the app nav account chip are the surfaces that
    // linked to the old profile route. `/home` was retired (2026-08-22) and
    // no longer exists to check.
    for (const rel of ['components/app-nav.tsx', 'components/command-palette.tsx']) {
      const src = code(rel);
      assert.doesNotMatch(src, /"\/dashboard\/profile"/, `${rel} still links to the retired /dashboard/profile`);
      assert.doesNotMatch(src, /"\/tools\/personalise"/, `${rel} still links to the retired /tools/personalise`);
    }
  });
});

// ══ M16-2 — /legal EXISTS, ONE ROUTE FOUR SECTIONS ══════════════════════════

describe('M16-2: /legal exists as one route with four sections', () => {
  test('the route, its layout and the shared section content exist', () => {
    assert.ok(exists('app/legal/page.tsx'));
    assert.ok(exists('app/legal/layout.tsx'));
    assert.ok(exists('components/legal/sections.tsx'));
  });

  test('/legal stays PUBLIC — it must answer a signed-out reader, unlike the Console workspaces', () => {
    const routes = code('lib/auth-routes.ts');
    const publicBlock = routes.slice(routes.indexOf('PUBLIC_ROUTES'), routes.indexOf('SIGN_IN_PATH'));
    assert.match(publicBlock, /"\/legal"/, '/legal is not in PUBLIC_ROUTES');
    const layout = code('app/legal/layout.tsx');
    assert.doesNotMatch(layout, /AuthGuard/, '/legal was put behind the auth guard; it must answer signed-out readers');
  });

  test('the page renders all four sections, and none has lost content', () => {
    const page = code('app/legal/page.tsx');
    for (const name of ['PrivacySection', 'TermsSection', 'DataSection', 'IPSection']) {
      assert.match(page, new RegExp(name), `/legal does not render ${name}`);
    }
    const sections = read('components/legal/sections.tsx');
    // Each of the four source pages had this many `Section` headings; the
    // merge must carry every one, not a trimmed subset.
    const counts = {
      PrivacySection: 10,
      TermsSection: 11,
      DataSection: 7,
      IPSection: 8,
    };
    for (const [fn, min] of Object.entries(counts)) {
      const body = sections.slice(
        sections.indexOf(`export function ${fn}`),
        sections.indexOf('export function', sections.indexOf(`export function ${fn}`) + 1) === -1
          ? sections.length
          : sections.indexOf('export function', sections.indexOf(`export function ${fn}`) + 1),
      );
      const n = (body.match(/<Section title=/g) ?? []).length;
      assert.ok(n >= min, `${fn} carries ${n} sections, expected at least ${min}`);
    }
  });

  test('the section switch is read from ?section= on mount, the pattern /capture, /diagnosis and /record already use', () => {
    const page = code('app/legal/page.tsx');
    assert.match(page, /URLSearchParams\(window\.location\.search\)/);
    assert.match(page, /params\.get\("section"\)/);
  });
});

describe('M16-2: the four legal routes are absorbed', () => {
  const FOUR = {
    '/legal/privacy': '/legal?section=privacy',
    '/legal/terms':   '/legal?section=terms',
    '/legal/data':    '/legal?section=data',
    '/legal/ip':      '/legal?section=ip',
  };

  test('all four redirect, permanently, into the matching section', () => {
    for (const [source, destination] of Object.entries(FOUR)) {
      assert.ok(redirectsTo(source, destination), `${source} does not permanently redirect to ${destination}`);
    }
  });

  test('none of the four source page files was gutted', () => {
    for (const rel of ['app/legal/privacy/page.tsx', 'app/legal/terms/page.tsx', 'app/legal/data/page.tsx', 'app/legal/ip/page.tsx']) {
      assert.ok(exists(rel), `${rel} was deleted; §2.3 keeps the repository whole`);
      assert.ok(read(rel).length > 500, `${rel} was reduced to a stub`);
    }
  });

  test('no word of any policy changed — the merged prose is a copy of the source pages, not a rewrite', () => {
    const sections = read('components/legal/sections.tsx');
    // A handful of exact, distinctive sentences from each of the four source
    // pages, asserted verbatim in the merged module.
    const mustContain = [
      'Ledger is designed for students aged 14–18.',                 // privacy
      'You must be at least 13 years old to use Ledger.',            // terms
      'the Digital Personal Data Protection Act, 2023 (India)',      // data
      'Ledger Study Co. and protected under the Copyright Act, 1957', // ip
    ];
    for (const s of mustContain) {
      assert.ok(sections.includes(s), `merged legal copy is missing a sentence from a source page: "${s}"`);
    }
  });

  test('live links to the retired /legal/* routes were updated to the merged page', () => {
    for (const rel of ['app/page.tsx', 'app/pricing/page.tsx', 'app/faq/page.tsx']) {
      const src = code(rel);
      assert.doesNotMatch(src, /href="\/legal\/(privacy|terms|data|ip)"/, `${rel} still links to a retired /legal/* route`);
    }
  });
});

// ══ NOTHING 404s — every route named above is reachable one way or another ══

describe('M16 done-when: nothing 404s', () => {
  test('every merged source route still resolves as a file, and every destination route exists', () => {
    const routes = [
      'app/dashboard/profile/page.tsx', 'app/tools/personalise/page.tsx', 'app/settings/page.tsx',
      'app/legal/privacy/page.tsx', 'app/legal/terms/page.tsx', 'app/legal/data/page.tsx', 'app/legal/ip/page.tsx', 'app/legal/page.tsx',
    ];
    for (const rel of routes) assert.ok(exists(rel), `${rel} does not resolve`);
  });
});
