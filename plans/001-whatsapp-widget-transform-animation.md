# 001 — Replace the WhatsApp widget's layout animation with a clip-path reveal

- **Status**: TODO
- **Commit**: 6699c06
- **Severity**: HIGH
- **Category**: Performance · Physicality · Accessibility
- **Estimated scope**: 1 file, full rewrite (~65 → ~85 lines, CSS-only)

## 1. Goal

The widget expands on hover with **no layout animation**. Only `clip-path`, `transform` and `opacity` animate. The visual result is indistinguishable from today's — a pill that grows leftward from the icon to reveal "Chat with us" — but nothing reflows.

## 2. Current behavior

On hover, the label element animates `width` from `0` to `"auto"`, `marginRight` from `0` to `18`, and `opacity` from `0` to `1`, over 320ms. The pill physically grows leftward. On tap it scales to `0.92`. On first mount it fades in from `scale(0.7)`, sliding up 16px over 700ms after a 1.2s delay.

Two of those three hover properties — `width` and `marginRight` — are layout properties.

## 3. Verified evidence from code

**The layout animation** — `components/whatsapp-widget.tsx:52-55`:

```tsx
<motion.span
  initial={false}
  animate={{ width: hovered ? "auto" : 0, opacity: hovered ? 1 : 0, marginRight: hovered ? 18 : 0 }}
  transition={{ duration: 0.32, ease: EASE }}
```

`width` and `marginRight` both trigger layout → paint → composite. The motion rulebook is explicit: animate `transform` and `opacity` only.

Animating **to `width: "auto"`** is worse than an ordinary layout animation. Framer Motion cannot interpolate to `auto`, so on each hover it must apply `width: auto`, force a **synchronous layout read** of the resulting `offsetWidth`, then animate to that pixel value. That is a forced reflow on the main thread.

**The widget is on every page** — verified at `app/layout.tsx:15` and `app/layout.tsx:238`:

```tsx
import { WhatsAppWidget } from "@/components/whatsapp-widget";
...
<WhatsAppWidget />
```

It is mounted in the **root layout**, so the forced reflow above is reachable from every route in the app.

**Two secondary defects in the same file:**

- `components/whatsapp-widget.tsx:23` — `whileTap={{ scale: 0.92 }}`. Press feedback belongs in the 0.95-0.98 band; 0.92 reads as a squash.
- `components/whatsapp-widget.tsx:19` — `initial={{ opacity: 0, scale: 0.7, y: 16 }}`. Entrances should start at 0.9-0.97. `0.7` is a "pop" — the gimmicky register this codebase explicitly rejects.

**No performance number is claimed here.** The forced reflow is a structural fact readable from the code; its cost in milliseconds is **not** estimated and **must be measured** — see §7.

## 4. Files affected

| File | Change |
|---|---|
| `components/whatsapp-widget.tsx` | Full rewrite (lines 1-65) |

Nothing else. `app/layout.tsx` is **not** touched — the named export `WhatsAppWidget` and its props (none) are unchanged, so this is a drop-in replacement.

## 5. Exact implementation steps

### The core idea

You cannot animate a container's *intrinsic* width with transforms — but you don't have to. **Keep the pill permanently at its full expanded width and reveal it with `clip-path`.**

`clip-path: inset(0 0 0 calc(100% - 48px) round 9999px)` shows only the rightmost 48px (the icon). Animating that left inset to `0` sweeps the clip open leftward. Because the element is `position: fixed; right: 24px` — right-anchored — the reveal reads exactly like the pill growing leftward, which is the current behaviour.

`clip-path` is compositor-animatable. No layout, no reflow, no measurement, and it works with **any** intrinsic label width, so nothing is hardcoded and it survives font or copy changes.

Three consequences that drive the design below:

1. **`clip-path` clips `box-shadow`.** The current drop shadow is a `box-shadow` and would be sliced off. Move it to **`filter: drop-shadow()` on the parent wrapper** — `drop-shadow` follows the *clipped silhouette*, so the shadow correctly hugs the pill as it grows. The `inset` highlight stays a `box-shadow` (inset shadows paint inside the clip and are unaffected).
2. **`clip-path` clips hit-testing.** Pointer events do not reach clipped-away regions, so the collapsed tap target is the visible 48px circle — exactly what it is today. This falls out for free.
3. **Hover becomes expressible in pure CSS**, so the component drops React state *and* the motion library.

