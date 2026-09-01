// ═══════════════════════════════════════════════════════════════════════════
// M23-2 — WHAT A StructuredQuery IS, AND WHAT AN ANSWER CARRIES.
//
// Architecture H.4: *"`StructuredQuery` is a closed schema:
// `{ intent, subject?, concept_ref?, date_range?, outcome_filter?, entity ∈
// {event, session, assessment, occurrence, pattern, score_snapshot,
// declaration}, aggregation?, comparison? }`. AI never emits SQL and never
// sees the database."*
//
// PURE. No Anthropic client, no Supabase client, no clock, no `next/*` — the
// same discipline `lib/capture-extraction.ts` and `lib/ai-capabilities/
// types.ts` hold, so every guarantee here is provable with nothing live in
// reach (U.3).
//
// THE CLOSED ENUM IS THE STRUCTURAL REFUSAL. There is no `intent =
// "predict"`. A model asked to parse *"will I pass?"* into this schema has
// nowhere honest to put the answer — the enum below is exhaustive, and
// `parseStructuredQuery` (structured-query.ts) rejects anything outside it.
// That is what makes M23-3's refusal a property of the TYPE, not merely of a
// prompt instruction a future edit could soften.
// ═══════════════════════════════════════════════════════════════════════════

/** H.4's five example intents. Nothing else is expressible. */
export const QUERY_INTENTS = [
  "first_occurrence",
  "rank",
  "compare",
  "set_difference",
  "trace",
] as const;
export type QueryIntent = (typeof QUERY_INTENTS)[number];

/** H.4's closed entity set, verbatim. */
export const QUERY_ENTITIES = [
  "event",
  "session",
  "assessment",
  "occurrence",
  "pattern",
  "score_snapshot",
  "declaration",
] as const;
export type QueryEntity = (typeof QUERY_ENTITIES)[number];

/** What `rank` and `set_difference` may filter on. Closed, for the same
 *  reason `intent` and `entity` are closed — an unlisted value is not a typo
 *  to coerce, it is a request the schema does not express. */
export const OUTCOME_FILTERS = [
  "open",
  "studied_not_assessed",
  "resolved",
  "recurred",
] as const;
export type OutcomeFilter = (typeof OUTCOME_FILTERS)[number];

export interface DateRange {
  from: string; // ISO-8601
  to: string; // ISO-8601
}

/** `intent = "compare"`'s two windows, stated explicitly (H.5: "every
 *  comparison carries three qualifiers: the two windows, the evidence count
 *  in each, and whether the formula_version differed"). The count and the
 *  formula-version qualifier are computed by the planner, never supplied by
 *  the query — a caller cannot assert its own evidence count. */
export interface Comparison {
  windowA: DateRange;
  windowB: DateRange;
}

/** The schema itself. Every field beyond `intent` and `entity` is optional —
 *  which fields a given intent actually requires is `query-planner.ts`'s
 *  business (COMBINATION_RULES), not this type's. A type that made every
 *  intent's shape different would need a discriminated union per intent,
 *  which is a fine design but not the one H.4 specifies: it names ONE closed
 *  object shape. */
export interface StructuredQuery {
  intent: QueryIntent;
  entity: QueryEntity;
  subject?: string;
  conceptRef?: string;
  dateRange?: DateRange;
  outcomeFilter?: OutcomeFilter;
  aggregation?: "count" | "rank" | "none";
  comparison?: Comparison;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RESULT OF ASKING — always one of these three, never a fourth shape.
// ═══════════════════════════════════════════════════════════════════════════

/** Record type + id + timestamp — H.4.b's citation shape, verbatim. Every
 *  citation the planner emits is a foreign key into a table that actually
 *  exists; `query-planner.ts` builds one ONLY from a row it already read,
 *  never from a query parameter, which is what keeps V.9.7 ("every claim
 *  reaches a record") true by construction rather than by care. */
export interface Citation {
  recordType:
    | "academic_event"
    | "session_concept"
    | "pattern"
    | "occurrence"
    | "evidence"
    | "assessment_attempt"
    | "score_snapshot"
    | "academic_record";
  id: string;
  timestamp: string | null;
}

/** A query that resolved. `answer` is built strictly from `citations`
 *  (`narration.ts`'s discipline) — it is never a second, independently
 *  generated sentence that could drift from what was actually found. */
export interface MemoryResult {
  ok: true;
  query: StructuredQuery;
  answer: string;
  citations: Citation[];
  /** The raw rows the answer was built from, for a caller that wants to
   *  render a table rather than (or beside) the sentence. Never rendered
   *  without `citations` alongside it (H.4.b). */
  rows: unknown[];
}

/** The structured query was valid and ran, but nothing matched. NOT an
 *  error, and NOT the same case as `MemoryRefusal` — H.4.a: *"If the
 *  structured query returns zero rows, the answer is 'no record found' plus
 *  the query that was run. It is never a plausible sentence."* */
export interface MemoryEmpty {
  ok: true;
  query: StructuredQuery;
  answer: "no record found";
  citations: [];
  rows: [];
}

/** No `StructuredQuery` could be, or should be, produced. Two disjoint
 *  reasons, both structural rather than a model's opinion:
 *
 *    unanswerable   the question ASKS FOR A PREDICTION. M23-3 / V.9.6. The
 *                    system never asks the model whether this is true —
 *                    `isUnanswerablePrediction` decides it deterministically,
 *                    before any model is called, so a model cannot be
 *                    talked into predicting by rephrasing the refusal itself
 *                    as a query.
 *    unparseable    the model's own attempt at a `StructuredQuery` failed
 *                    validation (unknown field, unknown enum value, missing
 *                    required combination) OR the model declined. Either way
 *                    the system says so and offers the closed filters
 *                    (`offeredFilters`) instead of guessing. */
export interface MemoryRefusal {
  ok: false;
  reason: "unanswerable" | "unparseable";
  message: string;
  offeredFilters: {
    intents: readonly QueryIntent[];
    entities: readonly QueryEntity[];
  };
}

export type MemoryOutcome = MemoryResult | MemoryEmpty | MemoryRefusal;
