# STUDYLEDGER — PRODUCT DECISIONS

```
AUTHORITY:       decisions
ANSWERS:         "what have we chosen, as of now?"
MAY NOT CONTAIN: principles · milestones · task order · effort estimates · dates of delivery
PRECEDENCE:      PRINCIPLES > DECISIONS > PLANS
LAST AMENDED:    2026-08-30
```

Everything here is **revisable**. Each entry is dated and every reversal is
recorded in §7. A decision may not contradict `PRODUCT_PRINCIPLES.md`; if one
appears to, the principle wins and the decision is a defect.

---

# 1. CLASSIFICATION POLICY

*Ratified 2026-08-05. Supersedes every deletion decision made on usage grounds.*

## 1.1 Analytics are observational, not decisional

PostHog currently reflects a period in which the founder was the primary active
user, alongside development and testing sessions. The sample is 55 tool opens.

**Current analytics may be used to find bugs, broken flows and dead routes.
They may NOT be used to decide what ships, what merges, or what is removed.**

The 90-day report stands as a **bug-finding artifact** and is withdrawn as
roadmap evidence. **Low usage is not evidence of low value when usage is not yet
representative.**

## 1.2 The four classes

| Class | Definition | Navigation | Code |
|---|---|---|---|
| **CORE** | Directly strengthens *"What should I fix next?"* | Visible | Untouched |
| **SUPPORTING** | Not essential for V1; strengthens the experience; may return | Hidden in V1 | Untouched |
| **EXPERIMENTAL** | Interesting, not core today | Removed | **Kept intact** |
| **LEGACY** | Obsolete, duplicated, or architecturally conflicting | Removed | Archived |

## 1.3 The deletion bar

**Default is ARCHIVE. Deletion requires at least one of:**

1. duplicate functionality
2. objectively obsolete implementation
3. architectural conflict
4. security risk
5. maintenance burden with no future value

**"Low usage" is explicitly not sufficient.**

## 1.4 The mechanism — navigation, not the filesystem

Classification is enforced in **`lib/tools-registry.ts`**, by a `status` field.
Navigation, search and the command palette render `core` (and `supporting` when
enabled). Everything else stays routable by direct URL.

This is the whole idea: **one file controls what the product looks like, and no
implementation moves.** Reversing a classification is a one-word edit, so a
wrong call costs minutes rather than a rebuild.

> **The navigation becomes small. The repository does not.**

Only `legacy` items move on disk — to `archive/`, outside `app/`, so they stop
building while remaining in git and readable.

## 1.5 The register

Classified by thesis fit. **No usage data was consulted.**

**CORE — 14.** The loop itself.
`post-exam` · `paper-autopsy` · `marks-forensics` · `marks-obituary` ·
`paper-trauma` · `paper-pattern` · `calibration` · `syllabus` · `grade-tracker` ·
`exam-planner` · `silent-topics` · `practice` · `exam-practice` · `mistake-dna`

> **2026-08-21 — `mistake-dna` added, CORE.** A dedicated, real-data analytics
> view over `occurrences`/`patterns` (007, M11) — subject/topic/type breakdown,
> recent mistakes, recurrence, a heatmap, and one recommended next step,
> every figure computed from the student's own record, never a placeholder.
> Distinct from `post-exam`'s existing DNA tab (still live, unlinked-not-
> deleted, `/tools/dna` still 301s there) — neither absorbs the other yet.
> CORE, not SUPPORTING, because §1.2 hides SUPPORTING from V1 navigation and
> this tool is meant to be reachable now, not held back for a later release.

**SUPPORTING — 12.** Hidden in V1, implementation untouched, likely to return.
`recall-studio` · `flashcards` · `exam-sim` · `forgetting-forecast` · `exam-day` ·
`exam-triage` · `panic-triage` · `learn-lab` · `language-lab` · `model-answer` ·
`memory-toolkit` · `personalise`

> `learn-lab` is SUPPORTING on thesis grounds, not usage grounds: its Doubt tab
> sits adjacent to diagnosis. **"We do not teach" governs what the product does,
> not whether the code exists.** No teaching surface reaches the student in V1.

**EXPERIMENTAL — 21.** Out of navigation, code untouched.
`writing-tools` · `research-suite` · `presentation` · `debate` · `citation` ·
`lab-report` · `reference-builder` · `report-tools` · `compare` · `source` ·
`case-study` · `timeline` · `study-guide` · `analysis-hub` · `rooms` ·
`admissions` · `resume` · `interview` · `gpa-sim`

**LEGACY — 0 tools.**

Not one of the 47 tools meets the deletion bar. Everything that qualifies is
**infrastructure, not product**:

| Item | Qualifying reason |
|---|---|
| `PRODUCT.md`, `DESIGN.md`, `CONSOLE.md`, `PRODUCT_CONSTITUTION.md`, `MIGRATION.md`, `WORKSPACE.md` | Architectural conflict — the documented cause of the design oscillation. **Archived 2026-08-05.** |
| 3 simultaneous motion runtimes | Maintenance burden, architectural conflict |
| `globals.css` / `editorial.css` duplication | Architectural conflict |
| 16 orphan components, `lib/animation.ts` | Objectively obsolete — zero importers (**already removed**) |
| Duplicated tab components (`CrunchTab`, `MindMapTab`, `ConceptConnectTab`, `FormulaTab`) | Duplicate functionality — **extract to shared, do not archive either host** |

---

# 2. INFORMATION ARCHITECTURE

**Three altitudes. All three are true, and each answers a different question.**
Conflating them is what produced the "46 routes become 0" error.

## 2.1 The mental model — three surfaces

What the student believes the app is.

| Surface | Question | Contents |
|---|---|---|
| **NOW** | "What should I fix next?" | Score, the one move, today's context |
| **WORK** | "Let me do it." | The single workspace where capabilities happen |
| **RECORD** | "How am I doing over time?" | History, patterns, trajectory |

No sidebar. No tools index as a destination. No settings in the primary nav —
settings live behind the account chip.

```
CHROME (persistent)
  wordmark · mode switch (NOW/WORK/RECORD) · Ledger Score · account
─────────────────────────────────────────────────────────────────
NOW        Score (display) → the one move → today's context
WORK       Command bar → active task → output surface
RECORD     Trajectory → patterns → close history
```

**NOW is the default and the product's face.** Readable in one glance, its
primary answer fitting one viewport without scrolling.

## 2.2 The navigation target — twelve routes

What appears in navigation and what URLs the product advertises.

```
├── /                       Marketing. One sentence, one proof, one button.
├── /auth                   Sign in.
├── /onboard                Ten questions, one per page (§2.6). Then the
│                           dashboard, with a first-run walkthrough.
│
├── /home                   RETIRED 2026-08-22 (§7.6) — three visual passes
│                           rejected, founder called for deletion. The NOW
│                           surface this row described ("What should I fix
│                           next?" — Score · the one action · exam
│                           countdown) has no route today. /capture is the
│                           interim landing (plumbing, not a decision).
│
├── /capture                ← THE MISSING SCREEN
│                           Photograph a marked paper.
│                           Also: syllabus, past papers, manual entry.
│
├── /diagnosis              ← THE MERGE THAT IS THE COMPANY
│                           What you lost, why, and what recurs.
│
├── /record                 The longitudinal asset.
├── /next                   Ranked gaps. Spaced schedule. Avoided topics.
├── /practise               Close the gap. Recall, mock, drill.
├── /parents                The payer. Weekly, honest, forward-facing.
├── /settings               Profile, subjects, board, plan, parent access.
├── /legal                  One route, four sections.
└── /admin                  Internal. Exempt from all design law.
```

**Twelve routes in navigation, down from sixty-eight.** No tool list. No
categories. No `/tools/*` namespace in navigation.

## 2.3 The filesystem — all 46 routes resolve

**No tool route is deleted, archived or moved.** All 46 tool URLs continue to
resolve by direct link. They simply stop being how anyone navigates.

This is §1.4 applied: navigation shrinks by a registry field; the repository
stays whole.

## 2.4 The merge map