### Step 1 — Replace the entire file

Replace `components/whatsapp-widget.tsx` with the following. This is a full rewrite, not a patch: the component's structure changes from React state to CSS `:hover`.

```tsx
"use client"
import { MessageCircle } from "lucide-react"

export function WhatsAppWidget() {
  return (
    <>
      <style>{`
        @keyframes wa-enter {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }

        .wa-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: block;
          text-decoration: none;
          /* drop-shadow, NOT box-shadow: it follows the clipped silhouette
             instead of being sliced off by the clip-path on .wa-pill */
          filter: drop-shadow(0 4px 24px color-mix(in srgb, black 35%, transparent));
          opacity: 0;
          animation: wa-enter 260ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms forwards;
        }

        .wa-pill {
          display: inline-flex;
          align-items: center;
          height: 48px;
          width: max-content;          /* STATIC — never animated */
          border-radius: 9999px;
          background: color-mix(in srgb, var(--paper) 62%, transparent);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
          box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);

          /* collapsed: reveal only the rightmost 48px (the icon) */
          clip-path: inset(0 0 0 calc(100% - 48px) round 9999px);
          transition: clip-path 320ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .wa-label {
          font-family: var(--sans);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          padding-left: 4px;
          padding-right: 18px;
          opacity: 0;
          transform: translateX(6px);
          transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
                      transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .wa-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          color: #25D366;
          order: 2;                    /* icon sits on the right */
        }

        /* Hover motion only where hover is real — touch fires false hovers on tap */
        @media (hover: hover) and (pointer: fine) {
          .wa-root:hover .wa-pill {
            clip-path: inset(0 0 0 0 round 9999px);
          }
          .wa-root:hover .wa-label {
            opacity: 1;
            transform: translateX(0);
            transition-delay: 60ms;    /* label fades in just behind the sweep */
          }
        }

        /* Press feedback: 0.97, not a squash */
        .wa-root:active .wa-pill {
          transform: scale(0.97);
          transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1),
                      clip-path 320ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .wa-root {
            animation: none;
            opacity: 1;
          }
          .wa-pill,
          .wa-label {
            transition-duration: 1ms;  /* keep the state change, drop the movement */
          }
          .wa-label { transform: none; }
          .wa-root:active .wa-pill { transform: none; }
        }
      `}</style>

      <a
        className="wa-root"
        href="https://wa.me/919355500199?text=Hi%2C%20I%20need%20help%20with%20StudyLedger"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
      >
        <span className="wa-pill">
          <span className="wa-label">Chat with us</span>
          <span className="wa-icon">
            <MessageCircle size={20} strokeWidth={2.2} />
          </span>
        </span>
      </a>
    </>
  )
}
```

**Why `order: 2` on `.wa-icon`:** the label is written *first* in the DOM so it occupies the left of the flex row; `order` pushes the icon to the right. This pins the icon to the right edge — where the clip originates — while the label extends leftward. It matches the current visual layout, in which the icon is first and the label follows.

### Step 2 — Confirm these are all gone as a result

- `import { motion } from "framer-motion"` (was line 3)
- `import { useState } from "react"` (was line 2)
- `const EASE = [0.16, 1, 0.3, 1] as const` (was line 6) — the curve is now inline in the CSS
- the `hovered` state and its `onMouseEnter` / `onMouseLeave` handlers (were lines 9, 17-18)
- every `motion.*` element and every `animate` / `initial` / `whileHover` / `whileTap` prop

### Step 3 — Do not change

- The `href` (including the prefilled `?text=` query), `target`, `rel`, or `aria-label`. The link destination and its accessible name must be identical.
- Any other file. `app/layout.tsx` keeps its existing import and `<WhatsAppWidget />` usage untouched.

### Repo conventions this follows

