// Does PRODUCTION's Resend key work now? The preflight reads .env.local, which
// the founder would not have touched, so it cannot answer this.
//
// /api/welcome accepts a signed-in student calling for their OWN id, so a real
// session is enough to make production attempt a send with whatever key Vercel
// holds. The address is @studyledger-test.invalid, a reserved TLD that can
// never reach a mailbox, and the account is deleted afterwards.
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => { const i = l.indexOf("="); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] : null; })
    .filter(Boolean),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY;

const stamp = Date.now();
const EMAIL = `journey-${stamp}@studyledger-test.invalid`;
const PASSWORD = `Jr!${stamp}aA`;

const mk = await fetch(`${SB}/auth/v1/admin/users`, {
  method: "POST",
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: `journey-${stamp}` } }),
});
const user = await mk.json();

const si = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const TOKEN = (await si.json()).access_token;

const r = await fetch("https://www.studyledger.in/api/welcome", {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ userId: user.id, name: `journey-${stamp}` }),
});
const body = await r.text();

console.log(`production /api/welcome -> ${r.status}`);
console.log(body.slice(0, 240));

if (r.ok && !/skipped/.test(body)) {
  console.log("\n=> PRODUCTION CAN SEND MAIL. The new key is live and working.");
  console.log("   The three real students can now be requeued.");
} else if (/API key is invalid/i.test(body)) {
  console.log("\n=> Still rejected. Either the key was not saved to the PRODUCTION");
  console.log("   environment, or the deployment predates it: Vercel bakes env at");
  console.log("   build time, so a new value needs a redeploy to take effect.");
} else {
  console.log("\n=> Read the body above; the status alone is not conclusive.");
}

await fetch(`${SB}/auth/v1/admin/users/${user.id}`, {
  method: "DELETE",
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
});
console.log("\ntest account removed.");
