# THE WORKSPACE ENGINE — StudyLedger Identity Architecture v2

**Draft for approval. Not implemented.** `CONSOLE.md` (Structure + Behaviour) remains
frozen and is unchanged by this document. This is a first-principles redesign of the
Identity layer that **replaces v1**. Section 0.1 records what changed and why.

---

## 0. What this document decides

**The emotional territory StudyLedger owns — and nobody else does:**

> **Evidence that you are becoming more capable.**

Notion shows you what you *organised*. Linear shows you what you *shipped*. Obsidian shows
you what you *know*. Google Classroom shows you what you *owe*. **Nothing in software shows
you that you are getting better at something.** That is unclaimed territory, it is exactly
what a student needs, and every identity decision below serves it.

After six months, the feeling should not be pride, or fun, or productivity. It should be:
**"I can see myself improving."** The product is a mirror that is never flattering and never
cruel, and over time the reflection improves — because the student did.

### 0.1 What v2 overturns

| v1 said | v2 says | Why |
|---|---|---|
| Four token layers | **Three** | "Reference" and "Identity" were the same layer wearing two names |
| A 7-control settings sheet | **4 DNA traits** | Seven dropdowns is a theme builder with extra steps |
| Personalisation is **earned** by milestones | **Contextual, never unlocked** | Milestone-unlocking *is* gamification — banned by `CONSOLE.md §1.4` |
| Density is Identity | **Behaviour owns the stops; Identity picks one** | Density is an accessibility mechanism, not a personality |
| Continuous state never animates | Refined: **value updates, one indeterminate exception** | Absolute rule made "is it still working?" unanswerable |
| Meaning fixed forever, globally | **Roles fixed; hue↔role mapping is locale-aware** | Red-as-danger is not universal |

---

## 1. Guiding philosophy

**The student configures character. The engine owns correctness.**

Three commitments that survive every configuration:

**Identity changes what the instrument is made of, never what it does.** No workspace makes
StudyLedger *prettier*. Workspaces make it quieter, denser, warmer, calmer — functional
differences, not decorative ones.

**Personality may never degrade the core task.** A student under exam stress has finite
cognitive budget. If a chosen workspace makes the score harder to read, the engine has
failed, not the student. Bounded ranges exist for this reason, not for tidiness.

**The five-second invariant.** In every possible configuration, a student must answer *where
do I stand* and *what do I do next* within five seconds. This is the acceptance test for
the engine itself, not for individual screens.

## 2. Token hierarchy — three layers, not four

v1's "Reference → Identity" split was a distinction without a difference. The honest
architecture:

```
FOUNDATION      the physics. 4px unit · ramp ratios · 3 durations · 2 curves · AA floor
    ↓           immutable. nothing may alter these.
IDENTITY        the DNA. 4 traits, and nothing else is writable.
    ↓           the only layer a student touches.
SEMANTIC        derived. --surface-raised · --text-secondary · --progress · --focus-ring
    ↓           writable by NOBODY. computed by a pure function.
PRIMITIVES      consume semantic tokens only.
```

**Why this is enforceable rather than aspirational:** a primitive cannot read a DNA value
even by accident, because no DNA value has a name a primitive knows. CI asserts that no
file under `primitives/` contains `--dna-`.

**The derivation function is the product.** `derive(dna) → semantic tokens` is pure,
unit-testable without a browser, and is where AA contrast is *guaranteed by construction*
rather than checked afterwards. It is the highest-value test target in the codebase.

## 3. Workspace DNA — four traits

Not settings. **Traits, from which everything else is derived.** If a student is adjusting
seven controls, they are building a theme. If they are choosing four characteristics, they
are describing how they work.

### MATERIAL — what the surface is made of
*Values:* `paper` · `deep` · `warm` · `contrast`
**Controls:** the neutral ramp, page/surface/recessed tones, hairline weight, and — by
derivation — edge radius and icon character. A `deep` material implies sharper edges and
line icons; `warm` implies softer edges. **Radius is never chosen; it is implied.**
**Never controls:** contrast ratios, semantic meaning, spacing.
*Why it exists:* material is the single strongest driver of how a screen feels, and it is
the one thing students describe unprompted ("I want it dark").

### VOICE — how the product speaks
*Values:* three curated pairings (interface + instrument), never a font picker.
**Controls:** the two families, and the optical normalisation ratio that keeps them
interchangeable.
**Never controls:** the six-step ramp, weights, or which voice is used where.
*Why it exists:* typography is the largest share of every screen, and a free picker
guarantees someone pairs a display face with a script face and the product stops being
StudyLedger.

### PRESSURE — how much, how fast
*Values:* `relaxed` · `standard` · `tight`
**Controls:** the spacing multiplier, control heights, and the motion *duration* scale —
together, as one decision.
**Never controls:** the 4px base unit, the four motions, or any accessibility floor.
*Why it exists — and this is the synthesis v1 missed:* density and tempo are the same
preference. A student who wants more on screen also wants it to respond faster; someone who
wants room to breathe wants motion that breathes too. Splitting them into two controls asks
the same question twice.

