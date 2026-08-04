# THE WORKSPACE ENGINE — StudyLedger Identity Architecture v1

**Draft for approval. Not implemented.** Governed by `CONSOLE.md`, which remains frozen.
This document defines the *identity* layer that sits on top of Console. It does not change
a single primitive.

---

## 0. The one-sentence thesis

> **The student configures character. The engine owns correctness.**

Every personalisation system that has ever shipped fails in one of two ways: it is so
locked down that it is really just a dark-mode toggle, or it is so open that users can
build something illegible and ugly and then blame the product. The Workspace Engine avoids
both by splitting the decision: **the student chooses hue, family, density and personality;
the engine derives every actual value and guarantees contrast, rhythm and hierarchy.**

A student can never produce an unreadable workspace, because they never touch the tokens
that determine readability.

---

## 1. Design philosophy

StudyLedger is an instrument a student picks up under pressure. Every identity decision is
judged against one question: **does this help a frightened sixteen-year-old at 11pm?**

Four commitments:

**Engineered, not decorated.** Identity changes what the instrument is *made of* — its
material, its type, its density. It never adds ornament. There is no preset that makes
StudyLedger *prettier*; there are presets that make it *quieter*, *denser*, *warmer*,
*louder*. Those are functional differences.

**Calm by default, intense on request.** The default workspace is white, spacious and
nearly monochrome. A student who wants Bloomberg-grade density can have it — but they must
ask, and asking is a real signal about how they work.

**Optimism without cheer.** The product never congratulates. Optimism is expressed
structurally: the next move is always visible, the score always has a path upward, nothing
is ever a dead end. Colour arrives as evidence of progress, never as encouragement.

**Personality is earned, not chosen at signup.** See §5.3 — this is the most important and
most contrarian decision in the document.

## 2. Emotional principles

What a student should feel, in order of priority:

| Beat | Feeling | Identity's job |
|---|---|---|
| **Arrival** | *"It knows me."* | The workspace they built is instantly recognisable as theirs |
| **Orientation** | *"I know where I stand."* | The score is the loudest thing on screen in every workspace |
| **Direction** | *"I know what to do."* | Exactly one primary control, in every density |
| **Flow** | *"I'm getting somewhere."* | The workspace recedes; density and motion serve the task |
| **Return** | *"That counted."* | Colour appears *because* of work, in every workspace |

**The invariant across every possible configuration:** a student must be able to answer
*where do I stand* and *what do I do next* within five seconds. No preset, no density, no
palette may compromise that. It is the acceptance test for every workspace.

## 3. Identity architecture — three layers, one direction

```
┌─────────────────────────────────────────────────────────┐
│ STRUCTURE      primitives · layout · composition        │  IMMUTABLE
│                knows nothing about identity             │
├─────────────────────────────────────────────────────────┤
│ BEHAVIOUR      motion laws · interaction · a11y floor   │  IMMUTABLE
│                reads structure, never identity          │
├─────────────────────────────────────────────────────────┤
│ IDENTITY       palette · families · density · character │  CONFIGURABLE
│                writes reference tokens ONLY             │
└─────────────────────────────────────────────────────────┘
                 dependency flows DOWNWARD only
```

**The enforcement mechanism is not discipline, it is naming.** Structure components may only
consume *semantic* tokens (`--surface-raised`, `--text-secondary`). Identity may only write
*reference* tokens (`--hue-progress`, `--family-interface`). Semantic tokens are **derived**
by the engine and writable by nobody. A primitive therefore *cannot* read an identity value
even by accident, because no identity value has a name a primitive knows.

This is checkable in CI: no file under `primitives/` may contain the string `--hue-` or
`--family-`.

## 4. Token architecture — four tiers

**Tier 0 — Foundations. Immutable, no exceptions.**
The 4px spacing unit · the type ramp *ratios* · the three motion durations · the two easing
curves · the six space steps · the AA contrast floor. These are the physics. Nothing in the
engine can alter them.

