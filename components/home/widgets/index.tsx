"use client";

// ═══════════════════════════════════════════════════════════════════════════
// M22-1 — HOME WIDGETS. One React component per M.2 registry entry that is
// NOT the Score (the Score is chrome, rendered by `app/home/page.tsx`
// itself, exactly as M3 built it — untouched here).
//
// Each widget takes exactly the slice of `content` its registry entry
// declared as a dependency (`lib/home/registry.ts`) — nothing fabricated,
// nothing guessed. `HomeComposer` (`components/home/composer.tsx`) is the
// only caller; it decides WHICH widget renders and in what tier via the
// registry + `resolveHomeComposition`, never a hardcoded switch a page
// author maintains by hand.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { Panel, Row, Spacer, Stack, Text, Chip, Empty } from "@/components/console/primitives";
import type { HomeImportanceTier } from "@/lib/home";

const TIER_LABEL: Record<HomeImportanceTier, string | null> = {
  ambient: null,
  highlighted: "New",
  promoted: "Due",
  critical: "Critical",
};

function TierChip({ tier }: { tier: HomeImportanceTier }) {
  const label = TIER_LABEL[tier];
  if (!label) return null;
  return <Chip tone={tier === "critical" ? "error" : tier === "promoted" ? "warn" : "info"}>{label}</Chip>;
}

export function RecommendationWidget({
  content,
  tier,
}: {
  content: { hasDueRetest: boolean; hasOpenPattern: boolean } | undefined;
  tier: HomeImportanceTier;
}) {
  if (!content) return null;
  return (
    <Panel tone="raised" pad={4} bordered>
      <Stack gap={3}>
        <Row gap={2}>
          <Text step="label">Daily recommendation</Text>
          <Spacer />
          <TierChip tier={tier} />
        </Row>
        <Text step="body">
          {content.hasDueRetest
            ? "A retest is due — this is the fastest way to raise your score today."
            : "An open pattern is waiting on you."}
        </Text>
        <Link href="/diagnosis" className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>
          Open diagnosis →
        </Link>
      </Stack>
    </Panel>
  );
}

export function RecentActivityWidget({
  content,
  tier,
}: {
  content: { sessionId: string; closedAtMs: number } | undefined;
  tier: HomeImportanceTier;
}) {
  if (!content) return null;
  const when = new Date(content.closedAtMs).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <Panel tone="raised" pad={4} bordered>
      <Stack gap={3}>
        <Row gap={2}>
          <Text step="label">Recently used</Text>
          <Spacer />
          <TierChip tier={tier} />
        </Row>
        <Text step="body">A session closed on {when}.</Text>
        <Link href="/record" className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>
          See the record →
        </Link>
      </Stack>
    </Panel>
  );
}

export function ExamsWidget({
  content,
  tier,
}: {
  content: { subject: string; name: string; days: number } | undefined;
  tier: HomeImportanceTier;
}) {
  if (!content) return null;
  return (
    <Panel tone={tier === "critical" ? "recessed" : "raised"} pad={4} bordered>
      <Stack gap={3}>
        <Row gap={2}>
          <Text step="label">Exam schedule</Text>
          <Spacer />
          <TierChip tier={tier} />
        </Row>
        <Text step="body">
          {content.subject} — {content.name} in {content.days} day{content.days === 1 ? "" : "s"}.
        </Text>
        <Link href="/tools/exam-day" className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>
          Exam-day view →
        </Link>
      </Stack>
    </Panel>
  );
}

/** No `content` dependency (M.2's registry declares `dataDependencies: []`)
 *  — always renders, honestly, as a fixed invitation rather than a claim
 *  about the student's own data. */
export function FeaturesWidget() {
  return (
    <Panel tone="flat" pad={4} bordered>
      <Empty
        title="There is more here"
        body="Every tool StudyLedger ships is one search away."
        action={{ label: "Browse tools", href: "/tools" }}
      />
    </Panel>
  );
}
