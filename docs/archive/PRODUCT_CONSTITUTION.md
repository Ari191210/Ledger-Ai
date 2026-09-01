> # ARCHIVED — NOT GOVERNING
>
> **Moved to `docs/archive/` on 2026-08-05. This file decides nothing.**
>
> Product law. Thesis and bans moved to PRODUCT_PRINCIPLES.md; IA, merge map and MVP scope moved to PRODUCT_DECISIONS.md. Its Part 5 delete list and Parts 8-9 roadmaps were withdrawn.
>
> Authority now lives in **`PRODUCT_PRINCIPLES.md`**, **`PRODUCT_DECISIONS.md`**,
> **`EXECUTION_PLAN.md`** and **`CLAUDE.md`** — see `docs/GOVERNANCE_MAPPING.md` for a
> statement-by-statement map of where everything went.
>
> Retained because the reasoning is worth keeping. **Do not follow it.**

---
# STUDYLEDGER â€” PRODUCT CONSTITUTION

**Ratified 2026-08-04. Supersedes all previous roadmap discussions.**

Two governing documents exist and no others:

- **`PRODUCT_CONSTITUTION.md`** (this file) â€” what exists and why.
- **`CONSOLE.md`** â€” how it looks, moves and feels.

`PRODUCT.md` and `DESIGN.md` are superseded and scheduled for deletion in
Implementation Order task 1 â€” **not yet removed, awaiting your go-ahead.** Three
constitutions is how the product spent a year oscillating.

---

## THE THESIS

> **StudyLedger helps a student answer one question: "What should I fix next?"**

The loop, in order. Every surface must sit on it:

```
CAPTURE  â†’  DIAGNOSE  â†’  RECUR  â†’  PRESCRIBE  â†’  REMEDIATE
evidence    what went    what      what to        close
in          wrong        repeats   fix next       the gap
```

**A page that does not sit on the loop does not exist.** Not archived for later,
not kept because it works. Does not exist.

---

## THE EDITORIAL FINDING

The audit produced one conclusion that outranks everything else:

> **The core product already exists. It has been shattered into six routes wearing
> six different metaphors.**

`post-exam` (Mistake DNA) Â· `paper-autopsy` (Dissect every mark you lost) Â·
`marks-forensics` (Which line lost you marks) Â· `marks-obituary` (Cause of death) Â·
`paper-trauma` (Questions that broke you) Â· `paper-pattern` (What examiners want)

Six destinations. One product. A student who wants to know why they lost marks must
choose between an autopsy, an obituary, a forensics lab and a trauma map â€” and each
gives a fragment of the same answer.

**These six become one surface: DIAGNOSIS.** That merge *is* the company.

### And the metaphor family dies with them

Obituary Â· autopsy Â· coroner Â· cause of death Â· trauma Â· cremator Â· forensics.

It is clever, it is memorable, and it is **shame delivered as branding.** `CONSOLE.md`
forbids shaming the student. A product that tells a sixteen-year-old their marks died
and here is the coroner's report violates its own constitution in the product name.
The language is banned permanently, not softened.

### The thing that matters most does not exist

**There is no capture surface.** No route accepts a photograph of a marked paper.
`syllabus` proves PDF upload works end to end, so the plumbing is partly built â€” but
the single most important screen in the company has never been designed.

Forty-six tools were built around a step that was skipped.

---

# PART 1 â€” INVENTORY

Recommendations are only: **KEEP Â· MERGE Â· REWRITE Â· ARCHIVE Â· DELETE**

## 1A. Core routes

| Route | Purpose | Used? | Fits thesis? | Recommendation |
|---|---|---|---|---|
| `/` | Marketing | Yes | Indirect â€” acquisition | **REWRITE** |
| `/auth` | Sign in | Yes | Gate | **REWRITE** |
| `/auth/callback` | OAuth return | Yes | Plumbing | **KEEP** |
| `/onboard` | First run | Yes | Sets the loop | **REWRITE** â€” one question |
| `/dashboard` | Everything | Yes | Partially | **REWRITE** â†’ becomes Home |
| `/dashboard/profile` | User settings | Low | No | **MERGE** â†’ Settings |
| `/dashboard/saved` | Saved outputs | Unknown | No â€” saves tool output | **DELETE** |
| `/console` | NOW | **No â€” unlinked** | Yes | **KEEP** â†’ becomes Home |
| `/console/work` | Workspace | No | Yes | **KEEP** â†’ becomes Capture |
| `/console/practice` | Practice | No | Yes | **MERGE** â†’ Remediate |
| `/console/analytics` | Trends | No | Yes | **MERGE** â†’ Record |
| `/console/ai` | AI surface | No | No â€” teaching | **DELETE** |
| `/pricing` | Plans | Yes | Commercial | **REWRITE** â€” Razorpay |
| `/limit` | Quota wall | Yes | Commercial | **MERGE** â†’ Pricing |
| `/parent/[code]` | Parent view | Yes | **Payment surface** | **REWRITE** |
| `/faq` | Support | Low | No | **MERGE** â†’ `/` |
| `/legal/terms` `/privacy` `/data` `/ip` | Legal | Rare | Required | **MERGE** â†’ one `/legal` |
| `/admin` | Internal ops | Founder | Operational | **KEEP** â€” exempt from all design law |
| `/tools` (layout) | Tool shell | Yes | Shell only | **REWRITE** â†’ workspace shell |

