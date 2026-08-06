"use client";

import { useEffect, useRef, useState } from "react";

/**
 * THE LEDGER SPINE.
 *
 * A hairline running the full page with one mark per section. A mark fills as
 * its section is reached, and by the midpoint four have accumulated without
 * the reader consciously noticing.
 *
 * The Moment then spends them: three marks slide into alignment with a fourth
 * and the page reveals it has been remembering since the top. That is why this
 * exists — it is not a scroll indicator. Its function is one sentence, so it
 * survives law 1: *it accumulates the marks The Moment recalls.*
 *
 * Remove it and The Moment has nothing to recall.
 */
export function Spine({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setLit(count);
      return;
    }

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-spine-index]"),
    );
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number(
            (entry.target as HTMLElement).dataset.spineIndex ?? "0",
          );
          // Monotonic. Scrolling back up never un-strikes a ledger entry —
          // the record only ever grows, which is the product's whole premise.
          setLit((current) => (index + 1 > current ? index + 1 : current));
        }
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0.01 },
    );

    for (const s of sections) io.observe(s);
    return () => io.disconnect();
  }, [count]);

  return (
    <div className="spine" ref={ref} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="spine__mark"
          data-lit={i < lit ? "true" : "false"}
          style={{ top: `${((i + 0.5) / count) * 100}%` }}
        />
      ))}
    </div>
  );
}
