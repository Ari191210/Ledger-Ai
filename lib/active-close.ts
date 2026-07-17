// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE CLOSE — Week 1 foundation (Integrity Sprint Part 4)
//
// An ACTIVE close is a close on a day with ≥1 qualifying academic event.
// A PASSIVE close is the cron's nightly row for everyone else — still written
// (series continuity), marked active=false.
//
// The client stamps `ledger-last-event` on every qualifying event; the stamp
// syncs inside the blob. The server never trusts the stamp alone: it
// corroborates against evidence inside the same blob (papers-log dates,
// checks dates, cleared-mistake dates, focus-last).
//
// Known boundary: the stamp uses the student's LOCAL date while the cron
// closes on the UTC date. Events between 00:00–05:30 IST land on the previous
// UTC day. Accepted for shadow mode; Phase B moves closes to an IST boundary.
// ═══════════════════════════════════════════════════════════════════════════

export type QualifyingEventType =
  | "practice_session"   // graded session, ≥5 questions
  | "mistake_cleared"    // recovery clear
  | "coverage_check"     // passed proof check
  | "focus_session"      // counted Pomodoro work session
  | "onboarding";        // first-close event during onboarding (Phase 4)

export const LAST_EVENT_KEY = "ledger-last-event";

function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Stamp today as an active day. Cheap, idempotent, client-only. */
export function stampQualifyingEvent(type: QualifyingEventType): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_EVENT_KEY, JSON.stringify({ date: localDateStr(), type }));
  } catch {}
}

type Stamp = { date: string; type: QualifyingEventType };

function parseStamp(raw: string | undefined | null): Stamp | null {
  try {
    const s = raw ? (JSON.parse(raw) as Stamp) : null;
    return s && typeof s.date === "string" ? s : null;
  } catch { return null; }
}

/**
 * Server-side: does this blob show evidence of a qualifying event on
 * `dateStr` (YYYY-MM-DD)? The stamp must match AND at least one evidence
 * source must corroborate it — a bare stamp with no matching record is
 * ignored, so forging the stamp alone does nothing.
 */
export function corroborateActiveDay(blob: Record<string, string> | null, dateStr: string): boolean {
  if (!blob) return false;
  const stamp = parseStamp(blob[LAST_EVENT_KEY]);
  if (!stamp || stamp.date !== dateStr) return false;

  const parse = <T,>(key: string): T[] => {
    try { const v = blob[key] ? JSON.parse(blob[key]) : []; return Array.isArray(v) ? v : []; } catch { return []; }
  };

  const onDate = (iso: unknown) => typeof iso === "string" && iso.slice(0, 10) === dateStr;

  const papers = parse<{ date?: string; total?: number }>("ledger-papers-log");
  if (papers.some(p => onDate(p.date) && (p.total ?? 0) >= 5)) return true;

  const checks = parse<{ date?: string }>("ledger-checks");
  if (checks.some(c => onDate(c.date))) return true;

  const mistakes = parse<{ status?: string; clearedDate?: string }>("ledger-mistakes");
  if (mistakes.some(m => m.status === "cleared" && onDate(m.clearedDate))) return true;

  if (blob["ledger-focus-last"]?.slice(0, 10) === dateStr) return true;

  return false;
}
