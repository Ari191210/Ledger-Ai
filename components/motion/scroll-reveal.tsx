"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Fires once when the element scrolls into view. No animation library. */
function useInView<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // if the browser can't observe, or the user opted out of motion, just show it
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, shown };
}

export function ScrollReveal({
  children,
  className,
  y = 16,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  delay?: number;
}) {
  const { ref, shown } = useInView<HTMLDivElement>();
  const style: CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : `translateY(${y}px)`,
    transition: `opacity 500ms ${EASE} ${delay}s, transform 500ms ${EASE} ${delay}s`,
  };
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Staggers its <ScrollItem> children in. The cascade is done with a CSS
 * transition-delay per child rather than an animation runtime.
 */
export function ScrollGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, shown } = useInView<HTMLDivElement>("0px 0px -10% 0px");
  return (
    <div ref={ref} className={cn(className, shown && "is-shown")} data-scroll-group>
      {children}
    </div>
  );
}

export function ScrollItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("scroll-item", className)}>{children}</div>;
}
