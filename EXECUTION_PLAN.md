# STUDYLEDGER — EXECUTION PLAN

```
AUTHORITY:       plans
ANSWERS:         "how, in what order, how long, and what is done?"
MAY NOT CONTAIN: product philosophy · design law · feature classification ·
                 information architecture · schema definitions
PRECEDENCE:      PRINCIPLES > DECISIONS > PLANS
LAST AMENDED:    2026-08-05
```

**Governed by `PRODUCT_PRINCIPLES.md` (what must always be true) and
`PRODUCT_DECISIONS.md` (what we have chosen).** This document is *how it gets
built, in what order.* A task here may not contradict either — if one appears to,
this document is the defect.

## Working protocol

One task at a time. For each: explain → **wait for approval** → implement → verify →
commit → update this file → stop. Never continue automatically. Never batch unrelated
work. No new planning documents.

**Sequencing discipline:**
- **No cosmetic work until structural work is done.**
- One page per change. Blast radius = one route.
- Never convert a page and a shared component together.
- Ship continuously; do not accumulate a six-week branch.

## Effort scale

`S` <2h · `M` 2–6h · `L` 6–16h · `XL` 16h+ — assuming ~6h/week solo.

## Verification standard (every task)

`npx tsc --noEmit` · `npx next build` · `node --test tests/*.test.mjs` — all green, or the
task is not done.

---

# PART A — FOUNDATIONS (moved 2026-08-05)

**The mistake schema now lives in `PRODUCT_DECISIONS.md` §4**, and the feature
classification policy in `PRODUCT_DECISIONS.md` §1. Both were decisions, not plans,
and holding them here is what let this document drift into contradicting the
constitution.

| Was | Now |
|---|---|
| Part A.1–A.10 — the mistake schema | `PRODUCT_DECISIONS.md` §4.1–4.10 |
| Part A.11 — the Score inversion | `PRODUCT_DECISIONS.md` §4.11 · task `M1-6` below |
| The resolution rule · the parent boundary · *capture never lowers a score* | `PRODUCT_PRINCIPLES.md` §3 |
| Part A2 — classification policy and the register | `PRODUCT_DECISIONS.md` §1 |

**`M1-1` below remains the ratification gate.** Nothing above M1 may start until the
schema is signed off.

---

# PART B — MILESTONES

## MILESTONE 0 — Repository stabilisation

*Reduce the navigation, not the repository.*

| ID | Task | Why | Deps | Files | Effort | Acceptance |
|---|---|---|---|---|---|---|
| **M0-1** | Fix dead links `/tools/doubt`, `/tools/notes`; delete the hardcoded pill array, read `lib/tools-registry.ts` | Live 404s from the highest-traffic page | — | `app/dashboard/page.tsx:1027-1031` | S | No in-product link 404s; link-check script green |
| **M0-2** | Add root `not-found.tsx` + `error.tsx` per top-level segment | 0 of 68 segments have not-found; 1 has error | — | `app/not-found.tsx`, `app/*/error.tsx` | S | Every segment renders a branded error/404 |
| **M0-3** | Fix `app/loading.tsx` leaking the legacy skeleton into Console | Flash of old design system on every Console nav | — | `app/loading.tsx` | S | No legacy skeleton on `/console/*` |
| **M0-4** | Add `"test"` script; wire tests into GitHub Actions | 94 tests exist and never run in CI | — | `package.json`, `.github/workflows/test.yml` | S | CI fails on a deliberately broken test |
| **M0-5** | Delete 16 orphan components (~2,382 lines) | Dead weight | — | `components/**` | S | `tsc` + build green; bundle smaller |
| **M0-6** | Drop `three`, `@react-three/*`, `@splinetool/*` | Only importer is itself dead | M0-5 | `package.json` | S | `npm ls` clean; build green |
| **M0-7** | Delete `lib/animation.ts`, `app/globals-severity-patch.css` | Zero importers | — | as named | S | Build green |
| **M0-8** | ~~Delete `PRODUCT.md`, `DESIGN.md`~~ → **archived instead** | Superseded by the archival default (`PRODUCT_DECISIONS` §1.3) | — | `docs/archive/` | S | **Done 2026-08-05** — 6 docs archived with headers |
| **M0-9** | **Add `status` to `lib/tools-registry.ts`** — `core` / `supporting` / `experimental`, per the register | The single control point for navigation size. Makes every later classification a one-word edit rather than a migration | M0-8 | `lib/tools-registry.ts` | S | All 46 entries classified; `tsc` green; **no route touched** |
| **M0-10** | **Filter navigation to CORE** — dashboard grid, command palette, `app-nav`, `desks` read `status` | The navigation becomes small while the repository stays whole | M0-9 | 4 registry consumers | M | Navigation shows 13 tools; **all 46 URLs still resolve**; build green |
| **M0-11** | **Unlink `/console/ai` and `/dashboard/saved`** from navigation | Out of V1 scope; both remain routable | M0-10 | nav consumers | S | No inbound links; both routes still load |
| **M0-12** | **Extract the 4 duplicated tab components** to shared modules | Duplicate functionality — the one class that genuinely qualifies for removal | — | `exam-practice`, `exam-triage`, `learn-lab`, `reference-builder`, `recall-studio` | L | One definition each; both hosts still work; build green |
| **M0-13** | Reduce to one motion runtime | 3 shipped simultaneously — maintenance burden + architectural conflict | M0-10 | `package.json`, 7 live consumers | M | One runtime; every animation still runs |

