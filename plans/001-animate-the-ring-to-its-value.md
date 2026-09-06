# 001 — Animate the score ring to its value, in step with its readout

- **Status**: DONE
- **Commit**: 2664e37
- **Severity**: HIGH
- **Category**: Purpose & frequency, Physicality & origin, Missed opportunities
- **Estimated scope**: 2 files, small

## Problem

`StatNumber` is rendered as a **child of** `Ring`, and only the number animates.
The arc paints its final value on first frame while the number counts up from
zero over 750ms, so for three quarters of a second the instrument's arc and its
own readout state different things.

```tsx
/* app/(app)/dashboard/page.tsx:236-241 — current */
<Ring value={score.total} max={score.max} size={132} stroke={11} color="var(--accent-strong)">
  <div>
    <StatNumber value={score.total} className="text-[2.1rem] leading-none" />
    <div className="u-mono text-2xs text-text-3">/{score.max}</div>
  </div>
</Ring>
```

```tsx
/* app/(app)/score/page.tsx:27-32 — current, same shape at a larger size */
<Ring value={score.total} max={score.max} size={188} stroke={14} color="var(--accent-strong)">
  <div>
    <StatNumber value={score.total} className="text-4xl leading-none" />
    <div className="u-mono mt-1 text-2xs text-text-3">/ {score.max}</div>
  </div>
</Ring>
```

```tsx
/* components/ui/ring.tsx:33-43 — current, no transition at all */
<circle
  cx={size / 2}
  cy={size / 2}
  r={r}
  fill="none"
  stroke={color}
  strokeWidth={stroke}
  strokeLinecap="round"
  strokeDasharray={c}
  strokeDashoffset={c * (1 - pct)}
/>
```

Two consequences:

1. **The instrument lies while it settles.** `DESIGN.md` already records this
   principle for the landing page hero: "a ring lit to a different fraction than
   the number beneath it is a lying instrument, which is the one thing this
   product cannot be, even in marketing." The same defect is live inside the app.
2. **The one moment that deserves motion has none.** When a student logs a
   mistake or a paper, the score changes and the arc teleports to its new
   position. The product's own landing copy promises "change the inputs and the
   number moves the same day", and the number does not visibly move.

## Target

The arc animates to its value, and the readout counts to the same value over the
same duration, so they agree at every frame.

```tsx
/* components/ui/ring.tsx — target: the progress circle */
<circle
  cx={size / 2}
  cy={size / 2}
  r={r}
  fill="none"
  stroke={color}
  strokeWidth={stroke}
  strokeLinecap="round"
  strokeDasharray={c}
  strokeDashoffset={c * (1 - shownPct)}
  style={{
    transition: "stroke-dashoffset 750ms cubic-bezier(0.22, 1, 0.36, 1)",
  }}
/>
```

Where `shownPct` starts at `0` on mount and is set to the real `pct` in a
`useEffect` on the next frame, so the CSS transition has something to travel
from. On a later value change (the student logs something and the page
revalidates) `shownPct` follows the new `pct` and the same transition carries it.

Exact values, all of them:

- Duration: **750ms**, matching `StatNumber`'s existing default so the two never
  drift apart. Both are marketing-grade "explanatory" motion on a hero figure,
  which the playbook allows to exceed the 300ms UI budget.
- Easing: **`cubic-bezier(0.22, 1, 0.36, 1)`**, the curve this repo already uses
  everywhere for entrances.
- Reduced motion: no transition, and `shownPct` is set to `pct` immediately.

```css
/* target, in the reduced-motion block */
@media (prefers-reduced-motion: reduce) {
  .ring-progress { transition: none; }
}
```

## Repo conventions to follow

- There are no `--ease-*` tokens yet (plan 004 introduces them). Until then,
  write the curve literally as `cubic-bezier(0.22, 1, 0.36, 1)`, which is what
  `components/motion/scroll-reveal.tsx:6` and `app/globals.css:275` already do.
- Reduced motion is read with `window.matchMedia("(prefers-reduced-motion: reduce)")`
  inside an effect. **Exemplar: `components/ui/stat-number.tsx:20-27`** — copy
  that shape exactly, including the early `setN(value); return;`.
- `Ring` is currently a server-compatible component with no `"use client"`.
  Adding state makes it a client component; add `"use client"` at the top, as
  `components/ui/stat-number.tsx:1` does.

## Steps

1. In `components/ui/ring.tsx`, add `"use client";` as the first line.
2. Import `useEffect`, `useState` from `react`.
3. Compute `pct` as it is computed today. Add:
   ```tsx
   const [shownPct, setShownPct] = useState(0);
   useEffect(() => {
     if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
       setShownPct(pct);
       return;
     }
     const id = requestAnimationFrame(() => setShownPct(pct));
     return () => cancelAnimationFrame(id);
   }, [pct]);
   ```
   The `requestAnimationFrame` matters: setting state in the same frame as mount
   can be batched into the first paint, and the transition then has no start
   value to travel from.
4. Change the progress circle's `strokeDashoffset` from `c * (1 - pct)` to
   `c * (1 - shownPct)`, and add the inline `style` with the transition exactly
   as written in **Target** above.
5. Add `className="ring-progress"` to that same circle.
6. In `app/globals.css`, inside the existing `@layer components` block and
   immediately after the `.u-led` rule, add:
   ```css
   /* the score arc travels to its value; it must not jump there */
   @media (prefers-reduced-motion: reduce) {
     .ring-progress { transition: none !important; }
   }
   ```
7. Do not change `StatNumber`. Its 750ms default already matches.

## Boundaries

- Do NOT touch `components/ui/stat-number.tsx`.
- Do NOT change the ring's size, stroke, colour, `strokeLinecap`, or the
  `-90deg` rotation.
- Do NOT change any call site of `<Ring>`; the prop contract is unchanged.
- Do NOT add a dependency. No framer-motion here: this is predetermined motion
  to a known value, which is CSS's job per the playbook.
- If `components/ui/ring.tsx` does not match the excerpt above, STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` exits 0. `npx next build` compiles.
  `npx vitest run` still passes (83 tests at the time of writing).
- **Feel check**: run the app, sign in, open `/dashboard` and `/score`.
  - The arc and the number reach their final value **together**. Pause at any
    point (DevTools Animations panel at 10% playback) and confirm the arc's
    filled fraction visually matches the digits inside it.
  - Log a mistake through Quick Log and let the dashboard revalidate. The arc
    should visibly travel to its new position rather than jump.
  - In DevTools Rendering, enable "Emulate prefers-reduced-motion: reduce",
    reload: the arc and number should both appear at their final values with no
    travel, and no flash of an empty ring.
  - Confirm the arc never overshoots past its value or snaps back.
- **Done when**: at 10% playback the arc's fraction and the readout agree at
  every sampled frame, on both pages, and a score change after logging visibly
  animates.

## Outcome (execution, 2026-09-06)

Applied. One correction the plan got wrong: it specified the repo's usual
entrance curve, `cubic-bezier(0.22, 1, 0.36, 1)`, for the arc. That made the arc
and the readout start and finish together but disagree in the middle, because
`StatNumber` eases the digits in JS with `1 - (1 - p)^3`, which is a different
curve. Measured mid-travel gap on `/score`: **11.7 percentage points**.

The arc now uses `cubic-bezier(0.33, 1, 0.68, 1)` (easeOutCubic, the CSS
equivalent of StatNumber's function). Re-measured worst gap: **2.0 points**, and
that residue is sampling jitter plus the integer rounding of the displayed
digits.

Before this plan the gap was ~78 points for the full 750ms, because the arc did
not animate at all.
