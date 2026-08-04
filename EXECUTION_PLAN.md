# STUDYLEDGER — EXECUTION PLAN

**The single source of truth for implementation. Created 2026-08-04.**

Governed by `PRODUCT_CONSTITUTION.md` (what exists) and `CONSOLE.md` (how it looks).
This document is *how it gets built, in what order*.

**Status: PLAN ONLY. No production code has been modified.**

## Working protocol

One task at a time. For each: explain → **wait for approval** → implement → verify →
commit → update this file → stop. Never continue automatically. Never batch unrelated
work. No new planning documents.

## Effort scale

`S` <2h · `M` 2–6h · `L` 6–16h · `XL` 16h+ — assuming ~6h/week solo.

## Verification standard (every task)

`npx tsc --noEmit` · `npx next build` · `node --test tests/*.test.mjs` — all green, or the
task is not done.

---

# PART A — THE MISTAKE SCHEMA

> **Nothing may be built until this is ratified.** Capture writes it, Diagnosis reads it,
> Record stores it, Next ranks it, Practise consumes it, Parents summarise it, and the
> Ledger Score is computed from it. Get this wrong and all seven are wrong.

## A.1 The central decision: two entities, not one

The instinct is one `Mistake` record. That is wrong, and the error would be permanent.

| | **OCCURRENCE** | **PATTERN** |
|---|---|---|
| What it is | One mark lost, one time | A recurring error the student keeps making |
| Epistemic status | **Fact** | **Inference** |
| Mutability | **Immutable, never deleted** | Revisable |
| Comes from | Evidence (a photograph) | Analysis across occurrences |
| Has a lifecycle | No | **Yes** |
| What the product sells | Raw material | **This** |

A student does not want a list of 340 wrong answers. They want the **nine things they
keep getting wrong.** Occurrences are what we hold; Patterns are what we return.

Keeping facts immutable is how `CONSOLE.md`'s *never fabricate* law becomes structural
rather than aspirational: a correction never edits history, it appends a superseding
occurrence.

## A.2 CONCEPT — the taxonomy spine

Every occurrence attaches to a concept. Inheritance gives roll-up for free.

```
subject → chapter → topic → concept
Physics → Rotational Motion → Angular Momentum → "Sign convention for torque"
```

| Field | Notes |
|---|---|
| `id` | stable, never reused |
| `subject` `chapter` `topic` `name` | display path |
| `parentId` | tree; enables roll-up to any level |
| `boardCodes[]` | CBSE/ICSE/state syllabus references |
| `examWeight` | historical marks allocation — feeds severity |

**This taxonomy is the company's durable asset.** It cannot be generated from textbooks,
because textbooks describe success and this describes failure. It is built by hand from
real marked papers and refined forever.

## A.3 OCCURRENCE — the immutable fact

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `studentId` | uuid | |
| `evidenceId` | uuid | → Evidence. **Required.** No occurrence without proof. |
| `source` | enum | `board-exam` · `school-exam` · `mock` · `coaching-test` · `homework` · `past-paper` · `self-test` |
| `subject` `chapter` `topic` | string | denormalised for query speed |
| `conceptId` | uuid | → Concept |
| `questionRef` | string | "Q7(b)" |
| `marksLost` / `marksAvailable` | int | |
| `cognitiveError` | enum \| null | see A.5 |
| `executionError` | enum \| null | see A.5 |
| `confidenceBefore` | 0–3 \| null | what the student *thought* before answering |
| `studentAnswer` | text \| crop | what they wrote |
| `expectedAnswer` | text \| null | from mark scheme |
| `markerNote` | text \| null | what the teacher wrote in red |
| `patternId` | uuid \| null | assigned by merge (A.7) |
| `supersedes` | uuid \| null | corrections append, never edit |
| `createdAt` | timestamp | |

**Invariants.** Never updated after verification. Never deleted. At least one of
`cognitiveError` / `executionError` must be non-null. `evidenceId` is mandatory —
an unevidenced mistake is a claim, and the product does not store claims.

