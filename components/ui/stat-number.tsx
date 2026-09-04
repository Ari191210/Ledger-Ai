"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function StatNumber({
  value,
  className,
  format,
  duration = 750,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [n, setN] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setN(value);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  const shown = format ? format(n) : Math.round(n).toLocaleString();
  return <span className={cn("u-stat-number tabular-nums", className)}>{shown}</span>;
}
