/**
 * THE MISTAKE ENGINE — pure domain logic.
 *
 * Implements PRODUCT_DECISIONS.md §4.6 (severity), §4.7 (merge), §4.8
 * (lifecycle), and PRODUCT_PRINCIPLES.md §3.1 (only evidence resolves a gap).
 *
 * RULES THIS FILE OBEYS, WITHOUT EXCEPTION:
 *   · Pure. No I/O, no database, no framework, no clock, no randomness.
 *   · Deterministic. Every time-dependent decision takes an explicit timestamp.
 *   · Non-mutating. Inputs are never written to; outputs are frozen.
 *   · Explicit. Insufficient evidence returns a typed failure, never a guess.
 *
 * Nothing here throws for bad *input* — bad input is a `Result` failure. The
 * only throws are internal invariant violations, which are unreachable by
 * construction and indicate an engine bug rather than a caller error.
 */

import type {
  ErrorClass,
  ErrorType,
  ISOTimestamp,
  Occurrence,
  Pattern,
  PatternStatus,
  PatternTransition,
  UUID,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS — the engine never guesses and never throws on input
// ═══════════════════════════════════════════════════════════════════════════

export type Failure =
  | 'no-error-classification'
  | 'ambiguous-error-classification'
  | 'duplicate-leaf-patterns'
  | 'not-a-leaf'
  | 'not-a-parent'
  | 'invalid-transition'
  | 'forbidden-for-student'
  | 'resolution-requires-evidence'
  | 'insufficient-correct-answers'
  | 'cooling-period-not-elapsed'
  | 'unresolved-descendants'
  | 'missing-leaf-severity'
  | 'factor-out-of-range'
  | 'invalid-timestamp'
  | 'empty-descendants';

export interface EngineError {
  readonly failure: Failure;
  readonly detail: string;
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: EngineError };

const ok = <T>(value: T): Result<T> => Object.freeze({ ok: true as const, value });

const fail = <T>(failure: Failure, detail: string): Result<T> =>
  Object.freeze({ ok: false as const, error: Object.freeze({ failure, detail }) });

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS — exported so tests assert against the spec, not a magic number
// ═══════════════════════════════════════════════════════════════════════════

/** §4.6.1. The only severity formula. Coefficients sum to 100. */
export const SEVERITY_WEIGHTS = Object.freeze({
  marksWeight: 40,
  recurrenceWeight: 30,
  examProximity: 20,
  conceptExamWeight: 10,
});

/** §4.8 — "≥2 correct answers on the same concept". */
export const RESOLUTION_MIN_CORRECT = 2;

/** §4.8 — "at least one ≥7 days after the last occurrence". */
export const RESOLUTION_COOLING_DAYS = 7;

/** §4.7 — merges below this confidence are provisional. */
export const PROVISIONAL_CONFIDENCE_FLOOR = 0.8;

/** §4.7 — "reversible for 30 days". */
export const PROVISIONAL_WINDOW_DAYS = 30;

/** §4.8 — a student may set these two statuses and no others. */
export const STUDENT_SETTABLE: readonly PatternStatus[] = Object.freeze([
  'acknowledged',
  'practising',
]);

const DAY_MS = 86_400_000;

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function parseTime(iso: ISOTimestamp): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function addDays(iso: ISOTimestamp, days: number): string | null {
  const t = parseTime(iso);
  return t === null ? null : new Date(t + days * DAY_MS).toISOString();
}

const isLeaf = (p: Pattern): boolean => p.tier === 'concept';
const isParent = (p: Pattern): boolean => p.tier === 'subject' || p.tier === 'global';

/**
 * Freezes a pattern and its history, deeply enough that no caller can append,
 * splice or edit a transition. Module code is strict-mode, so a mutation
 * attempt throws rather than failing silently.
 */
function freezePattern(p: Pattern): Pattern {
  p.history.forEach((h) => Object.freeze(h));
  Object.freeze(p.history);
  Object.freeze(p.occurrenceIds);
  return Object.freeze(p);
}

/**
 * MECHANICAL APPEND-ONLY GUARANTEE.
 *
 * History is not append-only by convention — it is append-only because this is
 * the single function that writes it, it copies rather than mutates, and the
 * result is frozen. This check proves the property held for each write; a
 * failure is an engine bug, not a caller error, hence the throw.
 */
function assertAppendOnly(before: readonly PatternTransition[], after: readonly PatternTransition[]): void {
  if (after.length !== before.length + 1) {
    throw new Error(`engine invariant: history must grow by exactly 1 (${before.length} → ${after.length})`);
  }
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) {
      throw new Error(`engine invariant: history entry ${i} was rewritten`);
    }
  }
}

