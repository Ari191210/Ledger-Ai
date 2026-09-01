# GOVERNANCE MAPPING

**Drafted 2026-08-05. Awaiting approval. No document has been modified.**

Destination for **every** governance statement in the repository, under the
four-document constraint. Nothing is dropped without an explicit reason.

**Sources mapped:** `PRODUCT_CONSTITUTION.md` (405) · `CONSOLE.md` (665) ·
`EXECUTION_PLAN.md` (567) · `MIGRATION.md` (280) · `WORKSPACE.md` (302) ·
`CLAUDE.md` (189) · `PRODUCT.md` + `DESIGN.md` (317). **Total 2,725 lines.**

**Legend** — `→P` PRODUCT_PRINCIPLES · `→D` PRODUCT_DECISIONS ·
`→E` EXECUTION_PLAN · `→C` CLAUDE.md · `→A` archived with reference ·
`✕` explicitly deprecated

---

## 0. THE CONSTRAINT COLLIDES WITH `CONSOLE.md`

You specified four documents. **There are five authorities, and the fifth is the
one you told me to leave alone.**

`CONSOLE.md` is not a design document. Its **§1 is literally titled "Product
Constitution"**, and it contains all four of your claim types at once:

| `CONSOLE.md` section | Claim type | Belongs in |
|---|---|---|
| §1.1–1.7 — what StudyLedger is, the one question, prime directive, nine laws, bans, decision test | **Product principle** | `PRODUCT_PRINCIPLES` |
| §2–4, §6–7 — material, colour, typography, motion, components, emotional arc | **Design principle** | `PRODUCT_PRINCIPLES` |
| §5.1 three surfaces · §8 screen hierarchy · §12 what stays unchanged | **Decision** | `PRODUCT_DECISIONS` |
| §10 what to delete · §11 what to rebuild · **§13 Roadmap, Phases 0–5** | **Plan** | `EXECUTION_PLAN` |
| §14 amendment log | **Mechanism** | `PRODUCT_PRINCIPLES` |

It cannot remain intact and satisfy your constraint. **Recommendation: split it
across the four documents** (mapped in §3 below). Its concrete token values —
hex, `4px`, `999px`, durations — are specification, not governance, and move to
`console.css`, which already holds them.

### The count that makes this non-optional

**The repository contains five separate roadmaps.**

| Roadmap | Location | Shape |
|---|---|---|
| 1 | `PRODUCT_CONSTITUTION` Part 8 | Phases 1–4, weeks 1–24 |
| 2 | `PRODUCT_CONSTITUTION` Part 9 | 10-task implementation order |
| 3 | **`CONSOLE.md` §13** | Phases 0–5, ~10 weeks |
| 4 | `MIGRATION.md` §3 | P0–P3, ~168h |
| 5 | `EXECUTION_PLAN` Part B | M0–M10, 58 tasks, ~505h |

Five sequencing schemes for one product, three of which nobody is following.

---

## 1. CONTRADICTIONS FOUND SINCE THE RESOLUTION DOC

C1–C11 were reported previously. Reading `CONSOLE.md` in full adds five more.

| # | Conflict | Resolution |
|---|---|---|
| **C12** | **The product's one question is stated two different ways.** `PRODUCT_CONSTITUTION:18` — *"What should I fix next?"* · `CONSOLE.md:36` — *"What do I do right now?"* | **Thesis wins.** The Home surface question becomes *"What should I fix next?"* Two phrasings of the founding question is how a product loses its own thesis. |
| **C13** | **Three-way IA conflict.** `CONSOLE.md:410` *"Three surfaces. That's the entire app."* · `PRODUCT_CONSTITUTION:273` *"Twelve routes."* · `EXECUTION_PLAN` A2.4 *"all 46 URLs still resolve"* | **All three survive, at labelled altitudes:** 3 surfaces = the mental model · 12 routes = the URL map · 46 routes = what resolves on disk. They only conflicted because none of them said which altitude it meant. |
| **C14** | Onboarding length. `CONSOLE.md:547` *"three questions maximum"* · `PRODUCT_CONSTITUTION:242` *"One question"* · `WORKSPACE.md:145` *"exactly one question (MATERIAL)"* | **Not a real conflict** — 3 is a ceiling, 1 satisfies it. Recorded as: board + subjects, one screen. `WORKSPACE`'s MATERIAL question is frozen with that document. |
| **C15** | Billing provider. `CONSOLE.md:592` *"The Stripe/billing path"* · `PRODUCT_CONSTITUTION:318` + `EXECUTION_PLAN` M8-3 — **Razorpay** | **Razorpay wins.** Later, India-specific, parent-billed. `CONSOLE.md` is stale. |
| **C16** | `CONSOLE.md:659` amendment log — *"Signal fixed as Electric Lime"* · founder removed Electric Lime as *"too loud, trendy, attention-seeking"*; current system has no brand accent | **Removal wins.** Requires a dated amendment entry — the log currently records a decision that was reversed and never recorded. |

