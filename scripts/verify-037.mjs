// 037 is in the ledger. But a ledger row is a CLAIM; the constraint either
// enforces or it does not. Prove it by writing a status no vocabulary would
// contain and seeing it refused.
//
// This is the same probe that originally proved the constraint was MISSING:
// back then production accepted 'not-a-real-status-xyzzy'. If it is refused
// now, the repair is real.
//
// Creates one throwaway row and deletes it.
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => { const i = l.indexOf("="); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] : null; })
    .filter(Boolean),
);
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY;

const h = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };

const mk = await fetch(`${U}/rest/v1/jobs`, {
  method: "POST",
  headers: { ...h, Prefer: "return=representation" },
  body: JSON.stringify({
    type: "send-welcome",
    payload: { name: `probe-${Date.now()}` },
    status: "pending",
    scheduled_at: new Date().toISOString(),
  }),
});
if (!mk.ok) { console.log("probe insert failed:", mk.status, (await mk.text()).slice(0, 160)); process.exit(1); }
const id = (await mk.json())[0].id;

const bad = await fetch(`${U}/rest/v1/jobs?id=eq.${id}`, {
  method: "PATCH",
  headers: h,
  body: JSON.stringify({ status: "not-a-real-status-xyzzy" }),
});
const body = bad.ok ? "" : (await bad.text()).slice(0, 180);

console.log(`writing an arbitrary status: ${bad.ok ? "ACCEPTED" : "REJECTED"}`);
if (body) console.log(`  ${body}`);

// A legitimate status must still be accepted, or the constraint is too tight.
const good = await fetch(`${U}/rest/v1/jobs?id=eq.${id}`, {
  method: "PATCH", headers: h, body: JSON.stringify({ status: "done" }),
});
console.log(`writing a legitimate status: ${good.ok ? "ACCEPTED" : `REJECTED (${good.status}) - TOO TIGHT`}`);

await fetch(`${U}/rest/v1/jobs?id=eq.${id}`, { method: "DELETE", headers: h });

console.log(
  !bad.ok && good.ok
    ? "\n=> 037 IS ENFORCING. A typo can no longer strand a job invisibly."
    : "\n=> Something is off; read the two lines above.",
);