### TEMPERAMENT — how expressive colour is
*Values:* `reserved` · `standard` · `expressive`
**Controls:** the ceiling on `--vitality`, and hue intensity within validated bounds.
**Never controls:** which role means what, or whether colour appears at all when earned.
*Why it exists:* it is the only trait that touches colour, and it deliberately controls
*restraint* rather than *palette*. A student cannot pick "purple"; they can decide how loud
their earned colour becomes.

### Trait interaction and conflict resolution

Traits combine multiplicatively and can produce invalid results — `deep` material plus
`expressive` temperament can breach contrast.

**Resolution is absolute and one-directional: Behaviour wins over Identity, always.** The
derivation clamps. If a combination would fall below AA, the engine adjusts lightness until
it clears and **does not tell the student it did** — a warning would imply they made a
mistake, and they did not. They expressed a preference; honouring it legibly is the
engine's job.

**4 traits × 4·3·3·3 = 108 valid workspaces**, each provably legible, from four questions.

## 4. Customisation model — contextual, not earned

v1 proposed unlocking customisation at milestones. **That was wrong, and it violated the
constitution.** Milestone-gated unlocking is a reward schedule, and `CONSOLE.md §1.4 law 6`
bans gamification without exception. I was so focused on the procrastination risk that I
reached for the mechanic the constitution most explicitly forbids.

The third approach, grounded rather than intuited:

**Autonomy is immediate.** Self-determination theory identifies autonomy as one of three
basic psychological needs driving intrinsic motivation. Withholding *all* control from a
student — in a product about their own progress — is not neutral; it is demotivating.
Onboarding therefore asks **exactly one question** (MATERIAL), because that is the trait
students have an opinion about before they have used anything.

**Configuration is never reachable during work.** Goal-shielding research shows that during
active goal pursuit, competing options must be suppressed to protect follow-through. The
workspace sheet is unreachable from NOW and from any active task — it lives behind the
account chip, a deliberate context switch. *"I'll set up my workspace first"* must never be
one click from the study surface.

**Complexity follows competence, not achievement.** Progressive disclosure, not unlocking.
VOICE and TEMPERAMENT are visible from day one. PRESSURE surfaces once a student has used a
dense surface repeatedly — because usage has demonstrated the preference matters to them,
not because they earned a prize. **Nothing is ever announced as unlocked.**

**Why this beats both prior options:** it preserves the IKEA effect and ownership that make
customisation a genuine retention mechanic, while removing the two failure modes —
choice overload at first run (Iyengar & Lepper: more options, less action) and
configuration-as-procrastination during study.

## 5. Section-by-section rulings

**Token layers (§1 of brief):** Reduce four to three. Keep derived semantics and the
primitive firewall — that part is genuinely excellent and I would not change it.

**Workspace Engine vs themes (§2):** A workspace engine is only better than themes **if it
is DNA-driven**. Seven settings is a theme builder with a nicer name and strictly worse
support characteristics. With four traits it is genuinely different: students describe *how
they work*, not *what colour they like*.
**Hidden costs, all real and none previously named:** every screenshot, tutorial and support
conversation shows a workspace that is not the user's ("it doesn't look like that for me")
— and StudyLedger's support is one person. Design review becomes combinatorial: 108
configurations cannot be visually reviewed, so correctness must be *proven by tests* rather
than *seen by eye*. That is a permanent engineering obligation, not a one-off cost.
**Evolution:** traits may gain values; the trait *count* should never exceed five. Presets
are capped at seven, permanently.

**Typography (§3):** Keep curated packs, keep optical normalisation, keep the fixed scale —
this was right. **One addition v1 missed: every VOICE pack must include Devanagari and Tamil
coverage**, or Hindi content silently falls back to a system font and the workspace breaks
for a large share of the actual audience. For an Indian student product this is not a
nice-to-have.

**Colour (§4):** Keep intent-not-hex and derived states. **One correction: "meaning is fixed
forever" is wrong globally.** Red-as-danger is not universal; red signals prosperity in
Chinese contexts. Semantic *roles* are fixed forever; the *hue mapping* for a role is
locale-aware. Direction glyphs (▲▼) carry meaning independently, which is why this is safe.

**Density (§5):** **Behaviour, not Identity.** Density determines touch-target size and is
the low-vision path — it is an accessibility mechanism wearing a personality costume.
Behaviour defines the stops and their floors; Identity merely *selects* among them via
PRESSURE. This prevents a personality choice from degrading accessibility, which the v1
placement permitted.

**Radius (§6):** Bounded personalities was right, but **radius should not be a trait at
all.** It is derived from MATERIAL. One fewer decision for the student, one fewer axis to
review, and it becomes impossible to pair an industrial material with soft edges.

