"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/motion/count-up";

// A 24-tick Braun-style dial. `lit` ticks up to the score fraction.
const TICKS = 32;

function Dial({ fraction }: { fraction: number }) {
  const litCount = Math.round(fraction * TICKS);
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full" aria-hidden>
      {Array.from({ length: TICKS }, (_, i) => {
        const lit = i < litCount;
        return (
          <line
            key={i}
            x1="120"
            y1="26"
            x2="120"
            y2="44"
            stroke={lit ? "var(--accent)" : "var(--surface-3)"}
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${(i / TICKS) * 360} 120 120)`}
          />
        );
      })}
    </svg>
  );
}

export function HeroInstrument() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rotate = useTransform(scrollYProgress, [0, 1], [-8, 8]);
  const lift = useTransform(scrollYProgress, [0, 1], [24, -24]);

  const SAMPLE = 742;
  const MAX = 1000;
  const pillars = [
    { label: "pyq accuracy", weight: "40", pct: 78 },
    { label: "syllabus coverage", weight: "25", pct: 75 },
    { label: "mistake velocity", weight: "20", pct: 76 },
    { label: "consistency", weight: "15", pct: 66 },
  ];

  return (
    <motion.div
      ref={ref}
      style={reduce ? undefined : { y: lift }}
      className="u-card relative overflow-hidden p-6 sm:p-8"
    >
      <div className="u-grille pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex items-center justify-between">
        <span className="u-label">ledger score</span>
        <span className="u-mono text-2xs text-text-3">example</span>
      </div>

      <div className="relative mt-6 flex flex-col items-center gap-6 sm:flex-row sm:gap-7">
        <div className="relative size-40 shrink-0 sm:size-44">
          <motion.div
            className="absolute inset-0"
            style={reduce ? undefined : { rotate }}
          >
            <Dial fraction={SAMPLE / MAX} />
          </motion.div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <CountUp
              to={SAMPLE}
              className="u-stat-number text-5xl leading-none text-text sm:text-6xl"
            />
            <span className="u-mono mt-1 text-2xs text-text-3">of {MAX}</span>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1">
          <div className="text-sm font-semibold text-text">Strong</div>
          <div className="u-mono mt-0.5 text-2xs text-text-3">58 points to exam ready</div>
          <div className="mt-4 space-y-2.5">
            {pillars.map((p) => (
              <div key={p.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="u-label truncate">{p.label}</span>
                  <span className="u-mono shrink-0 text-2xs text-text-3">{p.weight}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden bg-surface-3">
                  <motion.div
                    className="h-full bg-accent"
                    initial={reduce ? false : { width: 0 }}
                    whileInView={{ width: `${p.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
