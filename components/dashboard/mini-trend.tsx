/**
 * The 7-day sparkline above each study activity figure.
 *
 * Null means no evidence that day: it is skipped, not drawn as zero, and the
 * line joins only real points. With no points at all nothing is drawn, because
 * a line beside "none yet" would be a line about data that does not exist.
 *
 * It lives here rather than inside either page because the same three tiles are
 * read on the dashboard and could be read anywhere else the activity figures
 * go; two copies would drift.
 */
export function MiniTrend({ data }: { data: (number | null)[] }) {
  const w = 120;
  const h = 34;
  const points = data.flatMap((v, i) => (v === null ? [] : [{ i, v }]));
  if (points.length === 0) return <div className="h-8 w-full" aria-hidden />;
  const lo = Math.min(...points.map((p) => p.v));
  const hi = Math.max(...points.map((p) => p.v));
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => 3 + (1 - (v - lo) / (hi - lo || 1)) * (h - 6);
  const line = points.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const end = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      {points.length > 1 && (
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-2"
        />
      )}
      <circle cx={x(end.i)} cy={y(end.v)} r={2.2} className="fill-accent-strong" />
    </svg>
  );
}
