// ═══════════════════════════════════════════════════════════════════════════
// M10-1 — THE BLUEPRINT AND THE COVERAGE MANIFEST, FROZEN BEFORE ANY MODEL
// CALL.
//
// EXECUTION_PLAN M10-1: *"Blueprint + `coverage_manifest`, frozen **before any
// model call**. Done when: V.3.1."*
//
// V.3.1: *"Session with four confirmed concepts. `coverage_manifest` is frozen
// with all four BEFORE ANY MODEL CALL."*
//
// This module is architecture F.2 layer 2 and F.3's deterministic input table,
// transcribed. It is not a new design; where this file and Part F disagree,
// this file is the defect.
//
// It holds the DECISION and no I/O — no Supabase client, no clock, no network,
// no model, no `next/*`. The same split M9's `lib/study-session.ts` and
// `lib/session-concepts.ts` use, for the same reason: M10-1's done-when is a
// statement about ORDERING, and an ordering is provable with nothing live in
// reach (U.3) only if the thing being ordered has no I/O of its own.
//
//
// WHY "FROZEN" IS A TYPE AND NOT A COMMENT
//
// F.2 layer 2: *"Generation begins by computing a coverage manifest —
// DETERMINISTIC CODE enumerates the confirmed set, allocates a question count
// per concept, and FREEZES the result into `Assessment.coverage_manifest`
// BEFORE ANY MODEL CALL. The AI is asked to fill slots that already exist; it
// is never asked 'which concepts should this cover?'"*
//
// The cheap version of that sentence is a comment saying "compute the manifest
// first". It survives exactly until somebody adds a "let the model suggest one
// more topic" branch, and nothing in the type system, the schema or the tests
// notices. So the ordering is made UNREPRESENTABLE instead, in three layers:
//
//   1. TYPE. `FrozenBlueprint` carries a `unique symbol` brand that only
//      `freezeBlueprint()` applies. `lib/assessment-generation.ts` takes a
//      `CommittedManifest` — obtainable ONLY by passing a `FrozenBlueprint`
//      through `commitManifest()` — and the model interface it calls takes a
//      `BoundRequest` that can only be built from one. There is no type a
//      caller can construct that reaches a model without a frozen manifest
//      first.
//   2. RUNTIME. `freezeBlueprint()` deep-freezes (`Object.freeze` at every
//      level) and computes `manifest_hash` over canonical JSON. A later mutation
//      throws in strict mode and, where it does not, changes the hash — and
//      `verifyFrozen()` recomputes and refuses.
//   3. DATABASE. `023_assessments.sql` §1 makes `coverage_manifest`,
//      `manifest_hash`, `blueprint` and `blueprint_hash` NOT NULL at INSERT and
//      immutable thereafter (§6's freeze guard, binding the service role too),
//      and `generation_started_at` is refused unless it is `>= frozen_at`. The
//      row cannot exist without a frozen manifest, and generation cannot start
//      without the row. **A model call with no committed manifest behind it has
//      nowhere to write its output.**
//
// The manifest is FROZEN, not merely COMPUTED FIRST. Those differ: computed
// first is an ordering, frozen is an ordering the rest of the pipeline cannot
// undo.
//
//
// COVERAGE IS A FLOOR, NOT A CAP (F.2.b)
//
// The blueprint may hold more slots than the manifest requires — G.8 pattern
// retests and spaced re-checks on OTHER concepts. Those carry
// `targets_pattern_id` and `counts_toward_coverage = false`, and V.3.6 asks for
// exactly that separation. The time budget may trim them and may NEVER trim a
// coverage slot: F.3's table says the time budget affects *"total slot count,
// NEVER coverage breadth"*, and `applyTimeBudget()` below is written so the
// coverage slots are not even in the collection it filters.
//
// No imports beyond `./session-concepts` (types + the gate), `./ingest/hash`
// (canonical JSON) and `./sha256`. No clock: `frozen_at` is supplied.
// ═══════════════════════════════════════════════════════════════════════════

