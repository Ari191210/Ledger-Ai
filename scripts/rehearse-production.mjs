// ═══════════════════════════════════════════════════════════════════════════
// Rehearse ALL SIX PARTS against production's MEASURED schema.
//
// Every defect so far reached the user the same way: they pasted a part and
// Supabase threw. Rehearsing on staging did not catch them, because staging
// is not production - different column types, different column names, and
// several tables production does not have.
//
// So this builds a database from supabase/production-schema.json, which is
// captured from production's own PostgREST OpenAPI spec rather than
// transcribed by hand, then runs the six pasteable parts against it in order,
// exactly as the user would. A failure here is a failure the user would hit.
//
// ── SAFETY ───────────────────────────────────────────────────────────────
// The real `public` and `supabase_migrations` schemas are renamed aside and a
// fresh `public` is built, all inside a transaction that ALWAYS ends in
// ROLLBACK, including on a throw. The script then re-checks that staging came
// back before it exits.
//
//   node scripts/capture-production-schema.mjs   (refresh the measurement)
//   node scripts/rehearse-production.mjs
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  fs.readFileSync(".env.staging.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const SCHEMA_FILE = "supabase/production-schema.json";
if (!fs.existsSync(SCHEMA_FILE)) {
  console.log("No production-schema.json. Run: node scripts/capture-production-schema.mjs");
  process.exit(1);
}
const measured = JSON.parse(fs.readFileSync(SCHEMA_FILE, "utf8"));

/**
 * Nothing is skipped.
 *
 * The first version of this harness omitted `ai_rate_limits`, `page_events`,
 * `jobs` and the `stripe_*` tables as "not part of the migration story". That
 * was wrong, and the rehearsal reported 33 ledger rows instead of 38 because
 * of it: 009's evidence-based backfill records 001 only if `ai_rate_limits`
 * exists, and 004 only if page_events + jobs + push_subscriptions +
 * stripe_customers + stripe_events all exist. Omitting them made 009 conclude,
 * correctly, that there was no evidence those migrations had ever run.
 *
 * The lesson is the same one that produced this whole exercise: a rehearsal is
 * only worth the fidelity of the thing it rehearses on.
 */
const SKIP = new Set();

/** Foreign keys the parts depend on. The measurement cannot see these. */
const FKS = {
  evidence: { student_id: "auth.users(id)" },
  occurrences: { student_id: "auth.users(id)", evidence_id: "evidence(id)" },
  patterns: { student_id: "auth.users(id)", concept_id: "concepts(id)" },
};

/** Creation order, so a foreign key never precedes its target. */
const ORDER = ["user_data", "rooms", "ai_history", "error_logs", "announcements",
  "score_history", "push_subscriptions", "ai_rate_limits", "page_events", "jobs",
  "stripe_customers", "stripe_events", "concepts", "evidence", "patterns", "occurrences"];

const ddl = (t) => {
  const cols = measured.tables[t];
  if (!cols) return null;
  const parts = Object.entries(cols).map(([c, m]) => {
    const fk = FKS[t]?.[c];
    return `  ${/[A-Z]/.test(c) ? `"${c}"` : c} ${m.type}`
      + (m.pk ? " PRIMARY KEY" : "")
      + (fk ? ` REFERENCES ${fk} ON DELETE CASCADE` : "");
  });
  return `CREATE TABLE public.${t} (\n${parts.join(",\n")}\n);`;
};

const c = new pg.Client({
  connectionString: env.STAGING_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const parts = fs.readdirSync("supabase/pending")
  .filter((f) => /^part-\d+\.sql$/.test(f)).sort();

console.log(`Production measured ${new Date(measured.captured_at).toISOString().slice(0, 10)}.`);
console.log(`Rehearsing ${parts.length} parts against it.\n`);

let failed = null;
await c.query("BEGIN");
try {
  await c.query("ALTER SCHEMA public RENAME TO public__aside");
  await c.query("ALTER SCHEMA supabase_migrations RENAME TO supabase_migrations__aside");
  await c.query("CREATE SCHEMA public");
  await c.query("GRANT ALL ON SCHEMA public TO public");
  await c.query("SET search_path = public");
  await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public`);

  // pgvector, which 035 needs.
  //
  // On staging the extension is installed into the REAL `public` schema, and
  // renaming that schema aside takes the `vector` TYPE with it. `CREATE
  // EXTENSION IF NOT EXISTS` then silently does nothing, because the
  // extension genuinely still exists - just not anywhere this rehearsal can
  // see it. The first run failed with `type "vector" does not exist` for
  // exactly that reason, which was a harness artifact rather than a defect in
  // 035.
  //
  // Putting the aside-schema on the search_path lets the type resolve without
  // pretending the extension was freshly installed.
  await c.query("SET search_path = public, public__aside, extensions");

  // The ledger table, but seeded by 009's own catalogue probes rather than by
  // me asserting which versions are applied.
  await c.query(`CREATE SCHEMA supabase_migrations`);
  await c.query(`CREATE TABLE supabase_migrations.schema_migrations (
    version TEXT PRIMARY KEY, name TEXT, checksum TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(), recorded_by TEXT)`);

  let built = 0;
  for (const t of ORDER) {
    if (SKIP.has(t)) continue;
    const sql = ddl(t);
    if (!sql) { console.log(`  (production has no ${t})`); continue; }
    await c.query(sql);
    built++;
  }
  console.log(`  built ${built} pre-existing tables from the measurement`);

  // 009 records 006 on the evidence that public.consume_ai_call() exists.
  // The OpenAPI measurement describes TABLES, not FUNCTIONS, so without this
  // the rehearsal silently under-reports the ledger by one row.
  //
  // Production really does have it: calling the RPC with its true signature
  // (p_user_id UUID) returns a FOREIGN KEY violation against auth.users,
  // which only a function that exists and ran can produce. A 404 would have
  // been ambiguous, since PostgREST matches on signature.
  //
  // Only the signature matters here, so the body is a stub.
  await c.query(`
    CREATE FUNCTION public.consume_ai_call(p_user_id UUID) RETURNS INTEGER
    LANGUAGE sql AS $fn$ SELECT 0 $fn$;`);
  console.log("  + consume_ai_call() stub, so 009 can evidence 006\n");

  const who = await c.query(`SELECT id::text AS id FROM auth.users LIMIT 1`);
  const uid = who.rowCount ? who.rows[0].id : "11111111-2222-3333-4444-555555555555";
  await c.query(
    `INSERT INTO public.user_data (id, board, grade, target_exam, interests, "aiProfile", exams, updated_at)
     VALUES ($1, 'CBSE', '12', 'JEE', ARRAY['Physics','Maths']::text[],
             '{"tone":"direct"}'::jsonb,
             '[{"name":"Midterm","subject":"Physics","date":"2026-09-01","board":"CBSE"}]'::jsonb,
             now())`, [uid]);

  for (const p of parts) {
    process.stdout.write(`  ${p} ... `);
    try {
      await c.query(fs.readFileSync(`supabase/pending/${p}`, "utf8"));
      console.log("ok");
    } catch (e) {
      console.log("FAILED");
      console.log(`\n    ${e.message.split("\n")[0]}`);
      if (e.hint) console.log(`    HINT:  ${e.hint.split("\n")[0]}`);
      if (e.where) console.log(`    WHERE: ${e.where.split("\n")[0].slice(0, 200)}`);
      failed = p;
      break;
    }
  }

  if (!failed) {
    const got = await c.query(
      `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`);
    const have = new Set(got.rows.map((r) => r.version));
    const want = fs.readdirSync("supabase/migrations")
      // 004b is a real, deliberate migration. A three-digit-only pattern
      // silently dropped it, which made a correct ledger look like it held a
      // spurious extra row.
      .filter((f) => /^\d{3}[a-z]?_.*\.sql$/.test(f))
      .map((f) => f.match(/^(\d{3}[a-z]?)_/)[1]).sort();
    const missing = want.filter((v) => !have.has(v));
    const extra = [...have].filter((v) => !want.includes(v)).sort();

    const tab = await c.query(
      `SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`);
    console.log(`\n  ledger rows: ${got.rowCount} of ${want.length}    public tables: ${tab.rows[0].n}`);

    if (extra.length) {
      // A recorded version with no file behind it. Worth surfacing rather
      // than tolerating: the ledger is meant to describe the repo.
      const rows = await c.query(
        `SELECT version, name, recorded_by FROM supabase_migrations.schema_migrations
         WHERE version = ANY($1)`, [extra]);
      console.log(`  RECORDED WITH NO FILE: ${rows.rows.map(
        (r) => `${r.version} (${r.name}, by ${r.recorded_by})`).join("; ")}`);
      failed = "the ledger records a version the repo does not contain";
    }

    if (missing.length) {
      // Not cosmetic. 009 records 000-008 only where the catalogue proves the
      // objects exist, so a missing version means the rehearsal did not
      // reproduce something production has - and therefore did not really
      // rehearse it.
      console.log(`  NOT RECORDED: ${missing.join(", ")}`);
      console.log("  Every version should be recorded. A gap means this harness is");
      console.log("  missing a table 009's evidence probes look for.");
      failed = "the ledger is incomplete";
    }

    // The V1 surface. There is deliberately no `today_items`: architecture
    // B.12 says "Today owns no facts. It is a projection with a cache and one
    // durable field, students.last_seen_at", so 033 adds that column and
    // mark_today_seen() rather than a table. Checking for a today table would
    // be checking for something the design explicitly refuses to build.
    console.log("\n  the V1 tables the product needs:");
    for (const t of ["personal_model", "mistake_resolutions", "academic_record",
      "recommendations"]) {
      const r = await c.query(`SELECT to_regclass('public.${t}') IS NOT NULL AS e`);
      if (!r.rows[0].e) failed = `${t} was not created`;
      console.log(`    ${t.padEnd(22)} ${r.rows[0].e ? "created" : "STILL MISSING"}`);
    }
    // 033's durable field, which stands in for a today table.
    const ls = await c.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='students'
          AND column_name='last_seen_at') AS e`);
    console.log(`    ${"students.last_seen_at".padEnd(22)} ${ls.rows[0].e ? "created" : "STILL MISSING"}`);
    if (!ls.rows[0].e) failed = "students.last_seen_at was not created";
  }
} catch (e) {
  console.log(`\n  harness error: ${e.message.split("\n")[0]}`);
  failed = failed || "the harness itself";
} finally {
  await c.query("ROLLBACK");
}

const ok = await c.query(
  `SELECT to_regclass('public.user_data') IS NOT NULL AS live,
          to_regclass('public__aside.user_data') IS NOT NULL AS stuck`);
console.log(`\nstaging restored: public.user_data ${ok.rows[0].live ? "present" : "MISSING"}, `
  + `leftover __aside: ${ok.rows[0].stuck ? "YES - INVESTIGATE" : "none"}`);

await c.end();
console.log(failed
  ? `\nA user pasting ${failed} would have hit that.`
  : "\nAll six parts apply cleanly to production's measured shape.");
process.exit(failed ? 1 : 0);
