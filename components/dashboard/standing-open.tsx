"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// THE OPEN (Component 2C) — the daily arrival ceremony, layered onto Standing.
//
// A pure MOTION wrapper. It owns no business logic and changes no rendering
// decision: it reveals whatever children it is handed, on mount, once per day.
// The container mounts it only around the RESOLVED Standing view, so the reveal
// always exposes the answer — never the loading outline.
//
// Constitutional basis:
//   • Motion v5 Law I — nothing fades in; a paper-toned plane WITHDRAWS upward
//     to expose the already-struck figure that was there all along.
//   • Motion v5 §2.6 — one moving thing: the whole Standing block reveals as a
//     single plane. (We deliberately do not give the movement mark its own
//     Seat — that would mean reaching into Standing's internals.)
//   • Motion v5 §2.2 — t-ceremony (1000ms); §2.1 Approach curve.
//   • Motion v5 Law IV / §B — pure CSS transform transition: GPU-composited,
//     self-terminating, zero idle cost. The mask unmounts when it finishes.
//   • Motion v5 §A / prefers-reduced-motion — no ceremony; content is at its
//     destination instantly. No cross-fade, ever.
//   • Emotional v1 §5 (The Open) / §6.1 (The Unclench) — the arrival ritual,
//     once per calendar day. Same-day re-visits skip it and land at rest.
//
// Accessibility: children are in the DOM and readable from first paint; the
// mask is aria-hidden and pointer-events:none, so motion never gates the answer
// for assistive tech, keyboard, or reduced-motion users.
// ═══════════════════════════════════════════════════════════════════════════

const OPEN_SEEN_KEY = "ledger-open-seen";
const CEREMONY_MS = 1000; // Motion v5 t-ceremony
const APPROACH = "cubic-bezier(0.32, 0.72, 0, 1)"; // Motion v5 §2.1 Approach

type Phase = "idle" | "cover" | "reveal" | "done";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function StandingOpen({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const decided = useRef(false);

  // Decide before the browser paints, so the cover is in place with no flash.
  useLayoutEffect(() => {
    if (decided.current) return;
    decided.current = true;

    const today = todayStr();
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(OPEN_SEEN_KEY);
    } catch {
      /* storage unavailable — treat as unseen, but the write below is a no-op */
    }

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Record the day either way, so a same-day revisit lands at rest.
    if (seen !== today) {
      try {
        localStorage.setItem(OPEN_SEEN_KEY, today);
      } catch {
        /* ignore */
      }
    }

    // Skip the ceremony: already opened today, or the viewer prefers less motion.
    if (reduce || seen === today) return;

    // Run it: cover now (this render, still before paint), withdraw next frame.
    setPhase("cover");
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase("reveal"));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  const ceremonyActive = phase === "cover" || phase === "reveal";

  const wrapStyle: CSSProperties = {
    position: "relative",
    // Clip the plane as it slides up out of the block; restore when finished so
    // nothing (e.g. a future focus ring) is ever clipped at rest.
    overflow: ceremonyActive ? "hidden" : "visible",
  };

  const maskStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "var(--paper)",
    zIndex: 1,
    pointerEvents: "none",
    transform: phase === "reveal" ? "translateY(-101%)" : "translateY(0)",
    transition: phase === "reveal" ? `transform ${CEREMONY_MS}ms ${APPROACH}` : "none",
    willChange: "transform",
  };

  return (
    <div style={wrapStyle}>
      {children}
      {ceremonyActive && (
        <div aria-hidden="true" style={maskStyle} onTransitionEnd={() => setPhase("done")} />
      )}
    </div>
  );
}
