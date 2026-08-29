# STUDYLEDGER — PRODUCT PRINCIPLES

```
AUTHORITY:       principles
ANSWERS:         "what must always be true?"
MAY NOT CONTAIN: route names · tool names · milestones · dates · effort ·
                 task order · feature classifications
PRECEDENCE:      PRINCIPLES > DECISIONS > PLANS
LAST AMENDED:    2026-08-22
```

**Nothing in this document is scheduled, and nothing here names a file.** If a
statement below could become false by shipping code, it is in the wrong
document — it belongs in `PRODUCT_DECISIONS.md`.

To contradict anything here, **amend it first** — in §12, dated, with the
reason. Never silently, never in a plan.

---

# 1. THE THESIS

> **StudyLedger helps a student answer one question: "What should I fix next?"**

The loop, in order. Every surface must sit on it:

```
CAPTURE  →  DIAGNOSE  →  RECUR  →  PRESCRIBE  →  REMEDIATE
evidence    what went    what      what to        close
in          wrong        repeats   fix next       the gap
```

**A surface that does not sit on the loop does not appear in the product.** It
may exist in the repository; it does not reach the student.

## 1.1 What StudyLedger is

The **student operating system**: one place a student opens to know where they
stand and what to do next, with the capability to actually do it. Not a tools
directory. Not a dashboard. Not an AI product.

## 1.2 The one question

Every screen answers exactly one question. If a screen answers two, it is two
screens. **The home surface's question is the thesis question: "What should I
fix next?"**

## 1.3 The prime directive

> **A student should open StudyLedger and feel more capable than they did ten
> seconds ago.**

That is the only success metric that matters at the design level. Retention,
DAU, and session length are consequences, never goals.

## 1.4 We do not teach

Explanation is not our business. A student can get an explanation anywhere, free
and better. What nobody gives them is an honest account of what *they*
specifically keep getting wrong, and what to do about it next.

This is the principle that keeps us out of a fight we cannot win.

---

# 2. THE NINE LAWS

1. **Nothing is decorative.** Every pixel is load-bearing or it is deleted. If
   you cannot name the function of an element in five words, remove it.
2. **The interface is hardware.** It has weight, travel, detents, and
   resistance. Things are pressed, not clicked. Panels slide, they don't fade.
3. **Colour is information.** Colour never expresses mood, brand, or emphasis. A
   coloured thing is a thing that *means* something. Grey is the default state
   of the universe.
4. **Motion is physics, not decoration.** Everything that moves obeys mass and
   spring. Nothing eases for prettiness.
5. **Numbers are the heroes.** This is a product about figures. Typography
   exists to serve numerals; numerals are set large, tabular, and mechanical.
6. **Never gamify. Always reward.** No points, badges, streak-shaming, confetti,
   mascots, or levels. Reward is *the honest depiction of real progress*,
   rendered beautifully.
7. **Never lie.** No fabricated trend, forecast, or encouragement. An honest
   empty state beats a fake number, always.
8. **One workspace, many modes.** The student is never "opening a tool." They
   are working, and the workspace changes shape around the task.
9. **Speed is the feature.** Perceived latency is a design defect. Optimistic UI
   by default; skeletons never; layout shift never.

---

# 3. THE RECORD — WHAT MAKES IT TRUSTWORTHY

These five are load-bearing. The record is worthless without them, and each is
enforced structurally rather than in copy.

## 3.1 Only evidence resolves a gap

> **A student may never mark their own mistake fixed.**

A student can say *"I've seen it"* and *"I'm working on it."* They cannot say
*"I've fixed it."* Self-reported mastery is the fluency illusion — the exact
broken instrument this product exists to replace. Letting a student close their
own gaps would make the record a record of their **confidence** rather than
their **competence**, and the record would be worthless.

## 3.2 No claim without proof

An unevidenced mistake is a claim, and the product does not store claims. Facts
are immutable and never deleted; a correction appends a superseding fact rather
than editing history.

This is how *never lie* becomes structural rather than aspirational.

## 3.3 Capture must never lower a score