**Tier 1 — Reference. What the student actually configures.**
```
--hue-progress          a hue angle + character, not a hex
--hue-info / warn / error
--material              the neutral character (cool / warm / neutral / deep)
--family-interface      font family
--family-instrument     font family
--density               compact | default | comfortable
--radius-character      sharp | soft            (BOUNDED — see §17 challenge)
--motion-profile        precise | standard | reduced
--icon-character        line | solid
```

**Tier 2 — Semantic. Derived by the engine. Writable by nobody.**
```
--surface-page / raised / recessed / hairline
--text-primary / secondary / ghost
--progress / info / warn / error
--focus-ring
```
Every one is computed from Tier 1 **and validated**: the engine adjusts lightness until the
pair clears AA. A student may choose a pale yellow for progress; the engine will render the
*text* form of it dark enough to read, and the *fill* form bright enough to see. **The
student picks identity; the engine picks the number.**

**Tier 3 — Component.** `--control-height`, `--field-inset`. Derived from density.

## 5. Personalisation architecture

### 5.1 What is configurable — and what is not

| Configurable | Fixed forever | Why fixed |
|---|---|---|
| Palette hues & material | Semantic *meaning* of each role | Colour means one thing; that is the system |
| Font families | The type *ramp* (6 steps) | Ratios are structure |
| Density (3 stops) | The 4px base unit | Rhythm is structure |
| Motion profile | The four motions | Motion is the brand |
| Icon character | Icon grid & stroke logic | Consistency |
| Radius character (bounded) | Radius *scale* relationships | Hardware has tight corners |
| Sound pack | That sound defaults OFF | Context |
| **Nothing** | **Cursor** | Banned by `CONSOLE.md §1.5` |

### 5.2 The consistency guarantee

Five mechanisms, in order of strength:

1. **Users never write semantic tokens.** The single most important rule.
2. **Contrast is enforced at derivation**, not validated afterward. An illegible workspace is unreachable.
3. **Density is a multiplier, never a redefinition.** `--space-3 = 16px × density`. Rhythm survives.
4. **Hue count is capped at four.** You may change *which* hues; you may not add a fifth.
5. **Every preset must pass the five-second test** (§2) in automated review before shipping.

### 5.3 Personalisation is EARNED — the contrarian decision

**A new student is offered no customisation at all.** They get Studio, and it is excellent.

Workspace controls unlock progressively as the product is genuinely used — density after
the first week, palette after the first real score movement, sound and advanced controls
later still.

**Why, and this is a real product risk you should weigh:** customisation is a
procrastination surface. Notion and Linear can afford it because professionals live in
those tools for eight hours a day. A student opens StudyLedger at 11pm, frightened, with an
exam in nine days. Offering a workspace editor at that moment is offering them a legitimate
excuse not to study, dressed as productivity. *"I'll set up my workspace first"* is how a
study session dies.

Earning it also compounds the vitality idea already in `CONSOLE.md`: the product visibly
becomes *more theirs* the more they use it — first through colour, then through control.
That is a retention mechanic that costs the student nothing and never nags.

## 6. Workspace settings structure

Not a settings page. A **workspace sheet**, reachable from the account chip, and organised
by *feeling* rather than by CSS property — students do not think in tokens.

```
WORKSPACE
├── Material        the surface it is made of        [4 choices, live preview]
├── Character       how colour behaves               [hue set + intensity]
├── Density         how much fits on screen          [compact · default · comfortable]
├── Type            the two voices                   [3 curated pairings]
├── Motion          how it responds                  [precise · standard · reduced]
├── Detail          icons and edges                  [line/solid · sharp/soft]
└── Sound           off by default                   [off · minimal]
```

Every control previews live on the student's *real* data. No lorem, no swatches in the
abstract — you are changing your instrument, so you watch your own score change with it.

## 7. Colour philosophy

**Inherited from `CONSOLE.md` and unchanged: there is no brand accent.** The Workspace
Engine does not introduce one; it lets the student choose the *character* of the four
semantic hues.

Three rules survive every configuration:

