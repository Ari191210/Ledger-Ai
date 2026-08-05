> # ARCHIVED — NOT GOVERNING
>
> **Moved to `docs/archive/` on 2026-08-05. This file decides nothing.**
>
> Design + product law. SPLIT into PRODUCT_PRINCIPLES.md (sections 0-9) and PRODUCT_DECISIONS.md (5.1, 8, 12). Its section 13 roadmap was superseded by EXECUTION_PLAN.md milestones.
>
> Authority now lives in **`PRODUCT_PRINCIPLES.md`**, **`PRODUCT_DECISIONS.md`**,
> **`EXECUTION_PLAN.md`** and **`CLAUDE.md`** — see `docs/GOVERNANCE_MAPPING.md` for a
> statement-by-statement map of where everything went.
>
> Retained because the reasoning is worth keeping. **Do not follow it.**

---
# CONSOLE â€” The StudyLedger Design Constitution, v3

**Ratified 2026-08-04. This document supersedes `PRODUCT_CONSTITUTION.md`, the visual
sections of `PRODUCT.md`, and `DESIGN.md`.** Those three contradicted each other on the
same pixels â€” aurora-and-glass vs editorial-paper vs tonal-glass â€” and the product landed
in the gap between them. There is now one law. Where an older document disagrees with this
one, this one wins. Archive them; do not delete them (they hold real reasoning worth
keeping).

---

## 0. The name

The design language is **Console**.

Four meanings, all intended:

1. **A control surface.** Not a page you read â€” a panel you operate.
2. **A game console.** The thing you *want* to switch on. PS5/Switch, not LMS.
3. **A console as in cabinet** â€” engineered, housed, physical. Teenage Engineering.
4. **To console.** The product's emotional job is to reduce a scared student's anxiety.

If a design decision doesn't serve at least one of those four, it isn't Console.

---

## 1. Product Constitution

### 1.1 What StudyLedger is
The **student operating system**: one place a student opens to know where they stand and
what to do next, with the capability to actually do it. Not a tools directory. Not a
dashboard. Not an AI product.

### 1.2 The one question
Every screen answers exactly one question. If a screen answers two, it is two screens.
The home surface's question is: **"What do I do right now?"**

### 1.3 The prime directive
> **A student should open StudyLedger and feel more capable than they did ten seconds ago.**

That is the only success metric that matters at the design level. Retention, DAU, and
session length are consequences, never goals.

### 1.4 The nine laws

1. **Nothing is decorative.** Every pixel is load-bearing or it is deleted. If you cannot
   name the function of an element in five words, remove it.
2. **The interface is hardware.** It has weight, travel, detents, and resistance. Things
   are pressed, not clicked. Panels slide, they don't fade.
3. **Colour is information.** Colour never expresses mood, brand, or emphasis. A coloured
   thing is a thing that *means* something. Grey is the default state of the universe.
4. **Motion is physics, not decoration.** Everything that moves obeys mass and spring.
   Nothing eases for prettiness.
5. **Numbers are the heroes.** This is a product about figures. Typography exists to serve
   numerals; numerals are set large, tabular, and mechanical.
6. **Never gamify. Always reward.** No points, badges, streak-shaming, confetti, mascots,
   or levels. Reward is *the honest depiction of real progress*, rendered beautifully.
7. **Never lie.** No fabricated trend, forecast, or encouragement. An honest empty state
   beats a fake number, always. (Inherited unchanged from the previous constitution â€” the
   one rule that was always right.)
8. **One workspace, many modes.** The student is never "opening a tool." They are working,
   and the workspace changes shape around the task.
9. **Speed is the feature.** Perceived latency is a design defect. Optimistic UI by
   default; skeletons never; layout shift never.

### 1.5 Banned, permanently
Glassmorphism Â· blurred orbs Â· aurora/animated backgrounds Â· purpleâ†’blue gradients Â·
gradient text Â· glow as emphasis Â· custom cursors Â· cursor trails Â· typing effects Â·
AI avatars Â· robot/sparkle iconography Â· confetti Â· mascots Â· badges Â· XP Â· levels Â·
newspaper column layouts Â· article typography Â· rounded-card grids where every card is
identical Â· drop shadows as elevation Â· "unlock your potential"-class copy Â· the words
"AI-powered", "supercharge", "revolutionise" Â· tiny uppercase tracked eyebrows above every
section Â· testimonial carousels.

