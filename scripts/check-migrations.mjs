#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Migration gate — CI runner (M1-2)
//
// Two phases, deliberately separated:
//
//   STRUCTURE  — repo-side only, no network. Filename shape, duplicate version
//                numbers, empty bodies. Always runs, always enforced.
//   LEDGER     — compares supabase/migrations against what the target database
//                records as applied, via the service-role-only
//                public.migration_ledger() RPC created by 009.
//
// Exit codes: 0 pass · 1 drift or configuration failure.
//
// Usage:
//   node scripts/check-migrations.mjs                 # both phases
//   node scripts/check-migrations.mjs --structure-only # phase 1 only
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// The key is service-role by necessity — 009 revokes the RPC from anon and
// authenticated so the ledger is not a public map of the schema. It is read
// from GitHub Actions secrets and never echoed.
// ═══════════════════════════════════════════════════════════════════════════

import { readdir, readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateRepoMigrations,
  compareMigrations,
  formatVerdict,
} from "./migration-ledger.mjs";

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");

async function loadMigrationFiles() {
  const names = (await readdir(MIGRATIONS_DIR)).filter(n => n.endsWith(".sql")).sort();
  return Promise.all(
    names.map(async name => ({ name, contents: await readFile(join(MIGRATIONS_DIR, name), "utf8") })),
  );
}

async function fetchLedger(url, key) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/migration_ledger`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (res.status === 404) {
    throw new Error(
      "public.migration_ledger() does not exist on the target database.\n" +
        "  This is itself the M1 finding: the database has no ledger, so which\n" +
        "  migrations are applied is unknowable. Apply supabase/migrations/\n" +
        "  009_migration_ledger.sql, then re-run.",
    );
  }
  if (!res.ok) {
    throw new Error(`migration_ledger() returned HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("migration_ledger() did not return an array");
  return rows;
}

function fail(lines) {
  console.error("\n✖ MIGRATION GATE FAILED\n");
  for (const l of lines) console.error(`  ${l}`);
  console.error(
    "\n  Architecture T1: an append-only event store cannot tolerate schema drift.\n" +
      "  Fix by applying the missing migration, or by adding a NEW migration —\n" +
      "  never by editing one that has already been applied.\n",
  );
  process.exit(1);
}

async function main() {
  const structureOnly = process.argv.includes("--structure-only");
  const files = await loadMigrationFiles();

  if (files.length === 0) fail(["supabase/migrations contains no .sql files"]);

  // ── Phase 1 — structure ──────────────────────────────────────────────────
  const structure = validateRepoMigrations(files);
  if (!structure.ok) {
    fail(structure.problems.map(p => `${p.kind}  ${p.name} — ${p.detail}`));
  }
  console.log(`✔ structure: ${files.length} migration files, versions unique and well-formed`);

  if (structureOnly) return;

  // ── Phase 2 — ledger ─────────────────────────────────────────────────────
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    fail([
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set, so the applied-migration",
      "set could not be read. An unreadable ledger is NOT a pass: it is exactly the",
      "state Finding A.5.a calls UNVERIFIABLE. Configure the repository secrets, or",
      "run with --structure-only where a database is deliberately out of scope.",
    ]);
  }

  let ledgerRows;
  try {
    ledgerRows = await fetchLedger(url, key);
  } catch (e) {
    fail(String(e.message).split("\n"));
  }

  const verdict = compareMigrations(files, ledgerRows);
  if (!verdict.ok) fail(formatVerdict(verdict));

  for (const w of verdict.unrecordedChecksum) {
    console.warn(`⚠ ${w.name} recorded without a checksum — divergence undetectable for this version`);
  }
  console.log(`✔ ledger: ${ledgerRows.length} recorded, all ${files.length} repo migrations applied and unmodified`);
}

main().catch(e => {
  console.error("migration gate crashed:", e);
  process.exit(1);
});