---

## 2. `PRODUCT_CONSTITUTION.md` → destinations (405 lines)

| Lines | Statement | To | Note |
|---|---|---|---|
| 3 | Ratified 2026-08-04; supersedes roadmap discussions | `→P` | Becomes the amendment-log origin entry |
| 5–12 | *"Two governing documents exist and no others"* | `✕` | Superseded by the four-document rule |
| 10–12 | `PRODUCT.md`/`DESIGN.md` scheduled for deletion | `✕` | Replaced by archival (A2.3) |
| **16–26** | **THE THESIS + the five-step loop** | **`→P`** | The founding principle. Verbatim. |
| 28–29 | *"A page not on the loop does not exist"* | `→P` ⚠ | **Reworded** — A2.4 keeps the code. Becomes *"does not appear in navigation."* |
| 33–48 | Six routes, six metaphors, one product | `→D` + `→A` | Merge decision → D; audit narrative → A |
| 50–58 | Morbid metaphor family banned permanently | **`→P`** | Implements *never shame*. Permanent. |
| 59–66 | *"There is no capture surface"* | `→D` + `→A` | Scope decision → D; narrative → A |
| 69–96 | Part 1A — 22 core routes, KEEP/MERGE/DELETE | `→D` + `→A` | Dispositions corrected per A2; original table → A |
| 97–153 | Part 1B — 46 tools, KEEP/MERGE/DELETE | `→A` | **Superseded by the A2.5 register** |
| 133 | `learn-lab`·`language-lab` → DELETE, *"teaching, banned by principle"* | `→P` + `✕` | Principle *we do not teach in V1* → P. The DELETE disposition → deprecated (A2.5 SUPPORTING). |
| 156–158 | The *worse-or-smaller* test | **`→P`** | A durable test |
| 160–175 | Part 2 justification table | `→A` | Applied audit output |
| 179–187 | Part 3 — 5-class tool classification | `→A` | **Superseded by the A2.2 four-class model** |
| **189** | ***"46 routes become 0"*** | **`✕`** | Contradicts A2.4 |
| 194–207 | Part 4 — the 9-destination merge map | **`→D`** | Live IA decision |
| 210–222 | Part 5 — 23 routes deleted permanently | **`✕`** | Contradicts A2.3. Reason recorded in the amendment log. |
| 223–225 | Metaphors · **streaks** · **gamification** banned | **`→P`** | Permanent principles |
| 226 | *"The 46-item tool list — the interface pattern is deleted"* | `→D` | Navigation decision, not a principle |
| 228–229 | 4 tools moved to `archive/` | `✕` | A2.5 EXPERIMENTAL — stay in place |
| 231 | *"23 deleted, 4 archived, 19 merged"* | `✕` | Arithmetic of a withdrawn decision |
| **235–271** | **Part 6 — the 12-route product map** | **`→D`** | Retained as the **navigation** target, relabelled |
| 273 | *"Twelve routes. Down from sixty-eight."* | `→D` | Restated as nav, not filesystem |
| 275–276 | No tool list · capability = a verb | `→P` | Navigation principle |
| 280–294 | Part 7 — the 9 MVP routes | `→D` | Scope decision |
| **280** | **"· 8 WEEKS"** | **`✕`** | Contradicts EP Part C (~23 weeks at 6h/wk) |
| 296–299 | Deliberately not in MVP | `→D` | Scope decision |
| 303–327 | Part 8 — Phases 1–4 + gates | `→E` + `→A` | Superseded by M0–M10; gates already in EP |
| 330–347 | Part 9 — 10-task implementation order | `→A` | Superseded by M0–M10 |
| 348–350 | *"No cosmetic work until structural work is done"* | `→E` | Sequencing rule → EP working protocol |
| 356–372 | Part 10 Table 1 — KEEP | `→D` + `→A` | Folded into the IA table |
| 373–384 | Part 10 Table 2 — DELETE | `✕` + `→P` | Deletions deprecated; concept bans → P |
| 386–397 | Part 10 Table 3 — MERGE | `→D` | Duplicate of Part 4; merged, kept once |
| 401 | *"68 → 12 → 9 shipping"* | `→D` | |
| 405 | Closing statement | `→P` | Closes the principles document |

