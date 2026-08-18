/**
 * M22-2 — HOMELAYOUT: DEFAULTS, VALIDATION, AND THE M.3 MERGE.
 *
 * Pure. No I/O — this file never touches `localStorage`, `fetch`, or
 * Supabase. `lib/dash-layout.ts` (rebuilt) and `app/api/home-layout/route.ts`
 * are the I/O callers; everything here is the same kind of deterministic
 * core `lib/today/engine.ts` and `lib/recommendations/engine.ts` are.
 *
 * M.3, verbatim:
 *   registry defaults
 *       ⊕ student HomeLayout          (visibility, order, size, pinned)
 *       ⊕ system importance signals   (per-component, 0..1, evidence-backed)
 *       ⊕ viewport class
 *       → resolved ordered component list
 *   "The merge is a pure function. Given the same three inputs it always
 *   produces the same layout."
 *
 * `resolveHomeComposition` below IS that function.
 */

import { getHomeComponent, listHomeComponents } from "./registry";
import { resolveHomeImportance } from "./importance";
import {
  clampSize,
  isHomeComponentId,
  isHomeComponentSize,
  type HomeComponentId,
  type HomeComposition,
  type HomeImportanceSignal,
  type HomeLayout,
  type HomeLayoutEntry,
  type HomeViewport,
  type ResolvedHomeComponent,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS — the registry's own `defaultOrder`/`defaultSize`, made concrete
// ═══════════════════════════════════════════════════════════════════════════

export function defaultHomeLayout(): HomeLayout {
  const entries: HomeLayoutEntry[] = listHomeComponents()
    .slice()
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map(def => ({
      componentId: def.componentId,
      visible: true,
      order: def.defaultOrder,
      size: def.defaultSize,
    }));
  return Object.freeze({ entries: Object.freeze(entries), updatedAtMs: null });
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION — the one gate a submitted layout must pass before it is
// trusted as "the student's HomeLayout". `app/api/home-layout/route.ts`
// calls this before ANY write; `tests/home-composition.test.mjs` exercises
// it directly, with no server in reach.
// ═══════════════════════════════════════════════════════════════════════════

export type HomeLayoutValidation = { ok: true; layout: HomeLayout } | { ok: false; error: string };

export function validateHomeLayout(candidate: unknown): HomeLayoutValidation {
  if (typeof candidate !== "object" || candidate === null || !Array.isArray((candidate as { entries?: unknown }).entries)) {
    return { ok: false, error: "HomeLayout must be an object with an `entries` array." };
  }
  const rawEntries = (candidate as { entries: unknown[] }).entries;

  const seen = new Set<HomeComponentId>();
  const entries: HomeLayoutEntry[] = [];

  for (const raw of rawEntries) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "Each HomeLayout entry must be an object." };
    }
    const e = raw as Record<string, unknown>;

    if (!isHomeComponentId(e.componentId)) {
      // A component id that is not in the registry cannot be admitted at
      // all — this is what makes "unknown componentId" refused STRUCTURALLY
      // (the registry is the allowlist), not by application convention.
      return { ok: false, error: `Unknown componentId "${String(e.componentId)}" — not in the M.2 registry.` };
    }
    if (seen.has(e.componentId)) {
      return { ok: false, error: `Duplicate entry for componentId "${e.componentId}".` };
    }
    seen.add(e.componentId);

    if (typeof e.visible !== "boolean") {
      return { ok: false, error: `Entry "${e.componentId}": visible must be a boolean.` };
    }
    if (typeof e.order !== "number" || !Number.isFinite(e.order)) {
      return { ok: false, error: `Entry "${e.componentId}": order must be a finite number.` };
    }
    if (!isHomeComponentSize(e.size)) {
      return { ok: false, error: `Entry "${e.componentId}": size must be one of compact/standard/expanded.` };
    }

    const def = getHomeComponent(e.componentId);

    // M.2 — `can_be_hidden = false` applies to exactly one thing (the
    // Score). This is enforced HERE, at the same boundary every other
    // submitted-value rule in this file is enforced, in addition to the
    // database-level trigger `034_home_layout.sql` installs — the two are
    // independent, belt-and-braces (same posture 031 §6 documents for
    // `personal_model_aggregator`).
    if (!def.canBeHidden && e.visible === false) {
      return { ok: false, error: `Entry "${e.componentId}" cannot be hidden — it is persistent chrome (M.2).` };
    }

    const size = e.size;
    if (!(sizeInRange(size, def.minSize, def.maxSize))) {
      return {
        ok: false,
        error: `Entry "${e.componentId}": size "${size}" is outside its registered range (${def.minSize}..${def.maxSize}).`,
      };
    }

    entries.push({ componentId: e.componentId, visible: e.visible, order: e.order, size });
  }

  // Any registered component absent from the submitted entries falls back to
  // its registry default — a partial submission is not a rejection, it is a
  // student choosing to leave the rest alone.
  const submittedIds = new Set(entries.map(e => e.componentId));
  for (const def of listHomeComponents()) {
    if (!submittedIds.has(def.componentId)) {
      entries.push({
        componentId: def.componentId,
        visible: true,
        order: def.defaultOrder,
        size: def.defaultSize,
      });
    }
  }

  return { ok: true, layout: { entries: Object.freeze(entries), updatedAtMs: null } };
}

