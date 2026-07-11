// Streak semantics — pure and unit-tested; lib/focus-context.tsx is the
// only stateful consumer.
//
// A streak is consecutive days with at least one completed work session.
// Missing one day is covered automatically by a monthly "streak shield"
// (one per calendar month). Missing two or more days — or a second day in
// the same month — breaks the streak.
//
// Historical note: before this module, the streak never reset (any new day
// incremented it), which quietly inflated the Consistency pillar
// (streak × 7.5, max 150). Existing inflated streaks correct themselves
// the first time these helpers run.

export type StreakState = {
  streak: number;
  /** Date.toDateString() of the last counted session day (storage format). */
  lastDate: string | null;
  /** "YYYY-MM" of the month whose shield has been consumed, or null. */
  shieldUsedMonth: string | null;
};

export type StreakResolution = StreakState & {
  usedShield: boolean;
  broke: boolean;
};

const DAY = 86400000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function gapDays(lastDate: string, today: Date): number {
  const last = new Date(lastDate);
  if (Number.isNaN(last.getTime())) return Infinity;
  return Math.round((startOfDay(today) - startOfDay(last)) / DAY);
}

/**
 * Normalize a stored streak against the calendar — call on load, before
 * display or scoring. Consumes the monthly shield if exactly one day was
 * missed; resets the streak if the gap is larger (or the shield is spent).
 */
export function resolveStreak(state: StreakState, today = new Date()): StreakResolution {
  const base = { ...state, usedShield: false, broke: false };
  if (!state.lastDate || state.streak <= 0) return base;

  const gap = gapDays(state.lastDate, today);
  if (gap <= 1) return base; // today or yesterday — intact

  if (gap === 2 && state.shieldUsedMonth !== monthKey(today)) {
    // One missed day, shield available: cover it. lastDate moves to
    // yesterday so today's session continues the streak normally.
    const yesterday = new Date(startOfDay(today) - DAY);
    return {
      streak: state.streak,
      lastDate: yesterday.toDateString(),
      shieldUsedMonth: monthKey(today),
      usedShield: true,
      broke: false,
    };
  }

  return { streak: 0, lastDate: null, shieldUsedMonth: state.shieldUsedMonth, usedShield: false, broke: true };
}

/**
 * Apply a completed work session: resolve first, then count today once.
 * `counted` is false when today already counted (second session same day).
 */
export function completeSessionStreak(
  state: StreakState,
  today = new Date(),
): StreakResolution & { counted: boolean } {
  const resolved = resolveStreak(state, today);
  const todayStr = today.toDateString();
  if (resolved.lastDate === todayStr) return { ...resolved, counted: false };
  return { ...resolved, streak: resolved.streak + 1, lastDate: todayStr, counted: true };
}

/** True if this month's shield is still available. */
export function shieldAvailable(shieldUsedMonth: string | null, today = new Date()): boolean {
  return shieldUsedMonth !== monthKey(today);
}
