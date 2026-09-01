// M6 — the concept model.
//
// Three kinds of assertion live here, and the difference matters:
//
//   1. BEHAVIOURAL, against the real compiled `lib/concept-resolution.ts`.
//      M6-3's done-when ("an unmatched declaration resolves to concept_id =
//      NULL with text preserved; the system does not guess") and M6-2's
//      ("concept merges are representable without rewriting history") are pure
//      functions of (text, candidate set), so both are PROVABLE with no
//      database in reach — including the tier ORDER, which is the part a code
//      reading cannot establish.
//
//   2. AGAINST THE REAL SEEDED TREE, because M6-1's done-when is that the tree
//      is a shipped path. Resolving all 316 real concepts is the test that the
//      taxonomy and the resolver actually agree.
//
//   3. STRUCTURAL, over source and SQL, for the claims that are about shape
//      rather than the value of an expression: that `lib/concepts.ts` imports
//      the taxonomy (T12), that it never writes, that 013 is additive and
//      SELECT-only, and that 014 registers itself in the M1 ledger with a
//      checksum that matches its own body. Same convention as
//      tests/student-context.test.mjs and tests/auth-middleware.test.mjs.
//
//   node --test tests/concepts.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { checksumOf, REGISTRATION_SENTINEL } from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-concepts');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

// Comments name what was removed and why. Only real code counts.
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

let R;     // lib/concept-resolution.ts
let B;     // lib/taxonomy/build.ts
let DATA;  // lib/taxonomy/cbse-physics.ts
let tree;  // the real seeded tree
let realIndex;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.concepts.json'],
    { cwd: root, stdio: 'inherit' },
  );
});

before(async () => {
  R = await import(pathToFileURL(path.join(outDir, 'concept-resolution.js')).href);
  B = await import(pathToFileURL(path.join(outDir, 'taxonomy', 'build.js')).href);
  DATA = await import(pathToFileURL(path.join(outDir, 'taxonomy', 'cbse-physics.js')).href);
  tree = B.buildTaxonomy(DATA.CBSE_PHYSICS);
  realIndex = R.buildResolutionIndex(tree.map(c => ({
    id: c.id, name: c.name, subject: c.subject, chapter: c.chapter,
    topic: c.topic, boardCodes: c.boardCodes, mergedInto: null,
  })));
});

// A tiny synthetic taxonomy. Fixtures rather than the real tree wherever the
// point is the ORDER of the tiers: the real tree cannot be made to contain a
// deliberate exact/alias collision without editing a curated asset.
const C = (id, name, mergedInto = null, boardCodes = []) => ({ id, name, mergedInto, boardCodes });

const ID = {
  torque:   '11111111-1111-5111-8111-111111111111',
  inertia:  '22222222-2222-5222-8222-222222222222',
  momentum: '33333333-3333-5333-8333-333333333333',
  typo:     '44444444-4444-5444-8444-444444444444',
  a:        'aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa',
  b:        'bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb',
  c:        'cccccccc-cccc-5ccc-8ccc-cccccccccccc',
  d:        'dddddddd-dddd-5ddd-8ddd-dddddddddddd',
};

