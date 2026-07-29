// ═══════════════════════════════════════════════════════════════════════════
// THE TERMINAL  ·  /terminal
//
// The trading desk's front page: the agent's mandate, what that mandate costs,
// and what the engine actually does when it is held to it.
//
// Server component with no dynamic input, so the whole page — including the
// backtest behind the simulation — is computed once at build and served as
// static HTML. The tape is seeded, so the figures are stable across builds
// and a reader can check them.
//
// Constitution notes, since this is a new surface:
//   §3  the track-record section is an honest empty state; no broker is
//       connected, and the simulation is never promoted into its place.
//   §8  every simulation-derived figure carries its label inside the same
//       visual unit, and the equity curve renders dashed.
//   §4  no cards, no shadows. Hairline rules and ruled bands only.
//   §7  the page is about the mandate and the figures, not about the model.
// ═══════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import EditorialShell from "@/components/editorial/shell";
import TerminalMasthead from "@/components/terminal/masthead";
import Mandate from "@/components/terminal/mandate";
import NoRecord from "@/components/terminal/no-record";
import Simulation from "@/components/terminal/simulation";
import CostTable from "@/components/terminal/cost-table";
import { buildTerminalReport } from "@/lib/trading/terminal-data";

export const metadata: Metadata = {
  title: "The Terminal — Ruflo",
  description:
    "An NSE intraday equity agent, its mandate, and what that mandate costs.",
};

// Nothing on this page varies by request.
export const dynamic = "force-static";

export default function TerminalPage() {
  const report = buildTerminalReport();

  return (
    <EditorialShell>
      <div className="ed-page" style={{ paddingTop: 28, paddingBottom: 64 }}>
        <TerminalMasthead
          state={report.underMandate.report.killSwitch.state}
          edition={`Edition · ${report.unconstrained.tape.sessions} sessions simulated`}
        />

        <Mandate config={report.killSwitch} arithmetic={report.mandate} />

        <NoRecord />

        <Simulation
          underMandate={report.underMandate}
          unconstrained={report.unconstrained}
          target={report.killSwitch.dailyReturnTarget}
        />

        <CostTable costs={report.costs} target={report.killSwitch.dailyReturnTarget} />

        <footer
          className="ed-dateline"
          style={{
            borderTop: "1px solid var(--ink)",
            paddingTop: 14,
            textTransform: "none",
            maxWidth: "68ch",
          }}
        >
          Simulated figures are engine output against a generated tape and do not
          describe performance on any exchange. Nothing here is investment advice.
          Charge rates change by circular and budget.
        </footer>
      </div>
    </EditorialShell>
  );
}