The entire company depends on students recording their mistakes. Any scoreboard
that penalises recording punishes precisely the behaviour we exist to create,
and rewards hiding evidence.

**Non-negotiable.** A student who logs honestly may never score below a student
who logs nothing.

## 3.4 The parent boundary

**Parents see what their child is *fixing*, never what their child *got wrong*.**

No raw failures, no marks lost, no unaddressed gaps, no answer detail. This is
the difference between a support tool and a shame-delivery mechanism, and it is
enforced at the data layer, not in copy — the interface must be *unable* to
expose it.

## 3.5 Learning is not confined to this product

*Added 2026-08-10. See §12.*

**A student's learning counts wherever it happened.**

NCERT, a textbook, school, a teacher, coaching, YouTube, another website,
handwritten notes — all of it is legitimate academic activity, and the student
may tell us about it. **StudyLedger owns the academic memory, never the
student's physical learning environment.** A product that only counts what
happens inside its own tools is measuring app usage and calling it learning,
which is Law 7 failing by construction.

**This does not weaken §3.1 or §3.2 — it depends on them.** What the student
tells us is a **claim**, and a claim is recorded as a claim. The route from
*"I studied this"* to *"this is proven"* runs through assessment and nowhere
else:

```
student-declared evidence  →  assessment  →  verified academic evidence
```

**We trust the student about what they studied, and never about whether they
learned it.** A declaration opens a gap; only evidence closes one.

**Never a closed ecosystem.** Any rule, screen or score that makes outside
learning invisible — or that makes it *cost* the student something to admit —
violates this principle and §3.3 together.

---

# 4. NEVER SHAME

A student opens this at 11pm before an exam, frightened. **Every screen must
survive that context.**

No *"you've been inactive for 6 days."* No red streak counters. No *"you're
behind."* State facts; offer the next move; never judge. A down day shows the
honest figure and one recovery action — never a verdict.

## 4.1 The morbid metaphor family is banned permanently

Obituary · autopsy · coroner · cause of death · trauma · cremator · forensics.

It is clever, it is memorable, and it is **shame delivered as branding.** A
product that tells a sixteen-year-old their marks died and here is the coroner's
report violates its own constitution in the product name. Banned, not softened.

## 4.2 Streaks are never shipped

One missed day converts a motivator into shame.

## 4.3 Milestone-gated unlocking is gamification

Withholding features until a student "earns" them is a reward schedule, which
law 6 bans without exception. Complexity may follow **competence** — never
achievement — and nothing is ever announced as unlocked.

---

# 5. BANNED, PERMANENTLY

Glassmorphism · blurred orbs · aurora/animated backgrounds · purple→blue
gradients · gradient text · glow as emphasis · custom cursors · cursor trails ·
typing effects · AI avatars · robot/sparkle iconography · confetti · mascots ·
badges · XP · levels · newspaper column layouts · article typography ·
rounded-card grids where every card is identical · drop shadows as elevation ·
"unlock your potential"-class copy · the words "AI-powered", "supercharge",
"revolutionise" · tiny uppercase tracked eyebrows above every section ·
testimonial carousels.

---

# 6. DESIGN LANGUAGE — CONSOLE

The design language is **Console**. Four meanings, all intended:

1. **A control surface.** Not a page you read — a panel you operate.
2. **A game console.** The thing you *want* to switch on. PS5/Switch, not LMS.
3. **A console as in cabinet** — engineered, housed, physical.
4. **To console.** The product's emotional job is to reduce a scared student's
   anxiety.

If a design decision doesn't serve at least one of those four, it isn't Console.

## 6.1 Material

Surfaces are machined, not layered. Depth is expressed as **tone**, never as
shadow or blur. A raised thing is lighter; a recessed thing is darker. Hairline
edges, not borders-as-decoration.

## 6.2 Colour

**Colour is mostly earned, with one bounded exception.** Grey is the default
state of the universe; a coloured element is, in general, one that *means*
something — progress, completion, focus, active state, a real trend. Colour
never carries meaning alone.

