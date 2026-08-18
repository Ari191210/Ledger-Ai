"use client";

// ═══════════════════════════════════════════════════════════════════════════
// BY THE NUMBERS  (Phase 3A)
//
// The reframed stats strip: the same four real metrics the old glass bento
// carried, set as a ruled newspaper data band instead of cards. No card chrome,
// no glass — hairline rules top and bottom, tabular figures, vertical column
// dividers. Presentational only: every value is passed in from the dashboard's
// existing computed state (no new fetch, no new data).
//
// Renders on a cream stock inside data-ui="editorial" so the editorial tokens
// (dark ink on cream) resolve — the same "clipping on the desk" surface as the
// Personal Edition.
// ═══════════════════════════════════════════════════════════════════════════

// M0-6: the "Study Streak" column is deleted. Three real figures are better
// than four when the fourth is a chain (`PRODUCT_PRINCIPLES` §4.2).
export default function ByTheNumbers({
  papers,
  sessionsToday,
  nextExam,
}: {
  papers: number;
  sessionsToday: number;
  nextExam: { name: string; days: number } | null;
}) {
  const cols: Array<{ label: string; figure: string; sub: string }> = [
    {
      label: "Papers Done",
      figure: String(papers),
      sub: papers === 0 ? "none logged" : "sessions logged",
    },
    {
      label: "Sessions Today",
      figure: String(sessionsToday),
      sub: sessionsToday === 0 ? "none yet" : `${sessionsToday * 25} min focused`,
    },
    {
      label: "Next Exam",
      figure: nextExam ? String(nextExam.days) : "—",
      sub: nextExam ? `days · ${nextExam.name}` : "none scheduled",
    },
  ];

  return (
    <div
      data-ui="editorial"
      style={{
        background: "var(--paper)",
        borderTop: "2px solid var(--ink)",
        borderBottom: "2px solid var(--ink)",
        marginBottom: 32,
        padding: "16px clamp(14px, 3vw, 26px)",
      }}
    >
      <div className="ed-kicker" style={{ marginBottom: 14 }}>By the Numbers</div>
      {/* auto-fit so it is 3-across on the dashboard column and reflows
          on a phone with no media query and no stranded dividers. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
          gap: "20px clamp(14px, 3vw, 32px)",
          alignItems: "end",
        }}
      >
        {cols.map((c) => (
          <div key={c.label}>
            <div className="ed-kicker" style={{ marginBottom: 8 }}>{c.label}</div>
            <div
              style={{
                fontFamily: "var(--display)",
                fontVariantNumeric: "tabular-nums lining-nums",
                fontWeight: 800,
                fontSize: "clamp(30px, 4.6vw, 46px)",
                lineHeight: 0.9,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              {c.figure}
            </div>
            <div
              className="ed-dateline"
              style={{ marginTop: 6, letterSpacing: "0.06em", textTransform: "none" }}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