## 1B. The 46 tools

### CORE â€” the loop itself (11 â†’ 1 product, 0 standalone routes)

| Slug | Purpose | Fits thesis? | Recommendation |
|---|---|---|---|
| `post-exam` | Mistake DNA + debrief | **Yes â€” this is the product** | **KEEP** as DIAGNOSIS |
| `paper-autopsy` | Marks lost, per question | Yes â€” duplicate | **MERGE** â†’ Diagnosis |
| `marks-forensics` | Which line lost marks | Yes â€” duplicate | **MERGE** â†’ Diagnosis |
| `marks-obituary` | Cause of loss | Yes â€” duplicate | **MERGE** â†’ Diagnosis |
| `paper-trauma` | Recurring killers | Yes â€” duplicate | **MERGE** â†’ Diagnosis |
| `paper-pattern` | Examiner patterns | Yes â€” duplicate | **MERGE** â†’ Diagnosis |
| `syllabus` | Map the curriculum | Yes â€” locates gaps | **KEEP** â†’ Capture |
| `grade-tracker` | Marks over time | Yes â€” **the record** | **KEEP** â†’ Record |
| `calibration` | Confidence vs reality | **Yes â€” the deep truth** | **MERGE** â†’ Diagnosis |
| `silent-topics` | What you avoid | Yes â€” a gap class | **MERGE** â†’ Recommendations |
| `exam-planner` | Spaced revision | Yes â€” prescription | **KEEP** â†’ Recommendations |

### IMPORTANT â€” supports the loop (7)

| Slug | Recommendation |
|---|---|
| `practice` | **KEEP** â†’ Remediate |
| `exam-practice` | **MERGE** â€” past papers become an evidence source in Capture; the other five tabs die |
| `exam-sim` | **MERGE** â†’ Remediate |
| `recall-studio` | **MERGE** â†’ Remediate |
| `flashcards` | **MERGE** â†’ Remediate (duplicate of above) |
| `forgetting-forecast` | **MERGE** â†’ Recommendations (same Ebbinghaus engine as `exam-planner`) |
| `exam-day` | **MERGE** â†’ Home. A mode, never a destination |

### DISTRACTION â€” off-thesis (24)

**WRITE (9) â€” content generation, not diagnosis.** `writing-tools` Â· `research-suite` Â·
`presentation` Â· `debate` Â· `citation` Â· `lab-report` Â· `model-answer` Â·
`reference-builder` Â· `report-tools` â†’ **DELETE**

**LEARN (2) â€” teaching, banned by principle.** `learn-lab` Â· `language-lab` â†’ **DELETE**

**PLAN (2) â€” productivity theatre.** `study-command` Â· `focus-lab` â†’ **DELETE**

**GENERIC AI (7).** `compare` Â· `source` Â· `case-study` Â· `timeline` Â· `study-guide` Â·
`analysis-hub` Â· `memory-toolkit` â†’ **DELETE**

**CRISIS (2).** `exam-triage` Â· `panic-triage` â†’ **MERGE** into one Exam-Day mode

**SOCIAL (1).** `rooms` â†’ **DELETE**

**SETTINGS (1).** `personalise` â†’ **MERGE** â†’ Settings

### OBSOLETE / DIFFERENT PRODUCT (4)

`admissions` (1,203 lines) Â· `resume` Â· `interview` Â· `gpa-sim` â†’ **ARCHIVE**

Different user, different timeline, different company. Genuinely good work. Wrong product.
Archived, not deleted â€” if StudyLedger ever earns the right to follow students past
eighteen, this is where it starts.

