// ═══════════════════════════════════════════════════════════════════════════
// Capture production's exact schema, from PostgREST's OpenAPI spec.
//
// This is the authoritative source I should have used from the start.
// PostgREST derives the spec from the real catalogue, so it reports declared
// types directly - `interests text[]`, `id text` - with none of the ambiguity
// that made `select=*` and the `->` arrow probe useless.
//
// The output is written to supabase/production-schema.json so the rehearsal
// harness builds production's shape from MEASUREMENT rather than from my
// transcription of it.
//
//   node scripts/capture-production-schema.mjs
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const U = env.NEXT_PUBLIC_SUPABASE_URL;

const spec = await (await fetch(`${U}/rest/v1/`, { headers: H })).json();

/** OpenAPI format -> a Postgres type the harness can CREATE TABLE with. */
const pgType = (meta) => {
  const f = meta.format || meta.type;
  if (f === "timestamp with time zone") return "TIMESTAMPTZ";
  if (f === "timestamp without time zone") return "TIMESTAMP";
  if (f === "character varying") return "TEXT";
  if (f === "double precision") return "DOUBLE PRECISION";
  if (f === "ARRAY") return "TEXT[]";
  return f.toUpperCase();
};

const out = { captured_at: new Date().toISOString(), url: U, tables: {} };

for (const [name, def] of Object.entries(spec.definitions || {})) {
  if (!def.properties) continue;
  out.tables[name] = Object.fromEntries(
    Object.entries(def.properties).map(([col, meta]) => [col, {
      type: pgType(meta),
      pk: /primary key/i.test(meta.description || ""),
      required: (def.required || []).includes(col),
    }]),
  );
}

fs.writeFileSync("supabase/production-schema.json", JSON.stringify(out, null, 2) + "\n");
const names = Object.keys(out.tables).sort();
console.log(`captured ${names.length} tables from production`);
console.log(names.join(", "));

// The V1 tables the product needs, and whether production has them yet.
// NOTE: there is deliberately no `today_items`. Architecture B.12: "Today
// owns no facts. It is a projection with a cache and one durable field,
// students.last_seen_at." 033 adds that column and one function, no table.
console.log("\nV1 tables:");
for (const t of ["personal_model", "mistake_resolutions", "academic_record",
  "recommendations"]) {
  console.log(`  ${t.padEnd(22)} ${out.tables[t] ? "present" : "ABSENT"}`);
}
