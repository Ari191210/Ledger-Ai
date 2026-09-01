/**
 * M22-1 — THE M.2 COMPONENT REGISTRY.
 *
 * THE registry. One list of Home components exists in this repository — this
 * one — mirroring `lib/tools-registry.ts`'s "one list of tools exists" and
 * `lib/today/types.ts`'s closed `TODAY_ITEM_KINDS`. `app/home/page.tsx` and
 * `app/tools/personalise/page.tsx` / `components/settings/appearance-fields
 * .tsx` all read THIS array; none of them hardcodes a component list of its
 * own. Adding a row here is what "components are registered, not hardcoded"
 * means operationally: a new entry changes what Home can compose without
 * `app/home/page.tsx` itself being touched (`tests/home-composition.test.mjs`
 * proves exactly this).
 *
 * CURRENT FACT this registry replaces — `lib/dash-layout.ts` (pre-M22) held
 * five untyped booleans (`recommendation | recent | score | exams |
 * features`) with no ordering, no sizing, and no registry at all. The five
 * component ids below are the same five sections, TYPED, in the M.2 shape —
 * continuity for the student, honesty for the system.
 *
 * `score` is a deliberate resolution of the M.2 tension the architecture
 * names outright ("`can_be_hidden = false` applies to exactly one thing —
 * the Score... arguably not a home component at all"): the OLD boolean
 * (`score: true|false`) let a student hide persistent chrome, in direct
 * tension with `PRODUCT_PRINCIPLES.md:257-261`. The registry entry below
 * makes that impossible to express — `canBeHidden: false`,
 * `importanceCapable: false` (chrome is never promoted; it is always
 * maximally present already) — and `validateHomeLayout` (`lib/home/
 * layout.ts`) refuses ANY submitted layout that tries to hide it, whether the
 * attempt comes from the settings UI, a hand-crafted API call, or a future
 * caller nobody has written yet.
 */

import type { HomeComponentDef, HomeComponentId } from "./types";
import { HOME_COMPONENT_IDS } from "./types";

export const HOME_COMPONENT_REGISTRY: readonly HomeComponentDef[] = [
  {
    componentId: "score",
    title: "Ledger Score",
    dataDependencies: ["score_snapshot"],
    minSize: "compact",
    maxSize: "compact",
    defaultSize: "compact",
    defaultOrder: 0,
    canBeHidden: false,
    importanceCapable: false,
    maxTier: "ambient",
    emptyBehaviour: "empty_state",
    mobileRank: 0,
  },
  {
    componentId: "recommendation",
    title: "Daily Recommendation",
    dataDependencies: ["next_best_action"],
    minSize: "compact",
    maxSize: "expanded",
    defaultSize: "standard",
    defaultOrder: 1,
    canBeHidden: true,
    importanceCapable: true,
    // M.4 — a due retest / unverified session / recurrence moves this to the
    // top of its section (T2). It never gets the dedicated T3 slot: a
    // recommendation, however overdue, is not an exam, a data-integrity
    // event or an account issue.
    maxTier: "promoted",
    emptyBehaviour: "omit",
    mobileRank: 1,
  },
  {
    componentId: "recent_activity",
    title: "Recently Used",
    dataDependencies: ["accomplishments"],
    minSize: "compact",
    maxSize: "expanded",
    defaultSize: "standard",
    defaultOrder: 2,
    canBeHidden: true,
    importanceCapable: true,
    // A new accomplishment / score movement highlights this IN PLACE (T1) —
    // never moves, never claims the dedicated slot.
    maxTier: "highlighted",
    emptyBehaviour: "omit",
    mobileRank: 3,
  },
  {
    componentId: "exams",
    title: "Exam Schedule",
    dataDependencies: ["upcoming_exams"],
    minSize: "compact",
    maxSize: "expanded",
    defaultSize: "standard",
    defaultOrder: 3,
    canBeHidden: true,
    importanceCapable: true,
    // The one component whose registration reaches T3 at all — an exam
    // inside the critical window is exactly M.4's first named trigger.
    maxTier: "critical",
    emptyBehaviour: "omit",
    mobileRank: 2,
  },
  {
    componentId: "features",
    title: "Features Showcase",
    dataDependencies: [],
    minSize: "compact",
    maxSize: "standard",
    defaultSize: "compact",
    defaultOrder: 4,
    canBeHidden: true,
    // No legitimate trigger exists for promoting a discovery/marketing
    // widget — `importanceCapable: false` makes that a registry fact, not a
    // hope. Even if a future bug fed this component a signal, `maxTier:
    // "ambient"` (M.5's ceiling) clamps it back down before it ever reaches
    // a render — see `tests/home-composition.test.mjs`'s inflation case.
    importanceCapable: false,
    maxTier: "ambient",
    emptyBehaviour: "empty_state",
    mobileRank: 4,
  },
];

// ── Mirror check, exercised by the test suite ───────────────────────────────
// `HOME_COMPONENT_IDS` (types.ts) and this registry's own id list must never
// drift — the same "closed set, checked twice" discipline `lib/exam-day.ts`
// documents for `EXAM_NEAR_DAYS` mirroring `EXAM_RISK_WINDOW_DAYS`.
const registryIds = HOME_COMPONENT_REGISTRY.map(c => c.componentId);
if (registryIds.length !== HOME_COMPONENT_IDS.length || registryIds.some((id, i) => id !== HOME_COMPONENT_IDS[i])) {
  throw new Error(
    "lib/home/registry.ts: HOME_COMPONENT_REGISTRY has drifted from HOME_COMPONENT_IDS (lib/home/types.ts). " +
      "Adding/removing a component is a two-file change: the id union AND the registry row.",
  );
}

export function getHomeComponent(id: HomeComponentId): HomeComponentDef {
  const def = HOME_COMPONENT_REGISTRY.find(c => c.componentId === id);
  if (!def) throw new RangeError(`lib/home/registry.ts: no component registered for "${id}"`);
  return def;
}

export function listHomeComponents(): readonly HomeComponentDef[] {
  return HOME_COMPONENT_REGISTRY;
}
