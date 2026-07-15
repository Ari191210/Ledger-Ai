"use client";

// ═══════════════════════════════════════════════════════════════════════════
// THE PERSONAL EDITION
//
// The logged-in dashboard's lead: the student's OWN Academic Performance Index,
// presented as a market instrument rather than a static gauge. Powered entirely
// by infrastructure that already exists — score_history (written nightly by the
// GitHub Actions close), fetchMarketReport() → buildMarketReport(), and the
// editorial component set. No new table, no new API route.
//
// It is scoped: the whole block renders inside <div data-ui="editorial">, so it
// picks up app/editorial.css (loaded globally but inert everywhere the marker is
// absent) WITHOUT restyling the rest of the dashboard. The dashboard is not
// migrated, navigation is untouched, no other route changes.
//
// Three states, all honest:
//   A) Listed       — 2+ closes → the full market report.
//   B) Newly listed — <2 closes → "Building your track record". Never a
//                      fabricated series; shows the live score + day count +
//                      when the first close posts.
//   C) Error/offline — falls back to the existing point-in-time widget, passed
//                      in as `fallback` so this file need not import it.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchMarketReport } from "@/lib/score-history";
import type { MarketReport } from "@/lib/score-market";
import { editionNumber, dateline } from "@/lib/score-market";
import { IndexReport, SectorTable } from "@/components/editorial/index-report";
import { computeLedgerScore, scoreTier } from "@/lib/ledger-score";
import { track } from "@/lib/posthog";

const HISTORY_WINDOW_DAYS = 90;

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; report: MarketReport };

