// M1-2 — proof that the migration gate fails on drift.
//
// EXECUTION_PLAN M1-2's done-when is "a deliberately unapplied migration fails
// CI". The gate's comparison is a pure function precisely so that claim can be
// demonstrated here, against fixtures, rather than asserted about a workflow
// nobody can run locally. `scripts/check-migrations.mjs` is a thin I/O shell
// around exactly these calls, so a green suite here means the CI step fails for
// the reasons it claims to.
//
//   node --test tests/
//   node --test tests/migration-ledger.test.mjs
//
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

import {
  REGISTRATION_SENTINEL,
  migrationBody,
  checksumOf,
  parseMigrationFilename,
  validateRepoMigrations,
  compareMigrations,
  formatVerdict,
} from '../scripts/migration-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = path.join(root, 'supabase', 'migrations');

const realFiles = () =>
  fs.readdirSync(MIGRATIONS)
    .filter(n => n.endsWith('.sql'))
    .sort()
    .map(name => ({ name, contents: fs.readFileSync(path.join(MIGRATIONS, name), 'utf8') }));

/** A ledger in which every repo migration is applied with a matching checksum. */
const fullyAppliedLedger = (files) =>
  files.map(f => ({
    version: parseMigrationFilename(f.name).version,
    name: f.name,
    checksum: checksumOf(f.contents),
  }));

