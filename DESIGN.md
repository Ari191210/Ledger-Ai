# StudyLedger — Design System (build rulebook)

Read `REFERENCE.md` first — it's the five rules and the "why." This file is
the "how": exact tokens by job, the type/spacing scales as reusable values,
the actual components in the codebase, and a running decision log. Read both
in full before designing or laying out anything, and check your own output
against them before showing it.

## 1. Color tokens, by job

```
background        --bg              #0e0e0d
panel              --surface         #191918
panel (hover/nested) --surface-2     #212120
meter track         --surface-3      #2b2b29

ink (primary)        --text          #f3f2ee
ink (secondary)      --text-2        #9d9c96
ink (tertiary/label) --text-3        #67665f

hairline              --border        #262625
hairline (strong)     --border-2      #383835

accent (primary)      --accent        #c8f43a
accent (hover)        --accent-hover  #d4f85e
accent (press)        --accent-press  #b2dd22
accent (ink-on-accent) --accent-on    #141600
accent (data-mark)     --accent-strong #c8f43a (dark) / #4c7d0d (light)

accent-2 (secondary)   --accent-2      #5b8cff
accent-2 (ink-on-accent-2) --accent-2-on #ffffff

status positive        --positive      #8bd85f
status negative         --negative      #e8705d

grille dot        --dot    rgba(255,255,255,.09)
panel top-edge     --edge   rgba(255,255,255,.045)
```

## 2. Type scale (real px, which face goes where)

| Size | Face | Weight | Where |
|---|---|---|---|
| 11px | JetBrains Mono | 500 | labels, captions, every number |
| 12px | Urbanist / Mono | 400 / 500 | small body, chip text |
| 13px | Urbanist | 400–600 | default body, card titles |
| 14px | Urbanist | 400 | document body default |
| 18px | Urbanist | 600–700 | card/section titles |
| 22px | Urbanist | 700 | section headings |
| 30px | Urbanist / Mono | 700 | page headings / mid-size stat numbers |
| 44px | JetBrains Mono | 700 | hero score numbers |
| 60px | Urbanist | 800 | landing-page hero headline only |

Rule of thumb: **if it's a number, it's mono. If it's a sentence, it's
Urbanist.** Labels ("01 — ledger score", "pyq accuracy") are always mono,
lowercase, 11px, `0.08em` tracking, `--text-3`.

## 3. Spacing scale

Reuse these, don't invent new gaps:

```
4px   — inside a meter's label-to-bar gap
8px   — inside tight stacked groups (pillar rows)
12px  — internal padding on small chips/cards
16px  — standard content gap between sections; standard card padding
20px  — padding on hero/primary cards (Ledger Score card)
24px  — gap between a page's major columns
```

Radius: `6px` chips/small controls · `9px` inputs/buttons · `13px` cards
(default) · `18px` rare large panels · `999px` pills/avatars/LED dot.

## 4. Components actually in use

- **Button** (`components/ui/button.tsx`) — variants `primary` (lime fill,
  `--accent-on` text, inset highlight), `secondary` (bordered, `--surface-2`),
  `ghost` (text-only). Sizes sm/md/lg (h-8/9/11). Spring press
  (`whileTap scale 0.955`, `whileHover y:-1`) plus a UI click sound on
  pointerdown — motion and sound are part of the component, not optional.
- **Segmented** (`components/ui/segmented.tsx`) — pill-shaped tab group,
  `--surface-2` track, active tab gets a sliding lime pill
  (`layoutId` shared-element spring) with `--accent-on` text. Options wrap
  in `overflow-x-auto` on narrow layouts rather than stacking.
- **Ring** (`components/ui/ring.tsx`) — SVG circular progress. Track
  `--surface-3`, progress `--accent-strong`, `stroke-linecap: round`,
  rotated -90° so it starts at 12 o'clock. Center content passed as
  children, absolutely centered.
- **Card** (`.u-card` utility class) — the one panel primitive everything
  else builds on. See REFERENCE.md §6 for the canonical example.
