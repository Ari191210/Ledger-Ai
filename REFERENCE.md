# StudyLedger — Design Reference

This is the source of truth for what StudyLedger looks like. Read this in full
before designing, generating, or laying out anything for this product — in
code, in Paper, in Figma, anywhere. Every value below is copied directly from
the live source (`app/globals.css`, live components), not sampled or
approximated from a screenshot.

**Codename for the visual identity: "screen-native Braun."** Think a Dieter
Rams instrument panel rendered natively for a screen — flat device faces, one
accent color used with real discipline, tiny lowercase technical labels,
mono numerals that read like an LCD readout.

## 1. Colors — every one, and its job

Dark is the default and primary theme. Light is a secondary alternate palette
(same structure, different values) — reference it only if explicitly asked
for light mode.

| Token | Hex (dark) | Job |
|---|---|---|
| `--bg` | `#0e0e0d` | Page ground. Never pure black. |
| `--surface` | `#191918` | Default panel/card fill. |
| `--surface-2` | `#212120` | Hover state for cards; nested surfaces (chips, inputs). |
| `--surface-3` | `#2b2b29` | Progress-bar tracks, the "unfilled" part of any meter. |
| `--text` | `#f3f2ee` | Primary text, headings, big numbers. |
| `--text-2` | `#9d9c96` | Secondary text — body copy, labels that need to read but not shout. |
| `--text-3` | `#67665f` | Tertiary — captions, timestamps, disabled, the numbered section labels. |
| `--border` | `#262625` | Default hairline border on every panel. |
| `--border-2` | `#383835` | Stronger border — hover states, dashed "add" outlines. |
| `--accent` (lime) | `#c8f43a` | THE brand color. Primary actions, the one highlighted element per panel, the power LED. |
| `--accent-hover` | `#d4f85e` | Lime hover state. |
| `--accent-press` | `#b2dd22` | Lime active/press state. |
| `--accent-weak` | `#23290d` | Lime tinted background wash (rare — a selected/active fill behind lime text). |
| `--accent-on` | `#141600` | Text/icon color WHEN placed on top of lime. Near-black, never white-on-lime. |
| `--accent-strong` | `#c8f43a` (dark) / `#4c7d0d` (light) | The accent used for data marks/rings/text where a true LED lime would be too loud on that surface — same role as `--accent` in dark, deliberately darker in light mode for contrast. |
| `--accent-2` (blue) | `#5b8cff` | Secondary accent. One specific job: a second persistent data series or the second stat, never a general-purpose second color. |
| `--accent-2-on` | `#ffffff` | Text/icon on top of blue. |
| `--positive` | `#8bd85f` | Rare — positive status only. |
| `--negative` | `#e8705d` | Rare — error/negative status only. |
| `--dot` | `rgba(255,255,255,0.09)` | The dot-grid grille texture. |
| `--edge` | `rgba(255,255,255,0.045)` | The "plastic catches light" 1px top highlight inside every card. |

**Rule: at most one lime element per panel.** If a screen needs to show more
than one highlighted thing, only one gets lime — the rest stay grayscale, or
use the blue secondary accent for a genuinely secondary series.

## 2. Type

- **UI/body font:** Urbanist. Weights used: 400 (body), 600 (semibold —
  card titles), 700–800 (bold/extrabold — headings, the brand wordmark).