1. **Colour means meaning.** Four roles, never a fifth, never decorative.
2. **Colour is earned.** `--vitality` continues to gate saturation. A new student's
   workspace is near-monochrome *whatever palette they chose* — the palette describes what
   colour will look like when they earn it.
3. **The colourless test.** Remove every hue: hierarchy must survive on weight, size,
   spacing and motion alone. This is enforced per-preset, not per-page.

**Where colour is permitted to appear:** the score fill · realised movement · completion ·
focus · status. Nowhere else, in any workspace.

## 8. Typography philosophy

Two voices, always: **Interface** (what you read) and **Instrument** (what the machine
says — every figure). Numerals are the product's face.

**The scale is immutable; the families are not.** This creates a genuine engineering problem
(see §17) solved by **cap-height normalisation**: each supported family ships with a metric
ratio, and the engine renders every step at a constant *optical* size rather than a constant
`px`. Two workspaces with different families produce type that measures differently in CSS
and reads identically on screen.

Families are **curated pairings, not a font picker.** A free font picker guarantees someone
pairs a display face with a script face and the product stops being StudyLedger. Three
pairings at launch, each with a distinct engineering character.

## 9. Density system

Three stops. A multiplier on the base unit and control heights — **never** a redefinition of
the ramp.

| Stop | Multiplier | For |
|---|---|---|
| **Compact** | 0.75× | Dense tables, analytics, power use |
| **Default** | 1.0× | The product as designed |
| **Comfortable** | 1.25× | Touch, low vision, long reading |

**Density never changes type step or hierarchy** — only rhythm. A compact workspace is the
same product closer together, not a different product.

## 10. Motion profiles

The four motions (press · slide · roll · fill) are immutable. Profiles scale their
*duration*, never their *character*.

| Profile | Effect |
|---|---|
| **Precise** | 0.7× — snappier, for power users |
| **Standard** | 1.0× |
| **Reduced** | Instant; state changes without transition |

**Reduced is not a lesser experience** — it is the same acknowledgement delivered
instantly. `prefers-reduced-motion` selects it automatically and the student may override
in either direction.

## 11. Icon philosophy

Icons label controls; they never decorate. 20px grid, 1.5px stroke, square terminals.
**Character (line vs solid) is configurable; geometry is not.** No icon ever appears without
a label unless the control is universally understood.

## 12. Chart styling philosophy

Charts inherit the workspace and obey `CONSOLE.md`: reveal, never decorate. Hairline axes,
no gridlines by default, no fills under lines, no 3D, no shadows, no legends where direct
labelling works.

**A chart uses at most two hues, and only when comparing two things.** A single series is
drawn in ink and gains the progress hue only where it reports realised advancement.

*Note: charts live in `components/console/charts/`, outside the primitive layer, per the
Chief Architect's judgement.*

## 13. Sound philosophy

**Default OFF, permanently.** A student in a classroom or library must never be betrayed by
their laptop.

If enabled: a maximum of four short mechanical sounds, under 80ms, at low amplitude —
press, completion, score settle, session end. **No sound ever plays for an error** (public
embarrassment) or for arrival (startling). Muted automatically when the tab is not focused.

## 14. Accessibility strategy

Accessibility lives in **Behaviour**, which is immutable, so **no workspace can be less
accessible than the floor.**

- **Contrast is derived, not chosen.** AA is guaranteed by construction (§4 Tier 2).
- **Colour is never the sole carrier** — every semantic hue pairs with a glyph or label.
- **Focus is always visible** and always uses the derived `--focus-ring`, which is
  contrast-validated against whatever surface the student chose.
- **Reduced motion** is a first-class profile, auto-selected.
- **Comfortable density** is the low-vision path; it also raises touch targets to 44px.
- **Type steps have a floor** — no workspace may render body text below the readable
  minimum, whatever family or density is chosen.
- Every preset ships only after automated contrast and target-size checks pass.

## 15. Technical architecture

**Storage.** Workspace config is a small JSON blob on the user record — a set of *choices*,
never computed values, so an engine improvement upgrades every existing workspace for free.

