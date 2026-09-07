/**
 * Signals: the things a study app can only tell you if it has been keeping a
 * ledger. Every function here is pure, taking rows and returning a finding or
 * null, so they can be tested without a database and can never disagree with
 * the page that renders them.
 *
 * The rule for all of them: return null rather than a weak finding. A signal
 * that fires on two data points is worse than no signal, because the student
 * learns to ignore the whole section.
 */

import type { Mistake, PyqAttempt, SyllabusTopic } from "@/lib/study/types";

export type FocusSessionRow = {
  subject: string | null;
  topic: string | null;
  minutes: number;
  completed: boolean;
  started_at: string;
};

const DAY_MS = 86_400_000;
const days = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DAY_MS;

/* ── 3. mistake half-life ──────────────────────────────────────────────
 * How long a topic stays fixed before it breaks again. Needs at least three
 * occurrences, so there are two gaps to average and one is not a coincidence.
 */
export type HalfLife = { subject: string; topic: string; days: number; breaks: number };

export function mistakeHalfLife(mistakes: Mistake[]): HalfLife[] {
  const byTopic = new Map<string, Mistake[]>();
  for (const m of mistakes) {
    const key = `${m.subject}||${m.topic}`;
    byTopic.set(key, [...(byTopic.get(key) ?? []), m]);
  }

  const out: HalfLife[] = [];
  for (const [key, rows] of byTopic) {
    if (rows.length < 3) continue;
    const sorted = [...rows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    let total = 0;
    for (let i = 1; i < sorted.length; i++) {
      total += days(sorted[i].created_at, sorted[i - 1].created_at);
    }
    const gap = total / (sorted.length - 1);
    if (gap < 0.5) continue; // logged in one sitting, not a recurrence
    const [subject, topic] = key.split("||");
    out.push({ subject, topic, days: Math.round(gap), breaks: sorted.length });
  }
  return out.sort((a, b) => a.days - b.days);
}

/* ── 4. abandonment fingerprint ────────────────────────────────────────
 * Which subject you quit on, and at what minute. Only counts subjects with at
 * least three attempts, otherwise one bad evening becomes a character trait.
 */
export type Abandonment = {
  subject: string;
  started: number;
  finished: number;
  quitAtMinute: number | null;
};

export function abandonmentFingerprint(sessions: FocusSessionRow[]): Abandonment[] {
  const bySubject = new Map<string, FocusSessionRow[]>();
  for (const s of sessions) {
    if (!s.subject) continue;
    bySubject.set(s.subject, [...(bySubject.get(s.subject) ?? []), s]);
  }

  const out: Abandonment[] = [];
  for (const [subject, rows] of bySubject) {
    if (rows.length < 3) continue;
    const quit = rows.filter((r) => !r.completed);
    out.push({
      subject,
      started: rows.length,
      finished: rows.filter((r) => r.completed).length,
      quitAtMinute: quit.length
        ? Math.round(quit.reduce((s, r) => s + r.minutes, 0) / quit.length)
        : null,
    });
  }
  // worst follow-through first
  return out.sort((a, b) => a.finished / a.started - b.finished / b.started);
}

/* ── 5. the honest hour ────────────────────────────────────────────────
 * Time actually finished, against time started. The gap is the point.
 */
export type HonestHour = {
  started: number;
  finished: number;
  realMinutes: number;
  claimedMinutes: number;
};

export function honestHour(sessions: FocusSessionRow[], sinceDays = 7): HonestHour | null {
  const cutoff = Date.now() - sinceDays * DAY_MS;
  const recent = sessions.filter((s) => new Date(s.started_at).getTime() >= cutoff);
  if (recent.length < 3) return null;

  const realMinutes = recent.filter((s) => s.completed).reduce((t, s) => t + s.minutes, 0);
  const claimedMinutes = recent.reduce((t, s) => t + s.minutes, 0);

  // Nothing to say to a student who finishes what they start. The rendered
  // sentence is "your real study time is X, not Y", and with no abandoned
  // sessions X and Y are the same number: it asserted a gap between a figure
  // and itself. This signal exists for the gap, so with no gap there is no
  // signal.
  if (realMinutes === claimedMinutes) return null;

  return {
    started: recent.length,
    finished: recent.filter((s) => s.completed).length,
    realMinutes,
    claimedMinutes,
  };
}

/* ── 6. silent syllabus ────────────────────────────────────────────────
 * Topics you listed and have never once tested yourself on. Distinct from
 * "uncovered": you can mark a topic covered and still never have been examined
 * on it, which is the more dangerous state.
 */
export type Silent = { subject: string; topics: string[] };

export function silentSyllabus(
  syllabus: SyllabusTopic[],
  mistakes: Mistake[],
  attempts: PyqAttempt[],
): Silent[] {
  const touched = new Set<string>();
  for (const m of mistakes) touched.add(`${m.subject}||${m.topic}`.toLowerCase());
  for (const a of attempts) {
    if (a.topic) touched.add(`${a.subject}||${a.topic}`.toLowerCase());
  }

  const bySubject = new Map<string, string[]>();
  for (const t of syllabus) {
    if (touched.has(`${t.subject}||${t.topic}`.toLowerCase())) continue;
    bySubject.set(t.subject, [...(bySubject.get(t.subject) ?? []), t.topic]);
  }

  return [...bySubject.entries()]
    .map(([subject, topics]) => ({ subject, topics }))
    .sort((a, b) => b.topics.length - a.topics.length);
}

/* ── 7. topic contagion ────────────────────────────────────────────────
 * Pairs of topics that break together. Needs the pair to co-occur at least
 * twice, or every coincidence becomes a law.
 */
export type Contagion = { a: string; b: string; times: number; withinDays: number };

/** Most recent mistakes only. The pair scan below breaks out once entries fall
 *  outside the window, which bounds it when mistakes are spread out and does
 *  not when they are clustered: a bulk-logging session puts hundreds of rows
 *  inside the same four days, and this runs on every AI request. Contagion is a
 *  claim about current behaviour anyway, so the cap is more correct as well as
 *  faster. */
const CONTAGION_SCAN = 400;

export function topicContagion(mistakes: Mistake[], windowDays = 4): Contagion[] {
  const sorted = [...mistakes]
    .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())
    .slice(0, CONTAGION_SCAN)
    .reverse();
  const pairs = new Map<string, { times: number; gapTotal: number; firstLeads: number }>();

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const gap = days(sorted[j].created_at, sorted[i].created_at);
      if (gap > windowDays) break;
      // sorted is chronological, so i is always the earlier row: `one` led and
      // `two` followed.
      const one = `${sorted[i].subject} · ${sorted[i].topic}`;
      const two = `${sorted[j].subject} · ${sorted[j].topic}`;
      if (one === two) continue;
      // The pair is keyed alphabetically so both orderings group together, but
      // the direction is the entire claim and must not be thrown away with the
      // ordering. It was: the key was split back apart at render time, so the
      // sentence named whichever topic sorted first as the one that leads, and
      // was exactly backwards for about half of all real pairs.
      const alphabetical = [one, two].sort();
      const key = alphabetical.join("→");
      const hit = pairs.get(key) ?? { times: 0, gapTotal: 0, firstLeads: 0 };
      hit.times += 1;
      hit.gapTotal += gap;
      if (one === alphabetical[0]) hit.firstLeads += 1;
      pairs.set(key, hit);
    }
  }

  return [...pairs.entries()]
    .filter(([, v]) => v.times >= 2)
    .map(([key, v]) => {
      const [first, second] = key.split("→");
      // Report the direction actually observed more often. A pair that goes
      // both ways equally has no direction to claim, and falling back to the
      // alphabetical order at least keeps it stable.
      const firstLeads = v.firstLeads * 2 >= v.times;
      return {
        a: firstLeads ? first : second,
        b: firstLeads ? second : first,
        times: v.times,
        withinDays: Math.max(1, Math.round(v.gapTotal / v.times)),
      };
    })
    .sort((x, y) => y.times - x.times);
}

