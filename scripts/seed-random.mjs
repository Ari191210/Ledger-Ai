// Wipes preview@studyledger.test's study data and reseeds it with a fresh
// randomized scenario -- different streak, accuracy, coverage, and mistake
// load every run. Dev-only, service-role key.
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
const URL = get("NEXT_PUBLIC_SUPABASE_URL");
const KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

async function findUserId(email) {
  const r = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers });
  const j = await r.json();
  const u = (j.users || []).find((x) => x.email === email);
  if (!u) throw new Error("user not found: " + email);
  return u.id;
}

async function wipe(table, userId) {
  const r = await fetch(`${URL}/rest/v1/${table}?user_id=eq.${userId}`, {
    method: "DELETE",
    headers,
  });
  if (!r.ok) throw new Error(`${table} wipe failed: ${r.status} ${await r.text()}`);
}

async function insert(table, rows) {
  if (!rows.length) return;
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`${table} insert failed: ${r.status} ${await r.text()}`);
}

const SUBJECTS = ["Physics", "Chemistry", "Maths", "Biology", "English", "Economics"];
const TOPICS = {
  Physics: ["Rotational motion", "Thermodynamics", "Electrostatics", "Optics", "Modern physics"],
  Chemistry: ["Mole concept", "Chemical bonding", "Equilibrium", "Organic naming", "Electrochemistry"],
  Maths: ["Definite integrals", "Probability", "Matrices", "Vectors", "Complex numbers"],
  Biology: ["Genetics", "Cell structure", "Human physiology", "Ecology", "Evolution"],
  English: ["Grammar", "Comprehension", "Poetry devices", "Essay structure"],
  Economics: ["Demand & supply", "National income", "Money & banking"],
};

const userId = await findUserId("preview@studyledger.test");

console.log("wiping existing data...");
await Promise.all(
  ["activity_days", "mistakes", "pyq_attempts", "syllabus_topics"].map((t) => wipe(t, userId)),
);

// ── randomized scenario parameters ──────────────────────────────────────
const streak = rand(0, 22);
const gapDays = rand(0, 5); // days of history before the streak, with a gap
const pyqAttemptCount = rand(4, 18);
const pyqAccuracyBase = rand(35, 92) / 100;
const mistakeCount = rand(0, 22);
const resolvedRatio = Math.random() * 0.6;
const syllabusPerSubject = rand(6, 16);
const coverageRatio = rand(10, 95) / 100;

console.log({ streak, pyqAttemptCount, pyqAccuracyBase, mistakeCount, coverageRatio });

// activity_days — current streak + a scattered patch further back
const activity = [];
for (let i = 0; i < streak; i++) {
  activity.push({ user_id: userId, day: isoDaysAgo(i), minutes: rand(10, 130) });
}
const olderDays = rand(3, 8);
for (let i = 0; i < olderDays; i++) {
  const day = streak + gapDays + rand(0, 20);
  if (Math.random() < 0.6) activity.push({ user_id: userId, day: isoDaysAgo(day), minutes: rand(10, 90) });
}
await insert("activity_days", activity);
console.log("activity_days:", activity.length);

// pyq_attempts
const pyq = [];
for (let i = 0; i < pyqAttemptCount; i++) {
  const total = rand(5, 20);
  const wobble = (Math.random() - 0.5) * 0.3;
  const correct = Math.max(0, Math.min(total, Math.round(total * (pyqAccuracyBase + wobble))));
  pyq.push({
    user_id: userId,
    subject: pick(SUBJECTS),
    topic: null,
    total,
    correct,
    taken_at: new Date(Date.now() - rand(0, 29) * 86400000).toISOString(),
  });
}
await insert("pyq_attempts", pyq);
console.log("pyq_attempts:", pyq.length);

// mistakes — random subject/topic pairs, some resolved
const mistakes = [];
for (let i = 0; i < mistakeCount; i++) {
  const subject = pick(SUBJECTS);
  const topic = pick(TOPICS[subject]);
  const createdDaysAgo = rand(0, 13);
  const resolved = Math.random() < resolvedRatio;
  mistakes.push({
    user_id: userId,
    subject,
    topic,
    note: null,
    source: pick(["practice", "pyq", "exam", "manual"]),
    created_at: new Date(Date.now() - createdDaysAgo * 86400000).toISOString(),
    resolved_at: resolved
      ? new Date(Date.now() - rand(0, createdDaysAgo) * 86400000).toISOString()
      : null,
  });
}
await insert("mistakes", mistakes);
console.log("mistakes:", mistakes.length, "resolved:", mistakes.filter((m) => m.resolved_at).length);

// syllabus_topics
const syllabus = [];
let pos = 0;
for (const subject of SUBJECTS) {
  const topics = TOPICS[subject];
  for (let i = 0; i < syllabusPerSubject; i++) {
    syllabus.push({
      user_id: userId,
      subject,
      topic: `${subject} unit ${i + 1} — ${topics[i % topics.length]}`,
      covered: Math.random() < coverageRatio,
      position: pos++,
    });
  }
}
await insert("syllabus_topics", syllabus);
console.log("syllabus_topics:", syllabus.length);

console.log("done — random scenario seeded");
