"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  Control,
  Empty,
  Measure,
  Readout,
  Row,
  Rule,
  Spacer,
  Stack,
  Text,
} from "@/components/console/primitives";
import type { TodayEmptyReason, TodayItem } from "@/lib/today/types";

// ═══════════════════════════════════════════════════════════════════════════
// /today — M21. Architecture Part L, B.12. "A continuously regenerated,
// ordered list of typed, evidence-backed items answering 'what matters right
// now?'" — subordinate to the home surface's governing question.
//
// EVERYTHING RENDERED HERE IS A FIGURE OR A REFERENCE, NEVER A FABRICATED
// SENTENCE (V.7.6). This file contains no `Math.random`, no hardcoded
// population figure and no peer comparison — `tests/today.test.mjs` greps
// this file's own source to keep that true across future edits, the same
// technique `lib/session-completion.ts`'s E.8.a discipline uses for the
// completion payload.
//
// THE EMPTY STATE IS NEVER A GENERIC PLACEHOLDER (L.4). `emptyReason` picks
// one of four typed copy blocks below; a lagging projection
// (`insufficient_data`) renders a system-state sentence, never "you're all
// caught up".
// ═══════════════════════════════════════════════════════════════════════════

const REASON_REF_LABEL: Record<string, string> = {
  session_active: "Resume where you left off",
  session_dormant: "Pick this back up",
  session_completed: "From your last session",
  score_current: "Where you stand",
};

const EMPTY_COPY: Record<TodayEmptyReason, { title: string; body: string; action: { label: string; href: string } }> = {
  no_evidence_yet: {
    title: "Nothing on record yet",
    body: "Today opens once there is something to read from — a declared topic, a session, an assessment.",
    action: { label: "Start a session", href: "/capture" },
  },
  all_current: {
    title: "Nothing open, nothing due",
    body: "There is no outstanding item on your record right now.",
    action: { label: "Study something new", href: "/capture" },
  },
  awaiting_verification: {
    title: "One session is unverified",
    body: "Verifying it is your choice — nothing is blocked while it waits.",
    action: { label: "Verify now", href: "/record" },
  },
  insufficient_data: {
    title: "Your record is still updating",
    body: "The last read from your data hit a problem — this is a system state, not a report on your studying.",
    action: { label: "Try again", href: "/today" },
  },
};

interface TodayResponse {
  ok: boolean;
  items: TodayItem[];
  emptyReason: TodayEmptyReason | null;
  generatedAtMs: number;
}

export default function TodayPage() {
  const { user, session, loading } = useAuth();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user || !session) return;
    fetch("/api/today", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async r => {
        if (!r.ok) throw new Error("Could not read today's state.");
        return r.json();
      })
      .then((d: TodayResponse) => setData(d))
      .catch(e => setError(e.message));
  }, [loading, user, session]);

  return (
    <main id="main-content">
      <Stack>
        <Measure wide>
          <Row gap={3}>
            <Text step="label" tone="ink" weight={600}>
              StudyLedger
            </Text>
            <Spacer />
            <Control tier="tertiary" href="/capture">
              Capture
            </Control>
            <Control tier="tertiary" href="/settings">
              Settings
            </Control>
          </Row>
        </Measure>
        <Rule />
      </Stack>

      <Measure>
        <Stack gap={6}>
          <Text step="title" as="h1" weight={500}>
            Today
          </Text>

          {!user && !loading && (
            <Text as="p" tone="secondary">
              Sign in to see today.
            </Text>
          )}

          {error && (
            <Text as="p" tone="error">
              {error}
            </Text>
          )}

          {user && !data && !error && (
            <Text step="label" tone="secondary">
              Reading your record…
            </Text>
          )}

          {data && data.items.length > 0 && (
            <Stack gap={5}>
              {data.items.map(item => (
                <TodayItemRow key={item.itemId} item={item} />
              ))}
            </Stack>
          )}

          {data && data.items.length === 0 && data.emptyReason && (
            <Empty {...EMPTY_COPY[data.emptyReason]} />
          )}
        </Stack>
      </Measure>
    </main>
  );
}

function TodayItemRow({ item }: { item: TodayItem }) {
  const label = REASON_REF_LABEL[item.reasonRef] ?? item.reasonRef;
  return (
    <Stack gap={2}>
      <Row gap={3}>
        <Text step="label" tone="secondary">
          {kindLabel(item.kind)}
        </Text>
        {item.subject && <Text step="label">{item.subject}</Text>}
      </Row>
      <Text step="body">{label}</Text>
      {item.figures && (
        <Row gap={3}>
          {Object.entries(item.figures)
            .filter(([, v]) => v !== null)
            .map(([k, v]) => (
              <Readout key={k} value={typeof v === "number" ? v : 0} step="figure" label={k} />
            ))}
        </Row>
      )}
    </Stack>
  );
}

function kindLabel(kind: TodayItem["kind"]): string {
  switch (kind) {
    case "resume_session":
      return "Open session";
    case "next_best_action":
      return "Next";
    case "accomplishment":
      return "Since you were last here";
    case "orientation":
      return "Your score";
    default:
      return kind;
  }
}