import { stableStringify } from "./ingest/hash";
import { sha256Hex } from "./sha256";
import { confirmedSessionConcepts, type RecordConcept, type SessionConceptRow } from "./session-concepts";

// ═══════════════════════════════════════════════════════════════════════════
// F.3 — THE DEPTH LADDER, AND F.4.a's CLOSED-FORM-ONLY POSTURE
// ═══════════════════════════════════════════════════════════════════════════

/** F.3: *"Depth ladder: `recall → application → transfer`."* In order, so
 *  escalation and de-escalation are index arithmetic rather than a lookup table
 *  somebody can get wrong in one direction only. */
export const DEPTH_LADDER = ["recall", "application", "transfer"] as const;
export type QuestionDepth = (typeof DEPTH_LADDER)[number];

/**
 * F.4.a's *"ARCHITECTURAL INFERENCE: the safest V1 posture is CLOSED-FORM
 * ONLY"*, and EXECUTION_PLAN M10-5's *"closed-form only in V1"*.
 *
 * `short_text` is deliberately absent — not commented out, not behind a flag,
 * ABSENT. A format this union does not name cannot be parsed, cannot be bound
 * to a slot and cannot be stored, so the promise that every stored question is
 * deterministically gradable (P.3.a — *"a model opinion is never a grade"*) is
 * a property of the vocabulary rather than of a reviewer's memory.
 */
export const CLOSED_FORM_FORMATS = ["mcq", "numeric", "ordering", "match"] as const;
export type QuestionFormat = (typeof CLOSED_FORM_FORMATS)[number];

/** F.2 — *"at least one question"* per confirmed concept. The floor of the
 *  floor: a manifest entry below this is not a narrower assessment, it is a
 *  coverage hole with a number in front of it. */
export const MIN_QUESTIONS_PER_CONCEPT = 1;

/** The ceiling per concept. F.3 lets `exam_weight` raise the count; without a
 *  cap one heavily-weighted chapter would consume an entire assessment and the
 *  other confirmed concepts would each get their floor and nothing more. */
export const MAX_QUESTIONS_PER_CONCEPT = 3;

/** F.3's `exam_weight` row. CBSE publishes unit marks out of 70 and
 *  `lib/taxonomy/cbse-physics.ts` divides them per chapter, so a chapter sits
 *  between ~3.3 and 7.0. Two thresholds, stated as data so a test can walk
 *  them, and deliberately coarse: `exam_weight` is a modelling assumption
 *  (that file says so), and a fine-grained function of an assumption is
 *  precision the input does not carry. */
export const WEIGHT_THRESHOLDS: readonly { atLeast: number; questions: number }[] = [
  { atLeast: 6.5, questions: 3 },
  { atLeast: 5.0, questions: 2 },
];

/**
 * F.5's anti-gaming caps, PORTED. *"Anti-gaming caps carry over from the
 * existing v2 engine … `DAILY_QUESTION_CAP = 60`, `MIN_SESSION_QUESTIONS = 5`
 * … **Keep the mechanism; move it from the score layer to the evidence
 * layer**, where a capped question is capped once for all consumers rather
 * than once per formula."*
 *
 * Declared here rather than imported from `lib/ledger-score-v2.ts` because this
 * pass may not touch that file and importing it would drag the whole score
 * engine into a module that must stay I/O- and dependency-free. The duplication
 * is FENCED the way `lib/ai-guard.ts` fences its regex list:
 * `tests/assessment-engine.test.mjs` reads both files and fails if the two
 * numbers are not identical.
 */
export const DAILY_QUESTION_CAP = 60;
export const MIN_SESSION_QUESTIONS = 5;

// ═══════════════════════════════════════════════════════════════════════════
// THE MANIFEST
// ═══════════════════════════════════════════════════════════════════════════

