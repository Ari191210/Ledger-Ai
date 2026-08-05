# STUDYLEDGER — PRODUCT DECISIONS

```
AUTHORITY:       decisions
ANSWERS:         "what have we chosen, as of now?"
MAY NOT CONTAIN: principles · milestones · task order · effort estimates · dates of delivery
PRECEDENCE:      PRINCIPLES > DECISIONS > PLANS
LAST AMENDED:    2026-08-05
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

**CORE — 13.** The loop itself.
`post-exam` · `paper-autopsy` · `marks-forensics` · `marks-obituary` ·
`paper-trauma` · `paper-pattern` · `calibration` · `syllabus` · `grade-tracker` ·
`exam-planner` · `silent-topics` · `practice` · `exam-practice`

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

Not one of the 46 tools meets the deletion bar. Everything that qualifies is
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
├── /onboard                Board and subjects. Then straight to Home.
│
├── /home                   ← THE PRODUCT
│                           "What should I fix next?"
│                           Score · the one action · exam countdown
│                           Becomes Exam-Day mode when a paper is tomorrow
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

**Board and subjects, one screen.** The ceiling is three questions; we use one
screen's worth. Then straight into Home with a real starting Score. Never a
tour. Never a checklist.

---

# 3. V1 SCOPE

**Nine routes ship. Nothing else.**

| # | Route | Why it cannot be cut |
|---|---|---|
| 1 | `/auth` | No product without a user |
| 2 | `/onboard` | Board and subjects. Nothing else. |
| 3 | `/home` | The thesis, rendered. Score + one action. |
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

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `studentId` `conceptId` | uuid | |
| `errorClass` | `cognitive` \| `execution` | **never mixed** |
| `errorType` | enum | the specific error |
| `label` | string | *"Sign error when applying the chain rule"* |
| `occurrenceIds[]` | uuid[] | the evidence trail |
| `recurrenceCount` | int | occurrences in trailing 180 days |
| `firstSeenAt` `lastSeenAt` | timestamp | |
| `severity` | 0–100 | **derived, never entered** (§4.6) |
| `systemConfidence` | 0–1 | how sure we are this is *one* pattern |
| `status` | enum | §4.8 |
| `remediationPlan` | ref \| null | |
| `history[]` | append-only | every status transition, with cause |
| `resolvedAt` | timestamp \| null | |

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

```
severity = 40·marksWeight + 30·recurrenceWeight + 20·examProximity + 10·conceptExamWeight
```

Derived so that (a) it cannot be gamed, (b) every improvement to the formula
upgrades every existing pattern retroactively, (c) ranking is explainable —
*"this is #1 because you have lost 23 marks to it four times and it is worth 12
marks in April."*

## 4.7 MERGE RULES

Two occurrences join one pattern **iff**: same `conceptId`, **and** same
`errorClass`, **and** same `errorType`.

**Never merge across `errorClass`.** A misconception about signs and a careless
sign slip look identical on paper and require opposite fixes.

- Merges below `systemConfidence` 0.8 are **provisional**, reversible for 30 days.
- **A student may split a pattern. A student may not merge patterns** — merging
  is how a record collapses into "I'm bad at Physics", the exact uselessness we
  exist to replace.
- Cross-concept execution patterns are a **separate pattern type**
  (`conceptId: null`). "You misread questions" is a real, global pattern.

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
| 2026-08-05 | Mistake schema ratified — occurrence/pattern split, error taxonomy, lifecycle | **Live** (§4) |
| 2026-08-05 | Score mistake pillar inverted | **Live** (§4.11) |
| 2026-08-05 | Workspace Engine approved in principle, **frozen** | **Not in scope** (§8) |

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

---

# 8. FROZEN — APPROVED, NOT IN SCOPE

**The Workspace Engine** (four DNA traits, 108 configurations, seven presets) is
approved in principle and **not built by any current milestone.** Archived at
`docs/archive/WORKSPACE.md`.

One claim was promoted out of it into `PRODUCT_PRINCIPLES` §4.3:
milestone-gated unlocking is gamification and is banned.

**Do not begin Workspace Engine work without an explicit decision recorded here.**