| Destination | Absorbs | Why |
|---|---|---|
| **Home** | `/dashboard`, `/console`, `exam-day`, `panic-triage`, `exam-triage` | One question, one answer, one action. Exam-day is a *state* of Home, not a place. |
| **Capture** | `syllabus`, `exam-practice` (papers only), `/console/work` | Every route that turns real work into structured evidence. **The one screen that must be built.** |
| **Diagnosis** | `post-exam`, `paper-autopsy`, `marks-forensics`, `marks-obituary`, `paper-trauma`, `paper-pattern`, `calibration` | Six metaphors for one answer. **Merging them *is* the product.** |
| **Record** | `grade-tracker`, `/console/analytics` | The longitudinal asset. One place, forever. |
| **Next** | `exam-planner`, `forgetting-forecast`, `silent-topics` | Two Ebbinghaus engines and an avoidance detector answering one question. |
| **Practise** | `practice`, `exam-sim`, `recall-studio`, `flashcards`, `/console/practice` | Closing the gap. Four routes doing active recall. |
| **Parents** | `/parent/[code]` | The payer. Stands alone. |
| **Settings** | `/dashboard/profile`, `personalise` | Two profile editors. |
| **Account** | `/pricing`, `/limit` | A quota wall is an upgrade prompt, not an error page. |
| **Legal** | `terms`, `privacy`, `data`, `ip` | Four routes, one page. |

Merged routes 301 to their destination. **Nothing 404s.**

## 2.5 Unlinked, not deleted

`/console/ai` and `/dashboard/saved` are removed from navigation and remain
routable. `/console/ai` is out of V1 because no teaching surface ships, per
`PRODUCT_PRINCIPLES` §1.4 — not because the code is unwanted.

## 2.6 Onboarding

*Rewritten 2026-08-30. See §7.7 for the reversal and its reasoning. The prior
text read: "**Board and subjects, one screen.** The ceiling is three questions;
we use one screen's worth. Then straight into Home with a real starting Score.
Never a tour. Never a checklist."*

**Ten questions, one per page, then a walkthrough.**

The first thing a new student does is tell the product who they are. Ten
questions, presented **one to a page** — never all ten on one screen, and never
a scrolling form. Progress is visible and every answer is revisable with a back
control, because a question a student cannot un-answer is an interrogation.

**Every question must earn its place by changing model behaviour.** Nine of the
ten map exactly onto `lib/personal-model.ts`'s bounded dimension list (I.2); the
tenth is board and subjects, which the record cannot function without. A
question whose answer changes nothing is removed, not kept for symmetry.

**Then the dashboard, with a walkthrough.** Not a marketing tour of features:
a first-run pass over the surfaces the student will actually use, which ends
and does not return. After it, they use the product freely.

**Skippable, and never lost.** A student who abandons midway keeps every answer
already given; the profile is partial, which is a legal state, not an error.

---

# 3. V1 SCOPE

**Nine routes ship. Nothing else.**

| # | Route | Why it cannot be cut |
|---|---|---|
| 1 | `/auth` | No product without a user |
| 2 | `/onboard` | Ten questions, one per page. The profile the model runs on (§2.6, §7.7). |
| 3 | ~~`/home`~~ | Retired 2026-08-22 (§7.6). Was: the thesis, rendered — Score + one action. No route claims this job today. |
| 4 | **`/capture`** | **Photograph a marked paper. If this doesn't ship, nothing else matters.** |
| 5 | `/diagnosis` | The answer. The merge of six. |
| 6 | `/record` | Proof the ledger accumulates |
| 7 | `/parents` | The payer. Week one, not later. |
| 8 | `/settings` | Table stakes |
| 9 | `/legal` | Legally required |

**Deliberately NOT in V1:** `/next` · `/practise` · `/` marketing · pricing.

Prescription and remediation wait until diagnosis is proven. Marketing waits
until there is something to market.

**68 → 12 → 9 shipping.**

---

# 4. THE MISTAKE SCHEMA

> **Capture writes it, Diagnosis reads it, Record stores it, Next ranks it,
> Practise consumes it, Parents summarise it, and the Ledger Score is computed
> from it.** Get this wrong and all seven are wrong.

## 4.1 Two entities, not one

The instinct is one `Mistake` record. That is wrong, and the error would be
permanent.

| | **OCCURRENCE** | **PATTERN** |
|---|---|---|
| What it is | One mark lost, one time | A recurring error the student keeps making |
| Epistemic status | **Fact** | **Inference** |
| Mutability | **Immutable, never deleted** | Revisable |
| Comes from | Evidence (a photograph) | Analysis across occurrences |
| Has a lifecycle | No | **Yes** |
| What the product sells | Raw material | **This** |

A student does not want a list of 340 wrong answers. They want the **nine things
they keep getting wrong.** Occurrences are what we hold; Patterns are what we
return.

## 4.2 CONCEPT — the taxonomy spine

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

**This taxonomy is the company's durable asset.** It cannot be generated from
textbooks, because textbooks describe success and this describes failure. Built
by hand from real marked papers and refined forever.

## 4.3 OCCURRENCE — the immutable fact

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
| `cognitiveError` | enum \| null | see §4.5 |
| `executionError` | enum \| null | see §4.5 |
| `confidenceBefore` | 0–3 \| null | what the student *thought* before answering |
| `studentAnswer` | text \| crop | what they wrote |
| `expectedAnswer` | text \| null | from mark scheme |
| `markerNote` | text \| null | what the teacher wrote in red |
| `patternId` | uuid \| null | assigned by merge (§4.7) |
| `supersedes` | uuid \| null | corrections append, never edit |
| `createdAt` | timestamp | |

**Invariants.** Never updated after verification. Never deleted. At least one of
`cognitiveError` / `executionError` must be non-null. `evidenceId` is mandatory.

## 4.4 PATTERN — the revisable inference

*Amended 2026-08-06 — pattern hierarchy adopted. See §7.2.*

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `studentId` | uuid | |
| `conceptId` | uuid \| null | **Non-null on leaves. Null on parents.** |
| `parentPatternId` | uuid \| null | **Null only on the root of a tree.** |
| `tier` | `concept` \| `subject` \| `global` | Derived from depth; stored for query economy |
| `subject` | string \| null | Null on `global` tier |
| `errorClass` | `cognitive` \| `execution` | **never mixed** |
| `errorType` | enum | the specific error |
| `label` | string | *"Sign error when applying the chain rule"* |
| `occurrenceIds[]` | uuid[] | the evidence trail. **Leaves only — always empty on parents.** |
| `recurrenceCount` | int | occurrences in trailing 180 days. Leaves: counted. Parents: **derived from descendants.** |
| `firstSeenAt` `lastSeenAt` | timestamp | Parents: min/max across descendants |
| `severity` | 0–100 | **derived, never entered** (§4.6) |
| `systemConfidence` | 0–1 | how sure we are this is *one* pattern |
| `status` | enum | §4.8. Parents: **derived** (§4.4.4) |
| `remediationPlan` | ref \| null | |
| `history[]` | append-only | every status transition, with cause |
| `resolvedAt` | timestamp \| null | |

### 4.4.1 The hierarchy

**Patterns form a hierarchy.** Three tiers, fixed depth:

```
GLOBAL      "You make sign errors"                    conceptId: null · subject: null
  └─ SUBJECT   "You make sign errors in Physics"      conceptId: null · subject: "Physics"
       └─ CONCEPT  "Sign error applying the chain rule"   conceptId: set   ← LEAF
```

- **Leaf patterns represent concrete, concept-level recurring mistakes.**
- **Parent patterns represent progressively broader behavioural summaries.**
- **Parents derive their meaning from children. Children never derive from parents.**

The direction is absolute. A parent is a *view* of its descendants and holds no
independent truth. Nothing is ever computed downward.

This reuses the mechanism §4.2 already commits to for `Concept` — *"`parentId`;
enables roll-up to any level"* — one layer up. There is one way to express
roll-up in this schema, not two.

### 4.4.2 Cardinality

**`Occurrence → Pattern` remains 1:N.**

- **Every occurrence references exactly one leaf pattern.** `Occurrence.patternId`
  is singular and points at a `tier: concept` pattern. Pointing it at a parent is
  invalid.
- **Parent patterns never own occurrences directly.** `occurrenceIds[]` is always
  empty above the leaf tier.
- **A parent's evidence is the aggregate of its descendant leaves.**

This is what makes a single `patternId` sufficient. An occurrence reaches its
broader patterns through the tree, never by belonging to several at once.

### 4.4.3 Ledger Score

**The Ledger Score operates only on leaf patterns.**

Parent patterns exist for **explanation, navigation and aggregation.** They are
never counted.

> **Parent patterns must never introduce double counting.**

