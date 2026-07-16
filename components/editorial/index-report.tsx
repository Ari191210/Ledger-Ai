"use client";
import type { MarketReport, Movement } from "@/lib/score-market";
import { writeCommentary } from "@/lib/score-market";

// ═══════════════════════════════════════════════════════════════════════════
// The Academic Performance Index, presented as an instrument.
//
// This is the product's identity. Every rule here exists to keep it HONEST:
// a newly-listed account gets a "no track record yet" state, never a fabricated
// chart; movement is only rendered when there is a prior close to move from.
// The commentary is generated from the numbers in lib/score-market.ts, never
// from an AI call, so it cannot invent a trend that did not happen.
// ═══════════════════════════════════════════════════════════════════════════

const fmt = (n: number) => Math.round(n).toLocaleString();
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;
const cls = (d: Movement["direction"]) => (d === "up" ? "ed-up" : d === "down" ? "ed-down" : "ed-flat");

/** A delta, e.g. "▲ 42 (+5.3%)". Points lead; percent is parenthetical. */
export function Delta({ move, label }: { move: Movement | null; label: string }) {
  if (!move) {
    return (
      <div>
        <div className="ed-kicker">{label}</div>
        <div className="ed-figure ed-flat" style={{ fontSize: 15, marginTop: 3 }}>
          No prior close
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="ed-kicker">{label}</div>
      <div className={`ed-figure ${cls(move.direction)}`} style={{ fontSize: 15, marginTop: 3, fontWeight: 600 }}>
        {signed(move.delta)}
        {move.from !== 0 && move.direction !== "flat" && (
          <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
            {" "}({move.pct > 0 ? "+" : "−"}{Math.abs(move.pct).toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A hairline chart. No axes furniture, no gridlines, no fill gradient, no dots.
 * One 1.25px stroke and a baseline — the Financial Times draws a series in
 * exactly this much ink and no more.
 */
export function Sparkline({
  series,
  height = 96,
  specimen = false,
}: {
  series: Array<{ date: string; value: number }>;
  height?: number;
  /** Constitution §8: specimen series render dashed and carry a marker inside
      the chart frame, so the label travels with any screenshot. */
  specimen?: boolean;
}) {
  if (series.length < 2) return null;

  const W = 1000;
  const H = height;
  const PAD = 6;

  const values = series.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2);

  const path = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const first = series[0].value;
  const last = series[series.length - 1].value;
  const stroke = last > first ? "var(--advancing)" : last < first ? "var(--retreating)" : "var(--ink-2)";

  const svg = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={H}
      role="img"
      aria-label={`${specimen ? "Specimen illustration: index" : "Index"} from ${fmt(first)} to ${fmt(last)} over ${series.length} sessions`}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Baseline at the opening value — so the reader sees gain vs loss, not
          just a wiggle. This is the line the series is judged against. */}
      <line
        x1={0} x2={W} y1={y(first)} y2={y(first)}
        stroke="var(--rule-2)" strokeWidth={1} strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        /* §8: dashed stroke = specimen; a real record always draws solid. */
        strokeDasharray={specimen ? "7 4" : undefined}
      />
      {/* The close. A single tick, not a dot. */}
      <line
        x1={W} x2={W} y1={y(last) - 4} y2={y(last) + 4}
        stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke"
      />
    </svg>
  );

  if (!specimen) return svg;

  // §8: the marker sits INSIDE the chart frame so a cropped screenshot still
  // carries it. Rendered as an overlay pinned within the frame rather than an
  // SVG <text> node because preserveAspectRatio="none" would distort glyphs.
  return (
    <div style={{ position: "relative" }}>
      {svg}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 2,
          left: 0,
          fontFamily: "var(--data)",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--salmon-ink)",
          pointerEvents: "none",
        }}
      >
        Specimen
      </span>
    </div>
  );
}

/** The four sectors, ruled like a market table. */
export function SectorTable({ report }: { report: MarketReport }) {
  const { current, sectorMoves, isNewlyListed } = report;
  if (!current) return null;

  return (
    <table className="ed-table">
      <thead>
        <tr>
          <th>Sector</th>
          <th className="num">Value</th>
          <th className="num">Weight</th>
          <th style={{ width: "26%" }}>Contribution</th>
          <th className="num">Week</th>
        </tr>
      </thead>
      <tbody>
        {sectorMoves.map(s => {
          const value = current[s.key];
          const pct = (value / s.max) * 100;
          return (
            <tr key={s.key}>
              <td style={{ fontWeight: 600 }}>{s.label}</td>
              <td className="num">{fmt(value)}</td>
              <td className="num" style={{ color: "var(--ink-3)" }}>/{s.max}</td>
              <td>
                <div className="ed-bar" aria-hidden="true">
                  <span style={{ transform: `scaleX(${(pct / 100).toFixed(4)})`, width: "100%" }} />
                </div>
              </td>
              <td className={`num ${isNewlyListed ? "ed-flat" : cls(s.move.direction)}`}>
                {isNewlyListed ? "—" : signed(s.move.delta)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * The full front-page index report: headline, standfirst, the figure, the
 * movement row, the chart.
 *
 * When `isNewlyListed` is true it says so plainly. A ticker with one data point
 * is worse than no ticker — it implies a track record the student has not
 * earned yet, and the first time they notice, they stop trusting every other
 * number in the product.
 */
export function IndexReport({
  report,
  specimen = false,
}: {
  report: MarketReport;
  /** Constitution §8: a specimen report labels itself in the kicker, beside
      the index figure, and inside the chart — never at a distance. */
  specimen?: boolean;
}) {
  const c = writeCommentary(report);
  const { current, daily, weekly, monthly, allTimeHigh, streakSessions, sessions } = report;

  return (
    <section aria-labelledby="index-headline">
      <div className="ed-kicker" style={{ marginBottom: 10 }}>
        Academic Performance Index ·{" "}
        {specimen && <span style={{ color: "var(--salmon-ink)" }}>Specimen · </span>}
        {c.verdict}
      </div>

      <h2 id="index-headline" className="ed-headline ed-headline--lead" style={{ margin: "0 0 14px" }}>
        {c.headline}
      </h2>

      <p className="ed-standfirst" style={{ margin: "0 0 26px" }}>
        {c.standfirst}
      </p>

      {current && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "clamp(20px, 4vw, 48px)",
              flexWrap: "wrap",
              borderTop: "2px solid var(--ink)",
              paddingTop: 18,
            }}
          >
            <div>
              <div className="ed-index">{fmt(current.total)}</div>
              <div className="ed-kicker" style={{ marginTop: 4 }}>of 1,000</div>
              {specimen && (
                <div
                  className="ed-kicker"
                  style={{ marginTop: 6, color: "var(--salmon-ink)" }}
                >
                  Specimen — no such student exists
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
                gap: "18px 22px",
                flex: "1 1 240px",
                // Without this a flex item refuses to shrink below its content
                // width, and the "+171 (+25.5%)" delta runs off a 390px screen.
                minWidth: 0,
                paddingBottom: 6,
              }}
            >
              <Delta move={daily}   label="Session" />
              <Delta move={weekly}  label="Week" />
              <Delta move={monthly} label="Month" />
            </div>
          </div>

          {report.series.length >= 2 ? (
            <div style={{ marginTop: 22, borderTop: "1px solid var(--rule-2)", paddingTop: 14 }}>
              <Sparkline series={report.series} specimen={specimen} />
              <div
                className="ed-dateline"
                style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}
              >
                {/* §8: specimen time is measured in sessions, not calendar
                    dates — rolling real dates would dress the illustration
                    as a live record. */}
                <span>{specimen ? "Session 1" : report.series[0].date}</span>
                <span>
                  {sessions} session{sessions === 1 ? "" : "s"} on record
                  {streakSessions.count >= 3 &&
                    ` · ${streakSessions.count} consecutive ${streakSessions.direction === "up" ? "gains" : "falls"}`}
                  {allTimeHigh && report.atAllTimeHigh && " · at all-time high"}
                </span>
                <span>{specimen ? `Session ${report.series.length}` : report.series[report.series.length - 1].date}</span>
              </div>
            </div>
          ) : (
            // The honest empty state. No chart, no fake baseline, no zero.
            <div
              className="ed-rule-top"
              style={{ marginTop: 22, paddingTop: 14 }}
            >
              <p className="ed-byline" style={{ margin: 0 }}>
                Movement, momentum and sector analysis are published once a second
                close is on record. The ledger builds its track record from here —
                nothing is charted until there is something true to chart.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