// ───────────────────────────────────────────────────────────────────────────
describe('checksum domain', () => {
  test('line endings do not change the checksum', () => {
    const unix = 'CREATE TABLE t (id INT);\n';
    const win = 'CREATE TABLE t (id INT);\r\n';
    assert.equal(checksumOf(unix), checksumOf(win));
  });

  test('trailing whitespace does not change the checksum', () => {
    assert.equal(checksumOf('SELECT 1;'), checksumOf('SELECT 1;\n\n\n  '));
  });

  test('the self-registration footer is excluded from the checksum', () => {
    const body = '-- m\nALTER TABLE t ADD COLUMN c INT;\n';
    const withFooter =
      body + REGISTRATION_SENTINEL + "\nSELECT record_migration('011','x','deadbeef','self');\n";
    assert.equal(checksumOf(body), checksumOf(withFooter));
    assert.equal(migrationBody(withFooter), migrationBody(body));
  });

  test('a one-character edit to the SQL does change the checksum', () => {
    assert.notEqual(
      checksumOf('ALTER TABLE t ADD COLUMN c INT;'),
      checksumOf('ALTER TABLE t ADD COLUMN c BIGINT;'),
    );
  });

  test('a comment-only edit also changes the checksum', () => {
    // The ledger records "this exact text ran", not "something equivalent ran".
    assert.notEqual(checksumOf('-- a\nSELECT 1;'), checksumOf('-- b\nSELECT 1;'));
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('filename parsing', () => {
  test('parses NNN_slug.sql', () => {
    assert.deepEqual(parseMigrationFilename('005_score_history.sql'), {
      version: '005', slug: 'score_history', name: '005_score_history.sql',
    });
  });

  test('parses the repo\'s NNNb suffix form', () => {
    assert.equal(parseMigrationFilename('004b_stripe_tables_only.sql').version, '004b');
  });

  test('rejects a file with no version prefix', () => {
    assert.equal(parseMigrationFilename('fix_the_thing.sql'), null);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('repo structure validation', () => {
  test('the real supabase/migrations directory is well-formed', () => {
    const v = validateRepoMigrations(realFiles());
    assert.equal(v.ok, true, JSON.stringify(v.problems));
  });

  test('two files claiming the same version fail', () => {
    const v = validateRepoMigrations([
      { name: '007_mistakes.sql', contents: 'SELECT 1;' },
      { name: '007_other.sql', contents: 'SELECT 2;' },
    ]);
    assert.equal(v.ok, false);
    assert.equal(v.problems[0].kind, 'DUPLICATE_VERSION');
  });

  test('a malformed filename fails', () => {
    const v = validateRepoMigrations([{ name: 'hotfix.sql', contents: 'SELECT 1;' }]);
    assert.equal(v.ok, false);
    assert.equal(v.problems[0].kind, 'MALFORMED_FILENAME');
  });

  test('an empty migration fails', () => {
    const v = validateRepoMigrations([{ name: '011_nothing.sql', contents: '   \n\n' }]);
    assert.equal(v.ok, false);
    assert.equal(v.problems[0].kind, 'EMPTY_MIGRATION');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('the gate — M1-2 done-when', () => {
  test('a fully applied, unmodified set passes', () => {
    const files = realFiles();
    const verdict = compareMigrations(files, fullyAppliedLedger(files));
    assert.equal(verdict.ok, true, JSON.stringify(verdict));
    assert.equal(verdict.unapplied.length, 0);
    assert.equal(verdict.divergent.length, 0);
    assert.equal(verdict.orphaned.length, 0);
  });

  test('A DELIBERATELY UNAPPLIED MIGRATION FAILS', () => {
    const files = realFiles();
    // The ledger records everything except the newest migration — the exact
    // shape of "the founder wrote the SQL and forgot to paste it in".
    const ledger = fullyAppliedLedger(files).slice(0, -1);
    const dropped = files[files.length - 1].name;

    const verdict = compareMigrations(files, ledger);

    assert.equal(verdict.ok, false, 'the gate must not pass with a migration unapplied');
    assert.equal(verdict.unapplied.length, 1);
    assert.equal(verdict.unapplied[0].name, dropped);
    assert.match(formatVerdict(verdict).join('\n'), /UNAPPLIED/);
  });

  test('a brand-new migration nobody has run fails', () => {
    const files = realFiles();
    const ledger = fullyAppliedLedger(files);
    files.push({ name: '099_event_store.sql', contents: 'CREATE TABLE events (id BIGSERIAL);' });

    const verdict = compareMigrations(files, ledger);
    assert.equal(verdict.ok, false);
    assert.deepEqual(verdict.unapplied.map(u => u.version), ['099']);
  });

  test('editing an already-applied migration fails as DIVERGENT', () => {
    const files = realFiles();
    const ledger = fullyAppliedLedger(files);
    // Someone "just fixes a typo" in 005 after it shipped.
    const i = files.findIndex(f => f.name === '005_score_history.sql');
    files[i] = { ...files[i], contents: files[i].contents + '\nALTER TABLE score_history ADD COLUMN sneaky INT;\n' };

    const verdict = compareMigrations(files, ledger);
    assert.equal(verdict.ok, false);
    assert.equal(verdict.divergent.length, 1);
    assert.equal(verdict.divergent[0].version, '005');
    assert.match(formatVerdict(verdict).join('\n'), /DIVERGENT/);
  });

  test('a ledger row with no corresponding file fails as ORPHANED', () => {
    const files = realFiles();
    const ledger = fullyAppliedLedger(files);
    ledger.push({ version: '050', name: '050_from_another_branch.sql', checksum: 'abc' });

    const verdict = compareMigrations(files, ledger);
    assert.equal(verdict.ok, false);
    assert.deepEqual(verdict.orphaned.map(o => o.version), ['050']);
  });

  test('an empty ledger fails on every migration — the pre-M1 state', () => {
    const files = realFiles();
    const verdict = compareMigrations(files, []);
    assert.equal(verdict.ok, false);
    assert.equal(verdict.unapplied.length, files.length);
  });

  test('a checksum-less backfill row warns but does not silently pass as verified', () => {
    const files = realFiles();
    const ledger = fullyAppliedLedger(files);
    ledger[0].checksum = null; // catalogue-probe backfill, exact text unknown

    const verdict = compareMigrations(files, ledger);
    assert.equal(verdict.ok, true, 'presence is evidenced, so this is not a hard failure');
    assert.equal(verdict.unrecordedChecksum.length, 1);
    assert.match(formatVerdict(verdict).join('\n'), /WARN/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('the ledger migrations themselves', () => {
  const read = (n) => fs.readFileSync(path.join(MIGRATIONS, n), 'utf8');

  test('009 exists and creates the ledger the gate queries', () => {
    const sql = read('009_migration_ledger.sql');
    assert.match(sql, /CREATE SCHEMA IF NOT EXISTS supabase_migrations/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS supabase_migrations\.schema_migrations/);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.migration_ledger\(\)/);
  });

  test('the ledger RPC is not reachable by students', () => {
    const sql = read('009_migration_ledger.sql');
    assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.migration_ledger\(\) FROM anon, authenticated/);
    assert.match(sql, /GRANT\s+EXECUTE ON FUNCTION public\.migration_ledger\(\) TO service_role/);
  });

  test('009 and 010 register themselves with their own true checksum', () => {
    for (const name of ['009_migration_ledger.sql', '010_score_history_active.sql']) {
      const sql = read(name);
      const idx = sql.indexOf(REGISTRATION_SENTINEL);
      assert.notEqual(idx, -1, `${name} has no registration footer`);
      const footer = sql.slice(idx);
      assert.ok(
        footer.includes(checksumOf(sql)),
        `${name}'s registration footer does not carry its own body checksum — ` +
        `the ledger would record a hash that never matches the file`,
      );
    }
  });

  test('010 writes down score_history.active, which no earlier migration ever did', () => {
    const active = /ADD COLUMN IF NOT EXISTS\s+active\s+BOOLEAN/i;
    assert.match(read('010_score_history_active.sql'), active);

    // The drift itself, fenced: before 010 the repo did not describe a column
    // the daily close writes on every run.
    const earlier = fs.readdirSync(MIGRATIONS)
      .filter(n => n.endsWith('.sql') && n < '010')
      .map(read)
      .join('\n');
    assert.doesNotMatch(earlier, /score_history[\s\S]{0,400}\bactive\b/i);
  });

  // AMENDED 2026-08-17 (M14-5 / M14-6). This test asserted the OPPOSITE and is
  // INVERTED rather than deleted, on the M7-6 convention: the boundary it drew
  // is still a real fact, and only which side of it the repository is on has
  // changed.
  //
  // It used to read `assert.match(route, /activeColumnMissing/)` and carried the
  // note *"M1-3 may only delete this once the ledger shows 010 applied to
  // production."* The fallback caught a missing `score_history.active`, dropped
  // the flag and retried, on M1-3's reasoning that the close of record must
  // never be blocked by schema lag.
  //
  // **M14-5 inverts that trade, and the reason is not that 010 was confirmed
  // applied — it is that the column set being degraded changed.** Dropping
  // `active` cost one boolean. Dropping 027's columns costs `formula_version`,
  // `as_of` and the input watermark, and V.6.8 — *"replay the whole event
  // stream … every snapshot reproduces"* — is M14-5's done-when. A row written
  // without them cannot be replayed and is indistinguishable from a good one
  // forever, whereas a day NOT written is recoverable in full: the close is
  // idempotent, so applying 027 and re-running restores it. Writing
  // unreproducible history is the worse of the two failures, so the close now
  // fails closed.
  test('schema lag now ABORTS the close instead of degrading it (M14-5, V.6.8)', () => {
    const route = fs.readFileSync(path.join(root, 'app/api/cron/score-snapshot/route.ts'), 'utf8');
    const code = route.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    assert.doesNotMatch(code, /activeColumnMissing/,
      'the degrade-and-retry fallback survived; a partial row is an unreplayable row');
    assert.doesNotMatch(code, /retry|withoutActive/i,
      'the close still has a second write path that drops columns');

    // Fails CLOSED: a schema-shaped error returns rather than writing.
    assert.match(code, /isMissingSchema\(error\.message\)/);
    assert.match(code, /status:\s*503/);

    // And it names both migrations a founder might need to apply, so the abort
    // is actionable rather than merely correct.
    assert.match(route, /027_score_snapshot_provenance\.sql/);
    assert.match(route, /\b010\b/,
      'the abort must still name 010, which is the other migration that can be behind');
  });
});