This is enforced structurally rather than by remembering a filter: because
parents hold no occurrences (§4.4.2), any score computed from evidence counts
each real failure exactly once. Consistent with `PRODUCT_PRINCIPLES` §3.3, where
a scoring rule is guaranteed by construction rather than by discipline.

### 4.4.4 Resolution

- **Leaf resolution remains evidence-based** — §4.8, implementing
  `PRODUCT_PRINCIPLES` §3.1. Unchanged.
- **Parent resolution is derived from descendants.** A parent is never resolved
  directly, by the system or the student.

> **No parent may be resolved while any descendant leaf remains unresolved.**

Strictly stronger than §3.1, never weaker. A student cannot close *"you make sign
errors"* while a single sign-error gap remains open beneath it.

### 4.4.5 Recommendations

- **Ranking operates on leaves.** Severity is computed and ordered at the leaf
  tier only.
- **Presentation may collapse multiple related leaves into a parent summary** —
  *"You've lost 31 marks to sign errors across 4 topics."*
- **Expanding a parent reveals its contributing leaf patterns.**

This is how §4.1's promise is kept. A student does not want forty sign-error
entries; they want **one**, which opens into forty when they ask. The hierarchy
is what turns 340 occurrences into the nine things they keep getting wrong.

> **Parent Patterns exist solely to group and present descendant leaf Patterns.
> They never participate directly in scoring, recommendation computation or
> evidence ownership.**

This is a **hard boundary, not a guideline.** A parent is a lens over its
descendants and holds no independent truth. Any implementation that reads a
parent's severity into the Ledger Score, ranks a parent against a leaf, or
attaches an occurrence to a parent is a defect — not a design variation.

Breadth is never smuggled into a number. A group is positioned by its worst
leaf (§4.6) and states its breadth **in words**, where a student can read it.

### 4.4.6 Analytics

- **All aggregation must be structural.** Roll-up is a traversal of the tree.
- **No duplicate aggregate tables.**
- **No duplicated pattern records at multiple scopes.** One real failure produces
  exactly one leaf.

> **The hierarchy itself is the aggregation mechanism.**

Any question answerable by grouping is answered by walking the tree. A
materialised summary elsewhere is a second source of truth and is forbidden.

## 4.5 THE ERROR TAXONOMY — the product's core language

### COGNITIVE — *you did not know*
Fix by learning. Slow to close. Predicts future failure on the same concept.

`not-known` · `misconception` · `wrong-method` · `incomplete-understanding` ·
`misapplied-rule` · `cannot-recall-formula`

### EXECUTION — *you knew and lost the mark anyway*
Fix by process. Fast to close. Predicts failure **across all subjects**.

`misread-question` · `arithmetic-slip` · `sign-error` · `unit-error` ·
`ran-out-of-time` · `incomplete-answer` · `missed-working` · `transcription` ·
`presentation`

**Why the split is load-bearing:** a student losing 30 marks to misconceptions
and a student losing 30 marks to misreading questions have nothing in common and
need opposite interventions. Execution errors are usually the larger, cheaper
win — and are invisible to every competitor, because chapter-wise analytics
cannot see them.

## 4.6 SEVERITY — derived, never entered

*Amended 2026-08-06 — parent derivation defined. See §7.3.*

### 4.6.1 Leaf severity

```
severity = 40·marksWeight + 30·recurrenceWeight + 20·examProximity + 10·conceptExamWeight
```

**Applies to `tier: concept` patterns only.** Derived so that (a) it cannot be
gamed, (b) every improvement to the formula upgrades every existing pattern
retroactively, (c) ranking is explainable — *"this is #1 because you have lost 23
marks to it four times and it is worth 12 marks in April."*

This is the **only** severity formula. There is no parent equivalent.

### 4.6.2 Parent severity

```
parentSeverity = MAX(severity) across all descendant leaf patterns
```

| Property | Rule |
|---|---|
| Purpose | **Presentation only** |
| Ledger Score | **Never consumed** |
| Storage | **Never persisted** |
| Computation | **Always derived on demand** |

Because `MAX` composes — `global = MAX(subjects) = MAX(all leaves)` — tiers can
never disagree, and a future fourth tier stays consistent without a rule change.

It also inherits §4.6.1 in full: improve the leaf formula and every parent
improves with it. There is no second formula to maintain, and no substitute
needed for `conceptExamWeight`, which is undefined where `conceptId` is null.

### 4.6.3 Ordering

When two parents compare equal, in order:

1. **Highest descendant leaf severity**
2. **Highest unresolved descendant leaf count**
3. **Highest descendant marks lost**

Deterministic and total. Every term is computed from the subtree itself, never
relative to the student's other patterns — so adding an unrelated pattern can
never reorder this one.

### 4.6.4 Why maximum, and not an aggregate

A collapsed group occupies **exactly the position its worst leaf occupied.**
Collapsing therefore never re-ranks — which §4.4.5 requires, since ranking
operates on leaves.

Averages were rejected outright: they **dilute**, so logging a fifth, milder
instance would make a worsening problem appear to improve. That is
`PRODUCT_PRINCIPLES` law 7 (*never lie*) failing on the surface the product
exists to make trustworthy.

**Maximum is deliberately blind to breadth.** Breadth is surfaced in the summary
label — *"across 4 topics"* — not folded into the number. A severity that
secretly encodes breadth is less honest than one that ranks by worst case and
states the breadth in words. Note that repetition **within** a concept is already
carried by `recurrenceWeight` at 30%.

**Consequence, stated plainly:** parent severity is a *positioning device*, not a
measure of behavioural badness. If cross-concept breadth should ever outrank a
single severe gap, that belongs in `/next` as an explicit, explainable ranking
rule — never smuggled into severity.

## 4.7 MERGE RULES

*Amended 2026-08-06 — pattern hierarchy adopted. See §7.2.*

**Merging happens at the leaf tier only.** Two occurrences join one leaf pattern
**iff**: same `conceptId`, **and** same `errorClass`, **and** same `errorType`.

**Never merge across `errorClass`.** A misconception about signs and a careless
sign slip look identical on paper and require opposite fixes.

- Merges below `systemConfidence` 0.8 are **provisional**, reversible for 30 days.
- **A student may split a leaf pattern. A student may not merge patterns** —
  merging is how a record collapses into "I'm bad at Physics", the exact
  uselessness we exist to replace.

### 4.7.1 Parent attachment

**Parents are not merged. They are attached.**

When a leaf pattern is created, it attaches to a `subject` parent keyed by
(`studentId`, `subject`, `errorClass`, `errorType`), which in turn attaches to a
`global` parent keyed by (`studentId`, `errorClass`, `errorType`). A parent is
created on demand if it does not yet exist.

Attachment is **deterministic and derived** — it involves no inference and no
confidence score, because it asks no question. `systemConfidence` therefore
applies to leaf merges only.

**Every error type produces a valid tree at all three tiers.** Both classes form
patterns at every tier: §4.4's own example label — *"Sign error when applying the
chain rule"* — is an **execution** error at the **concept** tier.
**`errorClass` never determines tier.**

### 4.7.2 Cross-concept patterns

Supersedes the previous rule that cross-concept execution patterns were *"a
separate pattern type."* They are **not a separate type** — they are the
`subject` and `global` tiers of the ordinary pattern hierarchy.

*"You misread questions"* is a real, global pattern: a `tier: global` row with
`conceptId: null`, whose evidence is every descendant leaf.

The previous phrasing was the source of the ambiguity resolved here — it implied
a second kind of object without saying how an occurrence could belong to both it
and a concept-level pattern, which a singular `Occurrence.patternId` cannot
express.

## 4.8 LIFECYCLE

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

**Implementing `PRODUCT_PRINCIPLES` §3.1:** `resolved` requires **≥2 correct
answers on the same concept**, at least one of them **≥7 days** after the last
occurrence. A student may set `acknowledged` and `practising`. Never `resolved`.

## 4.9 EVIDENCE — immutable

`id` · `type` (`photo` \| `pdf` \| `manual`) · `storageRef` · `contentHash` ·
`cropRegions[]` · `capturedAt` · `sourceDescription` · `verifiedBy`

Never deleted while any occurrence references it. Evidence is what makes the
record trustworthy in 2036; deleting it retroactively invalidates every
diagnosis built on it.

## 4.10 CONSUMERS

