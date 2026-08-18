// M2 — the tool registry and its capability manifest (lib/tools-registry.ts).
//
// The registry is the one file that decides what the product looks like
// (PRODUCT_DECISIONS §1.4), so its two load-bearing guarantees are asserted
// directly rather than inferred:
//
//   1. All 46 tools survive, every one is classified, and every route still
//      exists on disk — §2.3's "all 46 routes resolve" is a filesystem fact.
//   2. `integration_level` is DERIVED, never declared (architecture P.3). The
//      derivation is exercised against synthetic manifests at every level, so
//      the rule is proven to work rather than trivially satisfied by today's
//      all-standalone reality.
//
//   node --test tests/
//   node --test tests/tools-registry.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-registry');

let R;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.registry.json'],
    { cwd: root },
  );
});

test('setup imports', async () => {
  R = await import(pathToFileURL(path.join(outDir, 'tools-registry.js')).href);
  assert.ok(Array.isArray(R.TOOLS_REGISTRY));
});

// ══ THE REGISTER SURVIVES ═══════════════════════════════════════════════════

describe('the register', () => {
  test('carries exactly 46 tools', () => {
    assert.equal(R.TOOLS_REGISTRY.length, 46);
    assert.equal(R.RESOLVED_TOOLS.length, 46);
  });

  test('slugs are unique', () => {
    const slugs = R.TOOLS_REGISTRY.map(t => t.slug);
    assert.equal(new Set(slugs).size, 46);
  });

  test('every entry keeps its navigation fields', () => {
    for (const t of R.TOOLS_REGISTRY) {
      for (const f of ['slug', 'title', 'subtitle', 'cat', 'tier', 'blurb']) {
        assert.equal(typeof t[f], 'string', `${t.slug} is missing ${f}`);
        assert.ok(t[f].length > 0, `${t.slug} has an empty ${f}`);
      }
      assert.ok(['PLAN', 'LEARN', 'WRITE', 'PRACTISE', 'FUTURE', 'TRACK'].includes(t.cat));
    }
  });

  test('all 46 are classified into the four ratified classes', () => {
    const classes = ['core', 'supporting', 'experimental', 'legacy'];
    for (const t of R.TOOLS_REGISTRY) {
      assert.ok(classes.includes(t.status), `${t.slug} has status ${t.status}`);
    }
  });

  test('the class counts match PRODUCT_DECISIONS §1.5', () => {
    const n = s => R.TOOLS_REGISTRY.filter(t => t.status === s).length;
    assert.equal(n('core'), 13);
    assert.equal(n('supporting'), 12);
    assert.equal(n('experimental'), 21);
    assert.equal(n('legacy'), 0);
  });

  test('§1.5 names every CORE tool exactly', () => {
    const expected = [
      'post-exam', 'paper-autopsy', 'marks-forensics', 'marks-obituary', 'paper-trauma',
      'paper-pattern', 'calibration', 'syllabus', 'grade-tracker', 'exam-planner',
      'silent-topics', 'practice', 'exam-practice',
    ].sort();
    assert.deepEqual(R.CORE_TOOLS.map(t => t.slug).sort(), expected);
  });
});

// ══ THE DELETION GATE (§1.4, §2.3) ══════════════════════════════════════════

describe('the deletion gate', () => {
  test('every registry slug has a page on disk', () => {
    for (const t of R.TOOLS_REGISTRY) {
      const page = path.join(root, 'app', 'tools', t.slug, 'page.tsx');
      assert.ok(fs.existsSync(page), `${t.slug} has no page.tsx — a route was deleted`);
    }
  });

  test('every page on disk is in the registry — no orphan routes', () => {
    const dir = path.join(root, 'app', 'tools');
    const onDisk = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
    assert.deepEqual(onDisk, R.TOOLS_REGISTRY.map(t => t.slug).sort());
  });

  test('non-core tools are unlinked, not removed from the register', () => {
    // The whole mechanism: navigation shrinks, the repository does not.
    assert.ok(R.NAV_TOOLS.length < R.RESOLVED_TOOLS.length);
    for (const t of R.RESOLVED_TOOLS) {
      assert.ok(R.toolBySlug(t.slug), `${t.slug} is unreachable through the registry`);
    }
  });

  test('navigation renders core only while SHOW_SUPPORTING is off', () => {
    assert.equal(R.SHOW_SUPPORTING, false);
    assert.deepEqual(R.NAV_TOOLS.map(t => t.slug).sort(), R.CORE_TOOLS.map(t => t.slug).sort());
  });
});

