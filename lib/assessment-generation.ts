// ═══════════════════════════════════════════════════════════════════════════
// M10-2 — THE SEVEN GENERATION GATES, AND SLOT BINDING.
//
// EXECUTION_PLAN M10-2: *"The seven generation gates; slot binding rejects
// off-manifest questions. Done when: V.3.2."*
//
// V.3.2: *"Generation returns a question for a fifth concept. **Rejected at
// gate 1** (slot binding); it never reaches the student."*
//
// This module is architecture F.4, transcribed. F.4 is the central question of
// Part F and it answers itself in one sentence: *"the AI's output is NEVER
// TRUSTED — it is VALIDATED INTO trustworthiness by deterministic code, and its
// provenance is retained so the trust can be revoked retroactively."*
//
// Every gate below is deterministic. **A failure at any gate discards the
// candidate; nothing is repaired.** That is F.4's own wording and it is the
// opposite of the ordinary instinct, which is to fix the one field that came
// back wrong. A repaired question is a question nobody wrote: not the model's,
// because it was edited, and not the system's, because it was not derived. The
// slot is retried, or filled from the bank (M10-3), or the session refuses to
// verify (M10-4). Those are the three endings, and "patch it up" is not a
// fourth.
//
//
// THE ORDERING GUARANTEE — WHY THIS FILE CANNOT REACH A MODEL FIRST
//
// V.3.1 requires the coverage manifest frozen BEFORE any model call.
// `lib/assessment-blueprint.ts` makes the freeze a branded type; this file
// makes the COMMIT one:
//
//   FrozenBlueprint  --commitManifest(deps.persist)-->  CommittedManifest
//   CommittedManifest --requestFor(slot)-->  BoundRequest
//   GenerationModel.generate(BoundRequest)          ← the only model entry point
//
// `GenerationModel.generate` takes a `BoundRequest`. A `BoundRequest` carries a
// `unique symbol` brand applied only by `requestFor()`, which takes a
// `CommittedManifest`, whose brand is applied only by `commitManifest()`, which
// AWAITS `deps.persist` before applying it. There is no expression a caller can
// write that reaches the model without the manifest already being written.
// `tests/assessment-engine.test.mjs` proves the ordering twice — once by the
// recorded call log, and once by asserting that a deps whose `persist` rejects
// produces zero model calls.
//
//
// NO I/O, AND NO ANTHROPIC CLIENT
//
// The model is an INTERFACE (`GenerationModel`), the re-deriver is an interface,
// moderation is an interface, persistence is an interface.
// `app/api/assessment/generate/route.ts` supplies all four and wraps them in
// `lib/ai-guard.ts` — the same six checks in the same order `app/api/ai/route.ts`
// has run in front of every model call since M0, and the same posture M8-4 took
// rather than inventing a second, unguarded path to a model.
//
// No clock (`now` is injected). No randomness. No network. No `next/*`.
// ═══════════════════════════════════════════════════════════════════════════

import { scanForHarmfulContent } from "./ai-guard";
import { normaliseConceptText } from "./concept-resolution";
import { sha256Hex } from "./sha256";
import {
  CLOSED_FORM_FORMATS,
  DEPTH_LADDER,
  hashOf,
  isOnManifest,
  type BlueprintSlot,
  type FrozenBlueprint,
  type QuestionDepth,
  type QuestionFormat,
} from "./assessment-blueprint";

/** Bump when the prompt or the output contract changes. F.4.b's revocation
 *  path keys on it: *"`AssessmentQuestion.provenance.prompt_version = v`
 *  identifies every affected question."* Today's `ai_history` stores output but
 *  no prompt version, which is why the current architecture cannot revoke at
 *  all. */
export const GENERATION_PROMPT_VERSION = "1";

/** Q.2's capability name. One capability, one typed input, one typed output —
 *  Q.4's *"typed input and output schemas per capability"*, and the template
 *  M15 generalises to the other eight. */
export const GENERATION_CAPABILITY = "assessment_generate";

