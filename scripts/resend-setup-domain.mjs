import fs from "node:fs";

const envText = fs.readFileSync(".env.local", "utf8");
const match = envText.match(/^RESEND_API_KEY=(.+)$/m);
if (!match) {
  console.error("RESEND_API_KEY not found in .env.local");
  process.exit(1);
}
const key = match[1].trim();

const res = await fetch("https://api.resend.com/domains", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "studyledger.in" }),
});
const body = await res.json();
console.log("status:", res.status);
console.log(JSON.stringify(body, null, 2));