---

## 3. `CONSOLE.md` → destinations (665 lines)

| Lines | Statement | To | Note |
|---|---|---|---|
| 3–8 | *"Supersedes PRODUCT_CONSTITUTION.md… this one wins"* | `✕` | Replaced by the precedence rule |
| 12–23 | §0 — the name, four meanings | `→P` | |
| 29–32 | §1.1 — the student operating system | `→P` | |
| **34–36** | **§1.2 — home's question: *"What do I do right now?"*** | `→P` ⚠ | **C12 — reworded to the thesis** |
| 38–42 | §1.3 — prime directive | `→P` | |
| 44–64 | §1.4 — **the nine laws** | **`→P`** | Verbatim. Load-bearing. |
| 66–73 | §1.5 — banned permanently | **`→P`** | Verbatim |
| 75–98 | §1.6 — the influence rule | `→P` | |
| 100–111 | §1.7 — the four-question decision test | **`→P`** | |
| 117–121 | §2.1 material | `→P` | |
| 122–230 | §2.2 colour philosophy + earned colour | `→P` | Hex values → `console.css` |
| 231–280 | §2.3 typography philosophy | `→P` | Stack → `console.css` |
| 281–301 | §2.4 geometry · §2.5 iconography | `→P` | Numerics → `console.css` |
| 302–357 | §3 interaction + the Acknowledgement Principle | `→P` | |
| 358–401 | §4 motion — physics, four motions, laws, duration | `→P` | Durations → `console.css` |
| 402–409 | §5 — *"46 tools is a navigation problem"* | `→P` | |
| **410–420** | **§5.1 — three surfaces** | **`→D`** | **C13 — labelled as the mental model** |
| 421–427 | §5.2 — command is the navigation | `→P` + `→D` | Principle → P; *"the 46 routes continue to exist"* → D (**agrees with A2.4**) |
| 429–432 | §5.3 — Score is persistent chrome | `→P` | |
| 436–464 | §6 component philosophy + ~15 budget | `→P` | |
| 466–481 | The completion gate | **`→P`** | |
| 485–509 | §7 five-beat emotional arc + Return beat | `→P` | |
| 510–514 | The anxiety rule — *nothing may ever shame* | **`→P`** | |
| 518–531 | §8 screen hierarchy | `→D` | IA decision |
| 535–545 | §9 NOW / WORK / RECORD feel | `→P` | |
| 547–549 | §9 onboarding — *"three questions maximum"* | `→D` | C14 — recorded as a ceiling |
| 551–562 | §9 empty / loading / success / AI states | `→P` | |
| 566–578 | §10 — what to delete | `→E` | Tasks; most closed in M0 |
| 580–583 | §11 — what to rebuild | `→E` | |
| 585–598 | §12 — what stays unchanged (backend, 25 APIs, registry) | **`→D`** | |
| **592** | **"The Stripe/billing path"** | **`✕`** | **C15 — Razorpay** |
| 602–640 | **§13 Roadmap, Phases 0–5** | `→A` | **Superseded by M0–M10** |
| 636–640 | Sequencing rules (flag, one PR, green, ship continuously) | `→E` | Working protocol |
| 644–653 | §14 amendment mechanism + log | **`→P`** | **The model for all four documents** |
| 659 | *"Signal fixed as Electric Lime"* | `✕` | **C16 — needs a reversal entry** |

---

## 4. `EXECUTION_PLAN.md` → destinations (567 lines)

