# ONE STUDYLEDGER — the migration to a single theme

**How 63 pages, four competing style systems and 50,000 lines become one product.**

Governed by `CONSOLE.md`. This document is the *how*; that one is the *what*.

---

## 0. The honest starting position

Measured, not estimated:

| Reality | Number |
|---|---|
| Pages | 63 (46 are tools) |
| Source lines (app + components + lib) | ~50,000 |
| **Competing style systems in production** | **4** |
| Inline `style={{}}` objects in one file | **435** (`exam-practice`) — 346, 307, 268 in the next three |
| Stylesheets | 5, three import scopes |
| Motion libraries shipped simultaneously | **3** (gsap, framer-motion, motion) |
| Files over the 500-line limit | 23 |
| Orphan components | ~20 |
| Tests covering any of this | **0** |

The four systems are: Tailwind + shadcn (installed, barely used), `globals.css` (2,421 lines of accreted SaaS vocabulary), `editorial.css` (801 lines, the newspaper era), and hand-written inline styles (dominant in practice). A `data-ui="editorial"` attribute scope and `next-themes` sit on top.

**This is why the product has no single feel. There is no single system to have one.**

---

## 1. The strategy: strangle, don't rewrite

A big-bang rewrite of 63 pages fails for a reason that has nothing to do with skill: it requires every page to be finished before any page ships, so quality is judged once, at the end, when it is too late to change the language.

Console instead **strangles** the old system. New surfaces are born in Console. Old surfaces are wrapped, then converted, one at a time, each shipping on its own. The old system shrinks until it is empty, then it is deleted.

**Four rules that make it safe:**

1. **Console tokens are scoped to `[data-console]`, never `:root`.** This is not a style preference — it is the mechanism. A custom property resolves from the nearest declaring ancestor, so a Console surface and a legacy page can sit in the same app and be invisible to each other. The previous system declared on `:root` and silently restyled 46 pages.
2. **A page is converted in one commit, or not at all.** No half-converted pages. The blast radius of any change is exactly one route.
3. **Never convert a page and a shared component in the same commit.** If both change and something breaks, you cannot tell which.
4. **Every phase ends green:** `tsc`, `next build`, and the anti-pattern detector.

---

## 2. One theme

**Housing: light.** Cool engineered neutrals, deep navy ink (`#0f1d2b`). Depth is tone — raised is lighter, recessed is darker. No shadows anywhere; a hairline does every job a shadow did.

Dark housing is deferred, not cancelled. It is a second set of values for the same eight tokens and costs roughly a day once the token layer is the only source of colour. It cannot be built until then, which is the point.

## 3. One accent — by having none

**There is no brand accent.** The product does not have "a colour."

Hierarchy is built from size, weight, placement, motion, timing, tonal elevation and tactile feedback. The primary control is filled with **ink**, not a hue — the strongest element uses the strongest neutral.

**The governing test:** strip every coloured element, leaving only typography, spacing, motion and geometry. It must still feel unmistakably premium. If removing colour collapses the hierarchy, the hierarchy was made of colour and the page has failed.

Four hues exist, each meaning exactly one thing — `--progress`, `--info`, `--warn`, `--error`. All AA-verified.

**And colour is earned.** `--vitality` (0–1) is computed from real work and saturates the progress hue. A new student sees a monochrome instrument; a committed one sees a product that came alive because of them. Only `--progress` varies — a warning must never be quieter for a beginner.

## 4. One StudyLedger

Recognisable **in grayscale**. The identity is motion, typography, spacing, interaction and information architecture. Colour supports; it never carries.

---

## 5. The phases

### Phase 0 — Prove the language ✅ COMPLETE
NOW built at full fidelity: tokens, two voices, four motions, the Score, one move, earned colour, the Return beat. Route `/console`, unlinked, zero existing files touched.
**Gate passed:** the direction was approved on sight.

---

### Phase 1 — The foundation · ~1 week
**Objective:** one source of truth for every visual decision, and delete what is already dead.

