# 002 — Make the command palette open instantly; delete its dead animation code

- **Status**: TODO
- **Commit**: 6699c06
- **Severity**: MEDIUM
- **Category**: Purpose & frequency · Easing & duration · Dead code
- **Estimated scope**: 1 file, delete-only (~10 lines removed, 2 attributes removed)

## 1. Goal

Cmd+K opens with **zero animation**. The palette is simply there, then simply gone. All four keyframes and both `data-open` attributes are removed.

**This is a deletion, not a redesign.** The component's markup, focus handling, keyboard navigation, search, and result rendering are all out of scope and must not change.

## 2. Current behavior

Pressing Cmd+K mounts the palette, which then plays a **180ms entrance**: the backdrop fades in, and the panel simultaneously fades, scales `0.96 → 1`, and slides 8px down.

Pressing Cmd+K again (or Esc, or clicking the backdrop) **unmounts it instantly**. There is no exit animation in practice.

The file *contains* exit keyframes and exit rules, including `ease-in` timing — but they never execute. See §3.

## 3. Verified evidence from code

### The exit animation is unreachable — confirmed

Every occurrence of `data-open` in `components/command-palette.tsx`:

```
L159: .cp-backdrop[data-open="true"]  { animation: cp-backdrop-in  180ms ease-out forwards; }
L160: .cp-backdrop[data-open="false"] { animation: cp-backdrop-out 140ms ease-in  forwards; }
L173: .cp-panel[data-open="true"]  { animation: cp-panel-in  180ms ease-out forwards; }
L174: .cp-panel[data-open="false"] { animation: cp-panel-out 140ms ease-in  forwards; }
L283: data-open="true"
L289: data-open="true"
```

The attribute is written in JSX **only ever as the literal string `"true"`** (L283 on the backdrop, L289 on the panel). It is never bound to state and never set to `"false"`. Therefore the `[data-open="false"]` selectors at **L160 and L174 can never match**.

Confirmed by the render guard at **L280**:

```tsx
{open && (
```

The component is **conditionally rendered**. When `open` is false the subtree unmounts entirely — there is no element left in the DOM for an exit animation to play on.

**Conclusion: close is already instant. Only the entrance (L159, L173) actually executes.** The `-out` keyframes, the `[data-open="false"]` rules, and both `data-open` attributes are all dead code.

> When you delete the `-out` keyframes and observe **no visual change on close**, that is expected and correct. They were never firing.

### Why the entrance should go

The command palette is the highest-frequency interaction in StudyLedger — a power user hits Cmd+K dozens to hundreds of times a day. The motion rulebook's frequency band is unambiguous:

> 100+ times/day (keyboard shortcuts, command palette toggle) → **No animation. Ever.**

Raycast — the reference implementation — has no open/close transition, and that is exactly why it feels instant. A 180ms entrance inserts 180ms of visible settling between the user's intent and their ability to read the list, every single time.

Secondary: because the palette unmounts and remounts, a rapid double-tap of Cmd+K **restarts the CSS keyframe from zero**. Keyframes do not retarget from their current state the way transitions do. Spamming Cmd+K therefore produces a visible stutter.

### `ease-in` — dead, but must not survive

L160 and L174 use `ease-in`. `ease-in` on UI is always a defect: it starts slow, delaying the exact moment the user is watching. It is unreachable here, but it must be **deleted rather than left in place**, so it cannot be copy-pasted into somewhere it *would* run.

### There is no reduced-motion guard

The `<style>` block injected by this component (L145-278) contains **no** `@media (prefers-reduced-motion: reduce)` rule. The 180ms entrance therefore played regardless of the user's OS setting — a real accessibility gap. Removing the animation closes it trivially: there is nothing left to reduce.

## 4. Files affected

| File | Change |
|---|---|
| `components/command-palette.tsx` | Delete 4 keyframes, 4 animation rules, 2 attributes |

Nothing else.

## 5. Exact implementation steps

All edits are in `components/command-palette.tsx`.

### Step 1 — Delete the four `@keyframes` blocks (lines 146-149)

```css
/* DELETE all four of these lines */
@keyframes cp-backdrop-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes cp-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes cp-panel-in  { from { opacity: 0; transform: scale(0.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes cp-panel-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.96) translateY(-8px); } }
```

Remove the trailing blank line they leave behind, if one remains.

### Step 2 — Delete the two `.cp-backdrop` animation rules (lines 159-160)