*Amended 2026-08-21, see §12.* **A single brand accent is now permitted**,
appearing on at most one or two elements per screen. It exists for emphasis,
not semantics — it must never be read as progress, completion, warning or any
other state, and using it that way is a §6.2 violation, not a variation. It is
additive to the semantic colours above, never a substitute for them.

**The strip-all-colour test is unchanged and now stricter to pass:** remove
every coloured element, accent included. If the hierarchy collapses, the
hierarchy was being carried by colour and the screen is unfinished.

Concrete values live in `console.css`, resolved through tokens.

## 6.3 Typography

**Numerals are the product.** Typography exists to serve figures: large,
tabular, mechanical, set in the instrument face. A fixed ramp, never ad-hoc
sizes.

*Amended 2026-08-21, see §12.* Interface type — body copy, headings, UI
labels, everything that is not a figure — may move to an editorial voice
rather than the instrument-only treatment: quieter, humanist, built to be
read at length rather than glanced at like a readout. **The instrument face
for numerals is unchanged** — this amendment governs interface type only.
Specific families, the type scale, and the licensed-swap path are resolved
through tokens in `console.css`, so a change is one line — this document
names the philosophy, not the fonts. **Before implementation:** the
2026-08-04 amendment records nine faces "permanently rejected as the
2024–26 AI-startup sound" without listing them here; whoever implements this
must confirm the candidate family isn't one of the nine before it ships.

## 6.4 Geometry and iconography

Radius is implied by material, never chosen per-component. Icons are line work
that matches the material — never illustration, never mascots, never sparkles.

## 6.5 Motion — four motions only

**Press · slide · roll · fill.** Nothing fades.

Everything that moves obeys mass and spring. Continuous state updates its
**value** without transition — liveness is signalled by the figure changing, not
by an animation. A timer reading 04:32 → 04:31 is self-evidently alive.

**One exception, system-owned:** genuinely *indeterminate* work may carry a
single quiet continuous indicator, because without it *"is this still working?"*
is unanswerable and a frozen UI reads as broken.

## 6.6 Components are objects, not containers

A **panel** is a machined plate with a hairline edge, a tonal step, and a
nameable purpose — not a "card", and never a grid of identical ones. A
**control** has physical states: rest, hover, press, focus, disabled, with
hierarchy built from **weight, never hue** — the primary action is filled with
the strongest neutral, so the focal point survives the strip-all-colour test. A
**field** is a recessed well. A **readout** displays a figure, tabular and
right-aligned, and rolls when it changes. A **track** shows progress.

**The component budget is roughly fifteen.** If a designer needs a sixteenth,
the answer is almost always that an existing component should flex. Component
sprawl is how design systems die.

## 6.7 Navigation is command, not catalogue

A student who sees a wall of links thinks *"which one?"* — an anxiety event, at
the exact moment we promised to reduce anxiety. The fix is not a prettier grid;
it is to stop presenting capabilities as the top level of the product.

**Capabilities are verbs the product performs**, reached from the surface that
needs them. **No surface ever lists tools.** Search and command are how a
student reaches anything.

## 6.8 The Score is persistent chrome

Always visible, like a battery indicator. Small, monospaced, thin signal fill.
Never a card, never a widget, never a KPI tile.

---

# 7. INTERACTION

## 7.1 The emotional arc

| Beat | Student feels | Design job |
|---|---|---|
| **Arrival** | *"It knows me."* | Recognition, instantly, no loading |
| **Orientation** | *"I know where I stand."* | The Score, unmissable, honest |
| **Direction** | *"I know what to do."* | Exactly one move, phrased as a verb |
| **Flow** | *"I'm getting somewhere."* | The workspace disappears; only the task remains |
| **Return** | *"That counted."* | Something moves, visibly, because of what they just did |

**The Return beat is the whole product.** It is the only reason a student comes
back tomorrow. If an action doesn't visibly move something, the student learns
their effort is invisible — the actual failure mode of every study app ever
built.

