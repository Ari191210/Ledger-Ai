import fs from "node:fs";

const envText = fs.readFileSync(".env.local", "utf8");
const match = envText.match(/^RESEND_API_KEY=(.+)$/m);
const key = match[1].trim();

const listRes = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: `Bearer ${key}` },
});
const list = await listRes.json();
const domain = list.data?.find((d) => d.name === "studyledger.in");
if (!domain) {
  console.log("domain not found in Resend account");
  process.exit(1);
}
const detailRes = await fetch(`https://api.resend.com/domains/${domain.id}`, {
  headers: { Authorization: `Bearer ${key}` },
});
const detail = await detailRes.json();
console.log("status:", detail.status);
for (const r of detail.records) {
  console.log(`  ${r.record.padEnd(6)} ${r.name.padEnd(20)} -> ${r.status}`);
}
