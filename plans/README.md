# Animation plans

Produced by an animation audit at commit `2664e37`. Each plan is self-contained:
an executor with no other context can run it top to bottom.

The audit's guiding conclusion, worth keeping in view while executing these:
**this product does not need more decorative motion.** It already has entrance
staggers on every screen. What it lacks is motion at the moments when something
actually changed, which is why the interface can feel inert despite animating a
lot. Plan 001 is the one that addresses that directly; the rest clear the way.

| # | Title | Severity | Status |
|---|---|---|---|
| [001](001-animate-the-ring-to-its-value.md) | Animate the score ring to its value, in step with its readout | HIGH | DONE |
| [002](002-scope-the-reduced-motion-block.md) | Scope the reduced-motion block to movement, not to everything | HIGH | DONE |
| [003](003-accordion-off-the-layout-path.md) | Take the answer accordion off the layout path | MEDIUM | DONE |

## Status

All three executed on 2026-09-06 in the order below. Plan 001's specified easing
was wrong and was corrected during execution; see its Outcome section.

## Recommended order

**002, then 001, then 003.**

- **002 first**, and this ordering is load-bearing. The current global rule forces
  `transition-duration: 0.01ms !important` on every element, so the ring
  transition added in 001 would be silently dead under reduced motion and, worse,
  would appear to work when tested without it. Scoping the block first means 001
  can be verified honestly.
- **001 second.** It depends on 002 only for its reduced-motion verification step.
- **003 is independent** and can be done at any point, by anyone, in parallel.

## Not planned, deliberately

The audit surfaced four more findings that were verified but not turned into
plans, because their leverage is low and two of them argue against each other:

- **Dashboard entrance stagger** (12 `<Reveal>`, 360ms, delays to 0.18s) exceeds
  the 300ms UI budget on the highest-frequency screen. The playbook says reduce
  it. The owner's stated direction is a more active-feeling site. These pull in
  opposite directions and the call is a product one, not a technical one.
- **Hero caption uses `@keyframes` restarted by re-keying**, which restarts from
  zero when scroll swaps captions rapidly. Real, but only reachable by scrubbing
  the hero fast, and the landing hero was reworked twice on the audit date.
- **No shared `--ease-*` / `--duration-*` tokens.** `cubic-bezier(0.22, 1, 0.36, 1)`
  is hand-typed in six places across CSS and JS. They all currently match
  exactly, so this is a maintenance risk rather than a live defect.
- **`scale: 0.8` on the settings "saved" badge** (`components/settings/settings-form.tsx:57`)
  against a recommended floor of 0.9. One value, occasional element.

## Also worth knowing

Three things the playbook hunts for are absent from this codebase and were
checked: no `ease-in` on any UI, no `transition: all`, no `scale(0)`, and no
animated layout properties other than the accordion in plan 003. Hover motion is
correctly gated behind `@media (hover: hover)` by Tailwind v4, verified in the
built CSS rather than assumed.
