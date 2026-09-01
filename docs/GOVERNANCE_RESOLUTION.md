# GOVERNANCE RESOLUTION

**Drafted 2026-08-05. Awaiting approval. No document has been changed yet.**

Purpose: guarantee that **exactly one authoritative interpretation of the product
exists at any moment.**

---

## 0. THE CONFLICT IS LARGER THAN REPORTED

You asked me to reconcile two documents. There are **seven live governance files**,
and the most damaging conflict is not between the two you named.

| File | Lines | Status |
|---|---|---|
| `CLAUDE.md` | 189 | **Read first by every agent session. Stale and wrong.** |
| `CONSOLE.md` | 665 | Design law. Sound. |
| `PRODUCT_CONSTITUTION.md` | 405 | Product law. Ratified 2026-08-04. |
| `EXECUTION_PLAN.md` | 567 | Implementation. Revised 2026-08-05. |
| `MIGRATION.md` | 280 | Audit + strategy. **Contains a contradicting rule.** |
| `WORKSPACE.md` | 302 | Identity architecture. Approved, work frozen. |
| `PRODUCT.md` · `DESIGN.md` | 317 | Deprecated, still present. |

### The finding that outranks the one you raised

```
CLAUDE.md:7
"CONSOLE.md is the single source of truth for design, UX, motion, and
 product decisions... PRODUCT_CONSTITUTION.md, PRODUCT.md and DESIGN.md
 are DEPRECATED... Do not follow them."
```

**`CLAUDE.md` instructs every future session to ignore the constitution you
ratified yesterday.** It is the first file read in any new session. Left alone,
the next agent — or the next me, after a context reset — would follow `CONSOLE.md`
for product decisions, never open `PRODUCT_CONSTITUTION.md`, and silently rebuild
the tool list.

It is also stale on design:

```
CLAUDE.md:9
"...8 greys plus one signal (Electric Lime)..."
```

You removed Electric Lime as *"too loud, trendy and attention-seeking."* The
current system has **no brand accent** and uses earned colour. The file that
agents trust most describes a palette you rejected.

**This is why "which of the two wins?" is the wrong question.** Answering it
fixes today's collision and leaves the mechanism that produced it intact.

---

## 1. EVERY DIRECT CONTRADICTION

| # | Claim in `PRODUCT_CONSTITUTION.md` | Claim in `EXECUTION_PLAN.md` | Severity |
|---|---|---|---|
| C1 | §5:212 *"Permanent. These never reach production in any form."* · :231 *"23 deleted"* | A2.3 *"Default is ARCHIVE"* · A2.5 *"LEGACY — 0 tools"* | **Blocking** |
| C2 | :133 *"`learn-lab` · `language-lab` → DELETE"* | A2.5 `learn-lab` = SUPPORTING | **Blocking** |
| C3 | :189 *"46 routes become 0"* · :273 *"Twelve routes"* | A2.4 *"all 46 URLs still resolve"* | **Blocking** |
| C4 | §5 archive 4 FUTURE tools to `archive/` | A2.5 EXPERIMENTAL — stay in place, nav only | High |
| C5 | Table 2 — `/console/ai`, `/dashboard/saved` DELETE | M0-11 unlink; both remain routable | High |
| C6 | §7 *"MVP · 8 weeks"* | Part C *"M0–M2 ≈ 23 weeks at 6h/week"* | High |
| C7 | §8 Phases 1–4 · §9 a 10-task build order | Milestones M0–M10, 58 tasks | High |
| C8 | :384 concepts *"banned permanently"* incl. *"the tool list itself"* | A2.4 registry keeps all tools routable | Medium |
| C9 | §1 route-by-route KEEP/MERGE/DELETE inventory | A2.5 four-class register | Medium |

**And two outside the pair you named:**

| # | Conflict | Severity |
|---|---|---|
| C10 | `CLAUDE.md:7` declares `PRODUCT_CONSTITUTION.md` deprecated — *"Do not follow them"* | **Critical** |
| C11 | `MIGRATION.md:114` *"zero usage in PostHog for 90 days should mean deletion"* — directly contradicts A2.3, which you ruled on yesterday | **Blocking** |

---

## 2. RESOLUTION, CONTRADICTION BY CONTRADICTION

### C1 — Deletion vs archival · **EXECUTION_PLAN wins**

**Why.** This is a decision about *reversibility under uncertainty*, and it was
made later with better information. The constitution's delete list was derived
from thesis-fit inference at a moment when deletion was believed safe. Your
ruling — that usage data is not yet representative and optionality has value —
is a strictly better-informed decision about the same question.

**Downstream.** 23 routes stay on disk and stay routable. Navigation shrinks via
a registry field. Nothing becomes unrecoverable.

### C2 — `learn-lab` · **BOTH win, because they answer different questions**

This is the most instructive contradiction in the list, and it is the key to the
whole model.

