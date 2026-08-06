"use client";

import { useEffect, useRef, useState } from "react";
import Readout from "@/components/console/readout";

/**
 * THE MOMENT.
 *
 * Everything above this earns it, and nothing below it is more important.
 *
 * Sequence, all of it legal motion under §6.5:
 *   1. three marks SLIDE down the spine into alignment with a fourth
 *   2. the figure ROLLS 0 → 4, using the product's own Readout primitive
 *   3. the sentence and its evidence SLIDE up behind a mask
 *
 * The figure is the hero, not the sentence — law 5, numbers are the heroes.
 * The four dates beneath it are set in the instrument face at micro size:
 * evidence, quietly. That is the difference between a claim and a record.
 *
 * `Readout` is the real component the app ships, not a copy of it. The roll a
 * visitor sees here is literally the roll a student sees on their score.
 */
export function Moment() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [aligned, setAligned] = useState(false);
  const [rolled, setRolled] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setAligned(true);
      setRolled(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          setAligned(true);
          // The figure rolls only after the marks have landed. The order is
          // the argument: the recurrence is what produces the number, not the
          // other way round.
          const t = window.setTimeout(() => setRolled(true), 420);
          io.disconnect();
          return () => window.clearTimeout(t);
        }
      },
      { threshold: 0.45 },
    );

    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div className="moment" ref={ref} data-aligned={aligned ? "true" : "false"}>
      {/* The four marks. Three have been on the spine since the top of the
          page; this is where the page spends them. */}
      <div className="moment__recall" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ transitionDelay: `${i * 120}ms` }} />
        ))}
      </div>

      <div className="moment__figure">
        {rolled ? (
          <Readout value={4} step="display" from={0} label="four times" />
        ) : (
          // Hold the layout at the right height before the roll arms, so
          // nothing below it shifts. Layout shift is a design defect (law 9).
          <span aria-hidden="true">0</span>
        )}
      </div>

      <p className="moment__sentence">
        times you&apos;ve made this same sign error.
      </p>

      <p className="moment__evidence">
        2 OCT · 14 NOV · 3 DEC · TODAY
      </p>

      <p className="specimen" style={{ marginTop: "var(--s-4)" }}>
        Specimen paper. Not a real student&apos;s record.
      </p>
    </div>
  );
}
