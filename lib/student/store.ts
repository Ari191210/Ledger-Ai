// ═══════════════════════════════════════════════════════════════════════════
// Student store — local-first persistence.
//
// Design constraint: the product must be fully usable before any API key
// exists. localStorage is therefore the source of truth, and Supabase is a
// replica that is written opportunistically when a session happens to be
// present. Nothing here throws or blocks when Supabase is unconfigured.
//
// The store is a tiny observable so every mounted module re-renders when any
// other module mutates the Student. That shared subscription is what makes
// adding a college on /colleges instantly change the count on /home.
// ═══════════════════════════════════════════════════════════════════════════

import {
  type Student,
  emptyStudent,
  STUDENT_SCHEMA_VERSION,
} from "./types";

export const STUDENT_KEY = "ledger-student-v1";

// ── Migration ──────────────────────────────────────────────────────────────

/** Bring a stored object up to the current schema. Unknown/older shapes are
 *  merged over an empty Student so a missing array can never crash a module
 *  that maps over it — the single most likely cause of a blank page. */
function migrate(raw: unknown): Student {
  const base = emptyStudent();
  if (!raw || typeof raw !== "object") return base;
  const stored = raw as Partial<Student>;

  const merged: Student = {
    ...base,
    ...stored,
    // Nested objects need their own merge; a spread would drop new sub-keys
    // added by a later schema version.
    profile:   { ...base.profile,   ...(stored.profile   ?? {}) },
    academics: { ...base.academics, ...(stored.academics ?? {}) },
    testing:   { ...base.testing,   ...(stored.testing   ?? {}) },
    portfolio: { ...base.portfolio, ...(stored.portfolio ?? {}) },
    version:   STUDENT_SCHEMA_VERSION,
  };

  // Defend every collection: a hand-edited or partially-synced blob must not
  // be able to produce `undefined.map`.
  const arrays = [
    "activities", "awards", "research", "competitions", "projects", "colleges",
    "applications", "recommenders", "essays", "opportunities", "tasks", "events",
  ] as const;
  for (const k of arrays) {
    if (!Array.isArray(merged[k])) {
      // `k` indexes only array-valued keys of Student, but TS cannot narrow the
      // assignment target across a union of those keys, so the write goes
      // through an unknown-typed view of the same object.
      (merged as unknown as Record<string, unknown>)[k] = [];
    }
  }
  if (!Array.isArray(merged.academics.courses))    merged.academics.courses = [];
  if (!Array.isArray(merged.academics.weakTopics)) merged.academics.weakTopics = [];
  if (!Array.isArray(merged.testing.scores))       merged.testing.scores = [];
  if (!Array.isArray(merged.testing.plans))        merged.testing.plans = [];
  if (!Array.isArray(merged.profile.careerInterests)) merged.profile.careerInterests = [];
  if (!Array.isArray(merged.portfolio.skills))     merged.portfolio.skills = [];
  if (!Array.isArray(merged.portfolio.links))      merged.portfolio.links = [];

  return merged;
}

// ── In-memory cache + subscribers ──────────────────────────────────────────

let cache: Student | null = null;
const listeners = new Set<(s: Student) => void>();

export function readStudent(): Student {
  // SSR and the first client render must agree, so the server always sees the
  // empty student. Hydration then swaps in local data via useStudent's effect.
  if (typeof window === "undefined") return emptyStudent();
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STUDENT_KEY);
    cache = migrate(raw ? JSON.parse(raw) : null);
  } catch {
    cache = emptyStudent();
  }
  return cache;
}

function persist(next: Student) {
  cache = next;
  try {
    localStorage.setItem(STUDENT_KEY, JSON.stringify(next));
  } catch {
    // Quota or private-mode failure. The in-memory cache still serves this
    // session; losing persistence must not take the UI down with it.
  }
  listeners.forEach(fn => fn(next));
  scheduleCloudPush(next);
}

/** Apply a change to the Student. The updater must return a new object. */
export function writeStudent(updater: (s: Student) => Student): Student {
  const next = updater(readStudent());
  next.updatedAt = new Date().toISOString();
  persist(next);
  return next;
}

export function subscribe(fn: (s: Student) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Replace the entire Student — used by cloud pull and by data import. */
export function replaceStudent(raw: unknown): Student {
  const next = migrate(raw);
  persist(next);
  return next;
}

export function resetStudent(): Student {
  const next = emptyStudent();
  persist(next);
  return next;
}

// ── Cloud replication (optional, never required) ───────────────────────────

type PushFn = (s: Student) => void;
let cloudPush: PushFn | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Installed by <StudentSyncProvider> once a Supabase session exists. Until
 *  then every write is local-only and the app is fully functional. */
export function setCloudPush(fn: PushFn | null) {
  cloudPush = fn;
}

function scheduleCloudPush(next: Student) {
  if (!cloudPush) return;
  // Coalesce bursts: typing in an essay draft should not issue a write per
  // keystroke.
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    try { cloudPush?.(next); } catch { /* replication is best-effort */ }
  }, 1500);
}

// ── id helper ──────────────────────────────────────────────────────────────

/** Collision-resistant enough for per-user record ids, and available without
 *  crypto.randomUUID on older mobile browsers. */
export function newId(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
