"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import DashboardSkeleton from "@/components/dashboard-skeleton";
import EmptyChair from "@/components/empty-chair";
import DashboardShell from "./dashboard-shell";
import { DashboardDataProvider } from "./dashboard-data";
import StandingContainer from "./standing-container";
import NextMoveContainer from "./next-move-container";
import SectorsContainer from "./sectors-container";
import HistoryContainer from "./history-container";
import ToolsView from "./tools-view";

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD V2 (Wiring Step 3) — the constitutional one-question dashboard.
//
// Composes the four regions into DashboardShell, wrapped in the single
// MarketReport provider so Standing / Why / History read one shared close.
// The shell owns the #main-content landmark and the single column; navigation
// (AppNav) is provided by app/dashboard/layout.tsx above this component.
//
// Preserves the two whole-dashboard states from the old page:
//   • DashboardSkeleton — while auth is resolving.
//   • EmptyChair — the re-engagement takeover after a long absence (>= 9 days),
//     gated on ledger:lastVisit, which is refreshed on every visit.
//
// Mounted behind an off-by-default flag in Step 4; the old dashboard stays live
// until W3 cutover.
// ═══════════════════════════════════════════════════════════════════════════

const RE_ENGAGE_DAYS = 9;

export default function DashboardV2() {
  const { user, loading: authLoading } = useAuth();
  const [chair, setChair] = useState<{ show: boolean; days: number }>({ show: false, days: 0 });

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem("ledger:lastVisit");
      const now = Date.now();
      if (raw) {
        const days = (now - parseInt(raw, 10)) / 86_400_000;
        if (days >= RE_ENGAGE_DAYS) setChair({ show: true, days });
      }
      localStorage.setItem("ledger:lastVisit", String(now));
    } catch {
      /* storage unavailable — no re-engagement takeover, no harm */
    }
  }, [user]);

  if (authLoading) return <DashboardSkeleton />;
  if (chair.show) {
    return <EmptyChair daysSince={chair.days} onDismiss={() => setChair((c) => ({ ...c, show: false }))} />;
  }
  if (!user) return null; // AuthGuard (layout) already gates auth; belt-and-braces

  return (
    <DashboardDataProvider userId={user.id}>
      <DashboardShell
        standing={<StandingContainer />}
        nextMove={<NextMoveContainer />}
        why={<SectorsContainer />}
        history={<HistoryContainer />}
        tools={<ToolsView />}
      />
    </DashboardDataProvider>
  );
}
