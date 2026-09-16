"use client";

import { useCallback, useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { buttonClasses } from "./button-classes";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

/**
 * Two keys and a readout. The front-panel keypad, not a readout you turn.
 *
 * This replaced the rotary Knob on the two dashboard controls (2026-09-16),
 * because both were picking a whole number out of a short list and a knob is
 * the instrument for a continuum. The what-if dial's positions were always
 * integers wearing a rotation.
 *
 * Everything that makes a key feel like a key is inherited rather than
 * reinvented: `buttonClasses` already carries the press (drop 2px, compress to
 * 0.965 in 70ms, ride back in 190ms on a spring), the lit top edge that goes
 * out and moves inside when pressed, the reduced-motion handling, and the
 * Tailwind v4 trap where naming `transform` transitions nothing. The keys are
 * grey on purpose: REFERENCE.md allows one lime element per panel and the score
 * ring already spends it, so tactility here is travel, edge light and the
 * detent thunk, never colour.
 */

/**
 * How long a key must be held before it starts repeating. Below about 300ms a
 * slow deliberate single press starts running; above about 500ms the hold
 * feels broken before it begins.
 */
const REPEAT_DELAY = 400;

/**
 * The gap before each repeat, indexed by how many have already fired, holding
 * at the last value. A table rather than a decay formula, because these
 * numbers have to be assertable to the millisecond in a test.
 *
 * It reaches full speed after about 0.85 seconds, which is roughly when a hand
 * has decided it is holding rather than pressing. The 60ms floor is where the
 * digits stop being individually legible, and an instrument that shows a blur
 * is showing noise.
 */
const REPEAT_STEPS = [160, 136, 116, 98, 84, 72, 60] as const;

/**
 * One tick per this many repeats while held.
 *
 * At the floor, a click per step would be sixteen a second, which is a buzz
 * rather than a key. Every fourth puts the ticks 240ms apart at full speed,
 * clear of the "switch" click's own 105ms envelope, so each one stays an
 * audible object. The press itself always clicks.
 */
const TICK_EVERY = 4;

export function Stepper({
  value,
  min = 0,
  max,
  onChange,
  label,
  display,
  valueText,
  incrementLabel,
  decrementLabel,
  hint,
  className,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (n: number) => void;
  /** The readout's accessible name, e.g. "what if: topics". */
  label: string;
  /** What is printed between the keys. Defaults to the value. */
  display?: string;
  /**
   * What the value MEANS, announced instead of the digit. An audit found both
   * dials reading out raw indices ("what if: topics, slider, 6"), and six of
   * what is the question a blind student cannot answer.
   */
  valueText?: string;
  /**
   * Names for the keys, required rather than defaulted: "increase" is exactly
   * the accessible name that passes an automated check and tells a student
   * nothing.
   */
  incrementLabel: string;
  decrementLabel: string;
  /** Small mono caption under the keys. */
  hint?: string;
  className?: string;
}) {
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  // The run reads the value through a ref: a repeat closing over one render's
  // `value` would step from the same number forever. Synced after commit, and
  // written directly by each step so a fast run never reads a stale number.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatsRef = useRef(0);
  // The window listeners come off through a signal rather than by name, so
  // `stop` does not have to reference itself to remove itself.
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    repeatsRef.current = 0;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const step = useCallback(
    (dir: 1 | -1, held = false) => {
      const next = Math.min(max, Math.max(min, valueRef.current + dir));
      // Nothing to do at a stop, and nothing to hear: the knob was silent there
      // too. A control that keeps clicking after the value stops moving teaches
      // the wrong thing about the ceiling.
      if (next === valueRef.current) {
        stop();
        return;
      }
      if (!held) playClick("switch");
      else if (repeatsRef.current % TICK_EVERY === TICK_EVERY - 1) playClick("soft");
      // Written here, not left to the re-render: at 60ms a step can fire before
      // React has committed the last one, and reading a stale value would stall
      // the run.
      valueRef.current = next;
      onChange(next);
    },
    [max, min, onChange, stop],
  );

  const start = useCallback(
    (dir: 1 | -1) => {
      stop();
      step(dir);
      repeatsRef.current = 0;

      // A self-rescheduling timeout rather than an interval, because the gap
      // shortens with every repeat. Local, so it can call itself.
      function tick() {
        step(dir, true);
        repeatsRef.current += 1;
        const gap = REPEAT_STEPS[Math.min(repeatsRef.current - 1, REPEAT_STEPS.length - 1)];
        // Null once a stop has run, including the clamp inside step.
        if (timerRef.current) timerRef.current = setTimeout(tick, gap);
      }
      timerRef.current = setTimeout(tick, REPEAT_DELAY);
      // On the window, not the key. `buttonClasses` sets
      // disabled:pointer-events-none, so a key that hits its stop under the
      // finger can never receive its own pointerup, and a key-bound listener
      // would leave the timer running for the life of the page.
      const ac = new AbortController();
      abortRef.current = ac;
      window.addEventListener("pointerup", stop, { signal: ac.signal });
      window.addEventListener("pointercancel", stop, { signal: ac.signal });
    },
    [step, stop],
  );

  useEffect(() => stop, [stop]);

  // A key that goes disabled while focused drops focus to <body>. Hand it to
  // the readout instead, which is the keyboard surface anyway, so the student
  // keeps their place and can carry on with the arrows.
  useEffect(() => {
    const active = document.activeElement;
    if (value >= max && active === upRef.current) readoutRef.current?.focus();
    if (value <= min && active === downRef.current) readoutRef.current?.focus();
  }, [value, min, max]);

  /** Home and End: one move, one click, silent if it is already there. */
  function jump(to: number) {
    if (to === valueRef.current) return;
    playClick("switch");
    valueRef.current = to;
    onChange(to);
  }

  function onReadoutKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      jump(min);
    } else if (e.key === "End") {
      e.preventDefault();
      jump(max);
    }
  }

  /**
   * Enter and Space are handled here rather than through onClick, and there is
   * no onClick at all: a pointer press already stepped on pointerdown, and a
   * click handler would step it a second time.
   */
  function onKeyKey(e: React.KeyboardEvent, dir: 1 | -1) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      step(dir);
    }
  }

  // size "md" is 44px on touch and 36px on a pointer device, which is the house
  // idiom for a real target. Not "sm" plus .u-tap: that paints a 44px box
  // centred on a smaller control, and two keys either side of a readout would
  // have hit areas reaching into it and into each other.
  const key = buttonClasses({ variant: "secondary", size: "md", shape: "key" });

  return (
    <div className={cn("flex shrink-0 select-none flex-col items-center gap-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <button
          ref={downRef}
          type="button"
          aria-label={decrementLabel}
          disabled={value <= min}
          onPointerDown={() => start(-1)}
          onPointerLeave={stop}
          onKeyDown={(e) => onKeyKey(e, -1)}
          onBlur={stop}
          className={key}
        >
          <Minus size={14} aria-hidden />
        </button>

        <div
          ref={readoutRef}
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={valueText ?? String(value)}
          onKeyDown={onReadoutKey}
          className={cn(
            "u-stat-number min-w-[3.25rem] rounded-md px-1 text-center text-base tabular-nums",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
          )}
        >
          {display ?? String(value)}
        </div>

        <button
          ref={upRef}
          type="button"
          aria-label={incrementLabel}
          disabled={value >= max}
          onPointerDown={() => start(1)}
          onPointerLeave={stop}
          onKeyDown={(e) => onKeyKey(e, 1)}
          onBlur={stop}
          className={key}
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>
      {hint && <span className="u-label">{hint}</span>}
    </div>
  );
}