/** Public so callers and tests can verify the property on any two snapshots. */
export function isHistoryAppendOnly(before: Pattern, after: Pattern): boolean {
  if (after.history.length < before.history.length) return false;
  return before.history.every((h, i) => h === after.history[i]);
}

// ═══════════════════════════════════════════════════════════════════════════
// MERGE (§4.7)
// ═══════════════════════════════════════════════════════════════════════════

export interface MergeKey {
  readonly studentId: UUID;
  readonly conceptId: UUID;
  readonly errorClass: ErrorClass;
  readonly errorType: ErrorType;
}

export type MergeOutcome =
  | {
      readonly kind: 'joined';
      readonly patternId: UUID;
      readonly key: MergeKey;
      readonly provisional: boolean;
      readonly reversibleUntil: ISOTimestamp | null;
    }
  | {
      readonly kind: 'new-leaf';
      readonly key: MergeKey;
      readonly provisional: false;
      readonly reversibleUntil: null;
    };

/**
 * The merge key of one occurrence.
 *
 * An occurrence carrying BOTH a cognitive and an execution error has two valid
 * keys, and `Occurrence.patternId` is singular (§4.4.2) — so there is no
 * non-arbitrary answer. Rather than pick one, this returns an explicit
 * `ambiguous-error-classification` failure.
 *
 * TODO(§4.7): the schema permits both errors on one occurrence but the merge
 * rule does not say which wins. Needs a product decision before capture (M2-4)
 * can produce such rows.
 */
export function mergeKeyFor(occurrence: Occurrence): Result<MergeKey> {
  const { cognitiveError, executionError } = occurrence;

  if (cognitiveError === null && executionError === null) {
    return fail('no-error-classification', 'occurrence classifies neither a cognitive nor an execution error');
  }
  if (cognitiveError !== null && executionError !== null) {
    return fail(
      'ambiguous-error-classification',
      `occurrence carries both '${cognitiveError}' and '${executionError}'; the merge key is undefined`,
    );
  }

  const errorClass: ErrorClass = cognitiveError !== null ? 'cognitive' : 'execution';
  const errorType = (cognitiveError ?? executionError) as ErrorType;

  return ok(
    Object.freeze({
      studentId: occurrence.studentId,
      conceptId: occurrence.conceptId,
      errorClass,
      errorType,
    }),
  );
}

export interface MergeOptions {
  /** For a future fuzzy matcher. Exact-key matching is deterministic, so 1. */
  readonly confidence?: number;
  /** Required only to date the provisional window. */
  readonly now?: ISOTimestamp;
}

/**
 * Decide which leaf pattern an occurrence joins (§4.7).
 *
 * Two occurrences join one leaf **iff** same concept, same error class, and
 * same error type. Never across error class: a misconception about signs and a
 * careless sign slip look identical on paper and need opposite fixes.
 *
 * Candidates are filtered here rather than trusted — passing a parent pattern
 * or another student's pattern cannot produce a match.
 */
