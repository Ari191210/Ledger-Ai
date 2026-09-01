/**
 * M22 — HOME COMPOSITION. Shared types. Pure, I/O-free.
 *
 * Architecture Part M in full. Same discipline as `lib/today/types.ts`,
 * `lib/recommendations/types.ts`: pure, deterministic, non-mutating.
 *
 * M.1 — the division of authority:
 *   what data exists / what is important        → the system
 *   which components are visible, order, size    → the student  (`HomeLayout`)
 *   what is critical enough to override order     → the system, under M.5
 *   what a component looks like                   → the design system
 */

// ═══════════════════════════════════════════════════════════════════════════
// M.2 — THE COMPONENT REGISTRY, AS DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The closed set of things Home can render. Adding a member is a code change
 * (a new `HomeComponentDef` in `lib/home/registry.ts`) and, for anything that
 * needs live data, a new widget — never a runtime string. This is the same
 * "bounded, not open" discipline `personal_model_dimension` (031) uses for
 * the Personal Model's dimension list.
 */
export const HOME_COMPONENT_IDS = [
  "score",
  "recommendation",
  "recent_activity",
  "exams",
  "features",
] as const;

export type HomeComponentId = (typeof HOME_COMPONENT_IDS)[number];

export const isHomeComponentId = (v: unknown): v is HomeComponentId =>
  typeof v === "string" && (HOME_COMPONENT_IDS as readonly string[]).includes(v);

/** M.6 — sizes bound what a student may choose; a component declares which
 *  of these it can actually render at (`minSize`..`maxSize`). Ordinal, not a
 *  free number, so "bigger than declared" cannot silently compile. */
export const HOME_COMPONENT_SIZES = ["compact", "standard", "expanded"] as const;
export type HomeComponentSize = (typeof HOME_COMPONENT_SIZES)[number];
export const isHomeComponentSize = (v: unknown): v is HomeComponentSize =>
  typeof v === "string" && (HOME_COMPONENT_SIZES as readonly string[]).includes(v);
const SIZE_RANK: Record<HomeComponentSize, number> = { compact: 0, standard: 1, expanded: 2 };
export const sizeAtLeast = (a: HomeComponentSize, b: HomeComponentSize) => SIZE_RANK[a] >= SIZE_RANK[b];
export const clampSize = (v: HomeComponentSize, min: HomeComponentSize, max: HomeComponentSize): HomeComponentSize =>
  SIZE_RANK[v] < SIZE_RANK[min] ? min : SIZE_RANK[v] > SIZE_RANK[max] ? max : v;

/** M.2 — "a component whose data dependency is unavailable is omitted, not
 *  rendered empty" vs. one that always has *something* honest to show (an
 *  Empty invitation, never a blank card). */
export const HOME_EMPTY_BEHAVIOURS = ["omit", "empty_state"] as const;
export type HomeEmptyBehaviour = (typeof HOME_EMPTY_BEHAVIOURS)[number];

// ═══════════════════════════════════════════════════════════════════════════
// M.4 — FOUR IMPORTANCE TIERS (ARCHITECTURAL INFERENCE, flagged for
// ratification in Part M — implemented exactly as specified regardless)
// ═══════════════════════════════════════════════════════════════════════════

export const HOME_IMPORTANCE_TIERS = ["ambient", "highlighted", "promoted", "critical"] as const;
export type HomeImportanceTier = (typeof HOME_IMPORTANCE_TIERS)[number];
export const isHomeImportanceTier = (v: unknown): v is HomeImportanceTier =>
  typeof v === "string" && (HOME_IMPORTANCE_TIERS as readonly string[]).includes(v);

const TIER_RANK: Record<HomeImportanceTier, number> = { ambient: 0, highlighted: 1, promoted: 2, critical: 3 };
export const tierAtMost = (v: HomeImportanceTier, ceiling: HomeImportanceTier) => TIER_RANK[v] <= TIER_RANK[ceiling];
export const higherTier = (a: HomeImportanceTier, b: HomeImportanceTier): HomeImportanceTier =>
  TIER_RANK[a] >= TIER_RANK[b] ? a : b;
export const clampTier = (v: HomeImportanceTier, ceiling: HomeImportanceTier): HomeImportanceTier =>
  TIER_RANK[v] > TIER_RANK[ceiling] ? ceiling : v;

/**
 * M.2's exact registry shape, transcribed field for field:
 * `{ component_id, data_dependencies[], min_size, max_size, default_size,
 *   default_order, can_be_hidden, importance_capable, empty_behaviour,
 *   mobile_rank }`
 *
 * PLUS `maxTier` — M.5's anti-inflation ceiling. Not in the brief's literal
 * field list, but required by M.5.1 ("T3 triggers are a closed, enumerated
 * list in code... adding one is a code review") applied at the component
 * level: a component's CAPACITY to be promoted is fixed here, at
 * registration, in code — never computed, never widened by a signal, never
 * a property any runtime path can set. This is what makes "critical cannot
 * inflate" a registry-level guarantee rather than a convention.
 */
