"use client";

import { useCallback, useState } from "react";
import { SECTORS, type MarketReport, type ScoreSnapshot, type SectorKey } from "@/lib/score-market";
import SectorsView, { type SectorRow, type SectorsViewProps } from "./sectors-view";
import { useDashboardReport } from "./dashboard-data";

// ═══════════════════════════════════════════════════════════════════════════
// WHY — THE FOUR SECTORS, CONTAINER (Component 4B; Wiring Step 2)
//
// Reads the shared official record (useDashboardReport). The sectors are the
// breakdown of the same close Standing shows (Option A): they sum to Standing
// and the dashboard reconciles end to end.
//
// Labels come from SECTORS — the single source. The mistakes sector reads
// "Risk" because the live record is v1 (decay-based); the v2 "Recovery" engine
// is shadow-only until Phase B cutover, when SECTORS + the engine rename
// together. We never show the Recovery name over a Risk value.
//
// The open row (openKey) is interaction state, owned here; Escape collapses it.
// ═══════════════════════════════════════════════════════════════════════════

function evidenceFor(key: SectorKey, s: ScoreSnapshot): string {
  switch (key) {
    case "pqa":
      return `Accuracy under exam conditions. ${s.papers_count} past-paper session${s.papers_count === 1 ? "" : "s"} on record.`;
    case "syllabus":
      return "How much of your syllabus you have proven.";
    case "mistakes":
      return s.recent_mistakes === 0
        ? "How quickly you clear mistakes. None logged in the last 7 days."
        : `How quickly you clear mistakes. ${s.recent_mistakes} logged in the last 7 days.`;
    case "consistency":
      return s.streak === 0
        ? "Consistency. No active streak yet."
        : `Consistency. ${s.streak}-day streak.`;
  }
}

function buildRows(report: MarketReport): SectorRow[] {
  const current = report.current;
  if (!current) return [];
  const hasPrior = report.daily != null; // no prior close → no honest per-sector delta
  const moveByKey = new Map(report.sectorMoves.map((m) => [m.key, m.move]));

  return SECTORS.map((sector) => ({
    key: sector.key,
    label: sector.label,
    value: current[sector.key],
    max: sector.max,
    delta: hasPrior ? { delta: moveByKey.get(sector.key)?.delta ?? 0 } : null,
    evidence: evidenceFor(sector.key, current),
  }));
}

export default function SectorsContainer() {
  const state = useDashboardReport();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const onToggle = useCallback((key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  }, []);

  let viewProps: SectorsViewProps;
  if (state.status === "loading") {
    viewProps = { state: "loading" };
  } else if (state.status === "error") {
    viewProps = { state: "unavailable" };
  } else if (!state.report.current) {
    viewProps = { state: "empty" };
  } else {
    viewProps = { state: "ready", rows: buildRows(state.report), openKey, onToggle };
  }

  return (
    <div
      onKeyDown={(e) => {
        // Esc collapses the open row (Interaction spec §6). Bubbles from the
        // focused row; scoped to this region, no global listener to clean up.
        if (e.key === "Escape" && openKey) setOpenKey(null);
      }}
    >
      <SectorsView {...viewProps} />
    </div>
  );
}