**The Return beat is EVIDENCE, not celebration.** It states what changed, the
way an instrument states a reading. Never a congratulation, never a "you're on
fire", never animated beyond the figure settling. The moment it becomes a
reward, the student starts working for the mechanic instead of the exam.

## 7.2 State principles

**Empty states** are an invitation with exactly one control. Never an
illustration, never an apology. **Loading** mostly should not exist — optimistic
UI by default; where genuinely unavoidable, the final layout at rest with
figures dashed. Never skeleton shimmer. **Success** is the figure moving. No
toast, no confetti, no modal. **AI work** shows the work appearing — the student
never sees a model, a token, a spinner, or the word AI. Failure states say what
to do, never what broke.

---

# 8. THE INFLUENCE RULE

**Study why the references work. Never copy how they look.**

What we take: intentionality, restraint, tactility, engineering-first form,
playful precision, confidence through simplicity.

What we never take: their palettes, their logotypes, their signature forms,
their layouts, their marketing language, or their visual jokes.

> **Nobody should ever say "this looks like [reference]."**
> **They should say "this feels unlike anything else."**

If a decision can be traced to *imitating* a reference rather than *reasoning*
from a principle, it is wrong — however good it looks.

---

# 9. THE DECISION TEST

Four questions. **All four must be yes.**

> 1. **Is every element on this screen load-bearing?** (intentionality)
> 2. **Does it respond like a physical object?** (tactility)
> 3. **Would a 16-year-old screenshot it?** (desire)
> 4. **With the wordmark removed, is it still recognisably StudyLedger — and
>    recognisably not anything else?** (identity)

Question 4 is the anti-clone test and the hardest to pass. A screen that would
look at home in another company's product has failed, no matter how well-crafted.

## 9.1 The completion gate

**No component is done until it passes this. It is the last question asked,
every time:**

> **"If every colour were removed from this interaction, would it still feel
> satisfying?"**
>
> **No** → the interaction is unfinished. Fix the motion, timing, weight or
> geometry. Do not add colour to compensate — that hides the defect instead of
> removing it.
> **Yes** → colour may now be applied, in support.

**The product is recognised by behaviour first, appearance second.**

## 9.2 The subtraction test

> *If this vanished tomorrow, would the core product be **worse**, or merely
> **smaller**?*

Worse is load-bearing. Smaller is optional. The distinction decides what belongs
in the product, and it is a judgement about the thesis — never about usage
figures.

---

# 10. THE ANTI-GOALS

StudyLedger is not a blank canvas — there is always exactly one next move. Not
about speed of output — about **change in capability**. Not a knowledge
archive — we own *change over time*, not accumulation. Nothing here is
assigned; it is entirely the student's.

**The territory: self-evidence.** Every other tool reflects your *output*.
StudyLedger reflects **you** — honestly enough that improvement in the
reflection is believable. That is why the score never inflates, why colour must
be earned, why the Return beat is evidence rather than celebration, and why
nothing ever congratulates.

**A mirror that flatters is worthless as a mirror.**

---

# 11. WHAT THIS DOCUMENT DOES NOT DECIDE

Deliberately absent, and belonging elsewhere:

- Which routes exist, and what they are named → `PRODUCT_DECISIONS.md`
- Which features ship in V1 → `PRODUCT_DECISIONS.md`
- What a recorded mistake contains → `PRODUCT_DECISIONS.md`
- Whether code is deleted or archived → `PRODUCT_DECISIONS.md`
- When anything ships, and in what order → `EXECUTION_PLAN.md`

---

# 12. AMENDMENTS

This document changes only by explicit founder decision, recorded here with date
and rationale. **When a rule here is broken, the rule is amended or the code is
fixed — never both quietly.**

### 2026-08-22 — Landing page (`/`) moves off the bounded-accent cap, same reasoning as the `/home` amendment below
**Widens the 2026-08-21 amendment, for this one route.** In practice the landing
page shipped with **zero** uses of `--accent` anywhere — the CTA button, the
spine marks, every control is `--g-7` on `--g-0`, pure neutral. Founder verdict,
live in the browser: *"it looks html... there are no vibrant colours."* The
2026-08-21 cap (accent on at most one or two elements per screen) was never
even reached, so this is not a case of the cap being too tight in practice —
it's that "hierarchy is built from weight, never hue" (this file's own §6.6
control-state reasoning) produced a page indistinguishable from unstyled
markup on first impression, which is a real failure mode the cap didn't
anticipate.

