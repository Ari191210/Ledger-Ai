// Adds a couple of exam-kind deadlines for preview@studyledger.test so
// Exam Planner has something real to reverse-plan against. Dev-only.
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
const URL = get("NEXT_PUBLIC_SUPABASE_URL");
const KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const isoDaysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const usersRes = await fetch(`${URL}/auth/v1/admin/users`, { headers });
const { users } = await usersRes.json();
const user = users.find((u) => u.email === "preview@studyledger.test");
if (!user) throw new Error("preview user not found");

const rows = [
  { user_id: user.id, title: "Physics board exam", subject: "Physics", kind: "exam", due_date: isoDaysFromNow(21) },
  { user_id: user.id, title: "Chemistry board exam", subject: "Chemistry", kind: "exam", due_date: isoDaysFromNow(28) },
];

const res = await fetch(`${URL}/rest/v1/deadlines`, {
  method: "POST",
  headers,
  body: JSON.stringify(rows),
});
console.log(res.status, await res.text());
