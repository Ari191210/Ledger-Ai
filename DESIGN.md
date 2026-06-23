---
name: StudyLedger
description: The student's operating system — 55 AI tools behind an aurora that never sleeps.
colors:
  paper: "#080808"
  paper-2: "#111111"
  ink: "#f2f2ef"
  ink-2: "#c0c0bc"
  ink-3: "#686864"
  cinnabar: "#ff5030"
  cinnabar-ink: "#ff6848"
  sage: "#5aaf6a"
  slate: "#5a9ed4"
  ochre: "#d4a840"
  plum: "#a888d4"
  teal: "#44aaaa"
  rule: "rgba(255,255,255,0.10)"
typography:
  display:
    fontFamily: "Orbitron, system-ui, sans-serif"
    fontSize: "96px"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.06em"
  headline:
    fontFamily: "Orbitron, system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "0.06em"
  title:
    fontFamily: "Orbitron, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.05em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Space Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  xs: "6px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "32px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.cinnabar}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.cinnabar-ink}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  glass-card:
    backgroundColor: "color-mix(in srgb, {colors.paper} 55%, transparent)"
    rounded: "{rounded.md}"
  input-default:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
---

# Design System: StudyLedger

## 1. Overview

**Creative North Star: "The Scholar's Dark Room"**

StudyLedger is precision tooling in low light. The WebGL aurora runs perpetually behind every surface — not as decoration, but as proof of life. Glass panels sit at 55–58% opacity so the aurora bleeds through without washing it out. Everything else is stripped back so the light can speak: near-black surfaces, crisp off-white type, and a single high-chroma accent (Cinnabar Red, `#ff5030`) used only where action is required.

The system rejects warmth-by-default. It's not soft, not rounded, not friendly-SaaS. A 16-year-old opens this at midnight before an exam and needs to feel that the tool is more capable than they are. The density is deliberate. The type is tight. The contrast is high. The aurora is alive.

Every palette variant (Porcelain, Ink, Dusk, Moss, Rose, Storm, Ember, Sand) follows the same rule: ultra-dark background, high-contrast ink, one atmosphere-tinted accent, and glows that let the user's chosen atmosphere breathe through the glass. The visual identity doesn't change — only the color of the light.

**Key Characteristics:**
- Aurora-first: every design decision serves the WebGL layer, not the other way around
- Dark by default, palette-switchable — light mode is an override, not the primary register
- Three-font system: Orbitron (display/structural), Inter (body/functional), Space Mono (data/labels)
- Glass panels as portals, not decoration — opacity tuned to let aurora show through
- Cinnabar Red is the only action color; it appears on ≤10% of any screen
- Category indicators use 5 named semantic colors (sage, slate, ochre, plum, teal) — never cinnabar

## 2. Colors: The Aurora Palette

One near-black base. One action accent. Five semantic tool-category colors. One atmosphere-glow pair per palette. Everything else is ink.

### Primary
- **Cinnabar Red** (`#ff5030` / `#ff6848` active): The sole CTA color. Used on primary buttons, active tool indicators, score pulses, and destructive confirmations. Its warmth is intentional against the cold dark — it reads immediately without competing with the aurora. Forbidden on decorative elements, card headers, or anything that isn't directly actionable.

### Secondary (Semantic Category Colors)
Five hues, one per tool category. Never used as brand accents — used exclusively for category tinting (background tints at 10% opacity, chip borders, progress fills):
- **Sage** (`#5aaf6a`): Writing & Language tools
- **Slate** (`#5a9ed4`): Research & Analysis tools
- **Ochre** (`#d4a840`): Exam Prep & Memory tools
- **Plum** (`#a888d4`): Creative & Ideation tools
- **Teal** (`#44aaaa`): Study Planning & Organization tools

### Neutral
- **Pitch** (`#080808`): Primary surface — the base everything sits on. Near-true black so the aurora's glow reads correctly.
- **Graphite** (`#111111`): Secondary surface — card backgrounds, input fills, sidebar panels.
- **Ivory** (`#f2f2ef`): Primary text. High contrast against Pitch (>18:1). Never replaced with a warm white.
- **Smoke** (`#c0c0bc`): Secondary text — tool descriptions, supporting copy, placeholder states.
- **Ash** (`#686864`): Tertiary text — metadata, timestamps, disabled states. Do not use for body copy.
- **Hairline** (`rgba(255,255,255,0.10)`): Rule color for dividers and card borders. Subtle — enough to read, not enough to compete.

### Named Rules
**The Aurora Rule.** Every surface decision must ask: does this let the aurora breathe through? If a panel opacity, border, or shadow blocks the WebGL layer, reduce it until the glow shows.

**The One Voice Rule.** Cinnabar Red is used on ≤10% of any given screen. Its rarity is its power. A page full of red accents is a page with no accent.

**The Category Rule.** Semantic colors (sage, slate, ochre, plum, teal) are for category identification only. They appear as 10%-opacity background tints and 100%-opacity chip/indicator accents. Never as button colors, heading colors, or brand moments.

## 3. Typography