```css
/* DELETE both of these lines */
.cp-backdrop[data-open="true"]  { animation: cp-backdrop-in  180ms ease-out forwards; }
.cp-backdrop[data-open="false"] { animation: cp-backdrop-out 140ms ease-in  forwards; }
```

⚠️ **Do NOT delete the `.cp-backdrop { … }` block immediately above them (lines 151-158).** It carries `position: fixed`, `inset: 0`, `z-index`, the flex centering, the background and the `backdrop-filter`. Removing it breaks the overlay entirely.

### Step 3 — Delete the two `.cp-panel` animation rules (lines 173-174)

```css
/* DELETE both of these lines */
.cp-panel[data-open="true"]  { animation: cp-panel-in  180ms ease-out forwards; }
.cp-panel[data-open="false"] { animation: cp-panel-out 140ms ease-in  forwards; }
```

⚠️ **Do NOT delete the `.cp-panel { … }` block above them (lines 162-172).** It carries width, max-width, background, border, radius, max-height, overflow and box-shadow.

### Step 4 — Remove `data-open="true"` from the backdrop (line 283)

```tsx
/* before */
<div
  className="cp-backdrop"
  data-open="true"        // ← remove this line
  onClick={close}
  role="presentation"
>
```

Leave `className`, `onClick` and `role` untouched.

### Step 5 — Remove `data-open="true"` from the panel (line 289)

```tsx
/* before */
<div
  className="cp-panel"
  data-open="true"        // ← remove this line
  role="dialog"
  aria-label="Command palette"
  aria-modal="true"
  onClick={e => e.stopPropagation()}
>
```

Leave `className`, `role`, `aria-label`, `aria-modal` and `onClick` untouched.

### Step 6 — Do NOT modify any of the following

These are correct and explicitly out of scope:

- **Focus handling, lines 118-124** — the `triggerRef` capture, `setRecents(getRecentTools())`, and `setTimeout(() => inputRef.current?.focus(), 30)`. **Focus behaviour must remain byte-for-byte identical.** The 30ms delay stays exactly as it is; do not "optimise" it now that the animation is gone.
- **`close()` callback, lines 88-93** — including `triggerRef.current?.focus?.()`, which restores focus to the element that was focused before the palette opened.
- **Cmd+K toggle handler, lines 103-113.**
- **Keyboard navigation, `onKeyDown`, lines 133-138** — Escape / ArrowUp / ArrowDown / Enter.
- **`.cp-item` hover transition, line 220** — `transition: background 80ms ease`. This is a short, cheap hover transition and is **correct**. The rule being applied by this plan is about *open/close motion on a high-frequency toggle*, not about hover feedback. Leave it.
- **`.cp-esc-btn` transition, line 208** — `transition: color 120ms ease, border-color 120ms ease`. Same reasoning. Leave it.

### Repo conventions

- The component injects its CSS via a `<style>{`…`}</style>` block inside the JSX (lines 145-278). **Keep that pattern** — do not extract to `globals.css`.
- You are removing only `@keyframes` blocks and `animation:` declarations. Every static style rule stays.

## Before / after behaviour

| | Before | After |
|---|---|---|
| **Cmd+K (open)** | Backdrop fades in over 180ms; panel fades, scales 0.96→1, slides 8px down. The panel is still visibly settling while the user is trying to read it. | **Fully present on the frame it mounts.** |
| **Cmd+K / Esc / backdrop click (close)** | Unmounts instantly. (The `-out` keyframes never ran.) | **Unchanged** — unmounts instantly. |
| **Double-tap Cmd+K** | Remount **restarts the 180ms keyframe from zero** → visible stutter. | Nothing to restart. A pure mount/unmount. |
| **Focus** | Input focused ~30ms after open; close returns focus to the previously-active element. | **Identical. Not touched by this plan.** |
| **`prefers-reduced-motion`** | **Not respected** — the entrance played regardless. | Trivially compliant: no motion to reduce. |

## 6. Risks

- **Very low.** This plan deletes CSS and two inert attributes. No JavaScript logic, no markup structure, no focus handling, no accessibility attributes change.
- **The one real hazard: deleting the wrong CSS block.** `.cp-backdrop` and `.cp-panel` each have a *static* block sitting directly above their *animation* rules, and they look similar at a glance. Deleting the static block would render the palette invisible or unstyled. Steps 2 and 3 flag this explicitly — re-read them before editing.
- **Regression risk on focus:** none, provided Step 6 is honoured. Focus is the single most likely thing to break in a command palette and is the reason Step 6 exists.
- If a future contributor wants a "premium" feel restored here, the correct answer remains **no animation**. Do not reintroduce it.

