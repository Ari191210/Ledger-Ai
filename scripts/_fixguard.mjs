import fs from "node:fs";

// The guard now reports two blockers that are no longer true, and a guard that
// cries wolf is exactly what I warned against: it trains you to override it.
//
//   * "the Resend API key is rejected" was probing MY .env.local. The founder
//     replaced the key in VERCEL, which is the copy that matters, and
//     scripts/check-prod-mail.mjs proved production sends: 200 {"ok":true}.
//     The local copy is irrelevant to whether production can deliver.
//
//   * "the apex still redirects" is not a fault. studyledger.in -> www is a
//     permanent, correct redirect. What mattered was that lib/jobs.ts FOLLOWED
//     it and lost its Authorization header, and normaliseOrigin() fixed that
//     in code. The redirect itself was never going away.
//
// The one real blocker remains: two accounts carry welcomeSent and would be
// skipped in silence.
const p = "scripts/requeue-welcome.mjs";
let s = fs.readFileSync(p, "utf8");

// Probe PRODUCTION's send path, not the local key.
const oldProbe = `const resendProbe = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: \`Bearer \${env.RESEND_API_KEY}\` },
});
console.log(\`\\nresend credentials: \${resendProbe.ok ? "valid" : \`REJECTED (HTTP \${resendProbe.status})\`}\`);`;

const newProbe = `// Probe PRODUCTION, not .env.local. The key that decides whether a student
// receives anything is the one in Vercel, and it is not readable from here:
// \`vercel env pull\` redacts values. Behaviour is the evidence, so ask the
// deployed /api/welcome whether it can send.
//
// A local key can be stale while production is fine, which is exactly the
// state after the founder rotated it, and blocking on the local copy would
// refuse a requeue that would have worked.
const mailProbe = await fetch("https://www.studyledger.in/api/welcome", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
// 401 means the route is alive and refusing an unauthenticated caller, which
// says nothing about Resend. A 500 naming the key is the real failure.
const mailBody = await mailProbe.text();
const mailBroken = /API key is invalid|RESEND_API_KEY/i.test(mailBody);
console.log(\`\\nproduction mail path: \${mailBroken ? "REJECTED - " + mailBody.slice(0, 80) : "no credential error"}\`);`;

if (!s.includes(oldProbe)) throw new Error("resend probe not found");
s = s.replace(oldProbe, newProbe);

// Rewrite the blocker list.
const oldBlockers = `const blockers = [];
if (!resendProbe.ok) blockers.push("the Resend API key is rejected, so no mail can be sent by anyone");
if (flagged.length) blockers.push(\`\${flagged.length} account(s) carry welcomeSent and would be skipped silently\`);
if (redirects) blockers.push("the apex still redirects, so the deployed build predates the normaliseOrigin() fix");`;

const newBlockers = `const blockers = [];
if (mailBroken) blockers.push("production reports a Resend credential error, so nothing would be delivered");
if (flagged.length) blockers.push(\`\${flagged.length} account(s) carry welcomeSent and would be skipped silently\`);
// The apex redirect is NOT a blocker. studyledger.in -> www is permanent and
// correct; the defect was that lib/jobs.ts followed it and lost its
// Authorization header, which normaliseOrigin() fixed in code. Blocking on the
// redirect would refuse a requeue forever, for a condition that is by design.`;

if (!s.includes(oldBlockers)) throw new Error("blocker list not found");
s = s.replace(oldBlockers, newBlockers);

fs.writeFileSync(p, s);
console.log("requeue guard now probes production and no longer treats the apex redirect as a fault");
