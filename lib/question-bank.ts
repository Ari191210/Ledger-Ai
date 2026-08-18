// ═══════════════════════════════════════════════════════════════════════════
// M10-3 — THE QUESTION BANK, AND THE FALLBACK THAT NEEDS NO MODEL.
//
// EXECUTION_PLAN M10-3: *"Question bank fallback. Done when: V.3.3."*
//
// V.3.3: *"Generation fails N times for concept 3. THE BANK SUPPLIES A PRIOR
// QUESTION FOR CONCEPT 3."*
//
// F.2.a: *"After N retries, the slot is filled from the RETAINED BANK (F.5) for
// that concept. If the bank is empty too, the assessment DOES NOT SILENTLY
// SHRINK: the session goes to `CLOSED_UNVERIFIED` with `reason =
// 'coverage_unfillable'` … **Refusing to verify is always available; verifying
// with a hole never is.**"*
//
// F.5: *"Question retention: admitted questions persist and become a
// per-student bank, so a retest can reuse a DIFFERENT question on the same
// concept — never the same stem. This is both an integrity measure (no
// memorisation of the check) and the F.2.a fallback."*
//
//
// TWO SOURCES, ONE INTERFACE, AND A COLD START THAT IS NOT A STUB
//
// F.5's bank is the RETAINED one: questions this student has already been asked
// and that already passed the seven gates. It is the right bank and it is empty
// on day one, which is the day a new student's first assessment runs. A
// fallback that only works for returning students is not a fallback.
//
// So the bank has two tiers, tried in this order:
//
//   1. RETAINED   `assessment_questions` where `retained` and the concept
//                 matches and the stem has not been seen. Injected, because
//                 this module does no I/O.
//   2. SEED       `SEED_BANK` below — a small curated set of closed-form
//                 questions keyed by TAXONOMY PATH, compiled into the build.
//                 Deterministic, offline, and reachable with no database and no
//                 model at all.
//
// The seed tier is deliberately SMALL and representative rather than
// comprehensive. Building a content library is content work and it is ongoing;
// what this milestone owes is a fallback PATH that provably exists, is
// queryable, is keyed by concept identity rather than by a topic string, and
// produces questions that survive the same seven gates and the same slot
// binding as a generated one. Twelve questions prove that; twelve hundred prove
// nothing more, and would hide the mechanism inside the data.
//
//
// THE FALLBACK HAS NO BYPASS
//
// A bank question is not admitted by a shorter route. `fillBlueprint()` runs
// the SAME `runGates()` (minus the two gates that are meaningless without a
// model — see `BANK_GATES`) and the SAME `admit()`, so `023` §7's manifest
// trigger, the frozen-manifest re-check and the stem-hash novelty rule all
// apply to it unchanged. A path around the gate is how a fallback becomes the
// hole it was built to prevent.
//
// No I/O. No clock (`now` injected). No randomness.
//
// A NOTE ON WHAT "NO MODEL" MEANS HERE, PRECISELY. This file holds F.2.a's
// orchestration — generate, retry, fall back, refuse — so `fillBlueprint()`
// does drive a model through the injected `GenerationModel` INTERFACE. It
// constructs no client, imports no SDK and knows no model's name. The claim
// M10-3 makes is narrower and is about the FALLBACK path specifically:
// `fillFromBank()` and everything it calls reach no model at all, and
// `fillBlueprint()` with `deps.model === null` returns `model_calls: 0`. Both
// are asserted by test rather than by this paragraph.
// ═══════════════════════════════════════════════════════════════════════════

import { scanForHarmfulContent } from "./ai-guard";
import { uuidV5, slug } from "./taxonomy/build";
import {
  admit,
  gateAnswerability,
  gateNovelty,
  gateSchema,
  gateSlotBinding,
  gateStructure,
  questionTexts,
  requestFor,
  runGates,
  stemHash,
  type AdmittedQuestion,
  type BoundRequest,
  type CommittedManifest,
  type GateContext,
  type GateName,
  type GenerationModel,
  type ManifestStore,
  type QuestionCandidate,
  type Rederiver,
  type Moderator,
  MAX_GENERATION_ATTEMPTS,
  GENERATION_CAPABILITY,
  GENERATION_PROMPT_VERSION,
} from "./assessment-generation";
import type { BlueprintSlot, QuestionDepth, QuestionFormat } from "./assessment-blueprint";