> **Deletion gate for M0:** no tool route is deleted, archived or moved.
> Classification is a registry field. If a class turns out wrong, changing it costs
> one word and no rebuild — which is precisely why it is done this way while usage
> data is not yet representative. See `PRODUCT_DECISIONS` §1.4.

**Exit:** navigation shows **13 tools instead of 46** · all 46 URLs still resolve ·
zero dead links · CI green · one motion runtime · **zero product code deleted**.

---

## MILESTONE 1 — The Mistake Schema

*The foundation. Nothing above it may start.*

| ID | Task | Why | Deps | Files | Effort | Acceptance |
|---|---|---|---|---|---|---|
| **M1-1** | **Ratify `PRODUCT_DECISIONS` §4** — founder sign-off on entities, taxonomy, lifecycle, merge & resolution rules | Every surface depends on it | M0 | `PRODUCT_DECISIONS.md` | M | Written approval recorded in its decision log |
| **M1-2** | TypeScript model — `lib/mistakes/types.ts` | One definition, imported everywhere | M1-1 | new | M | `tsc` green; zero duplicate type defs |
| **M1-3** | Supabase migration `007_mistakes.sql` — concepts, evidence, occurrences, patterns + RLS | Server-owned record; localStorage cannot be the moat | M1-2 | `supabase/migrations/` | L | Applied to prod; RLS denies cross-user reads (tested) |
| **M1-4** | Seed concept taxonomy — CBSE Class 11/12 Physics only | Prove the spine on one subject before generalising | M1-3 | `supabase/seed/` | L | ≥120 concepts with board codes |
| **M1-5** | Pure functions: `mergeOccurrence()`, `computeSeverity()`, `canResolve()` | The engine. Testable without a browser | M1-2 | `lib/mistakes/engine.ts` | L | ≥40 tests incl. every lifecycle transition + the resolution rule |
| **M1-6** | **Invert the Score's mistake pillar** (`PRODUCT_DECISIONS` §4.11) | Capture must never lower a score — `PRODUCT_PRINCIPLES` §3.3 | M1-5 | `lib/ledger-score.ts`, `tests/` | L | Logging a mistake never decreases total; 60 existing tests updated & green |
| **M1-7** | Migrate `ledger-mistakes` localStorage → server | Existing users keep their data | M1-3 | `lib/score-projection.ts` | M | 16 users migrated; zero data loss verified |

**Exit:** the schema exists, is tested, is on the server, and the Score no longer
punishes honesty.

---

## MILESTONE 2 — Capture

*The screen that has never been built. Everything downstream is empty without it.*