**Application.** The config is read in `VitalityShell` (already the token host) and applied
as Tier 1 reference tokens on the `[data-console]` element. **One element, one write.**
Nothing else in the app knows a workspace exists.

**Derivation.** A pure function `deriveWorkspace(config) → semantic tokens`, unit-testable
without a browser, with contrast assertions in the test suite. This is where AA is
guaranteed, and it is the highest-value test target in the entire product.

**SSR.** The choice set is small enough to inline in the document head, avoiding a
flash of default workspace.

**Enforcement.** CI fails if any file under `primitives/` references a Tier 1 token.

## 16. Workspace presets — not themes

Presets are **starting points**, not skins. Each demonstrates a different axis of the engine.

| Preset | Material | Density | Motion | For |
|---|---|---|---|---|
| **STUDIO** *(default)* | Cool white | Default | Standard | The product as designed. Calm, spacious, near-monochrome. |
| **TERMINAL** | Deep graphite | Compact | Precise | Information density on request. Bloomberg discipline, not Bloomberg decoration. |
| **DESK** | Warm neutral | Comfortable | Standard | Long night sessions. Lower contrast, warmer material, easier on tired eyes. |
| **FIELD** | High-contrast white | Comfortable | Reduced | Accessibility-forward. Maximum legibility, minimum motion, 44px targets. |
| **PAPER** | Soft off-white | Default | Precise | Reading-heavy work — long AI output, essays, annotation. |

Five presets, one engine, zero new primitives. A student may start from any preset and
adjust any axis; their result is always a valid StudyLedger.

## 17. Challenges to the brief

Five places where the brief, implemented literally, would break the frozen constitution or
the product.

**1. Cursor cannot be configurable.** `CONSOLE.md §1.5` bans custom cursors permanently,
and `PRODUCT_CONSTITUTION` banned them before that. **Recommendation: remove from Identity.**

**2. Radius must be bounded, not free.** "Hardware has tight corners" is a Console law. A
student who sets 20px radius has left StudyLedger. **Recommendation: two characters —
`sharp` (2/4px) and `soft` (6/10px) — never a slider.**

**3. "Typography families configurable, scale immutable" is incoherent as written.**
Different families at the same `px` are different *optical* sizes. Without cap-height
normalisation (§8) a font change silently breaks the ramp. **Recommendation: adopt metric
normalisation, and curate three pairings rather than offering a font picker.**

**4. Density is listed as Identity but mutates Structure.** Spacing belongs to Structure.
**Recommendation: density is a bounded multiplier applied to Structure tokens — three
stops, never free — so Structure keeps ownership of rhythm.**

**5. "Colours completely user configurable" collides with accessibility and with meaning.**
Free colour choice permits illegible pairs and lets a student assign green to error.
**Recommendation: students choose hue and intensity; the engine derives every value and
owns contrast; role→meaning mapping is fixed.**

**And the largest one — is personalisation actually the right differentiator?**
It is a genuine retention mechanic for tools people live inside. For a student in short,
stressful bursts it is also a procrastination surface. I have not removed it, because you
are right that it differentiates — but §5.3 gates it behind real usage so the product never
offers a frightened student a legitimate reason not to study. **If you disagree with
earning it, that is the single decision in this document I would most want to revisit
before building.**

## 18. Future-proofing (5–10 years)

- **Choices, not values, are stored** — every engine improvement upgrades all existing workspaces retroactively.
- **Semantic tokens are a stable contract** — palettes, families and presets can change underneath without touching one primitive.
- **New surfaces inherit identity free** — a page built on primitives is automatically workspace-aware.
- **The four-hue cap prevents palette sprawl**, the failure mode of every long-lived design system.
- **Derivation is pure and tested**, so contrast guarantees survive refactors.
- **Platform portability** — Tier 1/2 tokens export to JSON for native, email, or print without carrying React.
- **Deprecation path** — a removed preset maps to its nearest surviving neighbour; a removed family falls back by metric similarity, not alphabetically.

---

**Status: draft, awaiting approval. No code written. `CONSOLE.md` and the 13 primitives are untouched.**
