/**
 * Register studyledger.in in a specific Resend/SES region and print the DNS
 * records it wants.
 *
 * Why regions matter here: Resend is backed by SES, and an SES identity is
 * per-region. us-east-1 hands back a DKIM keypair that is stuck failing
 * verification even with byte-perfect DNS, and deleting/recreating in the same
 * region returns the *same* key, so it cannot clear. A different region is a
 * different identity, and may issue a different key.
 *
 *   node scripts/resend-create-domain-region.mjs ap-northeast-1
 */

import fs from "node:fs";

const key = fs.readFileSync(".env.local", "utf8").match(/^RESEND_API_KEY=(.+)$/m)[1].trim();
const region = process.argv[2];

if (!region) {
  console.error("usage: resend-create-domain-region.mjs <region>");
  console.error("regions: us-east-1 | eu-west-1 | sa-east-1 | ap-northeast-1");
  process.exit(1);
}

const res = await fetch("https://api.resend.com/domains", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "studyledger.in", region }),
});
const body = await res.json();

console.log("HTTP", res.status, "| region:", body.region, "| id:", body.id);
for (const r of body.records ?? []) {
  console.log(`  ${r.record.padEnd(5)} ${r.type.padEnd(4)} ${r.name.padEnd(18)} ${r.value}`);
}