| Lines | Statement | To | Note |
|---|---|---|---|
| 5–8 | Governed-by header; PLAN ONLY status | `→E` | Rewritten for the new hierarchy |
| 10–24 | Working protocol · effort scale · verification standard | `→E` | Stays |
| 29–31 | *"Nothing may be built until the schema is ratified"* | `→E` | Gate |
| 35–52 | A.1 — occurrence vs pattern | **`→D`** | The central product decision |
| 53–72 | A.2 — concept taxonomy | `→D` | |
| 74–99 | A.3 — occurrence fields + invariants | `→D` | |
| 100–118 | A.4 — pattern fields | `→D` | |
| 119–139 | A.5 — **cognitive vs execution taxonomy** | `→D` | The product's core language |
| 141–149 | A.6 — severity formula | `→D` | |
| 151–168 | A.7 — merge rules | `→D` | |
| 169–189 | A.8 — lifecycle | `→D` | |
| **190–201** | **The resolution rule — *only evidence resolves a pattern*** | **`→P`** | A principle, not a schema detail |
| 203–210 | A.9 — evidence immutability | `→D` | |
| 212–222 | A.10 — consumer matrix | `→D` | |
| **223–226** | **The parent boundary — parents never see raw failures** | **`→P`** | A principle, enforced at the data layer |
| 228–229 | Silent concepts | `→D` | |
| 231–252 | A.11 — the Score conflict | `→D` + `→E` | Decision → D; `M1-6` → E |
| 250 | *"Capture must never lower a score"* | **`→P`** | Non-negotiable |
| **256–306** | **A2.1–A2.4 — analytics policy, four classes, deletion bar, mechanism** | **`→D`** | **Verbatim. The governing model.** |
| 308–344 | A2.5 — the register (13/12/21/0) | **`→D`** | The live classification |
| 347–510 | Part B — M0–M10, 58 tasks | `→E` | Stays |
| 512–528 | Part C — effort summary | `→E` | Stays |
| 529–530 | Note flagging the 8-week conflict | `✕` | Resolved by this migration |
| 534–546 | Part D — D1–D9 | `→D` + `→E` | Log → D; gates → E |
| 545 | D8 — *"resolve the PRODUCT_CONSTITUTION conflict"* | `✕` | **Closed by this migration** |
| 550–567 | Part E — task log | `→E` | Stays |

---

## 5. `MIGRATION.md` → destinations (280 lines)

| Lines | Statement | To | Note |
|---|---|---|---|
| 1–6 | *"The master document"* framing | `✕` | Demoted to an audit artifact |
| 14–39 | §0 measured baseline (78 routes, 6,270 inline styles, 193 hex…) | `→A` | Dated 2026-08-04 measurement. Genuinely valuable, frozen. |
| 42–115 | §1 migration matrix, Groups A–D | `→A` | Per-route effort → E where still live |
| **114** | ***"Zero usage for 90 days should mean deletion"*** | **`✕`** | **Contradicts A2.1 + A2.3** |
| 118–186 | §2 inconsistency inventory (B1–B5, D1–D5, T1–T3, C1–C3, S1–S2, N1–N4, X1–X6) | `→E` + `→A` | Open defects → E; closed → A |
| 189–238 | §3 phased roadmap P0–P3 | `→A` | Superseded by M0–M10 |
| 242–245 | §4 rules 1–4 (token scoping, one page per commit, never mix, green) | `→E` | Working protocol |
| **246–247** | **§4 rules 5–6 — *"PostHog decides what converts next"* · *"delete before migrating"*** | **`✕`** | **Contradicts A2.1** |
| 249–251 | Per-tool conversion recipe | `→E` | |
| 255–259 | §5 what never changes | `→D` | Duplicate of `CONSOLE.md` §12; kept once |
| 263–270 | §6 definition of done | `→E` | |
| 274–280 | §7 honest risk | `→E` | |

---

## 6. `WORKSPACE.md`, `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`

### `WORKSPACE.md` (302) — **archived whole, with reference**

Approved, unimplemented, and explicitly out of scope in `EXECUTION_PLAN`. Its
content is a *fifth* set of decisions (four DNA traits, 108 workspaces, seven
presets) about an engine no milestone builds.

`→A` in full, with a pointer from `PRODUCT_DECISIONS` recording that the
Workspace Engine is **approved in principle, frozen, and not in M0–M10.** One
claim is promoted: §4's finding that **milestone-gated unlocking is gamification
and violates `CONSOLE.md` §1.4 law 6** `→P`, because it is a real principle
derivation worth keeping.

### `CLAUDE.md` (189)

| Lines | Content | To | Note |
|---|---|---|---|
| 3–5 | *"Read `CONSOLE.md` first"* | `→C` | Rewritten as the routing table |
| **7** | ***"PRODUCT_CONSTITUTION.md … DEPRECATED … Do not follow them"*** | **`✕`** | **The critical defect** |
| 9 | Design rules incl. **"one signal (Electric Lime)"** | `✕` | Stale (C16); principles live in P |
| 11 | Type stack | `✕` | → `PRODUCT_PRINCIPLES` / `console.css` |
| 13 | Violations need founder approval · decision test | `→P` | |
| 15–26 | Working rules — paste file contents, never create docs, read before edit, no secrets, 500 lines, `Co-Authored-By` | **`→C`** | Harness conventions, not product decisions. **Kept.** |
| 28–190 | Ruflo / claude-flow — swarm topology, MCP tools, agent routing, CLI | **`→A`** ⚠ | **Not governance and not product.** Recommend moving to `.claude/ruflo.md`. **Needs your call** — see Q3. |