- **Injected `<style>` block inside the component** is an established pattern here — see `components/command-palette.tsx:145-278`. Do not add a CSS file; do not put these rules in `globals.css`.
- **Colours must be `var(--…)` tokens or `color-mix(in srgb, …)`. Never raw `rgba()`** — a hard anti-goal in the project's North Star. The brand hex `#25D366` is the one permitted literal and is already in the file.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` is this repo's dominant ease-out and is what the file already uses (`const EASE` at line 6). Reuse it verbatim. *(A separate low-priority finding covers consolidating this into the existing `--ease-out-expo` token at `globals.css:1879`. **Not this plan's job** — hardcode the curve and match the file's current practice.)*
- Quote style in this file: double quotes, **no trailing semicolons** on import lines. Preserve that.

## Preserved visual behaviour — and the three deliberate deviations

| | Before | After |
|---|---|---|
| Resting state | 48×48 frosted circle, green icon, bottom-right, 24px inset | **Identical** |
| Hover | Pill grows leftward, label fades in, 320ms | **Identical** — but via clip-path, not width |
| Shadow | `box-shadow` on the element | `filter: drop-shadow()` on the wrapper — visually equivalent, now follows the clip |
| Entrance | scale **0.7**→1, y 16px, **700ms**, 1.2s delay | scale **0.96**→1, y 12px, **260ms**, 1.2s delay ⚠️ |
| Press | `scale(0.92)` | `scale(0.97)` ⚠️ |
| Hover on touch | Fires on tap (false hover) | **Suppressed** via `@media (hover: hover) and (pointer: fine)` ⚠️ |
| Reduced motion | **Not handled at all** | Entrance and movement dropped; state change preserved |

The three ⚠️ rows are **intentional corrections** required by the motion rulebook, not accidents. If a reviewer asks why the entrance feels calmer: that is the intent.

## 6. Risks

- **`clip-path` + `backdrop-filter` on the same element.** Both sit on `.wa-pill`. Clipping a backdrop-filtered element is well supported in Chromium, WebKit and Gecko, but **Safari is historically the weak spot for both properties**. Failure mode: the frosted blur renders unclipped, or the pill shows a hard rectangular edge. **Safari validation is mandatory — see §7.**
- **`inset(… round 9999px)`** — the `round` keyword is what gives the clip its rounded pill ends. If it is dropped, the collapsed widget renders as a square. Easy to miss in review.
- **`width: max-content` must never be animated.** It is set once, statically. If a future edit adds a `width` transition, this entire plan is undone.
- **Hit-target.** Clipping removes pointer events from the clipped region. This is intended and matches today's 48px circle, but it means a click *just* left of the icon while collapsed will not register — same as today. Confirm it does not feel worse.
- **Low blast radius otherwise:** one file, one component, no shared code, no dependency or schema impact.

## 7. Validation checklist

### Mechanical

```bash
cd "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"
npx tsc --noEmit                          # expect: exit 0
npx eslint components/whatsapp-widget.tsx # expect: exit 0
npx next build                            # expect: exit 0
```

These must return **no matches**:

```bash
grep -n "framer-motion\|useState\|animate=\|whileHover\|whileTap\|motion\." components/whatsapp-widget.tsx
grep -n "width:\s*\"auto\"\|marginRight" components/whatsapp-widget.tsx
grep -n "rgba(" components/whatsapp-widget.tsx     # project anti-goal
```

### Performance — measured, not estimated

This plan claims **no** performance number up front. Produce one here.

**Before** (clean checkout of commit 6699c06):
1. `npm run dev`; open any page; DevTools → **Performance**.
2. Record. Hover the widget in and out **10 times**. Stop.
3. In the flame chart, note: purple **"Layout"** blocks correlated with hovers, and any **"Forced reflow"** warnings in the Summary. Record total *Rendering* + *Painting* time.

**After** (once the rewrite is in):
1. Repeat the identical recording.
2. **Acceptance: zero Layout blocks attributable to widget hover, and zero forced-reflow warnings.** Hover work should appear only under *Compositing*.

Also, DevTools → Rendering → enable **Paint flashing**, hover repeatedly:
- **Before:** the widget region repaints (green flash) on every frame.
- **After:** little or no repaint — `clip-path` and `opacity` composite without repainting.

Report the actual observed numbers. Do not write "~45 KB faster" or any figure you did not measure.

### Feel check (`npm run dev`)