/** F.2.a: *"After N retries, the slot is filled from the retained bank."* */
export const MAX_GENERATION_ATTEMPTS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// THE TYPED OUTPUT CONTRACT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * F.3.b / P.3.a — the answer key is STRUCTURED, and a deterministic function
 * can check an attempt against it with no model in the path. There is no
 * `rubric` arm and no free-text arm: M10-5 grades *"100% deterministically
 * against `answer_key`"*, and a key it cannot evaluate is not a stricter key,
 * it is a model opinion with a schema around it.
 */
export type AnswerKey =
  /** F.4 gate 3 rejects `correct_indices.length !== 1`. It is a LIST rather
   *  than an index precisely so that "0 or ≥2 keyed-correct options" is
   *  representable and therefore rejectable — an `index: number` would make the
   *  defect unsayable and the gate untestable. */
  | { kind: "mcq"; correct_indices: readonly number[] }
  | { kind: "numeric"; value: number; unit: string | null; tolerance: number }
  | { kind: "ordering"; order: readonly number[] }
  | { kind: "match"; pairs: readonly (readonly [number, number])[] };

/** What one model call is allowed to return, per slot. */
export interface QuestionCandidate {
  concept_ref: string;
  depth: QuestionDepth;
  format: QuestionFormat;
  stem: string;
  /** Required for `mcq`, `ordering` and `match`; `null` for `numeric`. */
  options: readonly string[] | null;
  answer_key: AnswerKey;
  marks: number;
}

/** F.4: *"Only after all seven does the question receive `admitted_at` and
 *  become presentable. `provenance` (C.3) is written at admission."* */
export interface QuestionProvenance {
  capability: string;
  prompt_version: string;
  model: string;
  rederiver_model: string | null;
  /** Which of the two sources filled the slot. `bank` never touched a model. */
  origin: "generated" | "bank";
  /** The frozen manifest this question was bound against. F.4.b's revocation
   *  needs to find every question generated under one manifest as well as under
   *  one prompt version. */
  manifest_hash: string;
  gates_passed: readonly GateName[];
}