**Display / Structural Font:** Orbitron (geometric sans-serif — tracked, architectural, technical authority)
**Body / Functional Font:** Inter (humanist sans-serif — readable, neutral, fast at small sizes)
**Data / Label Font:** Space Mono (monospace — precision, data, tool output)
**Prose / Long-form Font:** Lora (serif — essays, annotations, reading-heavy tool outputs)

**Character:** Orbitron is the voice of the system — structural, compressed, unambiguously digital. Inter handles everything the student reads at speed. The contrast axis (geometric display + humanist body) avoids the monoculture of "two sans-serifs that almost match."

### Hierarchy
- **Display** (Orbitron, 700, 96px, lh 0.95, ls 0.06em): Landing page hero only. One per page maximum. Never in tool UI.
- **Headline** (Orbitron, 900, 72px, lh 0.88, ls 0.06em): Major section titles on the landing page.
- **Title** (Orbitron, 700, 44px, lh 0.95, ls 0.05em): Tool page headers, section anchors, dialog titles.
- **Title-sm** (Orbitron, 700, 28px, lh 1.1, ls 0.04em): Card headings, sidebar section labels, sub-tool titles.
- **Body** (Inter, 400, 15px, lh 1.65): All tool descriptions, UI copy, help text. Max line length 65–75ch.
- **Body-prose** (Lora, 400, 16px, lh 1.72): Long-form output — essays, summaries, annotated text. Density-adjustable via `--density-prose`.
- **Label** (Space Mono, 600, 11px, ls 0.14em, uppercase): Data labels, score counters, tool metadata, Ledger Score readout.
- **Label-sm** (Space Mono, 600, 10px, ls 0.1em): Timestamps, sub-metadata, chip text.

### Named Rules
**The Weight Rule.** Orbitron only appears at 700+ weight. At 400 it loses its structural identity and reads as generic geometric sans. Never use Orbitron for body copy.

**The Mono Rule.** Space Mono signals data, precision, and system output. If it isn't a number, a score, a timestamp, or a label, it's the wrong font.

## 4. Elevation

StudyLedger uses **tonal-plus-glass layering**, not drop shadows. The aurora provides ambient light from below; adding drop shadows would fight it. Depth is expressed through background-color steps (`--paper` → `--paper-2`) combined with `backdrop-filter: blur()` and surface opacity.

### Glass Vocabulary
- **Primary glass** (`color-mix(in srgb, var(--paper) 55%, transparent)`, blur 20px, saturate 180%): Main content panels, tool cards, sidebar. Aurora bleeds through at 45%.
- **Modal glass** (`color-mix(in srgb, var(--paper) 72%, transparent)`, blur 20px): Dialogs, drawers, overlay panels. More opaque for focus — aurora still reads at edges.
- **Input glass** (`--paper-2` solid): Input fields and textareas are fully opaque — legibility over atmosphere.
- **Tooltip** (`--paper-2`, radius xs, 1px `--rule` border): No blur — tooltips need to read instantly.

### Named Rules
**The No-Drop-Shadow Rule.** Drop shadows (`box-shadow` with offset) are prohibited as elevation signals. They flatten against the dark background and fight the aurora glow. Use tonal steps and glass opacity instead. The only permitted box-shadow is the focus ring: `0 0 0 3px color-mix(in srgb, var(--cinnabar-ink) 18%, transparent)`.

## 5. Components

### Buttons
Alive and responsive — every press is confirmed, every hover is felt.
- **Shape:** Gently rounded (12px / `--radius-sm`)
- **Primary:** Cinnabar Red (`--cinnabar`) fill, Ivory text, 10px 20px padding. On hover: lightens to `--cinnabar-ink`, translateY(-1px), box-shadow glow at 30% cinnabar opacity. On active: translateY(0), shadow collapses. Transition: 140ms ease.
- **Ghost:** Transparent fill, Ivory text, 1px `--rule` border. On hover: background tints to `color-mix(in srgb, var(--ink) 6%, transparent)`. On focus: cinnabar focus ring.
- **Disabled:** 40% opacity, `cursor: not-allowed`. No hover state.
- **Icon-only:** 36×36px minimum touch target. No label permitted — always provide `aria-label`.

### Inputs / Fields
- **Style:** `--paper-2` fill, 1px `--rule` border, 12px radius, 10px 14px padding, Inter 15px.
- **Focus:** Border shifts to `--cinnabar-ink` at 60% opacity, focus ring `0 0 0 3px color-mix(in srgb, var(--cinnabar-ink) 18%, transparent)`. Transition: 160ms ease.
- **Error:** Border `--cinnabar` at 100%, no fill change. Error message below in Smoke text.
- **Disabled:** 50% opacity, `--paper` fill, `cursor: not-allowed`.
- iOS auto-zoom fix: minimum 16px font-size on mobile (`@media (max-width: 767px)`).