### 1.6 The influence rule

**Study why the references work. Never copy how they look.**

Teenage Engineering, Nothing, Apple, Linear, Arc, Raycast and the console makers are on
this list for their *reasoning*, not their appearance. What we take from them:

| Principle | What it means here |
|---|---|
| **Intentionality** | Every element justifies itself or is deleted |
| **Restraint** | The confidence to leave things out |
| **Tactility** | Controls behave like objects with weight and travel |
| **Engineering-first** | Form follows the mechanism, never the reverse |
| **Playful precision** | Delight arrives through exactness, not decoration |
| **Confidence through simplicity** | No hedging, no clutter, no "just in case" UI |

What we never take: their palettes, their logotypes, their signature forms, their layouts,
their marketing language, or their visual jokes.

**Nobody should ever say "this looks like Teenage Engineering."**
**They should say "this feels unlike anything else."**

If a decision can be traced to *imitating* a reference rather than *reasoning* from a
principle, it is wrong â€” however good it looks.

### 1.7 The decision test
Replaces the old FT/Bloomberg test, which is exactly what made the product feel like a
newspaper. Four questions; all four must be yes.

> 1. **Is every element on this screen load-bearing?** (intentionality)
> 2. **Does it respond like a physical object?** (tactility)
> 3. **Would a 16-year-old screenshot it?** (desire)
> 4. **With the wordmark removed, is it still recognisably StudyLedger â€” and recognisably
>    not anything else?** (identity)

Question 4 is the anti-clone test and the hardest to pass. A screen that would look at home
in another company's product has failed, no matter how well-crafted it is.

---

## 2. Design Language

### 2.1 Material
The product is machined from one material: **graphite**. Surfaces are solid, matte, and
opaque. Depth comes from *tone*, never from shadow or blur. A raised thing is lighter; a
recessed thing is darker. This is how real anodised aluminium behaves.

### 2.2 Colour Philosophy

**Rule: the interface is monochrome until something means something.**

A student should be able to screenshot any screen and, from colour alone, know what
matters. If two things are coloured, one of them is probably wrong.

**Housing: light.** Students work in daylight; light is also the harder housing to get
right, so it is the one we prove. Depth is tone â€” raised surfaces are **lighter**, recessed
are **darker**. There are no shadows in Console.

**Neutrals** â€” cool engineered greys with a **deep navy ink**. Navy rather than true black:
it reads considered instead of default, and is softer to read at length without losing
authority. This is the whole UI, 90% of every screen.

| Token | Hex | Role |
|---|---|---|
| `--g-0` | `#f6f7f8` | Page |
| `--g-1` | `#eceef0` | Recessed â€” wells, input beds, track bed |
| `--g-2` | `#fbfbfc` | Surface â€” panels |
| `--g-3` | `#ffffff` | Raised â€” controls at rest |
| `--g-4` | `#c8cdd4` | Hairlines, dividers, borders |
| `--g-5` | `#a6acb4` | Disabled, ghost |
| `--g-6` | `#5a6875` | Secondary text, labels, units |
| `--g-7` | `#0f1d2b` | Ink â€” primary text and numerals |

Measured against `--g-0`: ink **15.91** Â· secondary **5.33** Â· hairline **1.49** Â·
disabled **2.13**. Disabled sits below 3.0 deliberately â€” WCAG exempts disabled controls,
and one that competes for attention is a bug.

**Signal** â€” exactly one accent, the product's entire identity:

**Amended 2026-08-04. There is no brand accent. The product does not have "a colour."**

An earlier draft made Electric Lime the signature accent. That was rejected, correctly: a
signature neon is a shortcut to memorability, and a product that needs a loud colour to be
recognised is not yet well made. Craft is the identity â€” typography, spacing, motion,
geometry. Colour is the last layer applied, never the first.

**The governing test:**

> Strip every coloured element from the interface, leaving only typography, spacing,
> motion and geometry. **It must still feel unmistakably premium.**

If removing colour collapses the hierarchy, the hierarchy was made of colour and the design
has failed. This is why the primary control is filled with **ink**, not with a hue â€” the
strongest element on the screen uses the strongest neutral, so the focal point survives the
test by construction.

**Colour communicates meaning, and nothing else.** Four hues, each meaning exactly one
thing. All four are AA as text on `--g-0`, AA with white on their own fill, and clear 3.0
as graphic fills â€” measured, not estimated.

