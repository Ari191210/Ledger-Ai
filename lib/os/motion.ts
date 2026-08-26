"use client";
// ═══════════════════════════════════════════════════════════════════════════
// Motion hooks — the JS half of os-motion.css.
//
// Each hook does the minimum work the CSS cannot: read the cursor, watch the
// viewport, or unlock audio. All the visual result lives in CSS custom
// properties, so the browser compositor does the animating and React is not
// re-rendering on mousemove.
//
// Every hook checks prefers-reduced-motion and becomes inert when set.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { Sound, feedback } from "@/lib/os/tactile";

function prefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Cursor-tracked tilt.
 *
 *  Writes --rx / --ry (rotation) and --mx / --my (the sheen position) onto
 *  the element. Values are written directly to style rather than held in
 *  state: a mousemove handler that calls setState re-renders the subtree on
 *  every pixel, which is how tilt effects end up janky.  */
export function useTilt(maxDeg = 6) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || prefersReduced()) return;

    const { clientX, clientY } = e;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      // -0.5 … 0.5 from the centre of the card.
      const px = (clientX - r.left) / r.width - 0.5;
      const py = (clientY - r.top) / r.height - 0.5;

      const inner = el.firstElementChild as HTMLElement | null;
      if (!inner) return;
      // Y follows the horizontal axis, X follows the vertical, inverted —
      // pushing the top of the card away when the cursor is high.
      inner.style.setProperty("--ry", `${(px * maxDeg * 2).toFixed(2)}deg`);
      inner.style.setProperty("--rx", `${(-py * maxDeg * 2).toFixed(2)}deg`);
      inner.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`);
      inner.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`);
    });
  }, [maxDeg]);

  const onEnter = useCallback(() => {
    if (prefersReduced()) return;
    ref.current?.setAttribute("data-active", "true");
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("data-active", "false");
    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return;
    // Returning to zero lets the long CSS transition settle the card.
    inner.style.setProperty("--rx", "0deg");
    inner.style.setProperty("--ry", "0deg");
  }, []);

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  return {
    ref,
    tiltProps: {
      className: "os-tilt",
      onMouseMove: onMove,
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      "data-active": "false",
    },
  };
}

/** Reveal on scroll.
 *
 *  Marks elements shown once they enter the viewport and then stops watching
 *  them — content that re-hides on scroll-up is a nuisance when you are
 *  scanning back for something you already read. */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReduced() || typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-shown", "true");
      return;
    }

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "true");
          io.unobserve(entry.target);
        }
      },
      // Fire slightly before the element is fully on screen, so it has
      // finished arriving by the time it is properly in view.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}

/** Reveal a whole container's children, each with a stagger index. */
export function useRevealGroup<T extends HTMLElement = HTMLDivElement>(selector = "[data-reveal]") {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (!items.length) return;

    items.forEach((el, i) => el.style.setProperty("--i", String(i)));

    if (prefersReduced() || typeof IntersectionObserver === "undefined") {
      items.forEach(el => el.setAttribute("data-shown", "true"));
      return;
    }

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "true");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );

    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [selector]);

  return ref;
}

/** Global click sound.
 *
 *  Delegated from the document rather than wired per-button, so every control
 *  in the product is covered including ones added later. The first gesture
 *  unlocks the audio context, which browsers require. */
export function useTactileClicks(active = true) {
  useEffect(() => {
    if (!active) return;
    Sound.load();

    const unlock = () => Sound.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });

    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const el = t.closest("button, a, [role='button'], input[type='checkbox'], select");
      if (!el) return;
      if (el instanceof HTMLButtonElement && el.disabled) { feedback("nope"); return; }

      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        // Fires before the checked state flips, so this reads the outcome.
        feedback(el.checked ? "untick" : "tick");
        return;
      }
      const variant = el.getAttribute("data-variant");
      feedback(variant === "primary" ? "press" : "tap");
    };

    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [active]);
}

/** Scroll progress, 0 … 1, for a reading indicator. */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

/** Counts a figure up when it first scrolls into view.
 *
 *  Returns the live value plus a ref to attach. Only animates once, and only
 *  when the value is a real number — a dash must never count up from zero. */
export function useCountUp(target: number | undefined, ms = 800) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(target ?? 0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (el == null || target == null) return;
    if (prefersReduced()) { setValue(target); return; }
    if (done.current) { setValue(target); return; }

    const io = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting || done.current) return;
      done.current = true;
      io.disconnect();

      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        // Ease-out cubic: fast at first, settling at the end.
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(target * eased * 10) / 10);
        if (t < 1) requestAnimationFrame(tick);
        else setValue(target);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [target, ms]);

  return { ref, value };
}
