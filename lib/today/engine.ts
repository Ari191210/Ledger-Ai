/**
 * M21 — TODAY ENGINE. Deterministic selection and ordering. Pure domain logic.
 *
 * Implements Architecture Part L:
 *   L.1  — Today owns no facts; a projection with a cache and one durable
 *          field (`students.last_seen_at`).
 *   L.2  — the input table (see `./types.ts`'s `TodayInputs`).
 *   L.3  — deterministic selection and ordering; volume bounded; AI never
 *          selects, orders or invents an item (not exercised here at all —
 *          this file has no AI call in it, by construction: no network
 *          import exists to make one with).
 *   L.4  — non-fabrication. Zero items rather than one invented one; the
 *          closed set of typed empty reasons; the explicitly-forbidden list.
 *   L.5  — continuity. An accomplishment is shown once, then filed to the
 *          record (`lastSeenAtMs`, not deletion, is the mechanism — see
 *          `accomplishmentsSince` below).
 *
 * V.7 Today non-fabrication, all six sub-clauses:
 *   V.7.1  brand-new account → `items = []`, `empty_reason = 'no_evidence_yet'`.
 *   V.7.2  everything current → `items = []`, `empty_reason = 'all_current'`.
 *   V.7.3  projection pipeline behind → `empty_reason = 'insufficient_data'`,
 *          checked FIRST, never overridden by any other condition — a lagging
 *          projection never says "all caught up".
 *   V.7.4  a recommendation with empty `evidence_refs` cannot be inserted —
 *          enforced upstream by `lib/recommendations/engine.ts`'s
 *          `buildCandidate`; this file additionally refuses to build ANY
 *          `TodayItem` with empty `evidenceRefs` (`buildTodayItem` below),
 *          extending the same discipline to every item kind Today emits.
 *   V.7.5  an accomplishment is shown once, then moves to the record.
 *   V.7.6  no `Math.random`, no hardcoded population figures, no peer
 *          comparisons — this file contains none, and MUST NEVER (grep this
 *          file in `tests/today.test.mjs` before trusting a future edit).
 *
 * RULES THIS FILE OBEYS, WITHOUT EXCEPTION (same discipline as
 * `lib/recommendations/engine.ts`, `lib/score-engine.ts`, `lib/mistakes/engine.ts`):
 *   · Pure. No I/O, no database, no framework, no clock, no randomness.
 *   · Deterministic. Every time-dependent decision takes an explicit
 *     timestamp (`inputs.nowMs`); every "which item wins / how items are
 *     ordered" decision is a total order, never array order alone.
 *   · Non-mutating. Inputs are never written to; outputs are frozen.
 *
 * NOT HERE: fetching the inputs (open sessions, unverified sessions, the
 * next-best-action, score, accomplishments) from Supabase, or advancing
 * `students.last_seen_at`. That is `app/api/today/route.ts`'s job — same
 * split M20 draws between `lib/recommendations/engine.ts` (pure) and its own
 * not-yet-built query layer (I/O), and the same split M19 draws between
 * extraction-as-a-job and aggregation-as-pure-logic.
 */