export default function PersonalEdition({
  userId,
  createdAt,
  fallback,
}: {
  userId: string;
  createdAt?: string;
  fallback: ReactNode;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [now, setNow] = useState<Date | null>(null);
  const [liveScore, setLiveScore] = useState<number | null>(null);

  useEffect(() => {
    // Client-only: date is derived after mount so a cached/SSR'd shell can't
    // print a stale edition number and cause a hydration mismatch.
    setNow(new Date());

    // The live, current-state score off this device. Used as the newly-listed
    // opening figure, and emitted so the existing ledger_score_computed metric
    // (investor score-distribution) keeps firing now that this replaces the old
    // widget on the dashboard.
    let live: number | null = null;
    try {
      const s = computeLedgerScore();
      live = s.total;
      setLiveScore(s.total);
      track.featureUsed("ledger_score_computed", {
        score: s.total,
        tier: scoreTier(s.total).label,
        pqa_score: s.pqaScore,
        syllabus_score: s.syllabusScore,
        mistake_score: s.mistakeScore,
        consistency_score: s.consistencyScore,
      });
    } catch {
      /* localStorage unavailable — the live figure simply stays null */
    }

    let cancelled = false;
    fetchMarketReport(userId, HISTORY_WINDOW_DAYS)
      .then((report) => {
        if (cancelled) return;
        setState({ status: "ok", report });
        track.featureUsed("personal_edition_viewed", {
          state: report.sessions >= 2 ? "listed" : "newly_listed",
          sessions: report.sessions,
          score: report.current?.total ?? live ?? 0,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── State C: error / offline → the existing point-in-time widget ───────────
  if (state.status === "error") return <>{fallback}</>;

  // "Day N" of the track record, from account age. Null until `now` is set.
  const accountDay =
    createdAt && now
      ? Math.max(
          1,
          Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000) + 1,
        )
      : null;

  return (
    // `score-widget` so the dashboard's existing GSAP scroll-reveal picks this
    // up exactly as it did the old widget (and leaves no dangling selector).
    // `data-ui="editorial"` is the scope marker — editorial.css applies here and
    // nowhere else on the page.
    <div
      className="score-widget"
      data-ui="editorial"
      style={{
        marginBottom: 40,
        border: "1px solid var(--rule)",
        borderRadius: 14,
        background: "var(--paper)",
        padding: "clamp(20px, 4vw, 34px)",
        overflow: "hidden",
      }}
    >
      {/* Dateline / masthead line — client-rendered (see `now` above). */}
      <div
        className="ed-dateline"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
          borderBottom: "1px solid var(--ink)",
          paddingBottom: 10,
          marginBottom: 22,
        }}
      >
        <span style={{ fontWeight: 600, letterSpacing: "0.14em" }}>Your Edition</span>
        <span style={{ textAlign: "center", flex: "1 1 auto" }}>
          {now ? dateline(now) : " "}
        </span>
        <span>{now ? `No. ${editionNumber(now).toLocaleString()}` : " "}</span>
      </div>

      {state.status === "loading" && (
        <div className="ed-kicker" aria-live="polite">
          Compiling today&apos;s edition…
        </div>
      )}

      {/* ── State A: Listed — the full market report ───────────────────────── */}
      {state.status === "ok" && state.report.sessions >= 2 && (
        <>
          <IndexReport report={state.report} />
          <div style={{ marginTop: 28, borderTop: "1px solid var(--rule-2)", paddingTop: 18 }}>
            <div className="ed-kicker" style={{ marginBottom: 12 }}>
              Sector Performance
            </div>
            {/* Safety net: at ≥360px the table fits with no scroll; on ultra-
                narrow screens it scrolls WITHIN this box so the page never
                scrolls horizontally. */}
            <div style={{ overflowX: "auto" }}>
              <SectorTable report={state.report} />
            </div>
          </div>
        </>
      )}

      {/* ── State B: Newly listed — honest, no fabricated history ──────────── */}
      {state.status === "ok" && state.report.sessions < 2 && (
        <NewlyListed report={state.report} liveScore={liveScore} accountDay={accountDay} />
      )}
    </div>
  );
}

// ── State B ──────────────────────────────────────────────────────────────────

function NewlyListed({
  report,
  liveScore,
  accountDay,
}: {
  report: MarketReport;
  liveScore: number | null;
  accountDay: number | null;
}) {
  // The opening figure is the recorded first close if one exists, otherwise the
  // live current-state score. There is no series, so nothing is charted.
  const hasFirstClose = report.current !== null;
  const opening = hasFirstClose ? report.current!.total : liveScore ?? 0;
  const firstCloseDate = hasFirstClose ? report.current!.captured_on : null;

  const facts: Array<{ label: string; value: string; flat?: boolean }> = [];
  if (accountDay !== null) facts.push({ label: "Day", value: String(accountDay) });
  facts.push({ label: "Closes on record", value: String(report.sessions) });
  facts.push({
    label: "First close",
    value: firstCloseDate ?? "Posts at next daily close",
    flat: true,
  });

  return (
    <section aria-labelledby="pe-newly-headline">
      <div className="ed-kicker" style={{ marginBottom: 10 }}>
        Academic Performance Index · Newly Listed
      </div>

      <h2
        id="pe-newly-headline"
        className="ed-headline ed-headline--lead"
        style={{ margin: "0 0 18px" }}
      >
        Building Your Track Record
      </h2>

      {/* Onboarding copy. The lead sentence is the ONLY claim of fact here and
          it is gated on hasFirstClose — a user with no close yet is never told
          one was recorded. Nothing below is a data point; it is a description of
          what future real closes will unlock. No chart, no movement, no series. */}
      <p className="ed-standfirst" style={{ margin: "0 0 18px" }}>
        {hasFirstClose
          ? "Your first market close has been recorded."
          : "Your Academic Performance Index opens today — your first market close posts at the next daily close."}
      </p>

      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: 15,
          lineHeight: 1.5,
          color: "var(--ink-2)",
          margin: "0 0 12px",
        }}
      >
        After tomorrow&apos;s close you&apos;ll unlock:
      </p>

      <ul style={{ listStyle: "none", margin: "0 0 18px", padding: 0, display: "grid", gap: 9 }}>
        {[
          "Performance trend line",
          "Daily movement",
          "Weekly movement",
          "Personal market report",
        ].map((item) => (
          <li
            key={item}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "baseline",
              fontFamily: "var(--body)",
              fontSize: 15.5,
              color: "var(--ink)",
            }}
          >
            <span aria-hidden="true" style={{ color: "var(--salmon-ink)", lineHeight: 1 }}>
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="ed-byline" style={{ margin: "0 0 26px", fontStyle: "normal" }}>
        Every daily close makes your Academic Performance Index more accurate.
      </p>

      <div
        style={{
          borderTop: "2px solid var(--ink)",
          paddingTop: 18,
          display: "flex",
          alignItems: "flex-end",
          gap: "clamp(20px, 4vw, 48px)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="ed-index">{Math.round(opening).toLocaleString()}</div>
          <div className="ed-kicker" style={{ marginTop: 4 }}>
            of 1,000 · {hasFirstClose ? "first close" : "live"}
          </div>
        </div>

        <dl
          style={{
            margin: 0,
            flex: "1 1 200px",
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "10px 18px",
            alignItems: "baseline",
          }}
        >
          {facts.map((f) => (
            <div key={f.label} style={{ display: "contents" }}>
              <dt className="ed-kicker" style={{ whiteSpace: "nowrap" }}>
                {f.label}
              </dt>
              <dd
                className={`ed-figure ${f.flat ? "ed-flat" : ""}`}
                style={{ margin: 0, fontSize: 15, fontWeight: 600 }}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
