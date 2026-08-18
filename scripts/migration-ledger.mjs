// ═══════════════════════════════════════════════════════════════════════════
// Migration ledger — pure logic (M1-1 / M1-2)
//
// Architecture T1: "An append-only event store cannot tolerate schema drift —
// a missing column silently loses data permanently." This module is the half of
// the gate that has no I/O: it turns (repo migration files, ledger rows) into a
// verdict. `scripts/check-migrations.mjs` supplies the I/O; `tests/
// migration-ledger.test.mjs` supplies fixtures. Keeping the comparison pure is
// what makes "a deliberately unapplied migration fails CI" provable without a
// live database (U.3, the determinism boundary).
//
// No imports beyond node:crypto. No clock. No network.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";

/**
 * Everything after this line in a migration file is the file registering
 * ITSELF in the ledger, and is excluded from the checksum — a file cannot
 * contain its own hash. Everything before it is the migration proper and is
 * what the checksum covers.
 */
export const REGISTRATION_SENTINEL = "-- >>> MIGRATION LEDGER REGISTRATION <<<";

/**
 * Checksum domain: the migration body, line-ending- and trailing-whitespace-
 * normalised so that a checkout on Windows and a checkout on Linux agree.
 * Deliberately NOT semantic — any edit to an applied migration must be caught,
 * including a comment-only one, because the ledger records "this exact text was
 * run", not "something like this was run".
 */
export function migrationBody(contents) {
  const idx = contents.indexOf(REGISTRATION_SENTINEL);
  const body = idx === -1 ? contents : contents.slice(0, idx);
  return body.replace(/\r\n/g, "\n").replace(/\s+$/, "") + "\n";
}

export function checksumOf(contents) {
  return createHash("sha256").update(migrationBody(contents), "utf8").digest("hex");
}

/**
 * Version token = the filename prefix before the first underscore.
 * `004b_stripe_tables_only.sql` → `004b`. The repo already uses that suffix
 * form, so the parser accommodates it rather than renaming an applied file.
 */
const FILENAME_RE = /^([0-9]{3}[a-z]?)_([A-Za-z0-9_.-]+)\.sql$/;

export function parseMigrationFilename(filename) {
  const m = FILENAME_RE.exec(filename);
  if (!m) return null;
  return { version: m[1], slug: m[2], name: filename };
}

/**
 * Repo-side invariants that hold with no database in reach. These run in CI
 * unconditionally: they are cheap, and a duplicate version number would make
 * the ledger's primary key silently swallow one of two migrations.
 */
export function validateRepoMigrations(files) {
  const problems = [];
  const seen = new Map();

  for (const f of files) {
    const parsed = parseMigrationFilename(f.name);
    if (!parsed) {
      problems.push({
        kind: "MALFORMED_FILENAME",
        name: f.name,
        detail: `does not match NNN[a]_slug.sql`,
      });
      continue;
    }
    if (seen.has(parsed.version)) {
      problems.push({
        kind: "DUPLICATE_VERSION",
        name: f.name,
        detail: `version ${parsed.version} is already used by ${seen.get(parsed.version)}`,
      });
      continue;
    }
    seen.set(parsed.version, f.name);
    if (migrationBody(f.contents).trim().length === 0) {
      problems.push({ kind: "EMPTY_MIGRATION", name: f.name, detail: "no SQL body" });
    }
  }

  return { ok: problems.length === 0, problems };
}

/**
 * The gate proper.
 *
 * @param files      [{ name, contents }] — every *.sql under supabase/migrations
 * @param ledgerRows [{ version, name, checksum }] — rows read back from the
 *                   database's migration ledger
 *
 * Verdict categories, each a hard failure:
 *   UNAPPLIED  — the repo has a migration the database has never recorded.
 *                This is the M1-2 done-when case.
 *   DIVERGENT  — recorded and present, but the file's text changed after it was
 *                applied. The database and the repo disagree about what ran.
 *   UNRECORDED_CHECKSUM — recorded without a checksum (a pre-ledger backfill
 *                that could not be evidenced). Not fatal; reported as a warning
 *                so the ledger cannot quietly launder an unverified row.
 *   ORPHANED   — the database recorded a migration the repo no longer contains.
 *                Either a file was deleted after being applied, or the database
 *                belongs to a different branch.
 */
export function compareMigrations(files, ledgerRows) {
  const repo = new Map();
  for (const f of files) {
    const parsed = parseMigrationFilename(f.name);
    if (!parsed) continue;
    repo.set(parsed.version, { ...parsed, checksum: checksumOf(f.contents) });
  }

  const ledger = new Map();
  for (const r of ledgerRows) ledger.set(String(r.version), r);

  const unapplied = [];
  const divergent = [];
  const orphaned = [];
  const unrecordedChecksum = [];

  for (const [version, entry] of [...repo].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const row = ledger.get(version);
    if (!row) {
      unapplied.push({ version, name: entry.name, checksum: entry.checksum });
      continue;
    }
    if (row.checksum == null || row.checksum === "") {
      unrecordedChecksum.push({ version, name: entry.name });
      continue;
    }
    if (row.checksum !== entry.checksum) {
      divergent.push({
        version,
        name: entry.name,
        repoChecksum: entry.checksum,
        ledgerChecksum: row.checksum,
      });
    }
  }

  for (const [version, row] of [...ledger].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!repo.has(version)) orphaned.push({ version, name: row.name ?? null });
  }

  const ok = unapplied.length === 0 && divergent.length === 0 && orphaned.length === 0;

  return { ok, unapplied, divergent, orphaned, unrecordedChecksum };
}

/** Human-readable rendering of a verdict. Used by the CI runner and by tests. */
export function formatVerdict(verdict) {
  const lines = [];
  for (const u of verdict.unapplied) {
    lines.push(`UNAPPLIED  ${u.name} — present in supabase/migrations, absent from the ledger`);
  }
  for (const d of verdict.divergent) {
    lines.push(
      `DIVERGENT  ${d.name} — file changed after it was applied ` +
        `(repo ${d.repoChecksum.slice(0, 12)}… vs ledger ${String(d.ledgerChecksum).slice(0, 12)}…)`,
    );
  }
  for (const o of verdict.orphaned) {
    lines.push(`ORPHANED   version ${o.version} — recorded as applied, no such file in the repo`);
  }
  for (const w of verdict.unrecordedChecksum) {
    lines.push(`WARN       ${w.name} — recorded without a checksum; divergence cannot be detected`);
  }
  return lines;
}
