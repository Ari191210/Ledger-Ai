# Studyledger — Claude Instructions

## Project
studyledger.in — a Next.js 14 student OS. Codebase at this directory. Live at studyledger.in on Vercel.
Vault: `C:\Users\DELL\Documents\LedgerBrain\`

---

## MANDATORY: Agent Protocol — Every Command, No Exceptions

Ruflo is installed. 98 agents live in `.claude/agents/`. **You MUST spawn the correct agents for every task before writing any code.** No exceptions. No "quick fixes" done solo.

### Agent map — spawn based on task type

| Task type | Agents to spawn (in parallel) |
|-----------|-------------------------------|
| New UI / frontend feature | `core/coder` + `core/reviewer` + `analysis/analyze-code-quality` |
| New API route / backend logic | `development/dev-backend-api` + `core/reviewer` |
| Bug fix | `analysis/code-analyzer` + `core/coder` + `core/tester` |
| New feature (full) | `sparc/specification` + `core/planner` → then `core/coder` + `core/reviewer` |
| Refactor | `core/reviewer` + `analysis/analyze-code-quality` + `core/coder` |
| Architecture decision | `sparc/architecture` + `architecture/arch-system-design` |
| Security / auth / RLS | `analysis/code-review/analyze-code-quality` + `development/dev-backend-api` |
| Performance | `optimization/performance-monitor` + `core/reviewer` |

### Pre-push verification — ALL three must pass before `git push`

```
1. npx tsc --noEmit          → 0 errors
2. npx next lint             → 0 errors (warnings OK)
3. npx next build            → exit code 0
```

If any step fails, fix it before pushing. Never push a broken build.

### Proof required — in every response that pushes code

After every `git push`, report:
1. **Agents spawned**: list agent names and what each one did
2. **Verification results**: paste the tsc / lint / build output (or "0 errors")
3. **What was changed**: file list + one-line summary per file

### Why this matters

Every push deploys to Vercel automatically. A broken push = a broken live site at studyledger.in.
Students are using the site. No mistakes.

---

---

## Vault logging — ALWAYS do this

After every code change in this project, update the vault. This is non-negotiable.

### Rules

**1. Tool page changed** → update `LedgerBrain/Tools/[CATEGORY]/[slug].md`
- Add a changelog entry at the bottom: `- YYYY-MM-DD: what changed + why`
- Update the `status` frontmatter field if it changed
- Update `last-changed` date

**2. Component created or changed** → update `LedgerBrain/Components/[name].md`
- Document props, purpose, how it works

**3. API route changed** → update `LedgerBrain/Architecture/Overview.md`

**4. Every session** → create or append `LedgerBrain/Sessions/[descriptive-name].md`
- Name format: `Build — [what was built]` or `Fix — [what was fixed]` or `Refactor — [what changed]`
- NEVER use dates as filenames
- Include: what changed, why, patterns observed, wiki-links to affected tools/components

**5. New pattern spotted** → append to the relevant `LedgerBrain/Patterns/` file
- A pattern is: something that worked well, a repeated structure, a design insight

**6. After 3+ sessions in one area** → write to `LedgerBrain/Ideas/`
- Generate a concrete improvement idea based on what was learned

---

## Vault structure

```
LedgerBrain/
  00-Index.md               — master map (update when adding new notes)
  Sessions/                 — one note per work session, descriptive names
  Tools/
    PLAN/                   — 7 tools
    LEARN/                  — 9 tools
    WRITE/                  — 12 tools
    PRACTISE/               — 13 tools
    FUTURE/                 — 7 tools
    TRACK/                  — 12 tools
  Components/               — one note per component
  Patterns/                 — observed patterns, grouped by type
  Ideas/                    — improvement ideas generated from patterns
  Architecture/             — stack, routes, design system
  Roadmap/                  — audit, backlog, shipped, decisions
  Features/                 — 60-tools list, seven signatures
```

---

## Frontmatter — all tool notes must have

```yaml
---
name: [Tool Name]
slug: [slug]
route: /tools/[slug]
category: PLAN | LEARN | WRITE | PRACTISE | FUTURE | TRACK
status: built | stub | wip
ai: true | false
signature: true | false
tags:
  - status/built        # (or stub / wip)
  - category/learn      # (or plan / write / practise / future / track)
  - ai/true             # (or ai/false)
last-changed: YYYY-MM-DD
---
```

Tags drive graph colour coding in Obsidian:
- `status/built` → green
- `status/stub` → amber
- `status/wip` → orange
- `signature` → red
- `category/*` → colour per category

---

## Code style

- No Tailwind color classes — all OKLCH CSS variables
- Inline styles on components, CSS classes only for design-system utilities
- TypeScript strict mode
- All AI tools use `callAI()` from `lib/ai-fetch.ts`
- All AI tools call `/api/ai` with a `tool` field matching the switch case
- Loading state: `<AIThinking />` in the output column
- Response rendering: `<AIOutput text={...} />` for prose, `variant="principle"` for short serif quotes

---

## Rate limiting (to be built before October 8)

Before October 8 2026: all features free, no plans.
On October 8 2026: plans activate. Free tier gets 20 AI calls/day.
Implementation: track `ai_calls_today` + `ai_calls_reset_at` in `user_data` Supabase table.
Limit message: *"You've queried the ledger 20 times today. It resets at midnight."* with countdown.

---

## Do not

- Do not add Tailwind color utilities
- Do not use `framer-motion` (GSAP is already installed)
- Do not mock Supabase in any code
- Do not commit `.env` or `.env.local`
- Do not create README files unless asked
