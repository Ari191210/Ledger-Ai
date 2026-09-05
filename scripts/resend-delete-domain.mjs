/**
 * Delete one Resend domain identity by id.
 *
 * The account ended up with two `studyledger.in` identities: an April one in
 * ap-northeast-1 and a newer us-east-1 one. Only one `resend._domainkey` TXT
 * record can exist, so whichever identity's key is not in DNS is dead weight
 * that still reports "verified" from a cached check.
 *
 *   node scripts/resend-delete-domain.mjs <id> --confirm
 */

import fs from "node:fs";

const key = fs.readFileSync(".env.local", "utf8").match(/^RESEND_API_KEY=(.+)$/m)[1].trim();
const h = { Authorization: `Bearer ${key}` };

const [id, confirm] = process.argv.slice(2);
if (!id) {
  console.error("usage: resend-delete-domain.mjs <id> --confirm");
  process.exit(1);
}

const detail = await (await fetch(`https://api.resend.com/domains/${id}`, { headers: h })).json();
if (detail.statusCode || !detail.name) {
  console.error("could not read that domain:", JSON.stringify(detail));
  process.exit(1);
}

console.log(`about to delete: ${detail.name}  region=${detail.region}  status=${detail.status}  id=${detail.id}`);

if (confirm !== "--confirm") {
  console.log("dry run. re-run with --confirm to actually delete.");
  process.exit(0);
}

const res = await fetch(`https://api.resend.com/domains/${id}`, { method: "DELETE", headers: h });
console.log("delete status:", res.status, await res.text());
