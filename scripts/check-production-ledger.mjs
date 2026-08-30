// What does PRODUCTION's ledger actually say right now?
//
// The user pasted a result header with no rows, which is ambiguous: it could
// mean a part ran and returned nothing, or that they are partway through. The
// database is the only thing that can answer, so ask it rather than infer.
//
// 009 creates supabase_migrations.schema_migrations and a service-role-only
// migration_ledger() RPC. Before 009 runs, neither exists - and that absence
// is itself the answer.
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const H = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};
const U = env.NEXT_PUBLIC_SUPABASE_URL;

// 1. The RPC 009 installs.
const rpc = await fetch(`${U}/rest/v1/rpc/migration_ledger`, {
  method: "POST", headers: H, body: "{}",
});
if (rpc.ok) {
  const rows = await rpc.json();
  console.log(`migration_ledger() returned ${rows.length} row(s):\n`);
  for (const r of rows) {
    console.log(`  ${r.version}  ${(r.name || "").padEnd(38)} ${r.recorded_by || ""}`);
  }
} else {
  console.log("migration_ledger() not callable:", rpc.status);
  console.log((await rpc.text()).slice(0, 160));
  console.log("\n-> 009 has not run, so no part has been applied yet.");
}

// 2. Independent of the ledger: do the tables each part creates exist?
//
// The table names are DERIVED from the migration files rather than typed from
// memory. My first version guessed `concept_identity` from the filename
// 013_concept_identity.sql, but that migration creates `concept_aliases`, so
// a correctly applied part looked incomplete. Reading the CREATE TABLE
// statements removes that whole class of false alarm.
const PARTS = {
  "part-01": ["008", "009", "010", "011", "012", "013"],
  "part-02": ["014", "015", "016"],
  "part-03": ["017", "018", "019", "020", "021", "022"],
  "part-04": ["023", "024", "025"],
  "part-05": ["026", "027", "028", "029", "030"],
  "part-06": ["031", "032", "033", "034", "035"],
};

const files = fs.readdirSync("supabase/migrations");
const tablesOf = (version) => {
  const f = files.find((x) => x.startsWith(`${version}_`));
  if (!f) return [];
  const s = fs.readFileSync(`supabase/migrations/${f}`, "utf8");
  return [...s.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([\w.]+)/gi)]
    .map((m) => m[1])
    // Partitions are created by their parent, and anything qualified into
    // another schema (009's supabase_migrations.schema_migrations) is not
    // exposed over PostgREST, so neither is separately probeable here.
    .filter((t) => !/_p$/.test(t) && !t.includes("."));
};

console.log("\nwhat actually exists, part by part:");
for (const [part, versions] of Object.entries(PARTS)) {
  const wanted = [...new Set(versions.flatMap(tablesOf))];
  const absent = [];
  for (const t of wanted) {
    const r = await fetch(`${U}/rest/v1/${t}?select=*&limit=1`, { headers: H });
    // 404 means no such relation; 401/403 would mean it exists but is barred.
    if (r.status === 404) absent.push(t);
  }
  const state = absent.length === 0 ? "APPLIED" : absent.length === wanted.length ? "pending" : "PARTIAL";
  console.log(`  ${state.padEnd(8)} ${part}  ${wanted.length} tables`
    + (absent.length && absent.length < wanted.length ? `, missing: ${absent.join(", ")}` : ""));
}
