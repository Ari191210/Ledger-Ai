// ═══════════════════════════════════════════════════════════════════════════
// Will 029's parent_exams_view survive production's user_data?
//
// The sweep flagged 029 as UNGUARDED: it does `u.id::uuid` and
// `jsonb_array_elements(COALESCE(u.exams, '[]'::jsonb))` with no catalogue
// probe. Production's `id` is TEXT and `exams` came back as an array over
// PostgREST, which cannot distinguish text[] from a jsonb array - the exact
// ambiguity that broke 012.
//
// So test it rather than reason about it. Same method as verify-012-shapes:
// rename the real table aside, build production's shape, run the ACTUAL DO
// block, always ROLLBACK.
//
//   node scripts/verify-029-exams.mjs
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  fs.readFileSync(".env.staging.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const SQL = fs.readFileSync("supabase/migrations/029_parent_space.sql", "utf8");
const i = SQL.indexOf("CREATE OR REPLACE VIEW public.parent_exams_view");
if (i < 0) throw new Error("parent_exams_view not found in 029");
const s0 = SQL.lastIndexOf("DO $$", i);
const e0 = SQL.indexOf("END $$;", i);
const BLOCK = SQL.slice(s0, e0 + "END $$;".length);

/** Production's real shape, plus the neighbouring cases. */
const SHAPES = {
  "PRODUCTION as probed: TEXT id, jsonb exams": {
    id: "TEXT", exams: "JSONB",
    val: `'[{"name":"Midterm","subject":"Physics","date":"2026-09-01","board":"CBSE"}]'::jsonb`,
  },
  "TEXT id, exams is text[] (the 012 failure mode)": {
    id: "TEXT", exams: "TEXT[]", val: `ARRAY['Midterm']::text[]`,
  },
  "TEXT id, exams absent entirely": { id: "TEXT", exams: null, val: null },
  "UUID id, jsonb exams (staging)": {
    id: "UUID", exams: "JSONB",
    val: `'[{"name":"Midterm","subject":"Physics","date":"2026-09-01","board":"CBSE"}]'::jsonb`,
  },
  "TEXT id holding a NON-uuid value": {
    id: "TEXT", exams: "JSONB", val: `'[]'::jsonb`, junkId: true,
  },
};

const c = new pg.Client({
  connectionString: env.STAGING_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

let failures = 0;
for (const [name, shape] of Object.entries(SHAPES)) {
  await c.query("BEGIN");
  try {
    await c.query(`ALTER TABLE public.user_data RENAME TO user_data__aside`);
    const cols = [`id ${shape.id} PRIMARY KEY`, shape.exams ? `exams ${shape.exams}` : null]
      .filter(Boolean).join(", ");
    await c.query(`CREATE TABLE public.user_data (${cols})`);

    const id = shape.junkId ? "'not-a-uuid'" : `'11111111-2222-3333-4444-555555555555'${shape.id === "UUID" ? "::uuid" : ""}`;
    if (shape.exams) {
      await c.query(`INSERT INTO public.user_data (id, exams) VALUES (${id}, ${shape.val})`);
    } else {
      await c.query(`INSERT INTO public.user_data (id) VALUES (${id})`);
    }

    await c.query(BLOCK);
    // Creating the view is lazy; SELECTing is what actually evaluates it.
    const r = await c.query(`SELECT * FROM public.parent_exams_view`);
    console.log(`  ok   ${name}\n         view built and returned ${r.rowCount} row(s)`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n         ${e.message.split("\n")[0]}`);
  } finally {
    await c.query("ROLLBACK");
  }
}

const aside = await c.query(`SELECT to_regclass('public.user_data__aside') IS NOT NULL AS e`);
console.log(`\nstaging intact: leftover __aside: ${aside.rows[0].e ? "YES - INVESTIGATE" : "none"}`);
await c.end();
console.log(failures ? `${failures} shape(s) fail 029.` : "029 survives every shape.");
process.exit(failures ? 1 : 0);
