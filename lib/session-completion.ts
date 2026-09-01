// ═══════════════════════════════════════════════════════════════════════════
// M9-6 — THE COMPLETION PAYLOAD. FIGURES ONLY.
//
// EXECUTION_PLAN M9-6: *"Completion payload: figures only, **no `message`
// field**. Done when: E.8.a."*
//
// E.8: *"On reaching `VERIFIED` or `CLOSED_UNVERIFIED`, the Session Engine
// emits a completion payload — FACTS ONLY:*
//
//     { session_id, state, duration_real, concepts_confirmed[],
//       concepts_verified[], concepts_missed[], new_patterns[],
//       resolved_patterns[],
//       score_delta { by_dimension, confidence_before, confidence_after },
//       next_action_ref }
//
// E.8.a — governed rendering constraint. `PRODUCT_PRINCIPLES:281-284`: *"The
// Return beat is EVIDENCE, not celebration… Never a congratulation, never a
// 'you're on fire', never animated beyond the figure settling."* THE PAYLOAD IS
// THEREFORE A READING, and the architecture guarantees it can be rendered as
// one: **every field is a figure or a list, and THERE IS NO `message` OR
// `encouragement` FIELD FOR A MODEL TO FILL.**
//
//
// WHY THIS IS A TYPE AND NOT A CODE REVIEW NOTE
//
// The failure E.8.a is written against is not one anybody commits on purpose.
// It is the completely ordinary Tuesday on which a completion screen needs a
// headline, the backend is where the numbers are, and somebody adds
// `message: string` because that is obviously the tidy place to compose it.
// From that moment the product has a server-authored sentence about a
// student's studying, and every path that sentence can take — a template with a
// superlative, an AI boundary asked to "make it warmer", a copy change nobody
// reviews — arrives at either a congratulation §7 bans or a shame-adjacent
// remark §4 bans. The number is a fact; a sentence about the number is a
// judgement, and the two must not share an owner.
//
// So the constraint is enforced three ways, and NOT ONE OF THEM IS "we did not
// populate one":
//
//   1. TYPE. `SessionCompletionPayload = FiguresOnly<SessionCompletionFigures>`,
//      where `FiguresOnly<T>` intersects `T` with `{ [K in NarrativeKey]?:
//      never }`. Writing `payload.message = "Nice work"` is a COMPILE ERROR, and
//      adding `message: string` to the interface makes the intersection
//      unconstructable — the build breaks at the definition, not at a call site
//      somebody can silence.
//   2. CONSTRUCTION. `buildCompletionPayload()` names every key it writes, from
//      the frozen `COMPLETION_PAYLOAD_KEYS` tuple, and never spreads its input.
//      An extra field on the input cannot ride into the output. This is
//      `toEnvelope()`'s allowlist discipline in `lib/event-outbox.ts`, reused
//      for the same reason: *"a denylist that a future edit forgets to extend
//      fails open; an allowlist fails closed."*
//   3. RUNTIME. `assertFiguresOnly()` walks the finished object and throws if
//      any key at any depth is a narrative key, or if any string leaf looks like
//      PROSE rather than a REFERENCE — the test is "does it contain a space",
//      which no UUID, ISO timestamp, enum value or `concept_ref` ever does and
//      no sentence ever fails to. The builder calls it, so a payload carrying a
//      sentence cannot be built at all, including through a cast.
//
// The third one is what makes the guarantee survive `JSON.parse` and an `any`.
// The first is what makes it survive a hurried author.
//
//
// WHY THE PAYLOAD DOES NOT COMPUTE A SCORE
//
// V.2.5 — *"the score has not moved. A declaration is not evidence."* This
// module never derives `score_delta`; it accepts one and DISCARDS IT unless the
// session is `VERIFIED`, structurally, in one line the test pins. A
// declaration-only session closes `CLOSED_UNVERIFIED` (E.2 draws no other
// edge for it without an assessment), so its payload's `score_delta` is `null`
// by construction rather than by the caller remembering.
//
// E.2.a is the governing sentence and it cuts both ways: *"a closed-unverified
// session still contributes … what it does not contribute is PROOF, and the
// score therefore does not move on it. That distinction is honest; A PENALTY
// WOULD NOT BE."*
//
// No imports beyond `./study-session` and `./session-concepts` types. No clock.
// No network. No randomness. No model.
// ═══════════════════════════════════════════════════════════════════════════

import type { CloseReason, SessionState } from "./study-session";
import {
  confirmedSessionConcepts,
  proposalsIn,
  rejectionsIn,
  unresolvedIn,
  type SessionConceptRow,
} from "./session-concepts";

