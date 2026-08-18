/**
 * M22-3 — M.4 IMPORTANCE TIERS + M.5 ANTI-INFLATION GUARDRAILS.
 *
 * Pure. No I/O, no database, no framework, no clock, no randomness — every
 * time-dependent decision takes an explicit `nowMs` (same discipline as
 * `lib/today/engine.ts`). The I/O layer (`app/api/home-layout/route.ts`)
 * turns live Supabase state into `HomeImportanceSignal[]` and calls
 * `resolveHomeImportance`; nothing here queries anything.
 *
 * M.5's five constraints, and where each one is enforced:
 *
 *   1. Closed trigger list, in code.        `T3_CRITICAL_TRIGGERS` et al.
 *                                            (types.ts) + the runtime check
 *                                            in `buildImportanceSignal`.
 *   2. At most one T3 renders.               `capCriticalToOne` — earliest
 *                                            `resolvesAtMs` wins; the rest
 *                                            demote to `promoted`.
 *   3. T3 requires a resolution condition.   `buildImportanceSignal` REFUSES
 *                                            to construct a `critical` signal
 *                                            with neither `resolvesAtMs` nor
 *                                            `resolutionCondition` — the same
 *                                            "not constructible" discipline
 *                                            `lib/today/engine.ts`'s
 *                                            `buildTodayItem` uses for empty
 *                                            evidence.
 *   4. No absence trigger.                   Structural (types.ts) — no
 *                                            member of any trigger union
 *                                            names an absence. Nothing to
 *                                            enforce at runtime because
 *                                            nothing absence-shaped
 *                                            typechecks in the first place.
 *   5. Every promotion is logged.            `resolveHomeImportance` returns
 *                                            a `promotions[]` alongside the
 *                                            resolved tiers — for EVERY
 *                                            signal that reached the output,
 *                                            at the tier it was actually
 *                                            resolved to (post-cap, post-
 *                                            ceiling), never the tier it
 *                                            asked for.
 *
 * THE ANTI-INFLATION CEILING (M.2 `maxTier`, applied here) is the mechanism
 * that answers M22's own done-when — "'critical' cannot inflate": a signal's
 * requested tier is clamped to `getHomeComponent(componentId).maxTier`
 * BEFORE anything else runs. A component registered with `maxTier: "ambient"`
 * (e.g. `features`) cannot reach `highlighted`, `promoted` or `critical` no
 * matter what a caller constructs — the ceiling is a registry fact, decided
 * at registration time in code review, never a field a runtime signal can
 * set for itself.
 */

import { getHomeComponent } from "./registry";
import {
  T1_HIGHLIGHTED_TRIGGERS,
  T2_PROMOTED_TRIGGERS,
  T3_CRITICAL_TRIGGERS,
  clampTier,
  type HomeComponentId,
  type HomeEvidenceRef,
  type HomeImportancePromotion,
  type HomeImportanceSignal,
  type HomeImportanceTier,
  type HomeImportanceTrigger,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTION — the one chokepoint every signal must pass through
// ═══════════════════════════════════════════════════════════════════════════

export class HomeImportanceConstructionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HomeImportanceConstructionError";
  }
}

const TIER_TRIGGER_SETS: Record<Exclude<HomeImportanceTier, "ambient">, readonly string[]> = {
  highlighted: T1_HIGHLIGHTED_TRIGGERS,
  promoted: T2_PROMOTED_TRIGGERS,
  critical: T3_CRITICAL_TRIGGERS,
};

const isNonEmptyEvidence = (refs: readonly HomeEvidenceRef[]): boolean =>
  Array.isArray(refs) && refs.length >= 1 && refs.every(r => !!r?.refKind && !!r?.id);

/**
 * The only legal way to build a `HomeImportanceSignal`. Every constraint
 * this file states about signals is enforced HERE, at construction — a
 * caller cannot build a malformed one and route around the check downstream,
 * the same guarantee `lib/today/engine.ts`'s `buildTodayItem` gives.
 */
