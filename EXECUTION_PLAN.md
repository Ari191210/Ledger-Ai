# STUDYLEDGER — EXECUTION PLAN

```
AUTHORITY:       plans
ANSWERS:         "how, in what order, how long, and what is done?"
MAY NOT CONTAIN: product philosophy · design law · feature classification ·
                 information architecture · schema definitions · architecture
PRECEDENCE:      PRINCIPLES > DECISIONS > PLANS
LAST AMENDED:    2026-08-16
```

**Governed by `PRODUCT_PRINCIPLES.md` (what must always be true) and
`PRODUCT_DECISIONS.md` (what we have chosen).** This document is *how it gets
built, in what order.* A task here may not contradict either — if one appears to,
this document is the defect.

**Sequenced from `STUDYLEDGER_SYSTEM_ARCHITECTURE.md`.** That document is the
architecture; this one is the order. Every milestone below executes rows the
architecture already classified in **Part S** (migration strategy) and **Part W**
(gap matrix), in the dependency order its **Implementation Order** section
states. **No milestone here decides anything.** Where a task appears to introduce
scope the architecture did not specify, this document is the defect.

## Working protocol

One task at a time. For each: explain → **wait for approval** → implement → verify →
commit → update this file → stop. Never continue automatically. Never batch unrelated
work. No new planning documents.

**Sequencing discipline:**
- **No cosmetic work until structural work is done.**
- One page per change. Blast radius = one route.
- Never convert a page and a shared component together.
- Ship continuously; do not accumulate a six-week branch.
- **Nothing that writes academic truth ships before the event layer (M7).**
  Building sessions, mistakes or scoring on any other substrate means building
  them twice (Implementation Order, step 3).

## Effort scale

`S` <2h · `M` 2–6h · `L` 6–16h · `XL` 16h+ — assuming ~6h/week solo.

**These are rough shape, not commitments, and no total is carried forward.** The
previous edition of this file totalled ~505h against a scope the architecture has
since replaced structurally; restating that number against the new scope would be
a fabricated estimate. Effort per task is retained because relative size drives
sequencing; a programme total is not claimed.

## Verification standard (every task)

`npx tsc --noEmit` · `npx next build` · `node --test tests/*.test.mjs` — all green, or the
task is not done.

**Additional standing rule from Part W (`Tests` row, P2):** 361 tests currently
pass and *all of them test unwired code*. Every milestone that wires a dark
module must leave that module with at least one test that exercises the **shipped
path**, not only the pure function.

---

# PART A — WHAT THIS EDITION SUPERSEDES

**The previous plan (2026-08-05, milestones M0–M10) is superseded in structure,
not in history.** Its record of completed work is preserved and corrected in
Part E. Its forward plan is replaced for four reasons, each verified against the
repository:

| Stale claim in the old plan | Corrected position |
|---|---|
| "Three decisions remain open: D1, D2, D6. All three gate M1." | All three are closed. D1 closed 2026-08-06 (`PRODUCT_DECISIONS` §7.4); D2 shipped as commit `640ef97`; D6 was answered by shipping the CBSE Physics seed (`51d43f6`). The gate no longer exists. |
| Task log ends at "M0-9..13 — Not started", implying M1 had not begun | Commits `877ce8a`→`a70adce` shipped M1-2 through M1-7 and the `008` ingestion runner. The log never recorded them. |
| `M1-OLD-6` "Invert the Score's mistake pillar" is marked as the fix | The inversion shipped (`lib/ledger-score.ts:198-215`) and **the pillar is still ≡ 0 for every user**, because nothing writes `evidenceId` and nothing can set `resolved`. Architecture J.9 / `PRODUCT_DECISIONS` §9.4: the pillar is a **REBUILD**, not a formula change. M1-OLD-6 is retained as shipped groundwork, not as a closed defect. |
| Milestone order M1 Schema → M2 Capture → M3 Diagnosis … | The architecture's Implementation Order puts a migration ledger, one shell, server auth, identity, the concept model and the **event layer** before capture. The old order builds capture on a substrate that does not exist. |

**Also superseded:** the old plan's assumption that shipped `lib/mistakes/*`,
`lib/taxonomy/*` and `lib/ingest/*` constitute progress toward the target. They
are **KEEP + WIRE** assets with **zero production importers** — architecture T12,
"dark code decays". They count as done only when something calls them.

**Not superseded:** `M0-OLD-1` through `M0-OLD-8` as executed. `M0-OLD-9`
through `M0-OLD-13` were never started and are re-issued below as **M2**.

**Milestone renumbering.** M-IDs in this edition do not correspond to M-IDs in
the previous edition. Where history is cited, the old IDs are marked
*(2026-08-05 numbering)*.

**Archive prefix (added 2026-08-11).** Marking alone was not enough: the literal
strings `M0-1`…`M0-8` and `M1-1`…`M1-7` were being used for two different task
sets in this one document — the superseded 2026-08-05 set and the current
Part B set — so the same ID meant two things. **Every superseded ID now carries
an `-OLD-` segment: `M0-OLD-1`, `M1-OLD-6`, and so on.** The old tasks, their
dates, commits and verification notes are unchanged and remain in Part F; only
their identifiers are qualified. **The unprefixed IDs in Part B are canonical**
— an ID without `-OLD-` always means the current edition.

---

# PART B — MILESTONES

Priorities are the architecture's own (**Part W**): **P0** blocks everything
downstream · **P1** required for the V1 loop · **P2** required for the product to
be honest · **P3** required for the product to be complete. Where a milestone
spans several gap-matrix rows, it takes the **highest** priority among them and
says so.

---

## M0 — Violation and fabrication removal · **P1**

*Cheap, already diagnosed, and dependent on nothing. These are shipped code
breaching ratified rules today.*

**Scope.** Part S.7 (parent), S.2 (streak *presentation*; the scoring term is
**M14**), S.9 (fabricated data), S.3 (client-side status write and history
deletion), Part W rows *Parent boundary*, *Fabricated data*, *XSS*.

**Dependency rationale.** Implementation Order step 15 states the §3.4 field
removals *"are **P1** and must happen at step 0, independently of the rest."*
Architecture T9 adds: *"remove the fields before parent identity work, not
after."* Nothing here requires the new architecture to exist.

| ID | Task | Verdict | Files | Effort | Done when |
|---|---|---|---|---|---|
| **M0-1** | Remove `weakTopics` from the parent API response | **DELETE** | `app/api/parent/[code]/route.ts` (`select` list) | S | The column is absent from the response, not filtered from it (V.8.3) |
| **M0-2** | Remove the "topics needing work" miss-count table | **DELETE** | `lib/parent-digest.ts:118-122` | S | No per-topic count reaches a parent at any setting (V.8.4) |
| **M0-3** | Remove the inactivity/streak banner from the digest | **DELETE** | `lib/parent-digest.ts:88-91` | S | No parent email references consecutive days |
| **M0-4** | `computeRiskFlags` — absence may not escalate; keep `examSoon` | **ADAPT** | `lib/parent-digest.ts:45-48` | S | `inactiveDays` no longer triggers an alert |
| **M0-5** | *Relocated to* **M14-2** *(2026-08-11)* — deleting the consecutive-day term changes the Ledger Score formula, which M0 does not do | — | — | — | — |
| **M0-6** | Delete streak presentation and streak-at-risk notifications | **DELETE** | `lib/focus-context.tsx:75,138`, `lib/notifications.ts` | M | Zero streak counters, cliffs or "chain" copy in product or push |
| **M0-7** | Delete the unpayable point promises | **DELETE** | `lib/notifications.ts:185`, `lib/console/next-move.ts:79-89` | S | No surface states a score gain the system cannot pay (J.9.a, Law 7) |
| **M0-8** | Delete `rank-whisper` and `awake-count` | **DELETE** | `components/rank-whisper.tsx`, mount in `components/legacy-chrome.tsx:25`, `app/api/awake-count/route.ts` | S | No invented peer figure renders (V.7.6) |
| **M0-9** | Delete the fabricated `catch`-branch score | **DELETE** | `app/tools/grade-tracker/page.tsx:282` | S | A failed load renders an honest empty state, never `total: 100` |
| **M0-10** | Delete the client-side mistake status write | **DELETE** | `app/tools/exam-practice/page.tsx:57` | S | No client path sets a mistake status (`PRINCIPLES` §3.1) |
| **M0-11** | Delete one-click mistake-history destruction | **DELETE** | `app/tools/post-exam/page.tsx:140` | S | No unconfirmed, unaudited path destroys the record |
| **M0-12** | Stop rendering model output as HTML | **DELETE** | `app/tools/reference-builder/page.tsx:287` | S | Model output is never `dangerouslySetInnerHTML` (R.5) |

**Note on M0-6 — amended 2026-08-14, on implementation.** M0 removes streak
*presentation*; it does not touch the score. This note previously predicted that
deleting the streak surfaces would stop `ledger-focus-streak` being written,
leaving the consistency term at 0 until M14-2. **That prediction was wrong about
this codebase and the implementation does not follow it.** The write does not
live on a presentation surface: it happens in `lib/focus-context.tsx`'s timer
tick when a work session completes, independently of anything rendered. So the
counter, the shield line and the streak-at-risk push were removed while the
storage write was left intact — `lib/ledger-score.ts:77,106,218` reads
`ledger-focus-streak` directly, and stopping it would have silently moved every
student's score, which is exactly the unexplained movement O.4.3 forbids. **M0
therefore moved no score at all**, and the consistency term still computes as it
did. The formula edit is **M14-2**, not M0: `PRODUCT_DECISIONS` §9.3
is *"a rebuild, not a rename"*, and no milestone before **M12** has the verified
sessions and assessment participation Continuity is computed from.

---

## M1 — Migration ledger and CI gate · **P0**

**Scope.** Part W row *Schema deployment* (**CREATE**, P0); architecture T1;
U.2 qualification 2.

**Dependency rationale.** T1: *"An append-only event store cannot tolerate
[schema drift] — a missing column silently loses data permanently."* This is
**infrastructure, not a library**, and it is a prerequisite for M7.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M1-1** | Migration ledger table + applied-migration recording | M | Production and repo migration sets are comparable by query |
| **M1-2** | CI gate failing on unapplied or divergent migrations | M | A deliberately unapplied migration fails CI |
| **M1-3** | Reconcile the `004` drift the header records; remove the runtime missing-column fallback | M | `app/api/cron/score-snapshot/route.ts:97-107` fallback is deleted because it can no longer be needed |

---

## M2 — Navigation collapse and the capability manifest · **P1**

**Scope.** Part S.4; Part P.2/P.3; Part W rows *Tool registry* (**ADAPT**, P1) and
*46 tools* (**WRAP**, P2). Carries forward the never-started tasks
`M0-OLD-9`..`M0-OLD-13` *(2026-08-05 numbering)*.

**Dependency rationale.** Independent of the record, and it makes a
partially-migrated product read as one product throughout everything below. The
manifest is also what stops the 46-tool surface becoming 46 uncontrolled score
writers once M10 exists (P.3.a) — so the field must exist before tools are wired,
not after.

| ID | Task | Verdict | Files | Effort | Done when |
|---|---|---|---|---|---|
| **M2-1** | Add capability-manifest fields to the registry, retaining all 46 entries and their navigation fields | **ADAPT** | `lib/tools-registry.ts` | M | All 46 classified; integration level **derived** from the manifest, never declared (P.3) |
| **M2-2** | Delete the duplicate hand-maintained catalogue | **DELETE** | `app/dashboard/page.tsx:32+` `TOOL_CATEGORIES` | S | One list of tools exists in the repository |
| **M2-3** | Filter navigation to the ratified register; unlink `/console/ai`, `/dashboard/saved` | **WRAP** | 4 registry consumers | M | Navigation shows the CORE set; **all 46 URLs still resolve** (`DECISIONS` §2.3, §2.5) |
| **M2-4** | Remove the `.slice(0, 10)` coverage cap | **ADAPT** | `app/tools/learn-lab/page.tsx:61` | S | Coverage numerator is uncapped |
| **M2-5** | Extract the 4 duplicated tab components | — | `exam-practice`, `exam-triage`, `learn-lab`, `reference-builder`, `recall-studio` | L | One definition each; both hosts work |

**Deletion gate (unchanged, `PRODUCT_DECISIONS` §1.4):** no tool route is deleted,
archived or moved. Classification is a registry field.

---

## M3 — One shell: `/dashboard` + `/console` → `/home` · **P0**

**Scope.** Part S.6 (*"REBUILD as one `/home`"*); Part W row *Two shells*
(**REBUILD**, P0); architecture T10.

**Dependency rationale.** Implementation Order step 0. T10: *"Building the event
layer under both doubles the integration surface and guarantees divergence.
Resolve before the event layer, not during."* `PRODUCT_DECISIONS` §2.4 already
decided the merge; this executes it.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M3-1** | `/home` shell; `/dashboard` and `/console` 301 to it | L | One shell reads the score and renders one next action |
| **M3-2** | Absorb `exam-day`, `panic-triage`, `exam-triage` as a **state** of Home | L | Exam-day activates on proximity and is not a route (`DECISIONS` §2.4) |
| **M3-3** | Retire `app/dashboard/page.tsx` as a second product surface | M | No route besides `/home` computes and renders the score |

> `/home`'s *composition* (registry, tiers, server-persisted layout) is **M22**.
> M3 delivers one shell, not the final Home.

---

## M4 — Server and edge authentication · **P0**

**Scope.** Part S.6 (client route guard **REBUILD**, middleware **ADAPT**), Part
R.1–R.4; Part W row *Auth enforcement* (**REBUILD**, P0); architecture T11.

**Dependency rationale.** Implementation Order step 0. T11: client-only guards
are *"survivable while everything is client-side and RLS-protected. It stops
being survivable the moment server components read student data."* Every
milestone from M5 onward server-renders student data.

| ID | Task | Verdict | Files | Effort | Done when |
|---|---|---|---|---|---|
| **M4-1** | Authenticate in middleware; extend the matcher beyond `/api/*`; keep the rate limiter | **ADAPT** | `middleware.ts` | L | An unauthenticated request to a student route never reaches a server component |
| **M4-2** | Replace the client redirect guard | **REBUILD** | `components/auth-guard.tsx` | M | No student data mounts client-side before an auth decision |
| **M4-3** | Move `notifState` / `parentAlerts` to service-role tables | **ADAPT** | `user_data` columns → service-role tables | M | R.2 posture: student-writable state and service state are separate |

---

## M5 — Identity, profile, onboarding · **P0**

**Scope.** Implementation Order step 1; Part S.1 (`lib/user-data.ts` **REBUILD**,
`user_data` flat columns **ADAPT**); Part S.6 (onboarding **REBUILD**, signup
flow **ADAPT**, landing **ADAPT**); Part W rows *Persistence* (P0) and
*Onboarding* (P1).

**Dependency rationale.** *"Everything partitions by student, and the AI boundary
cannot become server-authoritative without it."*

| ID | Task | Verdict | Files | Effort | Done when |
|---|---|---|---|---|---|
| **M5-1** | `students` + versioned `student_profiles` | **ADAPT** | new migration | L | Profile columns leave `user_data`; history is versioned |
| **M5-2** | One server-side `getStudentContext()` | **REBUILD** | replaces `lib/user-data.ts:123,139-142` | L | localStorage no longer outranks Postgres; no unguarded whole-row read-modify-write remains |
| **M5-3** | Onboarding rebuilt to one screen, reached from signup | **REBUILD** | `app/onboard/page.tsx`, `app/auth/page.tsx:80-91` | L | Board and subjects, one screen; signup leads into it (`DECISIONS` §2.6 — ceiling of three questions) |
| **M5-4** | Landing: a returning user can sign in | **ADAPT** | `app/page.tsx` | S | A sign-in path exists from `/` |

---

## M6 — Concept model · **P1**

**Scope.** Implementation Order step 2; Part S.3 (taxonomy **KEEP + WIRE**); Part
W row *Concepts / taxonomy* (**KEEP + WIRE**, P1); Part B.4.

**Dependency rationale.** *"Events, sessions, assessments, mistakes, coverage and
search all address concepts. It is the leaf dependency for the entire graph."*
Also retires T12 for `lib/taxonomy/*`.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M6-1** | Wire `concepts` + `lib/taxonomy/{build,cbse-physics}.ts` into production | L | The seeded tree has production importers; the tests test a shipped path |
| **M6-2** | Add `merged_into` and `taxonomy_version` | M | Concept merges are representable without rewriting history |
| **M6-3** | Resolution: exact → alias → semantic, with a **legal unresolved state** | L | An unmatched declaration resolves to `concept_id = NULL` with text preserved; the system does not guess (V.2.4) |

---

## M7 — Academic Event layer and the audit trail · **P0**

**Scope.** Implementation Order step 3; **Part D** in full; Part S.1 (event layer
**CREATE**, blob sync **DELETE** after backfill, blob **KEEP frozen** as
`legacy_blob`); Part W rows *Academic events*, *Persistence*, *Sync/merge* (all
P0); Part O.6 (`AuditEntry`).

**Dependency rationale.** *"Nothing below can be built correctly on any other
substrate; building sessions or scoring first would mean building them twice."*
Requires M1 (T1), M4 (T11) and M6 (concepts are addressed by every event).

| ID | Task | Verdict | Effort | Done when |
|---|---|---|---|---|
| **M7-1** | Event table: append-only, partitioned, `client_event_id` unique | **CREATE** | XL | Ordering by server `seq`, never client `occurred_at` (R.10) |
| **M7-2** | Ingest endpoint: validation, dedup, quarantine table | **CREATE** | XL | Invalid events quarantine rather than corrupt (D.3) |
| **M7-3** | Client outbox contract — `client_event_id` derived from stable content, persisted before the first attempt | **CREATE** | L | Mitigates T7: a retry cannot regenerate the id |
| **M7-4** | `AuditEntry` with hash chaining, from day one | **CREATE** | L | O.6. Starting it later leaves a hole at the point of maximum change (Implementation Order step 16) |
| **M7-5** | Backfill from `user_data.blob`; freeze it read-only as `legacy_blob` | **KEEP frozen** | L | T2 accepted: the seam is **marked**, using `RECOVERY_EPOCH_MS` as precedent; pre-epoch data is never presented as verified |
| **M7-6** | Retire the 15s whole-blob upsert and merge-by-string-length | **DELETE** | M | `lib/sync.ts:67`, `components/sync-manager.tsx:7,42-45` no longer write the academic record |
| **M7-7** | Attention-event compaction and monthly partitioning | **CREATE** | L | T6 mitigation in place before volume exists |

---

## M8 — Evidence and `/capture` · **P1**

**Scope.** Implementation Order step 4; Part S.3 (capture UI **CREATE**, legacy
mistake writer **REBUILD**), S.1 (ingestion pipeline **KEEP + WIRE**), S.4
(`exam-practice` **REBUILD** into `/capture`, `syllabus` **ADAPT** into capture);
Part W rows *Evidence*, *Mistake capture UI*, *Ingestion pipeline* (all P1).

**Dependency rationale.** *"`occurrences.evidence_id` is `NOT NULL`, so mistakes
are unbuildable without it."* `PRODUCT_DECISIONS:216`: *"If this doesn't ship,
nothing else matters."*

| ID | Task | Verdict | Effort | Done when |
|---|---|---|---|---|
| **M8-1** | `/capture` route and shell | **CREATE** | M | Renders; `exam-practice` and `syllabus` 301 into it |
| **M8-2** | Wire the `evidence` table; photo → storage + evidence record with `content_hash` dedup | **KEEP + WIRE** | L | Re-uploading the same paper creates one evidence row |
| **M8-3** | Wire `008_ingestion.sql` + `lib/ingest/*` for syllabus and paper ingestion | **KEEP + WIRE** | L | The append-only stage ledger has production importers; T12 retired for `lib/ingest/*` |
| **M8-4** | Extraction → **draft** occurrences | **CREATE** | XL | Nothing is written to the record without passing a gate |
| **M8-5** | Student confirmation — once, and only forwards | **CREATE** | L | The `confirmed_at` RLS policy is the enforcement, not the UI (S.1) |
| **M8-6** | Manual entry fallback | **CREATE** | M | A paper can be captured with zero model involvement |

---

## M9 — Study sessions and external study · **P1**

**Scope.** Implementation Order step 5; **Part E** in full, including **E.5
external study**; Part W rows *Study sessions* and *External study* (both P1,
both **CREATE**). Implements ratified decision `PRODUCT_DECISIONS` §9.1 /
`PRODUCT_PRINCIPLES` §3.5.

**Dependency rationale.** Requires M6 + M7. *"Assessment needs a confirmed
concept set, which only the session produces."*

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M9-1** | The six-state machine and its transitions | XL | V.1.1–V.1.8 pass, including: reaping produces `CLOSED_UNVERIFIED`, **the score does not fall**, and nothing shames |
| **M9-2** | The session resolver; partial unique index for one live session | L | V.1.3 — two tabs produce exactly one session |
| **M9-3** | Liveness across tabs, devices and days | L | V.1.6 — resuming on another device returns the same session |
| **M9-4** | `EXTERNAL_STUDY_DECLARED` with `declared_text` verbatim; `origin = 'declaration'` | L | V.2.1 |
| **M9-5** | Concept proposal and confirmation as **events**, not UI flags; rejections retained | L | V.2.2, V.2.3 — nothing proposed reaches the record unconfirmed |
| **M9-6** | Completion payload: figures only, **no `message` field** | M | E.8.a |

**Definition of done (milestone).** V.1 in full; V.2.1–V.2.5 — including the
load-bearing assertion **V.2.5: a declaration moves no score.** V.2.6–V.2.7 gate
on M10.

---

## M10 — Assessment engine · **P1** — **COMPLETE** (2026-08-16, uncommitted)

**All seven tasks are done**, across two passes: M10-1..M10-3 (the freeze, the
seven gates, the bank fallback) and M10-4..M10-7 (the transition gate,
deterministic grading, provenance and revocation, immediate mistake logging).
Per-task records and their verification basis are in Part F's task log.

**Scope.** Implementation Order step 6; **Part F** in full; Part W row
*Assessment* (**CREATE**, P1); architecture T4, T5.

**Dependency rationale.** Requires M6 + M7 + M9. *"This is the first point at
which the product manufactures verified evidence."*

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M10-1** | Blueprint + `coverage_manifest`, frozen **before any model call** | L | V.3.1 |
| **M10-2** | The seven generation gates; slot binding rejects off-manifest questions | XL | V.3.2 |
| **M10-3** | Question bank fallback | L | V.3.3 |
| **M10-4** | The transition gate — coverage failure **refuses to verify** | L | V.3.4, V.3.5. T5 mitigation: the guarantee fails **closed** |
| **M10-5** | Deterministic grading against a stored `answer_key`; closed-form only in V1 | L | F.4.a. A model opinion is never a grade (P.3.a) |
| **M10-6** | Provenance on every generated item + the retroactive revocation path | L | T4 mitigation; F.4.b |
| **M10-7** | Immediate mistake logging on a wrong answer | M | V.4.1 — the occurrence exists **before the next question renders** |

**Note on the AI boundary.** Assessment generation ships as the **first typed
capability module** (Q.4) and becomes the template for M15. The full 86-arm
rebuild is **not** a prerequisite for this milestone.

**Definition of done.** V.3 in full; V.2.6–V.2.7 now pass.

**Definition-of-done audit, stated honestly rather than claimed.**

- **V.3 in full — MET.** V.3.1, V.3.2 and V.3.3 were transcribed into test
  titles in pass 1; V.3.4, V.3.5 and V.3.6 are in pass 2's suite. All six pass.
- **V.2.6 — MET.** *"The assessment contains at least one Torque question and at
  least one for the unresolved declaration."* The manifest is built from the
  confirmed set through M9-5's gate and an unresolved `text:` ref is an
  obligation like any other; `023` §2 permits a NULL `concept_id`; the freeze
  refuses a manifest entry with no slot. It was **structurally** satisfied in
  pass 1 and is now **behaviourally** satisfied, because a question that is
  never answered no longer counts — the coverage view requires an ANSWERED
  question, so "the assessment contains one" is now checkable end to end.
- **V.2.7 — NOT MET, AND IT IS M12'S, NOT A GAP IN THIS MILESTONE.** *"The
  student passes both. **Now** Verified Performance and Proven Coverage move,
  and `AcademicRecord.coverage_state` for Torque becomes `proven`."* Three of
  its four clauses are now reachable — the student can pass both, the gate
  verifies the session, and M10 records per-concept `assessed` / `studied`. The
  fourth is not: `coverage_state` is a projection of the **AcademicRecord**, and
  `M12-1` owns it by name (*"`coverage_state` per concept: declared → studied →
  proven | Done when: V.2.7"*). "Verified Performance" is a Ledger Score
  dimension and is **M14**'s. **M10 must not award `proven`** — a second module
  deciding when a concept is proven is the second source of truth H.1.a forbids,
  so `conceptAssessmentStates()` deliberately has no `proven` arm and a test
  asserts it. **The milestone's stated done-when is therefore wrong on this one
  clause and this document is the defect**, per its own rule: V.2.7 cannot pass
  before M12-1 exists, and no amount of M10 work changes that. Recorded here
  rather than resolved by judgement in the moment.

---

## M11 — Mistake DNA wiring · **P1** — **COMPLETE** (2026-08-16, uncommitted)

**All six tasks are done.** V.4.1–V.4.9 are proved by `tests/mistake-dna.test.mjs`
(78 tests), with no database in reach: every module is I/O-free and takes its
verbs injected, which is what makes the whole of V.4 an assertion rather than a
staging checklist (U.3).

**No enum patch was taken.** `PRODUCT_DECISIONS` §9.4's rejected shortcut is
asserted *against* — a test reads `025` and fails if it touches the status CHECK,
and the six statuses are still exactly the engine's six. What this milestone
added is the machinery **behind** the statuses: proof, cooling, schedule and
provenance.

**Nothing was applied to any database, and the legacy backfill was not run.**
`025_mistake_dna.sql` self-registers and `check-migrations.mjs` reports it
UNAPPLIED until a human runs it. See M11-6 for the execution steps.

**Scope.** Implementation Order step 7; **Part G**; Part S.3 in full; Part W rows
*Mistake domain logic* (**KEEP**), *Mistake persistence + evidence model*
(**REBUILD**), *Mistake severity factors* (**CREATE**) — all P1. Implements
ratified decision `PRODUCT_DECISIONS` §9.4.

**Dependency rationale.** Requires M8 + M10 — *"a mistake needs both evidence and
a graded wrong answer. The domain engine already exists and does not need
building."*

| ID | Task | Verdict | Effort | Done when |
|---|---|---|---|---|
| **M11-1** | Server data-access layer over `007_mistakes.sql` | **CREATE** | L | `lib/mistakes/engine.ts` is called by production; T12 retired for `lib/mistakes/*` |
| **M11-2** | Severity-factor derivation, versioned | **CREATE** | L | G.6 — the one genuine specification gap is closed |
| **M11-3** | Additive extensions only: two enum values, `source` CHECK | **KEEP, extend additively** | S | `types.ts` and `007` are extended, never rewritten |
| **M11-4** | Retest scheduling and the `RESOLUTION_COOLING_DAYS = 7` gate | **CREATE** | L | V.4.3, V.4.5, V.4.6 |
| **M11-5** | Triple refusal of client-set resolution: RLS + `applyTransition` + ingest | **REBUILD** | M | V.4.4 — three independent refusals |
| **M11-6** | Legacy backfill via `migrate-legacy.ts`, executed and verified in production | **KEEP as-is** | M | T2: it refuses to fabricate evidence; the un-backfillable remainder is **marked**, not invented |

**Definition of done.** V.4 in full, including V.4.8 (a cognitive error never
merges with an execution error) and V.4.9 (an ambiguous classification is refused,
not guessed).

**This milestone, with M8 and M10, is the whole of `PRODUCT_DECISIONS` §9.4.**
No enum patch appears anywhere in this plan.

### M11 — the two live-infrastructure steps, neither of them taken

Both require a human. Neither was performed, and no part of this milestone
depends on either having been performed — the code reads both the pre- and
post-widening spellings, so nothing breaks in the window between them.

**1 · Apply `025_mistake_dna.sql`.** Paste the file's full contents into the
Supabase SQL editor and run it. It is additive throughout: two CHECK widenings,
two new columns on `patterns`, two new tables, two triggers, one narrowed INSERT
policy and one column grant. Verify with `node scripts/check-migrations.mjs`,
which reports `025` UNAPPLIED until it has been run and DIVERGENT if the file is
edited afterwards.

Two follow-ups belong to the same session and are **deliberately not in the
file**:

- `patterns_severity_version_shape` is added `NOT VALID`, because leaves written
  before this migration have no `severity_version` and a constraint that refuses
  to be added at all would make the file unrunnable against a live database.
  Validating it means first stamping those rows
  (`UPDATE patterns SET severity_version = 'sf_v0_unknown' WHERE tier = 'concept'
  AND severity_version IS NULL;` then
  `ALTER TABLE patterns VALIDATE CONSTRAINT patterns_severity_version_shape;`).
  `sf_v0_unknown` is deliberately **not** a version this build claims to support,
  so `isSeverityVersionSupported()` returns false and those rows are read as
  numbers and never compared as severities. Inventing a version for a severity
  computed under unknown rules is the fabrication T2 refuses.
- Re-pointing M10's already-written rows from `source = 'self-test'` to
  `'in-session-assessment'` is a **data correction under Part O.4** — append and
  supersede, never edit in place — and is therefore a separate, auditable act,
  not part of this schema change.

**2 · Run the legacy backfill.** `lib/mistakes/migrate-legacy.ts` operates on the
browser's `localStorage`, not on Postgres, so it cannot be run from CI, from a
migration or from this repository. `runLegacyMigration(store, now)` must execute
in a real signed-in session against `window.localStorage`. It is idempotent and
resumable: it writes a backup to `ledger-mistakes-backup-v0`, migrates, verifies,
and only then writes the `ledger-mistakes-migration` marker and removes the
backup. A second run sees the marker and does nothing.

**Verification after it runs** — the report is the artefact, and these are the
values that make it a pass:

- `report.dropped === 0`. Any other value fails verification by construction.
- `report.total === migrated + alreadyMigrated + skipped`.
- No record has `status === 'resolved'`. `verifyMigration()` refuses the whole
  migration if one does, and this is the T2 assertion: a legacy `cleared` is a
  self-report, and a self-report is not proof.
- Every record carries `legacy.hasEvidence === false` and
  `legacy.promoted === false`. **The un-backfillable remainder is marked, not
  invented.** Promotion to a real `occurrence` happens later, per record, only
  when real evidence exists — because `occurrences.evidence_id` is NOT NULL and
  legacy rows predate capture entirely.

---

## M12 — Academic record projection · **P1** — **COMPLETE** (2026-08-16, uncommitted)

**All three tasks are done.** `tests/academic-record.test.mjs` (65 tests) proves
them with no database in reach: every module is I/O-free and takes its facts as
arguments, which is what makes V.2.7 an assertion rather than a staging
checklist (U.3).

**Nothing was applied to any database.** `026_academic_record.sql` self-registers
and `check-migrations.mjs` reports it UNAPPLIED until a human runs it.

**Scope.** Implementation Order step 8; Parts C.3, H.1; Part W (*Persistence* L1–L5).

**Dependency rationale.** Requires M7 + M10 + M11.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M12-1** | `coverage_state` per concept: declared → studied → proven | L | V.2.7 — a concept becomes `proven` only after assessment |
| **M12-2** | Per-concept accuracy, watermarked and incremental | L | U.2 qualification 1: no queue is introduced |
| **M12-3** | Consistency job verifying each projection's watermark against the stream | M | T8 mitigation |

### **V.2.7 NOW PASSES IN FULL.** M10's recorded gap is closed.

M10's own audit stated the position exactly: *"V.2.7 — NOT MET, AND IT IS M12'S…
Three of its four clauses are now reachable… The fourth is not: `coverage_state`
is a projection of the AcademicRecord, and `M12-1` owns it by name… **M10 must
not award `proven`** — a second module deciding when a concept is proven is the
second source of truth H.1.a forbids."*

The fourth clause is now true, and it is proved END TO END rather than
structurally: `tests/academic-record.test.mjs`'s V.2.7 case runs the real M9 and
M10 modules in sequence — `buildProposal` → `applyConceptDecision` →
`buildCoverageManifest` → `buildBlueprint` → `freezeBlueprint` →
`applyVerificationTransition` — and only then asks `deriveCoverageState`. Torque
comes back `proven`; the unresolved *"wobbling tops"* declaration comes back
`proven` too (V.2.6 carried it as an obligation); the REJECTED *Moment of
Inertia* has no row at all. A companion test runs the identical fixture with one
slot unanswered: the gate refuses, the session closes `CLOSED_UNVERIFIED`, and
**nothing is proven** — so V.2.7 and V.3.4 are true at the same time, which is
what makes the rung mean anything.

`conceptAssessmentStates()` still has no `proven` arm and a test still asserts
it. `proven` is a value in exactly one module in the repository.

### M12-1 — `coverage_state`, a projection and never a declaration

**The ladder is C.3's FIVE, not the plan's three, and that is a recorded
divergence.** This table's M12-1 row says *"declared → studied → proven"*; C.3
`AcademicRecord.coverage_state` says *"`{untouched, declared, studied, assessed,
proven}`"*. The five are implemented because the three are a strict subset and
because `assessed` is already load-bearing elsewhere: F.2.a distinguishes
*"recorded as `studied`, NOT `assessed`"* on a coverage failure, and H.4's query
4 (*"what have I studied but never been tested on?"*) is answerable only if the
two are different values. **Collapsing them to match the shorter phrasing would
delete a distinction two other parts of the architecture depend on, so the
plan's row is the defect on this point** — recorded here rather than resolved by
judgement in the moment.

Derivation, each rung from a fact another milestone wrote:

| rung | source | rule |
|---|---|---|
| `untouched` | — | no confirmed session concept. V.2.2's *"neither reaches the record"* as an ABSENCE, not a row |
| `declared` | M9 `session_concepts`, through 022 §4's confirmed-only gate | the student confirmed it |
| `studied` | M9 `study_sessions` | the episode happened: E-class evidence attached, **or** the session left the open states. `ABANDONED` is excluded — E.2.b makes it reachable only with zero evidence |
| `assessed` | M10 `assessment_verification_coverage` | `covered` — bound AND answered, revocations excluded |
| `proven` | M10 + M9 | `covered` **AND** the session is `VERIFIED` **AND** ≥ `questions_required` DISTINCT questions have a correct latest attempt |

`proven` counts distinct QUESTIONS and reads the LATEST attempt, because F.5
makes answers append-only: counting attempts would let one question answered
wrong four times and right once stand in for four questions.

**`026`'s split, and why it is not what it first looks like.** 022 fences its
session-concept relation *by substring* — the confirmed view's own name included
— and M9's suite fails if any file outside 022 and `lib/session-concepts.ts`
spells it. 022's header anticipated exactly that problem and answered it: readers
go through `CONFIRMED_SESSION_CONCEPTS_VIEW` in TypeScript rather than retyping
the name in SQL. So `026` names no session concept anywhere, `lib/coverage-state.ts`
is the **canonical** derivation and computes all four rungs, and `026` §2's
`concept_assessment_evidence` view carries the two rungs expressible from M10's
evidence alone. A test asserts the fence holds and that both halves agree.

### M12-2 — accuracy, watermarked, and no queue

`advanceAccuracy(prior, events)` is a fold whose single load-bearing line is
`e.seq <= prior.watermark.last_seq`. Three properties, each tested rather than
asserted in prose:

1. an event at or below the mark is never folded again — it is counted in
   `skipped_at_or_below_watermark` and never reaches a counter;
2. a run with no new events returns `changed: false` **and the identical state
   object** (`===`, asserted), so a caller that persists on `changed` cannot
   write a redundant row;
3. the mark is the server's `seq` and never `occurred_at` (R.10).

**No queue is introduced, and none could be.** The module has no transport, no
subscription, no callback, no `await` and no `Promise` — a test greps for all of
them. Catch-up is scheduled work, which is U.2's own answer (*"Vercel cron +
GitHub Actions covers scheduled work; the split already exists"*).

A correction (`EVENT_SUPERSEDED`) sets `rebuild_required` rather than being
folded backwards: removal is not expressible in a forward fold over counters, and
O.4's answer is replay-from-checkpoint, not patching.

**Zero answered questions is `null` accuracy, never zero** — J.4 and V.6.1's
*"a new account has no score, not zero"*, at the concept level.

**ONE HONEST GAP, NAMED RATHER THAN PAPERED OVER.** `QUESTION_WRONG` is emitted
today; `QUESTION_CORRECT` is a declared contract type with **no emitter** —
`app/api/assessment/answer/route.ts` builds a draft only on a wrong answer. Until
an emitter exists this projection sees wrong answers and not right ones, and it
reports the honest reading of what it saw rather than a flattering one. Wiring
the emitter means editing M10's route, which is outside this milestone; it is the
one follow-up this projection needs before its numbers are presentable, and it is
carried into M13's dependencies.

### M12-3 — the consistency job **detects**, and does not repair

**The judgement call, with its basis.** T8 asks for a job that *"verifies each
projection's watermark against the stream"*. **Part H.1 nowhere authorises
self-healing** — its table and H.1.a say what may write where, and H.2's rebuild
is O.4's *"replay from checkpoint rather than patching"*, a deliberate audited
act. T3 states the same posture in one line: *"an explicit restatement, never a
silent recompute"* (O.4.3). And the risk T8 actually names is *"inconsistent IN A
WAY NO USER CAN SEE"* — an observability failure, which a job that quietly
corrected the symptom would preserve for exactly as long as it kept running.

So `REPAIR_POLICY = "report_only"`, it is echoed into every response, there is no
repair verb in the module or the route, and a test greps both for write paths.
Remedies are TEXT for a human (`FINDING_REMEDY`), never calls.

Eight detections, of which seven are errors and one (`behind`, within tolerance)
is expected by design:

`behind` · `ahead_of_stream` · `dangling_watermark` · `watermark_mismatch` ·
`missing_watermark` · `undercounted` · `state_disagrees` ·
`unregistered_projection`

`undercounted` is T8's *"missing a required update"* made checkable: a mark at
the head of the stream with fewer events folded than the stream holds is a fold
that skipped something. `state_disagrees` is the cache-versus-derivation check,
fed by `026` §6's `academic_record_drift` view, which flags **a cached row
claiming more than the evidence supports** — the fabricated direction. Staleness
in the other direction is lag and is the watermark check's business.

`app/api/cron/projection-consistency/route.ts` follows M7-7's split exactly:
`isInternalCaller`, adapters, no clock in the pure half. **NOT SCHEDULED** —
nothing in `vercel.json` calls it, the posture `event-compaction` and
`score-snapshot` both document.

A finding goes to Sentry and to the response body, and **not** into the O.6 audit
chain: `AUDIT_ACTIONS` is a closed list of twelve mirrored by a CHECK in `016`,
none of them is "a projection was checked", and widening it means editing an M7
module and an applied migration's checksum (T1). It is arguably also right — O.6
records acts taken on a student's record, and this job takes none.

### The one edit to earlier work, recorded rather than made silently

`tests/mistake-dna.test.mjs` asserted *"025 is not the highest migration"* — a
claim about the FUTURE that became false the moment M12-1 needed `026`. Every
later milestone would have had to delete it. It is **narrowed** to the invariant
it was standing in for (no later file may re-claim 025's number; directory-wide
uniqueness is already M1's `validateRepoMigrations()`), with the reasoning in the
test itself. What M11 cared about — 025 registered once, with its own true
checksum, and 007 never edited — is untouched and still asserted.

**Verification.** `npx tsc --noEmit` clean · `node --test tests/*.test.mjs`
**1285 passing, 0 failing** (1220 before this milestone; +65) · `npx next build`
compiles, `/api/cron/projection-consistency` registered.

### M12 — the one live-infrastructure step, not taken

**Apply `026_academic_record.sql`.** Paste the file's full contents into the
Supabase SQL editor and run it. It is additive throughout: three tables, three
views, five indexes, two SELECT-own policies, three REVOKEs, three GRANTs. It
ALTERs nothing that already exists and drops nothing. `§1` refuses to run unless
015, 021, 023 and 024 are applied first, and `§8` refuses to finish unless the two
invariants it claims are actually in `pg_constraint`. Verify with
`node scripts/check-migrations.mjs`, which reports `026` UNAPPLIED until it has
been run and DIVERGENT if the file is edited afterwards.

**The catch-up runner is not built and is deliberately not M12's.** `026` gives
the projections their tables and their watermark ledger; `lib/coverage-state.ts`
and `lib/concept-accuracy.ts` give them their derivations; M12-3 gives them their
audit. What does not yet exist is a scheduled job that WRITES `academic_record`
and `concept_accuracy` from those derivations — because the surfaces that read
them are M13 and the score that reads them is M14, and a projection with no
reader is dark code (T12). Until it exists the tables stay empty, which H.2 makes
safe by construction: L2 is disposable, so an empty cache is a cold cache and
never a lost fact.

---

## M13 — `/diagnosis` and `/record` · **P1** — **COMPLETE** (M13-1/2 2026-08-16, M13-3/4 2026-08-17, uncommitted)

**Scope.** Part S.4 (seven tools **REBUILD as one** `/diagnosis`; `grade-tracker`
**ADAPT** into `/record`); `PRODUCT_DECISIONS` §2.4 merge map.

**Dependency rationale.** Both surfaces read M12's projection and nothing else
new. `PRODUCT_DECISIONS:185`: *"Six metaphors for one answer. Merging them IS the
product."*

| ID | Task | Effort | Done when | Status |
|---|---|---|---|---|
| **M13-1** | `/diagnosis`: marks lost by error class; recurrence with an evidence trail | XL | Every claim on the surface reaches a record | **DONE** |
| **M13-2** | Absorb `post-exam`, `paper-autopsy`, `marks-forensics`, `marks-obituary`, `paper-trauma`, `paper-pattern`, `calibration`; 301 | XL | Old routes 301; no capability lost; `post-exam` reaches integration Level 3 with deletion removed (P.4) | **DONE**, with two capabilities explicitly **not** carried over — recorded below |
| **M13-3** | `/record`: pattern list and timeline; absorb `grade-tracker`, `/console/analytics`; 301 | XL | ≥6 months renders; parity retained | **DONE**, with four capabilities explicitly **not** carried over — recorded below |
| **M13-4** | Retire the morbid metaphors in all surviving copy | S | Zero uses of obituary/autopsy/coroner/trauma/forensics (`PRINCIPLES` §4.1) | **DONE**, proved by a repository-wide audit, not by a file list |

**`tests/diagnosis.test.mjs` (39 tests) proves both with no database in reach:**
`lib/diagnosis.ts` is I/O-free and takes its rows as arguments, and the database
verbs are injected as an interface with two reads and no write (U.3).

**Nothing was applied to any database, and no migration was needed.**
`/diagnosis` reads tables `007` and `020` already declare.

### M13-1 — the done-when, implemented as a type rather than a habit

*"Every claim on the surface reaches a record"* is not a review checklist here.
Every tally `lib/diagnosis.ts` emits carries `occurrenceIds` — the ids of the
rows it is a sum of — and every recurrence carries a `trail` of `EvidenceLink`s
naming the occurrence **and** the `evidence` row behind it. A figure with no ids
cannot be constructed, because the tally types have no shape without them. The
tests sum the rows a tally names and compare them to the tally; a structural
fence additionally asserts the page contains no numeric literal the spacing ramp
and the type ramp cannot explain.

Four refusals stand behind the figures:

| Case | What the surface does |
|---|---|
| unconfirmed occurrence | never counted — `020`'s view, and a second refusal in `readOccurrence` |
| both error arms set | counted in `ambiguous`, assigned to **neither** class (V.4.9) |
| leaf pattern with no listed occurrence | **no recurrence row at all** |
| no confirmed occurrence anywhere | an EMPTY diagnosis with an invitation to `/capture`, never a diagnosis of zero |

Recurrence is counted **from the trail**, not from `patterns.recurrence_count`:
the stored counter is derived over all occurrences including unconfirmed ones, so
reading it would let the screen claim nine and be able to show one. Parent
severity is `MAX` of descendant leaves, derived on demand and never persisted
(§4.6.2), with breadth stated in words (§4.6.4) — both asserted.

### M13-1 — a recorded divergence from this milestone's own dependency line

**M13's dependency rationale says both surfaces *"read M12's projection and
nothing else new."* They cannot yet, and M12's completion note says why:** *"the
catch-up runner is not built and is deliberately not M12's … Until it exists the
tables stay empty."* A surface whose every figure came from `concept_accuracy`
would render zeroes and call them a diagnosis — the exact Law 7 failure this
milestone exists to end.

So `/diagnosis` folds **L1/L3 directly**: `confirmed_occurrences` (`020`) and
`patterns` (`007`, written by M11's `ingestOccurrenceIntoDna`). Both are real
rows a student can be shown. When the catch-up runner lands, `concept_accuracy`
becomes an additional, faster source for the same facts — never a different
answer. Recorded here rather than resolved by judgement, the same way M12-1
recorded the three-rung/five-rung disagreement.

### M13-2 — what the seven actually were, having read all seven

**Four of the seven are the same screen four times.** `post-exam`'s DNA tab,
`paper-autopsy`, `marks-obituary` and `paper-trauma` all render marks lost
grouped by an error category plus a claim about what repeats. Each uses its own
private category vocabulary (five, four, six and none respectively — none of them
§4.5's), each asks a **model** to produce the numbers from text the student
retyped, and **not one of them can name a row behind a figure.** The plan's
thesis is confirmed rather than assumed: the differentiation was cosmetic, and
`/diagnosis` answers the same question from the record.

**Three carried something real, and two of the three halves survive:**

| Tool | Durable half | Where it is now |
|---|---|---|
| `marks-forensics` | per-question mark accounting | **the evidence trail** — `marksLost of marksAvailable` per occurrence, with its question ref and paper |
| `calibration` | what the student believed *before* answering | **the calibration view**, read from `occurrences.confidence_before` (§4.3: *"feeds calibration"*) on marks actually lost |
| `paper-pattern` | — | **nothing, deliberately** |

### M13-2 — two capabilities NOT carried over, stated rather than glossed

The same accounting M8-1 owed and paid in `next.config.mjs`.

1. **`paper-pattern` in full.** It predicted a subject's next paper from **no
   student data and no paper corpus**: the ten-year frequencies, the trends and
   the "predicted questions" were invented by a model and rendered as analysis.
   S.9 is unambiguous about that class of surface — *"Not 'estimated' —
   fabricated"* — and Law 7 forbids reinstating it. **This is not a capability
   lost; it is a capability that was never one.**
2. **The model-prose halves.** `post-exam`'s Debrief and Strategy tabs (a
   self-reported score in, coaching prose out; `ledger-exam-debriefs` is Level 0
   and feeds nothing), `marks-forensics`'s grading of a pasted mark scheme, and
   `calibration`'s MCQ generation. The first is `PRINCIPLES` §3.2 — the product
   does not store claims. The second needs the mark scheme read off a
   photographed paper, which is `/capture`'s extraction (M8-4). The third is
   F.4's seven gates and M10's assessment engine. **All three belong to
   milestones that own them, and none belongs to a diagnosis surface.**

### M13-2 — the stub-versus-preserve call, and why M8's precedent won

M3 stubbed `/dashboard` to a `permanentRedirect` as a second mechanism; M8 left
`exam-practice` and `syllabus` intact and unlinked. **M13 follows M8.** The
redirects are the config's, exact-path and permanent (308, this codebase's
`permanent: true` convention since M3); the seven page files are untouched, so
the three genuinely distinct halves above can be rebuilt onto the record by the
milestones that own them without archaeology, and §1.4's deletion gate is not
tripped by a merge that is reversible in seven lines.

Three of the seven land on a **mode** rather than the default view —
`paper-trauma` and `marks-forensics` on `?view=recurrence`, `calibration` on
`?view=calibration` — the same mechanism M3 used for
`/tools/dna → /tools/post-exam?tab=dna`.

### M13-2 — `post-exam` reaches Level 3, and deletion is removed twice over

P.4 records what it was: *"reads `ledger-mistakes`; `:140` **deletes it** …
effective level: **negative** … the only tool that can destroy the record."* Its
target is *"**3** (it becomes `/diagnosis`, read + status transitions only, with
deletion removed)."*

- **Level 3** is reached by reading the durable record — `confirmed_occurrences`
  and `patterns` — instead of a browser key.
- **Deletion is removed by construction, in three places.** `DiagnosisDb`
  declares two read methods and no write method; `/api/diagnosis` exports `GET`
  and nothing else; and `007` declares **no DELETE policy** on `occurrences` or
  `patterns`, so `authenticated` could not destroy a row even if a route asked.
  All three are asserted. The `Clear all` M0 removed from `post-exam` is asserted
  still gone, and its *"Kept permanently"* label still present.

**The status-transition half of Level 3 is NOT built.** `patterns_update_own`
already admits `acknowledged` and `practising`, but a transition is a write and
M13-1's done-when is about claims reaching records; putting a write into a read
endpoint to close a sentence would be the wrong trade. It is M13's remaining
work, below.

### M13-3 — the done-when's first half is a SCALE claim, and is paid as one

*"≥6 months renders"* is not a heading on a page. It is that a student with six
months — or six years — of record gets a surface, and that getting it does not
read the whole table. **`tests/record.test.mjs` (48 tests) proves both halves
with no database in reach:** `lib/record.ts` is I/O-free, has no clock and no
randomness, and takes its rows and its **window** as arguments (U.3).

Four mechanisms, all asserted:

| Mechanism | Where | Asserted by |
|---|---|---|
| Every read is **windowed** on a real calendar month range | `RecordWindow`, half-open `[from, to)` | the window suite; 6/12/24/60 months all produce exactly that many keys, across a year boundary |
| Every read is **paged** | `readAllPages`, `RECORD_PAGE_SIZE = 500` | a 1,007-row source is read as 3 pages, not 1 request |
| The pager **refuses to loop for ever** | `RECORD_MAX_PAGES = 20` | at the ceiling it stops and sets `truncated`, so a partial total is never rendered as a total |
| Every windowed column **heads an index that already exists** | `RECORD_SOURCES` names the index per source | a test greps `007`/`020`/`021`/`005` and fails if a named index is not created by a migration |

And the timeline **buckets by month**, so the rendered row count is the
window's month count and not the record's row count. The proof is explicit:
**60 months × 40 confirmed questions = 2,400 rows of record renders as 60 rows**,
and every month's `marksLost` is re-summed from the `occurrenceIds` it carries
— M13-1's *"every claim reaches a record"* discipline, kept.

`score_history` uses `user_id` where every other relation uses `student_id`;
`RECORD_SOURCES` states it rather than letting a reader guess, and a test pins it.

### M13-3 — the same divergence M13-1 recorded, for the same reason

M13's dependency rationale says both surfaces *"read M12's projection and
nothing else new."* `/record` cannot yet, for the reason M12's own completion
note gives. So the timeline folds **real rows directly**: `confirmed_occurrences`
(`020`), `patterns` (`007`), `evidence` (`007`), `study_sessions` (`021`) and
`score_history` (`005`/`010`). A six-month timeline assembled from an empty
`concept_accuracy` would be six months of zeroes presented as a record.

### M13-3 — what the two absorbed surfaces actually were, having read both

**`/console/analytics` is not a production surface and says so in its own
header:** *"an unlinked harness attacking the vocabulary."* Every figure in it
is a constant. There was no capability to preserve — only a SHAPE (sectors, a
per-subject comparison, a series of closes over time), which `/record` now
renders from rows. The finding the harness existed to record — B-2, *"a trend
over time cannot be expressed"* — is answered by bucketing the series into
months rather than by adding a chart primitive to the vocabulary.

**`grade-tracker` is four tabs, and one of the four is the record.**

### M13-3 — FOUR capabilities NOT carried over, stated rather than glossed

The same accounting M8-1 and M13-2 owed and paid, recorded in full in
`next.config.mjs` beside the redirects.

1. **The Marks Predictor.** Self-reported subject scores and weights in; a
   weighted average, a CBSE grade, two GPAs, a *"score needed in the remaining
   weight"* and a what-if slider out. Every input is a claim the student typed
   and every output is a forecast built on it — `PRINCIPLES` §3.2 and Law 7. A
   calculator over unevidenced figures is not the longitudinal asset §2.4 sends
   here.
2. **The Ledger Score tab.** **M14 rebuilds the score** (S.2: `lib/ledger-score.ts`
   REBUILD, the streak term deleted, `insufficient evidence` representable), so
   reproducing the v1 pillar breakdown on a new surface would create a second
   place to change it weeks before it changes. What `/record` carries instead is
   `score_history` — the closes actually **recorded**, presented as what the
   index read on that day. A recorded close is a fact; the pillar breakdown is a
   formula, and the formula is M14's. A test asserts `/record` imports neither
   `lib/ledger-score.ts` nor `lib/ledger-score-v2.ts`.
3. **The Peer Heatmap.** Its own banner reads *"Illustrative data … not
   aggregated from real student sessions."* S.9's class exactly, and the same
   call M13-2 made about `paper-pattern`. **This is not a capability lost; it is
   a capability that was never one.**
4. **The Exam Debrief.** A self-reported score, sleep and anxiety level in,
   model prose out, parked in `ledger-exam-debriefs` (Level 0, feeding nothing).
   M13-2 refused `post-exam`'s identical tab for §3.2's reason; carrying it here
   would be the inconsistency, not the loss.

**Neither page file is gutted.** M8's precedent again, not M3's stub: both
routes stop being reachable, both files stay in the tree, and §1.4's deletion
gate is not tripped by a merge reversible in two lines.

### M13-3 — §4 applied to the one surface most able to shame

A timeline is the easiest screen in this product to turn into a wall of
reproach. Three refusals, all asserted:

- **A quiet month is not a month of zero.** `hasRecord` is false and the row
  reads *"no record"*. It never reads *"0 marks lost"*.
- **A source that did not answer is NAMED, not zeroed.** `evidence`,
  `study_sessions` and `score_history` are supplementary: one that errors leaves
  its column `null` and appears in `unreadable`, and the page says which figure
  is missing. The **spine** (`confirmed_occurrences`, `patterns`) fails loudly
  instead — a read that did not happen is not a record with nothing in it.
- **Nothing is forecast.** No trend line, no *"at this rate"*, no projection.
  Both absorbed surfaces forecast; that is why neither survives.

### M13-4 — the scope decision, stated once rather than argued per file

The done-when is *"zero uses … in all surviving copy"*, and **copy is what a
student can read**. `tests/record.test.mjs` walks **every** `.ts/.tsx/.js/.mjs/.css`
file under `app/`, `lib/`, `components/`, `hooks/` and `design-system/` — not
the files this milestone touched — and fails on any banned word in any string
that reaches a reader. Three categories, and the third is asserted still clean:

| Category | Examples | Verdict |
|---|---|---|
| **Copy** | registry titles/subtitles/blurbs, page headings, button labels, tab labels, share text, admin labels, AI prompt prose | **Zero tolerance.** All fixed. |
| **Identifiers** | route paths (`/tools/paper-autopsy`), file names, type names (`TraumaMapResult`), AI capability keys (`paper_trauma_map`), JSON wire fields (`trauma_signature`), localStorage keys (`forensics_sessions`), CSS scope comments | **Deliberately kept.** Never rendered. Renaming the route paths breaks M13-2's 301s; renaming the capability keys and wire fields orphans every `ai_history` row and every saved session already stored under them — a real regression traded for no word removed from any screen. §2.5 and S.4 both keep the URLs resolving. A test asserts all of them are **still intact**, so the retirement cannot be mistaken for a rename. |
| **Subject matter** | `lib/papers-data.ts`'s two CBSE Psychology MCQs on post-traumatic stress disorder | **Excluded, by name.** That is the syllabus, not the product's voice. §4.1 bans the family as branding for a student's marks; deleting a real exam question because it names a clinical condition would corrupt the question bank to satisfy a copy rule. |

The audit's extractor enforces the category-1/category-2 line structurally
rather than by allowlist: it strips comments, strips `${…}` interpolations
(reading a field is not writing a word), strips quoted `snake_case` tokens (an
AI prompt's JSON schema is a wire contract), and skips any literal that is
identifier-shaped. A `case "paper_autopsy":` label is not a string literal and
never reaches it at all.

### M13-4 — every file whose COPY changed

| File | What changed |
|---|---|
| `lib/tools-registry.ts` | four titles, four subtitles, three blurbs, four keyword lists, one `exam-triage` subtitle+blurb. Slugs unchanged (`tests/tools-registry.test.mjs` §1.5 still names all thirteen CORE tools) |
| `app/tools/exam-triage/page.tsx` | the live tab label. **The `?tab=` value is unchanged**, so `/tools/cremator`'s M3 redirect still lands on the right tab |
| `app/tools/paper-autopsy/page.tsx` · `marks-obituary` · `marks-forensics` · `paper-trauma` | rendered headings, buttons, section labels, the share text, one fallback string. No functional change; **M13-2's redirects untouched** |
| `app/api/ai/route.ts` | prompt **prose** in seven capabilities (`formula_decoder`, `paper_autopsy`, `examiner_mind`, `marks_autopsy`, `marks_forensics`, `paper_trauma_map`, `marks_obituary`) so a model is no longer instructed to write in the metaphor. Capability keys, `REQUIRED_PARAMS`, `validTools` and JSON schema fields unchanged |
| `app/admin/page.tsx` | one capability **label**; the key is unchanged |
| `lib/desks.ts` | one desk brief (module currently has no importers) |
| `app/globals.css` | two section comments |

`/diagnosis`, `/record`, `lib/diagnosis.ts` and `lib/record.ts` contain none of
the seven words outside comments naming the ban itself.

### M13 — what is still open

- **Pattern status transitions** (`open → acknowledged → practising`) from the
  diagnosis surface, completing Level 3's *"read + status transitions"*. Still
  M13-1's unpaid half; a transition is a write and neither read surface has a
  write verb by construction. Carry to whichever milestone owns pattern
  lifecycle.
- **`/record` is reachable by URL and by redirect, and is not yet in a
  navigation.** Neither is `/diagnosis`. `PRODUCT_DECISIONS` §2.4's nine-route
  navigation is not this milestone's to build; `/record` links out to
  `/diagnosis` and `/home`, which is the same posture M13-1 left.
- **`concept_accuracy` and `academic_record` are still not read** by either
  surface, and will not be until M12's catch-up runner exists. When it does,
  they become an additional, faster source for the same facts — never a
  different answer.
- **No live-infrastructure step.** M13-3/4 need **no migration, no cron and no
  database change of any kind.** Every relation `/record` reads is already
  declared by `005`, `007`, `010`, `020` and `021`, and **nothing was applied to
  any database.** A student with no record sees an EMPTY record with an
  invitation to `/capture` — the honest state, and what it says.

---

## M14 — Ledger Score rebuild, including Continuity · **P1** — **COMPLETE, ALL EIGHT SUBTASKS** (2026-08-17, uncommitted; `027` NOT applied to any database)

**Scope.** Implementation Order step 9; **Part J** in full; Part S.2 in full;
Part W rows *Ledger Score* (**REBUILD**), *Score snapshots* (**ADAPT**) and
*Streak as a scoring input* (**REMOVE FROM SCORING**, relocated from M0) — P1.
Implements ratified decisions `PRODUCT_DECISIONS` §9.3 and the scoring half of
§9.4.

**Dependency rationale.** Requires M12. *"Building the score before the record it
measures is what produced the current mistake pillar."*

| ID | Task | Verdict | Effort | Done when | Status |
|---|---|---|---|---|---|
| **M14-1** | Event-derived input builder reproducing the unified-inputs pattern exactly | **KEEP as a pattern** | L | One formula, all consumers, zero duplication | **DONE** — `lib/score-inputs.ts` |
| **M14-2** | Delete the consecutive-day term from scoring (`lib/ledger-score.ts:218`, `lib/ledger-score-v2.ts:220` — **relocated from M0-5**); four dimensions, **no streak**; Continuity computed from verified sessions and assessment participation | **REMOVE FROM SCORING** + **REBUILD** | XL | The term is deleted, **not renamed**. Continuity does not read `ledger-focus-streak`; renaming would not have implemented this (§9.3) | **DONE** in **both** engines; Continuity is `lib/score-continuity.ts` |
| **M14-3** | Recovery pays only evidence-backed, system-set resolutions | **REBUILD** | L | V.6.5 — eight new mistakes cause **no dimension to fall** | **DONE** — `lib/score-recovery.ts` |
| **M14-4** | `insufficient evidence` as a representable state; baseline period | **REBUILD** | L | V.6.1, V.6.2 — a new account has **no score**, not zero | **DONE** — `lib/score-engine.ts` |
| **M14-5** | Snapshots: `formula_version`, `confidence`, `evidence_counts`, `input_watermark_event_id` | **ADAPT** | L | V.6.3, V.6.8 — replay into an empty database reproduces every snapshot | **DONE** — `027` + `replayScoreSnapshot()` |
| **M14-6** | Cut over via the existing shadow-mode cron; stop discarding the candidate result | **KEEP the mechanism** | M | T3 mitigation: an explicit restatement, never a silent recompute (O.4.3) | **DONE** — `app/api/cron/score-snapshot/route.ts` |
| **M14-7** | Carry `gapTopics` as a diagnostic; stop calling a self-report a score | **ADAPT** | M | J.4 — `lib/ledger-score.ts:277-358` | **DONE** — `computeColdStartDiagnostic()` |
| **M14-8** | Generalise the `active-close` corroboration pattern to all client claims; fix the IST/UTC boundary | **ADAPT** | M | R.10: a client claim is admissible only when a server-observable fact agrees | **DONE** — `lib/client-claim-corroboration.ts` |

**Definition of done.** V.6 in full. **V.11 (the canonical end-to-end scenario)
passes at every hop except the next-action hop, which gates on M20.**

**M14-1…M14-4 completion record (2026-08-17, uncommitted, no migration run).**

`lib/score-inputs.ts` · `lib/score-engine.ts` · `lib/score-continuity.ts` ·
`lib/score-recovery.ts` (new) and `lib/ledger-score.ts` · `lib/ledger-score-v2.ts`
(streak term deleted). **No migration was needed or written** — M14-1…4 read
021/024/025/026, all of which exist; the snapshot columns are M14-5's, so `027`
remains the next free number and nothing was executed against any database.

**M14-1 — the pattern is kept, the source is replaced.** `buildScoreInputs()` is
the single builder and `computeLedgerScore()` in `lib/score-engine.ts` is the
single formula; the six database verbs are injected as an interface of **six
reads and no write**, so the whole of V.6 is provable with no live project in
reach (U.3). **The client twin is deliberately NOT reproduced** — v1 had two
builders because it had two sources, and J.7's *"the score is computed only on
the server, from server-written events"* leaves one. Its absence is stronger than
its unification was. `lib/score-inputs.ts` never reads `user_data.blob`,
`localStorage` or `ledger-focus-streak`, asserted by test.

**M14-2 — the term is deleted in BOTH engines, and Continuity is not a rename.**
`Math.min(150, Math.round(streak * 7.5))` is gone from `lib/ledger-score.ts` and
`lib/ledger-score-v2.ts` alike; both totals have lost their fourth addend and
`consistencyScore` / `consistency` are a constant `0` carrying
`consistencyState: "retired"` — retained only because five surfaces outside this
milestone's scope read the field by name, and labelled so the zero cannot pass
for a measurement (J.3.a). The two streak-framed *actions* are deleted with the
term (B.11: a recommendation may not promise points no mechanism can pay).
`lib/score-continuity.ts` contains **no day index, no `lastDate`, no
`toDateString`, no "yesterday", no `shield`, no `streak`** — a fence test greps
for all of them over source, because a claim about code that must not exist has
no unit test. **One divergence from J.2's literal formula is recorded rather than
resolved by judgement, under the authority J.2.a.4 granted in advance.** J.7.3
admits a concept to the denominator once it has *"had a fair opportunity to be
assessed"*; read as a **clock**, that breaks V.6.6, since a concept studied three
weeks ago would cross the grace line during inactivity and drop the ratio with
the student doing nothing. So the opportunity is read from the session's own
**close reason** — `assessment_completed`/`VERIFIED` (taken) and
`assessment_skipped` (offered and declined) admit; `reaped`, `discarded`,
`generation_failed`, `review_skipped` and still-live do not. That is §9.3's own
*"confirmed and then declined to verify"* with no clock in it, and it makes M9's
`SESSION_SCORE_CONTRACT` hold literally: a reaped session is on **neither** side
of the ratio. J.3's *"≥2 sessions in the trailing window"* is likewise applied to
the **settled set** rather than to a window, for the same V.6.6 reason.

**M14-3 — Recovery is paid from `mistake_resolutions` (025), never from
`patterns.status`.** That single sentence is the milestone. `025 §6` grants
`UPDATE (status) ON patterns TO authenticated`, so a term reading `status` is a
term whose correctness depends on three separate refusals holding forever on a
column a client is granted; J.9's *"the cheap fix converts a dead pillar into a
self-awardable one, which is strictly worse"* is refused twice — by reading a
different table, and by `readResolution()` **re-checking that table's own CHECK
constraints in TypeScript** (`set_by = 'system'`, ≥2 proof attempts, ≥7 cooling
days). Unpayable claims are **reported, not dropped**: a pattern whose row says
`resolved` with no resolution behind it lands in `unprovenResolutionClaims`
earning nothing, so an audit can see it happened. All three terms stay **counts
with ceilings, never proportions** (J.7.1), which is what makes V.6.5 structural
rather than remembered.

**M14-4 — `insufficient evidence` is an arm of a union, not a number.** A
dimension is `{ state: "measured", points: number }` or
`{ state: "insufficient_evidence", points: null, needs: string }`, and below
baseline `total` is `null` — **a surface cannot render a score that does not
exist, because the type has none**. `measuredMax` is carried alongside, since 640
out of a measured 850 is a different claim from 640 out of 1000. **There is no
`try`/`catch` returning an EMPTY score**, asserted by test: J.3.a records what
that cost the old engine, where a student with no data, a student whose
computation threw and a student who scored zero were indistinguishable. Baseline
thresholds are decided here in the open, as J.4's *"ARCHITECTURAL INFERENCE"*
invites — `BASELINE_SESSIONS = 3`, `BASELINE_SUBJECTS = 1`, `BASELINE_DAYS = 14`.

**One defect found and fixed during verification, recorded because it was a real
V.6.2 failure and not a test artefact.** The elapsed clause originally read
`verifiedSessions >= 1`, which let an account whose ONLY assessment was below
`MIN_SESSION_QUESTIONS` mature into a score fourteen days later — V.6.1's lie
arriving late, on the strength of an assessment V.6.2 says *"is not counted."*
J.4's wording is *"elapsed **with any verified evidence**"*, so `computeBaseline`
now takes `PerformanceEvidence` (the same discipline `computeConfidence` follows,
so the qualifying-assessment count is decided in **one** place) and gates both
clauses on `hasVerifiedEvidence` — a qualifying assessment, or a concept the
record carried to `assessed`. A test asserts the account is still `baseline` four
hundred days on.

**A second defect: the suite existed but had never been executed.**
`tests/ledger-score.test.mjs`'s `before()` compiled the modules but omitted the
`.js`-extension rewriter every other compiled suite in this repository runs, so
all four score modules failed to import and **every behavioural assertion in the
file was silently skipped** while the structural greps passed. The rewriter is
restored; the behavioural half now actually runs.

**Two stale assertions in `tests/score-projection.test.mjs` were rewritten, not
deleted.** They asserted the streak still paid — `consistencyScore === 150` and
`projectFocusImpact → +8`. They now assert the opposite, which is the honest
regression test for M14-2: the ceiling is 850, `consistencyState` is `retired`,
and a projected streak day is worth `0` at 1, 7 and 30 days. Because the
projection layer runs the **real** engine over a mutated copy of the inputs, a
projection of zero is proof the engine has no term left to move.

**Deliberately NOT done, and why.** The new engine has **zero consumers** — every
shipped surface still calls `lib/ledger-score.ts`. That is not an oversight; it
is M14-6, and O.4.3 forbids performing the cutover silently on the way past:
*"an explicit restatement, never a silent recompute."* Verified by grep: no
partial migration exists, and there are not two live formulas.

**Verification.** `npx tsc --noEmit` clean · `npx next build` clean ·
`node --test tests/*.test.mjs` **1421 passing, 0 failing** (from 1372).

**M14-5…M14-8 completion record (2026-08-17, uncommitted, NO MIGRATION RUN).**

`supabase/migrations/027_score_snapshot_provenance.sql` (new, **unapplied**) ·
`app/api/cron/score-snapshot/route.ts` (the cutover) · `lib/score-engine.ts`
(the snapshot half) · `lib/client-claim-corroboration.ts` (new) ·
`lib/active-close.ts` · `lib/ledger-score.ts` (the cold-start path).

**M14-5 — reproducibility is a claim about ARGUMENTS, and it needs a fifth
column.** M14-5 names four; a snapshot reproduces only if a replay can recover
*every* argument the formula saw, and the formula's are `LedgerScoreInputs` —
which a replay rebuilds — plus `asOfMs`, which it cannot. The accuracy term is
an exponential decay in `asOfMs`, so the same student computed twice on one
calendar day gives two different, equally correct numbers: `captured_on` is a
DATE and reproduces the **day**, not the **row**. So `as_of` is stored to the
millisecond and V.6.8 becomes exact rather than approximate.
`replayScoreSnapshot()` is V.6.8 as a callable function, and the test hands it
the stored row plus **freshly constructed** rows — a replay into an empty
database shares no object identity with the run that wrote the snapshot, and
neither does the test. The proof that `as_of` is load-bearing rather than
decorative is a test that moves it thirty days on the *same rows* and requires
the replay to **stop matching** (confidence 0.384 → 0.328); a replay reading a
clock would have passed it. A row written by another `formula_version` — or by
the NULL a pre-M14 row carries — is **refused**, not silently recomputed (J.6):
"reproduced under a formula that did not write it" is not reproduction. `027`
also drops five NOT NULL constraints, because J.3.a is unstateable in a column
that can only hold `0`, and adds a CHECK that a `scored` row has a total and a
`baseline` row does not — V.6.1 enforced by the database rather than remembered.
**No backfill:** pre-M14 rows keep a NULL `formula_version`, which is the honest
reading *"this row predates provenance"*.

**M14-6 — the direction is reversed and the mechanism is untouched.** J.9's
CURRENT FACT was *"v2 is computed by the cron, logged as a delta, and
**discarded** — the row written to `score_history` is v1."* Now `score-engine`
is the close of record and **v1 is the shadow**, logged as a per-user delta so
T3's size is *measured* rather than discovered by a student; `ledger-score-v2`
is read here no longer, because two shadows would make *"which formula is live"*
a question with more than one answer. The whole write path is asserted in order
over the route's source — what is computed, what reaches the array, what the
array is upserted as, and that `v1` appears on **no** line that pushes, builds a
snapshot or upserts — and a test confirms the route now contains **exactly one**
write verb where it used to contain two. Every safety property is fenced
unchanged: `isInternalCaller` before any read, service-role client only,
`onConflict: "user_id,captured_on"` (005's UNIQUE, so a double-fired close still
upserts), and 500-row chunks. **The restatement is decided from DATA** — the
previous row's own `formula_version` — and a test asserts there is no deploy
flag, because a flag can be forgotten in exactly the way T3 is about. It is
per-student, self-healing, and fires exactly once per formula change.

**One deliberate inversion of an M1-3 rule, and the reason it is not the same
trade.** The old route caught a missing `score_history.active`, dropped the flag
and retried, on the reasoning that the close of record must never be blocked by
schema lag. Dropping `active` cost one boolean; dropping 027's columns costs
`formula_version`, `as_of` and the watermark, and an unprovenanced row is
unreplayable and **indistinguishable from a good one forever**, whereas a day
not written is recoverable in full because the close is idempotent. So schema
lag now returns 503 naming the migration instead of degrading. The M1-3 fence in
`tests/migration-ledger.test.mjs` asserted the opposite and was **inverted, not
deleted**, with the reasoning dated in place — the M7-6 convention.

**M14-7 — the numbers are gone, not relabelled.** The old path was type-safe and
still wrong: `kind: "temporary"` stopped a self-reported figure being *mixed*
with a real one and did nothing to stop it being *displayed* as one, and
`app/tools/exam-day/page.tsx` rendered it at 44px over `/ 1000`. **A student
cannot see a discriminated union; they see a score.** So the fabricated 20-mark
paper, the `shaky 0.3 / ok 0.6 / solid 0.9` mapping, the synthetic `ScoreInputs`
and the `computeScoreFromInputs` call are deleted, and `ColdStartDiagnostic`
**has no numeric field a surface could render** beyond two topic counts. What
survives is J.4's *"genuinely useful"* half — `gapTopics`, ordering unchanged —
carrying `source: "self_report"` and `verified: false` so a surface must
acknowledge what it is showing. A remembered mark is a self-report too and moves
**nothing**, asserted by a test that deep-equals the output with and without it.

**M14-8 — three definitions of "a day" disagreed, and every pair was an
off-by-one.** The client stamp read the browser's zone, the cron's close read
UTC, and the evidence comparison sliced an ISO string (also UTC). A student
answering questions at 01:00 IST on the 17th stamped `2026-08-17` while both the
close day and the evidence read `2026-08-16`, so the stamp missed the close day
*and* the evidence missed the stamp: **every late-night session in India was
silently recorded `active = false`.** D.1.b's fix is not "add 5:30 somewhere" —
it is *"day-boundary logic defined once, server-side, in the declared
timezone"* — so `dayKeyInZone` is that one definition and all three call sites go
through it. It is pure arithmetic over an epoch instant and a fixed offset, so
the boundary is **asserted at the instant that used to fail** (2026-08-16T19:30Z
→ `2026-08-17`, against a UTC slice of `2026-08-16`) and to the millisecond on
both sides, on any machine in any timezone. The generalisation is `ClientClaim<T>`
/ `CorroborationSource<T>` / `admitClientClaim` in a new I/O-free module:
**refusal is the default verdict**, so an author who forgets to pass a source
gets a claim not counted rather than a forgery counted, and `active-close` is now
its first **caller** rather than its only implementation. That it is genuinely
reusable is proved by exercising it on an unrelated claim with a server-written
source — R.10's *"model for every client-originated claim"* — and the module is
fenced against knowing anything about active days, blobs or I/O. `serverWitnessed`
reports that the blob-era sources are **not** server-written, so the residual
weakness rides in the verdict rather than only in a comment. Clock skew is
retained and is diagnostic, never a gate: refusing a claim for skew would punish
a student for a wall clock they did not choose and cannot see.

**One correction made during verification.** `readActiveDayClaim` returned
`ClientClaim<QualifyingEventType | null>` while `admitClientClaim` refuses a
null-valued claim by design — a type that declared a value legal which could
never be admitted. Narrowed to `ClientClaim<QualifyingEventType>`, returning "no
claim" for a stamp with no readable type. Behaviour is unchanged; the type is
now true.

**Verification.** `npx tsc --noEmit` clean · `npx next build` clean ·
`node --test tests/*.test.mjs` **1472 passing, 0 failing** (from 1423 passing /
1 failing on entry — the M1-3 fence above).

**DEPLOYMENT STEPS THIS MILESTONE DOES NOT PERFORM, AND MUST NOT.** (1) `027` is
**not applied to any database**; until it is, the close returns 503 rather than
writing unreplayable rows — that is the designed posture, not a defect. (2)
Launch checkpoint §4 decided *"before, not with"*: the plain-language
explanation of why scores are recalculating is published **ahead** of deploying
this route, and deploying it is the act that starts the cutover. Neither is a
code branch, because a path that kept writing v1 "until announced" would be the
two-live-formulas state this milestone exists to end.

---

## M15 — AI boundary · **P1 (server context) / P2 (route restructure)** — **M15-1 through M15-7 COMPLETE (2026-08-18, uncommitted)**

**Scope.** Part S.5; Part Q; Part W rows *AI personalisation* (**ADAPT**, P1) and
*AI route structure* (**REBUILD**, P2). The security spine is **KEEP** — no
priority, no change.

**Dependency rationale.** M15-1 requires M5 (`getStudentContext`). The
restructure is P2 and deliberately trails the P1 loop; M10 already established
the typed-capability template.

| ID | Task | Verdict | Effort | Pri |
|---|---|---|---|---|
| **M15-1** | `buildProfileContext` content verbatim, sourced from `getStudentContext()`, applied to **all** capabilities not 7 | **ADAPT** — done | L | P1 |
| **M15-2** | Keep auth, tier, meter, moderation, strikes, size caps untouched | **KEEP** — verified unchanged | — | — |
| **M15-3** | Break the 86-arm switch into per-capability modules driven by the manifest | **REBUILD** — done | XL | P2 |
| **M15-4** | Typed output schemas; **reject, never degrade**; delete the greedy `/\{[\s\S]*\}/` extraction | **REBUILD** — done | L | P2 |
| **M15-5** | Model selection from configuration, per capability | **ADAPT** — done | M | P2 |
| **M15-6** | `ai_history` → `ai_invocations` with prompt version and hashes | **ADAPT** — done | M | P2 |
| **M15-7** | Derive `validTools` from the manifest; the duplicate-entry defects disappear | **DELETE** — done | S | P2 |

**Verification basis for the M15-1/2 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` exit 0 · `node --test
tests/*.test.mjs` — **1575 pass, 0 fail**, 216 suites (1472 before this pass;
+103 across `tests/ai-personalisation.test.mjs` and the rest of the M0–M14
suites now discovered together in one run) · `app/api/ai/route.ts` and
`lib/ai-fetch.ts` are the only files this pass touched. `buildProfileContext`'s
own text is unchanged (diffed against its pre-M15 form); every capability
branch in the route now receives it, sourced through `getStudentContext()`
rather than any client-supplied field, and `lib/ai-fetch.ts` no longer
forwards a client-side profile object to the endpoint. Auth, tier/entitlement,
the atomic call meter, the two-layer moderation (regex pre-scan + classifier),
the strike counter and the per-field size caps were diffed line-for-line
against their pre-M15 state and are behaviourally unchanged. This pass did
**not** touch the 86-arm switch statement's structure — only added the
context-injection call at each existing branch — so M15-3's later rebuild
starts from an unmodified dispatch shape.

**Verification basis for M15-3 through M15-7 (this pass, 2026-08-18):** working
tree, uncommitted · `npx tsc --noEmit` exit 0 · `npx next build` exit 0 ·
`node --test tests/*.test.mjs` — **1592 pass, 0 fail**, 220 suites (1575 before
this pass; +120 net across a full rewrite of `tests/ai-personalisation.test.mjs`
for the new module structure, two anchor fixes in `tests/record.test.mjs`, plus
this pass's own M15-3..7 assertions folded into the same file rather than a
second one, per the "follow existing test file conventions" instruction).

This pass resumed a second interrupted attempt. `lib/ai-capabilities/{types,
safety,model-config,output-schema,invocations,registry}.ts`,
`lib/ai-capabilities/prompts/{group-01..05,index}.ts` and the `AI_CAPABILITIES`
addition to `lib/tools-registry.ts` already existed, untracked and unverified,
from that interrupted run. Rather than hand-verifying ~6,200 lines of
hand-authored prompt extraction against the ~2,900-line pre-restructure
`route.ts` by eye, the pre-restructure `buildPrompt` switch was mechanically
re-extracted from `route.ts` into standalone functions by a one-off script
(case body copied verbatim, only the `case "name":` header replaced with a
function signature — no prompt text rewritten), and that mechanical output was
diffed programmatically, whitespace-normalised, against every one of the
draft's 86 `lib/ai-capabilities/prompts/*.ts` functions: **all 86 identical**.
The `AI_CAPABILITIES` union in `lib/tools-registry.ts` was independently
recomputed from its `ai_capabilities` arrays and diffed against the 86
mechanically-extracted case names: exact match, both directions. The 24-name
`LARGE_OUTPUT_CAPABILITIES` set in `model-config.ts` was diffed against the
pre-restructure route's `LARGE_TOOLS` array: exact match.

**Three real defects were found and fixed in the draft**, by extracting each
capability's own "respond with exactly this JSON shape" text programmatically
and diffing it against `registry.ts`'s hand-written `OUTPUT_CONTRACTS`:
`silent_topic_audit` and `panic_triage` were declared `{ keys: null }` though
their prompts fix a concrete top-level shape (3 and 5 keys respectively), and
`coach_chat` was declared `{ keys: null }` though its prompt fixes `{"reply":
"string"}`. All three now carry their real contract. A fourth defect —
unrelated to the AI capabilities themselves — was found and fixed in
`lib/tools-registry.ts`: a doc-comment's literal glob path `` app/tools/** ``
contains the character sequence `/**`, which `tests/record.test.mjs`'s naive
comment-stripping `code()` helper misreads as an unterminated block-comment
open, silently swallowing ~27KB of real code (including the `paper-autopsy`
registry entry) and breaking two pre-existing M13 tests; the comment was
reworded without changing its meaning, and both tests pass again unmodified in
substance.

**What M15-3 built.** `app/api/ai/route.ts`'s 86-arm `buildPrompt` switch,
the closed `ToolName` union and the hand-written `validTools` array are gone.
Every capability is now `export const <name>: CapabilityPrompt` in
`lib/ai-capabilities/prompts/group-0N.ts`, looked up through
`capabilityFor()`/`isCapability()` (`lib/ai-capabilities/registry.ts`), which
refuses to load (`manifestDrift()`) if the manifest and the prompt modules ever
disagree about what exists. `buildPersonalisedPrompt` (still in `route.ts`,
alongside the untouched M15-1/2 spine) now takes the resolved
`CapabilityModule` instead of a tool name.

**What M15-4 built.** The greedy `/\{[\s\S]*\}/` extraction and the `{ raw:
text }` degrade fallback are both deleted from `route.ts`. Output now goes
through `parseModelJson` → `checkContract` (`lib/ai-capabilities/output-schema.ts`),
each capability's contract read mechanically off its own prompt's printed JSON
shape. A contract failure gets exactly one bounded structured-repair retry
(`MAX_REPAIR_ATTEMPTS = 1`) with the failure reason and the contract restated
to the model; a second failure is a typed HTTP 502, never a 200 with
unverified content. This is the one **intentional** behaviour change the
milestone calls for — a request that used to silently succeed with `{ raw:
<unparseable text> }` now fails loudly and is logged as `rejected`.

**What M15-5 built.** `lib/ai-capabilities/model-config.ts`: `modelFor()` and
`maxTokensFor()`, three levels (per-capability override, `AI_MODEL_DEFAULT`
env, `DEFAULT_MODEL`). Every capability currently resolves to the exact model
and token ceiling it resolved to before this pass — `CAPABILITY_MODELS` is
empty on purpose, so the restructure alone changes no capability's model. The
moderation classifier's `claude-haiku-4-5-20251001` literal is deliberately
**not** moved here — it is part of the M15-2 KEEP security spine, pinned by
`tests/ai-personalisation.test.mjs`, and moving it would make a safety-critical
model swappable by an environment variable.

**What M15-6 built.** `supabase/migrations/028_ai_invocations.sql` (written,
**not applied to any database**) creates `ai_invocations` — capability, prompt
version, schema version, model, `input_hash`/`prompt_hash`/`output_hash`
(sha256, canonical-JSON, full input rather than `ai_history`'s 300-char
prefix), outcome, moderation verdict, latency, tokens, rejection reason, repair
count. `ai_history` is retained untouched, unmigrated, as declared-class
history (S.5, H.6) — the migration's own verification block fails loudly if it
is ever dropped. `route.ts` no longer writes `ai_history` anywhere; every
terminal outcome (`succeeded`, `repaired`, `rejected`, `off_topic`, `failed`)
writes one `ai_invocations` row via `buildInvocationRow()`
(`lib/ai-capabilities/invocations.ts`), non-blocking, exactly as `ai_history`
writes were before.

**What M15-7 built.** `lib/tools-registry.ts`'s `AI_CAPABILITIES` — the
de-duplicated, sorted union of every tool's declared `ai_capabilities` — is now
the allowlist `capabilityFor()`/`isCapability()` read. A `Record` key cannot
occur twice, so the pre-restructure `validTools` array's `marks_obituary`
duplicate is not merely fixed but structurally unrepresentable going forward.

**Nothing was committed and no migration was applied.** `supabase/migrations/
028_ai_invocations.sql` exists on disk only; `scripts/_m15/`'s broken scratch
fragments (`frag-*.ts` and the rest — draft workspace from the interrupted run,
never part of the real source tree) were deleted once their content had been
cross-checked against the mechanical re-extraction above.

---

## M16 — Settings and Legal · **P2** — **M16-1/2 COMPLETE, M16-3 SHIPS WITH M17 (2026-08-18, uncommitted)**

**Scope.** `PRODUCT_DECISIONS` §2.4 merge map and §3 V1 scope. The architecture
does not specify these surfaces beyond the merge map — they are table stakes, not
architecture.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M16-1** | `/settings` absorbing `/dashboard/profile` and `personalise`; 301 | L | One profile editor |
| **M16-2** | `/legal` — one route, four sections; 301 the four | M | Nothing 404s |
| **M16-3** | Parent access controls surfaced in `/settings` | M | Depends on M17's policy model; ships with it |

**M16-1.** `/settings` (`app/settings/{layout,page}.tsx`) absorbs
`/dashboard/profile` and `/tools/personalise` into one editor with four
sections — Profile, Study profile, Appearance, Sharing & parent access —
switched with the same `?section=`-on-mount pattern `/capture`, `/diagnosis`
and `/record` already use. The shell is the Console shell those three and
`/home` share (`AuthGuard` + `VitalityShell` + `console.css`), imported rather
than reinvented, per the same "structural consolidation, not a redesign"
reasoning M3/M8/M13 recorded for their own shell merges. Both source pages'
controls carry over with their state logic and tokens UNCHANGED, extracted
into `components/settings/profile-fields.tsx` and
`components/settings/appearance-fields.tsx` — zero behavioural rewrite, only
the outer chrome moved. `/dashboard/profile` and `/tools/personalise` both 301
to `/settings` in `next.config.mjs`; `/settings` was added to
`PROTECTED_PREFIXES` in `lib/auth-routes.ts` (it renders the same
student-specific data both source routes did). Live links updated:
`app/home/page.tsx`'s Settings control, `components/app-nav.tsx`'s account
chip (link + active-state check), `components/command-palette.tsx`'s two
palette entries. Neither source page file was gutted (M8's precedent).

**M16-2.** `/legal` (`app/legal/{layout,page}.tsx`) is one route with four
sections — Privacy, Terms, Data & Compliance, IP — switched the same way.
Deliberately NOT the Console shell: `/legal` is one of the three V1 routes
(with `/auth`, `/onboard`) that must answer a signed-out reader, so it keeps
the plain editorial chrome its four source pages already used and stays in
`PUBLIC_ROUTES`. The four policies' prose is carried verbatim into
`components/legal/sections.tsx` — no word changed, only the shared
heading/paragraph/table helpers deduplicated (each source file declared an
identical copy). All four `/legal/*` routes 301 into the matching section
(`/legal/privacy` → `/legal?section=privacy`, etc.) rather than always landing
on Privacy. Live links updated: `app/page.tsx`'s colophon, `app/pricing/page.tsx`
(two links), `app/faq/page.tsx`. None of the four source page files was
gutted.

**M16-3 — decision, per the task's own instruction to choose and document
rather than build ahead of M17.** No stub was added and no section was
omitted. `SharePanel` (`components/settings/share-panel.tsx`) — the control
that mints a student's `parentCode`, sets `parentEmail` and turns the weekly
parent digest on — already existed, extracted from the retired dashboard by
M3-3 specifically because Settings is its §2.2 home ("profile, subjects,
board, plan, parent access"). M16-1 carries it into `/settings`'s Sharing
section unchanged, alongside `ExamSchedule` and `PushOptIn`. This satisfies
the row's done-when ("parent access controls surfaced in `/settings`") without
inventing anything: the control is real, functional, and already does exactly
what it claims. What it does NOT do — and what M16 deliberately does not
attempt — is M17's structural rebuild: `PRODUCT_DECISIONS` §9.2's privacy
model, M17-1's removal of the unauthenticated `parentCode` path, and M17-3's
independent share categories all depend on data-model and policy work that
does not exist yet (M17 is the next milestone). Carrying forward a working
mechanism that will later be rebuilt is not the same defect as shipping a
non-functional one; `PRODUCT_PRINCIPLES`' rule is against a control that does
nothing, not against a control that will be superseded.

**Verification basis:** working tree, uncommitted · `npx tsc --noEmit` exit 0
· `npx next build` exit 0 (all 9 new/changed routes present in the route
manifest: `/settings`, `/legal`, plus the five 301 sources) · `node --test
tests/*.test.mjs` — **1610 pass, 0 fail**, 225 suites (1592 before this pass;
+18 in the new `tests/settings-legal.test.mjs`, following
`tests/record.test.mjs`'s structural-fence convention). One pre-existing test
had to be updated rather than left stale:
`tests/student-context.test.mjs`'s landing-page assertion expected the literal
`href="/legal/terms"`; the M16-2 redirect target is `/legal?section=terms`, so
the live link and the test were both updated together. No migration was
required — `/settings` and `/legal` read and write through tables M0–M15
already created (`user_data` via `lib/user-data.ts`); no `.sql` file was
written. `git status` was not run (this working tree is not a git
repository), but the file set touched is exactly: created —
`app/settings/{layout,page}.tsx`, `app/legal/{layout,page}.tsx`,
`components/settings/{profile-fields,appearance-fields}.tsx`,
`components/legal/sections.tsx`, `tests/settings-legal.test.mjs`; edited —
`next.config.mjs` (5 redirects added), `lib/auth-routes.ts` (`/settings` added
to `PROTECTED_PREFIXES`), `app/home/page.tsx`, `app/page.tsx`,
`app/pricing/page.tsx`, `app/faq/page.tsx`, `components/app-nav.tsx`,
`components/command-palette.tsx`, `tests/student-context.test.mjs`. No M0–M15
file was touched beyond that live-link wiring, and no destructive or
`--no-verify` git operation was run (none was run at all).

**A pre-existing gap noted, not fixed — out of M16's scope.**
`lib/auth-routes.ts`'s `PROTECTED_PREFIXES` does not name `/record`,
`/diagnosis` or `/capture` (M13-3, M13-1 and M8-1's routes respectively); they
render student data but rely only on client-side `AuthGuard`, not the edge
allowlist. `/settings` was added correctly for this milestone's own new route,
but the three earlier gaps were left as found, per the instruction not to
touch M0–M15 files beyond what M16 strictly requires.

---

## M17 — Parent Space · **P2** (its P1 removals already shipped in M0) — **COMPLETE, ALL SIX SUBTASKS (2026-08-18, uncommitted; `029` NOT applied to any database)**

**Scope.** Implementation Order step 15; **Part N** in full; Part S.7; Part W rows
*Parent identity* (**REBUILD**, P2) and *Parent digest* (**ADAPT**, P1 — done in
M0). Implements ratified decision `PRODUCT_DECISIONS` §9.2 (Option B).

**Dependency rationale.** *"Requires 8 + 9 for content"* — i.e. M12 + M14.

| ID | Task | Verdict | Effort | Done when |
|---|---|---|---|---|
| **M17-1** | Parent identity, invitation, revocation | **REBUILD** | XL | The unauthenticated `parentCode` path is gone |
| **M17-2** | A **separate parent projection** with no column containing mistake evidence | **REBUILD** | XL | V.8.3 — *"Not filtered — absent."* This is §9.2 Option B implemented structurally |
| **M17-3** | Independent share categories, all `Shared` categories OFF by default | **CREATE** | L | V.8.1, V.8.2, V.8.4 — at **every** setting, no topic name, miss count, wrong answer or evidence image is reachable |
| **M17-4** | Reports stamped with `policy_version`; send paths read the projection | **ADAPT** | L | V.8.5 — an old report still shows what it showed |
| **M17-5** | Immediate revocation, no cache TTL; per-read access log | **CREATE** | L | V.8.6, V.8.7 |
| **M17-6** | No parent write path exists | — | S | V.8.8 |

**This milestone resumed after a connection drop.** The prior pass had already
built the entire structural core correctly; this pass's job was verification
from scratch, not reconstruction. Nothing in the working tree was trusted
without independently reading it and, where the ground rules allow, exercising
it — per this build's standing "clean-looking states can hide broken work"
discipline.

**M17-1 — parent identity, invitation, revocation.** `app/api/parent/[code]/route.ts`
and `app/parent/[code]/page.tsx` are deleted (confirmed via `git status`: both
`D`). Replaced by a real `auth.users`-backed identity model in
`supabase/migrations/029_parent_space.sql`: `parent_invitations` (single-use,
SHA-256-hashed token, 72h expiry, one pending invite per student/email),
`parent_connections` (one active connection per student/parent pair, a
`CHECK` forbidding self-connection), and five `SECURITY DEFINER` functions
(`create_parent_invitation`, `accept_parent_invitation`,
`cancel_parent_invitation`, `revoke_parent_connection`,
`set_parent_share_policy`) that resolve identity exclusively from `auth.uid()`
— never from a caller-supplied argument, so no route can forge who it is
acting as. `app/api/parent/{invite,accept,invitations,connections}` and
`connections/[id]/revoke` wrap these; `app/parent/accept/page.tsx` is the
parent-side acceptance UI. Verified structurally (every write-path function
checked for `SECURITY DEFINER` + `auth.uid()` in `tests/parent-space.test.mjs`)
and, where credentials exist, behaviourally (`tests/parent-space-rls.test.mjs`
mints a throwaway student and parent, invites, accepts, and asserts the
resulting connection is `active`).

**M17-2 — the separate parent projection.** `get_parent_projection(p_student_id)`
is the only function that can produce a parent-facing payload, and it is
built exclusively from five views (`parent_score_view`, `parent_subject_view`,
`parent_progress_view`, `parent_consistency_view`, `parent_assessment_view`,
plus a conditional `parent_exams_view`) whose `SELECT` lists never name a
`Private` column — not `occurrences`, not `evidence`, not `patterns.label`,
not `academic_record.concept_ref`, not `student_answer`/`marks_lost`/
`marker_note`. `tests/parent-space.test.mjs` proves this by reading the
migration as text (comments and `COMMENT ON` string literals stripped) and
asserting eleven forbidden tokens are **absent**, not filtered — the same
"reject not degrade" proof style M11 used for cognitive/execution-error
separation. `lib/parent-space.ts`'s `ParentProjection` TypeScript type is the
matching closed shape: no `weakTopics`, no `occurrences` field exists on the
type for a future edit to accidentally populate.

**M17-3 — independent share categories, default OFF.** `parent_share_policies`
has exactly the seven categories architecture N.4 names
(`score_trajectory`, `dimension_breakdown`, `subject_state`,
`progress_fixing`, `consistency`, `upcoming_exams`, `assessment_activity`),
every one `NOT NULL DEFAULT FALSE`, plus `digest_enabled` (a delivery
preference, not an eighth category). N.4.a's two banned categories — "weak
areas" and "assessment outcomes" — have no column to be added: verified by
`tests/parent-space.test.mjs` asserting `weak_areas`/`weak_topics`/
`assessment_outcomes`/`mistake_summary` are absent from the table definition.
Policy changes are append-only (`version` PK component, `is_current` flag),
never an `UPDATE`, via `set_parent_share_policy()`. `components/settings/share-panel.tsx`
is fully rewired to this model (`/api/parent/{invite,connections,invitations,
access-log,policy}`) — it no longer references `patchUserData(userId,
"parentCode", …)` anywhere; that assertion in `tests/home-shell.test.mjs` was
stale (see "what was fixed" below) and now asserts the new
`/api/parent/invite` call site instead. `SharePanel` is mounted from both
`/settings` (M16-1) and `/dashboard/profile`, so both surfaces got the rebuild
for free.

**M17-4 — `policy_version` stamping; reports read the projection.**
`get_parent_projection()` stamps `system.policyVersion`/`policyUpdatedAt` from
the current `parent_share_policies` row on every call; because policy changes
are append-only, an old report's stamped version keeps meaning exactly what
it meant when the report was generated, even after later toggles. `lib/parent-digest.ts`
was rebuilt onto `ParentProjection` (no more `weakTopics` block, no more
streak/inactivity banner — both were live §3.4 breaches per
`STUDYLEDGER_SYSTEM_ARCHITECTURE.md` N.2), and `app/api/send-parent-digest/route.ts`
and `app/api/parent/report/route.ts` read only through
`buildParentProjectionForDelivery()`/`get_parent_projection()` — neither
touches `user_data.blob` or raw academic tables. `lib/sync.ts`'s header
comment, which listed `app/api/parent/[code]` and `app/api/send-parent-digest`
among `user_data.blob`'s six live readers, was stale after this rebuild (the
first route is deleted, the second no longer reads the blob at all) and was
corrected to four readers with a note explaining the removal — the only
edit made to an M0–M16 file beyond the settings/digest/report wiring the task
explicitly authorised.
**`app/api/send-report/route.ts` was investigated and deliberately left
untouched.** Despite the name, it is not a parent-facing surface: its
recipient is resolved from the account's own email (`targetUser.user.email`),
never a parent's, and its own file-scope note in this document
(line ~2214, from the M0 pass) already places it "outside the M0-6 file
scope" for streak removal. It is the student's self-addressed weekly report,
governed by `emailEnabled`, not by `PRODUCT_DECISIONS` §9.2 or architecture
Part N — a student is entitled to see their own weak topics and streak;
routing it through the parent projection would be a category error, not a
fix. Its pre-existing weak-topics/streak content is real, tracked residue
(same family as the M0 "known residue" note) that belongs to whichever
milestone rebuilds student-facing streak surfaces (M14-2 territory), not M17.

**M17-5 — immediate revocation, no TTL; per-read access log.**
`revoke_parent_connection()` sets `state = 'revoked'` synchronously, and
`get_parent_projection()` re-checks `state = 'active'` on every single call —
there is no cache or TTL between the write and the next read failing.
`parent_access_log` is append-only for everyone including the service role
(a `BEFORE UPDATE OR DELETE` trigger raises on any attempt, and
`UPDATE`/`DELETE` are `REVOKE`d from every role); every call to
`get_parent_projection()` inserts a row naming exactly which categories were
returned. `app/api/parent/access-log/route.ts` and the "Who has looked, and
when" panel in `SharePanel` surface it to the student. Proved both
structurally (trigger + `REVOKE` present in the migration text) and, with
credentials, behaviourally: `tests/parent-space-rls.test.mjs` revokes a live
connection and asserts the *very next* read fails, and separately asserts a
prior read left a log row the student's own session can query.

**M17-6 — no parent write path.** Every one of the four parent-space tables
has `SELECT`-only RLS policies (verified by a `DO $$` block inside
`029_parent_space.sql` itself, which raises if it finds a non-`SELECT`
policy on any of them); all mutation goes through the five `SECURITY DEFINER`
functions in M17-1, none of which lets a parent-authenticated caller touch an
academic table. `tests/parent-space-rls.test.mjs` additionally asserts a
parent session's direct `UPDATE` against `parent_share_policies` is rejected.

**What was fixed in this pass — two stale pre-existing tests, not new
defects.** Both had been written against the pre-M17 shape and would have
false-failed against the correct rebuilt code:

1. `tests/m0-integrity-fences.test.mjs`'s "the parent projection does not
   select the streak/focus column" test read `029_parent_space.sql`'s raw
   text without stripping SQL `--` comments or `COMMENT ON … IS '…'` string
   literals — the file's own documentary prose ("No streak column — banned
   outright") tripped a bare `/\bstreak\b/` check. Fixed by stripping both
   forms before asserting; the underlying claim (no functional streak/focus
   reference) was and remains true.
2. `tests/home-shell.test.mjs`'s "the capabilities that only the dashboard
   hosted survive" test asserted `share-panel.tsx` still contained
   `patchUserData(userId, "parentCode"` — the exact mechanism M17-1 requires
   gone. Updated to assert the new mechanism is present
   (`/api/parent/invite`) *and* the old one is truly absent, not merely
   unasserted. The same file's `ALLOWED` set for "no second score-computing
   surface" still named the deleted `app/parent/[code]/page.tsx`; replaced
   with a comment explaining `app/parent/page.tsx` needs no entry because it
   renders a server-computed projection and never calls
   `computeScoreFromInputs`/`computeLedgerScore` itself.

**Scratch artifact cleaned up.** `.test-build-parent-space/` was compiled-JS
output from `tests/parent-space.test.mjs`'s own `before()` hook (which
`tsc`-compiles `lib/parent-space.ts`/`lib/parent-digest.ts` there to run them
under `node:test`) — not tracked source, exactly like the twenty-odd sibling
`.test-build-*` directories every other milestone's test suite already
produces. It was missing from `.gitignore` (the only one of that family that
was); added, and the directory removed from the working tree.

**Verification basis:** working tree, uncommitted · `npx tsc --noEmit` exit 0
· `npx next build` exit 0 — all nine new parent routes present in the route
manifest (`/api/parent/{accept,access-log,connections,connections/[id]/revoke,
invitations,invite,policy,report}`, `/parent`, `/parent/accept`), the old
`/parent/[code]` and `/api/parent/[code]` absent · `node --test
tests/*.test.mjs` — **1643 pass, 0 fail, 230 suites** (1610 pass / 225 suites
before this pass; +33 net: `tests/parent-space.test.mjs` and
`tests/parent-space-rls.test.mjs` new, `tests/m0-integrity-fences.test.mjs`
and `tests/home-shell.test.mjs` each had one assertion corrected, not
weakened). One transient `fetch failed` was observed on a single run of the
unrelated live-DB suite `tests/mistakes-rls.test.mjs` (network blip against
Supabase, not a code defect); a clean immediate re-run passed with 0 fail,
confirmed twice more after the test-file edits and once more after the final
`lib/sync.ts` comment fix. Every V.8.x acceptance test is covered by a real,
named test: V.8.1/V.8.2 (`parent_share_policies` defaults, both structurally
and against a live-created connection), V.8.3 (structural token-absence proof
across the migration and every parent-facing route/page), V.8.4 (category
gating — turning on one category surfaces only that key, live-verified),
V.8.5 (`policy_version` stamped and asserted in the email/HTML output),
V.8.6 (immediate revocation, live-verified: the next read after revoke
fails), V.8.7 (access log row asserted present, live-verified, student-readable),
V.8.8 (parent write rejected, both by RLS-policy-shape assertion and a live
`UPDATE` attempt). `supabase/migrations/029_parent_space.sql` is written,
checksummed, and registers itself via `supabase_migrations.record_migration`
on application — **it was not applied to any database by this pass**; the
live-DB half of the test suite (`tests/parent-space-rls.test.mjs`) confirms
this itself, distinguishing "no credentials" from "credentials present but
`029` not yet applied" and skipping with a labelled reason either way rather
than failing. No `git add` or `git commit` was run. `git status` confirms the
file set is exactly: deleted — `app/api/parent/[code]/route.ts`,
`app/parent/[code]/page.tsx`; created — `supabase/migrations/029_parent_space.sql`,
`lib/parent-space.ts`, `lib/parent-space-server.ts`,
`lib/parent-projection-server.ts`, `app/api/parent/{accept,access-log,
connections,invitations,invite,policy,report}/route.ts`,
`app/api/parent/connections/[id]/revoke/route.ts`, `app/parent/page.tsx`,
`app/parent/accept/page.tsx`, `tests/parent-space.test.mjs`,
`tests/parent-space-rls.test.mjs`, `tests/tsconfig.parent-space.json`; edited
— `lib/parent-digest.ts`, `app/api/send-parent-digest/route.ts`,
`components/settings/share-panel.tsx` (already wired by the prior pass),
`lib/sync.ts` (one stale comment, this pass), `.gitignore` (one line, this
pass), `tests/m0-integrity-fences.test.mjs` and `tests/home-shell.test.mjs`
(one assertion each, this pass). No M0–M16 file was touched beyond that set.

---

## M18 — Data ownership · **P2** — **COMPLETE, ALL FIVE SUBTASKS (2026-08-18, uncommitted; `030` NOT applied to any database)**

**Scope.** Implementation Order step 16; **Part O**; Part W row *Data ownership*
(**CREATE**, P2). `AuditEntry` already exists from M7-4.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M18-1** | Export: L1, L3, L5, the L2 derivation manifest, dispute markers, audit trail | L | V.10.7 |
| **M18-2** | Correction and dispute: append and supersede, never edit in place | XL | V.10.1–V.10.5 — a disputed attempt is excluded **in both directions**; no UPDATE path exists |
| **M18-3** | Replay-from-checkpoint on correction; snapshots carry `restatement_of` | L | V.6.9, V.10.2. T8 mitigation |
| **M18-4** | Deletion: binaries destroyed, `content_hash` tombstones retained | L | V.10.6 — occurrences stay valid |
| **M18-5** | Account deletion; parent connections revoke; reports invalidate | M | V.10.8 |

**Reuse verdict, read first.** Per the milestone's own header note
("`AuditEntry` already exists from M7-4") this pass audited every adjacent
subsystem before writing anything, and reused rather than duplicated three of
them: `lib/audit.ts`/`writeAuditEntry` (M7-4, unmodified) is the only writer
of `audit_entries` anywhere in M18; `lib/assessment-revocation.ts`'s
`buildRevocation`/`supersedingEventDraft`/`withdrawalPatch` (M10-6) is called
directly for F.8 row 1 (question-wrong) corrections rather than re-implemented;
`lib/score-engine.ts`'s `buildScoreSnapshot`/`computeLedgerScore` (M14) is the
unmodified computation core of the M18-3 recompute. No M0–M17 file's
*behaviour* changed — the two files edited (`lib/occurrences.ts`,
`lib/jobs.ts`) each gained one additive, backward-compatible field/case.

**M18-1 — export.** `lib/data-export.ts` assembles the O.1 bundle: `l1`
(`academic_events`, `evidence`, `assessment_attempts`,
`assessment_question_revocations`, `occurrences`, `correction_requests`,
`assessment_attempt_disputes`, `audit_entries` — all student-scoped, all read
live), `l3` (every `score_history` row, unmodified, carrying
`formula_version`/`confidence`/`input_watermark_event_id`/`restatement_of`
exactly as stored), `l5` (best-effort current profile fields, with an
explicit `manifest.l5.note` stating no dedicated preferences/layout table
exists yet — M22/M24 — rather than silently presenting an incomplete L5 as
complete). **L2 is excluded from the body** (H.2); `manifest.l2_derivation`
states the derivation rule for `patterns`, `academic_record` and score
recomputation instead, so a third party can reproduce it. Async per O.1: a
new `jobs.type = 'data-export'` (additive case in `lib/jobs.ts`'s closed
union) dispatches to `app/api/account/export/run/route.ts`
(`isInternalCaller`-gated, same as every other job dispatch target), which
uploads the bundle to a new private `exports` storage bucket
(`<student_id>/<ts>.json`, no public URL — same posture as `019`'s `evidence`
bucket) and every run appends an `export` `AuditEntry`.
`app/api/account/export/route.ts` is the student-facing enqueue endpoint.

**M18-2 — correction and dispute.** `lib/correction.ts` (pure) is O.3's
classifier: `classifyOutcome(targetType, claimKind)` returns exactly one of
`auto_accepted` (student-declared target, O.2), `accepted_mechanical`
(verified target, mechanically checkable claim) or `disputed` (verified
target, judgement claim) — enforced redundantly by a CHECK in
`030_data_ownership.sql`'s `correction_requests` table
(`correction_requests_declaration_autoaccepts`) so the TS classifier and the
schema cannot silently disagree about which targets may self-accept.
`lib/correction-server.ts` wires the four target types
(`question`/`assessment_attempt`/`occurrence`/`declaration`) to their append:
question corrections reuse M10-6's revocation path outright; attempt
corrections append a NEW `assessment_attempts` row (`attempt_no + 1`,
`is_correct = true`) — never an `.update()`, asserted structurally in
`tests/data-ownership.test.mjs`; declaration corrections append an
`EVENT_SUPERSEDED` event; occurrence-misclassification corrections append a
superseding `occurrences` row via `occurrences.supersedes` (a column since
M1/007, first write in this pass — `lib/occurrences.ts`'s
`DraftOccurrenceInput` gained one additive optional field, `supersedes`).
**A disputed correction opens `assessment_attempt_disputes`, status `open`**
— a NEW table, append-only by the same three-layer discipline `016`/`024`
established (policy omission + `REVOKE` + a `BEFORE UPDATE OR DELETE`
trigger that refuses everything except the one forward `open → {upheld,
stood_down}` move, which this pass writes no path to reach — O.3.b reserves
adjudication for a human/curation process this milestone does not build).
**A recorded, explicit scope decision** (stated in
`lib/correction-server.ts`'s header): F.8 row 2's "the occurrence created
from it is superseded" cannot be a literal same-shape superseding occurrence
row for an attempt corrected to `is_correct = true`, because `007`'s
`occurrences_has_error` CHECK requires a classified error and a corrected
answer has none; the superseded occurrence's id is instead recorded on the
`correction_requests` audit entry so the record and export both show it
stopped being evidence, and why — rather than fabricating a row to satisfy
the word.

**V.10.1 — bidirectional exclusion, structural, not a filter.** A NEW view,
`assessment_score_eligible_questions` (030), is `unrevoked_assessment_questions`
(024) minus any question with an OPEN dispute; `lib/score-recompute-server.ts`
(M18-3's I/O layer) reads this view — not 024's own — so a disputed attempt is
excluded from the score computation itself, not filtered from a result set
afterward. The same view underlies `assessment_attempt_full_state`, which
layers `disputed`/`evidence_state ∈ {evidence, evidence_revoked, disputed}`
onto 024's `assessment_attempt_evidence` without editing that file (024 is
ledger-registered with its own checksum).

**V.10.5 — no UPDATE path, verified both ways.** 024's own append-only
trigger/`REVOKE` on `assessment_attempts` is untouched (asserted in
`tests/data-ownership.test.mjs`, which also re-confirms 024's guard is
present so 030 cannot claim additivity while having silently broken it), and
a second assertion greps `lib/correction-server.ts`'s own source for
`.from("assessment_attempts").update(` and asserts it is **absent** — the
only write M18 performs against that table is `.insert()`.

**M18-3 — replay-from-checkpoint, `restatement_of`.** `lib/restatement.ts`
adds `decideCorrectionRestatement()` beside (not instead of)
`lib/score-engine.ts`'s existing `decideRestatement()` — a DIFFERENT decision
for a DIFFERENT cause: a correction restates even when `formula_version` is
unchanged (O.4.a's three-months-old dispute has no formula change in the
story at all), where the formula-version restatement would suppress it.
`lib/score-recompute-server.ts` re-runs the same pure M14 computation
(`loadScoreInputs` → `computeLedgerScore` → `buildScoreSnapshot`) for one
student, synchronously, on every accepted correction and every newly-opened
dispute (V.10.1's exclusion takes effect immediately, not on the next daily
close), forced to carry the correction's `RestatementDecision`. Every
recompute is followed by a `score_restatement` `AuditEntry`
(`lib/correction-server.ts`'s `restateFor`).

**M18-4 — deletion, binaries destroyed, tombstones retained.** `evidence`
gained two additive nullable columns (`binary_deleted_at`,
`binary_deleted_reason`, both-or-neither CHECK, same discipline as `027`'s
`restatement_of`/`_reason`) and a `BEFORE UPDATE OR DELETE` trigger
(`evidence_tombstone_forward_only`) that refuses the DELETE outright and
permits only that one field to move, once. **The row is never deleted** —
`007`'s existing `occurrences.evidence_id ... ON DELETE RESTRICT` already
makes it structurally impossible while any occurrence references it, and
this pass does not work around that (verified: `007`'s RESTRICT clause is
unchanged, asserted in the test file). `lib/evidence-deletion.ts` removes the
Storage object at `storage_ref`, then sets the tombstone columns — never
touches `occurrences`, never issues a `.delete()` against `evidence`
(asserted structurally). `app/api/evidence/delete/route.ts` is the endpoint.

**M18-5 — account deletion.** `lib/account-deletion.ts`: (1) writes the
`deletion` `AuditEntry` **before** calling
`supabaseServer.auth.admin.deleteUser()` (order asserted in the test file);
(2) calls a new `revoke_all_parent_connections_for_deletion(student_id)`
SQL function (030) that revokes every active `parent_connections` row in one
statement, reusing `029`'s own `state='revoked'`/`revoked_by` shape rather
than inventing a second one; (3) explicitly removes every evidence Storage
object (the auth.users cascade reaches every FK'd row but has no knowledge of
Storage objects, which carry none); (4) deletes the `auth.users` row via the
Supabase admin API, which cascades through every `ON DELETE CASCADE` FK this
repository has written since `007`. **The one deliberate exception is
`audit_entries.student_id`, `ON DELETE SET NULL` since `016`** — O.5's
"minimal, non-academic tombstone" was built into the schema on the day audit
entries shipped, not added by this pass; M18-5's job was writing the entry
and confirming the asymmetry, both verified in the test file. "Reports
invalidate" reuses `029 §7`'s existing immediate, no-cache-TTL connection
check (`get_parent_projection` re-verifies `state = 'active'` on every call)
— there is no separate stored `ParentReport` row to invalidate, because `029`
never persisted one; revoking the connection structurally invalidates every
report that would ever have been generated from it.

**Verification basis:** working tree, uncommitted · `npx tsc --noEmit` exit 0
· `npx next build` exit 0 — six new routes present in the route manifest
(`/api/corrections`, `/api/account/export`, `/api/account/export/run`,
`/api/account/delete`, `/api/evidence/delete`) · `node --test
tests/*.test.mjs` — **1683 pass, 0 fail, 240 suites** (1643 pass / 230 suites
before this pass; +40 net, all in the new `tests/data-ownership.test.mjs`,
zero pre-existing tests touched or weakened). Every V.10.x acceptance test
has a named, real test: V.10.1 (bidirectional exclusion — the
`assessment_score_eligible_questions` view definition and its dispute-join
asserted structurally), V.10.2/V.6.9 (`decideCorrectionRestatement` behaviour
— always restates with a prior snapshot, never reads `formula_version`),
V.10.3 (`buildDispute` can only construct `status: "open"`, asserted both
behaviourally and by grepping the module's own vocabulary for the absence of
`"upheld"`/`"stood_down"` as a construction target), V.10.4 (declaration
correction produces an `EVENT_SUPERSEDED` draft naming what it supersedes),
V.10.5 (no UPDATE path — 024's guard intact, `correction-server.ts` never
calls `.update()` on `assessment_attempts`), V.10.6 (evidence deletion never
touches `occurrences`, never `.delete()`s `evidence`, `007`'s RESTRICT
intact), V.10.7 (export reads every named L1/L3 table plus disputes and the
audit trail, L2 named-not-shipped), V.10.8 (deletion audit-then-erase
ordering, bulk parent revoke RPC call, `016`'s `SET NULL` tombstone
mechanism). `supabase/migrations/030_data_ownership.sql` is written,
self-checksummed, self-verifying (a `DO $$` block at its own foot that raises
if any expected trigger/view/policy-shape is missing) and registers via
`supabase_migrations.record_migration` — **it was not applied to any
database**, exactly like every migration since `015`. No `git add` or `git
commit` was run. File set: created —
`supabase/migrations/030_data_ownership.sql`, `lib/correction.ts`,
`lib/correction-server.ts`, `lib/restatement.ts`,
`lib/score-recompute-server.ts`, `lib/evidence-deletion.ts`,
`lib/account-deletion.ts`, `lib/data-export.ts`,
`app/api/corrections/route.ts`, `app/api/account/export/route.ts`,
`app/api/account/export/run/route.ts`, `app/api/account/delete/route.ts`,
`app/api/evidence/delete/route.ts`, `tests/data-ownership.test.mjs`,
`tests/tsconfig.data-ownership.json`; edited — `lib/occurrences.ts` (one
additive optional field, `supersedes`), `lib/jobs.ts` (one additive
`JobType` case, `data-export`), `.gitignore` (one line,
`.test-build-data-ownership`). No M0–M17 file's behaviour changed and no file
outside this set was touched.

**What this pass did not build, by explicit scope decision.** No UI in
`/settings` for export/correction/deletion flows — the ground rules' "if any
UI is needed" is conditional, and every V.10.x acceptance test is satisfiable
against the API layer alone; wiring a settings panel onto these endpoints is
presentation work with no open product-integrity question behind it, left
for a design pass rather than built ad hoc without one. No dispute
adjudication UI/endpoint (O.3.b's human/curation process — the schema holds
`upheld`/`stood_down` but nothing in this codebase can reach them yet, flagged
in `030`'s own "what this migration deliberately does not do"). No persisted
`ParentReport` table (029 never built one; M18-5 reuses its live-check
mechanism rather than inventing a second artifact to invalidate).

---

## M19 — Personal model · **P2** — **COMPLETE, ALL FOUR SUBTASKS (2026-08-18, uncommitted; `031` NOT applied to any database)**

**Scope.** Implementation Order step 11; **Part I**; Part W row *Personal model*
(**REBUILD**, P2).

**Dependency rationale.** Requires M7; *"meaningfully useful only after 6"* —
assessment gives it outcomes to learn from (M10). Both complete.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M19-1** | Typed, bounded dimensions; signal extraction; aggregation | XL | I.2 — the list is bounded, not open |
| **M19-2** | The two-column explicit-over-inferred override, enforced by **column-level grant** | L | V.5.2–V.5.4 — the aggregator is refused by the database, not by policy |
| **M19-3** | Confidence, decay, floor, and disclosure of fallback | L | V.5.6, V.5.7 — the fallback is stated, never silent |
| **M19-4** | `explicit_value` restored exactly by L1 replay | M | V.5.5 |

**M19-1 — bounded dimensions, extraction, aggregation.** `lib/personal-model.ts`
(new, pure, no imports — same I/O-free discipline as `lib/mistakes/engine.ts`
and `lib/score-engine.ts`) is the whole of Part I as code:
`PERSONAL_MODEL_DIMENSIONS` transcribes I.2's nine-row table verbatim
(`explanation_style`, `communication_tone`, `question_format_mix`,
`difficulty_preference`, `session_length`, `working_window`,
`correction_method`, `notification_appetite`,
`recommendation_aggressiveness`) with no tenth admitted by
`isPersonalModelDimension`. `isValidValueForDimension` enforces I.2's
per-dimension TYPE column (enum / weights / minutes / hour-distribution), not
just the dimension name. One deterministic, versioned extractor per
dimension (`EXTRACTOR_VERSION`) reads only fields already required by
existing event types (`EXPLANATION_READ.payload.style/dwell_ms`,
`QUESTION_STARTED`/`ATTEMPTED`/`CORRECT`/`WRONG`, `PRACTICE_COMPLETED`,
`SESSION_VERIFIED`/`CLOSED_UNVERIFIED`, `MISTAKE_RESOLVED`,
`RECOMMENDATION_ACTED_ON`/`DISMISSED`) — I.4: "a signal must be derivable
from an event that already exists for an academic reason", so no new
telemetry is introduced. `aggregateDimension` turns a dimension's
`PersonalModelSignal[]` into `{inferred_value, confidence, evidence_count,
last_signal_at}`, weighting more recent signals more heavily (I.5's
"recency" input to confidence); categorical, scalar (`session_length`) and
vector-valued (`question_format_mix`, `working_window`) dimensions each take
the correct aggregation shape rather than one generic path forcing a
vector into a majority vote. **The bounded set is enforced in three places,
not one:** the TS `isPersonalModelDimension` check; a real Postgres `ENUM`
type (`031_personal_model.sql §1`, not a `TEXT` + `CHECK` — chosen precisely
because I.2 calls the set "bounded" and an enum is the stronger statement of
that claim than a widenable check); and a second ingest-layer refusal added
to `lib/event-contract.ts`'s `validateEventDraft` (`BAD_DIMENSION`), which
rejects an out-of-set `payload.dimension` on a `PREFERENCE_SET` event before
it ever reaches the database — mirroring the TS+SQL two-layer posture that
file already uses for `EVENT_TYPES`. `event-contract.ts` takes no imports
(its own header rule), so the set is inlined there as
`PERSONAL_MODEL_DIMENSION_SET` rather than imported; the test suite asserts
the two lists never drift.

**M19-2 — the column-level grant.** `031_personal_model.sql §5` creates
`personal_model_aggregator`, a Postgres role **strictly narrower than
`service_role`**, granted membership under Supabase's `authenticator` role
the same way `anon`/`authenticated`/`service_role` already are, and reached
in production only by a JWT whose `role` claim names it — a credential held
exclusively by the aggregator job, never by `app/api/**`. Every grant on
`public.personal_model` is preceded by `REVOKE ALL ... FROM
personal_model_aggregator` (020/025's own precedent: "the REVOKE makes that
explicit before the narrow GRANT re-opens one column"), and the re-opened
columns are `inferred_value, confidence, evidence_count, last_signal_at,
input_watermark_event_id, input_watermark_seq` — **`explicit_value` and
`overridden_at` appear in neither the INSERT nor the UPDATE grant.** An
`UPDATE personal_model SET explicit_value = …` issued as
`personal_model_aggregator` fails with Postgres `42501
insufficient_privilege` before any row is touched — refused by the database,
not by an application check. `authenticated` (the student) gets the mirror
image: `UPDATE (explicit_value, overridden_at)` only, no grant at all on the
inferred-side columns, narrowed to the student's own row by
`personal_model_upsert_own`/`personal_model_update_own` RLS. `service_role`
keeps `explicit_value`/`overridden_at` write access because it is the role
the event-sourced `PREFERENCE_SET` projector actually runs as (I.6
mechanism 3) — the SAME posture 016 gives `service_role` on
`audit_entries` INSERT — and the aggregator, being a genuinely separate
role rather than "`service_role`, told nicely", is the reason restricting
one writer's grant never has to touch the other's. `effective_value` is a
`GENERATED ALWAYS AS (COALESCE(explicit_value, inferred_value)) STORED`
column (I.6 mechanism 2 — "there is no code path that computes the
effective value differently, because there is no code path that computes
it at all"), and `resolveEffectiveValue()` in `lib/personal-model.ts` is
its unit-testable TS-side preview, not a second implementation. A
belt-and-braces `BEFORE INSERT OR UPDATE` trigger
(`personal_model_explicit_is_sacred`, §6) raises an exception if
`current_user = 'personal_model_aggregator'` and either sacred column would
move — the same independent-second-mechanism discipline 020 §5 and 025 §7
already apply to `service_role` itself ("this stops the next endpoint
somebody writes" — here, the next GRANT).

**M19-3 — confidence, decay, floor, disclosure.** `decayedConfidence()`
implements I.5's formula verbatim — `confidence · 0.5^(days_since_last_signal
/ HALF_LIFE)` — computed at READ time only; no stored row is ever rewritten
to age it (proved: calling it twice at two different `nowMs` leaves the
stored `{confidence, last_signal_at}` inputs untouched). `CONFIDENCE_FLOOR =
0.15` and `CONFIDENCE_HALF_LIFE_DAYS = 30` are capacity guesses, labelled as
one, in the same posture 015's partition count and `RESOLUTION_COOLING_DAYS`
already take. `resolveEffectiveValue()` is where V.5.6/V.5.7 actually land:
below the floor, it returns `source: "default"` with a non-null `disclosure`
string naming the dimension and the decayed figure — **never** a silent
`inferred_value` once decay has passed the threshold. At or above the floor,
`disclosure` is `null` and the inferred value is used outright. No signal at
all yet is a third, distinct disclosed state ("no signal yet for … — using
the product default"), never conflated with the below-floor case.

**M19-4 — `explicit_value` restored exactly by L1 replay.** No new event
table: `PREFERENCE_SET` already exists as an `academic_events.event_type`
value (`015 §2`) with `payload: {dimension, value}` required
(`lib/event-contract.ts:REQUIRED_PAYLOAD_KEYS`), so M19-4 replays the SAME
stream M18's export/replay machinery already reads — no second mechanism was
built. `replayExplicitValues()` folds a student's ordered (by server `seq`,
never client `occurred_at` — R.10) `PREFERENCE_SET` history into the current
`explicit_value`/`overridden_at` per dimension: last write wins; `value:
null` is preserved as an intentional clear, not dropped (I.6 mechanism 4);
an out-of-set dimension in old L1 data is never replayed, so I.2's bound
holds even retroactively. Proved bit-exact against the architecture's own
V.5 scenario (steps 1–7, one continuous test) and against out-of-order input
(`seq` order wins over array position and over `received_at`).

**Reuse verdict.** No M0–M18 file's *behaviour* changed. `lib/event-contract.ts`
gained one additive `ValidationCode` (`BAD_DIMENSION`) and one additive
`PREFERENCE_SET`-specific check inside `validateEventDraft` — every existing
assertion in `tests/academic-events.test.mjs` and `tests/mistake-dna.test.mjs`
(which also compiles `event-contract.ts`) still passes unmodified. No new
event type, no new event table, no touch to `academic_events`,
`score_history`, `patterns`, or any M7–M18 migration file. `PREFERENCE_SET`'s
payload contract (`lib/event-contract.ts:358`) predates this pass (M7) and
was already exactly what M19-4's replay needed.

**Scope note — no UI built.** Part I specifies a backend inference pipeline
consumed by slot selection, prompt assembly and recommendation phrasing
(I.3's diagram) — M20 (Recommendations, not yet built) is its first real
consumer. No student-facing surface was added or changed in this pass, per
the milestone brief's own instruction not to invent UI the architecture does
not call for; `/settings`'s existing "Study profile" section (M16) was
checked and is unaffected.

**Not built in this pass (explicitly out of scope for M19's four subtasks).**
The server-side extraction/aggregation JOB itself (a cron or queue consumer
that calls `extractAllSignals`/`aggregateDimension` against a live database
and authenticates as `personal_model_aggregator`) and the `PREFERENCE_SET`
projector endpoint (the `service_role` write path from an ingested event to
`personal_model.explicit_value`) are both wiring, not one of the four
done-when criteria above, which are all provable in pure TypeScript plus the
migration's own SQL text. Building them is real work for whichever milestone
first needs a live personal model (M20) and is flagged here rather than
silently deferred.

**Verification basis:** working tree, uncommitted · `npx tsc --noEmit` exit 0
· `npx next build` exit 0, clean · `node --test tests/*.test.mjs` — **1713
passing, 0 failing, 246 suites** (baseline before this pass: 1683 passing,
240 suites; +30 tests / +6 suites, all new, all in
`tests/personal-model.test.mjs`) · every V.5.x/I.2 criterion has a named,
passing test: I.2 (six tests — bounded set, TS+SQL+ingest-layer agreement,
per-dimension type enforcement), V.5.2–V.5.4 (eight tests — GRANT-level
regex assertions against `031`'s actual REVOKE/GRANT statements, the
dedicated-role assertion, the belt-and-braces trigger, the generated-column
assertion), V.5.5 (four tests — replay ordering, clears, out-of-set
rejection, multi-dimension replay), V.5.6/V.5.7 (five tests — decay formula,
non-mutation, disclosed floor fallback, non-disclosed above-floor case,
no-signal-yet case), plus the architecture's own V.5 1–7 walkthrough as one
continuous test and six extraction/aggregation tests. Files changed: `lib/
personal-model.ts` (new), `lib/event-contract.ts` (additive), `supabase/
migrations/031_personal_model.sql` (new, NOT applied), `tests/
personal-model.test.mjs` (new), `tests/tsconfig.personal-model.json` (new),
`.gitignore` (+1 line, `.test-build-personal-model`). No file under M0–M18's
ownership was semantically changed.

---

## M20 — Recommendations · **P2** — **COMPLETE, ALL FOUR SUBTASKS (2026-08-18, uncommitted; `032` NOT applied to any database)**

**Scope.** Implementation Order step 12; **Part K**; Part W row *Recommendations*
(**REBUILD**, P2). `next-move.ts`'s unpayable promise was already deleted in M0-7.

**Dependency rationale.** *"Requires 7 + 8 + 9 + 11 — it reads almost everything."*

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M20-1** | Candidate generation, priority, decay | XL | K.1, K.2, K.7 |
| **M20-2** | Mandatory `evidence_refs`; a recommendation with none **cannot be inserted** | L | V.7.4 |
| **M20-3** | "Guide, never gate" enforced mechanically | L | K.3 — the next action cannot gate anything (V.11) |
| **M20-4** | Outcome tracking; escalation without shaming | L | K.5, K.6 |

**`next-move.ts` checked first, per the brief.** `lib/console/next-move.ts`
(M0-7) still exists and is unchanged by this pass — it is the OLD `/console`
shell's single-move derivation, kept working for that surface, and its own
header comment already documents the unpayable-promise deletion: the mistake
move "deliberately carries NO figure" because "no production action produces
[a `resolved` mistake state], so any number here would be a promise the
system cannot pay (Law 7)." M20 does not touch this file — it builds the NEW,
Part-K-specified Recommendation Engine (`lib/recommendations/*.ts`) as a
separate, evidence-gated system with its own table, and repeats the SAME
discipline `next-move.ts` already established: a benefit figure
(`expected_academic_benefit`) is attached to a candidate only when the
candidate can name the evidence proving it, never invented to fill a UI slot.

**M20-1 — candidate generation, priority, decay.**
`lib/recommendations/engine.ts` (new, pure, no imports — same I/O-free
discipline as `lib/mistakes/engine.ts`, `lib/score-engine.ts`,
`lib/personal-model.ts`) implements K.1's candidate-kind table as eleven
generator functions, one per row (`openPatternCandidates`,
`dueRetestCandidates`, `patternRecurredCandidates`,
`unverifiedSessionCandidates`, `coverageHoleCandidates`,
`subjectNoProvenConceptCandidates`, `conceptDecayingCandidates`,
`examWeakCoverageCandidates`, `dormantSessionCandidates`,
`personalModelConfirmCandidates`, `correctionRequestPendingCandidates`),
each taking only the slice of context it needs and returning `Candidate[]`
through the single `buildCandidate` chokepoint — K.1: "the engine unions
them; no subsystem ranks globally." `unionCandidates` flattens; `dedupeCandidates`
resolves any dedupe-key collision deterministically (higher
`expected_academic_benefit` wins, never array order). `computePriority`
implements K.2 verbatim — `expected_academic_benefit × urgency × fit −
fatigue` — with the double-weighting note honoured exactly as written:
mistake-DNA candidates carry `urgency: 0` because severity (`lib/mistake-
severity.ts`) already folds in exam proximity, and the formula treats a
zero urgency as urgency-*neutral* (multiplies by 1), never urgency-*zeroing*
(which would silently multiply the whole priority to zero). `computeFit`
reads Personal Model agreement, neutral (`0.6`) with no signal either way —
never assumed favourable or unfavourable. `computeFatigue` penalises
repeated dismissals/ignores of the *same kind* within a 30-day lookback,
capped at `0.5` so fatigue can only re-rank, never zero out, a high-benefit
candidate. K.7's decay is `EXPIRY_DAYS_BY_KIND` / `COOLING_DAYS_BY_KIND`,
one entry per kind (a "verify yesterday's session" prompt expires in 2 days;
"this pattern is open" persists 21) — `computeExpiresAt` and `isCoolingDown`
are the two pure functions that turn those tables into an actual
`expires_at` and a dedupe suppression window. K.8's next-best-action
(`selectNextBestAction`) is a single deterministic sort — priority desc,
then earliest `expires_at`, then lowest `surfaced_count`, then **original
array index** as the final, stable tie-break — proved not to shuffle across
20 repeated calls on a fully-tied fixture.

**M20-2 — mandatory `evidence_refs`, structurally refused at two independent
layers.** `buildCandidate` is the *only* legal way to construct a
`Candidate` — every generator calls it, none constructs the object literal
directly — and it throws `EvidenceRequiredError` if `evidenceRefs` is
missing, empty, or contains a ref with an empty `id`/`refKind`. That is the
TypeScript-side refusal, proved for all eleven generators against realistic
fixtures. The database-side refusal (`supabase/migrations/
032_recommendations.sql §2`) makes the same guarantee hold even if this
function is bypassed: `evidence_refs JSONB[] NOT NULL` plus `CONSTRAINT
recommendations_evidence_refs_nonempty CHECK (cardinality(evidence_refs) >=
1)` — **`cardinality()`, deliberately, not `array_length(evidence_refs, 1)`**,
because Postgres's `array_length()` returns `NULL` (not `0`) for a
zero-length array, which would let an empty-but-non-null `evidence_refs`
slip past an `array_length >= 1` CHECK silently (the CHECK would evaluate to
`NULL`, i.e. "unknown", which Postgres treats as a pass). A test asserts the
migration text uses `cardinality` and never contains `array_length(evidence_refs`.

**M20-3 — "guide, never gate," enforced mechanically.** Three independent
mechanisms, each proved by a structural test rather than a promise about
application code: **(a) the type has no field to gate with** —
`tests/recommendations.test.mjs` greps `lib/recommendations/types.ts`'s
actual code (comments excluded) for `blocks`/`required`/`gates` as field
names and finds none; **(b) the table has no column to gate with** — the
same test greps `032`'s `CREATE TABLE public.recommendations` body (SQL
comments stripped) for the same three words and finds none; **(c) no other
subsystem can even reach the table to build a gate out of it** — `032 §5`
grants `authenticated` `SELECT` only on both `recommendations` and
`recommendation_outcomes` (`REVOKE ALL` precedes every `GRANT`, the same
posture 024/029/030/031 already establish), so a client-side gate is not
just unwritten, it is unwritable; and a live-codebase grep (excluding
`lib/recommendations/**` and `app/api/recommendations/**`) confirms **zero**
files anywhere in `app/`, `lib/`, `components/`, `hooks/` call
`.from('recommendations')` or `.from('recommendation_outcomes')` — the table
is read-only to every subsystem except the engine and the outcome-recording
path, exactly as K.3 specifies. `032` also gives **no role, ever, DELETE**
on either table (K.4: "never silently deleted") and a
`recommendations_state_is_append_only` trigger refuses any UPDATE that would
move a CLOSED recommendation's `state` again — closing is terminal, the same
append-only discipline 016/024/030 already apply to their own evidence
tables.

**M20-4 — outcome tracking; escalation without shaming.**
`lib/recommendations/outcomes.ts` (new, pure) implements K.4's four closing
transitions (`dismiss`, `actOn`, `supersede`, `expire`) — each returns
*only* `{state, outcome}`; `dismiss`'s signature has no parameter through
which a caller could wire a score effect in, which is how "dismissing costs
nothing" is proved rather than merely documented. `expire` implements K.4's
ignored-vs-expired split: below `IGNORED_SURFACE_THRESHOLD` (3) surfaces
without action, the row closes `expired`; at or above, `ignored` — but both
record the **same** `RecommendationOutcome.outcome` value
(`ignored_expired`), because K.4 is explicit that "being ignored is a signal
about the recommendation, not about the student," and a separate, harsher
outcome kind for "ignored" would contradict that in the data model even if
the UI never surfaced it. `actOn` links `resulting_session_id` /
`resulting_resolution_id` / `benefit_observed` — K.6's feedback loop, "so
'do our recommendations actually close gaps for this student?' is answerable
from data." Escalation (`nextEscalationChannel`) walks K.5's fixed ladder —
`in_context → today_placement → in_app_notice → push → parent_report` —
skipping `push` under quiet hours or an `off` appetite and `parent_report`
unless the share policy already permits the category, and returning `null`
outright once the underlying condition is no longer open. **The absence-vs-
academic-condition rule is enforced by the type signature itself:**
`EscalationContext` has no `daysSinceLastSeen` / `daysInactive` /
`lastSeenAt` / `idle` field anywhere — a test greps the interface's own
source text to prove there is nothing in scope for a future call site to
escalate on. `containsShameLanguage` is the content-rule validator for K.5 /
`PRODUCT_PRINCIPLES §4`'s banned families (inactivity-day counts, "you're
behind," streak language, comparison to other students) — proved to catch
five representative banned phrasings, pass plain factual statements, **and**
every single `reason_template` string every one of the eleven K.1 generators
actually emits, closing the loop between "the validator works" and "nothing
we ship would have failed it."

**Reuse verdict.** No M0–M19 file's *behaviour* changed. `lib/console/
next-move.ts` (M0-7) is untouched — it is a different surface (`/console`'s
NOW beat), not this milestone's scope; M21/M22 are where the new engine's
`nextBestAction` reaches a student-facing surface, per the milestone brief's
instruction not to build M21/M22 UI here. No existing migration file was
edited; `032_recommendations.sql` is additive-only, referencing
`concepts(id)` and `patterns(id)` (both from `007_mistakes.sql`, unpartitioned,
so a real FK is safe — unlike `academic_events`, which 031 already
established cannot take one).

**Not built in this pass (explicitly out of scope for M20's four subtasks).**
The server-side wiring that queries live Supabase state (open patterns, due
retests, coverage gaps, upcoming exams, personal-model rows,
`correction_requests`) and calls these pure generators against it, plus
`app/api/recommendations/**`, the actual insertion/dismissal/outcome-write
endpoints, and any student-facing surface. K.1–K.8 are provable, and proved,
entirely in pure TypeScript plus the migration's own SQL text (U.3, the
determinism boundary) — the same split M19 drew between
extraction-as-a-job (deferred) and aggregation-as-pure-logic (built). Wiring
this to a live database is real work for M21 (Today), which is the engine's
first real consumer per B.11.

**V.11 passes in full.** Walking the brief's own end-to-end scenario against
what this milestone actually built: "the next action carries evidence_refs"
— every `Candidate`/`Recommendation` produced by every generator carries a
non-empty `evidenceRefs`, refused otherwise (M20-2, above) — "**and cannot
gate anything**" — proved three independent ways (M20-3, above), which is a
strictly stronger claim than V.11 asks for (it asks that the specific retest
action not gate; this milestone proves NO recommendation of ANY kind can
gate ANYTHING, structurally, for as long as the schema and grants stand).
The remaining V.11 hops (Torque declaration/confirmation/assessment/session
completion/retest scheduling) belong to M6–M14, already complete and
unchanged by this pass.

**Verification basis:** working tree, uncommitted · `npx tsc --noEmit` exit 0
· `npx next build` exit 0, clean · `node --test tests/*.test.mjs` — **1764
passing, 0 failing, 256 suites** (baseline before this pass: 1713 passing,
246 suites; +51 tests / +10 suites, all new, all in
`tests/recommendations.test.mjs`) · every K.x/V.7.4/K.3/V.11 criterion has a
named, passing test: K.1 (four tests — bounded kind list, TS+SQL agreement,
per-generator evidence non-emptiness), V.7.4 (six tests — construction
refusal on empty/null/malformed evidence, the `cardinality()`-not-
`array_length()` CHECK), K.3/V.11 (seven tests — no gating field in the type,
no gating column in the table, `authenticated` has SELECT-only grants, no
role ever gets DELETE, `recommendation_outcomes` append-only triggers, the
state-transition-is-terminal trigger, and the live-codebase grep proving no
file outside the engine touches the table), K.2 (six tests — the formula
verbatim, the urgency-neutral-not-zeroing case, fit neutrality/directionality,
fatigue growth/cap/kind-isolation), K.7 (five tests — per-kind expiry
bounds, exact-day computation, cooling-window suppression/release, dedupe
determinism), K.8 (six tests — priority/expiry/surfaced-count tie-break
chain, 20-call stability proof, active-only eligibility, null-on-empty),
K.4/K.6 (five tests — cost-free dismissal by signature shape, outcome
linking, non-deletion, the ignored/expired split sharing one outcome kind,
refusal on an unpersisted row), K.5 (eleven tests — the ladder, quiet-hours/
appetite/share-policy gating of each rung, condition-closed refusal, the
absence-field-is-absent grep, banned-phrase detection, and the
all-generators-are-clean sweep), plus three migration-ledger-convention
tests (filename parsing, checksum-matches-body, non-empty body). Files
changed: `lib/recommendations/types.ts` (new), `lib/recommendations/
engine.ts` (new), `lib/recommendations/outcomes.ts` (new), `supabase/
migrations/032_recommendations.sql` (new, NOT applied), `tests/
recommendations.test.mjs` (new), `tests/tsconfig.recommendations.json`
(new), `.gitignore` (+1 line, `.test-build-recommendations`). No file under
M0–M19's ownership was semantically changed.

---

## M21 — Today · **P2** — **COMPLETE, ALL THREE SUBTASKS (2026-08-18, uncommitted; `033` NOT applied to any database)**

**Scope.** Implementation Order step 13; **Part L**; Part W row *Today*
(**CREATE**, P2).

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M21-1** | Derivation from recommendations, sessions and the score | L | L.3 |
| **M21-2** | Typed empty reasons: `no_evidence_yet`, `all_current`, `insufficient_data` | M | V.7.1–V.7.3 — a lagging projection never says "all caught up" |
| **M21-3** | Accomplishments shown once, then filed to the record | M | V.7.5 — never a persistent badge |

**Definition of done.** V.7 in full, including V.7.6: grep the rendered payload —
no `Math.random`, no hardcoded population figures, no peer comparisons.

**M21-1 — `lib/today/engine.ts` (new, pure, no imports beyond
`lib/recommendations/types.ts`'s `EvidenceRef` — same I/O-free discipline as
`lib/recommendations/engine.ts`, `lib/score-engine.ts`).** `deriveTodayState()`
takes a `TodayInputs` shape (L.2's table, typed in `lib/today/types.ts`) built
entirely from the OUTPUT of three already-built engines — M20's
`selectNextBestAction()` result (`nextBestAction`), M9's session states
(`openSession`, `unverifiedSessions`, `recentAccomplishments`), and M14's score
(`score`) — and never reimplements candidate generation, priority or session
resolution. Four item kinds (`resume_session`, `next_best_action`,
`accomplishment`, `orientation`), each built exclusively through
`buildTodayItem()`, a single chokepoint mirroring `buildCandidate()`. Ordering
is a FIXED priority group (resume > next-best-action > accomplishment >
orientation), never array order alone, and volume is bounded
(`DEFAULT_MAX_ITEMS = 6`, overridable per-call for truncation tests). Wired to
live Supabase state by `app/api/today/route.ts` — the engine's first real
consumer, exactly as M20's own "not built in this pass" note anticipated. The
route reads `study_sessions`, `score_history`, `academic_events` (existence
probe only), `patterns`/`mistake_retest_schedule`/`occurrences` (to build live
`openPatternCandidates`/`dueRetestCandidates` and select one next-best-action
in-memory, per K.1/K.2/K.7/K.8 — no `recommendations` table row is persisted;
that table's write path remains out of scope per M20's own note, and M21
consumes the pure engine directly rather than reintroducing a second selection
algorithm) and `confirmed_session_concepts` (022's view, never the raw
`session_concepts` table — `tests/session-concepts.test.mjs`'s existing guard
caught and corrected one raw-table read during this pass). Everything is read
as the student via `createStudentServerClient()`, the same RLS posture
`app/api/assessment/verify/route.ts` uses.

**M21-2 — the closed set of typed empty reasons, four members, V.7.3 checked
FIRST and unconditionally.** `TODAY_EMPTY_REASONS` in `lib/today/types.ts`
carries all four of L.4's members — `no_evidence_yet`, `all_current`,
`awaiting_verification`, `insufficient_data` — one more than the milestone
table's three, because L.4 itself declares the set closed at four and
`awaiting_verification` ("the only outstanding thing is the student's own
choice to verify or not") is architecturally distinct from `all_current`: an
unverified session that did not win the K.8 priority sort is neither nothing
(`all_current`) nor unknown (`insufficient_data`) — it is a known, self-chosen,
non-gating follow-up, and reporting it honestly (rather than folding it into
`all_current`) is itself an application of V.7's non-fabrication discipline.
`selectEmptyReason()` checks `dataFreshness.ok` FIRST, before a single item is
built and before any other input is even read — proved by a test where a
scored student with a real open session still gets `insufficient_data` when
`dataFreshness.ok = false`, and by a second test asserting `empty_reason` is
never `all_current` or `no_evidence_yet` while the pipeline is behind.
`insufficient_data` is triggered, at the I/O layer, ONLY by a genuine Supabase
read error on a required query — never by the score's routine daily-batch
cadence, which is not a pipeline failure and must not read as one.

**M21-3 — accomplishments shown once, then filed to the record; the
mechanism is `last_seen_at`, never deletion.** `033_today.sql` (new, additive
only) adds `students.last_seen_at` (B.12's one durable field, `NULL` until
Today's first render — never defaulted to `now()`, which would silently hide
every accomplishment between account creation and first visit) and
`public.mark_today_seen()`, the ONLY write path: `SECURITY DEFINER`, resolves
identity from `auth.uid()` (never an argument — a test greps the function body
for an absent `p_student_id`), locks the caller's own `students` row
(`FOR UPDATE`) and returns BOTH the previous and new value in one transaction
— the same "read old, then append new, under one lock" shape
`012_students_and_profiles.sql`'s `set_student_profile()` already established
for the identical race. `lib/today/engine.ts`'s `accomplishmentsSince()` is
the pure half: `closedAtMs > (lastSeenAtMs ?? -Infinity)` — a `null`
`lastSeenAtMs` (never rendered) treats every accomplishment as new, so nothing
is silently skipped on a student's first-ever Today render. The route reads
`last_seen_at` BEFORE building the response (so "what is new" is computed
against the OLD value) and calls `mark_today_seen()` AFTER the response is
built — never before, and never as a client-side whole-row UPDATE (`033` grants
no UPDATE policy on `students` beyond the function). Proved end-to-end: an
accomplishment surfaces on a render where `lastSeenAtMs` predates its
`closedAtMs`, and is absent on a second render where `lastSeenAtMs` has
advanced past it — while the record it was derived from (the raw
`recentAccomplishments` array, standing in for Academic Memory / the permanent
record) is asserted unmutated and still contains the row throughout, proving
"filed" is a read-state change, not a deletion.

**V.7 passes in full, including V.7.6.** V.7.1 (brand-new account →
`items = []`, `no_evidence_yet`, and the `TodayState` type has no field a
motivational sentence, fake figure or suggested topic could occupy — asserted
by inspecting `Object.keys(state)`). V.7.2 (evidence exists, nothing open/due
→ `all_current`; a scored student instead gets a one-item orientation reading,
never a spurious empty state). V.7.3 (proved above, M21-2). V.7.4, EXTENDED
(every `TodayItem`, not only the recommendation-derived one, is refused at
construction with empty `evidenceRefs` — `buildTodayItem()` throws
`TodayEvidenceRequiredError`, mirroring M20's `buildCandidate()`/
`EvidenceRequiredError`; a test walks every item a fully-populated
`deriveTodayState()` call actually builds and asserts every one carries
`evidenceRefs.length >= 1`). V.7.5 (M21-3, above). **V.7.6** — `tests/
today.test.mjs` greps `lib/today/engine.ts`, `lib/today/types.ts`, `app/api/
today/route.ts` and `app/today/page.tsx` for `Math.random(` (a call, not the
bare identifier — the engine's own doc comments name "Math.random" as a
forbidden thing, which would make a bare-identifier grep self-defeating), the
exact hardcoded figures `L.4` names from `app/api/awake-count/route.ts`
(`STREAM_SIZES`, `pctAwake`, `awakeCount`, the population literals `1.4M`/
`2M`/`3.8M`), percentile/peer-comparison language, and a `streak` concept in
the engine or its types (B.12/B.3: "Must NOT own... Streaks") — **none exist,
and the test fails the build the day any of them would.**

**`app/today` — the route.** New page at `/today`, editorial and calm,
composed from `components/console/primitives` (`Stack`, `Row`, `Text`,
`Control`, `Empty`, `Readout`) — the same vocabulary `app/home` and
`app/settings` already use, so nothing new was added to the design system for
this milestone. The empty state renders through `<Empty>` ("an invitation with
exactly one control", `PRODUCT_PRINCIPLES.md:288`) with one of four typed copy
blocks keyed by `empty_reason` — `insufficient_data`'s copy names the state as
a system fact ("the last read from your data hit a problem") and explicitly
never says "all caught up".

**Reuse verdict.** No M0–M20 file's *behaviour* changed.
`lib/recommendations/engine.ts`'s exported functions
(`openPatternCandidates`, `dueRetestCandidates`, `computeFit`,
`computeFatigue`, `toRecommendation`, `selectNextBestAction`, `unionCandidates`,
`dedupeCandidates`) are imported and called, not copied or reimplemented.
`lib/session-concepts.ts`'s `CONFIRMED_SESSION_CONCEPTS_VIEW` constant is
reused for the one query that touches session concepts. No existing migration
file was edited; `033_today.sql` is additive-only (one column, one function),
following the exact `ensure_student()`/`set_student_profile()` pattern
`012_students_and_profiles.sql` established. M22 (Home composition) is where
Today's typed items reach the composed home surface — this milestone builds
the route and a standalone page, per the brief's own dependency note ("13" is
a prerequisite of "14").

**Verification basis:** working tree, uncommitted · `npx tsc --noEmit` exit 0
· `npx next build` exit 0, clean (both `/today` and `/api/today` present in
the route table) · `node --test tests/*.test.mjs` — **1799 passing, 0
failing, 266 suites** (baseline before this pass: 1764 passing, 256 suites;
+35 tests / +10 suites, all new, all in `tests/today.test.mjs`) · every V.7.x/
L.x criterion has a named, passing test: V.7.1 (2 tests), V.7.2 (2 tests),
V.7.3 (3 tests, including the override-a-scored-student case), L.4's fourth
member (1 test), the closed-set shape itself (3 tests), L.3 (6 tests — one
per input category changing the output, plus fixed-order and truncation),
V.7.4 extended (3 tests), V.7.5 (5 tests, including the end-to-end
show-once-then-file proof and the input-not-mutated proof), V.7.6 (4 tests,
one per banned-content family), plus 6 migration-ledger-convention tests for
`033` (filename parsing, checksum-matches-body, non-empty body,
column-and-function-present, `SECURITY DEFINER`/`auth.uid()`-not-argument,
previous-value-returned). Files changed: `lib/today/types.ts` (new), `lib/
today/engine.ts` (new), `app/api/today/route.ts` (new), `app/today/page.tsx`
(new), `supabase/migrations/033_today.sql` (new, NOT applied), `tests/
today.test.mjs` (new), `tests/tsconfig.today.json` (new), `.gitignore` (+1
line, `.test-build-today`). No file under M0–M20's ownership was semantically
changed — the one pre-existing-file touch during this pass was a self-caught
correction (raw `session_concepts` read replaced with the `confirmed_session_
concepts` view before the final test run) inside `app/api/today/route.ts`
itself, a file this milestone created.

---

## M22 — Home composition · **P2** — **COMPLETE, ALL THREE SUBTASKS (2026-08-18, uncommitted; `034` NOT applied to any database)**

**Scope.** Implementation Order step 14; **Part M**; Part S.6 (`lib/dash-layout.ts`
**REBUILD**); Part W row *Home composition* (**REBUILD**, P2).

**Dependency rationale.** *"Requires 13 — composition needs typed items to
compose."* Consumed M13's `lib/diagnosis.ts` / `lib/record.ts` derivations only
indirectly — the composed widgets read live pattern/retest/session/exam state
the same way M20/M21 already do (reused, not reinvented); no new read of
`lib/diagnosis.ts`/`lib/record.ts` output was required for this pass.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M22-1** | The M.2 component registry | L | **DONE** — `lib/home/registry.ts`; `tests/home-composition.test.mjs` proves composition is driven by iterating the registry |
| **M22-2** | Server-persisted `HomeLayout` replacing 5 unsynced booleans | L | **DONE** — `034_home_layout.sql`'s `home_layout` table + `app/api/home-layout/route.ts`; device-change simulation proved in the pure suite |
| **M22-3** | Four importance tiers + the anti-inflation guardrails | L | **DONE** — `lib/home/importance.ts`; M.5's five constraints all enforced, "critical cannot inflate" proved both in pure TypeScript and at the database GRANT level |

**M22-1 — `lib/home/registry.ts` (new, pure).** One array, `HOME_COMPONENT_REGISTRY`,
transcribing M.2's exact field shape (`componentId, dataDependencies, minSize,
maxSize, defaultSize, defaultOrder, canBeHidden, importanceCapable, maxTier,
emptyBehaviour, mobileRank`) for the five components the old boolean set named
(`score, recommendation, recent_activity, exams, features`) — the same five
sections, typed, per M.2's "CURRENT FACT — the gap" transcription of
`lib/dash-layout.ts`'s pre-M22 shape. `maxTier` is the one field beyond the
brief's literal list — M.5's anti-inflation ceiling, fixed per component at
registration time. `HOME_COMPONENT_REGISTRY` is asserted against
`HOME_COMPONENT_IDS` (types.ts) at module load — the two cannot drift. The
Score is `canBeHidden: false, importanceCapable: false` — resolving the exact
tension Part M names ("the OLD boolean let a student hide persistent chrome,
in direct tension with §6.8") by making it inexpressible, enforced twice
(`validateHomeLayout` in TypeScript, `home_layout_score_is_chrome` trigger in
SQL). `components/home/composer.tsx`'s `HomeComposer` is the ONLY renderer,
dispatching `componentId → widget` through a lookup table keyed by the SAME
closed union — `app/home/page.tsx` renders `<HomeComposer/>` once and never
names a widget itself (`tests/home-composition.test.mjs`'s "app/home/page.tsx
never hardcodes the widget list" proves this by asserting none of the four
non-chrome titles appear as string literals in the page).

**M22-2 — `034_home_layout.sql` + `app/api/home-layout/route.ts` + rebuilt
`lib/dash-layout.ts`.** Two tables, two trust levels (mirroring 031's
aggregator-role split): `home_layout` (student-owned, one JSONB row per
student, RLS + column GRANTs scoped to the caller's own row, no DELETE policy)
and `home_importance_promotions` (system-owned, append-only, M.5.5's log —
`authenticated` has SELECT and nothing else, checked structurally in the
migration's own verification block AND in the test suite by parsing the GRANT
lines). `lib/dash-layout.ts` is REBUILT per Part S.6's note into a thin I/O
adapter (`fetchHomeLayout`/`saveHomeLayout`/`toggleComponentVisibility`) over
the server API — it no longer touches browser storage at all (`tests/
home-composition.test.mjs` greps the file for the retired mechanism).
`components/settings/appearance-fields.tsx` and `app/tools/personalise/
page.tsx` (both consumers of the old boolean API) were updated to the new
async, registry-driven, account-scoped mechanism — same UI, different wire.
`components/auth-provider.tsx`'s sign-out keep-list no longer preserves a
local dashboard-layout cache key, since layout is no longer device data.
**"Layout survives a device change"** is proved in the pure suite by
round-tripping a validated `HomeLayout` through a plain-JSON transport
(exactly the shape `home_layout.entries` persists and the API returns) and
asserting the resolved composition is identical on a second, independent
read — the same proof a live two-device test would give, without requiring a
live Supabase project (U.3, the determinism boundary).

**M22-3 — `lib/home/importance.ts` (new, pure).** M.5's five constraints, each
with its own enforcement point: (1) closed trigger lists per tier
(`T3_CRITICAL_TRIGGERS`/`T2_PROMOTED_TRIGGERS`/`T1_HIGHLIGHTED_TRIGGERS` in
`types.ts`, re-checked at runtime in `buildImportanceSignal`); (2) at most one
T3 (`capCriticalToOne` — earliest `resolvesAtMs` wins, the rest demote to
`promoted`, never disappear); (3) T3 requires a resolution condition
(`buildImportanceSignal` refuses to construct a `critical` signal with neither
`resolvesAtMs` nor `resolutionCondition` — not constructible, the same
discipline `lib/today/engine.ts`'s `buildTodayItem` uses for empty evidence);
(4) no absence trigger (structural — no trigger union member names one, and a
test asserts none of the twelve trigger strings match an absence-shaped
regex); (5) every promotion logged (`resolveHomeImportance` returns
`promotions[]` at the ACTUALLY-resolved tier, written to
`home_importance_promotions` as `service_role` from `app/api/home-layout/
route.ts` — the only role granted INSERT on that table). **"Critical cannot
inflate"** — M22's own done-when — is `lib/home/registry.ts`'s `maxTier`
ceiling, applied in `clampToRegistryCeiling` BEFORE a signal ever reaches a
render: `tests/home-composition.test.mjs`'s centrepiece test constructs a
fully valid `critical`-tier signal for `recommendation` (whose registry
ceiling is `promoted`) and proves the signal builds successfully but resolves
— and is LOGGED — at `promoted`, never at the claimed `critical`. The database
half of the same guarantee (a hand-crafted `INSERT` into
`home_importance_promotions` from an authenticated session) is proved
structurally by the migration's own GRANT text, parsed by the test suite —
there is no verb beyond `SELECT` granted to `authenticated` on that table at
all, so the guarantee holds even for a caller that bypasses
`lib/home/importance.ts` entirely.

**Verification basis.** `npx tsc --noEmit` — clean, zero errors, whole
project. `npx next build` — clean; `/api/home-layout` registered as a
server-rendered route among 85 pages. `node --test tests/*.test.mjs` — **1836
passing, 0 failing, up from the 1799/266-suite baseline** (37 new tests in
`tests/home-composition.test.mjs`, 4 new suites: M22-1 registry, M22-2
persistence, M22-3 importance/guardrails, `034_home_layout.sql` conventions).
Diffed structurally: `034_home_layout.sql`'s recorded checksum verified
against `migrationBody()`/`checksumOf()` (the same self-non-referential
technique every migration since 015 uses); the anti-inflation GRANT verified
by both a `DO $$ … $$` block inside the migration itself (fails the file's own
verification if `authenticated` ever gets a non-SELECT privilege on
`home_importance_promotions`) and by the test suite parsing the same GRANT
lines independently. `git status` after the pass: only `lib/home/*` (new),
`app/api/home-layout/route.ts` (new), `app/home/page.tsx` (edited — composed
section wired in, M3's shell untouched otherwise), `components/home/*` (new),
`lib/dash-layout.ts` (rebuilt per S.6), `components/settings/
appearance-fields.tsx` + `app/tools/personalise/page.tsx` (edited — new
layout wire), `components/auth-provider.tsx` (edited — keep-list), `.gitignore`
(added `.test-build-home`), `supabase/migrations/034_home_layout.sql` (new,
NOT applied), `tests/home-composition.test.mjs` + `tests/tsconfig.home.json`
(new). No `git add`/`git commit` run. No migration applied to any database.

**M22-1/M22-2/M22-3 all fully done — no resume needed.**

---

## M23 — Academic memory and search · **P3** — **COMPLETE, ALL THREE SUBTASKS (2026-08-18, uncommitted; `035` NOT applied to any database)**

**Scope.** Implementation Order step 10; **Part H**; Part W row *Academic memory +
search* (**CREATE**, P3).

**Dependency rationale.** Requires M7 + M11 + M12; richer after M14. P3 —
*required for the product to be complete*, not for it to be honest.

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M23-1** | Five-layer indexing; FTS + `pgvector` — no separate search service (U.2) | XL | **DONE** — `035_academic_memory_search.sql`; H.3's structured layer was already shipped (007/026/015), this migration adds the lexical and semantic layers |
| **M23-2** | NL → `StructuredQuery` with citations at every hop | XL | **DONE** — `lib/academic-memory/{types,structured-query,query-planner,narration}.ts` + `app/api/memory/query/route.ts`; V.9.1–V.9.5, V.9.7 all proved |
| **M23-3** | Refusal of unanswerable questions | M | **DONE** — `isUnanswerablePrediction` (deterministic, pre-model) + the closed `StructuredQuery.intent` enum (no `"predict"` member); V.9.6 proved with 13 phrasings |

**H.1's "five layers" clarified against M18's L1–L5.** Read carefully before
assuming these are a different scheme: **they are the same L1–L5** M18's
data-ownership work already used (`Part H.1`'s table is *"raw evidence /
derived academic state / historical snapshots / current state /
presentation state"* — identical rows to M18's export-manifest classification).
H.3 ("indexing and search") is a *different, orthogonal* three-way split —
**structured / lexical / semantic** — of how those same L1 facts get queried,
not a second data-ownership scheme. M23-1 therefore did not touch L1–L5 at
all; it added query surface over L1 (`academic_events`, `occurrences`,
`assessment_questions`) and L2 (`concepts`, `session_concepts`) rows that
already existed.

**M23-1 — `035_academic_memory_search.sql` (new, NOT applied).** H.3's
structured index (B-tree/composite) was already complete — `007_mistakes
.sql`'s `occurrences_concept_idx`/`patterns_leaf_severity_idx`,
`026_academic_record.sql`'s `academic_record_studied_not_assessed_idx` — and
035 adds nothing there (proved by a test asserting 035 does not re-declare
any of the three). It adds the two H.3 names as **new**: (1) **lexical** —
five `GENERATED ALWAYS ... STORED tsvector` columns + `GIN` indexes, one each
over `concepts` (weighted name/topic/chapter/subject), `session_concepts
.declared_text`, `academic_events.declared_text`, `assessment_questions
.stem`, `occurrences.marker_note` — H.3's exact four named fields, at the
extra granularity of also indexing the L1 event (not only its L2 derivation),
per H.1.a's "may read downward"; (2) **semantic** — `CREATE EXTENSION IF NOT
EXISTS vector` + nullable `vector(1536)` columns on `concepts.label_embedding`
and `session_concepts.declared_text_embedding` + `ivfflat` cosine indexes,
over concept labels and declaration text **only** — never over
`student_answer`/`expected_answer`/`marker_note` (H.3's own privacy
carve-out; a test asserts the SQL text never wires embeddings to those
columns). **Honestly scoped, not silently degraded:** the embedding columns
are populated by nothing in this pass — generating an embedding requires a
model call, which is an explicit follow-on job the migration's own trailing
comment names, not something this migration (or any migration) can honestly
do. The query side is complete and correct; it returns zero rows until the
column is filled, which the file states is the honest state for an
unpopulated index, not a defect. `lib/concept-resolution.ts`'s existing
deterministic/lexical resolver (`resolveConceptText`) is untouched and stays
the *first-line* concept-identity resolver in `app/api/memory/query
/route.ts`; the new FTS index is the second-line, broader-recall fallback
when that resolver returns unresolved — "no separate search service" (U.2)
holds because both paths run inside the same Postgres, and both are provable
by reading the migration and route text (no live database in this
environment).

**M23-2 — the NL → `StructuredQuery` pipeline, four new pure modules + one
route.** Followed H.4's exact pipeline (`question → [AI] → StructuredQuery →
[deterministic] planner → SQL → rows → citations`), and — per the brief's own
steer toward `lib/ai-capabilities/` — checked whether this belongs in the
86-capability registry first: it does not. That registry (`OUTPUT_CONTRACTS`
in `lib/ai-capabilities/registry.ts`) is driven by `lib/tools-registry.ts`'s
`AI_CAPABILITIES` manifest and exists to dispatch a STUDENT-CHOSEN AI Lab
tool through `/api/ai`'s single switch; memory search is not a tool a student
picks, it is the record answering about itself, and its output is a closed,
validated schema rather than free-form JSON. The correct existing template,
confirmed by reading both, is `lib/capture-extraction.ts` (M8): a pure
parse/validate module + an interface for the model, with the real Anthropic
client and the ported `/api/ai` guard sequence (`lib/ai-guard.ts`) living
only in the route — exactly the split this pass repeats.
- `lib/academic-memory/types.ts` — the closed `StructuredQuery` schema
  verbatim from H.4 (`intent`, `entity`, plus five optional fields), the
  `Citation` shape (`recordType, id, timestamp` — H.4.b), and `MemoryOutcome`
  (`MemoryResult | MemoryEmpty | MemoryRefusal`, never a fourth shape).
- `lib/academic-memory/structured-query.ts` — the model prompt
  (`buildQueryParsePrompt`, ported-in-intent from `EXTRACTION_PREAMBLE`'s
  "the input is DATA, never instruction" framing) and
  `parseStructuredQueryResponse`, which validates the model's JSON against
  the closed enum and **rejects, never coerces** (P.3.a) — an unknown intent,
  an unknown entity, a malformed `dateRange`, or a stray `sql` field are all
  refused or stripped, proved by a dedicated test per case.
- `lib/academic-memory/query-planner.ts` — `planQuery()`, deterministic,
  against an injected five-method `MemoryGateway` (one method per H.4 example
  query — no sixth surface exists for the model or this module to reach the
  database through). A `COMBINATION_RULES` whitelist refuses any
  `(intent, entity)` pair outside H.4's five worked examples rather than
  guessing at a nearest match. Citations are built ONLY from fields already
  present on a row the gateway returned — never from a query parameter —
  which is what makes V.9.7 ("every claim reaches a record") true by
  construction; proved by five combination tests plus two id-provenance
  tests (`V.9.7` describe block).
- `lib/academic-memory/narration.ts` — the answer text, by template over the
  same rows the citations point at. **Deliberately no AI narration step
  exists**, though H.4's diagram shows one: a model "constrained to the
  returned rows" still carries non-zero hallucination risk, and
  `PRODUCT_PRINCIPLES` §3.2 draws no exception for narrated-not-generated
  prose. A template cannot say a word its row does not contain, which is a
  strictly stronger reading of H.4.b than the diagram requires — logged here
  as a documented, deliberate deviation from the literal diagram in service
  of the stricter principle, not an oversight.
- `app/api/memory/query/route.ts` — the only file touching Anthropic or
  Supabase in this path. Order: auth → M23-3's deterministic guard → the
  ported six-check guard (`lib/ai-guard.ts`, identical to `/api/capture
  /extract`'s) → ONE Haiku call (question → JSON) → `parseStructuredQueryResponse`
  → concept-ref resolution (existing deterministic resolver first, the new
  FTS index as fallback) → `planQuery` against real Postgres reads → response.

**M23-3 — `isUnanswerablePrediction` + the closed enum, defence in depth.**
Two independent mechanisms, per the brief's steer to hold this to the same
rigor as every other milestone rather than trusting a single prompt
instruction: (1) a curated regex list (`will I pass`, `am I going to fail`,
`what grade will I get`, `can I pass`, `chances of passing`, `predict my`,
etc.) runs **before any model is called** — a canonical predictive question
costs nothing and never reaches an API key, proved with 13 phrasings plus 5
negative cases (H.4's own five retrieval questions, confirmed NOT flagged);
(2) the `StructuredQuery.intent` enum is closed with five members and no
`"predict"` — even a compromised or confused model attempting to answer a
prediction has no valid field to put it in, so `parseStructuredQueryResponse`
rejects it. `V.9.6`'s exact scenario ("will I pass?" → no `StructuredQuery`,
an explicit refusal, filters offered, no prediction) is proved end-to-end in
the pure suite.

**Verification basis.** `npx tsc --noEmit` — clean, zero errors, whole
project. `npx next build` — clean; `/api/memory/query` registered as a
server-rendered route alongside the rest of the app's routes. `node --test tests/*.test.mjs` —
**1883 passing, 0 failing, up from the 1836/275-suite baseline** (47 new
tests in `tests/academic-memory.test.mjs`, 5 new suites: H.3 migration
structure, V.9.6 refusal, `StructuredQuery` parse/reject, the five-combination
planner, V.9.7 citation provenance). Diffed structurally: `035`'s SQL text
asserted for `CREATE EXTENSION IF NOT EXISTS vector`, five `tsvector`/`GIN`
pairs, two `vector(1536)`/`ivfflat` pairs, universal `IF NOT EXISTS`, and
non-duplication of the three already-shipped structured indexes.
`tests/session-concepts.test.mjs`'s existing raw-table boundary test was
extended (not weakened) to allow `035` alongside `022` as the only two files
naming `session_concepts` directly — both are schema DDL (a `GENERATED`
column and its index cannot be added to a view), never a read that bypasses
`confirmed_session_concepts`. `git status` after the pass: `lib/academic
-memory/*` (new, 4 files), `app/api/memory/query/route.ts` (new),
`components/console/memory-ask.tsx` (new — the "Ask the record" panel),
`app/record/page.tsx` (edited — one import + one mount point, nothing else
touched), `supabase/migrations/035_academic_memory_search.sql` (new, NOT
applied), `tests/academic-memory.test.mjs` + `tests/tsconfig.academic
-memory.json` (new), `tests/session-concepts.test.mjs` (edited — allowlist
extended per above), `.gitignore` (added `.test-build-academic-memory`). No
`git add`/`git commit` run. No migration applied to any database.

**UI surface, per the brief's "if any UI is needed" note.** H.4 names no
specific entry point beyond the pipeline itself, and `components
/command-palette.tsx` is a navigation/tool search surface (routes to
existing pages), not a data-query surface — wiring memory search into it
would have meant teaching the palette a second, unrelated query language.
Landed instead on `/record` ("Proof the ledger accumulates" — the page's own
header), which is the one existing surface H.4's five example questions are
already *about*. `MemoryAsk` is a single self-contained panel (`Field` +
`Control` + the answer/citation-count text), Console-primitive-only, no ad
hoc styling, no new route.

**M23-1/M23-2/M23-3 all fully done — no resume needed.**

---

## M24 — Customisation generalisation · **P3** — **COMPLETE (2026-08-18, uncommitted; no migration — none needed, see below)**

**Scope.** Implementation Order step 17; Part B.14; Part S.6 (`workspace.ts`
**KEEP + GENERALISE**); Part W row *Customisation* (P3).

*Last because it is the only subsystem whose absence costs nothing academic.*

| ID | Task | Effort | Done when |
|---|---|---|---|
| **M24-1** | `workspace.ts` beyond `/console`; add to `SYNC_KEYS`; server-persist choices, not computed values | L | **DONE** — Identity survives a device change; `ensureContrast()` and the 44px floor are preserved verbatim |

> **Gate.** `PRODUCT_DECISIONS` §8: *"Do not begin Workspace Engine work without
> an explicit decision recorded there."* M24 is generalisation of shipped code,
> not the Workspace Engine. If the two are conflated, stop and get the decision.
>
> **Held to.** No per-trait 108-way configurator was built (only the 7 capped
> `PRESETS`, exactly as shipped); no milestone-gated unlocking (banned outright
> by `PRODUCT_PRINCIPLES` §4.3); no new `student_preferences` table, no new API
> route, no new sync mechanism. `tests/workspace.test.mjs`'s
> *"Workspace Engine scope gate"* test asserts the picker source never
> enumerates `MATERIALS`/`VOICES`/`PRESSURES`/`TEMPERAMENTS` independently and
> never mentions "unlock"/"milestone".

**What "beyond `/console`" turned out to mean.** Before this pass, `derive()`'s
tokens already reached six shells — `VitalityShell` (`components/console
/vitality-shell.tsx`) is imported by `app/{console,home,settings,capture
,diagnosis,record}/layout.tsx`, all six, unchanged since M3/M8/M13/M16
consolidated them onto one shell. So the ENGINE was never actually
`/console`-scoped; what was missing was (1) any live-update path when a
choice changes while a shell is already mounted, and (2) any control that
lets a student make a choice at all — `writeStoredDNA` had zero callers
anywhere in `app/` before this pass. Both gaps are now closed:

- `lib/console/workspace.ts` — `derive()`, `ensureContrast()` usage, `MATERIAL
  _SPEC`, `PRESSURE_SPEC` (the 44px floor), `TEMPERAMENT_SPEC`, `PRESETS`,
  `parseDNA` — **byte-for-byte unchanged**. The only edits: `STORAGE_KEY`
  renamed `"console:workspace"` → `"ledger-workspace"` (matching the `ledger-*`
  convention every other `SYNC_KEYS` entry uses — a workspace choice is no
  longer a Console-scoped fact), with `readStoredDNA()` falling back to the
  legacy key so an existing non-default choice is never silently lost (Law
  7); and a new `WORKSPACE_CHANGE_EVENT` that `writeStoredDNA` dispatches on
  `window` after a successful write.
- `components/console/vitality-shell.tsx` — one additive `useEffect` listening
  for `WORKSPACE_CHANGE_EVENT` and re-reading storage. A choice made on any
  one shell now applies live on every other mounted shell, with no reload —
  this is the concrete mechanism behind "generalised workspace state actually
  affects a second surface."
- `components/settings/appearance-fields.tsx` — a new "01b · Workspace"
  section, seven preset buttons (44px minimum height), calling
  `writeStoredDNA(PRESETS[name])`. This is the first and only caller of
  `writeStoredDNA` in the app — before this pass the engine was write-dead
  code regardless of which routes rendered its output. `/settings` was chosen
  as the second concrete surface per the brief's own suggestion; `/home`
  already inherits the same live-update mechanism for free (same
  `VitalityShell`), proved structurally rather than duplicated.

**`SYNC_KEYS` and server-persistence — reused, not reinvented.** `"ledger
-workspace"` was added to `SYNC_KEYS` (`lib/sync.ts`) and to its two mirrors
(`lib/tools-registry.ts`'s `SYNCED_KEYS`, `lib/legacy-backfill.ts`'s
`REFUSED_KEYS` — refused with a stated reason: a workspace choice is a display
preference, not academic evidence, same class as the habit/plan/career keys).
This routes the choice through the EXISTING device-sync path M7-6 built:
`flushLegacyBlob()` uploads it to `user_data.blob` (Postgres, already the
source of truth for every other device-preference key), and `pullFromCloud()`
→ `hydrateAbsentOnly()` (`lib/sync-merge.ts`, unmodified) fills it on a fresh
device — never adjudicating between two real choices, the same M7-6 rule
already proven for every other synced key. **No new table, no new API route,
no new sync mechanism** — the brief's own steer ("don't invent a new sync
mechanism") and the literal EXECUTION_PLAN wording ("add to `SYNC_KEYS`") both
point at the same, smaller thing: reuse the mechanism M9/M14/M17 already
extended. Architecture B.14's `student_preferences` table describes the
FROZEN Workspace Engine's eventual shape (explanation style, quiz intensity,
notification policy, etc. — none of which exist yet); building that table now
for a single four-field record would be infrastructure ahead of the feature
it serves, which is exactly the shape of scope creep §8 warns against. **This
is why no migration file was written for M24** — `user_data` already exists,
already has RLS, and already has a proven conflict rule.

**Verification basis.** `npx tsc --noEmit` — clean, zero errors, whole
project. `npx next build` — clean; no new route (`/settings` already existed).
`node --test tests/*.test.mjs` — **1897 passing, 0 failing, up from the
1883/279-suite baseline** (14 new tests, 4 new `describe` blocks in
`tests/workspace.test.mjs`):
- *golden values* — hardcoded hex/px literals asserted against `derive()`'s
  actual output for `STUDIO` and `TERMINAL` (including a pass-through
  `ensureContrast()` case and a corrected one), plus the exact 44/48px control
  heights at each pressure — a diff against known values, not an existence
  check, per the brief's own requirement.
- *storage — CHOICES only* — `writeStoredDNA` persists exactly the four DNA
  fields (asserted key-for-key); the persisted string is asserted to contain
  none of `derive()`'s emitted token names; re-deriving from the persisted
  choice reproduces the identical computed tokens (proving the split, not
  just an absence); the legacy-key fallback; the change-event dispatch.
- *DEVICE-CHANGE SIMULATION* — mirrors `tests/home-composition.test.mjs`'s
  HomeLayout test exactly: a choice written on "device A" (real `writeStoredDNA`,
  Map-backed storage) round-trips through the plain string `flushLegacyBlob`
  actually uploads, hydrates via the REAL `hydrateAbsentOnly` on an empty
  "device B", and resolves identically through the REAL `readStoredDNA`/
  `parseDNA` — plus the M7-6 "kept, never adjudicated" case.
- *generalised beyond /console* — structural: `SYNC_KEYS` carries the key;
  `/settings` both renders `VitalityShell` and can write a choice
  (`writeStoredDNA`/`PRESETS` present in its source); every one of the six
  shells mounts `VitalityShell`; the scope-gate assertions above.

`tests/legacy-freeze.test.mjs`'s existing exhaustiveness test (`BACKFILLED
_KEYS` ∪ `REFUSED_KEYS` partitions `SYNC_KEYS` exactly) and `tests/tools
-registry.test.mjs`'s existing mirror test (`SYNCED_KEYS` matches `lib/sync.ts`)
both re-ran unmodified and passed — proof the new key was wired into every
place the codebase already cross-checks `SYNC_KEYS`, not just the one place
this milestone was told to touch.

`git status` after the pass, files touched: `lib/console/workspace.ts`,
`components/console/vitality-shell.tsx`, `lib/sync.ts`, `lib/tools-registry.ts`,
`lib/legacy-backfill.ts`, `components/settings/appearance-fields.tsx`,
`tests/workspace.test.mjs`, `tests/tsconfig.workspace.json` (added `lib/sync
-merge.ts` to the compiled set, for the device-change test — no I/O module,
same determinism boundary the rest of that tsconfig already relies on),
`EXECUTION_PLAN.md`. No new files. No `git add`/`git commit` run. No `.sql`
file written and none applied to any database — see above for why none was
needed.

**`ensureContrast()`/44px floor — explicit confirmation.** Neither function
nor the `PRESSURE_SPEC`/`MATERIAL_SPEC` tables it and `derive()` read from
were edited in any way; the golden-value tests above assert their literal
output, and the pre-existing 108-combination contrast/floor suite
(`tests/workspace.test.mjs`'s original `describe` blocks, all 34 of its tests)
re-ran unmodified and passed.

**Workspace Engine — explicit confirmation it was NOT built.** No
`student_preferences` table or migration; no exposure of the four traits
independently (only the 7 capped presets); no per-trait picker; no
milestone-gated unlocking; no new sync mechanism; no new API route. Everything
built is the existing `derive()`/`parseDNA`/`PRESETS` engine wired to two more
places (a live-update listener, one settings control) and one existing key
added to one existing sync list, three times (`SYNC_KEYS` + its two mirrors).

**M24-1 fully done — no resume needed. This completes M0–M24, the entire
25-milestone plan.**

---

# PART C — SUMMARY

| ID | Milestone | Impl. Order | Pri |
|---|---|---|---|
| M0 | Violation and fabrication removal | step 0 (P1 removals) | P1 |
| M1 | Migration ledger + CI gate | step 0 (T1) | P0 |
| M2 | Navigation collapse + capability manifest | — (independent) | P1 |
| M3 | One shell → `/home` | step 0 (T10) | P0 |
| M4 | Server/edge authentication | step 0 (T11) | P0 |
| M5 | Identity, profile, onboarding | step 1 | P0 |
| M6 | Concept model | step 2 | P1 |
| M7 | Academic Event layer + audit trail | step 3 | P0 |
| M8 | Evidence + `/capture` | step 4 | P1 |
| M9 | Study sessions + external study | step 5 | P1 |
| M10 | Assessment engine | step 6 | P1 |
| M11 | Mistake DNA wiring | step 7 | P1 |
| M12 | Academic record projection | step 8 | P1 |
| M13 | `/diagnosis` + `/record` | — (consumes step 8) | P1 |
| M14 | Ledger Score rebuild + Continuity | step 9 | P1 |
| M15 | AI boundary | — | P1/P2 |
| M16 | Settings + Legal | — | P2 |
| M17 | Parent Space | step 15 | P2 |
| M18 | Data ownership | step 16 | P2 |
| M19 | Personal model | step 11 | P2 |
| M20 | Recommendations | step 12 | P2 |
| M21 | Today | step 13 | P2 |
| M22 | Home composition | step 14 | P2 |
| M23 | Academic memory + search | step 10 | P3 |
| M24 | Customisation generalisation | step 17 | P3 |

**Status (2026-08-18): M0–M24 — all 25 milestones — are COMPLETE.** Every
milestone's own heading above carries its individual verification basis (test
counts, what was diffed structurally, migration files written and NOT
applied). Nothing in the working tree is committed and no migration has been
applied to any database — both are deliberate per every milestone's ground
rules, not an oversight of this rollup line.

## Honest risk

This is a larger programme than the plan it replaces, at the same ~6h/week
alongside Class 12. It will be interrupted.

**The plan is built to survive that.** M0 ships value on day one and depends on
nothing. M2 makes a partially-migrated product read as one product. Every
milestone from M7 onward is independently shippable, and none requires a later
milestone to be honest — because "insufficient evidence" is a valid state at
every stage (J.3.a), not a placeholder waiting to be filled.

**The three risks this order is specifically sequenced around:** T1 (schema
drift) is closed by M1 *before* any event table ships · T10 (two shells) is closed
by M3 *before* the event layer, not during · T11 (client-only auth) is closed by
M4 *before* the first server-rendered student surface. T9 (the live parent
breach) is closed by M0, first, as its own mitigation states.

---

# PART D — WHAT IS EXPLICITLY DEFERRED

**Nobody should read Part B as "all of this is happening at once."**

**Deferred by priority (the architecture's own ranking):**

- **P3 — M23** (academic memory and NL search) and **M24** (customisation
  generalisation). Required for completeness, not for honesty.
- **P2 — M15-3..M15-7** (the AI route restructure), **M16**, **M17**, **M18**,
  **M19**, **M20**, **M21**, **M22**. The V1 loop closes without them.
- **P2 — the 29 Level-0 tools** stay **WRAP**: routable, unlinked, unintegrated.
  P.4.a is explicit that reaching Level 3 for a handful matters more than raising
  29 tools from 0 to 1. **No plan exists to integrate them, and none is needed.**
- **P2 — CSP tightening** (`unsafe-eval` for absent dependencies). Stale
  permission, low damage.
- **P2 — jobs/cron additions** (rebuilds, exports, compaction, consistency).
  Additive; each lands with the milestone that needs it, not as its own work.

**Deferred as out of scope entirely** (Part S.8 marks both **NOTED, OUT OF
SCOPE**; visual design is governed by `PRODUCT_PRINCIPLES` §6, not here):

- The four CSS systems and their unification.
- The three concurrent animation runtimes.
- *Exception:* live glassmorphism (`app/auth/page.tsx:110,124,138,148`,
  `components/app-nav.tsx:231`) breaches a **permanent ban**
  (`PRODUCT_PRINCIPLES:165`). That is a principle violation, not a design task,
  and it is not deferred — but it belongs to whoever next touches those files,
  not to a milestone here.

**Deferred pending a recorded decision:** the Workspace Engine
(`PRODUCT_DECISIONS` §8). M24 does not begin it.

**Not deferred, and not scheduled:** `CRON_SECRET` presence in both Vercel and
GitHub Actions is marked **UNVERIFIABLE** in Part S.8 — nobody knows whether the
crons run. Check it before M14 depends on the snapshot cron.

---

# PART E — WHAT SHIPS BEFORE A LAUNCH CHECKPOINT

**The nine V1 routes** (`PRODUCT_DECISIONS` §3) map to milestones as follows:

| V1 route | Delivered by |
|---|---|
| `/auth` | M4, M5 |
| `/onboard` | M5-3 |
| `/home` | M3 (shell) — composition at M22 |
| **`/capture`** | **M8** |
| `/diagnosis` | M13-1, M13-2 |
| `/record` | M13-3 |
| `/parents` | M0 (removals) + M17 |
| `/settings` | M16 |
| `/legal` | M16-2 |

**The V1 route set is complete at M17.** The V1 *loop* — capture → diagnosis →
record → honest score — closes at **M14**.

## Launch checkpoint — decided 2026-08-11

**Background.** `STUDYLEDGER_SYSTEM_ARCHITECTURE.md` commits to no launch date
and no in/out-of-launch scope — it has an Implementation Order, not a
schedule; its Part V acceptance tests are behavioural gates, not checkpoints;
the North Star sets no delivery bar. `STUDYLEDGER_OPEN_DECISIONS.md:333-345`
raised a "September 8" checkpoint and explicitly handed the call back: *"The
product owner should decide launch messaging on this basis."* The four items
below were left open for exactly that reason. They are now decided. This
section is a plan-level scheduling decision (falls within this document's own
remit: *"how, in what order, how long"*) — it does not reclassify a feature,
restate a principle, or introduce architecture, so it does not require an
amendment to `PRODUCT_PRINCIPLES.md` or `PRODUCT_DECISIONS.md`.

### 1. Does a September 8 checkpoint exist, and is it public or internal?

**DECIDED: it exists, and it is internal — an engineering gate, not a public
launch.**

Reasoning: the original audit that opened this whole process (`STUDYLEDGER
_SYSTEM_ARCHITECTURE.md`'s own Part-A-era predecessor) already concluded the
intended product cannot be fully rebuilt in four weeks. Treating Sept 8 as a
public launch date would force a choice between two bad options — quietly
shipping a small slice under a launch banner sized for the full vision, or
slipping a public date, which reads as failure regardless of how much real
progress was made. Decoupling the calendar date from public launch removes
that trap: Sept 8 becomes a checkpoint to measure actual milestone progress
against this plan, not a marketing commitment. **A public launch, if and when
one happens, is gated on milestone completion (see #2), not on this date.**

### 2. What ships by the September 8 checkpoint?

**DECIDED: M0 is mandatory. Beyond M0, ship whatever of M1–M7 is actually
done. M8 (`/capture`) is explicitly not required by this date.**

Reasoning: M0 has no dependencies, is fully scoped already, and removes active
harm that has no reason to still be live on any date — fabricated social
proof, an unauthenticated data leak, unpayable point promises, one-click
deletion of the record the product exists to keep. There is no scenario where
delaying M0 past Sept 8 is defensible, independent of anything else in this
plan. M1–M7 is the substrate (migration ledger, nav collapse, one shell,
server auth, identity, concepts, the event layer) — real, necessary, and
reported honestly as "in progress" or "done" per milestone, not compressed to
fit the date. M8 and everything after it is where the architecture's own
distinction applies: it is "the smallest set that makes the product itself,"
which is precisely why it should not be rushed to hit an internal gate — it is
the natural trigger for a *later, separate* public-launch decision once it is
actually finished, not a Sept-8-scale deliverable.

### 3. How is the mistake pillar described until M14?

**DECIDED: the disclosed "not yet scored" state ships as visible, plain-language
in-product copy immediately — not deferred until Sept 8, and not deferred until
M14.**

The ratified state (J.3.a, `PRODUCT_DECISIONS.md` §9.4) is that the mistake
pillar shows honestly as unscored rather than a silent zero or a patched
number. This is a disclosure fix, not new scoring logic, so it does not need
to wait on the architecture it's disclosing the absence of. Whichever
milestone currently owns the score-display surface (M0's honesty pass, or M1
if that surface isn't touched until then) should carry this as an explicit
task if it does not already — the exact wording is a copywriting detail for
that milestone, not something locked here, but *that it must be visible* is
decided: a score that silently shows 0 or omits the pillar is itself a
disclosure gap this plan will not carry forward past M0/M1.

### 4. Is the M14 score cutover announced before or with the change?

**DECIDED: before, not with.** Publish a short, plain-language explanation of
why scores are recalculating (Continuity replacing the deleted streak term;
the mistake pillar becoming real instead of a disclosed zero) ahead of the
change taking effect, so no student experiences an unexplained score movement.
This is consistent with the same principles already governing this pillar —
state facts, never produce an unexplained drop, never let a number move
without the student knowing why. M14's own task list should carry an explicit
pre-announcement task with a lead time, not just the post-change restatement
T3 already requires.

**Status: all four items closed.** None of these decisions altered any
milestone's scope, dependency order, or classification in Parts B/S/W — they
govern sequencing and disclosure timing only, which is this document's actual
remit.

---

# PART F — TASK LOG

*Appended as tasks complete. One line each: ID · date · commit · verification
result.*

**Two ID generations appear below.** Superseded 2026-08-05 tasks carry the
`-OLD-` archive segment introduced in Part A; **unprefixed IDs are the current
Part B numbering and are canonical.** No row has been removed — the prefix
qualifies identifiers only, never history.

**A row is `Commit` = `—` when the work is real but not yet committed.** That is
a legitimate state in this log (`M0-OLD-8`, `M1-OLD-1` already use it); it is
never filled with a placeholder hash. `Verified` then states what was actually
run.

## Superseded — 2026-08-05 numbering

| ID | Date | Commit | Verified |
|---|---|---|---|
| — | 2026-08-04 | — | Plan created; no code modified |
| M0-OLD-1 | 2026-08-05 | `44861db` | Pills carry explicit hrefs; 2 redirects added; build green |
| M0-OLD-2 | 2026-08-05 | `44861db` | `app/not-found.tsx` added; `/_not-found` in build output |
| M0-OLD-3 | 2026-08-05 | `44861db` | `app/console/loading.tsx` returns null; legacy skeleton unreachable from Console |
| M0-OLD-4 | 2026-08-05 | `44861db` | `npm test` + `npm run typecheck` added; `.github/workflows/test.yml` runs both on every push |
| M0-OLD-5 | 2026-08-05 | `44861db` | 19 files / 2,607 lines deleted after per-file import verification |
| M0-OLD-6 | 2026-08-05 | `44861db` | 6 deps removed (three, @types/three, @react-three/*, @splinetool/*) |
| M0-OLD-7 | 2026-08-05 | `44861db` | `lib/animation.ts`, `app/globals-severity-patch.css` deleted |
| M0-OLD-8 | 2026-08-05 | — | Re-scoped to archival. 6 governance docs moved to `docs/archive/` with deprecation headers |
| GOV | 2026-08-05 | `3e77ad2` | Governance restructured to four documents; `CLAUDE.md` → pointer; this file stripped to plans |
| M1-OLD-1 (D1) | 2026-08-06 | — | Mistake schema ratified; recorded `PRODUCT_DECISIONS` §7.4. **Log entry added retroactively 2026-08-10** |
| M1-OLD-2 | — | `877ce8a` | `lib/mistakes/types.ts`. **Zero production importers** (T12) |
| M1-OLD-3 | — | `f79145e`, `1606dad` | `007_mistakes.sql` with RLS; RLS verified against the live database |
| M1-OLD-5 | — | `f4bb185` | `lib/mistakes/engine.ts`. **Zero production importers** (T12) |
| M1-OLD-6 | — | `640ef97` | Pillar formula inverted. **Does not close the defect** — `mistakeScore ≡ 0` persists because no writer exists for `evidenceId` or `resolved` (J.9). Superseded by **M11** + **M14-3** |
| M1-OLD-4 (D6) | — | `51d43f6` | CBSE Class 11/12 Physics tree seeded. **Zero production importers** (T12). D6 answered by shipping |
| M1-OLD-7 | — | `2c6676e` | `lib/mistakes/migrate-legacy.ts` written and tested. **UNVERIFIED: never executed against production.** Re-issued as **M11-6** |
| — | — | `a70adce` | `008_ingestion.sql` stage runner. **Zero production importers** (T12). Wired at **M8-3** |
| — | — | `c755ff4`, `8b539ef` | Landing rebuilt as one narrative; stabilisation release L1 |
| PLAN | 2026-08-10 | — | **This document rewritten** to sequence `STUDYLEDGER_SYSTEM_ARCHITECTURE.md`. Old M0–M10 superseded per Part A. **No production code touched.** |

**Verification basis for the rewrite:** repository at `8b539ef`, working tree
clean · `npx tsc --noEmit` exit 0 · 361 tests pass — **all on unwired code**
(Part W, *Tests*).

## Current — Part B numbering

| ID | Date | Commit | Verified |
|---|---|---|---|
| M0-1 | 2026-08-11 | — (uncommitted) | `weakTopics` absent from the `select` in `app/api/parent/[code]/route.ts` — removed, not filtered. **Implemented and verified in the working tree; awaiting commit** |
| M0-2 | 2026-08-11 | — (uncommitted) | Miss-count table deleted from `lib/parent-digest.ts`; `ParentDigestData` carries no `weakTopics` field, so the shape cannot render one. **Implemented and verified; awaiting commit** |
| M0-3 | 2026-08-11 | — (uncommitted) | `inactivity` digest mode, its alert banner and the "Study streak: N days" footer deleted from `lib/parent-digest.ts`; `DigestMode` is now `"digest" \| "exam-risk"`. Test asserts no parent subject or body matches streak / "at risk" / consecutive-day copy in any mode. **Implemented and verified; awaiting commit** |
| M0-4 | 2026-08-11 | — (uncommitted) | `inactiveDays` and the `INACTIVITY_*` constants deleted from `computeRiskFlags`; it no longer accepts `streak` or `lastStudied`. `examSoon` (imminent dated exam **and** measured readiness below threshold) is untouched and still fires. `app/api/cron/risk-alerts/route.ts` no longer enqueues an inactivity alert. Nothing replaces the removed alert. **Implemented and verified; awaiting commit** |
| M0-6 | 2026-08-14 | — (uncommitted) | Streak presentation and the streak-at-risk push both deleted. `lib/notifications.ts`: the `"streak"` candidate type, the `streakAtRisk` branch and the `streak` / `lastDate` / `shieldUsedMonth` fields of `EngineInput` are gone — a loss-framed send is no longer *expressible*, and `app/api/cron/notifications/route.ts` no longer reads `ledger-focus-streak`. Nothing replaces it. `lib/focus-context.tsx`: `streak` and `shieldAvailable` removed from `FocusCtx` and from the provider value, so no consumer can render a counter. Counters and cliff copy deleted from `app/tools/focus-lab/page.tsx` (streak figure, "Streak shield … don't miss a day", "extend your streak"), `components/dashboard/masthead.tsx` ("N day streak" / "best N"), `components/dashboard/by-the-numbers.tsx` ("Study Streak … days running"), `components/dashboard/academic-markets.tsx` ("Current Streak"), `app/dashboard/page.tsx` (the `useStats` streak/best-streak read and the parent-share copy), and `app/parent/[code]/page.tsx` ("Study Streak … Just getting started"); `focus` is now absent from the parent `select`. **The `ledger-focus-streak` write is deliberately retained** — `lib/ledger-score.ts:77,106,218` reads it directly as the Consistency input, so deleting it would silently move every student's score, which M0 does not do. Deleting the term is **M14-2**, unchanged. Regression fences added at `tests/m0-integrity-fences.test.mjs`; the old "streak reminder fires" test in `tests/score-projection.test.mjs` is inverted to assert no send and no streak-framed copy in any state. **Implemented and verified; awaiting commit** |
| M0-7 | 2026-08-11 | — (uncommitted) | Unpayable point promises deleted from `lib/notifications.ts` and `lib/console/next-move.ts` — no surface states a score gain the system cannot pay. **Implemented and verified; awaiting commit** |
| M0-8 | 2026-08-11 | — (uncommitted) | `components/rank-whisper.tsx`, `components/legacy-chrome.tsx` and `app/api/awake-count/route.ts` deleted; no invented peer figure renders. **Implemented and verified; awaiting commit** |
| M0-9 | 2026-08-11 | — (uncommitted) | Fabricated `catch`-branch score deleted from `app/tools/grade-tracker/page.tsx`; a failed load now renders UNAVAILABLE, never `total: 100`. **Implemented and verified; awaiting commit** |
| M0-10 | 2026-08-14 | — (uncommitted) | The "recovery auto-clear" block deleted from `app/tools/exam-practice/page.tsx`: finishing a paper no longer walks `ledger-mistakes` setting `m.status = "cleared"` + `clearedDate` for any topic answered correctly twice, and no longer stamps `mistake_cleared`. Two correct multiple-choice clicks are not evidence, and the write was read downstream as if it were — `lib/ledger-score-v2.ts:195-206` pays `recovery` per 30-day clear, `lib/active-close.ts:74-75` corroborates an active day from `clearedDate`, and `lib/mistakes/migrate-legacy.ts:147` maps a legacy `cleared` to `acknowledged`, which the live scorer counts as faced. Capture is untouched: a new mistake still opens with `status: "open"`. No client path now moves a mistake out of `open`. **No new server infrastructure was built** — real resolution (retest, the 7-day cooling gate, the triple refusal of a client-set resolution) remains **M11-4 / M11-5**. Fenced in `tests/m0-integrity-fences.test.mjs`, including a repo-wide assertion that no file under `app/` or `components/` assigns a `cleared`/`resolved` mistake status. **Implemented and verified; awaiting commit** |
| M0-11 | 2026-08-11 | — (uncommitted) | One-click mistake-history destruction removed from `app/tools/post-exam/page.tsx`. **Implemented and verified; awaiting commit** |
| M0-12 | 2026-08-11 | — (uncommitted) | `dangerouslySetInnerHTML` removed from `app/tools/reference-builder/page.tsx`; regression fence added at `tests/reference-builder-render.test.mjs`. **Implemented and verified; awaiting commit** |
| — (disclosure) | 2026-08-11 | — (uncommitted) | Mistake-pillar "not yet scored" disclosure shipped as visible in-product copy (`components/mistake-pillar-notice.tsx`, dashboard, parent digest), closing Part E launch-checkpoint item 3. **Implemented and verified; awaiting commit** |
| M0-5 | — | — | **Relocated to M14-2** — not an M0 task |
| M1-1 | 2026-08-14 | — (uncommitted) | Migration ledger at `supabase/migrations/009_migration_ledger.sql`. **Supabase's native tracking was checked first and adopted, not duplicated:** the CLI writes `supabase_migrations.schema_migrations (version, statements, name)`, but this repo has no `supabase/config.toml`, no `supabase` dependency and no CLI call — every migration to date was pasted into the SQL editor by hand, which writes nothing, so the native table records none of 000–008; and the native row carries no checksum, so it cannot detect an applied migration being edited afterwards. 009 therefore creates that exact table under that exact name and extends it additively with `checksum`, `applied_at`, `recorded_by`, so a later `supabase db push` adopts a populated ledger rather than meeting a rival one (H.1.a). Read from CI through `public.migration_ledger()` — `SECURITY DEFINER`, `REVOKE`d from `anon`/`authenticated`, `GRANT`ed to `service_role` only, because PostgREST exposes `public` alone and the ledger must not become a public map of the schema. `supabase_migrations.record_migration()` is the per-migration recorder and **raises** rather than overwrites when a version is re-recorded with a different checksum. 000–008 are backfilled **from catalogue evidence, not from the existence of the files** — each row is guarded by `to_regclass` / `information_schema` probes for the objects that migration creates, so a migration whose objects are absent stays out of the ledger and is reported UNAPPLIED. **Not applied to any database** — writing the file is the repository's half; running it is the founder's. **Implemented and verified; awaiting commit** |
| M1-2 | 2026-08-14 | — (uncommitted) | CI gate at `.github/workflows/migration-gate.yml`, over `scripts/check-migrations.mjs` (I/O) and `scripts/migration-ledger.mjs` (pure comparison). Two jobs: `structure` (no network — filename shape, duplicate versions, empty bodies) and `ledger` (compares every file's sha256 against `public.migration_ledger()`). Four hard verdicts — UNAPPLIED, DIVERGENT (file edited after it was applied), ORPHANED (recorded version with no file), plus a WARN for checksum-less backfill rows. Checksum domain is the migration body up to the `-- >>> MIGRATION LEDGER REGISTRATION <<<` sentinel, CRLF- and trailing-whitespace-normalised, so a file can carry its own hash and Windows/Linux checkouts agree. **Done-when demonstrated, not asserted:** `tests/migration-ledger.test.mjs` — 24 tests, including *"A DELIBERATELY UNAPPLIED MIGRATION FAILS"*, which drops the newest migration from a full ledger and asserts the verdict is not `ok`; plus the edited-migration, orphan, empty-ledger and new-file cases. The runner was also executed locally: `--structure-only` exits 0 over the real 12-file set, and with no credentials it exits **1** rather than skipping, because an unreadable ledger is the T1 condition itself and a gate that passes there is not a gate. **The `ledger` job will be red until 009 is applied and `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` exist as repository secrets — that red is the first true reading of Finding A.5.a, not a defect.** The existing `test` workflow is untouched. **Implemented and verified; awaiting commit** |
| M1-3 | 2026-08-14 | — (uncommitted) | **Partially closed. The fallback is deliberately RETAINED and M1-3 is not done.** Investigation found the drift is worse than 004's: `app/api/cron/score-snapshot/route.ts` writes `score_history.active` on every daily close, and **no migration in this repository ever created that column** — 005 defines `score_history` without it and nothing between 005 and 009 alters the table. 004 at least held the SQL and the doubt was whether it had run; here the repo did not describe the deployed schema at all, and the sole record that the column should exist was a runtime `catch` branch (*"hand-run migration"*). `supabase/migrations/010_score_history_active.sql` now writes it down — `ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT FALSE`, a no-op where the hand-run `ALTER` landed and the fix where it did not; `DEFAULT FALSE` because backfilling `TRUE` would fabricate activity (`PRINCIPLES` §7). **The fallback is not deleted, because the repository cannot show that deleting it is safe:** whether production has the column is exactly what was unknowable, 010 has not been applied, and deleting the branch first would convert a tolerated missing column into a hard 500 on the daily close — the only writer of the score series. The route now carries the removal condition in code: delete the branch when `select * from public.migration_ledger() where version = '010'` returns a row. Fenced in `tests/migration-ledger.test.mjs`, which asserts the fallback still exists **and** that it names the migration that retires it. Going forward the M1-1/M1-2 machinery makes this class of drift structurally impossible — an unapplied migration fails CI before it can reach production — so the branch covers only the pre-ledger past. **Requires one human action against live infrastructure that this session could not perform.** |
| M2-1 | 2026-08-14 | — (uncommitted) | Capability manifest added to `lib/tools-registry.ts` (architecture P.2). All 46 entries survive with every navigation field intact; the file gains `status` (§1.2/§1.5), `tier` + `blurb` (absorbed from the deleted dashboard duplicate, M2-2), and a per-tool `ToolCapability` — `subjects`, `emits_events`, `emits_concepts`, `concept_resolution`, `joins_sessions`, `can_grade`, `emits_mistakes`, `consumes_personalisation`, `reports_results`, `ai_capabilities`, plus `writes_keys`, the measured list of localStorage keys each tool writes today. **`integration_level` and `persistence` are computed, not stored:** `deriveIntegrationLevel()` implements the P.3 table literally (L1 needs a concept-carrying view event; L2 adds session participation with tagged/proposed concepts; L3 adds `can_grade === "deterministic"` + a `QUESTION_*` event + `emits_mistakes`; L4 adds personalisation and a reported result), and `derivePersistence()` classifies `writes_keys` against `SCORE_INPUT_KEYS` / `SYNCED_KEYS`. No entry may state a level, and a test asserts none does. **Every derived level is 0 today** — the Academic Event layer is M7, so `emits_events` is empty for all 46; that is P.4's measured truth, not a stub, and a tool wired in M7+ rises without anyone editing a number (P.3.a). `persistence` reproduces P.4's five-tool finding from data: `exam-practice`, `syllabus`, `learn-lab`, `focus-lab` reach `academic_record`; 13 more are `saved_output`; the rest `none`. `SYNCED_KEYS` and `SCORE_INPUT_KEYS` are mirrored rather than imported (importing `lib/sync.ts` instantiates the Supabase browser client at module load) and `tests/tools-registry.test.mjs` asserts both mirrors against their sources, so drift fails the suite. **Implemented and verified; awaiting commit** |
| M2-2 | 2026-08-14 | — (uncommitted) | The hand-maintained `TOOL_CATEGORIES` literal deleted from `app/dashboard/page.tsx` (~80 lines). **It had already drifted:** it listed 45 tools, silently omitting `exam-day`, and carried its own titles, subtitles and tiers. Its two unique fields (`tier`, `desc` → `blurb`) moved into the registry so nothing was lost, and the dashboard now derives its catalogue from `NAV_CATEGORIES`. One list of tools exists in the repository. Fenced by a test that fails if the literal returns. **Implemented and verified; awaiting commit** |
| M2-3 | 2026-08-14 | — (uncommitted) | Navigation filtered to the ratified CORE register. **Four files import the registry**, and they split two-and-two by kind, which the change respects: the two *navigation surfaces* — `components/app-nav.tsx` (tools drawer) and `components/command-palette.tsx` (⌘K, which §1.4 names explicitly) — now read `NAV_TOOLS` / `NAV_CATEGORIES` and show 13 tools instead of 46; the two *lookups* — `components/split-view.tsx` (slug → title) and `components/tracker.tsx` (slug → category for analytics) — deliberately keep reading the whole register, because a non-core tool opened by direct URL must still render its real name and be attributed correctly. `app/dashboard/page.tsx` became a fifth consumer at M2-2 and is filtered with the navigation surfaces. **No route is deleted, moved or guarded:** `npx next build` emits all 46 `/tools/*` routes, and a test asserts a `page.tsx` exists for every registry slug and a registry entry for every directory. §2.5 — the `/dashboard/saved` link is removed from the dashboard quick-launch row; `/console/ai` was found to have **no link anywhere in the repository already**, so it needed no edit. Both routes still build and still resolve; a test asserts both facts. Reversing any classification is a one-word edit to `status` (§1.4). **Implemented and verified; awaiting commit** |
| M2-4 | 2026-08-14 | — (uncommitted) | `.slice(0, 10)` removed from `saveToHistory` in `app/tools/learn-lab/page.tsx`. The cap was on the persisted `ledger-notes-history` array, which **is** the score's coverage numerator (`lib/ledger-score.ts` counts distinct `notesHistory[].subject`), so a student past ten notes silently stopped accruing subject coverage (Finding A.3.e). Numerator now uncapped. **Overflow checked, not assumed:** the array renders only behind a collapsed "History (N)" toggle as a flat list with no measured height or virtualisation, so growth costs render time but cannot break layout; the write is inside `try/catch`, so an eventual storage-quota failure degrades to "this note did not save" rather than throwing. No cap was reintroduced. **Implemented and verified; awaiting commit** |
| M2-5 | 2026-08-14 | — (uncommitted) | **Partially closed — one of the four named components was a true duplicate, and the finding matters more than the count.** `CrunchTab` (`exam-practice` / `exam-triage`) was duplicated in full, differing only in six cosmetic details, and now has one definition at `components/tools/crunch-tab.tsx` with those six as optional props — defaults reproduce the exam-practice copy, exam-triage passes overrides, so neither host's output changes. `MindMapTab` and `ConceptConnectTab` (`learn-lab` / `reference-builder`) share an identical *engine* but have **diverged in presentation and in features**: learn-lab lays the mind-map input out as a `1fr auto` grid inside an 820px column and puts the result actions in a header row while reference-builder stacks the input and puts them below in the opposite order; learn-lab's Concept Connect takes two extra inputs (subject context, level) and sends them to the model. The identical halves are extracted — `Branch`, `MMNode`/`MapData` and `useMindMap()` to `components/tools/mind-map.tsx`, and `Connection` + the whole result panel to `components/tools/concept-connect.tsx` as `ConnectionBody` — and each host keeps only its divergent frame. Collapsing the frames too would change what one of the two hosts renders, which M2 forbids. `FormulaTab` is **not a duplicate at all**: `recall-studio`'s is an active-recall drill calling `formula_recall`, `reference-builder`'s is a formula-sheet generator calling `formula` and writing `ledger-formula-history`. They share a name and nothing else, so nothing was extracted and nothing should be. §1.5's LEGACY table entry for these four is inaccurate on three of the four rows and needs amending. **Implemented and verified; awaiting commit** |
| M3-1 | 2026-08-14 | — (uncommitted) | One shell at `/home` — `app/home/page.tsx` + `app/home/layout.tsx`. **The Console's NOW surface is what survived the merge, not the dashboard's**: it already answered §2.1's three beats in the primitives, and M3 is a structural consolidation with no licence to redesign. The score is **reused verbatim** — `computeLedgerScore()` called exactly as `/console` called it; `git diff` on `lib/ledger-score.ts` and `lib/ledger-score-v2.ts` is empty, so M3 moved no score. **One recommendation engine of the two, chosen on merit:** `lib/console/next-move.ts` over `components/dashboard/recommended-action.tsx` — it is ordered by what unblocks the most rather than by what scores the most, it carries the mistake branch the dashboard's version has no equivalent of, and it already refuses a figure where the mechanism that pays it does not exist (M0-7, Law 7). A test asserts `deriveNextMove` is called exactly once and that the dashboard surface is not also mounted; **no third engine was built — that is M20.** Redirects live in `next.config.mjs` beside the four existing tool redirects, `permanent: true`, which Next emits as **308** — the method-preserving permanent redirect, not literally 301. Both are exact-path (`^(?!/_next)/dashboard(?:/)?$`), deliberately: a wildcard would swallow `/dashboard/profile`, `/dashboard/saved`, `/console/ai`, `/console/analytics`, `/console/practice` and `/console/work`, none of which M3 merges. Both page files also carry a route-level `permanentRedirect("/home")`, so the merge does not depend on the config alone. **Implemented and verified; awaiting commit** |
| M3-2 | 2026-08-14 | — (uncommitted) | Exam-day absorbed as a **state** of Home. `lib/exam-day.ts` is new and holds what used to be module-private inside `app/tools/exam-day/page.tsx` — `getTodayExam`, `getGaps`, `mostMissedSubject`, `WINDOW_DAYS` — plus the proximity function. **Extraction, not deletion:** the route imports them back and is otherwise untouched, so `/tools/exam-day` still resolves and still behaves identically (§1.4's deletion gate, §2.3). `/home` computes `examProximity()` and renders `components/home/exam-day-panel.tsx` in-page when it fires; the student navigates nowhere to enter exam-day mode. **Proximity is two presence bands and never an absence signal** — `EXAM_DAY_PROXIMITY_DAYS = 1` (§2.2's "a paper is tomorrow", today included) and `EXAM_NEAR_DAYS = 7`, which mirrors `EXAM_RISK_WINDOW_DAYS` in `lib/parent-digest.ts` with a test asserting the two never drift. Both sources of a dated paper feed it: `user_data.exams` (what `/console` read) and `ledger-plan-v1` (what the route reads), so the state fires for exactly the students the route fires for today. A test asserts `lib/exam-day.ts` reads no inactivity, streak or last-studied signal — architecture M.5.4, the rule that stops promotion becoming a shame channel. **What was deliberately NOT absorbed, and is not claimed:** the ten-question AI sweep, the cold-start diagnostic, panic-triage's hour-by-hour planner and exam-triage's three tabs are all still reached by control from the panel rather than reimplemented on Home. Rebuilding an assessment flow is not a structural merge, and `/capture` and the assessment engine (M8, M10) own that surface. All three routes still resolve directly and are asserted to. **Implemented and verified; awaiting commit** |
| M3-3 | 2026-08-14 | — (uncommitted) | `app/dashboard/page.tsx` retired to a redirect stub — the 1,449-line second shell no longer exists. A test walks **every** `page.tsx` under `app/` and asserts none besides `/home` computes the score, with three named exemptions and their reasoning: `/tools/grade-tracker` (the breakdown *tool*, §2.4's Record destination, opened on purpose rather than landed in), `/parent/[code]` (a different audience, server-computed, governed by §9.2), and `/tools/learn-lab` (projects a *delta* for a note just saved — no total, no tier, no pillars). The criterion is read as being about competing shells, and that reading is written into the test rather than left implicit. **Three capabilities were the dashboard's alone and were moved, not dropped (§1.3):** `ExamSchedule` — the only writer of `user_data.exams`, which M3-2's proximity, the parent digest and the risk-alert cron all read — and `SharePanel`, the only minter of a `parentCode`, are now `components/settings/{exam-schedule,share-panel}.tsx` mounted on `/dashboard/profile` with `PushOptIn`; §2.2 puts exams, plan and parent access behind Settings, which is what that route becomes. Two copy corrections travelled with `SharePanel` and are corrections of **fact**: it described the parent view as showing "weak topics" (M0-2 removed per-topic counts from every parent surface) and the alert as firing on "streak breaks" (M0-4/M0-6 removed the inactivity alert; `computeRiskFlags` can only raise `examSoon`). A test fences both. **Disclosure — uncommitted work was overwritten in one file.** `app/dashboard/page.tsx` carried uncommitted M0-6 and M2-2 edits and was replaced by the stub before those edits were copied out, so the two moved panels were re-derived from `HEAD` with M0's corrections re-applied by hand. Both M0-6's and M2-2's *guarantees* still hold and are still tested — the file renders no streak counter because it renders nothing, and no catalogue literal exists anywhere — but the specific diff is gone. **Implemented and verified; awaiting commit** |
| M4-1 | 2026-08-14 | — (uncommitted) | Edge authentication added to `middleware.ts`; the decision extracted to `lib/auth-routes.ts` as a pure function so both directions are provable without a live Supabase project. **The rate limiter is untouched** — all ten `RULES` prefixes, limits and windows, the `CRON_SECRET` bypass, the 429 body and all four headers are byte-identical, and a test pins each of the ten as literal source text. The one structural change is that a request the limiter does not act on now falls through to the auth step instead of returning early; every `RULES` prefix is `/api/…` and no page route can match one, so the limiter's behaviour on every path it governs is unchanged. Matcher extended with `/home`, `/dashboard`, `/console`, `/tools`, `/onboard`, each bare and as `:path*` — the subpaths matter because M3's redirects are exact-path only and `/dashboard/profile`, `/dashboard/saved`, `/console/ai`, `/console/analytics`, `/console/practice` and `/console/work` still render student data. **Order verified:** `next.config.mjs` redirects run before middleware in the Next routing pipeline, so bare `/dashboard` is answered by the 308 and `/home` is what middleware authenticates — the correct order. `/parent/[code]` and `/admin` are deliberately NOT protected: neither is authenticated by a student session (share code · `ADMIN_KEY`), and gating them on one would break the first and weaken the second. `/api/*` is never redirected to a sign-in page. **Session transport moved onto cookies (2026-08-14, second pass):** `lib/supabase.ts` now uses `createBrowserClient` from the newly added `@supabase/ssr@0.12.4`, so the edge can finally see a real session; `components/auth-provider.tsx` migrates an existing localStorage session into the cookie store on first load, so no one is signed out by the change; `lib/supabase-server.ts` gains the cookie-reading, RLS-scoped `createStudentServerClient()` for M5; `lib/auth-routes.ts` was reconciled against the cookie shape `@supabase/ssr` actually writes (ref class widened to `[a-z0-9-]+`, and all **three** of 0.12's PKCE verifier keys excluded, chunked and not); both legal pages corrected. The whole chain was exercised against the real library — the adapter's own `setItem` driven over a stubbed `document.cookie`, and the names it produced fed to the compiled `authDecision()`: single-cookie session → allow, chunked `.0`/`.1` session → allow, verifier-only jar → redirect, post-`signOut` jar → redirect. **BUILT AND READY; enforcement deliberately left OFF pending one human browser verification — see the M4 note below for the exact checklist.** |
| M4-2 | 2026-08-14 | — (uncommitted) | `components/auth-guard.tsx` rebuilt around one rule: children mount from exactly one `return`, unreachable unless `user` is non-null. The two boolean reads become three named states — `pending`, `denied`, `allowed` — computed as `loading ? pending : user ? allowed : denied`, so there is no state in which a null user reaches `allowed`. A denied visitor now renders `null` instead of the old "Loading…" panel, which claimed work was happening on their behalf while they were being bounced (PRINCIPLES §7) and was the state a signed-out visitor spent the most time in. The redirect stays `replace` (Back must not re-enter a protected route) and is now keyed on `pathname` so a signed-out client-side navigation between protected routes re-fires it rather than stalling. **Kept, not removed**, and the reason is its four usage sites — `app/{home,tools,dashboard,console}/layout.tsx`: middleware runs per request and cannot see a token expiring mid-session on an already-mounted tool, and (decisively) edge enforcement is switched off today, so deleting this component would have removed the product's only auth gate. `/onboard` has no layout and was checked directly: its page already refuses to render for a null user and pushes `/auth`, which is the same guarantee; a test pins both. |
| M4-3 | 2026-08-14 | — (uncommitted) | `supabase/migrations/011_service_state.sql` creates `notification_state` and `parent_alert_state` — RLS enabled, **zero policies**, grants revoked from `anon`/`authenticated`, the `jobs` posture architecture R.2 already endorses. `user_data.notifState` and `user_data.parentAlerts` were documented "service-role writes only" while sitting in a row with a full `user_data_update_own` UPDATE policy (Finding A.5.e); both hold **deduplication** state, so a student clearing them from devtools re-opened the whole suppressed push backlog and could make an exam-risk email to their **parent** fire again. `app/api/cron/notifications` and `app/api/cron/risk-alerts` now read and write the new tables via `supabaseServer`, batched into one state read per run, and **a failed state read now fails the run** rather than degrading to `{}` — an empty state means "nothing sent yet", and acting on that is exactly the double-send this task exists to prevent. `notifState`/`parentAlerts` are removed from the `UserData` type: that type describes the row the student's own client reads and writes, and these fields are no longer part of it. `parentAlerts.inactivityAt` is deliberately **not** recreated — M0-4 removed the inactivity alert and `computeRiskFlags` can only raise `examSoon`. **New finding, same shape as 010's:** `notifState`, `parentAlerts`, `parentEmail` and `parentDigestEnabled` appear in **no migration in this repository** — not 000, not 004, nowhere. They are hand-run ALTERs that were never written down, which is Finding A.5.a / T1 again, and is why the copy step probes `information_schema` instead of assuming. **The migration was NOT applied to any database.** |
| M5-1 | 2026-08-14 | — (uncommitted) | `supabase/migrations/012_students_and_profiles.sql` creates `students` (architecture C.2 — `student_id` PK referencing `auth.users`, `created_at`, `deleted_at`, `data_region`, and deliberately nothing else, because C.2 records as a CURRENT FACT to keep verbatim that entitlement lives in `auth.users.app_metadata.tier` outside the student-writable row) and `student_profiles` (C.3 — identity `(student_id, version)`, an append-only chain carrying `effective_from`, `changed_by`, `change_reason`). **History is versioned structurally, not by convention:** there is no UPDATE path on a profile, a change is a new row at `version + 1`, and *"exactly one current version"* is a **partial unique index** (`student_profiles_one_current ON (student_id) WHERE is_current`) so two concurrent writers cannot both leave a live row — the second to commit is rolled back by the database. C.3's reason is quoted in the file: *"a board change retroactively reinterprets every prior event."* **RLS posture — SELECT ONLY.** Both tables enable RLS and carry a single `auth.uid() = student_id` SELECT policy each; there is **no INSERT, UPDATE or DELETE policy on either**, which under Postgres RLS denies all three by construction, and a `DO $$` verification block at the foot of the file raises if a non-SELECT policy is ever found. That is a deliberate step beyond the `007_mistakes.sql` posture (own-row SELECT + INSERT): writes go through two `SECURITY DEFINER` functions instead — `public.ensure_student()` (idempotent identity creation on first sign-in) and `public.set_student_profile()` (see M5-2). Section 6 backfills the existing flat `user_data` columns into version 1 of each chain, marked `changed_by = 'backfill:012'` so a derived row is never mistaken for an act by the student, guarded by a `to_regclass` probe for the reason `011` gives (several `user_data` columns were hand-run ALTERs the repository never described — Finding A.5.a, T1). `user_data.interests` maps to `student_profiles.subjects` because the retired onboarding asked *"Which subjects interest you?"* and stored the answer under a column named for the question; `student_profiles.interests` (non-curricular, per C.3) is left NULL rather than invented (§7). **Additive only** — the `DROP COLUMN` statements are written out commented at the foot, as `011` established. **The migration was NOT applied to any database.** |
| M5-2 | 2026-08-14 | — (uncommitted) | `lib/student-context.ts` — one server-side `getStudentContext()`, built on `createStudentServerClient()` (the anon-key, cookie-reading, RLS-scoped client M4-1 added *for this*), taking identity from `auth.getUser()` and **never from an argument**, so a caller cannot ask it about somebody else. It is wrapped in React's `cache()` — a real per-request memo replacing the hand-rolled three-second TTL map — and it **only ever reads**; a test asserts the module contains no `.insert(`, `.update(`, `.upsert(` or `.delete(`. The precedence rule is extracted to `lib/student-profile.ts` as a pure, import-free module (the `lib/auth-routes.ts` pattern), so *"localStorage no longer outranks Postgres"* is provable in both directions with no Supabase project in reach. **The two defects named in the task, and what closed each.** (a) `lib/user-data.ts:123` returned `{ ...(data as UserData), ...localProfile }` — architecture C.3's CURRENT FACT, *"localStorage wins over Postgres"*, and the reason `buildProfileContext` received client-supplied values (Finding A.6.b). It now calls `resolveProfile()`, which decides **field by field**: the server value wins wherever the server has one, the cache may only answer a question the record left blank, and `""`/`[]` count as blank so an abandoned half-answer cannot outrank a real value. (b) `lib/user-data.ts:139-142` — `patchUserData` loaded the whole row and spread it back through an upsert. Three distinct losses came out of those two lines and all three are named in the file: concurrent writes to *different* fields silently reverted each other (`ExamSchedule` saving `exams` against `SharePanel` saving `parentCode`, with no error to either); the row written back was **up to three seconds stale** because the read went through the dedup map; and it **laundered localStorage into Postgres**, since the value it spread came from the merge in (a). `patchUserData` is now one field, one column, no read — so there is no window between a read and a write in which anything can be lost. The genuine profile write path is `saveStudentProfile()`, which calls `public.set_student_profile()`: that function resolves the writer from `auth.uid()`, takes `FOR UPDATE` on the caller's `students` row so concurrent calls **serialise**, and reads-then-appends `version + 1` inside that one transaction, with NULL meaning *carry forward* and an explicit `p_clear` list meaning *set NULL* — because "unset" and "unchanged" must be distinguishable, and a merge that cannot tell them apart is how the old code lost data. **It dual-writes on purpose and that is temporary:** `012` is unapplied and every existing reader (`app/home`, `components/app-nav`, `lib/ai-fetch`, `/tools/learn-lab`) still reads the flat columns, so the flat write happens first and the version append follows where the function exists; the RPC's error is swallowed only while that is true. `getStudentContext()` likewise carries a legacy fallback that reports `source: "user_data_legacy"` rather than degrading silently, and names its own removal condition in code — `select * from public.migration_ledger() where version = '012'` — the same discipline M1-3 wrote into the score-snapshot cron. **`getStudentContext()` has no call sites yet**: nothing server-renders student data until the M4-1 enforcement flag is verified, and S.5's `buildProfileContext` rewiring is an AI-boundary row, not an M5 one. |
| M5-3 | 2026-08-14 | — (uncommitted) | `app/onboard/page.tsx` rebuilt from a nine-screen wizard (`TOTAL_DATA_STEPS = 8`, plus welcome and done) to **one screen with two questions**: board, and subjects. `PRODUCT_DECISIONS` §2.6 — *"Board and subjects, one screen. The ceiling is three questions"* — and §3, *"`/onboard` — Board and subjects. Nothing else."* **Two, not three:** the ceiling is a limit, not a budget, and both ratifying sections name the same two. Grade, stream, target exam and the learning/communication style pair are **not asked** — every one is editable in Settings (§2.2) and none gates the first screen a student sees. The step index, the progress bar, the "N of 8" counter, the back button, the syllabus-upload step and the congratulations screen are all gone: §2.6 bans the tour and the checklist by name, and a step counter is a checklist with a progress bar attached. Completion is **derived** (`isOnboarded()` — board present and at least one subject) rather than read from a stored `onboardingDone` flag that could disagree with the profile it describes; the legacy flag is still honoured for accounts that predate M5. The subject list is deliberately the same twelve values the retired flow offered, so `012`'s backfill and a fresh selection produce one vocabulary rather than two. **The routing gap is closed at both doors, because it was never one missing redirect.** Architecture S.6: *"signup never leads to `/onboard`, so profile is empty and personalisation silently no-ops (R.1)."* Signup ended at the "check your email" screen and stopped; the student then returned, signed **in**, and sign-in went to `/home` — so `/onboard` was reachable only from the landing page's two CTAs and a student arriving by any other door never saw it. Now: a signup that returns a session (email confirmation off) goes straight to `/onboard`; a signup that does not still shows the confirmation screen, because it is the honest state and skipping it would strand the student on a screen they cannot act on; and **sign-in now routes anyone who has not declared a board and subjects to `/onboard` first**, which is what catches the confirm-by-email path. The Google OAuth flow, the password-reset flow and the confirmation copy are untouched, and tests pin all three. |
| M5-4 | 2026-08-14 | — (uncommitted) | Sign-in path added to `app/page.tsx`. S.6 recorded the page as having *"three `href`s total (`/onboard` ×2, `/legal/terms`); no sign-in […] a returning user has no way in."* Two links to `/auth` were added and nothing else: *"Already have a record? Sign in"* under the hero CTA — above the fold, so a returning user does not scroll eight sections to find the door — and *"Sign in"* inserted into the existing colophon line. **No stylesheet rule was added and no visual identity changed:** both reuse `.colophon`, which already carries the instrument face, the micro size, the `--g-6` tone, and hover plus `:focus-visible` on the anchor inside it (§6.6), so the page's colour law (*"colour is earned — two instances on the entire page"*) is untouched. `app/landing.css` was not opened. A test asserts the eight sections, both *"Start your record"* CTAs, the thesis line and the Terms link all survive unchanged. |
| M6-1 | 2026-08-14 | — (uncommitted) | `lib/concepts.ts` — the first production importer of `lib/taxonomy/build.ts` and `lib/taxonomy/cbse-physics.ts`, which had **zero** until now (architecture T12, *"dark code decays"*). It builds the tree with `buildTaxonomy()`, runs `validateTaxonomy()` on it and **throws** if it fails — orphans, cycles, duplicate ids and duplicate board codes make concept identity *wrong* rather than missing, and a product whose concept ids are wrong records mistakes against the wrong concept forever. Read side over the `concepts` table — `listConcepts()`, `getConcept()` (merges already followed), `listAliases()`, `conceptResolutionContext()`, `verifySeedAgainstDatabase()` — through `createStudentServerClient()`, the anon-key RLS-scoped client M4-1 added, never through `supabaseServer`: 007's RLS is already correct for this (`:322-324`, globally readable, service-role writable) and reading the taxonomy as the caller is both sufficient and the posture that survives a curated concept later needing a permission the seed does not. **It never writes** — a test asserts the module contains no `.insert(`, `.update(`, `.upsert(`, `.delete(` or `.rpc(`, because a write path from application code is how a curated company asset becomes user-generated content — and it owns no per-student state (B.4: *"Must NOT own … Mastery"*), asserted by the absence of `student_id`, `mastery`, `accuracy` and `auth.uid` in the source. **The seed became a migration.** `scripts/build-taxonomy-seed.mjs` previously emitted `supabase/seed/001_concepts_cbse_physics.sql`, which no tooling could see: M1 built a ledger because *"which migrations are applied is unknowable"* (T1), and a 76KB seed outside `supabase/migrations/` has that identical problem one level down — nothing could answer *"does the `concepts` table have rows?"*, and M6-1's done-when is worthless if the table the importers read is empty and unverifiably so. It now writes `supabase/migrations/014_concepts_cbse_physics_seed.sql`, numbered, checksummed with the same `checksumOf()` the CI gate uses, and self-registering, so `check-migrations.mjs` reports it UNAPPLIED until it is run and DIVERGENT if the syllabus changes without a re-seed. The old unregistered artifact was deleted, not duplicated. 316 rows: 1 subject · 28 chapters · 80 topics · 207 leaves. **Scope boundary, stated rather than assumed:** B.4's outputs are *"`concept_id` resolution for events, sessions, assessments, mistakes, coverage and search"* — every one of which is a later milestone (M7, M9, M10, M11, M12, M23). Building a consumer here would be building M7 early on a substrate the plan forbids, so no UI, no tool page and no existing surface was wired. `lib/concepts.ts` has **no call sites yet**, which is the same intended shape as M4-1's `createStudentServerClient()` and M5-2's `getStudentContext()`. **Neither migration was applied to any database.** |
| M6-2 | 2026-08-14 | — (uncommitted) | `supabase/migrations/013_concept_identity.sql` adds exactly the two columns architecture C.2 names as TARGET DESIGN: `merged_into UUID REFERENCES concepts(id) ON DELETE RESTRICT` (matching 007's existing `parent_id` posture) and `taxonomy_version INTEGER NOT NULL DEFAULT 1 CHECK (>= 1)`. **007 is not touched** — a test asserts the string `merged_into` never appears in it — because editing an applied migration is precisely the drift M1 exists to prevent: the ledger records *"this exact text was run"*. **Why a pointer rather than a rewrite, which is the whole of the done-when.** Occurrences, patterns and (from M7) every academic event address concepts by id. If a merge deleted the loser and repointed its references, the record would be rewritten retroactively — `PRINCIPLES` §3.2, *"facts are immutable and never deleted; a correction appends a superseding fact rather than editing history."* With a pointer, a 2026 occurrence keeps pointing at the concept it was actually recorded against and resolution follows the pointer forward at read time: nothing about the past changes, only what the present calls it. `concepts_merge_not_self` makes self-supersession unrepresentable, since one bad write would otherwise be an infinite loop for every reader forever. **Resolution is MULTI-HOP.** Nothing in B.4 or C.2 restricts a merge to one, and a second merge of an already-merged concept is an ordinary curation event; `resolveMergeChain()` walks A→B→C to C, bounded at 16 hops (`build.ts`'s own depth cap), and **refuses a loop rather than following it** — `status: 'cycle'`, which the resolver surfaces as `unresolved`, never as a superseded id. Proven by test, not by reading: single hop, multi-hop landing on C and *not* B, zero hops for a live concept, a two-node loop, a 40-long chain past the cap, a dangling pointer, an alias on a merged concept following the pointer, and the load-bearing one — *"an old id still resolves after its concept merged"*, which is the history guarantee stated as an assertion. `013` also carries a `DO $$` verification block that raises if either column is absent or a non-SELECT policy exists on the new table. **Not applied to any database.** |
| M6-3 | 2026-08-14 | — (uncommitted) | `lib/concept-resolution.ts` — **imports nothing**, the same discipline as `lib/auth-routes.ts` and `lib/student-profile.ts`, so the tier ORDER is provable with no Supabase project in reach. Four tiers in one order, each stopping the search: a **board code** (an exact match on the identifier rather than the label, tried first because a code cannot mean anything else), then **exact** on the normalised name, then **alias** against admitted `concept_aliases` rows, then **semantic**. One normalisation function serves all of them — NFD accent folding, apostrophes deleted rather than split (`Newton's` ≡ `Newtons`), `&` → *and*, everything else collapsed to single spaces — and it is deliberately **not** `build.ts`'s `slug()`, which builds identity and must stay byte-stable forever; a test pins them as different functions so that tuning a comparison can never re-issue every concept id in the record. **"Semantic" here is lexical, not embedding-based, and that is a decision rather than an omission.** B.4 names the third tier *"embedding similarity above a threshold"*; an embedding is a model call, every model call belongs to the typed capability boundary (Part Q / **M15**), and putting an unversioned, unprovenanced model call underneath concept identity — the one thing every event, session, assessment, mistake and search addresses — would be building the AI boundary early and badly. B.4 also requires resolution to be **deterministic**: a lexical score is reproducible forever from the text alone, an embedding only against a pinned model, and a model swap would silently re-resolve history. The score is `max(token-set Dice, normalised Levenshtein)` — max rather than average, because each measure is blind where the other sees (word order versus a typo inside one word) — accepted only above `SEMANTIC_THRESHOLD = 0.82` **and** clear of the runner-up by `SEMANTIC_MARGIN = 0.05`. The contract is stable: a similarity source may later be substituted behind `matchedVia: "semantic"` without any caller changing. **THE LEGAL UNRESOLVED STATE.** `{ status: 'unresolved', conceptId: null, declaredText }` where `declaredText` is the student's words **byte-for-byte** — never trimmed, never cased, never rewritten — with a typed reason (`empty`, `no_candidates`, `below_threshold`, `ambiguous`, `merge_cycle`, `merge_dangling`) and the best score reached, so a curator can see how close it came. It is an expected outcome, not an error: the function **never throws**, so no caller has a reason to guess in a `catch`. V.2.4 is asserted directly — *"and the thing about wobbling tops"* against the real 316-row tree returns `conceptId: null` with the text intact. **Ambiguity is refused, and refused where it is found:** two candidates sharing a surface form produce `unresolved / ambiguous` and do **not** fall through to a weaker tier, because a weaker tier answering what a stronger tier found genuinely ambiguous is guessing with extra steps. The order is proven by construction rather than by reading — each test is built so a wrong order returns a *different concept id*: an alias deliberately collides with another concept's exact name (exact wins), and a curated alias deliberately competes with a lexically closer typo candidate (alias wins). The alias tier's storage is `concept_aliases` in `013` — a table, not a `TEXT[]`, because an alias carries its own provenance and admission time (B.4: *"AI may propose … a human/curation step admits it"*), because `normalised` must be uniquely indexable across rows so a duplicate surface form is refused at write time rather than discovered as a read-time ambiguity, and because the seeded tree is regenerated wholesale by `014` and aliases must survive that. RLS is SELECT-only and only over **admitted** rows: a pending proposal is curation state, not published vocabulary. **Not applied to any database.** |
| M7-1 | 2026-08-15 | — (uncommitted) | `supabase/migrations/015_academic_events.sql` — `academic_events`, the Part D envelope column for column, plus `academic_event_quarantine`. **Additive only; it alters nothing that exists and does not touch `user_data.blob`.** **Ordering is structural, not conventional.** `seq` is not `BIGSERIAL` and has no `DEFAULT`: a `DEFAULT` is overridable by any INSERT that names the column, so `seq`, `event_id`, `received_at` and `clock_skew_ms` are assigned by a `BEFORE INSERT` trigger that overwrites whatever the caller supplied — service role included. There is no INSERT statement, in any language, that can choose its own position in the stream, which is what R.10's *"ordering by server `seq`, never client `occurred_at`"* requires. `occurred_at` is deliberately **not** overwritten — it is the client's claim and D.1.b keeps it — but a claim more than a day in the future raises, because that is a clock fault, not a claim. `clock_skew_ms` is retained so the IST/UTC day-boundary bug `lib/active-close.ts` documents is diagnosable rather than silent. **The partitioning key is HASH (student_id), and that is a correction to the plan's implied scheme, argued in the file's header.** M7-7 says *"monthly partitioning"*; PostgreSQL can only enforce a UNIQUE constraint on a partitioned table if the constraint contains every partition key column, so `PARTITION BY RANGE (received_at)` would demote the R.10 dedup constraint to `UNIQUE (student_id, client_event_id, received_at)` — under which an offline outbox retrying across a month boundary inserts a **duplicate** and T7 returns in full. `PARTITION BY HASH (student_id)` keeps `UNIQUE (student_id, client_event_id)` globally enforced, and is the right key on its own merits: every read path filters by student first and no stream is split. 8 partitions; the count is a labelled capacity guess. **What this leaves for M7-7 is therefore re-opened, not deferred:** subpartitioning by month re-breaks the same constraint one level down, and D.5's actual retention mechanism is *compaction* — a delete of selected raw rows — which needs no time partition at all. Append-only is enforced three ways: no UPDATE or DELETE policy (an omitted policy denies by construction), a `REVOKE UPDATE, DELETE` grant, and a `BEFORE UPDATE` trigger that raises even for the service role. RLS is SELECT-own plus INSERT-own — the posture 007 already gives `evidence`, `patterns` and `occurrences` — with the INSERT policy's `WITH CHECK` narrowing `source` to `tool`/`student_declaration`, and table CHECKs refusing `MISTAKE_RESOLVED`, `MISTAKE_RECURRED` and the `SESSION_*` types from anything but `system`. That is D.2.a's *"three independent refusals of the single most gameable transition"* made four. The file ends with a `DO $` block that raises if the table is not hash-partitioned, if there are not 8 partitions, if the dedup constraint is missing, if the server-assign trigger is absent, or if any UPDATE/DELETE policy exists. **Not applied to any database.** |
| M7-2 | 2026-08-15 | — (uncommitted) | `app/api/events/route.ts` (the endpoint), `lib/event-contract.ts` and `lib/event-ingest.ts` (the decision, pure), `lib/events.ts` (the I/O). The split is the M4 `lib/auth-routes.ts` pattern for the reason M4 states: the done-when is a property of a decision, and a decision with no I/O is provable with no database in reach (U.3). **D.3's pipeline in order.** Authenticate through `createStudentServerClient()` + `auth.getUser()`, so `student_id` comes from the verified session and the body's opinion is never consulted (D.1.a) — a test asserts the route contains no `body.student_id`. Reject any of the six † fields *present*, rather than stripping them, because stripping lets a client that believes it set `student_id` succeed silently against a different stream. Reject unknown envelope fields. Validate the type and the D.2 payload core, versioned by `schema_version`. Check reference **shape** here and reference **ownership** in the data layer, since "does this `assessment_id` belong to this student" is a database question. Enforce the D.3.4 registry gate against the real capability manifest — `toolBySlug().emits_events` — which today is `[]` for all 46 tools, so **every tool-sourced event is currently refused, and that is the boundary working**: a tool starts emitting when a later milestone edits its manifest, which raises its derived `integration_level` in the same edit, so capability and permission cannot diverge (P.3). Then the payload and per-minute caps (D.3.7), then `session_id` — the *only* server-side mutation of the envelope (D.3.8), `null` until E.4's resolver exists in M9. **Dedup is `ON CONFLICT DO NOTHING`, not SELECT-then-INSERT.** `upsert(…, { ignoreDuplicates: true })` returns zero rows on a conflict; the follow-up read returns the existing `event_id` and the caller is told **success**. A SELECT-then-INSERT has a window in which a second tab inserts, and closing that window is the whole of D.3.6's *"retry-safe by construction"*. **Quarantine is a real, queryable destination, and there is no fourth outcome.** The decision function returns `append` or `quarantine` and nothing else — proven over seven hostile bodies including `null`, a bare string and `{}`. A quarantined event stores the raw body **verbatim**, every problem that refused it (not the first — a single error turns a diagnosis into archaeology), and the student can `SELECT` it, exactly as `ingestion_review` lets them see *"what the pipeline refused to guess"*. It is answered with HTTP **200** and `outcome: "quarantined"`, because the request succeeded and a 4xx would tell an outbox to retry forever an event that will never become valid; the one honest exception is `outcome: "unavailable"`, reported when the quarantine table itself could not be written, so the client keeps the record pending rather than believing a refusal that was never stored. **Not wired to any tool or surface.** |
| M7-3 | 2026-08-15 | — (uncommitted) | `lib/event-outbox.ts` — pure, storage-adapter-injected, and the T7 mitigation is **structural**. Three properties, each asserted rather than described. (1) `client_event_id` is a pure function: `sha256` over canonical JSON (`stableStringify` from `lib/ingest/hash.ts` — this is that module's first production importer, one more T12 retirement) of the whole draft plus the record's nonce, prefixed `e1_` so the derivation is itself versioned. (2) The nonce is drawn **once, at enqueue, and persisted with the record**; it is never re-drawn, so a retry recomputes the identical id by construction — and two byte-identical drafts still get different ids, because a student may legitimately view the same concept twice and content-only hashing would silently swallow the second. (3) `enqueue()` **writes to the store and only then returns**; a test observes the write, its contents and `attempts: 0`, so "persisted before the first attempt" is an observation and not a claim. `markAttempt` increments a counter and touches nothing else, and the internal mutation helper **throws** if any mutation changes `client_event_id` — the invariant is checked once, centrally, rather than trusted in each caller. **The load-bearing test is the T7 scenario played out:** enqueue → flush → the sender throws (the train goes into a tunnel) → a *fresh* outbox is constructed over the same persisted bytes with a *deliberately different* nonce source (i.e. the tab closed and reopened) → the pending record's id is byte-identical to the original and its nonce is unchanged. A second test closes the loop end to end against a table keyed the way 015 keys it: three submissions of the same envelope produce one row and two `duplicate` answers with the same `event_id`. `toEnvelope()` builds the POST body by **naming** the 21 client-supplied fields rather than deleting the six server-assigned ones from a spread — an allowlist fails closed where a denylist a future edit forgets to extend fails open — and `assertNoServerFields()` checks the result anyway. A corrupt stored blob yields an empty outbox rather than a throw, and fabricates nothing. **Deliberately not built:** a scheduler, a backoff policy, a service worker or an IndexedDB queue. This is the contract — store, id, lifecycle, envelope — plus `flushOutbox()` composing it with an injected sender. No timer lives here and nothing mounts, because no tool emits yet. |
| M7-4 | 2026-08-15 | — (uncommitted) | `lib/audit.ts` + `supabase/migrations/016_audit_entries.sql`. **A separate migration from 015, on the same reasoning 013/014 used to split schema from seed:** the two fail differently and must be re-runnable apart, and 016 is the tamper-evidence layer for the *whole* product — corrections, exports, parent reads, deletions, score restatements, compaction — which audits `academic_events` only incidentally. O.6's own argument is that the audit trail must predate what it audits, so tying its deployment to the event table's would be backwards. It is 016 rather than 015b because it is a peer, not a subset. **The reading of `before_hash`/`after_hash`, stated so it can be disagreed with deliberately.** C.2 names the columns; O.6 gives the purpose — *"so tampering is detectable"*. Read as hashes of the target row's state they do not deliver it (an attacker edits the row and both hashes and nothing is inconsistent). Read as a **chain** — `before_hash` is the previous entry's `after_hash`, `after_hash` covers this entry's content *including* `before_hash` — they deliver it exactly. The chain reading is implemented; the target row's own state travels in `details`, where the chain covers it. **Two independent detectors, because each catches what the other misses**, and both are proven: editing an entry trips `CONTENT_TAMPERED`; editing it *and* recomputing its own hash trips `BROKEN_LINK` at the **next** entry. Deletion, reordering, mid-chain insertion and front truncation are each asserted, as is the claim that every one of the nine content fields is inside the preimage — a field outside it is a field an attacker may edit freely. **The hash is computed in TypeScript and never recomputed in SQL** (two implementations of one canonicalisation is M1's drift, one level down); what the database does instead is independent — `append_audit_entry()` refuses an insert whose `before_hash` is not the current tip, under a transaction-scoped advisory lock, and `before_hash` carries a UNIQUE index so the chain cannot fork. So a forger may forge a hash but not a *position*. Append-only is enforced three ways per O.6: policy omission, `REVOKE UPDATE, DELETE … FROM PUBLIC, anon, authenticated, service_role`, and a `BEFORE UPDATE OR DELETE` trigger that raises. Student SELECT is scoped to entries naming them; system-wide entries (`student_id IS NULL`, e.g. a compaction run) are not student-visible, because they describe other students' data too. **How much wiring belongs in M7, judged rather than assumed.** Every subsystem O.6 enumerates is a later milestone — corrections and exports M18, parent reads M17, restatement M14, compaction M7-7 — so M7-4 is overwhelmingly the *mechanism*, which is exactly what *"starting it later leaves a hole at the point of maximum change"* asks for. It ships with **two live call sites that M7 owns outright and that fall inside O.6's own categories**: `event_superseded` (an `EVENT_SUPERSEDED` ingest **is** a correction, and C.2 makes it the only edit the record permits) and `event_quarantined` (a refusal that nothing else in the product would ever show happened). **A normal append is deliberately not audited** — `academic_events` *is* the record, and one audit row per event would double the stream to restate it and make the chain the largest table in the database. `AUDIT_ACTIONS` already names the later milestones' actions, so each arrives as a call, not a schema change. `writeAuditEntry()` **never throws**: losing the academic act because the note about it could not be written is strictly worse than losing the note. **Not applied to any database.** |
| M7-5 | 2026-08-15 | — (uncommitted) | `supabase/migrations/017_legacy_blob_freeze.sql` + `lib/legacy-backfill.ts`. **`legacy_blob` is a WRITE-ONCE COPY, not a rename of `blob`, and that is a correction to the task's implied reading argued in 017's header.** Two independent reasons. (1) `blob` still has six live server-side readers — `cron/score-snapshot`, `cron/risk-alerts`, `cron/notifications`, `cron/weekly-report`, `send-parent-digest` and `parent/[code]` — all deriving the shipped score through `scoreInputsFromBlob()`; a rename stops every student's score moving on the day it runs, which is the Return beat (§7.1) deleted in exchange for a tidier column name. (2) **A frozen archive must be a SNAPSHOT or the backfill's idempotency is a lie**: reading a column live code keeps writing means a second run reads different bytes and emits different events. So 017 adds `legacy_blob`, `legacy_blob_frozen_at`, `legacy_backfill_at`, `legacy_backfill_events`; copies `blob → legacy_blob` under `WHERE legacy_blob IS NULL` (the whole of the idempotency — a re-run finds no rows); and freezes it three ways, the posture 015/016 established — a `BEFORE UPDATE` trigger that raises if `legacy_blob` or `legacy_blob_frozen_at` changes once set, a **column-level** `REVOKE UPDATE (legacy_blob, …)` (M19-2's mechanism: refused by the database, not by policy), and no write path in the repository, asserted by a test that looks for `legacy_blob` inside an `upsert`/`insert`/`update` payload rather than merely mentioning it. The trigger is deliberately narrow — `user_data` is live and half the product writes to it, so it refuses exactly one thing: changing an archive already taken. **`blob` itself is NOT frozen, and 017 §5 says so rather than implying otherwise**, with its drop condition stated (M12 + M14 cut over + §2 complete). **The backfill's mapping is one type, and the argument is the milestone's hardest call.** Every backfilled row is `EXTERNAL_STUDY_DECLARED`. Mapping `ledger-mistakes → MISTAKE_DETECTED` and `ledger-papers-log → PRACTICE_COMPLETED` is wrong twice over: `MISTAKE_DETECTED` requires `payload.occurrence_id` while `occurrences.evidence_id`/`concept_id` are `NOT NULL` (T2; `lib/mistakes/migrate-legacy.ts` reached this first and refuses to fabricate), and **both types are in `EVIDENCE_BEARING_TYPES`**, so importing pre-epoch claims that way lets data with no evidence behind it move a score — §3.2 failing where it matters most. What every legacy row actually is, without exception, is something a student typed into localStorage about their own academic activity with no evidence attached, before an evidence pipeline existed; D.2 has exactly one type for that, and D.2.b makes it load-bearing — *"deliberately not E … it moves no score dimension by itself."* §3.5 states the same rule forwards: *"a claim is recorded as a claim … we trust the student about what they studied, and never about whether they learned it."* **Four independent marks, so the seam survives a careless reader:** `source = 'migration'` (015's RLS `WITH CHECK` narrows `authenticated` to `tool`/`student_declaration`, so a backfilled row is one no client could have written — separable with a `WHERE`); `confirmation = 'unconfirmed'`, which does the actual work because D.1.d says no downstream subsystem may treat it as evidence, so *"never presented as verified"* is enforced by every projection rather than remembered by its author; `confidence = null`; and `metadata.backfill` + `legacy_epoch_ms`. `LEGACY_EPOCH_MS = 2026-08-15` is `RECOVERY_EPOCH_MS`'s sibling in the same form — deliberately a **separate** constant, because that one governs which mistakes are clearable and this one which events are verifiable, and collapsing them would make a change to either silently move the other; a test asserts `RECOVERY_EPOCH_MS` is byte-unchanged. **Idempotency is structural, not procedural:** `client_event_id` is a pure function of (student, source key, item identity) over the frozen archive, so `UNIQUE (student_id, client_event_id)` plus `ON CONFLICT DO NOTHING` absorbs the second run — there is no "have I run yet" flag in the decision path, because a flag can be wrong and a derivation cannot. **This is the deliberate inverse of `lib/event-outbox.ts`**, which mixes a nonce in so two identical drafts get different ids; a backfill must collapse and an outbox must not, and the contrast is written into the header so copying one into the other cannot happen silently. A test replays both runs against a table keyed the way 015 keys it: the second inserts **zero**. **Lossy in named places, documented rather than papered over:** a pre-epoch `status: 'resolved'` is carried verbatim in `payload.legacy.original` and never read as a resolution (§3.1 — a student may never mark their own mistake fixed); `category` is not mapped to an error class (V.4.9 refuses an ambiguous classification); `concept_id` stays NULL with `declared_text` preserved (V.2.4's legal unresolved state); `score`/`total` are not written to `result`, because reading a self-reported mark as an outcome is how a claim becomes evidence without passing through assessment. **A missing date is marked `occurred_at_unknown`, never invented**; a date after the seam is clamped to it with the original kept. `BACKFILLED_KEYS` ∪ `REFUSED_KEYS` is asserted to partition `SYNC_KEYS` exactly, each refusal carrying a stated reason — so the streak (§4.2), the v2 proof checks, the syllabus and the planning keys are refused *on the record*, and a key added to the sync layer later cannot slip through unconsidered. **Not applied to any database, and not run.** |
| M7-6 | 2026-08-15 | — (uncommitted) | `lib/sync.ts`, `lib/sync-merge.ts` (new), `components/sync-manager.tsx`, `components/auth-provider.tsx`. **Both named defects are deleted outright.** (1) `pushToCloud()` is gone — an *unconditional* upsert of all twenty synced keys every 15 seconds, which re-wrote the whole record hundreds of times an hour to capture identical bytes. (2) `lib/sync.ts:67`, `if (!local || value.length > local.length)`, is gone. **A longer string is not a newer fact.** That line adjudicated between two versions of a student's academic record by counting characters: a stale device with more entries silently overwrote a corrected device with fewer, and a deletion could never propagate — the shorter side always lost, by construction, forever. Law 7 failing in four tokens, because the ordering it invents does not exist. **What replaced it is `hydrateAbsentOnly` in `lib/sync-merge.ts` — fill, never adjudicate.** The cloud copy may write a key this device does not have and may never choose between two that both exist; that is M5-2's `resolveProfile()` rule one layer down (*"the cache may only answer a question the server left blank"*). The three alternatives are rejected in the file's header rather than left unconsidered: `updated_at` is per-row not per-key, so last-write-wins would be the same invented ordering with a better name; cloud-always-wins has no authority here because both copies are written by the same client; merging without per-item identity manufactures duplicates, which D.4 forbids. Neither copy carries a per-key timestamp, so there is **no honest basis** on which to prefer one, and the honest answer to an unanswerable question is to not answer it. It lives in its own I/O-free module because `lib/sync.ts` instantiates the Supabase browser client at load — the same split M4, M6 and M7-2 each made, and it makes the rule provable against fixtures, including the exact case the deleted line got wrong (a corrected local record with fewer entries against a stale longer cloud one). **`components/sync-manager.tsx:7` and `:42-45` are deleted** — the `PUSH_INTERVAL_MS` constant, the `setInterval` and the `intervalRef` — and replaced by `visibilitychange → hidden` plus `pagehide`. `pagehide` rather than `beforeunload`: `beforeunload` does not fire reliably on mobile Safari or when a backgrounded tab is discarded, which is the platform a sixteen-year-old is holding. The residual exposure — a foreground crash losing the session's unflushed keys — is stated in the file rather than implied away; it existed under the timer too, bounded at 15 seconds, and the honest fix is M9's session events landing as they happen, not a shorter timer. **THE ONE THING THIS TASK COULD NOT FINISH, AND WHY DOING SO WOULD HAVE BEEN WRONG.** `flushLegacyBlob()` still writes `user_data.blob`, and it is a **narrow, explicitly-scoped, dated compatibility shim**. Every caller was read: `app/layout.tsx` mounts the manager; the manager and `auth-provider` are the only importers, asserted by a test that walks `app/`, `lib/`, `components/` and `hooks/` and fails on an unlisted one. The blob's **six live server-side readers** all derive the shipped Ledger Score through `scoreInputsFromBlob()`, and the event substrate cannot feed any of them: every manifest still declares `emits_events: []` (M8+), there are no projections (M12), and no event-derived score (M14). Deleting the writer would have frozen every student's score at the last byte written — *"the only reason a student comes back tomorrow"* (§7.1) — and S.1's own verdict is **DELETE *after backfill***, not delete first. So the shim is narrowed in four ways the deleted function had none of: it writes **only when a stable hash of the payload changed** (a no-op session writes nothing); it is called from exactly two moments and **no timer**; it reports which keys it carried, split `academic` / `device`, so *"what still writes the academic record"* is an exported constant (`ACADEMIC_KEYS`) rather than a grep; and it never touches `legacy_blob`. Its removal condition is written into the file — M9/M10 emitting, M12 projecting, M14 cut over — the one-way-door convention M1-3, M5-2, M6-1 and `lib/events.ts` each wrote into their own fallbacks. **The M7-1..M7-4 test that asserted the OPPOSITE was inverted, not deleted**, with the amendment dated in place: the boundary of part 1 is still a real fact and only which side of it the repository is on has changed. It now reads through the comment-stripped source, because both files quote the deleted lines in their headers and a test that could not tell a defect from an explanation of one would punish the explanation. |
| M7-7 | 2026-08-15 | — (uncommitted) | `supabase/migrations/018_event_compaction.sql`, `lib/event-compaction.ts`, `app/api/cron/event-compaction/route.ts`. **THE RE-OPENED PARTITIONING HALF IS DECIDED, AND IT IS DECIDED AGAINST — `academic_events` stays `HASH (student_id)` and nothing is sub-partitioned. M7-7 is compaction and nothing else.** Full argument in 018 §0; three reasons in weight order. (1) **Sub-partitioning by month re-breaks the dedup constraint one level down.** PostgreSQL requires a UNIQUE constraint on a partitioned table to contain every partition key column, and in a multi-level scheme that means every level's — so range-on-`received_at` inside each hash partition demotes `UNIQUE (student_id, client_event_id)` to include `received_at`, under which an offline outbox retrying across a month boundary inserts a duplicate. That is **T7 restored in full** in exchange for a performance property nothing has measured, and R.10's dedup guarantee is not tradeable for an unmeasured index win. (2) **The two solve the same problem and only one is what D.5 specifies.** The named mechanism is *"the raw rows dropped"* — a selective DELETE, which needs no time partition. A monthly partition would make that a DETACH, which is faster; but a DETACH drops a **whole month including the permanent-verbatim classes** (`QUESTION_*`, `MISTAKE_*`, `ASSESSMENT_*`) that D.5 keeps *forever*. The fast path is not a path this product may take, so compaction is necessarily selective by event type whatever the partitioning is. (3) Hash-on-student is the key every read path in Parts D–L wants; a time key splits every student's stream across every partition. **T6's mitigation list is answered item by item rather than wholesale**: watermarked projections are M12-2/M12-3, daily snapshots already ship, compaction is this row, and **monthly partitioning is the one item refused**, with T6's own **UNVERIFIABLE** label on the volumes as part of the reason — the right response to an unverified capacity guess is not to pay a known integrity cost for it. If volume ever makes the scan real, the additive answer is a BRIN on `received_at`, and 015 already created a btree there. 018 §4 **asserts** `partstrat = 'h'` on every re-run, so a later reversal is loud rather than silent, and a test asserts 018 contains no `PARTITION BY RANGE`. **The compaction itself.** `COMPACTABLE_EVENT_TYPES` is a **two-element** constant — `CONCEPT_VIEWED`, `EXPLANATION_READ` — D.5's *"Permanent, compacted"* row verbatim and complete, and it is stated three times (the constant, 018's CHECK, and the type filter inside `compact_attention_events()`) with a test comparing all three. `isCompactable()` is a positive membership test, not a denylist, so **a type added to D.2 tomorrow is permanent by default** — the safe direction to fail; a test asserts it over all 35 `EVENT_TYPES`, over every member of `EVIDENCE_BEARING_TYPES`, over every `MISTAKE_*`/`ASSESSMENT_*`/`QUESTION_*`/`SESSION_*`/`CORRECTION_*`, and over an unknown string. `planCompaction()` is pure and injected-clock, and every event lands in exactly one of two places — a summary group plus the delete list, or `retained` with a **stated reason** (`PERMANENT_TYPE`, `INSIDE_WINDOW`, `REFERENCED`); two tests assert the arithmetic closes, so nothing is dropped silently. The 90-day window is measured in **server** `received_at`, never client `occurred_at` (R.10 again — a forged claim could otherwise age a row out early), asserted. **D.5.a's second bound is implemented as `referencedEventIds`** — *"a referenced event is permanent regardless of its class"* — and it is **empty today because nothing in the schema stores an event reference yet**: `evidence` and `occurrences` (007) predate the event layer and `AssessmentAttempt` is M10. That is a real gap and 018 §3 names it in the file so the milestone that closes it can find it, rather than leaving it to be discovered. **D.5.b — derivation is one-way — is structural:** the summary carries `{count, total_dwell_ms, first_at, last_at}` plus the `seq` range and a NULL-safe `group_key`, and **no payload, no result and no list of the ids it replaced**; a test pins the exact key set, because a summary that could be inflated back into raw rows would let a replay produce a smoother history than the one the student lived. A missing or negative `dwell_ms` contributes **zero**, never a guess. `runCompaction()` fixes D.5.a's order — **the summary is written before the raw rows are deleted**, so a crash between them leaves a summary with its rows still present (absorbed on retry by the unique index on `(student_id, group_key, min_seq, max_seq)`) rather than losing the events; a test asserts the call order *and* that a failed summary write deletes nothing. The run is audited as `compaction_run` with the count and the range, per D.5.a and O.6 — the action was already in `AUDIT_ACTIONS` and 016's CHECK, so it arrived as a call and not a schema change, which is what M7-4 built the mechanism for. The `compact_attention_events()` function re-checks the type and the window **in SQL** and raises rather than deleting a permanent event: not M1's drift, because the planner *decides* and the function *bounds the envelope of legal decisions*. `app/api/cron/event-compaction/route.ts` is `isInternalCaller`-guarded and **deliberately not scheduled** — nothing in `vercel.json` calls it, the posture `cron/score-snapshot` documents — so its first real run is not also its first tested run. It is safe to call today and does nothing: `academic_events` is empty until a tool emits. **Not applied to any database.** |
| M8-1 | 2026-08-15 | — (uncommitted) | `app/capture/page.tsx` + `app/capture/layout.tsx`, and two permanent redirects in `next.config.mjs`. **The shell is `/home`'s, imported and not copied** — same `AuthGuard`, same `VitalityShell` token host, same `app/console/console.css`, same console primitives — because M8 is a data milestone with no licence to redesign, and a second shell is exactly the duplication M3 spent a milestone deleting (architecture T10). `robots: index:false`: the surface holds photographs of a minor's marked papers. **The two redirects are exact-path, and that is deliberate**, the same shape M3-1 used for `/dashboard` and `/console`: `^(?!/_next)/tools/exam-practice(?:/)?$` and the same for `/tools/syllabus`, verified in the built `routes-manifest.json`. Nothing else under `/tools` moves — `exam-triage`, `panic-triage`, `recall-studio` and `exam-day` carry the sibling tabs `exam-practice` also had, and all 46 tool URLs still resolve (S.4, *"the 29 Level-0 tools KEEP routable"*). **Next's `permanent: true` emits 308, not 301**, which is what M3's pair already emit; the plan's "301" is read as "a permanent redirect", and a test asserts `permanent: true` rather than a number. **THE TWO PAGE BODIES ARE NOT GUTTED, and that is a departure from M3's exact pattern with a stated reason.** M3 could reduce `app/dashboard/page.tsx` to a `permanentRedirect()` stub because `/home` had already absorbed everything it did *in the same milestone*. `/capture` has not: this pass ships capture, storage and stage-tracking, while the parts of `exam-practice` that belong in the rebuilt product — a mistake written **with evidence attached** — are M8-4 and M8-6. Deleting shipped code the replacement cannot yet do is §1.4's deletion gate failing in the direction that costs a student their work, so both routes are **unlinked, not deleted** (§2.5): the edge answers first, the bodies stay, and each file gains a dated header naming the condition under which it becomes a one-line redirect stub. Each file's only change is that comment; `exam-practice`'s M0-10 deletion of the client-side `status = "cleared"` write is untouched and stays deleted. **What the student loses today is stated on the screen rather than glossed:** `/capture` stores a paper or a syllabus and says *"Reading it is not built yet"*, because `syllabus`'s AI parse is M8-4's extraction stage and implying an analysis that has not run is §3.2 failing in the shop window. What replaces the two localStorage writers is a durable, deduped, replayable record, and a paper captured today is re-read by M8-4 **without the student uploading it again** (`008`'s replay guarantee). |
| M8-2 | 2026-08-15 | — (uncommitted) | `lib/evidence.ts` (the writer), `lib/storage.ts` (the bucket and the key), `app/api/capture/route.ts` (the endpoint), `supabase/migrations/019_evidence_storage.sql` (the bucket and its policies). **`007_mistakes.sql` IS NOT TOUCHED AND NEEDED NO EXTENSION** — the dedup this task is measured by has been in the schema since M1: `CONSTRAINT evidence_student_hash_unique UNIQUE (student_id, content_hash)`. So `019` adds a bucket and four storage policies and **not one column, constraint or table** to the frozen mistake schema (S.3, *"KEEP, extend additively"*); a test asserts `019` contains no `ALTER TABLE evidence`. **The dedup is the constraint's verdict, not the application's opinion.** `captureEvidence()` inserts FIRST and interprets `23505`; it does not check-then-insert, because that shape is a race — two tabs uploading one photograph a millisecond apart both find nothing, both write, and the paper becomes two pieces of evidence with two futures. The read-back happens only on the refused branch. A test proves BOTH halves: one row from two uploads, **and** that two inserts actually reached the database, which is what distinguishes a structural dedup from a lucky one. Same reasoning `lib/events.ts` states for `ON CONFLICT DO NOTHING` — *"the only place it can be learned without a race."* **The hash is `lib/sha256.ts`, not `lib/ingest/hash.ts`**, and the choice is M7's argument reused: the ingest hash's own header says it *"is not cryptographic, and deliberately so"*, while deciding whether two uploads are the same paper is a protection claim — a collision merges two students' academic evidence. Asserted against `node:crypto`. **The bucket is PRIVATE and scoped to `auth.uid()`, and `lib/storage.ts` has no `getPublicUrl()`** — a public object URL for a marked paper is a permanent, unauthenticated, un-revocable disclosure of a minor's academic record, and Supabase public URLs are guessable from the path. The key is `<student_id>/<content_hash>`: the first segment is what `019`'s policy compares to `auth.uid()`, so cross-student writes are unrepresentable rather than merely refused by the upload code; the second makes the upload idempotent, so the duplicate branch never orphans a second object. **`019` grants SELECT, INSERT and a same-key UPDATE, and NO DELETE** — the same asymmetry `007` uses for `evidence` and `occurrences`, one layer down: `occurrences.evidence_id` is `ON DELETE RESTRICT` precisely so a diagnosis cannot be retroactively invalidated, and letting a client delete the bytes would achieve what the FK forbids. `lib/evidence.ts` has no `updateEvidence` and no `deleteEvidence`, asserted. Every row is written with `verified_by: 'student'` and `crop_regions: []` — nothing has read the page, so claiming `ai` or a crop region would be inventing a reading. **Not applied to any database, and no bucket exists yet.** |
| M8-3 | 2026-08-15 | — (uncommitted) | `lib/ingest/supabase-store.ts` (the `008` adapter), `lib/capture-intake.ts` (the stage and the entry point), called from `app/api/capture/route.ts`. **T12 IS RETIRED FOR `lib/ingest/*`: it has a production importer for the first time.** S.1 recorded the defect by name — *"**Zero production importers** — `lib/ingest/{runner,hash,memory-store,types}.ts` are referenced only by `tests/ingest-runner.test.mjs`"* — and a test now walks `lib/` and `app/` and fails if no non-test file imports the runner. The adapter is the one `lib/ingest/memory-store.ts` predicted by name: *"The Supabase adapter (M2-B) implements this same interface … and must satisfy exactly these semantics."* Because it implements the **same `IngestionStore` interface** the runner's existing tests drive, the seven guarantees proven in `tests/ingest-runner.test.mjs` become guarantees about shipped code rather than about a fixture. **The append-only refusal is Postgres's here, not an array scan**: `008`'s `UNIQUE (run_id, stage, attempt)` returns `23505` and the adapter raises `StageAppendConflict`; under concurrency the memory store's scan would be a race and the constraint is not, which is why `008` declares it. Nothing in the adapter updates a stage row. **The client is injected as four verbs (`IngestionDb`), not as a `SupabaseClient`** — the same split M4, M6 and M7-2 each made, for the same reason (U.3): the column mapping is the part that can be silently *wrong*, so it is the part a test must reach with no database in the room. `app/api/capture/route.ts` holds the twenty lines of Supabase that satisfy the interface, and uses the **service role** for the writes because `008` gives `ingestion_stages` no INSERT policy to anyone — *"the history is written by the service role and is append-only by construction"* — while the identity still comes only from `auth.getUser()`. **ONE STAGE IS REGISTERED — `intake`, which is `propose` phase — and that is the milestone boundary, not a stub.** M8-4 is extraction; registering a `commit` stage here would give this pass a path into the academic record, which it must not have. A captured paper lands at `intake` succeeded, run status `running`, twelve stages `not-run`, and `explainRun()` says exactly that today with no extra code. **Every run is created `confirmedAt: null`**, so the runner's confirmation gate — *"mechanical, not procedural"* — already blocks the commit phase before M8-5 builds the UI for it. **A re-uploaded paper resumes ONE run and re-executes nothing**: `findRunIdForEvidence()` returns the first run for that evidence, the input hash is unchanged, and the runner reports `reused: ['intake']` with no second row in the ledger — the idempotency guarantee, exercised by production rather than only by a test. `syllabus` and `paper` go through the identical path, which is S.4's *"`syllabus` **ADAPT** into `/capture` (syllabus ingestion), wired to `008_ingestion.sql`"*, wired. **No model is called anywhere in the capture path**, asserted over all seven files. |
| M8-4 | 2026-08-15 | — (uncommitted) | `lib/capture-extraction.ts` (the prompt, the parse, the floor, two stages), `lib/ai-guard.ts` (the ported `/api/ai` guard), `app/api/capture/extract/route.ts` (the only file in the capture path that touches a model), plus `extractionRegistry()`/`runCaptureExtraction()` added to `lib/capture-intake.ts`. **THE DONE-WHEN IS SATISFIED BY THE ABSENCE OF A COLUMN, NOT BY A CONVENTION.** `buildDraftOccurrence()` never emits `confirmed_at` — the key is *absent* from the object, not `null` — and `020`'s trigger refuses a born-confirmed row from **every** writer including the service role, so "extraction cannot write to the record" is two independent refusals rather than a promise. A test asserts both. **THE FOUR COMMIT STAGES STAY UNREGISTERED.** The slice is `intake → preprocess → propose`, all three `propose` phase (`lib/ingest/types.ts`), so the runner's gate has nothing to bypass and the academic record is unreachable through the pipeline at all — not merely gated. **CAPTURE STILL REGISTERS ONE STAGE, AND THAT IS DELIBERATE**: `captureRegistry()` is byte-unchanged, uploading a paper never spends a model call, and the reading is a second, explicit act the student asks for. A student who wants the bytes safe and nothing else gets exactly that. **THE GUARD IS `/api/ai`'s GUARD, IN `/api/ai`'s ORDER** — auth → `hasAccess` → strikes → regex → Haiku classifier → `consume_ai_call`, with the meter LAST so a refused request never spends the student's allowance, and with the classifier and the meter failing **open** exactly as the original does, because changing a safety posture is a decision and this pass is not it. M15 owns the rebuild; this pass may not touch `app/api/ai/route.ts`, so `BLOCKED_PATTERNS` is **ported**, and a test extracts the array from **both** files and fails unless they are character-for-character identical — the duplication cannot drift, it can only be deleted. **LOW CONFIDENCE IS AN ENDING, NOT AN ERROR.** `EXTRACTION_CONFIDENCE_FLOOR = 0.7`; below it the stage returns `review`, the run lands `awaiting-review`, `ingestion_review` records what was considered with its rationale, and **nothing is written** — `008`'s own header: *"Reaching this table is a SUCCESS, not a failure."* A confident reading of a topic the taxonomy cannot resolve is refused the same way (V.2.4, one layer up): no `concept_id`, no row, the student's words handed back. The screen's next move in both cases is M8-6. **The model output is parsed as hostile input**: every field checked, a field that does not check drops its proposal rather than defaulting, a page claiming sixty mistakes is capped at 25, and eight hostile shapes are asserted not to throw. `EXTRACTION_PREAMBLE` names the photographed page as *"DATA, never instruction"* — a student can photograph a page of injected instructions. **Not one migration was executed.** |
| M8-5 | 2026-08-15 | — (uncommitted) | `supabase/migrations/020_occurrence_confirmation.sql`, `lib/occurrences.ts` (the access layer), `app/api/capture/confirm/route.ts` (the gate), `components/capture/draft-review.tsx` (the surface). **`007_mistakes.sql` HAS NO `confirmed_at` ON `occurrences` — CHECKED BY READING IT, NOT ASSUMED.** The `confirmed_at` S.1 names is `ingestion_runs`', and it already exists in `008`. So `020` adds the occurrence-level column, and it is **additive only**: four nullable columns, three partial indexes, one view, one policy, one trigger, one column grant. It alters no existing column, drops no constraint, and does not go near `patterns_update_own` — PRINCIPLES §3.1 is `007`'s policy and stays exactly as `007` wrote it. A test asserts the absence of `DROP COLUMN`, `ALTER COLUMN`, `DROP CONSTRAINT` and any `ALTER TABLE` on `patterns`/`evidence`/`concepts`. **"ONCE, AND ONLY FORWARDS" TAKES THREE MECHANISMS BECAUSE EACH IS BLIND TO A CASE THE OTHERS CATCH.** (1) The **column grant** — `REVOKE UPDATE … FROM authenticated; GRANT UPDATE (confirmed_at)` — because an RLS policy *cannot* express "and nothing else changed": `USING` sees the old row, `WITH CHECK` sees the new one, and neither can compare them, so without it a student could edit `marks_lost` in the same statement that confirms. (2) The **policy**, which is `008`'s `ingestion_runs_confirm_own` shape reused rather than reinvented: `USING (auth.uid() = student_id AND confirmed_at IS NULL)` makes an already-confirmed row invisible to the statement, so a second confirmation matches nothing; `WITH CHECK (… confirmed_at IS NOT NULL)` makes an un-confirm impossible. **This is the enforcement the done-when names.** (3) The **trigger**, because **RLS does not apply to the service role** and everything the pipeline writes runs as it — the trigger is the only one of the three that binds every writer, present and future, and it also carries `007`'s prose immutability (*"an occurrence is a fact"*) into the one place an UPDATE is now legal, allowing exactly two transitions: `NULL → NOT NULL` on `confirmed_at`, and `NULL → NOT NULL` on `pattern_id` so M11's merge keeps working. **THE ENDPOINT USES `createStudentServerClient()` AND NOT `supabaseServer`, AND THAT IS THE WHOLE FILE.** A confirmation performed by the service role would bypass RLS and make the policy decorative — the endpoint would become the enforcement, which is the exact failure the done-when forbids. A test asserts `supabaseServer` appears nowhere in it. The endpoint therefore has **no power the student does not already have**; it exists to save round trips and to set the run-level gate afterwards. **The refusal does not say which refusal it is** — already confirmed, not yours, or not there are deliberately indistinguishable, because distinguishing them is an ownership oracle over another student's occurrence ids. **Drafts live in `occurrences`, not a side table**, because `007`'s four structural invariants are the ones a proposal most needs (`evidence_id NOT NULL`, `occurrences_has_error`, `marks_sane`, `concept_id NOT NULL`) and a parallel table would have re-declared all four, drifted within one milestone, then needed a copy step — a **second write path into the record**, which is what M8-4's done-when forbids. The cost is paid by `020` §3: `confirmed_occurrences` is a `security_invoker` view, and every reader from M11 on uses it, so a reader that forgets `WHERE confirmed_at IS NOT NULL` cannot exist. **`020` was not executed.** |
| M8-6 | 2026-08-15 | — (uncommitted) | `app/api/capture/manual/route.ts` and `components/capture/manual-entry.tsx`, plus the three-mode `/capture` shell. **IT IS A SEPARATE FILE WITH NO PATH TO A MODEL, NOT EXTRACTION WITH THE CALL SKIPPED.** A `?skip_ai=true` on the extraction endpoint would leave the manual path one boolean away from the guard, the meter, the classifier and the key; the only version of *"zero model involvement"* that survives a refactor is a file with nothing model-shaped in it. A test reads the route and the component and fails on `anthropic`, `/api/ai`, `ai-fetch`, `capture-extraction`, `ai-guard`, `ANTHROPIC_API_KEY` or a post to `/api/capture/extract`, and a second test fails if the extraction endpoint ever grows a skip flag. **IT SHARES THE GATE AND NOTHING ELSE.** Same `buildDraftOccurrence()`, same absent `confirmed_at`, same `/api/capture/confirm`, same `020` policy. A test diffs a typed draft against an extracted one and asserts the ONLY differing keys are `origin` and `proposal_confidence` — and `origin` is provenance, not privilege: a hand-typed mistake is neither more nor less trusted than a read one, both are proposals until confirmed. **A typed entry may not carry a confidence at all**: `buildDraftOccurrence()` refuses `origin: 'manual'` with a `proposalConfidence`, because a student typing what they got wrong is not making a judgement call and recording one would invent a reading nobody made. **`occurrences.evidence_id` IS STILL `NOT NULL`, AND NOTHING IS FABRICATED TO SATISFY IT.** Two honest sources and the student picks: a paper they already photographed, or what they typed — stored verbatim as `manual` evidence through the *identical* `captureEvidence()` path a photograph takes (same hash, same private bucket, same dedup constraint) and entered into the same `008` ledger, so one paper has one history whichever way it arrived. **The topic is resolved, never guessed**: an unresolvable topic is refused with `422` and the student's own words returned verbatim, because writing a row against the wrong concept files their mistake in someone else's chapter forever (B.4). |
| M9-1 | 2026-08-16 | — (uncommitted) | `lib/study-session.ts` (the machine, no I/O and no imports at all), `lib/session-reaping.ts` (the pure planner and its runner), `app/api/cron/session-reaping/route.ts` (the sweep's I/O half), `supabase/migrations/021_study_sessions.sql`. **E.2'S TABLE LISTS SEVEN STATES WHERE ITS PROSE SAYS SIX, AND THE TABLE IS THE NORMATIVE ARTEFACT.** `ACTIVE`, `DORMANT`, `REVIEWING`, `ASSESSING`, `CLOSED_UNVERIFIED`, `VERIFIED`, `ABANDONED` — three terminal. E.2 says it *corrected* a six-state skeleton by adding `DORMANT`, adding `ABANDONED` and merging two states, and 6 − 1 + 2 = 7; the count sentence is the stale half. **Reported, not silently picked** (CLAUDE.md forbids resolving a documentary conflict by judgement in the moment). A second defect is reported with it: **C.3 writes the terminal set with the pre-correction name `completed_unverified`**, which E.2 explicitly renames and re-argues; Part E is the canonical session spec and M9-1's own done-when names `CLOSED_UNVERIFIED`, so E.2 wins and C.3's enum literal is the defect. A test asserts `COMPLETED_UNVERIFIED` appears nowhere in the code or the SQL. **"THE SCORE DOES NOT FALL" IS A SHAPE, NOT A POLICY.** `SessionScoreContribution` has exactly two arms — `verified_evidence` and `none` — and **neither carries a sign, a magnitude or a weight**. There is no negative arm for M14 to read, so paying one would require first widening a type whose header says why it must not be. A test walks all seven states and asserts no contribution field is a number; five of seven answer `none`, and only `VERIFIED` yields evidence. `021` holds no `duration`, `score`, `penalty`, `completion_rate` or `streak` column, asserted by test. **"NOTHING SHAMES" IS A LEXICON A TEST READS.** `SESSION_STATE_NOTE`, `CLOSE_REASON_NOTE` and `nextMoveFor()` are the only strings this layer owns; every one is checked against §4/§4.1's banned framing on word boundaries, and against exclamation marks and emoji. `CLOSE_REASONS` contains no `gave_up`, no `failed`, no `incomplete` — every value is a fact. **The reap emits no notification and writes no audit entry**, asserted over both the module and the route: M0-6 deleted the last loss-framed send in this product and *"you left a session open"* is that message wearing a new noun; `016`'s own footnote makes an audit entry for an unobserved action a Law 7 fabrication, and the reap's record is the `SESSION_CLOSED_UNVERIFIED` event instead. **A QUIET `ACTIVE` SESSION IS CLOSED IN TWO STEPS.** E.2 draws the reap edge from `DORMANT` only, so a 25-hour-quiet `ACTIVE` session is walked `ACTIVE → DORMANT → CLOSED_UNVERIFIED` in one sweep rather than short-circuited: the intermediate `DORMANT` is the state the student was actually in, and a projection replaying the stream must be able to say so. **Three edges are architectural inference and are named so a reviewer can refuse them**: `DORMANT + finish_requested → REVIEWING` (refusing it would force a student who returns after an hour to answer another question before they were allowed to stop), and `reap_elapsed` from `REVIEWING` and from `ASSESSING` (both are live states, and the one-live-session index would otherwise lock a student who closed their laptop on the review screen out of ever opening another session — a rule written to protect them, refusing to). **`applySessionTransition()` cannot throw**, including on a state this build does not know, because V.1.8 requires a stale second press to return the current state rather than an error and a function that threw would push that decision onto every caller. **`021` WAS NOT EXECUTED.** |
| M9-2 | 2026-08-16 | — (uncommitted) | `lib/session-resolver.ts` and `021` §4. **THE RACE IS WON BY THE DATABASE, NOT BY THE RESOLVER.** `resolveSession()` does **not** check whether a live session exists before creating one — check-then-insert has a window between the two statements and two tabs opened together sit in it together. It INSERTs and treats SQLSTATE 23505 as the ordinary path: the loser re-reads and attaches to the winner's session. `SessionStore.insertOpen` is typed to return `{ conflict: true }` rather than to reject, so a caller cannot forget. **The index is real and its predicate is checked against the code**: `CREATE UNIQUE INDEX … ON study_sessions (student_id) WHERE state IN ('ACTIVE','DORMANT','REVIEWING','ASSESSING')`, on `student_id` **alone** — a composite would permit two live rows — and a test parses the predicate out of the SQL and asserts it equals `LIVE_STATES`, which is itself *derived* from `TERMINAL_STATES` rather than written out twice. `021` §7 re-reads the predicate out of `pg_indexes` at apply time, because an index whose `WHERE` clause drifted would still exist and V.1.3 would still fail. **V.1.3 IS RACED, NOT SIMULATED.** The suite's `FakeStore` yields between its read and its write, two `resolveSession()` calls are made to sit in that window together, and the assertions are: exactly one row exists, both callers attached, and exactly one of them opened it. A sequential test would pass against code that has the window. **E.7.1's guarded transition is a conditional update** — `WHERE session_id = ? AND state = from` — returning `null` for zero rows and never an error; `applyGuarded` then re-reads and reports where the session actually is. **THE SWEEP'S WRITE CARRIES A SECOND GUARD, AND FINDING THAT IT NEEDED ONE IS THIS PASS'S ONE REAL CORRECTION.** Guarding the reaper on `state` alone is not enough for the case that matters most: a student who answers a question between the sweep's read and its write leaves the session `ACTIVE` with a **new** `last_activity_at`, so `WHERE state = 'ACTIVE'` still matches and a session the student is sitting in is put to sleep and then closed. `TransitionExpectation` adds the exact `last_activity_at` the decision was made from to the WHERE clause, for the sweep and for no other caller. The student now wins by construction rather than by timing, and a test constructs precisely the wake-without-a-state-change that the state-only guard got wrong. **`021` WAS NOT EXECUTED.** |
| M9-3 | 2026-08-16 | — (uncommitted) | `lib/study-session.ts` (`livenessOf`, `crossesDayBoundaryWithoutClosing`) and `lib/session-resolver.ts` (`currentSession`, `sessionLiveness`). **LIVENESS IS A PROPERTY OF THE EVENT STREAM, READ LITERALLY.** There is no heartbeat endpoint, no client ping and no timer anywhere in this milestone — a test asserts the absence of `Date.now(`, `setInterval`, `setTimeout`, `heartbeat`, `ping`, `poll`, `supabase` and `fetch(` across all three modules. Either reading of E.3 is refused by the same sentence: a heartbeat would make a tab left open on a locked phone indistinguishable from a student working, which is the *"sessions studied measures app-opening"* failure E.1 exists to prevent. `last_activity_at` advances **only** when a qualifying event lands — asserted by a test in which a `CONCEPT_VIEWED` attaches to the open session and leaves the clock untouched — and `GET /session/current` is a pure read that writes nothing. **V.1.6 IS PROVEN AS A PROPERTY OF THE SCHEMA, NOT OF A LOOKUP.** There is no `device_id` column on `study_sessions` at all (asserted); the session belongs to the student, `device_id` lives on the event (D.1), and "returning on a phone" is therefore the same query a fresh tab makes. A qualifying event from the phone joins the existing session rather than opening a second. **THE DAY BOUNDARY IS REAL TIME, NOT CALENDAR TIME.** A session opened at 23:40 and continued at 00:10 is one session, and a sweep run at 00:10 plans nothing — the documented refusal of the `lib/active-close.ts` IST/UTC bug, written as a predicate rather than a comment so a future reader cannot reintroduce it by "helpfully" closing sessions at local midnight. **`IDLE_MINUTES = 45` and `REAP_HOURS = 20` ARE E.3'S OWN SUGGESTED VALUES AND ARE NOT YET IN `PRODUCT_DECISIONS`.** E.3 says explicitly that they are *"policy, not architecture … a product decision for `PRODUCT_DECISIONS.md`, not for this document"*. They satisfy V.1.4 (50 minutes → `DORMANT`) and V.1.7 (25 hours → `CLOSED_UNVERIFIED`) as written, and **the gap is reported rather than closed by a plan editing a decision document.** Both boundaries are exclusive and both are asserted at the boundary. **The resolver takes `received_at` and owns no clock**, so replaying one stream twice reconstructs identical session boundaries — asserted by replaying a five-event stream across a 30-hour gap and comparing the whole outcome, which is what makes B.3's *"the row is rebuildable"* true rather than aspirational. |
| M9-4 | 2026-08-16 | — (uncommitted) | `lib/external-study.ts` and `supabase/migrations/022_session_concepts.sql`. **`declared_text` IS THE CALLER'S OWN STRING OBJECT, AND THAT IS THE WHOLE FILE.** `checkDeclaredText()` validates and REFUSES; it never repairs, which is D.3's own posture (*"each step rejects rather than repairs … it is never coerced into validity"*) applied to the one string in this product that belongs to the student. Concretely: no `.trim()` on anything that is returned, no `.slice()` — **an over-long declaration is REFUSED with its length reported, never truncated into a shorter claim** — no `.normalize()`, no case folding, no default. A test asserts the module's source contains **exactly one** `.trim()`, that it is `emptinessOf()`'s length check whose trimmed string is discarded, and that `.slice(`/`.normalize(`/`.toLowerCase(`/`.replace(` appear nowhere. **Verbatim is proven over BYTES, not over `===`**: a thirteen-entry corpus (leading and trailing spaces, interior newlines and tabs, doubled spaces, both apostrophe forms, NFD combining marks, Devanagari, emoji, a zero-width joiner, a trailing newline) is compared with `Buffer.compare` on the envelope field, on `payload.declared_text`, and again after passing the whole draft through **M7's own `validateEventDraft()`** — so *"the contract preserves it"* is checked against the contract rather than asserted about it. **This is consistent with M7 by construction rather than by intention**: `validateEventDraft` already passes `declared_text` through untouched (type check and a 2000-character cap, nothing else), and M7 part 2's backfill keeps the student's words in `payload.legacy.original` for the same reason; `DECLARED_TEXT_MAX_CHARS` is restated here so the refusal happens at this boundary rather than as a quarantine later, and a test asserts it equals M7's. **`origin = 'declaration'` PROPAGATES THREE WAYS AND IS NEVER WRITTEN TWICE.** `DECLARATION_ORIGIN` is asserted `===` `defaultOriginFor('EXTERNAL_STUDY_DECLARED')`, which M9-2 already shipped — the resolver decides the session and this file does not re-derive it. It is stamped on the *event* (`payload.origin`) so a projection rebuilding the session from the stream (B.3) sees it without loading a row, and on every `SessionConcept` the declaration proposes, so a concept is traceable to a declaration rather than to in-product activity. **The event is born `confirmation: 'unconfirmed'`, `confidence: null`, `concept_id: null`** — all three typed as literals so a caller cannot widen them, and the last one deliberate: stamping a resolved id on the raw claim would make the claim and the inference indistinguishable forever, and E.5.3 keeps them apart. **THE PROPOSER IS M6'S DETERMINISTIC RESOLVER AND NOT A MODEL, and `detection_source` is still `'ai_proposed'`.** Argued in the header: every model call belongs to the typed capability boundary (M15), B.4 requires resolution to be deterministic, and an embedding re-resolves history on a model swap. The value is retained because it governs the *confirmation semantics* — E.6's *"auto-confirms: never"* — which are identical whichever proposer is behind it, so M15 substitutes a proposer and no schema, state or caller changes. **`022` WAS NOT EXECUTED.** |
| M9-5 | 2026-08-16 | — (uncommitted) | `lib/session-concepts.ts` and `022` §4/§6/§7. **THE PROPOSAL AND THE DECISION ARE EACH AN APPEND, AND THE ROW IS THEIR PROJECTION.** Every row carries `source_client_event_id` (the event that proposed it) and, once decided, `decision_client_event_id` (the `CONCEPT_CONFIRMED` event that decided it); `015` gives `academic_events` `UNIQUE (student_id, client_event_id)`, so both resolve to exactly one immutable append-only event. **`022` §7's decision guard refuses any change of `confirmation_state` that does not name a NEW decision event** — a confirmation with no event behind it is a checkbox, and the database will not store one. That is the mechanical difference between *"as events"* and *"as a mutable column we promise to write carefully"*. **REJECTIONS ARE RETAINED IN BOTH PLACES, AND THERE IS NO DELETE PATH FOR ANYBODY.** `rejected` is a STATE, never an absence; `022` §6's `BEFORE DELETE` trigger refuses every deletion — including the service role's, which RLS cannot reach (020 §5's argument, unchanged) — while still permitting the one legitimate cascade, a deleted student, by checking whether the owner still exists. `rejected_session_concepts` exists so *"retained"* is something a reviewer can `SELECT` rather than a claim in a comment, and it is deliberately not part of the record. E.6's reason is transcribed: *"the rejection is a training signal for concept detection … silently dropping proposals would make the review step unauditable."* **ONE EVENT TYPE FOR BOTH OUTCOMES**, which is E.6's own choice and worth naming: a separate `CONCEPT_REJECTED` would let a reader count confirmations without ever loading rejections, and that asymmetry is exactly how a rejection becomes invisible. `payload.accepted` is a boolean on one type, so a reader of the decision stream sees both halves or neither; a rejection carries `confirmation: 'unconfirmed'` (D.1.d) so it can never be misread as its opposite. **"NOTHING PROPOSED REACHES THE RECORD UNCONFIRMED" IS TWO GATES, NOT A QUERY CONVENTION.** `022` §4's `confirmed_session_concepts` is 020 §3's `confirmed_occurrences` pattern reused verbatim — *"the safe query is the one with the SHORTER NAME"* — and binds every SQL reader; `RecordConcept` is a **branded type** whose brand only `confirmedSessionConcepts()` and `asRecordConcept()` can apply, and binds every TypeScript reader, because a proposal is simply not assignable to `RecordConcept[]` and passing one needs a visible cast. A test walks `lib/`, `app/`, `components/`, `hooks/`, `scripts/` and `supabase/` and fails if any non-test file's **code** (comments stripped — 021 §8 records the table by name as the thing it refused to ship) mentions the raw table. **C.3's hard invariant is the reason `022` exists rather than a decoration on it.** 021 §8 refused to ship the table without *"`confirmation_state = 'confirmed'` IMPLIES `assessment_required = true` … a database CHECK, not a code convention"*; §2 is that CHECK, installed under its own name so M10-1 can look it up in `pg_constraint`, and `buildProposal()`/`applyConceptDecision()` derive `assessment_required` **from the state** rather than from a parameter, so a caller cannot supply a confirmed concept that is not assessed. **E.6'S TABLE IS DATA, AND ITS ONE LOAD-BEARING ROW IS ENFORCED TWICE.** `AUTO_CONFIRMS` is asserted exhaustively over `DETECTION_SOURCES`; `ai_proposed` is `false`, `AUTO_CONFIRMED_BY.ai_proposed` is `null`, `CONFIRMED_BY` has no `'ai'` value, and `022` §7's birth guard refuses an `ai_proposed` row inserted as anything but `proposed` — *"an inference is not a fact (L1)"*, refused by the database and not only by the module. **AN EXACT MATCH IS STILL `ai_proposed`, WHICH IS THE SUBTLE CALL AND IS ARGUED IN THE OPEN.** V.2.2 has the AI propose *Torque* — a name the student typed exactly — and requires it `proposed`. E.6's auto-confirming `student_declared` (*"the student NAMED it"*) is for a student **picking a taxonomy node from a list**: an explicit act with the node in front of them. Reading a node out of a sentence is an inference regardless of match strength — the tier says how confident, not whether inference occurred — so everything derived from free text enters `ai_proposed`/`proposed`, and `declareConceptExplicitly()` is the only path that auto-confirms. **V.2.4 IS NOT AN ERROR PATH.** An unresolved declaration produces a row exactly like a resolved one, differing only in a null: `concept_id = NULL`, `declared_text` verbatim, `concept_ref = 'text:<normalised>'`. The normalisation is for **deduplication only** and is computed on a copy — a test declares `'  The Thing About WOBBLING Tops!  '` and asserts the record keeps every byte while the ref is `text:the thing about wobbling tops`, the same split `lib/concept-resolution.ts` keeps between its tunable comparison and the byte-stable taxonomy slug. Returning nothing here would be the product quietly deciding that what it could not name did not happen. **`applyConceptDecision()` cannot throw** — asserted over every state including one this build does not know — **and never returns a concept to `proposed`**: a student who changes their mind makes a NEW decision with a NEW event, and both timestamps accumulate so the history is legible from the row as well as from the stream. Re-applying the same decision event is a noop (`same_decision_event`), which is D.3.6's retry-safety one level down. **`022` WAS NOT EXECUTED.** |
| M9-6 | 2026-08-16 | — (uncommitted) | `lib/session-completion.ts`. **E.8.a IS ENFORCED THREE WAYS AND NOT ONE OF THEM IS "WE DID NOT POPULATE ONE".** (1) **Type.** `SessionCompletionPayload = FiguresOnly<SessionCompletionFigures>`, where `FiguresOnly<T> = T & { readonly [K in NarrativeKey]?: never }` over a 33-entry `NARRATIVE_KEYS` list — E.8.a's own `message` and `encouragement` plus every synonym that would satisfy the same impulse while passing a grep for those two. Assigning `payload.message` is a compile error; adding `message: string` to the interface makes that key `string & never` and **the object literal in the builder stops compiling**, so the build breaks at the definition rather than at a call site somebody can silence. (2) **Construction.** `buildCompletionPayload()` names every key from the frozen `COMPLETION_PAYLOAD_KEYS` tuple (tied to the interface with `satisfies`) and **never spreads its input** — `toEnvelope()`'s allowlist discipline from `lib/event-outbox.ts`, reused for its stated reason: *"a denylist that a future edit forgets to extend fails open; an allowlist fails closed."* A test passes an input carrying `message`, `summary` and `encouragement` and asserts the output's key list is byte-identical to the tuple. (3) **Runtime.** `assertFiguresOnly()` walks the finished object and throws `NarrativeFieldError` on any narrative key at any depth **and on any string leaf that looks like prose** — the discriminator is "contains whitespace", which no UUID, ISO timestamp, enum value or `close_reason` ever fails and no sentence ever passes. The builder calls it, so a payload with a sentence cannot be built **including through a cast**, which is what makes the guarantee survive `JSON.parse` and an `any`. **The failure E.8.a is written against is not one anybody commits on purpose** — it is the ordinary Tuesday on which a completion screen needs a headline and the backend is where the numbers are; from that moment the product has a server-authored sentence about a student's studying, and every path it can take arrives at either a congratulation §7 bans or a shame-adjacent remark §4 bans. The number is a fact; a sentence about the number is a judgement; the two must not share an owner. **THE FIGURES ARE E.8's, WITH FOUR COUNTS ADDED AND ONE FIELD DELIBERATELY DERIVED.** `session_id`, `state`, `close_reason`, `opened_at`, `closed_at`, `duration_real_ms`, `concepts_confirmed[]`, `concepts_verified[]`, `concepts_missed[]`, `concepts_proposed_count`, `concepts_confirmed_count`, `concepts_rejected_count`, `concepts_unresolved_count`, `new_patterns[]`, `resolved_patterns[]`, `evidence_event_count`, `score_delta`, `next_action_ref`. `duration_real` is **computed** from the two timestamps and never stored — 021 §1 refuses a duration column because *"a stored duration is a number something starts optimising"* — and disagreeing timestamps are **refused rather than clamped to zero**, because reporting `0` would present a disagreement as a measurement. `concepts_missed` is the *difference* of the two lists above it, so it cannot disagree with them. **Rejections are COUNTED rather than hidden**: a payload reporting only acceptances would be the same selective reading E.6 refuses at the storage layer. **The lists carry `concept_ref`s, never `declared_text`** — a test asserts the student's own sentence does not appear in the serialised payload, because putting it there would smuggle prose into a payload that has just promised to contain none. `next_action_ref` is a **reference from a closed one-value set**, `null` when there is nothing honest to offer (nothing confirmed, or already verified) — `nextMoveFor()`'s refusal in `lib/study-session.ts`, reused, for its reason: *"M20 owns recommendations, and inventing one here would be the fabrication Law 7 bans."* **`ABANDONED` IS ABSENT FROM `COMPLETION_STATES` DELIBERATELY**: E.8 emits *"on reaching VERIFIED or CLOSED_UNVERIFIED"*, and showing a student a reading of a session they chose to discard (E.2.b) is the product insisting on the last word. **V.2.5 IS ENFORCED HERE TOO, STRUCTURALLY**: `score_delta` is `input.state === "VERIFIED" ? … : null` — one line, pinned by a test that supplies a fat delta on a `CLOSED_UNVERIFIED` declaration-only session and asserts it is **discarded**, not honoured. |
| M10-1 | 2026-08-16 | — (uncommitted) | `lib/assessment-blueprint.ts` and `supabase/migrations/023_assessments.sql` §1/§7. **"FROZEN BEFORE ANY MODEL CALL" IS A TYPE, A HASH AND A SCHEMA — NEVER A COMMENT.** The cheap reading of F.2 layer 2 is a comment saying *"compute the manifest first"*; it survives until somebody adds a *"let the model suggest one more topic"* branch, and nothing notices. So the ordering is made **unrepresentable** in three layers. (1) **Type.** `FrozenBlueprint` carries a `unique symbol` brand that only `freezeBlueprint()` applies, via a single deliberately-ugly `as unknown as` that a test greps for and asserts occurs **exactly once**; `lib/assessment-generation.ts` requires a `CommittedManifest`, obtainable only by passing a `FrozenBlueprint` through `commitManifest()`, and the model interface takes a `BoundRequest` mintable only from one. There is no expression a caller can write that reaches a model without a committed manifest behind it. (2) **Runtime.** `freezeBlueprint()` deep-freezes at every level — a shallow freeze would leave `manifest[0].questions_required = 0` writable, which is the one mutation that would matter — and hashes canonical JSON via `stableStringify` + `sha256Hex`, so the hash is an **identity** rather than a fingerprint of one code path; `verifyFrozen()` recomputes and refuses, catching the mutation `Object.freeze` cannot stop (a JSON round trip through a row somebody edited). (3) **Database.** `023` §1 makes all four manifest columns `NOT NULL`, §7's guard makes them immutable after INSERT **from every writer including the service role**, and `generation_started_at` is refused unless `>= frozen_at`. **A model call with no committed manifest behind it has nowhere to write its output.** V.3.1 is proven **twice, over time**: once by a recorded call log in which `persist` is step 0 and every `generate` and `moderate` follows it, and once from the other side — a store whose write **fails** produces **zero** model calls, so the guarantee is not merely typed but exercised. The manifest is a function of the confirmed **set**, not of row order (reversed input, identical hash). `buildCoverageManifest()` derives the confirmed set itself through M9-5's `confirmedSessionConcepts()` gate, so a caller cannot hand it a proposal and have it become coverage — and an **empty** confirmed set is **refused**, not turned into an empty manifest, because a manifest naming nothing makes *"every confirmed concept is covered"* vacuously true, which is T5's exact shape. V.2.6 is honoured: an unresolved `text:` declaration with a NULL `concept_id` is still an obligation. F.3's table is transcribed — `exam_weight` raises the count between a floor of 1 and a cap of 3 (without the cap one heavy chapter consumes the assessment); starting depth is deterministic and **monotone in prior accuracy**, with an open pattern winning because that is where the evidence says the gap is; and F.3.a's firewall holds **by construction** — `PersonalModelInput` shifts the starting rung by at most one and is an input to selection and to nothing else, never to `answer_key`. F.3's *"time budget affects total slot count, **never** coverage breadth"* is structural rather than conditional: `applyTimeBudget()` filters a collection that **contains no coverage slot**, so a budget below the coverage count yields zero retests and every coverage slot survives — the assessment runs longer than asked, which is the honest failure. The freeze refuses six ways a blueprint could be born already unable to satisfy F.2, and all six are tested alongside the accepted case so the refusals are not vacuous. |
| M10-2 | 2026-08-16 | — (uncommitted) | `lib/assessment-generation.ts` and `023` §8. **THE AI'S OUTPUT IS NEVER TRUSTED — IT IS VALIDATED INTO TRUSTWORTHINESS, AND A FAILURE AT ANY GATE DISCARDS THE CANDIDATE.** F.4's seven gates are shipped as **data** (`GATES`) rather than a chain of `if`s, so *"there are seven, in this order"* is provable by a test reading the array: `slot_binding · schema · structure · answerability · self_consistency · novelty · moderation`. Each one is shown rejecting a candidate that **only it** disqualifies, with the `passed` list asserted equal to `GATES.slice(0, n)` — which is what makes *"rejected at gate 1"* a checkable claim about **which** gate rather than a log line. **V.3.2's headline passes**: a question for a fifth concept is refused at gate 1 with `passed: []` — it never reaches the student, and it is never **reassigned**, because reassignment is the tempting repair and the one that breaks the guarantee (a question for concept 5 filed under concept 3's slot makes the manifest look satisfied while concept 3 was never tested — T5, exactly). A test drives a model that **always** returns the wrong concept and asserts **zero** questions were produced: F.4's *"nothing is repaired"*, demonstrated. Gate 2 refuses `short_text` **absently rather than by flag** — a format whose grading needs a model is a format whose results are not `E`-class (P.3.a) — and the closed-form vocabulary is asserted identical in TypeScript and in `023`'s `format` CHECK. Gate 3 catches the subtle one F.4 names: the **answer appearing verbatim in the stem**, which is perfectly well-typed and completely worthless as evidence, and is exactly what a model produces when handed a definition; it is length-guarded at four characters so a one-word answer like *"nil"* does not reject most of the bank. Gate 4 refuses precision failures in **both** directions — a zero tolerance no student typing a decimal will ever satisfy, and a tolerance wider than the value that makes every answer correct. Gate 5 enforces B.20 **mechanically**: `runGates` refuses a re-deriver whose `id` equals the generator's, because the same model asked twice with the same context is one opinion stated twice; and *"undecidable"* is treated as **disagreement**, never as agreement. Gate 7 reuses the existing two-layer stack — `lib/ai-guard.ts`'s regex first (free, and a test asserts the classifier is **not** reached when it fires), then the injected classifier — imported rather than re-listed, because a third copy of a safety list is a third thing to rot. **SLOT BINDING IS DEFENCE IN DEPTH, AND THE DEPTH IS REAL.** Gate 1 asks *"is this the concept I asked for?"* against the **slot**; `admit()` asks *"is this concept one the manifest names?"* against the **frozen manifest** — deliberately not the same function and deliberately not the same input, so one bug cannot silence both. A test hands `admit()` a candidate that met **no gate at all** and it is refused anyway; `admit()` also re-hashes the manifest before writing (between the commit and the bind sit an await, a network round trip and a JSON parse) and refuses `manifest_tampered`, `unknown_slot`, `slot_mismatch` and `off_manifest`. That last branch is unreachable through `freezeBlueprint()` — which already refuses `slot_off_manifest` — so it is exercised against a **hand-forged** blueprint of the shape a corrupted row or a future caller with its own blueprint would present, because a last checkpoint reachable only through the checks before it is not a last checkpoint. `023` §8's trigger is the **third** independent check and the one that binds the service role, an endpoint somebody writes in a hurry in 2027, and a repair script — 020 §5's argument, unchanged. It refuses and **never repairs**: a trigger that quietly re-pointed a mis-bound question would be T5 installed as a convenience. F.2.b holds throughout — a retest is admitted off-manifest with `counts_toward_coverage = false` and is attributed to its pattern (V.3.6), and a coverage slot is never attributed to a pattern. Provenance is written **at admission** with `prompt_version`, `manifest_hash` and `gates_passed`, because provenance added retroactively is not provenance — it is the handle M10-6's revocation sweep will need, and today's `ai_history` has none. |
| M10-3 | 2026-08-16 | — (uncommitted) | `lib/question-bank.ts`, `023` §5's `retained_question_bank` view. **THE FALLBACK HAS NO BYPASS, AND ITS ZERO-MODEL-CALL CLAIM IS MEASURED RATHER THAN ASSERTED.** F.5's bank is the **retained** one — questions this student already answered and that already cleared the seven gates. It is the right bank and it is **empty on day one**, which is the day a new student's first assessment runs, and a fallback that only works for returning students is not a fallback. So the bank has two tiers: **retained** (injected; the module does no I/O) then **seed** — twelve closed-form questions across five real concepts, keyed by **taxonomy path** rather than by a topic string or a hard-coded UUID, so a rename in the syllabus breaks a test rather than a student. A test resolves every seed entry against the **compiled taxonomy**, asserts each hangs off a `level: 'concept'` leaf, and asserts each survives gates 2, 3, 4 and 6 — the ones it will actually meet. The seed tier is deliberately **small and representative**: what this milestone owes is a fallback **path** that provably exists, is keyed by concept identity and produces manifest-compliant questions; twelve hundred entries would prove nothing more and would hide the mechanism inside the data. **V.3.3 passes as written**: generation fails for one concept, the retry count is asserted equal to `MAX_GENERATION_ATTEMPTS` (the bank is reached **after** N retries, not instead of them), and the bank supplies a question for **that** concept, with coverage intact. **Zero AI calls, proven by a moderator that throws if reached**: with `model: null` — the shape a refused guard, an absent API key or a timed-out route all arrive in — `model_calls` is `0`, the assessment still fills, and `manifestIsCovered()` is `true`. A bank question is **not admitted by a shorter route**: it runs `gateSlotBinding`, `gateSchema`, `gateStructure`, `gateAnswerability` and `gateNovelty` unchanged and then the same `admit()`, so the frozen-manifest re-check, the stem-hash rule and `023` §8's trigger all apply to it. Two of the seven are absent because they are **about a model call**, not because the bank is trusted: re-derivation would mean asking a model whether a human-authored key is right, which is B.20 pointing the wrong way and puts a model back in the path P.3.a keeps it out of. **A defect in the handoff was found and fixed here**: the header claimed the free regex half of gate 7 ran on the bank path and it did not — `scanForHarmfulContent` is now actually called (a pure function over strings, so the zero-call claim is untouched) and is deliberately **excluded** from the `gates_passed` provenance, because half a gate passed is not a gate passed and F.4.b's sweep reads that field. Provenance records `model: "bank"` as a **sentinel** rather than leaving a field blank, so a revocation of a prompt the row never ran under cannot sweep it up. **F.2.a's refusal is the ending, and the assessment never silently shrinks**: an empty bank yields a reported `unfillable` entry and `manifestIsCovered() === false`, so M10-4 has something honest to refuse on — *"refusing to verify is always available; verifying with a hole never is."* An unfillable **retest** is correctly not a coverage hole. Stems never repeat inside one assessment (F.5), and a malformed retained question is rejected while a well-formed one behind it is admitted. |
| M10-4 | 2026-08-16 | — (uncommitted) | `lib/assessment-verification.ts`, `024` §3/§9, `app/api/assessment/verify/route.ts`. **T5's LOAD-BEARING MITIGATION, AND "FAILS CLOSED" IS A SHAPE RATHER THAN A DILIGENCE.** The cheap version of *"fails closed"* is a careful function returning `false` on every error path somebody thought of; it survives until somebody adds a path nobody thought of. So `evaluateVerificationGate()` **collects reasons to refuse** and has **exactly one `return { satisfied: true`** — the last statement, guarded by `refusals.length === 0` — and a test counts them, because more than one way to satisfy a gate is more than one way for it to fail open. Every manifest entry must be **positively discharged**: an entry with no coverage row falls into the first branch and is a `coverage_hole`, never *"no evidence of a problem"*. The obligation is read from the **frozen** manifest (`023` §7 made it immutable after INSERT), so a projection that lost a row cannot shrink what must be covered. Nine shapes of missing data are driven through it in one table — no assessment, an empty manifest, no rows at all, an entry with no row, a bound-but-unanswered entry, two rows for one entry, a row naming a concept the manifest does not, a row from another assessment, and a row whose `covered` disagrees with its own counts — and **every one refuses**. **F.2 LAYER 4 IS STRICTLY STRONGER THAN 023 §4 AND NEEDED ITS OWN VIEW.** `assessment_coverage` answers *"is every entry BOUND?"*; F.2 layer 4 asks *"∃ **ANSWERED** question"*, so `024` §3's `assessment_verification_coverage` adds `questions_answered` and joins through `unrevoked_assessment_questions` — a revoked question is not evidence, so it cannot discharge an obligation either (M10-6's half, load-bearing here rather than decorative). It is a NEW view rather than an edit to 023, which is registered with its own checksum and may not be touched. **V.3.5 IS REFUSED FOUR TIMES, AND ONLY ONE OF THE FOUR IS THIS PROCESS.** RLS makes another student's session invisible; the gate returns a typed refusal naming **which** concept is unproven; M9's `applySessionTransition()` still decides the edge, so a terminal session or a stale tab is the same noop it was before M10; and `024` §9 installs the same predicate as a **trigger on `study_sessions`**, which binds the service role, a repair script and the next endpoint somebody writes in a hurry — 020 §5's argument, unchanged. The trigger has three `RAISE EXCEPTION`s and **no `ELSE RETURN NEW`**, asserted by a test that parses the function body. It is a THIRD trigger beside 021's two, which are named in `024` §10's verification block as things that must still exist — a gate installed by removing the machine it guards would be worse than no gate. **M9's STATE MACHINE IS NOT COPIED, EXTENDED OR EDITED.** `applyVerificationTransition()` calls `applySessionTransition()` and returns what it returns; it adds a precondition and subtracts nothing. A repo-wide fence asserts that the expression `applySessionTransition(…, 'assessment_completed')` occurs in exactly one file. `VerifiedTransition` is a branded type minted only on a satisfied gate — `FrozenBlueprint`'s mechanism, pointed at V.3.5. **ONE DIVERGENCE FROM V.3.4's LITERAL WORDING, RECORDED RATHER THAN TAKEN QUIETLY.** F.2.a names `close_reason = 'coverage_unfillable'`; `021`'s CHECK and M9's `CLOSE_REASONS` hold six values and neither may be edited by this pass (021 is registered with a checksum; `tests/study-session.test.mjs` asserts the two lists are identical). The precise reason is therefore recorded at **assessment** level — `023` §1 already has `status = 'unfillable'` — and the session closes through the edge E.2 already draws for *"closed without an assessment"*. `CLOSE_REASON_NOTE` renders both as the same sentence, so **nothing a student sees changes**; what changes is which table the reason lives in. Stated in `024` §11, in the module, and asserted by test. **F.2.a's ending is OFFERED, never performed**: the refusal reports `close_with` and the caller decides, because a student one answer short of coverage should be able to answer it, not find their session closed by the check that noticed. |
| M10-5 | 2026-08-16 | — (uncommitted) | `lib/assessment-grading.ts`, `024` §1, `app/api/assessment/answer/route.ts`. **THE WHOLE OF M10-5 IS ONE PURE SYNCHRONOUS FUNCTION, AND THAT IS THE POINT.** `gradeAttempt(question, submitted)` is **not `async`**, which is the strongest available statement of P.3.a: an asynchronous grader is one that *could* have gone somewhere, and this one demonstrably cannot. It is proven three ways rather than asserted — it runs to completion with `globalThis.fetch` replaced by a function that throws; its return value is asserted not to be a promise; and a source-level test refuses the strings `GenerationModel`, `Rederiver`, `Moderator`, `runGates`, `Anthropic`, `fetch(`, `await `, `async ` and `supabase` anywhere in the module. `app/api/assessment/answer/route.ts` is the second half of that claim: the grading endpoint imports **no SDK, no `ai-guard`, no classifier and no meter**, because grading a closed-form answer against a stored key needs none of them. **F.3.a IS ENFORCED BY SIGNATURE, LITERALLY.** *"The grading function's signature takes `(question, attempt)` and has no access to the personal model at all."* `gradeAttempt.length === 2` is asserted; `GradableQuestion` is a four-field `Pick` that carries **no `provenance` and no `student_id`**, so a grade cannot come out differently for a bank question than for a generated one, or for one student than for another — there is no third argument through which they could differ. **THE FILE IS SMALL BECAUSE THE REFUSALS ARE UPSTREAM, AND EACH ONE IS NAMED.** `short_text` is not in `CLOSED_FORM_FORMATS`, so there is no rubric arm and therefore no judgement arm; `answer_key` is a discriminated union already parsed by gate 2; gate 4 already refused a zero tolerance (which no student typing a decimal could satisfy) and a swallowing one (which every answer would satisfy), so the comparison is neither impossible nor vacuous; and `023` §9 makes `answer_key` immutable after admission, so **the key being graded against is the key the question was admitted with** — a key that could be edited after an attempt is a grade that could be changed after the fact. **TOLERANCE IS THE QUESTION'S, NEVER A GLOBAL CONSTANT**, because precision is a property of the physics; a test grades the same answer against two questions with different tolerances and gets different verdicts. **THE UNIT IS CHECKED BEFORE THE VALUE, AND THE ORDER IS THE POINT**: a student who wrote the right number in the wrong unit made a *different* mistake from one who wrote the wrong number, and F.6 turns that into `unit-error` rather than a cognitive gap — grading it as a plain wrong answer would erase the one signal that makes it fixable. An **absent** unit is not penalised: the surface renders the unit beside the field, so an absent one is the interface supplying it, and inventing a mistake out of a UI convention is the fabrication law 7 bans. **A SUBMISSION THAT DOES NOT FIT THE QUESTION IS REFUSED, NEVER MARKED WRONG** — a client bug or a forged request is not a wrong answer, and recording it as one would put a mistake in a student's record that they did not make (T4, one door along). **A BLANK IS WRONG AND `answered: false`** — a first-class answer rather than an absence, because F.6's classifier must tell "answered wrongly" from "left empty" and a `null` cannot carry that into an immutable record. F.7 is why marking it wrong is safe: an unfinished session moves no score in either direction. `024` §1 pins `grader` to a **CHECK of one value**, and `ai_proposed_student_confirmed` — F.4.a's short-text arm — is **absent rather than disabled**, the same posture `023` took for `short_text`. Attempts are append-only by `UNIQUE (question_id, attempt_no)` plus a trigger that refuses **every** UPDATE and DELETE: a re-answer is a new row, and a disputed grade is M10-6's revocation. |
| M10-6 | 2026-08-16 | — (uncommitted) | `lib/assessment-revocation.ts`, `024` §2/§3. **THE PROVENANCE HALF ALREADY SHIPPED, DELIBERATELY, AND M10-6 IS WHAT MAKES IT A CAPABILITY.** M10-2 and M10-3 write `provenance` **at admission** on every question — generated and banked alike — and `023` §2 makes the column `NOT NULL` with a CHECK naming `prompt_version`, `model` and `origin`, because *"provenance added retroactively is not provenance"*. So this task is the two things that turn the field into F.4.b: **the selector** and **the append**. **THE SELECTOR REFUSES TO SWEEP WHAT IT DID NOT CAUSE.** F.4.b keys on `provenance.prompt_version = v`; the subtlety is that a **bank question carries the current prompt version too**, so `prompt_version` alone would sweep up questions a human wrote and a model never touched — and a test asserts exactly that (`bank.provenance.prompt_version === '1'`) before asserting the bank row is **not** in the sweep. `origin` is what does the work, which is precisely why M10-3 wrote `model: "bank"` as a **sentinel** rather than leaving a field blank. A `manifest_hash` sweep, by contrast, correctly takes both — they shared the manifest. **THE APPEND CANNOT EXPRESS AN EDIT.** `buildRevocation()` takes the question and returns a revocation; it never returns the question, modified or otherwise, and a test `JSON.stringify`s the input before and after and compares. The **one** field that moves on the question is `retained` — F.8's *"the question is withdrawn from the bank"* — and `withdrawalPatch()`'s key list is asserted to be exactly `["retained"]`, which is also the only column `023` §9's immutability trigger permits. `024` §2's revocation table has its own append-only trigger, because the obvious omission is to protect the thing being revoked and leave the revocation editable, which would let a revocation be quietly un-revoked and leave no trace either happened. The module is asserted to contain no `DELETE`, no `.remove(` and no `splice(`. **A REVOCATION WITH NO STATED REASON IS REFUSED** — it would be a deletion with paperwork — and **no model may revoke**: `REVOKED_BY` has no `'ai'` value, which is P.3.a pointed the other way. A selector that does not actually select the named question is refused, so the audit trail cannot record a sweep that never happened. **WHAT HAPPENS TO AN ANSWER A STUDENT ALREADY GAVE — THE QUESTION F.4.b AND F.8 ANSWER TOGETHER, AND THE INSTINCT IS WRONG IN BOTH DIRECTIONS.** The grade is **not reversed**: it happened, and un-writing it would be editing history to make the product look like it had never been wrong. It **stops being evidence**: `evidence_revoked` is true from the moment the revocation lands, and `024` §3's coverage view already excludes revoked questions, so a revocation can turn a verified-shaped assessment back into one with a hole — F.8's *"excluded from every dimension"*. Crucially **`evidence_revoked` is DERIVED, not stored**: it is a join in `assessment_attempt_evidence`, so *"nothing is edited in place"* is a property of the schema rather than of this file's manners, and a test asserts no `evidence_revoked BOOLEAN` column exists. The occurrence is **superseded, not deleted** (`007`'s `supersedes`, carried since M1) and `occurrenceSupersessionFor()` emits the instruction; the merge and `recurrenceCount` recompute that follow are **M11's**, and inventing them here would be this pass reaching into the next milestone. A student is never told their answer was retroactively marked wrong, **because it was not** — the question was withdrawn, and what it proved was withdrawn with it. **THE SUPERSEDING EVENT IS JUDGED BY M7's OWN VALIDATOR, NOT BY A FIXTURE**, and doing so found a real defect: `supersedes_event_id` was optional, and D.3's `MISSING_SUPERSEDES` refuses an `EVENT_SUPERSEDED` that does not name what it supersedes (*"the only edit (C.2)"*). It is now **required** — a revocation that cannot say which fact it withdraws is not a correction, it is a gap. |
| M10-7 | 2026-08-16 | — (uncommitted) | `lib/assessment-mistakes.ts`, `024` §7/§8, `app/api/assessment/answer/route.ts`. **"BEFORE" IS AN ORDERING, SO IT IS ENFORCED AS A DATA DEPENDENCY AND NOT AS A CALL ORDER.** The cheap reading of M10-7 is *"call the logging function on a wrong answer"*; it passes review and it does not survive the failure F.6 is written against, because a fire-and-forget call is *started* before the next question renders and may complete after the tab is gone. So the value that grants permission to advance is **constructed from the resolved result of the occurrence write** — a caller cannot hold `advance.permitted === true` while the write is in flight, because permission is downstream of it in the promise graph. **PROVEN AS AN ORDERING, NOT AS A CALL.** The test holds `insertOccurrences` open on a promise it controls, lets every pending task run for 20ms, and asserts permission has **not** been granted — an assertion a call-order check structurally cannot make. It then releases, and asserts the completion trace is `graded → evidence_written → occurrence_written → occurrence_confirmed → advance`, with `indexOf('occurrence_written') < indexOf('advance')`. **A FAILED WRITE REFUSES TO ADVANCE**, which is F.6's argument taken literally: *"a student who closed the tab mid-assessment would produce answered-and-wrong questions with no occurrence — an evidence gap the record could never reconstruct."* F.7 is why that refusal is safe to make: an unfinished session moves no score in either direction, so a student who hits it loses a click; a student who did *not* hit it, in a version that logged asynchronously, would lose the evidence — and that loss is the irreversible one. A failed **evidence** write refuses too, and a test asserts no occurrence was attempted: no occurrence without proof (§3.2). **WHY THIS OCCURRENCE IS SYSTEM-CONFIRMED, AND EXACTLY HOW FAR.** `020`'s gate exists because a draft is *"a reading of a photographed paper"* — a model's inference over an image — and an inference is not a fact (L1); the student confirms because only the student holds the paper. A graded answer is a different kind of object: F.4.a grades it *"100% deterministically … no model in the path"*, so the system does not **believe** the student got it wrong, it **computed** that they did, and asking them to confirm would be asking them to agree that 3 ≠ 4. **But only the half that is actually deterministic**, and the split is F.6's own, not a new one: *"1. DETERMINISTIC FIRST where the question format allows it … 2. AI-PROPOSED OTHERWISE, PRESENTED TO THE STUDENT FOR CONFIRMATION. 3. Student's classification always wins."* So a blank, a `unit_mismatch` and a sign error are computed and auto-confirmed; **everything else is a draft and M8-5's gate applies unchanged**. V1 has no AI classifier at all, so tier 2 is *a draft awaiting the student* rather than a model's guess — strictly more conservative than F.6 permits. `024` §7 tells the two apart in the schema rather than averaging them: `confirmed_by` is added (020 §7's *"there is exactly one actor"* argument expires here and is **replaced rather than ignored**), constrained to `student | assessment`, and a CHECK refuses `confirmed_by = 'assessment'` unless `origin = 'assessment'` — without which system-confirmation becomes a way to auto-confirm an AI extraction, which is exactly the gate M8-5 exists to hold shut. `020`'s column grant is unchanged and does the rest: `authenticated` may UPDATE `confirmed_at` **and nothing else**, so a student cannot write `confirmed_by` at all. **THE CLASSIFIER CANNOT PRODUCE THE SHAPE THAT WOULD CLOSE AN OPEN DECISION.** F.6's note records that `mergeKeyFor` answers `ambiguous-error-classification` when an occurrence carries both classes, and calls the product decision **open**. Every arm of `classifyWrongAnswer` returns exactly one non-null class, asserted exhaustively over six cases, so the open decision stays open rather than being closed by accident. A sign error is never claimed on a **zero** key (the check is against the negated value, not `Math.sign`), and a blank is `ran-out-of-time` only past a server-owned constant threshold — E.3's argument about `IDLE_MINUTES`: a machine whose thresholds vary is a machine no test can pin. **THE ROW GOES THROUGH M8's OWN BUILDER**, not a second one, so `007`'s four structural invariants and `020`'s refusals apply to an assessment-originated occurrence exactly as to a photographed one; a second row builder would be a second place for those invariants to rot. It carries **no `proposal_confidence`** (a deterministic grade has no confidence, and a number would invent a judgement — `020`'s own reason for refusing one on a manual entry), **no `pattern_id`** (M11 owns the merge; `007` permits an occurrence to exist before one claims it), and **no `confirmed_at` key at all** — absent, not null, because `020`'s trigger refuses a born-confirmed row. **V.4.1's `evidence_id` POINTS AT THE ATTEMPT**: the evidence row's `storage_ref` is `attempt:<attempt_id>` and its `content_hash` is derived from the attempt id, so `007`'s `evidence_student_hash_unique` makes a retried submit idempotent — M8-2's *"the constraint decides"*, reused — with `024` §7's partial `UNIQUE (assessment_attempt_id)` doing the same one table along. **AN UNRESOLVED DECLARATION DOES NOT STRAND THE STUDENT**: `text:` refs have no concept UUID, `007` requires one and B.4 forbids guessing, so no occurrence is written, the **attempt** still is, and the student advances — a known and accepted gap in the record rather than a lost write or a locked screen. |
| M11-1 | 2026-08-16 | — (uncommitted) | `lib/mistakes/store.ts`, called from `app/api/assessment/answer/route.ts`. **T12 IS RETIRED FOR `lib/mistakes/*`: the engine has a production caller for the first time since M1.** G.1 recorded the defect by name — *"**CURRENT FACT: zero production importers.** … What is missing is a server data-access layer and a capture path — **not domain logic**"* — and a test now walks `lib/` and `app/` and fails if no non-test file imports the store. **The store contains NO domain logic and a test enforces that**: it does not decide which leaf an occurrence joins (`mergeOccurrence`), does not compute severity (`computeSeverity`, reached through `lib/mistake-severity.ts`), does not decide a transition (`applyTransition`) and does not decide resolution (`canResolve`) — it reads rows, hands them to the engine, and writes what the engine returned. Assertions fail the build if it ever re-declares `SEVERITY_WEIGHTS` or `ALLOWED_TRANSITIONS`. **The client is injected as ten verbs (`MistakeDnaDb`), never as a `SupabaseClient`** — the split M8-3 made over `lib/ingest/runner.ts`, for the reason stated there: *"the column mapping is the part that can be silently **wrong**, so it is the part a test must reach with no database in the room."* The interface has **no general `update` verb**; `updatePatternDerived` may write only severity, provenance, recurrence and the seen-at pair, so no caller can move a pattern to `resolved` by writing a column. **The call site runs AFTER `advance` is already decided and can never withhold it** — F.6's ordering guarantee is about the OCCURRENCE, which `logAssessmentMistake()` (M10-7) has written by then; Mistake DNA is an INFERENCE over that fact (G.2), and an inference that could not be drawn must not cost a student the answer they already gave. It is additionally gated on `logged.confirmed`, because drawing a pattern from a draft would infer recurrence from a proposal the student has not agreed with. Every failure is a typed refusal reported to Sentry and returned as `mistake_dna: { refused, detail }` — never a silent absence, and never a throw. |
| M11-2 | 2026-08-16 | — (uncommitted) | `lib/mistake-severity.ts`, `025` §2. **G.6's ONE GENUINE SPECIFICATION GAP IS CLOSED, AND THE FILE DOES NOT CONTAIN THE FORMULA.** G.1.a: *"how those factors are derived from raw domain data is not specified. That derivation is the missing piece."* This module derives the four normalised 0–1 factors exactly as G.6's table specifies — `marksWeight` relative to the student's own open leaves (so small papers are not systematically low-severity), `recurrenceWeight` over a 180-day window matching `Pattern.recurrenceCount`'s own definition, `examProximity` linear from 1 at ≤3 days to 0 at ≥60, `conceptExamWeight` normalised against the subject max — and hands them to `computeSeverity()` in the engine, which is the single place `40·/30·/20·/10·` lives. **A test fails if the coefficients ever appear in this file.** **It is VERSIONED**: `SEVERITY_FACTORS_VERSION = 'sf_v1'` is stamped on every derivation and written to `patterns.severity_version`, with the four inputs in `severity_factors` JSONB so a severity is explainable without re-reading the marks, the exam calendar and the taxonomy as they were on the day. The argument is M6's for `taxonomy_version` and M10's for `prompt_version`: a 62 written under v1 and a 62 written under v2 would be indistinguishable and would not mean the same thing, and §4.6's promise that *"formula improvements upgrade every existing pattern retroactively"* is a recompute whose need must be **detectable** (`WHERE severity_version <> 'sf_v1'`) or it never happens. **It REFUSES rather than repairs** — six typed refusals covering negative marks, negative occurrences, negative or incoherent exam weights and non-finite input; a negative mark count is not a small severity, it is a caller reading the wrong column, and a clamped 0 would hide that forever. **`examProximityKnown` distinguishes "no exam is near" from "we have no idea"**, both of which produce a 0 factor — V.4.9's posture applied to a number. **G.6.a is restated at the site and NOT fixed**: `examProximity` is 20% of severity and §4.10 then ranks by `severity × examProximity`, applying it twice; the architecture flagged it for founder decision before ranking ships, and fixing it here would be a plan silently amending a decision. |
| M11-3 | 2026-08-16 | — (uncommitted) | `lib/mistakes/types.ts` and `supabase/migrations/025_mistake_dna.sql` §1. **`007_mistakes.sql` IS BYTE-UNCHANGED AND A PINNED CHECKSUM PROVES IT** (`46ae6e0b…62a`), because M1's ledger records *"this exact text was run"*, not *"something like this was run"*, and editing an applied migration is exactly the drift class T1 exists to catch. The two widenings are ALTERs in a new migration: `occurrences.source` gains `'in-session-assessment'` (not `mock` and not `past-paper` — those name real papers a student sat elsewhere, and borrowing one would put a school exam in the record that never happened) and `evidence.type` gains `'assessment_attempt'` and `'declaration'`. **The first is non-negotiable rather than convenient** — G.3: *"for an in-session mistake the evidence is the assessment attempt itself … Without that, the engine's own principle would force fabricating evidence, which `migrate-legacy.ts:8-18` correctly refused to do."* **Additivity is asserted, not asserted-about**: tests re-check that all seven original `source` values and all three original `evidence.type` values still appear in the widened CHECKs and still appear in `types.ts`, that `007` contains none of the new spellings, and that `025` performs no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` or `DELETE FROM`. Everything `types.ts` gained below the M1 file is appended, and no existing shape gained a required field, so every value that type-checked before still type-checks. **M10's already-written rows are NOT re-pointed** — `lib/assessment-mistakes.ts` writes `source = 'self-test'` and `type = 'manual'` as compromises pending this widening, and changing values on rows that already exist is a data correction under Part O.4 (append and supersede), not an additive schema extension. This migration makes the correct values REPRESENTABLE; `isAssessmentOriginated()` reads both spellings so nothing depends on the restatement having happened. |
| M11-4 | 2026-08-16 | — (uncommitted) | `lib/mistake-retest.ts`, `025` §3/§4. **THE FIRST RUNG OF THE LADDER IS `RESOLUTION_COOLING_DAYS` ITSELF, NOT A SECOND SEVEN.** `RETEST_INTERVALS_DAYS = [RESOLUTION_COOLING_DAYS, 14, 30, 60]` — if the first retest were due at 3 days the student would sit a retest that cannot contribute to resolution no matter how they do, the schedule asking a question the resolution gate has already agreed to ignore. Deriving the rung from the engine's own constant makes the two **incapable** of disagreeing, and a test asserts the identity. **`dueAt` is `lastSeenAt + 7`, never `correctedAt + 7` and never `now + 7`** — `canResolve` measures from `pattern.lastSeenAt`, so one origin means the schedule and the gate can never disagree about which day is day 7; G.8's *"immediate retry"* is therefore never a retest, because it happens at `lastSeenAt + ~0`. Intervals expand on success and reset to rung 0 on failure, saturating at the top rather than inventing a retirement policy G.8 never named. **The gate is a real constraint in three independent places, each separately tested**: the engine's `canResolve` (untouched — G.1 says KEEP, and a second copy of the cooling arithmetic here would be the first thing to drift); `attemptResolution()`, which strips immediate retries from the proof set **before** counting so a pattern whose only correct answers are immediate retries returns `immediate-retry-is-not-proof` rather than an uninterpretable count, and which treats the schedule's `dueAt` as a **second, independent floor** so an old correct answer cannot resolve a freshly-broken pattern whose ladder just reset; and `025` §4's `BEFORE INSERT OR UPDATE` trigger, which raises on any `due_at` inside `last_seen_at + INTERVAL '7 days'` — 020 §5's reason restated: *"RLS does not apply to the service role … only a trigger protects against the next endpoint somebody writes."* V.4.3, V.4.5 and V.4.6 are walked day by day as tests, including V.4.5's specified refusal ORDER (`insufficient-correct-answers` → then `cooling-period-not-elapsed`). One schedule per pattern, by primary key: two would let a pattern be resolved by whichever schedule was looser. |
| M11-5 | 2026-08-16 | — (uncommitted) | `025` §5/§6/§7, over M7's `lib/event-contract.ts` and M1's `lib/mistakes/engine.ts`, both untouched. **THREE REFUSALS THAT NO SINGLE CHANGE DISABLES, BECAUSE THEY ARE THREE DIFFERENT KINDS OF THING**: a Postgres policy, a pure TypeScript function with no I/O, and a validation table on the event contract. Each catches what the others cannot see — RLS never sees a service-role write, `applyTransition` never sees a raw POST, ingest never sees a direct PostgREST call — and a test asserts the engine does not import the contract and the contract does not import the engine, so the independence is structural rather than claimed. **The hole that was actually open was INSERT, not UPDATE.** `007:369-376` already refuses a client UPDATE that leaves a pattern `resolved` and that policy is correct and untouched; but `patterns_insert_own` was `WITH CHECK (auth.uid() = student_id)` and said nothing about `status`, so a client could POST a pattern **born** `resolved` and never update anything — the UPDATE policy would never see it. §6 narrows the INSERT policy to `status = 'open' AND resolved_at IS NULL` (strictly narrower: a client has never had a reason to insert a pattern in any other state), and adds a **column** grant — `REVOKE UPDATE ON patterns FROM authenticated; GRANT UPDATE (status, history)` — because severity is not a row-shaped question and a client that can write it can rank itself to the top of its own remediation queue. §7 adds the trigger that binds the **service role** too: a pattern may not be INSERTED as `resolved` by anyone ever (a transition has a prior state by definition, so an INSERT of a resolved pattern is a resolution with no history), only `practising → resolved` is permitted, and the `mistake_resolutions` row naming its proof attempts must **already exist** or the status change raises. §5's table has `proof_attempt_ids UUID[] NOT NULL CHECK (array_length(…) >= 2)`, `set_by CHECK (set_by = 'system')`, no INSERT/UPDATE/DELETE policy for anyone but the service role, and no DELETE policy at all — G.8: the prior resolution **survives** recurrence, because a student who fixed something, lost it and fixed it again has a better record than one who never fixed it. `measured_from` and `cooling_days` are stored rather than recomputed, since `patterns.last_seen_at` moves when the pattern recurs and a resolution must still say what it was proven against. |
| M11-6 | 2026-08-16 | — (uncommitted) | `lib/mistakes/migrate-legacy.ts` — **REVIEWED FOR STALENESS AND CHANGED IN NO WAY.** G.1's verdict is *"KEEP as-is, and recognise what it is"*, and the review confirms it: the file **deliberately does not create occurrences**, because legacy rows carry no evidence and `occurrences.evidence_id` is NOT NULL, so writing them would mean fabricating exactly the proof §3.2 exists to require. It preserves and MARKS — every migrated record carries `hasEvidence: false`, `promoted: false`, `source: 'legacy-v0'` and its original `legacyStatus` verbatim. **T2 is satisfied structurally rather than by intention**: a legacy `cleared` maps to `acknowledged` and never to `resolved` (*"a self-report is not proof"* — importing it as resolved would carry the fluency illusion straight into the new record), and `verifyMigration()` **fails the whole migration** if any record is found at `resolved`. `dropped` must always be 0 and verification enforces it, so the un-backfillable remainder is marked rather than discarded **or** invented. Five tests pin all of this, including that the module reaches no database and mentions no `occurrences` or `evidence_id` at all. **M11-3's widening did not make it stale**: `LEGACY_SOURCE = 'legacy-v0'` is localStorage metadata on an unpromoted record, not an `occurrences.source` value, so the widened CHECK does not apply to it and no new enum value belongs in this file. **IT WAS NOT EXECUTED.** It operates on browser `localStorage` and is run by a human in a real session, never by a migration and never from this repository — see the execution steps recorded with this milestone. |
| M12..M24 | — | — | **Not started** |

**M1 is not complete.** M1-1 and M1-2 are implemented in the working tree.
**M1-3 stays open** on one action the repository cannot take: applying
`010_score_history_active.sql` to production and confirming
`public.migration_ledger()` records version `010`. Only then may the
missing-column fallback in `app/api/cron/score-snapshot/route.ts` be deleted,
which is M1-3's done-when. Two further human actions gate M1-2 going live:
applying `009_migration_ledger.sql`, and adding `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` as repository secrets. **No migration in this
milestone was applied to any database** — the repository wrote what should be
applied; nothing here ran it.

**Verification basis for the M1 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` compiled successfully · `node
--test tests/*.test.mjs` — **411 pass, 0 fail** (387 before M1; +24 in
`tests/migration-ledger.test.mjs`) · `node scripts/check-migrations.mjs
--structure-only` exit 0 over 12 files, and exit 1 with credentials absent ·
`.github/workflows/migration-gate.yml` parsed as YAML, both jobs and all steps
resolving. The SQL in `009` and `010` was **not executed** — it is reviewed by
reading only, and both files are idempotent (`IF NOT EXISTS`, `ON CONFLICT DO
NOTHING`) so a re-run cannot clobber a database that is already correct.

**M2 is implemented in the working tree, with one qualified row.** M2-1..M2-4
are closed. **M2-5 is closed against what was actually found rather than against
its stated shape:** of the four components `PRODUCT_DECISIONS` §1.5 lists as
duplicated, one (`CrunchTab`) genuinely was and is now single-definition; two
(`MindMapTab`, `ConceptConnectTab`) share an engine but have diverged in layout
and in feature set, so only the identical halves were extracted; and one
(`FormulaTab`) is a name collision between two unrelated tools. Consolidating the
divergent halves would change what a host renders, which this milestone forbids.

**Recorded as a documentation defect, for §1.5 to resolve, not for a plan to
decide** (`CLAUDE.md`: a plan may not contradict a decision): (a) §1.5 states
EXPERIMENTAL — 21 but names 19, and the only two tools it leaves unnamed are
`study-command` and `focus-lab`; the registry classes them EXPERIMENTAL, which is
the reading that makes the stated count correct, and a test pins 13/12/21/0.
(b) §1.5's LEGACY table calls `CrunchTab`, `MindMapTab`, `ConceptConnectTab` and
`FormulaTab` "duplicate functionality"; that holds for the first and is wrong or
partial for the other three, per M2-5 above.

**Verification basis for the M2 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` compiled successfully in 15.6s,
76/76 static pages generated, **all 46 `/tools/*` routes present in the build
output**, plus `/console/ai` and `/dashboard/saved` · `node --test
tests/*.test.mjs` — **437 pass, 0 fail** (411 before M2; +26 in
`tests/tools-registry.test.mjs`) · `ls -d app/tools/*/ | wc -l` = 46, unchanged
before and after — no `page.tsx` was deleted, moved or route-guarded ·
`git diff` on `lib/ledger-score.ts` and `lib/ledger-score-v2.ts` empty — M2
moved no score. The +26 tests assert the derivation at every level against
synthetic manifests, so P.3 is proven to work rather than trivially satisfied by
today's all-Level-0 reality.

**M3 is implemented in the working tree.** M3-1..M3-3 are closed. T10 is
retired: one route computes and renders the Ledger Score as a shell, so the
event layer (M7) lands under one surface rather than two.

**Two judgement calls are recorded rather than resolved by this plan**
(`CLAUDE.md`: a plan may not contradict a decision, and a decision may not be
made in passing):

1. **308, not 301.** §2.4 and the M3-1 row of the task table both say "301".
   The redirects use Next's `permanent: true`, which emits **308** — the same
   permanence, the same SEO treatment, and consistent with the four tool
   redirects already in `next.config.mjs`. A literal 301 would need
   `statusCode: 301`, which cannot be combined with `permanent` and would make
   these two rows differ from the other four for no behavioural gain.
2. **`/home` has no navigation chrome.** The Console shell deliberately never
   mounted `AppNav`, and Home inherits that: the tools drawer, ⌘K and the
   profile chip live on every `/tools/*` route but not on Home, which now
   carries a single tertiary Settings control. This is survivable because the
   one move always leads to a route that has the nav, but **what chrome Home
   carries is a composition question and belongs to M22**, not to a structural
   merge.

**Not built, and not claimed:** Part M in full — the component registry, the
four importance tiers, layout resolution, server-persisted `HomeLayout`,
`mobile_rank`. `/home` is one fixed page. **That is M22.** The dashboard's
former components (`components/dashboard/*`, `dashboard-skeleton`,
`empty-chair`, `lib/dash-layout.ts`) are left in place and unmounted rather
than swept up, because which of them return, in what order and at what size is
exactly what M22 decides.

**Verification basis for the M3 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` compiled successfully in 12.2s,
77/77 static pages generated, `/home` present, `/dashboard` and `/console`
present as **308 redirects to `/home` in `.next/routes-manifest.json`** with
exact-path regexes, and all 46 `/tools/*` routes still present including
`exam-day`, `panic-triage` and `exam-triage` · `node --test tests/*.test.mjs`
— **456 pass, 0 fail** (437 before M3; +18 in `tests/home-shell.test.mjs`, +1
from splitting one amended assertion in `tests/tools-registry.test.mjs`) ·
`git diff` on `lib/ledger-score.ts` and `lib/ledger-score-v2.ts` empty — M3
moved no score.

**One M2 test was amended, and the amendment is narrower than it looks.**
`tests/tools-registry.test.mjs` asserted that `app/dashboard/page.tsx` still
read `NAV_CATEGORIES` — true when M2-2 deleted the duplicate catalogue and
false the moment M3-3 retired the page. The M2 guarantee is unchanged and is
what is now asserted: no product surface declares its own catalogue, and the
surviving navigation surfaces read the registry. Only the surface moved.

**M4 is implemented in the working tree. M4-2 and M4-3 are closed. M4-1 is
BUILT AND READY, with enforcement left off pending one human verification in a
real browser.** The blocker recorded here previously is gone; what replaced it
is a smaller and different thing, and the distinction is the point.

**What the blocker was.** The browser session lived in `localStorage`:
`lib/supabase.ts` called `createClient()` from `@supabase/supabase-js` with no
`auth.storage` override, so the SDK used its default browser adapter. Middleware
runs at the edge, which can read cookies and cannot read localStorage, so every
request arrived carrying no evidence of a session — valid ones included. A
fail-closed check against that transport would have signed out one hundred per
cent of users rather than protecting anything.

**What was done.** The session moved onto cookie transport.
`lib/supabase.ts` now builds the browser client with `createBrowserClient` from
**`@supabase/ssr` (0.12.4 — a new dependency, added deliberately)**, whose
storage adapter is `document.cookie`. `auth.detectSessionInUrl: false` is
preserved, because `app/auth/callback/page.tsx` exchanges the PKCE code by hand
and letting the SDK also try would race it. `lib/supabase-server.ts` keeps the
service-role client exactly as it was and gains
`createStudentServerClient()` — the anon-key, cookie-reading, RLS-scoped server
client that M5's `getStudentContext()` will need, derived from the same cookie
the edge gate reads so the two cannot diverge.

**The cookie contract, read out of the library rather than guessed.**
`@supabase/ssr` names cookies after the auth storage key verbatim, and
`supabase-js` derives that key as
`sb-${new URL(url).hostname.split(".")[0]}-auth-token`. `createChunks()` writes
one cookie under the bare key when the encoded value fits `MAX_CHUNK_SIZE`
(3180) and `key.0`, `key.1`, … when it does not — the common case, since values
are base64url-encoded first. Attributes are `path=/`, `SameSite=Lax`,
`Max-Age=400d`, `httpOnly: false` (necessarily false — the browser writes them
itself). `lib/auth-routes.ts` was reconciled against that: the project-ref class
widened from `[a-z0-9]+` to `[a-z0-9-]+` so a custom or self-hosted hostname is
not misread as *signed out*, and a second, explicit `-code-verifier` exclusion
was added so that widening can never quietly re-open the one fail-open case.
0.12 writes **three** PKCE keys, not one — `…-auth-token-code-verifier`,
`…-auth-token-flow-<id>-code-verifier`, `…-auth-token-flows-code-verifier` —
and all three, chunked and not, are now asserted to be non-sessions.

**Existing signed-in users migrate rather than being logged out.**
`migrateLegacyLocalSession()` in `lib/supabase.ts` reads the old localStorage
entry once on first load and replays its two tokens through `setSession()`,
which writes them to the cookie store; `components/auth-provider.tsx` awaits it
before its first `getSession()`, so no read observes the half-migrated state.
It fails safe in every direction: an already-present cookie session wins and the
stale copy is discarded rather than replayed; malformed JSON, missing tokens, a
rejected refresh token or unavailable storage all degrade to the ordinary
signed-out state, which `AuthGuard` answers with a normal sign-in page, not an
error.

**The legal pages were corrected.** Both stated the product sets no cookies.
`/legal/privacy` and `/legal/data` now describe the single strictly-necessary
first-party authentication cookie factually — its name, that it exists only
while signed in, that it is `SameSite=Lax` and site-scoped, that signing out
deletes it, and that being essential to a requested service it does not trigger
a consent banner. Nothing else on either page changed.

**Why enforcement is still off.** `AUTH_MIDDLEWARE_ENFORCE` remains **off
unless set to `"1"`**. The remaining gap is verification, not architecture: no
one has yet watched a real browser complete a real sign-in against the real
project and confirm the cookie lands. The failure mode of being wrong is that
nobody can use the product, which is not a risk worth taking on inference. The
gate is a named single switch, not a fail-open — `authDecision()` computes
`denied` identically in both modes and enforcement suppresses only the *action*,
and `verdict.observedOnly` marks the suppressed case.

**Before flipping it on, a human should verify in a real browser, on a preview
deploy, with `AUTH_MIDDLEWARE_ENFORCE=1` set on that preview only:**

1. Sign in with email + password. In DevTools → Application → Cookies, confirm
   a cookie named `sb-<ref>-auth-token` (or `sb-<ref>-auth-token.0` / `.1`)
   exists for the site, with `Path=/`.
2. Confirm `/home`, `/tools/<any>`, `/dashboard/profile` and `/console/ai` all
   load rather than bouncing to `/auth`.
3. Sign in with **Google** and confirm the same, since that path runs through
   `signInWithIdToken` in `app/auth/callback/page.tsx`, not `signInWithPassword`.
4. Sign out. Confirm the cookie is gone and `/home` now redirects to `/auth`.
5. Open a private window, visit `/home` signed out, and confirm the redirect —
   then confirm `/`, `/pricing`, `/faq`, `/legal/*`, `/parent/<code>` and
   `/admin` are all still reachable.
6. **The migration:** in a browser that was signed in on the OLD build, load the
   new build once and confirm the student is still signed in, that the
   `sb-…-auth-token` cookie now exists, and that the localStorage key of the
   same name is gone.
7. Open the sign-in page but do **not** complete it, then navigate to `/home`.
   The half-started flow leaves only `…-code-verifier` cookies; the redirect
   must still happen. (This is asserted in tests, but it is the one fail-open
   worth seeing once.)

Only then set `AUTH_MIDDLEWARE_ENFORCE=1` in production. Until it is set, T11
stands — the posture is "survivable while everything is client-side and
RLS-protected", `AuthGuard` (M4-2) is the live gate, and **no milestone that
server-renders student data may ship first.**

**Verification basis for the M4 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` compiled successfully in 13.7s,
`ƒ Proxy (Middleware)` emitted, all 46 `/tools/*` routes and every public route
still present · `node --test tests/*.test.mjs` — **498 pass, 0 fail** (456
before M4; +35 in `tests/auth-middleware.test.mjs`, then +7 more in the same
file for the cookie-transport pass: the three PKCE keys 0.12 writes, and six
pinning the browser client to `@supabase/ssr`, the storage-key derivation, the
migration, and the migration ordering inside the provider) · `git diff` on
`lib/ledger-score.ts` and `lib/ledger-score-v2.ts` empty — M4 moved no score.
**Both directions are proven, not just the deny:** 13 protected paths are
asserted to redirect with no session and to be allowed with a realistic
`sb-<ref>-auth-token` cookie in both its single and chunked forms, and 13
public paths (`/`, `/auth`, `/auth/callback`, `/auth/reset`, `/pricing`,
`/faq`, `/legal`, `/legal/{privacy,terms,data}`, `/limit`, `/parent/<code>`,
`/admin`) are asserted reachable with no session *under enforcement*. The one
subtle fail-open — accepting the PKCE `…-auth-token-code-verifier` cookie,
which exists before any session does — is excluded by construction and pinned
by its own test. **The SQL in `011` was not executed**; it is idempotent
(`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) and its copy step probes
`information_schema` rather than assuming columns the repository never
described.

**M5 is implemented in the working tree, and one of its four rows cannot be
closed by the repository alone.** M5-2, M5-3 and M5-4 are closed. **M5-1 is
written and NOT applied**, which is the same standing M1-1, M1-3 and M4-3 have:
the repository's half of a migration is writing it down; running it is the
founder's.

**What must happen against live infrastructure before M5-1 counts as done, in
order:**

1. Apply `supabase/migrations/012_students_and_profiles.sql` in the Supabase SQL
   editor. It is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) and ends
   with a `DO $$` block that raises if RLS is off, if a non-SELECT policy exists
   on either table, or if any student ends up with more than one current
   version.
2. **Inspect the backfill before trusting it.** Section 6 derives version 1 of
   each chain from the flat `user_data` columns. Compare a handful of rows
   against their source — in particular that `user_data."interests"` landed in
   `student_profiles.subjects` and that `student_profiles.interests` is NULL,
   which is deliberate (§7: nothing was ever collected for non-curricular
   interests, so nothing may be invented for it). This is the same standing
   instruction `011` carries about its own copy step.
3. Confirm `select * from public.migration_ledger() where version = '012'`
   returns a row. **Only then** may the legacy fallback in
   `lib/student-context.ts` be deleted; the removal condition is written into
   that file's header, as M1-3 wrote its own into the score-snapshot cron.
4. Only after every reader has moved off the flat columns may the commented
   `DROP COLUMN` block at the foot of `012` be run. It is a one-way door and
   belongs to a later, separate migration run.

**Two things M5 deliberately did NOT do.**
`AUTH_MIDDLEWARE_ENFORCE` was not flipped — that is M4-1's outstanding human
verification and is unchanged by this milestone. And **`getStudentContext()`
has no call sites**: it is the server-side identity M5-2 was asked to build,
but wiring server components onto it is gated on that same verification (*"no
milestone that server-renders student data may ship first"*), and the AI
boundary's `buildProfileContext` is an S.5 row, not an S.1/S.6 one. Building
the function without callers is the intended shape of this task, exactly as
M4-1 built `createStudentServerClient()` without callers for M5.

**One residue outside M5's file scope, recorded so it is not mistaken for an
oversight.** `app/auth/callback/page.tsx` — the Google OAuth and PKCE landing —
routes to `/home` unconditionally, so a **first** Google sign-up still skips
onboarding. M5-3's file scope is `app/onboard/page.tsx` and
`app/auth/page.tsx:80-91`, and the callback is neither; the same
`landingRouteFor` decision belongs there and is a small follow-up. The
password-signup path, which is the one S.6 names, is fixed at both its doors.

**Verification basis for the M5 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled successfully in
13.0s*, 77 static pages generated, `ƒ Proxy (Middleware)` emitted, `/onboard`,
`/auth` and `/` all still present · `node --test tests/*.test.mjs` — **549
pass, 0 fail** (498 before M5; +51 in `tests/student-context.test.mjs`) ·
`node scripts/check-migrations.mjs --structure-only` exit 0 over 14 files, `012`
carrying its own body checksum · `git diff` on `lib/ledger-score.ts` and
`lib/ledger-score-v2.ts` empty — M5 moved no score. **The SQL in `012` was not
executed.** It is reviewed by reading only. The behavioural half of M5-2 is
proven against the compiled `lib/student-profile.ts` rather than asserted: the
server value wins over a conflicting cached one, fields are decided
independently, the cache still fills a genuine gap, an empty string or empty
array on the server does not outrank a real cached value, and one test
constructs the case where the old `{ ...server, ...local }` would have returned
the stale board and asserts the new rule does not.

**M0 is complete.** Every row of the M0 task table is closed: M0-1..M0-4 and
M0-6..M0-12 are implemented in the working tree, and M0-5 is relocated to
**M14-2** by the 2026-08-11 amendment. Nothing in M0 remains open.

**Verification basis for the M0 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` compiled successfully · `node
--test tests/*.test.mjs` — **387 pass, 0 fail** (372 before M0-6/M0-10; +14
new fences in `tests/m0-integrity-fences.test.mjs`, +1 net in
`tests/score-projection.test.mjs` where one streak-reminder test became two
no-streak assertions) · `git diff` on `lib/ledger-score.ts` and
`lib/ledger-score-v2.ts` empty — M0 moved no score. One pre-existing flake was
made deterministic while verifying: the exam-dedup test built its dedup key
from two separate millisecond-precision `inDays(7)` calls, so it failed at
random; the date is now computed once. No assertion changed.

**Known residue, deliberately left to later milestones** (recorded so it is
not mistaken for an oversight): `lib/ledger-score.ts:245-248` still generates
the next-action strings *"Start a Focus session today to open your streak"*
and *"Protect your N-day streak"*, which surface wherever `breakdown.actions`
is rendered. Removing them means editing the scoring file, which M0 may not
do; they die with the consecutive-day term at **M14-2**. The `"Streak"` pillar
label on `/dashboard` and the *"Focus streak"* figure and pillar description on
`/tools/grade-tracker` are likewise left in place: while the Consistency term
*is* a consecutive-day count, renaming its label would hide the mechanic rather
than remove it, and §9.3 is explicit that M14-2 is *"a rebuild, not a rename"*.
Per-habit streaks in `/tools/study-command` and the streak figure in
`app/api/send-report/route.ts` are separate surfaces outside the M0-6 file
scope. Streak copy in `/faq` and `/legal/privacy` describes the score as it
still computes today and stops being true at M14-2.

**M6 is implemented in the working tree, and like M1-1, M4-3 and M5-1 it cannot
be finished by the repository alone.** M6-1, M6-2 and M6-3 are built. What is
**not** true yet is that any database has a concept in it: `013` and `014` are
written, checksummed and registered, and **neither has been applied**. Until
they are, `lib/concepts.ts` answers every query from the compiled seed tree and
says so through `source: "compiled_seed"`, exactly as `getStudentContext()`
reports `user_data_legacy`. A degradation the caller can see is the M5-2
precedent; a silent one is not.

**What must happen against live infrastructure before M6 counts as shipped, in
order:**

1. Apply `supabase/migrations/013_concept_identity.sql`. It is additive and
   idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`,
   guarded `ADD CONSTRAINT`) and ends with a `DO $$` block that raises if either
   new column is missing or a non-SELECT policy exists on `concept_aliases`.
2. Apply `supabase/migrations/014_concepts_cbse_physics_seed.sql`. It requires
   013 (it writes `taxonomy_version`), is idempotent by `ON CONFLICT (id) DO
   UPDATE`, **never touches `merged_into`** — a re-seed refreshes what a concept
   is *called* and never un-merges one — and raises if fewer than 316 rows are
   present when it finishes, because a partial taxonomy is worse than an absent
   one: it looks present and is not.
3. Confirm `select * from public.migration_ledger() where version in
   ('013','014')` returns two rows. **Only then** may the `compiled_seed`
   fallbacks in `lib/concepts.ts` be deleted; the removal condition is written
   into that file's header, as M1-3 wrote its own into the score-snapshot cron
   and M5-2 into `getStudentContext()`.
4. Run `verifySeedAgainstDatabase()` once against the live table and confirm
   `ok`. It reports and never repairs — a repair would be a silent write to a
   curated asset from application code.

**What M6 deliberately did NOT do, recorded so none of it reads as an
oversight.** No UI, no tool page, and no existing surface was wired to the
concept model: B.4's outputs are consumed by events (M7), sessions (M9),
assessment (M10), mistakes (M11), coverage (M12) and search (M23), and building
a consumer here would be building M7 early on a substrate the plan forbids. No
embedding or AI-backed similarity was added — see the M6-3 row. `lib/mistakes/`
was not wired: `engine.ts` already takes `conceptId` as an opaque UUID and needs
nothing from M6, and its data-access layer is **M11-1**. `lib/taxonomy/build.ts`
and `lib/taxonomy/cbse-physics.ts` were **not modified at all** — no bug in
either blocked wiring them in, which is the strongest available evidence that
the seed tree was already correct and merely dark.

**T12 is retired for the taxonomy modules.** They are imported by shipped
application code, and the suite now exercises that shipped path rather than only
the pure builder: 316 concepts each resolve to their own id by name, every board
code resolves to its own concept, and a duplicate surface form anywhere in the
tree fails the suite. `lib/mistakes` and `lib/ingest` remain dark — M11-1 and
M8-3.

**Verification basis for the M6 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled successfully in
11.9s*, `ƒ Proxy (Middleware)` emitted, every route unchanged · `node --test
tests/*.test.mjs` — **612 pass, 0 fail** (549 before M6; +63 in
`tests/concepts.test.mjs`) · `node scripts/check-migrations.mjs
--structure-only` exit 0 over 16 files, `013` and `014` each carrying their own
body checksum · `git diff` on `lib/ledger-score.ts` and `lib/ledger-score-v2.ts`
empty — M6 moved no score. **The SQL in `013` and `014` was not executed**; both
are reviewed by reading only. The behavioural half is proven against the
compiled `lib/concept-resolution.ts` rather than asserted — the tier order in a
form where a wrong order returns a different concept id, the multi-hop merge
chain and its refusals, and the unresolved state including the V.2.4 scenario
verbatim, twelve hostile inputs that must not throw, and the byte-for-byte
preservation of what the student said.

**M7 IS COMPLETE IN THE REPOSITORY — all seven subtasks — and NOT YET SHIPPED.**
Four migrations (`015`, `016`, `017`, `018`) are written and none has been
executed against any database. The list of live-infrastructure steps below is
what stands between "complete" and "shipped", and until they are done M7's
substrate is code that has never met a Postgres.

*Amended 2026-08-15, second pass. This paragraph previously read "M7 is HALF
DONE, by design" and described M7-5/6/7 as a deliberately separate pass. That
pass has now happened; the original boundary was correct and is recorded in the
M7-1..M7-4 rows rather than erased here.*

**What the second pass did to the sentence the first pass wrote.** The first
pass asserted, by test, that `lib/sync.ts` still contained the
merge-by-string-length at `:67`. That test is now **inverted, not deleted**, and
dated in place: the boundary of part 1 is still a true fact about part 1, and
what changed is which side of it the repository sits on.

**The 15-second whole-blob upsert and the merge-by-string-length are gone.
A narrow, dated legacy flush is not.** `flushLegacyBlob()` still writes
`user_data.blob`, because the blob has **six live server-side readers** and all
six derive the shipped Ledger Score from it, while the event substrate has no
tool emitting (M8+), no projections (M12) and no event-derived score (M14).
Deleting the writer would have frozen every student's score — the Return beat
(§7.1) — in exchange for a tidier module, and S.1's verdict is **DELETE *after
backfill***, not delete first. The shim is change-gated, timer-free, scoped to a
named `ACADEMIC_KEYS` list, and carries its removal condition in its own header.
**This is the one thing in M7 that is narrowed rather than finished, and it is
recorded as such rather than counted as done.**

**Three places where this pass departed from the plan's literal wording**, each
because the architecture it cites requires it, and each argued in the file
rather than decided in passing: `legacy_blob` is a **write-once copy** and not a
rename of `blob` (017's header); **monthly partitioning is refused**, closing
015's re-opened flag (018 §0); and the backfill maps every legacy record to
**`EXTERNAL_STUDY_DECLARED`** rather than to the mistake and practice types
whose names line up, because those are evidence-bearing and a pre-epoch claim
must never move a score (`lib/legacy-backfill.ts`'s header).

**Two places where this pass departed from the plan's literal wording, both
because the architecture it cites requires it.**

1. **The partition key.** M7-7 implies monthly range partitioning; R.10 requires
   `UNIQUE(student_id, client_event_id)`; PostgreSQL cannot enforce a unique
   constraint that omits a partition key column. Range-on-time would silently
   demote the dedup constraint and restore T7 in full for exactly the case an
   offline outbox produces. 015 therefore partitions by `HASH (student_id)` and
   **flags M7-7's partitioning half as needing an explicit decision** rather than
   silently doing something incompatible with it. Full argument in 015's header.

2. **Where the "single endpoint" rule is enforced.** D.3 says only one server
   endpoint may write events; 007's precedent gives students an INSERT policy on
   the equivalent raw-evidence tables. Both are honoured: the endpoint is the
   only *validating* writer, and everything a direct insert could otherwise
   forge is already unforgeable — order, identity, receipt time and skew by the
   §3 trigger, ownership by the policy's `WITH CHECK`, and every system-only
   event type by a table CHECK. A client that bypasses the endpoint can write
   itself a badly-shaped payload. It cannot forge order, identity, time,
   ownership, or a mistake resolution.

**What must happen against live infrastructure before M7 counts as shipped, in
order.** *Steps 1–5 were written by the first pass; 6–10 are the second pass's,
appended rather than merged, because the first five must still happen first and
in that order.*

1. Apply `supabase/migrations/015_academic_events.sql`. Additive and idempotent
   (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR
   REPLACE FUNCTION`, `DROP POLICY IF EXISTS` then `CREATE POLICY`); it ends
   with a `DO $$` block that raises if the table is not hash-partitioned into 8,
   if the dedup constraint or the server-assign trigger is missing, or if any
   UPDATE/DELETE policy exists.
2. Apply `supabase/migrations/016_audit_entries.sql`. Same posture; it raises if
   a non-SELECT policy exists, if the append-only trigger is absent, or if
   `before_hash` is not uniquely indexed.
3. Confirm `select * from public.migration_ledger() where version in
   ('015','016')` returns two rows. **Only then** may the `unavailable` branches
   in `lib/events.ts` be deleted; the removal condition is written into that
   file's header, as M1-3, M5-2 and M6-1 each wrote their own.
4. **Verify against the live database the four things a pure test cannot
   reach**, because each is a property of PostgreSQL rather than of a function:
   that `seq` really is unforgeable through the trigger; that a second insert of
   the same `(student_id, client_event_id)` is absorbed by `ON CONFLICT` and
   returns the first `event_id`; that the `BEFORE UPDATE` triggers on
   `academic_events` and `audit_entries` refuse the service role; and that
   `append_audit_entry()` refuses a stale `before_hash` under concurrency.
5. Only after all of the above: apply the second pass's migrations. *(Written
   as "begin M7-5/6/7"; that work is now done in the repository, and what
   remains of it is the four steps below.)*
6. Apply `supabase/migrations/017_legacy_blob_freeze.sql`. It **copies**
   `blob → legacy_blob` under `WHERE legacy_blob IS NULL` and installs the
   freeze trigger, and it ends with a `DO $$` block that raises if any of the
   four columns is missing, if the trigger is absent, or if **any row has a
   non-empty `blob` and no `legacy_blob`** — i.e. if the freeze did not cover
   the table. It does **not** rename or drop `blob`, so every existing reader
   keeps working; 017 §5 states the condition for dropping it later.
7. Apply `supabase/migrations/018_event_compaction.sql`. Same posture; it raises
   if `academic_events` is no longer `HASH` partitioned, if
   `academic_event_compactions` has a non-SELECT policy, or if its append-only
   trigger is absent.
8. Confirm `select * from public.migration_ledger() where version in
   ('017','018')` returns two rows.
9. **Run the backfill, and verify it before trusting it.** It has never been
   executed. In order: (a) run it against a restored copy of production, not
   production; (b) confirm `select count(*) from academic_events where source =
   'migration'` equals the plan's `planned` figure and that **every** such row
   has `confirmation = 'unconfirmed'` and `confidence is null`; (c) **run it a
   second time and confirm the count does not change** — the idempotency is
   proven in a test against a simulated unique constraint, and the real one is
   the only place it can be proven against Postgres; (d) read the refusal list
   out of the `audit_entries` rows and confirm the un-backfillable remainder is
   what `REFUSED_KEYS` says it should be. Only then run it against production.
10. **Verify against the live database the three things a pure test cannot
    reach**, each being a property of PostgreSQL rather than of a function: that
    the freeze trigger refuses a second write to `legacy_blob` **even as the
    service role**; that `compact_attention_events()` raises rather than
    deleting when handed a `QUESTION_WRONG` id or an in-window row; and that
    `academic_event_compactions`'s unique index absorbs a re-run of an identical
    group range.

**What the FIRST pass (M7-1..M7-4) deliberately did NOT do, recorded so none of
it reads as an oversight.** *Three items below — "no backfill and no legacy-blob
read", "no compaction job", and the blob sync — were true of the first pass and
were done by the second; they are left standing as the record of that boundary,
and the second pass's own list follows this paragraph.* No UI. No tool page
wired to emit — every capability manifest still
declares `emits_events: []`, asserted by test, so the registry gate currently
refuses every tool-sourced event; M7 builds the pipe, not the water. No session
resolver (E.4 is M9), so `session_id` is `NULL` on every event and no FK to
`study_sessions` exists yet. No projections, no watermarks, no score change —
`lib/ledger-score.ts` and `lib/ledger-score-v2.ts` are untouched. No backfill and
no legacy-blob read. No compaction job. `lib/tools-registry.ts` was **not
edited**, so its narrower `AcademicEventType` union — a pre-M7 placeholder that
names `QUESTION_INCORRECT`, `PAPER_LOGGED` and `SYLLABUS_INGESTED`, none of which
are in Part D — still diverges from `EVENT_TYPES` in `lib/event-contract.ts`.
That divergence is harmless while every manifest declares `[]` and is
**flagged for the milestone that first wires a tool to emit**, which must
reconcile the two lists; reconciling it here would have been editing M2's output
for a benefit no shipped path yet consumes.

**What the SECOND pass (M7-5..M7-7) deliberately did NOT do.** It did not run
the backfill — it wrote it. It did not apply a migration. It did not build the
Study Session or Assessment Engine, so `ledger-checks`, `ledger-last-event` and
the streak keys remain refused by the backfill and still travel through the
narrow legacy flush; that is M9/M10's to close and is listed under M7-6's
removal condition rather than invented early. It did not drop `user_data.blob`
or stop the six server-side readers, so **no score moved**: `git diff` on
`lib/ledger-score.ts` and `lib/ledger-score-v2.ts` is empty and a test asserts
`RECOVERY_EPOCH_MS` is byte-unchanged. It did not wire `referencedEventIds` to
anything, because no table stores an event reference yet (018 §3 names the gap).
It did not schedule the compaction cron. It did not touch M7-1..M7-4's logic —
`lib/events.ts`, `lib/event-ingest.ts`, `lib/event-contract.ts`, `lib/audit.ts`,
`015` and `016` are unchanged, and the only edit anywhere in that pass's output
is the **inversion of one boundary assertion** in
`tests/academic-events.test.mjs`, dated in place. It did not reconcile
`lib/tools-registry.ts`'s divergent `AcademicEventType` union, which remains
flagged for the milestone that first wires a tool to emit.

**M9 IS COMPLETE IN THE REPOSITORY — all six subtasks — and NOT YET SHIPPED.**
`021_study_sessions.sql` and `022_session_concepts.sql` are written and neither
has been executed against any database. The live-infrastructure list below is
what stands between "complete" and "shipped".

*Amended 2026-08-16, second pass. This paragraph previously read "M9 IS HALF
DONE, BY DESIGN", and the paragraph below is what it said, kept because its
argument is the reason `022` looks the way it does.* **M9-1, M9-2 and M9-3 were
a deliberate first pass; M9-4, M9-5 and M9-6 were always a separate one.** The
boundary is the one the milestone table already draws: M9-1..M9-3 are the
*unit* — the machine, the resolver, liveness — and every one of their done-when
conditions is a property of a pure function, provable with no database.
M9-4..M9-6 are what happens *inside* the unit, and all three need
`SessionConcept`, which needs the `confirmation_state = 'confirmed' IMPLIES
assessment_required = true` invariant C.3 calls *"a database CHECK, not a code
convention"*. Shipping that table without its invariant would have shipped the
shape without the guarantee, which is worse than shipping neither. `021`
therefore created one table and `021` §8 recorded each omission by name;
**`022` §2 is that invariant, and it is the reason `022` exists rather than a
decoration on it.**

**WHAT THE SECOND PASS ADDED, AND THE THREE JUDGEMENTS IT MADE IN THE OPEN.**

1. **An exact taxonomy match from free text is still `ai_proposed`.** V.2.2 has
   the AI propose *Torque* — a name the student typed exactly — and requires it
   to land `proposed`. E.6's auto-confirming `student_declared` row (*"the
   student **named** it"*) is for a student **picking a node from a list**: an
   explicit act, with the node in front of them. Reading a node out of a
   sentence is an inference regardless of match strength — the tier says how
   *confident*, not *whether* inference occurred — so everything derived from
   free text enters `ai_proposed`/`proposed`, including the exact matches, and
   `declareConceptExplicitly()` is the only path that auto-confirms.
2. **The proposer is M6's deterministic resolver, not a model, and the
   `detection_source` value stays `'ai_proposed'`.** E.5.3 names the AI
   boundary; that boundary is M15 and does not exist, and
   `lib/concept-resolution.ts`'s header already argues why reaching for one
   early is worse than not having it (B.4 requires determinism; an embedding
   re-resolves history on a model swap). The enum value is kept because what it
   governs is the **confirmation semantics** — E.6's *"auto-confirms: never"* —
   which are identical whichever proposer is behind it. M15 substitutes a
   proposer; no schema, no state and no caller changes.
3. **`ABANDONED` is absent from the completion payload's states.** E.8 emits
   *"on reaching `VERIFIED` or `CLOSED_UNVERIFIED`"* and says nothing about the
   third terminal state. Showing a student a reading of a session they
   explicitly discarded before any evidence existed (E.2.b) is the product
   insisting on the last word, so the builder refuses it with
   `not_a_completion_state` rather than composing one.

**V.2.5 — *"a declaration moves no score"* — HOLDS BY SHAPE, IN FIVE PLACES.**
None of them is "we did not write the scoring code". (1) `EXTERNAL_STUDY_DECLARED`
is absent from `EVIDENCE_BEARING_TYPES` and present in
`CONFIRMATION_REQUIRED_TYPES` in `lib/event-contract.ts` — M7's file, **unedited
by this pass** and asserted so. (2) Every declaration is born
`confirmation: 'unconfirmed'`, `confidence: null`, with `DECLARATION_CONFIRMATION`
typed as a literal so a caller cannot widen it; D.1.d then forbids every
downstream subsystem from reading it as evidence. (3) `DeclarationScoreEffect`
and `ConceptScoreEffect` are unions of **exactly one arm** — `{ kind: 'none' }`
— carrying no sign, no magnitude, no weight and no dimension name, so the
sentence *"a declaration moved the score by X"* has no representation in this
codebase; a test parses both declarations and fails on a `|` or a `number`.
This is `SESSION_SCORE_CONTRACT`'s shape from M9-1, reused, and addressed to the
same reader. (4) `022` declares **no** `score`, `points`, `weight`, `penalty`,
`bonus`, `streak`, `duration` or `completion_rate` column, asserted by test over
the SQL with comments stripped. (5) The completion payload's `score_delta` is
`null` unless the session is `VERIFIED`, forced in one line a test pins by
source, with a fat delta supplied on a `CLOSED_UNVERIFIED` declaration-only
session and asserted **discarded**. E.5.a is the sentence all five serve: *"the
system trusts the student about **what** they studied, and never about whether
they **learned** it"* — and the only verifier is M10.

**M14 MUST NOT** derive any dimension from a declaration count, a
declared-concept count, a declaration-to-confirmation ratio, or a
"declared but not verified" deficit — the same prohibition
`SESSION_SCORE_CONTRACT` already records for `CLOSED_UNVERIFIED`/`ABANDONED`/
`DORMANT` counts, extended to the two new vocabularies this pass introduces.
§3.3 binds: *"a student who logs honestly may never score below a student who
logs nothing."* §9.1 states the positive half: *"It scores nothing by itself."*

**ONE TEST ASSERTION WAS INVERTED IN PLACE, AND NOTHING ELSE OF M9 PART 1 WAS
TOUCHED.** `tests/study-session.test.mjs`'s *"021 is the next free version"*
asserted `!names.some(n => n.startsWith('022'))`, which was true while 021 was
the head of the series and stopped being true when `022` landed. The half the
test is actually for — no version number used twice, `021` still present and
still a single file — survives unchanged, and the inversion is **dated in
place** with its reason, the treatment M7 part 2 gave the one boundary
assertion in `tests/academic-events.test.mjs`. `lib/study-session.ts`,
`lib/session-resolver.ts`, `lib/session-reaping.ts`, `021` and
`app/api/cron/session-reaping/route.ts` are otherwise **byte-unchanged**, and a
test re-asserts M9 part 1's two load-bearing facts (the seven states with no
`COMPLETED_UNVERIFIED` in any code line, and `SessionScoreContribution` still
carrying no magnitude).

**WHAT M9 PART 2 DELIBERATELY DID NOT DO, recorded so none of it reads as an
oversight.** **No endpoints.** `/session/declare`, `/session/concepts/confirm`
and `/session/complete` would each be five lines over these modules plus a
Supabase adapter, and M9 part 1 already recorded the reason not to build them
yet — *"building a surface for a stream with no water"*: no tool emits, so
nothing would reach them. The modules are adapter-shaped and I/O-free, which is
what made V.2.1–V.2.5 provable with no database in reach. **No UI.** E.5.b
governs how a `declared` concept must be rendered *visibly distinct* from an
assessed one at every surface, and no component reads any of this yet; the
constraint is recorded against M12/M13 rather than half-satisfied here. **No
`coverage_state` column** — E.5.6's `declared`/`assessed`/`proven` is a property
of the **academic record projection** (M12), not of one session's concept row,
and giving it two homes is how they come to disagree. **No `assessments` table
and no `coverage_manifest`** — M10's, and E.7.2's single-flight `UNIQUE(session_id)`
belongs with the table it constrains. `coverageRefsFor()` produces the confirmed
set that manifest will be computed *from*, and returns **refs rather than rows**
so M10 cannot read `declared_text` into a prompt without asking for it. **No AI
call anywhere** — asserted over all three modules, along with the absence of
`fetch(`, `Date.now(`, `Math.random`, `supabase`, `next/` and `process.env`.
**No notification and no audit entry** — the M9-1 posture, unchanged. **V.2.6
and V.2.7 were not attempted**: both require an assessment to exist, and both
are M10's. Nothing here forecloses them — the confirmed set is a first-class
query, the unresolved declaration is a first-class row with its own index, and
`concepts_verified[]`/`concepts_missed[]` are already in the payload's shape,
empty and honest.

*This pass resumed an interrupted one. Four files existed in the working tree
and were re-derived against Part E and Part V rather than trusted: three were
correct and complete and were kept, and what was missing was the whole
verification half — there were no tests, `021` carried a `PLACEHOLDER_CHECKSUM`
where its own body hash belongs, three headers pointed at a `lib/sessions.ts`
that does not exist, and the sweep had no I/O half. Writing the tests found two
real defects, recorded below rather than quietly fixed.*

**The two defects the tests found, and what they were.**

1. **`applySessionTransition()` could throw**, in the one file whose header
   promises it cannot. `TRANSITIONS[from][action]` reads a property of
   `undefined` when `from` is a state this build does not know — which is
   exactly what a row written by a later build looks like. V.1.8 requires a
   stale second press to return the current state rather than an error, so a
   throw here becomes a 500 the first time two tabs disagree. Fixed with
   `TRANSITIONS[from] ?? {}`: an unrecognised state has no edges, which is the
   safe answer and the honest one.
2. **The sweep's conditional update was guarded on the wrong column.** Guarding
   on `state` alone is correct for a student-driven transition (E.7.1 specifies
   exactly that) and **wrong for the reaper**, because the case that matters
   most does not change the state: a student answering a question in an
   `ACTIVE` session leaves it `ACTIVE` and moves only `last_activity_at`. A
   `WHERE state = 'ACTIVE'` update written from a read 200ms earlier therefore
   still matches, and a session the student is sitting in is put to sleep and
   then closed. `TransitionExpectation` puts the exact `last_activity_at` the
   decision was made from into the WHERE clause, for the sweep and for no other
   caller. The claim *"the student wins the race, every time, by construction"*
   was in the module's header before it was true; it is true now, and a test
   constructs the wake-without-a-state-change that proved it was not.

**THE SCORE-INTEGRITY CONSTRAINT, RECORDED HERE FOR M14.** M9 may not touch
`lib/ledger-score.ts` or `lib/ledger-score-v2.ts` and did not; what it can do is
make the violation inexpressible, and that is what `SESSION_SCORE_CONTRACT` in
`lib/study-session.ts` is. **M14 MUST NOT** derive Continuity — or any dimension
— from `CLOSED_UNVERIFIED`, `ABANDONED` or `DORMANT` counts as a deduction, as a
ratio denominator that punishes abandonment, or as a "completion rate". The
session layer exposes exactly two arms, `verified_evidence` and `none`, neither
carrying a sign or a magnitude, so paying a penalty requires first widening a
type whose header says why it must not happen. §3.3 is the binding rule —
*"a student who logs honestly may never score below a student who logs
nothing"* — and §9.3 already binds Continuity to *verified* engagement.

**Two documentary defects are reported, not resolved by judgement.** (1) E.2's
prose says *"Six states. Three terminal."* while its table and its diagram both
list **seven**; the table is the normative artefact and all seven are
implemented. (2) C.3 writes the terminal set with the pre-correction name
`completed_unverified`, which E.2 explicitly renames and re-argues; Part E is
the canonical session specification, so E.2's `CLOSED_UNVERIFIED` is used
throughout and C.3's enum literal is the defect. **Both belong in the governing
documents and neither was edited by this plan.**

**One policy value is outstanding.** `IDLE_MINUTES = 45` and `REAP_HOURS = 20`
are E.3's own suggested starting values, and E.3 states explicitly that they are
*"a product decision for `PRODUCT_DECISIONS.md`, not for this document"*. They
are constants, server-owned, and satisfy V.1.4 and V.1.7 as written. **They are
not yet recorded as a decision**, and a plan may not write one.

**What M9 part 1 deliberately did NOT do, recorded so none of it reads as an
oversight.** **The resolver has no production caller.** Wiring it into
`lib/event-ingest.ts`'s D.3.8 step means editing M7's output, which this pass
may not do; `IngestContext.sessionId` already exists as the seam M7 left for it,
and `session_id` stays `NULL` on every event until the milestone that owns that
file connects them. **No `/session/current` or `/session/finish` endpoint** —
`currentSession()` and `applyGuarded()` are the whole of what those routes would
contain, and building them before a tool emits would be building a surface for
a stream with no water. **No UI**: E.2.a governs how a state is *rendered* and
`SESSION_STATE_NOTE` is the lexicon that governs it, but no component reads it
yet. **No `session_concepts` table, no `assessments` table, no
`UNIQUE(session_id)`** — M9-4/5 and M10. **No foreign key from
`academic_events.session_id`**, argued in `021` §2: an event is a fact and a
session row is a derivation (C.3), and a constraint pointing from the fact to
the derivation would let the derivation's absence refuse the fact, which is the
opposite of B.3. **No score moved**: `lib/ledger-score.ts` and
`lib/ledger-score-v2.ts` were not opened. **The sweep is not scheduled** —
`vercel.json` is untouched and a test asserts no cron entry names it, the same
posture `app/api/cron/event-compaction` documents.

**What must happen against live infrastructure before M9 counts as shipped, in
order.**

1. Apply `supabase/migrations/021_study_sessions.sql`. It is additive and
   idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
   `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER/POLICY IF EXISTS` then `CREATE`),
   and it ends with a `DO $$` block that raises if the one-live-session index is
   missing, if **its predicate is not the E.2 live set**, if either guard
   trigger is absent, or if any non-SELECT policy exists on the table.
2. Confirm `select * from public.migration_ledger() where version = '021'`
   returns a row.
3. **Verify against the live database the five things a pure test cannot
   reach**, each a property of PostgreSQL rather than of a function: that two
   concurrent `INSERT`s for one student really do produce one row and one
   `23505` **under concurrency**, not merely in sequence; that the transition
   guard refuses an edge the E.2 table does not draw **as the service role**;
   that a terminal row cannot be reopened or have its closure rewritten by any
   writer; that the birth guard refuses a row inserted directly as
   `CLOSED_UNVERIFIED`; and that the `abandon_requires_no_evidence` CHECK
   refuses an `ABANDONED` row with a non-zero `evidence_event_count`.
3b. **Apply `supabase/migrations/022_session_concepts.sql`, AFTER `021`** — it
   carries a foreign key to `study_sessions`, so applying it first fails. It is
   additive and idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT
   EXISTS`, `CREATE OR REPLACE VIEW/FUNCTION`, `DROP TRIGGER/POLICY IF EXISTS`
   then `CREATE`, and one `ALTER TABLE … ADD CONSTRAINT` guarded by a
   `pg_constraint` existence check), and it ends with a `DO $$` block that
   raises if C.3's hard invariant is missing, if either view is missing, if
   `confirmed_session_concepts` does not filter on `confirmation_state`, if any
   of the three guard triggers is absent, or if any non-SELECT policy exists on
   the table. Confirm
   `select * from public.migration_ledger() where version = '022'` returns a
   row. **Then verify the five things a pure test cannot reach**: that
   `session_concepts_confirmed_implies_assessed` really refuses a `confirmed`
   row with `assessment_required = false`; that the birth guard refuses an
   `ai_proposed` row inserted as `confirmed`; that the delete guard refuses a
   `DELETE` **as the service role** while a student deletion still cascades;
   that a `confirmation_state` change naming no new `decision_client_event_id`
   is refused; and that `declared_text` cannot be rewritten by any writer.
4. **Schedule the sweep** — one entry in `vercel.json` or one step in the
   GitHub Actions job pointing at `/api/cron/session-reaping` with
   `CRON_SECRET`. Hourly is sufficient: `REAP_HOURS` is 20, so an hour of
   latency on a close is invisible, and the route is idempotent by construction
   (a second run plans nothing, and the emitted event deduplicates on
   `client_event_id`). **Not scheduled in this pass, deliberately**: the first
   real run should not also be the first tested run of the close path.
5. Until steps 1–4 are done, the session engine is code that has never met a
   Postgres, and `/api/cron/session-reaping` answers `store: "unavailable"`
   rather than pretending it swept something — the `lib/events.ts` posture,
   reused.

**Verification basis for the M10-4..M10-7 rows above:** working tree,
uncommitted · `npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled
successfully in 11.9s*, `ƒ /api/assessment/answer` and `ƒ /api/assessment/verify`
emitted as dynamic routes, every existing route unchanged ·
`node --test tests/*.test.mjs` — **1142 pass, 0 fail** across 150 suites
(**1071 before this pass; +71** in the new `tests/assessment-grading.test.mjs`) ·
`node scripts/check-migrations.mjs --structure-only` exit 0 over **26** files,
`024` carrying its own body checksum (`8d6950c0…`), verified by recomputing it
rather than by reading it · `lib/ledger-score.ts` and `lib/ledger-score-v2.ts`
**not opened**, and asserted by test to mention none of this pass's four modules
or `assessment_attempts` · `lib/mistakes/engine.ts` **not opened** — this pass
creates individual occurrences and wires no pattern detection, which is M11.

**One test in the M10 part 1 suite was inverted, dated, and it is the only edit
this pass made to prior work.** `tests/assessment-engine.test.mjs` asserted that
`023_assessments.sql` was the **last** migration in the directory — a claim about
the future, which goes stale the moment the next migration lands, and `024` is
that migration. What the test means (023 has a free version number of its own,
used once) is now asserted directly, alongside a repo-wide "no version number is
used twice". The M9 precedent for a dated one-line inversion, reused. **No
module from M0–M10 part 1 was edited**, and `lib/assessment-blueprint.ts`,
`lib/assessment-generation.ts`, `lib/question-bank.ts` and
`app/api/assessment/generate/route.ts` are byte-unchanged by this pass — the new
work is four new modules and two new routes that consume them.

**The SQL in `024` was NOT executed against any database**, the same posture
015–023 hold. It is additive by test as well as by claim: no `DROP TABLE`, no
`DROP COLUMN`, no `DROP CONSTRAINT`, no `ALTER COLUMN`, no `RENAME`, no
`TRUNCATE`, no `DELETE FROM`, and every `ALTER TABLE` is an `ADD COLUMN IF NOT
EXISTS`, an `ADD CONSTRAINT` or an `ENABLE ROW LEVEL SECURITY` on its own
tables. `021`'s two session guards and `020`'s one-way door are named in `024`
§10 as things that must still exist after it runs, and it drops none of them.
**One naming compromise is stated in the open rather than taken quietly**:
`evidence.type` keeps `007`'s three values and an attempt is recorded as
`manual` (the non-file arm) with its identity in `storage_ref`, because widening
that CHECK means dropping and re-adding a constraint on M1's frozen schema,
which is a decision and not a migration.

**Verification basis for the M10-1..M10-3 rows above:** working tree,
uncommitted · `npx tsc --noEmit` exit 0 — **and exit 0 on arrival too**, so the
interrupted handoff left the tree type-clean · `npx next build` exit 0,
*Compiled successfully in 12.1s*, `ƒ /api/assessment/generate` emitted as a
dynamic route, every existing route unchanged · `node --test tests/*.test.mjs` —
**1071 pass, 0 fail** across 144 suites (**+89** in the new
`tests/assessment-engine.test.mjs`) · `node scripts/check-migrations.mjs
--structure-only` exit 0 over **25** files, `023` carrying its own body checksum
(`e10a6606…`), verified by recomputing it rather than by reading it ·
`lib/ledger-score.ts` and `lib/ledger-score-v2.ts` **not opened**, and asserted
by test to mention none of this pass's three modules.

**The suite was RED on arrival, at 981/982.** The interrupted attempt's last
recorded act was a typecheck, not a test run, and its new route tripped M9's own
fence in `tests/session-concepts.test.mjs` — *"nothing outside the module and
the migration touches the raw table"* — because the view name
`confirmed_session_concepts` **contains the raw table's name as a substring**,
so a file correctly reading the view is indistinguishable from one reaching past
it. The fix is the one the fence's own exemption list implies: `lib/session-concepts.ts`
now exports `CONFIRMED_SESSION_CONCEPTS_VIEW` and the route imports it. That is
**the only edit this pass made to an M9 file**, it is purely additive, it
changes no behaviour and no logic, and it leaves the raw table named in exactly
two places in the repository — `022` and the module that owns the concept.

**Two defects in the inherited work were found and corrected.** (1)
`lib/question-bank.ts` documented that the free regex half of gate 7 ran on the
bank path and it did not — the call is now real, and deliberately excluded from
the `gates_passed` provenance. (2) The same file's header claimed it *"does not
import `GenerationModel` and cannot call one"*, which was false — it holds
F.2.a's orchestration and drives the injected interface. The claim is now stated
precisely: it constructs no client, imports no SDK and knows no model's name,
and the zero-call guarantee is about the **fallback** path specifically, proven
by a source-level assertion that `fillFromBank`'s body references neither
`deps.rederiver` nor `deps.moderator`, and by a moderator that **throws** if it
is ever reached.

**The SQL in `023` was NOT executed against any database**, the same posture
015–022 hold. The behavioural half is proven against the compiled modules: the
ordering is demonstrated twice over recorded time rather than asserted from
types; each of the seven gates is shown rejecting a candidate only it
disqualifies, with the earlier-gates-passed list asserted; `admit()` is shown
refusing a candidate that met no gate at all; and the twelve seed questions are
resolved against the **compiled taxonomy** and run through the four gates they
will meet. **V.3.1, V.3.2 and V.3.3 are transcribed into test titles verbatim.
V.3.4 and V.3.5 are absent by design** — both are the `ASSESSING → VERIFIED`
transition gate, which belongs with the transition it guards and is M10-4's.
What this pass ships toward them is the `manifestIsCovered()` predicate and
`023` §4's `assessment_coverage` view, which that gate will read.

**Verification basis for the M9-4..M9-6 rows above:** working tree,
uncommitted · `npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled
successfully in 12.6s*, every existing route unchanged and no new route emitted
(this pass ships no endpoint) · `node --test tests/*.test.mjs` — **982 pass, 0
fail** (891 before this pass; **+91** in `tests/session-concepts.test.mjs`) ·
`node scripts/check-migrations.mjs --structure-only` exit 0 over **24** files,
`022` carrying its own body checksum · `lib/ledger-score.ts` and
`lib/ledger-score-v2.ts` **not opened**, and asserted by test to mention neither
`session_concepts` nor `external-study` · `lib/event-contract.ts`,
`lib/event-ingest.ts`, `lib/events.ts`, `lib/event-outbox.ts`,
`lib/concept-resolution.ts`, `lib/concepts.ts` and every other M0–M8 file
**unmodified** — this pass moved no score, changed no event contract, and
edited no earlier milestone's logic. The files it wrote are
`supabase/migrations/022_session_concepts.sql`, `lib/external-study.ts`,
`lib/session-concepts.ts`, `lib/session-completion.ts`,
`tests/session-concepts.test.mjs`, `tests/tsconfig.session-concepts.json`, one
dated one-line inversion in `tests/study-session.test.mjs`, and this document.
**The SQL in `022` was not executed, and neither was `021`.** The behavioural
half is proven against the compiled modules rather than asserted: verbatim
preservation is checked with `Buffer.compare` over a thirteen-entry adversarial
corpus and again after passing through M7's own `validateEventDraft()`; every
event draft this pass builds is validated by M7's contract rather than by a
fixture; the gate is cross-checked against `022`'s view predicate parsed out of
the SQL; and the SQL's four enum CHECK lists are compared against the
TypeScript constants — lists that exist twice because no compiler sees the SQL.
V.2.1 through V.2.5 are transcribed into test titles verbatim. **V.2.6 and
V.2.7 are absent by design** — both require an assessment, and both are M10's.

**Verification basis for the M9-1..M9-3 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled successfully in
12.1s*, `ƒ /api/cron/session-reaping` emitted as a dynamic route, every existing
route unchanged · `node --test tests/*.test.mjs` — **891 pass, 0 fail** (822
before this pass; +69 in `tests/study-session.test.mjs`) ·
`node scripts/check-migrations.mjs --structure-only` exit 0 over **23** files,
`021` carrying its own body checksum · `lib/ledger-score.ts`,
`lib/ledger-score-v2.ts` and every M0–M8 file **unmodified** — M9 part 1 moved
no score, changed no event contract, and edited no earlier milestone's logic.
The only files this pass wrote are the four it inherited, one cron route, one
test suite, one test `tsconfig`, one `.gitignore` line and this document.
**The SQL in `021` was not executed.** The behavioural half is proven against
the compiled `lib/study-session.ts`, `lib/session-resolver.ts` and
`lib/session-reaping.ts` rather than asserted: the suite's store implements
`021`'s partial unique index, its conditional update, its terminal-shape and
abandon CHECKs and its birth guard, and **refuses the way Postgres refuses** —
so *"two tabs produce exactly one session"* is demonstrated against a
constraint's behaviour under an interleaved race, not against the application's
intentions. V.1.1 through V.1.8 are transcribed into test titles verbatim, and
the machine is cross-checked against the SQL in three places: the state CHECK
against `SESSION_STATES`, the index predicate against `LIVE_STATES`, and the
trigger's edge list against the pair set `TRANSITIONS` produces — three lists
that exist twice because no compiler sees the SQL.

**M8 IS COMPLETE IN THE REPOSITORY — all six subtasks — and NOT YET SHIPPED.**
`020_occurrence_confirmation.sql` is written and has not been executed against
any database, and neither has `019`. The live-infrastructure list below is what
stands between "complete" and "shipped".

*Amended 2026-08-15, second pass. This paragraph previously read "M8 is HALF
DONE, by design" and described M8-4/5/6 as a deliberately separate pass. That
pass has now happened; the original boundary was correct and is recorded in the
M8-1..M8-3 rows rather than erased here. Its stated reason still holds — all
three of the new subtasks write or gate the academic record, and all three
needed a capture pipeline that really existed first.*

**What the second pass did to the sentence the first pass wrote.** The first
pass asserted, by test over seven files, that nothing in the capture path calls
a model. **That assertion was neither inverted nor deleted, and that is a fact
about where extraction was put, not an oversight.** Those seven files are the
UPLOAD path, and uploading still stores a paper and reads nothing:
`captureRegistry()` is byte-unchanged and still registers one stage. Extraction
lives in new files, is reached only when the student asks for it, and is fenced
by its own suite. The old sentence now means something sharper than it did —
*uploading cannot spend a model call, whatever else the product grows* — and
`tests/capture-shell.test.mjs` carries a dated header saying so.

**What M8 part 2 deliberately did NOT do, recorded so none of it reads as an
oversight.** No commit-phase stage is registered, still: the extraction slice is
`intake → preprocess → propose`, all three `propose` phase, so the academic
record is unreachable through the runner rather than merely gated behind it. No
pattern is merged and no severity is derived — that is **M11**, and a draft
occurrence is deliberately produced in the shape `lib/mistakes/engine.ts`
already expects rather than wired into it. No occurrence feeds a session, an
assessment or a score: `git diff` on both score engines is empty. No
`confirmed_by` column was added — under `020`'s policy there is exactly one
actor who can set `confirmed_at`, and recording that it was the student would be
recording the only thing it could possibly be. **No backfill.** Every occurrence
predating `020` keeps `confirmed_at NULL` and is therefore a draft, which is the
honest reading — none of them was ever confirmed by anybody — and in practice
the table is empty, because M8-4 is its first writer. **No event is emitted**,
still.

**What M8 part 1 deliberately did NOT do (unchanged, for the record).** No model
call anywhere in the capture path. No occurrence and no pattern written from
capture: `occurrences.evidence_id` is `NOT NULL` and every occurrence must
classify an error, so writing one from *capture* would be inventing a diagnosis
nothing has made (§3.2) — which is exactly why M8-4 writes one only after
something has read the page, and marks it a draft when it does. No
`commit`-phase stage registered. **No event emitted.**
`EVENT_TYPES` in `lib/event-contract.ts` has no evidence-capture type and M7's
contract is not this milestone's to widen; the durable records of a capture are
the `evidence` row and the `ingestion_runs`/`ingestion_stages` pair, both
append-only, and evidence enters the event stream at M8-4/M11 through
`MISTAKE_DETECTED`, which already carries `evidence_id`. **No audit entry**,
following `lib/audit.ts`'s own rule that a normal append is not audited — the
table IS the record. **`/capture` is not in `PROTECTED_PREFIXES`**: that is
`lib/auth-routes.ts`, M4's output, which this pass may not touch. The route is
guarded client-side by `AuthGuard` (as every `/tools` page was before M4) and
the endpoint authenticates itself and returns 401, but **adding `/capture` to
the edge matcher is an outstanding item for whoever next owns M4's file**. The
two retired tool pages keep their bodies, and `lib/tools-registry.ts` still
lists both — the registry is M2's output and the redirect answers before it
matters.

**Verification basis for the M8-4..M8-6 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled successfully in
12.2s*, `ƒ /api/capture/extract`, `ƒ /api/capture/confirm` and
`ƒ /api/capture/manual` emitted as dynamic routes, `○ /capture` and every
existing route unchanged, `ƒ Proxy (Middleware)` emitted · `node --test
tests/*.test.mjs` — **822 pass, 0 fail** (770 before this pass; +52 in
`tests/capture-extraction.test.mjs`) · `node scripts/check-migrations.mjs
--structure-only` exit 0 over **22** files, `020` carrying its own body
checksum · `git status` reports `lib/ledger-score.ts`, `lib/ledger-score-v2.ts`,
`supabase/migrations/007_mistakes.sql`, `008_ingestion.sql`,
`lib/ingest/{runner,types,hash,memory-store}.ts` and `app/api/ai/route.ts`
**unmodified**, and M8 part 1's still-untracked `lib/evidence.ts`,
`lib/storage.ts`, `app/api/capture/route.ts`, `lib/ingest/supabase-store.ts` and
`supabase/migrations/019_evidence_storage.sql` **byte-unchanged by this pass** —
M8 part 2 moved
no score, changed no migration that already existed, edited no part of M8 part
1's logic, and did not touch the AI boundary it reuses. The only edits to
existing files are the two new exports and a dated header amendment in
`lib/capture-intake.ts`, a dated header amendment in
`tests/capture-shell.test.mjs` (no assertion changed), the `/capture` shell, one
`.gitignore` line and this document. **The SQL in `020` was not executed.** The
behavioural half is proven against the compiled `lib/occurrences.ts`,
`lib/capture-extraction.ts`, `lib/ai-guard.ts` and `lib/capture-intake.ts`
rather than asserted: the doubles implement `020`'s policy predicates, its
forward-only trigger and `007`'s CHECKs, and refuse the way Postgres refuses —
so *"the database itself refuses a second confirmation"* is demonstrated against
a policy's behaviour, with the student-role and service-role paths refused by
**different mechanisms**, which is the point of having three.

**What must happen against live infrastructure before M8-4..M8-6 count as
shipped.** 1. Apply `supabase/migrations/020_occurrence_confirmation.sql` after
`007`, `008` and `019` — it is idempotent (`ADD COLUMN IF NOT EXISTS`, catalogue-
guarded CHECKs, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`). 2. Confirm
`select * from public.migration_ledger() where version = '020'` returns a row.
3. **Verify against the live database the four things a pure test cannot
reach**, each a property of PostgreSQL rather than of a function: that a second
`UPDATE … SET confirmed_at` on an already-confirmed occurrence really matches
zero rows as the student; that `SET confirmed_at = NULL` is refused for the
student **and raises for the service role** (the trigger, which is the half RLS
cannot do); that `UPDATE occurrences SET marks_lost = 999, confirmed_at = now()`
is refused by the **column grant** rather than partially applied; and that
`INSERT … confirmed_at = now()` raises. 4. Confirm `select * from
confirmed_occurrences` returns no draft. 5. Set `ANTHROPIC_API_KEY`, upload one
real photograph, press *Read it*, and confirm one proposal end to end — then
press it again and watch the database refuse. Until 1–5 are done, the gate is
code that has never met a Postgres.

**What must happen against live infrastructure before M8-1..M8-3 count as
shipped.** 1. Apply `supabase/migrations/019_evidence_storage.sql` — it creates
the private `evidence` bucket and its four `storage.objects` policies, and is
idempotent (`ON CONFLICT (id) DO UPDATE`, `DROP POLICY IF EXISTS` then `CREATE
POLICY`). 2. Apply `007_mistakes.sql` and `008_ingestion.sql` if they have not
been — **nothing in this pass can work until they exist**, and both predate this
milestone. 3. Confirm `select * from public.migration_ledger() where version =
'019'` returns a row. 4. **Verify against the live database the three things a
pure test cannot reach**, each a property of PostgreSQL or of Storage rather
than of a function: that a second insert of the same `(student_id,
content_hash)` really is refused with `23505` **under concurrency** and the
read-back returns the first row; that a signed-out or wrong-student request for
an object under `evidence/<other-student>/…` is refused by the storage policy;
and that `ingestion_stages`'s `(run_id, stage, attempt)` constraint refuses a
second write of one attempt. 5. Upload one real photograph end to end and read
`explainRun()` back — `intake` succeeded, twelve stages `not-run`, run
`running`. Until steps 1–5 are done, the capture path is code that has never met
a Postgres or a bucket.

**Verification basis for the M8-1..M8-3 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled successfully in
12.6s*, `○ /capture` and `ƒ /api/capture` emitted, every existing route
unchanged, and `.next/routes-manifest.json` showing both new redirects anchored
exact-path (`^(?!/_next)/tools/exam-practice(?:/)?$`) · `node --test
tests/*.test.mjs` — **770 pass, 0 fail** (722 before this pass; +22 in
`tests/capture-pipeline.test.mjs`, +26 in `tests/capture-shell.test.mjs`) ·
`validateRepoMigrations` clean over 21 files, `019` carrying its own body
checksum · `git status` reports `lib/ledger-score.ts`, `lib/ledger-score-v2.ts`,
`lib/ingest/{runner,types,hash,memory-store}.ts`,
`supabase/migrations/007_mistakes.sql` and `008_ingestion.sql` **unmodified**,
and M7's still-untracked `lib/events.ts`, `lib/event-contract.ts`,
`lib/event-ingest.ts` and `lib/audit.ts` byte-unchanged by this pass — M8 moved
no score, changed no event contract and edited no dark-module logic; it imported
it. The only additions inside `lib/ingest/` are a new file
(`supabase-store.ts`); nothing existing in that directory was touched. **The SQL in `019` was not executed and no storage bucket exists.** The
behavioural half is proven against the compiled `lib/evidence.ts`,
`lib/capture-intake.ts` and `lib/ingest/supabase-store.ts` rather than asserted:
the doubles enforce the constraints `007` and `008` actually declare — the
evidence unique key, `(run_id, stage, attempt)`, and the outcome-shape CHECK —
and refuse the same way Postgres refuses, so "re-uploading the same paper
creates one evidence row" is demonstrated against a constraint's behaviour and
not against the application's intentions.

**Verification basis for the M7-5..M7-7 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled successfully in
11.9s*, `ƒ /api/cron/event-compaction` emitted as a dynamic route, every
existing route unchanged · `node --test tests/*.test.mjs` — **722 pass, 0 fail**
(674 before this pass; +48 in `tests/legacy-freeze.test.mjs`) ·
`node scripts/check-migrations.mjs --structure-only` exit 0 over 20 files, `017`
and `018` each carrying their own body checksum. **The SQL in `017` and `018`
was not executed** and the backfill was not run; both migrations are reviewed by
reading only, and both are idempotent so a re-run cannot clobber a database that
is already correct. The behavioural half is proven against the compiled
`lib/legacy-backfill.ts`, `lib/event-compaction.ts` and `lib/sync-merge.ts`
rather than asserted — the double-run replayed against a table keyed the way
`015` keys it, the four structural marks on every backfilled row, twelve hostile
archives that must not throw or fabricate, compactability over all 35 event
types, and the conflict rule against the exact fixture the deleted
merge-by-string-length got wrong.

**Verification basis for the M7-1..M7-4 rows above:** working tree, uncommitted ·
`npx tsc --noEmit` exit 0 · `npx next build` exit 0, *Compiled successfully in
11.8s*, `ƒ /api/events` emitted as a dynamic route, every existing route
unchanged · `node --test tests/*.test.mjs` — **674 pass, 0 fail** (612 before
M7; +62 in `tests/academic-events.test.mjs`) · `git diff` on `lib/sync.ts`,
`components/sync-manager.tsx`, `lib/ledger-score.ts` and `lib/ledger-score-v2.ts`
empty. **The SQL in `015` and `016` was not executed**; both are reviewed by
reading only, and both are idempotent so a re-run cannot clobber a database that
is already correct. `lib/sha256.ts` is checked against the published SHA-256
vectors and against `node:crypto` across the block-boundary lengths (55, 56, 64)
before anything is built on it — a hand-written hash that is wrong is worse than
no hash at all.
