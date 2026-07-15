"use client";

// ═══════════════════════════════════════════════════════════════════════════
// ACADEMIC MARKETS + THE ARCHIVE  (Phase 3A)
//
// One component, one fetch. Reads the user's market report (score_history, RLS-
// scoped) and the current Ledger Score breakdown once, then renders two desks:
//
//   ACADEMIC MARKETS — strongest & weakest subject (current standing), sector
//   movers (real week-on-week from score_history), and a subject table.
//   The subject "Week" column is deliberately "—": there is no per-subject time
//   series in score_history (only total + 4 sectors), so a weekly subject
//   movement would be fabricated. It is not shown. A footnote says so.
//
//   THE ARCHIVE — closes on record, first close date, current streak, track-
//   record length. All real.
//
// Every data-dependent block has an honest empty state. Nothing is invented.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { fetchMarketReport } from "@/lib/score-history";
import type { MarketReport } from "@/lib/score-market";
import { computeLedgerScore, type ScoreBreakdown } from "@/lib/ledger-score";

const fmt = (n: number) => Math.round(n).toLocaleString();
const signed = (n: number) => `${n > 0 ? "▲ " : n < 0 ? "▼ " : ""}${fmt(Math.abs(n))}`;
const pct = (a: number) => `${Math.round(a * 100)}%`;

const panel = {
  background: "var(--paper)",
  border: "1px solid var(--rule)",
  borderRadius: 14,
  padding: "clamp(20px, 4vw, 32px)",
  marginBottom: 32,
  overflow: "hidden",
} as const;