**Chosen instead, for `/` specifically:** `--accent` (`#ba5221`, the same
token §6.2 already defines) is used throughout the primary path, not capped
at two elements — CTA buttons, the ledger spine marks once struck, the
Ledger Score readout, every eyebrow badge (specimen header, "what should I
fix next"), the climax figure in §3, and the emphasis words in §1/§2's
lists. A first pass that touched only the CTA, the spine marks and one
number was itself rejected live — *"u just added orange"* — confirming the
founder's actual ask was closer to `/home`'s full treatment than to a
slightly-widened bounded cap; this entry and the code now match that. The
page's ground also moved off Console's cool grey scale (`--g-0`…`--g-4`)
onto the warm cream the original design brief specified, scoped locally to
`.landing` the same way `warm.css` scopes `[data-warm]` — every panel and
hairline inherits it through the existing `var(--g-N)` references rather
than being hand-tinted rule by rule. §6.1 (material), §6.4 (geometry), §6.5
(motion) and the strip-all-colour test are **not amended** — accent is
still additive emphasis, never semantic, and the page must still make sense
with colour stripped.

**Scope.** `/` (`app/page.tsx`, `app/landing.css`) only. Every other Console
route remains under the 2026-08-21 bounded cap. As with `/home`, this is not
yet a decision that the bounded cap failed generally — two routes rejecting
it on the same grounds is a pattern worth naming if a third one does.

### 2026-08-22 — /home rebuilt on the full warm/editorial palette, superseding Console there
**Widens the 2026-08-21 amendment.** That entry authorised a *bounded* accent
(1–2 elements/screen) and an editorial interface typeface, while leaving
Console's grey ground, hairline material and "no brand accent except the
bounded one" intact everywhere else. Applied that way to `/home`, it read as
"Console with an orange logo" and did not land — founder verdict: *"I just
don't like the vibe of the page."*

**Chosen instead, for `/home` specifically:** the original design brief's
values applied directly and fully — warm cream ground (`#faf8f5`), white
surfaces, the orange accent (`#d9622b`) used throughout (primary buttons,
badges, the wordmark), not capped at two elements. Implemented as a parallel
token layer, `app/home/warm.css`, scoped to `[data-warm]` exactly as
`console.css` is scoped to `[data-console]` — the two systems stay mutually
invisible by the same construction. §6.1–§6.8 (material, colour restraint,
component vocabulary) describe Console and are **not amended**; they simply
no longer govern this one route. Numerals stay on the instrument mono face;
only the interface type and colour system moved.

**Scope.** `/home` and its always-visible sub-components (`ScoreDetail`,
`ExamDayPanel`, `HomeComposer`, the Home widgets) are warm now. Every other
V1 route remains Console pending the same evaluation. This is not yet a
decision to retire Console — that would be a `PRODUCT_DECISIONS` §7 entry
of its own, made once more routes have actually been rebuilt and judged.

### 2026-08-04 — Console ratified
Design law established. Two prior rules reversed explicitly: numerals now roll,
and the FT/Bloomberg decision test was replaced (it was what made the product
feel like a newspaper).

### 2026-08-04 — Typography fixed
Interface and instrument faces resolved through tokens. Nine faces permanently
rejected as the 2024–26 AI-startup sound.

### 2026-08-04 — Product constitution ratified
Thesis, the five-step loop, and the merge of the diagnosis surfaces.

### 2026-08-05 — Electric Lime withdrawn
**Reverses the 2026-08-04 "signal fixed as Electric Lime" decision.** Judged too
loud, trendy and attention-seeking. **StudyLedger has no brand accent.** Colour
is earned and semantic only. *This reversal was made in practice on 2026-08-05
and recorded here retroactively — the prior amendment log had gone stale.*

### 2026-08-05 — Governance restructured to four documents
Principles, decisions, plans, and a pointer. Precedence fixed as
`PRINCIPLES > DECISIONS > PLANS`. This document absorbed the product law from
`PRODUCT_CONSTITUTION.md` and the design law from `CONSOLE.md`; both are
archived. Full statement-level mapping in `docs/GOVERNANCE_MAPPING.md`.

### 2026-08-05 — "A page that does not sit on the loop does not exist" — reworded
Now reads *"does not appear in the product."* The original stated a filesystem
consequence, which conflicts with the archival-over-deletion decision. **The
principle is unchanged; only its expression was corrected.**

### 2026-08-05 — The home surface question unified
`CONSOLE.md` §1.2 stated the home question as *"What do I do right now?"* while
the thesis stated *"What should I fix next?"* **The thesis wins.** Two phrasings
of a founding question is how a product loses its thesis.

### 2026-08-05 — "We do not teach" clarified as permanent
Retained as a permanent principle governing **what the product does**. It is not
a statement about which code may exist in the repository — that is a decision,
recorded in `PRODUCT_DECISIONS.md`.

### 2026-08-10 — §3.5 added: learning is not confined to this product
The repository had **no governing statement** on studying outside the product —
confirmed as a gap by `STUDYLEDGER_OPEN_DECISIONS.md` (Decision 1) and by the
architecture spec's own citation table. §3.5 closes it: external learning is
first-class academic activity, recorded as a **student-declared claim** that
becomes verified academic evidence only by passing an assessment. **§3.1 and
§3.2 are unchanged and unweakened** — §3.5 states that a claim may *open* a gap,
which §3.1 never addressed; it does not let a claim *close* one.

### 2026-08-21 — §6.2 and §6.3 amended: a bounded brand accent, and editorial interface type
**Reverses part of the 2026-08-05 "Electric Lime withdrawn" decision** — not
all of it. That entry banned a *loud, trendy, attention-seeking* accent used
as a signature colour; this amendment permits a *restrained* accent bounded
to one or two elements per screen, used for emphasis only, never for state.
The "no signature colour that substitutes for craft" reasoning stands; what
changes is that zero accent is no longer the only compliant answer.

Interface type (not the instrument numeral face) may move toward an
editorial, humanist voice. **This is a partial re-reversal of the
2026-08-04 decision** that replaced the FT/Bloomberg decision test because
"it was what made the product feel like a newspaper" — this amendment moves
body/heading typography back toward that territory. Recorded explicitly
rather than let the two amendments quietly disagree.

**Scope.** Both changes apply to interface *values* (hex, families, scale),
which remain undecided here and belong in `console.css` tokens per §6.2/§6.3
— this entry authorises the philosophy, not a specific palette or typeface.
Nothing else in §5 (banned list), §6.1 (material/depth-as-tone), §6.5
(motion), or §6.6–6.8 (components, navigation, the Score) is touched.

### 2026-08-10 — §3.4 and §4.2 reaffirmed, not amended
Two ratified decisions of the same date were checked against this document and
**required no amendment**, which is recorded here so the absence of a change is
not read as an oversight.

- **The parent boundary (§3.4) stands as written.** A student-controlled
  granular-sharing model that could expose individual mistake evidence to
  parents was considered and **rejected**. Parent access to individual mistakes
  is **structurally private**, not a sharing toggle: parents may see progress,
  trajectory, continuity, subjects, verified learning and reports, and may never
  receive individual wrong answers, mistake occurrences, mistake history,
  question-by-question failures or mistake counts. Where student sovereignty and
  this boundary conflict, **this boundary wins** — the product serves minors and
  consent under parental power asymmetry is not meaningful consent.
- **The streak ban (§4.2) stands as written.** Its replacement concept —
  *Continuity*, sustained verified academic engagement over a rolling window —
  is a **decision**, not a principle, and lives in `PRODUCT_DECISIONS.md`.
  §4 and §4.2 already forbid everything Continuity must never become.
