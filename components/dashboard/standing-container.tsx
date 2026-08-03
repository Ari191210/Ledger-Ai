"use client";

import { useEffect, useRef } from "react";
import { computeLedgerScore, scoreTier } from "@/lib/ledger-score";
import { track } from "@/lib/posthog";
import StandingView, { type StandingViewProps } from "./standing-view";
import StandingOpen from "./standing-open";
import { useDashboardReport } from "./dashboard-data";

// ═══════════════════════════════════════════════════════════════════════════
// STANDING — CONTAINER (Component 2B; Wiring Step 2)
//
// Reads the shared official record (useDashboardReport) rather than fetching.
// Standing + Why + History all read the same MarketReport, so the hero figure
// and the record can never disagree. The printed index is the latest close of
// record — it does not tick during the day.
//
// Analytics carry-forward (no telemetry lost):
//   • ledger_score_computed  — once on mount, from the v1 live score
//     (TELEMETRY ONLY; never rendered — the figure is the close of record).
//   • personal_edition_viewed — once when the report resolves; event name
//     retained for continuity despite the component rename.
//
// Offline/stale is owned by the provider: a cached report arrives as status
// "ready" with a non-null asOf (the last close's date), which we surface as an
// "as of" marker. Fetch failure with no cache arrives as "error".
// ═══════════════════════════════════════════════════════════════════════════

function fmtAsOf(capturedOn: string): string {
  const d = new Date(`${capturedOn}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? capturedOn
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function StandingContainer() {
  const state = useDashboardReport();
  const liveRef = useRef<number | null>(null);
  const scoreFired = useRef(false);
  const viewedFired = useRef(false);

  // Analytics #1 — investor score-distribution metric. Once, live score.
  useEffect(() => {
    if (scoreFired.current) return;
    scoreFired.current = true;
    try {
      const s = computeLedgerScore();
      liveRef.current = s.total;
      track.featureUsed("ledger_score_computed", {
        score: s.total,
        tier: scoreTier(s.total).label,
        pqa_score: s.pqaScore,
        syllabus_score: s.syllabusScore,
        mistake_score: s.mistakeScore,
        consistency_score: s.consistencyScore,
      });
    } catch {
      /* localStorage unavailable — nothing renders the live figure anyway */
    }
  }, []);

  // Analytics #2 — fired once when the report resolves (fresh or from cache).
  useEffect(() => {
    if (viewedFired.current || state.status !== "ready") return;
    viewedFired.current = true;
    const { report } = state;
    track.featureUsed("personal_edition_viewed", {
      state: report.sessions >= 2 ? "listed" : "newly_listed",
      sessions: report.sessions,
      score: report.current?.total ?? liveRef.current ?? 0,
    });
  }, [state]);

  let viewProps: StandingViewProps | null;
  if (state.status === "loading") {
    viewProps = { state: "loading" };
  } else if (state.status === "error") {
    viewProps = null; // honest unavailable fallback below
  } else {
    const { report, asOf } = state;
    if (!report.current) {
      viewProps = { state: "empty" };
    } else {
      viewProps = {
        state: "ok",
        total: report.current.total,
        tier: scoreTier(report.current.total).label,
        movement: report.daily ? { delta: report.daily.delta } : null,
        asOf: asOf ? fmtAsOf(asOf) : null,
      };
    }
  }

  if (viewProps) {
    // The loading outline arrives at rest; every resolved state is wrapped in
    // The Open, which reveals it once per day and is otherwise inert.
    if (viewProps.state === "loading") return <StandingView {...viewProps} />;
    return (
      <StandingOpen>
        <StandingView {...viewProps} />
      </StandingOpen>
    );
  }

  return (
    <h1 aria-label="Your standing is momentarily unavailable." style={{ margin: 0 }}>
      <span
        aria-hidden="true"
        style={{ fontFamily: "var(--data)", fontSize: 13, letterSpacing: "0.04em", color: "var(--ink-3)" }}
      >
        Your standing is momentarily unavailable.
      </span>
    </h1>
  );
}