| System | Reads | Never reads |
|---|---|---|
| **`/home`** | Top 1 open pattern by severity | Occurrence detail |
| **`/diagnosis`** | Patterns + their occurrences for one evidence item | — |
| **`/record`** | All patterns + all occurrences, over time | — |
| **`/next`** | `open` + `practising`, ranked by severity × examProximity, plus *silent concepts* | `resolved` |
| **`/practise`** | `open` + `practising` as question-generation targets | — |
| **`/parents`** | **`practising` and `resolved` ONLY** — counts and trends | **`open` patterns · occurrence detail · marks lost · raw answers** |
| **Ledger Score** | Resolution rate, evidence volume, coverage | Raw error counts |

The parents row implements `PRODUCT_PRINCIPLES` §3.4 and is **enforced at the
data layer** — the API must be physically unable to return the forbidden fields.

**Silent concepts:** a concept with **zero occurrences and zero correct answers**
is untested, not mastered. Distinct from a known gap, and a first-class input to
`/next`.

## 4.11 THE SCORE INVERSION

```
lib/ledger-score.ts:140
mistakeScore = Math.max(0, Math.round(200 - recentMistakes * 6));
```

**The current Ledger Score penalises the student 6 points for every mistake they
record** — violating `PRODUCT_PRINCIPLES` §3.3.

**Decided inversion.** The mistakes pillar (200 pts) becomes:

- **Resolution rate** (120) — proportion of patterns proven resolved
- **Evidence volume** (50) — papers captured, with a ceiling
- **Acknowledgement** (30) — open patterns seen rather than avoided

Breaking change to an engine with 60 passing tests; versioned when implemented.

---

# 5. COMMERCIAL

- **Razorpay**, parent-billed. *(Supersedes the Stripe reference in the archived
  `CONSOLE.md` §12 — later decision, India-specific, and the payer is the parent.)*
- `/parent/[code]` is **the payment surface**. No payer, no company.
- A quota wall is an upgrade prompt, not an error page.

---

# 6. WHAT NEVER CHANGES

**The entire backend.** This is a product and design change, not an architecture
change.

- All 25 API routes
- Supabase schema, auth, RLS
- Cron jobs, notifications, parent digest, email
- `lib/tools-registry.ts` — the 46 capabilities and their routes
- All AI prompts and tool logic

**The single exception** is the Ledger Score engine, which is deliberately
changed per §4.11 because it currently contradicts a principle.

**Narrowed 2026-08-10.** §6 was a scoping statement for the *product and design*
change of 2026-08-05: it meant *"this particular piece of work does not touch the
backend."* It is **not** a permanent freeze on the backend, and it never
outranked a principle. The §9 ratifications explicitly change backend surfaces
where shipped code breaches ratified law — the parent read path and digest
(§9.2), the streak-driven score dimension and its notification consumers (§9.3),
and the mistake evidence model (§9.4). Where §6 and §9 appear to disagree, **§9
wins**, because §6 is a scope note and §9 is a decision.

---

# 7. DECISION LOG

| Date | Decision | Status |
|---|---|---|
| 2026-08-04 | Thesis and the five-step loop ratified | Live → `PRODUCT_PRINCIPLES` |
| 2026-08-04 | Six diagnosis surfaces merge into one | **Live** |
| 2026-08-04 | 23 routes deleted permanently, 4 archived | **REVERSED 2026-08-05** |
| 2026-08-04 | Console design language ratified | Live → `PRODUCT_PRINCIPLES` |
| 2026-08-04 | MVP is 9 routes | **Live** (§3) |
| 2026-08-05 | **Analytics are observational, not decisional** | **Live** (§1.1) |
| 2026-08-05 | **Default is archive; low usage is not grounds for deletion** | **Live** (§1.3) |
| 2026-08-05 | Classification enforced by a registry field, not the filesystem | **Live** (§1.4) |
| 2026-08-05 | Register ratified — 13 CORE / 12 SUPPORTING / 21 EXPERIMENTAL / 0 LEGACY | **Live** (§1.5) |
| 2026-08-05 | `learn-lab` SUPPORTING, not deleted | **Live** — reverses 2026-08-04 |
| 2026-08-05 | `/console/ai`, `/dashboard/saved` unlinked, not deleted | **Live** (§2.5) |
| 2026-08-05 | 4 "obsolete" tools stay in place as EXPERIMENTAL | **Live** — reverses 2026-08-04 |
| 2026-08-05 | **IA resolved at three altitudes** — 3 surfaces / 12 routes / 46 resolving | **Live** (§2) |
| 2026-08-05 | Razorpay, not Stripe | **Live** (§5) |
| 2026-08-05 | Mistake schema drafted — occurrence/pattern split, error taxonomy, lifecycle | **Live** (§4) |
| **2026-08-06** | **Pattern hierarchy adopted** — three tiers, parents derived from children | **Live** (§4.4, §4.7) |
| **2026-08-06** | **Parent severity = `MAX` of descendant leaves** — presentation-only, never persisted | **Live** (§4.6) |
| **2026-08-06** | **D1 CLOSED — the mistake schema is ratified.** Persistence may begin | **RATIFIED** (§4) |
| 2026-08-05 | Score mistake pillar inverted | **Live** (§4.11) |
| 2026-08-05 | Workspace Engine approved in principle, **frozen** | **Not in scope** (§8) |
| **2026-08-10** | **External study supported as a claim-only input** — declared, then assessed, then verified | **RATIFIED** (§9.1) |
| **2026-08-10** | **Parent mistake visibility is structural, not toggleable** — Option B; §3.4 **not** amended | **RATIFIED** (§9.2) |
| **2026-08-10** | **Streaks removed from scoring; Continuity replaces Momentum** — a rebuild, not a rename | **RATIFIED** (§9.3) |
| **2026-08-10** | **Mistake pillar is REBUILT via the event/assessment pipeline** — the enum patch is rejected | **RATIFIED** (§9.4) |
| **2026-08-21** | **Animation library fixed as Framer Motion** — one library, not GSAP-plus-Framer | **Live** (§7.5) |
| **2026-08-22** | **`/home` retired.** Three built-and-rejected visual passes; founder called it by name — **Live** (§7.6) |
| **2026-08-30** | **Onboarding reversed: ten questions, one per page, then a dashboard walkthrough** — reverses §2.6's three-question cap and its tour ban | **Live** (§7.7) |
| **2026-08-30** | **AI writes without em-dashes, and never closes a concept on its own say-so** | **Live** (§7.8) |

## 7.1 Reversals, with reasons

**"46 routes become 0" — withdrawn.** Conflated navigation with the filesystem.
Navigation goes to 12; all 46 continue to resolve.

**"23 routes deleted permanently" — withdrawn.** Made when usage data was
believed actionable. It is not representative (§1.1), and optionality has value
while it isn't. Deletion is irreversible; a registry field is not.

**"Archive 4 tools to `archive/`" — withdrawn.** Same reasoning. They are
EXPERIMENTAL and stay in place.

**"Zero PostHog usage for 90 days should mean deletion" — withdrawn.** From the
archived `MIGRATION.md`. Directly contradicts §1.1 and §1.3.

**"The 8-week MVP" — withdrawn.** No estimate stood behind it. Effort lives in
`EXECUTION_PLAN.md`.

## 7.2 Amendment — pattern hierarchy (2026-08-06)

**Amends §4.4 and §4.7. No principle changed; `PRODUCT_PRINCIPLES.md` untouched.**

**The ambiguity.** §4.7 stated that execution patterns could be concept-, subject-
or globally-scoped, but §4.4 gave `Pattern` no field able to distinguish them —
subject-scoped and global were both `conceptId: null`. Surfaced during `M1-2`
while writing `lib/mistakes/types.ts`.

**The deeper conflict.** A missing field was the surface problem. The real one was
that §4.3 gives each occurrence a **singular** `patternId` while §4.7 called
cross-concept patterns *"a separate pattern type"* — meaning one occurrence would
have to belong to a concept pattern **and** a broader one simultaneously, which a
1:N relationship cannot express.

**Options considered.** A flat `scope` enum (does not resolve the cardinality
conflict, and lets the Ledger Score double-count); two separate entities (doubles
every consumer's query path); derived-at-query-time aggregation (cheapest, but a
computed pattern has no identity, no lifecycle, and **cannot be resolved** — fatal
against `PRODUCT_PRINCIPLES` §3.1); and the adopted hierarchy.

