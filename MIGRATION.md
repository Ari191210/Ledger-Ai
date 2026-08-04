# STABILIZATION & MIGRATION — the master document

**The single operational record for making StudyLedger one product.**

Governed by `CONSOLE.md` (the *what*). This is the *how*, the *in what order*, and the *how much*.
Supersedes the previous strategy-only version of this file.

> **Status: audit complete, no code changed.** Every number below was measured on
> 2026-08-04 by script, not estimated. Re-run the audit before trusting figures
> older than a month.

---

## 0. MEASURED BASELINE

| Reality | Number | Source |
|---|---|---|
| Route files (`page`/`layout`/`loading`/`error`) | **78** | filesystem walk |
| Pages | **68** | `**/page.tsx` |
| — on Console | **5** | imports `components/console` |
| — on legacy | **63** | remainder |
| **Migration progress** | **7.4%** | 5 / 68 |
| Tool routes | 46 | `app/tools/*/page.tsx` |
| API routes | 25 | `app/api/**/route.ts` |
| Inline `style={{}}` objects in route files | **6,270** | regex count |
| Distinct hardcoded hex colours | **193** | across `app/` + `components/` |
| Distinct hardcoded font sizes | **37** | `fontSize:` literals |
| Distinct hardcoded border radii | **22** | `borderRadius:` literals |
| Stylesheets | 4 (`globals` 2,421 · `editorial` 759 · `severity-patch` 45 · `console` 382) | |
| Motion runtimes shipped | **3** (gsap 7 live · motion 4 · framer-motion 1) | |
| Components never imported | **16** (~2,382 lines) | import graph |
| Files over the 500-line limit | **23** | |
| Segments with `loading.tsx` | **2 / 68** | |
| Segments with `error.tsx` | **1 / 68** | |
| Segments with `not-found.tsx` | **0 / 68** | |

**The one-line diagnosis:** there is no single system to have a single feel. 6,270
inline style objects and 193 colours *are* the design system in practice.

---

## 1. MIGRATION MATRIX

**Status key** — `LEGACY` on globals.css/inline · `PARTIAL` mixed · `CONSOLE` migrated · `BROKEN` user-visible defect
**Effort** — `S` <2h · `M` 2–6h · `L` 6–16h · `XL` 16h+ (solo, ~6h/week available)

### 1A. Core routes (22)

| Route | Status | Pri | Dependencies | Effort | Recommendation |
|---|---|---|---|---|---|
| `/` | LEGACY | P1 | Console chrome | L | **Rebuild.** Marketing surface, first impression, currently on the newspaper-era system. |
| `/dashboard` | **BROKEN** | **P0** | Console chrome, Tabs, Readout | XL | **Rebuild.** 1,516 lines, 187 inline styles, the **only** surviving `backdrop-filter` (banned by CONSOLE.md §2.4), and **2 dead links** (below). Highest-traffic authenticated page. |
| `/dashboard/profile` | LEGACY | P2 | Field, Select | M | Migrate. 302 lines. |
| `/dashboard/saved` | LEGACY | P2 | Panel, Empty | S | Migrate. |
| `/auth` | LEGACY | **P0** | Field, Control | M | **Rebuild.** Every user passes through it; currently off-system. Gate to everything. |
| `/auth/callback` | LEGACY | P3 | — | S | Leave. No visual surface. |
| `/onboard` | LEGACY | P1 | Console chrome, Field | L | **Rebuild.** First-run experience; sets the impression the rest inherits. |
| `/console` (NOW) | CONSOLE | — | — | — | Done. **Unlinked — see P0-3.** |
| `/console/work` | CONSOLE | — | — | — | Done. Unlinked. |
| `/console/ai` | CONSOLE | — | — | — | Done. Unlinked. |
| `/console/practice` | CONSOLE | — | — | — | Done. Unlinked. |
| `/console/analytics` | CONSOLE | — | — | — | Done. Unlinked. |
| `/pricing` | LEGACY | P1 | Control, Panel | M | Rebuild. Payment surface; Razorpay switch lands here. |
| `/limit` | LEGACY | P2 | Empty, Control | S | Migrate. Quota wall — currently reads as an error, should read as an invitation. |
| `/faq` | LEGACY | P3 | Text, Stack | S | Migrate. Static prose. |
| `/legal/terms` | LEGACY | P3 | Measure, Text | S | Migrate as a set — all four share a `Section` component. |
| `/legal/privacy` | LEGACY | P3 | ↑ same | S | Migrate with the set. |
| `/legal/data` | LEGACY | P3 | ↑ same | S | Migrate with the set. |
| `/legal/ip` | LEGACY | P3 | ↑ same | S | Migrate with the set. |
| `/parent/[code]` | LEGACY | **P1** | Panel, Readout, Track | M | **Rebuild.** This is the payment surface per current strategy and it is unmigrated and unauthenticated. |
| `/admin` | LEGACY | P3 | — | — | **Leave permanently.** 724 lines, 231 hex, single-operator internal tool. Migrating it is pure cost. Mark it exempt in governance. |
| `/tools` (layout) | LEGACY | P1 | Console chrome | M | Wrap. One change makes all 46 tools read as one product (see P1-4). |

