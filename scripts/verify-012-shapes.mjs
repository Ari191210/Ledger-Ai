// ═══════════════════════════════════════════════════════════════════════════
// Does 012's backfill survive every shape of user_data?
//
// The production paste failed with:
//   function jsonb_typeof(text[]) does not exist
// because `user_data.interests` is text[] in production and jsonb in staging.
// I rehearsed on staging, so I never saw it.
//
// Reading the fix is not evidence. This runs the ACTUAL DO block from the
// ACTUAL migration file against every shape production might be in.
//
// ── WHY IT RENAMES THE REAL TABLES ───────────────────────────────────────
// The DO block introspects `information_schema` for table_schema = 'public'
// and emits unqualified SQL, so a fake in a side schema is invisible to it -
// my first attempt did that and every case failed for the wrong reason.
// The fakes therefore have to occupy `public` under the real names.
//
// That is safe here only because Postgres DDL is transactional: the rename,
// the fakes, the backfill and the drop all happen inside a transaction that
// ALWAYS ends in ROLLBACK. Staging is never left altered, even on a throw.
//
//   node scripts/verify-012-shapes.mjs
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  fs.readFileSync(".env.staging.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const SQL = fs.readFileSync("supabase/migrations/012_students_and_profiles.sql", "utf8");
const s0 = SQL.search(/DO \$\$\r?\nDECLARE\r?\n  has_created_at/);
if (s0 < 0) throw new Error("could not locate the backfill DO block");
const e0 = SQL.indexOf("END $$;", s0);
const BACKFILL = SQL.slice(s0, e0 + "END $$;".length);

/**
 * `staging` is what I rehearsed against and passed. `production` is what just
 * failed. The rest are neighbouring cases the same blind spot would hide.
 */
const SHAPES = {
  "staging: jsonb interests, jsonb aiProfile, uuid id": {
    id: "UUID", interests: "JSONB", ai: "JSONB", created_at: true, exam: "targetExam",
    interestsVal: `'["cricket","music"]'::jsonb`, aiVal: `'{"tone":"direct"}'::jsonb`,
    expectSubjects: ["cricket", "music"],
  },
  "PRODUCTION: text[] interests, TEXT id, no created_at": {
    id: "TEXT", interests: "TEXT[]", ai: "JSONB", created_at: false, exam: "targetExam",
    interestsVal: `ARRAY['cricket','music']::text[]`, aiVal: `'{"tone":"direct"}'::jsonb`,
    expectSubjects: ["cricket", "music"],
  },
  "text[] interests + TEXT aiProfile holding JSON": {
    id: "TEXT", interests: "TEXT[]", ai: "TEXT", created_at: false, exam: "target_exam",
    interestsVal: `ARRAY['cricket']::text[]`, aiVal: `'{"tone":"direct"}'`,
    expectSubjects: ["cricket"],
  },
  "text[] interests + TEXT aiProfile holding junk (must not abort)": {
    id: "TEXT", interests: "TEXT[]", ai: "TEXT", created_at: false, exam: "target_exam",
    interestsVal: `ARRAY['cricket']::text[]`, aiVal: `'not json at all'`,
    expectSubjects: ["cricket"], expectAiNull: true,
  },
  "empty array is nothing collected": {
    id: "TEXT", interests: "TEXT[]", ai: "JSONB", created_at: true, exam: "target_exam",
    interestsVal: `ARRAY[]::text[]`, aiVal: `NULL::jsonb`,
    expectSubjects: null,
  },
  "json rather than jsonb": {
    id: "UUID", interests: "JSON", ai: "JSON", created_at: true, exam: "target_exam",
    interestsVal: `'["cricket"]'::json`, aiVal: `'{"tone":"warm"}'::json`,
    expectSubjects: ["cricket"],
  },
  "neither column present at all": {
    id: "TEXT", interests: null, ai: null, created_at: false, exam: "target_exam",
    expectSubjects: null,
  },
};

const UID = "11111111-2222-3333-4444-555555555555";
const REAL = ["user_data", "students", "student_profiles"];

const c = new pg.Client({
  connectionString: env.STAGING_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

let failures = 0;

for (const [name, shape] of Object.entries(SHAPES)) {
  await c.query("BEGIN");
  try {
    // Move the real tables aside. Rolled back unconditionally below.
    for (const t of REAL) {
      const ex = await c.query(`SELECT to_regclass('public.${t}') IS NOT NULL AS e`);
      if (ex.rows[0].e) await c.query(`ALTER TABLE public.${t} RENAME TO ${t}__aside`);
    }

    const cols = [
      `id ${shape.id} PRIMARY KEY`,
      "board TEXT", "grade TEXT", "stream TEXT",
      `"${shape.exam}" TEXT`,
      "updated_at TIMESTAMPTZ",
      shape.created_at ? "created_at TIMESTAMPTZ" : null,
      shape.interests ? `interests ${shape.interests}` : null,
      shape.ai ? `"aiProfile" ${shape.ai}` : null,
    ].filter(Boolean).join(", ");
    await c.query(`CREATE TABLE public.user_data (${cols})`);

    await c.query(`CREATE TABLE public.students (
      student_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await c.query(`CREATE TABLE public.student_profiles (
      student_id UUID NOT NULL, version INT NOT NULL,
      board TEXT, grade TEXT, stream TEXT, target_exam TEXT,
      subjects TEXT[], interests TEXT[], ai_profile JSONB,
      effective_from TIMESTAMPTZ NOT NULL, changed_by TEXT, change_reason TEXT,
      is_current BOOLEAN NOT NULL DEFAULT TRUE,
      PRIMARY KEY (student_id, version))`);

    // The backfill only migrates rows that exist in auth.users, so borrow a
    // real auth id. That makes the assertions about written values meaningful
    // rather than vacuous.
    const who = await c.query(`SELECT id::text AS id FROM auth.users LIMIT 1`);
    const uid = who.rowCount ? who.rows[0].id : UID;

    const names = ["id", "board", "grade", `"${shape.exam}"`, "updated_at"];
    const vals = [`'${uid}'${shape.id === "UUID" ? "::uuid" : ""}`, `'CBSE'`, `'12'`, `'JEE'`, "now()"];
    if (shape.interests) { names.push("interests"); vals.push(shape.interestsVal); }
    if (shape.ai) { names.push(`"aiProfile"`); vals.push(shape.aiVal); }
    await c.query(`INSERT INTO public.user_data (${names.join(", ")}) VALUES (${vals.join(", ")})`);

    // A malformed id must be skipped, not abort the migration.
    if (shape.id === "TEXT") {
      await c.query(`INSERT INTO public.user_data (id) VALUES ('not-a-uuid')`);
    }

    await c.query(BACKFILL);

    const got = await c.query(
      `SELECT subjects, interests, ai_profile, target_exam, board FROM public.student_profiles
       WHERE student_id = $1::uuid`, [uid],
    );

    const problems = [];
    if (who.rowCount) {
      if (got.rowCount !== 1) {
        problems.push(`expected 1 profile row, got ${got.rowCount}`);
      } else {
        const r = got.rows[0];
        // 012 documents this at "ON THE INTEREST -> SUBJECT MAPPING": the
        // retired onboarding asked "Which subjects interest you?", so the
        // answer in `user_data.interests` is a SUBJECT declaration and lands
        // in `subjects`.
        const want = shape.expectSubjects;
        const have = r.subjects;
        const same = want === null
          ? have === null
          : Array.isArray(have) && JSON.stringify(have) === JSON.stringify(want);
        if (!same) problems.push(`subjects: wanted ${JSON.stringify(want)}, got ${JSON.stringify(have)}`);
        // And `student_profiles.interests` (non-curricular, C.3) must stay
        // NULL: nothing was ever collected for it, so filling it would be
        // inventing history, which is the §7 violation 012 avoids on purpose.
        if (r.interests !== null) {
          problems.push(`interests should stay NULL per C.3, got ${JSON.stringify(r.interests)}`);
        }
        if (shape.expectAiNull && r.ai_profile !== null) {
          problems.push(`aiProfile was junk text and should not have been claimed, got ${JSON.stringify(r.ai_profile)}`);
        }
        if (r.target_exam !== "JEE") problems.push(`target_exam: got ${r.target_exam}`);
      }
    }

    const skipped = await c.query(`SELECT count(*)::int n FROM public.students`);
    if (shape.id === "TEXT" && skipped.rows[0].n > 1) problems.push("the malformed id was migrated");

    if (problems.length) {
      failures++;
      console.log(`  FAIL ${name}`);
      for (const p of problems) console.log(`         ${p}`);
    } else {
      const r = got.rows[0];
      console.log(`  ok   ${name}`);
      console.log(`         subjects=${JSON.stringify(r ? r.subjects : null)} interests=${JSON.stringify(r ? r.interests : null)} ai=${JSON.stringify(r ? r.ai_profile : null)}`);
    }
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n         ${e.message.split("\n")[0]}`);
  } finally {
    await c.query("ROLLBACK");
  }
}

// Prove the rollbacks actually restored staging.
const after = await c.query(
  `SELECT data_type FROM information_schema.columns
   WHERE table_schema='public' AND table_name='user_data' AND column_name='interests'`,
);
const aside = await c.query(`SELECT to_regclass('public.user_data__aside') IS NOT NULL AS e`);
console.log(`\nstaging intact: user_data.interests is ${after.rows[0]?.data_type ?? "ABSENT"}, `
  + `leftover __aside tables: ${aside.rows[0].e ? "YES - INVESTIGATE" : "none"}`);

await c.end();
console.log(failures === 0
  ? "All shapes resolve, including the text[] case that broke production."
  : `${failures} shape(s) still failing.`);
process.exit(failures === 0 ? 0 : 1);