// ═══════════════════════════════════════════════════════════════════════════
// E.8.a — THE BANNED VOCABULARY
//
// Not a lint rule and not a convention: a type-level key list. Every word here
// is a place a sentence could live, collected by asking what a hurried author
// would actually name the field. `message` and `encouragement` are E.8.a's own
// two; the rest are the synonyms that would satisfy the same impulse while
// passing a grep for those two.
// ═══════════════════════════════════════════════════════════════════════════

export const NARRATIVE_KEYS = [
  "message",
  "encouragement",
  "summary",
  "headline",
  "note",
  "notes",
  "text",
  "copy",
  "praise",
  "caption",
  "body",
  "description",
  "comment",
  "commentary",
  "feedback",
  "remark",
  "celebration",
  "congratulation",
  "title",
  "subtitle",
  "blurb",
  "narrative",
  "prose",
  "label",
  "tagline",
  "verdict",
  "judgement",
  "judgment",
  "assessment_note",
  "coach_note",
  "insight",
  "highlight",
  "recap",
] as const;

export type NarrativeKey = (typeof NARRATIVE_KEYS)[number];

/**
 * The type-level half of E.8.a.
 *
 * `T & { [K in NarrativeKey]?: never }` makes every banned key optional-and-
 * `never`, which means: reading one is legal and always `undefined`, and
 * ASSIGNING one is a compile error, because nothing but `undefined` is
 * assignable to `never`. If somebody adds `message: string` to
 * `SessionCompletionFigures`, the intersection becomes `string & never` =
 * `never` for that key and the object literal in `buildCompletionPayload()`
 * stops compiling. The build breaks at the definition.
 */
export type FiguresOnly<T> = T & { readonly [K in NarrativeKey]?: never };

// ═══════════════════════════════════════════════════════════════════════════
// THE FIGURES
// ═══════════════════════════════════════════════════════════════════════════

/** E.8's `next_action_ref`. A REFERENCE, not a sentence: the UI owns the words
 *  and this owns which offer was earned. E.2.a's *"it generates a
 *  recommendation to verify later"* is the one this milestone can honestly
 *  make; anything else would be M20 inventing a recommendation, which Law 7
 *  bans. `null` is a legal and common answer. */
export const NEXT_ACTION_REFS = ["verify_these_concepts"] as const;
export type NextActionRef = (typeof NEXT_ACTION_REFS)[number];

/** E.8's `score_delta`. Present in the payload's SHAPE because E.8 names it,
 *  and `null` on every session this milestone can produce — see the header, and
 *  see `SESSION_SCORE_CONTRACT` in `lib/study-session.ts`. M14 fills it, for
 *  `VERIFIED` sessions, and for no others. */
export interface ScoreDelta {
  by_dimension: Readonly<Record<string, number>>;
  confidence_before: number | null;
  confidence_after: number | null;
}

/** E.8's terminal pair. `ABANDONED` is absent deliberately: E.8 says the
 *  payload is emitted *"on reaching VERIFIED or CLOSED_UNVERIFIED"*, and an
 *  abandoned session is one the student discarded before any evidence existed
 *  (E.2.b) — showing them a reading of a thing they chose to throw away is the
 *  product insisting on the last word. */
export const COMPLETION_STATES = ["VERIFIED", "CLOSED_UNVERIFIED"] as const;
export type CompletionState = (typeof COMPLETION_STATES)[number];

export const isCompletionState = (s: SessionState): s is CompletionState =>
  (COMPLETION_STATES as readonly SessionState[]).includes(s);

export interface SessionCompletionFigures {
  session_id: string;
  state: CompletionState;
  close_reason: CloseReason;

  opened_at: string;
  closed_at: string;
  /** E.8's `duration_real`. COMPUTED here from `opened_at` and `closed_at`,
   *  never stored — 021 §1 refuses a duration column because *"a stored
   *  duration is a number something starts optimising"*, and E.1 bans the
   *  session from being a productivity measure. It is reported because the
   *  student asked how long they were at it, not because anything scores it. */
  duration_real_ms: number;

  /** E.8's three lists. `concept_ref`s (C.3's identity), not rows and not
   *  labels: a ref is a reference, and handing the renderer `declared_text`
   *  from here would put the student's own sentence inside a payload this
   *  module has just promised contains no sentences. The renderer joins. */
  concepts_confirmed: readonly string[];
  /** M10's. Empty until the Assessment Engine exists — an honest empty list,
   *  which §2 prefers to a fabricated one. */
  concepts_verified: readonly string[];
  /** Confirmed but not verified: what the session studied and did not prove.
   *  Derived, never supplied, so it cannot disagree with the two above. */
  concepts_missed: readonly string[];

  /** The review step, as figures. E.6's rejections are COUNTED here rather than
   *  hidden: the number of proposals a student turned down is a fact about how
   *  well detection did, and a payload that reported only acceptances would be
   *  the same selective reading E.6 refuses at the storage layer. */
  concepts_proposed_count: number;
  concepts_confirmed_count: number;
  concepts_rejected_count: number;
  /** V.2.4's legal nulls, counted. B.4's taxonomy review queue is fed by these. */
  concepts_unresolved_count: number;