## 7. Validation checklist

### Mechanical

```bash
cd "C:\Users\DELL\Downloads\design_handoff_ledger\ledger"
npx tsc --noEmit                            # expect: exit 0
npx eslint components/command-palette.tsx   # expect: exit 0
npx next build                              # expect: exit 0
```

Every one of these must return **no matches**:

```bash
grep -n "cp-backdrop-in\|cp-backdrop-out\|cp-panel-in\|cp-panel-out" components/command-palette.tsx
grep -n "data-open" components/command-palette.tsx
grep -n "animation:" components/command-palette.tsx
```

And these must **still match** (proof the static styles survived):

```bash
grep -n "\.cp-backdrop {" components/command-palette.tsx     # expect: 1 match
grep -n "\.cp-panel {" components/command-palette.tsx        # expect: 1 match
grep -n "transition: background 80ms ease" components/command-palette.tsx  # expect: 1 match (.cp-item)
```

### Feel check (`npm run dev`, any page)

- [ ] Press Cmd+K (or Ctrl+K). The palette is **fully rendered on the first frame** — no fade, no scale, no slide.
- [ ] Press Cmd+K again. It disappears instantly.
- [ ] **Spam Cmd+K rapidly ~10 times.** No stutter, no half-faded frame, no flicker. **This is the specific regression this plan exists to kill.**
- [ ] DevTools → Animations panel, playback **10%**, press Cmd+K. **Zero animations should be recorded** on the backdrop or panel. If the panel captures anything, a rule was missed.
- [ ] The backdrop still renders: dimmed, blurred, covering the viewport. (Proves the static `.cp-backdrop` block survived.)
- [ ] The panel still renders: correct width, radius, border, shadow, max-height. (Proves the static `.cp-panel` block survived.)
- [ ] Hovering a result row still shows the 80ms background tint. **This transition is intentional and must survive.**

### Focus & accessibility — the highest-risk area

- [ ] Press Cmd+K, then **immediately type**. The very first keystroke lands in the search input.
- [ ] Press **Esc**. The palette closes and focus returns to whatever element was focused before it opened.
- [ ] **Click the backdrop.** Palette closes; focus returns to the trigger.
- [ ] Click the **ESC button** in the header. Same.
- [ ] **ArrowDown / ArrowUp** move the selection; the active row scrolls into view; **Enter** navigates to the selected tool.
- [ ] The panel still exposes `role="dialog"`, `aria-modal="true"` and `aria-label="Command palette"`. (Verify in the Accessibility tree — Steps 4-5 remove only `data-open`, and it is easy to fat-finger an adjacent ARIA attribute.)
- [ ] Typing filters results; clearing the query restores quick actions + recents.
- [ ] DevTools → Rendering → **Emulate `prefers-reduced-motion: reduce`**, press Cmd+K. Identical instant behaviour. (Before this plan, the entrance played here regardless — this closes that gap.)

## 8. Rollback strategy

Single-file, delete-only change.

```bash
git checkout -- components/command-palette.tsx
```

No dependency changes, no migrations, no schema impact, no cross-plan coupling. Reverting restores the previous behaviour exactly.

## 9. Definition of Done

- All four `@keyframes` blocks (`cp-backdrop-in`/`-out`, `cp-panel-in`/`-out`) are gone.
- All four `animation:` declarations on `.cp-backdrop` and `.cp-panel` are gone.
- Both `data-open="true"` attributes are gone.
- The static `.cp-backdrop` and `.cp-panel` style blocks are **intact and unmodified**.
- `.cp-item`'s 80ms hover transition and `.cp-esc-btn`'s 120ms transition **survive**.
- `grep -n "animation:\|data-open" components/command-palette.tsx` returns nothing.
- `npx tsc --noEmit` and `npx next build` both exit 0.
- DevTools Animations panel records **zero** animations when opening the palette.
- **Focus behaviour on open, Esc, backdrop-click and ESC-button is unchanged**, and `role`/`aria-modal`/`aria-label` are intact.
- Spamming Cmd+K produces no visual stutter.
