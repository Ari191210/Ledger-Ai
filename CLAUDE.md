# STUDYLEDGER — ENTRY POINT

```
AUTHORITY:       pointer
ANSWERS:         "which document answers my question?"
MAY NOT CONTAIN: principles · decisions · plans · design rules
PRECEDENCE:      PRINCIPLES > DECISIONS > PLANS
LAST AMENDED:    2026-08-05
```

**This file decides nothing.** It routes. If you are about to follow a product
or design rule stated *here*, stop — the rule belongs in one of the four
documents below, and this file is out of date.

---

## The four documents

Exactly four governance documents exist. There are no others.

| Document | Answers | Changes |
|---|---|---|
| **[`PRODUCT_PRINCIPLES.md`](./PRODUCT_PRINCIPLES.md)** | *What must always be true?* Thesis, the loop, product and design law, permanent bans, the decision test. | Rarely — by dated amendment only |
| **[`PRODUCT_DECISIONS.md`](./PRODUCT_DECISIONS.md)** | *What have we chosen, as of now?* Feature classification, information architecture, the mistake schema, scope. | Freely — every change dated in its log |
| **[`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md)** | *How, in what order, how long?* Milestones, tasks, dependencies, progress. | Constantly |
| **`CLAUDE.md`** (this file) | *Where does authority live?* | Only when the hierarchy changes |

---

## How to find the answer

**Classify the question, and exactly one document answers it.**

| Your question | Type | Read |
|---|---|---|
| May we build an AI tutor? | principle | `PRODUCT_PRINCIPLES` |
| What colour is a progress bar? | principle | `PRODUCT_PRINCIPLES` |
| May this screen shame the student? | principle | `PRODUCT_PRINCIPLES` |
| Does `learn-lab` ship in V1 navigation? | decision | `PRODUCT_DECISIONS` |
| Is a tool deleted or archived? | decision | `PRODUCT_DECISIONS` |
| What does one recorded mistake contain? | decision | `PRODUCT_DECISIONS` |
| When does Capture ship? | plan | `EXECUTION_PLAN` |
| What is task M2-3? | plan | `EXECUTION_PLAN` |

If two documents appear to answer the same question, **the one whose claim type
matches the question wins, and the other is a defect** — report it and fix it.
Do not resolve it by judgement in the moment.

## The precedence rule

```
PRINCIPLES  >  DECISIONS  >  PLANS
```

- A plan may not contradict a decision.
- A decision may not contradict a principle.
- **To contradict a principle, first amend the principle** — explicitly, dated,
  with the reason, in `PRODUCT_PRINCIPLES.md`. Never silently, never in passing,
  never inside a plan.

**Violating a ratified rule requires explicit founder approval.** Do not ship a
violation and mention it afterward.

---

## Working conventions

These are harness conventions, not product decisions.

- Do what has been asked; nothing more, nothing less
- When telling the user to run a file (SQL migration, script, config) — ALWAYS
  paste the full file contents in chat so they can copy-paste directly. NEVER
  just give a file path and say "run this file".
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`,
  `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or `.env` files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's
  `.claude/settings.json` has `attribution.commit` set (#2078). The Bash tool may
  suggest one in its default commit-message template — ignore it.
- Keep files under 500 lines
- Validate input at system boundaries

**Verification standard — every task:**

```bash
npx tsc --noEmit && npx next build && node --test tests/*.test.mjs
```

All green, or the task is not done.

---

## Other files

- **`.claude/ruflo.md`** — claude-flow / swarm tooling configuration
- **`docs/archive/`** — superseded documents, retained for reasoning. **Frozen.
  Never governing.** Includes `CONSOLE.md`, `PRODUCT_CONSTITUTION.md`,
  `MIGRATION.md`, `WORKSPACE.md`, `PRODUCT.md`, `DESIGN.md`.
