"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchMarketReport } from "@/lib/score-history";
import type { MarketReport } from "@/lib/score-market";

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD DATA PROVIDER (Wiring Step 1)
//
// The single source of the official record. Fetches the MarketReport ONCE and
// shares it with every record region (Standing, Why, History), so they read the
// same close and cannot disagree — the single-source rule enforced in code, and
// one query instead of three.
//
// Owns the shared concerns that were duplicated across the three containers:
// one quiet retry, cancellation, and a last-report cache for offline/stale.
//
// Fresh and stale are unified into `ready`: containers render from `report`
// regardless; `asOf` is null when fresh and the last close's date when the
// report was served from cache after a failure. Only Standing surfaces the
// "as of" marker. `error` is returned only when a fetch fails AND there is no
// cache to fall back to — never a fabricated number.
// ═══════════════════════════════════════════════════════════════════════════

const WINDOW_DAYS = 90;
const RETRY_MS = 2500;
const CACHE_KEY = "ledger-dashboard-report";

export type DashboardReportState =
  | { status: "loading" }
  | { status: "ready"; report: MarketReport; asOf: string | null }
  | { status: "error" };

const DashboardReportContext = createContext<DashboardReportState>({ status: "loading" });

/** Read the shared official record. Loading until the single fetch resolves. */
export function useDashboardReport(): DashboardReportState {
  return useContext(DashboardReportContext);
}

function readCache(): MarketReport | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MarketReport) : null;
  } catch {
    return null;
  }
}

function writeCache(report: MarketReport): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(report));
  } catch {
    /* storage unavailable — the stale fallback simply won't be available */
  }
}

/** The date the cached report represents: its latest close (YYYY-MM-DD). */
function asOfOf(report: MarketReport): string {
  return report.current?.captured_on ?? new Date().toISOString().slice(0, 10);
}

export function DashboardDataProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<DashboardReportState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const load = () => {
      fetchMarketReport(userId, WINDOW_DAYS)
        .then((report) => {
          if (cancelled) return;
          writeCache(report);
          setState({ status: "ready", report, asOf: null });
        })
        .catch(() => {
          if (cancelled) return;
          attempts += 1;
          if (attempts < 2) {
            window.setTimeout(load, RETRY_MS); // one quiet retry (Interaction spec §11)
            return;
          }
          const cached = readCache();
          setState(
            cached ? { status: "ready", report: cached, asOf: asOfOf(cached) } : { status: "error" },
          );
        });
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <DashboardReportContext.Provider value={state}>{children}</DashboardReportContext.Provider>;
}