export interface HomeComponentDef {
  readonly componentId: HomeComponentId;
  /** Human label for settings/personalise UI and the widget's own header. */
  readonly title: string;
  /** M.2 — what this component needs to have anything honest to render. An
   *  I/O caller supplies the set of dependencies it actually has data for;
   *  a component whose dependency is missing is OMITTED (never rendered
   *  empty), per `emptyBehaviour === "omit"`. */
  readonly dataDependencies: readonly string[];
  readonly minSize: HomeComponentSize;
  readonly maxSize: HomeComponentSize;
  readonly defaultSize: HomeComponentSize;
  readonly defaultOrder: number;
  /** `false` applies to exactly one thing — the Score (M.2: "persistent
   *  chrome... like a battery indicator"). */
  readonly canBeHidden: boolean;
  /** `false` means this component can NEVER be promoted above `ambient`,
   *  regardless of any signal — e.g. a discovery/marketing widget with no
   *  legitimate promotion trigger. */
  readonly importanceCapable: boolean;
  /** M.5's ceiling. Never above this, however signals resolve. */
  readonly maxTier: HomeImportanceTier;
  readonly emptyBehaviour: HomeEmptyBehaviour;
  /** M.6 — declared mobile order, not emergent from desktop order. */
  readonly mobileRank: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE STUDENT'S LAYOUT — `HomeLayout`, server-persisted (M22-2)
// ═══════════════════════════════════════════════════════════════════════════

export interface HomeLayoutEntry {
  readonly componentId: HomeComponentId;
  readonly visible: boolean;
  readonly order: number;
  readonly size: HomeComponentSize;
}

export interface HomeLayout {
  readonly entries: readonly HomeLayoutEntry[];
  /** `null` — never persisted; the default has not been saved yet. */
  readonly updatedAtMs: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// M.5 — THE CLOSED, ENUMERATED TRIGGER LISTS
//
// M.5.1: "T3 triggers are a closed, enumerated list in code. Adding one is a
// code review, never a runtime condition or a config value." Encoding each
// list as a `const … as const` union is that closure: a caller cannot pass a
// string that is not one of these and have it typecheck, and `buildImportance
// Signal` (see `lib/home/importance.ts`) re-checks the same list at runtime
// for any caller that reaches it through a wider (e.g. JSON-decoded) type.
//
// M.5.4: "A T3 trigger may never be *absence*." Enforced by omission — no
// inactivity/absence-shaped member exists in `T3_CRITICAL_TRIGGERS`, and
// never will without a code review that has to look this comment in the eye.
// ═══════════════════════════════════════════════════════════════════════════

export const T3_CRITICAL_TRIGGERS = [
  "exam_within_critical_window",
  "data_integrity_event",
  "account_access_issue",
] as const;
export type T3CriticalTrigger = (typeof T3_CRITICAL_TRIGGERS)[number];

export const T2_PROMOTED_TRIGGERS = ["due_retest", "unverified_session", "recurrence"] as const;
export type T2PromotedTrigger = (typeof T2_PROMOTED_TRIGGERS)[number];

export const T1_HIGHLIGHTED_TRIGGERS = ["new_accomplishment", "score_movement", "pattern_resolved"] as const;
export type T1HighlightedTrigger = (typeof T1_HIGHLIGHTED_TRIGGERS)[number];

export type HomeImportanceTrigger = T3CriticalTrigger | T2PromotedTrigger | T1HighlightedTrigger;

/** A reference into a real record — same shape as `lib/today/types.ts`'s
 *  `EvidenceRef`, reused rather than reinvented. */
export interface HomeEvidenceRef {
  readonly refKind: string;
  readonly id: string;
}

/**
 * A single system-issued importance signal for one component. Constructed
 * only through `buildImportanceSignal` (`lib/home/importance.ts`), which is
 * the one place that enforces M.5.1 (closed trigger set), M.5.3 (a `critical`
 * signal must carry a resolution condition) and evidence-backing.
 */
export interface HomeImportanceSignal {
  readonly componentId: HomeComponentId;
  readonly tier: Exclude<HomeImportanceTier, "ambient">;
  readonly trigger: HomeImportanceTrigger;
  readonly evidenceRefs: readonly HomeEvidenceRef[];
  /** M.5.3 — required (one of these two) when `tier === "critical"`. */
  readonly resolvesAtMs: number | null;
  readonly resolutionCondition: string | null;
}

/** M.5.5 — "every promotion above T0 is logged, with its trigger and
 *  evidence refs". The record a promotion produces, independent of whether
 *  it survives the M.5.2 at-most-one-T3 cap (a demoted signal is still
 *  logged at the tier it was ACTUALLY resolved to, not the tier it asked
 *  for — see `lib/home/importance.ts`'s `resolveHomeImportance`). */
export interface HomeImportancePromotion {
  readonly componentId: HomeComponentId;
  readonly tier: Exclude<HomeImportanceTier, "ambient">;
  readonly trigger: HomeImportanceTrigger;
  readonly evidenceRefs: readonly HomeEvidenceRef[];
  readonly promotedAtMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// M.3 — LAYOUT RESOLUTION OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

export type HomeViewport = "desktop" | "mobile";

export interface ResolvedHomeComponent {
  readonly componentId: HomeComponentId;
  readonly size: HomeComponentSize;
  readonly tier: HomeImportanceTier;
  /** `true` for the at-most-one T3 item — M.4: "a dedicated slot above
   *  everything, and it may not be dismissed by layout preference." */
  readonly dedicatedSlot: boolean;
}

export interface HomeComposition {
  readonly components: readonly ResolvedHomeComponent[];
  readonly promotions: readonly HomeImportancePromotion[];
  readonly viewport: HomeViewport;
}