/* ── 9. ghost mode ─────────────────────────────────────────────────────
 * Your accuracy on a topic now, against your accuracy on it before. Only for
 * topics attempted in at least two separate sittings.
 */
export type Ghost = {
  subject: string;
  topic: string;
  past: number;
  latest: number;
  delta: number;
};

export function ghostMode(attempts: PyqAttempt[]): Ghost[] {
  const byTopic = new Map<string, PyqAttempt[]>();
  for (const a of attempts) {
    if (!a.topic || a.total <= 0) continue;
    const key = `${a.subject}||${a.topic}`;
    byTopic.set(key, [...(byTopic.get(key) ?? []), a]);
  }

  const out: Ghost[] = [];
  for (const [key, rows] of byTopic) {
    if (rows.length < 2) continue;
    const sorted = [...rows].sort(
      (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime(),
    );
    const latest = sorted[sorted.length - 1];
    const earlier = sorted.slice(0, -1);
    const pastCorrect = earlier.reduce((s, a) => s + a.correct, 0);
    const pastTotal = earlier.reduce((s, a) => s + a.total, 0);
    if (pastTotal === 0) continue;

    const past = Math.round((pastCorrect / pastTotal) * 100);
    const now = Math.round((latest.correct / latest.total) * 100);
    const [subject, topic] = key.split("||");
    out.push({ subject, topic, past, latest: now, delta: now - past });
  }
  return out.sort((a, b) => a.delta - b.delta);
}
