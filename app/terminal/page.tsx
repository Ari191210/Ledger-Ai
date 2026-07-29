// ═══════════════════════════════════════════════════════════════════════════
// THE DESK  ·  /terminal
//
// The trading agent's faceplate: its mandate, what that mandate costs, and
// what the engine does when held to it.
//
// Server component with no dynamic input, so the whole page — including the
// backtest behind the simulation — is computed once at build and served as
// static HTML. The tape is seeded, so figures are stable across builds and a
// reader can check them.
//
// VISUAL LANGUAGE. This surface deliberately does not use the editorial
// system. It is scoped to [data-ui="te"] (app/terminal/terminal.css) and
// shares no tokens with editorial.css, so the two cannot bleed into each
// other. StudyLedger's own surfaces — dashboard, homepage, editorial system —
// are untouched and still governed by PRODUCT_CONSTITUTION.md.
//
// The Constitution's substantive rules are kept regardless of the skin,
// because they are honesty rules rather than taste ones:
//   · no fabricated data — the track-record module is an honest empty state
//   · simulation output renders dashed and labelled inside every unit
//   · no decorative motion, no glow, no fake depth
//   · colour is functional here: it encodes signal, not mood
// ═══════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import "./terminal.css";
import Faceplate from "@/components/terminal/faceplate";
import Mandate from "@/components/terminal/mandate";
import NoRecord from "@/components/terminal/no-record";
import Simulation from "@/components/terminal/simulation";
import CostTable from "@/components/terminal/cost-table";
import { buildTerminalReport } from "@/lib/trading/terminal-data";

export const metadata: Metadata = {
  title: "The Desk — Ruflo",
  description:
    "An NSE intraday equity agent, the rule it trades under, and what that rule costs.",
};

// Nothing on this page varies by request.
export const dynamic = "force-static";

export default function TerminalPage() {
  const report = buildTerminalReport();

  return (
    <div data-ui="te" className="te-root">
      <div className="te-page">
        <Faceplate
          state={report.underMandate.report.killSwitch.state}
          sessions={report.unconstrained.tape.sessions}
        />

        <div className="te-stack">
          <Mandate config={report.killSwitch} arithmetic={report.mandate} />
          <NoRecord />
          <Simulation
            underMandate={report.underMandate}
            unconstrained={report.unconstrained}
            target={report.killSwitch.dailyReturnTarget}
          />
          <CostTable
            costs={report.costs}
            target={report.killSwitch.dailyReturnTarget}
          />
        </div>

        <footer
          className="te-label"
          style={{
            marginTop: "clamp(14px, 2.4vw, 22px)",
            lineHeight: 1.7,
            maxWidth: "76ch",
            letterSpacing: "0.07em",
          }}
        >
          Simulated figures are engine output against a generated tape and do
          not describe performance on any exchange. Nothing here is investment
          advice. Charge rates change by circular and budget.
        </footer>
      </div>
    </div>
  );
}