export interface AdmittedQuestion {
  question_id: string;
  assessment_id: string;
  session_id: string;
  student_id: string;
  slot_index: number;
  concept_ref: string;
  concept_id: string | null;
  counts_toward_coverage: boolean;
  targets_pattern_id: string | null;
  depth: QuestionDepth;
  format: QuestionFormat;
  stem: string;
  /** F.4 gate 6's key, retained so the NEXT assessment can refuse a repeat
   *  without re-reading every stem the student has ever seen. */
  stem_hash: string;
  options: readonly string[] | null;
  answer_key: AnswerKey;
  marks: number;
  admitted_at: string;
  provenance: QuestionProvenance;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE SEVEN GATES — F.4's table, as data
//
// The list is data rather than a chain of `if`s so that "there are seven, in
// this order" is provable by a test reading the array, and so a gate cannot be
// added, removed or reordered without the test noticing. F.4's table read top
// to bottom.
// ═══════════════════════════════════════════════════════════════════════════

export const GATES = [
  "slot_binding",
  "schema",
  "structure",
  "answerability",
  "self_consistency",
  "novelty",
  "moderation",
] as const;
export type GateName = (typeof GATES)[number];

/** What each gate rejects, in F.4's own words. Carried in code so a refusal can
 *  cite the specification rather than a paraphrase of it. */
export const GATE_REJECTS: Readonly<Record<GateName, string>> = {
  slot_binding: "question whose concept_id is not the requested slot's",
  schema: "output not matching the typed question schema",
  structure: "MCQ with 0 or >=2 keyed-correct options; duplicate options; empty stem; answer text in the stem",
  answerability: "numeric answers failing a units/precision parse; keys not present in the option set",
  self_consistency: "an independent re-derivation disagreeing with the answer key",
  novelty: "a stem the student has already seen, or one restating the declaration",
  moderation: "content the two-layer moderation stack refuses",
};

export type GateOutcome =
  | { ok: true }
  | { ok: false; gate: GateName; detail: string };

// ═══════════════════════════════════════════════════════════════════════════
// GATE 1 · SLOT BINDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * F.4 gate 1: *"question whose `concept_id` ≠ the requested slot."*
 * F.2 layer 3: *"A question for the wrong concept is REJECTED AND THE SLOT IS
 * RETRIED, NEVER REASSIGNED."*
 *
 * Reassignment is the tempting repair and it is the one that breaks the
 * guarantee: a question generated for concept 5 and filed under concept 3's
 * slot makes the manifest look satisfied while concept 3 was never tested, and
 * the session reaches `VERIFIED` with a hole in it — T5, exactly.
 */
export function gateSlotBinding(slot: BlueprintSlot, candidate: { concept_ref?: unknown }): GateOutcome {
  const ref = typeof candidate.concept_ref === "string" ? candidate.concept_ref : "";
  if (ref !== slot.concept_ref) {
    return {
      ok: false,
      gate: "slot_binding",
      detail: `slot ${slot.slot_index} asked for ${slot.concept_ref}; the candidate names ${ref || "nothing"}`,
    };
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// GATE 2 · SCHEMA VALIDATION
//
// Q.4: *"Output that fails validation is REJECTED, not degraded … The greedy
// brace regex is deleted."* Every field is checked; a field that does not check
// discards the candidate rather than defaulting.
// ═══════════════════════════════════════════════════════════════════════════

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const int = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) ? v : null;

export const MAX_STEM_CHARS = 1200;
export const MAX_OPTION_CHARS = 400;
export const MAX_OPTIONS = 8;

function parseAnswerKey(format: QuestionFormat, raw: unknown): AnswerKey | null {
  if (!raw || typeof raw !== "object") return null;
  const k = raw as Record<string, unknown>;
  if (k.kind !== format) return null;

  if (format === "mcq") {
    if (!Array.isArray(k.correct_indices)) return null;
    const idx = k.correct_indices.map(int);
    if (idx.some(v => v === null)) return null;
    return { kind: "mcq", correct_indices: idx as number[] };
  }
  if (format === "numeric") {
    if (typeof k.value !== "number" || !Number.isFinite(k.value)) return null;
    if (typeof k.tolerance !== "number" || !Number.isFinite(k.tolerance) || k.tolerance < 0) return null;
    const unit = k.unit === null || k.unit === undefined ? null : str(k.unit, 32);
    return { kind: "numeric", value: k.value, unit: unit === "" ? null : unit, tolerance: k.tolerance };
  }
  if (format === "ordering") {
    if (!Array.isArray(k.order)) return null;
    const order = k.order.map(int);
    if (order.some(v => v === null)) return null;
    return { kind: "ordering", order: order as number[] };
  }
  if (!Array.isArray(k.pairs)) return null;
  const pairs: [number, number][] = [];
  for (const p of k.pairs) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const a = int(p[0]);
    const b = int(p[1]);
    if (a === null || b === null) return null;
    pairs.push([a, b]);
  }
  return { kind: "match", pairs };
}

export type SchemaResult =
  | { ok: true; candidate: QuestionCandidate }
  | { ok: false; gate: "schema"; detail: string };

/** F.4 gate 2: *"output not matching the typed question schema (stem, format,
 *  options, `answer_key`, depth)."* */
export function gateSchema(raw: unknown): SchemaResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, gate: "schema", detail: "the candidate is not an object" };
  }
  const c = raw as Record<string, unknown>;

  const conceptRef = str(c.concept_ref, 256);
  if (!conceptRef) return { ok: false, gate: "schema", detail: "no concept_ref" };

  const depth = str(c.depth, 20) as QuestionDepth;
  if (!(DEPTH_LADDER as readonly string[]).includes(depth)) {
    return { ok: false, gate: "schema", detail: `'${depth}' is not a depth on the ladder` };
  }

  const format = str(c.format, 20) as QuestionFormat;
  if (!(CLOSED_FORM_FORMATS as readonly string[]).includes(format)) {
    // F.4.a — closed-form only in V1. A `short_text` candidate is refused here
    // and not "supported later": a format whose grading needs a model is a
    // format whose results are not E-class (P.3.a).
    return { ok: false, gate: "schema", detail: `'${format}' is not a closed-form format` };
  }

  const stem = str(c.stem, MAX_STEM_CHARS);
  if (!stem) return { ok: false, gate: "schema", detail: "empty stem" };

  let options: string[] | null = null;
  if (format !== "numeric") {
    if (!Array.isArray(c.options)) {
      return { ok: false, gate: "schema", detail: `${format} needs an option list` };
    }
    options = c.options.slice(0, MAX_OPTIONS).map(o => str(o, MAX_OPTION_CHARS));
    if (options.length < 2 || options.some(o => o === "")) {
      return { ok: false, gate: "schema", detail: "the option list is short or has an empty entry" };
    }
  } else if (c.options !== null && c.options !== undefined) {
    return { ok: false, gate: "schema", detail: "a numeric question carries no options" };
  }

  const answerKey = parseAnswerKey(format, c.answer_key);
  if (!answerKey) return { ok: false, gate: "schema", detail: "the answer key does not match the format" };

  const marks = int(c.marks);
  if (marks === null || marks < 1 || marks > 10) {
    return { ok: false, gate: "schema", detail: "marks must be a whole number between 1 and 10" };
  }

  return { ok: true, candidate: { concept_ref: conceptRef, depth, format, stem, options, answer_key: answerKey, marks } };
}