  /** M11's. Empty here, and E.8.b governs how they are composed when they are
   *  not: *"mistakes must not dominate the completion screen … the payload is
   *  ordered by the composition rules in Part M, not by severity."* */
  new_patterns: readonly string[];
  resolved_patterns: readonly string[];

  /** D.2's `E` column, counted. It is the number E.2.b's discard precondition
   *  reads, and it is the honest answer to "did anything happen here that could
   *  be evidence". */
  evidence_event_count: number;

  /** `null` unless the session is `VERIFIED`. Forced, not trusted. */
  score_delta: ScoreDelta | null;

  next_action_ref: NextActionRef | null;
}

/** The type the endpoint returns. E.8.a, enforced by the type system. */
export type SessionCompletionPayload = FiguresOnly<SessionCompletionFigures>;

/**
 * The exact key set, frozen, in the order the object is built.
 *
 * It exists so a test can assert equality against `Object.keys(payload)` — a
 * field added to the payload without being added here fails the suite, and a
 * field added to both is a deliberate, reviewed act. `satisfies` ties it to the
 * interface, so a key removed from the interface but left here does not
 * compile.
 */
export const COMPLETION_PAYLOAD_KEYS = [
  "session_id",
  "state",
  "close_reason",
  "opened_at",
  "closed_at",
  "duration_real_ms",
  "concepts_confirmed",
  "concepts_verified",
  "concepts_missed",
  "concepts_proposed_count",
  "concepts_confirmed_count",
  "concepts_rejected_count",
  "concepts_unresolved_count",
  "new_patterns",
  "resolved_patterns",
  "evidence_event_count",
  "score_delta",
  "next_action_ref",
] as const satisfies readonly (keyof SessionCompletionFigures)[];

// ═══════════════════════════════════════════════════════════════════════════
// THE RUNTIME GUARD
//
// The type is invisible to `JSON.parse`, to an `any`, and to a cast. This is
// not, and it is the reason a payload carrying a sentence cannot be BUILT.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A REFERENCE, as opposed to prose. UUIDs, ISO-8601 timestamps, enum values,
 * `concept_ref`s (`text:moment of inertia` — normalised, and therefore
 * space-separated, so it is deliberately excluded from being a bare leaf and is
 * only ever carried inside the ref lists, where §L below permits it).
 *
 * The discriminator is "contains no whitespace and is not long". Every
 * legitimate scalar in this payload passes it; no sentence in any language
 * with word separators does.
 */
const REFERENCE_SCALAR = /^[A-Za-z0-9_:.+\-]{1,128}$/;

/** `concept_ref` may contain spaces when unresolved (`text:wobbling tops`) —
 *  it is the student's normalised words used as a key. Refs live only in the
 *  three list fields, and only there is the looser shape allowed. Capped so a
 *  paragraph cannot be smuggled in as a "ref". */
const REF_LIST_FIELDS = new Set<string>([
  "concepts_confirmed",
  "concepts_verified",
  "concepts_missed",
  "new_patterns",
  "resolved_patterns",
]);
const MAX_REF_CHARS = 256;

export class NarrativeFieldError extends Error {}

const NARRATIVE_SET: ReadonlySet<string> = new Set(NARRATIVE_KEYS);

/**
 * Walk a finished payload and refuse anything a model could have written.
 *
 * Throws rather than returning a verdict, because there is no sensible way for
 * a caller to continue: the alternative to throwing is shipping the sentence.
 */