/** One obligation. F.2: every confirmed concept, with at least one question. */
export interface ManifestEntry {
  /** C.3's identity — a concept UUID, or `text:<normalised>` when the taxonomy
   *  refused to guess (B.4, V.2.4). An unresolved concept is still an
   *  obligation: V.2.6 asks for *"at least one question for the unresolved
   *  declaration."* */
  concept_ref: string;
  concept_id: string | null;
  /** ≥ `MIN_QUESTIONS_PER_CONCEPT`, always. */
  questions_required: number;
  /** F.3: *"Starting depth is a deterministic function of prior evidence."* */
  starting_depth: QuestionDepth;
  /** F.3: an open pattern *"forces at least one question at the failing depth,
   *  and targets the specific `error_type`."* */
  targets_error_type: string | null;
}

/** F.3's deterministic inputs, as one record per concept. Everything here is
 *  read from the record or the taxonomy; NOTHING here comes from a model. */
export interface ConceptGenerationInput {
  concept_ref: string;
  /** `concepts.exam_weight` (`007_mistakes.sql:50`). */
  exam_weight?: number;
  /** Prior accuracy on the concept, 0–1, from `AcademicRecord`. `undefined`
   *  means never assessed, which starts at `recall` — not at a guess. */
  prior_accuracy?: number;
  /** The failing depth of an open pattern on this concept, if there is one. */
  open_pattern_depth?: QuestionDepth;
  open_pattern_error_type?: string;
}

/** F.3's *"explicit difficulty preference … SELECTION ONLY, NEVER GRADING"*
 *  and *"inferred format preference … format mix within a depth"*.
 *
 *  F.3.a is the firewall and it is enforced by CONSTRUCTION: this type is an
 *  input to the blueprint and to nothing else. `answer_key` is not built here,
 *  `bindQuestion()` in `lib/assessment-generation.ts` never sees a
 *  `PersonalModelInput`, and M10-5's grading function will take
 *  `(question, attempt)` — *"and has no access to the personal model at all."* */
export interface PersonalModelInput {
  /** Shifts the STARTING depth by at most one rung. Never the answer key. */
  explicit_difficulty?: "easier" | "standard" | "harder";
  /** Format mix within a depth. Never which concepts are covered. */
  preferred_formats?: readonly QuestionFormat[];
}

export interface ManifestInput {
  /** Every session concept, in every state. The confirmed set is derived HERE,
   *  through `confirmedSessionConcepts()`, so a caller cannot hand this module
   *  a proposal and have it become coverage (M9-5's gate, honoured at its first
   *  downstream reader — `lib/session-concepts.ts`'s header names this module
   *  as that reader by name). */
  concepts: readonly SessionConceptRow[];
  /** Per-concept deterministic inputs, keyed by `concept_ref`. Missing is
   *  legal and means "nothing known", which is `recall` and the floor. */
  per_concept?: Readonly<Record<string, ConceptGenerationInput>>;
  personal_model?: PersonalModelInput;
}

export type ManifestOutcome =
  | { ok: true; manifest: readonly ManifestEntry[] }
  | { ok: false; reason: "no_confirmed_concepts" };

const clampDepth = (i: number): QuestionDepth =>
  DEPTH_LADDER[Math.min(DEPTH_LADDER.length - 1, Math.max(0, i))];

/** F.3: starting depth from prior evidence. Deterministic, total, and
 *  monotone in accuracy — a student who has done better never starts lower. */
export function startingDepthFor(input: ConceptGenerationInput | undefined): QuestionDepth {
  // An open pattern WINS. F.3: it *"forces at least one question at the failing
  // depth"*, and the failing depth is where the evidence says the gap is —
  // starting above it would test something the record already knows.
  if (input?.open_pattern_depth) return input.open_pattern_depth;
  const acc = input?.prior_accuracy;
  if (typeof acc !== "number" || !Number.isFinite(acc)) return "recall";
  if (acc >= 0.85) return "transfer";
  if (acc >= 0.6) return "application";
  return "recall";
}

/** F.3's `exam_weight` row: *"slots per concept"*. */
export function questionsRequiredFor(input: ConceptGenerationInput | undefined): number {
  const w = input?.exam_weight;
  if (typeof w === "number" && Number.isFinite(w)) {
    for (const t of WEIGHT_THRESHOLDS) {
      if (w >= t.atLeast) {
        return Math.min(MAX_QUESTIONS_PER_CONCEPT, Math.max(MIN_QUESTIONS_PER_CONCEPT, t.questions));
      }
    }
  }
  return MIN_QUESTIONS_PER_CONCEPT;
}

