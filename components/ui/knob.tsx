"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

/**
 * A detented rotary selector. The front-panel control, not a readout.
 *
 * The score ring's knob marks where a value already is; this one is the thing
 * you grab to change it. Everything that makes a real knob feel like a knob is
 * here on purpose: a knurled edge, because ridges are what say "grippable"; a
 * printed scale on the panel rather than in a tooltip, the way a dial's numbers
 * are engraved on the chassis; a detent click at each position; and a settle
 * that overshoots slightly, because a sprung switch does.
 *
 * Turn it by dragging, clicking to advance, or with the arrow keys. It reports
 * itself as a slider with a text value, so a screen reader hears "appearance,
 * dark" rather than a rotation in degrees.
 */

/** Default sweep across all positions. A real selector does not spin freely. */
const DEFAULT_SWEEP = 132;

/**
 * Past this many positions the printed scale stops being a scale and becomes a
 * smear, so the panel shows the current value as a single readout instead.
 */
const MAX_PRINTED = 5;

export function Knob({
  positions,
  value,
  onChange,
  label,
  size = 76,
  sweep = DEFAULT_SWEEP,
  hint,
  valueText,
}: {
  positions: readonly string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
  size?: number;
  /** Widen it when there are many positions, so one detent is still a turn. */
  sweep?: number;
  /** Replaces the label under a dial whose scale is too dense to print. */
  hint?: string;
  /**
   * What a screen reader should hear instead of the raw position. The
   * positions are indices, so without this the what-if dial announced
   * "what if: topics, slider, 6" and the scene dial "slider, 37" out of 48.
   * Six what, and what did it do to the score.
   */
  valueText?: string;
}) {
  const printScale = positions.length <= MAX_PRINTED;
  const facet = size < 68 ? 5 : 3;
  const index = Math.max(0, positions.indexOf(value));
  const last = positions.length - 1;
  const ref = useRef<HTMLDivElement>(null);
  /** Where the pointer was last frame, so a crossing of the seam below the
   *  dial can be told apart from a genuine sweep to the other end. */
  const lastDeg = useRef(0);
  /** Whether the pointer moved between down and up. A press and release over
   *  the knob fires click after pointerup, and the click handler advances a
   *  detent, so every drag that ended over the control overshot its target by
   *  one: a wrong projected score, a wrong frame, a wrong day. */
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);

  const angleFor = (i: number) => -sweep / 2 + (last === 0 ? sweep / 2 : (i / last) * sweep);

  const select = useCallback(
    (i: number) => {
      const next = Math.min(last, Math.max(0, i));
      if (positions[next] === value) return;
      playClick("switch");
      onChange(positions[next]);
    },
    [last, onChange, positions, value],
  );

  // Dragging maps the pointer's angle around the knob's centre onto the sweep,
  // so the knob follows your hand rather than counting pixels of travel.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // atan2 gives (-180, 180]; rotating it a quarter turn so that zero is
      // twelve o'clock pushes the top of the range to 270, which leaves every
      // angle below -90 unreachable. On a dial sweeping wider than 180 degrees
      // that is most of one side: the pointer would not travel past the
      // nine o'clock position no matter how far round you dragged. Fold it back
      // into (-180, 180] so the whole sweep is reachable.
      const raw =
        (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) /
          Math.PI +
        90;
      const deg = raw > 180 ? raw - 360 : raw;
      // The seam between 180 and -180 sits in the gap below the dial, outside
      // the sweep. Dragging across it reads as a jump from one end of the scale
      // to the other, so a crossing is resolved to the end you were already
      // nearest instead of teleporting the pointer to the far stop.
      const prev = lastDeg.current;
      const unwrapped = deg - prev > 180 ? -sweep / 2 : prev - deg > 180 ? sweep / 2 : deg;
      const clamped = Math.max(-sweep / 2, Math.min(sweep / 2, unwrapped));
      moved.current = true;
      lastDeg.current = clamped;
      select(Math.round(((clamped + sweep / 2) / sweep) * last));
    };
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, last, select]);

  return (
    // The printed scale sits outside the dial's own box, so the column needs
    // room either side or the first label is clipped by the panel edge.
    <div className={cn("flex select-none flex-col items-center gap-2", printScale ? "px-9" : "px-3")}>
      <div className="relative" style={{ width: size, height: size + 14 }}>
        {/* A dense dial gets ticks instead of numbers: still a scale you can
            read your position against, without 31 labels fighting for the same
            ring of pixels. */}
        {!printScale &&
          positions.map((p, i) => {
            const a = ((angleFor(i) - 90) * Math.PI) / 180;
            const rad = size / 2 + 6;
            return (
              <span
                key={p}
                aria-hidden
                className={cn(
                  "absolute h-[3px] w-[3px] rounded-full transition-colors duration-200",
                  i === index ? "bg-accent" : "bg-border-2",
                )}
                style={{
                  left: size / 2 + rad * Math.cos(a),
                  top: size / 2 + rad * Math.sin(a),
                  transform: "translate(-50%, -50%)",
                }}
              />
            );
          })}

        {/* the scale, printed on the panel around the dial */}
        {printScale && positions.map((p, i) => {
          const a = ((angleFor(i) - 90) * Math.PI) / 180;
          const rad = size / 2 + 11;
          return (
            <span
              key={p}
              className={cn(
                "u-mono absolute text-[9px] leading-none transition-colors duration-200",
                i === index ? "text-text" : "text-text-3",
              )}
              style={{
                left: size / 2 + rad * Math.cos(a),
                top: size / 2 + rad * Math.sin(a),
                transform: "translate(-50%, -50%)",
              }}
            >
              {p}
            </span>
          );
        })}

        {/* the glow ring beneath, the one accent on the panel */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: 3,
            top: 5,
            width: size - 6,
            height: size - 6,
            boxShadow: "0 3px 10px -2px var(--accent)",
            opacity: 0.55,
          }}
        />

        <div
          ref={ref}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={index}
          aria-valuetext={valueText ?? value}
          onPointerDown={(e) => {
            e.preventDefault();
            lastDeg.current = angleFor(index);
            moved.current = false;
            setDragging(true);
          }}
          onClick={() => {
            // A tap advances one position; a drag has already chosen its own.
            if (moved.current) {
              moved.current = false;
              return;
            }
            select(index >= last ? 0 : index + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              select(index + 1);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              select(index - 1);
            } else if (e.key === "Home") {
              e.preventDefault();
              select(0);
            } else if (e.key === "End") {
              e.preventDefault();
              select(last);
            }
          }}
          className={cn(
            "absolute left-0 top-0 cursor-grab rounded-full outline-none",
            "transition-[rotate,box-shadow] ease-spring",
            dragging ? "duration-[90ms]" : "duration-[260ms]",
            "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
            dragging && "cursor-grabbing",
          )}
          style={{
            width: size,
            height: size,
            rotate: `${angleFor(index)}deg`,
            // Knurling: alternating light and dark facets around the rim, which
            // is what a machined grip actually looks like under a light. The
            // facets widen on a small dial, where a 3deg ridge is thinner than
            // a pixel at the rim and reads as noise rather than as grip.
            background: `
              repeating-conic-gradient(
                from 0deg,
                var(--surface-3) 0deg ${facet}deg,
                var(--surface-2) ${facet}deg ${facet * 2}deg
              )`,
            boxShadow: dragging
              ? "inset 0 2px 5px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.5)"
              : "inset 0 1px 0 var(--edge), 0 3px 6px rgba(0,0,0,0.45)",
          }}
        >
          {/* the cap: the smooth face the ridges surround */}
          <span
            aria-hidden
            className="absolute rounded-full border border-border-2 bg-surface"
            style={{ inset: size * 0.16 }}
          />
          {/* the pointer, the mark that tells you where it is set */}
          <span
            aria-hidden
            className="absolute left-1/2 rounded-full bg-accent"
            style={{
              top: size * 0.1,
              width: 2.5,
              height: size * 0.17,
              transform: "translateX(-50%)",
            }}
          />
        </div>
      </div>

      <span className="u-label">{hint ?? label}</span>
    </div>
  );
}