// ═══════════════════════════════════════════════════════════════════════════
// THE SEED TIER
//
// Keyed by the taxonomy PATH, not by a topic string and not by a hard-coded
// UUID. `lib/taxonomy/build.ts` derives every concept id as
// `uuidV5(subject/class/chapter/topic/concept)`, and that derivation is
// byte-stable forever (its header: *"NEVER change this value — every concept id
// in every environment derives from it"*). Writing the path means the seed
// cannot drift from the taxonomy without a test noticing, and it means a UUID
// nobody can read never appears in a data file somebody has to maintain.
// ═══════════════════════════════════════════════════════════════════════════

export interface SeedQuestion {
  /** `Physics`, `11`, `System of Particles and Rotational Motion`,
   *  `Torque and Equilibrium`, `Sign convention for torque`. */
  path: readonly [subject: string, cls: number, chapter: string, topic: string, concept: string];
  depth: QuestionDepth;
  format: QuestionFormat;
  stem: string;
  options: readonly string[] | null;
  answer: QuestionCandidate["answer_key"];
  marks: number;
}

/** The taxonomy's own path formula, transcribed from `buildTaxonomy()`. A test
 *  asserts every `SEED_BANK` entry resolves to a concept the compiled tree
 *  actually contains, so a typo here is a failing suite and never a question
 *  attached to a concept that does not exist. */
export function conceptPathOf(p: SeedQuestion["path"]): string {
  const [subject, cls, chapter, topic, concept] = p;
  return `${slug(subject)}/${cls}/${slug(chapter)}/${slug(topic)}/${slug(concept)}`;
}

export const conceptIdOf = (p: SeedQuestion["path"]): string => uuidV5(conceptPathOf(p));

/**
 * Twelve closed-form questions across four concepts, three depths each.
 *
 * Every one is `mcq` or `numeric` — F.4.a's closed-form-only posture, so every
 * one is gradable by M10-5 with no model in the path (P.3.a). None contains its
 * own answer in the stem (gate 3), every MCQ key names exactly one option
 * (gate 3), every numeric key carries a unit and a non-zero tolerance smaller
 * than the value (gate 4).
 */
