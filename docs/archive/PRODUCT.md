> # ARCHIVED — NOT GOVERNING
>
> **Moved to `docs/archive/` on 2026-08-05. This file decides nothing.**
>
> Superseded 2026-08-04. Retained for historical rationale only.
>
> Authority now lives in **`PRODUCT_PRINCIPLES.md`**, **`PRODUCT_DECISIONS.md`**,
> **`EXECUTION_PLAN.md`** and **`CLAUDE.md`** — see `docs/GOVERNANCE_MAPPING.md` for a
> statement-by-statement map of where everything went.
>
> Retained because the reasoning is worth keeping. **Do not follow it.**

---
> ---
> ## âš ï¸ DEPRECATED â€” 2026-08-04
>
> **This document has been superseded by [`CONSOLE.md`](./CONSOLE.md).**
>
> It is retained for historical context and design rationale only.
>
> **Do not use this document for implementation, design, engineering, UX, or product
> decisions.** All future work must follow `CONSOLE.md`.
>
> Its visual direction is void: the aurora WebGL background, the glass vocabulary, the
> "OKLCH only" rule and the anti-reference list no longer govern anything. The audience
> definition and product purpose below remain accurate as background reading.
> ---

# Product

## Register

product

## Users

Grade 9â€“12 students (primarily India, CBSE/ICSE/IB/A-level), aged 14â€“18. Using the app alone at a desk, often late at night before exams. Occasionally in study groups via Study Rooms. Parents occasionally check progress. Users are under pressure and time-constrained â€” they need tools that feel fast, capable, and trustworthy, not playful or babyish.

## Product Purpose

StudyLedger is the student's operating system â€” one Ledger Score that tracks exam readiness, fed and displayed by 46 tool pages covering 85 distinct AI capabilities across every academic task: essay writing, exam prep, flashcards, research, paper analysis, study planning, and more. The Ledger Score gamifies consistency. Study Rooms add human accountability via a bail-pact mechanic. Success = a student opens the app daily because it genuinely helps them study better, not because of dark patterns.

## Brand Personality

Sharp, capable, warm. Not edgy â€” trustworthy enough that a parent would approve. Not corporate â€” alive enough that a 16-year-old would choose it over generic Google Docs. The aurora WebGL background is the signature visual identity: color-alive, cinematic, distinctive.

## Anti-references

- Generic SaaS dashboard (Notion clones, Vercel-aesthetic gray) â€” too cold and corporate for students
- Gamified kiddie apps (Duolingo, Khan Academy cartoon style) â€” too juvenile for serious exam prep
- Standard edtech (Google Classroom, Byju's) â€” institutional, lifeless
- Cream/paper/parchment warm neutrals â€” the 2026 AI default; do not use
- Gradient text on headings â€” banned
- Identical card grids â€” overused, replace with varied layouts
- Tiny uppercase tracked eyebrows above every section

## Design Principles

1. **The aurora is the identity** â€” the WebGL background is what makes StudyLedger visually distinctive. Every design decision must let it breathe. Glass panels, opacity, blur â€” all in service of the aurora showing through.
2. **Capable over cute** â€” every UI element should make a student feel like the tool is serious and powerful. No rounded bubbles, no cartoon icons.
3. **Speed is a feature** â€” tool pages must feel instant. Skeletons, optimistic UI, no layout shift.
4. **Consistency across 55 tools** â€” the split-view layout (left: input, right: output) is the core pattern. Deviations need strong justification.
5. **OKLCH only** â€” no hardcoded rgba/hex anywhere. All color through CSS variables.

## Accessibility & Inclusion

WCAG AA minimum. Keyboard navigation required for all tool pages. `prefers-reduced-motion` respected â€” aurora animation must pause/reduce. No color as sole indicator. Mobile-first: 375px baseline, all 55 tools functional on mobile.