## A.4 PATTERN — the revisable inference

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `studentId` `conceptId` | uuid | |
| `errorClass` | `cognitive` \| `execution` | **never mixed** |
| `errorType` | enum | the specific error |
| `label` | string | human sentence: *"Sign error when applying the chain rule"* |
| `occurrenceIds[]` | uuid[] | the evidence trail |
| `recurrenceCount` | int | occurrences in trailing 180 days |
| `firstSeenAt` `lastSeenAt` | timestamp | |
| `severity` | 0–100 | **derived, never entered** (A.6) |
| `systemConfidence` | 0–1 | how sure we are this is *one* pattern |
| `status` | enum | A.8 |
| `remediationPlan` | ref \| null | |
| `history[]` | append-only | every status transition, with cause |
| `resolvedAt` | timestamp \| null | |

## A.5 THE ERROR TAXONOMY — the product's core language

The single most important split in the schema:

### COGNITIVE — *you did not know*
Fix by learning. Slow to close. Predicts future failure on the same concept.

`not-known` · `misconception` · `wrong-method` · `incomplete-understanding` ·
`misapplied-rule` · `cannot-recall-formula`

### EXECUTION — *you knew and lost the mark anyway*
Fix by process. Fast to close. Predicts failure **across all subjects**.

`misread-question` · `arithmetic-slip` · `sign-error` · `unit-error` ·
`ran-out-of-time` · `incomplete-answer` · `missed-working` · `transcription` ·
`presentation`

**Why the split is load-bearing:** a student losing 30 marks to misconceptions and a
student losing 30 marks to misreading questions have nothing in common and need opposite
interventions. Execution errors are usually the larger, cheaper win — and are invisible
to every competitor, because chapter-wise analytics cannot see them.

## A.6 SEVERITY — derived, never entered

```
severity = 40·marksWeight + 30·recurrenceWeight + 20·examProximity + 10·conceptExamWeight
```

Derived so that (a) it cannot be gamed, (b) every improvement to the formula upgrades
every existing pattern retroactively, (c) ranking on `/next` is explainable —
*"this is #1 because you have lost 23 marks to it four times and it is worth 12 marks in April."*

## A.7 MERGE RULES

Two occurrences join one pattern **iff**:

1. same `conceptId`, **and**
2. same `errorClass`, **and**
3. same `errorType`

**Never merge across `errorClass`.** A misconception about signs and a careless sign slip
look identical on paper and require opposite fixes.

- Merges below `systemConfidence` 0.8 are **provisional** and reversible for 30 days.
- **A student may split a pattern. A student may not merge patterns** — merging is how a
  record collapses into "I'm bad at Physics", which is exactly the uselessness we exist
  to replace.
- Cross-concept execution patterns are a **separate pattern type** (`conceptId: null`,
  scoped to subject or global). "You misread questions" is a real, global pattern.

## A.8 LIFECYCLE

```
      detected
         ↓
  ┌──→ OPEN ──→ ACKNOWLEDGED ──→ PRACTISING ──→ RESOLVED
  │      ↑                            │             │
  │      └──────── RECURRED ←─────────┴─────────────┘
  │                   ↑
  └── DORMANT ────────┘
```

| Status | Meaning | Who sets it |
|---|---|---|
| `open` | Detected, unaddressed | System |
| `acknowledged` | Student has seen it | **Student** |
| `practising` | Active remediation | Student / system |
| `dormant` | No occurrence in 90 days, never proven fixed | System |
| `resolved` | **Proven** fixed | **System only** |
| `recurred` | Came back after resolution | System |

### The resolution rule — the most important rule in the schema

> **Only evidence resolves a pattern. A student may never mark their own mistake fixed.**

`resolved` requires **≥2 correct answers on the same concept**, at least one of them
**≥7 days** after the last occurrence.

A student can say *"I've seen it"* (`acknowledged`) and *"I'm working on it"*
(`practising`). They cannot say *"I've fixed it."* Self-reported mastery is the fluency
illusion — the exact broken instrument this product exists to replace. Letting a student
mark their own patterns resolved would make the record a record of their confidence
rather than their competence, and the record would be worthless.

