"use client";

import { useEffect, useRef, useState } from "react";

/**
 * THE PROTAGONIST.
 *
 * One marked Physics paper. It is the only subject on this page: it enters at
 * the thesis, is marked at the lifecycle, and comes permanently to rest at The
 * Moment. Its stillness afterwards is the point — it has stopped being a sheet
 * and become a record.
 *
 * A machined plate, not a skeuomorphic sheet: depth is tone and a hairline,
 * never a shadow (§6.1). No rotation, no float, no paper texture. It moves only
 * when the narrative moves it.
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
  const ref = useRef<HTMLDivElement | null>(null);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setMarked(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setMarked(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className="paper"
      ref={ref}
      data-marked={marked ? "true" : "false"}
      role="img"
      aria-label="A specimen marked Physics paper. Question 7b has lost three marks to a sign error."
    >
      <div className="paper__head">
        <span className="c-label" style={{ color: "var(--g-6)" }}>
          PHYSICS · UNIT TEST
        </span>
        <span className="c-micro" style={{ color: "var(--g-5)" }}>
          14 NOV
        </span>
      </div>

      {ROWS.map((row, rowIndex) => (
        <div className="paper__row" key={row.ref}>
          <span className="c-label" style={{ color: "var(--g-6)" }}>
            {row.ref}
          </span>

          {/* The written answer as ruled ink. A paper is handwriting, not
              prose — lorem text here would be a lie about what a paper is. */}
          <span style={{ display: "grid", gap: 4 }}>
            {row.widths.map((w, i) => (
              <span key={i} className="paper__ink" style={{ width: `${w}%` }} />
            ))}
          </span>

          {/* Teacher's red. PRESS — the mark lands, staggered in reading
              order, because that is the order a teacher marks in.          */}
          <span
            className="paper__verdict"
            data-wrong={row.wrong ? "true" : "false"}
            style={{ transitionDelay: `${rowIndex * 90}ms` }}
          >
            {row.verdict}
          </span>
        </div>
      ))}
    </div>
  );
}