- **StatNumber** — animated count-up wrapper around `.u-stat-number` mono
  styling; used for every headline figure.
- **LED dot** (`.u-led`) — 6-7px lime circle with a soft glow
  (`box-shadow: 0 0 6px -1px var(--accent)`), the "power on" indicator used
  in headers and the nav brand mark.
- **Reveal** (`components/motion/reveal.tsx`) — stagger-in wrapper, used to
  bring dashboard sections in with a slight delay cascade (0.04s steps).
- **App shell** — `IconRail` (fixed 60px, desktop-only, `md:flex`),
  `TopBar` (48px, search + streak/score chips + theme/sound/signout),
  `MobileTabBar` (fixed bottom, mobile-only counterpart to the rail).
- **QuickLog** — modal (tabs: focus/mistake/pyq) for logging study data
  from anywhere in the app.

## 5. Decision log

- **2026-09-04** — Locked "screen-native Braun" as the identity: flat device
  panels, one lime accent per panel, dot-grid grille texture, mono
  instrument-readout numerals. Rejected an earlier light/warm/orange
  direction ("too AI slop") and a blue-feature-panel dark variant in favor
  of this restrained lime-only system.
- **2026-09-04** — Command palette (⌘K) proposed and explicitly banned by
  the founder. Do not reintroduce in any redesign.
- **2026-09-05** — Established `REFERENCE.md` + this file as the design
  source of truth, following the "point AI at what you already have"
  principle rather than re-deriving brand values from memory each session.
  Any exploratory redesign work (e.g. in Paper) should read these first,
  and log its own direction/outcome here once it settles into something
  worth keeping.