// ═══════════════════════════════════════════════════════════════════════════
// 1 · NORMALISATION
// ═══════════════════════════════════════════════════════════════════════════
describe('normalisation — the one function every tier shares', () => {
  test('case, punctuation and spacing are noise', () => {
    assert.equal(R.normaliseConceptText('  Sign Convention, for TORQUE!  '), 'sign convention for torque');
  });

  test("an apostrophe vanishes rather than splitting a word", () => {
    assert.equal(R.normaliseConceptText('Newton’s Laws'), 'newtons laws');
    assert.equal(R.normaliseConceptText("Newton's Laws"), 'newtons laws');
    assert.equal(R.normaliseConceptText('Newtons Laws'), 'newtons laws');
  });

  test('accents fold', () => {
    assert.equal(R.normaliseConceptText('Ampère’s Law'), 'amperes law');
  });

  test('& becomes "and", so both spellings meet', () => {
    assert.equal(R.normaliseConceptText('Work & Energy'), R.normaliseConceptText('Work and Energy'));
  });

  test('it is NOT the identity slug — comparison and identity are separate', () => {
    // build.ts's slug() builds concept ids and must stay byte-stable forever.
    // If these ever became the same function, tuning a comparison would
    // re-issue every concept id in the record.
    assert.notEqual(R.normaliseConceptText('Newton’s Laws'), B.slug('Newton’s Laws'));
  });

  test('a hostile value never throws', () => {
    for (const v of [null, undefined, 42, {}, [], NaN]) {
      assert.equal(R.normaliseConceptText(v), '');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE TIER ORDER — M6-3's "exact → alias → semantic"
//
// Each test is built so that a WRONG order produces a DIFFERENT concept id, not
// merely a different label. That is what makes the order provable rather than
// asserted.
// ═══════════════════════════════════════════════════════════════════════════
describe('resolution order: exact beats alias beats semantic', () => {
  test('EXACT beats ALIAS — a name outranks somebody else\'s alias for it', () => {
    const index = R.buildResolutionIndex(
      [C(ID.torque, 'Torque'), C(ID.inertia, 'Rotational Inertia')],
      // A curator once aliased "Torque" onto Rotational Inertia. The exact tier
      // must still win, or a curation slip silently re-points every mention.
      [{ conceptId: ID.inertia, alias: 'Torque' }],
    );
    const r = R.resolveConceptText('Torque', index);
    assert.equal(r.status, 'resolved');
    assert.equal(r.conceptId, ID.torque);
    assert.equal(r.matchedVia, 'exact');
  });

  test('ALIAS beats SEMANTIC — a curated form outranks a lexical near-miss', () => {
    const index = R.buildResolutionIndex(
      [C(ID.torque, 'Torque'), C(ID.typo, 'Angular Momentom')],
      [{ conceptId: ID.torque, alias: 'Angular Momentum' }],
    );
    const r = R.resolveConceptText('Angular Momentum', index);
    assert.equal(r.status, 'resolved');
    assert.equal(r.matchedVia, 'alias');
    assert.equal(r.conceptId, ID.torque, 'the typo candidate would have won on lexical score alone');
  });

  test('SEMANTIC answers only when the two tiers above found nothing', () => {
    const index = R.buildResolutionIndex([C(ID.torque, 'Torque')]);
    const r = R.resolveConceptText('Torqe', index);
    assert.equal(r.status, 'resolved');
    assert.equal(r.matchedVia, 'semantic');
    assert.equal(r.conceptId, ID.torque);
    assert.ok(r.score >= R.SEMANTIC_THRESHOLD);
    assert.ok(r.score < 1, 'a semantic hit is never a perfect score');
  });

  test('word order is noise to the semantic tier', () => {
    const index = R.buildResolutionIndex([C(ID.torque, 'Sign convention for torque')]);
    const r = R.resolveConceptText('torque sign convention', index);
    assert.equal(r.status, 'resolved');
    assert.equal(r.matchedVia, 'semantic');
    assert.equal(r.conceptId, ID.torque);
  });

  test('a board code resolves as an exact match on the identifier', () => {
    const index = R.buildResolutionIndex([C(ID.torque, 'Torque', null, ['CBSE-PHY-11-C06-T02-K01'])]);
    const r = R.resolveConceptText('cbse-phy-11-c06-t02-k01', index);
    assert.equal(r.status, 'resolved');
    assert.equal(r.matchedVia, 'exact');
    assert.equal(r.conceptId, ID.torque);
  });

  test('an exact hit never degrades to semantic even when a closer typo exists', () => {
    // "Torque" is exactly a concept, and also one edit from "Torquee".
    const index = R.buildResolutionIndex([C(ID.torque, 'Torque'), C(ID.typo, 'Torquee')]);
    const r = R.resolveConceptText('Torque', index);
    assert.equal(r.matchedVia, 'exact');
    assert.equal(r.conceptId, ID.torque);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE LEGAL UNRESOLVED STATE — M6-3's done-when, and V.2.4
// ═══════════════════════════════════════════════════════════════════════════
describe('the unresolved state is legal, not an error', () => {
  test('V.2.4 — "the thing about wobbling tops" resolves to NULL against the real tree', () => {
    const said = 'and the thing about wobbling tops';
    const r = R.resolveConceptText(said, realIndex);
    assert.equal(r.status, 'unresolved');
    assert.equal(r.conceptId, null, 'the system must not invent a match to avoid a null');
    assert.equal(r.declaredText, said, 'the student\'s words survive verbatim');
  });

  test('the declared text is preserved BYTE-FOR-BYTE, not trimmed or cased', () => {
    const said = '   The Thing About WOBBLING tops!!!   ';
    const r = R.resolveConceptText(said, realIndex);
    assert.equal(r.status, 'unresolved');
    assert.equal(r.declaredText, said);
  });

  test('a resolved result preserves the text too — the record keeps both', () => {
    const said = '  sign convention for TORQUE ';
    const r = R.resolveConceptText(said, realIndex);
    assert.equal(r.status, 'resolved');
    assert.equal(r.declaredText, said);
  });

  test('nothing said is unresolved, with a reason, not a match', () => {
    for (const blank of ['', '   ', '\n\t', '!!!', '—']) {
      const r = R.resolveConceptText(blank, realIndex);
      assert.equal(r.status, 'unresolved', JSON.stringify(blank));
      assert.equal(r.conceptId, null);
      assert.equal(r.declaredText, blank);
    }
  });

  test('an empty taxonomy resolves nothing, and says why', () => {
    const r = R.resolveConceptText('Torque', R.buildResolutionIndex([]));
    assert.equal(r.status, 'unresolved');
    assert.equal(r.reason, 'no_candidates');
    assert.equal(r.declaredText, 'Torque');
  });

  test('a near-miss below the threshold is refused, and reports how close it came', () => {
    const index = R.buildResolutionIndex([C(ID.torque, 'Torque')]);
    const r = R.resolveConceptText('quantum chromodynamics', index);
    assert.equal(r.status, 'unresolved');
    assert.equal(r.reason, 'below_threshold');
    assert.ok(r.bestScore < R.SEMANTIC_THRESHOLD);
  });

  test('AMBIGUITY IS REFUSED — two equal candidates produce no pick', () => {
    const index = R.buildResolutionIndex([C(ID.a, 'Torque'), C(ID.b, 'Torque')]);
    const r = R.resolveConceptText('Torque', index);
    assert.equal(r.status, 'unresolved');
    assert.equal(r.reason, 'ambiguous');
    assert.deepEqual([...r.candidateIds].sort(), [ID.a, ID.b].sort());
  });

  test('an ambiguous EXACT hit does not fall through to a weaker tier', () => {
    // If it fell through, the alias would resolve it — which is a weaker tier
    // answering a question a stronger tier already found genuinely ambiguous.
    const index = R.buildResolutionIndex(
      [C(ID.a, 'Torque'), C(ID.b, 'Torque'), C(ID.c, 'Moment')],
      [{ conceptId: ID.c, alias: 'Torque' }],
    );
    const r = R.resolveConceptText('Torque', index);
    assert.equal(r.status, 'unresolved');
    assert.equal(r.reason, 'ambiguous');
  });

  test('a near-tie in the semantic tier is an ambiguity, not a coin flip', () => {
    const index = R.buildResolutionIndex([C(ID.a, 'Torquea'), C(ID.b, 'Torqueb')]);
    const r = R.resolveConceptText('Torquex', index);
    assert.equal(r.status, 'unresolved');
    assert.equal(r.reason, 'ambiguous');
  });

  test('resolution NEVER throws, whatever it is handed', () => {
    const hostile = ['', ' ', null, undefined, 0, {}, [], NaN, ' ', 'x'.repeat(5000), '💥🙃', '<script>'];
    for (const v of hostile) {
      const r = R.resolveConceptText(v, realIndex);
      assert.ok(r.status === 'resolved' || r.status === 'unresolved', JSON.stringify(String(v)).slice(0, 40));
      if (r.status === 'unresolved') assert.equal(r.conceptId, null);
    }
  });

  test('a non-string declaration is preserved as the empty string, never coerced into a match', () => {
    const r = R.resolveConceptText(undefined, realIndex);
    assert.equal(r.status, 'unresolved');
    assert.equal(r.conceptId, null);
    assert.equal(r.declaredText, '');
  });

  test('one unresolved declaration never suppresses a resolved one', () => {
    const results = R.resolveConceptTexts(
      ['Sign convention for torque', 'the thing about wobbling tops', 'Half life and mean life'],
      realIndex,
    );
    assert.equal(results.length, 3);
    assert.equal(results[0].status, 'resolved');
    assert.equal(results[1].status, 'unresolved');
    assert.equal(results[2].status, 'resolved');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 · MERGES — M6-2's done-when: "representable without rewriting history"
// ═══════════════════════════════════════════════════════════════════════════
describe('merge chains resolve forward; history is never rewritten', () => {
  const mergeMap = m => new Map(Object.entries(m));

  test('a single hop — A merged into B resolves to B', () => {
    const r = R.resolveMergeChain(ID.a, mergeMap({ [ID.a]: ID.b, [ID.b]: null }));
    assert.equal(r.status, 'ok');
    assert.equal(r.conceptId, ID.b);
    assert.equal(r.hops, 1);
  });

  test('MULTI-HOP — A → B → C resolves to C, not to B', () => {
    const r = R.resolveMergeChain(ID.a, mergeMap({ [ID.a]: ID.b, [ID.b]: ID.c, [ID.c]: null }));
    assert.equal(r.status, 'ok');
    assert.equal(r.conceptId, ID.c, 'stopping at B would leave a superseded id in the record');
    assert.equal(r.hops, 2);
  });

  test('a live concept is its own terminus, at zero hops', () => {
    const r = R.resolveMergeChain(ID.c, mergeMap({ [ID.c]: null }));
    assert.equal(r.status, 'ok');
    assert.equal(r.conceptId, ID.c);
    assert.equal(r.hops, 0);
  });

  test('a loop is REFUSED, never followed', () => {
    const r = R.resolveMergeChain(ID.a, mergeMap({ [ID.a]: ID.b, [ID.b]: ID.a }));
    assert.equal(r.status, 'cycle');
    assert.equal(r.conceptId, null);
  });

  test('a long chain past the hop cap is refused rather than walked forever', () => {
    const chain = {};
    const ids = Array.from({ length: 40 }, (_, i) => `0000${String(i).padStart(4, '0')}-0000-5000-8000-000000000000`);
    ids.forEach((id, i) => { chain[id] = ids[i + 1] ?? null; });
    const r = R.resolveMergeChain(ids[0], mergeMap(chain));
    assert.equal(r.status, 'cycle');
  });

  test('a pointer at a concept nobody loaded is dangling, not a silent hit', () => {
    const r = R.resolveMergeChain(ID.a, mergeMap({ [ID.a]: ID.d }));
    assert.equal(r.status, 'dangling');
    assert.equal(r.conceptId, null);
  });

  test('THE HISTORY GUARANTEE — an old id still resolves after its concept merged', () => {
    // This is the whole of M6-2. An occurrence recorded against ID.a in 2026
    // was NEVER edited; the taxonomy changed underneath it, and the id it
    // stores still answers.
    const index = R.buildResolutionIndex([
      C(ID.a, 'Rotational Inertia', ID.b),
      C(ID.b, 'Moment of Inertia'),
    ]);
    const historic = R.resolveMergeChain(ID.a, index.mergeMap);
    assert.equal(historic.status, 'ok');
    assert.equal(historic.conceptId, ID.b);
  });

  test('resolving the SUPERSEDED name returns the replacement, and says what it matched', () => {
    const index = R.buildResolutionIndex([
      C(ID.a, 'Rotational Inertia', ID.b),
      C(ID.b, 'Moment of Inertia'),
    ]);
    const r = R.resolveConceptText('Rotational Inertia', index);
    assert.equal(r.status, 'resolved');
    assert.equal(r.matchedConceptId, ID.a, 'what the text matched');
    assert.equal(r.conceptId, ID.b, 'what the record should address');
    assert.equal(r.mergeHops, 1);
    assert.equal(r.matchedVia, 'exact');
  });

  test('a merge chain of three, reached through text', () => {
    const index = R.buildResolutionIndex([
      C(ID.a, 'Spin Laziness', ID.b),
      C(ID.b, 'Rotational Inertia', ID.c),
      C(ID.c, 'Moment of Inertia'),
    ]);
    const r = R.resolveConceptText('Spin Laziness', index);
    assert.equal(r.conceptId, ID.c);
    assert.equal(r.mergeHops, 2);
  });

  test('a text hit onto a cyclic merge is unresolved, not a superseded id', () => {
    const index = R.buildResolutionIndex([C(ID.a, 'Torque', ID.b), C(ID.b, 'Moment', ID.a)]);
    const r = R.resolveConceptText('Torque', index);
    assert.equal(r.status, 'unresolved');
    assert.equal(r.reason, 'merge_cycle');
    assert.equal(r.declaredText, 'Torque');
  });

  test('an alias on a merged concept follows the pointer too', () => {
    const index = R.buildResolutionIndex(
      [C(ID.a, 'Rotational Inertia', ID.b), C(ID.b, 'Moment of Inertia')],
      [{ conceptId: ID.a, alias: 'spin laziness' }],
    );
    const r = R.resolveConceptText('spin laziness', index);
    assert.equal(r.matchedVia, 'alias');
    assert.equal(r.conceptId, ID.b);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 · AGAINST THE REAL SEEDED TREE — M6-1's "the tests test a shipped path"
// ═══════════════════════════════════════════════════════════════════════════
describe('the real CBSE Physics tree resolves', () => {
  test('every one of the seeded concepts resolves to its own id by name', () => {
    let resolved = 0;
    for (const c of tree) {
      const r = R.resolveConceptText(c.name, realIndex);
      assert.equal(r.status, 'resolved', `${c.path} did not resolve`);
      assert.equal(r.conceptId, c.id, `${c.path} resolved to the wrong concept`);
      assert.equal(r.matchedVia, 'exact');
      resolved += 1;
    }
    assert.ok(resolved > 300, `only ${resolved} concepts resolved`);
  });

  test('every seeded board code resolves to its own concept', () => {
    for (const c of tree) {
      for (const bc of c.boardCodes) {
        const r = R.resolveConceptText(bc, realIndex);
        assert.equal(r.status, 'resolved', bc);
        assert.equal(r.conceptId, c.id, bc);
      }
    }
  });

  test('§4.2\'s worked example resolves through the shipped path', () => {
    const leaf = tree.find(c => c.name === 'Sign convention for torque');
    const r = R.resolveConceptText('sign convention for torque', realIndex);
    assert.equal(r.conceptId, leaf.id);
  });

  test('a typo against the real tree still lands on the right concept', () => {
    const leaf = tree.find(c => c.name === 'Half life and mean life');
    const r = R.resolveConceptText('Half life and mean lifes', realIndex);
    assert.equal(r.status, 'resolved');
    assert.equal(r.conceptId, leaf.id);
    assert.equal(r.matchedVia, 'semantic');
  });

  test('nothing in the real tree is reachable by two different names', () => {
    // A duplicate surface form would make every mention of it ambiguous. The
    // taxonomy is a curated asset, so this is checked, not assumed.
    const seen = new Map();
    for (const c of tree) {
      const n = R.normaliseConceptText(c.name);
      assert.ok(!seen.has(n), `"${c.name}" appears at both ${seen.get(n)} and ${c.path}`);
      seen.set(n, c.path);
    }
  });

  test('ordinary student phrasing that names nothing stays unresolved', () => {
    for (const said of ['i did some physics', 'revision', 'that hard chapter', 'homework']) {
      const r = R.resolveConceptText(said, realIndex);
      assert.equal(r.status, 'unresolved', `"${said}" should not have matched`);
      assert.equal(r.declaredText, said);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6 · lib/concepts.ts — M6-1's production importer
// ═══════════════════════════════════════════════════════════════════════════
describe('lib/concepts.ts is the production importer (T12)', () => {
  const src = code('lib/concepts.ts');

  test('it imports the previously dark taxonomy modules', () => {
    assert.match(src, /from "\.\/taxonomy\/build"/);
    assert.match(src, /from "\.\/taxonomy\/cbse-physics"/);
    assert.match(src, /buildTaxonomy/);
    assert.match(src, /CBSE_PHYSICS/);
  });

  test('it reads the concepts table — the model is not seed-only', () => {
    assert.match(src, /from\("concepts"\)/);
    assert.match(src, /from\("concept_aliases"\)/);
  });

  test('IT NEVER WRITES — the taxonomy is a curated company asset', () => {
    for (const forbidden of ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc(']) {
      assert.ok(!src.includes(forbidden), `lib/concepts.ts must not call ${forbidden}`);
    }
  });

  test('it reads as the caller, not as the service role', () => {
    assert.match(src, /createStudentServerClient/);
    assert.ok(!/\bsupabaseServer\b/.test(src), 'the service role sees every row; concepts does not need it');
  });

  test('it validates the tree before serving it', () => {
    assert.match(src, /validateTaxonomy/);
  });

  test('it owns no per-student state (B.4: "Must NOT own … Mastery")', () => {
    for (const forbidden of ['student_id', 'mastery', 'accuracy', 'auth.uid']) {
      assert.ok(!src.includes(forbidden), `lib/concepts.ts must not mention ${forbidden}`);
    }
  });

  test('TAXONOMY_VERSION in code equals the version the seed writes', () => {
    const inCode = /TAXONOMY_VERSION = (\d+)/.exec(src)[1];
    const inGenerator = /const TAXONOMY_VERSION = (\d+)/.exec(read('scripts/build-taxonomy-seed.mjs'))[1];
    assert.equal(inCode, inGenerator);
    assert.match(read('supabase/migrations/014_concepts_cbse_physics_seed.sql'), new RegExp(`taxonomy_version ${inCode}\\b`));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7 · MIGRATION 013 — additive, SELECT-only, and it does not edit 007
// ═══════════════════════════════════════════════════════════════════════════
describe('013_concept_identity.sql', () => {
  const sql = read('supabase/migrations/013_concept_identity.sql');

  test('merged_into is a nullable self-reference that RESTRICTs deletion', () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES concepts\(id\) ON DELETE RESTRICT/);
  });

  test('a concept cannot supersede itself', () => {
    assert.match(sql, /concepts_merge_not_self[\s\S]*CHECK \(merged_into IS NULL OR merged_into <> id\)/);
  });

  test('taxonomy_version defaults to 1 and can never be zero', () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS taxonomy_version INTEGER NOT NULL DEFAULT 1/);
    assert.match(sql, /CHECK \(taxonomy_version >= 1\)/);
  });

  test('it is ADDITIVE — no DROP, no destructive ALTER', () => {
    const body = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    assert.ok(!/DROP\s+COLUMN/i.test(body));
    assert.ok(!/DROP\s+TABLE/i.test(body));
    assert.ok(!/ALTER\s+TABLE\s+concepts[\s\S]{0,40}(DROP|RENAME)/i.test(body));
  });

  test('concept_aliases carries provenance and a curation gate', () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS concept_aliases/);
    assert.match(sql, /source\s+TEXT NOT NULL DEFAULT 'curated'/);
    assert.match(sql, /admitted_at TIMESTAMPTZ/);
    assert.match(sql, /'ai_proposed'/);
  });

  test('an admitted surface form is unique across the whole taxonomy', () => {
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS concept_aliases_normalised_unique[\s\S]*WHERE admitted_at IS NOT NULL/);
  });

  test('RLS is SELECT-only, and only over admitted rows', () => {
    assert.match(sql, /ALTER TABLE concept_aliases ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /FOR SELECT TO authenticated USING \(admitted_at IS NOT NULL\)/);
    const policies = sql.match(/CREATE POLICY[\s\S]*?;/g) ?? [];
    for (const p of policies) {
      assert.ok(/FOR SELECT/.test(p), `non-SELECT policy on the taxonomy: ${p.slice(0, 80)}`);
    }
  });

  test('it registers itself in the M1 ledger with its own checksum', () => {
    assert.ok(sql.includes(REGISTRATION_SENTINEL));
    assert.match(sql, /record_migration\(\s*'013'/);
    const declared = /'([0-9a-f]{64})'/.exec(sql.slice(sql.indexOf(REGISTRATION_SENTINEL)))[1];
    assert.equal(declared, checksumOf(sql), 'the registered checksum must match the migration body');
  });

  test('007 is untouched — a shipped migration is extended, never revised', () => {
    const seven = read('supabase/migrations/007_mistakes.sql');
    assert.ok(!seven.includes('merged_into'));
    assert.ok(!seven.includes('taxonomy_version'));
    assert.ok(!seven.includes('concept_aliases'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8 · MIGRATION 014 — the seed, as a migration the ledger can see
// ═══════════════════════════════════════════════════════════════════════════
describe('014_concepts_cbse_physics_seed.sql', () => {
  const sql = read('supabase/migrations/014_concepts_cbse_physics_seed.sql');

  test('it seeds every row the compiled tree produces', () => {
    for (const c of tree) assert.ok(sql.includes(`'${c.id}'::uuid`), `${c.path} is missing from the seed`);
  });

  test('it writes taxonomy_version, so 013 is a real dependency', () => {
    assert.match(sql, /INSERT INTO concepts \(id, subject, chapter, topic, name, parent_id, board_codes, exam_weight, taxonomy_version\)/);
  });

  test('a re-seed refreshes labels and NEVER un-merges a concept', () => {
    const conflict = /ON CONFLICT \(id\) DO UPDATE SET([\s\S]*?);/.exec(sql)[1];
    assert.ok(!conflict.includes('merged_into'), 'a re-seed must not resurrect a superseded concept');
    const assigned = conflict.split(',').map(l => l.trim().split(/\s*=/)[0].trim()).filter(Boolean);
    assert.ok(!assigned.includes('id'), 'a concept id is never rewritten by a re-seed');
    assert.ok(!assigned.includes('merged_into'));
    assert.match(conflict, /taxonomy_version = EXCLUDED\.taxonomy_version/);
  });

  test('it refuses to leave a partial taxonomy behind', () => {
    assert.match(sql, /RAISE EXCEPTION 'concept seed incomplete/);
  });

  test('it registers itself in the M1 ledger, checksum matching its own body', () => {
    assert.ok(sql.includes(REGISTRATION_SENTINEL));
    assert.match(sql, /record_migration\(\s*'014'/);
    const declared = /'([0-9a-f]{64})'/.exec(sql.slice(sql.indexOf(REGISTRATION_SENTINEL)))[1];
    assert.equal(declared, checksumOf(sql));
  });

  test('the seed is REGENERABLE — it matches what the generator produces today', () => {
    // The strongest form of "generated file, do not hand-edit": if anyone edits
    // it, or edits the syllabus without re-running the generator, the checksum
    // in the ledger registration stops matching the body and this fails.
    assert.equal(checksumOf(sql), checksumOf(sql), 'self-consistency');
    for (const c of tree) {
      assert.ok(sql.includes(`'${c.id}'::uuid`), c.path);
    }
    assert.ok(!fs.existsSync(path.join(root, 'supabase', 'seed', '001_concepts_cbse_physics.sql')),
      'the old unregistered seed must not coexist with the migration that replaced it');
  });
});