## A.9 EVIDENCE — immutable

`id` · `type` (`photo` \| `pdf` \| `manual`) · `storageRef` · `contentHash` ·
`cropRegions[]` · `capturedAt` · `sourceDescription` · `verifiedBy` (`ai` \| `student` \| `both`)

Immutable and never deleted while any occurrence references it. Evidence is what makes
the record trustworthy in 2036; deleting it retroactively invalidates every diagnosis
built on it.

## A.10 CONSUMERS — what each system reads

| System | Reads | Never reads |
|---|---|---|
| **`/home`** | Top 1 open pattern by severity | Occurrence detail |
| **`/diagnosis`** | Patterns + their occurrences for one evidence item | — |
| **`/record`** | All patterns + all occurrences, over time | — |
| **`/next`** | `open` + `practising`, ranked by severity × examProximity, plus *silent concepts* | `resolved` |
| **`/practise`** | `open` + `practising` as question-generation targets | — |
| **`/parents`** | **`practising` and `resolved` ONLY** — counts and trends | **`open` patterns · occurrence detail · marks lost · raw answers** |
| **Ledger Score** | Resolution rate, evidence volume, coverage | Raw error counts |

**The parent rule is a hard boundary.** Parents see *what their child is fixing*, never
*what their child got wrong*. It is the difference between a support tool and a
shame-delivery mechanism, and it is enforced at the data layer, not in copy.

**Silent concepts:** a concept with **zero occurrences and zero correct answers** is
untested, not mastered. Distinct from a known gap, and a first-class input to `/next`.

## A.11 ⚠️ THE SCORE CONFLICT — must be resolved in M1

```
lib/ledger-score.ts:140
mistakeScore = Math.max(0, Math.round(200 - recentMistakes * 6));
```

**The current Ledger Score penalises the student 6 points for every mistake they record.**

The entire company depends on students capturing mistakes. The scoreboard punishes
precisely that behaviour. A student who logs honestly is scored below a student who logs
nothing — the product currently rewards hiding evidence.

**Required inversion.** The mistakes pillar (200 pts) becomes:

- **Resolution rate** (120) — proportion of patterns proven resolved
- **Evidence volume** (50) — papers captured, with a ceiling
- **Acknowledgement** (30) — open patterns seen rather than avoided

**Capture must never lower a score.** Non-negotiable.

**Cost:** breaking change to an engine with 60 passing tests → versioned in `M1-6`.

---

# PART B — MILESTONES

## MILESTONE 0 — Repository stabilisation

*Delete before building. The repo must stop being 68 products.*

| ID | Task | Why | Deps | Files | Effort | Acceptance |
|---|---|---|---|---|---|---|
| **M0-1** | Fix dead links `/tools/doubt`, `/tools/notes`; delete the hardcoded pill array, read `lib/tools-registry.ts` | Live 404s from the highest-traffic page | — | `app/dashboard/page.tsx:1027-1031` | S | No in-product link 404s; link-check script green |
| **M0-2** | Add root `not-found.tsx` + `error.tsx` per top-level segment | 0 of 68 segments have not-found; 1 has error | — | `app/not-found.tsx`, `app/*/error.tsx` | S | Every segment renders a branded error/404 |
| **M0-3** | Fix `app/loading.tsx` leaking the legacy skeleton into Console | Flash of old design system on every Console nav | — | `app/loading.tsx` | S | No legacy skeleton on `/console/*` |
| **M0-4** | Add `"test"` script; wire tests into GitHub Actions | 94 tests exist and never run in CI | — | `package.json`, `.github/workflows/test.yml` | S | CI fails on a deliberately broken test |
| **M0-5** | Delete 16 orphan components (~2,382 lines) | Dead weight | — | `components/**` | S | `tsc` + build green; bundle smaller |
| **M0-6** | Drop `three`, `@react-three/*`, `@splinetool/*` | Only importer is itself dead | M0-5 | `package.json` | S | `npm ls` clean; build green |
| **M0-7** | Delete `lib/animation.ts`, `app/globals-severity-patch.css` | Zero importers | — | as named | S | Build green |
| **M0-8** | Delete `PRODUCT.md`, `DESIGN.md` | Three constitutions caused a year of oscillation | — | as named | S | Two governing docs remain |
| **M0-9** | **Archive 4 FUTURE tools** — `admissions`, `resume`, `interview`, `gpa-sim` | Different product | — | `app/tools/*`→`archive/`, `lib/tools-registry.ts` | M | Routes gone; registry consistent; build green |
| **M0-10** | **Delete 21 off-thesis tool routes** — 9 WRITE, 7 generic, 2 teaching, 2 planning, `rooms` | 24 routes make the product smaller, not worse | M0-9, **PostHog check** | `app/tools/**`, registry | L | 46→11 tool routes; no dangling imports; build green |
| **M0-11** | Delete `/dashboard/saved`, `/console/ai` | Saves output from deleted tools; chat violates *we do not teach* | M0-10 | as named | S | Build green |
| **M0-12** | Reduce to one motion runtime | 3 shipped simultaneously | M0-10 | `package.json`, remaining consumers | M | Only CSS motion + at most one lib |

