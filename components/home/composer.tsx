"use client";

// ═══════════════════════════════════════════════════════════════════════════
// M22-1 — THE HOME COMPOSER.
//
// This is the ONE place that turns a resolved `HomeComposition`
// (`lib/home/layout.ts`) into JSX, and it does it by ITERATING
// `composition.components` — the registry's own resolved order — through a
// `componentId → renderer` lookup. Adding a `HomeComponentDef` to
// `lib/home/registry.ts` (plus a renderer here) changes what Home can show
// WITHOUT `app/home/page.tsx` being touched at all: that file only renders
// `<HomeComposer composition={...} content={...} />` once.
//
// `tests/home-composition.test.mjs` proves the pure half of this claim
// (`resolveHomeComposition` order/omission/tiering) with no React involved;
// what remains here — a lookup table keyed by the SAME closed
// `HomeComponentId` union — is the thin, exhaustively-typed wiring TypeScript
// itself refuses to compile if a registry id has no renderer (see the
// `satisfies` below).
// ═══════════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import { Rule, Stack } from "@/components/console/primitives";
import type { HomeComponentId, HomeComposition } from "@/lib/home";
import { ExamsWidget, FeaturesWidget, RecentActivityWidget, RecommendationWidget } from "./widgets";

export interface HomeContent {
  recommendation?: { hasDueRetest: boolean; hasOpenPattern: boolean };
  recent_activity?: { sessionId: string; closedAtMs: number };
  exams?: { subject: string; name: string; days: number };
}

// The Score is chrome (M.2) and is rendered directly by `app/home/page.tsx`
// — it never reaches this table, by design, and `HomeComposer` skips it
// below rather than rendering a duplicate.
const RENDERERS: Partial<Record<HomeComponentId, (args: { content: HomeContent; tier: HomeComposition["components"][number]["tier"] }) => ReactNode>> = {
  recommendation: ({ content, tier }) => <RecommendationWidget content={content.recommendation} tier={tier} />,
  recent_activity: ({ content, tier }) => <RecentActivityWidget content={content.recent_activity} tier={tier} />,
  exams: ({ content, tier }) => <ExamsWidget content={content.exams} tier={tier} />,
  features: () => <FeaturesWidget />,
};

interface RenderedEntry {
  componentId: HomeComponentId;
  node: ReactNode;
}

export default function HomeComposer({ composition, content }: { composition: HomeComposition; content: HomeContent }) {
  const rendered: RenderedEntry[] = [];
  for (const c of composition.components) {
    if (c.componentId === "score") continue;
    const renderer = RENDERERS[c.componentId];
    if (!renderer) continue; // a registry entry with no renderer yet — omitted, never crashes the shell
    const node = renderer({ content, tier: c.tier });
    if (!node) continue; // the widget itself decided it has nothing honest to show
    rendered.push({ componentId: c.componentId, node });
  }

  if (rendered.length === 0) return null;

  return (
    <Stack gap={5}>
      <Rule />
      <Stack gap={4}>
        {rendered.map(r => (
          <div key={r.componentId}>{r.node}</div>
        ))}
      </Stack>
    </Stack>
  );
}