| Task | Detail |
|---|---|
| Promote the token layer | `app/console/console.css` → `app/tokens.css`, still `[data-console]`-scoped |
| Build the component set | ~15 components: panel, control ×3 tiers, field, readout, track, label, rule, row, chip, tabs, sheet, menu, empty, toast |
| Delete ~20 orphan components | Including two over 380 lines |
| Drop the dependencies they held hostage | `three`, `@react-three/fiber`, `@react-three/drei`, `@splinetool/*` |
| Choose ONE motion library | Console needs none — its four motions are CSS. Remove the two unused |
| Delete `lib/animation.ts` (178 lines, zero importers), `globals-severity-patch.css` (never imported) |

**Exit gate:** the component set renders in isolation; no ad-hoc sizes or colours in new code; bundle measurably smaller; `tsc` + `build` green.

---

### Phase 2 — The shell · ~2 weeks
**Objective:** the three-surface model replaces 46 destinations.

Chrome (wordmark · mode switch · persistent Score · account) · **NOW** · **RECORD** · `⌘K` as primary navigation, with tools as *verbs the workspace performs*.

All 46 tool routes keep working and keep their URLs. They stop being how anyone navigates.

**Exit gate:** any capability reachable in ≤2 keystrokes; no 46-item list anywhere; the Score is visible on every surface.

---

### Phase 3 — WORK, and the top 8 tools · ~3 weeks
**Objective:** one workspace shell that all tools eventually live inside.

Pick the 8 tools by **real usage from PostHog**, not by guess. Convert those 8 into the workspace. The other 38 keep their current pages, wrapped in Console chrome so the app feels whole while its interior is still mixed.

**Exit gate:** the converted 8 are indistinguishable from one another in layout; a student cannot say which "tool" they are in.

---

### Phase 4 — RECORD and onboarding · ~2 weeks
Trajectory, sectors, close history. New first-boot: three questions, one per screen, then straight into NOW with a real starting Score.

**Exit gate:** a new user reaches a real Score in under 60 seconds; every empty state is an invitation with exactly one control.

---

### Phase 5 — The long tail · ongoing, ~1–2 tools per session
The remaining 38 tools, converted in usage order. Then dark housing. Then sound (last, optional, default off).

**Per-tool conversion recipe** — the same six steps every time:
1. Wrap in the Console shell
2. Replace inline styles with tokens and components
3. Split input/output into the standard workspace layout
4. Replace loaders with optimistic UI
5. Rewrite the empty state as an invitation
6. Ship it — one tool, one commit

**Exit gate:** `globals.css` and `editorial.css` are empty and deleted. The `[data-console]` scope is removed because everything is Console.

---

## 6. Sequencing rules

- **Ship continuously.** No six-week branch. Every phase reaches production.
- **Usage order, not alphabetical.** PostHog decides what gets converted next.
- **The flag stays until a surface is genuinely better** than what it replaces.
- **One page per commit.** Blast radius = one route.
- **Green every time:** `tsc`, `next build`, detector.

## 7. What never changes

**The entire backend.** All 25 API routes · the Ledger Score engine and its 60 tests · Supabase schema, auth, RLS · Stripe/billing · crons, notifications, parent portal, email · `lib/tools-registry.ts` and all 46 capabilities · every AI prompt.

**Nothing in this migration requires touching a single API route.** That is deliberate, and it is what makes a redesign of this size survivable by one person.

---

## 8. Definition of done

- One stylesheet of tokens. Zero ad-hoc colours or sizes.
- One motion library (none — CSS).
- `globals.css` and `editorial.css` deleted.
- Zero files over 500 lines in converted code.
- Screenshot any page in grayscale → recognisably StudyLedger.
- Remove every coloured element → hierarchy intact.
- A new student's product is quiet. A committed student's is alive. Neither was given; one was earned.

## 9. Honest risk

**This is months of work for one person alongside exams.** Phases 1–4 are ~8 weeks of focused effort; Phase 5 is open-ended. The plan is built to survive interruption: every phase ships, nothing depends on a later phase to be useful, and stopping after any phase leaves a coherent product rather than a half-migration.

**The single biggest risk is Phase 5 stalling** with 38 tools still on the old system. Mitigation: the Console chrome wraps them from Phase 3, so a partially-migrated product still reads as one product. That is the difference between a slow migration and a visibly broken one.