### Glass Cards / Containers
- **Corner Style:** 18px radius (`--radius`) — gently curved, not bubble-round.
- **Background:** `color-mix(in srgb, var(--paper) 55%, transparent)` — aurora shows through.
- **Backdrop:** `blur(20px) saturate(180%)`.
- **Border:** 1px `color-mix(in srgb, var(--ink) 10%, transparent)` — hairline, not structural.
- **Internal Padding:** 16–24px (`--spacing-md` to `--spacing-lg`). No nested cards.
- **Hover (interactive cards):** border opacity lifts to 20%, translateY(-2px), transition 200ms.

### Tool Category Chips
- **Style:** Semantic bg at 10% opacity (`--sage-bg`, `--slate-bg`, etc.), matching 100% border at 30% opacity, 6px radius (`--radius-xs`).
- **Text:** Space Mono, 10px, 0.1em tracking, uppercase, same semantic color at 80% opacity.
- **Selected state:** bg lifts to 20% opacity, border to 50%.

### Navigation
- **Top bar:** Glass (`--paper` 72% opacity, blur 20px), full-width, fixed at top. Height 52px.
- **Active indicator:** Background tint (`color-mix(in srgb, var(--cinnabar) 12%, transparent)`) — no border-left accent ever.
- **Tool sidebar:** Scrollable, glass, 240px wide. Category sections separated by `--rule` hairlines.
- **Mobile:** Bottom tab bar, 5 primary destinations, 44px minimum tap targets.
- **Typography:** Inter 13px / Space Mono 10px for labels.

### Split-View Tool Layout (Signature Component)
The core pattern for all 55 tools: left panel (input) | right panel (output).
- **Left (Input):** `--paper-2` fill, full height, 20px padding, scrollable. Houses textarea, options, Submit button.
- **Right (Output):** Glass panel (`--paper` 55% opacity), aurora breathes through. Output renders here with the `ai-3d-reveal` animation (0.6s expo-out).
- **Divider:** 1px `--rule` vertical line. Draggable on desktop (30/70 to 70/30 range). Stacks vertically on mobile.
- **Empty state:** Smoke text, centered, Space Mono label. No illustration.

### Ledger Score (Signature Component)
- Large numeral: Space Mono, 700, 72px+, `--ink` color.
- Pulse animation on score change: Cinnabar glow radiates out, `cubic-bezier(0.16, 1, 0.3, 1)` expo-out, 600ms.
- Progress arc: SVG stroke, `--cinnabar` color, 3px stroke-width, rounded linecap.

## 6. Do's and Don'ts

### Do:
- **Do** let the aurora breathe — keep glass panel opacity at 50–65%, never higher. The WebGL background is the identity.
- **Do** use OKLCH for all new color declarations. Existing hex tokens in the CSS variables are the source of truth; never redeclare them as rgba.
- **Do** reserve Cinnabar Red (`--cinnabar` / `--cinnabar-ink`) exclusively for primary actions and critical UI states. One accent, one purpose.
- **Do** use expo-out easing (`cubic-bezier(0.16, 1, 0.3, 1)`) for all motion. Fast in, slow deceleration — never bounce, never elastic.
- **Do** respect `prefers-reduced-motion`: the aurora WebGL animation must pause, all CSS transitions must collapse to instant crossfades.
- **Do** use background tints (`color-mix`) instead of border-left for active/selected states.
- **Do** keep the split-view (input left | output right) as the tool layout. Any deviation needs a strong justification.
- **Do** size all touch targets to minimum 44×44px on mobile.
- **Do** write WCAG AA contrast: body text (Ivory on Pitch exceeds 18:1), minimum 4.5:1 for any text.

### Don't:
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on any card, list item, or nav element. Replace with background tint or `borderTop`.
- **Don't** use gradient text (`background-clip: text` with a gradient). Emphasis is weight or size, never paint.
- **Don't** use bounce or elastic easing (`cubic-bezier(0.34, 1.4, ...)` or `0.34, 1.56, ...`). These were replaced project-wide with expo-out.
- **Don't** animate layout properties (`width`, `padding-left`, `height`, `margin`). Animate `transform` and `opacity` only.
- **Don't** use drop shadows as elevation signals — they flatten against the dark and fight the aurora glow. Use tonal steps and glass opacity instead.
- **Don't** use warm neutral backgrounds (cream, parchment, sand tones) as the primary surface — this is the 2026 AI default and is explicitly banned.
- **Don't** use gradient text headings — banned in PRODUCT.md and Impeccable absolutes.
- **Don't** build identical card grids (same-sized cards with icon + heading + text). Use varied layouts.
- **Don't** put tiny uppercase tracked eyebrows above every section. One deliberate kicker is voice; an eyebrow on every section is AI grammar.
- **Don't** use Orbitron at weights below 700 — it loses structural identity.
- **Don't** use hardcoded `rgba()` or `#hex` values in component code. All color through CSS custom properties (`var(--paper)`, `var(--cinnabar)`, etc.).
- **Don't** use glassmorphism decoratively. Glass panels exist to let the aurora through. If there's no aurora beneath, use a solid surface.
- **Don't** make the tool UI look like generic SaaS (Notion, Vercel-gray), gamified edtech (Duolingo), or institutional edtech (Google Classroom). If it could be mistaken for any of those, rework.