// ══ DERIVED, NEVER DECLARED (P.3) ═══════════════════════════════════════════

const BASE = {
  subjects: 'any', emits_events: [], emits_concepts: 'none', concept_resolution: 'none',
  joins_sessions: false, can_grade: 'none', emits_mistakes: false,
  consumes_personalisation: [], reports_results: false, writes_keys: [], ai_capabilities: [],
};

describe('integration level is derived from the manifest', () => {
  test('no entry declares a level', () => {
    for (const t of R.TOOLS_REGISTRY) {
      assert.equal(t.integration_level, undefined, `${t.slug} declares a level`);
      assert.equal(t.persistence, undefined, `${t.slug} declares a persistence`);
    }
  });

  test('Level 0 — a manifest that promises nothing', () => {
    assert.equal(R.deriveIntegrationLevel({ ...BASE }), 0);
  });

  test('Level 1 — a viewing event carrying a concept reference', () => {
    const m = { ...BASE, emits_events: ['CONCEPT_VIEWED'], concept_resolution: 'taxonomy' };
    assert.equal(R.deriveIntegrationLevel(m), 1);
    // Without the concept reference it is not observed at all.
    assert.equal(R.deriveIntegrationLevel({ ...m, concept_resolution: 'none' }), 0);
  });

  test('Level 2 — session participation with tagged concepts', () => {
    const m = {
      ...BASE, emits_events: ['CONCEPT_VIEWED'], concept_resolution: 'taxonomy',
      joins_sessions: true, emits_concepts: 'tagged',
    };
    assert.equal(R.deriveIntegrationLevel(m), 2);
    assert.equal(R.deriveIntegrationLevel({ ...m, joins_sessions: false }), 1);
  });

  test('Level 3 — deterministic grading only (P.3.a)', () => {
    const m = {
      ...BASE, emits_events: ['CONCEPT_VIEWED', 'QUESTION_CORRECT'], concept_resolution: 'taxonomy',
      joins_sessions: true, emits_concepts: 'tagged', can_grade: 'deterministic', emits_mistakes: true,
    };
    assert.equal(R.deriveIntegrationLevel(m), 3);
    // Asking a model "was that right?" cannot reach Level 3, however confident.
    assert.equal(R.deriveIntegrationLevel({ ...m, can_grade: 'rubric_ai_proposed' }), 2);
    assert.equal(R.deriveIntegrationLevel({ ...m, emits_mistakes: false }), 2);
  });

  test('Level 4 — personalisation consumed and results reported', () => {
    const m = {
      ...BASE, emits_events: ['CONCEPT_VIEWED', 'QUESTION_CORRECT'], concept_resolution: 'taxonomy',
      joins_sessions: true, emits_concepts: 'tagged', can_grade: 'deterministic', emits_mistakes: true,
      consumes_personalisation: ['board'], reports_results: true,
    };
    assert.equal(R.deriveIntegrationLevel(m), 4);
    assert.equal(R.deriveIntegrationLevel({ ...m, reports_results: false }), 3);
  });

  test('no tool touches the score today — the event layer is M7', () => {
    // Not a placeholder: P.4's measured truth. When a tool is wired in M7+ its
    // level rises here without anyone editing a number.
    for (const t of R.RESOLVED_TOOLS) {
      assert.equal(t.integration_level, 0, `${t.slug} claims level ${t.integration_level}`);
      assert.deepEqual(t.emits_events, [], `${t.slug} claims to emit events`);
    }
  });
});