**Why the hierarchy.** It is the only option that keeps lifecycle and identity for
behavioural patterns, resolves the cardinality conflict without a join table,
prevents double counting **structurally** rather than by remembering a filter, and
reuses the roll-up mechanism §4.2 already commits to for `Concept` instead of
introducing a second way to express the same relationship.

It is also what makes §4.1's promise true: a student sees *one* "you make sign
errors", not forty — and can open it to find the forty.

**Reversal cost.** A migration. Real, bounded, and the reason this is a decision
rather than a principle.

## 7.3 Amendment — parent severity (2026-08-06)

**Amends §4.6 and §4.4.5. No principle changed; `PRODUCT_PRINCIPLES.md` untouched.**

**The gap.** §4.6's formula ends in `conceptExamWeight`, which is undefined where
`conceptId` is null. After the hierarchy amendment (§7.2), parents had a severity
field and no way to compute it. Surfaced as a blocker for `M1-5`'s
`computeSeverity()`.

**Options considered.** Mean and recurrence-weighted mean were rejected because
averages **dilute** — logging a fifth, milder instance would make a worsening
problem appear to improve, which is law 7 failing in the most damaging direction.
Marks-summed aggregation was rejected as unbounded, and normalising it against
the student's totals would make one pattern's severity change when an unrelated
pattern is added. Recomputing §4.6 at the parent tier was rejected because it
requires a second formula maintained in parallel forever, forfeits §4.6's
retroactive-improvement property, and **re-ranks on collapse**, which §4.4.5
forbids.

**Why maximum.** A collapsed group lands exactly where its worst leaf sat, so
collapsing never re-ranks. `MAX` composes across any depth, inherits the leaf
formula for free, cites one named leaf when asked *why*, cannot double count
because a maximum is one child's value rather than a sum, and stores nothing.

**The accepted trade.** Maximum is blind to cross-concept breadth. Breadth is
stated in the summary label instead — *"across 4 topics"* — because a number that
secretly encodes breadth is less honest than one that ranks by worst case and
says the breadth out loud.

**Enforcement.** §4.4.5 now states as a hard boundary that parent patterns never
participate in scoring, recommendation computation or evidence ownership. This
exists so that no future implementation can quietly promote a parent to a
first-class scoring entity.

## 7.4 D1 — CLOSED (2026-08-06)

**The mistake schema (§4) is ratified.** Persistence work may begin.

D1 was held open through `M1-2` deliberately: the TypeScript model was treated as
an implementation target rather than proof of correctness, and writing it surfaced
two real ambiguities (§7.2, §7.3) that would have become migrations had they been
discovered after SQL.

Ratified: §4.1–§4.11 inclusive, with the hierarchy (§4.4, §4.7) and parent
severity (§4.6) as amended.

**Still open, and unaffected by this closure:** D2 (Score inversion) and D6 (seed
subject). Neither gates `M1-3`.

## 7.5 Animation library fixed as Framer Motion (2026-08-21)

**Chosen.** Framer Motion is the one animation library. It was already three
components deep (`Dock`, `AnimatedTitleFM`, `ElasticSlider`) before this was
written down, so this ratifies existing practice rather than starting one.

**Rejected:** adding GSAP alongside it. Consistent with §1.5's classification
of "3 simultaneous motion runtimes" as a maintenance burden — one library,
not two running in parallel for the same job.

**Gotcha to carry forward:** Framer Motion v12 rejects `{ initial, animate }`
objects spread onto `motion.*` elements (TypeScript rejects the `animate`
type). Use `variants` plus string labels for `initial`/`animate` instead.

## 7.6 `/home` retired (2026-08-22)

**Removed.** `/home` was documented in §3 as "← THE PRODUCT" — the sole
post-onboarding landing, "the thesis, rendered": Score + one action + exam
context. It went through three built-and-shipped visual passes in one
session — Console-styled, then bounded-accent warm (§12 of
`PRODUCT_PRINCIPLES.md`, 2026-08-21), then full warm/editorial (§12,
2026-08-22) — and was rejected each time, the last as "even worse" /
"generic AI-SaaS." Asked directly whether the problem was the near-empty
score data or the design itself, the founder said the design, and then
gave the explicit instruction: delete the page.

**What actually happened:** `app/home/page.tsx`, `app/home/layout.tsx`,
`app/home/warm.css`, `app/api/home-layout/route.ts`, and the
`components/home/*` renderers (`composer.tsx`, `score-detail.tsx`,
`exam-day-panel.tsx`, `widgets/index.tsx`) are deleted. `lib/home/*` (the
pure registry/layout/importance/types the composition engine used) is
**kept** — `lib/dash-layout.ts` and `app/tools/personalise/page.tsx` still
depend on it for the Settings layout-customisation feature, which is
unrelated to the page that just left.