| ID | Task | Why | Deps | Files | Effort | Acceptance |
|---|---|---|---|---|---|---|
| **M2-1** | `/capture` route + shell | The entry point | M1 | `app/capture/` | M | Route renders in Console language |
| **M2-2** | Photo upload → storage + Evidence record | Evidence is mandatory for every occurrence | M1-3 | `app/api/capture/`, Supabase storage | L | Photo persists; hash dedupes re-uploads |
| **M2-3** | Vision extraction — marked paper → draft occurrences | The moat mechanism | M2-2 | `app/api/capture/extract/` | XL | ≥70% of questions correctly extracted on 10 real papers |
| **M2-4** | **Human-in-the-loop confirmation** | AI extraction is wrong sometimes; *never lie* forbids silent guesses | M2-3 | `app/capture/` | L | Student confirms/edits before anything is written |
| **M2-5** | Manual entry fallback | Capture must work when extraction fails | M2-1 | `app/capture/` | M | A paper can be logged with zero AI |
| **M2-6** | Fold `syllabus` into `/capture` | Curriculum is evidence; a mistake needs an address | M2-1 | `app/tools/syllabus`→`app/capture/` | M | `/tools/syllabus` 301s; parity retained |

**Exit:** a student photographs a marked paper and confirmed occurrences land in the
record. **This is the MVP gate.**

---

## MILESTONE 3 — Diagnosis

*Six tools become one answer.*

| ID | Task | Why | Deps | Files | Effort | Acceptance |
|---|---|---|---|---|---|---|
| **M3-1** | `/diagnosis` route + shell | The product | M2 | `app/diagnosis/` | M | Renders for one capture |
| **M3-2** | Per-paper view: marks lost, by error class | The immediate answer | M3-1 | | L | Cognitive vs execution split visible |
| **M3-3** | Recurrence view: *"4th time since June"* | The reason to return | M1-5, M3-1 | | L | Pattern history with evidence trail |
| **M3-4** | **Retire the morbid metaphors** in all surviving copy | Shame as branding — `PRODUCT_PRINCIPLES` §4.1 | M3-2 | copy | S | Zero uses of obituary/autopsy/coroner/trauma/forensics/cremator |
| **M3-5** | Absorb `post-exam`, `paper-autopsy`, `marks-forensics`, `marks-obituary`, `paper-trauma`, `paper-pattern`, `calibration`; 301 old routes | 7 fragments of one answer | M3-3 | 7 tool dirs | XL | Old routes 301; no capability lost |

**Exit:** one surface answers *"why did I lose marks, and what keeps recurring?"*

---

## MILESTONE 4 — Record

| ID | Task | Why | Deps | Effort | Acceptance |
|---|---|---|---|---|---|
| **M4-1** | `/record` route + shell | The moat, made visible | M3 | M | Renders |
| **M4-2** | Pattern list — filter by status/subject/severity | The nine things you keep getting wrong | M4-1 | L | All patterns, sorted by severity |
| **M4-3** | Timeline — marks & patterns over time | Loss aversion; proof of accumulation | M4-1 | L | ≥6 months renders without jank |
| **M4-4** | Absorb `grade-tracker`, `/console/analytics`; 301 | Duplicate record surfaces | M4-2 | L | 301s; parity |

**Exit:** a student can see their record growing and their pattern list shrinking.

---

## MILESTONE 5 — Next

| ID | Task | Why | Deps | Effort | Acceptance |
|---|---|---|---|---|---|
| **M5-1** | `/next` route + ranked gaps | Answers the thesis question directly | M4 | L | Ranked by severity × examProximity |
| **M5-2** | Explainability — *why* each item ranks where it does | A ranking a student cannot interrogate is not trusted | M5-1 | M | Every item states its reason |
| **M5-3** | Silent-concept detection | Untested ≠ mastered | M1-5 | M | Zero-evidence concepts surface distinctly |
| **M5-4** | Absorb `exam-planner`, `forgetting-forecast`, `silent-topics`; 301 | Two Ebbinghaus engines, one question | M5-3 | L | 301s; spaced schedule retained |

---

## MILESTONE 6 — Practise

