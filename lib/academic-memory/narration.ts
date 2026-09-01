// ═══════════════════════════════════════════════════════════════════════════
// M23-2 — THE ANSWER, BUILT FROM THE SAME ROWS THE CITATIONS POINT AT.
//
// H.4's pipeline diagram shows a step of "AI narration constrained to the
// returned rows". This codebase does not build that step, deliberately: an
// AI rephrasing of rows carries a non-zero chance of adding a word the rows
// do not support, however "constrained" the prompt claims to be, and
// PRODUCT_PRINCIPLES §3.2 ("no claim without proof") does not carve out an
// exception for prose a model is merely SUMMARISING rather than inventing.
//
// Every function below takes the SAME typed rows `query-planner.ts` already
// built citations from, and formats them with template strings — no model,
// no network, no I/O. This is a STRICTER reading of H.4.b ("every narrated
// answer renders citations... the difference between a memory system and a
// chatbot with a database nearby") than an AI-narration step would give: a
// template cannot hallucinate a fact that is not a field on the row it is
// reading.
//
// PURE. Every export here is provable with nothing live in reach (U.3).
// ═══════════════════════════════════════════════════════════════════════════

import type {
  FirstOccurrenceRow,
  PatternRankRow,
  CompareResultRow,
  StudiedNotAssessedRow,
  TraceRow,
} from "./query-planner";

const fmtDate = (iso: string | null): string => (iso ? iso.slice(0, 10) : "an unknown date");

export function narrateFirstOccurrence(row: FirstOccurrenceRow, conceptLabel: string): string {
  return `You first studied ${conceptLabel} on ${fmtDate(row.occurredAt)} (event ${row.eventId}).`;
}

export function narrateRank(rows: readonly PatternRankRow[], subject: string | null): string {
  const where = subject ? ` in ${subject}` : "";
  if (rows.length === 0) return `No open issues${where}.`;
  const top = rows
    .slice(0, 5)
    .map(r => `${r.label} (severity ${r.severity}, ${r.recurrenceCount} occurrence${r.recurrenceCount === 1 ? "" : "s"})`)
    .join("; ");
  return `${rows.length} open issue${rows.length === 1 ? "" : "s"}${where}, most severe first: ${top}.`;
}

export function narrateCompare(result: CompareResultRow, subject: string | null, formulaChanged: boolean): string {
  const where = subject ? ` in ${subject}` : "";
  const a = result.windowA;
  const b = result.windowB;
  const scoreOf = (w: typeof a) => {
    const latest = w.scoreSnapshots[w.scoreSnapshots.length - 1];
    return latest && latest.total !== null ? String(latest.total) : "no snapshot";
  };
  const base =
    `Window A (${fmtDate(a.from)}–${fmtDate(a.to)}, ${a.evidenceCount} evidence item${a.evidenceCount === 1 ? "" : "s"}${where}): score ${scoreOf(a)}. ` +
    `Window B (${fmtDate(b.from)}–${fmtDate(b.to)}, ${b.evidenceCount} evidence item${b.evidenceCount === 1 ? "" : "s"}${where}): score ${scoreOf(b)}.`;
  return formulaChanged
    ? `${base} The scoring formula changed between the two windows, so this comparison spans a formula change (H.5) and is not a like-for-like read.`
    : base;
}

export function narrateSetDifference(rows: readonly StudiedNotAssessedRow[], subject: string | null): string {
  const where = subject ? ` in ${subject}` : "";
  if (rows.length === 0) return `Nothing studied${where} without also being tested.`;
  const names = rows.slice(0, 8).map(r => r.conceptRef).join(", ");
  return `${rows.length} concept${rows.length === 1 ? "" : "s"} studied${where} but never tested: ${names}.`;
}

export function narrateTrace(row: TraceRow): string {
  if (row.occurrences.length === 0) {
    return `"${row.label}" has no occurrences on record.`;
  }
  const evidenceCount = new Set(row.occurrences.map(o => o.evidenceId)).size;
  return `"${row.label}" traces to ${row.occurrences.length} occurrence${row.occurrences.length === 1 ? "" : "s"} across ${evidenceCount} evidence record${evidenceCount === 1 ? "" : "s"}.`;
}