---

# PART 2 â€” PAGE JUSTIFICATION

The test: *if this vanished tomorrow, would the core product be **worse**, or merely **smaller**?*

| Page | Who would miss it | Worse, or smaller? |
|---|---|---|
| `/dashboard` | Every user, daily | **Worse** â€” but only its Score and next-action. The other 1,400 lines are smaller. |
| `post-exam` | Anyone who took a test | **Worse.** The only route that answers the thesis question. |
| `grade-tracker` | Anyone with history | **Worse.** Deleting it deletes the moat. |
| `syllabus` | New users | **Worse.** Without it a mistake has no address. |
| `exam-planner` | Revising students | **Worse.** The only prescription surface. |
| `/parent/[code]` | Parents â€” **the payer** | **Worse.** No payer, no company. |
| `learn-lab` | Doubt-solvers | **Smaller.** ChatGPT does this better, free. |
| `writing-tools` + 8 siblings | Essay writers | **Smaller.** Commodity generation. Zero relation to fixing anything. |
| `study-command`, `focus-lab` | Planners | **Smaller.** Planning is not fixing. Pomodoro timers are free. |
| `admissions` | Class 12 applicants | **Smaller** â€” for *this* product. A different company's core. |
| `rooms` | Nobody, measurably | **Smaller.** |
| 7 generic AI tools | Nobody specific | **Smaller.** They exist because they were easy. |

**Twenty-four routes make the product smaller, not worse.** That is the delete list.

---

# PART 3 â€” TOOL CLASSIFICATION

| Class | Count | Tools |
|---|---|---|
| **CORE** | 11 | post-exam Â· paper-autopsy Â· marks-forensics Â· marks-obituary Â· paper-trauma Â· paper-pattern Â· syllabus Â· grade-tracker Â· calibration Â· silent-topics Â· exam-planner |
| **IMPORTANT** | 7 | practice Â· exam-practice Â· exam-sim Â· recall-studio Â· flashcards Â· forgetting-forecast Â· exam-day |
| **OPTIONAL** | 2 | exam-triage Â· panic-triage (one survives, as a mode) |
| **DISTRACTION** | 22 | all WRITE Â· all LEARN Â· all PLAN Â· 7 generic Â· rooms Â· personalise |
| **OBSOLETE** | 4 | admissions Â· resume Â· interview Â· gpa-sim |

**11 CORE tools collapse to 4 product areas. 46 routes become 0** â€” every survivor
becomes a section of a surface, never a destination.

---

# PART 4 â€” MERGING

| Destination | Absorbs | Why |
|---|---|---|
| **Home** | `/dashboard`, `/console`, `exam-day`, `panic-triage`, `exam-triage` | One question, one answer, one action. Exam-day is a *state* of Home, not a place. |
| **Capture** | `syllabus`, `exam-practice` (papers only), `/console/work` | Every route that turns real work into structured evidence. **The one screen that must be built.** |
| **Diagnosis** | `post-exam`, `paper-autopsy`, `marks-forensics`, `marks-obituary`, `paper-trauma`, `paper-pattern`, `calibration` | Six metaphors for one answer. Merging them *is* the product. |
| **Record** | `grade-tracker`, `/console/analytics`, `/dashboard/saved` | The longitudinal asset. One place, forever. |
| **Recommendations** | `exam-planner`, `forgetting-forecast`, `silent-topics` | Two Ebbinghaus engines and an avoidance detector answering one question: what next. |
| **Remediate** | `practice`, `exam-sim`, `recall-studio`, `flashcards`, `/console/practice` | Closing the gap. Four routes doing active recall. |
| **Parents** | `/parent/[code]` | The payer. Stands alone. |
| **Settings** | `/dashboard/profile`, `personalise` | Two profile editors. |
| **Account** | `/pricing`, `/limit` | A quota wall is an upgrade prompt, not an error page. |

---

# PART 5 â€” THE DELETE LIST

Permanent. These never reach production in any form.