- [ ] On load, the widget fades and rises in gently after ~1.2s. **Calm, not poppy.** No overshoot, no bounce.
- [ ] Hover in: the pill sweeps open leftward; the label fades in just behind the sweep. Reads as **one** gesture, not two.
- [ ] Hover out: closes smoothly, no jump or snap at the end.
- [ ] **Hover in and out rapidly ~10 times.** It must retarget smoothly from wherever it is — no stutter, no restart from zero. (CSS transitions retarget by design; this is a real advantage over the old keyframe/FM approach.)
- [ ] The pill's ends stay **round** throughout — no square corners mid-animation.
- [ ] The drop shadow **hugs the pill as it grows**. It is not sliced flat on the left edge, and it does not sit at the expanded width while the pill is collapsed.
- [ ] Press and hold: a subtle inward press (0.97), not a squash.
- [ ] Click opens WhatsApp with the prefilled message. Link unchanged.
- [ ] **Nothing else on the page moves during hover.** Watch a nearby element — a single pixel of shift means layout is still animating and the plan has failed.
- [ ] DevTools → Animations panel at **10% playback**: the clip sweep and the label fade are coordinated, not fighting.

### Safari — mandatory, do not skip

`clip-path` and `backdrop-filter` are stacked on the same element, and Safari is the highest-risk engine for both. Test on real Safari (macOS or iOS), or WebKit via Playwright:

- [ ] The frosted blur is **clipped to the pill shape** — it does not bleed outside the visible pill while collapsed.
- [ ] The collapsed widget is a **round circle**, not a square or a lozenge with hard corners.
- [ ] The clip sweep animates smoothly, not in steps.
- [ ] The `drop-shadow` renders and follows the pill (Safari has known `filter: drop-shadow` + `backdrop-filter` quirks — confirm the shadow is present at all).
- [ ] If any of the above fails in Safari: **STOP and report.** Do not ship a Chromium-only reveal. The fallback is to gate the clip-path behind `@supports (clip-path: inset(0 round 9999px))` and leave Safari with an opacity-only reveal — but do not implement that without checking back.

### Accessibility

- [ ] `aria-label="Chat with us on WhatsApp"` is intact; the accessible name is unchanged.
- [ ] The link is keyboard-focusable and `:focus-visible` shows a visible ring (browser default is acceptable).
- [ ] **Touch device / DevTools device emulation:** tapping does **not** trigger the hover expansion before navigating — it just opens the link.
- [ ] DevTools → Rendering → **Emulate `prefers-reduced-motion: reduce`**: no entrance animation, no slide; hovering still reveals the label (comprehension preserved) but without the sweep or the label's translate.

## 8. Rollback strategy

Single-file rewrite, no dependencies touched.

```bash
git checkout -- components/whatsapp-widget.tsx
```

No schema, migration, or deploy impact. Fully reversible.

**Cross-plan note:** this file is one of the seven `framer-motion` importers listed in `plans/003-motion-library-consolidation.md`. This plan removes that import entirely. If you roll this back **after** 003 has run, the old `framer-motion` import returns and 003's "zero framer-motion imports" invariant breaks — re-run 003's checklist if that happens.

## 9. Definition of Done

- `components/whatsapp-widget.tsx` contains **no** `width`, `height`, `margin`, `marginRight`, `padding`, `top` or `left` in any `transition` or `animation` declaration.
- The file imports **neither** `framer-motion` **nor** `motion/react`, and uses **no** React state.
- Hover expansion is driven by `clip-path` + `opacity` + `transform` only.
- Hover motion is gated behind `@media (hover: hover) and (pointer: fine)`.
- A `@media (prefers-reduced-motion: reduce)` block exists and drops movement while preserving the label reveal.
- Press feedback is `scale(0.97)`; entrance starts at `scale(0.96)`.
- No `rgba()` literals; colours use `var(--…)` / `color-mix(…)` (the `#25D366` brand green is the one allowed literal).
- `aria-label`, `href`, `target` and `rel` are byte-for-byte unchanged.
- **Measured:** DevTools Performance shows **zero Layout blocks and zero forced reflows** on widget hover, with before/after recordings captured.
- **Verified in Safari/WebKit:** the clipped backdrop-filter renders correctly with rounded ends and a visible drop shadow.
- `npx tsc --noEmit` and `npx next build` both exit 0.
