/**
 * M21 — TODAY ENGINE. Shared types. Pure, I/O-free.
 *
 * Architecture Part L (`Today`) in full; B.12 (Today Engine); V.7 (Today
 * non-fabrication).
 *
 * RULES THIS FILE OBEYS, WITHOUT EXCEPTION (same discipline as
 * `lib/recommendations/types.ts`, `lib/score-engine.ts`, `lib/personal-model.ts`):
 *   · Pure. No I/O, no database, no framework, no clock, no randomness.
 *   · Deterministic. Every time-dependent decision takes an explicit timestamp.
 *   · Non-mutating. Inputs are never written to; outputs are frozen.
 *
 * L.1: "Today owns no facts. It is a projection with a cache and one durable
 * field, students.last_seen_at (B.12)." Every type below is therefore either
 * an INPUT read from a projection this milestone does not own, or an OUTPUT
 * that is discarded and recomputed on the next render — nothing here is a
 * source of truth.
 */

import type { EvidenceRef } from "../recommendations/types";

export type { EvidenceRef };

// ═══════════════════════════════════════════════════════════════════════════
// L.4 — THE CLOSED SET OF EMPTY REASONS
//
// "empty_reason is set to one of a closed set: no_evidence_yet (new account,
// pre-baseline), all_current (nothing open, nothing due), awaiting_verification
// (the only outstanding thing is the student's own choice to verify or not),
// insufficient_data (an ingest or projection failure — surfaced honestly as a
// system state, never as 'you're all caught up')."
// ═══════════════════════════════════════════════════════════════════════════

export const TODAY_EMPTY_REASONS = [
  "no_evidence_yet",
  "all_current",
  "awaiting_verification",
  "insufficient_data",
] as const;

export type TodayEmptyReason = (typeof TODAY_EMPTY_REASONS)[number];

export const isTodayEmptyReason = (v: unknown): v is TodayEmptyReason =>
  typeof v === "string" && (TODAY_EMPTY_REASONS as readonly string[]).includes(v);

// ═══════════════════════════════════════════════════════════════════════════
// TODAY ITEM — a typed, evidence-backed row on the Today surface (L.1, L.3)
// ═══════════════════════════════════════════════════════════════════════════

// NOTE ON "unverified sessions" (L.2's "verification follow-up" input): they
// do NOT produce a dedicated item kind here. L.4 describes
// `awaiting_verification` as the case where "the only outstanding thing is
// the student's own choice to verify or not" — a self-chosen, non-gating
// follow-up (K.3) is exactly what `unverifiedSessionCandidates` already
// generates as a `next_best_action` candidate (`lib/recommendations/engine.ts`).
// When that candidate wins the priority sort it reaches Today as
// `next_best_action`; when it does not (cooldown, fatigue, a higher-priority
// candidate), Today does not manufacture a second, competing item for the
// same underlying fact — it explains its own emptiness via `empty_reason`
// instead (`selectEmptyReason` in `./engine.ts`).
export const TODAY_ITEM_KINDS = [
  "resume_session",
  "next_best_action",
  "accomplishment",
  "orientation",
] as const;

export type TodayItemKind = (typeof TODAY_ITEM_KINDS)[number];

/** V.7's "a recommendation reaches Today; it carries evidence_refs; following
 *  the refs reaches real records" — generalised to every item kind Today can
 *  emit, not only the recommendation-derived one. `refKind` names the
 *  domain object (`"session"`, `"score_snapshot"`, `"recommendation"`,
 *  `"occurrence"`, …) and `id` is that object's own identifier. */
export interface TodayItem {
  readonly kind: TodayItemKind;
  /** Stable across renders for the SAME underlying condition, so a client can
   *  diff without inventing identity. */
  readonly itemId: string;
  readonly subject: string | null;
  /** A reference, never a sentence — the same discipline E.8.a enforces on the
   *  session completion payload. The renderer composes words; this names
   *  which fact the words are about. */
   readonly reasonRef: string;
  readonly evidenceRefs: readonly EvidenceRef[];
  /** Only present on `accomplishment` items — the figures the Return beat
   *  reads, never a sentence (E.8.a's discipline, reused). `null` otherwise. */
  readonly figures: Readonly<Record<string, number | string | null>> | null;
}