The constitution makes a **principle** claim: *we do not teach.* The plan makes a
**disposition** claim: *the code stays, out of navigation.*

**These do not actually conflict.** They appear to only because the constitution
expressed a principle by naming a filesystem action. "We do not teach" is
permanent and belongs in the constitution. "Delete `learn-lab`" is a revisable
decision and never belonged there.

**Downstream.** The principle stands: no tutor ships in V1, no chat surface, no
teaching in the core loop. The code remains. Both are true simultaneously.

### C3 — Route count · **EXECUTION_PLAN wins on filesystem, CONSTITUTION on navigation**

The constitution conflated *what a student sees* with *what exists on disk*.
"Twelve routes" is the right **navigation** target and the wrong **repository**
target.

**Downstream.** The 12-route map (§6) is retained as the navigation goal. The
claim "46 routes become 0" is withdrawn.

### C4, C5 — Archive mechanism, two unlinked routes · **EXECUTION_PLAN wins**

Same reasoning as C1. Both are dispositions, not principles.

**Downstream.** `admissions`, `resume`, `interview`, `gpa-sim`, `/console/ai`,
`/dashboard/saved` remain in place and routable, absent from navigation.

### C6 — Timeline · **EXECUTION_PLAN wins**

The constitution asserted 8 weeks without an estimate behind it. The plan
carries per-task effort. A principles document should carry **no dates at all** —
a timeline in a constitution is a promise that ages into a lie.

**Downstream.** 8-week MVP claim removed. Estimates live in one place.

### C7, C9 — Phases and inventories · **EXECUTION_PLAN wins**

Two sequencing schemes for one product is a guaranteed drift source.

**Downstream.** Constitution §1, §8, §9, §10 are deleted from that document —
the content already exists in the plan, better maintained.

### C8 — Concept bans · **CONSTITUTION wins, with one correction**

*Never ship streaks* and *no gamification* are genuine principles, load-bearing
and permanent. **Keep them.** *"The morbid metaphor family is banned"* is also a
principle (it implements *never shame*). **Keep it.**

But *"the tool list itself"* is a navigation decision, not a principle.

**Downstream.** Streaks, gamification and the morbid metaphors stay permanently
banned. The tool-list ban becomes a plan decision.

### C10 — `CLAUDE.md` · **must be rewritten immediately**

It contains no authority of its own, yet it overrides everything by being read
first. It should hold **pointers only** — no design rules, no palette, no
deprecation claims.

**Downstream.** Every future session resolves authority correctly on first read.

### C11 — `MIGRATION.md:114` · **EXECUTION_PLAN wins**

Directly contradicts the ruling you issued yesterday.

**Downstream.** The line is removed; `MIGRATION.md` is demoted to a dated audit
artifact and stops being governance.

---

## 3. THE GOVERNANCE MODEL

### Why I am not recommending any of the four options as stated

All four ask *which document wins*. That fixes today's collision and leaves the
cause untouched.

**The cause is that `PRODUCT_CONSTITUTION.md` contains three different kinds of
claim at once:**

- **Principles** — *"we do not teach"*, *"never shame"* (permanent)
- **Decisions** — *"`learn-lab` is deleted"* (revisable)
- **Plans** — §7 8-week MVP, §8 phases, §9 build order (high churn)

A document mixing claim types will collide with **any** other document that also
mixes them, forever. Naming a winner once does not prevent the next collision —
and this repository has now produced the same failure three times
(`PRODUCT.md` vs `DESIGN.md` vs `PRODUCT_CONSTITUTION.md`, then the newspaper↔slop
oscillation, now this).

### Recommended: **CLAIM-TYPE SEPARATION**

> **One document per claim type. One claim type per document.
> Authority follows the type of question, not the seniority of the file.**

| Claim type | Question it answers | Sole authority | Change rate |
|---|---|---|---|
| **Design principle** | How must it look and behave? | `CONSOLE.md` | Rare — by amendment |
| **Product principle** | What must always be true? | `PRODUCT_CONSTITUTION.md` | Rare — by amendment |
| **Decision** | What have we chosen, as of now? | `EXECUTION_PLAN.md` Part A2 | Free — dated |
| **Plan** | How, in what order, how long? | `EXECUTION_PLAN.md` Parts B–E | Constant |
| **Pointer** | Where does authority live? | `CLAUDE.md` | Only when the hierarchy changes |
| **Artifact** | What was true on a date? | `MIGRATION.md`, audits | Never — frozen, dated |

### Precedence

```
PRINCIPLES  >  DECISIONS  >  PLANS
```

- A plan may not contradict a decision.
- A decision may not contradict a principle.
- **To contradict a principle you must first amend the principle** — explicitly,
  dated, with the reason, in the principles document. Never silently, never in
  passing, never in a plan.

### How this guarantees exactly one interpretation

For any question, **classify the question, and exactly one document answers it.**

