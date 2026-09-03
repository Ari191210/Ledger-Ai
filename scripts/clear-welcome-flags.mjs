// CLEAR THE FALSE welcomeSent FLAGS.
//
//   node scripts/clear-welcome-flags.mjs            # dry run
//   node scripts/clear-welcome-flags.mjs --commit   # apply
//
// WHY. /api/welcome is idempotent on app_metadata.welcomeSent, and that flag
// is written only after resend.emails.send() returns without error. Syed and
// Riddhi both carry it and both received nothing: their sends were ACCEPTED by
// the provider and then never arrived, because the key was later revoked or
// the message was dropped.
//
// So the flag records the wrong fact. It says "this student was welcomed" when
// what happened was "the API call returned". Until it is cleared, a requeue
// calls the endpoint, gets {skipped:true}, marks the job done, and sends
// nothing: the same silent failure in a new costume.
//
// SAFETY. Only accounts that (a) have a FAILED welcome job and (b) carry the
// flag are touched. An account that genuinely received its email has no failed
// job, so it can never be selected here. Nothing else in app_metadata is
// altered: the flag is removed and every other key is preserved.
import fs from "node:fs";

const COMMIT = process.argv.includes("--commit");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => { const i = l.indexOf("="); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] : null; })
    .filter(Boolean),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };

const jobs = await (await fetch(`${SB}/rest/v1/jobs?select=status,payload&type=eq.send-welcome&limit=300`, { headers: h })).json();
const isFixture = n => /^[a-z0-9]{1,8}[-_]\d{10,}$/i.test(String(n ?? ""));

// Only real people whose welcome job FAILED.
const ids = [...new Set(
  jobs.filter(j => j.status === "failed" && !isFixture(j.payload?.name))
      .map(j => j.payload?.userId).filter(Boolean),
)];

console.log(`accounts with a failed welcome job: ${ids.length}\n`);

const toClear = [];
for (const id of ids) {
  const u = await (await fetch(`${SB}/auth/v1/admin/users/${id}`, { headers: h })).json();
  const name = u.user_metadata?.full_name ?? u.user_metadata?.name ?? "(unnamed)";
  const flagged = !!u.app_metadata?.welcomeSent;
  console.log(`  ${flagged ? "FLAGGED " : "clean   "} ${name}`);
  if (flagged) toClear.push({ id, name, meta: u.app_metadata ?? {} });
}

if (!toClear.length) { console.log("\nnothing to clear."); process.exit(0); }
console.log(`\n${toClear.length} account(s) would have their welcomeSent flag removed.`);

if (!COMMIT) {
  console.log("\nDRY RUN. Nothing was written. Re-run with --commit to apply.");
  process.exit(0);
}

for (const t of toClear) {
  // Preserve every other key; remove only this one.
  const { welcomeSent, ...rest } = t.meta;
  const r = await fetch(`${SB}/auth/v1/admin/users/${t.id}`, {
    method: "PUT",
    headers: h,
    body: JSON.stringify({ app_metadata: { ...rest, welcomeSent: null } }),
  });
  console.log(`  ${r.ok ? "cleared" : `FAILED (${r.status})`}: ${t.name}`);
}

console.log("\nDone. Run scripts/requeue-welcome.mjs to confirm the blocker is gone.");