export const isNonEmptyEvidenceRefs = (
  refs: readonly EvidenceRef[] | null | undefined,
): refs is readonly EvidenceRef[] =>
  Array.isArray(refs) &&
  refs.length >= 1 &&
  refs.every(r => typeof r?.refKind === "string" && r.refKind.length > 0 && typeof r?.id === "string" && r.id.length > 0);

// ═══════════════════════════════════════════════════════════════════════════
// TODAY STATE — the output. L.4: "Today emits zero items rather than one
// invented one."
// ═══════════════════════════════════════════════════════════════════════════

export interface TodayState {
  readonly items: readonly TodayItem[];
  /** Non-null only when `items.length === 0` — see `deriveTodayState`'s own
   *  invariant check. A populated list never carries a reason: there is
   *  nothing to explain. */
  readonly emptyReason: TodayEmptyReason | null;
  readonly generatedAtMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUTS — L.2's table, shaped for the pure engine. The I/O layer
// (`app/api/today/route.ts`) is responsible for turning live Supabase state
// into this shape; nothing here queries anything.
// ═══════════════════════════════════════════════════════════════════════════

export interface OpenSessionInput {
  readonly sessionId: string;
  readonly subject: string | null;
  readonly state: "ACTIVE" | "DORMANT";
}

export interface UnverifiedSessionInput {
  readonly sessionId: string;
  readonly subject: string | null;
  readonly closedAtMs: number;
}

/** A completed session's E.8 completion payload, reduced to the figures the
 *  Return beat needs. Sourced from `SessionCompletionPayload` — never a
 *  narrative, per E.8.a. */
export interface AccomplishmentInput {
  readonly sessionId: string;
  readonly subject: string | null;
  readonly closedAtMs: number;
  readonly conceptsConfirmedCount: number;
  readonly conceptsVerifiedCount: number;
  readonly newPatternsCount: number;
  readonly resolvedPatternsCount: number;
  readonly scoreDeltaTotal: number | null;
}

/** K.8's single next-best-action, already selected by
 *  `lib/recommendations/engine.ts`'s `selectNextBestAction` — Today does not
 *  reimplement candidate generation, priority or selection (L.3: "AI's only
 *  permitted role is compressing a deterministically computed diff … it
 *  never selects, orders, or invents an item" — and neither does this file). */
export interface NextBestActionInput {
  readonly recommendationId: string | null;
  readonly kind: string;
  readonly subject: string | null;
  readonly reasonTemplate: string;
  readonly evidenceRefs: readonly EvidenceRef[];
}

export interface ScoreStateInput {
  readonly state: "baseline" | "scored";
  readonly total: number | null;
  readonly confidence: number | null;
  readonly asOfMs: number;
  readonly scoreSnapshotId: string;
}

export interface TodayInputs {
  readonly nowMs: number;
  /** `null` means "never rendered before" — L.5: `last_seen_at` advances only
   *  when Today is actually rendered. */
  readonly lastSeenAtMs: number | null;

  /** V.7.3 — checked FIRST, before anything else. `false` means the read
   *  layer detected the projection pipeline is behind the event stream (an
   *  ingest or projection failure), never a routine daily-batch cadence. */
  readonly dataFreshness: { readonly ok: boolean };

  /** Whether the student has ANY academic event at all — distinguishes
   *  V.7.1 (`no_evidence_yet`, brand-new account) from every other empty
   *  case. Computed by the I/O layer from `academic_events`, not guessed
   *  here. */
  readonly hasAnyAcademicEvidence: boolean;

  readonly openSession: OpenSessionInput | null;
  readonly unverifiedSessions: readonly UnverifiedSessionInput[];
  readonly recentAccomplishments: readonly AccomplishmentInput[];
  readonly nextBestAction: NextBestActionInput | null;
  readonly score: ScoreStateInput | null;

  /** A small fixed maximum (L.3: "Volume is bounded"). Exposed as an input
   *  rather than a module constant so a test can exercise the truncation
   *  path without constructing dozens of fixtures. */
  readonly maxItems?: number;
}