export default function AcademicMarkets({
  userId,
}: {
  userId: string;
  createdAt?: string;
}) {
  const [report, setReport] = useState<MarketReport | null>(null);
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    try {
      setScore(computeLedgerScore());
    } catch {
      /* localStorage unavailable — score stays null, blocks show empty states */
    }
    let cancelled = false;
    fetchMarketReport(userId)
      .then((r) => !cancelled && setReport(r))
      .catch(() => !cancelled && setErrored(true));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const subjects = score?.subjectAccuracy ?? []; // sorted ascending by accuracy
  const weakest = subjects[0] ?? null;
  const strongest = subjects.length > 0 ? subjects[subjects.length - 1] : null;
  const hasTwoCloses = !!report && report.sessions >= 2;

  return (
    <div data-ui="editorial">
      {/* ── ACADEMIC MARKETS ─────────────────────────────────────────────── */}
      <section style={panel} aria-labelledby="am-head">
        <div id="am-head" className="ed-kicker" style={{ marginBottom: 18 }}>
          Academic Markets
        </div>

        {/* Strongest / weakest subject — current standing */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "18px 28px",
            borderTop: "2px solid var(--ink)",
            paddingTop: 16,
          }}
        >
          <StatBlock
            label="Strongest Subject"
            name={strongest?.subject}
            detail={strongest ? `${pct(strongest.accuracy)} · ${strongest.sessions} session${strongest.sessions === 1 ? "" : "s"}` : null}
            dir="up"
          />
          <StatBlock
            label="Weakest Subject"
            name={subjects.length >= 2 ? weakest?.subject : undefined}
            detail={subjects.length >= 2 && weakest ? `${pct(weakest.accuracy)} · ${weakest.sessions} session${weakest.sessions === 1 ? "" : "s"}` : null}
            dir="down"
            emptyHint={subjects.length === 1 ? "Log another subject to compare" : undefined}
          />
        </div>

        {subjects.length === 0 && (
          <p className="ed-byline" style={{ margin: "16px 0 0" }}>
            No subject data yet — log a past paper in Exam Practice to open the markets.
          </p>
        )}

        {/* Sector movers — real week-on-week from score_history */}
        <div style={{ marginTop: 28, borderTop: "1px solid var(--rule-2)", paddingTop: 16 }}>
          <div className="ed-kicker" style={{ marginBottom: 12 }}>Sector Movers · Week</div>
          {!report && !errored && <div className="ed-byline" style={{ margin: 0 }}>Loading…</div>}
          {errored && <div className="ed-byline" style={{ margin: 0 }}>Markets unavailable right now.</div>}
          {report && !hasTwoCloses && (
            <p className="ed-byline" style={{ margin: 0 }}>
              Sector movement opens after your second daily close — there is no prior week to
              compare against yet.
            </p>
          )}
          {report && hasTwoCloses && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px 22px" }}>
              {report.sectorMoves.map((s) => (
                <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, borderBottom: "1px solid var(--rule-2)", paddingBottom: 8 }}>
                  <span style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink)" }}>{s.label}</span>
                  <span
                    className={`ed-figure ${s.move.direction === "up" ? "ed-up" : s.move.direction === "down" ? "ed-down" : "ed-flat"}`}
                    style={{ fontSize: 14, fontWeight: 600 }}
                  >
                    {s.move.direction === "flat" ? "—" : signed(s.move.delta)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject table — current standing; Week column is honestly "—" */}
        {subjects.length > 0 && (
          <div style={{ marginTop: 28, borderTop: "1px solid var(--rule-2)", paddingTop: 16 }}>
            <div className="ed-kicker" style={{ marginBottom: 12 }}>Subject Table</div>
            <div style={{ overflowX: "auto" }}>
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th className="num">Accuracy</th>
                    <th className="num">Sessions</th>
                    <th className="num">Week</th>
                  </tr>
                </thead>
                <tbody>
                  {[...subjects].reverse().map((s) => (
                    <tr key={s.subject}>
                      <td style={{ fontWeight: 600 }}>{s.subject}</td>
                      <td className="num">{pct(s.accuracy)}</td>
                      <td className="num">{s.sessions}</td>
                      <td className="num ed-flat">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ed-byline" style={{ margin: "12px 0 0", fontSize: 12.5 }}>
              Per-subject weekly movement begins once daily subject snapshots are recorded. Until
              then it is shown as “—” rather than invented.
            </p>
          </div>
        )}
      </section>

      {/* ── THE ARCHIVE ──────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--paper)",
          borderTop: "2px solid var(--ink)",
          borderBottom: "2px solid var(--ink)",
          marginBottom: 32,
          padding: "16px clamp(14px, 3vw, 26px)",
        }}
        aria-labelledby="ar-head"
      >
        <div id="ar-head" className="ed-kicker" style={{ marginBottom: 14 }}>The Archive</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: "20px clamp(14px, 3vw, 32px)", alignItems: "end" }}>
          <ArchiveFigure label="Closes Recorded" value={report ? String(report.sessions) : "—"} sub="daily closes" />
          <ArchiveFigure
            label="First Close"
            value={firstCloseLabel(report)}
            sub={report && report.sessions > 0 ? "opening entry" : "none yet"}
          />
          <ArchiveFigure label="Current Streak" value={score ? String(score.streak) : "—"} sub={score && score.streak === 1 ? "day" : "days"} />
          <ArchiveFigure label="Track Record" value={trackRecordLabel(report)} sub="since first close" />
        </div>
      </section>
    </div>
  );
}

function StatBlock({
  label,
  name,
  detail,
  dir,
  emptyHint,
}: {
  label: string;
  name?: string;
  detail: string | null;
  dir: "up" | "down";
  emptyHint?: string;
}) {
  return (
    <div>
      <div className="ed-kicker" style={{ marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(22px, 3vw, 30px)",
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "-0.015em",
          color: name ? "var(--ink)" : "var(--ink-3)",
        }}
      >
        {name ?? "—"}
      </div>
      <div
        className={`ed-figure ${detail ? (dir === "up" ? "ed-up" : "ed-down") : "ed-flat"}`}
        style={{ fontSize: 13, marginTop: 5, fontWeight: 600 }}
      >
        {detail ?? emptyHint ?? "awaiting data"}
      </div>
    </div>
  );
}

function ArchiveFigure({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="ed-kicker" style={{ marginBottom: 8 }}>{label}</div>
      <div
        style={{
          fontFamily: "var(--display)",
          fontVariantNumeric: "tabular-nums lining-nums",
          fontWeight: 800,
          fontSize: "clamp(26px, 4vw, 40px)",
          lineHeight: 0.9,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
        }}
      >
        {value}
      </div>
      <div className="ed-dateline" style={{ marginTop: 6, letterSpacing: "0.06em", textTransform: "none" }}>{sub}</div>
    </div>
  );
}

// First close = the oldest snapshot on record. series is oldest → newest.
function firstCloseLabel(report: MarketReport | null): string {
  if (!report || report.sessions === 0) return "—";
  const first = report.series[0]?.date ?? report.current?.captured_on;
  return first ?? "—";
}

// Track record = whole days from the first close to today, inclusive.
function trackRecordLabel(report: MarketReport | null): string {
  if (!report || report.sessions === 0) return "—";
  const firstStr = report.series[0]?.date ?? report.current?.captured_on;
  if (!firstStr) return "—";
  const first = new Date(firstStr).getTime();
  const days = Math.max(1, Math.floor((Date.now() - first) / 86_400_000) + 1);
  return `${days}d`;
}
