// ═══════════════════════════════════════════════════════════════════════════
// M23-2 — THE DETERMINISTIC PLANNER. H.4's second and third arrows:
//
//   StructuredQuery → [deterministic] planner → SQL → rows → citations
//
// This module NEVER calls a model. It takes a validated `StructuredQuery`
// (structured-query.ts already rejected anything that didn't fit the closed
// schema) and a `MemoryGateway` — five injected read functions, one per H.4
// example query — and returns a `MemoryOutcome`. The gateway is an
// interface for the same reason `ExtractionModel` is in `lib/
// capture-extraction.ts`: this file is provable with no Supabase project in
// reach, and `app/api/memory/query/route.ts` supplies the real Postgres
// calls (which is where H.3's FTS + pgvector indexes actually get read).
//
// COMBINATION_RULES is the whitelist. An (intent, entity) pair not on it is
// refused exactly like an unparseable model response — the schema being
// syntactically closed (types.ts) is necessary but not sufficient; this is
// the semantic close. A future sixth query class is a new row here, not a
// loosened check.
// ═══════════════════════════════════════════════════════════════════════════

import type { StructuredQuery, MemoryOutcome, Citation } from "./types";
import { refuseUnparseable } from "./structured-query";
import {
  narrateFirstOccurrence,
  narrateRank,
  narrateCompare,
  narrateSetDifference,
  narrateTrace,
} from "./narration";

// ── Row shapes, one per H.4 example query ────────────────────────────────────

export interface FirstOccurrenceRow {
  eventId: string;
  occurredAt: string;
  eventType: string;
}

export interface PatternRankRow {
  patternId: string;
  label: string;
  severity: number;
  recurrenceCount: number;
  lastSeenAt: string | null;
  occurrenceIds: string[];
  evidenceIds: string[];
}

export interface CompareWindowStats {
  from: string;
  to: string;
  scoreSnapshots: { id: string; capturedOn: string; total: number | null; formulaVersion: string | null }[];
  evidenceCount: number;
}

export interface CompareResultRow {
  windowA: CompareWindowStats;
  windowB: CompareWindowStats;
}

export interface StudiedNotAssessedRow {
  conceptRef: string;
  conceptId: string | null;
  subject: string | null;
  lastStudiedAt: string | null;
}

export interface TraceOccurrenceRow {
  occurrenceId: string;
  createdAt: string;
  evidenceId: string;
}

export interface TraceRow {
  patternId: string;
  label: string;
  occurrences: TraceOccurrenceRow[];
}

/** Five reads, one per H.4 example query. Nothing else is exposed — this is
 *  the whole surface a caller of the planner can reach into the database
 *  through, which is what "AI never sees the database" (H.4) means at the
 *  code level: neither the model NOR this planner holds a connection or a
 *  raw query string. */
export interface MemoryGateway {
  findFirstOccurrence(studentId: string, conceptRef: string): Promise<FirstOccurrenceRow | null>;
  rankOpenPatterns(studentId: string, subject: string | null, limit: number): Promise<PatternRankRow[]>;
  compareWindows(
    studentId: string,
    subject: string | null,
    windowA: { from: string; to: string },
    windowB: { from: string; to: string },
  ): Promise<CompareResultRow>;
  studiedNotAssessed(studentId: string, subject: string | null): Promise<StudiedNotAssessedRow[]>;
  tracePattern(studentId: string, patternRef: string): Promise<TraceRow | null>;
}

const RANK_LIMIT = 20;

type Combo = `${StructuredQuery["intent"]}:${StructuredQuery["entity"]}`;
const COMBINATION_RULES: ReadonlySet<Combo> = new Set<Combo>([
  "first_occurrence:event",
  "rank:pattern",
  "compare:score_snapshot",
  "set_difference:declaration",
  "trace:occurrence",
]);

function emptyResult(query: StructuredQuery): MemoryOutcome {
  return { ok: true, query, answer: "no record found", citations: [], rows: [] };
}

/**
 * Run a validated `StructuredQuery`. Never throws for a "no data" case — that
 * is `emptyResult`, a legitimate, cited-as-empty answer (H.4.a). Only a
 * malformed/unsupported combination produces a refusal here, mirroring the
 * refusal `structured-query.ts` returns for a response that never validated.
 */
export async function planQuery(query: StructuredQuery, studentId: string, gateway: MemoryGateway): Promise<MemoryOutcome> {
  const combo = `${query.intent}:${query.entity}` as Combo;
  if (!COMBINATION_RULES.has(combo)) {
    return refuseUnparseable(`"${query.intent}" over "${query.entity}" is not a query this record can run`);
  }

  switch (combo) {
    case "first_occurrence:event":
      return planFirstOccurrence(query, studentId, gateway);
    case "rank:pattern":
      return planRank(query, studentId, gateway);
    case "compare:score_snapshot":
      return planCompare(query, studentId, gateway);
    case "set_difference:declaration":
      return planSetDifference(query, studentId, gateway);
    case "trace:occurrence":
      return planTrace(query, studentId, gateway);
    default:
      // Exhaustive by COMBINATION_RULES; unreachable.
      return refuseUnparseable("unrecognised combination");
  }
}