// ═══════════════════════════════════════════════════════════════════════════
// GATE 3 · STRUCTURAL WELL-FORMEDNESS
// ═══════════════════════════════════════════════════════════════════════════

const normalise = (s: string): string => normaliseConceptText(s);

/** F.4 gate 3: *"MCQ with 0 or ≥2 keyed-correct options; duplicate options;
 *  empty stem; ANSWER TEXT APPEARING VERBATIM IN THE STEM."*
 *
 *  The last one is the subtle one and it is why this gate is not folded into
 *  gate 2: a question whose stem contains its own answer is perfectly
 *  well-typed and completely worthless as evidence, and it is exactly what a
 *  model produces when asked to write about a concept it has just been given a
 *  definition of. */
export function gateStructure(c: QuestionCandidate): GateOutcome {
  const fail = (detail: string): GateOutcome => ({ ok: false, gate: "structure", detail });

  if (c.stem.trim().length === 0) return fail("empty stem");

  if (c.answer_key.kind === "mcq" && c.answer_key.correct_indices.length !== 1) {
    return fail(`an MCQ has exactly one keyed-correct option; this has ${c.answer_key.correct_indices.length}`);
  }

  if (c.options) {
    const seen = new Set<string>();
    for (const o of c.options) {
      const key = normalise(o);
      if (seen.has(key)) return fail(`duplicate option: ${o}`);
      seen.add(key);
    }
  }

  const stemKey = normalise(c.stem);
  if (c.answer_key.kind === "mcq" && c.options) {
    const answer = c.options[c.answer_key.correct_indices[0]];
    if (typeof answer === "string") {
      const answerKey = normalise(answer);
      // Length-guarded: a one-word answer like "zero" legitimately appears in
      // many stems, and refusing those would reject most of the bank. Four
      // characters is the floor at which containment stops being coincidence.
      if (answerKey.length >= 4 && stemKey.includes(answerKey)) {
        return fail("the keyed answer appears verbatim in the stem");
      }
    }
  }
  if (c.answer_key.kind === "numeric") {
    const asText = String(c.answer_key.value);
    if (asText.length >= 2 && new RegExp(`(^|[^0-9.])${asText.replace(".", "\\.")}([^0-9.]|$)`).test(c.stem)) {
      return fail("the keyed numeric answer appears in the stem");
    }
  }

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// GATE 4 · ANSWERABILITY
// ═══════════════════════════════════════════════════════════════════════════

/** SI-ish unit shapes this system will accept. Not a physics parser — a
 *  gate. `null` (dimensionless) is legal and common. */
const UNIT_SHAPE = /^[A-Za-zΩµ°%]+(?:[⁻¹²³0-9^/·*-]*[A-Za-zΩµ°%0-9]+)*$/;

/** F.4 gate 4: *"numeric answers that fail a units/precision parse; keys not
 *  present in the option set."* */
export function gateAnswerability(c: QuestionCandidate): GateOutcome {
  const fail = (detail: string): GateOutcome => ({ ok: false, gate: "answerability", detail });
  const n = c.options?.length ?? 0;

  switch (c.answer_key.kind) {
    case "mcq":
      for (const i of c.answer_key.correct_indices) {
        if (i < 0 || i >= n) return fail(`keyed option ${i} is not in a set of ${n}`);
      }
      return { ok: true };

    case "numeric": {
      const { value, unit, tolerance } = c.answer_key;
      if (!Number.isFinite(value)) return fail("the keyed value is not a number");
      if (unit !== null && !UNIT_SHAPE.test(unit)) return fail(`'${unit}' does not parse as a unit`);
      // Precision: a tolerance of zero demands an exact float match, which no
      // student typing a decimal will ever produce, and a tolerance wider than
      // the value itself makes every answer correct. Both are unanswerable in
      // opposite directions.
      if (tolerance <= 0) return fail("a numeric answer needs a non-zero tolerance");
      if (value !== 0 && tolerance >= Math.abs(value)) return fail("the tolerance swallows the answer");
      return { ok: true };
    }

    case "ordering": {
      const { order } = c.answer_key;
      if (order.length !== n) return fail(`the order names ${order.length} of ${n} options`);
      const seen = new Set(order);
      if (seen.size !== order.length) return fail("the order repeats an option");
      for (const i of order) if (i < 0 || i >= n) return fail(`option ${i} is not in a set of ${n}`);
      return { ok: true };
    }

    default: {
      const { pairs } = c.answer_key;
      if (pairs.length === 0) return fail("no pairs to match");
      for (const [a, b] of pairs) {
        if (a < 0 || a >= n || b < 0 || b >= n) return fail(`pair (${a},${b}) is not in a set of ${n}`);
      }
      return { ok: true };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GATE 5 · SELF-CONSISTENCY RE-DERIVATION
//
// F.4 gate 5: *"for closed-form items, the answer is INDEPENDENTLY RECOMPUTED
// (symbolic/numeric where possible, or a SECOND, INDEPENDENT model call with a
// different prompt whose only permitted output is the answer). Disagreement ⇒
// discard. **THE MODEL DOES NOT VALIDATE ITS OWN OUTPUT** (B.20)."*
//
// "Independent" is enforced, not requested: `runGates` refuses a re-deriver
// whose `id` equals the generator's. The same model asked twice with the same
// context is one opinion stated twice, and B.20 exists because that is the
// failure mode everybody ships first.
// ═══════════════════════════════════════════════════════════════════════════

/** What a re-derivation is allowed to say. Nothing but the answer — no
 *  critique, no rewrite, no "the question is fine". */
export type Rederivation =
  | { kind: "mcq"; correct_index: number }
  | { kind: "numeric"; value: number }
  | { kind: "ordering"; order: readonly number[] }
  | { kind: "match"; pairs: readonly (readonly [number, number])[] }
  | { kind: "undecidable" };

export interface Rederiver {
  /** An identity distinct from the generator's. Checked. */
  id: string;
  rederive(c: QuestionCandidate): Promise<Rederivation>;
}

export function agreesWithKey(key: AnswerKey, r: Rederivation): boolean {
  if (r.kind === "undecidable") return false;
  if (r.kind !== key.kind) return false;
  if (key.kind === "mcq" && r.kind === "mcq") {
    return key.correct_indices.length === 1 && key.correct_indices[0] === r.correct_index;
  }
  if (key.kind === "numeric" && r.kind === "numeric") {
    return Math.abs(key.value - r.value) <= key.tolerance;
  }
  if (key.kind === "ordering" && r.kind === "ordering") {
    return key.order.length === r.order.length && key.order.every((v, i) => v === r.order[i]);
  }
  if (key.kind === "match" && r.kind === "match") {
    const norm = (ps: readonly (readonly [number, number])[]) =>
      [...ps].map(([a, b]) => `${a}:${b}`).sort().join(",");
    return norm(key.pairs) === norm(r.pairs);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// GATE 6 · NOVELTY / LEAKAGE
// ═══════════════════════════════════════════════════════════════════════════

/** The stem's identity for repeat detection. Normalised first, so a reworded
 *  space or a changed capital does not make an old question new. */
export const stemHash = (stem: string): string => sha256Hex(`stem:${normalise(stem)}`);

export interface NoveltyContext {
  /** Stem hashes of every question this student has already seen. F.5:
   *  *"a retest can reuse a DIFFERENT question on the same concept — never the
   *  same stem."* */
  seen_stem_hashes: ReadonlySet<string>;
  /** The session's `declared_text`s, verbatim. F.4 gate 6 rejects *"a question
   *  that restates the declaration text"* — a student who typed "I did Torque"
   *  learns nothing from being asked "what did you study?" dressed as physics. */
  declaration_texts: readonly string[];
}

export function gateNovelty(c: QuestionCandidate, ctx: NoveltyContext): GateOutcome {
  const hash = stemHash(c.stem);
  if (ctx.seen_stem_hashes.has(hash)) {
    return { ok: false, gate: "novelty", detail: "this student has seen this stem before" };
  }
  const stemKey = normalise(c.stem);
  for (const d of ctx.declaration_texts) {
    const key = normalise(d);
    if (key.length >= 8 && (stemKey.includes(key) || key.includes(stemKey))) {
      return { ok: false, gate: "novelty", detail: "the stem restates the declaration" };
    }
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// GATE 7 · MODERATION
//
// F.4 gate 7: *"reuse the existing two-layer stack — regex normalisation then
// the Haiku classifier. **CURRENT FACT: this subsystem already exists and is
// the strongest part of the AI layer (Finding A.6.e). KEEP IT.**"*
//
// The regex half is `lib/ai-guard.ts`'s `scanForHarmfulContent`, imported
// rather than re-listed — M8's port is already fenced character-for-character
// against `app/api/ai/route.ts`, and a THIRD copy would be a third thing to
// rot. The classifier half is injected, and it fails OPEN exactly as `/api/ai`
// does, because changing a safety posture is a decision and this pass is not
// the one making it.
// ═══════════════════════════════════════════════════════════════════════════

export interface Moderator {
  classify(texts: readonly string[]): Promise<{ safe: boolean; reason?: string }>;
}

export function questionTexts(c: QuestionCandidate): string[] {
  return [c.stem, ...(c.options ?? [])];
}

// ═══════════════════════════════════════════════════════════════════════════
// THE COMMIT — V.3.1's ordering, as a type
// ═══════════════════════════════════════════════════════════════════════════

declare const COMMITTED: unique symbol;

/** A frozen blueprint that has been WRITTEN. Only `commitManifest()` applies
 *  the brand, and it applies it only after `persist` has resolved. */
export type CommittedManifest = {
  readonly frozen: FrozenBlueprint;
  readonly committed_at: string;
  readonly [COMMITTED]: true;
};

export interface ManifestStore {
  /** Write the assessment row. Resolves `true` when the manifest is durable.
   *  F.5's *"One assessment per session — `UNIQUE(session_id)`"* means a second
   *  call for the same session is a conflict, not a second assessment. */
  persist(frozen: FrozenBlueprint): Promise<{ ok: boolean; detail?: string }>;
  /** Stamp `generation_started_at`. `023` §6 refuses a value earlier than
   *  `frozen_at`, so the ordering is recorded in the database as well as in the
   *  types — an ordering nobody can read back is one nobody can audit. */
  markGenerationStarted(assessmentId: string, atIso: string): Promise<void>;
}

export type CommitOutcome =
  | { ok: true; committed: CommittedManifest }
  | { ok: false; reason: "not_frozen" | "persist_failed"; detail?: string };

/**
 * V.3.1, in one function. **Nothing downstream of here can reach a model
 * without the value this returns.**
 */
export async function commitManifest(
  store: ManifestStore,
  frozen: FrozenBlueprint,
  atIso: string,
  verify: (f: FrozenBlueprint) => boolean,
): Promise<CommitOutcome> {
  // The hashes are recomputed before the write, not after. A manifest that was
  // mutated between freeze and commit is refused rather than written, because a
  // written manifest is the thing every later layer trusts.
  if (!verify(frozen)) return { ok: false, reason: "not_frozen" };

  const written = await store.persist(frozen);
  if (!written.ok) return { ok: false, reason: "persist_failed", detail: written.detail };

  return { ok: true, committed: { frozen, committed_at: atIso } as CommittedManifest };
}

declare const BOUND: unique symbol;

/** The typed input to the one capability. It names the slot, the depth and the
 *  concept — and it does NOT ask which concepts to cover, because F.2 says the
 *  model *"is never asked 'which concepts should this cover?'"* and a field it
 *  cannot be handed is a question it cannot be asked. */
export type BoundRequest = {
  readonly capability: typeof GENERATION_CAPABILITY;
  readonly prompt_version: string;
  readonly slot: BlueprintSlot;
  readonly manifest_hash: string;
  readonly attempt: number;
  readonly [BOUND]: true;
};

export interface GenerationModel {
  id: string;
  generate(request: BoundRequest): Promise<{ ok: true; raw: unknown } | { ok: false; detail: string }>;
}

/** The only constructor of a `BoundRequest`, and it demands a
 *  `CommittedManifest`. */
export function requestFor(
  committed: CommittedManifest,
  slot: BlueprintSlot,
  attempt: number,
): BoundRequest | null {
  const inBlueprint = committed.frozen.blueprint[slot.slot_index];
  if (!inBlueprint || inBlueprint.concept_ref !== slot.concept_ref) return null;
  return {
    capability: GENERATION_CAPABILITY,
    prompt_version: GENERATION_PROMPT_VERSION,
    slot: inBlueprint,
    manifest_hash: committed.frozen.manifest_hash,
    attempt,
  } as BoundRequest;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

export interface GateContext {
  slot: BlueprintSlot;
  novelty: NoveltyContext;
  rederiver: Rederiver;
  moderator: Moderator;
  /** The generator's identity, so gate 5 can refuse a re-deriver that is the
   *  same model (B.20). */
  generator_id: string;
}

export type GateRunResult =
  | { ok: true; candidate: QuestionCandidate; passed: readonly GateName[] }
  | { ok: false; gate: GateName; detail: string; passed: readonly GateName[] };

/**
 * F.4's pipeline, in F.4's order. Seven gates; the first failure discards.
 *
 * The gates run in the order `GATES` lists them and the passed list is returned
 * on both paths, so a rejection can say how far a candidate got — which is what
 * makes "gate 1 rejected it" a checkable claim (V.3.2) rather than a log line.
 */
export async function runGates(raw: unknown, ctx: GateContext): Promise<GateRunResult> {
  const passed: GateName[] = [];

  // 1 · slot binding — before the schema, deliberately. F.4's table puts it
  // first, and the reason is economy of trust: a candidate for the wrong
  // concept is worthless however well-formed it is, and validating it first
  // would spend a re-derivation call on a question that can never be admitted.
  const bound = gateSlotBinding(ctx.slot, (raw ?? {}) as Record<string, unknown>);
  if (!bound.ok) return { ...bound, passed };
  passed.push("slot_binding");

  // 2 · schema
  const parsed = gateSchema(raw);
  if (!parsed.ok) return { ok: false, gate: "schema", detail: parsed.detail, passed };
  const candidate = parsed.candidate;
  passed.push("schema");

  // 3 · structure
  const structure = gateStructure(candidate);
  if (!structure.ok) return { ...structure, passed };
  passed.push("structure");

  // 4 · answerability
  const answerable = gateAnswerability(candidate);
  if (!answerable.ok) return { ...answerable, passed };
  passed.push("answerability");

  // 5 · self-consistency
  if (ctx.rederiver.id === ctx.generator_id) {
    return {
      ok: false,
      gate: "self_consistency",
      detail: "the re-deriver is the generator; the model does not validate its own output (B.20)",
      passed,
    };
  }
  const rederived = await ctx.rederiver.rederive(candidate);
  if (!agreesWithKey(candidate.answer_key, rederived)) {
    return { ok: false, gate: "self_consistency", detail: "the re-derivation disagrees with the key", passed };
  }
  passed.push("self_consistency");

  // 6 · novelty / leakage
  const novel = gateNovelty(candidate, ctx.novelty);
  if (!novel.ok) return { ...novel, passed };
  passed.push("novelty");

  // 7 · moderation — regex first (free, and before any API call), then the
  // classifier, exactly as `/api/ai` and `lib/ai-guard.ts` order them.
  const texts = questionTexts(candidate);
  if (scanForHarmfulContent(texts)) {
    return { ok: false, gate: "moderation", detail: "blocked by the regex layer", passed };
  }
  const verdict = await ctx.moderator.classify(texts);
  if (!verdict.safe) {
    return { ok: false, gate: "moderation", detail: `blocked by the classifier: ${verdict.reason ?? "unknown"}`, passed };
  }
  passed.push("moderation");

  return { ok: true, candidate, passed };
}

// ═══════════════════════════════════════════════════════════════════════════
// SLOT BINDING, AT BIND TIME — DEFENCE IN DEPTH
//
// Gate 1 checks the candidate against the SLOT. This checks the finished
// question against the FROZEN MANIFEST, independently, at the moment it is
// written. The two are deliberately not the same function and deliberately not
// the same input:
//
//   gate 1  — "is this the concept I asked for?"      (slot)
//   bind    — "is this concept one the manifest names?" (manifest)
//
// A bug in gate 1, a gate list somebody reordered, a candidate that arrived
// from the question bank instead of a model, a future caller that skips
// `runGates` entirely — all of them still pass through here, because `admit()`
// is the only constructor of an `AdmittedQuestion` and there is no path to the
// database that does not go through one. `023` §7's trigger is the third layer,
// and it binds the service role too.
// ═══════════════════════════════════════════════════════════════════════════

export interface AdmitInput {
  committed: CommittedManifest;
  slot: BlueprintSlot;
  candidate: QuestionCandidate;
  question_id: string;
  admitted_at: string;
  provenance: Omit<QuestionProvenance, "manifest_hash">;
}

export type AdmitOutcome =
  | { ok: true; question: AdmittedQuestion }
  | {
      ok: false;
      reason: "off_manifest" | "slot_mismatch" | "unknown_slot" | "manifest_tampered";
      detail: string;
    };

/**
 * Bind a validated candidate to its slot and admit it. **The last checkpoint.**
 *
 * It cannot throw. A refusal here is not an error condition — it is the system
 * declining to record something as evidence, which F.2.a says is always
 * available: *"Refusing to verify is always available; verifying with a hole
 * never is."*
 */
export function admit(input: AdmitInput): AdmitOutcome {
  const { committed, slot, candidate } = input;
  const frozen = committed.frozen;

  // The manifest is re-hashed here, not trusted. Between the commit and this
  // call sit an await, a network round trip and a JSON parse.
  if (hashOf(frozen.manifest) !== frozen.manifest_hash) {
    return { ok: false, reason: "manifest_tampered", detail: "the manifest hash no longer matches its contents" };
  }

  const blueprintSlot = frozen.blueprint[slot.slot_index];
  if (!blueprintSlot) {
    return { ok: false, reason: "unknown_slot", detail: `slot ${slot.slot_index} is not in the frozen blueprint` };
  }
  if (blueprintSlot.concept_ref !== candidate.concept_ref) {
    return {
      ok: false,
      reason: "slot_mismatch",
      detail: `slot ${slot.slot_index} is ${blueprintSlot.concept_ref}; the question is ${candidate.concept_ref}`,
    };
  }

  // THE MANIFEST IS THE SOLE SOURCE OF TRUTH FOR WHAT MAY APPEAR AS COVERAGE.
  // A retest slot (F.2.b) is legitimately off-manifest and is admitted with
  // `counts_toward_coverage = false` — it counts toward its pattern and never
  // toward session coverage (V.3.6).
  if (blueprintSlot.counts_toward_coverage && !isOnManifest(frozen, candidate.concept_ref)) {
    return {
      ok: false,
      reason: "off_manifest",
      detail: `${candidate.concept_ref} is not on the frozen coverage manifest`,
    };
  }

  return {
    ok: true,
    question: {
      question_id: input.question_id,
      assessment_id: frozen.assessment_id,
      session_id: frozen.session_id,
      student_id: frozen.student_id,
      slot_index: blueprintSlot.slot_index,
      concept_ref: candidate.concept_ref,
      concept_id: blueprintSlot.concept_id,
      counts_toward_coverage: blueprintSlot.counts_toward_coverage,
      targets_pattern_id: blueprintSlot.targets_pattern_id,
      depth: candidate.depth,
      format: candidate.format,
      stem: candidate.stem,
      stem_hash: stemHash(candidate.stem),
      options: candidate.options,
      answer_key: candidate.answer_key,
      marks: candidate.marks,
      admitted_at: input.admitted_at,
      provenance: { ...input.provenance, manifest_hash: frozen.manifest_hash },
    },
  };
}