import {
  isNonEmptyEvidenceRefs,
  type AccomplishmentInput,
  type EvidenceRef,
  type TodayEmptyReason,
  type TodayInputs,
  type TodayItem,
  type TodayItemKind,
  type TodayState,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// V.7.4, EXTENDED — "AN ITEM THAT CANNOT NAME ITS EVIDENCE IS NOT
// CONSTRUCTIBLE." The TypeScript-side chokepoint every builder below calls
// through, mirroring `lib/recommendations/engine.ts`'s `buildCandidate`.
// ═══════════════════════════════════════════════════════════════════════════

export class TodayEvidenceRequiredError extends Error {
  constructor(kind: string) {
    super(
      `A Today item of kind "${kind}" was constructed with no evidenceRefs. ` +
        `Today owns no facts (L.1) — every item must point at a real record, or it ` +
        `is not constructible at all.`,
    );
    this.name = "TodayEvidenceRequiredError";
  }
}

export function buildTodayItem(input: {
  kind: TodayItemKind;
  itemId: string;
  subject: string | null;
  reasonRef: string;
  evidenceRefs: readonly EvidenceRef[];
  figures?: Readonly<Record<string, number | string | null>> | null;
}): TodayItem {
  if (!isNonEmptyEvidenceRefs(input.evidenceRefs)) {
    throw new TodayEvidenceRequiredError(input.kind);
  }
  if (!input.itemId || input.itemId.trim().length === 0) {
    throw new RangeError(`Today item of kind "${input.kind}" has an empty itemId.`);
  }
  return Object.freeze({
    kind: input.kind,
    itemId: input.itemId,
    subject: input.subject,
    reasonRef: input.reasonRef,
    evidenceRefs: Object.freeze(input.evidenceRefs.slice()),
    figures: input.figures ? Object.freeze({ ...input.figures }) : null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// L.5 / V.7.5 — "AN ACCOMPLISHMENT IS SHOWN ONCE, THEN FILED TO THE RECORD."
//
// The mechanism is `lastSeenAtMs`, not deletion. `students.last_seen_at`
// (B.12's one durable field) advances only when Today is actually rendered
// (L.5), so this function's INPUT — the full, unfiltered accomplishment
// list read from the permanent record (session completion payloads) — is
// available to any OTHER reader (Academic Memory, the record, an export)
// regardless of what Today has already shown. This function only decides
// what is NEW since the student last looked; it never removes anything from
// the record it reads from.
// ═══════════════════════════════════════════════════════════════════════════

export function accomplishmentsSince(
  accomplishments: readonly AccomplishmentInput[],
  lastSeenAtMs: number | null,
  nowMs: number,
): readonly AccomplishmentInput[] {
  const since = lastSeenAtMs ?? -Infinity; // null = never seen: everything is new
  return accomplishments
    .filter(a => a.closedAtMs > since && a.closedAtMs <= nowMs)
    .slice()
    .sort((a, b) => b.closedAtMs - a.closedAtMs || a.sessionId.localeCompare(b.sessionId));
}

// ═══════════════════════════════════════════════════════════════════════════
// L.3 — ITEM BUILDERS, ONE PER KIND, DETERMINISTIC ORDER WITHIN EACH
// ═══════════════════════════════════════════════════════════════════════════

function resumeItem(inputs: TodayInputs): TodayItem | null {
  const s = inputs.openSession;
  if (!s) return null;
  return buildTodayItem({
    kind: "resume_session",
    itemId: `resume_session:${s.sessionId}`,
    subject: s.subject,
    reasonRef: s.state === "ACTIVE" ? "session_active" : "session_dormant",
    evidenceRefs: [{ refKind: "session", id: s.sessionId }],
  });
}

function nextBestActionItem(inputs: TodayInputs): TodayItem | null {
  const r = inputs.nextBestAction;
  if (!r) return null;
  return buildTodayItem({
    kind: "next_best_action",
    // K.4-style identity: the SAME underlying recommendation must always
    // produce the SAME itemId, so a re-render does not manufacture a new
    // "item" for the same condition.
    itemId: `next_best_action:${r.recommendationId ?? r.kind}`,
    subject: r.subject,
    reasonRef: r.kind,
    evidenceRefs: r.evidenceRefs,
  });
}

function accomplishmentItems(inputs: TodayInputs): readonly TodayItem[] {
  const recent = accomplishmentsSince(inputs.recentAccomplishments, inputs.lastSeenAtMs, inputs.nowMs);
  return recent.map(a =>
    buildTodayItem({
      kind: "accomplishment",
      itemId: `accomplishment:${a.sessionId}`,
      subject: a.subject,
      reasonRef: "session_completed",
      evidenceRefs: [{ refKind: "session", id: a.sessionId }],
      figures: {
        concepts_confirmed_count: a.conceptsConfirmedCount,
        concepts_verified_count: a.conceptsVerifiedCount,
        new_patterns_count: a.newPatternsCount,
        resolved_patterns_count: a.resolvedPatternsCount,
        score_delta_total: a.scoreDeltaTotal,
      },
    }),
  );
}

/** The one orientation item — B.12/L.2's "current academic state … orientation
 *  item". A FIGURE (the score total/confidence), never a sentence, and only
 *  emitted once the student HAS a score (`state === 'scored'`) — a baseline
 *  student gets no orientation item, because there is nothing to orient
 *  against yet (that case is what makes `no_evidence_yet` reachable). */
function orientationItem(inputs: TodayInputs): TodayItem | null {
  const s = inputs.score;
  if (!s || s.state !== "scored") return null;
  return buildTodayItem({
    kind: "orientation",
    itemId: `orientation:${s.scoreSnapshotId}`,
    subject: null,
    reasonRef: "score_current",
    evidenceRefs: [{ refKind: "score_snapshot", id: s.scoreSnapshotId }],
    figures: { total: s.total, confidence: s.confidence, as_of_ms: s.asOfMs },
  });
}

const DEFAULT_MAX_ITEMS = 6;

/** L.3's "a small fixed maximum". Truncation keeps a FIXED priority order
 *  (resume > next-best-action > accomplishment > orientation) rather than
 *  array order alone, so which items survive a truncation is itself
 *  deterministic. */
function buildOrderedItems(inputs: TodayInputs): readonly TodayItem[] {
  const groups: readonly (readonly TodayItem[])[] = [
    [resumeItem(inputs)].filter((x): x is TodayItem => x !== null),
    [nextBestActionItem(inputs)].filter((x): x is TodayItem => x !== null),
    accomplishmentItems(inputs),
    [orientationItem(inputs)].filter((x): x is TodayItem => x !== null),
  ];
  const max = inputs.maxItems ?? DEFAULT_MAX_ITEMS;
  return groups.flat().slice(0, Math.max(0, max));
}

// ═══════════════════════════════════════════════════════════════════════════
// L.4 / V.7.1–V.7.3 — THE EMPTY-REASON SELECTION
// ═══════════════════════════════════════════════════════════════════════════

function selectEmptyReason(inputs: TodayInputs): TodayEmptyReason {
  // V.7.3 FIRST, ALWAYS. A lagging projection never says "all caught up" —
  // this check outranks every other condition below, including a brand-new
  // account: if the pipeline cannot be trusted, nothing downstream of it can
  // be trusted either, including "there is no evidence yet".
  if (!inputs.dataFreshness.ok) return "insufficient_data";

  // V.7.1. Genuinely nothing has ever happened on this account.
  if (!inputs.hasAnyAcademicEvidence) return "no_evidence_yet";

  // L.4's third member: the only outstanding thing is a self-chosen
  // verification, and it did not surface as `next_best_action` (e.g. it is
  // cooling down under K.7, or fatigued under K.2/K.6) — the student still
  // has something they COULD do, but nothing the system is asking of them.
  if (inputs.unverifiedSessions.length > 0) return "awaiting_verification";

  // V.7.2. Nothing open, nothing due, nothing to orient against that has not
  // already been shown.
  return "all_current";
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

export function deriveTodayState(inputs: TodayInputs): TodayState {
  // V.7.3 is checked before a single item is built — an insufficient-data
  // state emits zero items regardless of what other inputs contain, because
  // those other inputs are exactly what is not to be trusted.
  if (!inputs.dataFreshness.ok) {
    return Object.freeze({ items: [], emptyReason: "insufficient_data", generatedAtMs: inputs.nowMs });
  }

  const items = buildOrderedItems(inputs);

  if (items.length > 0) {
    return Object.freeze({ items: Object.freeze(items), emptyReason: null, generatedAtMs: inputs.nowMs });
  }

  return Object.freeze({ items: [], emptyReason: selectEmptyReason(inputs), generatedAtMs: inputs.nowMs });
}
