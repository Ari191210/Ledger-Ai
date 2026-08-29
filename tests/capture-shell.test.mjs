// M8-1 — `/capture` EXISTS, AND THE TWO ROUTES IT REPLACES 301 INTO IT.
//
// `PRODUCT_DECISIONS` §3, route 4: *"Photograph a marked paper. **If this
// doesn't ship, nothing else matters.**"*
//
// Structural fences over source, config and SQL — the same instrument
// `tests/home-shell.test.mjs` uses for M3, and for the same reason: the
// repository has no React test renderer, and the claims M8-1 makes ("the route
// exists", "the two tools redirect", "nothing else was swallowed", "the shell
// is reused rather than reinvented") are claims about the shape of the tree.
//
// It also fences the two things this pass must NOT have done: no AI extraction
// anywhere in the capture path (that is M8-4), and no public read path for a
// minor's marked paper.
//
// ── READ THIS BEFORE ASSUMING THE FENCE IS STALE (amended 2026-08-15, M8-4) ──
//
// M8-4 shipped extraction, and NOT ONE ASSERTION BELOW WAS INVERTED OR DELETED.
// That is a fact about where M8-4 put it, not an oversight: the seven files in
// `CAPTURE_PATH` are the UPLOAD path, and uploading a paper still stores it and
// reads nothing. Extraction lives in `lib/capture-extraction.ts` and
// `app/api/capture/extract/route.ts`, is reached only when the student asks for
// it, and is fenced by its own suite — `tests/capture-extraction.test.mjs`.
//
// So "nothing in the capture path calls a model" is still true, still tested,
// and now means something sharper than it did: uploading cannot spend a model
// call, whatever else the product grows.
//
//   node --test tests/capture-shell.test.mjs
//
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

/** Comments explain; only real code counts. Same convention as
 *  tests/home-shell.test.mjs and tests/m0-integrity-fences.test.mjs. */
const code = rel =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const CAPTURE_PATH = [
  'app/capture/page.tsx',
  'app/capture/layout.tsx',
  'app/api/capture/route.ts',
  'lib/evidence.ts',
  'lib/storage.ts',
  'lib/capture-intake.ts',
  'lib/ingest/supabase-store.ts',
];

// ══ M8-1 — THE ROUTE ════════════════════════════════════════════════════════

