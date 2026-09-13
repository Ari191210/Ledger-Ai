# StudyLedger motion brief

What animations the site needs, what it already has, and what it must never
get. Written 2026-09-11 from a read of every component, `app/globals.css`,
`REFERENCE.md` and `DESIGN.md`. Read those two files before this one.

**Identity:** screen-native Braun. An instrument panel, not a toy. Motion
exists to show that something happened, where it went, or that a wait is
real. It never exists to decorate.

---

## Rules that apply to every item

1. **Plays into the resting state.** The server-rendered first paint must
   already be correct and readable. If an animation never runs (slow phone,
   hidden tab, reduced motion), nothing is missing.
2. **Triggered by the user, never by itself.** No loops, pulses, shimmer,
   idle or attract animations. The founder reverted a self-playing dial
   power-on the same day it shipped because it read as the dial moving on its
   own. Scroll counts as a user action; a timer does not.
3. **Only the two house curves.**
   - `ease-out` = `cubic-bezier(0.22, 1, 0.36, 1)` for entrances, exits, presses
   - `ease-spring` = the sampled `linear()` spring in `globals.css` for things
     that travel and settle (pills, knobs, toggles, bars)
   - Exception already in use: ring arc and number count-up use easeOutCubic
     `cubic-bezier(0.33, 1, 0.68, 1)` so digits and arc stay in lockstep.
4. **Durations stay in the existing budget:** 70ms press · 140 to 190ms small
   state changes · 220 to 260ms travel · 360ms section entrance · 750 to
   900ms only for the score counting to its value.
5. **Reduced motion follows the house rule:** narrow `transition-property`
   to opacity, colour, border and shadow. Movement goes; feedback stays. Do
   not zero every duration.
6. **Lime never moves for decoration.** One lime element per panel still
   applies mid-animation. Nothing may duplicate, trail, glow-pulse or sweep
   lime.
7. **No new dependencies.** CSS transitions and keyframes, or a
   `requestAnimationFrame` loop for counting. Name `translate` / `scale` /
   `rotate` in transitions, never `transform` (Tailwind v4 writes the
   individual properties, so a `transform` transition animates nothing).

---

## A. Already built. Keep exactly as is.

| Where | What it does | Values |
|---|---|---|
| Button, Google button, filter pills, chip group | hover lift 1px, press drop 2px + scale, spring release, click sound on pointerdown | press 70ms `ease-out` to 0.965 (pills 0.97); release 190ms `ease-spring` |
| Segmented | lime pill slides to the active tab | `left`/`width` 260ms `ease-spring`, no animation on first paint |
| Toggle switch | knob slides, track recolours | `translate` 260ms `ease-spring`; colours 200ms |
| Knob (what-if dial, scrub dial) | rotates between detents | `rotate` 260ms `ease-spring`, 90ms while dragging |
| Score ring | arc fills to value, dial-tip knob rides the arc tip | 750ms easeOutCubic |
| StatNumber / CountUp | headline figures count up | 900ms rAF, easeOutCubic |
| Score card pillar bars | width follows the what-if dial | 190ms `ease-spring` |
| Reveal | dashboard sections rise in | 360ms `ease-out`, 10px rise, delay per section |
| ScrollGroup | marketing items stagger in on scroll | 500ms `ease-out`, 18px rise, 70ms steps, capped at 8 |
| Quick Log modal | backdrop fades, panel rises | 160ms fade; 220ms rise from 12px + 0.97 |
| Landing hero | dial counts 0 to 742 as you scroll, front-loaded inside ~450px | scroll-scrubbed; ticks always match the number |
| Hero caption | swaps with a short rise | 300ms `ease-out`, 8px |
| 3D scenes | animate the physics answer | rAF, paused under reduced motion |
| Cards, nav items, calendar days | hover recolour | 140ms colours |

---

## B. Needed. Ordered by how much a student feels the gap.

### 1. List rows leave visibly (habits, deadlines, review queue)
**Why:** these are optimistic updates. A row is filtered out the instant you
press, so you cannot see which one left, and a mis-tap is invisible.
**Motion:** row fades and collapses its height, then the rows below close
the gap.
- 180ms `ease-out`: `opacity` 1 to 0, height to 0 (`grid-template-rows`
  1fr to 0fr, or measured height), margins collapse with it