### 1B. Tool routes (46) — grouped by recommendation

All 46 are `LEGACY`. The canonical registry `lib/tools-registry.ts` is **clean: 46 slugs, 46 pages, zero drift.** Do not introduce a second registry.

**GROUP A — convert first (5).** Chosen by their role in the core loop, not by size.

| Slug | Lines | Inline | Effort | Why first |
|---|---|---|---|---|
| `syllabus` | 359 | — | M | Unlocks 250 Score points; the single highest-value activation step |
| `practice` | 395 | — | M | Core loop |
| `grade-tracker` | 614 | 207 | L | Feeds the record — the strategic asset |
| `exam-planner` | 625 | 187 | L | Feeds the record |
| `recall-studio` | 361 | — | M | Core loop |

**GROUP B — tab hubs, blocked on a `Tabs` primitive (8).** These are the largest files in the repo and each is several tools behind a tab bar. **`Tabs` does not exist in the Console primitive set — this is the critical path for ~60% of remaining tool code.**

| Slug | Lines | Inline | Effort |
|---|---|---|---|
| `exam-practice` | 1,432 | 451 | XL |
| `admissions` | 1,203 | 465 | XL |
| `learn-lab` | 1,113 | 316 | XL |
| `study-command` | 1,027 | 195 | XL |
| `writing-tools` | 836 | 272 | L |
| `exam-triage` | 735 | 187 | L |
| `analysis-hub` | 637 | 227 | L |
| `research-suite` | 630 | 191 | L |

**GROUP C — merge candidates (7).** Confirmed shared component names across pages — duplicated logic shipping as separate destinations.

| Duplication | Pages | Recommendation |
|---|---|---|
| `CrunchTab` | `exam-practice`, `exam-triage` | Merge into one |
| `MindMapTab`, `ConceptConnectTab` | `learn-lab`, `reference-builder` | Merge |
| `FormulaTab` | `recall-studio`, `reference-builder` | Merge |
| `Section` | 4 × `legal/*` | Extract to one shared component |

**GROUP D — the long tail (26).** Convert in PostHog usage order, one per session.

`paper-trauma` (1,096) · `marks-obituary` (1,071) · `paper-autopsy` (912) · `panic-triage` (879) · `marks-forensics` (834) · `focus-lab` (644) · `rooms` (605) · `reference-builder` (558) · `exam-sim` (453) · `post-exam` (452) · `language-lab` (385) · `calibration` (339) · `silent-topics` (331) · `report-tools` (314) · `forgetting-forecast` (300) · `source` (295) · `paper-pattern` (279) · `gpa-sim` (253) · `flashcards` (204) · `memory-toolkit` (203) · `resume` (200) · `interview` (199) · `debate` (163) · `model-answer` (158) · `lab-report` (157) · `compare` (155) · `study-guide` (152) · `citation` · `case-study` · `exam-day` · `personalise` · `presentation` · `timeline`

**Deletion candidates within Group D** — zero usage in PostHog for 90 days should mean deletion, not migration. Decide this *before* converting, not after.

---

## 2. INCONSISTENCY INVENTORY

### 2.1 Broken — user-visible today

| # | Defect | Evidence |
|---|---|---|
| B1 | **`/tools/doubt` → 404.** Dashboard quick-launch pill. | `app/dashboard/page.tsx:1028` |
| B2 | **`/tools/notes` → 404.** Dashboard quick-launch pill. | `app/dashboard/page.tsx:1030` |
| B3 | **Zero `not-found.tsx`.** B1/B2 land on the framework default — no branding, no way back. | 0 of 68 segments |
| B4 | **One `error.tsx` repo-wide.** Any thrown error in 67 segments shows an unstyled failure. | 1 of 68 |
| B5 | `app/loading.tsx` renders the legacy skeleton on **Console** navigations — flash of the old design system on every Console route. | known defect |