| Deleted | Count | Reason |
|---|---|---|
| All 9 WRITE tools | 9 | Content generation. Commodity, zero margin, no relation to the thesis. |
| `learn-lab`, `language-lab` | 2 | **Teaching.** We do not teach â€” the one principle that keeps us out of OpenAI's business. |
| `study-command`, `focus-lab` | 2 | Productivity theatre. Planning feels like progress and isn't. |
| 7 generic AI tools | 7 | Built because they were easy. Nobody's reason for returning. |
| `rooms` | 1 | Social accountability. Different product entirely. |
| `/dashboard/saved` | 1 | Saves output from tools that no longer exist. |
| `/console/ai` | 1 | A chat surface. Violates *we do not teach*. |
| **The morbid metaphor family** | â€” | Obituary Â· autopsy Â· coroner Â· trauma Â· cremator Â· forensics. **Banned permanently.** Shame as branding. |
| **Streaks** | â€” | Never ship. One missed day converts a motivator into shame. |
| **Gamification of any kind** | â€” | Badges, XP, confetti, leaderboards. Already banned by `CONSOLE.md`. |
| **The 46-item tool list** | â€” | The interface pattern itself is deleted. No surface ever lists tools again. |

**Archived, not deleted (4):** `admissions`, `resume`, `interview`, `gpa-sim`.
Moved to `archive/`, removed from the registry and all navigation.

**Total: 23 deleted, 4 archived, 19 merged into 8 surfaces.**

---

# PART 6 â€” THE FINAL PRODUCT MAP

```
StudyLedger
â”‚
â”œâ”€â”€ /                       Marketing. One sentence, one proof, one button.
â”œâ”€â”€ /auth                   Sign in.
â”œâ”€â”€ /onboard                One question. Then straight to Home.
â”‚
â”œâ”€â”€ /home                   â† THE PRODUCT
â”‚                           "What should I fix next?"
â”‚                           Score Â· the one action Â· exam countdown
â”‚                           Becomes Exam-Day mode when a paper is tomorrow
â”‚
â”œâ”€â”€ /capture                â† THE MISSING SCREEN
â”‚                           Photograph a marked paper.
â”‚                           Also: syllabus, past papers, manual entry.
â”‚
â”œâ”€â”€ /diagnosis              â† THE MERGE THAT IS THE COMPANY
â”‚                           What you lost, why, and what recurs.
â”‚                           Six tools become one answer.
â”‚
â”œâ”€â”€ /record                 The longitudinal asset.
â”‚                           Every mistake, every paper, every trend.
â”‚
â”œâ”€â”€ /next                   Ranked gaps. Spaced schedule. Avoided topics.
â”‚
â”œâ”€â”€ /practise               Close the gap. Recall, mock, drill.
â”‚
â”œâ”€â”€ /parents                The payer. Weekly, honest, forward-facing.
â”‚                           "What your child is fixing" â€” never "what they got wrong."
â”‚
â”œâ”€â”€ /settings               Profile, subjects, board, plan, parent access.
â”‚
â”œâ”€â”€ /legal                  One route, four sections.
â””â”€â”€ /admin                  Internal. Exempt.
```

**Twelve routes. Down from sixty-eight.**

No tool list. No categories. No `/tools/*` namespace. Every capability is a **verb the
product performs**, reached from the surface that needs it.

---

# PART 7 â€” THE MVP Â· 8 WEEKS

The smallest believable StudyLedger. **Nine routes ship. Nothing else.**

| # | Route | Why it cannot be cut |
|---|---|---|
| 1 | `/auth` | No product without a user |
| 2 | `/onboard` | One question â€” board and subjects. Nothing else. |
| 3 | `/home` | The thesis, rendered. Score + one action. |
| 4 | **`/capture`** | **Photograph a marked paper. If this doesn't ship, nothing else matters.** |
| 5 | `/diagnosis` | The answer. The merge of six. |
| 6 | `/record` | Proof the ledger accumulates |
| 7 | `/parents` | The payer. Week one, not later. |
| 8 | `/settings` | Table stakes |
| 9 | `/legal` | Legally required |

**Deliberately NOT in the MVP:** `/next` Â· `/practise` Â· `/` marketing Â· pricing.

Prescription and remediation wait until diagnosis is proven. Marketing waits until
there is something to market. **Nine routes, and one of them has never been built.**

---

# PART 8 â€” PHASES

Deleted pages do not appear. They are gone.

### Phase 1 â€” The loop exists *(weeks 1â€“8, = MVP)*
`/auth` Â· `/onboard` Â· `/home` Â· **`/capture`** Â· `/diagnosis` Â· `/record` Â· `/parents` Â· `/settings` Â· `/legal`

**Gate:** a student photographs a paper and receives a mistake list. End to end. Once.

### Phase 2 â€” The loop closes *(weeks 9â€“16)*
`/next` Â· `/practise`

**Gate:** a student acts on a recommendation and the gap measurably closes in the record.