### `PRODUCT.md` + `DESIGN.md` (317) — `→A`

Already deprecated by three separate documents. Move to `docs/archive/` with
headers. Still in git; `EXECUTION_PLAN` M0-8 (delete) is **withdrawn** — A2.5
already classifies them as LEGACY/archive, not deletion.

---

## 7. RESULTING DOCUMENTS

| Document | Contains | Est. lines | Sources |
|---|---|---|---|
| **`PRODUCT_PRINCIPLES.md`** | Thesis + loop · product laws (nine) · design laws · permanent bans · influence rule · decision test · completion gate · anxiety rule · emotional arc · resolution rule · parent boundary · *capture never lowers a score* · **amendment log** | ~430 | PC ×9, CONSOLE ×21, EP ×4, WORKSPACE ×1 |
| **`PRODUCT_DECISIONS.md`** | A2 classification policy + register · the mistake schema · IA at three altitudes · merge map · MVP scope · what never changes · Razorpay · dated decision log incl. **every reversal** | ~390 | EP ×24, PC ×12, CONSOLE ×5, MIGRATION ×1 |
| **`EXECUTION_PLAN.md`** | Working protocol · M0–M10 · deps · effort · gates · task log · open defects | ~480 | EP ×8 (mostly unchanged), MIGRATION ×6, CONSOLE ×3, PC ×2 |
| **`CLAUDE.md`** | Routing table · precedence rule · working conventions | ~45 | CLAUDE ×2 |
| `docs/archive/` | 5 audits, 3 superseded roadmaps, `WORKSPACE.md`, `PRODUCT.md`, `DESIGN.md` | — | frozen, dated |

**2,725 lines → ~1,345 live + ~1,380 archived. 21 statements explicitly
deprecated, each with a recorded reason. Zero silent losses.**

---

## 8. AUTHORITY HEADER (on all four)

```
AUTHORITY:       <principles | decisions | plans | pointer>
ANSWERS:         <the questions this document may answer>
MAY NOT CONTAIN: <claim types forbidden here>
PRECEDENCE:      PRINCIPLES > DECISIONS > PLANS
LAST AMENDED:    <date>
```

---

## 9. DECISIONS REQUIRED BEFORE I EXECUTE

| # | Question | My recommendation |
|---|---|---|
| **Q1** | **`CONSOLE.md` is a fifth authority.** Split it across the four documents, or keep it as a fifth? | **Split it.** It satisfies your constraint exactly, and its §1 is product law that was never design law. Cost: `PRODUCT_PRINCIPLES.md` reaches ~430 lines and holds both product and design principles. |
| **Q2** | **C12 — the one question.** *"What should I fix next?"* or *"What do I do right now?"* | **The thesis.** Reword `CONSOLE.md` §1.2. |
| **Q3** | **Ruflo/claude-flow block** (`CLAUDE.md:28–190`) — move to `.claude/ruflo.md`, or delete? | **Move.** It is harness config, not governance, but it is live tooling and shouldn't be lost. |
| **Q4** | **The mistake schema (A.1–A.10, ~200 lines)** → `PRODUCT_DECISIONS`? | **Yes.** It is the decision about what the product records. Two claims promote to principles: the resolution rule and the parent boundary. |
| **Q5** | Confirm C13 (three altitudes), C15 (Razorpay), C16 (Electric Lime reversal recorded) | As mapped |

On approval I execute in this order — **`CLAUDE.md` first and alone**, because
until it is fixed any context reset re-reads *"do not follow the constitution"*:

**G1** `CLAUDE.md` → pointer · **G2** `PRODUCT_PRINCIPLES.md` · **G3**
`PRODUCT_DECISIONS.md` · **G4** `EXECUTION_PLAN.md` reconciled · **G5** archive
5 documents · **G6** authority headers · **G7** verify every `→` landed.

**No production code will be modified.** `console.css` receives token values only
if you approve Q1; that is the sole file outside `docs/` this touches, and I will
stop and confirm before it.
