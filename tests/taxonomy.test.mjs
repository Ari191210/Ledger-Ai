// Integrity tests for the concept taxonomy (lib/taxonomy/).
//
// The taxonomy is the company's durable asset (PRODUCT_DECISIONS §4.2), so it
// is checked like one: determinism, hierarchy validity, board-code uniqueness,
// and exact conformance to the ratified Concept schema.
//
//   node --test tests/
//   node --test tests/taxonomy.test.mjs
//
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.test-build-taxonomy');

let B;    // build.ts
let DATA; // cbse-physics.ts
let rows;
let result;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tests/tsconfig.taxonomy.json'],
    { cwd: root },
  );
});

test('setup imports', async () => {
  B = await import(pathToFileURL(path.join(outDir, 'taxonomy', 'build.js')).href);
  DATA = await import(pathToFileURL(path.join(outDir, 'taxonomy', 'cbse-physics.js')).href);
  rows = B.buildTaxonomy(DATA.CBSE_PHYSICS);
  result = B.validateTaxonomy(rows);
  assert.ok(rows.length > 0);
});

// ══ UUIDv5 CORRECTNESS ══════════════════════════════════════════════════════

describe('deterministic identity', () => {
  test('uuidV5 matches the RFC 4122 reference vector', () => {
    // The canonical example: DNS namespace + "www.example.com".
    const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    assert.equal(B.uuidV5('www.example.com', DNS), '2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });

  test('ids are version 5 and RFC 4122 variant', () => {
    for (const r of rows) {
      assert.match(r.id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  test('rebuilding produces byte-identical ids', () => {
    const again = B.buildTaxonomy(DATA.CBSE_PHYSICS);
    assert.deepEqual(again.map(r => r.id), rows.map(r => r.id));
  });

  test('rebuilding produces an identical tree, in identical order', () => {
    assert.deepEqual(B.buildTaxonomy(DATA.CBSE_PHYSICS), rows);
  });

  test('different paths give different ids', () => {
    assert.notEqual(B.uuidV5('physics/11/waves'), B.uuidV5('physics/12/waves'));
  });

  test('the namespace is pinned — changing it would orphan the record', () => {
    assert.equal(B.TAXONOMY_NAMESPACE, '6f1d8c2e-4b3a-5e7f-9a1c-2d4e6f8a0b3c');
  });

  test('slugs are stable and url-safe', () => {
    assert.equal(B.slug('Work, Energy & Power'), 'work-energy-and-power');
    assert.equal(B.slug('Newton’s Laws'), 'newton-s-laws');
  });
});

// ══ THE SEVEN REQUIRED VALIDATIONS ══════════════════════════════════════════

describe('taxonomy integrity', () => {
  test('validation passes with zero issues', () => {
    assert.deepEqual(result.issues, [], `issues: ${JSON.stringify(result.issues.slice(0, 5), null, 2)}`);
    assert.equal(result.ok, true);
  });

  test('no orphan concepts', () => {
    const ids = new Set(rows.map(r => r.id));
    for (const r of rows) {
      if (r.parentId === null) assert.equal(r.level, 'subject');
      else assert.ok(ids.has(r.parentId), `${r.path} points at a missing parent`);
    }
  });

  test('no duplicate board codes', () => {
    const all = rows.flatMap(r => r.boardCodes);
    assert.equal(new Set(all).size, all.length);
  });

  test('every concept has at least one board code', () => {
    for (const r of rows) assert.ok(r.boardCodes.length >= 1, `${r.path} has no code`);
  });

  test('valid parent relationships — level order is enforced', () => {
    const byId = new Map(rows.map(r => [r.id, r]));
    const expected = { subject: null, chapter: 'subject', topic: 'chapter', concept: 'topic' };
    for (const r of rows) {
      const parentLevel = r.parentId ? byId.get(r.parentId).level : null;
      assert.equal(parentLevel, expected[r.level], `${r.path}`);
    }
  });

  test('every leaf belongs to exactly one chapter', () => {
    const byId = new Map(rows.map(r => [r.id, r]));
    const parents = new Set(rows.map(r => r.parentId).filter(Boolean));
    const leaves = rows.filter(r => !parents.has(r.id));
    assert.ok(leaves.length > 0);
    for (const leaf of leaves) {
      assert.equal(leaf.level, 'concept');
      const chapter = byId.get(byId.get(leaf.parentId).parentId);
      assert.equal(chapter.level, 'chapter');
      assert.equal(chapter.chapter, leaf.chapter);
    }
  });

  test('the hierarchy contains no cycles', () => {
    const byId = new Map(rows.map(r => [r.id, r]));
    for (const r of rows) {
      const seen = new Set([r.id]);
      let cursor = r;
      let hops = 0;
      while (cursor.parentId) {
        assert.ok(!seen.has(cursor.parentId), `cycle from ${r.path}`);
        seen.add(cursor.parentId);
        cursor = byId.get(cursor.parentId);
        hops += 1;
        assert.ok(hops <= 8, `runaway depth from ${r.path}`);
      }
    }
  });

  test('exactly one root, and it is the subject', () => {
    const roots = rows.filter(r => r.parentId === null);
    assert.equal(roots.length, 1);
    assert.equal(roots[0].level, 'subject');
    assert.equal(roots[0].name, 'Physics');
  });

  test('hierarchy depth is exactly 3 edges — four levels', () => {
    assert.equal(result.counts.maxDepth, 3);
  });
});

// ══ SCHEMA CONFORMANCE (§4.2) ═══════════════════════════════════════════════

describe('conformance to the ratified Concept schema', () => {
  test('every row carries exactly the ratified fields', () => {
    for (const r of rows) {
      assert.equal(typeof r.id, 'string');
      assert.equal(typeof r.subject, 'string');
      assert.equal(typeof r.chapter, 'string');
      assert.equal(typeof r.topic, 'string');
      assert.equal(typeof r.name, 'string');
      assert.ok(r.parentId === null || typeof r.parentId === 'string');
      assert.ok(Array.isArray(r.boardCodes));
      assert.equal(typeof r.examWeight, 'number');
    }
  });

  test('no NOT NULL column is ever empty', () => {
    for (const r of rows) {
      for (const f of ['subject', 'chapter', 'topic', 'name']) {
        assert.ok(r[f].trim().length > 0, `${r.path} has empty ${f}`);
      }
    }
  });

  test('the path convention holds at every level', () => {
    for (const r of rows) {
      if (r.level === 'subject') {
        assert.equal(r.chapter, r.subject);
        assert.equal(r.topic, r.subject);
        assert.equal(r.name, r.subject);
      }
      if (r.level === 'chapter') {
        assert.equal(r.topic, r.chapter);
        assert.equal(r.name, r.chapter);
      }
      if (r.level === 'topic') assert.equal(r.name, r.topic);
    }
  });

  test("a leaf's path is exactly what an occurrence denormalises (§4.3)", () => {
    // §4.2's worked example is illustrative shorthand: it names the chapter
    // "Rotational Motion", where the NCERT chapter is "System of Particles and
    // Rotational Motion", and files torque sign convention under Angular
    // Momentum. The concept sits under Torque, where it belongs. The doc
    // illustrates the SHAPE of the path; this asserts the real one.
    const leaf = rows.find(r => r.name === 'Sign convention for torque');
    assert.ok(leaf, 'the §4.2 worked example concept must exist in the taxonomy');
    assert.equal(leaf.subject, 'Physics');
    assert.equal(leaf.chapter, 'System of Particles and Rotational Motion');
    assert.equal(leaf.topic, 'Torque and Equilibrium');
    assert.equal(leaf.level, 'concept');
  });

  test('exam weight is non-negative everywhere and positive on leaves', () => {
    for (const r of rows) assert.ok(r.examWeight >= 0);
    for (const r of rows.filter(r => r.level === 'concept')) assert.ok(r.examWeight > 0, r.path);
  });

  test('subject-level aggregation reaches every leaf from the root', () => {
    const byId = new Map(rows.map(r => [r.id, r]));
    const root = rows.find(r => r.parentId === null);
    for (const leaf of rows.filter(r => r.level === 'concept')) {
      let cursor = leaf;
      while (cursor.parentId) cursor = byId.get(cursor.parentId);
      assert.equal(cursor.id, root.id, `${leaf.path} does not roll up to the subject`);
    }
  });
});

// ══ SYLLABUS COVERAGE ═══════════════════════════════════════════════════════

describe('CBSE Physics coverage', () => {
  test('at least 120 leaf concepts, as required', () => {
    assert.ok(result.counts.leaves >= 120, `only ${result.counts.leaves} leaves`);
  });

  test('28 chapters — 14 in Class 11, 14 in Class 12', () => {
    assert.equal(result.counts.chapters, 28);
    assert.equal(DATA.CBSE_PHYSICS.chapters.filter(c => c.cls === 11).length, 14);
    assert.equal(DATA.CBSE_PHYSICS.chapters.filter(c => c.cls === 12).length, 14);
  });

  test('chapter numbers are 1..14 within each class, with no gaps', () => {
    for (const cls of [11, 12]) {
      const numbers = DATA.CBSE_PHYSICS.chapters.filter(c => c.cls === cls).map(c => c.number).sort((a, b) => a - b);
      assert.deepEqual(numbers, Array.from({ length: 14 }, (_, i) => i + 1));
    }
  });

  test('each class totals 70 marks, matching the CBSE theory paper', () => {
    for (const cls of [11, 12]) {
      const total = DATA.CBSE_PHYSICS.chapters
        .filter(c => c.cls === cls)
        .reduce((sum, c) => sum + c.examWeight, 0);
      assert.ok(Math.abs(total - 70) < 1e-9, `class ${cls} totals ${total}`);
    }
  });

  test('every chapter has at least one topic, every topic at least one concept', () => {
    for (const c of DATA.CBSE_PHYSICS.chapters) {
      assert.ok(c.topics.length >= 1, c.name);
      for (const t of c.topics) assert.ok(t.concepts.length >= 1, `${c.name} → ${t.name}`);
    }
  });

  test('chapter names are unique across both classes', () => {
    const names = DATA.CBSE_PHYSICS.chapters.map(c => c.name);
    assert.equal(new Set(names).size, names.length);
  });

  test('board codes encode class, chapter, topic and concept', () => {
    const leaf = rows.find(r => r.name === 'Sign convention for torque');
    assert.match(leaf.boardCodes[0], /^CBSE-PHY-11-C06-T\d{2}-K\d{2}$/);
  });

  test('class is carried in the code, never as a tree level', () => {
    assert.equal(result.counts.maxDepth, 3, 'adding a class level would make this 4');
    const c11 = rows.filter(r => r.boardCodes.some(c => c.startsWith('CBSE-PHY-11-')));
    const c12 = rows.filter(r => r.boardCodes.some(c => c.startsWith('CBSE-PHY-12-')));
    assert.ok(c11.length > 0 && c12.length > 0);
  });
});

// ══ THE VALIDATOR ITSELF CATCHES BREAKAGE ═══════════════════════════════════

describe('the validator detects real breakage', () => {
  const clone = () => JSON.parse(JSON.stringify(rows));

  test('catches an orphan', () => {
    const broken = clone();
    broken[broken.length - 1].parentId = '00000000-0000-5000-8000-000000000000';
    const r = B.validateTaxonomy(broken);
    assert.equal(r.ok, false);
    assert.ok(r.issues.some(i => i.rule === 'orphan'));
  });

  test('catches a duplicate board code', () => {
    const broken = clone();
    broken[broken.length - 1].boardCodes = [...broken[1].boardCodes];
    const r = B.validateTaxonomy(broken);
    assert.ok(r.issues.some(i => i.rule === 'duplicate-board-code'));
  });

  test('catches a cycle', () => {
    const broken = clone();
    const a = broken.find(x => x.level === 'chapter');
    const b = broken.find(x => x.level === 'topic' && x.parentId === a.id);
    a.parentId = b.id;
    const r = B.validateTaxonomy(broken);
    assert.ok(r.issues.some(i => i.rule === 'cycle'));
  });

  test('catches an invalid parent level', () => {
    const broken = clone();
    const leaf = broken.find(x => x.level === 'concept');
    leaf.parentId = broken.find(x => x.level === 'subject').id;
    const r = B.validateTaxonomy(broken);
    assert.ok(r.issues.some(i => i.rule === 'invalid-parent-level'));
  });

  test('catches a duplicate id', () => {
    const broken = clone();
    broken[broken.length - 1].id = broken[1].id;
    const r = B.validateTaxonomy(broken);
    assert.ok(r.issues.some(i => i.rule === 'duplicate-id'));
  });

  test('catches an empty name', () => {
    const broken = clone();
    broken[broken.length - 1].name = '  ';
    const r = B.validateTaxonomy(broken);
    assert.ok(r.issues.some(i => i.rule === 'empty-name'));
  });

  test('catches a branch with no children', () => {
    const broken = clone().filter(x => x.level !== 'concept');
    const r = B.validateTaxonomy(broken);
    assert.ok(r.issues.some(i => i.rule === 'barren-branch'));
  });

  test('catches a negative exam weight', () => {
    const broken = clone();
    broken[broken.length - 1].examWeight = -1;
    const r = B.validateTaxonomy(broken);
    assert.ok(r.issues.some(i => i.rule === 'invalid-exam-weight'));
  });
});
