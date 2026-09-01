/**
 * M20 — RECOMMENDATION ENGINE. Persistence transitions, outcome tracking,
 * and escalation without shaming. Pure domain logic.
 *
 * Implements Architecture Part K:
 *   K.4  — persistence, dismissal, and being ignored
 *   K.5  — escalation without shaming
 *   K.6  — outcome tracking
 *
 * Same discipline as `lib/recommendations/engine.ts`: pure, deterministic,
 * non-mutating, no I/O.
 */

import type { Recommendation, RecommendationOutcome, RecommendationState } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// K.4 — CLOSING A RECOMMENDATION
//
// "Dismissed → state = 'dismissed', an outcome row, and the dedupe_key is
// suppressed for a cooling window." / "Ignored — surfaced N times without
// action → state = 'ignored' on expiry." / "Superseded when the underlying
// condition changes... The row is closed... never silently deleted."
// ═══════════════════════════════════════════════════════════════════════════

export interface CloseResult {
  readonly state: RecommendationState;
  readonly outcome: RecommendationOutcome;
}

const closeAs = (
  rec: Recommendation,
  state: RecommendationState,
  outcomeKind: RecommendationOutcome["outcome"],
  atMs: number,
  extra?: Partial<Pick<RecommendationOutcome, "resultingSessionId" | "resultingResolutionId" | "benefitObserved">>,
): CloseResult => {
  if (rec.recommendationId === null) {
    throw new RangeError("Cannot close a recommendation that has not been persisted (recommendationId is null).");
  }
  return Object.freeze({
    state,
    outcome: Object.freeze({
      outcomeId: null,
      recommendationId: rec.recommendationId,
      outcome: outcomeKind,
      at: new Date(atMs).toISOString(),
      resultingSessionId: extra?.resultingSessionId ?? null,
      resultingResolutionId: extra?.resultingResolutionId ?? null,
      benefitObserved: extra?.benefitObserved ?? null,
    }),
  });
};

/** K.4 — "Dismissing costs nothing — no score effect, no follow-up
 *  penalty." This function itself proves that structurally: it returns only
 *  a state and an outcome row, and touches nothing about score, streak, or
 *  any other subsystem. There is no parameter through which a caller COULD
 *  wire a penalty in. */
export function dismiss(rec: Recommendation, atMs: number): CloseResult {
  return closeAs(rec, "dismissed", "dismissed", atMs);
}

/** K.6 — "the outcome links the resulting session or resolution, so 'do our
 *  recommendations actually close gaps for this student?' is answerable
 *  from data." */
export function actOn(
  rec: Recommendation,
  atMs: number,
  resulting: { sessionId?: string | null; resolutionId?: string | null; benefitObserved?: number | null },
): CloseResult {
  return closeAs(rec, "acted_on", "acted_on", atMs, {
    resultingSessionId: resulting.sessionId ?? null,
    resultingResolutionId: resulting.resolutionId ?? null,
    benefitObserved: resulting.benefitObserved ?? null,
  });
}

export function supersede(rec: Recommendation, atMs: number): CloseResult {
  return closeAs(rec, "superseded", "superseded", atMs);
}

/** K.4 — "surfaced N times without action → state = 'ignored' on expiry."
 *  Below the threshold, the row simply expires (no judgement attached — it
 *  may never have been shown enough times to count as ignored at all). */
export const IGNORED_SURFACE_THRESHOLD = 3;

export function expire(rec: Recommendation, atMs: number): CloseResult {
  const wasIgnored = rec.surfacedCount >= IGNORED_SURFACE_THRESHOLD;
  return closeAs(rec, wasIgnored ? "ignored" : "expired", "ignored_expired", atMs);
}

// ═══════════════════════════════════════════════════════════════════════════
// K.5 — ESCALATION WITHOUT SHAMING
//
// "Escalation changes channel and prominence, never tone, and never adds a
// judgement. The permitted ladder: in-context surfacing → Today placement →
// in-app notice → push (subject to quiet hours and appetite) → inclusion in
// a parent report only if the share policy already permits that category."
// ═══════════════════════════════════════════════════════════════════════════

export const ESCALATION_LADDER = [
  "in_context",
  "today_placement",
  "in_app_notice",
  "push",
  "parent_report",
] as const;

export type EscalationChannel = (typeof ESCALATION_LADDER)[number];

/**
 * The next escalation step, or `null` if there is none available right now.
 *
 * Deliberately, this function's inputs describe an ACADEMIC CONDITION
 * (`surfacedCount`, whether the underlying pattern/gap is still open) and
 * environment CONSTRAINTS (quiet hours, notification appetite, parent share
 * policy) — there is no `daysSinceLastSeen` / `daysInactive` parameter
 * anywhere in this signature. K.5: "no escalation whose trigger is absence
 * rather than an academic condition." The type system enforces the rule by
 * omission: this function has nothing to read that WOULD let it escalate on
 * absence, even by accident.
 */
export interface EscalationContext {
  readonly currentChannel: EscalationChannel | null;
  readonly conditionStillOpen: boolean; // e.g. the pattern is still open, the gap still exists
  readonly quietHoursActive: boolean;
  readonly pushAppetite: "minimal" | "standard" | "off";
  readonly parentShareAllowsCategory: boolean;
}

export function nextEscalationChannel(ctx: EscalationContext): EscalationChannel | null {
  if (!ctx.conditionStillOpen) return null; // K.4: superseded conditions never escalate further

  const currentIndex = ctx.currentChannel === null ? -1 : ESCALATION_LADDER.indexOf(ctx.currentChannel);

  for (let i = currentIndex + 1; i < ESCALATION_LADDER.length; i++) {
    const candidate = ESCALATION_LADDER[i];
    if (candidate === "push" && (ctx.quietHoursActive || ctx.pushAppetite === "off")) continue;
    if (candidate === "parent_report" && !ctx.parentShareAllowsCategory) continue;
    return candidate;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// K.5 — THE CONTENT RULE: FIXED, FACTUAL TEMPLATES, NEVER SHAMING
//
// "Forbidden... no 'you've been inactive for N days', no 'you're behind',
// no red counters, no comparison to other students, no escalation whose
// trigger is absence rather than an academic condition. AI may adapt tone
// within a template; it may not author the claim."
// ═══════════════════════════════════════════════════════════════════════════

/** Case-insensitive patterns for the specific banned phrase FAMILIES named
 *  in K.5 / PRODUCT_PRINCIPLES §4. Not an exhaustive shame-detector — a
 *  content rule for the FIXED templates this engine emits, checked by
 *  `tests/recommendations.test.mjs` against every `reasonTemplate` the
 *  candidate generators produce. */
const BANNED_SHAME_PATTERNS: readonly RegExp[] = [
  /inactive\s+for\s+\d+/i,
  /you'?ve\s+been\s+away/i,
  /you'?re\s+behind/i,
  /falling\s+behind/i,
  /\bstreak\b/i,
  /other\s+students?/i,
  /average\s+student/i,
  /compared?\s+to\b/i,
  /\bcoward\b|\blazy\b|\bfailing\s+you\b/i,
];

export function containsShameLanguage(text: string): boolean {
  return BANNED_SHAME_PATTERNS.some(re => re.test(text));
}