/**
 * F.2 layer 2's first half: *"deterministic code enumerates the confirmed set,
 * allocates a question count per concept."*
 *
 * **It cannot throw**, for `applySessionTransition()`'s reason: the caller is
 * an endpoint, and an endpoint that must wrap this in a `try` is one refactor
 * away from swallowing the refusal. An empty confirmed set is refused rather
 * than producing an empty manifest — an assessment with nothing to cover is not
 * a shorter assessment, it is a session that should never have reached
 * `ASSESSING`.
 */
export function buildCoverageManifest(input: ManifestInput): ManifestOutcome {
  const confirmed: RecordConcept[] = confirmedSessionConcepts(input.concepts);
  if (confirmed.length === 0) return { ok: false, reason: "no_confirmed_concepts" };

  const shift =
    input.personal_model?.explicit_difficulty === "harder" ? 1
      : input.personal_model?.explicit_difficulty === "easier" ? -1
        : 0;

  // Deduplicated by ref and ordered by ref, so the manifest — and therefore its
  // hash — is a pure function of the confirmed SET and not of row order.
  const seen = new Set<string>();
  const entries: ManifestEntry[] = [];

  for (const row of [...confirmed].sort((a, b) => (a.concept_ref < b.concept_ref ? -1 : 1))) {
    if (seen.has(row.concept_ref)) continue;
    seen.add(row.concept_ref);

    const per = input.per_concept?.[row.concept_ref];
    const base = DEPTH_LADDER.indexOf(startingDepthFor(per));

    entries.push({
      concept_ref: row.concept_ref,
      concept_id: row.concept_id,
      questions_required: questionsRequiredFor(per),
      // The preference moves the START only, and only by one rung. F.3.a: the
      // personal model is an input to *"which questions are asked"* and to
      // nothing else.
      starting_depth: per?.open_pattern_depth ? per.open_pattern_depth : clampDepth(base + shift),
      targets_error_type: per?.open_pattern_error_type ?? null,
    });
  }

  return { ok: true, manifest: entries };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE BLUEPRINT — the slots the model is asked to FILL
// ═══════════════════════════════════════════════════════════════════════════

export interface BlueprintSlot {
  slot_index: number;
  concept_ref: string;
  concept_id: string | null;
  depth: QuestionDepth;
  /** F.2.b. `true` for a manifest slot; `false` for a G.8 pattern retest, which
   *  *"counts toward that pattern and not toward session coverage"* (V.3.6). */
  counts_toward_coverage: boolean;
  /** F.2.b's attribution. Non-null exactly when `counts_toward_coverage` is
   *  false, and the pair is checked in `freezeBlueprint()`. */
  targets_pattern_id: string | null;
  /** F.3's *"targets the specific `error_type`"*, carried to the prompt. */
  targets_error_type: string | null;
}

/** F.2.b's *"due Mistake DNA retests on OTHER concepts"*. Supplied by the
 *  caller (M11 owns pattern selection); this module only places them. */
export interface RetestSlotRequest {
  concept_ref: string;
  concept_id: string | null;
  depth: QuestionDepth;
  pattern_id: string;
  error_type: string | null;
}

export interface BlueprintInput {
  manifest: readonly ManifestEntry[];
  retests?: readonly RetestSlotRequest[];
  /** F.3's *"time budget — student input at REVIEWING"*, in whole questions.
   *  It trims RETESTS ONLY. See `applyTimeBudget()`. */
  slot_budget?: number;
}

/**
 * F.3's table, applied. Coverage slots first, in manifest order, then retests.
 *
 * Coverage slots come first for a reason that is not cosmetic: `slot_budget`
 * trims from the end, and a blueprint whose retests were interleaved would make
 * "trim the tail" and "never trim coverage" two different operations that could
 * disagree.
 */
export function buildBlueprint(input: BlueprintInput): readonly BlueprintSlot[] {
  const slots: BlueprintSlot[] = [];

  for (const entry of input.manifest) {
    for (let i = 0; i < entry.questions_required; i++) {
      slots.push({
        slot_index: slots.length,
        concept_ref: entry.concept_ref,
        concept_id: entry.concept_id,
        // The ladder escalates DURING the assessment (F.3, a state machine in
        // code); the blueprint fixes only where each slot starts.
        depth: entry.starting_depth,
        counts_toward_coverage: true,
        targets_pattern_id: null,
        targets_error_type: entry.targets_error_type,
      });
    }
  }

  const retests = applyTimeBudget(input.retests ?? [], slots.length, input.slot_budget);
  for (const r of retests) {
    slots.push({
      slot_index: slots.length,
      concept_ref: r.concept_ref,
      concept_id: r.concept_id,
      depth: r.depth,
      counts_toward_coverage: false,
      targets_pattern_id: r.pattern_id,
      targets_error_type: r.error_type,
    });
  }

  return slots;
}

/**
 * F.3: the time budget affects *"total slot count, NEVER coverage breadth."*
 *
 * The guarantee is structural: the collection this function filters contains no
 * coverage slot, so there is no branch in which a tight budget drops one. A
 * budget below the coverage count yields zero retests and the coverage slots
 * survive untouched — the assessment gets longer than the student asked for,
 * which is the honest failure, because the alternative is an assessment that
 * silently stops covering what it promised (T5).
 */
export function applyTimeBudget(
  retests: readonly RetestSlotRequest[],
  coverageSlotCount: number,
  budget: number | undefined,
): readonly RetestSlotRequest[] {
  if (typeof budget !== "number" || !Number.isFinite(budget)) return retests;
  const room = Math.max(0, Math.floor(budget) - coverageSlotCount);
  return retests.slice(0, room);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE FREEZE — M10-1's done-when, made structural
// ═══════════════════════════════════════════════════════════════════════════

declare const FROZEN: unique symbol;

/**
 * A manifest and blueprint that have been frozen. The brand is `declare`d and
 * never emitted, so it costs nothing at runtime and **cannot be produced by an
 * object literal** — only `freezeBlueprint()` applies it.
 *
 * `lib/assessment-generation.ts` requires one to reach a model. That is the
 * whole of V.3.1 at the type level.
 */
export type FrozenBlueprint = {
  readonly assessment_id: string;
  readonly session_id: string;
  readonly student_id: string;
  readonly manifest: readonly ManifestEntry[];
  readonly blueprint: readonly BlueprintSlot[];
  readonly manifest_hash: string;
  readonly blueprint_hash: string;
  readonly frozen_at: string;
  readonly [FROZEN]: true;
};

export interface FreezeInput {
  assessment_id: string;
  session_id: string;
  student_id: string;
  manifest: readonly ManifestEntry[];
  blueprint: readonly BlueprintSlot[];
  /** ISO. Supplied — this module owns no clock. */
  frozen_at: string;
}

export type FreezeOutcome =
  | { ok: true; frozen: FrozenBlueprint }
  | {
      ok: false;
      reason:
        | "empty_manifest"
        | "uncovered_manifest_entry"
        | "slot_off_manifest"
        | "slot_index_disordered"
        | "retest_without_pattern"
        | "coverage_slot_with_pattern";
    };

/** Canonical JSON, then SHA-256. `stableStringify` sorts keys, so two
 *  structurally identical manifests hash the same regardless of construction
 *  order — which is what makes the hash an identity rather than a fingerprint of
 *  one particular code path. */
export const hashOf = (value: unknown): string => sha256Hex(stableStringify(value));

/** `Object.freeze` at every level. A shallow freeze leaves
 *  `manifest[0].questions_required = 0` writable, which is the one mutation
 *  that would matter. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

/**
 * Freeze the pair. **It cannot throw.**
 *
 * Six refusals, and every one of them is a way the assessment could have been
 * born already unable to satisfy F.2:
 *
 *   · an empty manifest — nothing to cover
 *   · a manifest entry with no slot, or too few — the coverage hole T5 names,
 *     present from the first millisecond
 *   · a slot for a concept the manifest does not name — off-manifest coverage,
 *     which is gate 1's failure one layer earlier
 *   · disordered `slot_index` — the blueprint is addressed by index, and an
 *     index that is not its position is a binding bug waiting to happen
 *   · a retest with no pattern, or a coverage slot WITH one — F.2.b's
 *     attribution collapsing, which is exactly what V.3.6 checks
 */
export function freezeBlueprint(input: FreezeInput): FreezeOutcome {
  if (input.manifest.length === 0) return { ok: false, reason: "empty_manifest" };

  const refs = new Set(input.manifest.map(e => e.concept_ref));
  const covered = new Map<string, number>();

  for (let i = 0; i < input.blueprint.length; i++) {
    const slot = input.blueprint[i];
    if (slot.slot_index !== i) return { ok: false, reason: "slot_index_disordered" };

    if (slot.counts_toward_coverage) {
      if (slot.targets_pattern_id !== null) return { ok: false, reason: "coverage_slot_with_pattern" };
      if (!refs.has(slot.concept_ref)) return { ok: false, reason: "slot_off_manifest" };
      covered.set(slot.concept_ref, (covered.get(slot.concept_ref) ?? 0) + 1);
    } else if (slot.targets_pattern_id === null) {
      return { ok: false, reason: "retest_without_pattern" };
    }
  }

  for (const entry of input.manifest) {
    if ((covered.get(entry.concept_ref) ?? 0) < entry.questions_required) {
      return { ok: false, reason: "uncovered_manifest_entry" };
    }
  }

  const manifest = deepFreeze(input.manifest.map(e => ({ ...e })));
  const blueprint = deepFreeze(input.blueprint.map(s => ({ ...s })));

  const frozen = deepFreeze({
    assessment_id: input.assessment_id,
    session_id: input.session_id,
    student_id: input.student_id,
    manifest,
    blueprint,
    manifest_hash: hashOf(manifest),
    blueprint_hash: hashOf(blueprint),
    frozen_at: input.frozen_at,
    // The brand is `declare`d and never emitted, so the object legitimately
    // lacks the key at runtime and TypeScript legitimately refuses the direct
    // cast. `as unknown as` here — in the ONE function that is allowed to mint
    // the brand — is the whole mechanism, and it is deliberately ugly so a
    // second one anywhere else is visible in a grep. A test greps for it.
  }) as unknown as FrozenBlueprint;

  return { ok: true, frozen };
}

/** Recompute both hashes and compare. The runtime half of the freeze: a
 *  mutation that `Object.freeze` did not stop (a cast, a `JSON.parse` round
 *  trip, a row read back from a database somebody edited) changes the hash, and
 *  this is what notices. */
export function verifyFrozen(frozen: FrozenBlueprint): boolean {
  return hashOf(frozen.manifest) === frozen.manifest_hash
    && hashOf(frozen.blueprint) === frozen.blueprint_hash;
}

/** F.2's guarantee, as a predicate a reader can call rather than a rule a
 *  reader must remember. `true` iff every manifest entry has a slot. */
export const isOnManifest = (frozen: FrozenBlueprint, conceptRef: string): boolean =>
  frozen.manifest.some(e => e.concept_ref === conceptRef);

/** The row `023` stores. Named keys, never a spread — `toEnvelope()`'s
 *  allowlist discipline from `lib/event-outbox.ts`: an extra field on the
 *  frozen object cannot ride into the insert. */
export function assessmentRowFor(frozen: FrozenBlueprint): Record<string, unknown> {
  return {
    assessment_id: frozen.assessment_id,
    session_id: frozen.session_id,
    student_id: frozen.student_id,
    coverage_manifest: frozen.manifest,
    manifest_hash: frozen.manifest_hash,
    blueprint: frozen.blueprint,
    blueprint_hash: frozen.blueprint_hash,
    frozen_at: frozen.frozen_at,
    status: "blueprinted",
  };
}
