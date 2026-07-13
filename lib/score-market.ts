// ═══════════════════════════════════════════════════════════════════════════
// The Ledger Score as a tracked instrument.
//
// lib/ledger-score.ts answers "what is the score right now".
// This file answers the questions a newspaper actually asks:
//   Which way is it moving? How fast? Is that unusual? Why?
//
// Pure functions over a snapshot series. No I/O, no Supabase, no React — so it
// is testable and can run on the server (parent reports, digests) or the client.
// ═══════════════════════════════════════════════════════════════════════════

/** One daily close, as stored in the score_history table. */
export type ScoreSnapshot = {
  captured_on: string;      // YYYY-MM-DD
  total: number;            // 0–1000, the index
  pqa: number;              // 0–400  Examination
  syllabus: number;         // 0–250  Coverage
  mistakes: number;         // 0–200  Risk (higher = fewer recent errors = better)
  consistency: number;      // 0–150  Momentum
  streak: number;
  papers_count: number;
  recent_mistakes: number;
};

export type Direction = "up" | "down" | "flat";

export type Movement = {
  delta: number;            // absolute point change
  pct: number;              // percent change vs the earlier value
  direction: Direction;
  from: number;
  to: number;
};

/** The four sectors that make up the index. Weights are their max contribution. */
export const SECTORS = [
  { key: "pqa",         label: "Examination", max: 400 },
  { key: "syllabus",    label: "Coverage",    max: 250 },
  { key: "mistakes",    label: "Risk",        max: 200 },
  { key: "consistency", label: "Momentum",    max: 150 },
] as const;

export type SectorKey = (typeof SECTORS)[number]["key"];

// ── Movement ───────────────────────────────────────────────────────────────

/**
 * A movement between two values. `pct` is guarded against a zero base: a score
 * going 0 → 40 is not "infinite percent up", it is reported as a 40-point gain
 * with pct 0, and the UI should lead with points, not percent, when from === 0.
 */
export function movement(from: number, to: number): Movement {
  const delta = to - from;
  const pct = from === 0 ? 0 : (delta / from) * 100;
  return {
    delta,
    pct,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    from,
    to,
  };
}

/** Snapshot on or immediately before `daysAgo`. Null if the series is too short. */
function snapshotAt(series: ScoreSnapshot[], daysAgo: number): ScoreSnapshot | null {
  if (series.length === 0) return null;
  const latest = series[0];
  const target = new Date(latest.captured_on);
  target.setDate(target.getDate() - daysAgo);
  const targetTime = target.getTime();

  // series is newest-first; find the first row at or before the target date
  for (const s of series) {
    if (new Date(s.captured_on).getTime() <= targetTime) return s;
  }
  // Series doesn't reach back that far — fall back to the earliest we have,
  // but only if it is genuinely older than the latest (otherwise there is no
  // prior period to compare against and callers must show "no data").
  const earliest = series[series.length - 1];
  return earliest.captured_on === latest.captured_on ? null : earliest;
}

// ── The report ─────────────────────────────────────────────────────────────

export type MarketReport = {
  /** True when there is no prior close — a newly listed account. */
  isNewlyListed: boolean;
  /** Trading days on record. */
  sessions: number;
  current: ScoreSnapshot | null;

  /** vs previous close, week, month. Null when the series doesn't reach back. */
  daily: Movement | null;
  weekly: Movement | null;
  monthly: Movement | null;

  /** Per-sector week-on-week movement, largest absolute mover first. */
  sectorMoves: Array<{ key: SectorKey; label: string; max: number; move: Movement }>;

  allTimeHigh: { value: number; on: string } | null;
  allTimeLow: { value: number; on: string } | null;
  atAllTimeHigh: boolean;

  /**
   * Consecutive sessions moving the same direction. A 5-session advance reads
   * very differently from a 5-point jump on one day, and the newspaper should
   * say so.
   */
  streakSessions: { direction: Direction; count: number };

  /** Sparkline data, oldest → newest. */
  series: Array<{ date: string; value: number }>;
};

export function buildMarketReport(rawSeries: ScoreSnapshot[]): MarketReport {
  // Defensive: callers may hand us any order. Normalise to newest-first.
  const series = [...rawSeries].sort(
    (a, b) => new Date(b.captured_on).getTime() - new Date(a.captured_on).getTime()
  );

  const current = series[0] ?? null;

  if (!current) {
    return {
      isNewlyListed: true, sessions: 0, current: null,
      daily: null, weekly: null, monthly: null, sectorMoves: [],
      allTimeHigh: null, allTimeLow: null, atAllTimeHigh: false,
      streakSessions: { direction: "flat", count: 0 },
      series: [],
    };
  }

  const prev  = series[1] ?? null;
  const week  = snapshotAt(series, 7);
  const month = snapshotAt(series, 30);

  const sectorMoves = SECTORS.map(s => ({
    key: s.key,
    label: s.label,
    max: s.max,
    move: movement(week ? week[s.key] : current[s.key], current[s.key]),
  })).sort((a, b) => Math.abs(b.move.delta) - Math.abs(a.move.delta));

  const highest = series.reduce((a, b) => (b.total > a.total ? b : a));
  const lowest  = series.reduce((a, b) => (b.total < a.total ? b : a));

  // Consecutive same-direction sessions, walking back from the latest close.
  let count = 0;
  let dir: Direction = "flat";
  for (let i = 0; i < series.length - 1; i++) {
    const d = series[i].total - series[i + 1].total;
    const thisDir: Direction = d > 0 ? "up" : d < 0 ? "down" : "flat";
    if (i === 0) { dir = thisDir; if (thisDir === "flat") break; count = 1; continue; }
    if (thisDir !== dir) break;
    count++;
  }

  return {
    isNewlyListed: series.length < 2,
    sessions: series.length,
    current,
    daily:   prev  ? movement(prev.total,  current.total) : null,
    weekly:  week  ? movement(week.total,  current.total) : null,
    monthly: month ? movement(month.total, current.total) : null,
    sectorMoves,
    allTimeHigh: { value: highest.total, on: highest.captured_on },
    allTimeLow:  { value: lowest.total,  on: lowest.captured_on  },
    atAllTimeHigh: current.total >= highest.total && series.length > 1,
    streakSessions: { direction: dir, count },
    series: [...series].reverse().map(s => ({ date: s.captured_on, value: s.total })),
  };
}