export function mergeOccurrence(
  occurrence: Occurrence,
  candidates: readonly Pattern[],
  options: MergeOptions = {},
): Result<MergeOutcome> {
  const keyResult = mergeKeyFor(occurrence);
  if (!keyResult.ok) return keyResult as Result<MergeOutcome>;
  const key = keyResult.value;

  const matches = candidates.filter(
    (p) =>
      isLeaf(p) &&
      p.studentId === key.studentId &&
      p.conceptId === key.conceptId &&
      p.errorClass === key.errorClass &&
      p.errorType === key.errorType,
  );

  if (matches.length > 1) {
    return fail(
      'duplicate-leaf-patterns',
      `${matches.length} leaves share one merge key; the database unique index should have prevented this`,
    );
  }

  if (matches.length === 0) {
    return ok(Object.freeze({ kind: 'new-leaf' as const, key, provisional: false as const, reversibleUntil: null }));
  }

  const confidence = options.confidence ?? 1;
  const provisional = confidence < PROVISIONAL_CONFIDENCE_FLOOR;

  let reversibleUntil: ISOTimestamp | null = null;
  if (provisional) {
    if (options.now === undefined) {
      return fail('invalid-timestamp', 'a provisional merge needs `now` to date its 30-day reversal window');
    }
    const until = addDays(options.now, PROVISIONAL_WINDOW_DAYS);
    if (until === null) return fail('invalid-timestamp', `unparseable timestamp: ${options.now}`);
    reversibleUntil = until;
  }

  return ok(
    Object.freeze({
      kind: 'joined' as const,
      patternId: matches[0].id,
      key,
      provisional,
      reversibleUntil,
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEVERITY (§4.6)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The four normalised 0–1 inputs to §4.6.1.
 *
 * TODO(§4.6.1): how each factor is DERIVED from raw domain data is not
 * specified. Deliberately not invented here — the caller supplies them, so a
 * later decision changes one place rather than rewriting the formula.
 *
 * TODO(§4.10): `examProximity` is double-weighted. It contributes 20% of
 * severity here, and §4.10 then ranks `/next` by `severity × examProximity`,
 * applying it twice. Pre-existing and deliberately NOT fixed in M1-5 — it is a
 * product decision, not an engine bug.
 */
export interface SeverityFactors {
  readonly marksWeight: number;
  readonly recurrenceWeight: number;
  readonly examProximity: number;
  readonly conceptExamWeight: number;
}

const FACTOR_NAMES = ['marksWeight', 'recurrenceWeight', 'examProximity', 'conceptExamWeight'] as const;

/**
 * Leaf severity, 0–100 (§4.6.1). Applies to `tier: 'concept'` patterns only.
 * Derived, never entered — so it cannot be gamed, and improving the formula
 * upgrades every existing pattern retroactively.
 */
export function computeSeverity(factors: SeverityFactors): Result<number> {
  for (const name of FACTOR_NAMES) {
    const v = factors[name];
    if (!Number.isFinite(v) || v < 0 || v > 1) {
      return fail('factor-out-of-range', `${name} must be a finite number in [0, 1]; received ${String(v)}`);
    }
  }

  const raw =
    SEVERITY_WEIGHTS.marksWeight * factors.marksWeight +
    SEVERITY_WEIGHTS.recurrenceWeight * factors.recurrenceWeight +
    SEVERITY_WEIGHTS.examProximity * factors.examProximity +
    SEVERITY_WEIGHTS.conceptExamWeight * factors.conceptExamWeight;

  return ok(Math.round(raw));
}

/**
 * Parent severity = MAX of descendant leaves (§4.6.2).
 *
 * Presentation only. Never consumed by the Ledger Score, never persisted,
 * always derived on demand. `MAX` composes, so global = MAX(subjects) =
 * MAX(all leaves) and the tiers can never disagree.
 */
export function computeParentSeverity(descendantLeaves: readonly Pattern[]): Result<number> {
  if (descendantLeaves.length === 0) {
    return fail('empty-descendants', 'a parent with no descendant leaves has no severity');
  }

  let max = -1;
  for (const leaf of descendantLeaves) {
    if (!isLeaf(leaf)) {
      return fail('not-a-leaf', `pattern ${leaf.id} is tier '${leaf.tier}'; only leaves carry severity`);
    }
    if (leaf.severity === null || leaf.severity === undefined) {
      return fail('missing-leaf-severity', `leaf ${leaf.id} has no severity; the schema requires one`);
    }
    if (leaf.severity > max) max = leaf.severity;
  }

  return ok(max);
}

/** §4.6.3 ordering inputs. Every term is computed from the subtree itself. */
export interface ParentRanking {
  readonly severity: number;
  readonly unresolvedLeafCount: number;
  readonly descendantMarksLost: number;
}

/**
 * §4.6.3. Total and deterministic: highest descendant leaf severity, then
 * highest unresolved descendant leaf count, then highest descendant marks lost.
 * Sorts descending (most urgent first).
 */
export function compareParentPatterns(a: ParentRanking, b: ParentRanking): number {
  if (a.severity !== b.severity) return b.severity - a.severity;
  if (a.unresolvedLeafCount !== b.unresolvedLeafCount) return b.unresolvedLeafCount - a.unresolvedLeafCount;
  return b.descendantMarksLost - a.descendantMarksLost;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLUTION (§4.8, PRINCIPLES §3.1)
// ═══════════════════════════════════════════════════════════════════════════

export interface CorrectAnswer {
  readonly conceptId: UUID;
  readonly answeredAt: ISOTimestamp;
}

/**
 * Can this LEAF pattern be proven fixed?
 *
 * §4.8: `resolved` requires ≥2 correct answers on the same concept, at least
 * one of them ≥7 days after the last occurrence.
 *
 * The cooling period is the whole point: two correct answers ten minutes after
 * seeing the mistake measures short-term recall, which is the fluency illusion
 * this product exists to replace.
 */
export function canResolve(pattern: Pattern, correctAnswers: readonly CorrectAnswer[]): Result<true> {
  if (!isLeaf(pattern)) {
    return fail('not-a-leaf', `pattern ${pattern.id} is tier '${pattern.tier}'; parent resolution is derived (§4.4.4)`);
  }
  if (pattern.lastSeenAt === null) {
    return fail('resolution-requires-evidence', `leaf ${pattern.id} has no lastSeenAt; nothing to measure recovery from`);
  }

  const lastSeen = parseTime(pattern.lastSeenAt);
  if (lastSeen === null) {
    return fail('invalid-timestamp', `unparseable lastSeenAt: ${pattern.lastSeenAt}`);
  }

  const relevant = correctAnswers.filter((a) => a.conceptId === pattern.conceptId);
  if (relevant.length < RESOLUTION_MIN_CORRECT) {
    return fail(
      'insufficient-correct-answers',
      `${relevant.length} correct answer(s) on this concept; ${RESOLUTION_MIN_CORRECT} required`,
    );
  }

  const threshold = lastSeen + RESOLUTION_COOLING_DAYS * DAY_MS;
  const cooled = relevant.some((a) => {
    const t = parseTime(a.answeredAt);
    return t !== null && t >= threshold;
  });

  if (!cooled) {
    return fail(
      'cooling-period-not-elapsed',
      `no correct answer ≥${RESOLUTION_COOLING_DAYS} days after the last occurrence`,
    );
  }

  return ok(true);
}

/**
 * Can this PARENT be marked resolved? (§4.4.4)
 *
 * Derived, never direct: no parent may be resolved while any descendant leaf
 * remains unresolved. Strictly stronger than §3.1, never weaker.
 */
export function canResolveParent(parent: Pattern, descendantLeaves: readonly Pattern[]): Result<true> {
  if (!isParent(parent)) {
    return fail('not-a-parent', `pattern ${parent.id} is a leaf; use canResolve()`);
  }
  if (descendantLeaves.length === 0) {
    return fail('empty-descendants', 'a parent with no descendants cannot be resolved');
  }

  const unresolved = descendantLeaves.filter((l) => l.status !== 'resolved');
  if (unresolved.length > 0) {
    return fail('unresolved-descendants', `${unresolved.length} descendant leaf/leaves are not resolved`);
  }

  return ok(true);
}

// ═══════════════════════════════════════════════════════════════════════════
// LIFECYCLE (§4.8)
// ═══════════════════════════════════════════════════════════════════════════

export type Actor = 'student' | 'system';

/**
 * The transition graph, read from §4.8.
 *
 * `resolved` is reachable only from `practising`, and only for the system with
 * evidence. `dormant` never leads to `recurred` — a pattern that was never
 * proven fixed cannot come back, it simply reopens.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<PatternStatus, readonly PatternStatus[]>> = Object.freeze({
  open: Object.freeze<PatternStatus[]>(['acknowledged', 'practising', 'dormant']),
  acknowledged: Object.freeze<PatternStatus[]>(['practising', 'dormant']),
  practising: Object.freeze<PatternStatus[]>(['resolved', 'recurred', 'dormant']),
  dormant: Object.freeze<PatternStatus[]>(['open']),
  resolved: Object.freeze<PatternStatus[]>(['recurred']),
  recurred: Object.freeze<PatternStatus[]>(['acknowledged', 'practising', 'dormant']),
});

export interface TransitionRequest {
  readonly to: PatternStatus;
  readonly actor: Actor;
  readonly cause: string;
  readonly at: ISOTimestamp;
  /** Required when a leaf transitions to `resolved`. */
  readonly correctAnswers?: readonly CorrectAnswer[];
  /** Required when a parent transitions to `resolved`. */
  readonly descendantLeaves?: readonly Pattern[];
}

/**
 * Apply one lifecycle transition, returning a NEW frozen pattern.
 *
 * The input is never mutated. History grows by exactly one entry, through this
 * function alone, and the result is frozen so it cannot grow any other way.
 */
export function applyTransition(pattern: Pattern, request: TransitionRequest): Result<Pattern> {
  const { to, actor, cause, at } = request;

  if (parseTime(at) === null) {
    return fail('invalid-timestamp', `unparseable transition timestamp: ${at}`);
  }

  if (to === pattern.status) {
    return fail('invalid-transition', `pattern is already '${to}'; a no-op is not a transition`);
  }

  const permitted = ALLOWED_TRANSITIONS[pattern.status];
  if (!permitted.includes(to)) {
    return fail('invalid-transition', `'${pattern.status}' → '${to}' is not a legal transition`);
  }

  if (actor === 'student' && !STUDENT_SETTABLE.includes(to)) {
    return fail(
      'forbidden-for-student',
      `a student may set ${STUDENT_SETTABLE.join(' or ')}, never '${to}' — PRINCIPLES §3.1`,
    );
  }

  if (to === 'resolved') {
    if (isLeaf(pattern)) {
      if (request.correctAnswers === undefined) {
        return fail('resolution-requires-evidence', 'resolving a leaf requires correctAnswers — only evidence resolves a gap');
      }
      const proof = canResolve(pattern, request.correctAnswers);
      if (!proof.ok) return proof as Result<Pattern>;
    } else {
      if (request.descendantLeaves === undefined) {
        return fail('resolution-requires-evidence', 'resolving a parent requires descendantLeaves (§4.4.4)');
      }
      const proof = canResolveParent(pattern, request.descendantLeaves);
      if (!proof.ok) return proof as Result<Pattern>;
    }
  }

  const entry: PatternTransition = Object.freeze({
    at,
    from: pattern.status,
    to,
    cause,
  });

  const history = [...pattern.history, entry];
  assertAppendOnly(pattern.history, history);

  const next: Pattern = {
    ...pattern,
    status: to,
    history,
    resolvedAt: to === 'resolved' ? at : pattern.status === 'resolved' ? null : pattern.resolvedAt,
  };

  return ok(freezePattern(next));
}