| Token | Hex | Means |
|---|---|---|
| `--progress` | `#2f6b4f` | Real, realised advancement. The Score fill. |
| `--info` | `#35506b` | Neutral information, links, non-urgent emphasis, focus rings |
| `--warn` | `#8a6a1f` | Attention needed; nothing is broken |
| `--error` | `#a33a2e` | Something failed or regressed |

**Never colour a projection.** A forecast rendered in the progress hue dresses a possible
gain as an achieved one, which breaks Â§1.4 law 7. Projections are set in ink.

### Earned colour â€” and its invisibility rule

`--vitality` (0â€“1) is computed from real work and saturates the progress hue. A new student
sees a monochrome instrument; a committed one sees a product that came alive because of
them. Only `--progress` varies â€” a warning must never be quieter for a beginner, and an
error is never a reward.

**Vitality is never surfaced. This is a hard rule, not a preference.**

- It is **never** shown as a number, bar, level, badge, or percentage.
- It is **never** named in the UI, in copy, in onboarding, in emails, or in help.
- Nothing ever announces that it changed.
- No screen explains why the product looks different than it did last month.

> **Treat vitality like typography. It is everywhere. Nobody notices it.**
>
> If a *designer* can see the system, it is working.
> If a *user* can describe the system, it has become too obvious and must be softened.

The moment a student can articulate "the app gets more colourful as I study," it has turned
into a points mechanic wearing a disguise â€” which is gamification, banned by Â§1.4 law 6.
The intended experience is not *"I unlocked colour."* It is the vaguer, better feeling of
*"this product seems to know me now."*

**Direction is always carried by a glyph as well** (â–²/â–¼), so colour is never the sole
carrier of meaning.

The interface should never feel like it has one colour. It should read as almost
monochrome, with colour surfacing only where information demands it.

**Semantic pair** â€” used only on figures that genuinely moved:

| Token | Role |
|---|---|
| `--advance` | A real, realised increase. |
| `--retreat` | A real, realised decrease. |

Never on projections, never on decoration, never as a background. Always paired with a
glyph (â–²/â–¼) so colour is never the sole carrier â€” accessibility is not negotiable.

**Total palette: 8 greys + 1 accent + 2 semantics = 11 tokens.** If a twelfth is needed,
the design is wrong.

**Light mode** is a genuine second housing, not an inversion: warm paper-white surfaces,
same signal, same semantics. It ships in Phase 3, not before â€” get one housing right first.

### 2.3 Typography Philosophy

**Two voices. Never three.** (Ratified 2026-08-04.)

**Voice 1 â€” Interface.** A neutral, engineered grotesk. Carries every word a student reads.

| Rank | Face | Status |
|---|---|---|
| Preferred | **ABC Diatype** (Dinamo) | Commercial licence required |
| Alternative | **SÃ¶hne** (Klim) | Commercial licence required |
| Fallback | **IBM Plex Sans** | Open (SIL OFL) â€” ships today, no cost |

**Voice 2 â€” Instrument. `IBM Plex Mono`, and it is part of the product identity.**

Not a utility font used grudgingly for code. It is the voice of the machine, and it owns
every figure in the product:

> Ledger Score Â· statistics Â· streaks Â· percentages Â· timers Â· rankings Â· analytics Â·
> IDs Â· timestamps Â· technical UI Â· units Â· deltas Â· dates

**Numerals are a defining visual element of StudyLedger.** They are set in Plex Mono,
tabular (`font-variant-numeric: tabular-nums`), tightly tracked, at sizes that would be
absurd for prose and are exactly right for an instrument. When a student pictures this
product with their eyes closed, they should picture a number.

**The stack is a token, not a hardcode.** Voice 1 resolves through a single
`--type-interface` custom property. Building on Plex Sans today and swapping to Diatype
later is a **one-line change** â€” which is precisely why the token layer ships in Phase 1
before any surface is converted. Do not let a licence purchase block Phase 0.

**Explicitly rejected, permanently:** Inter Â· Geist Â· Space Grotesk Â· Manrope Â· Outfit Â·
DM Sans Â· Poppins Â· Roboto Â· Plus Jakarta Sans. Not because they are bad faces â€” because
they are the sound of every AI product shipped between 2024 and 2026, and this product's
entire thesis is not sounding like that.

**The ramp â€” six sizes, no exceptions:**