- Rows below move up as a consequence of the collapse, not separately
- New rows (add deadline, add habit) enter with the existing `reveal-in`
- Review queue: when the last card leaves, "Queue clear" enters with
  `reveal-in` rather than replacing the list in one frame
- **Build note:** keep the row mounted in a `leaving` state for 180ms before
  the optimistic filter removes it. If the server rejects the write, the row
  reverts and should re-enter with `reveal-in`.
- **Reduced motion:** opacity only, no collapse.

### 2. The AI answer wait (every AI tool)
**Why:** the longest wait in the product, currently one static line
("working on it") for several seconds. Static reads as frozen.
**Motion:** not a spinner, not a shimmer. An instrument readout.
- Pressing generate: button label swaps to "thinking…" (exists)
- Right pane shows a mono elapsed counter, `working · 4s`, ticking once per
  second. It is a clock, which is information, not decoration.
- Answer arrives: pane content enters with `reveal-in` (360ms). The 3D scene
  below it enters 80ms later.
- Error arrives: same entrance, no shake.
- **Reduced motion:** counter still ticks (it is text), entrance is opacity only.
- **Founder call:** confirm a ticking counter is acceptable under rule 2. It
  starts on a press, but it does keep changing while you wait.

### 3. Quick Log closes, not vanishes
**Why:** it has an entrance but unmounts in one frame, so a successful save
and a dismissed modal look identical.
**Motion:** reverse of the entrance, shorter.
- 140ms `ease-out`: panel `opacity` to 0 and drops 6px; backdrop fades
- Keep the modal mounted for 140ms after `setOpen(false)`
- **Reduced motion:** fade only.

### 4. The number moves when you log something
**Why:** the whole product is "your actions change your score". Right now a
Quick Log save changes the top-bar score and streak chips with no sign that
anything happened.
**Motion:** the changed chip counts from old value to new.
- 600ms easeOutCubic via the existing CountUp, from previous value
- Only when the value actually changed, never on page load
- **Build note:** chips are server-streamed; the previous value has to be
  held client-side across the refresh.
- **Reduced motion:** number swaps instantly.

### 5. Navigation shows where you went
**Why:** the icon rail's active bar and the mobile tab bar jump between
items. Segmented already proves the travelling-indicator pattern.
- Icon rail: the 3px lime bar travels to the new item, `translate` 260ms
  `ease-spring`
- Mobile tab bar: add the same travelling indicator above the active tab
  (one lime element, it moves rather than appearing twice)
- **Reduced motion:** indicator appears in place.

### 6. Page loads show a panel, not a blank
**Why:** there is no `loading.tsx` anywhere, so slow navigations show the old
page or nothing.
- A `loading.tsx` per app segment rendering the page's card outlines as
  static `u-card u-grille` panels with a mono `loading` label
- **No shimmer, no pulse** (rule 2). Flat is evidence, not emptiness.
- Real content replaces it with `reveal-in`.

### 7. Small consistency fixes
- Syllabus coverage bar: `transition-[width]` has no duration or curve; use
  190ms `ease-spring` like the score card bars
- Theme toggle: icon crossfades with a small rotate, 190ms `ease-out`
- Focus timer preset buttons: add the pill press (70ms scale 0.97, 190ms spring)
- Calendar day selection: selected ring appears with 140ms colour, as hover does

---

## C. Never. Do not propose these.

- Loading shimmer, skeleton pulse, spinners that loop
- Idle, ambient or attract animations of any kind, including the dial or
  any tick sequence playing on its own
- Confetti, celebration bursts, streak fire, bouncing badges
- Parallax, scroll-jacking beyond the existing hero pin
- Glow pulses on the LED dot or anything lime
- Gradients, glassmorphism, floating-card shadows appearing on hover
- Page-wide slide transitions between routes
- Shake animations on errors
- A command palette opening animation (the palette itself is banned)
- Any animation library

---

## Handoff

Every item in section B names its trigger, property, duration, curve and
reduced-motion behaviour, so it can be built directly. A design canvas can
show start and end frames; the values above are the spec.