export function buildImportanceSignal(input: {
  componentId: HomeComponentId;
  tier: Exclude<HomeImportanceTier, "ambient">;
  trigger: HomeImportanceTrigger;
  evidenceRefs: readonly HomeEvidenceRef[];
  resolvesAtMs?: number | null;
  resolutionCondition?: string | null;
}): HomeImportanceSignal {
  // M.5.1 — closed, enumerated list, re-checked at the runtime boundary (a
  // caller reaching this function through a wider/JSON-decoded type cannot
  // smuggle a trigger the type union would otherwise refuse).
  const allowed = TIER_TRIGGER_SETS[input.tier];
  if (!allowed.includes(input.trigger)) {
    throw new HomeImportanceConstructionError(
      `A ${input.tier} signal for "${input.componentId}" was built with trigger "${input.trigger}", which is not in ` +
        `the closed list for that tier (${allowed.join(", ")}). Adding a trigger is a code review (M.5.1), not a ` +
        `runtime value.`,
    );
  }

  if (!isNonEmptyEvidence(input.evidenceRefs)) {
    throw new HomeImportanceConstructionError(
      `A ${input.tier} signal for "${input.componentId}" was built with no evidenceRefs — every promotion must ` +
        `point at a real record (M.5.5's "logged with its trigger and evidence refs" requires there to BE evidence).`,
    );
  }

  const resolvesAtMs = input.resolvesAtMs ?? null;
  const resolutionCondition = input.resolutionCondition ?? null;

  // M.5.3 — "T3 requires a time-bound or a resolution condition. A T3 that
  // cannot stop being T3 is invalid by construction."
  if (input.tier === "critical" && resolvesAtMs === null && resolutionCondition === null) {
    throw new HomeImportanceConstructionError(
      `A critical signal for "${input.componentId}" (trigger "${input.trigger}") was built with neither ` +
        `resolvesAtMs nor resolutionCondition. M.5.3: a critical signal that cannot stop being critical is invalid ` +
        `by construction.`,
    );
  }

  return Object.freeze({
    componentId: input.componentId,
    tier: input.tier,
    trigger: input.trigger,
    evidenceRefs: Object.freeze(input.evidenceRefs.slice()),
    resolvesAtMs,
    resolutionCondition,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// M.5.2 — AT MOST ONE T3. "If two qualify, the earlier deadline wins and the
// other is T2."
// ═══════════════════════════════════════════════════════════════════════════

/** A signal after the M.5.2 cap — same shape, but `tier` may have been
 *  demoted from `critical` to `promoted`. */
export type CappedImportanceSignal = HomeImportanceSignal;

export function capCriticalToOne(signals: readonly HomeImportanceSignal[]): readonly CappedImportanceSignal[] {
  const critical = signals.filter(s => s.tier === "critical");
  if (critical.length <= 1) return signals;

  // Earlier deadline wins. A signal with no `resolvesAtMs` (resolution-
  // condition-only) sorts last — it has no deadline to be "earlier" by, so a
  // dated one always outranks it when both are present.
  const sorted = [...critical].sort((a, b) => {
    const ax = a.resolvesAtMs ?? Number.POSITIVE_INFINITY;
    const bx = b.resolvesAtMs ?? Number.POSITIVE_INFINITY;
    if (ax !== bx) return ax - bx;
    // Deterministic tie-break so this function is a total order, never
    // array-order-dependent (same discipline `lib/today/engine.ts` states
    // for its own ordering decisions).
    return a.componentId.localeCompare(b.componentId);
  });
  const winner = sorted[0];

  return signals.map(s => {
    if (s.tier !== "critical" || s === winner) return s;
    // Demoted to T2. `trigger` is no longer valid for `promoted` under the
    // closed list (a T3 trigger is not a T2 trigger) — M.5.2 demotes the
    // TIER, not the reason, so the demoted signal carries a neutral,
    // always-valid T2 trigger ("recurrence") while its evidence and
    // resolution fields are preserved for the log.
    return Object.freeze({ ...s, tier: "promoted" as const, trigger: "recurrence" as const });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CEILING — M.2's `maxTier`, applied per signal
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clamps a signal's tier to its component's registered ceiling. This is the
 * literal mechanism behind "'critical' cannot inflate": a component that
 * cannot be promoted at all (`importanceCapable: false`) is clamped to
 * `ambient` regardless of what triggered the signal — represented here as
 * `null` (dropped; ambient is the implicit default, never a stored signal) —
 * and a component capped at `promoted` (e.g. `recommendation`) can never
 * surface a `critical` signal even if one somehow reached this function.
 */
export function clampToRegistryCeiling(signal: HomeImportanceSignal): HomeImportanceSignal | null {
  const def = getHomeComponent(signal.componentId);
  if (!def.importanceCapable) return null;
  const clamped = clampTier(signal.tier, def.maxTier);
  if (clamped === "ambient") return null;
  if (clamped === signal.tier) return signal;
  return Object.freeze({ ...signal, tier: clamped as Exclude<HomeImportanceTier, "ambient"> });
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ENTRY POINT — resolve a component's final tier + build the log
// ═══════════════════════════════════════════════════════════════════════════

export interface HomeImportanceResolution {
  /** Final tier per component id — components with no signal, or whose
   *  signal clamped to ambient, are simply absent from this map (ambient is
   *  the implicit default, same as `lib/today`'s "zero items rather than one
   *  invented" — nothing is fabricated to fill the map). */
  readonly tierByComponent: ReadonlyMap<HomeComponentId, HomeImportanceTier>;
  readonly promotions: readonly HomeImportancePromotion[];
}

/**
 * Takes every importance signal the caller has evidence for (one per
 * component per condition; a component may have more than one signal in a
 * render — e.g. `recommendation` due AND recently resolved — the HIGHEST
 * survives per M.4's "the effect on layout" being a single per-component
 * state) and returns the resolved tier per component plus the M.5.5 log.
 */
export function resolveHomeImportance(
  signals: readonly HomeImportanceSignal[],
  nowMs: number,
): HomeImportanceResolution {
  const capped = capCriticalToOne(signals);
  const ceilinged = capped
    .map(clampToRegistryCeiling)
    .filter((s): s is HomeImportanceSignal => s !== null);

  const tierByComponent = new Map<HomeComponentId, HomeImportanceTier>();
  const winningSignal = new Map<HomeComponentId, HomeImportanceSignal>();

  for (const s of ceilinged) {
    const current = tierByComponent.get(s.componentId);
    if (!current || TIER_RANK(s.tier) > TIER_RANK(current)) {
      tierByComponent.set(s.componentId, s.tier);
      winningSignal.set(s.componentId, s);
    }
  }

  // M.5.5 — every promotion above ambient is logged, at the tier it was
  // ACTUALLY resolved to (post-cap, post-ceiling), with its trigger and
  // evidence.
  const promotions: HomeImportancePromotion[] = [];
  for (const [componentId, tier] of tierByComponent) {
    const s = winningSignal.get(componentId)!;
    promotions.push(
      Object.freeze({
        componentId,
        tier: tier as Exclude<HomeImportanceTier, "ambient">,
        trigger: s.trigger,
        evidenceRefs: s.evidenceRefs,
        promotedAtMs: nowMs,
      }),
    );
  }

  return Object.freeze({
    tierByComponent: tierByComponent as ReadonlyMap<HomeComponentId, HomeImportanceTier>,
    promotions: Object.freeze(promotions),
  });
}

function TIER_RANK(t: HomeImportanceTier): number {
  return { ambient: 0, highlighted: 1, promoted: 2, critical: 3 }[t];
}
