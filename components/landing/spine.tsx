"use client";

import { useEffect } from "react";

/**
 * THE LEDGER SPINE — state only.
 *
 * The hairline is drawn by CSS (`.landing::before`) and each mark is rendered
 * inside the section it belongs to, so a mark can never drift away from its
 * own section however the content reflows. This component does one thing:
 * strike a mark, permanently, when its section is reached.
 *
 * It exists because the accumulation is MONOTONIC. Scrolling back up never
 * un-strikes a ledger entry — the record only ever grows, which is the
 * product's whole premise and the reason a scroll-driven CSS animation (which
 * scrubs in both directions) cannot express it.
 *
 * One observer for the whole page. Marks rest visible-but-unstruck, so a
 * failure here costs the accumulation, never the content.
 */
export function SpineTracker() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-spine-index]"),
    );
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const section = entry.target as HTMLElement;
          section.dataset.reached = "true";
          // Struck once. Nothing re-observes it, and nothing un-strikes it.
          io.unobserve(section);
        }
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0.01 },
    );

    for (const section of sections) io.observe(section);
    return () => io.disconnect();
  }, []);

  return null;
}