| Step | Use |
|---|---|
| `display` | The Ledger Score. One per screen, maximum. |
| `figure` | Secondary numerals â€” sector values, deltas. |
| `title` | Screen and panel titles. |
| `body` | Everything a student reads. |
| `label` | Mono. Units, categories, metadata. |
| `micro` | Mono. Timestamps, legal, keyboard hints. |

An ad-hoc `fontSize: 17` is a bug. The single most damning finding in this codebase's
history was that *every* size was invented on the spot â€” that, not any colour choice, is
what made it read as template slop.

### 2.4 Geometry

**Radius is small and constant.** Hardware has tight corners. `4px` for controls, `8px`
for panels, `999px` reserved exclusively for the Score's track. Nothing else is ever a
pill. Nothing is ever `16px+` â€” that is app-store softness and it reads as toy.

**Spacing is a 4px grid, expressed in six steps.** Density is a feature: this is an
instrument panel, not a landing page. Generous whitespace is *not* the goal â€” *legible
density* is. A sparse screen full of lonely text was the failure mode of the newspaper
era.

**Borders over shadows, always.** A `1px` hairline in `--g-4` does every job a shadow was
doing, and it's how real panels are separated.

### 2.5 Iconography
Drawn on a 20px grid, `1.5px` stroke, square terminals, no fills, no rounded ends. Icons
label controls; they never decorate. If a control can be a word, it is a word â€” words are
faster to parse than novel glyphs.

---

## 3. Interaction Principles

### 3.0 The Acknowledgement Principle â€” the one that governs the rest

> **Every interaction answers exactly one question: "Did the product acknowledge what I
> just did?"**
>
> Not celebrate. Not reward. **Acknowledge.**

This is the difference between a product that feels responsive and one that feels
theatrical, and it is the single most important behavioural rule in Console.

| The student does | The product acknowledges by |
|---|---|
| Presses a control | It travels, and returns |
| Changes a figure | The number rolls into place |
| Completes work | The score settles to its new value |
| Finishes a task | It quietly locks |
| Adds a session | The timeline shifts |
| Accumulates data | The chart breathes |

**Acknowledgement is proportionate to the act.** A press earns 40ms of travel. A term's
work earns a 900ms sweep. Anything louder than the act that caused it is theatre, and
theatre is how a product stops being trusted.

**What acknowledgement is not:** a toast Â· a modal Â· confetti Â· a sound Â· a badge Â· a
"Well done!" Â· anything that requires dismissal Â· anything that interrupts. If the student
has to acknowledge the acknowledgement, it was too loud.

**The absence of acknowledgement is a bug.** An action that produces no visible response
teaches the student that the product did not notice â€” and a student who believes their
effort is invisible stops making it. That is the actual failure mode of every study app
ever built.

1. **Everything responds within 50ms.** Not "completes" â€” *responds*. A press registers
   visually before any network call begins.
2. **Press has travel.** Controls compress `1â€“2px` and darken one graphite step. They
   return with a spring. This is the single most important detail in the product; it is
   what makes software feel like hardware.
3. **Optimistic by default.** The UI assumes success and reconciles later. A student never
   waits to see the result of their own action.
4. **The keyboard is a first-class citizen.** `âŒ˜K` is not a feature â€” it is the primary
   navigation. Every action reachable in â‰¤2 keystrokes.
5. **No modal dialogs.** Modals are an admission that the layout failed. Use panels that
   slide in and can be dismissed by continuing to work.
6. **No confirmation dialogs.** Perform the action, show an undo. Undo is always available
   for 8 seconds.
7. **Destructive actions require intent, not confirmation** â€” hold-to-delete, not
   "are you sure?".
8. **Errors are states, not popups.** They appear where the problem is, in plain language,
   with the fix as a button.
9. **Nothing blocks.** Loading never prevents reading what's already loaded.
10. **The student can always leave.** Escape always works. Back always works. Nothing traps.

---

## 4. Motion Principles

**Motion is the brand.** It is the most ownable thing in the product, because it cannot be
screenshotted and copied.

### 4.1 The physics
Everything the student touches obeys a **spring**, not a curve. Springs have mass and
respond to velocity; curves are animation, springs are *behaviour*. Anything the system
does on its own may use a curve.

### 4.2 The four motions

| Motion | What it's for | Feel |
|---|---|---|
| **Press** | Any control, on pointer-down | Instant compress, spring release |
| **Slide** | Panels, modes, navigation | Comes from the direction it lives |
| **Roll** | Any numeral that changes | Odometer â€” digits roll, they never fade |
| **Fill** | Any progress or score | Grows from origin with slight overshoot, settles |

