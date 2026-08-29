"use client";

// Appears once the reader has scrolled roughly one viewport past the hero —
// before that, "back to top" has nothing to undo. Threshold is a plain
// scrollY check on the passive scroll listener; no IntersectionObserver
// needed since there's nothing to observe, just a number.

import { useEffect, useState } from "react";

export function ScrollTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className="scroll-top"
      data-shown={shown ? "true" : "false"}
      aria-label="Back to top"
      tabIndex={shown ? 0 : -1}
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
