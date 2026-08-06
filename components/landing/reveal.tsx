"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Slide-on-scroll.
 *
 * Content travels up from behind a mask when it enters the viewport. There is
 * deliberately no opacity anywhere in this component: PRODUCT_PRINCIPLES §6.5
 * permits press, slide, roll and fill, and a fade is none of them. The mask is
 * what makes a pure translate read as an arrival rather than a drift.
 *
 * Fires once. A section that re-animates every time it scrolls past is
 * decoration, and decoration is deleted (law 1).
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Milliseconds. Used to stagger siblings, never to choreograph a show. */
  delay?: number;
  as?: "div" | "span" | "li" | "h1" | "h2" | "p";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver (old browser, or a test environment): show the
    // content rather than hiding it forever. A progressive enhancement that
    // can hide content is not an enhancement.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error — one ref across a small union of intrinsic tags.
      ref={ref}
      className="reveal"
      data-shown={shown ? "true" : "false"}
    >
      <span className="reveal__inner" style={{ transitionDelay: `${delay}ms` }}>
        {children}
      </span>
    </Tag>
  );
}
