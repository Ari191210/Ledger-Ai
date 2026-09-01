# StudyLedger — Open Product Decisions

Source: `STUDYLEDGER_SYSTEM_ARCHITECTURE.md`, cross-checked against the repo's
own governing documents (`PRODUCT_PRINCIPLES.md`, `PRODUCT_DECISIONS.md`) per
the precedence rule in `CLAUDE.md` (PRINCIPLES > DECISIONS > PLANS). This memo
makes no new architectural decisions — it isolates four calls the architecture
spec could not make on its own and presents them for a ruling.

---

## Decision 1 — External Study

### Current Repository Position
**No governing statement exists.** Neither `PRODUCT_PRINCIPLES.md` nor
`PRODUCT_DECISIONS.md` mentions studying outside the product, self-declared
activity, or claim-vs-evidence status for anything the system didn't observe
directly. The architecture spec flags this explicitly as a gap (its own
citation table: *"§10–13 external study — No governing statement exists.
GAP."*). What the repo *does* rule on is adjacent and in tension: §3.1 bans
self-reported mastery ("a student can say *I've seen it* and *I'm working on
it.* They cannot say *I've fixed it.*") and §3.2 says *"an unevidenced mistake
is a claim, and the product does not store claims."* Those rules govern
whether a claim can close a gap — they don't say whether a claim can open one.

### Our Product Conversation
The Constitution we drafted together explicitly wants external study
supported: a student who learns from NCERT, a teacher, coaching, or YouTube
can tell StudyLedger what they studied, and the system records it as
*student-declared evidence* until an assessment verifies it.

### Conflict / Gap
Not a direct contradiction — the repo is silent, not opposed. But §3.1's logic
("self-report can't close a gap") extends naturally to "self-report shouldn't
open academic credit either" without verification. The architecture spec
resolved this by defining `EXTERNAL_STUDY_DECLARED` as a *claim-class* event
that is explicitly never treated as verified evidence (`E`) on its own —
concepts entered this way enter the session as unconfirmed and must still go
through assessment before they affect the record.

### Options
- **Support it, as a claim-only input** (architecture spec's current design). A
  declared concept can enter a session and get tested; it never scores
  anything by itself.
- **Don't support it at all.** Only observed in-product activity counts as
  academic activity. Simpler, but contradicts a core promise of our
  Constitution and the "study anywhere" vision.

### Consequences
Supporting it (claim-only) requires: a capture UI for casual/NL declaration
(Part D), assessment coverage guarantees for declared concepts (Part F — every
confirmed concept must appear in the assessment), and careful wording so a
declared-but-untested concept is visibly distinct from a verified one anywhere
it's shown to the student or a parent. It does **not** put any pressure on
Ledger Score integrity, because the design already treats declaration as
non-scoring until verified — this is the one decision where the architecture's
own answer is close to a clean solution rather than a hard tradeoff.

### Recommendation
Ratify the architecture's design: support external study, but only as an
unverified claim that must pass through assessment before it touches the
record or the score. This satisfies our product vision without weakening
§3.1/§3.2, because nothing about it lets a claim substitute for evidence.

### Decision
**DECISION: RATIFIED — YES** *(2026-08-10)*

External study is first-class academic activity: a student may declare what they
studied anywhere — NCERT, textbooks, school, teachers, coaching, YouTube, other
sites, handwritten notes — and StudyLedger captures it as **student-declared
evidence → assessment → verified academic evidence**, never as proven learning on
declaration alone. StudyLedger owns the academic memory, not the student's
physical learning environment, and must never become a closed ecosystem where
learning only counts if it happened inside the product.
*Recorded as `PRODUCT_PRINCIPLES` §3.5 (new) and `PRODUCT_DECISIONS` §9.1.*

---

## Decision 2 — Parent Sharing of Mistakes

This is the sharpest actual conflict in the whole set — our conversation and
the repo's ratified law disagree, not just diverge.

### Current Repository Position
`PRODUCT_PRINCIPLES.md §3.4`, verbatim:

> **"Parents see what their child is *fixing*, never what their child *got
> wrong*."** No raw failures, no marks lost, no unaddressed gaps, no answer
> detail. This is the difference between a support tool and a
> shame-delivery mechanism, and it is enforced at the data layer, not in
> copy — the interface must be *unable* to expose it.

This is stated as structural and non-negotiable, not as a default the student
can override. Under `CLAUDE.md`'s precedence rule, this is a **principle**,
and a principle can only be superseded by an explicit, dated amendment to
`PRODUCT_PRINCIPLES.md` — never silently, never inside an architecture doc or
a plan.

Two live violations of this exact rule were found in the current codebase:
`/api/parent/[code]` returns `weakTopics` to an **unauthenticated** code
holder, and `lib/parent-digest.ts:118–122` builds a "topics needing work"
miss-count table that is sent to parents.

### Our Product Conversation
Our Constitution said the student decides what parents see, with a
Private/Shared/System model — implying mistakes and weaknesses *could* be
shared if the student chooses to.

### Conflict / Gap
Direct. §3.4 makes "what they got wrong" categorically unshareable at the
data layer; our Constitution made it student-togglable. The architecture spec
sided with the ratified principle over our conversation, and said so
explicitly rather than quietly picking one.

### Options

**Option A — Student-controlled granular sharing** (our Constitution's model)
- *Product philosophy:* sovereignty is total; the student is trusted to
  decide even sensitive disclosures.
- *Privacy:* weakest of the three — a parent-pressured student could be
  coerced into turning sharing on.
- *Sovereignty:* maximal.
- *Parent usefulness:* highest — parents who want to help with a specific
  weak topic can.
- *Implementation:* requires a real per-field consent UI and a way to prove
  consent was freely given, not coerced — this is hard to build well.
- *Conflict:* directly contradicts §3.4 as written. Would require a dated
  amendment to `PRODUCT_PRINCIPLES.md` before it could ship.

**Option B — Structural privacy** (the repo's ratified rule; what the
architecture spec implemented)
- *Product philosophy:* some information is unsafe to make shareable at all,
  regardless of who consents, because the power asymmetry between a parent
  and a child undermines "consent" as a meaningful concept here.
- *Privacy:* strongest — cannot be misused even under pressure.
- *Sovereignty:* the student loses one specific lever (mistake-level
  sharing) but keeps everything else (§4 sovereignty is otherwise intact).
- *Parent usefulness:* lower — parents see trajectory and consistency, not
  what to help with specifically.
- *Implementation:* matches what's already ratified; requires only deleting
  the two live violations, no new consent machinery.
- *Conflict:* none — this **is** current law.

**Option C — Hybrid** (aggregate trend, no individual detail)
- *Product philosophy:* a middle path — parents get enough signal to notice a
  pattern without seeing any single failure.
- *Privacy:* meaningfully weaker than B — "Physics has been a weak subject
  for six weeks" is still "what they got wrong," just averaged.
- *Sovereignty:* student can't fully open the channel even if they want to,
  same as B.
- *Parent usefulness:* between A and B.
- *Implementation:* the ambiguous middle ground is exactly what §3.4 was
  written to make impossible — "unaddressed gaps" is explicitly named as
  banned content, and a subject-level weak-trend is an unaddressed gap by
  another name.
- *Conflict:* likely still a §3.4 breach on a strict reading; would need the
  same amendment path as Option A, just for a narrower carve-out.

### Recommendation
Keep Option B, matching the architecture spec and current law. Options A and C
both require *first* amending `PRODUCT_PRINCIPLES.md §3.4` — dated, explicit,
with a stated reason — per `CLAUDE.md`'s own precedence rule; neither can be
implemented as a side effect of the architecture work. If the product owner
wants A or C, that amendment should happen first and separately, with the
tradeoffs above on the table, not be decided implicitly by shipping code.
Independent of whichever option is chosen: the two live §3.4 violations
(`weakTopics` in the parent API, the miss-count table in `parent-digest.ts`)
should be removed regardless, since they violate even the *current* ratified
rule.

### Decision
**DECISION: RATIFIED — YES (Option B)** *(2026-08-10)*

Parent access to individual mistakes is **structurally private**, not a sharing
toggle. Parents may see progress, trajectory, continuity, subjects, verified
learning, high-level areas needing attention and reports; they may never receive
individual wrong answers, individual mistake occurrences, detailed mistake
history, question-by-question failures or shame-oriented mistake counts —
*"parents can understand how the student is doing without being given a forensic
record of how the student failed."* Options A and C are **rejected**; the
amendment to §3.4 they would require was considered and **refused**, and where a
broader "student controls everything" framing conflicts, the stronger privacy
principle wins. This is principle-level, not an implementation preference. The
two live violations are removed regardless.
*`PRODUCT_PRINCIPLES` §3.4 stands unamended (reaffirmed in §12);
`PRODUCT_DECISIONS` §9.2.*

---

## Decision 3 — Streaks / Continuity

### Current Repository Position
`PRODUCT_PRINCIPLES.md §4.2`, verbatim: **"Streaks are never shipped. One
missed day converts a motivator into shame."** This sits under a section
titled "NEVER SHAME," alongside a ban on inactivity call-outs and red counters.
This is unambiguous, ratified law.

### What Streaks Currently Do
Despite the ban, the live product ships one. `lib/ledger-score.ts` computes a
"Consistency / Momentum" score dimension as `min(150, streak × 7.5)` — **150
of 1000 points, 15% of the total score**, driven directly by a day-streak
counter. That same streak state feeds push-notification logic and appears in
parent-facing email presentation. This is a case where the *implementation*
already contradicts the *ratified principle* — not a gap, an active breach
that predates this architecture work.

### Why the Principle Rejects Streaks
The stated reasoning is specifically about the emotional failure mode: a
streak is a motivator only until the first missed day, at which point the
same mechanic becomes a shame signal — which the product's "NEVER SHAME"
section (§4, opening line: *"A student opens this at 11pm before an exam,
frightened. Every screen must survive that context"*) treats as a hard
constraint on all UI, not just streak UI.

### The Architecture's Proposed Replacement
The spec deletes the Momentum dimension and replaces it with **Continuity**:
still worth 150 points, but measuring the *ratio of verified-to-studied
concepts over a trailing window* rather than consecutive-day attendance. A
student who studies twice in a week and verifies both sessions gets full
Continuity; a student with a broken streak loses nothing for the gap itself —
only an actual drop in the verified:studied ratio moves the number.

### Does Continuity Avoid Becoming Gamification by Another Name?
Mostly yes, with one honest caveat the architecture spec itself flags:
because the denominator is "concepts studied," *capturing more academic
activity can temporarily lower Continuity* if verification doesn't keep pace
— e.g., declaring five external-study concepts in one session before getting
around to testing them. This is a real tension against §3.3 ("capture must
never lower a score") and needs to be watched at implementation time, but
structurally it is not a streak: there is no consecutive-day mechanic, no
counter that resets to zero, and no single missed day that converts a
positive signal into a negative one.

### Implications
- **Ledger Score:** every currently-shipped score includes a streak-driven
  Momentum term; replacing it changes score values for existing users
  (addressed generally by Decision 4's "some scores will move" note).
- **Notifications:** streak-based nudges ("don't break your streak") must be
  removed as part of this change, not left running against a metric that no
  longer exists in the score.
- **Parent reporting:** the streak banner in parent email presentation is
  itself likely a separate, smaller §4.2 violation and should be removed on
  the same pass.
- **Migration:** this is a pure code change (delete one dimension, add
  another using data already being captured for other purposes) — no new
  infrastructure is required beyond what Decision 4's architecture already
  needs.

### Recommendation
Ratify the architecture's choice: delete Momentum, ship Continuity. This
brings the live product back into compliance with an already-ratified
principle (§4.2) rather than introducing a new one, and the "capture can
briefly lower Continuity" edge case is a known, small, monitorable risk
rather than a structural gamification problem.

### Decision
**DECISION: RATIFIED — YES** *(2026-08-10)*

Streaks are not a core academic scoring mechanic: the dependency *"you studied X
consecutive days, therefore your academic state is better"* is removed. The
useful concept is retained as **Continuity** — sustained, verified academic
engagement over a reasonable rolling window, from verified sessions, demonstrated
learning, assessment participation and academic activity. Continuity must never
become a daily punishment, a streak counter, a score cliff, a guilt mechanism or
a *"you broke your streak"* notification; a student must be able to miss a day
without feeling they destroyed their progress. Target concept: *"Your learning
has been consistent,"* not *"You haven't broken your chain."* **The existing
streak implementation is classified REBUILD / REMOVE FROM SCORING by subsystem —
renaming the streak variable is explicitly not an implementation of this
decision.** Streak notifications and the parent-email streak banner go in the
same pass.
*`PRODUCT_PRINCIPLES` §4.2 stands unamended; `PRODUCT_DECISIONS` §9.3.*

---

## Decision 4 — Mistake Pillar

### Current v1/v2 Situation
The live scoring engine (`lib/ledger-score.ts`, "v1") counts a mistake toward
the score only if its status is one of `resolved` / `acknowledged` /
`practising` / `recurred`, and only if it has a non-empty `evidenceId`. The
only code path that writes a mistake status (`exam-practice`) writes `open` or
`cleared` — neither of which v1 recognizes. The shadow engine `lib/
ledger-score-v2.ts`, which is computed nightly but never shown to any user,
actually *does* use the `open`/`cleared` vocabulary correctly. So the earlier
diagnosis had the direction backwards: **v2 has the correct enum, v1 (the one
everyone sees) does not.** Separately and independently, **no code path
anywhere writes `evidenceId`** — so even a status-enum fix alone would still
leave `evidenceCount` permanently zero.

### Why the Obvious Enum Fix Is Insufficient
The tempting one-line patch — make v1 recognize `cleared` the way v2 does —
would make the mistake pillar scoreable again, but by the *wrong* action. The
current `cleared` state is set by a student dismissing a mistake in the UI,
with no independent verification that the underlying concept was actually
retested and understood. Wiring that directly into 20% of the score would let
a student single-handedly move their own Ledger Score by dismissing entries —
which is exactly the failure mode §3.1 exists to prevent ("self-reported
mastery is the fluency illusion... letting a student close their own gaps
would make the record a record of their confidence rather than their
competence"). Presentation-layer dismissal becoming score-layer evidence is a
direct route around that principle, just one enum value away.

### Why `evidenceId` Matters
`evidenceId` is meant to be the pointer from a mistake record to the actual
proof it was addressed (a retest attempt, a verified assessment result). With
no writer for it anywhere, there is currently no mechanism, even in principle,
by which a "resolved" mistake could be distinguished from a "the student said
so" mistake. Fixing the enum without also fixing evidence-linking doesn't
close the gap — it just moves the self-certification problem from the status
field to a field that's silently ignored.

### What the New Architecture Changes
The target design (Parts E–G of `STUDYLEDGER_SYSTEM_ARCHITECTURE.md`) makes
mistake resolution depend on an actual `MISTAKE_RETESTED` / `MISTAKE_RESOLVED`
event chain produced by the Assessment Engine — i.e., evidence is generated by
the same verified-testing pipeline that produces the rest of the record,
rather than being a field nothing populates. That closes both defects at once
as a side effect of building the session/assessment/event layer the rest of
the Constitution already requires — it isn't a separate mistake-pillar
project.

### Should Any Safe Short-Term Mitigation Ship Before the Full Architecture Exists?
Two options, not mutually exclusive:
1. **Do nothing to the formula; only fix the presentation-layer honesty
   issues** already identified elsewhere in the audit (the console's
   unpayable "+20 points" projection, the "Clear all" deletion button, the
   fabricated fallback score in `grade-tracker`). This leaves the mistake
   pillar at a known, disclosed 0 rather than a falsely-recoverable one.
2. **Do not patch the enum as a stopgap.** Per the reasoning above, that
   specific "quick fix" is worse than the current bug, because it would make
   the score self-awardable rather than merely broken.

### Impact on September 8
A visibly-zero, disclosed pillar (mitigation 1) is honest and shippable now.
The fully correct pillar requires the event/session/assessment layer, which is
a substantial build, not a September 8-scale patch. The product owner should
decide launch messaging on this basis: either ship September 8 with an
explicit "mistake recovery scoring is not yet live" state, or treat full
Mistake DNA scoring as a defined post-launch milestone rather than quietly
shipping the enum patch to make the number move.

### Recommendation
Do not apply the enum patch. Ship the disclosed-zero state (or an honest
"not yet scored" label) for launch, and treat the real fix as dependent on
the event/assessment architecture rather than a pre-launch hotfix.

### Decision
**DECISION: RATIFIED — YES** *(2026-08-10)*

**No enum patch.** The defect is an evidence architecture problem, so the mistake
pillar is **REBUILT** on the target flow: Academic Event → Study Session →
Assessment → Assessment Evidence → Mistake Occurrence → Mistake DNA → Correction
→ Retest → Verified Resolution → Ledger Score Evidence. *A mistake is not
"resolved" because the student says it is resolved — resolution requires
evidence*, and *a student cannot earn mistake-related score simply by declaring
or manipulating a mistake state.* The student must never be able to manufacture
score evidence by editing presentation-layer mistake state. `lib/mistakes/*` is
evaluated for reusable domain logic, but its current persistence and evidence
assumptions are **not** the target architecture. Until the pipeline exists, the
pillar ships as a disclosed *"not yet scored"* state, never a falsely-recoverable
one.
*`PRODUCT_DECISIONS` §9.4, implementing `PRODUCT_PRINCIPLES` §3.1–§3.2.*

---

# Final Decision Table

**All four ratified 2026-08-10.** This memo is now a historical record of how the
decisions were reached; the governing statements live in `PRODUCT_PRINCIPLES.md`
and `PRODUCT_DECISIONS.md` §9, and the architecture in
`STUDYLEDGER_SYSTEM_ARCHITECTURE.md`.

| Decision | Recommendation | Product Owner Decision |
|---|---|---|
| External study | Support as claim-only input; never scores until verified by assessment | **RATIFIED — YES.** External learning is first-class: student-declared evidence → assessment → verified academic evidence. Never a closed ecosystem. → `PRINCIPLES` §3.5 (new), `DECISIONS` §9.1 |
| Parent mistake visibility | Option B — structural privacy, matching ratified §3.4; do not amend the principle as a side effect of this architecture work | **RATIFIED — YES (Option B).** Structurally private, not toggleable; A and C rejected and the §3.4 amendment refused. → `PRINCIPLES` §3.4 unamended, `DECISIONS` §9.2 |
| Streaks vs. Continuity | Delete Momentum, ship Continuity (verified:studied ratio); remove streak notifications and parent-email streak banner in the same pass | **RATIFIED — YES.** No streak mechanic in scoring; Continuity = sustained *verified* engagement. **REBUILD / REMOVE FROM SCORING, not a rename.** → `PRINCIPLES` §4.2 unamended, `DECISIONS` §9.3 |
| Mistake pillar strategy | No enum patch; ship a disclosed zero/"not yet scored" state for Sept 8, fix fully via the event/assessment architecture post-launch | **RATIFIED — YES.** No enum patch; **REBUILD** via Event→Session→Assessment→Mistake DNA. Resolution requires evidence; disclosed "not yet scored" until then. → `DECISIONS` §9.4 |