**Interim landing, not a decision.** Every redirect and nav link that
pointed at `/home` (`/dashboard` and `/console`'s permanent redirects,
sign-in/sign-up/reset/OAuth-callback routing, onboarding completion, every
tool's "exit" link, the command palette, the app nav) now points at
`/capture` — already built, and named in §3 as "the one screen that must
be built." This is functional plumbing so the app does not 404 on login,
**not** a decision that Capture is the permanent landing screen. That
choice is still open.

**What this is not yet:** a decision that StudyLedger has no NOW
surface at all. `PRODUCT_PRINCIPLES` §1.2/§7.1 (the Score · one action ·
today's context arc) is not amended by this entry — it describes a
function, not a route, and nothing has decided that function is gone for
good rather than pending a landing screen that actually lands. If a
rebuilt NOW surface is decided against permanently, that is a
`PRODUCT_PRINCIPLES` amendment of its own, not implied by this one.

**Known gap:** `tests/home-composition.test.mjs`, deleted alongside
`components/home/composer.tsx` (which it also read directly), covered
`lib/home/layout.ts`'s pure `resolveHomeComposition` logic — order,
omission, tiering. That logic still ships (§ above) and is currently
untested. Rebuilding that suite against `lib/home/*` alone, without the
deleted composer, is unclaimed work.

---

## 7.7 Onboarding reversed: ten questions, one per page, then a walkthrough (2026-08-30)

**Reverses §2.6 as written, and the "never a tour" clause with it.** Founder
decision, stated directly: *"as soon as they sign up for the first time they get
asked 10 questions and like its a page format not like all 10 in one go after
that they go to the dashboard where there is a walk through of how to use and
then they can use freely."*

**What the prior rule was, and why it existed.** §2.6 capped onboarding at three
questions, shipped two, and banned tours and checklists by name. M5-3 executed
that faithfully — `app/onboard/page.tsx` records the history: the file had been a
nine-step wizard asking grade, board, stream, interests, learning style,
communication style, target exam and a syllabus upload, and architecture S.6
called it *"four times the ratified ceiling."* The reasoning was sound and is
not disowned here: every question is an opportunity to abandon before the student
has seen anything of value.

**Why it is reversed anyway.** The cap was written when there was nothing to
feed. Since M19 there is: `personal_model` holds nine typed dimensions
(`lib/personal-model.ts`, architecture I.2), each one materially changing how
the product explains, questions, corrects and paces. Those dimensions were
being populated only by *inference* from behaviour, which means a brand-new
student — the exact person with no behaviour yet — got the least personalised
product. Asking is the fix, and I.6's explicit-over-inferred guarantee already
exists precisely so a stated preference outranks a guessed one.

The abandonment risk is real and is mitigated structurally rather than by
keeping the count low: one question per page, visible progress, a back control,
and every answer persisted as it is given, so leaving early costs the student
nothing and the profile is simply partial.

**The tour ban is narrowed, not deleted.** What §2.6 banned was the edtech
pattern of a product explaining itself instead of being obvious, and that
judgement stands for feature tours and for checklists. What ships is a
first-run walkthrough of the surfaces a student will actually use, which ends
and never returns. If the walkthrough grows into a feature tour, this entry has
been misread.

**Scope.** `/onboard` and the first-run dashboard pass. No other route changes.
`PRODUCT_PRINCIPLES` §4.3 (milestone-gated unlocking is gamification) is
untouched and still binding: nothing in the walkthrough may gate, unlock, or
award anything.

## 7.8 The AI writes plainly, and does not close a concept early (2026-08-30)

Two founder rules for every model-backed surface, recorded because they are
product law rather than prompt preference:

1. **No em-dashes in generated prose.** Enforced at the AI boundary, not by
   asking the model nicely, and covered by a test — a style rule that lives only
   in a prompt is a style rule that regresses on the next model version.
2. **A concept is not closed until it is crystal clear to the student.** The
   tutor does not conclude, change subject, or mark an explanation finished on
   its own say-so. This is the teaching-surface counterpart of
   `PRODUCT_PRINCIPLES` §3.1 — a student may not mark their own mistake fixed,
   and the model may not declare its own explanation understood.

Neither rule weakens §1.4 (*we do not teach*): the product's business is still
the record. These govern how the explanation behaves when one is given.

---

# 8. FROZEN — APPROVED, NOT IN SCOPE

**The Workspace Engine** (four DNA traits, 162 configurations, six presets) is
approved in principle and **not built by any current milestone.** Archived at
`docs/archive/WORKSPACE.md`.

One claim was promoted out of it into `PRODUCT_PRINCIPLES` §4.3:
milestone-gated unlocking is gamification and is banned.

**Do not begin Workspace Engine work without an explicit decision recorded here.**

---

# 9. THE FOUR ARCHITECTURE DECISIONS — RATIFIED 2026-08-10

*Ratified 2026-08-10. These are the four calls
`STUDYLEDGER_OPEN_DECISIONS.md` isolated and could not make on its own; that
memo is retained as the record of **how** each was reasoned. This section
records **what was chosen**. Field names, table names and formulas are
deliberately absent — those belong to `STUDYLEDGER_SYSTEM_ARCHITECTURE.md`.*

## 7.9 `/capture` retired (2026-08-31)

**Removed, on direct instruction.** The founder's words: *"delete everything
related to /capture and i dont care whatever is written its a direct order
from me."*

This reverses more than one prior entry, and says so plainly rather than
leaving the contradiction in place:

- **§3, route 4** named `/capture` *"Photograph a marked paper. If this
  doesn't ship, nothing else matters."* That sentence no longer describes the
  product.
- **§7.6** made `/capture` the interim landing after `/home` was deleted,
  and called it *"already built, and named in §3 as the one screen that must
  be built."* Both halves are now void.
- The ASCII route map at §3 still marks `/capture` as *"← THE MISSING
  SCREEN"*. That annotation is historical and is left as written, because §7
  records reversals rather than rewriting the sections it reverses.

**What actually happened.** `app/capture/*`, `app/api/capture/*`,
`components/capture/*`, `lib/capture-extraction.ts`, `lib/capture-intake.ts`
and the three capture test suites are deleted. Thirty-one code references
across twenty-two files were repointed first, so nothing 404s:

- **Sign-in, sign-up, OAuth callback, password reset and onboarding
  completion** now land on `/today`. Left unrepointed, deleting the route
  would have broken login for every student.
- **`/dashboard`, `/console`, `/tools/exam-practice` and `/tools/syllabus`**
  permanently redirect to `/today` instead of into a deleted page. A 301 into
  a 404 is worse than a 404, because browsers cache it.
- **The first-run walkthrough moved with the redirect.** It was mounted on
  `/capture` and triggered by `?first=1`. `/today` now reads that flag and
  renders it. Without this the walkthrough §7.7 ratified would have silently
  stopped existing.
- **Empty states on `/diagnosis` and `/record`** said *"Capture a marked
  paper and confirm what it found."* Both were rewritten: the instruction had
  nothing behind it. Their single control now points at `/today`, because
  `Empty` requires exactly one action by design (CONSOLE.md §9) and weakening
  that type to satisfy the compiler would have deleted the rule.

**Interim landing, not a decision.** `/today` is now the post-onboarding
landing because it is the surface that answers *"what should I do now"* and it
is already guarded and shelled. As with §7.6, this is plumbing so the app does
not 404 on login, **not** a ratification of `/today` as the permanent home.

**What this does not decide.** Whether StudyLedger has any paper-intake path
at all. `PRODUCT_PRINCIPLES` §1.1 (*"your mistakes are your syllabus"*)
describes a function, not a route, and the ingestion schema (008), the
evidence tables (007) and the occurrence pipeline all still exist and are
untouched in the database. Nothing has decided that capturing a paper is gone
for good rather than pending a screen the founder is happy with. If intake is
abandoned permanently, that is a `PRODUCT_PRINCIPLES` amendment of its own and
is not implied here.

**Known gap.** `tests/capture-extraction.test.mjs`,
`tests/capture-pipeline.test.mjs` and `tests/capture-shell.test.mjs` are
deleted with the code they read. `lib/evidence.ts`, `lib/ingest/*` and the
008 pipeline they partly exercised still ship and have lost that coverage.
Rebuilding it against the surviving modules is unclaimed work.

---


## 7.10 `/dashboard` rebuilt as the landing surface (2026-09-01)

**Founder instruction:** *"after onboarding it should redirect to the
dashboard"*, and *"i want today to be a button on the dashboard and not just
open aise hi."*

**What this settles.** The post-onboarding landing has moved three times
without ever being decided: §7.6 pointed it at `/capture` when `/home` was
deleted, §7.9 pointed it at `/today` when `/capture` was deleted, and both
entries said explicitly that this was plumbing rather than a choice. This is
the choice.

**`/dashboard` answers again.** It had been a 301 stub since M3-3 and was
shadowed twice over: by `app/dashboard/page.tsx`'s `permanentRedirect` and by
an edge redirect in `next.config.mjs`, which wins over any page. Both are
removed. `/console` now 301s to `/dashboard` rather than to `/today`, since
it was always the second shell for this same surface.

**Today is a card, not a room.** The founder's objection was to being dropped
into Today without choosing it. The dashboard carries a TODAY panel showing
how many items are open, with one control that opens it. A student decides to
go there, and decides knowing whether anything is waiting.

**The zero state is the designed state.** A student who has just answered ten
questions has no papers, no sessions and no mistakes. `/home` was rejected
three times partly for looking empty, so the record strip renders at the
`figure` step rather than `display`: at `display` the four zeros were the
loudest thing on a new student's first screen, which is the same failure in a
different shape. A count is a quiet fact until there is something to count.

**Figures are read, never invented.** The strip renders `RecordTotals` from
`/api/record`: occurrences, papers, sessions, live patterns. Two of those are
`number | null` at the source, where null means THAT SOURCE DID NOT ANSWER.
Those render as "not read" rather than as 0, because printing a zero there
would be the product asserting a fact it does not have (V.7.6, and
`lib/record.ts`'s own rule that such columns are *"null, never 0"*).

**The first-run walkthrough moved with the landing.** Onboarding now ends at
`/dashboard?first=1` and the dashboard reads the flag. `/today` no longer
mounts it, so the tour cannot fire twice.

**`/today` is unchanged and still reachable.** It keeps its own shell, its own
guard and its own empty states. It is simply no longer where a student arrives
by default.

**Not decided here.** What else belongs on the dashboard. The founder has
reference images to supply, and this is the structure they will be applied to,
not the final visual design. `components/dashboard/*` (six surviving panels
from the retired `/home`) and `lib/home/*` (the composition engine) are still
in the repository, unmounted, and are the obvious material for that pass.

### 7.10a The mockup's streak tile is not built (2026-09-01)

**Founder instruction:** *"do everything acc to studyledger"*, twice, when
asked whether to build the streak tile or keep the fence.

The supplied HTML mockup has a "Study streak, 14 days" tile. §9.3 removed
streaks from every surface and `tests/m0-integrity-fences.test.mjs` exists
specifically to stop one returning, so the mockup and the product disagreed.
The instruction resolves it in the product's favour: the tile renders
**Consistency** instead, which is the same underlying signal expressed as
§9.3's replacement rather than as a run of days a student can break.

`score_history.streak` is still WRITTEN. `lib/ledger-score.ts` reads it as the
raw input to the Consistency term, so deleting the write would silently move
every student's score. §9.3 removed the PRESENTATION, not the storage, and
`/api/dashboard` no longer returns the field, so no future card can render one
without deliberately reopening this decision.

### 7.10b Next Up is derived, never read from the table (2026-09-01)

The card first queried the `recommendations` table directly. That was wrong
twice. It was **dead**: nothing in the codebase inserts into that table, since
`lib/recommendations/engine.ts` is I/O-free by design, so the card would have
shown its empty state forever while looking perfectly normal. It also broke
the K.3/V.11 fence, which confines that table to the engine so a recommendation
can never be smuggled in as something that gates a student. The card now
derives candidates in memory from open patterns and due retests, exactly as
`/api/today` does, so the two surfaces cannot disagree about what to suggest.

### 7.10c The retirement of `/capture` finished (2026-09-01)

§7.9 repointed 31 references but three student-facing **labels** still named
the deleted route while their hrefs pointed elsewhere: the 404's primary
button read "Capture", the empty state's only control read "Open Capture", and
the first-run walkthrough opened with "This is Capture". Each sent a student
somewhere its own label did not name. Relabelled to Dashboard, Open Today, and
"Start with a marked paper".

Every tap target the product owns now clears 44px at 375px, measured by
`scripts/render-375.mjs`. The two that failed were the sign-in screen's escape
hatches, "Forgot password?" at 17px and "Create one free" at 23px, which are
exactly the controls a student needs when they cannot get in. The type is
unchanged. Only the hit area grew.

### 7.10d Settings offered every palette except the one you were in (2026-09-01)

`lib/palette.ts` predates the Console engine. It listed fifteen bases, ten of
them dark, with `obsidian` as the default, and **no swan at all**. Settings >
Appearance renders one card per entry from that list.

This was not cosmetic. Settings writes the chosen id to
`localStorage['theme-base']`, which is the **same key** `app/layout.tsx`'s
pre-paint script reads. So the palette a student was actually looking at did
not appear among the palettes offered, and `getActiveBase()` coerces any
unrecognised value to `DEFAULT_BASE`. Opening Settings and touching nothing
could throw a swan user into a near-black theme they never chose.

There were **four** hardcoded defaults across the codebase and they did not
agree: the pre-paint script said swan, the Console engine said swan,
`lib/palette.ts` said obsidian, and `appearance-fields.tsx` said obsidian
again. swan and swan-night are now the first two entries, their values taken
from the engine's ramps, and both stragglers defer to `DEFAULT_BASE`.
`tests/first-paint-palette.test.mjs` now checks the third copy too, so the
three cannot drift.

Obsidian survives as a choice. Removing it would silently re-theme anyone who
deliberately picked it, which is the same fault in the other direction.

### 7.10e Analytics had been blocked by our own CSP since launch (2026-09-01)

PostHog appeared in `connect-src` but never in `script-src`. **connect-src
governs where a page may send data; script-src governs what code may load.**
Allowing the first without the second meant every PostHog script (`config.js`,
the session recorder, surveys, web-vitals) was refused by the browser on every
page load. Analytics looked configured and collected nothing, and nobody
noticed because a blocked script is a console warning, not a broken page.

Only `us-assets.i.posthog.com`, which serves the library, is added.
`us.i.posthog.com` is the ingestion endpoint: it receives data and has no
business executing script in the page, so it is deliberately left out.
`tests/csp-posthog.test.mjs` pins that asymmetry, and that no wildcard host
may ever execute script.

This is the third defect of the same shape found this week, after the job
runner losing `Authorization` across a redirect and swan never reaching the
screen: **configuration that reads correctly but was never observed working.**

### 7.11 `marks-translator` is not adopted (2026-09-02)

Another agent left a 959-line route, `app/tools/marks-translator/page.tsx`, on
a branch of this repository. **It is not on `feat/console-now` and not on
`master`**, so it cannot reach a student today and is not a launch blocker.
The question is only whether to adopt it. Three findings say no.

**It cannot work.** It calls `callAIOrThrow({ tool: "marks_translator" })`.
That name appears in no backend file: not in `REQUIRED_PARAMS`, not in
`lib/tools-registry.ts`'s `AI_CAPABILITIES`, nowhere. M15-3/M15-7 deliberately
replaced the hand-written tool list with one derived from the manifest, so a
name absent from it "cannot reach `buildPrompt` because there is no
`buildPrompt` left to reach". Every use would 400. Registering it is therefore
not a formality, it is adopting a feature.

**It contradicts a principle.** Its central type is `SubjectVerdict`, and it
labels each subject "Strength", "Holding", "Sinking" or "Critical" from a
single marksheet. PRINCIPLES: *"State facts; offer the next move; never judge.
A down day shows the honest figure and one recovery action, never a verdict."*
Calling a student's Physics "Critical" off one paper is the judgement that
sentence forbids, and it is inferred from marks alone with no evidence trail,
which is the opposite of how every other figure in this product is earned.

**The job is already done.** `marks-obituary` ("Marks Accounting") is in the
registry and shipping: it takes 60 words on marks you should have got and
returns what each was lost to, when in the paper it happened, and a prevention
protocol. That is the same input answered with an account rather than a label.

Left on its branch, unmerged. The tool count in EXECUTION_PLAN §1.5 does not
move, because nothing was added.

### 7.12 The welcome queue: three people, not fifteen rows (2026-09-02)

Every outbound email failed from launch until 2026-09-01. `lib/jobs.ts` called
itself at the apex, which 308s to `www`, and **a cross-host redirect strips the
`Authorization` header**, so the runner arrived at its own endpoint
unauthenticated. Fixed with `normaliseOrigin()`, locked by
`tests/jobs-origin.test.mjs`. That fix is committed but **not deployed**, so
the queue is still in its failed state.

Auditing it before requeuing changed the picture twice, and both corrections
matter more than the fix itself.

**Fifteen failed rows are three human beings.** Each student is retried three
times and can be enqueued more than once: `trương minh` alone accounts for
twelve rows. Requeuing row by row would have mailed one person twelve welcome
emails, turning a silent failure into a visible one.

**Every currently PENDING row is mine.** Twelve jobs named `dash-<epoch>`,
`flow-<epoch>` and `n406-<epoch>` were enqueued by local testing of the
dashboard and onboarding this week. By status alone they are indistinguishable
from real sign-ups, and the first cron run after deploy would have picked them
up. They must be discarded, not sent.

So the real backlog is **Syed (19 July), Riddhi (1 August) and trương minh
(19 August)**: three students who signed up, got nothing, and in two cases have
been waiting over a month.

`scripts/audit-welcome-queue.mjs` performs this classification and is
read-only. It is to be run before and after any requeue, and the two outputs
compared. **Requeuing is deliberately not automated:** it sends real mail to
real people, and a welcome email six weeks late may deserve different words
than the template. That is the founder's call, not a script's.

### 7.13 A fourth schema drift: `jobs.status` has no constraint (2026-09-02)

Found while preparing the requeue. The script intended to mark retired rows
`superseded`, and both 000 and 004 declare:

    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'running', 'done', 'failed'))

so that write should have been rejected. It was accepted. Writing
`status = 'not-a-real-status-xyzzy'` to a throwaway row was **also** accepted,
which settles it: production's `jobs.status` has no CHECK at all.

**How it drifted.** 004 creates the table with `CREATE TABLE IF NOT EXISTS`,
and its own comment says jobs was "declared in 000, never applied". The table
already existed when 004 ran, so `IF NOT EXISTS` did nothing whatsoever: not
merely the constraint, the entire definition was skipped. The repo has
described a constraint production never had.

This is the **fourth** drift of this shape, after three in `user_data`.
`CREATE TABLE IF NOT EXISTS` is silent by design, which makes it the wrong
tool for evolving a table that may already exist.

**Why it matters.** `lib/jobs.ts` selects work with `status = 'pending'`. A
status it does not recognise is not an error, it is invisible: the row is
never selected and never runs. One typo would strand a job permanently and
silently, which is the same failure mode that let fifteen welcome emails sit
unnoticed for six weeks.

Repaired by **037**, which adds the constraint `NOT VALID` first so it governs
new writes without rejecting existing rows, then validates separately so a
surprise fails loudly rather than halfway. It ships as **part-08**: parts 01 to
07 are already applied, and an applied part is history.

Two things were caught only because the work was rehearsed rather than
reasoned about. `scripts/rehearse-production.mjs` failed 037's verification
block with a not-null violation on `jobs.id`, because the harness builds
tables from the measured column list, which records types and nullability but
not DEFAULTs. The migration now supplies the id explicitly: it depends on one
thing less, and works in both places. The founder would otherwise have pasted
a part that failed.


### 7.14 The welcome email was broken in three independent places (2026-09-02)

Fixing the redirect was necessary and not sufficient. Preparing the requeue
uncovered two further breaks, either of which would have let the script report
success while the student still received nothing.

**The Resend API key is revoked.** `GET /domains` returns
`400 API key is invalid`. The key is well-formed (`re_`, 36 chars), so it was
rotated or revoked rather than mistyped, exactly as `ANTHROPIC_API_KEY` was
earlier this week. **No mail can currently be sent by anyone**, deployed fix or
not. A revoked key does not fail loudly: `/api/welcome` returns 500, the job
retries three times and lands back in `failed`, and the queue looks exactly as
it did before.

**Two of the three students are already flagged as having been welcomed.**
`/api/welcome` is idempotent on `app_metadata.welcomeSent`, and that flag is
written **only after** `resend.emails.send()` returns without error. Syed and
Riddhi both carry it. So their sends were ACCEPTED by the provider and then
never arrived: bounced, suppressed, or dropped for an unverified domain, none
of which is visible at the call site. For those two accounts a requeue would
call the endpoint, get `{skipped: true}`, mark the job done, and send nothing.

That last point is the important one. **Accepted is not delivered**, and a
success flag written on acceptance records the wrong fact. It is the same
mistake as trusting a 200 from a redirect: the call returned, so the work was
assumed done.

`scripts/requeue-welcome.mjs` now checks all three preconditions before
writing anything, reports every blocker in one run rather than revealing them
one at a time, and refuses `--commit` while any stands. Verified: it currently
refuses, naming all three.

**What the founder must do, in order.** Issue a new Resend key and set it in
Vercel. Deploy. Confirm `studyledger.in` is a verified sending domain in
Resend, since an unverified domain would explain the two silent
non-deliveries. Then clear `welcomeSent` on those two accounts, which is a
deliberate act and not something a requeue script should do on its own
initiative, and run the requeue.


### 7.15 Every new student was trapped at the end of onboarding (2026-09-02)

**The worst defect found this week**, and the only one that stopped a person
using the product at all. A student answered all ten onboarding pages, pressed
**"Open my ledger →"**, and got:

> Could not save. Check your connection and try again.

The connection was fine. `saveUserData()` spreads its keys straight into a
PostgREST upsert, so every key must **be** a column. `user_data` is
inconsistent by history: `weakTopics`, `parentCode` and `papersCount` are
genuinely camelCase columns, while the flag is `onboarding_done`. Writing
`onboardingDone` returned:

    400 PGRST204 Could not find the 'onboardingDone' column of 'user_data'

So signup could not complete. Not degraded, **impossible**: the student was
returned to the same page indefinitely, with an error blaming their network.

The read had the same fault in reverse. `serverRow.onboardingDone` is always
undefined, so the server's answer could never win and the value fell through
to `localStorage`. Even a student whose flag was somehow set would be sent
back through onboarding on any device with a cold cache.

**Fixed by mapping at the boundary**, not by renaming the column: a rename
would break every reader mid-flight, and the table's camelCase columns are
real. `COLUMN_NAMES` translates field names to column names in the one place
where the two meet.

**How it was found.** By WALKING the journey in a browser, as a student, with
`scripts/walk-journey.mjs`. It creates a real account, answers all ten pages,
and asserts where it lands. Reading the code would not have found this: the
call is correct TypeScript against a plausible field name, and the mismatch
lives only in the database. Two of the walker's own bugs had to be fixed first,
each of which had wrongly accused the product.

`tests/user-data-columns.test.mjs` now checks every written field against
production's measured column list, so the class of defect cannot return.

This is the sixth production surprise this week, after the revoked Anthropic
key, the apex redirect stripping `Authorization`, obsidian instead of swan,
PostHog blocked by our own CSP, and the missing `jobs.status` constraint. All
six shared one shape: **code that reads correctly and was never observed
running.**

---


## 9.1 External study is supported, as a claim

**Chosen.** A student may tell StudyLedger what they studied outside it — NCERT,
a textbook, school, a teacher, coaching, YouTube, another site, handwritten
notes. The declaration is recorded as **student-declared evidence**, it may open
a study session, and it **earns assessment coverage**.

**It scores nothing by itself.** A declared concept is unverified until it has
been assessed; only then does it become verified academic evidence and reach the
record or the Ledger Score.

**Rejected:** counting only in-product activity. That would make the product a
measure of app usage.

Governed by `PRODUCT_PRINCIPLES` **§3.5** (added the same day), and constrained
by §3.1 and §3.2, which are unchanged. Anywhere a declared-but-untested concept
is shown — to the student or to a parent — it must be **visibly distinct** from a
verified one.

## 9.2 Parent mistake visibility is structural, not a setting

**Chosen — Option B.** Individual mistake evidence is **`Private` at every
setting**. The student controls what parents see *within the allowed model*, and
there is no toggle, anywhere, that opens individual mistakes to a parent.

| Parents may see | Parents never receive |
|---|---|
| Progress, trajectory | Individual wrong answers |
| Continuity of verification | Individual mistake occurrences |
| Subjects, verified learning | Detailed mistake history |
| High-level areas needing attention | Question-by-question failures |
| Reports | Mistake counts, forensic lists |

> **Parents can understand how the student is doing without being given a
> forensic record of how the student failed.**

**Rejected:** student-controlled granular sharing (Option A) and the
aggregate-trend hybrid (Option C). Both would have required a dated amendment to
`PRODUCT_PRINCIPLES` §3.4 first; **that amendment was considered and refused.**
Where an earlier "the student controls everything" framing conflicts with §3.4,
**§3.4 wins** — the product serves minors.

**Consequence, independent of anything else:** the two live §3.4 breaches — weak
topics returned by the parent API, and the per-topic miss-count table in the
parent digest — are **violations to be removed**, not features to be gated.

## 9.3 Streaks leave the score; Continuity replaces them

**Chosen.** No consecutive-day mechanic is a core academic scoring input. The
conceptual dependency *"you studied X days in a row, therefore your academic
state is better"* is removed.

**Retained under a different name and a different definition — Continuity:**
sustained, **verified** academic engagement over a reasonable rolling window,
computed from verified study sessions, demonstrated learning, assessment
participation and academic activity.

**Continuity must never become** a daily punishment · a streak counter · a score
cliff · a guilt mechanism · a *"you broke your streak"* notification. **A student
must be able to miss a day without feeling they destroyed their progress.**

> Target sentence: ***"Your learning has been consistent."***
> Never: *"You haven't broken your chain."*

This is not the removal of longitudinal consistency; it is the removal of
gamified streak mechanics in favour of an evidence-based model.

**This is a rebuild, not a rename.** The shipped streak implementation is
classified **REMOVE FROM SCORING**, and the subsystems that consume it —
notifications and the parent digest banner — are **REBUILD / DELETE** per
`STUDYLEDGER_SYSTEM_ARCHITECTURE.md` Parts S and W. Renaming the existing streak
variable to `continuity` is explicitly **not** an implementation of this
decision.

Implements the already-ratified `PRODUCT_PRINCIPLES` §4.2; no principle changed.

## 9.4 The mistake pillar is rebuilt, not patched

**Chosen.** The mistake-score defect is an **evidence architecture** problem, not
a status-enum problem. The status-enum patch is **rejected outright** — it would
convert a dead pillar into a self-awardable one, which is worse than the bug.

**The target flow, in order:**

```
Academic Event → Study Session → Assessment → Assessment Evidence →
Mistake Occurrence → Mistake DNA → Correction → Retest →
Verified Resolution → Ledger Score Evidence
```

Two hard rules, and neither is negotiable at implementation time:

> **A mistake is not "resolved" because the student says it is resolved.
> Resolution requires evidence.**
>
> **A student cannot earn mistake-related score by declaring or manipulating a
> mistake state.**

**Presentation state is never score evidence.** No path from a UI dismissal to a
score movement may exist.

**Existing code.** `lib/mistakes/*` is **evaluated for reusable domain logic** —
its lifecycle, merge and resolution-gate logic is sound and tested. Its current
**persistence and evidence assumptions are not the target architecture** and
carry no presumption of survival. "Reuse the domain engine" is not "keep the
storage model."

Implements `PRODUCT_PRINCIPLES` §3.1 and §3.2, and supersedes nothing in §4.11 —
§4.11's inverted pillar (resolution rate · evidence volume · acknowledgement) is
what this pipeline makes computable for the first time.

## 9.5 What §9 does not decide

Table names, column names, event names, enum values, point allocations, window
lengths, thresholds and migration sequencing. All of those live in
`STUDYLEDGER_SYSTEM_ARCHITECTURE.md`; ordering and effort live in
`EXECUTION_PLAN.md`.