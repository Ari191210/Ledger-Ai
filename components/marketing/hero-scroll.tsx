"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TICKS = 40;
const SCORE = 742;
const MAX = 1000;

const PILLARS = [
  { label: "pyq accuracy", weight: "40", pct: 78 },
  { label: "syllabus coverage", weight: "25", pct: 75 },
  { label: "mistake velocity", weight: "20", pct: 76 },
  { label: "consistency", weight: "15", pct: 66 },
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

  // everything below is derived from one number
  const lit = animate ? Math.round(seg(p, 0.08, 0.44) * TICKS) : TICKS;
  const score = animate ? Math.round(seg(p, 0.08, 0.52) * SCORE) : SCORE;
  const dialRotate = animate ? -10 + seg(p, 0.1, 0.66) * 16 : 0;
  const stageScale = animate ? 0.9 + seg(p, 0, 0.14) * 0.1 - seg(p, 0.86, 1) * 0.03 : 1;
  const tierOpacity = animate ? seg(p, 0.5, 0.62) : 1;
  const ctaOpacity = animate ? seg(p, 0.8, 0.92) : 1;
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
          {Array.from({ length: TICKS }, (_, i) => (
            <line
              key={i}
              x1="130"
              y1="24"
              x2="130"
              y2="46"
              stroke={i < lit ? "var(--accent)" : "var(--surface-3)"}
              strokeWidth="4"
              strokeLinecap="round"
              transform={`rotate(${(i / TICKS) * 360} 130 130)`}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="u-stat-number text-6xl leading-none text-text sm:text-7xl">{score}</span>
          <span className="u-mono mt-1 text-2xs text-text-3">of {MAX}</span>
          <span
            className="mt-2 text-sm font-semibold text-accent-strong"
            style={{ opacity: tierOpacity }}
          >
            Strong
          </span>
        </div>
      </div>

      <div className="mt-8 w-full max-w-sm space-y-2.5">
        {PILLARS.map((pillar, j) => {
          const start = 0.46 + j * 0.05;
          const fill = animate ? seg(p, start, start + 0.09) * pillar.pct : pillar.pct;
          return (
            <div key={pillar.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="u-label truncate">{pillar.label}</span>
                <span className="u-mono shrink-0 text-2xs text-text-3">{pillar.weight}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden bg-surface-3">
                <div className="h-full bg-accent" style={{ width: `${fill}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex h-10 items-start justify-center">
        <p
          key={caption}
          className="hero-caption max-w-[42ch] text-sm leading-relaxed text-text-2 sm:text-base"
        >
          {caption}
        </p>
      </div>

      <div
        className="mt-6 flex flex-wrap justify-center gap-3"
        style={{ opacity: ctaOpacity, transform: `translateY(${(1 - ctaOpacity) * 14}px)` }}
      >
        <Link href="/login">
          <Button size="lg">
            Start your ledger <ArrowRight size={15} />
          </Button>
        </Link>
        <Link href="/sample">
          <Button size="lg" variant="secondary">
            See how the score works
          </Button>
        </Link>
      </div>
    </div>
  );

  if (!animate) {
    return <div className="mx-auto max-w-3xl px-6 py-16">{stage}</div>;
  }

  return (
    <div ref={ref} className="relative h-[300vh]">
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