| Question | Type | Authority | Answer |
|---|---|---|---|
| May we build an AI tutor? | Principle | `PRODUCT_CONSTITUTION` | No — we do not teach |
| Does `learn-lab` ship in V1 nav? | Decision | `EXECUTION_PLAN` A2.5 | No — SUPPORTING |
| Is `learn-lab` deleted? | Decision | `EXECUTION_PLAN` A2.3 | No — archival default |
| What colour is a progress bar? | Design principle | `CONSOLE.md` | Earned `--progress` |
| When does Capture ship? | Plan | `EXECUTION_PLAN` M2 | After M1 |

If two documents both appear to answer, **the one whose claim type matches the
question wins, and the other is defective and must be edited.** That is a
mechanical rule, not a judgement call — which is the only kind that survives a
deadline at 2am, a context reset, or a new contributor.

### The rule that keeps it true

**Every governance file carries this header:**

```
AUTHORITY:      <claim type>
ANSWERS:        <the questions it may answer>
MAY NOT CONTAIN: <the claim types it must never contain>
LAST AMENDED:   <date>
```

A document containing a claim outside its type is a **defect**, reported and
fixed like a bug — not debated.

---

## 4. MIGRATION PLAN — DOCUMENTS ONLY

No code. No registry. No routes. No deletions of implementation.
Ordered by risk: the file agents read first is fixed first.

| # | Action | File | Effort | Acceptance |
|---|---|---|---|---|
| **G1** | **Rewrite as a pointer file.** Remove the deprecation claim, the Electric Lime palette, and all design rules. Keep only: the hierarchy, the precedence rule, and links | `CLAUDE.md` | S | A fresh session resolves authority correctly with no other file open |
| **G2** | **Strip to principles.** Delete §1 (inventory), §5 (delete list), §7 (MVP timeline), §8 (phases), §9 (build order), §10 (tables). Keep: thesis, the loop, the laws, the concept bans, §6 as a *navigation* target. ~405 → ~120 lines | `PRODUCT_CONSTITUTION.md` | M | Contains zero dates, zero route lists, zero task orders |
| **G3** | **Record the amendments.** Add a dated `AMENDMENTS` section noting C1–C9 and what changed | `PRODUCT_CONSTITUTION.md` | S | Every overturned claim is recoverable with its reason |
| **G4** | **Add authority headers** to all five live documents | all | S | Each states what it may and may not contain |
| **G5** | **Demote to an artifact.** Add a frozen/dated header; delete the usage-based deletion rule at :114 | `MIGRATION.md` | S | No governance claims remain |
| **G6** | **Mark frozen.** Note that Workspace Engine work is out of scope per the plan's execution rules | `WORKSPACE.md` | S | Cannot be mistaken for active direction |
| **G7** | **Move to `docs/archive/`** with deprecation headers | `PRODUCT.md`, `DESIGN.md` | S | Not at root; still in git |
| **G8** | **Reconcile the plan.** Point A2 at the constitution for principles; remove the duplicated product map | `EXECUTION_PLAN.md` | S | No principle restated in two places |

**Total: ~4 hours. Zero code.**

### Sequencing

G1 first and alone — until it is done, any context reset re-introduces the
conflict. G2–G3 next as one commit; a stripped constitution without its amendment
record loses the reasoning. G4–G8 in any order.

---

## 5. WHAT THIS COSTS

**`PRODUCT_CONSTITUTION.md` loses roughly 70% of its length.** Parts 1, 5, 7, 8,
9 and 10 — the editorial audit, the delete list, the MVP, the phases, the build
order, the three tables — move out or disappear.

That work is not wasted. Most of it already exists in `EXECUTION_PLAN.md` in a
better-maintained form, and the rest is preserved in git history and in the
amendment record.

**The document that remains will be short, permanent, and hard to contradict by
accident.** That is what a constitution is for. The current one reads like a
strategy memo, which is precisely why it collided with a plan within twenty-four
hours of ratification.

---

## 6. DECISION REQUIRED

| # | Decision |
|---|---|
| **R1** | Adopt **claim-type separation** with `PRINCIPLES > DECISIONS > PLANS`? |
| **R2** | Confirm C1, C3–C7, C9, C11 resolve to `EXECUTION_PLAN` |
| **R3** | Confirm C2 and C8 resolve to `PRODUCT_CONSTITUTION` as principles, with the filesystem actions removed |
| **R4** | Approve G1–G8 |
| **R5** | Confirm `CONSOLE.md` remains sole authority on design, unchanged |

On approval I will execute G1 first, alone, and stop for verification before G2.

---

## 7. UNRELATED, URGENT

**The `C:` drive is full — 456 GB used, 0 bytes free.** I cleared 2.2 GB of
regenerable Next.js build cache to write this file; 449 MB remains.

This is outside the repository and will break builds, `npm install`, and git
operations without warning. It needs attention before implementation resumes.