export const SEED_BANK: readonly SeedQuestion[] = Object.freeze([
  // ── Sign convention for torque ────────────────────────────────────────────
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Torque and Equilibrium", "Sign convention for torque"],
    depth: "recall", format: "mcq", marks: 1,
    stem: "Taking anticlockwise rotation as positive, a force applied so that it turns a wheel clockwise produces a torque whose sign is:",
    options: ["Positive", "Negative", "Zero", "Undefined"],
    answer: { kind: "mcq", correct_indices: [1] },
  },
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Torque and Equilibrium", "Sign convention for torque"],
    depth: "application", format: "numeric", marks: 2,
    stem: "A force of 12 N acts perpendicular to a spanner at a distance of 0.25 m from the pivot, turning it anticlockwise. Taking anticlockwise as positive, state the torque in N m.",
    options: null,
    answer: { kind: "numeric", value: 3, unit: "Nm", tolerance: 0.05 },
  },
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Torque and Equilibrium", "Sign convention for torque"],
    depth: "transfer", format: "mcq", marks: 2,
    stem: "Two forces act on a rod about the same pivot: one turns it one way, the other turns it the opposite way, and their magnitudes about the pivot are equal. The net turning effect on the rod is:",
    options: ["Twice either one", "Equal to either one", "Nil", "Half of either one"],
    answer: { kind: "mcq", correct_indices: [2] },
  },

  // ── Conditions for rotational equilibrium ─────────────────────────────────
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Torque and Equilibrium", "Conditions for rotational equilibrium"],
    depth: "recall", format: "mcq", marks: 1,
    stem: "For a rigid body to be in complete equilibrium, which pair of conditions must both hold?",
    options: [
      "Net force nil and net turning effect nil",
      "Net force nil only",
      "Net turning effect nil only",
      "Net momentum nil and net force nil",
    ],
    answer: { kind: "mcq", correct_indices: [0] },
  },
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Torque and Equilibrium", "Conditions for rotational equilibrium"],
    depth: "application", format: "numeric", marks: 3,
    stem: "A uniform 2.0 m plank of negligible mass rests on a pivot at its centre. A 40 N weight hangs 0.60 m from the pivot on the left. At what distance in metres, on the right, must a 30 N weight hang for the plank to balance?",
    options: null,
    answer: { kind: "numeric", value: 0.8, unit: "m", tolerance: 0.02 },
  },

  // ── Parallel axis theorem ─────────────────────────────────────────────────
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Moment of Inertia", "Parallel axis theorem"],
    depth: "recall", format: "mcq", marks: 1,
    stem: "The parallel axis theorem relates a body's rotational inertia about an axis through its centre of mass to that about which other kind of axis?",
    options: [
      "Any axis parallel to it",
      "Any axis perpendicular to it",
      "Only an axis through a vertex",
      "Only an axis in the plane of the body",
    ],
    answer: { kind: "mcq", correct_indices: [0] },
  },
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Moment of Inertia", "Parallel axis theorem"],
    depth: "application", format: "numeric", marks: 3,
    stem: "A disc of mass 2.0 kg has a rotational inertia of 0.10 kg m^2 about an axis through its centre. Give its rotational inertia in kg m^2 about a parallel axis 0.20 m away.",
    options: null,
    answer: { kind: "numeric", value: 0.18, unit: "kgm2", tolerance: 0.005 },
  },
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Moment of Inertia", "Parallel axis theorem"],
    depth: "transfer", format: "mcq", marks: 2,
    stem: "Moving the axis of rotation further from a body's centre of mass, while keeping the axes parallel, changes its rotational inertia how?",
    options: ["It always increases", "It always decreases", "It is unchanged", "It depends on the direction of rotation"],
    answer: { kind: "mcq", correct_indices: [0] },
  },

  // ── Perpendicular axis theorem ────────────────────────────────────────────
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Moment of Inertia", "Perpendicular axis theorem"],
    depth: "recall", format: "mcq", marks: 1,
    stem: "The perpendicular axis theorem may be applied to which class of bodies?",
    options: ["Planar laminae only", "Solid spheres only", "Any rigid body", "Hollow bodies only"],
    answer: { kind: "mcq", correct_indices: [0] },
  },
  {
    path: ["Physics", 11, "System of Particles and Rotational Motion", "Moment of Inertia", "Perpendicular axis theorem"],
    depth: "application", format: "numeric", marks: 2,
    stem: "A square lamina has a rotational inertia of 0.040 kg m^2 about each of two perpendicular axes lying in its plane through its centre. Give its rotational inertia in kg m^2 about the axis through the centre normal to the plane.",
    options: null,
    answer: { kind: "numeric", value: 0.08, unit: "kgm2", tolerance: 0.002 },
  },

  // ── Distance versus displacement ──────────────────────────────────────────
  {
    path: ["Physics", 11, "Motion in a Straight Line", "Describing Motion", "Distance versus displacement"],
    depth: "recall", format: "mcq", marks: 1,
    stem: "Which of the following is true of a body that returns to its starting point?",
    options: [
      "Its net change of position is nil while the path length is not",
      "Both the path length and the net change of position are nil",
      "The path length is nil while the net change of position is not",
      "Neither can be nil",
    ],
    answer: { kind: "mcq", correct_indices: [0] },
  },
  {
    path: ["Physics", 11, "Motion in a Straight Line", "Describing Motion", "Distance versus displacement"],
    depth: "application", format: "numeric", marks: 2,
    stem: "A runner covers 300 m due east, then 100 m due west along the same line. Give the magnitude of the net change of position in metres.",
    options: null,
    answer: { kind: "numeric", value: 200, unit: "m", tolerance: 0.5 },
  },
] as const satisfies readonly SeedQuestion[]);

/** The seed tier as a lookup, built once. `concept_ref` for a resolved concept
 *  is the concept UUID (C.3), so the key is the id and no second vocabulary is
 *  introduced. */
let seedIndex: ReadonlyMap<string, readonly SeedQuestion[]> | null = null;

export function seedBankByConcept(): ReadonlyMap<string, readonly SeedQuestion[]> {
  if (seedIndex) return seedIndex;
  const map = new Map<string, SeedQuestion[]>();
  for (const q of SEED_BANK) {
    const id = conceptIdOf(q.path);
    const list = map.get(id);
    if (list) list.push(q); else map.set(id, [q]);
  }
  seedIndex = map;
  return seedIndex;
}

