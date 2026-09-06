# 003 — Take the answer accordion off the layout path

- **Status**: DONE
- **Commit**: 2664e37
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, small

## Problem

The question/answer accordion animates `height` from `0` to `auto`. Height is a
layout property: every frame triggers layout, then paint, then composite, for
the whole subtree. Only `transform` and `opacity` can be composited on their own.

```tsx
/* components/tools/ai-tool.tsx:351-358 — current */
<AnimatePresence initial={false}>
  {isOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden"
    >
```

This sits on the QA result path, where a student opens several answers in a row,
often on a mid-range Android phone. `height: auto` also forces framer-motion to
measure the content on every open.

## Target

A CSS grid row that travels from `0fr` to `1fr`. The browser can do this without
the caller ever knowing the content's pixel height, and framer-motion is not
involved at all.

```tsx
/* target — replaces the AnimatePresence block entirely */
<div
  className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
>
  <div className="overflow-hidden">
    {/* the existing answer markup, unchanged */}
  </div>
</div>
```

Exact values:

- Duration: **200ms**. The playbook's budget for a dropdown or a disclosure is
  150-250ms; the current 180ms is already inside it, and 200 sits on the repo's
  existing scale.
- Easing: **`cubic-bezier(0.22, 1, 0.36, 1)`**, this repo's entrance curve.
- Reduced motion: `motion-reduce:transition-none`, so the row snaps.

The `opacity` fade is dropped deliberately. It was there to hide the content
being clipped mid-height; with `overflow-hidden` on the inner wrapper the clip
is clean on its own, and one fewer animated property is one fewer thing to
schedule.

## Repo conventions to follow

- This codebase writes arbitrary easing values as Tailwind arbitrary variants,
  not inline styles. **Exemplar: `components/ui/button-classes.ts:40`** —
  `duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]`. Note there are no spaces
  inside the `cubic-bezier(...)` in that form; Tailwind requires that.
- Reduced motion at component level uses the `motion-reduce:` variant.
  **Exemplar: `components/ui/button-classes.ts:42`**.
- `AnimatePresence` remains in use elsewhere in this same file and in
  `components/dashboard/quick-log.tsx`; only this one usage goes.

## Steps

1. Open `components/tools/ai-tool.tsx` and find the block at lines 351-372
   (the `<AnimatePresence initial={false}>` wrapping the answer body inside
   `QaResult`).
2. Replace the `<AnimatePresence>` / `<motion.div>` wrapper with the two-`div`
   grid structure from **Target**, keeping every child element inside it byte
   for byte, including the `<div className="border-t border-border px-3.5 pb-3.5 pt-3">`
   and everything nested in it.
3. Remove the `{isOpen && (...)}` conditional. The content must now always be in
   the DOM so the grid row has something to collapse; `0fr` plus
   `overflow-hidden` is what hides it.
4. Add `aria-hidden={!isOpen}` to the outer grid div, so the collapsed copy is
   not announced by a screen reader now that it is always rendered.
5. Check whether `AnimatePresence` and `motion` are still referenced elsewhere
   in the file. If either is now unused, remove it from the import on line 4.
   If still used, leave the import alone.

## Boundaries

- Do NOT touch the chevron rotation on line 348; it already animates `transform`
  and is correct.
- Do NOT touch any other `AnimatePresence` in the codebase.
- Do NOT change the accordion's toggle logic, `toggle(i)`, or the `missed`
  state and its button.
- Do NOT change the answer markup itself, only its wrapper.
- If lines 351-372 do not match the excerpt, STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` exits 0. `npx next build` compiles.
  `npx eslint components/tools/ai-tool.tsx` reports no unused-import error.
- **Feel check**: run the app, open an AI tool with a QA result (Practice Sets
  or Exam Simulator), generate a set, then:
  - Open and close one answer. The reveal should look the same as before.
  - Open three in a row quickly. The rows should not restart or jump.
  - In DevTools Performance, record while opening two answers. Confirm the
    frames show no purple "Layout" bars for the accordion itself.
  - With "Emulate prefers-reduced-motion: reduce" on, the answer should appear
    instantly with no travel.
  - Tab to a collapsed answer's button and press Enter; a screen reader should
    not have announced the collapsed answer text before it was opened.
- **Done when**: opening an answer produces no layout thrash in a Performance
  recording, and the visible result is indistinguishable from the current
  behaviour to the naked eye.

## Outcome (execution, 2026-09-06)

Applied as written. Step 5 resolved as: `motion` and `AnimatePresence` were both
left unused in `components/tools/ai-tool.tsx`, so the framer-motion import was
removed from that file entirely.