**There is no fifth motion.** No fades, no scales, no rotations, no bounces, no wiggles,
no parallax, no tilt-on-hover. Those are the vocabulary of decoration.

### 4.3 The laws
- **Nothing fades in.** Fading is what you do when you don't know where something came
  from. Everything comes from somewhere.
- **Numbers always roll.** A score changing from 379 to 391 rolls through the intervening
  digits, because that is what a real instrument does. *This deliberately reverses the
  previous constitution's "the figure never counts."* The old rule was defensible for a
  static record; it is wrong for a living instrument.
- **Motion is interruptible.** A student who acts mid-animation is never made to wait.
  The animation redirects from its current velocity.
- **Everything settles.** No perpetual motion, no idle animation, no breathing, no pulse.
  The screen reaches rest and stays there. This is the difference between *alive* and
  *restless*.
- **`prefers-reduced-motion` collapses every motion to its final state instantly.** No
  substitute cross-fades.

### 4.4 Duration
Three tokens only: **fast** (press feedback), **base** (panels, slides), **slow** (score
roll and fill â€” the one place we let the student watch). Anything needing a fourth
duration is doing something the language doesn't support.

---

## 5. Navigation Principles

**The 46-tool problem is a navigation problem, not a design problem.**

A student who sees 46 links thinks "which one?" â€” an anxiety event, at the exact moment we
promised to reduce anxiety. The fix is not a prettier grid. The fix is to stop presenting
tools as the top level of the product.

### 5.1 Three surfaces. That's the entire app.

| Surface | Question | Contents |
|---|---|---|
| **NOW** | "What do I do right now?" | Score, the one move, today's context |
| **WORK** | "Let me do it." | The single workspace where all 46 capabilities happen |
| **RECORD** | "How am I doing over time?" | History, sectors, trajectory |

That's it. No sidebar. No tools index as a destination. No settings page in the primary
nav â€” settings live behind the account chip.

### 5.2 Command is the navigation
`âŒ˜K` (and a persistent search affordance on touch) is how a student reaches anything.
They type what they want to *do* â€” "essay", "past paper", "why did I drop" â€” and the
system routes them. Tools become **verbs the workspace can perform**, never destinations
with URLs a student must remember.

The 46 tool routes continue to exist and work. They stop being how anyone navigates.

### 5.3 The Score is persistent chrome
The Ledger Score lives in the top chrome of every surface, always visible, like a battery
indicator. Small, monospaced, with a thin signal fill. Tapping it expands RECORD. It is
never a card, never a widget, never a KPI tile.

---

## 6. Component Philosophy

**Components are objects, not containers.**

- **A panel** is a machined plate. It has a hairline edge, a tonal step, and a purpose you
  can name. It is not a "card" and there is never a grid of identical ones.
- **A control** has physical states: rest, hover (one tone step), press (compressed and
  darker), focus (`--info` ring), disabled (no border, `--g-5` text).

  **Three tiers, and the hierarchy is built from weight, never from hue:**

  | Tier | Form | Use |
  |---|---|---|
  | **Primary** | Filled **ink**, white text | The one action that creates momentum. One per screen. |
  | **Secondary** | Outlined, hairline border | Optional actions, alternatives. |
  | **Tertiary** | Text only | Low-stakes, reversible actions. |

  The primary is filled with ink rather than an accent. That single decision is the colour
  philosophy expressed as a component: the strongest thing on screen uses the strongest
  neutral, so the focal point survives the strip-all-colour test.
- **A field** is a recessed well â€” darker than its surroundings, because you put things
  *into* it.
- **A readout** displays a figure. Tabular, right-aligned, with a mono unit label. Rolls
  when it changes.
- **A track** shows progress. `4px`, `999px` radius, `--g-1` bed, signal fill, spring.

**The component budget is roughly fifteen.** If a designer needs a sixteenth, the answer is
almost always that an existing component should flex. Component sprawl is how design
systems die.

### The completion gate

**No component is done until it passes this. It is the last question asked, every time:**

> **"If every colour were removed from this interaction, would it still feel satisfying?"**
>
> **No** â†’ the interaction is unfinished. Fix the motion, timing, weight or geometry.
> Do not add colour to compensate â€” that hides the defect instead of removing it.
> **Yes** â†’ colour may now be applied, in support.