**Motion (§7):** The philosophy is right but the absolute form was wrong. **Refined:**
*continuous state updates its value without transition — liveness is signalled by the value
changing, not by an animation.* A timer reading 04:32 → 04:31 is self-evidently alive.
**One exception, system-owned and unconfigurable:** genuinely *indeterminate* work (an AI
generation with no known progress) may carry a single quiet continuous indicator, because
without it "is this still working?" is unanswerable and a frozen UI reads as broken.

## 6. Technical architecture

**Storage.** A four-field JSON blob on the user record — **choices, never computed values**.
Every future engine improvement upgrades all existing workspaces retroactively and for free.

**Application.** `VitalityShell` (already the token host) reads the DNA and writes semantic
tokens to the `[data-console]` element. **One element, one write.** Nothing else in the
application knows a workspace exists.

**Derivation.** `derive(dna) → SemanticTokens`, pure, with contrast assertions covering all
108 combinations in CI. Machine-verified legibility replaces visual review.

**SSR.** DNA inlines in the document head to prevent a flash of default workspace.

**Governance.** CI fails if: a primitive references a DNA token · any derived pair falls
below AA · the trait count exceeds five · the preset count exceeds seven.

## 7. Presets — seven, capped forever

Starting points, not skins: **STUDIO** (paper · standard · standard) · **TERMINAL** (deep ·
tight · reserved) · **DESK** (warm · relaxed · standard) · **FIELD** (contrast · relaxed ·
reserved) · **PAPER** (paper · relaxed · reserved).

Two slots held in reserve for a decade of learning. **The cap is the point** — every preset
added widens the surface that must stay coherent, and preset sprawl is how identity systems
die quietly.

## 8. Hidden risks not previously identified

**🔴 AI-generated interfaces (the biggest 10-year risk).** By 2030 much UI will be
generated. A design system whose rules live in English prose cannot constrain a generator.
**The token schema and `derive()` must be the machine-readable spec** — an AI building a
StudyLedger surface should be *unable* to produce an invalid one because it can only emit
semantic tokens. Design the system for AI as a first-class consumer, not just for humans.

**🔴 Premium gating is a trap.** Selling workspaces creates commercial pressure to add
options to justify the price — the exact sprawl that kills design systems. **Never monetise
the number of options.** If identity is ever monetised, sell *presets and packs*, never
*more axes*.

**🟠 School and enterprise deployment.** An institution may need to lock identity for
uniformity or to enforce an accessibility policy. **An admin-enforced DNA lock must exist in
the schema from day one** — retrofitting it later means every stored workspace needs
migration.

**🟠 Educational psychology cuts against expressiveness.** High-arousal colour and high
density measurably increase cognitive load. A stressed student may choose a workspace that
actively harms their performance. TEMPERAMENT's ceiling and PRESSURE's floors exist for
this reason — and this is the strongest argument against ever widening the ranges "because
users asked."

**🟠 Font availability over a decade.** A licensed family can become unavailable or change
metrics. Every VOICE pack needs a declared metric-compatible fallback, matched by
cap-height rather than alphabetically.

**🟡 Third-party and plugin surfaces.** If tools ever come from outside, **the token export
is the plugin API** — never the components. That decision should be made now, because it
determines whether the system can open up later without forking.

**🟡 Screenshot and documentation drift** — see §5.

## 9. Migration strategy

Console currently ships one implicit workspace. Migration is additive: define STUDIO as the
exact current values, so **every existing user's workspace is byte-identical on day one and
nothing visibly changes**. DNA is then introduced with STUDIO pre-selected. No user sees a
migration.

Deprecating a preset maps it to its nearest surviving neighbour by trait distance.
Deprecating a VOICE pack falls back by metric similarity. **A student never loses their
workspace; it is re-expressed.**

## 10. What StudyLedger must feel like, and how it differs

| Product | Owns | StudyLedger is not that |
|---|---|---|
| **Notion** | Possibility — the blank canvas | We are never a blank canvas. There is always exactly one next move. |
| **Linear** | Velocity and professional taste | We are not about speed of output; we are about *change in capability*. |
| **Apple** | Confident inevitability | We are warmer and more honest — we show bad days without flinching. |
| **VS Code** | Power for experts | We are legible to a frightened beginner at 11pm. |
| **Obsidian** | Ownership and permanence of knowledge | We own *change over time*, not accumulation. |
| **Google Classroom** | Institutional obligation | Nothing here is assigned. It is entirely the student's. |

**The territory: self-evidence.** Every other tool reflects your *output*. StudyLedger
reflects **you** — and does so honestly enough that improvement in the reflection is
believable. That is why the score never inflates, why colour must be earned, why the Return
beat is evidence rather than celebration, and why nothing ever congratulates. A mirror that
flatters is worthless as a mirror.

After six months: *"I can see myself improving — and I trust it, because it never pretended."*

---

**Status: draft, awaiting approval. No code written. `CONSOLE.md` and the 13 primitives untouched.**
