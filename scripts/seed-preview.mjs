// Seeds realistic demo data for preview@studyledger.test so the dashboard
// and /score have something real to render. Dev-only, service-role key.
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
const URL = get("NEXT_PUBLIC_SUPABASE_URL");
const KEY = get("SUPABASE_SERVICE_ROLE_KEY");

async function findUserId(email) {
  const r = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const j = await r.json();
  const u = (j.users || []).find((x) => x.email === email);
  if (!u) throw new Error("user not found: " + email);
  return u.id;
}

async function insert(table, rows) {
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`${table} insert failed: ${r.status} ${await r.text()}`);
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const userId = await findUserId("preview@studyledger.test");
console.log("seeding for", userId);

// ── activity: 16-day current streak + a scattered earlier week ─────────
const activity = [];
for (let i = 0; i < 16; i++) {
  activity.push({ user_id: userId, day: isoDaysAgo(i), minutes: 30 + Math.round(Math.random() * 60) });
}
for (const i of [19, 20, 22, 25]) {
  activity.push({ user_id: userId, day: isoDaysAgo(i), minutes: 20 + Math.round(Math.random() * 40) });
}
await insert("activity_days", activity);
console.log("activity_days:", activity.length);

// ── PYQ attempts: ~78% accuracy over 30 days ────────────────────────────
const subjects = ["Physics", "Chemistry", "Maths"];
const pyq = [];
for (let i = 0; i < 14; i++) {
  const total = 10 + Math.round(Math.random() * 10);
  const correct = Math.round(total * (0.68 + Math.random() * 0.2));
  pyq.push({
    user_id: userId,
    subject: subjects[i % subjects.length],
    topic: null,
    total,
    correct,
    taken_at: new Date(Date.now() - i * 2 * 86400000).toISOString(),
  });
}
await insert("pyq_attempts", pyq);
console.log("pyq_attempts:", pyq.length);

// ── mistakes: matches the old Fix-next demo topics, mostly open ────────
const mistakeSeed = [
  ["Physics", "Rotational motion", 6],
  ["Chemistry", "Mole concept", 4],
  ["Maths", "Definite integrals", 3],
  ["Physics", "Thermodynamics", 2],
];
const mistakes = [];
let day = 0;
for (const [subject, topic, count] of mistakeSeed) {
  for (let i = 0; i < count; i++) {
    mistakes.push({
      user_id: userId,
      subject,
      topic,
      note: null,
      source: "practice",
      created_at: new Date(Date.now() - (day % 9) * 86400000).toISOString(),
    });
    day++;
  }
}
await insert("mistakes", mistakes);
console.log("mistakes:", mistakes.length);

// ── syllabus: ~50 topics, 64% covered ───────────────────────────────────
const syllabus = [];
let pos = 0;
for (const subject of subjects) {
  for (let i = 1; i <= 17; i++) {
    syllabus.push({
      user_id: userId,
      subject,
      topic: `${subject} chapter ${i}`,
      covered: Math.random() < 0.64,
      position: pos++,
    });
  }
}
await insert("syllabus_topics", syllabus);
console.log("syllabus_topics:", syllabus.length);

console.log("done");