- **Numeral/label font:** JetBrains Mono. **Every number the product shows,
  and every small technical label, is mono — never Urbanist.** This includes
  scores, stats, dates, timestamps, section index labels ("01 — ledger
  score"), badges, chip text.
- **Type scale (rem / px @ 16px root):**

  | Token | Size | Line-height | Typical use |
  |---|---|---|---|
  | `text-2xs` | 11px | 1.4 | mono labels, captions, timestamps |
  | `text-xs` | 12px | 1.45 | small body, chip text |
  | `text-sm` | 13px | 1.5 | default body, card copy |
  | `text-base` | 14px | 1.55 | default document body size |
  | `text-lg` | 18px | 1.35 | card titles, sub-headings |
  | `text-xl` | 22px | 1.25 | section headings |
  | `text-2xl` | 30px | 1.15 | page headings |
  | `text-3xl` | 44px | 1.05 | hero numbers, marketing display |
  | `text-4xl` | 60px | 1.0 | landing-page hero headline only |

- **Tracking:** headings and the brand wordmark use tight tracking
  (`-0.015em` to `-0.02em`). Mono labels use OPEN tracking (`0.08em`) and are
  lowercase, never uppercase, never bold beyond 500 weight.
- **Numerals are always tabular** (`font-variant-numeric: tabular-nums`) so
  digits don't shift width as they change.

## 3. Spacing & radius

- Radius scale: `6px` (sm — chips, small controls) · `9px` (md — inputs,
  buttons) · `13px` (lg — cards, the default panel radius) · `18px` (xl —
  rare, larger hero panels) · `999px` (full — pills, avatars, the LED dot).
- Cards (`.u-card`): 1px `--border`, `--r-lg` (13px) radius, a 1px inset top
  highlight (`--edge`) plus a soft drop shadow — reads as a flat device face,
  not a floating material-design card. Hover state (`.u-card--hover`)
  swaps to `--border-2` / `--surface-2`.
- Standard content gutter/gap in the app shell is `16px` (`space-y-4` /
  `gap-4`) between sections, `12–16px` internal card padding.

## 4. Logo / brand mark

- The mark is a single square, `--r-md` (9px) radius, filled `--accent`
  lime, with a bold "S" (or "SL" at larger sizes) in `--accent-on` centered
  inside. Sizes used: 24–32px in nav contexts, 40–48px in marketing/OG
  contexts.
- The wordmark is "StudyLedger" set in Urbanist ExtraBold (`.u-brand`),
  tight tracking, always paired with either the square mark or the smaller
  `.u-led` lime dot (a 6-7px lime circle with a soft glow) — never the
  wordmark alone as a lockup.
- Clear space: at least the mark's own width on all sides before another
  element starts. Never place the mark on any background except `--bg`,
  `--surface`, or pure white/black — never on a busy image or gradient.

## 5. Five things this brand must never do

1. **Never more than one lime element per panel.** A screen with three lime
   accents fighting each other is off-brand no matter how good each one
   looks alone.
2. **Never white text on lime, never lime-on-lime.** Text on lime is always
   `--accent-on` (near-black). Contrast is non-negotiable.
3. **Never gradients, glassmorphism, or drop-shadow-heavy "floating card"
   treatments.** Panels are flat device faces (hairline border + one soft
   inset highlight), not glossy glass — that reads as generic 2019-era SaaS,
   which this brand explicitly rejects.
4. **Never a command palette / ⌘K pattern.** Explicitly rejected by the
   founder for this product ("command k is a ban straight up ban") —
   don't propose it again in any redesign.
5. **Never invent data, dates, or specifics in placeholder content that
   isn't clearly marked as an example.** If a number is illustrative, it
   must read as illustrative (e.g. a hero demo card is labeled "example");
   real product screens never fabricate a stat that looks like live data.

## 6. One example, done right — the Ledger Score card

The dashboard's top card is the clearest expression of the whole system:

- Card shell: `.u-card`, 20px padding, radius 13px.
- Header row: a `.u-label` reading "01 — ledger score" (mono, 11px, lowercase,
  `--text-3`) on the left; a single 6px lime `.u-led`-style dot on the far
  right — the "power on" indicator, doing the one lime job in the header.
- Below it: a 132px circular ring (11px stroke), track in `--surface-3`,
  progress arc in `--accent` (lime), rotated so it starts at 12 o'clock and
  fills clockwise. Centered inside: the score as a huge mono `--text-3xl`
  number in `--text`, with `/1000` beneath it in `--text-2xs`/`--text-3`.
- Beside the ring: the tier name in Urbanist semibold 13px `--text`, a mono
  caption below it in `--text-3`, then a stack of labeled meters — each a
  `.u-label` + mono point count on one line, a 4px `--surface-3` track with
  an `--accent` fill beneath it.
- Nothing here is a gradient, a shadow-heavy floating card, or a second
  accent color. One ring, one lime fill, mono numbers everywhere a number
  appears. That restraint IS the brand.

---

*Maintained alongside the codebase. If a value here ever drifts from
`app/globals.css`, the CSS file is the truth — update this doc to match it,
not the other way around.*
