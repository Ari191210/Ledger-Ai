/**
 * THE PROTAGONIST.
 *
 * One marked Physics paper — the only subject on this page. It enters at the
 * thesis and is marked as the reader arrives at it.
 *
 * A SERVER COMPONENT. The annotations press in via a scroll-driven CSS
 * animation, so this ships no JavaScript, mounts no observer, and renders its
 * finished state even if the client bundle never arrives.
 *
 * A machined plate, not a skeuomorphic sheet: depth is tone and a hairline,
 * never a shadow (§6.1). No rotation, no float, no paper texture.
 */

type Row = { ref: string; verdict: string; wrong: boolean; widths: number[] };

/** A specimen paper. Labelled as such wherever a figure from it is shown. */
const ROWS: Row[] = [
  { ref: "Q5", verdict: "3/3", wrong: false, widths: [92, 64] },
  { ref: "Q6(a)", verdict: "2/2", wrong: false, widths: [78] },
  { ref: "Q7(b)", verdict: "−3", wrong: true, widths: [88, 71, 46] },
  { ref: "Q8", verdict: "4/4", wrong: false, widths: [83, 58] },
];

export function Paper() {
  return (
    <figure
      className="paper"
      aria-label="A specimen marked Physics paper: four questions, with three marks lost on question 7b."
    >
      <div className="paper__head">
        <span className="c-label landing__quiet">PHYSICS · UNIT TEST</span>
        <span className="c-micro landing__quiet">14 NOV</span>
      </div>

      {ROWS.map((row, i) => (
        <div className="paper__row" key={row.ref}>
          <span className="c-label landing__quiet">{row.ref}</span>

          {/* The written answer as ruled ink. A paper is handwriting, not
              prose — lorem text would be a lie about what a paper is. */}
          <span className="paper__answer" aria-hidden="true">
            {row.widths.map((w, j) => (
              <span key={j} className="paper__ink" style={{ width: `${w}%` }} />
            ))}
          </span>

          {/* Teacher's red. PRESS, staggered in reading order — the order a
              teacher marks in. `--i` drives the stagger by scroll position. */}
          <span
            className="paper__verdict"
            data-wrong={row.wrong ? "true" : "false"}
            style={{ "--i": i } as React.CSSProperties}
          >
            {row.verdict}
          </span>
        </div>
      ))}
    </figure>
  );
}