### 2.2 Mixed design systems

| # | Issue |
|---|---|
| D1 | **4 stylesheets, 3 import scopes** — `globals.css` (2,421) · `editorial.css` (759) · `globals-severity-patch.css` (45, **never imported**) · `console.css` (382) |
| D2 | **6,270 inline style objects** in route files — the de-facto design system |
| D3 | **`backdrop-filter` survives in `/dashboard`** — explicitly banned |
| D4 | **3 motion runtimes** — gsap (7 live files), motion (4), framer-motion (1) |
| D5 | Console and legacy have **no shared chrome** — different navigation models |

### 2.3 Typography

| # | Issue |
|---|---|
| T1 | **37 distinct hardcoded font sizes** vs a 6-step ramp. Worst offenders: `13px`(22), `11px`(18), `12px`(11), `14px`(11) |
| T2 | `px` and `rem` mixed arbitrarily — `1rem`, `0.88rem`, `0.72rem`, `0.68rem` alongside px |
| T3 | Legacy faces (Orsiri + 4 others) load on all 63 legacy routes; Console loads Plex + 2 Indic — **7 families in one product** |

### 2.4 Colour

| # | Issue |
|---|---|
| C1 | **193 distinct hardcoded hex values** vs 8 neutrals + 4 semantic |
| C2 | Legacy palette is a *different product*: `#f0ebe0` (24 uses), `#c55a2b` (19), `#e0d8ce` — parchment and cinnabar, the rejected editorial direction, still shipping |
| C3 | A runtime palette script in `app/layout.tsx` sets `--paper`/`--ink`/`--rule`/`--cinnabar` on `:root` — the exact mechanism CONSOLE.md forbids |

### 2.5 Spacing & geometry

| # | Issue |
|---|---|
| S1 | **22 distinct border radii** — `8`, `12`, `50`, `2`, `10`, `6px`, `4px`, `0`, `3`, `14`, `16`… |
| S2 | No spacing scale outside Console; arbitrary pixel margins throughout |

### 2.6 Navigation

| # | Issue |
|---|---|
| N1 | **Console is unreachable.** Zero inbound links from anywhere outside `app/console`. Five finished surfaces, zero users. |
| N2 | Dashboard duplicates the canonical registry inline (`DashTool[]`, 47 entries) instead of importing `lib/tools-registry.ts`, which it *also* imports |
| N3 | Four hardcoded quick-launch pills bypass the registry entirely — the source of B1/B2 |
| N4 | Tool discovery = a 46-item list. No hierarchy, no search-first model |

### 2.7 Dead weight

| # | Issue |
|---|---|
| X1 | **16 components never imported** (~2,382 lines), incl. `product-walkthrough` (393), `hero-interactive-demo` (383), `palette-toggle` (240) |
| X2 | `three` and `@react-three/*` imported by **exactly one file, which is itself dead** — deps removable today |
| X3 | `lib/animation.ts` — zero importers |
| X4 | `globals-severity-patch.css` — never imported |
| X5 | **3 deprecated constitutions still in repo** (`PRODUCT.md`, `PRODUCT_CONSTITUTION.md`, `DESIGN.md`) — the documented root cause of the past design oscillation |
| X6 | 23 files over the 500-line limit |

### 2.8 Duplicated / drifted

See Group C. Plus: `lib/desks.ts` and `lib/notifications.ts` reference `exam-day`, which the dashboard's inline array omits — a tool reachable from a notification but not from the UI.

---

## 3. PHASED ROADMAP

### P0 — Launch blockers · ~8h

Nothing ships until these are green. All are defects, not improvements.

| # | Task | Effort | Depends on |
|---|---|---|---|
| P0-1 | Fix `/tools/doubt` + `/tools/notes` — repoint the 4 pills at `lib/tools-registry.ts`, delete the hardcoded array | S | — |
| P0-2 | Add `not-found.tsx` (root) + `error.tsx` per top-level segment | S | — |
| P0-3 | **Decide Console's fate: link it or hide it.** Five finished surfaces with zero users is the largest unrealised asset in the repo | S | founder decision |
| P0-4 | Fix `app/loading.tsx` leaking the legacy skeleton into Console | S | — |
| P0-5 | Wire the test suite into CI + add `"test"` to `package.json` | S | — |
| P0-6 | Delete X1–X5 (dead components, dead deps, dead CSS, deprecated constitutions) | M | — |