### Phase 3 â€” The loop sells *(weeks 17â€“24)*
`/` marketing Â· pricing (Razorpay, parent-billed) Â· `/admin`

**Gate:** ten parents paying.

### Phase 4 â€” The loop scales *(month 7+)*
Automated capture at volume Â· cross-student error graph Â· institutional accounts
Â· archived FUTURE tools reconsidered

**Gate:** the error taxonomy generalises â€” student N's diagnosis is better because of students 1â€¦Nâˆ’1.

---

# PART 9 â€” IMPLEMENTATION ORDER

Build order, not migration order. Each unlocks the next. **No cosmetic work until
structural work is done.**

| # | Task | Unlocks |
|---|---|---|
| 1 | **Delete 23 routes, archive 4** | Everything. The repo stops being 68 products. Frees the whole surface before a line is written. |
| 2 | **Define the mistake schema** â€” the shape of one recorded error | Capture, diagnosis, record, recommendations. **Every surface reads or writes it.** Get it wrong and all four are wrong. |
| 3 | **`/capture` â€” photo in, structured mistake out** | The entire loop. Nothing downstream exists without evidence. |
| 4 | **`/diagnosis` â€” merge six tools into one answer** | The thesis becomes visible. First moment the product is real. |
| 5 | **`/record`** | Proof of accumulation. The moat becomes observable. |
| 6 | **`/home`** â€” Score + one action | The daily surface. Built late deliberately: it can only rank gaps once gaps exist. |
| 7 | `/onboard`, `/auth`, `/settings` | Table stakes. Cheap once the model is fixed. |
| 8 | `/parents` | Monetisation. Needs a record worth reporting. |
| 9 | `/next`, `/practise` | Phase 2. |
| 10 | Console visual migration | **Last.** Cosmetic until the structure is right. |

**Note the sequencing discipline:** the design system â€” the most refined artifact in the
repo â€” is task 10 of 10. It is finished, correct, and it cannot make a wrong product
right. It waits.

---

# PART 10 â€” FINAL DECISION

### TABLE 1 â€” KEEP

| Route | Becomes | Why |
|---|---|---|
| `/auth`, `/auth/callback` | `/auth` | Gate |
| `/onboard` | `/onboard` | One question |
| `/dashboard` + `/console` | `/home` | The thesis surface |
| `syllabus` + `exam-practice` papers | **`/capture`** | The missing screen |
| `post-exam` | **`/diagnosis`** | **The product** |
| `grade-tracker` + `/console/analytics` | `/record` | The moat |
| `exam-planner` | `/next` | Prescription |
| `practice` | `/practise` | Remediation |
| `/parent/[code]` | `/parents` | The payer |
| `/pricing` | `/settings` â†’ billing | Commerce |
| `/legal/*` | `/legal` | Required |
| `/admin` | `/admin` | Internal, exempt |

### TABLE 2 â€” DELETE

| Deleted | Count |
|---|---|
| WRITE tools â€” writing-tools, research-suite, presentation, debate, citation, lab-report, model-answer, reference-builder, report-tools | 9 |
| Generic AI â€” compare, source, case-study, timeline, study-guide, analysis-hub, memory-toolkit | 7 |
| Teaching â€” learn-lab, language-lab | 2 |
| Planning â€” study-command, focus-lab | 2 |
| Social â€” rooms | 1 |
| Orphans â€” `/dashboard/saved`, `/console/ai` | 2 |
| **Archived** â€” admissions, resume, interview, gpa-sim | 4 |
| **Concepts** â€” morbid metaphors Â· streaks Â· gamification Â· the tool list itself | â€” |

### TABLE 3 â€” MERGE

| Into | From |
|---|---|
| `/home` | dashboard, console, exam-day, exam-triage, panic-triage |
| `/capture` | syllabus, exam-practice (papers), /console/work |
| `/diagnosis` | post-exam, paper-autopsy, marks-forensics, marks-obituary, paper-trauma, paper-pattern, calibration |
| `/record` | grade-tracker, /console/analytics |
| `/next` | exam-planner, forgetting-forecast, silent-topics |
| `/practise` | practice, exam-sim, recall-studio, flashcards, /console/practice |
| `/settings` | /dashboard/profile, personalise |
| `/legal` | terms, privacy, data, ip |

---

## 68 â†’ 12 â†’ 9 shipping

---

> ## "If StudyLedger launched tomorrow, this is the product I would be proud to ship: nine routes, one question, and the only screen that matters is the one where a student photographs the paper they were afraid to look at."