- **2026-09-05** — Explored a dashboard redesign in Paper (not yet built in
  code, exploration only), researched against real dashboard/study-app
  references rather than re-deriving from the existing live page. Three
  ideas worth carrying forward if the dashboard gets revisited:
  - **Segmented instrument ring**: the 4 score pillars as ONE ring split
    into consecutive arcs at descending lime opacity (100/72/48/28%),
    with a small dot-legend beside it — replaces "ring + 4 separate bars"
    with one instrument, stays inside the one-lime-accent rule since it's
    still a single hue at different opacities.
  - **Streak LED strip**: a horizontal row of small square lime "LEDs"
    (14px, `--r-sm`-ish radius) for the last 14 days, today's dot marked
    with a `--text` border — reads as an instrument-panel indicator strip,
    fits the brand better than a literal flame icon or a full calendar
    grid for this specific stat.
  - **Human callout card**: a single stat framed as a sentence ("16 days
    without a miss") with a comparison caption beneath it, not just a
    number — a deliberate warm/human moment per Paper's design guidance.
  - **Dial-tip knob**: a small hollow lime-ringed dot marking the exact
    tip of the ring's fill, like a needle position on a physical dial
    (found via Pinterest/Behance research pass) — cheap addition, reads
    more like a real instrument than a bare rounded stroke-cap. Also
    considered but NOT applied: a tick-mark/dashed gauge style (radiating
    ticks instead of a smooth stroke) — even more literally "Braun dial,"
    worth trying if the ring gets revisited, bigger rebuild than this pass
    warranted.
  - Noted but not pursued: a "your score vs. class average" trend line
    (seen in an exam-prep app reference) — overlaps conceptually with the
    existing Peer Heatmap tool rather than something the dashboard itself
    needs.
- **2026-09-05** — Removed the tick-mark "backlog" dial (founder call) and
  instead widened the Paper dashboard using tools that already exist in
  the product rather than inventing new ones:
  - **Coach briefing banner**: full-width, real weekly diff copy (headline
    + two deltas) at the very top of the page — the one piece of narrative
    text on an otherwise numeric dashboard.
  - **Habits today** and **Deadlines** cards, built from the real
    `habits`/`habit_logs` and `deadlines` tables — and using the exact
    live `ToggleSwitch` and primary `Button` styling (the founder
    specifically likes these from Settings) rather than inventing new
    control styles.
  - A three-up **insights strip** (Circadian's best-accuracy time window,
    Spaced Review's due count, Mistake DNA's top pattern) — one line each,
    all real tool outputs, not new metrics.
  - Explicit ground rule going forward: the dashboard only shows what a
    real table/tool already computes. If a new dashboard widget needs data
    that doesn't exist yet, that's a signal to build the underlying
    feature first, not to mock up a number.
  - Fix Next reworked as icon-chip rows (subject icon + count chip +
    dashed divider, fixed-width lanes) instead of a grid of bordered boxes
    — cleaner at a glance, easier to scan than 4 same-size tiles.

- **2026-09-06** — Landing hero: the instrument is now lit at rest, and the
  power-on animation plays *into* that state rather than out of it. It used
  to be scrubbed from zero by scroll, so the resting state (and the
  server-rendered first paint, which is what a slow phone shows and what LCP
  is measured against) was a dead device reading `0` with every meter empty:
  the product at its most worthless, on the one screen meant to sell it.
  Three linked decisions came out of that pass:
  - **Lime above the fold, deliberately.** The lit dial, the tier and the
    four meters put more than one lime element in a single panel, which
    reads against rule 1 in REFERENCE.md §5. Resolved the way the segmented
    ring was: **one hue at descending opacities**, and here the opacity is
    not decorative, it tracks each pillar's weight in the score (40% pyq at
    full lime down to 15% consistency at 0.34). The whole dial-plus-meters
    group counts as one instrument, not five accents.
  - **The lit arc must match the number.** Ticks light to `SCORE / MAX` of
    the way round, not to a scroll position. A ring lit to a different
    fraction than the readout beneath it is a lying instrument, which is the
    one thing this product cannot be, even in marketing.
  - **Power-on is pure CSS**, no JS and no animation library, because the
    landing page is the first thing a student loads on a bad connection, and
    because a JS count-up from 0 would re-introduce the dead first paint.
    `prefers-reduced-motion` gets the lit instrument with no animation, since
    that is the resting state and not a reward for waiting.
  - Also in this pass: the hero CTA is no longer gated on scroll (it faded in
    at 80% of a three-screen pin, so the primary action needed ~2.5 screens
    of scrolling to reach), the pin dropped from 300vh to 200vh now that it
    carries only the caption story, and the dial gained an "example ledger"
    chip per rule 5, since 742 / "Strong" are illustrative.

- **2026-09-06** — Landing hero, part two: **the scroll-scrubbed climb is back**
  (founder call, same day). The dial starts at 0 and counts to 742 as you
  scroll, which was always the intent. The entry above was right that a dead
  resting state is what made the page feel lifeless, and wrong to conclude the
  scrub had to go. Both hold at once:
  - Scroll drives the climb, and it is **front-loaded**: the number reaches 742
    inside about 450px, roughly a third of the pin, rather than being metered
    out over three screens. The climb is the hook, not a toll.
  - ~~If no scroll arrives within 1.4s, the instrument powers itself on.~~
    **Reverted the same day (founder call).** The ticks lighting in sequence
    around the ring read as the dial rotating on its own, which is distracting
    on a page you have only just opened. Scroll owns the dial and nothing else
    does: it sits at 0 until you scroll. The accepted cost is that a visitor who
    never scrolls never sees the instrument lit.
  - The server-rendered markup is still the **lit** instrument, reset to zero in
    a layout effect before first paint. A slow phone paints a working device,
    and nothing flashes when hydration lands.
  - Ticks track the readout at **every point of the climb**, not just at rest,
    so the dial never shows a fraction that disagrees with its own number.
  - Kept from part one: CTA never gated on scroll, 200vh pin, "example ledger"
    chip, meter opacity tracking pillar weight.