// ── Analyst commentary ─────────────────────────────────────────────────────
//
// The line under the headline. It must be TRUE — it is generated from the
// numbers, never from an AI call, so it can never hallucinate a trend that did
// not happen. If there is nothing to say, it says that.

export type Commentary = {
  /** Front-page headline, e.g. "ACADEMIC PERFORMANCE INDEX CLIMBS TO 842". */
  headline: string;
  /** The standfirst — one sentence explaining the move. */
  standfirst: string;
  /** Short verdict word for the ticker: ADVANCING / RETREATING / UNCHANGED. */
  verdict: string;
};

const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString();

export function writeCommentary(r: MarketReport): Commentary {
  if (!r.current) {
    return {
      headline: "INDEX AWAITING FIRST CLOSE",
      standfirst:
        "No sessions on record yet. Your first past-paper attempt or syllabus upload opens the ledger.",
      verdict: "UNLISTED",
    };
  }

  const total = r.current.total;

  // Newly listed: one close, no prior period. Do NOT invent a trend.
  if (r.isNewlyListed) {
    return {
      headline: `ACADEMIC PERFORMANCE INDEX OPENS AT ${fmt(total)}`,
      standfirst:
        "First close on record. Movement, momentum and sector analysis begin once a second session is logged — the ledger builds its track record from here.",
      verdict: "NEWLY LISTED",
    };
  }

  const move = r.weekly ?? r.daily!;
  const period = r.weekly ? "this week" : "since the previous close";
  const lead = r.sectorMoves.find(s => s.move.delta !== 0);

  // Direction verb, chosen for register — a newspaper does not say "went up".
  const verb =
    move.direction === "up"
      ? (Math.abs(move.pct) > 8 ? "SURGES TO" : "CLIMBS TO")
      : move.direction === "down"
      ? (Math.abs(move.pct) > 8 ? "SLIDES TO" : "EASES TO")
      : "HOLDS AT";

  const headline = `ACADEMIC PERFORMANCE INDEX ${verb} ${fmt(total)}`;

  // Standfirst: explain the move with the sector that actually caused it.
  let standfirst: string;

  if (move.direction === "flat") {
    standfirst = r.streakSessions.count > 2
      ? `The index is unchanged ${period}, holding flat across ${r.streakSessions.count} sessions. No sector has moved materially.`
      : `The index is unchanged ${period}. No sector has moved materially.`;
  } else {
    const dirWord = move.direction === "up" ? "gains" : "losses";
    const sectorPhrase = lead
      ? `${lead.label} ${lead.move.direction === "up" ? "leads the advance" : "drags on the index"}, ${lead.move.direction === "up" ? "adding" : "shedding"} ${fmt(lead.move.delta)} points`
      : "no single sector dominates the move";

    const streakPhrase =
      r.streakSessions.count >= 3
        ? ` It is the ${ordinal(r.streakSessions.count)} consecutive session of ${move.direction === "up" ? "advance" : "decline"}.`
        : "";

    const highPhrase = r.atAllTimeHigh ? " The index stands at an all-time high." : "";

    standfirst =
      `${capitalise(sectorPhrase)}${period === "this week" ? " over the week" : ""}. ` +
      `The index has ${move.direction === "up" ? "added" : "given up"} ${fmt(move.delta)} points${
        move.from !== 0 ? ` (${move.pct > 0 ? "+" : ""}${move.pct.toFixed(1)}%)` : ""
      } ${period}.${streakPhrase}${highPhrase}`.replace(/\s+/g, " ").trim();

    void dirWord;
  }

  const verdict =
    move.direction === "up" ? "ADVANCING" :
    move.direction === "down" ? "RETREATING" : "UNCHANGED";

  return { headline, standfirst, verdict };
}

function capitalise(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Edition metadata ───────────────────────────────────────────────────────
//
// The masthead needs an issue number and a dateline. The issue number is
// derived, not stored: it is the number of days since the paper "launched", so
// it increments once per day on its own and is identical for every reader —
// which is exactly how a real publication numbers its editions.

export const FIRST_EDITION = new Date("2026-01-01T00:00:00Z");

export function editionNumber(on: Date = new Date()): number {
  const days = Math.floor((on.getTime() - FIRST_EDITION.getTime()) / 86_400_000);
  return Math.max(1, days + 1);
}

export function dateline(on: Date = new Date()): string {
  return on.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
