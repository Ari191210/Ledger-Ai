"use client";

// ═══════════════════════════════════════════════════════════════════════════
// REVEAL — the landing page's scroll-in text animation.
//
// Replaces the CSS-only `animation-timeline: view()` version. That version
// was correct in principle (progressive enhancement, no blank page on an
// unsupporting browser) but its fallback WAS "no animation at all" — and
// `animation-timeline` is Chromium-only (not in Firefox or Safari as of this
// writing), so a real share of visitors saw a fully static page and nothing
// else.
//
// PLAIN `IntersectionObserver`, NOT Framer Motion's `whileInView`/`useInView`.
// Both were tried first — `whileInView` is the documented API for exactly
// this case, `useInView` is its documented escape hatch — and on this page
// (a dozen-plus reveals, several already intersecting on first paint) BOTH
// silently failed to fire for elements confirmed to be inside the viewport:
// instrumented every instance, only 3 of ~10 already-visible elements ever
// reported entering. A hand-rolled observer with no batching layer between
// it and the DOM has none of that ambiguity — it is directly inspectable,
// and was verified against the exact elements that failed before.
//
// Still slide-only, never a fade — `PRODUCT_PRINCIPLES` §6.5 (press · slide ·
// roll · fill) governs this page, and a fade is none of those. The parent
// element keeps the `.reveal` class from `landing.css` for its overflow-hidden
// mask; this component is only ever the element that actually slides inside
// it, exactly as the old `.reveal > *` CSS selector targeted.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, createElement, type ReactNode } from "react";

export function Reveal({
  as = "div",
  index = 0,
  className,
  children,
}: {
  as?: "div" | "span" | "p";
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true); // no observer, or the reader asked for no motion — show it, never hide forever
      return;
    }

    // Observe the `.reveal` MASK (the parent), not this element. This child
    // sits at `translateY(110%)` — i.e. below the mask by its own height —
    // until visible. For a short line that's a few px and harmless to
    // measure directly, but for a tall block (the instrument panel, ~274px)
    // the child's own rect is ~300px below the fold even once the mask
    // itself is fully on screen, so both the synchronous mount check AND the
    // observer's target need to be the mask, whose position never moves.
    // Confirmed live: without this, the instrument panel and any 4th+
    // staggered list row never fired — verified via a real, waited scroll
    // pass (not just a full-page screenshot), so this was never a headless
    // capture artifact.
    const target = el.parentElement ?? el;

    const rect = target.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // once, like the CSS version's `entry` range never repeating
        }
      },
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className,
      style: {
        transform: visible ? "translateY(0)" : "translateY(110%)",
        transition: `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08}s`,
      },
    },
    children,
  );
}
