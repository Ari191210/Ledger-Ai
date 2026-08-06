"use client";

import { useEffect, useRef, useState } from "react";
import Readout from "@/components/console/readout";

/**
 * THE MOMENT.
 *
 * Everything above this earns it, and nothing below it matters more.
 *
 * The figure is the hero, not the sentence — law 5, numbers are the heroes.
 * The four dates beneath are set in the instrument face at micro size:
 * evidence, quietly. That is the difference between a claim and a record.
 *
 * HONESTY UNDER FAILURE. `Readout` renders its `from` value on the server, so
 * mounting it directly would ship HTML reading "0 times you've made this same
 * sign error" — false, and law 7 forbids it. Instead the server renders the
 * true figure, and the rolling readout replaces it only once the browser has
 * proven it can run. A visitor whose JavaScript never arrives reads the
 * correct sentence; they simply do not watch it count.
 *
 * The observer fires slightly BELOW the fold so the swap to the rolling
 * readout happens just off-screen. By the time the section is visible the roll
 * is already under way, and the reader never sees the exchange.
 *
 * `Readout` is the component the app ships, not a copy of it. The roll a
 * visitor sees here is the roll a student sees on their own score.
 */

const OCCURRENCES = 4;

export function Moment() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // A reader who has asked for less motion gets the figure, not the count.
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setRolling(true);
          io.disconnect();
          return;
        }
      },
      // Fire before the section is on screen, so the exchange is never seen.
      { rootMargin: "0px 0px 18% 0px", threshold: 0.01 },
    );

    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div className="moment" ref={ref}>
      {/* The four marks. Three have been on the spine since the top of the
          page; this is where the page spends them. Scroll-driven CSS — no
          JavaScript, and they rest aligned if the animation never runs. */}
      <div className="moment__recall" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>

      <p className="moment__figure">
        {rolling ? (
          <Readout
            value={OCCURRENCES}
            step="display"
            from={0}
            label={`${OCCURRENCES} times`}
          />
        ) : (
          // The server's answer, and the one a reader keeps if the bundle
          // never arrives. Always the true figure — never a placeholder zero.
          OCCURRENCES
        )}
      </p>

      <p className="moment__sentence">
        times you&apos;ve made this same sign error.
      </p>

      <p className="moment__evidence">2 OCT · 14 NOV · 3 DEC · TODAY</p>

      <p className="specimen specimen--spaced">
        Specimen paper. Not a real student&apos;s record.
      </p>
    </div>
  );
}
