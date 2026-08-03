"use client";

import HistoryView, { type HistoryViewProps } from "./history-view";
import { useDashboardReport } from "./dashboard-data";

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY — CONTAINER (Component 5B; Wiring Step 2)
//
// Reads the shared official record (useDashboardReport): the record of closes.
// sessions >= 2 → the trend line; sessions < 2 → an honest empty state (never a
// fabricated baseline); fetch failure with no cache → an honest unavailable
// state. Same MarketReport as Standing and Why, so the record and the index
// always agree.
// ═══════════════════════════════════════════════════════════════════════════

export default function HistoryContainer() {
  const state = useDashboardReport();

  let viewProps: HistoryViewProps;
  if (state.status === "loading") {
    viewProps = { state: "loading" };
  } else if (state.status === "error") {
    viewProps = { state: "unavailable" };
  } else if (state.report.sessions >= 2) {
    viewProps = { state: "ready", series: state.report.series };
  } else {
    viewProps = { state: "empty", closes: state.report.sessions };
  }

  return <HistoryView {...viewProps} />;
}