This is the strip-all-colour test (Â§2.2) applied at the level of *behaviour* rather than
*appearance*, and it is the stricter of the two. A screen can look composed in greyscale
and still feel dead; an interaction cannot.

**The product is recognised by behaviour first, appearance second.** That is the identity
being built, and this gate is how it gets enforced one component at a time.

---

## 7. Emotional Journey

The product has a five-beat emotional arc, and every surface serves one beat.

| Beat | Moment | Student feels | Design job |
|---|---|---|---|
| **Arrival** | Opening the app | *"It knows me."* | Recognition. Their name, their exam, their state â€” instantly, no loading |
| **Orientation** | First 3 seconds | *"I know where I stand."* | The Score, unmissable, honest |
| **Direction** | Next 5 seconds | *"I know what to do."* | Exactly one move, phrased as a verb |
| **Flow** | Doing the work | *"I'm getting somewhere."* | The workspace disappears; only the task remains |
| **Return** | Finishing | *"That counted."* | The Score moves, visibly, because of what they just did |

**The Return beat is the whole product.** It is the only reason a student comes back
tomorrow. If an action doesn't visibly move something, the student learns that their effort
is invisible â€” and that is the actual failure mode of every study app ever built.

**The Return beat is EVIDENCE, not celebration.** It states what changed since the student
was last here, the way an instrument states a reading. It creates continuity between
sessions: *"my work since last time mattered."*

It is never a congratulation, never a streak-shame, never a "you're on fire", never
animated beyond the figure settling. A fact, delivered plainly, with a direction glyph so
colour is never carrying it alone. The moment it becomes a reward, it becomes a mechanic â€”
and the student starts working for the mechanic instead of the exam.

### The anxiety rule
A student opens this at 11pm before an exam, frightened. Every screen must survive that
context. **Nothing may ever shame.** No "you've been inactive for 6 days." No red streak
counters. No "you're behind." State facts; offer the next move; never judge. A down day
shows the honest figure and one recovery action â€” never a verdict.

---

## 8. Screen Hierarchy

```
CHROME (persistent)
  wordmark Â· mode switch (NOW/WORK/RECORD) Â· Ledger Score Â· account
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
NOW        Score (display) â†’ the one move â†’ today's context
WORK       Command bar â†’ active task â†’ output surface
RECORD     Trajectory â†’ sectors â†’ close history
```

**NOW is the default and the product's face.** It must be readable in one glance, fit one
viewport at 1280Ã—800 without scrolling for its primary answer, and never require a click
to reveal what matters.

---

## 9. How every major surface should feel

**NOW** â€” like picking up a device that's already on and already knows you. Score dominant,
one action, nothing competing. Silent, still, ready.

**WORK** â€” like the room disappearing. Chrome recedes, the task fills the frame. Input
left/top, output right/bottom, consistently, for all 46 capabilities. The student should be
unable to say which "tool" they're in, and shouldn't care.

**RECORD** â€” like reading an instrument log. Dense, factual, trustworthy. The one place
where more information is better. Never celebratory, never apologetic.

**ONBOARDING** â€” like a device's first boot. Three questions maximum (grade, board, target
exam), each on its own screen, each answerable in one tap. Then straight into NOW with the
Score already showing a real starting position. Never a tour. Never a checklist.

**EMPTY STATES** â€” every empty state is an invitation with exactly one button. "Your record
opens at your first close. [Log a session]". Never an illustration. Never an apology.

**LOADING** â€” optimistic UI, so mostly it doesn't exist. Where genuinely unavoidable: the
final layout, at rest, with figures dashed. Never skeleton shimmer.

**SUCCESS** â€” the Score rolls. That's the celebration. No toast, no confetti, no modal. The
number moving *is* the reward, and it's honest.

**AI INTERACTIONS** â€” the student never sees a model, a token, a "thinking" spinner, or the
word AI. They see the work appearing. Output streams into the surface as it's produced.
Failure states say what to do, never what broke.

---

## 10. What to delete

- The three conflicting design documents' authority (archive, don't delete the files)
- The entire editorial/newspaper CSS layer as the *governing* system
- The tools index as a navigational destination
- The classic dashboard, once NOW ships
- Every glassmorphism remnant (13 `backdrop-filter` references still live in 8 files)
- The aurora system (already down to 5 references â€” finish it)
- ~20 orphan components already identified, and the heavy 3D dependencies they hold
  hostage (`three`, `@react-three/*`, `@splinetool/*`)