// ── 1 · "When did I first study Torque?" ─────────────────────────────────────
async function planFirstOccurrence(query: StructuredQuery, studentId: string, gateway: MemoryGateway): Promise<MemoryOutcome> {
  if (!query.conceptRef) {
    return refuseUnparseable("first_occurrence needs a concept to look for");
  }
  const row = await gateway.findFirstOccurrence(studentId, query.conceptRef);
  if (!row) return emptyResult(query);

  const citations: Citation[] = [{ recordType: "academic_event", id: row.eventId, timestamp: row.occurredAt }];
  return {
    ok: true,
    query,
    answer: narrateFirstOccurrence(row, query.conceptRef),
    citations,
    rows: [row],
  };
}

// ── 2 · "What do I keep getting wrong in Physics?" ───────────────────────────
async function planRank(query: StructuredQuery, studentId: string, gateway: MemoryGateway): Promise<MemoryOutcome> {
  const subject = query.subject ?? null;
  const rows = await gateway.rankOpenPatterns(studentId, subject, RANK_LIMIT);
  if (rows.length === 0) return emptyResult(query);

  const citations: Citation[] = rows.flatMap(r => [
    { recordType: "pattern" as const, id: r.patternId, timestamp: r.lastSeenAt },
    ...r.occurrenceIds.map(id => ({ recordType: "occurrence" as const, id, timestamp: r.lastSeenAt })),
    ...r.evidenceIds.map(id => ({ recordType: "evidence" as const, id, timestamp: null })),
  ]);

  return { ok: true, query, answer: narrateRank(rows, subject), citations, rows };
}

// ── 3 · "Am I better at Organic Chemistry than in March?" ────────────────────
async function planCompare(query: StructuredQuery, studentId: string, gateway: MemoryGateway): Promise<MemoryOutcome> {
  if (!query.comparison) {
    return refuseUnparseable("compare needs two windows to compare");
  }
  const subject = query.subject ?? null;
  const result = await gateway.compareWindows(studentId, subject, query.comparison.windowA, query.comparison.windowB);

  const allSnapshots = [...result.windowA.scoreSnapshots, ...result.windowB.scoreSnapshots];
  if (allSnapshots.length === 0 && result.windowA.evidenceCount === 0 && result.windowB.evidenceCount === 0) {
    return emptyResult(query);
  }

  const versions = new Set(allSnapshots.map(s => s.formulaVersion).filter((v): v is string => v !== null));
  const formulaChanged = versions.size > 1;

  const citations: Citation[] = allSnapshots.map(s => ({
    recordType: "score_snapshot",
    id: s.id,
    timestamp: s.capturedOn,
  }));

  return {
    ok: true,
    query,
    answer: narrateCompare(result, subject, formulaChanged),
    citations,
    rows: [result],
  };
}

// ── 4 · "What have I studied but never been tested on?" ──────────────────────
async function planSetDifference(query: StructuredQuery, studentId: string, gateway: MemoryGateway): Promise<MemoryOutcome> {
  const subject = query.subject ?? null;
  const rows = await gateway.studiedNotAssessed(studentId, subject);
  if (rows.length === 0) return emptyResult(query);

  const citations: Citation[] = rows.map(r => ({
    recordType: "academic_record",
    id: r.conceptRef,
    timestamp: r.lastStudiedAt,
  }));

  return { ok: true, query, answer: narrateSetDifference(rows, subject), citations, rows };
}

// ── 5 · "Show me every mistake behind my sign errors." ───────────────────────
async function planTrace(query: StructuredQuery, studentId: string, gateway: MemoryGateway): Promise<MemoryOutcome> {
  if (!query.conceptRef) {
    return refuseUnparseable("trace needs a pattern to follow");
  }
  const row = await gateway.tracePattern(studentId, query.conceptRef);
  if (!row) return emptyResult(query);

  const citations: Citation[] = [
    { recordType: "pattern", id: row.patternId, timestamp: null },
    ...row.occurrences.flatMap(o => [
      { recordType: "occurrence" as const, id: o.occurrenceId, timestamp: o.createdAt },
      { recordType: "evidence" as const, id: o.evidenceId, timestamp: null },
    ]),
  ];

  return { ok: true, query, answer: narrateTrace(row), citations, rows: [row] };
}
