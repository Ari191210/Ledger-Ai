"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

const TICKS = 40;
const SCORE = 742;
const MAX = 1000;

// `dim` is the meter's lime opacity, and it tracks the pillar's weight in the
// score rather than being decorative: the pyq bar is the most solid because it
// is 40% of the number. Descending opacities of one hue is the resolution
// DESIGN.md already reached for the segmented ring, and it keeps the panel
// inside the one-lime rule while the instrument still reads as lit.
const PILLARS = [
  { label: "pyq accuracy", weight: "40", pct: 78, dim: 1 },
  { label: "syllabus coverage", weight: "25", pct: 75, dim: 0.72 },
  { label: "mistake velocity", weight: "20", pct: 76, dim: 0.5 },
  { label: "consistency", weight: "15", pct: 66, dim: 0.34 },
];

const CAPTIONS = [
  { at: 0.0, text: "Start with what you already do." },
  { at: 0.22, text: "Every past paper, every mistake, every hour, logged." },
  { at: 0.46, text: "Four weighted pillars, measured from real data." },
  { at: 0.7, text: "One honest number, and a tier you can trust." },
  { at: 0.88, text: "Then a shortlist of exactly what to fix next." },
];

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** maps p through [a,b] onto 0..1 */
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/**
 * Scroll progress (0..1) across a tall element, read with a passive listener
 * on a rAF tick. Deliberately not an animation library: this page is the
 * first thing a student loads on a slow phone, so it ships no runtime for it.
 */
function useScrollProgress(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let queued = false;

    const measure = () => {
      queued = false;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      setP(travel <= 0 ? 0 : clamp01(-rect.top / travel));
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, enabled]);

  return p;
}

export function HeroScroll() {
  const ref = useRef<HTMLDivElement>(null);
  // start assuming motion is fine; correct after mount so SSR stays stable
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const p = useScrollProgress(ref, animate);

  // The instrument is lit, always. It used to be scrubbed from zero by scroll,
  // which meant the hero's resting state, and the server-rendered first paint,
  // was a dead device reading 0 with every meter empty: the product at its most
  // worthless, on the one screen meant to sell it. Scroll now moves the story
  // (the captions) and nothing else that matters, so the page can be judged
  // before a single scroll event fires.
  const dialRotate = animate ? -6 + seg(p, 0.1, 0.7) * 10 : 0;
  const stageScale = animate ? 1 - seg(p, 0.86, 1) * 0.03 : 1;
  const hintOpacity = animate ? 1 - seg(p, 0, 0.05) : 0;

  let capIndex = 0;
  for (let i = 0; i < CAPTIONS.length; i++) if (p >= CAPTIONS[i].at) capIndex = i;
  const caption = animate ? CAPTIONS[capIndex].text : CAPTIONS[CAPTIONS.length - 1].text;

  const stage = (
    <div className="flex flex-col items-center text-center">
      <span className="u-label">academic instrument · built for India</span>
      <h1 className="mt-3 max-w-[16ch] text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-text sm:text-4xl">
        Know where you stand.
      </h1>

      <div className="relative mt-6 size-56 sm:size-72">
        <svg
          viewBox="0 0 260 260"
          className="h-full w-full"
          style={{ transform: `rotate(${dialRotate}deg)` }}
          aria-hidden
        >
          {Array.from({ length: TICKS }, (_, i) => {
            // The dial reads 742/1000, so the lit arc has to be 742/1000 of the
            // way round. A ring lit to a different fraction than the number
            // beneath it is a lying instrument, which is the one thing this
            // product cannot be, even in marketing.
            const on = i < Math.round((SCORE / MAX) * TICKS);
            return (
              <line
                key={i}
                x1="130"
                y1="24"
                x2="130"
                y2="46"
                className={on ? "hero-tick" : undefined}
                style={on ? { animationDelay: `${120 + i * 18}ms` } : undefined}
                stroke={on ? "var(--accent)" : "var(--surface-3)"}
                strokeWidth="4"
                strokeLinecap="round"
                transform={`rotate(${(i / TICKS) * 360} 130 130)`}
              />
            );
          })}
        </svg>
        <div className="hero-readout absolute inset-0 flex flex-col items-center justify-center">
          <span className="u-stat-number text-6xl leading-none text-text sm:text-7xl">{SCORE}</span>
          <span className="u-mono mt-1 text-2xs text-text-3">of {MAX}</span>
          <span className="mt-2 text-sm font-semibold text-accent-strong">Strong</span>
        </div>
      </div>

      {/* Rule 5: an illustrative number must read as illustrative. This dial is
          a worked example, not anyone's live score, and it says so. */}
      <span className="u-mono mt-3 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-2xs text-text-3">
        example ledger
      </span>

      <div className="mt-8 w-full max-w-sm space-y-2.5">
        {PILLARS.map((pillar, j) => (
          <div key={pillar.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="u-label truncate">{pillar.label}</span>
              <span className="u-mono shrink-0 text-2xs text-text-3">{pillar.weight}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden bg-surface-3">
              <div
                className="hero-meter-fill h-full bg-accent"
                style={{
                  width: `${pillar.pct}%`,
                  opacity: pillar.dim,
                  animationDelay: `${420 + j * 90}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex h-10 items-start justify-center">
        <p
          key={caption}
          className="hero-caption max-w-[42ch] text-sm leading-relaxed text-text-2 sm:text-base"
        >
          {caption}
        </p>
      </div>

      {/* Never gated on scroll. This used to fade in at 80% of a three-screen
          pin, so the only way to reach the primary call to action was to scroll
          roughly two and a half screens first. */}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/login" size="lg">
          Start your ledger <ArrowRight size={15} />
        </ButtonLink>
        <ButtonLink href="/sample" size="lg" variant="secondary">
          See how the score works
        </ButtonLink>
      </div>
    </div>
  );

  if (!animate) {
    return <div className="mx-auto max-w-3xl px-6 py-16">{stage}</div>;
  }

  // Two screens, not three. The pin now carries the caption story alone, and
  // three screens of scrolling to read five short lines is a toll, not a story.
  return (
    <div ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <div className="w-full max-w-3xl" style={{ transform: `scale(${stageScale})` }}>
          {stage}
        </div>
        <span
          className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 u-mono text-2xs text-text-2"
          style={{ opacity: hintOpacity }}
        >
          keep scrolling
        </span>
      </div>
    </div>
  );
}