describe('persistence is derived from measured writes', () => {
  test('a tool that writes nothing leaves no trace', () => {
    assert.equal(R.derivePersistence({ ...BASE }), 'none');
  });

  test('a tool that writes a non-score key produces a saved output', () => {
    assert.equal(R.derivePersistence({ ...BASE, writes_keys: ['forensics_sessions'] }), 'saved_output');
  });

  test('a tool that writes a score input touches the academic record', () => {
    assert.equal(R.derivePersistence({ ...BASE, writes_keys: ['ledger-mistakes'] }), 'academic_record');
  });

  test('the five tools P.4 names are the five that reach the record', () => {
    const record = R.RESOLVED_TOOLS.filter(t => t.persistence === 'academic_record').map(t => t.slug).sort();
    assert.deepEqual(record, ['exam-practice', 'focus-lab', 'learn-lab', 'syllabus'].sort());
  });
});

// ══ MIRRORED CONSTANTS ══════════════════════════════════════════════════════

describe('mirrored key lists do not drift from their sources', () => {
  test('SYNCED_KEYS matches lib/sync.ts SYNC_KEYS', () => {
    const src = fs.readFileSync(path.join(root, 'lib', 'sync.ts'), 'utf8');
    const body = src.slice(src.indexOf('export const SYNC_KEYS'), src.indexOf('] as const;'));
    const keys = [...body.matchAll(/"([a-z0-9-]+)"/g)].map(m => m[1]);
    assert.deepEqual([...R.SYNCED_KEYS].sort(), keys.sort());
  });

  test('SCORE_INPUT_KEYS matches the keys readScoreInputs() reads', () => {
    const src = fs.readFileSync(path.join(root, 'lib', 'ledger-score.ts'), 'utf8');
    const start = src.indexOf('export function readScoreInputs');
    const body = src.slice(start, src.indexOf('export function computeLedgerScore'));
    const keys = [...body.matchAll(/"(ledger-[a-z-]+)"/g)].map(m => m[1]);
    assert.deepEqual([...R.SCORE_INPUT_KEYS].sort(), [...new Set(keys)].sort());
  });
});

// ══ THE DUPLICATE CATALOGUE IS GONE (M2-2) ══════════════════════════════════

describe('one list of tools exists in the repository', () => {
  // AMENDED 2026-08-14 (M3-3). M2-2 deleted the dashboard's hand-maintained
  // catalogue and left the dashboard reading NAV_CATEGORIES, which this test
  // asserted directly. M3-3 then retired `/dashboard` as a product surface
  // altogether — it is now a permanent redirect to `/home` and reads no
  // registry at all, because it renders nothing.
  //
  // The M2 guarantee is unchanged and is what is asserted below: exactly one
  // list of tools exists in the repository, and the surfaces that render tools
  // read it rather than restating it. Only the surface moved.
  test('no product surface declares its own catalogue', () => {
    const suspects = ['app/dashboard/page.tsx', 'app/home/page.tsx',
                      'components/app-nav.tsx', 'components/command-palette.tsx'];
    for (const rel of suspects) {
      const src = fs.readFileSync(path.join(root, rel), 'utf8');
      assert.ok(!/const TOOL_CATEGORIES: DashCat\[\] = \[\s*\{\s*label:/.test(src),
        `${rel}: the hand-maintained TOOL_CATEGORIES literal is back`);
    }
  });

  test('the navigation surfaces still read the registry', () => {
    for (const rel of ['components/app-nav.tsx', 'components/command-palette.tsx']) {
      const src = fs.readFileSync(path.join(root, rel), 'utf8');
      assert.ok(/from ['"]@\/lib\/tools-registry['"]/.test(src),
        `${rel} no longer reads the registry`);
    }
  });

  test('/dashboard/saved and /console/ai are unlinked but still routable (§2.5)', () => {
    for (const route of [['dashboard', 'saved'], ['console', 'ai']]) {
      assert.ok(fs.existsSync(path.join(root, 'app', ...route, 'page.tsx')),
        `/${route.join('/')} was deleted; §2.5 says unlinked, not deleted`);
    }
    const linked = ['app/dashboard/page.tsx', 'components/app-nav.tsx', 'components/command-palette.tsx']
      .map(f => fs.readFileSync(path.join(root, f), 'utf8'))
      .filter(src => /href=["']\/(?:dashboard\/saved|console\/ai)["']/.test(src));
    assert.equal(linked.length, 0, 'a navigation surface still links an unlinked route');
  });
});