- Two of the three shipped motion libraries (gsap + framer-motion + motion is indefensible)
- Skeleton loaders
- All ad-hoc `fontSize`/`color` literals

## 11. What to rebuild

NOW Â· WORK Â· RECORD Â· the chrome and Score indicator Â· the component set (~15) Â· the token
layer Â· onboarding Â· every empty state Â· the command bar as primary navigation.

## 12. What stays unchanged

**The entire backend.** This is a design change, not an architecture change.

- All 25 API routes
- The Ledger Score engine and its 60 tests
- Supabase schema, auth, RLS
- The Stripe/billing path
- Cron jobs, notifications, parent portal, email
- `lib/tools-registry.ts` â€” the 46 capabilities and their routes
- All AI prompts and tool logic

**Nothing in this document requires touching a single API route.** That is deliberate, and
it is what makes it survivable.

---

## 13. Roadmap

**The honest framing:** this is 50,000 lines of app, 46 tool pages, mostly hand-written
inline styles, with 16 live users. A full redesign is months, not weeks. The sequence below
front-loads the ~10% of work that delivers ~80% of the feeling, and defers the long tail.

### Phase 0 â€” Prove it (1 week)
Build **NOW only**, at full fidelity, behind a flag. Tokens, two fonts, the four motions,
the Score, one action. Nothing else. **Gate: does opening it feel different?** If not, the
language is wrong and we fix it here â€” not after 46 pages are converted.

### Phase 1 â€” The foundation (1â€“2 weeks)
Token layer as the single source of truth. The ~15 components. Delete the dead code and two
of three motion libraries. **Gate:** zero ad-hoc sizes/colours in new code; the detector
runs clean.

### Phase 2 â€” The shell (2 weeks)
Chrome, the three-surface model, `âŒ˜K` as primary navigation, persistent Score. Tools become
verbs. **Gate:** a student can reach any capability in â‰¤2 keystrokes and never sees a
46-item list.

### Phase 3 â€” WORK (2â€“3 weeks)
One workspace shell. Migrate the top 8 tools by real usage (PostHog has this data) into it.
The remaining 38 keep working on their current pages, wrapped in the new chrome. **Gate:**
the migrated 8 are indistinguishable from each other in layout.

### Phase 4 â€” RECORD + onboarding (1â€“2 weeks)
Trajectory, sectors, history. New first-boot. **Gate:** a new user reaches a real Score in
under 60 seconds.

### Phase 5 â€” The long tail (ongoing)
Remaining 38 tools, light mode, sound. Sound is last and optional: a few short mechanical
ticks on press and score-roll, default OFF, never on mobile without explicit opt-in.

### Sequencing rules
- The flag stays on until a surface is genuinely better than what it replaces.
- Never convert a tool page and a shared component in the same PR.
- Every phase ends green: `tsc`, `next build`, and the anti-pattern detector.
- Ship to production continuously; do not accumulate a six-week branch.

---

## 14. Amendment

This document changes only by explicit founder decision, recorded below with date and
rationale. When a rule here is broken, the rule is amended or the code is fixed â€” never
both quietly.

- 2026-08-04 â€” Console ratified. Supersedes PRODUCT_CONSTITUTION.md, PRODUCT.md, DESIGN.md
  in full; all three carry deprecation headers and are retained for historical rationale
  only. Reverses two prior rules explicitly: numerals now roll, and the FT/Bloomberg
  decision test is replaced.
- 2026-08-04 â€” Founder decisions, same session:
  Â· **Typography fixed.** Interface: ABC Diatype (preferred) â†’ SÃ¶hne (alt) â†’ IBM Plex Sans
    (open fallback, ships today). Instrument: **IBM Plex Mono**, elevated to part of the
    product identity and owning every figure in the product. Nine faces permanently
    rejected as the 2024â€“26 AI-startup sound.
  Â· **Signal fixed as Electric Lime**, with the signal-vs-brand distinction made explicit
    and enumerated.
  Â· **Influence rule added (Â§1.6).** Extract principles from the references; never imitate
    their appearance. The decision test was rewritten because its original wording
    ("would Teenage Engineering ship this") contradicted this rule â€” it now tests
    intentionality, tactility, desire, and identity, with the anti-clone question as the
    hardest gate.

