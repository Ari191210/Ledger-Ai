# 002 — Scope the reduced-motion block to movement, not to everything

- **Status**: DONE
- **Commit**: 2664e37
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1 file, small

## Problem

The global reduced-motion rule is the sledgehammer pattern: it sets every
animation and every transition on every element to effectively zero.

```css
/* app/globals.css:200-205 — current */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Reduced motion means fewer and gentler animations, **not zero**. Transitions
that aid comprehension should survive; only movement should go. This rule kills:

- `.u-card`'s `border-color` and `background-color` transition
  (`app/globals.css:250`), which is how a card shows it is hoverable.
- Every `transition-colors` in the product: `components/ui/segmented.tsx:46`,
  `components/ui/toggle-switch.tsx:27`, `components/app-shell/icon-rail.tsx:54`,
  `components/ui/chip-group.tsx:32`, `components/ui/filter-pills.tsx:28`,
  `components/tools/tools-grid.tsx:83`, `components/tools/focus-timer.tsx:154`.
- The colour half of the button's feedback in
  `components/ui/button-classes.ts:40`.

It also makes the careful per-component handling elsewhere unreachable, because
`!important` on `*` outranks it: `motion-reduce:` variants in
`components/ui/button-classes.ts:42`, `useReducedMotion()` in
`components/motion/reveal.tsx:14`, and the matchMedia branches in
`components/motion/scroll-reveal.tsx:19`, `components/ui/stat-number.tsx:23`,
`components/motion/count-up.tsx:26` and
`components/marketing/hero-scroll.tsx:105`. Someone reading those files would
reasonably believe they are what governs reduced motion. They are not.

## Target

Kill movement and scaling. Keep colour, opacity and border feedback.

```css
/* app/globals.css — target, replacing the block above */
@media (prefers-reduced-motion: reduce) {
  /* Movement goes. Colour, opacity and border feedback stay, because they
     tell the user what is interactive and what just changed, and losing
     them makes the interface harder to read rather than calmer.
     Scoped to transform so the per-component handling in the components
     themselves is still what governs everything else. */
  *, *::before, *::after {
    transition-property: opacity, color, background-color, border-color, box-shadow, fill, stroke;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

Note what changed and why each part is as written:

- `transition-duration` is **no longer forced to zero**, so colour transitions
  keep their real duration.
- `transition-property` is narrowed to the non-moving properties, so any
  `transform` transition simply has nothing to animate. This is what removes
  movement, and it does so without `!important` on duration.
- `animation-duration` **stays** forced, because keyframe animations in this
  codebase are movement (`hero-caption-in` at `app/globals.css:304` translates
  on the Y axis).
- `animation-iteration-count: 1` stops any infinite animation from looping.
- `scroll-behavior: auto` is added because smooth scrolling is movement too.

## Repo conventions to follow

- The block lives in `@layer base` in `app/globals.css`, immediately after the
  `h1, h2, h3, h4` rule. Keep it there; do not move it to another layer.
- This codebase writes multi-line CSS comments above the rule they explain, in
  prose, saying **why** rather than what. **Exemplar: `app/globals.css:266-268`**
  (the `[data-scroll-group]` comment). Match that voice.

## Steps

1. Open `app/globals.css` and locate the block at lines 200-205 quoted above.
2. Replace it wholesale with the **Target** block, comment included.
3. Change nothing else in the file. In particular leave the second
   reduced-motion block (the one inside `@layer components` that handles
   `[data-scroll-group] .scroll-item`, around line 292) exactly as it is: it
   sets `opacity: 1; transform: none; transition: none;` and is still correct
   and still needed.

## Boundaries

- Do NOT touch any component file. This plan is one CSS block.
- Do NOT remove the per-component reduced-motion handling; scoping this rule is
  what finally makes that handling take effect.
- Do NOT add `transform` to the `transition-property` list. Its absence is the
  entire mechanism.
- If the block at 200-205 does not match the excerpt, STOP and report.

## Verification

- **Mechanical**: `npx next build` compiles. There is no CSS test suite; the
  build succeeding is the only mechanical gate.
- **Feel check**: in DevTools Rendering, enable "Emulate prefers-reduced-motion:
  reduce", then:
  - Hover a `.u-card` on `/tools`. The border and background should still ease
    between states, not snap.
  - Click through the Segmented control on an AI tool page. The colour change
    should still be smooth; the lime pill should not slide.
  - Load `/dashboard`. Sections should appear immediately with no upward drift.
  - Load the landing page. The hero should be lit with no sweep, the scroll
    sections visible with no rise, and the caption should not translate.
  - Press a button. It should change colour but must not lift or compress.
- **Done when**: with reduced motion emulated, no element changes position or
  scale anywhere in the product, and hover/active colour feedback is still
  visibly animated on cards, buttons, segmented controls and the icon rail.

## Outcome (execution, 2026-09-06)

Applied as written, no deviations.
