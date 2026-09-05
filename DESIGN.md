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
  - Fix Next reworked as icon-chip rows (subject icon + count chip +
    dashed divider, fixed-width lanes) instead of a grid of bordered boxes
    — cleaner at a glance, easier to scan than 4 same-size tiles.

---

*When a new UI pattern gets built and kept, add it to §4. When a real brand
decision gets made (new color use, a rejected direction, a new rule), add a
dated line to §5 rather than editing past entries — this file's history is
part of its value.*