- **2026-09-06** — Dashboard reference research (three parallel passes: physical
  instruments, historical record-keeping, contemporary digital craft). Four
  principles came back independently from all three, and they are worth keeping
  whether or not the larger direction below ever gets built:
  - **The accent marks the boundary and the closing figure, nothing else.**
    Double-entry ledger paper (Venice, 1494) spends red exactly twice: one
    hairline fencing the money column, and the balance carried forward. Red
    never carries information. Braun's own ET66 calculator is the same move, a
    grey keypad with one yellow "=" key. This is REFERENCE.md rule 1 with five
    centuries behind it.
  - **Quiet has to be legible.** A seismograph helicorder stacks each hour as a
    line down the page, dead flat where nothing happened: flat is evidence, not
    emptiness. Cricket's dot ball is the same idea. A study log is mostly
    nothing-happened and should say so without apology.
  - **Thresholds are printed, not drawn.** Aircraft dials paint the arc bands
    and the redline on the face, so the limit is visible with the needle at
    zero. A number with no printed scale invites the reader to invent one.
  - **A good instrument refuses to show noise.** The VU meter's 300ms
    integration time was chosen in 1939 so the needle physically cannot show a
    spike. The BBC PPM has seven bare numerals and no units, because false
    precision is a lie about how well anyone knows their own level. That is this
    product's thesis, already solved by broadcast engineers.

  **Applied immediately (built):** the ledger score panel had five lime elements,
  the ring plus four pillar bars, which broke rule 1 outright and left the panel
  with no foreground. The bars are now grey and the ring is the panel's one
  accent. The effect is that consistency at 11/150 became the obvious problem in
  the panel, where before it was the least visible thing in it. The ring also
  carries the tier boundaries (200/400/600/800) as notches cut through the arc in
  the ground colour, drawn above the arc rather than below it so they stay
  visible at every reading, which is the whole point of a printed threshold.

  **Direction proposed, not yet built: "the scorebook."** A cricket scorebook
  crossed with ledger paper, chosen because the audience knows the notation
  natively. The dot ball is a session with nothing to show for it; a maiden, six
  dots joined into one stroked M, is a whole session of honest work with no
  visible return, which is this product's moral position in a single glyph.
  Dismissal notation records *how* a topic beat you, not merely that it did.
  The wagon wheel, spokes from one centre with length by scoring, is the
  best-hours data drawn properly. Buildable against existing tables: helicorder
  focus history (focus_sessions), wagon-wheel best hours (pyq_attempts.taken_at,
  already computed by circadian), punch-card syllabus coverage
  (syllabus_topics.position, fixed columns so gaps stay countable). Dismissal
  notation needs a new column: mistakes.source records where, not how.

  Rejected on sight: Teenage Engineering's OP-1, whose signature move is four
  colour-coded encoders matched to same-colour on-screen parameters. It is
  multi-accent by design and collides head-on with rule 1.

- **2026-09-08** - Screen-reader verified, with NVDA on Windows, by the founder.
  Not inferred from markup: the three controls that carry a number a student
  acts on were listened to directly.
  - The **what-if dial** announces the action and its consequence, not an index.
    A slider whose positions are 0 to N announces "6" without help, and six of
    what is exactly the question a blind student cannot answer. `Knob` takes a
    `valueText` prop for this; anywhere it is omitted the raw value is the
    fallback, which is right for a two-position dial and wrong for a numeric one.
  - The **score ring** announces its number and tier. The svg is `aria-hidden`
    and the readout lives inside it, so without a label on the wrapper the
    figure the whole product is built around reached nobody.
  - **Calendar days** announce the date, whether it is today, and whether
    anything was studied. A bare digit passes an automated accessible-name check
    and tells a screen-reader user nothing, which is why the crawl reported no
    unnamed controls while the calendar was unusable.

  The general rule this settles: an automated name check proves a name exists,
  never that it means anything. Any control whose visible state is carried by
  colour or position needs that state in its accessible name, and the only way
  to know it reads properly is to listen to it.

---

*When a new UI pattern gets built and kept, add it to §4. When a real brand
decision gets made (new color use, a rejected direction, a new rule), add a
dated line to §5 rather than editing past entries — this file's history is
part of its value.*