function sizeInRange(v: ReturnType<typeof clampSize>, min: Parameters<typeof clampSize>[1], max: Parameters<typeof clampSize>[2]): boolean {
  return clampSize(v, min, max) === v;
}

// ═══════════════════════════════════════════════════════════════════════════
// M.3 — THE MERGE
// ═══════════════════════════════════════════════════════════════════════════

const MOBILE_SIZE_FLOOR = "compact" as const; // M.6: "components below a size floor are omitted rather than squeezed"

export function resolveHomeComposition(input: {
  layout: HomeLayout;
  /** Data dependencies the caller actually has evidence for — M.2: "a
   *  component whose data dependency is unavailable is omitted." An empty
   *  array in `dataDependencies` (e.g. `score`, `features`) is always
   *  satisfied trivially. */
  availableData: ReadonlySet<string>;
  importanceSignals: readonly HomeImportanceSignal[];
  viewport: HomeViewport;
  nowMs: number;
}): HomeComposition {
  const { tierByComponent, promotions } = resolveHomeImportance(input.importanceSignals, input.nowMs);

  const byId = new Map(input.layout.entries.map(e => [e.componentId, e]));

  type Candidate = { entry: HomeLayoutEntry; def: ReturnType<typeof getHomeComponent>; tier: ReturnType<typeof resolveTierFor> };
  const resolveTierFor = (id: HomeComponentId) => tierByComponent.get(id) ?? "ambient";

  const candidates: Candidate[] = listHomeComponents()
    .map(def => {
      const entry = byId.get(def.componentId) ?? {
        componentId: def.componentId,
        visible: true,
        order: def.defaultOrder,
        size: def.defaultSize,
      };
      return { entry, def, tier: resolveTierFor(def.componentId) };
    })
    // M.2 — data dependency unmet ⇒ omitted, never rendered empty.
    .filter(c => c.def.dataDependencies.every(dep => input.availableData.has(dep)));

  // M.4 T3 — "it may not be dismissed by layout preference": a critical
  // component renders even if the student marked it hidden.
  const visible = candidates.filter(c => c.entry.visible || c.tier === "critical");

  const critical = visible.filter(c => c.tier === "critical");
  // M.5.2 already caps signals to at most one `critical` tier before this
  // point (`resolveHomeImportance`), so this is a defensive invariant, not a
  // second decision.
  const dedicated = critical[0] ?? null;

  const rest = visible.filter(c => c !== dedicated);

  let ordered: Candidate[];
  if (input.viewport === "mobile") {
    // M.6 — mobile is a DIFFERENT RESOLUTION of the same registry: ordered
    // by `mobileRank`, not by the student's desktop order. Below-floor
    // components are omitted rather than squeezed.
    ordered = rest
      .filter(c => rankOf(clampSize(c.entry.size, c.def.minSize, c.def.maxSize)) >= rankOf(MOBILE_SIZE_FLOOR))
      .slice()
      .sort((a, b) => a.def.mobileRank - b.def.mobileRank || a.def.componentId.localeCompare(b.def.componentId));
  } else {
    // Desktop — T2 "promoted to the top of its section"; T0/T1 keep the
    // student's own order ("highlighted... order unchanged").
    const promoted = rest.filter(c => c.tier === "promoted");
    const ambientOrHighlighted = rest.filter(c => c.tier !== "promoted");
    const byOrder = (a: Candidate, b: Candidate) => a.entry.order - b.entry.order || a.def.componentId.localeCompare(b.def.componentId);
    ordered = [...promoted.sort(byOrder), ...ambientOrHighlighted.sort(byOrder)];
  }

  const components: ResolvedHomeComponent[] = [];
  if (dedicated) {
    components.push({
      componentId: dedicated.def.componentId,
      size: clampSize(dedicated.entry.size, dedicated.def.minSize, dedicated.def.maxSize),
      tier: dedicated.tier,
      dedicatedSlot: true,
    });
  }
  for (const c of ordered) {
    components.push({
      componentId: c.def.componentId,
      size: clampSize(c.entry.size, c.def.minSize, c.def.maxSize),
      tier: c.tier,
      dedicatedSlot: false,
    });
  }

  return Object.freeze({ components: Object.freeze(components), promotions, viewport: input.viewport });
}

function rankOf(s: "compact" | "standard" | "expanded"): number {
  return { compact: 0, standard: 1, expanded: 2 }[s];
}
