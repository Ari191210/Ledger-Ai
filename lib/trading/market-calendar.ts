// NSE session clock, in IST.
//
// Node's timezone database is the source of truth for IST rather than a
// hardcoded +05:30 offset, so this stays correct if India ever adopts DST
// and does not silently drift when the host runs in UTC (as servers do).

/** Continuous trading: 09:15–15:30 IST. */
export const SESSION_OPEN_MINUTE = 9 * 60 + 15;
export const SESSION_CLOSE_MINUTE = 15 * 60 + 30;

/**
 * Intraday positions must be squared off before the broker's auto-square-off,
 * which discount brokers run from ~15:20 with a penalty. Flatten at 15:15.
 */
export const SQUARE_OFF_MINUTE = 15 * 60 + 15;

const IST = "Asia/Kolkata";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: IST,
  weekday: "short",
});

// Intl formatting costs microseconds per call, and a backtest resolves the
// same handful of timestamps repeatedly — millions of times over a year of
// minute bars. These caches make the conversions effectively free while
// keeping Intl (not a hardcoded +05:30) as the source of truth. Entries are
// keyed by exact epoch ms, so a cache hit is always correct.
const MAX_CACHE = 200_000;
const dateCache = new Map<number, string>();
const minuteCache = new Map<number, number>();

function memo<T>(cache: Map<number, T>, key: number, compute: () => T): T {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const value = compute();
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, value);
  return value;
}

/** IST calendar date as "YYYY-MM-DD". */
export function istDate(time: number): string {
  return memo(dateCache, time, () => dateFormatter.format(new Date(time)));
}

/** Minutes since IST midnight. */
export function istMinuteOfDay(time: number): number {
  return memo(minuteCache, time, () => {
    const [hh, mm] = timeFormatter.format(new Date(time)).split(":");
    return Number(hh) * 60 + Number(mm);
  });
}

/**
 * Trading holidays, "YYYY-MM-DD" in IST. The NSE publishes these annually;
 * this list must be refreshed each year. An out-of-date list makes the
 * agent attempt to trade a closed market, where orders are rejected rather
 * than filled — noisy, but not financially dangerous.
 */
export type HolidayCalendar = ReadonlySet<string>;

export const NO_HOLIDAYS: HolidayCalendar = new Set<string>();

export function isWeekend(time: number): boolean {
  const day = weekdayFormatter.format(new Date(time));
  return day === "Sat" || day === "Sun";
}

export function isTradingDay(time: number, holidays: HolidayCalendar = NO_HOLIDAYS): boolean {
  return !isWeekend(time) && !holidays.has(istDate(time));
}

/** True during continuous trading on a trading day. */
export function isMarketOpen(time: number, holidays: HolidayCalendar = NO_HOLIDAYS): boolean {
  if (!isTradingDay(time, holidays)) return false;
  const minute = istMinuteOfDay(time);
  return minute >= SESSION_OPEN_MINUTE && minute < SESSION_CLOSE_MINUTE;
}

/** True once the agent should stop opening new intraday positions. */
export function isPastSquareOff(time: number): boolean {
  return istMinuteOfDay(time) >= SQUARE_OFF_MINUTE;
}

/** Minutes elapsed since the open; negative before it. */
export function minutesSinceOpen(time: number): number {
  return istMinuteOfDay(time) - SESSION_OPEN_MINUTE;
}