> **M0-10 gate:** run the PostHog 90-day usage query *first*. Any tool with real usage
> becomes a founder decision, not an automatic delete.

**Exit:** 68 → ~30 routes · zero dead links · CI green · one motion runtime.

---

## MILESTONE 1 — The Mistake Schema

*The foundation. Nothing above it may start.*

| ID | Task | Why | Deps | Files | Effort | Acceptance |
|---|---|---|---|---|---|---|
| **M1-1** | **Ratify Part A** — founder sign-off on entities, taxonomy, lifecycle, merge & resolution rules | Every surface depends on it | M0 | `EXECUTION_PLAN.md` | M | Written approval recorded here |
| **M1-2** | TypeScript model — `lib/mistakes/types.ts` | One definition, imported everywhere | M1-1 | new | M | `tsc` green; zero duplicate type defs |
| **M1-3** | Supabase migration `007_mistakes.sql` — concepts, evidence, occurrences, patterns + RLS | Server-owned record; localStorage cannot be the moat | M1-2 | `supabase/migrations/` | L | Applied to prod; RLS denies cross-user reads (tested) |
| **M1-4** | Seed concept taxonomy — CBSE Class 11/12 Physics only | Prove the spine on one subject before generalising | M1-3 | `supabase/seed/` | L | ≥120 concepts with board codes |
| **M1-5** | Pure functions: `mergeOccurrence()`, `computeSeverity()`, `canResolve()` | The engine. Testable without a browser | M1-2 | `lib/mistakes/engine.ts` | L | ≥40 tests incl. every lifecycle transition + the resolution rule |
| **M1-6** | **Invert the Score's mistake pillar** (A.11) | Capture must never lower a score | M1-5 | `lib/ledger-score.ts`, `tests/` | L | Logging a mistake never decreases total; 60 existing tests updated & green |
| **M1-7** | Migrate `ledger-mistakes` localStorage → server | Existing users keep their data | M1-3 | `lib/score-projection.ts` | M | 16 users migrated; zero data loss verified |

**Exit:** the schema exists, is tested, is on the server, and the Score no longer punishes honesty.

---

## MILESTONE 2 — Capture

*The screen that has never been built. Everything downstream is empty without it.*

