/**
 * Accuracy by hour of day, drawn as a 24-hour dial.
 *
 * This was a one-line card reading "night · 8pm-12am · 92% accuracy". True, and
 * it threw away the shape: which hours are strong, which are untested, and how
 * lopsided the day actually is. A cricket wagon wheel answers the same kind of
 * question by drawing one spoke per scoring shot from a single centre, and the
 * lopsidedness is the finding.
 *
 * Midnight sits at the top and the day runs clockwise, so the dial reads like
 * a clock rather than like a chart that happens to be round.
 *
 * Hours with nothing logged draw a stub at the baseline, not a zero-length
 * spoke. Absent is not the same as bad, and an instrument that renders "no
 * evidence" identically to "poor" is lying.
 */

const SIZE = 150;
const CENTRE = SIZE / 2;
const BASE = 18;
const REACH = 38;
/** Below this many tested hours, "your sharpest hour" is one lucky paper
 *  wearing a crown. The signals library makes the same call everywhere: say
 *  nothing rather than something weak. */
const MIN_TESTED_HOURS = 3;

const hour12 = (h: number) => {
  const suffix = h < 12 ? "am" : "pm";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
};

export function HourDial({ hours }: { hours: (number | null)[] }) {
  const tested = hours.filter((h): h is number => h !== null);
  const enough = tested.length >= MIN_TESTED_HOURS;
  const best = enough ? Math.max(...tested) : null;
  const bestHour = best === null ? null : hours.indexOf(best);

  return (
    <div className="mt-3 flex items-center gap-4">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0"
        role="img"
        aria-label={
          bestHour === null
            ? "Not enough logged papers to show accuracy by hour yet."
            : `Accuracy by hour of day. Highest at ${hour12(bestHour)}, ${best} percent.`
        }
      >
        {hours.map((accuracy, h) => {
          // -90 puts midnight at 12 o'clock; the day then runs clockwise.
          const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
          const length = accuracy === null ? 3 : (accuracy / 100) * REACH;
          const isBest = h === bestHour && accuracy !== null;
          return (
            <line
              key={h}
              x1={CENTRE + BASE * Math.cos(angle)}
              y1={CENTRE + BASE * Math.sin(angle)}
              x2={CENTRE + (BASE + length) * Math.cos(angle)}
              y2={CENTRE + (BASE + length) * Math.sin(angle)}
              stroke={
                accuracy === null
                  ? "var(--surface-3)"
                  : isBest
                    ? "var(--accent-strong)"
                    : "var(--text-3)"
              }
              strokeWidth={isBest ? 3 : 2}
              strokeLinecap="round"
            />
          );
        })}

        {/* The quarter marks are the only labels. Twenty-four would be a
            timetable; four is enough to orient a clock face. */}
        {[0, 6, 12, 18].map((h) => {
          const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
          return (
            <text
              key={h}
              x={CENTRE + (BASE + REACH + 9) * Math.cos(angle)}
              y={CENTRE + (BASE + REACH + 9) * Math.sin(angle)}
              textAnchor="middle"
              dominantBaseline="central"
              className="u-mono"
              fontSize="7"
              fill="var(--text-3)"
            >
              {hour12(h)}
            </text>
          );
        })}
      </svg>

      <div className="min-w-0">
        {bestHour === null ? (
          <>
            <p className="text-sm font-bold text-text">
              {tested.length === 0 ? "no papers logged yet" : "not enough yet"}
            </p>
            <p className="u-mono mt-0.5 text-2xs text-text-3">
              {tested.length === 0
                ? "log a paper to start the dial"
                : `tested at ${tested.length} of 24 hours, ${MIN_TESTED_HOURS} needed before this can name one`}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-text">{hour12(bestHour)}</p>
            <p className="u-mono mt-0.5 text-2xs text-text-3">
              {best}% accuracy · your sharpest hour
            </p>
            <p className="u-mono mt-2 text-2xs text-text-3">
              {24 - tested.length} hours never tested
            </p>
          </>
        )}
      </div>
    </div>
  );
}