| ID | Task | Why | Deps | Effort | Acceptance |
|---|---|---|---|---|---|
| **M6-1** | `/practise` route | Diagnosis without remediation is a mirror | M5 | M | Renders |
| **M6-2** | Pattern-targeted question generation | Practice must target *your* gaps | M6-1 | L | Questions map to a named pattern |
| **M6-3** | **Close the loop** — correct answers feed `canResolve()` | Only evidence resolves a pattern — `PRODUCT_PRINCIPLES` §3.1 | M1-5, M6-2 | L | A pattern reaches `resolved` end-to-end in a test |
| **M6-4** | Absorb `practice`, `exam-sim`, `recall-studio`, `flashcards`, `/console/practice`; 301 | Four routes doing active recall | M6-3 | XL | 301s; parity |

**Exit:** the loop closes. A gap opens, is practised, and is proven shut.

---

## MILESTONE 7 — Parents

| ID | Task | Why | Deps | Effort | Acceptance |
|---|---|---|---|---|---|
| **M7-1** | `/parents` rebuild + auth on the code link | Currently unauthenticated and unmigrated | M4 | L | Access requires a student-issued, revocable code |
| **M7-2** | **Enforce the parent boundary at the data layer** | Parents must never see raw failures — `PRODUCT_PRINCIPLES` §3.4 | M7-1 | M | API physically cannot return `open` patterns or occurrence detail — tested |
| **M7-3** | Weekly digest — *"what your child is fixing"* | The payment surface | M7-2, `lib/parent-digest.ts` | L | Digest contains zero shame-framed content |
| **M7-4** | Student control over what is shared | Consent, and it prevents the product becoming a surveillance tool | M7-2 | M | Student can revoke instantly |

---

## MILESTONE 8 — Settings + Legal

| ID | Task | Deps | Effort | Acceptance |
|---|---|---|---|---|
| **M8-1** | `/settings` — profile, subjects, board, parent access | M7 | L | Absorbs `/dashboard/profile` + `personalise`; 301s |
| **M8-2** | `/legal` — one route, four sections | — | M | Absorbs 4 routes; 301s |
| **M8-3** | Razorpay billing in `/settings`; absorb `/limit` | M8-1 | L | Parent-billed subscription works end-to-end |

---

## MILESTONE 9 — Landing + Console shell

| ID | Task | Deps | Effort | Acceptance |
|---|---|---|---|---|
| **M9-1** | `/home` — Score + the one action; absorb `/dashboard` + `/console` | M5 | XL | One action above the fold; `/dashboard` 301s |
| **M9-2** | Exam-Day mode as a *state* of `/home`; absorb `exam-triage`, `panic-triage`, `exam-day` | M9-1 | L | Activates on proximity; not a route |
| **M9-3** | `/auth` + `/onboard` rebuild — board and subjects, one screen | M9-1 | L | Signup→first capture in <60s |
| **M9-4** | `/` marketing rebuild | M9-1 | L | One sentence, one proof, one button |
| **M9-5** | Console chrome + `⌘K` | M9-1 | L | No surface lists tools |

---

## MILESTONE 10 — Legacy migration

| ID | Task | Deps | Effort | Acceptance |
|---|---|---|---|---|
| **M10-1** | Migrate the 11 surviving tool interiors to Console primitives | M9 | XL | Zero inline styles in survivors |
| **M10-2** | Delete `globals.css`, `editorial.css`; remove the `:root` palette script | M10-1 | L | One stylesheet; grayscale test passes |
| **M10-3** | Remove `[data-console]` scoping | M10-2 | M | Everything is Console |
| **M10-4** | Split 23 oversized files under 500 lines | M10-1 | L | Zero files >500 lines |

---

# PART C — SUMMARY

| Milestone | Tasks | Effort | Gate |
|---|---|---|---|
| M0 Stabilisation | 13 | ~26h | Navigation 46 → 13 tools, **all routes intact**, CI green |
| **M1 Schema** | 7 | ~50h | **The foundation** |
| **M2 Capture** | 6 | ~60h | **MVP gate — photo → record** |
| M3 Diagnosis | 5 | ~55h | Six become one |
| M4 Record | 4 | ~40h | The moat is visible |
| M5 Next | 4 | ~35h | The thesis, answered |
| M6 Practise | 4 | ~50h | The loop closes |
| M7 Parents | 4 | ~35h | Revenue |
| M8 Settings/Legal | 3 | ~25h | Table stakes |
| M9 Landing/Shell | 5 | ~65h | One product |
| M10 Legacy | 4 | ~60h | One system |
| **Total** | **58** | **~505h** | |