describe('M8-1: /capture renders', () => {
  test('the route exists, with its own shell layout', () => {
    assert.ok(exists('app/capture/page.tsx'), '/capture has no page');
    assert.ok(exists('app/capture/layout.tsx'), '/capture has no layout');
  });

  test('the layout reuses /home`s shell rather than inventing a second one', () => {
    const src = read('app/capture/layout.tsx');
    assert.match(src, /VitalityShell/, '/capture does not mount the console token host');
    assert.match(src, /AuthGuard/, '/capture is not behind the auth guard');
    assert.match(src, /console\/console\.css/, '/capture imports its own stylesheet');
    // A student surface holding photographs of marked papers must not be
    // indexed.
    assert.match(src, /robots:\s*\{\s*index:\s*false/, '/capture is indexable');
  });

  test('the page speaks the console vocabulary, not a new one', () => {
    const src = read('app/capture/page.tsx');
    assert.match(src, /@\/components\/console\/primitives/,
      '/capture invents its own layout vocabulary');
  });

  test('it offers both things the two merged routes took in', () => {
    const src = code('app/capture/page.tsx');
    // A marked paper (exam-practice) and a syllabus (syllabus). Losing either
    // would make the redirect a downgrade rather than a merge.
    assert.match(src, /"paper"/, '/capture cannot capture a paper');
    assert.match(src, /"syllabus"/, '/capture cannot capture a syllabus');
    assert.match(src, /type="file"/, '/capture has no way to send a photograph');
    assert.match(src, /accept=\{ACCEPT\}|accept="/, '/capture accepts any file at all');
    assert.match(src, /\/api\/capture/, '/capture posts nowhere');
  });

  test('it does not compute or render the Ledger Score', () => {
    // M3-3's rule survives M8: `/home` is the only shell that reads the score.
    const src = code('app/capture/page.tsx');
    assert.ok(!/computeLedgerScore|ledger-score/.test(src),
      '/capture became a second score shell');
  });
});

describe('M8-1: exam-practice and syllabus 301 into /capture', () => {
  const config = read('next.config.mjs');

  for (const source of ['/tools/exam-practice', '/tools/syllabus']) {
    test(`${source} redirects permanently to /capture`, () => {
      const row = new RegExp(
        `source:\\s*["']${source}["'][^}]*destination:\\s*["']/capture["'][^}]*permanent:\\s*true`,
      );
      assert.match(config, row, `${source} has no permanent redirect to /capture`);
    });
  }

  test('the redirects are exact-path — no wildcard swallows a tool', () => {
    assert.ok(!/source:\s*["']\/tools\/:path\*["']/.test(config),
      'a wildcard /tools redirect would swallow all 46 tools');
    assert.ok(!/source:\s*["']\/tools\/exam-practice\/:path\*["']/.test(config));
    assert.ok(!/source:\s*["']\/tools\/syllabus\/:path\*["']/.test(config));
  });

  test('the two page files still exist — unlinked, not deleted (§2.5)', () => {
    // §1.4's deletion gate. The redirect is reversible by removing two lines;
    // deleting shipped code that `/capture` cannot yet do would not be.
    assert.ok(exists('app/tools/exam-practice/page.tsx'));
    assert.ok(exists('app/tools/syllabus/page.tsx'));
  });

  test('every OTHER tool route still resolves directly', () => {
    // The sibling surfaces that carry exam-practice's other tabs must not have
    // been swept up: S.4 keeps the Level-0 tools routable.
    //
    // AMENDED 2026-08-16 (M13-2). `post-exam` left this list, and the assertion
    // it was making is unchanged: the claim is that M8 did not sweep up a
    // sibling, and M13-2 redirecting `post-exam` into `/diagnosis` is S.4's own
    // instruction (*"REBUILD as one"*), not M8 overreaching. The redirect it
    // now carries is asserted by `tests/diagnosis.test.mjs`, which also proves
    // its page file still exists — so nothing this test was protecting has been
    // given up, it has only moved to the milestone that owns it.
    //
    // AMENDED 2026-08-17 (M13-3), for exactly the same reason. `grade-tracker`
    // left this list because §2.4 sends it to `/record` (*"the longitudinal
    // asset. One place, forever."*) and S.4 marks it **ADAPT** into `/record`.
    // That is the milestone that owns it acting, not M8 overreaching; its
    // redirect and its surviving page file are asserted by
    // `tests/record.test.mjs`. Both departures are checked below, so this test
    // still fails if M8 — or anything else — sweeps one of them somewhere else.
    const untouched = [
      'exam-triage', 'panic-triage', 'recall-studio', 'exam-day',
      'learn-lab', 'focus-lab', 'reference-builder',
    ];
    for (const slug of untouched) {
      assert.ok(exists(`app/tools/${slug}/page.tsx`), `/tools/${slug} was deleted`);
      assert.ok(!new RegExp(`source:\\s*["']/tools/${slug}["']`).test(config),
        `/tools/${slug} was redirected away by M8`);
    }
    // The two that left this list went where their own milestone sends them,
    // and nowhere else.
    for (const [slug, owner] of [['post-exam', '/diagnosis'], ['grade-tracker', '/record']]) {
      assert.ok(exists(`app/tools/${slug}/page.tsx`), `/tools/${slug} was deleted`);
      assert.ok(
        new RegExp(`source:\\s*["']/tools/${slug}["']\\s*,\\s*destination:\\s*["']${owner}["']`).test(config),
        `/tools/${slug} no longer redirects to ${owner}`,
      );
      assert.ok(!new RegExp(`source:\\s*["']/tools/${slug}["']\\s*,\\s*destination:\\s*["']/capture`).test(config),
        `/tools/${slug} was swept into /capture by M8`);
    }
  });

  test('M3`s redirects are untouched', () => {
    for (const [source, dest] of [['/dashboard', '/capture'], ['/console', '/capture']]) {
      assert.match(
        config,
        new RegExp(`source:\\s*["']${source}["'][^}]*destination:\\s*["']${dest}["']`),
        `M8 disturbed the ${source} redirect`,
      );
    }
  });
});

// ══ M8-2 — EVIDENCE, AND WHERE THE BYTES LIVE ═══════════════════════════════

describe('M8-2: the dedup is structural, in the schema', () => {
  test('007 declares UNIQUE (student_id, content_hash)', () => {
    const sql = read('supabase/migrations/007_mistakes.sql');
    assert.match(
      sql,
      /CONSTRAINT\s+evidence_student_hash_unique\s+UNIQUE\s*\(\s*student_id\s*,\s*content_hash\s*\)/i,
      'the evidence dedup constraint is not declared in 007',
    );
  });

  test('007 is untouched by M8 — the mistake schema is frozen (S.3)', () => {
    const sql = read('supabase/migrations/007_mistakes.sql');
    assert.ok(!/M8/.test(sql), '007 was edited by M8');
    // And 019 adds no column to it.
    const m019 = read('supabase/migrations/019_evidence_storage.sql');
    assert.ok(!/ALTER\s+TABLE\s+(public\.)?evidence/i.test(m019),
      '019 alters the frozen evidence table');
    assert.ok(!/ALTER\s+TABLE\s+(public\.)?(occurrences|patterns|concepts)/i.test(m019),
      '019 alters a frozen 007 table');
  });

  test('the writer inserts first and reads the constraint`s verdict', () => {
    const src = code('lib/evidence.ts');
    assert.match(src, /23505/, 'the unique-violation code is never interpreted');
    assert.match(src, /insertEvidence\(/, 'nothing inserts evidence');
    // A pre-flight existence check would be a race. The read-back exists only
    // on the duplicate branch, after the insert has been refused.
    const insertAt = src.indexOf('deps.db.insertEvidence');
    const findAt = src.indexOf('deps.db.findEvidenceByHash');
    assert.ok(insertAt > -1 && findAt > insertAt,
      'evidence is looked up before it is inserted — that is a race, not a dedup');
  });

  test('evidence is append-only in code as well as in 007', () => {
    const src = code('lib/evidence.ts');
    assert.ok(!/updateEvidence|deleteEvidence/.test(src),
      'the evidence layer grew a mutation');
    assert.ok(!/\.update\(|\.delete\(/.test(src));
  });

  test('019 creates a PRIVATE bucket scoped to auth.uid()', () => {
    const sql = read('supabase/migrations/019_evidence_storage.sql');
    assert.match(sql, /INSERT INTO storage\.buckets/i, '019 creates no bucket');
    assert.match(sql, /'evidence',\s*'evidence',\s*FALSE/i,
      'the evidence bucket is not private');
    assert.match(sql, /storage\.foldername\(name\)\)\[1\]\s*=\s*auth\.uid\(\)::text/i,
      'storage objects are not scoped to their owner');
    // Same asymmetry as 007: read and write your own, never delete.
    assert.match(sql, /FOR SELECT TO authenticated/i);
    assert.match(sql, /FOR INSERT TO authenticated/i);
    assert.ok(!/FOR DELETE/i.test(sql), '019 grants a client the right to delete evidence');
  });

  test('nothing anywhere makes a captured paper publicly readable', () => {
    for (const rel of CAPTURE_PATH) {
      const src = code(rel);
      assert.ok(!/getPublicUrl|public:\s*true/.test(src),
        `${rel} exposes evidence by public URL`);
    }
  });

  test('the content hash is the cryptographic one, not the pipeline`s', () => {
    // lib/ingest/hash.ts says of itself: "Not cryptographic, and deliberately
    // so". Deciding whether two uploads are the same paper is a protection
    // claim, so it uses lib/sha256.ts.
    const src = code('lib/evidence.ts');
    assert.match(src, /from ["']\.\/sha256["']/, 'evidence does not hash with SHA-256');
    assert.ok(!/ingest\/hash/.test(src), 'evidence identifies papers with a non-cryptographic hash');
  });
});

// ══ M8-3 — THE LEDGER HAS A PRODUCTION IMPORTER ═════════════════════════════

describe('M8-3: T12 is retired for lib/ingest/*', () => {
  test('production code — not only a test — imports the runner', () => {
    const importers = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { walk(rel); continue; }
        if (!/\.tsx?$/.test(e.name)) continue;
        if (rel.startsWith('lib/ingest/')) continue;   // the module importing itself proves nothing
        if (/from ["'](@\/lib|\.\.?)\/?.*ingest\/(runner|types|supabase-store)["']/.test(read(rel))) {
          importers.push(rel);
        }
      }
    };
    walk('lib');
    walk('app');

    assert.ok(importers.length > 0,
      'lib/ingest/* still has zero production importers — T12 stands');
    assert.ok(importers.includes('lib/capture-intake.ts'),
      'the capture wiring does not import the runner');
  });

  test('the capture endpoint is the call site, and it is authenticated', () => {
    const src = code('app/api/capture/route.ts');
    assert.match(src, /beginCaptureIngestion\(/, 'the endpoint never enters the stage ledger');
    assert.match(src, /captureEvidence\(/, 'the endpoint never writes evidence');
    assert.match(src, /createSupabaseIngestionStore\(/, 'the endpoint uses no 008 store');
    // The identity comes from the token, never the body (D.1.a).
    assert.match(src, /auth\.getUser\(/, 'the endpoint does not authenticate');
    assert.match(src, /status:\s*401/, 'an unauthenticated capture is not refused');
    assert.ok(!/student_id["']?\s*[:=]\s*(body|form)/.test(src),
      'the endpoint takes an identity from the request body');
  });

  test('the store implements the SAME interface the runner`s tests drive', () => {
    const src = code('lib/ingest/supabase-store.ts');
    assert.match(src, /IngestionStore/, 'the adapter does not implement the store contract');
    assert.match(src, /ingestion_runs|RUNS_TABLE/);
    assert.match(src, /ingestion_stages|STAGES_TABLE/);
    // The append-only refusal is the database's here, as 008 declares it.
    assert.match(src, /23505|ingestion_stages_attempt_unique/,
      'the adapter does not recognise 008`s append-only refusal');
    assert.ok(!/\bUPDATE\b.*ingestion_stages/i.test(src),
      'the adapter updates a stage record');
  });
});

// ══ THE BOUNDARY THIS PASS MUST NOT HAVE CROSSED ════════════════════════════

describe('M8-1..3: no extraction, no model, no record write', () => {
  test('nothing in the capture path calls a model', () => {
    for (const rel of CAPTURE_PATH) {
      const src = code(rel);
      assert.ok(!/callAI|ai-fetch|anthropic|\/api\/ai\b/i.test(src),
        `${rel} calls a model — extraction is M8-4`);
    }
  });

  test('nothing in the capture path writes an occurrence or a pattern', () => {
    // occurrences.evidence_id is NOT NULL and every occurrence needs a
    // classified error. Writing one from capture would be inventing a
    // diagnosis nothing has made (PRINCIPLES §3.2).
    for (const rel of CAPTURE_PATH) {
      const src = code(rel);
      assert.ok(!/from\(["']occurrences["']\)|from\(["']patterns["']\)/.test(src),
        `${rel} writes to the mistake record`);
    }
  });

  test('only the propose-phase intake stage is registered', () => {
    const src = code('lib/capture-intake.ts');
    assert.match(src, /id: "intake"/, 'the intake stage is not declared');
    for (const commitStage of ['occurrences', 'pattern-merge', 'score', 'next-action']) {
      assert.ok(!new RegExp(`id:\\s*["']${commitStage}["']`).test(src),
        `capture registers the commit stage '${commitStage}'`);
    }
  });

  test('a run begins unconfirmed — the gate M8-5 will enforce', () => {
    const src = code('lib/capture-intake.ts');
    assert.match(src, /confirmedAt:\s*null/, 'a capture run is created pre-confirmed');
  });

  test('the score engines are untouched by M8', () => {
    for (const rel of CAPTURE_PATH) {
      assert.ok(!/ledger-score/.test(code(rel)), `${rel} reaches into the scoring engine`);
    }
  });
});