export function assertFiguresOnly(value: unknown, path = "payload"): void {
  if (value === null || value === undefined) return;

  if (typeof value === "number" || typeof value === "boolean") return;

  if (typeof value === "string") {
    if (!REFERENCE_SCALAR.test(value)) {
      throw new NarrativeFieldError(
        `${path} is prose, not a figure or a reference (E.8.a): ${JSON.stringify(value.slice(0, 64))}`,
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    const listName = path.slice(path.lastIndexOf(".") + 1).replace(/\[\d+\]$/, "");
    const refsAllowed = REF_LIST_FIELDS.has(listName);
    value.forEach((item, i) => {
      if (refsAllowed && typeof item === "string") {
        if (item.length === 0 || item.length > MAX_REF_CHARS) {
          throw new NarrativeFieldError(`${path}[${i}] is not a usable reference (E.8.a)`);
        }
        return;
      }
      assertFiguresOnly(item, `${path}[${i}]`);
    });
    return;
  }

  if (typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (NARRATIVE_SET.has(key)) {
        throw new NarrativeFieldError(
          `${path}.${key} is a narrative field — E.8.a: the payload is a reading, and there is no ` +
            `message or encouragement field for a model to fill`,
        );
      }
      assertFiguresOnly(v, `${path}.${key}`);
    }
    return;
  }

  throw new NarrativeFieldError(`${path} is not a figure, a reference or a list (E.8.a)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export interface CompletionInput {
  session_id: string;
  state: CompletionState;
  close_reason: CloseReason;
  opened_at: string;
  closed_at: string;
  evidence_event_count: number;
  /** Every session concept, in every state. The builder derives the three lists
   *  and the four counts from this one input, so they cannot disagree. */
  concepts: readonly SessionConceptRow[];
  /** M10's output. Refs of concepts an assessment actually proved. Empty in
   *  this milestone, and an honest empty list rather than a placeholder. */
  verified_refs?: readonly string[];
  /** M11's. Empty in this milestone. */
  new_patterns?: readonly string[];
  resolved_patterns?: readonly string[];
  /** M14's. IGNORED unless `state === 'VERIFIED'`. See the header. */
  score_delta?: ScoreDelta | null;
}

export type CompletionOutcome =
  | { ok: true; payload: SessionCompletionPayload }
  | { ok: false; reason: "not_a_completion_state" | "bad_timestamps" };

/**
 * E.8's payload, built by naming every key.
 *
 * It does not spread `input`. That is the whole of mechanism 2 in the header:
 * a spread would carry any field the caller invented — including a `message`
 * — straight into the response, and the type would not stop it because the
 * caller's object is where the extra key lives.
 */
export function buildCompletionPayload(input: CompletionInput): CompletionOutcome {
  if (!isCompletionState(input.state)) return { ok: false, reason: "not_a_completion_state" };

  const openedMs = Date.parse(input.opened_at);
  const closedMs = Date.parse(input.closed_at);
  if (!Number.isFinite(openedMs) || !Number.isFinite(closedMs) || closedMs < openedMs) {
    // Refused rather than clamped to zero. A negative duration means the two
    // timestamps disagree, and reporting `0` would present a disagreement as a
    // measurement — Law 7's failure in miniature.
    return { ok: false, reason: "bad_timestamps" };
  }

  const confirmed = confirmedSessionConcepts(input.concepts);
  const confirmedRefs = confirmed.map(c => c.concept_ref);
  const verifiedRefs = [...(input.verified_refs ?? [])];
  const verifiedSet = new Set(verifiedRefs);

  const payload: SessionCompletionPayload = {
    session_id: input.session_id,
    state: input.state,
    close_reason: input.close_reason,
    opened_at: input.opened_at,
    closed_at: input.closed_at,
    duration_real_ms: closedMs - openedMs,

    concepts_confirmed: confirmedRefs,
    concepts_verified: verifiedRefs,
    // Derived, so "confirmed but unproven" can never be reported as anything
    // other than the difference of the two lists above it.
    concepts_missed: confirmedRefs.filter(r => !verifiedSet.has(r)),

    concepts_proposed_count: proposalsIn(input.concepts).length,
    concepts_confirmed_count: confirmed.length,
    concepts_rejected_count: rejectionsIn(input.concepts).length,
    concepts_unresolved_count: unresolvedIn(input.concepts).length,

    new_patterns: [...(input.new_patterns ?? [])],
    resolved_patterns: [...(input.resolved_patterns ?? [])],

    evidence_event_count: input.evidence_event_count,

    // V.2.5, STRUCTURALLY. A supplied delta on a non-VERIFIED session is
    // DISCARDED, not trusted and not warned about — the only session state that
    // can carry a score movement is the one an assessment produced.
    score_delta: input.state === "VERIFIED" ? (input.score_delta ?? null) : null,

    next_action_ref: nextActionRefFor(input.state, confirmedRefs.length),
  };

  // Mechanism 3. Throws on prose, so a payload with a sentence in it never
  // reaches a caller — including one that got here through a cast.
  assertFiguresOnly(payload);

  return { ok: true, payload };
}

/**
 * E.2.a's *"it generates a recommendation to verify later"*, as a reference.
 *
 * Offered only when there is something honest to offer: a closed-unverified
 * session that confirmed at least one concept. A session that confirmed none
 * gets `null` rather than a manufactured suggestion — `nextMoveFor()` in
 * `lib/study-session.ts` makes the same refusal for the same reason (*"M20 owns
 * recommendations, and inventing one here would be the fabrication Law 7
 * bans"*).
 *
 * A `VERIFIED` session gets `null` too. The assessment is the next move it
 * already took.
 */
export function nextActionRefFor(
  state: CompletionState,
  confirmedCount: number,
): NextActionRef | null {
  if (state === "CLOSED_UNVERIFIED" && confirmedCount > 0) return "verify_these_concepts";
  return null;
}