**At ~6h/week: M0–M2 ≈ 23 weeks.** This is the only timeline in the repository.

## Honest risk

**~505h at ~6h/week is multiple years alongside Class 12.** It will be interrupted.

The plan is built to survive that: every milestone ships something, and nothing
depends on a later milestone to be useful. **M0-10 alone** — filtering navigation to
13 tools — makes a partially-migrated product read as one product, which is why it
sits in M0 despite being cheap.

---

# PART D — DECISIONS REQUIRED BEFORE M1-1

| # | Decision | Status |
|---|---|---|
| **D1** | **Ratify the Mistake Schema** (`PRODUCT_DECISIONS` §4) | **OPEN — blocks M1** |
| **D2** | **Approve inverting the Score's mistake pillar** (§4.11) | **OPEN — blocks M1-6** |
| **D3** | Confirm the resolution rule — students may never self-mark resolved | ✅ Ratified as `PRODUCT_PRINCIPLES` §3.1 |
| **D4** | Confirm the parent boundary — `practising`/`resolved` only | ✅ Ratified as `PRODUCT_PRINCIPLES` §3.4 |
| **D5** | ~~Run the PostHog query before M0-10~~ | ✅ Withdrawn 2026-08-05 — analytics are observational only |
| **D6** | Confirm CBSE Physics as the seed subject | **OPEN — scopes M1-4** |
| **D7** | **Ratify the register** — 13 CORE / 12 SUPPORTING / 21 EXPERIMENTAL / 0 LEGACY | ✅ `PRODUCT_DECISIONS` §1.5 |
| **D8** | ~~Resolve the `PRODUCT_CONSTITUTION.md` conflict~~ | ✅ **Closed 2026-08-05** — governance restructured to four documents |
| **D9** | Confirm `learn-lab` as SUPPORTING | ✅ `PRODUCT_DECISIONS` §1.5 |

**Three decisions remain open: D1, D2, D6.** All three gate M1.

---

# PART E — TASK LOG

*Appended as tasks complete. One line each: ID · date · commit · verification result.*

| ID | Date | Commit | Verified |
|---|---|---|---|
| — | 2026-08-04 | — | Plan created; no code modified |
| M0-1 | 2026-08-05 | `44861db` | Pills carry explicit hrefs; 2 redirects added; build green |
| M0-2 | 2026-08-05 | `44861db` | `app/not-found.tsx` added; `/_not-found` in build output |
| M0-3 | 2026-08-05 | `44861db` | `app/console/loading.tsx` returns null; legacy skeleton no longer reachable from Console |
| M0-4 | 2026-08-05 | `44861db` | `npm test` + `npm run typecheck` added; `.github/workflows/test.yml` runs both on every push |
| M0-5 | 2026-08-05 | `44861db` | 19 files / 2,607 lines deleted after per-file import verification |
| M0-6 | 2026-08-05 | `44861db` | 6 deps removed (three, @types/three, @react-three/drei, @react-three/fiber, @splinetool/react-spline, @splinetool/runtime) |
| M0-7 | 2026-08-05 | `44861db` | `lib/animation.ts`, `app/globals-severity-patch.css` deleted |
| M0-8 | 2026-08-05 | — | **Re-scoped to archival.** 6 governance docs moved to `docs/archive/` with deprecation headers |
| GOV | 2026-08-05 | — | **Governance restructured to four documents.** `CLAUDE.md` → pointer; `PRODUCT_PRINCIPLES.md` + `PRODUCT_DECISIONS.md` created; this file stripped to plans. Mapping in `docs/GOVERNANCE_MAPPING.md`. **No production code touched.** |
| M0-9..13 | — | — | **Not started** |

**Verification at M0 partial close:** 94 tests pass · `tsc --noEmit` clean ·
`next build` green (76 routes).
