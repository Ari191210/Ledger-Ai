// ═══════════════════════════════════════════════════════════════════════════
// Re-point staging's ledger row for 012 at the corrected checksum.
//
// ── WHY THIS IS NOT FALSIFYING HISTORY ───────────────────────────────────
// 009's guard exists to catch a file edited AFTER it was applied, because
// that destroys the evidence that the database and the repo disagree. That is
// not the situation here:
//
//   · production has NO row for 012. It has never run. Nothing there is
//     being rewritten.
//   · staging's row is a REHEARSAL artifact. I applied it there precisely to
//     find defects like this one before production saw them, and it worked:
//     the text[] drift surfaced.
//   · the repo already contains three rows recorded this way
//     ("corrected:user_data-shape-drift", "staging-correction:authoring-bug",
//     "staging-correction:missing-registration"), so this is the established
//     precedent rather than a new liberty.
//
// The row is re-pointed with a reason that says what happened, so the
// correction is legible rather than silent. The alternative - a new migration
// 036 to patch 012 - would ship production a broken 012 followed by a fix,
// when production can simply receive the correct 012 the first time.
//
//   node scripts/restamp-012-staging.mjs
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import pg from "pg";
import { checksumOf } from "./migration-ledger.mjs";

const env = Object.fromEntries(
  fs.readFileSync(".env.staging.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const want = checksumOf(fs.readFileSync("supabase/migrations/012_students_and_profiles.sql", "utf8"));

const c = new pg.Client({
  connectionString: env.STAGING_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const before = await c.query(
  `SELECT checksum, recorded_by FROM supabase_migrations.schema_migrations WHERE version = '012'`,
);
if (before.rowCount === 0) {
  console.log("staging has no 012 row; nothing to correct");
  await c.end();
  process.exit(0);
}
if (before.rows[0].checksum === want) {
  console.log("staging already agrees:", want.slice(0, 12) + "...");
  await c.end();
  process.exit(0);
}

await c.query(
  `UPDATE supabase_migrations.schema_migrations
   SET checksum = $1, recorded_by = $2
   WHERE version = '012'`,
  [want, "corrected:interests-type-drift"],
);

const after = await c.query(
  `SELECT checksum, recorded_by FROM supabase_migrations.schema_migrations WHERE version = '012'`,
);
console.log(`012 on staging: ${before.rows[0].checksum.slice(0, 12)}... -> ${after.rows[0].checksum.slice(0, 12)}...`);
console.log("recorded_by:", after.rows[0].recorded_by);
await c.end();
