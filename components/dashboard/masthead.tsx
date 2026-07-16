"use client";

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD MASTHEAD  (Phase 3B)
//
// The nameplate the dashboard opens with — the paper's cover, not an app header.
// Nameplate + edition line (No. N · dateline), then the greeting as the editor's
// line, and the streak as a metadata item. Pure editorial: it renders inside the
// dashboard's data-ui="editorial" scope, so it reads dark-ink-on-cream.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { dateline, editionNumber } from "@/lib/score-market";

export default function DashboardMasthead({
  greeting,
  name,
  streak,
  bestStreak,
}: {
  greeting: string;
  name: string;
  streak: number;
  bestStreak: number;
}) {
  // Client-only date so a cached shell can't print a stale edition / mismatch.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  return (
    <div>
      {/* Nameplate + edition metadata */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: "1px solid var(--ink)",
          paddingBottom: 10,
          marginBottom: 18,
        }}
      >
        <span className="ed-kicker" style={{ fontSize: 11, letterSpacing: "0.3em" }}>
          StudyLedger
        </span>
        <span className="ed-dateline">
          {now ? `No. ${editionNumber(now).toLocaleString()} · ${dateline(now)}` : " "}
        </span>
      </div>

      {/* The greeting — the editor's line */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1
          className="ed-headline ed-headline--lead"
          style={{ margin: 0, fontSize: "clamp(32px, 6vw, 58px)" }}
        >
          {greeting}, {name}.
        </h1>

        {streak > 0 && (
          <div className="ed-dateline" style={{ textAlign: "right", lineHeight: 1.7 }}>
            <div>
              <span
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 800,
                  fontSize: 24,
                  color: "var(--salmon-ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                {streak}
              </span>{" "}
              day streak
            </div>
            {bestStreak > streak && <div style={{ color: "var(--ink-3)" }}>best {bestStreak}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