| ID | Task | Why | Deps | Files | Effort | Acceptance |
|---|---|---|---|---|---|---|
| **M2-1** | `/capture` route + shell | The entry point | M1 | `app/capture/` | M | Route renders in Console language |
| **M2-2** | Photo upload → storage + Evidence record | Evidence is mandatory for every occurrence | M1-3 | `app/api/capture/`, Supabase storage | L | Photo persists; hash dedupes re-uploads |
| **M2-3** | Vision extraction — marked paper → draft occurrences | The moat mechanism | M2-2 | `app/api/capture/extract/` | XL | ≥70% of questions correctly extracted on 10 real papers |
| **M2-4** | **Human-in-the-loop confirmation** | AI extraction is wrong sometimes; *never fabricate* forbids silent guesses | M2-3 | `app/capture/` | L | Student confirms/edits before anything is written |
| **M2-5** | Manual entry fallback | Capture must work when extraction fails | M2-1 | `app/capture/` | M | A paper can be logged with zero AI |
| **M2-6** | Fold `syllabus` into `/capture` | Curriculum is evidence; a mistake needs an address | M2-1 | `app/tools/syllabus`→`app/capture/` | M | `/tools/syllabus` 301s; parity retained |

**Exit:** a student photographs a marked paper and confirmed occurrences land in the record. **This is the MVP gate.**

---

## MILESTONE 3 — Diagnosis

*Six tools become one answer.*

| ID | Task | Why | Deps | Files | Effort | Acceptance |
|---|---|---|---|---|---|---|
| **M3-1** | `/diagnosis` route + shell | The product | M2 | `app/diagnosis/` | M | Renders for one capture |
| **M3-2** | Per-paper view: marks lost, by error class | The immediate answer | M3-1 | | L | Cognitive vs execution split visible |
| **M3-3** | Recurrence view: *"4th time since June"* | The reason to return | M1-5, M3-1 | | L | Pattern history with evidence trail |
| **M3-4** | **Retire the morbid metaphors** in all surviving copy | Shame as branding; violates the constitution | M3-2 | copy | S | Zero uses of obituary/autopsy/coroner/trauma/forensics/cremator |
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
| **M6-3** | **Close the loop** — correct answers feed `canResolve()` | Only evidence resolves a pattern | M1-5, M6-2 | L | A pattern reaches `resolved` end-to-end in a test |
| **M6-4** | Absorb `practice`, `exam-sim`, `recall-studio`, `flashcards`, `/console/practice`; 301 | Four routes doing active recall | M6-3 | XL | 301s; parity |

**Exit:** the loop closes. A gap opens, is practised, and is proven shut.

---

## MILESTONE 7 — Parents

| ID | Task | Why | Deps | Effort | Acceptance |
|---|---|---|---|---|---|
| **M7-1** | `/parents` rebuild + auth on the code link | Currently unauthenticated and unmigrated | M4 | L | Access requires a student-issued, revocable code |
| **M7-2** | **Enforce the A.10 boundary at the data layer** | Parents must never see raw failures | M7-1 | M | API physically cannot return `open` patterns or occurrence detail — tested |
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
| **M9-3** | `/auth` + `/onboard` rebuild — one question | M9-1 | L | Signup→first capture in <60s |
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
| M0 Stabilisation | 12 | ~30h | 68 → 30 routes, CI green |
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

At ~6h/week: M0–M2 ≈ **23 weeks.** The 8-week MVP in `PRODUCT_CONSTITUTION.md` §7
assumes materially more than 6h/week — flagged, not resolved.

---

# PART D — DECISIONS REQUIRED BEFORE M1-1

| # | Decision | Why it blocks |
|---|---|---|
| **D1** | **Ratify the Mistake Schema (Part A)** | Everything |
| **D2** | **Approve inverting the Score's mistake pillar** (A.11) | Breaking change to a tested engine; capture is disincentivised until fixed |
| **D3** | **Confirm the resolution rule** — students may never self-mark resolved | Defines what the record means |
| **D4** | **Confirm the parent boundary** — `practising`/`resolved` only | Enforced in the DB, expensive to change later |
| **D5** | **Run the PostHog 90-day query before M0-10** | 21 deletions are inferred from code, not usage |
| **D6** | Confirm CBSE Physics as the seed subject | Scopes M1-4 |

---

# PART E — TASK LOG

*Appended as tasks complete. One line each: ID · date · commit · verification result.*

| ID | Date | Commit | Verified |
|---|---|---|---|
| — | — | — | Plan created; no code modified |