**Exit gate:** zero 404s from any in-product link · every segment has an error boundary · `tsc` + `next build` + tests green in CI.

### P1 — Must be rebuilt · ~40h

Core journey surfaces. Rebuild rather than migrate — they define the product's feel.

| # | Task | Effort | Depends on |
|---|---|---|---|
| P1-1 | **Console form primitives** — `Select`, `Toggle`, `Choice`, `Tabs` | L | — |
| P1-2 | Console chrome — wordmark, persistent Score, account, `⌘K` | L | P1-1 |
| P1-3 | `/auth` + `/onboard` | L | P1-1 |
| P1-4 | **Wrap `app/tools/layout.tsx` in Console chrome** — highest leverage single change in the document: all 46 tools instantly read as one product while their interiors stay legacy | M | P1-2 |
| P1-5 | `/dashboard` rebuild | XL | P1-1, P1-2 |
| P1-6 | `/parent/[code]` | M | P1-1 |
| P1-7 | `/pricing` (with Razorpay) | M | P1-1 |

**Exit gate:** a student can complete signup → onboard → dashboard → one tool without leaving the Console visual language at any shell level.

### P2 — Migration · ~120h, open-ended

| # | Task | Effort | Depends on |
|---|---|---|---|
| P2-1 | Group A tools (5) | L | P1-1, P1-4 |
| P2-2 | Group C merges (7 → 3) — **do before converting, never after** | L | — |
| P2-3 | Group B tab hubs (8) | XL | `Tabs` (P1-1) |
| P2-4 | Group D long tail (26), PostHog usage order, 1–2 per session | XL | — |
| P2-5 | `/`, `/dashboard/profile`, `/dashboard/saved`, `/limit` | L | P1-2 |

**Exit gate:** `globals.css` and `editorial.css` empty and deleted; `[data-console]` scope removed because everything is Console.

### P3 — Polish

`/faq` · `/legal/*` (as a set) · dark housing · sound (optional, default off) · `/admin` **permanently exempt**.

---

## 4. RULES THAT MAKE THIS SAFE

1. **Console tokens stay scoped to `[data-console]`, never `:root`.** This is the isolation mechanism, not a style preference.
2. **One page per commit.** Blast radius = one route.
3. **Never convert a page and a shared component in the same commit.**
4. **Every commit green:** `tsc`, `next build`, tests, detector.
5. **Usage order, not alphabetical.** PostHog decides what converts next.
6. **Delete before migrating.** A tool with zero 90-day usage gets deleted, not converted.

### Per-tool conversion recipe

1. Wrap in the Console shell · 2. Replace inline styles with tokens/primitives · 3. Split input/output into the standard workspace layout · 4. Replace loaders with optimistic UI · 5. Rewrite the empty state as an invitation with exactly one control · 6. Ship — one tool, one commit.

---

## 5. WHAT NEVER CHANGES

**The entire backend.** 25 API routes · the Ledger Score engine and its 60 tests · Supabase schema, auth, RLS · billing · crons, notifications, parent digest, email · `lib/tools-registry.ts` · every AI prompt.

**No item in this document requires touching a single API route.** That is what makes a migration of this size survivable by one person.

---

## 6. DEFINITION OF DONE

- One token stylesheet. Zero ad-hoc colours or sizes.
- One motion runtime (none — CSS).
- `globals.css`, `editorial.css` deleted.
- Zero files over 500 lines in converted code.
- Any page in grayscale → recognisably StudyLedger.
- Remove every coloured element → hierarchy intact.

---

## 7. HONEST RISK

**P2 is ~120 hours at ~6h/week ≈ 5 months of uninterrupted effort**, alongside Class 12. It will be interrupted.

The plan is built to survive that: every phase ships, nothing depends on a later phase to be useful, and **P1-4 (wrapping the tools layout in Console chrome) makes a partially-migrated product read as one product.** That single task is the difference between a slow migration and a visibly broken one — which is why it sits in P1 rather than P2 despite being only ~4 hours of work.

**The largest risk is not stalling. It is converting 46 tools that should have been deleted.** Run the PostHog usage query before P2-4, not after.
