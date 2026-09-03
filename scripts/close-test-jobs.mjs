// My verification runs enqueued welcome jobs for throwaway accounts. Those
// accounts are deleted, so the jobs can never succeed: they would retry three
// times each and settle as `failed`, permanently polluting the queue that
// tells us whether real students got their email.
//
// Closing them is the honest cleanup: `done` with the reason recorded, never
// deleted (K.4), and only rows whose name is a <prefix>-<epoch> fixture.
import fs from "node:fs";

const COMMIT = process.argv.includes("--commit");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => { const i = l.indexOf("="); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] : null; })
    .filter(Boolean),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const api = async (path, init = {}) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.status === 204 ? null : r.json();
};

const jobs = await api("jobs?select=id,type,status,payload&type=eq.send-welcome&limit=300");
const isFixture = n => /^[a-z0-9]{1,8}[-_]\d{10,}$/i.test(String(n ?? ""));

const open = jobs.filter(j => isFixture(j.payload?.name) && (j.status === "pending" || j.status === "running"));

console.log(`welcome jobs: ${jobs.length}`);
console.log(`fixture rows still open: ${open.length}`);

if (!open.length) { console.log("\nnothing to close."); process.exit(0); }
if (!COMMIT) {
  console.log("\nDRY RUN. Re-run with --commit to close them.");
  process.exit(0);
}

for (const j of open) {
  await api(`jobs?id=eq.${j.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "done",
      error: "cancelled: verification fixture, its account no longer exists",
      completed_at: new Date().toISOString(),
    }),
  });
}
console.log(`\nclosed ${open.length} fixture row(s). Nothing was deleted.`);
