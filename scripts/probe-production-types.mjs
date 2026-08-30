// ═══════════════════════════════════════════════════════════════════════════
// Ask PRODUCTION for its real column types.
//
// Two earlier attempts were not evidence:
//   · `select=*` - PostgREST serialises text[] and a jsonb array identically.
//   · the `->` arrow probe - a CONTROL against staging columns whose types I
//     already knew showed it ACCEPTS a known text[], so it proves nothing.
//
// The user's error is the only ground truth so far:
//     function jsonb_typeof(text[]) does not exist
//
// PostgREST cannot run arbitrary SQL, but it CAN sort by a column, and
// `order=` is resolved against the real column. More usefully, an equality
// filter carries the type in the error text: filtering a text[] column with a
// scalar produces a message naming the actual type. That message is the
// evidence.
//
// Read-only. No writes, no DDL.
//
//   node scripts/probe-production-types.mjs
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const COLS = ["interests", "exams", "aiProfile", "marks", "weakTopics", "plan", "focus", "blob", "id"];

/**
 * `cs` (contains) is the array containment operator @>. On a jsonb column
 * PostgREST sends jsonb @> jsonb; on text[] it sends text[] @> text[]. Feed
 * it a value that is valid for one and not the other and the error names the
 * type it actually tried to use.
 */
console.log("production, via error messages that name the real type:\n");
for (const col of COLS) {
  // A scalar equality against an array/jsonb column produces a type error
  // that quotes the column's declared type.
  const r = await fetch(
    `${U}/rest/v1/user_data?select=id&${encodeURIComponent(col)}=eq.zzz&limit=1`,
    { headers: H },
  );
  const body = await r.text();
  if (r.ok) {
    console.log(`  ${col.padEnd(12)} accepted a scalar = filter (likely a plain scalar column)`);
    continue;
  }
  const msg = (body.match(/"message":"([^"]+)"/) || [])[1] || body.slice(0, 120);
  const det = (body.match(/"details":"([^"]*)"/) || [])[1] || "";
  const named = msg.match(/\b(jsonb|json|text\[\]|uuid|text|character varying|timestamp[a-z ]*)\b/);
  console.log(`  ${col.padEnd(12)} ${named ? "TYPE: " + named[1] : "?"}   ${msg.slice(0, 84)}`);
  if (det) console.log(`  ${" ".repeat(12)} ${det.slice(0, 84)}`);
}