/** A seed entry, in the shape the gates read. Nothing is invented in the
 *  conversion: the candidate's `concept_ref` is the SLOT's, so gate 1 and
 *  `admit()` still do real work rather than comparing a value to itself —
 *  a seed question for the wrong concept is never selected in the first place
 *  because `bankCandidatesFor()` keys on the slot's own ref. */
export function seedToCandidate(q: SeedQuestion, conceptRef: string): QuestionCandidate {
  return {
    concept_ref: conceptRef,
    depth: q.depth,
    format: q.format,
    stem: q.stem,
    options: q.options,
    answer_key: q.answer,
    marks: q.marks,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RETAINED TIER
// ═══════════════════════════════════════════════════════════════════════════

/** F.5's retained bank, as an injected read. The implementation is a SELECT on
 *  `assessment_questions` (`023` §5's `retained_question_bank` view); this
 *  module never touches Supabase. */
export interface RetainedBank {
  /** Prior admitted questions for a concept, most recent first. The caller
   *  filters by student; this interface does not take a student id, so a bank
   *  scoped to the wrong person is a wiring bug in one place rather than a
   *  parameter every call site can get wrong. */
  forConcept(conceptRef: string, depth: QuestionDepth): Promise<readonly QuestionCandidate[]>;
}

/** The empty bank. Named, so "there is no retained bank yet" is something a
 *  caller states rather than something a `null` implies. */
export const EMPTY_RETAINED_BANK: RetainedBank = {
  async forConcept() { return []; },
};

/**
 * Every bank candidate for a slot, retained tier first, then seed.
 *
 * Depth is a PREFERENCE and not a filter: F.2.a's fallback exists to avoid a
 * coverage hole, and refusing a `recall` question because the slot wanted
 * `application` trades a real hole for a depth mismatch. The slot's depth is
 * tried first and the rest follow, so the ladder is honoured where it can be
 * and never at the cost of coverage.
 */
export async function bankCandidatesFor(
  slot: BlueprintSlot,
  retained: RetainedBank,
): Promise<readonly QuestionCandidate[]> {
  const out: QuestionCandidate[] = [];
  out.push(...(await retained.forConcept(slot.concept_ref, slot.depth)));

  const seeds = seedBankByConcept().get(slot.concept_ref) ?? [];
  const atDepth = seeds.filter(q => q.depth === slot.depth);
  const others = seeds.filter(q => q.depth !== slot.depth);
  for (const q of [...atDepth, ...others]) out.push(seedToCandidate(q, slot.concept_ref));

  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE FILL — F.2.a's three endings, and no fourth
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Which gates a bank question runs.
 *
 * FIVE of the seven, and the two that are absent are absent because they are
 * *about a model call*, not because the bank is trusted:
 *
 *   · `self_consistency` re-derives a model's answer against an independent
 *     second opinion (F.4 gate 5). A retained question's key was already
 *     re-derived when it was first admitted, and a seed question's key was
 *     written by a person. Re-deriving either would mean asking a model whether
 *     a human-authored key is right — which is B.20 pointing the wrong way, and
 *     would put a model back in the grading path P.3.a keeps it out of.
 *   · `moderation` scans model output for content the two-layer stack refuses
 *     (F.4 gate 7). Bank content is not model output. The regex layer is free,
 *     so it is run anyway — see `fillFromBank()` — but the CLASSIFIER is not,
 *     because the classifier is a model call and M10-3's whole claim is
 *     **zero model calls on the fallback path**.
 *
 * `slot_binding`, `schema`, `structure`, `answerability` and `novelty` all run
 * unchanged, and `admit()` runs unchanged after them.
 *
 * The regex HALF of gate 7 does run — see `fillFromBank()`, which calls
 * `scanForHarmfulContent` before admitting anything. It is a pure function over
 * a list of strings, so running it costs nothing and preserves M10-3's claim
 * exactly. It is deliberately NOT listed below: `gates_passed` is written into
 * `provenance` and read by F.4.b's revocation sweep, and recording
 * `"moderation"` for a candidate that never met the classifier would overstate
 * what was checked. Half a gate passed is not a gate passed.
 */
export const BANK_GATES: readonly GateName[] = Object.freeze([
  "slot_binding", "schema", "structure", "answerability", "novelty",
]);

export interface FillDeps {
  model: GenerationModel | null;
  rederiver: Rederiver;
  moderator: Moderator;
  retained: RetainedBank;
  /** Ids for admitted questions. Injected so the fill is deterministic in a
   *  test — this module owns no randomness. */
  newQuestionId(slotIndex: number): string;
  now(): string;
}

export interface FillContext {
  committed: CommittedManifest;
  declaration_texts: readonly string[];
  /** Grows as slots fill, so two slots on the same concept cannot be given the
   *  same stem inside one assessment (F.5 — *"never the same stem"*). */
  seen_stem_hashes: Set<string>;
}

export type SlotFill =
  | { ok: true; question: AdmittedQuestion; origin: "generated" | "bank"; attempts: number }
  | { ok: false; slot_index: number; concept_ref: string; reason: "coverage_unfillable"; attempts: number };

export interface FillResult {
  questions: readonly AdmittedQuestion[];
  /** F.2.a's refusal. Non-empty means the assessment CANNOT be presented as
   *  covering the manifest — M10-4 turns that into `CLOSED_UNVERIFIED` with
   *  `reason = 'coverage_unfillable'`. This pass reports it; it does not
   *  transition the session. */
  unfillable: readonly { slot_index: number; concept_ref: string }[];
  /** Every rejection, in order, with the gate that made it. F.4: nothing is
   *  repaired, so this is the only record of what was tried. */
  rejections: readonly { slot_index: number; gate: GateName | "model"; detail: string }[];
  model_calls: number;
}

/** The bank path, with no model in it. Returns the first candidate that clears
 *  the five gates and binds. */
export async function fillFromBank(
  slot: BlueprintSlot,
  deps: FillDeps,
  ctx: FillContext,
  onReject: (gate: GateName, detail: string) => void,
): Promise<AdmittedQuestion | null> {
  const candidates = await bankCandidatesFor(slot, deps.retained);
  const novelty = { seen_stem_hashes: ctx.seen_stem_hashes, declaration_texts: ctx.declaration_texts };

  for (const raw of candidates) {
    const bound = gateSlotBinding(slot, raw as unknown as Record<string, unknown>);
    if (!bound.ok) { onReject(bound.gate, bound.detail); continue; }

    const parsed = gateSchema(raw);
    if (!parsed.ok) { onReject("schema", parsed.detail); continue; }

    const structure = gateStructure(parsed.candidate);
    if (!structure.ok) { onReject(structure.gate, structure.detail); continue; }

    const answerable = gateAnswerability(parsed.candidate);
    if (!answerable.ok) { onReject(answerable.gate, answerable.detail); continue; }

    const novel = gateNovelty(parsed.candidate, novelty);
    if (!novel.ok) { onReject(novel.gate, novel.detail); continue; }

    // Gate 7's regex half. A pure function over strings — no network, no model,
    // no cost — so M10-3's "zero AI calls" is untouched by running it. The
    // classifier half is skipped because it IS a model call; see `BANK_GATES`.
    if (scanForHarmfulContent(questionTexts(parsed.candidate))) {
      onReject("moderation", "blocked by the regex layer");
      continue;
    }

    const admitted = admit({
      committed: ctx.committed,
      slot,
      candidate: parsed.candidate,
      question_id: deps.newQuestionId(slot.slot_index),
      admitted_at: deps.now(),
      provenance: {
        capability: GENERATION_CAPABILITY,
        prompt_version: GENERATION_PROMPT_VERSION,
        // The bank did not come from a model, and the provenance says so
        // literally rather than by leaving a field blank. F.4.b's revocation
        // sweep keys on `prompt_version`; a bank row must not be swept up by a
        // revocation of a prompt it never ran under, which is why `model` is a
        // sentinel and not the generator's id.
        model: "bank",
        rederiver_model: null,
        origin: "bank",
        gates_passed: BANK_GATES,
      },
    });

    if (!admitted.ok) { onReject("slot_binding", `${admitted.reason}: ${admitted.detail}`); continue; }

    ctx.seen_stem_hashes.add(stemHash(parsed.candidate.stem));
    return admitted.question;
  }

  return null;
}

/**
 * F.2.a, end to end: generate, retry, fall back, refuse.
 *
 * Per slot: up to `MAX_GENERATION_ATTEMPTS` model calls, each one gated by all
 * seven; then the bank; then — and only then — the slot is reported unfillable.
 * A `null` model (the guard refused, the key is absent, the call timed out at
 * the route) skips straight to the bank with `model_calls` still at zero, which
 * is M10-3's claim made measurable.
 *
 * **It cannot throw.** A model that rejects is a rejection, not an exception:
 * the caller is an endpoint, and F.2.a's honest ending is a refusal to verify,
 * which a 500 is not.
 */
export async function fillBlueprint(deps: FillDeps, ctx: FillContext): Promise<FillResult> {
  const questions: AdmittedQuestion[] = [];
  const unfillable: { slot_index: number; concept_ref: string }[] = [];
  const rejections: { slot_index: number; gate: GateName | "model"; detail: string }[] = [];
  let modelCalls = 0;

  for (const slot of ctx.committed.frozen.blueprint) {
    const reject = (gate: GateName | "model", detail: string) =>
      rejections.push({ slot_index: slot.slot_index, gate, detail });

    let admitted: AdmittedQuestion | null = null;

    for (let attempt = 1; deps.model && attempt <= MAX_GENERATION_ATTEMPTS && !admitted; attempt++) {
      const request: BoundRequest | null = requestFor(ctx.committed, slot, attempt);
      if (!request) { reject("slot_binding", "the slot is not in the committed blueprint"); break; }

      modelCalls++;
      let result: Awaited<ReturnType<GenerationModel["generate"]>>;
      try {
        result = await deps.model.generate(request);
      } catch (err) {
        reject("model", err instanceof Error ? err.message : "the generation call failed");
        continue;
      }
      if (!result.ok) { reject("model", result.detail); continue; }

      const gateCtx: GateContext = {
        slot,
        novelty: { seen_stem_hashes: ctx.seen_stem_hashes, declaration_texts: ctx.declaration_texts },
        rederiver: deps.rederiver,
        moderator: deps.moderator,
        generator_id: deps.model.id,
      };

      const gated = await runGates(result.raw, gateCtx);
      if (!gated.ok) { reject(gated.gate, gated.detail); continue; }

      const bind = admit({
        committed: ctx.committed,
        slot,
        candidate: gated.candidate,
        question_id: deps.newQuestionId(slot.slot_index),
        admitted_at: deps.now(),
        provenance: {
          capability: GENERATION_CAPABILITY,
          prompt_version: GENERATION_PROMPT_VERSION,
          model: deps.model.id,
          rederiver_model: deps.rederiver.id,
          origin: "generated",
          gates_passed: gated.passed,
        },
      });

      if (!bind.ok) { reject("slot_binding", `${bind.reason}: ${bind.detail}`); continue; }

      ctx.seen_stem_hashes.add(stemHash(gated.candidate.stem));
      admitted = bind.question;
    }

    if (!admitted) {
      admitted = await fillFromBank(slot, deps, ctx, reject);
    }

    if (admitted) questions.push(admitted);
    else if (slot.counts_toward_coverage) {
      // F.2.a. The assessment does not shrink and the slot is not dropped
      // quietly — it is REPORTED, and M10-4 refuses the transition on it.
      unfillable.push({ slot_index: slot.slot_index, concept_ref: slot.concept_ref });
    }
  }

  return { questions, unfillable, rejections, model_calls: modelCalls };
}

/** F.2's guarantee, checkable against a finished fill. Every manifest entry has
 *  at least its required number of coverage questions. M10-4's transition gate
 *  is the server-side precondition built on this; this pass ships the predicate
 *  and not the transition. */
export function manifestIsCovered(ctx: FillContext, questions: readonly AdmittedQuestion[]): boolean {
  const counted = new Map<string, number>();
  for (const q of questions) {
    if (!q.counts_toward_coverage) continue;
    counted.set(q.concept_ref, (counted.get(q.concept_ref) ?? 0) + 1);
  }
  return ctx.committed.frozen.manifest.every(
    e => (counted.get(e.concept_ref) ?? 0) >= e.questions_required,
  );
}

/** Re-exported so a caller wiring the route needs one import rather than three
 *  and cannot pick up a second, unfenced copy of the same constant. */
export type { ManifestStore };
