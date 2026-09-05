"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";
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

export function HeroScroll() {
  const reduce = useReducedMotion();
  return reduce ? <HeroStatic /> : <HeroScrubbed />;
}

// ── the pinned, scroll-scrubbed version ──────────────────────────────
function HeroScrubbed() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const litRaw = useTransform(scrollYProgress, [0.08, 0.44], [0, TICKS], { clamp: true });
  const scoreRaw = useTransform(scrollYProgress, [0.08, 0.52], [0, SCORE], { clamp: true });
  const dialRotate = useTransform(scrollYProgress, [0.1, 0.66], [-10, 6]);
  const stageScale = useTransform(scrollYProgress, [0, 0.14, 0.86, 1], [0.9, 1, 1, 0.97]);
  const tierOpacity = useTransform(scrollYProgress, [0.5, 0.62], [0, 1]);
  const ctaOpacity = useTransform(scrollYProgress, [0.8, 0.92], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.8, 0.92], [14, 0]);

  // one useTransform per pillar (fixed count -> hook-rules safe)
  const w0 = usePillarWidth(scrollYProgress, 0);
  const w1 = usePillarWidth(scrollYProgress, 1);
  const w2 = usePillarWidth(scrollYProgress, 2);
  const w3 = usePillarWidth(scrollYProgress, 3);
  const widths = [w0, w1, w2, w3];

  const [lit, setLit] = useState(0);
  const [score, setScore] = useState(0);
  const [capIndex, setCapIndex] = useState(0);
  useMotionValueEvent(litRaw, "change", (v) => setLit(Math.round(v)));
  useMotionValueEvent(scoreRaw, "change", (v) => setScore(Math.round(v)));
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    let idx = 0;
    for (let i = 0; i < CAPTIONS.length; i++) if (p >= CAPTIONS[i].at) idx = i;
    setCapIndex(idx);
  });

  return (
    <div ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <motion.div style={{ scale: stageScale }} className="w-full max-w-3xl">
          <Stage
            lit={lit}
            score={score}
            dialRotate={dialRotate}
            tierOpacity={tierOpacity}
            widths={widths}
            caption={CAPTIONS[capIndex].text}
            ctaStyle={{ opacity: ctaOpacity, y: ctaY }}
          />
        </motion.div>

        <motion.span
          className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 u-mono text-2xs text-text-3"
          animate={{ opacity: [0.25, 0.9, 0.25] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          keep scrolling
        </motion.span>
      </div>
    </div>
  );
}

function usePillarWidth(progress: MotionValue<number>, index: number) {
  const start = 0.46 + index * 0.05;
  return useTransform(progress, [start, start + 0.09], ["0%", `${PILLARS[index].pct}%`], { clamp: true });
}

// ── the reduced-motion / no-scroll fallback ──────────────────────────
function HeroStatic() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Stage
        lit={TICKS}
        score={SCORE}
        dialRotate={0}
        caption={CAPTIONS[CAPTIONS.length - 1].text}
        ctaStyle={{}}
        staticPillarPct={PILLARS.map((p) => p.pct)}
        forceTier
      />
    </div>
  );
}

// ── the shared visual ───────────────────────────────────────────────
function Stage({
  lit,
  score,
  dialRotate,
  tierOpacity,
  widths,
  caption,
  ctaStyle,
  staticPillarPct,
  forceTier,
}: {
  lit: number;
  score: number;
  dialRotate: MotionValue<number> | number;
  tierOpacity?: MotionValue<number>;
  widths?: MotionValue<string>[];
  caption: string;
  ctaStyle: Record<string, unknown>;
  staticPillarPct?: number[];
  forceTier?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="u-label">academic instrument · built for India</span>
      <h1 className="mt-3 max-w-[16ch] text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-text sm:text-4xl">
        Know where you stand.
      </h1>

      <div className="relative mt-6 size-56 sm:size-72">
        <motion.svg viewBox="0 0 260 260" className="h-full w-full" style={{ rotate: dialRotate }} aria-hidden>
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
        </motion.svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="u-stat-number text-6xl leading-none text-text sm:text-7xl">{score}</span>
          <span className="u-mono mt-1 text-2xs text-text-3">of {MAX}</span>
          <motion.span
            style={forceTier ? undefined : { opacity: tierOpacity }}
            className="mt-2 text-sm font-semibold text-accent-strong"
          >
            Strong
          </motion.span>
        </div>
      </div>

      <div className="mt-8 w-full max-w-sm space-y-2.5">
        {PILLARS.map((p, j) => (
          <div key={p.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="u-label truncate">{p.label}</span>
              <span className="u-mono shrink-0 text-2xs text-text-3">{p.weight}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden bg-surface-3">
              <motion.div
                className="h-full bg-accent"
                style={
                  staticPillarPct ? { width: `${staticPillarPct[j]}%` } : { width: widths?.[j] ?? "0%" }
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 h-10 max-w-[42ch]">
        <AnimatePresence mode="wait">
          <motion.p
            key={caption}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-sm leading-relaxed text-text-2 sm:text-base"
          >
            {caption}
          </motion.p>
        </AnimatePresence>
      </div>

      <motion.div style={ctaStyle} className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/login">
          <Button size="lg">
            Start your ledger <ArrowRight size={15} />
          </Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="secondary">
            See a live score
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
