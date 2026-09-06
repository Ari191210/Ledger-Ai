"use client";

/**
 * Section entrance. Pure CSS: the animation plays into the element's resting
 * state, so the content is present and readable even if the animation never
 * runs (a hidden tab, a headless render, an old browser). It used to be a
 * framer-motion element, which is a large runtime for one fade and a 10px rise.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={className} style={{ animationDelay: `${delay}s` }} data-reveal>
      {children}
    </div>
  );
}
