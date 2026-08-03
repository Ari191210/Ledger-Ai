import type { CSSProperties } from "react";
import { Sparkline } from "@/components/editorial/index-report";

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY — VIEW (Component 5A, pure presentational)
//
// Region 4 of the dashboard: the context. The student's record of closes since
// listing, read from the SAME MarketReport as Standing and Why (single source),
// so the record and the index always agree.
//
// PURE VIEW. No data, no logic, no motion. Reuses the editorial Sparkline (the
// existing hairline chart) and derives its own display facts from the series.
//
// Constitutional basis:
//   • Visual v1 §8.1 — the chart REVEALS (a hairline + baseline, the existing
//     Sparkline), it does not decorate. No gridlines, fills or furniture.
//   • Visual v1 §8.2 — the record is accumulated and permanent; a weak close
//     stays a shallow point beside the closes that followed it.
//   • Emotional v1 §10.7 / Motion v5 §9.10 — an empty record is an invitation,
//     never a void, and NEVER a fabricated flat baseline at zero.
//   • Accessibility — the record is legible without any scrub interaction: the
//     Sparkline carries an aria-label stating the range, and the summary facts
//     are text.
//
// Deferred, flagged (not silently dropped):
//   • Passive/active close marking — the `active` flag is not in the fetch path.
//   • Hover-scrub / keyboard cursor — a secondary affordance the text facts and
//     the chart aria-label already cover for every user.
//
// Renders inside data-ui="editorial".
// ═══════════════════════════════════════════════════════════════════════════

export type HistoryPoint = { date: string; value: number };

export type HistoryViewProps =
  | { state: "loading" }
  | { state: "empty"; closes: number }
  | { state: "unavailable" }
  | { state: "ready"; series: HistoryPoint[] };

const fmt = (n: number) => n.toLocaleString("en-US");

function fmtDate(d: string): string {
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Body — DESIGN.md §3 (Inter 15 / lh 1.65).
const messageStyle: CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: 15,
  lineHeight: 1.65,
  color: "var(--ink-2)",
  margin: 0,
};

const summaryRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 10,
};

const loadingFrameStyle: CSSProperties = {
  display: "block",
  height: 120,
  borderTop: "1px solid var(--rule-2)",
  borderBottom: "1px solid var(--rule-2)",
};

export default function HistoryView(props: HistoryViewProps) {
  if (props.state === "loading") {
    return <span aria-hidden="true" style={loadingFrameStyle} />;
  }

  if (props.state === "empty") {
    return (
      <p style={messageStyle}>
        {props.closes >= 1
          ? "One close on record. Your trend line begins at the second."
          : "Your record begins at your first close."}
      </p>
    );
  }

  if (props.state === "unavailable") {
    return (
      <p style={{ ...messageStyle, fontFamily: "var(--data)", fontSize: 13, color: "var(--ink-3)" }}>
        Your record is momentarily unavailable.
      </p>
    );
  }

  const { series } = props;
  const first = series[0];
  const last = series[series.length - 1];
  const high = series.reduce((m, p) => (p.value > m ? p.value : m), series[0].value);

  return (
    <div>
      <Sparkline series={series} height={120} />
      <div className="ed-dateline" style={summaryRowStyle}>
        <span>{fmtDate(first.date)}</span>
        <span>
          {series.length} closes · high {fmt(high)}
        </span>
        <span>{fmtDate(last.date)}</span>
      </div>
    </div>
  );
}
