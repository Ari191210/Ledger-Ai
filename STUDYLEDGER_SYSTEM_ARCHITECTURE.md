# STUDYLEDGER — SYSTEM ARCHITECTURE

> **Status:** architectural specification. Not a plan, not an implementation.
> **Verification basis:** direct read of the repository at commit `8b539ef`
> (`fix(landing): stabilization release L1`), working tree clean.
> `npx tsc --noEmit` → exit 0. `node --test tests/*.test.mjs` → 361 pass, 0 fail.
>
> **What this document may be trusted on:** anything with a file/line citation.
> **What it may not:** live Supabase contents, row counts, which migrations were
> actually applied to production, production environment variables, real user
> behaviour. Every such statement below is explicitly marked **UNVERIFIABLE**.
>
> **Governing product law** is `PRODUCT_PRINCIPLES.md` > `PRODUCT_DECISIONS.md` >
> `EXECUTION_PLAN.md` (per `CLAUDE.md`). This document is subordinate to all
> three and describes *architecture*, never product policy or visual design.
>
> **2026-08-10 — the four open product decisions are ratified.** External study,
> the parent boundary, streaks/Continuity and the mistake pillar are no longer
> open questions for this document to hedge on. Governing statements:
> `PRODUCT_PRINCIPLES.md` §3.5 (new), §3.1–§3.4 and §4.2 (unchanged), and
> `PRODUCT_DECISIONS.md` §9.1–§9.4. `STUDYLEDGER_OPEN_DECISIONS.md` is retained
> as the record of how each was reasoned. Every "founder decision required",
> "flagged for ratification" and "GAP" note below that concerned these four has
> been resolved in place, in each case **in favour of the position this document
> already took**.

---

## PART A — CURRENT ARCHITECTURE RECONSTRUCTION

### A.1 Stack and shape

| Concern | Actual | Evidence |
|---|---|---|
| Framework | Next.js `^16.2.6`, App Router, React `^18` | `package.json:26,29-30` |
| Language | TypeScript `^5`, strict enough that `tsc --noEmit` is clean | verified run |
| Data | Supabase (`@supabase/supabase-js ^2.104.1`) — Postgres + Auth | `package.json:19` |
| AI | `@anthropic-ai/sdk ^0.96.0`, model hardcoded `claude-sonnet-4-6` | `package.json:12`; `app/api/ai/route.ts:2681` |
| Payments | `stripe ^22.3.1` | `package.json:36` |
| Email | `resend ^6.12.2` | `package.json:35` |
| Push | `web-push ^3.6.7` | `package.json:39` |
| Observability | Sentry `^10.53.1`, PostHog, Vercel Analytics/Speed Insights | `package.json:17,32,20-21` |
| Motion | **three** animation runtimes shipped concurrently: `framer-motion ^12.38.0`, `motion ^12.42.2`, `gsap ^3.15.0` + `@gsap/react` | `package.json:24,28,13,23` |

**Finding A.1.a — three animation libraries.** `framer-motion`, `motion` (its
successor package) and `gsap` are all direct dependencies. `app/dashboard/page.tsx:24-27`
registers GSAP + ScrollTrigger. This is not an architecture decision; it is an
unreconciled accumulation. It is out of scope for this document except as a
migration item (Part S).

### A.2 Route structure

68 `page.tsx` files, 25 `route.ts` API handlers (enumerated by `find app -name page.tsx -o -name route.ts`).

- **Marketing / public:** `/` (`app/page.tsx`), `/pricing`, `/faq`, `/legal/{terms,privacy,data,ip}`, `/limit`.
- **Auth:** `/auth`, `/auth/callback`, `/auth/reset`.
- **Onboarding:** `/onboard`.
- **Product:** `/dashboard`, `/dashboard/profile`, `/dashboard/saved`.
- **Console (second, newer product shell):** `/console`, `/console/ai`, `/console/analytics`, `/console/practice`, `/console/work`.
- **Tools:** 46 routes under `/tools/*`.
- **Parent:** `/parent/[code]` (unauthenticated, code-addressed).
- **Admin:** `/admin`.
- **API:** `ai`, `track`, `errors`, `welcome`, `city`, `awake-count`, `send-report`, `send-parent-digest`, `parent/[code]`, `checkout`, `billing-portal`, `webhooks/stripe`, `push/subscribe`, `jobs/{enqueue,run}`, `auth/{google,send-reset}`, `admin/{stats,user,broadcast,generate-hash}`, `cron/{score-snapshot,notifications,risk-alerts,weekly-report}`.

**Confirmed:** 68 page routes, 46 of them tools. Matches the prior audit.

**Finding A.2.a — the landing page is a one-way door.** `app/page.tsx` contains
exactly three `href`s: `/onboard` twice (lines 104, 322) and `/legal/terms`
(line 330). There is **no sign-in link, no `/pricing` link, no `/faq` link**.
A returning authenticated user landing on `/` has no navigation into the product
except the `/onboard` CTA — and `app/onboard/page.tsx:106` bounces an
unauthenticated visitor to `/auth`, while line 108 bounces an already-onboarded
user to `/dashboard`. The flow works by accident, not by design.

**Finding A.2.b — two competing product shells.** `/dashboard` and `/console`
are both "the home screen." `app/dashboard/page.tsx` and `app/console/page.tsx`
both import `computeLedgerScore`, `scoreTier`, `loadUserData` and render a score
+ next-action surface. `/console` has its own layout, CSS, primitives
(`components/console/primitives`), theming engine (`lib/console/workspace.ts`)
and four sub-pages. Neither has been retired. This is the single largest source
of architectural ambiguity in the repo.

### A.3 Tool architecture and registry

`lib/tools-registry.ts` (81 lines) exports `TOOLS_REGISTRY: ToolEntry[]` with
**46 entries** across 6 categories (`PLAN` 2, `LEARN` 3, `WRITE` 9, `PRACTISE` 18,
`FUTURE` 4, `TRACK` 10). Each entry carries only presentation metadata:
`slug`, `title`, `subtitle`, `cat`, `keywords[]`.

**Finding A.3.a — the registry knows nothing academic.** There is no field for
subject, concept emission, event emission, persistence, session participation or
assessment capability. It is a search/navigation index, not a capability
manifest. Nothing in the codebase can answer "which tools produce academic
evidence?" without grepping.

**Finding A.3.b — the registry is duplicated.** `app/dashboard/page.tsx:32+`
declares a *second*, independent `TOOL_CATEGORIES: DashCat[]` literal with its
own titles, subtitles, `tier` strings and long `desc` copy. Two hand-maintained
lists of the same 46 tools.

**Finding A.3.c — persistence per tool.** Counting
`localStorage.setItem | patchUserData | saveUserData` occurrences in each
`app/tools/*/page.tsx`:

| Writes | Tools |
|---|---|
| 8 | `exam-practice` |
| 7 | `study-command` |
| 5 | `syllabus` |
| 3 | `personalise`, `learn-lab`, `grade-tracker` |
| 2 | `exam-planner`, `admissions` |
| 1 | `silent-topics`, `reference-builder`, `post-exam`, `paper-autopsy`, `marks-forensics`, `forgetting-forecast`, `focus-lab`, `exam-triage`, `exam-sim` |
| **0** | **29 tools** — `writing-tools`, `timeline`, `study-guide`, `source`, `rooms`, `resume`, `research-suite`, `report-tools`, `recall-studio`, `presentation`, `practice`, `paper-trauma`, `paper-pattern`, `panic-triage`, `model-answer`, `memory-toolkit`, `marks-obituary`, `language-lab`, `lab-report`, `interview`, `gpa-sim`, `flashcards`, `exam-day`, `debate`, `compare`, `citation`, `case-study`, `calibration`, `analysis-hub` |

(Measured at page level only; a handful of these write through imported
components — e.g. the `ledger-flashcards` key exists — so treat 29 as a floor,
not an exact count. The prior audit's figure of 31 is within measurement error
of this method. The conclusion is unchanged: **the majority of tools are pure
prompt-in / render-out surfaces that leave no trace in the academic record.**)

**Finding A.3.d — only four tools + one context feed the Ledger Score.**
Grepping the writers of the six keys `readScoreInputs()` consumes:

- `ledger-papers-log` ← `app/tools/exam-practice/page.tsx:37`
- `ledger-syllabus`, `ledger-syllabus-subjects` ← `app/tools/syllabus/page.tsx:100,108`
- `ledger-notes-history` ← `app/tools/learn-lab/page.tsx:61` (and a delete at :696)
- `ledger-mistakes` ← `app/tools/exam-practice/page.tsx:200` (create), `:57` (status change)
- `ledger-focus-streak` ← `lib/focus-context.tsx:75,138`
- `ledger-checks` (v2 only) ← `app/tools/learn-lab/page.tsx:148`

**Confirmed.** Four tools (`exam-practice`, `syllabus`, `learn-lab`, `focus-lab`
via `lib/focus-context.tsx`) constitute the entire evidence intake of a 46-tool
product.

**Finding A.3.e — coverage evidence is a 10-item rolling window.**
`app/tools/learn-lab/page.tsx:61` writes `.slice(0, 10)`. The Syllabus Coverage
pillar (up to 250/1000) is computed from at most the last ten notes generated.
Study an eleventh subject and the first silently stops counting.

### A.4 Persistence model

**A.4.1 The `user_data` table** (`supabase/migrations/000_initial_schema.sql:7-35`)
is a hybrid: 18 flat typed/JSONB profile columns (`grade`, `board`, `stream`,
`interests`, `targetExam`, `onboardingDone`, `aiProfile`, `plan`, `marks`,
`focus`, `exams`, `weakTopics`, `papersCount`, `emailEnabled`, `parentCode`,
`parentName`, `referralCode`, `username`) **plus** a single `blob JSONB DEFAULT '{}'`
column, plus rate-limit counters, keyed by `id UUID PRIMARY KEY REFERENCES auth.users(id)`.

**Confirmed:** there is no relational academic data model in production. The
entire academic record is `user_data.blob`, whose value is a flat
`Record<string, string>` of raw, unparsed `localStorage` strings.

**A.4.2 The blob's structure** is defined by `lib/sync.ts:4-26`, `SYNC_KEYS`, 20 keys:
`ledger-profile`, `ledger-onboarding-done`, `ledger-focus-streak`,
`ledger-focus-last`, `ledger-focus-shield`, `ledger-habits-list`,
`ledger-habits-log`, `ledger-weak-topics`, `ledger-deadlines`,
`ledger-notes-history`, `ledger-plan-v1`, `ledger-papers-log`,
`ledger-mistakes`, `ledger-syllabus`, `ledger-syllabus-subjects`,
`ledger-formula-history`, `ledger-career-answers`, `ledger-career-output`,
`ledger-checks`, `ledger-last-event`.

**A.4.3 What does NOT sync.** A grep of every `localStorage.{get,set,remove}Item("literal")`
across `app/`, `components/`, `lib/`, `hooks/` yields ~50 distinct keys. Roughly
30 are absent from `SYNC_KEYS`, including every customisation preference and
several academic artefacts:

- *Customisation:* `ledger-density`, `ledger-radius`, `ledger-width`,
  `ledger-anim-speed`, `ledger-font-sans`, `ledger-font-serif`,
  `ledger-font-mono`, `ledger-base`, `ledger-mode`, `ledger-theme-mode`,
  `ledger-edition`, `theme-base`, `theme-accent`, `ledger-dash-layout`
  (`lib/dash-layout.ts:4`), `console:workspace` (`lib/console/workspace.ts:316`).
- *Academic / work product:* `ledger-flashcards`, `ledger-spaced-items`,
  `ledger-exam-debriefs`, `ledger-focus-tasks`, `ledger-focus-best-streak`,
  `ledger-debt-subjects`, `forensics_sessions`, `paper_autopsy_history`,
  `last-night-plan`, `ledger-saved-outputs` (`lib/saved-outputs.ts:1`),
  `ledger-recent-tools` / `ledger-fav-tools` (`lib/recent-tools.ts:1-2`).

**Confirmed and worse than stated:** it is not only preferences that die on a
device change — saved outputs, flashcards, spaced-repetition items and several
tools' entire histories die too.

**A.4.4 Sync mechanism** (`components/sync-manager.tsx`, `lib/sync.ts`):

- Mounted globally in `app/layout.tsx:241`.
- **Pull** runs once per browser session (`sessionStorage` guard,
  `sync-manager.tsx:19-22`); if it wrote anything it does a **full
  `window.location.reload()`** (`:34`).
- **Push** is a wholesale `upsert` of the *entire* blob every **15 seconds**
  (`sync-manager.tsx:7,42-45`), plus on `visibilitychange→hidden` (`:48-53`) and
  on `beforeunload` (`:56`).

**Finding A.4.4.a — last-writer-wins at whole-blob granularity.**
`pushToCloud` (`lib/sync.ts:40-48`) replaces the whole `blob` column. Two open
tabs, or a phone and a laptop, will overwrite each other every 15 seconds. There
is no version, no `updated_at` comparison on write, no per-key merge on push.

**Finding A.4.4.b — the merge heuristic is string length.**
`lib/sync.ts:67`: `if (!local || value.length > local.length)`. Cloud wins a key
only if its JSON string is *longer*. A student who deletes three deadlines on
their phone will have them resurrected on their laptop; a student who *edits* a
note to be shorter loses the edit. For a product whose core promise is a
permanent, correct academic record, this is the single most dangerous line in
the codebase.

**Finding A.4.4.c — local profile shadows the server.**
`lib/user-data.ts:123` returns `{ ...(data as UserData), ...localProfile }` —
localStorage wins over Supabase for profile fields. `patchUserData`
(`:139-142`) is a read-modify-write of the full row with no optimistic
concurrency, so two concurrent patches silently drop one.

### A.5 Supabase schema — every migration read

| File | Contents |
|---|---|
| `000_initial_schema.sql` | `user_data`, `rooms`, `ai_history`, `error_logs`, `page_events`, `announcements`, `jobs`; indexes incl. `GIN(blob)`; RLS enabled on 6 tables with own-row policies |
| `001_rls.sql` | Re-declares the same RLS; adds `ai_rate_limits` table (`user_id` PK, `ai_calls_today`, `ai_calls_reset_at`) with a `FOR ALL` own-row policy |
| `002_blob_and_rooms.sql` | Idempotently adds/casts `user_data.blob` to JSONB; adds `rooms.bailed TEXT[]`, `rooms.session_end`, `user_data.updated_at` |
| `003_ai_rate_limits.sql` | Adds `ai_calls_today`, `ai_calls_reset_at` to `user_data` (superseded by 006) |
| `004_missing_tables.sql` | **States that `page_events`, `jobs`, `push_subscriptions`, `stripe_customers`, `stripe_events` did not exist in production as of 2026-07-12** despite code depending on them. Creates all five |
| `004b_stripe_tables_only.sql` | Subset of 004 — the two Stripe tables only |
| `005_score_history.sql` | `score_history` (one row per user per `captured_on DATE`, `UNIQUE(user_id, captured_on)`, CHECK constraints matching the v1 pillar ceilings 400/250/200/150), index `(user_id, captured_on DESC)`, RLS **SELECT-own only — no INSERT/UPDATE/DELETE policy at all**, so only the service role can write history |
| `006_ai_usage_server_side.sql` | Moves the AI meter server-side; provides the `consume_ai_call()` RPC used at `app/api/ai/route.ts:2612-2613` |
| `007_mistakes.sql` | The real mistake domain: `concepts`, `evidence`, `patterns`, `occurrences` |
| `008_ingestion.sql` | `ingestion_runs`, `ingestion_stages`, `ingestion_review` |

**Finding A.5.a — migration 004's own header is the most important sentence in
the schema directory.** It records that five tables the running code required
were absent from production. There is no migration ledger, no
`supabase/migrations` runner in CI, and `CLAUDE.md` instructs the agent to paste
SQL into chat for the founder to run by hand. **Schema drift between repo and
production is structural, not accidental.** Whether 004–008 have actually been
applied is **UNVERIFIABLE** from the repository. `app/api/cron/score-snapshot/route.ts:97-107`
contains a live runtime fallback for a *missing column* (`score_history.active`),
which is direct evidence that the team expects the deployed schema to lag the code.

**Finding A.5.b — `007_mistakes.sql` is genuinely excellent and completely
unused.** It encodes four product invariants *structurally*:

1. `occurrences.evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE RESTRICT` (`:229`) — no mistake without proof.
2. `CONSTRAINT occurrences_has_error CHECK (cognitive_error IS NOT NULL OR execution_error IS NOT NULL)` (`:282-284`).
3. `CONSTRAINT occurrences_pattern_is_leaf FOREIGN KEY (pattern_id, pattern_tier) REFERENCES patterns(id, tier)` with `pattern_tier` pinned to `'concept'` (`:272-273, 294-297`) — occurrences can only attach to leaf patterns, declaratively.
4. `patterns_update_own ... WITH CHECK (status IN ('acknowledged','practising'))` (`:369-376`) — **a student cannot mark their own mistake resolved, enforced by RLS.**

Plus: no UPDATE/DELETE policy on `evidence` or `occurrences` (immutability as a
database property, `:335,346`); partial unique indexes implementing the merge
rule (`patterns_leaf_unique`, `:189-191`) and idempotent parent attachment
(`:196-202`).

**Finding A.5.c — `008_ingestion.sql` is likewise complete and unused.**
Append-only stage ledger with `UNIQUE(run_id, stage, attempt)` (`:111`), an
outcome-shape CHECK forbidding silent nulls (`:114-118`), verbatim `output JSONB`
for free replay, a `confirmed_at` confirmation gate with an RLS policy that
permits the student to set it *once and only forwards*
(`USING confirmed_at IS NULL ... WITH CHECK confirmed_at IS NOT NULL`, `:174-178`),
and an `ingestion_review` table for "what the pipeline refused to guess."

**A.5.d RLS posture overall.** Own-row policies everywhere; `error_logs` and
`page_events` are insert-only with **no SELECT policy** (service-role read only);
`jobs` has RLS on with no policies at all (service-role only);
`score_history` is read-only to students; `concepts` is globally readable and
service-role-writable. Tier lives in `auth.users.app_metadata`, deliberately
*not* in the student-writable `user_data` row — `lib/tier.ts:30-36` documents
exactly why. **This is a genuinely careful RLS design.**

**Finding A.5.e — but two system-owned fields live in the student-writable row.**
`user_data.notifState` and `user_data.parentAlerts` (`lib/user-data.ts:39-42`)
are documented as "service-role writes only", yet `user_data` has a full
`user_data_update_own` UPDATE policy (`000_initial_schema.sql:142`). A student
can clear their own notification dedup keys and parent-alert cooldowns from
devtools. Low severity, but it is the same class of bug the tier design avoided.

### A.6 The AI route

`app/api/ai/route.ts` — 2,726 lines, one file.

- `ToolName` is an 86-member string union (`:258`); `buildPrompt` is one `switch`
  with **86 `case` arms** (measured); `SAFETY_PREAMBLE` appears 87 times.
- Request pipeline in `POST` (`:2499`): JSON parse → tool allowlist (`:2516-2519`)
  → `sanitiseParams` (size caps per field class, `:227-255`) → `REQUIRED_PARAMS`
  check (`:2529-2536`) → **Bearer token auth via `supabaseServer.auth.getUser`
  (`:2539-2547`)** → tier entitlement via `hasAccess` (`:2555-2561`) → 30-day
  strike check (`:2564-2570`) → regex moderation (`:2574`) → **Haiku
  classifier moderation** (`runAIModeration`, `:2584`) → atomic
  `consume_ai_call()` RPC meter (`:2612`) → single Anthropic call → JSON
  extraction by `text.match(/\{[\s\S]*\}/)` (`:2694`) → non-blocking
  `ai_history` insert (`:2708-2718`).
- Model is hardcoded `"claude-sonnet-4-6"` (`:2681`). `max_tokens` is 6000 for a
  24-tool `LARGE_TOOLS` allowlist, else 2048 (`:2675-2676`).

**Finding A.6.a — personalisation reaches 7 of 86 prompts.**
`buildProfileContext` (`:134-209`) is a substantial, well-written personaliser:
board-specific instruction text for CBSE/ICSE/IB/IGCSE/State/Home School,
stream-specific for PCM/PCB/Commerce/Arts, exam-specific for JEE/NEET/CUET/IPMAT/CA/SAT,
plus `aiProfile.learningStyle` (4 options) and `communicationStyle` (4 options).
The identifier `profileCtx` occurs **8 times** in the file: once at `:345`
(`const profileCtx = buildProfileContext(params)`) and **7 injection sites**.
Contrast with 87 uses of `SAFETY_PREAMBLE`. **Confirmed: ~92% of prompts are
unpersonalised.** The Personalisation promise is implemented and then not wired.

**Finding A.6.b — personalisation is client-supplied.** `buildProfileContext`
reads `params.grade`, `params.board`, `params.aiProfile`, `params.syllabusSubjects`
— i.e. whatever the browser sent. The server never reads the profile from
`user_data`. A tool that forgets to pass `grade` silently gets a generic prompt;
`:141` `if (!grade && !board) return ""`.

**Finding A.6.c — `ai_history` is an unexploited event log.** Every successful
parsed response is written to `ai_history` with `user_id`, `tool`, a 300-char
`input_text` excerpt, the full `output JSONB`, `grade`, `board`
(`:2701-2718`; table at `000_initial_schema.sql:55-65`). This is the closest
thing the product has to a server-side, per-student activity stream — and
nothing reads it except (presumably) the admin surface. **UNVERIFIABLE:** its
production row count and retention.

**Finding A.6.d — minor defects.** `validTools` (`:2516`) lists
`"marks_obituary"` twice. `"subject_picker"` and `"exam_strategy"` appear in the
`ToolName` union and `validTools` but have no `REQUIRED_PARAMS` entry. The JSON
extraction regex is greedy from first `{` to last `}` and will mis-parse any
response containing prose braces.

**Finding A.6.e — the moderation design is sound.** Two layers (regex with
leetspeak/zero-width normalisation at `:42-50`, then a Haiku classifier), strikes
persisted to `error_logs` with `type: 'moderation_block'`, three strikes in 30
days = suspension. The `SAFETY_PREAMBLE` is prepended to every prompt. This is
the strongest single subsystem in the AI layer and should be kept.

### A.7 The scoring engine

**A.7.1 Live engine — `lib/ledger-score.ts` (367 lines).**
`computeScoreFromInputs` (`:110-264`) produces four pillars:

| Pillar | Max | Formula | Lines |
|---|---|---|---|
| PQA / Examination | 400 | `accuracy × 350 + min(50, papers × 5)`; 0 if no papers | `:115-121` |
| Syllabus / Coverage | 250 | 50 for uploading + up to 200 pro-rata subjects covered | `:135-155` |
| Mistake / Recovery | 200 | `min(120, resolved×20) + min(50, distinctEvidence×5) + min(30, faced×5)` | `:182-215` |
| Consistency / Momentum | 150 | `min(150, streak × 7.5)` | `:217-218` |

Client/server unification is real and correct: `readScoreInputs()` (`:67`) and
`scoreInputsFromBlob()` (`:92`) both produce a `ScoreInputs` and both feed the
single `computeScoreFromInputs`. Six consumers use it —
`app/dashboard/page.tsx:11`, `app/console/page.tsx:6`,
`app/api/cron/score-snapshot/route.ts:3`, `app/api/cron/risk-alerts/route.ts:4`,
`app/api/cron/notifications/route.ts:3`, `app/api/send-parent-digest/route.ts:4`,
`app/api/parent/[code]/route.ts:3` (plus dashboard components). **No formula is
duplicated anywhere.** This is the best-engineered part of the score layer and
must be preserved as a pattern.

**A.7.2 CRITICAL — the mistake pillar is structurally unreachable.**

The prior audit described a v1/v2 enum mismatch. The pillar has since been
*rewritten* (commit `640ef97` "invert the mistake pillar so capture is never
punished"), and the bug survived the rewrite in a new form. Current state:

The pillar pays for exactly three things (`lib/ledger-score.ts:198-213`):
- `resolvedCount` — entries with `status === "resolved"`
- `evidenceCount` — distinct non-empty `m.evidenceId`
- `facedCount` — `status ∈ {acknowledged, practising, resolved, recurred}`

A repo-wide grep for `status[:=] "resolved"|"acknowledged"|"practising"|"recurred"|"cleared"`
across `app/`, `components/`, `lib/` returns **exactly two hits**:

- `lib/score-projection.ts:127` — `return { ...m, status: "resolved" }` — inside a
  *simulation*, never persisted.
- `app/tools/exam-practice/page.tsx:57` — `m.status = "cleared"` — a value the v1
  engine does not recognise.

The only creator of mistakes is `app/tools/exam-practice/page.tsx:192-199`, which
writes `{ id, date, subject, topic, category, status: "open" }`. **No code path
anywhere writes `evidenceId`.** Therefore:

> **`resolvedCount ≡ 0`, `evidenceCount ≡ 0`, `facedCount ≡ 0`, so
> `mistakeScore ≡ 0` for every user, permanently. The Ledger Score's real
> ceiling is 800/1000, not 1000.**

`scoreTier` (`:360-366`) puts "Exam Ready" at ≥800 — meaning the top tier is
mathematically achievable only by a student with a perfect 400 PQA, perfect 250
Coverage and a 20-day streak, with zero margin. **Confirmed, with a corrected
diagnosis: this is not an enum mismatch between two engines, it is a pillar with
no writer at all.**

**A.7.3 Two downstream systems promise points the engine cannot pay.**

- `lib/console/next-move.ts:79-89` surfaces "Clear N open mistakes" with a `gain`
  from `projectMistakeReductionImpact`, which simulates `status: "resolved"`
  (`lib/score-projection.ts:118-132`) and so returns +20/mistake up to +120. No
  production action can produce that state. The header comment at
  `next-move.ts:16-18` explicitly claims "Nothing is estimated, rounded up, or
  invented: the number shown is the number the student will actually get." It is
  invented — not by the projection code, which is honest against the formula, but
  by the absence of the state transition it simulates.
- `lib/notifications.ts:185` — *"Resolving them is worth up to 120 score points."*
  Same unpayable promise, delivered as a push notification.

This is the most serious integrity defect in the product: **the system tells
students a number it cannot honour.**

**A.7.4 `app/tools/post-exam/page.tsx:140` — one-click history deletion.**
`<button onClick={() => { localStorage.removeItem("ledger-mistakes"); setMistakes([]); }} ...>Clear all</button>`
— no confirmation, no undo, no audit, no server copy. Within 15 seconds
`SyncManager` pushes the emptied blob and the cloud copy is gone too. The
"permanent record" is one unlabelled 9px button away from erasure.

**A.7.5 The shadow engine — `lib/ledger-score-v2.ts` (268 lines).**
A genuinely better formula: exponential accuracy decay with no window cutoff
(shift-invariant, so inactivity cannot raise the score), per-day question caps
(`DAILY_QUESTION_CAP = 60`) and per-session minimums (`MIN_SESSION_QUESTIONS = 5`)
applied identically client- and server-side, a logarithmic volume factor, a
sequence-based improvement bonus, proof-gated coverage (`PROOF_SESSION_MIN_Q = 10`,
`PROOF_SESSION_MIN_ACC = 0.6`), a recovery pillar where clearing is the only way
up, and a `RECOVERY_EPOCH_MS` so legacy unstatused mistakes are archived rather
than becoming an unclearable backlog.

Its only importer is `app/api/cron/score-snapshot/route.ts:4`, which computes it,
`console.log`s the delta (`:65-66`), aggregates mean/max delta into the response
(`:119-121`) — **and discards it.** The row written to `score_history` is v1
(`:71-82`). **Confirmed.**

**A.7.6 `score_history` + market layer.** `lib/score-history.ts` fetches the
series; `lib/score-market.ts` derives movement and commentary. The empty-state
handling here is honest — the audit's "newly listed"/zero-base guards are real —
and `components/dashboard/academic-markets.tsx`, `components/editorial/index-report.tsx`
and `components/dashboard/personal-edition.tsx` consume it. **Keep.**

**A.7.7 `lib/active-close.ts`.** Client stamps `ledger-last-event` on a
qualifying event; `corroborateActiveDay(blob, dateStr)` (`:57-80`) requires the
stamp *and* independent corroboration from `ledger-papers-log` (≥5 questions),
`ledger-checks`, a `cleared` mistake, or `ledger-focus-last`. **A forged stamp
alone does nothing.** This is the correct pattern for every client-originated
claim in the target architecture. Its own header documents a real bug: the stamp
uses local date, the cron closes on UTC date, so IST 00:00–05:30 events land on
the previous day.

### A.8 The mistake engine (unwired)

`lib/mistakes/types.ts` (333 lines), `lib/mistakes/engine.ts` (549 lines),
`lib/mistakes/migrate-legacy.ts` (~400 lines).

`engine.ts` is pure, deterministic, clock-free, non-mutating, and returns typed
`Result<T>` failures rather than throwing or guessing. It implements:
`mergeKeyFor`/`mergeOccurrence` (`:188-282`), `computeSeverity` /
`computeParentSeverity` / `compareParentPatterns` (`:314-373`), `canResolve` /
`canResolveParent` (`:394-451`), `ALLOWED_TRANSITIONS` + `applyTransition`
(`:466-549`) with a mechanical append-only history guarantee (`assertAppendOnly`,
`:133-142`, plus deep freezing at `:118-123`).

Two rules deserve to survive into the target unchanged:
- `RESOLUTION_MIN_CORRECT = 2` **and** `RESOLUTION_COOLING_DAYS = 7` (`:77,80`):
  a mistake is not resolved by two correct answers ten minutes later. That is the
  fluency illusion.
- `STUDENT_SETTABLE = ['acknowledged','practising']` (`:89-92`) mirrored by the
  RLS `WITH CHECK` in `007_mistakes.sql:373-376`. Defence in depth on the single
  most gameable transition in the product.

**Import graph:** `lib/mistakes/engine.ts` and `migrate-legacy.ts` are imported by
`tests/mistakes-engine.test.mjs` and `tests/mistakes-migration.test.mjs` **only**.
`lib/mistakes/types.ts` is additionally imported by `lib/taxonomy/build.ts:20`,
which is itself imported only by `tests/taxonomy.test.mjs` and
`scripts/build-taxonomy-seed.mjs`. **Zero production importers. Confirmed.**

Likewise `lib/ingest/{runner,hash,memory-store,types}.ts` (415-line runner):
referenced only by `tests/ingest-runner.test.mjs`. **Zero production importers.**

**This is the most valuable asset in the repository and it is dark code.** Tables,
types, engine, migration and tests all exist; the only missing pieces are a
server data-access layer and a capture UI.

### A.9 Parent digest and parent space

- `lib/parent-digest.ts` (170 lines) — pure functions. `computeRiskFlags`
  (`:37-59`), `digestSubject`, `buildParentEmailHtml`. Renders score total, the
  four pillars as bars, upcoming exams, and top-5 "topics needing work" with miss
  counts.
- `app/api/parent/[code]/route.ts` — selects
  `exams, marks, focus, weakTopics, papersCount, parentName, blob` by
  `parentCode`, computes the score server-side, and **explicitly strips the blob
  before responding** (`:21-24`, with the comment "Never return the blob itself").
- `app/api/send-parent-digest/route.ts`, `app/api/cron/risk-alerts/route.ts`,
  `app/api/cron/weekly-report/route.ts` are the send paths.

**Confirmed: no per-question or wrong-answer content leaks to parents.** The
structural choice to compute server-side and omit the blob is correct.

**Finding A.9.a — but sharing is binary and unauthenticated.**
`/api/parent/[code]` requires no auth; possession of the code is total access to
that fixed report. The only guard is middleware's 10 req/min per IP
(`middleware.ts:25`). There is no share policy, no per-field visibility, no
revocation flow beyond changing the code, no access log, and no notion of
Private/Shared/System from the Constitution.

### A.10 Authentication and authorisation

- Supabase Auth, email/password + Google OAuth (`app/auth/page.tsx:36,81,88`;
  `app/api/auth/google/route.ts`).
- **Route protection is client-side only.** `components/auth-guard.tsx` is a
  `useEffect` that calls `router.replace("/auth")` when `!loading && !user`. The
  page component and its data-fetching still mount on the client.
- **`middleware.ts` performs no authentication.** It is an in-memory,
  per-serverless-instance IP rate limiter over 10 API prefixes; its own header
  (`:4-7`) says so. Its `matcher` (`:96-107`) covers only `/api/*` paths —
  `/dashboard`, `/tools/*`, `/console`, `/admin` are not matched at all.

**Confirmed: there is no server-side or edge enforcement on any product route.**
This is survivable only because every *data* path is RLS-protected and
`/api/ai` authenticates its own Bearer token (`route.ts:2539-2547`). The exposure
is UI/metadata, not records — but it also means "logged out" is a client-side
opinion.

**Finding A.10.a — signup does not lead to onboarding.**
`app/auth/page.tsx:80-86`: signup calls `supabase.auth.signUp` and sets
`setDone(true)` (a confirm-your-email screen). Sign-in (`:88-91`) routes to
`/dashboard`. `app/onboard/page.tsx` is reachable only from the landing CTA or a
direct link. **Confirmed: a user who signs up, confirms email and signs in never
sees onboarding** and therefore has no `grade`/`board`/`stream`/`aiProfile` — which
is precisely the input `buildProfileContext` needs, and returns `""` without
(`app/api/ai/route.ts:141`). The Personalisation promise fails at the front door.

Onboarding itself is 8 data steps + a completion step
(`TOTAL_DATA_STEPS = 8`, `app/onboard/page.tsx:34`), with conditional stream
branching (`:154,164`) and a syllabus-upload handoff at `:377`.

### A.11 Notification and background-job systems

**Five scheduled jobs, in two places.**

`vercel.json` declares three:
- `/api/cron/weekly-report` — `0 2 * * 1`
- `/api/cron/risk-alerts` — `0 3 * * *`
- `/api/jobs/run` — `0 0 * * *`

`.github/workflows/` declares two more — `notifications-cron.yml` (hourly,
`0 * * * *`) and `score-snapshot-cron.yml` — with an explanatory header stating
Vercel Hobby forbids sub-daily crons. Both authenticate with `CRON_SECRET` via
`lib/cron-auth.ts` (`isInternalCaller`, fail-closed).

**Correction to the prior audit:** the score-snapshot and notification crons are
*not* missing; they live in GitHub Actions. **UNVERIFIABLE:** whether
`CRON_SECRET` is configured in both Vercel and the repo's Actions secrets, i.e.
whether they actually run.

`lib/notifications.ts` (235 lines) is a pure decision engine: exam countdown at
T-14/7/3/1/0, streak-at-risk (only when a streak exists, broke-tonight, and no
shield), tier-boundary milestones, and two risk candidates. It enforces quiet
hours 22:00–08:00 (`:81-83`), chronotype delivery windows (`:90-97`), semantic
dedup keys, one send per run, one high-priority send per day (exam T-1/T-0
exempt). **This is a well-designed, non-spammy engine and should be kept** — but
see A.7.3: its risk copy quotes an unpayable score figure.

`lib/jobs.ts` + `jobs` table + `/api/jobs/{enqueue,run}` provide a minimal
durable queue (`MAX_ATTEMPTS = 3`, `status ∈ pending|running|done|failed`,
partial index on pending). Currently used for email work only.

### A.12 Dashboard, console, customisation

- `/dashboard` (`app/dashboard/page.tsx`) composes `PersonalEdition`,
  `ByTheNumbers`, `AcademicMarkets`, `DashboardMasthead`, `Coverage`,
  `RecommendedAction`, plus recent/favourite tools and the duplicated tool
  catalogue.
- Composition control is `lib/dash-layout.ts` — **five booleans**
  (`recommendation | recent | score | exams | features`), stored in
  `localStorage["ledger-dash-layout"]`, unsynced. That is the entire "student
  controls their layout" implementation.
- `components/ui-context.tsx` is not a UI-preferences context at all; it holds
  one field, `splitSlug`, for the split-view panel.
- **`lib/console/workspace.ts` (367 lines) is a real customisation engine** and
  the strongest prior art in the repo for Constitution §5. Four traits
  (`Material × Voice × Pressure × Temperament` = 108 combinations,
  `COMBINATION_COUNT` at `:53`), a pure `derive(dna)` (`:225-290`) emitting CSS
  custom properties, every text colour passed through `ensureContrast()` so an
  illegible workspace is *unrepresentable*, a floor-bound `tight` preset that
  refuses to breach the 44px touch target (`:163-172`), `parseDNA` as a hostile
  boundary with own-property-only reads (`:337-349`), and storage of **choices,
  not computed values** (`:312-315`) so future improvements upgrade existing
  workspaces retroactively. It is scoped to `/console`, keyed
  `"console:workspace"`, and **not in `SYNC_KEYS`**.

### A.13 Design systems

Four coexisting CSS systems:

| System | File | Lines | Scope |
|---|---|---|---|
| Legacy | `app/globals.css` | 2,421 | global; the 46 tool routes + dashboard |
| Editorial | `app/editorial.css` | 759 | scoped under `[data-ui="editorial"]`, imported globally-but-inert at `app/layout.tsx:19` |
| Landing | `app/landing.css` | 599 | imported by `app/page.tsx:4` |
| Console | `app/console/console.css` | 382 | imported by `app/console/layout.tsx:10` |

`lib/editorial-routes.ts:20-22` — `EDITORIAL_ROUTES` currently contains **one
entry, `"/"`**. The allowlist mechanism is sound (exact match only, documented
rationale against prefix matching at `:24-32`); the migration it governs has
covered 1 of 68 routes.

Glassmorphism is live: `.gl-pane` / `.gl-pane-alt` at `app/auth/page.tsx:110,124,138,148`
and `components/app-nav.tsx:231`; `backdrop-filter` appears twice in
`globals.css` and six times in `editorial.css`. **Confirmed.**

### A.14 Fabricated data — all three claims confirmed

1. **`/api/awake-count` + `components/rank-whisper.tsx`.**
   `app/api/awake-count/route.ts:5-11` hardcodes `STREAM_SIZES`
   (jee 1.4M, neet 2M, cbse 3.8M…), then at `:41-44` computes
   `pctAwake = 0.92 · e^(−0.0697·m)`, adds `Math.random()*0.04 − 0.02` jitter, and
   returns `awakeCount` and a `percentile`. **Every number is invented.** It is
   rendered as a live social-proof overlay between 23:30 and 00:15 IST, mounted
   globally through `components/legacy-chrome.tsx:25`.
2. **`app/tools/grade-tracker/page.tsx:282`.** The `catch` branch of
   `computeLedgerScore()` sets `{ total: 100, ..., mistakeScore: 100, ... }` —
   a fabricated score of 100 shown on failure, indistinguishable from a real one.
3. **`lib/console/next-move.ts` + `lib/notifications.ts:185`** — the unpayable
   +120 promise (A.7.3).

Constitution §36 bans "a fabricated-progress platform." All three violate it.

### A.15 Security

- **XSS:** `app/tools/reference-builder/page.tsx:287` renders AI output through
  `dangerouslySetInnerHTML={{ __html: d }}`. Combined with
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (`next.config.mjs:9`), an
  injected `<script>` in model output executes. **Confirmed — this is the one
  real XSS vector.** The other `dangerouslySetInnerHTML` sites
  (`app/layout.tsx:135,145,153,171,222,229`, `components/ui/chart.tsx:95`) are
  developer-authored constants and `JSON.stringify` of static objects — not
  vectors.
- **CSP:** `unsafe-eval` is justified in-comment by "Three.js/Spline WebGL"
  (`next.config.mjs:6-8`) and `connect-src` still allows
  `https://prod.spline.design` (`:20`). **Neither `three` nor any `@splinetool`
  package appears in `package.json`.** The justification is stale; the
  permission is not.
- Otherwise the header set is strong: HSTS with preload, `nosniff`,
  `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`, COOP/CORP
  same-origin, a restrictive `Permissions-Policy`.
- **Prompt injection:** untrusted student text is concatenated into system
  prompts (`buildPrompt`). `SAFETY_PREAMBLE` asserts its rules are absolute, but
  there is no structural separation of instruction from data. Model output is
  then parsed as JSON and, in one place, injected as HTML.

### A.16 TypeScript and test hygiene

`tsc --noEmit` exits 0. `node --test tests/*.test.mjs` → **361 tests, 45 suites,
0 failures** covering the mistake engine, the legacy mistake migration, mistake
RLS invariants against a live database, the ingestion runner, the taxonomy, the
workspace engine and score projection. **The test suite exclusively covers the
unwired subsystems.** There is no test anywhere for `lib/ledger-score.ts`,
`lib/sync.ts`, `lib/notifications.ts` or any shipped route.

### A.17 Summary judgement on the current architecture

StudyLedger is **two products in one repository**: a large, shallow AI-tool
directory that ships, and a small, deep, rigorously-designed academic-evidence
system that does not. The shipping product violates Constitution §36 in three
places, cannot pay a score pillar it advertises, stores the "permanent academic
record" in browser localStorage merged by string length, and deletes it on one
unconfirmed click. The non-shipping product — `007`/`008` migrations,
`lib/mistakes/*`, `lib/ingest/*`, `lib/taxonomy/*`, `lib/console/workspace.ts` —
is close to what the Constitution asks for and is fully tested.

**The correct strategic reading is therefore not "rewrite" and not "keep":
it is "connect."** The target architecture below is largely a plan for wiring
what exists, plus the genuinely missing spine — Academic Events, Study Sessions,
and the Assessment Engine — which does not exist in any form today.

---

## PART B — TARGET ARCHITECTURE

Twenty subsystems. Each is specified as: **Purpose · Responsibilities · Inputs ·
Outputs · Source of truth · Persistence · Dependencies · Must NOT own ·
Deterministic vs AI.**

Two laws govern every entry:

- **L1 — Determinism owns the record.** Events, sessions, evidence, scores,
  permissions and history are written only by deterministic code. AI may
  *propose*; a deterministic gate (a rule or a student confirmation) *disposes*.
- **L2 — Derived state is never a source of truth.** Anything computable from
  the event log is either computed on read or materialised as an explicitly
  labelled, rebuildable cache with the input hash that produced it.

---

### B.1 Student Space

**Purpose.** The single authenticated container for one student: identity,
profile, goals, preferences, entitlement, and the root of all ownership.

**Responsibilities.** Own `student_id` as the partition key for every other
subsystem. Hold `StudentProfile` (board/grade/stream/target exam/subjects) as a
*server-authoritative* record. Expose one server-side `getStudentContext()` that
every other subsystem and every AI prompt reads from — replacing today's
client-supplied `params.grade`.

**Inputs.** Auth identity; onboarding answers; explicit profile edits; verified
academic activity (which may *propose* profile corrections, e.g. an inferred
subject list).

**Outputs.** `StudentContext` — a versioned, cacheable projection consumed by the
AI boundary, the Personal Model, Today, Home and Parent Space.

**Source of truth.** Postgres. `auth.users` for identity and entitlement
(`app_metadata.tier`, service-role-only — keep the existing `lib/tier.ts:30-36`
design verbatim). `students` + `student_profiles` for everything else.

**Persistence.** Relational. Profile changes are versioned (see `AuditEntry`),
because a board change retroactively reinterprets the record.

**Dependencies.** Auth only.

**Must NOT own.** Academic evidence. Scores. Layout. Any derived state.

**Deterministic vs AI.** Fully deterministic. AI may propose a profile field from
observed behaviour; it is written only as a *suggestion* the student accepts.

---

### B.2 Academic Event Layer

**Purpose.** The append-only spine. Every academically meaningful thing that
happens, in one canonical shape (Part D), forever.

**Responsibilities.** Accept events from tools, servers and background jobs;
validate against the contract; deduplicate by `client_event_id`; assign
server time; attach the active session; persist immutably; fan out to
subscribers (Session Engine, Mistake DNA, Personal Model, Score, Today).

**Inputs.** `AcademicEvent` envelopes from integrated tools (Part P), from the
Assessment Engine, from the Mistake Vault, and from the student's own
declarations.

**Outputs.** Durable ordered event stream per student; change notifications to
derived-state builders.

**Source of truth.** **This layer is the source of truth for the entire product.**
Every other academic fact is derivable from it.

**Persistence.** Append-only Postgres table, partitioned by month, with
`UNIQUE(student_id, client_event_id)` for idempotency. No UPDATE policy, no
DELETE policy — the same asymmetry `007_mistakes.sql:335,346` already uses.
Retention and compaction rules in Part D.5.

**Dependencies.** Student Space (for `student_id`), Session Engine (for
`session_id` attachment — a circular-looking dependency resolved by the session
resolver being a *function of the event stream*, see B.3).

**Must NOT own.** Interpretation. Scoring. Concept identity. Presentation. An
event records *what happened*, never *what it means*.

**Deterministic vs AI.** 100% deterministic ingestion. AI never writes an event
directly; an AI-derived concept becomes an event only after a deterministic
confidence gate or a student confirmation, and the event records which.

---

### B.3 Study Session Engine

**Purpose.** Group events into the unit the student recognises — "a study
session" — and drive it to a verified conclusion. Full specification in Part E.

**Responsibilities.** Detect session start from qualifying activity; keep the
session open across tools, tabs, devices, reloads and days; accumulate detected
concepts; run the finish flow (review → confirm → assess); reach a terminal
state; emit session-level events.

**Inputs.** The event stream; explicit student actions (finish, add external
study, correct a detected concept); assessment results.

**Outputs.** `StudySession` rows, `SessionConcept` rows, session-scoped events
(`SESSION_STARTED`, `SESSION_FINISH_REQUESTED`, `SESSION_VERIFIED`, …), and the
accomplishment payload for the completion screen.

**Source of truth.** Session *state* is derived from the event stream and
materialised into a `study_sessions` row for query performance and locking. The
event stream wins on any disagreement; the row is rebuildable.

**Persistence.** Relational. One open session per student maximum, enforced by a
partial unique index `WHERE state NOT IN (terminal states)`.

**Dependencies.** Event Layer, Concept Model, Assessment Engine.

**Must NOT own.** Timers as truth (a session is not a stopwatch). Streaks.
Scoring. Punishment for abandonment.

**Deterministic vs AI.** Session lifecycle: deterministic. Concept *detection*
from unstructured activity and natural-language declarations: AI-proposed,
student-confirmed. Nothing enters `SessionConcept` as `confirmed` without a
deterministic trigger — either explicit student confirmation or a rule (e.g. an
exam-practice question tagged to a concept by the taxonomy is auto-confirmed
because the tagging is deterministic).

---

### B.4 Concept / Knowledge Model

**Purpose.** The shared vocabulary that makes memory possible. Without stable
concept identity, "when did I first study Torque?" is unanswerable.

**Responsibilities.** Maintain a curated, global concept tree
(`subject → chapter → topic → concept`) with board codes and exam weight;
resolve free text to concept IDs; hold aliases; version the taxonomy.

**Inputs.** Curated seed data (`lib/taxonomy/cbse-physics.ts` exists and is
tested); syllabus ingestion; AI-proposed new concepts routed to a review queue.

**Outputs.** `concept_id` resolution for events, sessions, assessments, mistakes,
coverage and search.

**Source of truth.** The `concepts` table from `007_mistakes.sql:34-53`. **Reuse
as-is.** Its RLS is already correct: globally readable, service-role writable
(`:322-324`) — the taxonomy is a company asset, not user data.

**Persistence.** Relational, versioned. Concepts are never hard-deleted (the
existing `ON DELETE RESTRICT` on `parent_id` already prevents it); they are
superseded, with a `merged_into` pointer so historical references stay resolvable.

**Dependencies.** None. This is a leaf dependency for everything else.

**Must NOT own.** Per-student state. Mastery. Difficulty for a given student.
Those belong to the Academic Record and Personal Model.

**Deterministic vs AI.** Resolution is deterministic (exact → alias → embedding
similarity above a threshold). AI may *propose* a new concept or an alias; a
human/curation step admits it. **An unresolved concept must be representable** —
`student_declared_text` with `concept_id = NULL` is a legal state, and the
system must not invent a match to avoid a null.

---

### B.5 Assessment Engine

**Purpose.** Turn confirmed study into verified evidence. Full specification in
Part F.

**Responsibilities.** Generate questions covering every confirmed concept;
adapt depth; evaluate answers; emit per-question events; log mistakes
immediately; produce an `Assessment` result; support "leave unverified" without
penalty.

**Inputs.** `SessionConcept[]` (confirmed), student level, `PersonalModel`
(preferred question types, historical difficulty), `MistakeDNA` (open patterns on
these concepts), concept metadata (exam weight, board).

**Outputs.** `Assessment`, `AssessmentQuestion[]`, `AssessmentAttempt[]`,
`LearningEvidence` rows, mistake occurrences, and the events
`ASSESSMENT_STARTED` / `QUESTION_*` / `ASSESSMENT_COMPLETED`.

**Source of truth.** The assessment record and its attempts. Once an attempt is
graded and the assessment is completed, both are immutable.

**Persistence.** Relational. Questions are persisted *with the generation
provenance* — model, prompt version, generation timestamp, and the
`generation_run_id` — so evidence can be re-audited if a model turns out to be
unreliable.

**Dependencies.** Concept Model, Personal Model, Mistake DNA, AI boundary.

**Must NOT own.** The score. The record of *what was studied* (that is the
Session). Coercion — a student may always exit.

**Deterministic vs AI.** **Split, and the split is the whole trick.**
AI generates candidate question *content*. Deterministic code owns: which
concepts must appear (coverage is a hard invariant, not a prompt instruction),
how many questions each gets, difficulty selection, ordering, the answer key
contract, grading of closed-form answers, and admission of a question into the
bank. See F.6 for how an AI-generated question becomes trustworthy evidence.

---

### B.6 Mistake DNA

**Purpose.** Turn individual wrong answers into a diagnosis. Full specification
in Part G.

**Responsibilities.** Detect a mistake from an event; normalise and classify it
(cognitive vs execution); deduplicate; merge into a leaf pattern; maintain
subject/global parent patterns; compute severity; drive the lifecycle; schedule
spaced retests; decide resolution from evidence.

**Inputs.** `QUESTION_WRONG` events with their evidence, concept, error
classification and confidence-before; retest results; time.

**Outputs.** `Mistake` (occurrence) rows, `MistakePattern` rows, severity
rankings, retest schedule entries, and the events `MISTAKE_DETECTED` /
`_CORRECTED` / `_RETESTED` / `_RESOLVED`.

**Source of truth.** `occurrences` (immutable facts) and `patterns` (revisable
inferences) from `007_mistakes.sql`. **Reuse the schema.** Reuse
`lib/mistakes/engine.ts` as the pure domain core, unmodified.

**Persistence.** Exactly as `007` already specifies: occurrences and evidence
append-only with no UPDATE/DELETE policy; patterns revisable but with `resolved`
unreachable by the student at the RLS layer.

**Dependencies.** Event Layer, Concept Model, Assessment Engine, Personal Model
(for choosing a correction method).

**Must NOT own.** The score (it supplies inputs). Punishment. Deletion of
evidence. Self-reported mastery.

**Deterministic vs AI.** Merge, severity, lifecycle transitions, resolution
proof: **100% deterministic** — `lib/mistakes/engine.ts` is already pure and
tested. AI may propose the *error classification* of a free-text answer and may
generate the *explanation* and the retest question. Classification is a
proposal the student can correct; if AI and student disagree, the student's
classification is recorded and the AI's is retained as a signal, not overwritten.

---

### B.7 Mistake Vault

**Purpose.** The destination. Where a student goes to see and work through what
they got wrong.

**Responsibilities.** Present patterns (not 340 raw wrong answers) ranked by
severity; show the evidence trail behind each; offer a correction path chosen by
the Personal Model with an override; track "faced" vs "avoided"; surface due
retests; show resolved and historical items without hiding them.

**Inputs.** Patterns, occurrences, evidence, retest schedule, Personal Model
preferences.

**Outputs.** Vault view models; student actions (`acknowledge`, `start
practising`, `override method`, `dispute classification`) as events.

**Source of truth.** Mistake DNA. The Vault owns **presentation state only** —
filters, sort, last-viewed — and that state is a *preference*, not a record.

**Persistence.** No academic persistence of its own. Presentation state in the
Customisation Engine.

**Dependencies.** Mistake DNA, Personal Model, Assessment Engine (for retests).

**Must NOT own.** Resolution. Deletion. Any write to `occurrences`.

**Deterministic vs AI.** Ranking and eligibility: deterministic. Explanations,
worked corrections and analogies: AI, generated on demand, never stored as
evidence.

---

### B.8 Academic Memory

**Purpose.** Make the compounding record legible and queryable. Full
specification in Part H.

**Responsibilities.** Maintain the five-layer separation (raw evidence / derived
academic state / historical snapshots / current state / presentation state);
index for search; answer structured and natural-language queries; serve
historical comparisons; serve concept, mistake and score history.

**Inputs.** The entire event stream plus every derived table.

**Outputs.** `AcademicRecord` projections; search results with citations back to
source events; timeline views; comparison reports.

**Source of truth.** Delegates. Memory *never* holds a fact that is not derivable
from the event stream or a raw-evidence table.

**Persistence.** Materialised projections + a search index (Postgres FTS +
`pgvector` for semantic concept search — justified because the stack is already
Postgres and adding a second datastore for this would be unwarranted).

**Dependencies.** Event Layer, Concept Model, all derived-state builders.

**Must NOT own.** Any primary fact.

**Deterministic vs AI.** Retrieval, filtering, aggregation, comparison:
deterministic. AI's only role is **question → structured query** translation and
**results → prose** summarisation, and every prose answer must carry the
underlying record IDs so it can be checked. AI never answers a memory question
from the model's own recall.

---

### B.9 Personal Model

**Purpose.** Learn how this student learns. Full specification in Part I.

**Responsibilities.** Ingest behavioural signals; maintain explicit preferences
separately from inferred ones; attach confidence, evidence count and recency to
every inference; decay stale inferences; resolve conflicts in favour of explicit
preference; expose a stable read API to the AI boundary, Assessment, Mistake
Vault, Recommendations and Today.

**Inputs.** Events (which explanations were re-read, which formats were
abandoned, which interventions preceded resolution), explicit settings, onboarding
answers, assessment performance by question type and difficulty.

**Outputs.** `PersonalModel` — a bounded, human-readable set of typed
dimensions, each with `{value, source: explicit|inferred, confidence, evidenceCount, lastUpdated}`.

**Source of truth.** `personal_model_signals` (append-only, raw) is truth;
`personal_model` (current) is a rebuildable projection.

**Persistence.** Signals append-only; the projection recomputed on a schedule and
on demand.

**Dependencies.** Event Layer.

**Must NOT own.** Academic truth. Scores. Anything the student cannot see and
override. **Every inference must be inspectable and reversible** — Constitution
§27, "predictions, not prisons."

**Deterministic vs AI.** Signal extraction and aggregation: deterministic. AI may
propose a *new dimension* worth tracking, which is a code change, not a runtime
write. No AI writes to the model.

---

### B.10 Ledger Score

**Purpose.** One 0–1000 figure describing academic state and trajectory, with
confidence. Full specification in Part J.

**Responsibilities.** Compute dimensions from evidence; establish a baseline from
real activity; express confidence; produce trajectory; snapshot daily; explain
every movement; refuse to move on non-evidence.

**Inputs.** Derived academic state only — never raw localStorage, never
client-supplied numbers.

**Outputs.** `ScoreSnapshot` (total, dimensions, confidence, evidence counts,
formula version), movement commentary, and per-dimension explanations.

**Source of truth.** The **server**, computed from the event-derived record.
Client display is a cache with a staleness marker.

**Persistence.** `score_snapshots`, append-only, one per student per day, plus
on-demand recomputation. Keep `005_score_history.sql`'s design — `UNIQUE(user_id,
captured_on)`, SELECT-own RLS, no client write policy — but generalise the
column set and add `formula_version` and `confidence`.

**Dependencies.** Academic Record, Mistake DNA, Assessment Engine, Session Engine.

**Must NOT own.** Evidence. Recommendations. Notifications. **And it must never
be computable on the client**, because a client-computed score is a
client-forgeable score.

**Deterministic vs AI.** 100% deterministic, versioned, and reproducible from a
snapshot's stored inputs. AI may write the *commentary*, never the number.

---

### B.11 Recommendation Engine

**Purpose.** Decide the single next best action, and explain it. Full
specification in Part K.

**Responsibilities.** Enumerate candidates from every subsystem; score them by
expected academic benefit (not by score points); apply gating rules
(never gate, only guide); dedupe; persist; track dismissal, ignoring, escalation
and outcome; decay.

**Inputs.** Session state, open mistakes and due retests, coverage gaps, upcoming
goals/exams, Personal Model, prior recommendation outcomes, current context
(time of day, device, whether a session is open).

**Outputs.** `Recommendation` rows with `reason`, `evidence_refs[]`, `priority`,
`expires_at`; the single `nextBestAction` for Today and the session-completion
screen.

**Source of truth.** Its own table, but every recommendation must carry
`evidence_refs` pointing at the records that justify it. **A recommendation with
no evidence reference is a bug.**

**Persistence.** Relational, with `RecommendationOutcome` closing the loop so the
engine can learn which interventions work for this student.

**Dependencies.** Almost everything. This is the top of the read graph.

**Must NOT own.** Any write to the academic record. Any hard gate. Score
promises — a recommendation may state expected benefit **only if the mechanism
that delivers it exists and is reachable** (the lesson of A.7.3).

**Deterministic vs AI.** Candidate generation and priority: deterministic and
explainable. AI may rewrite the *phrasing* to match communication tone. AI may
not add, remove or reorder candidates.

---

### B.12 Today Engine

**Purpose.** A continuously updating answer to "what matters right now."
Full specification in Part L.

**Responsibilities.** Assemble current academic state, what changed since last
visit, recent accomplishments, important follow-ups (due retests, unverified
sessions), upcoming priorities, and the next best action. Recompute on every
relevant event. **Emit nothing when there is nothing.**

**Inputs.** Score + movement, sessions (open and recently completed), due
retests, upcoming goals, recommendations, ignored-recommendation history,
last-visit timestamp.

**Outputs.** `TodayState` — an ordered list of typed, evidence-backed items with
importance levels.

**Source of truth.** Fully derived. Never stored as truth; cached with an input
hash and invalidated by events.

**Persistence.** Cache only. `last_seen_at` per student is the one durable field
Today needs.

**Dependencies.** Score, Sessions, Mistake DNA, Recommendations, Goals.

**Must NOT own.** Tasks. Streaks. A timetable. **It must not manufacture an item
to fill space** — an empty Today is a valid and honest Today (Constitution §28).

**Deterministic vs AI.** Selection and ordering: deterministic. AI may summarise
"what changed" into one sentence from the deterministic diff.

---

### B.13 Home Composition System

**Purpose.** Home as a personal workspace: system intelligence proposes,
the student arranges. Full specification in Part M.

**Responsibilities.** Maintain a component registry with declared data
dependencies, size constraints and importance-capability; hold the student's
layout; merge system importance signals with student layout; handle critical
override; degrade to a sensible order on mobile.

**Inputs.** Component registry; `HomeLayout` (student-owned); importance signals
from Today/Score/Mistake DNA; viewport class.

**Outputs.** A resolved, ordered, sized component list.

**Source of truth.** The student, for layout. The system, for importance.
Neither may silently overwrite the other — see M.5 for the exact precedence.

**Persistence.** `HomeLayout` is a synced, server-persisted student preference
(unlike today's unsynced `ledger-dash-layout`).

**Dependencies.** Customisation Engine, Today, Score.

**Must NOT own.** Data. Visual styling. Any academic decision.

**Deterministic vs AI.** Fully deterministic.

---

### B.14 Customisation Engine

**Purpose.** Constitution §5 — the student should eventually be able to customise
essentially everything — implemented so that it cannot break legibility or
rewrite academic truth (§6).

**Responsibilities.** Define the preference space as typed *choices* (never
computed values); validate every value at the boundary; derive presentation
tokens purely; persist server-side per student; sync across devices; expose
defaults; guarantee that no combination is illegible or unusable.

**Inputs.** Explicit student choices; Personal Model suggestions (offered, never
applied silently).

**Outputs.** Derived design tokens; layout/density/navigation configuration;
academic-experience preferences (explanation style, difficulty preference, quiz
intensity, notification policy, recommendation aggressiveness, parent-sharing
policy pointer).

**Source of truth.** A server-side `student_preferences` table, one row per
student, JSONB payload with a schema version. **Choices only** — the
`lib/console/workspace.ts:312-315` principle generalised: storing choices rather
than derived values means every future improvement to the derivation upgrades
every existing student retroactively and for free.

**Persistence.** Postgres, synced, versioned, exportable.

**Dependencies.** Student Space.

**Must NOT own.** Academic records. Score. Anything under §6 — **a preference may
change how a fact is presented and may never change the fact.** Difficulty
preference influences question *selection*; it must not influence *grading*, and
the score must be comparable across students with different preferences.

**Deterministic vs AI.** Fully deterministic. `derive()` in
`lib/console/workspace.ts` is the model implementation and should be generalised,
not replaced: pure, browser-free, contrast-guaranteed by construction, hostile-input
tolerant (`parseDNA`), and floor-bound on touch targets.

---

### B.15 Parent Space

**Purpose.** A separate experience for a parent, showing only what the student has
chosen to share.

**Responsibilities.** Parent identity and authentication; connection to a
student; a parent-scoped read API; report generation and scheduled delivery;
access logging.

**Inputs.** `ParentConnection`, `ParentSharePolicy`, the student's derived
academic state.

**Outputs.** Parent dashboard payloads, weekly digests, risk alerts.

**Source of truth.** The student's record, filtered through the share policy at
the **server**. Filtering must happen before serialisation, never in the parent
client.

**Persistence.** `parent_connections`, `parent_share_policies`,
`parent_access_log`.

**Dependencies.** Parent Sharing (B.16), Score, Academic Record.

**Must NOT own.** Any write to the academic record. Any ability to see raw
answers, mistake text or evidence images unless explicitly shared. Any ability to
act on the student's behalf.

**Deterministic vs AI.** Data selection: deterministic and policy-driven. AI may
write the narrative paragraph in a report, from the already-filtered data only.

---

### B.16 Parent Sharing / Permissions

**Purpose.** The student controls what parents see **within a boundary the
student cannot move**; truth is not customisable.
`PRODUCT_PRINCIPLES.md` §3.4 and `PRODUCT_DECISIONS.md` §9.2 (ratified
2026-08-10, Option B). *(The brief cited "Constitution §32", which is weaker than
the ratified principle — T-0.1, resolved in favour of the principle.)*

**Responsibilities.** Define the three-level model. **`Private` is a structural
class, not a default setting** — see N.4 for the authoritative membership list;
this is the summary.

- **Private** — never leaves the student, at **any** setting. Raw answers,
  evidence images, marker notes, **individual mistake occurrences and their
  marks lost**, **per-topic miss counts**, **mistake history**,
  **question-by-question outcomes**, open/unresolved patterns, mistake
  free-text, session notes, AI conversations. **Not shareable at all**, by
  design, not by default, and with no toggle that can expose them.
- **Shared** — student-toggleable per category: score + trajectory, subject-level
  coverage counts, concept coverage, continuity of verification, **counts** of
  patterns being worked and closed, assessment *volume*, upcoming exams.
  **`weak areas` and `assessment summaries with outcomes` are NOT in this list**
  — they were in the brief and are ineligible under §3.4 (N.4.a).
- **System** — always visible to a connected parent because the connection would
  be meaningless otherwise: that an account exists, that a connection is active,
  when it was last updated, and safety-relevant signals as defined by policy.

Enforce policy server-side; version every policy change; log every parent read;
support instant revocation.

**Inputs.** Student policy edits; connection lifecycle events.

**Outputs.** An effective-policy object consumed by Parent Space; audit entries.

**Source of truth.** `parent_share_policies`, versioned. **The current policy is
whatever the most recent version says; historical reports record the policy
version they were generated under**, so a parent cannot later claim a report was
authorised at a level it was not.

**Persistence.** Relational, append-only version chain.

**Dependencies.** Student Space.

**Must NOT own.** The data. The presentation. Any default that shares more than
the student chose. **Revocation must be immediate and must invalidate outstanding
links.**

**Deterministic vs AI.** Fully deterministic. AI has no role and must never be in
the permission path.

---

### B.17 Academic Search

**Purpose.** Constitution §25 — the explorable archive.

**Responsibilities.** Index concepts, sessions, assessments, mistakes, evidence
metadata and declarations; support structured filters (subject, concept, date
range, verified/declared, outcome) and free-text/semantic search; translate
natural-language questions into structured queries; always return citations.

**Inputs.** The record. A query.

**Outputs.** Ranked results, each with the record type, ID, timestamp and the
event(s) that produced it.

**Source of truth.** The indexed records. The index is rebuildable from them.

**Persistence.** Postgres FTS (`tsvector`) for lexical; `pgvector` embeddings on
concept and declaration text for semantic. No new datastore.

**Dependencies.** Academic Memory, Concept Model.

**Must NOT own.** Any fact. Any generated answer presented as a fact.

**Deterministic vs AI.** **The critical boundary.** AI translates the question
into a *structured query object* (a constrained, validated schema — not SQL).
Deterministic code executes it. AI then narrates the returned rows. If the query
returns nothing, the answer is "no record found," never a plausible fabrication.
Every NL answer renders its citations.

---

### B.18 Notification / Proactive Intelligence

**Purpose.** Reach the student when it matters, and stay silent otherwise.

**Responsibilities.** Generate candidates from real signals; dedupe by semantic
key; respect quiet hours and chronotype windows; cap volume; escalate by
importance tier (Constitution §30); deliver across channels (in-app surfacing,
push, email); record delivery and response.

**Inputs.** Recommendations, due retests, score movement, upcoming goals, session
state (e.g. an unverified session from yesterday), student notification
preferences.

**Outputs.** Delivered notifications; response events feeding
`RecommendationOutcome`.

**Source of truth.** Its own delivery ledger, **server-side** — not
`user_data.notifState` in a student-writable row (Finding A.5.e).

**Persistence.** `notification_log` with the semantic key, channel, sent time,
opened/actioned time. Retain the pure-decision-engine shape of
`lib/notifications.ts` — it is already the right architecture.

**Dependencies.** Recommendations, Score, Sessions, Preferences.

**Must NOT own.** Fabricated urgency. Streak-loss guilt as a primary mechanic.
Any claim about score movement it cannot verify is achievable.

**Deterministic vs AI.** Decisions: deterministic (keep `lib/notifications.ts`'s
design). Copy: AI may adapt tone within a fixed factual template.

---

### B.19 Data Ownership / Export / Correction

**Purpose.** Constitution §26 and §35.

**Responsibilities.** Full export in a machine-readable, self-describing format;
in-place correction where legitimate; a dispute flow where correction would
rewrite verified evidence; deletion with clearly-stated consequences; a complete
audit trail of every correction and deletion.

**Inputs.** Student requests.

**Outputs.** Export bundles; `CorrectionRequest` records; `AuditEntry` records;
deletion receipts.

**Source of truth.** The audit log is itself append-only and is the source of
truth for *what was changed and by whom*.

**Persistence.** `correction_requests`, `audit_entries` — both append-only.

**Dependencies.** Every subsystem must expose an export projection and declare
its correction class (Part O).

**Must NOT own.** Silent rewriting of verified evidence. Cascade deletion that
leaves derived state inconsistent without recomputation.

**Deterministic vs AI.** Fully deterministic. AI may help the student *phrase* a
dispute; it may not adjudicate one.

---

### B.20 AI Boundary

**Purpose.** One controlled surface between the deterministic product and the
model. Full specification in Part Q.

**Responsibilities.** Own every model call. Assemble context from
server-authoritative sources (never client-supplied profile). Enforce
per-capability schemas on both input and output. Validate and repair output;
reject on failure rather than degrade. Apply moderation. Meter and rate-limit.
Log every call with prompt version, model, tokens and outcome. Version prompts so
generated artefacts remain attributable.

**Inputs.** A typed `AICapabilityRequest` — capability name, student context ref,
typed payload.

**Outputs.** A typed, schema-validated result, or a typed failure.

**Source of truth.** Nothing. The AI boundary is stateless with respect to the
academic record; it only writes to `ai_invocations` (its own log).

**Persistence.** `ai_invocations` — capability, prompt version, model, input hash,
output hash, latency, tokens, moderation verdict, outcome. This replaces and
generalises today's `ai_history`.

**Dependencies.** Student Space, Personal Model, moderation.

**Must NOT own.** Records, scores, assessment results, permissions, entitlement,
history. **It must not be the only validator of its own output.**

**Deterministic vs AI.** The boundary itself is deterministic. Keep from today:
the two-layer moderation, the strike system, the atomic `consume_ai_call()`
meter, server-side tier enforcement, and per-field input size caps. Replace: the
2,726-line prompt `switch`, the client-supplied personalisation, the greedy
JSON-brace regex, and the hardcoded model constant.

## GOVERNANCE NOTE — READ BEFORE PART C

Parts A and B cite a numbered **"Constitution"** (§4–6, §14, §15, §19, §25–36).
**That document does not exist in this repository.** Verified: `docs/archive/PRODUCT_CONSTITUTION.md`
is 419 lines organised as `PART 1…PART 10`, with no `§4`/`§36`-style numbering,
and a repo-wide grep for `"fabricated-progress"` returns exactly one hit — line
601 of *this* file. **CURRENT FACT.**

The governing law is `CLAUDE.md`'s four-document hierarchy:
`PRODUCT_PRINCIPLES.md` > `PRODUCT_DECISIONS.md` > `EXECUTION_PLAN.md`.
`PRODUCT_CONSTITUTION.md` is explicitly **archived and frozen** (`CLAUDE.md`,
"Other files"), absorbed into `PRODUCT_PRINCIPLES.md` by the 2026-08-05
"Governance restructured to four documents" amendment (`PRODUCT_PRINCIPLES.md:408-412`).

Parts C–W below therefore cite the **real** governing sections and give the
brief's Constitution reference in brackets where one was supplied, e.g.
`PRINCIPLES §3.1 [brief: Constitution §14]`. The mapping table:

| Brief's citation | Real governing statement | Location |
|---|---|---|
| §4–6 student sovereignty / truth | "Never lie" (Law 7); §3.1–3.3 the record | `PRODUCT_PRINCIPLES.md:82,96-121` |
| §10–13 external study | §3.5 **learning is not confined to this product** — *"student-declared evidence → assessment → verified academic evidence"*. **GAP CLOSED 2026-08-10** | `PRODUCT_PRINCIPLES.md` §3.5; `PRODUCT_DECISIONS.md` §9.1 |
| §14 assessment coverage | §3.1 "only evidence resolves a gap" | `PRODUCT_PRINCIPLES.md:96-104` |
| §15 immediate mistake logging | §3.2 "no claim without proof" | `PRODUCT_PRINCIPLES.md:106-112` |
| §19 accomplishment | §7.1 "the Return beat is EVIDENCE, not celebration" | `PRODUCT_PRINCIPLES.md:281-284` |
| §25–26 archive / ownership | DECISIONS §2.1 RECORD surface | `PRODUCT_DECISIONS.md:113-127` |
| §27 "predictions, not prisons" | §10 anti-goals, "a mirror that flatters is worthless" | `PRODUCT_PRINCIPLES.md:355-368` |
| §28 honest empty state | Law 7 + §7.2 "an honest empty state beats a fake number" | `PRODUCT_PRINCIPLES.md:82-83,288` |
| §30 four-tier surfacing | *No governing statement exists.* **GAP** | — |
| §31–32 parent control | §3.4 **the parent boundary** — *stricter than the brief* | `PRODUCT_PRINCIPLES.md:123-130` |
| §34 AI not source of truth | §3.1 + §3.2 | `PRODUCT_PRINCIPLES.md:96-112` |
| §35 data ownership | *No governing statement exists.* **GAP** | — |
| §36 no fabricated progress | Law 7 "Never lie" + §10 | `PRODUCT_PRINCIPLES.md:82-83` |

**Three tensions are recorded now and carried through every part below. T-0.1 and
T-0.2 were resolved by ratification on 2026-08-10 and are retained with their
resolutions stated inline; T-0.3 remains a live design constraint.**

**T-0.1 — The brief's parent model is weaker than the ratified principle.
RESOLVED 2026-08-10 in favour of the principle.**
The brief asks for "student-controlled sharing" with a `Shared` tier that can
include *weak areas*. `PRODUCT_PRINCIPLES.md:125` states: *"Parents see what
their child is **fixing**, never what their child **got wrong**… enforced at the
data layer, not in copy — the interface must be **unable** to expose it."*
Under the ratified principle, "what you got wrong" is **not student-toggleable**;
it is structurally unshareable. Part N implements the **stricter** rule and flags
where the brief diverges. **Ratified 2026-08-10 (`PRODUCT_DECISIONS.md` §9.2):
Option B — structural privacy. Individual mistake evidence is `Private` at every
setting and is not reachable by any sharing toggle. The amendment to §3.4 that
the brief's model would have required was considered and refused. No founder
decision remains outstanding; Part N's stricter reading is now the law it cites.**

**T-0.2 — Streaks are banned; two shipped subsystems depend on them.
RESOLVED 2026-08-10 — the streak leaves scoring entirely.**
`PRODUCT_PRINCIPLES.md:151-153`: *"Streaks are never shipped. One missed day
converts a motivator into shame."* Yet `lib/ledger-score.ts:218` makes streak
**15% of the Ledger Score** (`consistencyScore = min(150, streak × 7.5)`),
`lib/notifications.ts` ships streak-at-risk pushes, and
`lib/parent-digest.ts:90` emails a parent *"their N-day streak is at risk."*
**CURRENT FACT — three live violations of a permanent ban.** Part J removes the
streak dimension outright rather than renaming it.

**Ratified 2026-08-10 (`PRODUCT_DECISIONS.md` §9.3):** no consecutive-day
mechanic is a core academic scoring input. The replacement concept is
**Continuity** — sustained *verified* academic engagement over a rolling window.
The shipped streak implementation is classified **REBUILD / REMOVE FROM SCORING**
by subsystem (Parts S and W); **renaming the streak variable is explicitly not an
implementation of this decision.** Continuity may never be rendered as a counter,
a cliff, a guilt mechanism or a "you broke your streak" notification — a student
must be able to miss a day without the record moving against them.

**T-0.3 — "We do not teach" constrains the Assessment Engine.**
`PRODUCT_PRINCIPLES.md:56-62`: *"Explanation is not our business… This is the
principle that keeps us out of a fight we cannot win."* The brief's Part F
(assessment), Part G (correction paths) and Part K (remediation) are legal only
in their **diagnostic** capacity: generating questions to *test* whether a gap
closed is measurement, not teaching. Generating the *explanation* is teaching.
Parts F/G/K below draw that line explicitly at every point where it matters.

---

## PART C — DATA MODEL

### C.1 The blob verdict: REBUILD the record, KEEP the blob as a legacy shim

**CURRENT FACT.** The academic record today is `user_data.blob JSONB` — a flat
`Record<string, string>` of 20 raw, unparsed `localStorage` strings, defined
by `SYNC_KEYS` at `lib/sync.ts:4-26` (re-read and confirmed verbatim). Writes
are a wholesale `upsert` of the entire blob (`lib/sync.ts:40-48`); reads merge
key-by-key with the rule `if (!local || value.length > local.length)`
(`lib/sync.ts:67`).

**The blob cannot support the target model, and the reason is structural, not
aesthetic.** Four independent proofs, each verified:

1. **No identity.** The target model needs stable IDs on `AcademicEvent`,
   `StudySession`, `Assessment`, `Mistake`, `Concept` so that a mistake in 2028
   can cite the 2026 event that created it. A blob value is a JSON string with
   no key space, no uniqueness constraint, no foreign key. `occurrences.evidence_id
   UUID NOT NULL REFERENCES evidence(id) ON DELETE RESTRICT`
   (`007_mistakes.sql:229`) is exactly the guarantee the blob cannot express.
2. **No append-only guarantee.** `007_mistakes.sql:335,346` achieves
   immutability by *omitting* UPDATE and DELETE policies. The blob has a single
   `user_data_update_own` UPDATE policy (`000_initial_schema.sql:142`) covering
   everything at once. `app/tools/post-exam/page.tsx:140` proves the
   consequence: `localStorage.removeItem("ledger-mistakes")` on one unconfirmed
   click, propagated to the cloud within 15 seconds.
3. **Merge is lossy by construction.** `value.length > local.length` is not a
   conflict-resolution strategy; it is a heuristic that resurrects deleted rows
   and discards shortened edits. An event log requires *union*, which requires
   per-item identity, which returns us to (1).
4. **Unbounded growth in a single row.** One student's event stream over four
   school years is plausibly 10⁵–10⁶ events. That is a multi-megabyte JSONB
   value rewritten in full every 15 seconds by `SyncManager`
   (`components/sync-manager.tsx:7,42-45`). **UNVERIFIABLE:** current production
   blob sizes.

**TARGET DESIGN — the verdict.** Relational tables for everything in C.2–C.4,
in Postgres, following the schema idiom `007_mistakes.sql` already established.
This is **not** a "full relational rewrite" of the app: 26 of 46 tools persist
nothing at all today (Finding A.3.c), so there is very little to rewrite. What
changes is where the *five* evidence-producing paths write.

**The blob is retained, read-only, under one name: `legacy_blob`.** It becomes
an immutable import artefact — the source for a one-time backfill and a
permanent forensic record of what the student had before migration. It stops
being written the moment the event layer ships. This mirrors the convention
`lib/mistakes/migrate-legacy.ts:1-23` already ships: *"legacy rows are PRESERVED
and MARKED, never promoted."* **KEEP the data, RETIRE the mechanism.**

**ARCHITECTURAL INFERENCE.** Preferences are the one class that may stay
JSONB — `student_preferences.payload JSONB` with a `schema_version`, per B.14.
Preferences have no history requirement, no cross-referencing, no immutability
requirement, and one writer. The blob failed as a *record*; it is adequate as a
*settings bag*.

### C.2 Entity catalogue — raw evidence

Entities in this class are **facts**. They are append-only, never updated,
never deleted, and every derived value in the product must be recomputable
from them alone.

---

**`Student`** · *raw evidence (identity)*

- **Identity:** `student_id UUID PRIMARY KEY REFERENCES auth.users(id)`.
- **Key fields:** `created_at`, `deleted_at NULL`, `data_region`.
- **Relationships:** partition key of every other student-scoped table.
- **Lifecycle:** created at first sign-in → active → soft-deleted (Part O.5).
- **Immutability:** `student_id` never changes. Deletion is a tombstone plus
  cascade, never an in-place edit.
- **Note (CURRENT FACT):** entitlement lives in `auth.users.app_metadata.tier`,
  deliberately outside the student-writable row — `lib/tier.ts:30-36`. **Keep
  verbatim.**

---

**`AcademicEvent`** · *raw evidence — the spine*

- **Identity:** `event_id UUID`; plus `UNIQUE(student_id, client_event_id)` for
  idempotent retry.
- **Key fields:** full contract in Part D.
- **Relationships:** `→ Student`, `→ StudySession` (nullable), `→ Concept`
  (nullable), `→ Assessment` (nullable), `→ Evidence` (nullable).
- **Lifecycle:** written once. Never updated. Compacted per D.5, never edited.
- **Immutability:** absolute. No UPDATE policy, no DELETE policy. A correction
  is a **new** event of type `EVENT_SUPERSEDED` carrying `supersedes_event_id` —
  the same pattern `occurrences.supersedes` (`007_mistakes.sql:275`) already uses.
- **Class:** raw evidence. **Everything else in the product is a projection of
  this table.**

---

**`Evidence` (`LearningEvidence`)** · *raw evidence*

- **Identity:** `evidence_id UUID`; `UNIQUE(student_id, content_hash)`.
- **Key fields:** `type ∈ {photo,pdf,manual,assessment_attempt,declaration}`,
  `storage_ref`, `content_hash`, `crop_regions JSONB`, `captured_at`,
  `source_description`, `verified_by ∈ {ai,student,both}`.
- **CURRENT FACT — this table already exists**, `007_mistakes.sql:66-89`, with
  SELECT+INSERT policies and no UPDATE/DELETE (`:335`). **KEEP UNCHANGED**, and
  extend the `type` CHECK by two values so an assessment attempt and a student
  declaration are first-class evidence rather than second-class exceptions.
- **Lifecycle:** created → referenced → never deleted while referenced
  (`ON DELETE RESTRICT` at `007_mistakes.sql:229`).
- **Class:** raw evidence. **The trust anchor of the whole record.**

---

**`AssessmentAttempt`** · *raw evidence*

- **Identity:** `attempt_id UUID`; `UNIQUE(assessment_id, question_id, attempt_no)`.
- **Key fields:** `assessment_id`, `question_id`, `attempt_no SMALLINT`,
  `student_answer JSONB` (reuse the `{kind:'text'|'crop'}` union from
  `lib/mistakes/types.ts:158-160`), `confidence_before SMALLINT 0..3`,
  `is_correct BOOLEAN`, `grader ∈ {deterministic, ai_proposed_student_confirmed,
  student_self_marked}`, `graded_at`, `time_ms`.
- **Relationships:** `→ Assessment`, `→ AssessmentQuestion`, `→ Concept`,
  produces `→ Evidence` (one evidence row per completed assessment).
- **Lifecycle:** created on submit → graded → frozen at
  `ASSESSMENT_COMPLETED`. A dispute appends a superseding attempt; it never
  edits the original.
- **Class:** raw evidence.

---

**`Mistake` (occurrence)** · *raw evidence*

- **CURRENT FACT — exists as `occurrences`**, `007_mistakes.sql:222-303`, with
  four schema-enforced invariants re-verified this pass: `evidence_id NOT NULL
  … ON DELETE RESTRICT` (`:229`), `occurrences_has_error CHECK` (`:283-285`),
  the composite `occurrences_pattern_is_leaf` FK pinned by `pattern_tier
  CHECK (pattern_tier = 'concept')` (`:272-273, 296-298`), and no
  UPDATE/DELETE policy (`:346`).
- **TARGET DESIGN — one required change.** `occurrences.source` is
  `CHECK (source IN ('board-exam','school-exam','mock','coaching-test',
  'homework','past-paper','self-test'))` (`:232-234`). The target adds
  `'in-session-assessment'` — the Assessment Engine's output does not fit any
  existing value, and mislabelling it `'self-test'` would corrupt severity
  weighting. **Additive; no data migration.**
- **Class:** raw evidence.

---

**`AcademicHistoryEntry`** · *raw evidence (student-declared)*

- **Identity:** `history_entry_id UUID`.
- **Purpose:** the student's account of learning that happened **before**
  StudyLedger, or **outside** it in a form that produced no artefact — prior
  marks, a tuition syllabus, "I did this chapter in class last term."
- **Key fields:** `declared_at`, `period_start`, `period_end`, `subject`,
  `concept_id NULL`, `declared_text`, `claimed_outcome`, `corroborated_by
  UUID[] → Evidence`.
- **Immutability:** append-only. A retraction is a superseding entry.
- **Class:** raw evidence, **flagged `student_declared`, never `verified`.**
  Critical: a declaration is evidence *that a claim was made*, not evidence
  *that the claim is true*. `PRODUCT_PRINCIPLES.md:106-112`. It may open a
  session and it may earn assessment coverage; it may **never** move a score
  dimension on its own.

---

**`PersonalModelSignal`** · *raw evidence*

- **Identity:** `signal_id UUID`.
- **Key fields:** `student_id`, `dimension`, `observed_value`, `weight`,
  `source_event_id → AcademicEvent`, `observed_at`.
- **Immutability:** append-only. Decay is applied at *read* time (Part I.5), so
  no row is ever rewritten to age it.
- **Class:** raw evidence.

---

**`AuditEntry`** · *raw evidence*

- **Identity:** `audit_id UUID`, monotonic `seq BIGSERIAL`.
- **Key fields:** `actor ∈ {student, system, service_role, parent}`, `action`,
  `target_table`, `target_id`, `before_hash`, `after_hash`, `reason`, `at`,
  `policy_version`.
- **Immutability:** absolute, and this table is the reason the others can be
  trusted. Service-role INSERT only; student SELECT-own; **no UPDATE, no DELETE,
  for anyone including the service role** (enforced by policy omission plus a
  `REVOKE DELETE` grant).
- **Class:** raw evidence about the system itself.

---

**`CorrectionRequest`** · *raw evidence*

- **Identity:** `request_id UUID`.
- **Key fields:** `target_type`, `target_id`, `claim`, `student_reason`,
  `state ∈ {submitted, accepted, rejected, partially_accepted}`,
  `resolution_note`, `resolved_by`, `resolved_at`, `resulting_event_ids UUID[]`.
- **Lifecycle:** Part O.3.
- **Class:** raw evidence.

---

### C.3 Entity catalogue — derived academic state

Entities in this class are **inferences**. They are revisable, recomputable,
and each carries the identity of the inputs that produced it so a stale one is
detectable rather than merely wrong.

---

**`StudentProfile`** · *derived + explicit, versioned*

- **Identity:** `(student_id, version)` — append-only version chain, `is_current`
  partial unique index.
- **Key fields:** `board`, `grade`, `stream`, `target_exam`, `subjects TEXT[]`,
  `interests TEXT[]`, `effective_from`, `changed_by`, `change_reason`.
- **Why versioned:** a board change retroactively reinterprets every prior
  event. Without a version chain, a student who switches CBSE→IB in Grade 11
  silently rewrites the meaning of their Grade 10 record.
- **CURRENT FACT — the failure to fix.** Profile lives in 18 flat `user_data`
  columns *and* in `localStorage["ledger-profile"]`, and
  `lib/user-data.ts:123` returns `{ ...(data as UserData), ...localProfile }` —
  **localStorage wins over Postgres.** Re-verified this pass. This is why
  `buildProfileContext` receives client-supplied values (Finding A.6.b).
- **Class:** explicit student input + derived proposals, never mixed in one field.

---

**`AcademicGoal`** · *derived from student input*

- **Identity:** `goal_id UUID`.
- **Key fields:** `kind ∈ {exam, target_mark, coverage, concept_mastery}`,
  `subject`, `concept_id NULL`, `target_date`, `target_value`, `state ∈
  {active, met, missed, abandoned}`, `set_at`.
- **Lifecycle:** set → active → resolved by evidence, or by date passing.
- **Non-punitive rule (TARGET DESIGN):** a missed goal is recorded as `missed`
  and **never** surfaces as a judgement — `PRODUCT_PRINCIPLES.md:134-141`,
  *"State facts; offer the next move; never judge."*
- **Class:** derived state.

---

**`Concept`** · *reference data, not student data*

- **CURRENT FACT — exists**, `007_mistakes.sql:34-53`; globally readable by
  `authenticated`, service-role writable (`:322-324`); `parent_id … ON DELETE
  RESTRICT` so concepts cannot be orphaned.
- **TARGET DESIGN — two additive columns:** `merged_into UUID REFERENCES
  concepts(id)` so a superseded concept's historical references stay resolvable,
  and `taxonomy_version INT` so a re-cut of the tree is detectable.
- **Class:** company reference asset. **Not** student data; excluded from
  student export bodies (Part O.1) but *referenced by ID and label*.

---

**`StudySession`** · *derived state, materialised*

- **Identity:** `session_id UUID`. **Partial unique index enforcing at most one
  live session per student:** `UNIQUE(student_id) WHERE state NOT IN
  ('completed_unverified','verified','abandoned')`.
- **Key fields:** `state` (Part E.2), `opened_at`, `last_activity_at`,
  `finish_requested_at`, `closed_at`, `origin ∈ {tool_activity, declaration,
  resumed}`, `input_watermark_event_id`.
- **Relationships:** `1 → n AcademicEvent`, `1 → n SessionConcept`,
  `1 → 0..1 Assessment`.
- **Lifecycle:** Part E.
- **Rebuildability:** the row is a **materialised projection of the event
  stream**, and the event stream wins on any disagreement (B.3). `input_watermark_event_id`
  records how far the projection has consumed, which makes a stale row
  detectable rather than silently wrong.
- **Class:** derived state.

---

**`SessionConcept`** · *derived state*

- **Identity:** `(session_id, concept_ref)` where `concept_ref` is either
  `concept_id UUID` or, when unresolved, a normalised `declared_text`.
- **Key fields:** `detection_source ∈ {tool_tagged, ai_proposed,
  student_declared, student_added}`, `confirmation_state ∈ {proposed, confirmed,
  rejected}`, `confirmed_at`, `confirmed_by ∈ {student, rule}`,
  `assessment_required BOOLEAN`.
- **Hard invariant (TARGET DESIGN):** `confirmation_state = 'confirmed'`
  **implies** `assessment_required = true`. This is the row-level expression of
  the Part F coverage guarantee, and it is a database CHECK, not a code
  convention.
- **Class:** derived state.
- **Null-tolerance rule:** `concept_id` may be NULL with `declared_text` set.
  Per B.4, *"an unresolved concept must be representable"* — the system must not
  invent a taxonomy match to avoid a null.

---

**`Assessment`** · *derived state, then frozen*

- **Identity:** `assessment_id UUID`; `UNIQUE(session_id)` — one assessment per
  session.
- **Key fields:** `state ∈ {generating, ready, in_progress, completed,
  abandoned}`, `coverage_manifest JSONB` (the confirmed concept set at
  generation time, frozen), `generation_run_id`, `prompt_version`, `model`,
  `generated_at`, `completed_at`, `question_count`, `blueprint_version`.
- **Lifecycle:** Part F.
- **Immutability:** on `completed`, the assessment and all its attempts freeze.
- **Class:** derived state until completion; **raw evidence thereafter**, which
  is why the freeze must be a real state transition and not a UI affordance.

---

**`AssessmentQuestion`** · *derived state, then frozen*

- **Identity:** `question_id UUID`.
- **Key fields:** `assessment_id`, `concept_id`, `depth ∈ {recall, application,
  transfer}`, `format ∈ {mcq, numeric, short_text, ordering, match}`,
  `stem`, `options JSONB NULL`, `answer_key JSONB`, `rubric JSONB NULL`,
  `targets_pattern_id UUID NULL` (set when the question is a Mistake DNA
  retest), `provenance JSONB` (`{model, prompt_version, generation_run_id,
  generated_at, validator_version, validator_verdict}`), `admitted_at`.
- **Why provenance is mandatory:** if a model turns out to be systematically
  wrong about a topic, every question it produced must be identifiable and every
  piece of evidence built on those questions must be re-auditable. Without
  `generation_run_id` that audit is impossible. B.5 already states this; C makes
  it a required column.
- **Class:** derived state until admitted, frozen thereafter.

---

**`MistakePattern` / `MistakeDNA`** · *derived state, revisable*

- **CURRENT FACT — exists as `patterns`**, `007_mistakes.sql:110-212`. Three
  tiers (`concept`/`subject`/`global`), `severity` and `system_confidence` NULL
  on parents by design, `patterns_leaf_unique` and `patterns_global_unique`
  partial indexes, and the RLS rule at `:363-376` whose `WITH CHECK` restricts a
  student to `status IN ('acknowledged','practising')`.
- **Lifecycle:** `ALLOWED_TRANSITIONS`, `lib/mistakes/engine.ts:466-473` —
  verified in full this pass.
- **Class:** derived state. **The only revisable thing in the mistake domain.**

---

**`MistakeResolution`** · *derived state*

- **Identity:** `resolution_id UUID`.
- **Key fields:** `pattern_id`, `resolved_at`, `proof_attempt_ids UUID[]`
  (≥ `RESOLUTION_MIN_CORRECT = 2`, `lib/mistakes/engine.ts:77`), `cooling_days_elapsed`
  (≥ `RESOLUTION_COOLING_DAYS = 7`, `:80`), `engine_version`.
- **Why a separate entity rather than columns on `patterns`:** a pattern can
  resolve, recur, and resolve again (`ALLOWED_TRANSITIONS.resolved = ['recurred']`,
  `:471`). A single `resolvedAt` column loses every resolution but the last, and
  the resolution history is precisely what proves the student is improving.
- **Class:** derived state, append-only.

---

**`AcademicRecord`** · *derived state, projection*

- **Identity:** `(student_id, subject, concept_id, as_of)`.
- **Key fields:** `first_studied_at`, `last_studied_at`, `session_count`,
  `assessed_count`, `accuracy_weighted`, `open_pattern_count`,
  `resolved_pattern_count`, `coverage_state ∈ {untouched, declared, studied,
  assessed, proven}`, `input_watermark_event_id`.
- **Rebuild rule:** fully derivable from events + attempts + patterns. Stored
  only as a cache, with the watermark that produced it.
- **Class:** derived state.

---

**`PersonalModel`** · *derived state, projection*

- **Identity:** `(student_id, dimension)` — one row per typed dimension, not a
  free-form JSON bag.
- **Key fields:** `explicit_value NULL`, `inferred_value NULL`, `confidence
  NUMERIC 0..1`, `evidence_count INT`, `last_signal_at`, `decayed_confidence
  (computed on read)`, `overridden_at NULL`.
- **The structural override guarantee (TARGET DESIGN):** `explicit_value` and
  `inferred_value` are **two columns, never one.** An inference physically
  cannot overwrite an explicit choice because it writes to a different column.
  The resolver is a generated column: `effective_value := COALESCE(explicit_value,
  inferred_value)`. See I.6.
- **Class:** derived state.

---

**`Recommendation`** · *derived state*

- **Identity:** `recommendation_id UUID`; `UNIQUE(student_id, dedupe_key)
  WHERE state = 'active'`.
- **Key fields:** `kind`, `subject`, `concept_id NULL`, `pattern_id NULL`,
  `priority NUMERIC`, `reason_template`, `evidence_refs JSONB[]` (**NOT NULL,
  and a CHECK requiring `array_length ≥ 1`** — B.11's *"a recommendation with no
  evidence reference is a bug"* made structural), `state ∈ {active, dismissed,
  ignored, superseded, acted_on, expired}`, `surfaced_count`, `expires_at`.
- **Class:** derived state.

---

**`RecommendationOutcome`** · *raw evidence about the system*

- **Identity:** `outcome_id UUID`.
- **Key fields:** `recommendation_id`, `outcome ∈ {acted_on, dismissed,
  ignored_expired, superseded}`, `at`, `resulting_session_id NULL`,
  `resulting_resolution_id NULL`, `benefit_observed NULL`.
- **Class:** raw evidence — this is how the engine learns which interventions
  work, so it may not be recomputed away.

---

**`ScoreSnapshot`** · *derived state, immutable once written*

- **CURRENT FACT — `score_history` exists**, `005_score_history.sql`, with
  `UNIQUE(user_id, captured_on)`, `(user_id, captured_on DESC)` index, CHECK
  constraints matching the v1 pillar ceilings, and **SELECT-own RLS with no
  INSERT/UPDATE/DELETE policy at all** — so only the service role writes
  history. That posture is correct and is kept.
- **TARGET DESIGN — added columns:** `formula_version TEXT NOT NULL`,
  `confidence NUMERIC NOT NULL`, `evidence_counts JSONB NOT NULL`,
  `input_watermark_event_id UUID NOT NULL`. Together these make a snapshot
  **reproducible**: given the version and the watermark, the number can be
  recomputed and checked. Today's rows cannot be.
- **Class:** derived state, immutable once written.

---

**`ParentConnection`** · *derived state*

- **Identity:** `connection_id UUID`; `UNIQUE(student_id, parent_identity_id)
  WHERE state = 'active'`.
- **Key fields:** `parent_identity_id`, `state ∈ {invited, active, revoked,
  expired}`, `invited_at`, `accepted_at`, `revoked_at`, `invite_token_hash`,
  `invite_expires_at`.
- **Class:** derived state.

---

**`ParentSharePolicy`** · *derived state, versioned append-only*

- **Identity:** `(connection_id, version)`.
- **Key fields:** `categories JSONB` (per-category booleans), `effective_from`,
  `set_by`, `supersedes_version`.
- **Rule:** every generated report stores the `policy_version` it ran under
  (B.16). Part N.4.
- **Class:** derived state.

---

### C.4 Entity catalogue — presentation state

Presentation state may be lost without loss of academic truth. That is the
test for membership in this class.

**`TodayState`** — fully derived, **cache only**, keyed by an input hash.
Fields: `items[]` (typed, ordered, each with `evidence_refs`), `generated_at`,
`input_hash`, `empty_reason NULL`. The one durable field Today needs is
`students.last_seen_at` (B.12).

**`HomeLayout`** — student-owned composition: `component_id`, `visible`,
`order`, `size`, `pinned`. **CURRENT FACT:** today this is five booleans in
`localStorage["ledger-dash-layout"]` (`lib/dash-layout.ts:1-12`, re-verified),
unsynced. TARGET: a row in `student_preferences`, server-persisted and synced.

**`VaultView`** — filters, sort, last-viewed. Preference, not record (B.7).

**`StudentPreferences`** — the one legitimate JSONB survivor (C.1). **Choices
only, never computed values** — generalising `lib/console/workspace.ts:312-315`.

### C.5 Consistency check against Parts D–G

| Part D event field | Resolves to | Entity |
|---|---|---|
| `session_id` | open session at ingest | `StudySession` (C.3) |
| `concept_id` / `declared_text` | taxonomy or null | `Concept`, `SessionConcept` |
| `assessment_id` / `question_id` | assessment scope | `Assessment`, `AssessmentQuestion` |
| `evidence_id` | proof | `Evidence` |
| `result.is_correct` | grading outcome | `AssessmentAttempt` |
| `MISTAKE_DETECTED.payload.occurrence_id` | the fact | `Mistake` (occurrence) |
| `MISTAKE_RESOLVED.payload.resolution_id` | the proof chain | `MistakeResolution` |

Every Part D event type has exactly one owning entity in C.2–C.3, and every
entity in C.2–C.3 is reachable from at least one Part D event. No orphans in
either direction.

---

## PART D — ACADEMIC EVENT CONTRACT

### D.1 The canonical envelope

**TARGET DESIGN.** One shape, for every event, forever. Fields marked **†** are
server-assigned and may not be supplied by a client; a client that sends one is
rejected, not corrected.

```
AcademicEvent {
  // ── identity ────────────────────────────────────────────────────────────
  event_id            UUID          †  server-generated
  client_event_id     TEXT             client-generated, stable across retries
  seq                 BIGSERIAL     †  per-student monotonic ordering
  schema_version      SMALLINT         contract version this envelope obeys

  // ── subject ─────────────────────────────────────────────────────────────
  student_id          UUID          †  from the verified bearer token, NEVER the body
  session_id          UUID NULL     †  resolved by the session resolver (E.4)

  // ── time ────────────────────────────────────────────────────────────────
  occurred_at         TIMESTAMPTZ      client's claim of when it happened
  received_at         TIMESTAMPTZ   †  server clock
  clock_skew_ms       INT           †  received_at − occurred_at, retained

  // ── origin ──────────────────────────────────────────────────────────────
  tool_slug           TEXT NULL        must exist in the tool registry (Part P)
  surface             TEXT             'web' | 'push' | 'cron' | 'import'
  source              ENUM             'tool' | 'assessment' | 'student_declaration'
                                       | 'system' | 'migration'
  device_id           TEXT NULL        for multi-tab/device reconciliation (E.7)

  // ── academic address ────────────────────────────────────────────────────
  subject             TEXT NULL
  chapter             TEXT NULL
  concept_id          UUID NULL        resolved taxonomy node
  declared_text       TEXT NULL        the student's own words when unresolved
  assessment_id       UUID NULL
  question_id         UUID NULL

  // ── content ─────────────────────────────────────────────────────────────
  event_type          ENUM             D.2
  payload             JSONB            per-type, schema-validated at ingest
  result              JSONB NULL       outcome, for types that have one
  evidence_id         UUID NULL     →  Evidence
  confidence          NUMERIC NULL     0..1 — the SYSTEM's confidence in this
                                       event's academic claim, not the student's
  confirmation        ENUM             'not_required' | 'rule_confirmed'
                                       | 'student_confirmed' | 'unconfirmed'

  // ── provenance ──────────────────────────────────────────────────────────
  metadata            JSONB            {app_version, prompt_version?, model?,
                                        generation_run_id?, ingest_rule_version}
  supersedes_event_id UUID NULL     →  AcademicEvent
}
```

**Five rules, each of which exists because its absence is a known failure mode.**

**D.1.a — `student_id` comes from the token, never the body.** **CURRENT FACT:**
`app/api/ai/route.ts:2539-2547` already does exactly this — it derives
`rateLimitUserId` from `supabaseServer.auth.getUser(token)`, not from
`params`. That pattern is correct and must be the rule at the event boundary
too. Contrast `buildProfileContext`, which reads `params.grade` (`:134-138`)
and is therefore client-authoritative (Finding A.6.b).

**D.1.b — `occurred_at` is a claim, `received_at` is a fact.** Both are kept.
**CURRENT FACT — the bug this prevents:** `lib/active-close.ts`'s own header
documents that the client stamps a local date while the cron closes on a UTC
date, so IST 00:00–05:30 events land on the previous day. Retaining both
timestamps plus `clock_skew_ms` makes that class of bug diagnosable instead of
silent, and lets day-boundary logic be defined once, server-side, in the
student's declared timezone.

**D.1.c — `confidence` describes the system, not the student.** The student's
own pre-answer confidence is `ConfidenceLevel 0..3` and lives in
`payload.confidence_before`, matching `occurrences.confidence_before SMALLINT
CHECK (confidence_before BETWEEN 0 AND 3)` (`007_mistakes.sql:262`). Two
different quantities that would otherwise collide on one field name.

**D.1.d — `confirmation` is the deterministic gate, recorded on the event.**
Law L1 (B, preamble) says AI may propose and a deterministic gate disposes.
`confirmation` **is** that gate, written into the record. An AI-detected concept
enters the stream as `confirmation = 'unconfirmed'`; it becomes
`'student_confirmed'` only via an explicit student action which is itself a
`CONCEPT_CONFIRMED` event. **No downstream subsystem may treat an
`'unconfirmed'` event as evidence.** That is a one-line invariant that every
projection must assert.

**D.1.e — `metadata.prompt_version` is required whenever AI touched the event.**
Without it, an assessment answered in March 2027 cannot be re-audited when a
prompt regression is discovered in June.

### D.2 Event types

**TARGET DESIGN.** Grouped by owning subsystem. `E` = emits evidence usable by
the score; `C` = requires confirmation before it counts.

| Type | Owner | Payload core | Notes |
|---|---|---|---|
| `SESSION_STARTED` | Session Engine | `origin`, `trigger_event_id` | system-emitted |
| `CONCEPT_VIEWED` | tool | `concept_ref`, `dwell_ms` | C — weak signal only |
| `EXPLANATION_READ` | tool | `concept_ref`, `dwell_ms`, `scroll_depth` | C |
| `QUESTION_STARTED` | tool/assessment | `question_id`, `concept_id` | |
| `QUESTION_ATTEMPTED` | tool/assessment | `question_id`, `answer_ref`, `confidence_before` | |
| `QUESTION_CORRECT` | assessment | `question_id`, `attempt_id`, `depth` | **E** |
| `QUESTION_WRONG` | assessment | `question_id`, `attempt_id`, `error_class?`, `error_type?` | **E** |
| `PRACTICE_COMPLETED` | tool | `item_count`, `correct_count`, `concepts[]` | **E** if ≥ `MIN_SESSION_QUESTIONS` |
| `REVISION_COMPLETED` | tool | `concepts[]`, `method` | C |
| `EXTERNAL_STUDY_DECLARED` | student | `declared_text`, `subject`, `concepts_proposed[]`, `when`, `duration_claim?` | C — **never E on its own** |
| `CONCEPT_CONFIRMED` | student | `session_concept_ref`, `accepted BOOLEAN` | **the gate** |
| `CONCEPT_ADDED` | student | `declared_text`, `concept_id?` | student adds a missed concept |
| `SESSION_FINISH_REQUESTED` | student | — | opens the review step |
| `ASSESSMENT_STARTED` | Assessment | `assessment_id`, `coverage_manifest_hash` | |
| `ASSESSMENT_SKIPPED` | student | `assessment_id`, `reason?` | **no penalty** (F.7) |
| `ASSESSMENT_COMPLETED` | Assessment | `assessment_id`, `per_concept_outcomes[]` | **E** |
| `SESSION_VERIFIED` | Session Engine | `session_id`, `assessment_id` | terminal |
| `SESSION_CLOSED_UNVERIFIED` | Session Engine | `session_id`, `reason` | terminal, **not** a failure |
| `MISTAKE_DETECTED` | Mistake DNA | `occurrence_id`, `pattern_id?`, `merge_outcome` | **E** |
| `MISTAKE_CORRECTED` | Mistake DNA | `occurrence_id`, `immediate_retry_correct BOOLEAN` | |
| `MISTAKE_RETESTED` | Assessment | `pattern_id`, `attempt_id`, `is_correct`, `days_since_last_occurrence` | **E** |
| `MISTAKE_RESOLVED` | Mistake DNA | `pattern_id`, `resolution_id`, `proof_attempt_ids[]` | **E**, system-only |
| `MISTAKE_RECURRED` | Mistake DNA | `pattern_id`, `occurrence_id` | **E** |
| `MISTAKE_ACKNOWLEDGED` / `_PRACTISING` | student | `pattern_id` | the only two statuses a student may set — `lib/mistakes/engine.ts:89-92` |
| `PREFERENCE_SET` | Customisation | `dimension`, `value` | drives explicit override (I.6) |
| `RECOMMENDATION_SURFACED` / `_ACTED_ON` / `_DISMISSED` | Recommendation | `recommendation_id` | |
| `CORRECTION_REQUESTED` / `_RESOLVED` | Ownership | `request_id`, `target_ref` | |
| `EVENT_SUPERSEDED` | system | `supersedes_event_id`, `reason` | **the only "edit"** |
| `PARENT_POLICY_CHANGED` | Sharing | `connection_id`, `policy_version` | |
| `PARENT_REPORT_VIEWED` | Parent Space | `connection_id`, `report_id` | audit (N.7) |

**D.2.a — `MISTAKE_RESOLVED` is system-only, at three layers.** RLS refuses a
student-written `resolved` (`007_mistakes.sql:369-376`); `applyTransition`
refuses it in the domain layer (`lib/mistakes/engine.ts:508-513`); and the event
ingest rejects `MISTAKE_RESOLVED` with `source = 'tool'` or
`'student_declaration'`. **Three independent refusals of the single most
gameable transition in the product** — `PRODUCT_PRINCIPLES.md:96-104`.

**D.2.b — `EXTERNAL_STUDY_DECLARED` is deliberately not `E`.** It opens
sessions, earns assessment coverage, and appears in memory and history. It moves
no score dimension by itself. The bridge from declaration to evidence is
*passing the assessment about it* — which is precisely how external study
becomes real in this architecture (E.5, F.2).

### D.3 Validation at ingest

**TARGET DESIGN.** A single server endpoint, and nothing else, may write events.
The pipeline, in order — each step rejects rather than repairs:

1. **Authenticate.** Bearer token → `student_id`. Reuse the working pattern at
   `app/api/ai/route.ts:2539-2547`.
2. **Envelope schema.** Reject unknown fields; reject any **†** field present in
   the body.
3. **Type/payload schema.** One validator per `event_type`, versioned by
   `schema_version`.
4. **Registry check.** `tool_slug` must exist in the capability manifest and the
   tool must be *declared* able to emit this type (Part P.2). A tool cannot emit
   `QUESTION_CORRECT` unless its manifest says it grades deterministically.
5. **Reference integrity.** `concept_id` resolves; `assessment_id` belongs to
   this student; `evidence_id` belongs to this student.
6. **Idempotency.** `INSERT … ON CONFLICT (student_id, client_event_id) DO
   NOTHING`, returning the existing `event_id`. **Retry-safe by construction.**
7. **Rate/size caps.** Per-student events/minute; payload byte cap. Reuse the
   per-field-class caps at `app/api/ai/route.ts:227-255`.
8. **Session resolution.** Attach `session_id` (E.4). This is the *only*
   server-side mutation of the envelope, and it is recorded in `metadata`.
9. **Append.** Then fan out asynchronously to projections.

**Failure policy:** an invalid event is rejected with a typed error and written
to a **quarantine** table with the raw body. It is never coerced into validity.
This is the same posture as `ingestion_review` in `008_ingestion.sql` — *"what
the pipeline refused to guess."*

### D.4 Ordering, duplication, and replay

- **Ordering** is by `(student_id, seq)`, server-assigned. `occurred_at` is
  never used for ordering — it is client-supplied and therefore forgeable.
- **Out-of-order arrival** (offline queue, background tab) is normal.
  Projections are written to tolerate it: each carries
  `input_watermark_event_id`, and a late event below the watermark triggers a
  **bounded recompute** of the affected projection rather than an in-place patch.
- **Duplication** is defeated at three levels: `client_event_id` uniqueness
  (D.3.6); semantic dedup inside projections (e.g. two `CONCEPT_VIEWED` for the
  same concept in one session collapse to one `SessionConcept`); and the
  score-layer dedup that already exists — `lib/ledger-score.ts:187-193`
  deduplicates mistakes by `m.id` with the comment *"repetition must never
  manufacture score."* **Keep that principle; move it up into the event layer
  where it belongs.**
- **Replay** must be exact. Any projection is rebuildable by truncating it and
  re-consuming the stream from `seq = 0`. This is only true if projections are
  pure functions of `(events, reference data, formula_version)` — which is why
  `formula_version` is a stored column on `ScoreSnapshot` (C.3).

### D.5 Retention and derivation

**TARGET DESIGN.** Not everything persists forever in identical form. Four
classes:

| Class | Examples | Retention |
|---|---|---|
| **Permanent, verbatim** | `QUESTION_CORRECT/WRONG`, `ASSESSMENT_COMPLETED`, `MISTAKE_*`, `CONCEPT_CONFIRMED`, `EXTERNAL_STUDY_DECLARED`, `CORRECTION_*`, `PARENT_POLICY_CHANGED` | **forever.** These are the record. |
| **Permanent, compacted** | `CONCEPT_VIEWED`, `EXPLANATION_READ` | verbatim for 90 days; then rolled into a per-(session, concept) summary row `{count, total_dwell_ms, first_at, last_at}` and the raw rows dropped. **The derived fact survives; the granularity does not.** |
| **Bounded** | `RECOMMENDATION_SURFACED`, `PARENT_REPORT_VIEWED` | 24 months rolling, then counts only. |
| **Ephemeral** | UI telemetry, `page_events` | never enters this table at all. `page_events` (`000_initial_schema.sql`) stays a separate analytics concern. |

**D.5.a — compaction is a write of a new derived row plus a delete of raw rows,
and it is the single exception to append-only.** It is therefore: performed only
by a service-role job; recorded in `AuditEntry` with the count and the range;
and **forbidden for any event class that any `Evidence`, `Mistake`,
`AssessmentAttempt` or `ScoreSnapshot` references.** A referenced event is
permanent regardless of its class. **ARCHITECTURAL INFERENCE** — the Principles
require immutability of *facts about mistakes* (`PRODUCT_PRINCIPLES.md:106-112`)
but say nothing about attention telemetry; treating a 400ms scroll as a
permanent academic fact would be an over-reading that costs storage and buys
nothing.

**D.5.b — derivation direction is one-way.** Compaction may summarise raw into
derived. It may **never** synthesise raw from derived. If the raw rows are gone,
the projections that need them are frozen at their last watermark rather than
recomputed from summaries — otherwise a replay would silently produce a
different, smoother history than the one the student lived.

---

## PART E — STUDY SESSION MODEL

### E.1 What a session is, and what it is not

**TARGET DESIGN.** A session is *a contiguous stretch of academic intent*, not a
stretch of time. It exists so that "what did I study, and did it stick?" has a
unit. It is **not** a timer, not a pomodoro, not a streak input, and not a
productivity measure. `PRODUCT_PRINCIPLES.md:151` bans streaks permanently;
`lib/focus-context.tsx` currently drives `ledger-focus-streak` into 15% of the
score (T-0.2). The session model must not become the streak's new home.

**Meaningful academic activity — the qualifying set.** A session opens on the
*first* of these, and on nothing else:

- a `QUESTION_ATTEMPTED` or `PRACTICE_COMPLETED` event;
- an `EXTERNAL_STUDY_DECLARED` event;
- a `CONCEPT_VIEWED` / `EXPLANATION_READ` pair on the same concept whose
  combined `dwell_ms` exceeds a floor **and** which is followed by any second
  academic event;
- an explicit "start studying" action.

**Deliberately non-qualifying:** opening a tool, page views, a single
`CONCEPT_VIEWED`, scrolling, an AI chat turn that produces no concept. Rationale
(**ARCHITECTURAL INFERENCE**): a session that opens on navigation would make
"sessions studied" a measure of app-opening, and the record's honesty
(`PRODUCT_PRINCIPLES.md:82` Law 7) depends on the unit meaning what it says.

### E.2 The state machine

The skeleton floated in the brief was `ACTIVE → REVIEWING → AWAITING_ASSESSMENT
→ ASSESSING → COMPLETED_UNVERIFIED → VERIFIED`. **Corrected.** Three defects:
(a) it has no state for a session that has gone quiet but is not finished, so
tab-close is indistinguishable from abandonment; (b) `AWAITING_ASSESSMENT` and
`ASSESSING` are one state with a substep, and splitting them creates a stuck
state if generation fails; (c) `COMPLETED_UNVERIFIED` is drawn as a *predecessor*
of `VERIFIED`, implying verification is a later upgrade — it is not, a session
is verified by its own assessment or not at all.

**TARGET DESIGN — the corrected machine.**

```
                     ┌──────────────────────────────────────┐
                     │                                      │
   [qualifying   ┌───▼────┐  quiet > IDLE_MINUTES     ┌──────┴─────┐
    activity] ──►│ ACTIVE │ ────────────────────────► │  DORMANT   │
                 └───┬────┘ ◄──────────────────────── └──────┬─────┘
                     │        any qualifying activity        │
   SESSION_FINISH_   │                                       │ quiet > REAP_HOURS
   REQUESTED         │                                       ▼
                     ▼                              ┌──────────────────┐
                ┌─────────┐   student adds/removes  │ CLOSED_UNVERIFIED│
                │REVIEWING│◄──── concepts ──────┐   │   (auto-closed)  │
                └────┬────┘                     │   └──────────────────┘
                     │ confirms concept set     │            ▲
                     ▼                          │            │
              ┌─────────────┐  generation fails │            │
              │  ASSESSING  │───────────────────┼────────────┤
              │ (generate → │                   │            │
              │  present →  │  ASSESSMENT_      │            │
              │  grade)     │  SKIPPED ─────────┼────────────┘
              └──────┬──────┘                   │
                     │ ASSESSMENT_COMPLETED     │
                     ▼                          │
               ┌──────────┐                     │
               │ VERIFIED │  (terminal)         │
               └──────────┘                     │
                                                │
               ┌──────────────────┐             │
               │    ABANDONED     │◄────────────┘  student explicitly discards
               └──────────────────┘                 (before any E-class event)
```

**Six states. Three terminal.**

| State | Meaning | Entry | Exit |
|---|---|---|---|
| `ACTIVE` | live, accumulating events | first qualifying event | finish request, or idle |
| `DORMANT` | quiet, still the student's open session | no qualifying event for `IDLE_MINUTES` | any qualifying event → `ACTIVE`; or `REAP_HOURS` → `CLOSED_UNVERIFIED` |
| `REVIEWING` | showing the detected concept set for confirmation | `SESSION_FINISH_REQUESTED` | confirmation → `ASSESSING`; skip → `CLOSED_UNVERIFIED` |
| `ASSESSING` | assessment generating, presented, or grading | concept set confirmed | completed → `VERIFIED`; skipped or generation failure → `CLOSED_UNVERIFIED` |
| `CLOSED_UNVERIFIED` | **terminal.** Study happened; nothing was proven | reap, skip, or generation failure | — |
| `VERIFIED` | **terminal.** Study happened and was assessed | `ASSESSMENT_COMPLETED` | — |
| `ABANDONED` | **terminal.** Student discarded a session with no evidence | explicit discard, only while no `E`-class event exists | — |

**E.2.a — `CLOSED_UNVERIFIED` is not a failure state and must never be rendered
as one.** `PRODUCT_PRINCIPLES.md:134-141` — *"State facts; offer the next move;
never judge."* A closed-unverified session still contributes: its confirmed
concepts enter the `AcademicRecord` at `coverage_state = 'studied'`, its
declarations enter memory, and it generates a recommendation to verify later.
What it does not contribute is *proof*, and the score therefore does not move
on it. That distinction is honest; a penalty would not be.

**E.2.b — `ABANDONED` has a hard precondition.** It is reachable only while the
session contains **no** `E`-class event. Once a question has been answered,
evidence exists and `PRODUCT_PRINCIPLES.md:106-112` forbids discarding it — the
session may only be closed, never erased. This is the architectural fix for
`app/tools/post-exam/page.tsx:140` (**CURRENT FACT:** one unconfirmed click
calls `localStorage.removeItem("ledger-mistakes")`, and `SyncManager` propagates
the emptied blob to the cloud within 15 seconds).

### E.3 Liveness across tools, tabs, devices and days

**TARGET DESIGN.** Liveness is a **property of the event stream**, not of a
socket, a heartbeat or a timer.

- **One live session per student, globally.** Enforced by the partial unique
  index in C.3, not by client state. A student practising on a phone and reading
  on a laptop is in **one** session — the record is about the student, not the
  device. `device_id` on the event (D.1) preserves the distinction for
  diagnostics without fragmenting the unit.
- **Cross-tool by default.** Events from `exam-practice`, `learn-lab` and
  `syllabus` in the same window attach to the same session. This is exactly what
  today's architecture cannot express: the four evidence-producing tools
  (Finding A.3.d) each write their own localStorage key with no shared unit.
- **Tab close, reload, crash:** nothing happens. The session is server-side; the
  client holds no authoritative state. On return, the client asks
  `GET /session/current` and resumes.
- **Across a day boundary:** `IDLE_MINUTES` is measured in real time, not
  calendar time, so a session started at 23:40 and continued at 00:10 is one
  session. Day attribution for any daily aggregate uses `received_at` converted
  to the student's declared timezone, defined **once, server-side** — the
  documented fix for the `lib/active-close.ts` IST/UTC bug (Finding A.7.7).

**ARCHITECTURAL INFERENCE — `IDLE_MINUTES` and `REAP_HOURS` are policy, not
architecture.** The architecture requires only that they exist, are
server-owned, are constants (so the machine is testable), and that
`REAP_HOURS ≫ IDLE_MINUTES`. Sensible starting values are 45 minutes and 20
hours; that is a product decision for `PRODUCT_DECISIONS.md`, not for this
document.

### E.4 The session resolver

**TARGET DESIGN.** At ingest step D.3.8, an event with no `session_id` is
resolved by a pure function:

```
resolve(student_id, event) →
  1. live session exists (ACTIVE | DORMANT)?     → attach; if DORMANT → ACTIVE
  2. event is qualifying (E.1)?                  → open a new session, attach
  3. otherwise                                   → attach nothing (session_id = NULL)
```

Case 3 is important and must not be optimised away: a `CONCEPT_VIEWED` with no
session is a legitimate event. It records that the student looked at something.
It simply does not, by itself, constitute study.

**The resolver is deterministic, has no clock of its own** (it takes
`received_at`), and is therefore replay-safe: re-running it over the stream
reconstructs identical session boundaries. This is the property that makes B.3's
claim — *"the event stream wins on any disagreement; the row is rebuildable"* —
true rather than aspirational.

### E.5 External study — the first-class path

**Governing statement — ratified 2026-08-10.** `PRODUCT_PRINCIPLES.md` **§3.5**:
*"A student's learning counts wherever it happened… StudyLedger owns the academic
memory, never the student's physical learning environment,"* recorded as a
decision at `PRODUCT_DECISIONS.md` **§9.1**. External study is **first-class
academic activity**, and a product that only counts what happens inside its own
tools would be measuring app usage, not learning. *(The brief cited "Constitution
§10–13", which never existed; the gap recorded in the Governance Note is now
closed by §3.5. The design below is unchanged — it is what was ratified.)*

**The pipeline §3.5 mandates, and which E.5 implements:**

```
student-declared evidence  →  assessment  →  verified academic evidence
```

**Never a closed ecosystem.** No rule, surface or score term may make outside
learning invisible, and none may make it *cost* the student anything to declare
it (§3.3, §3.5). Equally, **a declaration is never proven learning**: §3.5 relies
on §3.1 and §3.2 rather than relaxing them.

**The flow.**

1. The student declares: free text, a subject, optionally a time window
   ("Torque, from the coaching class this evening"). This emits
   `EXTERNAL_STUDY_DECLARED` with `declared_text` verbatim.
2. If no session is live, the declaration **opens one** (`origin = 'declaration'`).
   If one is live, it joins it. External and in-app study are the same unit.
3. The AI boundary proposes concept resolutions from `declared_text` against the
   taxonomy. These land as `SessionConcept` rows with
   `detection_source = 'ai_proposed'`, `confirmation_state = 'proposed'`.
   **An unresolved declaration is legal**: `concept_id = NULL`, `declared_text`
   retained (B.4).
4. The student confirms, edits, or rejects each proposal at the `REVIEWING`
   step. Confirmation emits `CONCEPT_CONFIRMED`.
5. Confirmed concepts are **assessed identically to in-app concepts** — Part F
   draws no distinction, and this is the whole point. External study becomes
   real academic evidence **by being verified**, not by being declared.
6. The `AcademicRecord` marks the concept `declared` after step 4 and `assessed`
   or `proven` only after step 5.

**E.5.a — the anti-gaming property is structural.** A student cannot inflate
their record by declaring study, because a declaration is not `E`-class (D.2.b)
and the only route from declaration to score movement runs through an assessment
they must actually pass. **The system trusts the student about what they
studied, and never about whether they learned it.** That split is the exact
architectural expression of `PRODUCT_PRINCIPLES.md` §3.1 and §3.5.

**E.5.b — declared is never rendered as verified.** `coverage_state` is carried
to every surface that displays a concept, and `declared` must be **visibly
distinct** from `assessed`/`proven` everywhere it appears — the record, memory,
Today, exports, and any parent-visible aggregate. A surface that collapses the
two states into one label is a Law 7 defect, not a copy choice. Parent-visible
counts are computed from `proven` only; a declared concept contributes nothing a
parent can read as learning (N.4).

### E.6 Concept detection and confirmation

| Source | Enters as | Auto-confirms? | Why |
|---|---|---|---|
| `tool_tagged` — question mapped to a taxonomy node by deterministic lookup | `confirmed` | **yes** | the mapping is deterministic; no inference occurred |
| `student_declared` — student named it | `confirmed` | **yes** | the student is authoritative about *what they studied* |
| `student_added` — added at the review step | `confirmed` | **yes** | same |
| `ai_proposed` — inferred from free text or activity | `proposed` | **never** | an inference is not a fact (L1) |

**Adding a missed concept** is a first-class action at `REVIEWING` **and** at
any time during `ACTIVE` — `CONCEPT_ADDED`. It may name a taxonomy node or be
free text. Free text is retained verbatim and routed to the taxonomy review
queue (B.4); it does **not** block the session.

**Removing a concept** is permitted at `REVIEWING` and emits
`CONCEPT_CONFIRMED{accepted: false}` — the proposal and its rejection are both
retained, because the rejection is a training signal for concept detection and
because silently dropping proposals would make the review step unauditable.

### E.7 Multi-tab and concurrency

**CURRENT FACT — the failure being designed away.** `pushToCloud`
(`lib/sync.ts:40-48`) replaces the whole `blob` column every 15 seconds
(`components/sync-manager.tsx:7`); `pullFromCloud` merges by
`value.length > local.length` (`lib/sync.ts:67`); `patchUserData`
(`lib/user-data.ts:139-142`) is an unguarded read-modify-write of the entire
row. Two tabs overwrite each other by design.

**TARGET DESIGN.** The problem dissolves rather than being solved, because
events are **appends with distinct `client_event_id`s**, and appends from N tabs
union rather than collide. Three residual rules:

1. **Session transitions are server-side and guarded.** `ACTIVE → REVIEWING`
   is a conditional update (`WHERE state = 'ACTIVE'`); a second tab's identical
   request affects zero rows and receives the current state instead of an error.
2. **Assessment start is single-flight.** `UNIQUE(session_id)` on `Assessment`
   means two tabs pressing "finish" produce one assessment.
3. **Clients hold no authoritative session state.** They render server state and
   subscribe to changes. A stale tab renders stale, never writes stale.

### E.8 Completion and the accomplishment payload

On reaching `VERIFIED` or `CLOSED_UNVERIFIED`, the Session Engine emits a
completion payload — **facts only**:

```
{ session_id, state, duration_real, concepts_confirmed[],
  concepts_verified[], concepts_missed[], new_patterns[], resolved_patterns[],
  score_delta { by_dimension, confidence_before, confidence_after },
  next_action_ref }
```

**E.8.a — governed rendering constraint.** `PRODUCT_PRINCIPLES.md:281-284`:
*"The Return beat is EVIDENCE, not celebration… Never a congratulation, never a
'you're on fire', never animated beyond the figure settling."* The payload is
therefore a **reading**, and the architecture guarantees it can be rendered as
one: every field is a figure or a list, and there is no `message` or
`encouragement` field for a model to fill.

**E.8.b — mistakes must not dominate the completion screen.** `new_patterns[]`
and `resolved_patterns[]` sit in the same payload as `concepts_verified[]`, and
the payload is ordered by the composition rules in Part M, not by severity.
Logging is immediate (Part G.1) and **surfacing is composed** — the two are
separate concerns, which is what lets the record be complete without the
experience being punitive.

---

## PART F — ASSESSMENT ENGINE

### F.1 Position in the architecture

The Assessment Engine is **the only manufacturer of verified academic
evidence.** Everything upstream (events, sessions, declarations) records intent
and activity; everything downstream (Mistake DNA, Record, Score, Memory) reads
proof. If this subsystem is untrustworthy, the entire product's central claim
fails. **It does not exist in any form today** — verified: no assessment table,
no question bank, no grading path; `app/tools/exam-sim` and `app/tools/practice`
persist nothing (Finding A.3.c).

### F.2 The coverage guarantee — a hard invariant

**The rule.** *Every `SessionConcept` with `confirmation_state = 'confirmed'`
MUST appear in the session's assessment with at least one question.*

**TARGET DESIGN — enforced at four layers, none of which is a prompt.**

1. **Data.** `SessionConcept` CHECK: `confirmation_state = 'confirmed'` implies
   `assessment_required = true` (C.3).
2. **Blueprint.** Generation begins by computing a **coverage manifest** —
   deterministic code enumerates the confirmed set, allocates a question count
   per concept, and freezes the result into `Assessment.coverage_manifest`
   *before any model call*. The AI is asked to fill slots that already exist; it
   is never asked "which concepts should this cover?"
3. **Admission gate.** A generated question is admitted only if its
   `concept_id` matches the slot it was generated for. A question for the wrong
   concept is rejected and the slot is retried, never reassigned.
4. **Transition gate.** `ASSESSING → VERIFIED` is refused unless
   `∀ c ∈ coverage_manifest : ∃ answered question with concept_id = c`. This is
   a server-side precondition on the state transition, so no client path and no
   model behaviour can produce a `VERIFIED` session with a coverage hole.

**F.2.a — the fallback when generation cannot fill a slot.** After N retries,
the slot is filled from the **retained bank** (F.5) for that concept. If the
bank is empty too, the assessment does not silently shrink: the session goes to
`CLOSED_UNVERIFIED` with `reason = 'coverage_unfillable'`, and the concept is
recorded as `studied`, not `assessed`. **Refusing to verify is always available;
verifying with a hole never is.** This is `PRODUCT_PRINCIPLES.md:82-83` — *"an
honest empty state beats a fake number"* — applied to the verification path.

**F.2.b — coverage is a floor, not a cap.** The blueprint may add questions
beyond the manifest: due Mistake DNA retests on *other* concepts (G.8), and
spaced re-checks of previously-proven concepts. These carry
`targets_pattern_id` and are attributed to the pattern, not to session coverage.

### F.3 Question generation and adaptive depth

**Deterministic inputs to the blueprint**, computed before any model call:

| Input | Source | Effect on the blueprint |
|---|---|---|
| confirmed concept set | `SessionConcept` | the slot list — **non-negotiable** |
| concept `exam_weight` | `concepts.exam_weight` (`007_mistakes.sql:50`) | slots per concept |
| board / grade / stream | `StudentProfile`, **server-read** | question style and vocabulary |
| prior accuracy on concept | `AcademicRecord` | starting depth |
| open patterns on concept | `patterns` | forces at least one question at the failing depth, and targets the specific `error_type` |
| explicit difficulty preference | `PersonalModel.explicit_value` | **selection only, never grading** (F.3.a) |
| inferred format preference | `PersonalModel.inferred_value` | format mix within a depth |
| time budget | student input at `REVIEWING` | total slot count, never coverage breadth |

**Depth ladder:** `recall → application → transfer`. Starting depth is a
deterministic function of prior evidence; within an assessment, depth escalates
on a correct answer and de-escalates once on a wrong one, then holds. The ladder
is a state machine in code — the model is told *which* depth to write for, never
asked to choose it.

**F.3.a — the preference/grading firewall.** B.14 states it; F makes it
mechanical. `PersonalModel` is an input to **slot selection** (which questions
are asked). It is **not** an input to `answer_key`, to grading, or to any score
dimension. Enforced by construction: the grading function's signature takes
`(question, attempt)` and has no access to the personal model at all. Without
this, two students with different preferences would have incomparable scores,
and `PRODUCT_PRINCIPLES.md:355-368` — *"a mirror that flatters is worthless"* —
would fail.

**F.3.b — the "we do not teach" line (T-0.3).** Generating a question that
*measures* whether a gap closed is diagnosis, and is in scope. Generating the
*explanation* of the right answer is teaching, and `PRODUCT_PRINCIPLES.md:56-62`
places it out of scope. The architectural consequence: `AssessmentQuestion` has
an `answer_key` and an optional `rubric`; explanations are generated **on
demand, at the Vault, and never stored as evidence** (B.7). A stored explanation
would quietly turn the record into courseware.

### F.4 How an AI-generated question becomes trustworthy evidence

**This is the central question of Part F.** The answer is that the AI's output
is never trusted — it is *validated into* trustworthiness by deterministic code,
and its provenance is retained so the trust can be revoked retroactively.

**The seven-gate pipeline. Every gate is deterministic. A failure at any gate
discards the candidate; nothing is repaired.**

| # | Gate | Rejects |
|---|---|---|
| 1 | **Slot binding** | question whose `concept_id` ≠ the requested slot |
| 2 | **Schema validation** | output not matching the typed question schema (stem, format, options, `answer_key`, depth) |
| 3 | **Structural well-formedness** | MCQ with 0 or ≥2 keyed-correct options; duplicate options; empty stem; answer text appearing verbatim in the stem |
| 4 | **Answerability check** | numeric answers that fail a units/precision parse; keys not present in the option set |
| 5 | **Self-consistency re-derivation** | for closed-form items, the answer is independently recomputed (symbolic/numeric where possible, or a *second, independent* model call with a different prompt whose only permitted output is the answer). Disagreement ⇒ discard. **The model does not validate its own output** (B.20) |
| 6 | **Novelty / leakage** | stem hash colliding with a question the student has already seen; a question that restates the declaration text |
| 7 | **Moderation** | reuse the existing two-layer stack — regex normalisation (`app/api/ai/route.ts:42-50`) then the Haiku classifier (`runAIModeration`, `:2584`). **CURRENT FACT: this subsystem already exists and is the strongest part of the AI layer (Finding A.6.e). Keep it.** |

Only after all seven does the question receive `admitted_at` and become
presentable. `provenance` (C.3) is written at admission.

**F.4.a — grading, by format.**

- **Closed-form** (MCQ, numeric, ordering, match): graded **100%
  deterministically** against `answer_key`. No model in the path. These are the
  only formats whose results are `E`-class by default.
- **Short text:** the model proposes a verdict against the `rubric`; the
  **student sees the proposed verdict and confirms or disputes it** before it is
  written. Confirmed ⇒ `grader = 'ai_proposed_student_confirmed'`, `E`-class.
  Disputed ⇒ recorded as a `CorrectionRequest`, the attempt stays ungraded, and
  **it does not enter the score in either direction.**
- **ARCHITECTURAL INFERENCE:** the safest V1 posture is closed-form only. A
  short-text pipeline is defensible but adds a human-confirmation step to every
  answer, which is a product cost, not an architectural one.

**F.4.b — retroactive revocation.** If prompt version *v* is later found
defective, `AssessmentQuestion.provenance.prompt_version = v` identifies every
affected question; the affected attempts are marked `evidence_revoked` by
appending `EVENT_SUPERSEDED` events; and every `ScoreSnapshot` whose
`input_watermark_event_id` postdates the first affected event is recomputed.
**Nothing is edited in place, and the history shows that a revocation happened.**
This is the capability the current architecture cannot offer at all — today's
`ai_history` (`app/api/ai/route.ts:2701-2718`) stores output but no prompt
version.

### F.5 Integrity

- **Question retention:** admitted questions persist and become a per-student
  bank, so a retest can reuse a *different* question on the same concept — never
  the same stem. This is both an integrity measure (no memorisation of the check)
  and the F.2.a fallback.
- **One assessment per session** — `UNIQUE(session_id)`.
- **Answers are append-only** with `attempt_no`; changing an answer appends.
- **Timing** is recorded (`time_ms`) but is **not** an integrity signal used to
  invalidate answers. Inferring cheating from speed would be an unevidenced
  inference about a student — precisely what `PRODUCT_PRINCIPLES.md:106-112`
  forbids storing.
- **Anti-gaming caps** carry over from the existing v2 engine, which already
  implements the right idea: `DAILY_QUESTION_CAP = 60`, `MIN_SESSION_QUESTIONS = 5`,
  applied identically client- and server-side (`lib/ledger-score-v2.ts:78-79`,
  invariant I4 at `:16-17`). **Verified this pass. Keep the mechanism; move it
  from the score layer to the evidence layer**, where a capped question is
  capped once for all consumers rather than once per formula.

### F.6 Immediate mistake logging

`QUESTION_WRONG` is emitted **at grade time, before the next question renders.**
It carries `attempt_id` and the evidence reference. The Mistake DNA subsystem
consumes it synchronously enough that the occurrence exists before the
assessment completes.

**Why "immediate" is architectural and not cosmetic:** `PRODUCT_PRINCIPLES.md:106-112`
requires evidence to accompany a claim. If mistake creation were deferred to
assessment completion, a student who closed the tab mid-assessment would produce
answered-and-wrong questions with no occurrence — an evidence gap the record
could never reconstruct.

**Error classification.** `occurrences_has_error CHECK` (`007_mistakes.sql:283-285`)
requires at least one of `cognitive_error` / `execution_error`. The classifier:

1. **Deterministic first** where the question format allows it — a numeric answer
   off by a sign is `sign-error`; correct method with an arithmetic slip is
   `arithmetic-slip`; a blank is `not-known` or `ran-out-of-time` by timing.
2. **AI-proposed** otherwise, presented to the student for confirmation.
3. **Student's classification always wins**; the AI's is retained as a signal on
   the event, never overwritten (B.6).
4. **Never both.** `mergeKeyFor` returns
   `ambiguous-error-classification` when an occurrence carries both
   (`lib/mistakes/engine.ts:194-199`), and its own TODO at `:186-187` records
   that the product decision is open. **OPEN ISSUE, unchanged by this document:
   the schema permits both errors on one occurrence but the merge rule does not
   say which wins. This must be decided before capture ships.**

### F.7 Skipping, and unverified sessions

A student may leave at any point. `ASSESSMENT_SKIPPED` is a normal event.

**Consequences, exhaustively:** the session goes `CLOSED_UNVERIFIED`; concepts
sit at `coverage_state = 'studied'`; the score does not move; a recommendation
is created to verify the concepts later; the Today engine may surface it once as
a follow-up.

**Non-consequences, guaranteed:** no score penalty; no streak effect (there is
no streak); no parent-visible flag; no notification that shames; no repeated
nagging (the recommendation decays per K.7).

**Justification:** `PRODUCT_PRINCIPLES.md:114-121` — *"Capture must never lower
a score… A student who logs honestly may never score below a student who logs
nothing."* A skip penalty would be the same defect one step removed: it would
make *starting* a session risky, and the rational response would be to study
without recording, which destroys the product.

### F.8 Correction flow

Three distinct grievances, three paths:

| Grievance | Path | Effect on evidence |
|---|---|---|
| "The question was wrong / ambiguous" | `CorrectionRequest{target = question_id}` | question flagged; if upheld, the attempt is superseded and **excluded** from every dimension; the question is withdrawn from the bank |
| "My answer was marked wrong but is right" | `CorrectionRequest{target = attempt_id}` | if upheld, a superseding attempt with `is_correct = true` is appended; the occurrence created from it is superseded (`occurrences.supersedes`, `007_mistakes.sql:275`) |
| "This mistake is misclassified" | `CorrectionRequest{target = occurrence_id}` | a superseding occurrence with the corrected `error_type` is appended; the merge re-runs; the old pattern's `recurrenceCount` recomputes |

**In all three cases nothing is deleted and nothing is edited.** Corrections
append, and Part O.4 specifies exactly which derived state recomputes.

---

## PART G — MISTAKE DNA

### G.1 Reuse verdict — read in full, not assumed

Files read in full this pass: `lib/mistakes/types.ts` (332 lines),
`lib/mistakes/engine.ts` (549 lines), `lib/mistakes/migrate-legacy.ts` (437
lines, header + shapes read; the pure core confirmed), and
`supabase/migrations/007_mistakes.sql` (378 lines).

| Asset | Verdict | Reasoning |
|---|---|---|
| `lib/mistakes/engine.ts` | **KEEP, unmodified** | Pure, clock-free, non-mutating, `Result<T>` on bad input, deep-freezes outputs, and enforces append-only history *mechanically* (`assertAppendOnly`, `:133-142`; `freezePattern`, `:118-123`) rather than by convention. `ALLOWED_TRANSITIONS` (`:466-473`) is a complete and correct graph, including the subtle `dormant → open` (never `→ recurred`) rule. 361 passing tests. **There is nothing in the target design this engine cannot express.** |
| `lib/mistakes/types.ts` | **KEEP, extend additively** | The `Occurrence` union (`:215-219`) enforces the has-error invariant *at the type level*, mirroring the SQL CHECK. Additions needed: `'in-session-assessment'` in `OccurrenceSource`, and `'assessment_attempt' \| 'declaration'` in `EvidenceType`. Both additive. |
| `007_mistakes.sql` | **KEEP, extend additively** | Four invariants enforced structurally (C.2). The RLS `WITH CHECK (status IN ('acknowledged','practising'))` at `:369-376` is defence-in-depth mirroring `STUDENT_SETTABLE` at `engine.ts:89-92`. Only the `source` CHECK needs extending. |
| `lib/mistakes/migrate-legacy.ts` | **KEEP as-is, and recognise what it is** | It **deliberately does not create occurrences**, because legacy rows have no evidence and `evidence_id` is `NOT NULL` — its header states this explicitly (`:8-18`). It preserves and marks. That is the correct call and it is already correct. |
| The wiring | **CREATE** | **CURRENT FACT: zero production importers.** `engine.ts` and `migrate-legacy.ts` are imported only by `tests/mistakes-engine.test.mjs` and `tests/mistakes-migration.test.mjs`; `types.ts` additionally by `lib/taxonomy/build.ts:20`, itself only test/script-imported. What is missing is a server data-access layer and a capture path — **not domain logic.** |

**Overall verdict: KEEP / ADAPT-additively. Do not rebuild.** The domain core of
Mistake DNA is the single highest-quality asset in the repository and the target
architecture was, in effect, already designed here. **REBUILD would be
destruction of value.**

**G.1.0 — read this verdict at the right scope.** It is a judgement about the
**domain logic** in `lib/mistakes/*` — lifecycle, transitions, merge, append-only
history, the `canResolve` proof gate. It is **not** a verdict on the mistake
*pillar*, and it is not an endorsement of how mistakes are persisted or evidenced
in the shipped product. `PRODUCT_DECISIONS.md` §9.4 ratifies the **mistake pillar
as REBUILD** on the Event → Session → Assessment → Mistake DNA pipeline (J.9.b),
and the shipped write path (`exam-practice`, localStorage, client-set status) is
**REBUILD / DELETE** in Part S. The two verdicts are consistent because they
address different objects:

| Object | Verdict | Where |
|---|---|---|
| Mistake domain logic (`engine.ts`, `types.ts`) | **KEEP**, extend additively | G.1 |
| Mistake persistence + evidence model as shipped | **REBUILD** — not the target | S.3, J.9.b |
| The mistake **pillar** of the Ledger Score | **REBUILD** — no enum patch | J.9.b, W |

**Reusing the domain engine never licenses reusing the current persistence or
evidence assumptions.** Where a piece of `lib/mistakes/*` encodes an assumption
about *where evidence comes from*, that assumption is re-derived from Parts D–F,
not inherited.

**G.1.a — the one genuine gap in the existing design.** `severity` is computed
from four normalised factors the caller must supply
(`SeverityFactors`, `engine.ts:300-305`), and the engine's own TODO at `:293-298`
records that *how those factors are derived from raw domain data is not
specified*. That derivation is the missing piece, and Part G.6 specifies it —
deliberately as a separate, versioned function so the engine stays pure.

### G.2 The five things that must never be conflated

| Concept | Entity | Mutable? | Meaning |
|---|---|---|---|
| **Mistake occurrence** | `occurrences` row | **never** | one mark lost, one time. A fact. |
| **Recurring pattern** | `patterns` row, `tier='concept'` | revisable | *the same error type, on the same concept, more than once.* An inference. |
| **Concept weakness** | `AcademicRecord.coverage_state` + accuracy | recomputed | *low accuracy on a concept*, which may exist with **zero** patterns (never assessed) or with a resolved pattern (fixed but thinly evidenced) |
| **Resolved mistake** | `patterns.status = 'resolved'` + `MistakeResolution` | can recur | *this specific error, on this concept, proven closed* — and provably reopenable (`ALLOWED_TRANSITIONS.resolved = ['recurred']`) |
| **Mastered concept** | `AcademicRecord.coverage_state = 'proven'` | recomputed | *sustained correct performance at transfer depth over time*, with **no** open pattern. Strictly stronger than "resolved". |

**G.2.a — why the last two must stay separate.** A student can resolve every
pattern on Torque and still not have mastered Torque, because resolution proves
*a specific error stopped happening* while mastery requires *positive evidence
across depths*. Collapsing them would let the score reward error-clearing as if
it were competence, and the recovery pillar would become the whole score.

### G.3 Detection and normalisation

1. `QUESTION_WRONG` arrives with `attempt_id`, `concept_id`, `evidence_id`.
2. Classification per F.6 produces exactly one of `cognitive_error` /
   `execution_error` (never both — the ambiguity failure is explicit).
3. Normalisation: `subject`/`chapter`/`topic` are denormalised from the concept
   (matching `007_mistakes.sql:236-238`); `marks_lost`/`marks_available` are
   derived from the question's mark value; `student_answer` is stored as the
   `{kind:'text'|'crop'}` union.
4. The occurrence is inserted. **`evidence_id` is non-negotiable** — for an
   in-session mistake the evidence is the assessment attempt itself, which is
   why `EvidenceType` must gain `'assessment_attempt'` (G.1). Without that, the
   engine's own principle would force fabricating evidence, which
   `migrate-legacy.ts:8-18` correctly refused to do.

### G.4 Deduplication

Three independent layers, none of which is a substitute for the others:

- **Evidence dedup:** `UNIQUE(student_id, content_hash)` (`007_mistakes.sql:87`)
  — the same paper photographed twice is one evidence item.
- **Occurrence dedup:** occurrences are *not* deduplicated. Two identical wrong
  answers on two dates are two facts. Collapsing them would erase recurrence,
  which is the product's core signal.
- **Pattern dedup:** `mergeOccurrence` (`engine.ts:231-282`) plus the database
  index `patterns_leaf_unique`. `matches.length > 1` returns
  `duplicate-leaf-patterns` with the detail *"the database unique index should
  have prevented this"* — the engine treats its own duplicate as a bug, not a
  case to handle. Correct.

### G.5 Merge and pattern recognition

**KEEP verbatim.** Two occurrences join one leaf **iff** same student, same
concept, same `errorClass`, same `errorType` (`engine.ts:240-247`). Never across
error class — `types.ts:59-63`: *"a misconception about signs and a careless
sign slip look identical on paper and require opposite fixes."*

Parent attachment (subject, then global) is deterministic and therefore carries
`system_confidence = NULL` by design (`007_mistakes.sql` header, `:100-107`).
Provisional merges below `PROVISIONAL_CONFIDENCE_FLOOR = 0.8` are reversible for
`PROVISIONAL_WINDOW_DAYS = 30` (`engine.ts:83-86`) — relevant only once a fuzzy
concept matcher exists; exact-key matching is confidence 1.

### G.6 Severity — closing the specification gap

**TARGET DESIGN.** The formula is fixed and must not be touched:
`40·marksWeight + 30·recurrenceWeight + 20·examProximity + 10·conceptExamWeight`
(`SEVERITY_WEIGHTS`, `engine.ts:69-74`). What is specified here is the
**derivation of the four normalised 0–1 factors**, in a separate versioned
module (`severity-factors.ts`), so `computeSeverity` stays pure and a change to
the derivation is a version bump rather than a formula rewrite.

| Factor | Derivation | Rationale |
|---|---|---|
| `marksWeight` | `Σ marks_lost` on this leaf ÷ `Σ marks_lost` across the student's open leaves, clamped | relative, so a student with small papers is not systematically low-severity |
| `recurrenceWeight` | `min(1, occurrences_in_trailing_180d / RECURRENCE_FULL_AT)` | 180 days matches `Pattern.recurrenceCount`'s definition (`types.ts:296-299`) |
| `examProximity` | `1` at ≤3 days to a goal exam covering this subject, decaying to `0` at ≥60 days | |
| `conceptExamWeight` | `concepts.exam_weight` normalised against the max in the subject | uses the column already defined at `007_mistakes.sql:50` |

**G.6.a — the double-weighting defect is real and inherited.**
`engine.ts:295-298` records it: `examProximity` contributes 20% of severity, and
`PRODUCT_DECISIONS §4.10` then ranks by `severity × examProximity`, applying it
twice. **Verified in the source comment. This document does not fix it** — the
engine is right that it is a product decision, not an engine bug. **Flagged for
founder decision before ranking ships.**

### G.7 Lifecycle

**KEEP `ALLOWED_TRANSITIONS` verbatim** (`engine.ts:466-473`):

```
open        → acknowledged | practising | dormant
acknowledged→ practising | dormant
practising  → resolved | recurred | dormant
dormant     → open
resolved    → recurred
recurred    → acknowledged | practising | dormant
```

Three properties worth restating because downstream design depends on them:

- **`resolved` is reachable only from `practising`, only for `actor = 'system'`,
  only with proof.** `applyTransition` refuses a student-actor transition to
  anything outside `STUDENT_SETTABLE` (`:508-513`), and refuses `resolved`
  without `correctAnswers` (`:515-529`).
- **`dormant` never leads to `recurred`.** A pattern never proven fixed cannot
  "come back"; it simply reopens (`:470`). Preserving this distinction is what
  keeps the record honest about what was actually demonstrated.
- **Parents resolve only derivatively.** `canResolveParent` (`:437-451`) refuses
  while any descendant leaf is unresolved — *"strictly stronger than §3.1, never
  weaker."*

### G.8 Correction, retry, spaced retesting, verification, resolution

**Immediate retry** (right after a wrong answer, same session): recorded as
`MISTAKE_CORRECTED{immediate_retry_correct}`. It is a **useful signal and not
proof.** It cannot contribute to resolution, because `canResolve` requires a
correct answer ≥`RESOLUTION_COOLING_DAYS = 7` after the last occurrence
(`engine.ts:415-426`), and an immediate retry is by definition zero days later.
This is the fluency-illusion guard and it is already correct in code.

**Spaced retesting.** A `RetestSchedule` entry per open leaf:
`{pattern_id, due_at, attempt_count, last_result}`. Intervals expand on success
and reset on failure. The retest question is generated by the Assessment Engine
with `targets_pattern_id` set, and is injected into the *next* session's
assessment as an above-manifest addition (F.2.b) — so retesting rides on study
the student was doing anyway rather than becoming a separate chore.

**Resolution** requires, per `canResolve`: the pattern is a leaf; `lastSeenAt`
exists; ≥`RESOLUTION_MIN_CORRECT = 2` correct answers **on the same concept**;
and ≥1 of them ≥7 days after the last occurrence. On success the system (never
the student) applies `practising → resolved`, appends a `MistakeResolution` row
with the proof attempt IDs, and emits `MISTAKE_RESOLVED`.

> **Hard constraint, ratified 2026-08-10 (`PRODUCT_DECISIONS.md` §9.4):
> a mistake is not "resolved" because the student says it is resolved.
> Resolution requires evidence.**

There is therefore **no student-facing resolve action, in any surface, at any
tier** — not a button, not a dismissal, not a swipe, not a bulk clear. A
presentation-layer act may set `acknowledged` or `practising` and nothing else
(`STUDENT_SETTABLE`, `engine.ts:89-92`; RLS `007_mistakes.sql:369-376`). Every
resolution names its proof attempts, and a resolution that cannot name them is
not constructible.

**Recurrence.** A new occurrence merging into a `resolved` leaf drives
`resolved → recurred` and emits `MISTAKE_RECURRED`. **The prior resolution is
not deleted** — its `MistakeResolution` row stands, which is why that entity is
separate from the pattern (C.3). A student who fixed something, lost it, and
fixed it again has a *better* record than one who never fixed it, and the data
model must be able to say so.

**Historical state.** Resolved and recurred patterns remain queryable forever
(no DELETE policy on `patterns` — `007_mistakes.sql:378`). The Vault shows them
without hiding them (B.7).

### G.9 What Mistake DNA supplies to the score, and what it must not

**Supplies:** counts of resolutions with proof; distinct evidence count;
patterns faced vs avoided; recurrence rate; time-to-resolution.

**Must not supply:** any term whose denominator grows with capture. This is the
lesson `lib/ledger-score.ts:157-181` already learned and documented in-code:
*"Every component below is a COUNT with a ceiling, never a proportion. That is
what makes the invariant structural."* Note the in-code TODO at `:177-180`
recording that `PRODUCT_DECISIONS §4.11` still specifies resolution as a
*proportion* and needs amending. **CURRENT FACT — an unresolved contradiction
between ratified decisions and shipped code, flagged in Part J.**

---

## PART H — ACADEMIC MEMORY

### H.1 The five layers, and the rule that separates them

**TARGET DESIGN.** Every fact in the product belongs to exactly one layer. The
test for membership is *"what happens if this is deleted?"*

| Layer | Contents | If deleted | Storage |
|---|---|---|---|
| **L1 Raw evidence** | `AcademicEvent`, `Evidence`, `AssessmentAttempt`, `occurrences`, `AcademicHistoryEntry`, `AuditEntry` | **unrecoverable — the record is destroyed** | append-only tables, no UPDATE/DELETE policy |
| **L2 Derived academic state** | `patterns`, `AcademicRecord`, `SessionConcept`, `MistakeResolution`, `PersonalModel` | **rebuildable** from L1 by replay | tables with `input_watermark_event_id` |
| **L3 Historical snapshots** | `ScoreSnapshot`, generated parent reports | **rebuildable only if the formula version is retained** | append-only, `formula_version` NOT NULL |
| **L4 Current state** | live session, active recommendations, `TodayState` | **regenerates immediately** | cache + a small number of durable pointers |
| **L5 Presentation state** | `HomeLayout`, vault filters, preferences | **lost, harmlessly** | `student_preferences` JSONB |

**H.1.a — the layering rule.** *A layer may read downward and may never write
downward.* L3 may read L2 and L1; L2 may read L1. Nothing writes into L1 except
the event ingest endpoint (D.3). This single rule is what makes the whole record
auditable: there is exactly one door into the truth.

**H.1.b — snapshots are not merely caches.** L3 is separate from L2 because a
snapshot answers *"what did we believe on 4 March 2027?"*, which is not
recomputable once the formula changes. Keeping `formula_version` (C.3) is what
lets a 2026 score and a 2028 score be honestly compared — or honestly declared
incomparable.

### H.2 Long-term retention

- L1 is retained **for the life of the account**, subject only to the
  compaction rules in D.5, and permanently for any referenced event (D.5.a).
- L2 is retained but disposable: it may be truncated and rebuilt at any time.
  That property is a hard requirement, not an optimisation — it is how a formula
  correction is deployed without rewriting history by hand.
- L3 is retained forever; snapshots are small and their value is entirely
  historical.
- An exported account (Part O.1) contains L1 + L3 + L5. L2 is excluded from the
  export *body* but its derivation rules are documented in the export manifest,
  so a third party can reproduce it. Shipping L2 in an export would imply the
  derived numbers are facts.

### H.3 Indexing and search

**TARGET DESIGN — no new datastore** (B.17). Three indexes over the same
Postgres:

1. **Structured** — B-tree/composite indexes matching the query shapes: by
   concept, by date range, by subject, by outcome, by pattern status. The
   existing schema already models these well (`occurrences_concept_idx`,
   `patterns_leaf_severity_idx`, `007_mistakes.sql:212, 302`).
2. **Lexical** — Postgres `tsvector` over `declared_text`, question stems,
   concept labels, marker notes.
3. **Semantic** — `pgvector` embeddings over concept labels and declaration
   text only. **Deliberately not over answers or evidence content**: embedding
   the student's own wrong answers creates a similarity surface with no academic
   query behind it and a real privacy cost.

**Justification for staying in Postgres:** the stack is already Supabase
Postgres, and adding a search service would introduce a second source of truth
for "what exists," which H.1.a forbids. The index is rebuildable from L1; a
separate service would not be.

### H.4 Natural-language query support

The brief states the Constitution names five example queries. **UNVERIFIABLE —
no such list exists in the repository** (Governance Note). The five below are
representative of the classes the design must handle, and the design is
specified so that each is answerable *deterministically, with citations*.

**The pipeline (B.17, made concrete):**

```
question → [AI]  → StructuredQuery (validated schema, NOT SQL)
                 → [deterministic] planner → SQL → rows
                 → [AI] narration constrained to the returned rows
                 → answer + citations (record type, id, timestamp)
```

`StructuredQuery` is a closed schema:
`{ intent, subject?, concept_ref?, date_range?, outcome_filter?, entity ∈
{event, session, assessment, occurrence, pattern, score_snapshot, declaration},
aggregation?, comparison? }`. **AI never emits SQL and never sees the database.**

| # | Example query | Resolves to | Answered from |
|---|---|---|---|
| 1 | *"When did I first study Torque?"* | `intent=first_occurrence, entity=event, concept_ref=Torque` | earliest `CONCEPT_CONFIRMED`/`EXTERNAL_STUDY_DECLARED` for that concept — requires stable concept identity (B.4) |
| 2 | *"What do I keep getting wrong in Physics?"* | `intent=rank, entity=pattern, subject=Physics, outcome_filter=open` | `patterns` leaves ordered by `severity DESC`, via `patterns_leaf_severity_idx` |
| 3 | *"Am I better at Organic Chemistry than I was in March?"* | `intent=compare, entity=score_snapshot + assessment, comparison=period` | `ScoreSnapshot` series + accuracy over `AssessmentAttempt`, both windows stated explicitly |
| 4 | *"What have I studied but never been tested on?"* | `intent=set_difference, entity=session_concept, outcome_filter=studied_not_assessed` | `AcademicRecord.coverage_state = 'studied'` — **only expressible because coverage state is a first-class field** |
| 5 | *"Show me every mistake behind my sign errors."* | `intent=trace, entity=occurrence, pattern_ref=<global sign-error pattern>` | pattern → descendant leaves → `occurrenceIds` → `occurrences` → `evidence` |

**H.4.a — the refusal contract.** If the structured query returns zero rows, the
answer is *"no record found"* plus the query that was run. It is never a
plausible sentence. If the AI cannot produce a valid `StructuredQuery`, the
system says so and offers the structured filters instead. **The model is never
asked a question it could answer from its own weights.**

**H.4.b — every narrated answer renders citations.** Record type, ID, date. This
is what makes the memory checkable, and it is the difference between a memory
system and a chatbot with a database nearby.

### H.5 Historical comparison

Comparisons are computed by deterministic code over L1/L3, never by a model, and
every comparison carries three qualifiers: the two windows, the evidence count
in each, and whether the `formula_version` differed between them. A comparison
across a formula change is labelled as such rather than silently rendered as
improvement. **This is the honest-comparison requirement implied by Law 7**
(`PRODUCT_PRINCIPLES.md:82-83`) and it is the reason `formula_version` is a
stored column rather than a deployment detail.

### H.6 What already exists and should feed this

**CURRENT FACT — an unexploited server-side activity stream.** `ai_history`
(`000_initial_schema.sql:55-65`) receives every successfully parsed AI response
with `user_id`, `tool`, a 300-char input excerpt, full `output JSONB`, `grade`
and `board` (`app/api/ai/route.ts:2701-2718`, re-verified). Nothing reads it in
the product. **UNVERIFIABLE:** row count and retention in production.

**TARGET:** it is superseded by `ai_invocations` (B.20) for provenance, and its
historical rows are a **candidate backfill source for memory** — but only as
`AcademicHistoryEntry`-class declared data, never as verified evidence, because
an AI output is not proof of learning.

---

## PART I — PERSONAL MODEL

### I.1 Scope and non-scope

**In scope:** how this student prefers to receive things, which formats they
abandon, which correction methods precede their resolutions, which times of day
they actually work, what depth they start succeeding at.

**Out of scope, permanently:** anything about ability, potential, personality, or
predicted outcomes framed as fixed. `PRODUCT_PRINCIPLES.md:355-368` — the
product's territory is *"change over time, not accumulation"*, and *"a mirror
that flatters is worthless as a mirror."* A model that told a student what they
*are* rather than what they *do* would be both unevidenced and off-thesis.

### I.2 Dimensions — a bounded, typed list

**TARGET DESIGN.** The model is a fixed set of typed dimensions, one row each,
**not** a free-form bag. Adding a dimension is a code change and a migration —
deliberately, so the model cannot grow opaquely at runtime.

| Dimension | Type | Explicit source | Inferred source |
|---|---|---|---|
| `explanation_style` | enum (`examples-first`, `theory-first`, `bullet-points`, `step-by-step`) | onboarding / settings | which formats are re-read vs abandoned |
| `communication_tone` | enum (`simple`, `conversational`, `detailed`, `direct`) | settings | length of engagement per tone |
| `question_format_mix` | weights over `{mcq, numeric, short_text, ordering, match}` | settings | completion and accuracy by format |
| `difficulty_preference` | enum (`gentle`, `matched`, `stretch`) | settings | abandon rate by depth |
| `session_length` | minutes | settings | observed session durations |
| `working_window` | hours-of-day distribution | settings (chronotype) | `received_at` distribution of `E`-class events |
| `correction_method` | enum (`worked-example`, `first-principles`, `contrast-pair`, `drill`) | settings | which method precedes resolutions |
| `notification_appetite` | enum (`minimal`, `standard`, `off`) | settings | open/action rate |
| `recommendation_aggressiveness` | enum | settings | dismissal rate |

**CURRENT FACT — two of these already exist and are already wired to the AI.**
`AiProfile.learningStyle` (4 options) and `communicationStyle` (4 options),
`lib/user-data.ts:11-14`, consumed at `app/api/ai/route.ts:193-215`. The
personalisation text is substantial and well-written. **It reaches 7 of 86
prompts** (Finding A.6.a, re-verified: `profileCtx` occurs 8 times against 87
uses of `SAFETY_PREAMBLE`) **and it is client-supplied** (`buildProfileContext`
reads `params.*`, `:134-138`). **ADAPT: keep the content, move the source
server-side, apply it universally.**

### I.3 The pipeline

```
observed behaviour  (AcademicEvent, L1)
        │  deterministic extractor, one per dimension, versioned
        ▼
PersonalModelSignal (L1, append-only)  { dimension, observed_value, weight,
                                          source_event_id, observed_at }
        │  deterministic aggregator (I.5)
        ▼
PersonalModel row   (L2, rebuildable)  { explicit_value, inferred_value,
                                          confidence, evidence_count,
                                          last_signal_at }
        │  effective_value := COALESCE(explicit_value, inferred_value)
        ▼
personalisation decision  (assessment slot selection, AI prompt assembly,
                           notification timing, recommendation phrasing)
```

**Every arrow is deterministic. No AI writes to any box in this diagram** (B.9).
AI may *propose a new dimension worth tracking*, which is a pull request, not a
runtime write.

### I.4 Signal extraction — what counts as a signal

A signal must be derivable from an event that already exists for an academic
reason. **The Personal Model may not cause new telemetry to be collected.**
That constraint keeps the surveillance surface equal to the academic surface.

Examples: an `EXPLANATION_READ` with high `dwell_ms` followed by a correct
answer on that concept ⇒ positive signal for that explanation style. A question
format with a high `QUESTION_STARTED`-without-`QUESTION_ATTEMPTED` rate ⇒
negative signal for that format. A `MISTAKE_RESOLVED` whose proof attempts were
preceded by `correction_method = drill` ⇒ positive signal for drill.

### I.5 Confidence, evidence, recency, decay

- **`confidence ∈ [0,1]`** = `f(evidence_count, agreement_among_signals,
  recency)`. It is **not** a probability; it is a disclosure. It is rendered
  wherever an inference is shown.
- **`evidence_count`** is the raw number of contributing signals and is always
  available to the student.
- **Decay is applied at read time**, never by rewriting rows:
  `decayed_confidence = confidence · 0.5^(days_since_last_signal / HALF_LIFE)`.
  Two consequences: signals are never destroyed by ageing, and a stale inference
  becomes *uncertain* rather than *wrong*.
- **Below `CONFIDENCE_FLOOR`, an inference is not used at all.** The system falls
  back to the product default and says so. `PRODUCT_PRINCIPLES.md:82-83` — an
  honest default beats a confident guess.

### I.6 The explicit-over-inferred guarantee — mechanism, not policy

**TARGET DESIGN. Four independent mechanisms, because a policy in a comment is
not a guarantee.**

1. **Two columns, not one.** `explicit_value` and `inferred_value` are separate
   (C.3). The aggregator has write access to `inferred_value` only —
   enforced by column-level `GRANT`. **An inference is physically incapable of
   overwriting a choice.**
2. **Resolution is a generated column.**
   `effective_value := COALESCE(explicit_value, inferred_value, default)`.
   There is no code path that computes the effective value differently, because
   there is no code path that computes it at all.
3. **Setting is an event.** `PREFERENCE_SET` (D.2) is append-only, so *what the
   student chose and when* is in L1 and survives any rebuild of L2. Replaying
   the stream restores explicit choices exactly.
4. **Sticky by construction.** Because `explicit_value` is only ever written by
   `PREFERENCE_SET`, there is no "the system re-learned it" path. Clearing an
   explicit choice requires an explicit `PREFERENCE_SET{value: null}`, which is
   itself recorded.

**I.6.a — inspectability and reversal.** Every inference is visible with its
`confidence`, `evidence_count`, `last_signal_at`, and a link to the contributing
signals. "Why does it think this?" is answerable by query, not by asking a
model. Overriding is one action and takes effect immediately, on the next read,
with no retraining delay — because there is no training.

---

## PART J — LEDGER SCORE

### J.1 Derivation from the target architecture — not from the current formula

**Method.** Rather than adjusting `lib/ledger-score.ts`, the required inputs are
derived from what Parts D–G actually produce, and only then compared to what
exists (J.8).

The event stream produces exactly four kinds of academic fact:
**(1)** what the student has engaged with (`CONCEPT_CONFIRMED`,
`EXTERNAL_STUDY_DECLARED`); **(2)** what has been tested and with what outcome
(`ASSESSMENT_COMPLETED`, `QUESTION_CORRECT/WRONG` at a known depth);
**(3)** what has gone wrong, recurred, and been proven fixed (`MISTAKE_*`); and
**(4)** when all of the above happened. A score is a function of these and
nothing else.

### J.2 Dimensions

**TARGET DESIGN — four dimensions, 1000 points.** Names are deliberately close
to the existing sectors so the `score_history` column mapping survives, but
**the Momentum/streak dimension is removed** (T-0.2) and replaced.

| Dimension | Max | What it measures | Primary inputs |
|---|---|---|---|
| **Verified Performance** | 400 | how well the student performs on assessed concepts, weighted by depth and recency | `AssessmentAttempt` outcomes, `question.depth` |
| **Proven Coverage** | 250 | how much of the declared syllabus has been *proven*, not merely touched | `AcademicRecord.coverage_state`, `StudentProfile.subjects` |
| **Recovery** | 200 | mistakes faced, evidenced, and closed with proof | `patterns`, `MistakeResolution`, `Evidence` |
| **Continuity** | 150 | whether verification is *keeping pace* with study | ratio of verified to studied concepts over a trailing window |

**J.2.a — why Continuity replaces Momentum.** Momentum is `min(150, streak ×
7.5)` (`lib/ledger-score.ts:218`) — a pure streak term, and
`PRODUCT_PRINCIPLES.md:151-153` bans streaks permanently. Continuity measures
something the product actually cares about — *is the record staying true?* — and
has the right failure mode: it falls when a student studies a lot and verifies
none of it, and it is **unaffected by a day off**. A student who studies twice a
week and verifies both sessions has full Continuity. **This is the single
largest behavioural change from the current score, and it is required by ratified
law, not by taste.**

**Ratified 2026-08-10** (`PRODUCT_DECISIONS.md` §9.3). Three consequences bind
the implementation:

1. **No consecutive-day mechanic is a scoring input, anywhere.** The dependency
   *"studied X days in a row, therefore academically better"* is removed from the
   model, not relocated within it.
2. **This is a rebuild, not a rename.** Renaming the shipped streak variable to
   `continuity` does **not** implement this decision. The streak term is deleted;
   Continuity is computed from verified sessions, demonstrated learning and
   assessment participation over a rolling window. Every subsystem currently
   reading the streak — the v1 and v2 engines, `lib/focus-context.tsx`,
   `lib/notifications.ts`, `lib/parent-digest.ts` — is classified in Parts S and
   W, and none of them survives as a scoring input.
3. **Continuity may never be shaped like a streak in presentation.** No counter,
   no cliff, no daily punishment, no guilt copy, no "you broke your streak"
   notification. Missing a day moves nothing. The sentence the product may say is
   *"your learning has been consistent"*; the sentence it may never say is *"you
   haven't broken your chain."* This is `PRODUCT_PRINCIPLES.md` §4 and §4.2
   applied to the replacement, so the replacement cannot inherit the ban's
   original failure mode.
4. **The ratified *definition* governs; the verified:studied ratio is one
   candidate *formula* for it.** §9.3 defines Continuity as *sustained, verified
   academic engagement over a reasonable rolling window, from verified sessions,
   demonstrated learning, assessment participation and academic activity* — it
   does not mandate a ratio. The ratio in the table above is this document's
   proposal, and it carries the known tension recorded at J.7.3: a ratio has a
   denominator, and a denominator that grows with capture is the exact shape
   §3.3 forbids. **If the J.7.3 carve-out cannot be made airtight in
   implementation, the formula changes and the definition does not.** No
   Continuity formula may make declaring external study (E.5) cost the student
   anything — that is `PRODUCT_PRINCIPLES.md` §3.3 and §3.5 together.

### J.3 Evidence requirements per dimension

| Dimension | Minimum evidence to be non-zero | Below minimum |
|---|---|---|
| Verified Performance | ≥1 completed assessment with ≥`MIN_SESSION_QUESTIONS` graded closed-form items | dimension reported as **`insufficient evidence`**, not 0 |
| Proven Coverage | a declared subject list **and** ≥1 concept at `coverage_state = 'proven'` | `insufficient evidence` |
| Recovery | ≥1 occurrence with evidence | `insufficient evidence` |
| Continuity | ≥2 sessions in the trailing window | `insufficient evidence` |

**J.3.a — `insufficient evidence` is a distinct state from zero, everywhere.**
Zero means *measured, and the measurement is zero.* Insufficient means *not
measured.* Rendering the second as the first is a lie in the strict sense of
Law 7. **CURRENT FACT — this is exactly what the live engine does:** `EMPTY`
(`lib/ledger-score.ts:29-34`) sets every pillar to `0`, and
`computeScoreFromInputs` returns `EMPTY` from its `catch` (`:263`). A student
with no data and a student whose score computation threw are indistinguishable
from a student who scored zero.

### J.4 Baseline period

**TARGET DESIGN.** A new student has **no score**, displayed as such, until the
baseline conditions are met: at least `BASELINE_SESSIONS` verified sessions
across at least `BASELINE_SUBJECTS` subjects, or `BASELINE_DAYS` elapsed with
any verified evidence — whichever comes first. Before that, the product shows
*evidence collected so far* and what remains.

**Justification:** a first score computed from one assessment is dominated by
noise; showing it and then watching it move 300 points teaches the student the
number is arbitrary. **ARCHITECTURAL INFERENCE** — the exact thresholds are a
product decision.

**CURRENT FACT — the cold-start path that must not survive.**
`computeTemporaryScore` (`lib/ledger-score.ts:310-358`) builds a **synthetic
`ScoreInputs`** from self-rated confidence (`shaky 0.3 / ok 0.6 / solid 0.9`),
including a fabricated 20-mark paper, and runs it through the real engine. It is
carefully typed to prevent mixing (`kind: "temporary" | "real"`) and is never
persisted — that discipline is real and commendable. **But it is a score derived
from self-report**, and self-reported competence is the fluency illusion the
product exists to replace (`PRODUCT_PRINCIPLES.md:96-104`). The baseline model
replaces it. **ADAPT: keep the diagnostic as a *gap finder* — its `gapTopics`
output is genuinely useful — and stop calling its output a score.**

### J.5 Confidence, trajectory, and movement

- **Confidence** is a first-class output, computed from evidence volume,
  recency, and breadth across subjects, and stored on every snapshot. It is
  displayed alongside the number. A 700 built on three assessments and a 700
  built on forty are not the same claim.
- **Trajectory** is computed over `ScoreSnapshot` history with an explicit
  window, and is suppressed entirely below `BASELINE`. `lib/score-market.ts` and
  the "newly listed"/zero-base guards it already implements are the correct
  precedent (Finding A.7.6) — **KEEP**.
- **Every movement is explainable**: each snapshot stores per-dimension deltas
  plus the event IDs that caused them. *"Why did it go up?"* is answered from
  data. No model writes the number; a model may write the sentence (B.10).

### J.6 Update frequency

- **Recomputed on `E`-class events** (assessment completion, resolution,
  recurrence) — so the Return beat (`PRODUCT_PRINCIPLES.md:274-284`) is real:
  the figure moves because of what the student just did.
- **Snapshotted once daily** by the cron, one row per student per day —
  `UNIQUE(user_id, captured_on)` (`005_score_history.sql`) already enforces this.
- **Recomputed in bulk on a `formula_version` change**, writing new snapshots
  rather than editing old ones.

### J.7 Declines, mistakes, non-punitiveness, anti-gaming

**Declining performance is shown, honestly and without verdict.** The score
falls when *verified performance* falls. `PRODUCT_PRINCIPLES.md:141` — *"A down
day shows the honest figure and one recovery action — never a verdict."* The
architectural requirement is that a decline always ships with a per-dimension
explanation and a recommendation, both derived, both evidence-backed.

**Capture never lowers the score. Non-negotiable** (`PRODUCT_PRINCIPLES.md:114-121`).
Made structural by three rules:

1. **Recovery uses counts with ceilings, never proportions.** A new open pattern
   enters no denominator, so recording it cannot reduce any term. This is
   already the shipped design and its in-code rationale
   (`lib/ledger-score.ts:157-181`) is correct and should be preserved verbatim.
2. **Verified Performance is computed over *assessed* items only.** An
   unresolved mistake is not an assessed item, so it has no weight there either.
3. **Continuity measures the verified:studied *ratio*** — capture raises the
   denominator, so it *can* move Continuity down. **This is a real conflict and
   it is resolved explicitly:** the denominator counts only concepts the student
   *confirmed and then declined to verify*, never concepts where a mistake was
   *recorded*. Recording a mistake is verification, not avoidance of it.
   **Extended for external study (§3.5, E.5):** a freshly declared, not-yet-tested
   concept does **not** enter the denominator either. Declaring five concepts
   from a coaching class and testing none of them tonight may not lower
   Continuity — the denominator admits a concept only after it has been
   confirmed *and* had a fair opportunity to be assessed. **If this carve-out
   proves unmaintainable, the ratio is abandoned rather than the invariant**
   (J.2.a.4): §3.3 and §3.5 outrank any particular Continuity formula.

**Anti-gaming.** Per-day counted-question cap (`DAILY_QUESTION_CAP = 60`) and
per-session minimum (`MIN_SESSION_QUESTIONS = 5`), applied identically
client- and server-side — the v2 engine's invariant I4
(`lib/ledger-score-v2.ts:16-17, 78-79`), **kept**. Plus: evidence dedup by
`content_hash`; pattern dedup by merge key; the 7-day cooling period on
resolution; assessment questions never repeat a stem; and — the strongest of all
— **the score is computed only on the server, from server-written events.**
`PRODUCT_PRINCIPLES` has no clause on gaming; this follows from Law 7 and B.10's
*"a client-computed score is a client-forgeable score."*

### J.8 Comparison with `lib/ledger-score.ts` and `lib/ledger-score-v2.ts`

Both files read in full this pass.

**KEPT from v1 (`lib/ledger-score.ts`):**
- **The client/server unification pattern.** `readScoreInputs()` (`:67`) and
  `scoreInputsFromBlob()` (`:92`) both produce a `ScoreInputs` fed to the single
  `computeScoreFromInputs` (`:110`). **No formula is duplicated anywhere** across
  seven consumers. This is the best-engineered thing in the score layer and the
  target keeps it exactly — only the *input source* changes from blob to events.
- **The capture-never-punishes invariant and its counts-with-ceilings
  implementation** (`:157-215`).
- **Dedup by pattern id** with the comment *"repetition must never manufacture
  score"* (`:186-193`).
- **`scoreTier`** as a pure function (`:360-366`).

**KEPT from v2 (`lib/ledger-score-v2.ts`):**
- **Exponential accuracy decay with no window cutoff** (`:107-115`), which makes
  the term shift-invariant so inactivity alone cannot raise the score (invariant
  I2, `:11-14`). The current v1 accuracy is a plain lifetime mean and does not
  have this property.
- **Logarithmic volume factor** (`:127-129`) and the **sequence-based**
  improvement bonus (`:132-145`) — sequence rather than wall-clock, again for
  inactivity-invariance.
- **Proof-gated coverage** (`PROOF_SESSION_MIN_Q = 10`, `PROOF_SESSION_MIN_ACC =
  0.6`, `:84-85`, applied at `:150-156`). **This is the direct ancestor of
  `coverage_state = 'proven'` in the target model.**
- **The anti-gaming caps** (J.7).
- **`RECOVERY_EPOCH_MS`** (`:75`) — the principle that records predating a system
  are archived rather than treated as an unclearable backlog. The target
  generalises this: any pre-event-layer data enters as `legacy`, never as `open`.

**CHANGED:**
- **Inputs.** Both engines read `localStorage` / the blob. The target reads
  events. Everything else follows from this.
- **The Momentum/streak dimension is deleted** (J.2.a). Both engines compute
  `min(150, streak × 7.5)` (v1 `:218`, v2 `:220`) — identical, and identically
  in breach of `PRODUCT_PRINCIPLES.md:151`.
- **`insufficient evidence` becomes a representable state** (J.3.a). Neither
  engine can express it; both return 0.
- **`formula_version` and `confidence` become stored snapshot columns**, making
  scores reproducible and comparable-or-declared-incomparable.
- **Coverage stops being a 10-item rolling window.** **CURRENT FACT:**
  `app/tools/learn-lab/page.tsx:61` writes `.slice(0, 10)`, so the Coverage
  pillar is computed from at most the last ten notes. Study an eleventh subject
  and the first silently stops counting (Finding A.3.e).

### J.9 The mistake-pillar defect — corrected diagnosis

The brief describes this as "a status enum mismatch making that pillar
permanently zero." **Verified, and the diagnosis needs refining in two ways.**

**What the code actually says.** The v1 pillar pays for three things
(`lib/ledger-score.ts:198-213`): `resolvedCount` (`status === "resolved"`),
`evidenceCount` (distinct non-empty `evidenceId`), and `facedCount`
(`status ∈ {acknowledged, practising, resolved, recurred}`). The only creator of
mistakes is `app/tools/exam-practice/page.tsx:192-199`, writing
`{id, date, subject, topic, category, status: "open"}`; the only status mutation
is `:57`, `m.status = "cleared"`. **No code path anywhere writes `evidenceId`.**
Therefore all three terms are identically zero and `mistakeScore ≡ 0` for every
user, permanently — the real ceiling is 800/1000 while `scoreTier` places "Exam
Ready" at ≥800 (`:361`).

**Refinement 1 — it is not only an enum mismatch; `evidenceCount` has no writer
at all.** Even if `"cleared"` were renamed `"resolved"` tomorrow, `evidenceScore`
would stay 0 because nothing in the product creates evidence IDs. Two independent
defects wear one symptom.

**Refinement 2 — v2 reads the shipped vocabulary correctly.**
`MistakeEntryV2.status` is typed `"open" | "cleared"` (`lib/ledger-score-v2.ts:31`)
and the recovery pillar at `:193-215` consumes exactly those values. **So the
enum mismatch runs the other way from what one would assume: the *shadow* engine
speaks the language the product writes, and the *live* engine does not.** v2 is
computed by `app/api/cron/score-snapshot/route.ts:4`, logged as a delta, and
**discarded** — the row written to `score_history` is v1 (`:71-82`).

**Is it fixable by adaptation?** **Partly, and the partial fix is a trap.**

- A three-line adaptation — teach v1 the `"cleared"` status — would make
  `resolutionScore` and `acknowledgementScore` non-zero within a day. It would
  also mean **the student's own click resolves their own mistake**, since
  `exam-practice:57` is a client-side status write. That directly violates
  `PRODUCT_PRINCIPLES.md:96-104` and defeats the RLS rule
  `007_mistakes.sql:369-376` designed to prevent it. **The cheap fix converts a
  dead pillar into a self-awardable one, which is strictly worse.**
- `evidenceScore` is **not** fixable by adaptation under any circumstances,
  because evidence does not exist as a concept in the shipped product. It
  requires the `evidence` table, a capture path, and `content_hash` dedup — i.e.
  it requires the target architecture.

**Verdict: the pillar requires the new model.** Specifically it requires
`occurrences` + `evidence` + a system-only resolution path with proof
(`canResolve`, `engine.ts:394-429`). The domain code for all of that already
exists and is tested; only the wiring is missing (G.1).

**J.9.b — ratified 2026-08-10: REBUILD, and the enum patch is rejected**
(`PRODUCT_DECISIONS.md` §9.4). The defect is an **evidence architecture**
problem, not a status-vocabulary problem, and the fix is the pipeline, whole:

```
Academic Event → Study Session → Assessment → Assessment Evidence →
Mistake Occurrence → Mistake DNA → Correction → Retest →
Verified Resolution → Ledger Score Evidence
```

Two hard constraints, binding wherever resolution or mistake-derived score is
discussed in this document:

> **A mistake is not "resolved" because the student says it is resolved.
> Resolution requires evidence.**
>
> **A student cannot earn mistake-related score simply by declaring or
> manipulating a mistake state.**

**Presentation state is never score evidence.** No path may exist from a
client-side dismissal, an edit to a mistake row, or any other presentation-layer
act to a movement in the Recovery dimension. This is the same refusal D.2.a
enforces at three layers, stated as a scoring rule.

**On reuse.** `lib/mistakes/*` is retained for its **domain logic** — lifecycle,
merge rules, and the `canResolve` proof gate (S.3). That is a reuse judgement
about behaviour, and it carries **no presumption** that the module's current
persistence or evidence assumptions are the target: they are not. "Keep the
domain engine" never means "keep the storage model."

**Until the pipeline exists**, the pillar is reported as an explicit *"not yet
scored"* state (J.3.a), never as a zero the student could believe is a
measurement, and never as a number a patch could make move.

**J.9.a — the downstream damage must be fixed at the same time, not later.**
Two shipped surfaces promise points this pillar cannot pay:
`lib/console/next-move.ts:79-89` surfaces *"Clear N open mistakes"* with a gain
from `projectMistakeReductionImpact`, which simulates `status: "resolved"`
(`lib/score-projection.ts:118-132`) — a state no production action produces —
under a header comment claiming *"the number shown is the number the student
will actually get"*; and `lib/notifications.ts:185` pushes *"Resolving them is
worth up to 120 score points."* **These are Law 7 violations
(`PRODUCT_PRINCIPLES.md:82-83`) and they must be silenced before or with the
pillar fix, never after.** A recommendation may state expected benefit only if
the mechanism that delivers it exists and is reachable (B.11).

---

## PART K — RECOMMENDATION ENGINE

### K.1 Candidate generation

**TARGET DESIGN.** Each subsystem exposes a pure `candidates(context) →
Candidate[]` function. The engine unions them; no subsystem ranks globally.

| Source | Candidate kinds |
|---|---|
| Mistake DNA | work an open pattern; take a due retest; a pattern has recurred |
| Assessment | verify an unverified session; a coverage hole exists |
| Academic Record | a declared subject has no proven concept; a concept is decaying |
| Goals | an exam approaches with weak coverage in its subjects |
| Session Engine | a `DORMANT` session is about to be reaped |
| Personal Model | a preference is inferred with high confidence — offer to make it explicit |
| Data Ownership | an open `CorrectionRequest` awaits the student's input |

Every candidate carries `evidence_refs` at construction. **A candidate that
cannot name its evidence is not constructible** — `Recommendation.evidence_refs`
is `NOT NULL` with an `array_length ≥ 1` CHECK (C.3).

### K.2 Priority

`priority = expected_academic_benefit × urgency × fit − fatigue`

- **`expected_academic_benefit`** is measured in *academic* terms — marks at
  risk, concepts unproven, patterns open — **never in score points.** Ranking by
  score points teaches the student to optimise the number (`PRODUCT_PRINCIPLES.md:281-284`).
- **`urgency`** is goal/exam proximity. **Note the double-weighting risk
  inherited from G.6.a**: if `examProximity` is already inside severity, it must
  not be multiplied again here. The engine takes severity as given and applies
  urgency only to non-mistake candidates until that decision is made.
- **`fit`** comes from `PersonalModel` — format, session length, working window.
- **`fatigue`** is a penalty from `RecommendationOutcome` history: repeatedly
  ignored kinds lose priority.

### K.3 "Guide, never gate" — the mechanical definition

**A recommendation is a row in a table that some surfaces read. It has no write
access to any other subsystem and no ability to change any state.** Therefore:

- **No recommendation can block an action.** There is no `blocks` field, no
  `required` flag, no gating check anywhere in the codebase that reads the
  recommendations table. **Answer to the brief's question: no, never.**
- **No recommendation can unlock an action.** `PRODUCT_PRINCIPLES.md:155-159` —
  *"Milestone-gated unlocking is gamification… nothing is ever announced as
  unlocked."*
- **Dismissing costs nothing** — no score effect, no follow-up penalty.
- **The student may always do something else**, and doing something else is
  itself an outcome signal, not a violation.

**Enforcement is architectural, not procedural:** the recommendations table is
read-only to every subsystem except the Recommendation Engine and the
outcome-recording path. There is no code path through which a recommendation
could gate anything, which is a stronger guarantee than a rule saying it must
not.

### K.4 Persistence, dismissal, and being ignored

- **Active** recommendations persist across sessions and devices; they are
  server-side rows, not client state.
- **Dismissed** → `state = 'dismissed'`, an outcome row, and the `dedupe_key` is
  suppressed for a cooling window.
- **Ignored** — surfaced N times without action — → `state = 'ignored'` on
  expiry. Being ignored is a *signal about the recommendation*, not about the
  student.
- **Superseded** when the underlying condition changes (the pattern resolved,
  the exam passed). The row is closed with `outcome = 'superseded'`, never
  silently deleted, because the sequence of what was suggested and what actually
  happened is how K.8 learns.

### K.5 Escalation without shaming

Escalation changes **channel and prominence**, never tone, and never adds a
judgement. The permitted ladder: in-context surfacing → Today placement →
in-app notice → push (subject to quiet hours and appetite) → inclusion in a
parent report *only if the share policy already permits that category*.

**Forbidden by `PRODUCT_PRINCIPLES.md:134-141` and enforced as content rules on
the fixed factual templates:** no "you've been inactive for N days", no "you're
behind", no red counters, no comparison to other students, no escalation whose
trigger is *absence* rather than an academic condition. AI may adapt tone within
a template; it may not author the claim (B.11, B.18).

### K.6 Outcome tracking

Every recommendation closes with a `RecommendationOutcome` (C.3). Where the
recommendation named a concrete academic target — *"retest this pattern"* — the
outcome links the resulting session or resolution, so *"do our recommendations
actually close gaps for this student?"* is answerable from data. That is the
feedback loop that lets `correction_method` become an evidenced dimension of the
Personal Model rather than a guess (I.4).

### K.7 Decay

Recommendations expire. `expires_at` is set at creation from the kind — a
"verify yesterday's session" prompt is worthless in a week, while "this pattern
is open" is durable. On expiry: `state = 'expired'`, outcome recorded, and the
`dedupe_key` cools before the condition may regenerate it. **This is what
prevents the same suggestion appearing every day for a month**, which is the
practical form of shaming.

### K.8 Next-best-action

Exactly one action is surfaced as *the* next move
(`PRODUCT_PRINCIPLES.md:272`, *"Exactly one move, phrased as a verb"*). The
selection is deterministic: highest `priority`, tie-broken by earliest
`expires_at`, then by lowest recent-surface count. Ties are broken *stably* so
the same action does not shuffle between page loads — a shuffling "one move"
reads as randomness and destroys the claim that the system knows what matters.

---

## PART L — TODAY ENGINE

### L.1 What Today is

A continuously regenerated, ordered list of typed, evidence-backed items
answering *"what matters right now?"* — subordinate to the home surface's
governing question, *"What should I fix next?"* (`PRODUCT_PRINCIPLES.md:42-46`;
`PRODUCT_DECISIONS.md:113-120`, the NOW surface).

Today owns **no facts**. It is a projection with a cache and one durable field,
`students.last_seen_at` (B.12).

### L.2 Inputs

| Input | Contributes |
|---|---|
| current academic state (`AcademicRecord`, score + confidence) | orientation item |
| open session (`ACTIVE`/`DORMANT`) | resume item |
| recent completed sessions since `last_seen_at` | "what changed" |
| unverified sessions | verification follow-up |
| unresolved weaknesses, due retests | fix items |
| goals and exam deadlines | countdown / priority items |
| recommendations (K) | the next-best-action item |
| accomplishments since `last_seen_at` | evidence items (E.8) |
| preferences | volume, format, ordering |
| ignored-recommendation history | suppression |
| context (time of day, device, working window) | timing |

### L.3 Generation

Deterministic selection and ordering. Inputs are hashed into `input_hash`; the
cache is invalidated by any event that touches a contributing projection. AI's
only permitted role is compressing a **deterministically computed diff** into one
sentence (B.12) — it never selects, orders, or invents an item.

Volume is bounded (a small fixed maximum), and items are typed so the Home
Composition system (Part M) can place them rather than receiving a pre-rendered
blob.

### L.4 Non-fabrication — what happens when there is nothing

**The rule: Today emits zero items rather than one invented one.**

When no input yields a candidate, `TodayState.items = []` and `empty_reason` is
set to one of a closed set: `no_evidence_yet` (new account, pre-baseline),
`all_current` (nothing open, nothing due), `awaiting_verification` (the only
outstanding thing is the student's own choice to verify or not),
`insufficient_data` (an ingest or projection failure — surfaced honestly as a
system state, never as "you're all caught up").

The surface then shows *an invitation with exactly one control*
(`PRODUCT_PRINCIPLES.md:288`), and the empty state is chosen by `empty_reason`,
not by a generic placeholder.

**Explicitly forbidden — and each of these must be impossible, not merely
discouraged:** motivational filler; a fabricated statistic; a synthetic streak or
"days active" figure; a peer comparison; a recommendation with no evidence
reference (structurally impossible per K.1); a "suggested topic" not derived from
the student's own record.

**CURRENT FACT — the live precedent for what this must not be.**
`app/api/awake-count/route.ts:5-11, 41-44` hardcodes `STREAM_SIZES`
(jee 1.4M, neet 2M, cbse 3.8M…), computes `pctAwake = 0.92 · e^(−0.0697·m)`,
adds `Math.random() * 0.04 − 0.02` jitter, and returns `awakeCount` and a
`percentile` — **every number invented** — rendered as live social proof between
23:30 and 00:15 IST via `components/rank-whisper.tsx`, mounted globally through
`components/legacy-chrome.tsx:25`. Re-verified this pass. It is a direct
violation of Law 7 (`PRODUCT_PRINCIPLES.md:82-83`) and it is classified DELETE in
Part S.

### L.5 Continuity of Today across time

`last_seen_at` advances only when Today is actually rendered, so a student who
opens the app twice in a minute does not lose their "what changed" summary. An
accomplishment is shown **once** and then moves into the record — it does not
persist as a badge. `PRODUCT_PRINCIPLES.md:281-284`: the Return beat states what
changed and then stops being news.

---

## PART M — HOME COMPOSITION

*Information architecture only. Visual design is governed by
`PRODUCT_PRINCIPLES.md` §6 (Console) and is out of scope here.*

### M.1 The division of authority

| Concern | Owner |
|---|---|
| what data exists, and what is important | **the system** |
| which components are visible, in what order, at what size | **the student** |
| what is *critical* enough to override the student's order | **the system**, under M.5's constraints |
| what a component looks like | the design system |

Neither side may silently overwrite the other (B.13). The system never rewrites
`HomeLayout`; the student never rewrites importance.

### M.2 The component registry

**TARGET DESIGN.** Every home component declares, as data:

```
{ component_id, data_dependencies[], min_size, max_size, default_size,
  default_order, can_be_hidden, importance_capable, empty_behaviour,
  mobile_rank }
```

Consequences of making this a registry rather than JSX: a component whose data
dependency is unavailable is *omitted*, not rendered empty; hideability is a
property of the component, not a fight with the layout; and the mobile order is
declared rather than emergent.

`can_be_hidden = false` applies to exactly one thing: the Score, which
`PRODUCT_PRINCIPLES.md:257-261` defines as **persistent chrome** — *"always
visible, like a battery indicator"*. Because it is chrome, it is arguably not a
home component at all; the registry records it as non-hideable and
non-reorderable to make the constraint explicit.

**CURRENT FACT — the gap.** Composition today is five booleans
(`recommendation | recent | score | exams | features`) in
`localStorage["ledger-dash-layout"]` (`lib/dash-layout.ts:1-12`), unsynced, with
no ordering, no sizing, no registry, and no importance channel. The stated
control is `score: true|false`, which is in direct tension with §6.8's
"persistent chrome."

### M.3 Layout resolution

```
registry defaults
    ⊕ student HomeLayout          (visibility, order, size, pinned)
    ⊕ system importance signals   (per-component, 0..1, evidence-backed)
    ⊕ viewport class
    → resolved ordered component list
```

The merge is a pure function. Given the same three inputs it always produces the
same layout — which is what makes the home surface *stable*, and stability is
what lets a student build muscle memory.

### M.4 Importance surfacing — four tiers

The brief cites "Constitution §30's four-tier surfacing model"; **no such
statement exists in the governing documents** (Governance Note). The four tiers
below are **ARCHITECTURAL INFERENCE**, constructed to be consistent with
`PRODUCT_PRINCIPLES` §4 (never shame) and §7.1 (the emotional arc), and flagged
for ratification.

| Tier | Effect on layout | Permitted triggers |
|---|---|---|
| **T0 Ambient** | none — the component renders in its student-chosen position | everything by default |
| **T1 Highlighted** | the component is emphasised *in place*; order unchanged | new accomplishment; score movement; a newly resolved pattern |
| **T2 Promoted** | the component moves to the top of its section for this render | a due retest; an unverified session; a recurrence |
| **T3 Critical** | a dedicated slot above everything, and it may not be dismissed by layout preference | an exam within `CRITICAL_EXAM_DAYS`; a data-integrity event affecting the student's record; an account/access issue |

### M.5 Guardrails against "critical" inflation

Without limits, T3 becomes the default and the tiering is decorative. Five
structural constraints:

1. **T3 triggers are a closed, enumerated list in code.** Adding one is a code
   review, never a runtime condition or a config value.
2. **At most one T3 item may render at a time.** If two qualify, the earlier
   deadline wins and the other is T2.
3. **T3 requires a time-bound or a resolution condition.** A T3 that cannot stop
   being T3 is invalid by construction.
4. **A T3 trigger may never be *absence*.** Inactivity, a broken habit, a missed
   day: none may promote. This is `PRODUCT_PRINCIPLES.md:134-141` made
   structural — it is the rule that prevents the tiering system from becoming a
   shame delivery mechanism.
5. **Every promotion above T0 is logged** with its trigger and evidence refs, so
   promotion frequency is measurable and regressions are visible.

### M.6 Personalisation and mobile

Layout is **explicit-only**: the Personal Model may *offer* a layout change
(with confidence and reasoning) but never applies one. This is I.6 applied to
composition — the home surface is the one place where an unrequested change is
maximally disorienting.

**Mobile is a different resolution of the same registry, not a different
information architecture.** `mobile_rank` orders components for a single column;
components below a size floor are omitted rather than squeezed; T3 keeps its
dedicated slot; the Score remains chrome. The student's desktop ordering informs
mobile order where it does not conflict with `mobile_rank`. **ARCHITECTURAL
INFERENCE:** two independently-authored layouts would double the surface a
student must maintain, for a gain that has not been demonstrated.

---

## PART N — PARENT SPACE

### N.1 The governing constraint, which is stricter than the brief

`PRODUCT_PRINCIPLES.md:123-130`, quoted exactly:

> **Parents see what their child is *fixing*, never what their child *got
> wrong*.** No raw failures, no marks lost, no unaddressed gaps, no answer
> detail. This is the difference between a support tool and a shame-delivery
> mechanism, and it is **enforced at the data layer, not in copy — the interface
> must be *unable* to expose it.**

**This is not a default. It is not student-toggleable.** The brief's model —
`Private` / `Shared` / `System` with the student choosing what falls in `Shared`
— is architecturally sound and is adopted below, but its `Shared` tier is
constrained by the principle: **certain categories are not eligible for
`Shared` at any setting.** Tension **T-0.1**, recorded in the Governance Note,
resolved here in favour of the ratified principle.

**Ratified 2026-08-10 — Option B, structural privacy** (`PRODUCT_DECISIONS.md`
§9.2). The brief's weaker, fully student-toggleable model was **rejected**, and
the §3.4 amendment it would have required was **considered and refused**. No
founder decision is outstanding. Concretely:

| Parents may see | Parents never receive |
|---|---|
| Progress, trajectory | Individual wrong answers |
| Continuity of verification | Individual mistake occurrences |
| Subjects, verified learning | Detailed mistake history |
| High-level areas needing attention | Question-by-question failures |
| Reports | Mistake counts, forensic lists |

> **Parents can understand how the student is doing without being given a
> forensic record of how the student failed.**

The student controls what parents see **within** this model and cannot open
individual mistake evidence to a parent by any toggle, at any setting. This is
principle-level and applies with extra force because the product serves minors:
consent under parental power asymmetry is not meaningful consent, so the
information is made unshareable rather than made optional.

### N.2 What exists today

**CURRENT FACT — read in full this pass.**

`app/api/parent/[code]/route.ts` (36 lines): selects
`exams, marks, focus, weakTopics, papersCount, parentName, blob` by
`parentCode`, computes the score server-side via
`computeScoreFromInputs(scoreInputsFromBlob(blob))`, and **explicitly strips the
blob before responding** (`const { blob: _omit, ...publicData } = data`) with
the comment *"Never return the blob itself."* The structural choice to compute
server-side and omit the blob is correct and is kept.

**But three things ship that the principle forbids:**

1. **`weakTopics` is returned verbatim to an unauthenticated code holder.** It is
   in the `select` list and it is *not* stripped. That is "what their child got
   wrong," by name.
2. **`lib/parent-digest.ts:118-122`** emails a *"Topics needing work"* table with
   per-topic **miss counts** (`${w.count} misses`). Same violation, in the
   channel the parent actually reads.
3. **`lib/parent-digest.ts:88-91`** emails *"`${studentName}` hasn't completed a
   study session in `${flags.inactiveDays}` days — their `${d.streak}`-day
   streak is at risk."* This is simultaneously a §4 shame violation, a §4.2
   streak violation, and an absence-triggered escalation (K.5, M.5.4).

**Finding A.9's conclusion — "no per-question or wrong-answer content leaks to
parents" — is correct at the per-question level and incorrect at the topic
level.** Recorded as a correction to Part A.

**Fourth defect: `/api/parent/[code]` requires no authentication.** Possession of
the code is total access to that report; the only guard is middleware's 10
req/min per IP. Re-verified: `middleware.ts` config matcher includes
`"/api/parent/:path*"` and performs rate limiting only — it does no
authentication at all, and its matcher covers no product route
(`/dashboard`, `/tools/*`, `/console`, `/admin` are absent).

### N.3 Parent identity and connection

**TARGET DESIGN.**

- A parent is a **real authenticated identity** (`parent_identities`), not a URL
  fragment. This is required for revocation to mean anything, for access logging
  to name someone, and because `PRODUCT_DECISIONS.md:640-645` makes the parent
  the **payer** ("Razorpay, parent-billed") — a payer cannot be an anonymous
  code holder.
- **Invitation flow:** student initiates → single-use token, hashed at rest,
  short expiry → parent accepts and authenticates → `ParentConnection` becomes
  `active`. The student is notified at every step and may cancel a pending
  invitation.
- **The bare `parentCode` path is retained only as a read-only legacy shim**
  during migration, scoped to `System`-tier data only, and removed thereafter.

### N.4 The three tiers, concretely

**`Private` — never leaves the student, not shareable at any setting.**
Raw answers and `student_answer` crops; evidence images and PDFs; `marker_note`;
`occurrences` rows and their `marks_lost`; individual mistake text; per-topic
miss counts; open/unresolved patterns; AI conversations; session notes;
free-text declarations; the Personal Model; anything from L1 in raw form.

*This is the tier the principle mandates, and it is enforced by the parent read
API physically not having a projection that can express these fields.*

**`Shared` — student-toggleable, per category, default OFF.**

| Category | What the parent sees | Why eligible |
|---|---|---|
| Score + trajectory | total, confidence, direction | a summary, no failure detail |
| Dimension breakdown | the four dimensions and their maxima | already shipped in the digest |
| Subject-level state | per subject: proven / studied / untouched counts | coverage, not correctness |
| **Progress on what is being fixed** | *count* of patterns being worked and *count* resolved this period | **"what their child is fixing" — the principle's positive case** |
| Consistency of verification | sessions verified in the period | not a streak; no absence trigger |
| Upcoming exams | name, subject, date | logistics |
| Assessment activity | count completed, no per-question data | volume only |

**`System` — always visible to an active connection.** That the account exists;
that the connection is active; when the record last updated; the share policy
currently in force; billing/entitlement state.

**N.4.a — the two categories the brief lists that are ineligible here.**
"Weak areas" and "assessment summaries with outcomes" fall on the *"what your
child got wrong"* side of `PRODUCT_PRINCIPLES.md:125` and are therefore
`Private`, not `Shared`. The nearest permissible substitute is the "progress on
what is being fixed" category: **counts of patterns being worked and closed,
without naming them.** **Settled 2026-08-10:** the amendment to §3.4 that the
brief's weaker model would have required was considered and **refused**
(`PRODUCT_DECISIONS.md` §9.2), so these two categories are `Private`
permanently — not pending a decision. Any future attempt to move them requires a
dated §3.4 amendment first, per `PRODUCT_PRINCIPLES.md:16-17`.

### N.5 Enforcement

Filtering happens **server-side, before serialisation** (B.15). The mechanism is
not a filter function over a full payload — it is a **separate projection**:
`parent_view` reads only from a set of views that do not contain `Private`
columns at all. A bug in the filter cannot leak a field the query never selected.
This is the data-layer enforcement §3.4 demands; a `delete payload.weakTopics`
is precisely the kind of copy-level enforcement it rejects, and precisely the
kind that failed at `app/api/parent/[code]/route.ts`.

### N.6 Reports

- Generated server-side from the parent projection only.
- Every report stores `policy_version` (C.3, B.16), so a report cannot later be
  claimed to have been authorised at a level it was not.
- **KEEP from `lib/parent-digest.ts`:** the pure-function structure (no I/O,
  unit-testable), `computeRiskFlags`' shape, the score/dimension rendering, and
  the exam countdown table.
- **REMOVE:** the `weakTopics` block (`:118-122`) and the streak/inactivity
  banner (`:88-91`). **ADAPT:** `computeRiskFlags.inactiveDays` — an
  absence-triggered alert is forbidden by K.5/M.5.4. The legitimate
  forward-facing replacement is *"an exam in N days with low proven coverage in
  that subject"*, which is `computeRiskFlags.examSoon` (`:50-56`) and already
  exists.
- Delivery honours the existing decision engine's discipline
  (`lib/notifications.ts`): quiet hours, dedup keys, one send per run.

### N.7 Revocation and audit

- Revocation is **immediate**: `ParentConnection.state = 'revoked'`; outstanding
  invite tokens invalidated; any legacy code rotated; the parent projection
  returns 404 on the next request. There is no cache TTL on authorisation.
- Every parent read writes a `parent_access_log` row and emits
  `PARENT_REPORT_VIEWED`. The student can see **who accessed what, and when** —
  which is the accountability half of "the student controls what parents see."
- Every policy change is an appended `ParentSharePolicy` version plus a
  `PARENT_POLICY_CHANGED` event. The history of what was shared, when, is itself
  part of the record.
- **The parent has no write access to any academic table, ever.** Not a
  correction, not a dispute, not a note. `PRODUCT_DECISIONS.md:113-120` places
  the parent outside the loop entirely.

---

## PART O — DATA OWNERSHIP

### O.1 Export

**TARGET DESIGN.** A complete, self-describing bundle, generated server-side,
delivered as a single archive:

- `manifest.json` — schema version, generated-at, the entity list, and **the
  derivation rules for every excluded derived table**, so a third party can
  reproduce L2 rather than being asked to trust it.
- **L1 in full** — events, evidence metadata + binaries, assessment attempts,
  occurrences, declarations, correction requests, audit entries.
- **L3 in full** — every score snapshot with its `formula_version`,
  `confidence` and `input_watermark_event_id`; every generated parent report with
  its `policy_version`.
- **L5** — preferences and layout.
- **Reference data by ID and label** — the concept nodes referenced, so the
  export is readable without the taxonomy, while the taxonomy itself (a company
  asset, `007_mistakes.sql:322-324`) is not exported wholesale.
- **L2 excluded from the body** by design (H.2), because shipping derived numbers
  alongside facts invites them to be read as facts.

Export is asynchronous (a `jobs` row — `lib/jobs.ts` already provides a durable
queue with `MAX_ATTEMPTS = 3`), and every export is an `AuditEntry`.

### O.2 The three evidence classes, and what may be done to each

| Class | Examples | Correctable? | Deletable? |
|---|---|---|---|
| **Verified evidence** | graded closed-form attempts, occurrences with evidence, completed assessments | **not editable.** Disputed via O.3; a superseding record is appended | only by full-account deletion (O.5) |
| **Student-declared evidence** | `EXTERNAL_STUDY_DECLARED`, `AcademicHistoryEntry`, self-set profile fields, manual mistake entries | **correctable in place via a superseding record** — the student is the authority on their own claim | individually retractable (superseding retraction), never hard-deleted |
| **Derived state** | `patterns`, `AcademicRecord`, `PersonalModel`, `ScoreSnapshot`, `TodayState` | **not directly editable at all** — it is recomputed | freely deletable and rebuildable (L2); L3 snapshots are immutable |

**O.2.a — the student may not directly edit derived state, and this is a
feature.** Editing a `pattern` to `resolved` is precisely the action
`PRODUCT_PRINCIPLES.md:96-104` forbids, and `007_mistakes.sql:369-376` already
refuses it at the database. Derived state changes only by changing its inputs,
which is what O.3 is for.

### O.3 Correction and dispute

**One entry point, three outcomes.**

```
student raises CorrectionRequest { target_type, target_id, claim, reason }
        │
        ├─ target is student-declared     → auto-accepted; superseding record
        │                                   appended; recompute (O.4)
        │
        ├─ target is verified, and the    → accepted; superseding record
        │  claim is mechanically checkable  appended; recompute
        │  (e.g. the answer key is wrong,
        │   the numeric grader mis-parsed)
        │
        └─ target is verified and the     → DISPUTE. The original stands. A
           claim is a judgement              `disputed` marker is attached and
                                             is visible everywhere the record is
                                             shown. Excluded from score
                                             dimensions until resolved.
```

**O.3.a — a dispute is never silently rejected, and never silently wins.** The
record shows *"the student disputes this"* alongside the original, in the record,
in memory, and in export. That is the honest representation of an unresolved
disagreement, and it is why `AssessmentAttempt` needs an `evidence_state` of
`disputed` distinct from `revoked`.

**O.3.b — AI may help the student phrase a dispute; it may never adjudicate
one** (B.19). Adjudication of a judgement claim is a human/curation
responsibility, and where no human process exists, the correct outcome is the
standing dispute marker — not an automated verdict.

### O.4 What happens to derived information — the integrity rule

**This is the part that must not silently break, and it is solved by
recomputation, never by patching.**

When any L1 record is superseded, revoked, or deleted:

1. The change is itself an appended event (`EVENT_SUPERSEDED`,
   `CORRECTION_RESOLVED`) with a `seq`.
2. Every L2 projection whose `input_watermark_event_id` is at or beyond the
   affected event is **invalidated and rebuilt by replay** from a safe
   checkpoint. Patterns re-merge, severity recomputes, `AcademicRecord`
   recomputes, `PersonalModel` re-aggregates. `lib/mistakes/engine.ts` being pure
   and clock-free (`:7-11`) is exactly what makes this replay tractable.
3. **L3 snapshots are NOT rewritten.** A new snapshot is appended with a
   `restatement_of` pointer and a reason. **The history shows both the number we
   believed and the correction** — which is how a financial ledger handles a
   restatement, and it is the only treatment compatible with Law 7.
4. Every step writes an `AuditEntry` with the counts affected.

**O.4.a — worked example.** A student successfully disputes a graded question
from three months ago:
`AssessmentAttempt` → superseding attempt appended, original marked `disputed`;
`occurrences` → superseding occurrence appended (`occurrences.supersedes`,
`007_mistakes.sql:275`); the leaf `pattern` → `recurrenceCount` and `lastSeenAt`
recompute, which may make a previously-blocked resolution valid;
`AcademicRecord` → accuracy recomputes; **`ScoreSnapshot`** → the 90 daily rows
since are *not* edited; today's snapshot is appended with `restatement_of`
pointing at the correction. The trajectory chart shows a step and can explain it.

**O.4.b — the failure mode this prevents.** In the current architecture the
equivalent operation is `localStorage.removeItem("ledger-mistakes")`
(`app/tools/post-exam/page.tsx:140`), after which the score silently changes,
nothing records that it happened, and `score_history` retains rows that can no
longer be reproduced from any input. **CURRENT FACT.**

### O.5 Deletion

Three scopes, each with consequences stated **before** confirmation, in
specifics rather than warnings:

- **Delete one student-declared record.** Retraction appended; derived state
  recomputes; score may move; stated as *"this will remove N concepts from your
  coverage and may change your score."*
- **Delete a category** (e.g. all evidence images). Binaries are destroyed;
  metadata and `content_hash` are retained as tombstones so the occurrences that
  reference them stay valid. **Occurrences are not orphaned** —
  `ON DELETE RESTRICT` (`007_mistakes.sql:229`) makes cascade deletion of
  referenced evidence structurally impossible, which is the correct behaviour
  and must not be worked around.
- **Delete the account.** Full erasure of student-scoped data with a stated
  irreversibility window; `AuditEntry` retains a minimal, non-academic tombstone
  (that an account existed and was deleted, when, by whom) because an audit log
  that can be deleted by the actor it audits is not an audit log. Parent
  connections revoke; parent-held reports are invalidated server-side.

### O.6 The audit trail

`AuditEntry` (C.2) is append-only for everyone, including the service role
(`REVOKE DELETE`), carries `before_hash`/`after_hash` so tampering is
detectable, and is included in the student's export. It records: every
correction, every dispute and its outcome, every deletion, every export, every
parent read, every policy change, every score restatement, and every compaction
run (D.5.a).

**Ownership summary — the three principles held simultaneously.**
*Student sovereignty*: the student may see, export, dispute, correct their own
claims, and delete everything. *Academic truth*: they may not rewrite verified
evidence or self-award resolution. *Data ownership*: every one of those actions
is recorded and reversible in the record's history rather than in the record's
content. **These do not conflict, because sovereignty here means control over
what is kept and shown — never authorship of what was proven.**

---

## PART P — TOOL INTEGRATION CONTRACT

### P.1 The problem being solved

**CURRENT FACT — re-verified.** `lib/tools-registry.ts` (81 lines) exports 46
entries carrying only `slug`, `title`, `subtitle`, `cat`, `keywords[]`. There is
no field for subject, concept emission, event emission, persistence, session
participation or assessment capability. Nothing in the codebase can answer
*"which tools produce academic evidence?"* without grepping. The registry is
duplicated: `app/dashboard/page.tsx:32+` declares an independent
`TOOL_CATEGORIES` literal with its own titles, tiers and copy. (The in-file
category comments are also stale — the `PRACTISE (14)` comment sits above 18
entries and `TRACK (9)` above 10; the total of 46 is correct.)

### P.2 The capability manifest

**TARGET DESIGN.** Each tool declares, as data, what it can do. The manifest is
the **single** registry — navigation metadata and capability metadata in one
place, killing the duplication.

```
ToolManifest {
  slug, title, subtitle, category, keywords[]        // navigation (today's fields)

  integration_level: 0 | 1 | 2 | 3 | 4               // P.3, derived not declared
  subjects: 'any' | string[]
  emits_events: AcademicEventType[]                  // enforced at ingest (D.3.4)
  emits_concepts: 'none' | 'tagged' | 'proposed'     // tagged ⇒ deterministic
  concept_resolution: 'taxonomy' | 'free_text' | 'none'
  joins_sessions: boolean
  can_grade: 'none' | 'deterministic' | 'rubric_ai_proposed'
  emits_mistakes: boolean
  consumes_personalisation: PersonalModelDimension[]
  reports_results: boolean
  persistence: 'none' | 'saved_output' | 'academic_record'
  ai_capabilities: AICapabilityName[]                // replaces the ToolName union
}
```

**P.2.a — the manifest is enforced, not documentary.** Ingest step D.3.4 rejects
an event whose type is absent from the emitting tool's `emits_events`. A tool
cannot emit `QUESTION_CORRECT` unless `can_grade = 'deterministic'`. **This is
what makes the contract real**: the boundary is checked at the only door into
L1.

**P.2.b — the manifest supersedes the 86-member `ToolName` union.**
**CURRENT FACT:** `app/api/ai/route.ts:258` declares an 86-member union;
`buildPrompt` is one switch with 86 case arms; `validTools` (`:2516`) lists
`"marks_obituary"` twice; `"subject_picker"` and `"exam_strategy"` are in the
union and the allowlist but have no `REQUIRED_PARAMS` entry. Deriving the
allowlist from the manifest eliminates the entire class.

### P.3 Integration levels

Levels are **derived from the manifest**, not declared — so a tool cannot claim a
level it does not implement.

| Level | Name | Requirements | Consequence |
|---|---|---|---|
| **0** | **Standalone** | none | prompt-in / render-out. Leaves no trace. Legal, but invisible to the record. |
| **1** | **Observed** | emits `CONCEPT_VIEWED`/`EXPLANATION_READ` with a concept reference | contributes to memory and the Personal Model. **Never contributes to the score.** |
| **2** | **Session-participating** | Level 1 + `joins_sessions` + `emits_concepts ∈ {tagged, proposed}` | its concepts enter the session and reach the assessment. Study done here is *verifiable*. |
| **3** | **Evidence-producing** | Level 2 + `can_grade = 'deterministic'` + emits `QUESTION_*` + `emits_mistakes` | produces `E`-class evidence. Moves Verified Performance and Recovery. |
| **4** | **Fully integrated** | Level 3 + `consumes_personalisation` + `reports_results` (writes the completion payload) + participates in assessment generation | the loop closes inside the tool. |

**P.3.a — Level 3 is the bar for touching the score.** Only deterministic grading
against a stored `answer_key` produces `E`-class evidence (F.4.a). A tool that
asks a model *"was that right?"* and writes the answer is at Level 1 regardless
of how confident it sounds. **This single rule is what prevents the 46-tool
surface from becoming 46 uncontrolled score writers.**

### P.4 Today's 46 tools, mapped

Levels below are assigned from what each tool **currently persists**, measured by
Finding A.3.c's method (`localStorage.setItem | patchUserData | saveUserData`
counts per `app/tools/*/page.tsx`) and cross-checked against the score's actual
input keys (Finding A.3.d, re-verified against `readScoreInputs()`,
`lib/ledger-score.ts:67-80`).

**Level 0 — Standalone. 29 tools (a floor, not an exact count).**
`writing-tools`, `timeline`, `study-guide`, `source`, `rooms`, `resume`,
`research-suite`, `report-tools`, `recall-studio`, `presentation`, `practice`,
`paper-trauma`, `paper-pattern`, `panic-triage`, `model-answer`,
`memory-toolkit`, `marks-obituary`, `language-lab`, `lab-report`, `interview`,
`gpa-sim`, `flashcards`, `exam-day`, `debate`, `compare`, `citation`,
`case-study`, `calibration`, `analysis-hub`.
**Zero page-level persistence.** A few write through imported components (the
`ledger-flashcards` key exists), so treat 29 as a floor. **The majority of a
46-tool product leaves no trace in the academic record.**

**Level 0 with local persistence — 8 tools.** `silent-topics`,
`reference-builder`, `paper-autopsy`, `marks-forensics`, `forgetting-forecast`,
`focus-lab`, `exam-triage`, `exam-sim`, plus `exam-planner`, `admissions`,
`personalise`, `grade-tracker`. These write localStorage but **not** to any key
the score consumes; several write keys that are not even in `SYNC_KEYS`
(`ledger-exam-debriefs`, `paper_autopsy_history`, `forensics_sessions`,
`last-night-plan`). **They persist and still do not participate.**

**The five that actually feed the record today:**

| Tool | Writes | Effective level | Why not higher |
|---|---|---|---|
| `exam-practice` | `ledger-papers-log` (`:37`), `ledger-mistakes` create (`:200`), status (`:57`) | **2.5** | drives the Examination pillar and is the *only* mistake creator, but grading is student-entered aggregate (`{score, total}`), not per-question deterministic — so it produces a *claim* about accuracy, not per-item evidence. It also writes `status = "cleared"` client-side, which the target forbids (J.9) |
| `syllabus` | `ledger-syllabus`, `ledger-syllabus-subjects` (`:100,108`) | **2** | supplies the coverage denominator; emits no outcomes |
| `learn-lab` | `ledger-notes-history` (`:61`), `ledger-checks` (`:148`) | **2** | the coverage numerator — and **capped at 10 by `.slice(0, 10)`** (Finding A.3.e) |
| `focus-lab` | `ledger-focus-streak` via `lib/focus-context.tsx:75,138` | **1, and to be removed** | feeds the streak dimension, which J.2.a deletes |
| `post-exam` | reads `ledger-mistakes`; `:140` deletes it | **negative** | the only tool that can destroy the record |

**Target levels for the same five:** `exam-practice` → **4** (it becomes the
capture path, `PRODUCT_DECISIONS.md:181`); `syllabus` → **3** (it becomes
capture/ingestion, feeding `008_ingestion.sql`'s confirmed pipeline);
`learn-lab` → **2**; `post-exam` → **3** (it becomes `/diagnosis`, read + status
transitions only, with deletion removed); `focus-lab` → **0**.

**P.4.a — the strategic reading.** Reaching Level 3+ for a handful of tools
matters far more than raising 29 tools from 0 to 1. Evidence quality, not
evidence breadth, is what the score and the Mistake DNA need — and
`PRODUCT_DECISIONS.md:138-170` has already decided that navigation collapses to
twelve routes with no tools index, so most of these surfaces stop being
destinations regardless.

---

## PART Q — AI BOUNDARIES

### Q.1 What the current architecture actually is

**CURRENT FACT — verified by direct read this pass.** `app/api/ai/route.ts`,
2,726 lines. The `POST` pipeline (`:2499`): JSON parse → tool allowlist
(`:2516-2519`) → `sanitiseParams` with per-field-class size caps (`:227-255`)
→ `REQUIRED_PARAMS` check (`:2529-2536`) → **Bearer-token auth via
`supabaseServer.auth.getUser`** (`:2539-2547`) → tier entitlement via
`hasAccess` (`:2555-2561`) → 30-day strike check → regex moderation → Haiku
classifier moderation → atomic `consume_ai_call()` RPC meter (`:2612`) → one
Anthropic call, model hardcoded `"claude-sonnet-4-6"` (`:2681`), `max_tokens`
6000 for a 24-tool `LARGE_TOOLS` allowlist else 2048 (`:2675-2676`) → JSON
extraction by `text.match(/\{[\s\S]*\}/)` (`:2694`) → non-blocking `ai_history`
insert (`:2708-2718`).

**The security spine of this route is good and is kept.** Auth-before-spend,
server-side entitlement, atomic metering, two-layer moderation, strikes, and
input size caps are all correct.

**Three things are wrong for the target and are replaced.**
(a) `buildProfileContext` (`:134-209`) reads `params.grade`, `params.board`,
`params.aiProfile`, `params.syllabusSubjects` — **the browser's copy of the
profile.** The server never reads it from `user_data`. (b) It reaches 7 of 86
prompts. (c) The greedy `{…}` regex will mis-parse any response containing prose
braces, and there is no output schema validation at all — whatever parses as
JSON is returned to the client.

### Q.2 What AI may do

Each is a named **capability** with typed input and output schemas, replacing the
86-arm switch.

| Capability | Output is | Written to L1? |
|---|---|---|
| interpret free text → proposed concepts | a proposal | only after `CONCEPT_CONFIRMED` |
| generate assessment questions | a candidate | only after the seven gates (F.4) |
| propose an error classification | a proposal | only after student confirmation (F.6) |
| explain / work a correction | ephemeral text | **never** (B.7, F.3.b) |
| summarise a deterministic diff | one sentence | no — presentation only |
| rephrase a fixed factual template | copy | no |
| translate NL → `StructuredQuery` | a validated query object | no |
| narrate returned rows | prose + citations | no |
| propose a profile field or preference | a suggestion | only after student acceptance |

### Q.3 What AI may never be the source of truth for

Raw academic events · verified assessment results · the Ledger Score or any
dimension · historical records and snapshots · concept identity (admission to
the taxonomy is a curation step) · mistake lifecycle transitions, above all
`resolved` · parent permissions · entitlement, billing, or access control ·
immutable evidence · audit entries · anything with a `NOT NULL` foreign key to
`evidence`.

**Q.3.a — the enforcement is structural, in three layers.**
**Schema:** `occurrences.evidence_id NOT NULL` (`007_mistakes.sql:229`) means an
AI-invented mistake cannot be inserted without a real evidence row.
**RLS:** `patterns_update_own … WITH CHECK (status IN ('acknowledged',
'practising'))` (`:369-376`) means no client-side actor, AI-driven or not, can
write `resolved`.
**Ingest:** D.3.4 rejects event types a tool is not declared able to emit, and
`source = 'system'` events are accepted only from the service role.
**None of these is a prompt instruction, and that is the point.**

### Q.4 The boundary's own contract

- **One module owns every model call.** No route, tool or component calls
  Anthropic directly.
- **Context is assembled server-side** from `getStudentContext()` (B.1). Client
  input is *content*, never *identity or profile*. This closes Finding A.6.b.
- **Typed input and output schemas per capability.** Output that fails
  validation is **rejected**, not degraded — one bounded structured-repair retry,
  then a typed failure. The greedy brace regex is deleted.
- **The model is never the only validator of its own output** (B.20). F.4 gate 5
  uses an independent re-derivation.
- **Prompt/data separation.** Untrusted student text is delimited and labelled
  as data, and the system prompt states that content inside the delimiters is
  never an instruction. `SAFETY_PREAMBLE` remains, but it is a policy statement,
  not an isolation mechanism, and must not be relied on as one.
- **Every call logs** to `ai_invocations`: capability, prompt version, model,
  input hash, output hash, latency, tokens, moderation verdict, outcome. Model
  identity moves out of a hardcoded string into configuration so a migration is
  not a code edit in 2,726 lines.
- **Metering and moderation are kept verbatim** — `consume_ai_call()` and the
  two-layer moderation stack are the strongest parts of the existing route.

### Q.5 Two rules that resolve the recurring ambiguity

**Q.5.a — the propose/dispose rule.** *AI output becomes part of the record only
by passing through a deterministic gate, and the record stores which gate.* That
is the `confirmation` field on every event (D.1.d). Reviewing any subsystem
reduces to one question: **what is the gate, and is it in the data?**

**Q.5.b — the "can it be wrong without being detectable?" test.** If an AI output
is stored somewhere that no deterministic process re-checks and no student
confirms, it is a source of truth by default, whatever the documentation says.
Every capability in Q.2 has an identified detector. `explain` has none — which is
exactly why it is never stored.

---

## PART R — SECURITY AND DATA INTEGRITY

*Requirements, not fixes. Each states what must be true; remediation sequencing
is Part S.*

### R.1 Authentication

Supabase Auth remains the identity provider. **Requirement: every product route
that renders student data must be authenticated before it renders, at the server
or the edge.**

**CURRENT FACT — the gap, re-verified.** `components/auth-guard.tsx` is 23 lines:
a `useEffect` calling `router.replace("/auth")` when `!loading && !user`, with a
loading div meanwhile. The page component and its data fetching mount on the
client regardless. `middleware.ts` performs **no authentication** — it is an
in-memory per-instance IP rate limiter, and its `config.matcher` (`:96-107`)
covers nine `/api/*` prefixes only: `/dashboard`, `/tools/*`, `/console` and
`/admin` are not matched at all. **"Logged out" is a client-side opinion.**

This is survivable today only because every data path is RLS-protected and
`/api/ai` authenticates its own bearer token — so the exposure is UI and
metadata, not records. **It stops being survivable the moment server components
read student data**, which the target architecture requires throughout.

**Additional requirement (CURRENT FACT, Finding A.10.a):** signup must lead to
onboarding. `app/auth/page.tsx:80-86` sets a confirm-your-email screen on signup
and `:88-91` routes sign-in to `/dashboard`; `/onboard` is reachable only from
the landing CTA. A student who signs up, confirms and signs in never sees
onboarding, therefore has no `grade`/`board`, therefore
`buildProfileContext` returns `""` at `app/api/ai/route.ts:141`. **The
personalisation promise fails at the front door.**

### R.2 Authorisation and RLS

**KEEP the existing posture, which is genuinely careful:** own-row policies
everywhere; `error_logs` and `page_events` insert-only with no SELECT policy;
`jobs` RLS-on with no policies (service role only); `score_history` SELECT-own
with no write policy; `concepts` globally readable and service-role writable;
tier in `auth.users.app_metadata`, deliberately outside the student-writable row
(`lib/tier.ts:30-36`).

**Requirements added:**
- Every new table ships with RLS enabled **in the same migration** that creates
  it.
- L1 tables have SELECT + INSERT policies and **no** UPDATE/DELETE policy — the
  `007_mistakes.sql:335,346` asymmetry becomes the house rule.
- System-owned fields move out of student-writable rows. **CURRENT FACT
  (Finding A.5.e):** `user_data.notifState` and `user_data.parentAlerts` are
  documented "service-role writes only" (`lib/user-data.ts:39-42`) yet
  `user_data` has a full `user_data_update_own` UPDATE policy
  (`000_initial_schema.sql:142`) — a student can clear their own notification
  dedup keys and parent-alert cooldowns from devtools.
- Every RLS invariant gets a test against a live database. The precedent exists:
  the current suite already tests mistake RLS invariants this way.

### R.3 Server-side enforcement and schema drift

**Requirement: the deployed schema must be knowable.** **CURRENT FACT —
Finding A.5.a:** `004_missing_tables.sql`'s own header records that five tables
the running code required were **absent from production** as of 2026-07-12.
There is no migration ledger, no runner in CI, and `CLAUDE.md` instructs the
agent to paste SQL into chat for manual execution.
`app/api/cron/score-snapshot/route.ts:97-107` contains a live runtime fallback
for a *missing column*. **Schema drift is structural.** An event-sourced
architecture cannot tolerate it: a missing column in an append-only table is
silent, permanent data loss. **UNVERIFIABLE from the repository: which
migrations are actually applied in production.**

### R.4 Data isolation

Every student-scoped query filters by `student_id`, derived from the verified
token, never from a request body (D.1.a). Cross-student joins exist only in
service-role analytics paths, which have no student-facing route. The parent
projection is a separate view set (N.5), not a filtered student payload.

### R.5 XSS and content safety

**CURRENT FACT — one real vector, re-verified.**
`app/tools/reference-builder/page.tsx:287` renders AI output through
`dangerouslySetInnerHTML={{ __html: d }}`. Combined with
`script-src 'self' 'unsafe-inline' 'unsafe-eval'` (`next.config.mjs:9`), a
`<script>` in model output executes. The other `dangerouslySetInnerHTML` sites
(`app/layout.tsx:135,145,153,171,222,229`, `components/ui/chart.tsx:95`) are
developer-authored constants and `JSON.stringify` of static objects — not
vectors.

**Requirements:** model output is **never** rendered as HTML. It is rendered as
text, or parsed into a typed structure and rendered by components. If rich text
is genuinely required, it passes an allowlist sanitiser and the CSP tightens.
**CURRENT FACT:** `unsafe-eval` is justified in-comment by "Three.js/Spline
WebGL" (`next.config.mjs:6-8`) and `connect-src` still allows
`https://prod.spline.design` (`:20`), while **neither `three` nor any
`@splinetool` package appears in `package.json`.** The justification is stale;
the permission is not.

### R.6 Prompt injection

Student-authored text (declarations, answers, uploaded documents) reaches the
model. **Requirements:** structural instruction/data separation (Q.4); no model
output is executed, rendered as HTML, or used to select a database operation;
`StructuredQuery` is a validated schema and never SQL (H.4); the tool allowlist
and `REQUIRED_PARAMS` checks are derived from the manifest (P.2.b) so an
injected tool name cannot widen the surface; **and the strongest mitigation is
architectural — since AI output cannot enter L1 without a deterministic gate
(Q.5.a), a successful injection corrupts a proposal, not the record.**

### R.7 AI content safety

**KEEP verbatim:** the two-layer moderation (regex with leetspeak/zero-width
normalisation, `app/api/ai/route.ts:42-50`, then the Haiku classifier at
`:2584`), the strike system persisted to `error_logs` with
`type: 'moderation_block'`, three strikes in 30 days = suspension, and
`SAFETY_PREAMBLE` on every prompt. **Requirement added:** generated assessment
questions pass moderation as gate 7 (F.4) *before* admission, not at render time.

### R.8 Parent access boundaries

Parent authentication (N.3); server-side projection with no `Private` columns
(N.5); every read logged (N.7); immediate revocation with no authorisation
cache; no parent write path to any academic table. **Requirement: a code-only,
unauthenticated total-access URL must not exist in the target.**

### R.9 Score integrity

The score is computed **only** on the server, from server-written events.
Snapshots carry `formula_version`, `confidence`, `evidence_counts` and
`input_watermark_event_id`, making every historical row reproducible. Client
display is a cache with a staleness marker. `score_history`'s existing
write-posture — SELECT-own, no client INSERT/UPDATE/DELETE policy — is the
correct model and generalises.

**CURRENT FACT — a fabricated score on the failure path.**
`app/tools/grade-tracker/page.tsx:282`: the `catch` branch of
`computeLedgerScore()` sets `{ total: 100, …, mistakeScore: 100, … }` — a
fabricated 100 rendered indistinguishably from a real score. **Requirement: a
failed computation renders as unavailable, never as a number.**

### R.10 Event integrity

- **Dedup:** `UNIQUE(student_id, client_event_id)` (D.3.6).
- **Replay:** idempotent ingest; retries are safe by construction.
- **Tamper:** `student_id`, `seq`, `received_at`, `event_id` are server-assigned
  and rejected if present in the body; no UPDATE/DELETE policy on the event
  table; `AuditEntry` hash chaining over corrections and compactions.
- **Forgery:** the `lib/active-close.ts` corroboration pattern is the model for
  every client-originated claim — `corroborateActiveDay` (`:57-80`) requires the
  client stamp **and** independent corroboration, so a forged stamp alone does
  nothing. **Generalise it: a client claim is admissible only when a
  server-observable fact agrees with it.**
- **Ordering:** by server `seq`, never by client `occurred_at`.
- **Clock:** both timestamps and the skew retained (D.1.b), so the IST/UTC
  day-boundary class of bug is diagnosable rather than silent.

---

## PART S — MIGRATION STRATEGY

**Legend.** **KEEP** — unchanged. **ADAPT** — modified in place, contract
preserved. **WRAP** — untouched, but a new boundary owns access to it.
**REBUILD** — replaced by a new implementation of the same responsibility.
**DELETE** — removed from the product. **CREATE** — does not exist.

Per `PRODUCT_DECISIONS.md:171-177, 196-200`, **no tool route is deleted from the
filesystem**; "DELETE" below means *removed from the product surface* except
where a file is explicitly named for removal.

### S.1 Persistence

| Subsystem | Files | Verdict | Reasoning |
|---|---|---|---|
| Blob sync mechanism | `lib/sync.ts`, `components/sync-manager.tsx` | **DELETE** (after backfill) | 15s whole-blob upsert (`sync-manager.tsx:7,42-45`) + merge-by-string-length (`sync.ts:67`) is last-writer-wins on the academic record. Unfixable in place. |
| The blob data | `user_data.blob` | **KEEP, frozen read-only** as `legacy_blob` | one-time backfill source and permanent forensic artefact (C.1) |
| Profile access | `lib/user-data.ts` | **REBUILD** | `:123` returns `{...server, ...localProfile}` — localStorage outranks Postgres; `patchUserData` (`:139-142`) is an unguarded whole-row read-modify-write |
| `user_data` flat columns | `000_initial_schema.sql:7-35` | **ADAPT** | profile columns migrate to versioned `student_profiles`; `notifState`/`parentAlerts` move to service-role tables (R.2) |
| Event layer | — | **CREATE** | Part D. The genuinely missing spine. |
| Ingestion pipeline | `supabase/migrations/008_ingestion.sql`, `lib/ingest/*` | **KEEP + WIRE** | append-only stage ledger, `UNIQUE(run_id, stage, attempt)`, outcome-shape CHECK, verbatim `output JSONB` for replay, and a `confirmed_at` RLS policy permitting the student to confirm **once and only forwards**. **Zero production importers** — `lib/ingest/{runner,hash,memory-store,types}.ts` are referenced only by `tests/ingest-runner.test.mjs`. |

### S.2 Scoring

| Subsystem | Files | Verdict | Reasoning |
|---|---|---|---|
| v1 engine | `lib/ledger-score.ts` | **REBUILD** | inputs change from blob to events; the streak dimension is deleted (J.2.a); `insufficient evidence` must be representable (J.3.a) |
| The unified-inputs *pattern* | `readScoreInputs` / `scoreInputsFromBlob` / `computeScoreFromInputs` | **KEEP as a pattern** | one formula, seven consumers, zero duplication. Reproduce exactly with an event-derived input builder. |
| v2 engine | `lib/ledger-score-v2.ts` | **ADAPT** | keep decay, log-volume, sequence-improvement, proof-gated coverage, the anti-gaming caps and `RECOVERY_EPOCH_MS`; drop `consistency` |
| Shadow-mode plumbing | `app/api/cron/score-snapshot/route.ts:4,65-66,119-121` | **KEEP the mechanism** | computing a candidate engine alongside the live one and logging the delta is the right cutover tool; **fix that the v2 result is currently discarded** |
| Snapshots | `005_score_history.sql`, `lib/score-history.ts` | **ADAPT** | add `formula_version`, `confidence`, `evidence_counts`, `input_watermark_event_id`; keep the RLS posture |
| Market/movement layer | `lib/score-market.ts`, `components/dashboard/academic-markets.tsx`, `components/editorial/index-report.tsx`, `components/dashboard/personal-edition.tsx` | **KEEP** | its empty-state and zero-base guards are honest and are the precedent for J.5 |
| Projection | `lib/score-projection.ts` | **ADAPT** | honest against the formula, but simulates a state (`:118-132`, `status: "resolved"`) that no production action produces |
| Temporary score | `lib/ledger-score.ts:277-358` | **ADAPT** | keep `gapTopics` as a diagnostic; stop calling a self-report-derived figure a score (J.4) |
| Active-day close | `lib/active-close.ts` | **ADAPT** | the corroboration pattern (`:57-80`) generalises to all client claims (R.10); the IST/UTC day-boundary bug is fixed by D.1.b |
| **The streak as a scoring input** | `lib/ledger-score.ts:218`, `lib/ledger-score-v2.ts:220`, `lib/focus-context.tsx:75,138` | **REMOVE FROM SCORING** | ratified 2026-08-10 (`PRODUCT_DECISIONS.md` §9.3). The consecutive-day term is **deleted**, not renamed; Continuity is a **new** computation over verified sessions and assessment participation (J.2.a). Renaming the variable does not implement this row. |

### S.3 Mistake system

| Subsystem | Files | Verdict |
|---|---|---|
| **The mistake pillar of the score** | `lib/ledger-score.ts:198-213` + everything that feeds it | **REBUILD** — ratified 2026-08-10 (`PRODUCT_DECISIONS.md` §9.4, J.9.b). The status-enum patch is **rejected**; the pillar is rebuilt on Event → Session → Assessment → Evidence → Occurrence → Mistake DNA → Retest → Verified Resolution. |
| **Shipped persistence + evidence assumptions** | `exam-practice` localStorage mistakes, client-set `status`, absent `evidenceId` | **REBUILD — not the target architecture** (G.1.0). Reuse of the domain engine below carries no presumption that these survive. |
| Domain engine | `lib/mistakes/engine.ts` | **KEEP, unmodified** (G.1) — **domain logic only**; see G.1.0 for the scope of this verdict |
| Types | `lib/mistakes/types.ts` | **KEEP, extend additively** (two enum values) |
| Legacy migration | `lib/mistakes/migrate-legacy.ts` | **KEEP as-is** — it correctly refuses to fabricate evidence |
| Schema | `007_mistakes.sql` | **KEEP, extend additively** (`source` CHECK) |
| Severity-factor derivation | — | **CREATE** — the one real gap (G.1.a, G.6) |
| Server data-access layer | — | **CREATE** |
| Capture UI | — | **CREATE** — `PRODUCT_DECISIONS.md:216`: *"If this doesn't ship, nothing else matters."* |
| Legacy mistake writer | `app/tools/exam-practice/page.tsx:192-199` | **REBUILD** — must write `occurrences` with evidence |
| Client-side status write | `app/tools/exam-practice/page.tsx:57` (`m.status = "cleared"`) | **DELETE** — a student may not resolve their own mistake |
| One-click history deletion | `app/tools/post-exam/page.tsx:140` | **DELETE** — unconfirmed, unaudited, irreversible destruction of the record |
| Taxonomy | `lib/taxonomy/{build,cbse-physics}.ts` | **KEEP + WIRE** — tested, zero production importers |

### S.4 Tools and registry

| Subsystem | Files | Verdict | Reasoning |
|---|---|---|---|
| Tool registry | `lib/tools-registry.ts` | **ADAPT → capability manifest** | keep the 46 entries and their navigation fields; add the manifest fields (P.2) |
| Duplicate catalogue | `app/dashboard/page.tsx:32+` `TOOL_CATEGORIES` | **DELETE** | second hand-maintained list of the same 46 tools |
| The 29 Level-0 tools | `app/tools/*` | **KEEP routable, WRAP out of navigation** | `PRODUCT_DECISIONS.md:171-177`: all 46 URLs continue to resolve; navigation shrinks by a registry field |
| `exam-practice` | | **REBUILD** into `/capture` (papers) |
| `syllabus` | | **ADAPT** into `/capture` (syllabus ingestion), wired to `008_ingestion.sql` |
| `post-exam`, `paper-autopsy`, `marks-forensics`, `marks-obituary`, `paper-trauma`, `paper-pattern`, `calibration` | | **REBUILD as one** `/diagnosis` — `PRODUCT_DECISIONS.md:184`: *"Six metaphors for one answer. Merging them IS the product."* Note the morbid-metaphor names are separately banned by `PRODUCT_PRINCIPLES.md:143-149`. |
| `grade-tracker` | | **ADAPT** into `/record`; **DELETE** the fabricated `catch` score at `:282` |
| `learn-lab` | | **ADAPT** — remove the `.slice(0, 10)` coverage cap (`:61`) |
| `focus-lab` + `lib/focus-context.tsx` | | **ADAPT; the streak is REMOVED FROM SCORING and DELETED from presentation** — `PRODUCT_PRINCIPLES.md` §4.2, `PRODUCT_DECISIONS.md` §9.3. `ledger-focus-streak` / `ledger-focus-best-streak` are not renamed to Continuity; Continuity does not read them. |

### S.5 AI

| Subsystem | Files | Verdict |
|---|---|---|
| Route security spine (auth, tier, meter, moderation, strikes, size caps) | `app/api/ai/route.ts:227-255, 2539-2613` | **KEEP** |
| 86-arm `buildPrompt` switch + `ToolName` union | `app/api/ai/route.ts:258, ~345-2490` | **REBUILD** into per-capability modules driven by the manifest |
| `buildProfileContext` | `:134-209` | **ADAPT** — keep the content verbatim; change the source from `params.*` to `getStudentContext()`; apply to all capabilities, not 7 |
| JSON extraction | `:2694` greedy `/\{[\s\S]*\}/` | **REBUILD** — typed output schemas, reject-not-degrade |
| Hardcoded model | `:2681` | **ADAPT** — configuration + per-capability selection |
| `ai_history` | `000_initial_schema.sql:55-65`, write at `:2708-2718` | **ADAPT → `ai_invocations`** with prompt version and hashes; retain existing rows as declared-class history only (H.6) |
| `validTools` defects | `:2516` (`marks_obituary` twice; two entries with no `REQUIRED_PARAMS`) | **DELETE** — derived from the manifest instead |

### S.6 Auth, routing, onboarding

| Subsystem | Files | Verdict | Reasoning |
|---|---|---|---|
| Client route guard | `components/auth-guard.tsx` | **REBUILD** | 23 lines of `useEffect` redirect; data still mounts client-side |
| Middleware | `middleware.ts` | **ADAPT** | keep the rate limiter; **add** authentication and extend the matcher beyond `/api/*` |
| Signup → onboarding | `app/auth/page.tsx:80-91` | **ADAPT** | signup never leads to `/onboard`, so profile is empty and personalisation silently no-ops (R.1) |
| Onboarding | `app/onboard/page.tsx` (`TOTAL_DATA_STEPS = 8`) | **REBUILD** | `PRODUCT_DECISIONS.md:202-208`: *"Board and subjects, one screen… ceiling is three questions."* Eight steps is four times the ratified ceiling. |
| Landing | `app/page.tsx` | **ADAPT** | three `href`s total (`/onboard` ×2, `/legal/terms`); no sign-in, pricing or FAQ link — a returning user has no way in |
| `/dashboard` vs `/console` | `app/dashboard/*`, `app/console/*` | **REBUILD as one `/home`** | `PRODUCT_DECISIONS.md:181`: both merge into Home. Two shells is the largest architectural ambiguity in the repo. |
| Workspace engine | `lib/console/workspace.ts` | **KEEP + GENERALISE** | 108 trait combinations, pure `derive(dna)`, `ensureContrast()` making illegibility unrepresentable, a floor-bound preset refusing to breach 44px, hostile-input `parseDNA`, and **storage of choices not computed values** (`:312-315`). The model implementation for B.14. Currently `/console`-scoped and **not in `SYNC_KEYS`**. |
| Dashboard layout | `lib/dash-layout.ts` | **REBUILD** into the M.2 registry + server-persisted `HomeLayout` |

### S.7 Parent

| Subsystem | Files | Verdict |
|---|---|---|
| Server-side score + blob stripping | `app/api/parent/[code]/route.ts:19-24` | **KEEP the pattern** |
| `weakTopics` in the response | same file, `select` list | **DELETE** — §3.4 violation (N.2) |
| Digest structure and pure functions | `lib/parent-digest.ts` | **KEEP** |
| "Topics needing work" block | `lib/parent-digest.ts:118-122` | **DELETE** — §3.4 violation |
| Inactivity/streak banner | `lib/parent-digest.ts:88-91` | **DELETE** — §4 and §4.2 violations |
| `computeRiskFlags.inactiveDays` | `:45-48` | **ADAPT** — absence may not trigger escalation; keep `examSoon` |
| Unauthenticated code access | route + `middleware.ts` | **REBUILD** — parent identity, invitation, revocation, access log (N.3, N.7) |
| Send paths | `app/api/send-parent-digest`, `cron/risk-alerts`, `cron/weekly-report` | **ADAPT** — read the parent projection, record `policy_version` |

### S.8 Notifications, jobs, observability, design

| Subsystem | Files | Verdict | Reasoning |
|---|---|---|---|
| Notification decision engine | `lib/notifications.ts` | **KEEP the architecture** | pure decision engine, quiet hours 22:00–08:00 (`:81-83`), chronotype windows (`:90-97`), semantic dedup, one send per run, one high-priority per day. Well-designed and non-spammy. |
| Streak-at-risk notifications | `lib/notifications.ts` | **DELETE** | `PRODUCT_PRINCIPLES.md:151` |
| Unpayable score promise | `lib/notifications.ts:185`, `lib/console/next-move.ts:79-89` | **DELETE** | Law 7 (J.9.a) |
| Notification state | `user_data.notifState` | **ADAPT** → service-role `notification_log` (R.2) |
| Job queue | `lib/jobs.ts`, `jobs` table, `/api/jobs/{enqueue,run}` | **KEEP** | `MAX_ATTEMPTS = 3`, partial index on pending — adequate for exports, digests, rebuilds |
| Cron infrastructure | `vercel.json` (3 jobs) + `.github/workflows/{notifications,score-snapshot}-cron.yml` | **KEEP** | split exists because Vercel Hobby forbids sub-daily crons; both authenticate via `lib/cron-auth.ts` fail-closed. **UNVERIFIABLE: whether `CRON_SECRET` is set in both Vercel and Actions — i.e. whether they run.** |
| Sentry / PostHog / Vercel Analytics | `package.json`, `app/layout.tsx` | **KEEP** | orthogonal to this architecture |
| Four CSS systems | `globals.css` (2,421) · `editorial.css` (759) · `landing.css` (599) · `console/console.css` (382) | **NOTED, OUT OF SCOPE** | visual design is governed by `PRODUCT_PRINCIPLES` §6. Architecturally relevant only as: one route (`/`) is migrated of 68 (`lib/editorial-routes.ts:20-22`), and glassmorphism is live (`app/auth/page.tsx:110,124,138,148`, `components/app-nav.tsx:231`) against a permanent ban (`PRODUCT_PRINCIPLES.md:165`). |
| Three animation runtimes | `framer-motion`, `motion`, `gsap` | **NOTED, OUT OF SCOPE** | unreconciled accumulation, not a decision |

### S.9 Fabricated data — DELETE, with reasoning

`PRODUCT_PRINCIPLES.md:82-83`, **Law 7: "Never lie.** No fabricated trend,
forecast, or encouragement. An honest empty state beats a fake number, always."
[brief: Constitution §36.]

| Component | Files | Verdict | Reasoning |
|---|---|---|---|
| `rank-whisper` | `components/rank-whisper.tsx`, mounted globally via `components/legacy-chrome.tsx:25` | **DELETE** | renders an invented live-peer figure as social proof |
| `awake-count` | `app/api/awake-count/route.ts` | **DELETE** | hardcoded `STREAM_SIZES` (`:5-11`), `pctAwake = 0.92·e^(−0.0697·m)` with `Math.random()` jitter (`:41-44`). Every number is invented. Not "estimated" — *fabricated*, then rendered as a live count and a percentile. |
| Fabricated failure score | `app/tools/grade-tracker/page.tsx:282` | **DELETE** | a `catch` branch rendering `total: 100` as a real score |
| Unpayable +120 promise | `lib/console/next-move.ts:79-89`, `lib/notifications.ts:185` | **DELETE** | the system tells students a number it cannot honour (J.9.a) |

**Why DELETE and not ADAPT for the first two.** There is no honest version of
`awake-count`: the product has no peer-presence data and no legitimate route to
acquire it that would justify the surface. Making the number real would require
building presence tracking to serve a social-proof widget — off-thesis under
`PRODUCT_PRINCIPLES.md:344-351` (the subtraction test: removing it makes the
product *smaller*, not *worse*) and off-loop under `:33-34` (*"a surface that
does not sit on the loop does not appear in the product"*). The component is
also a `23:30–00:15` late-night nudge, which sits badly beside §4's *"a student
opens this at 11pm before an exam, frightened."*

---

## PART T — ARCHITECTURAL RISKS

Ranked by expected damage × likelihood.

**T1 — Schema drift between repo and production. (technical / data)**
`004_missing_tables.sql`'s header records five tables missing from production
while code depended on them; there is no migration ledger or CI runner; a live
runtime fallback for a missing column exists at
`app/api/cron/score-snapshot/route.ts:97-107`. **An append-only event store
cannot tolerate this** — a missing column silently loses data permanently.
*Mitigation: a migration ledger and a CI gate before any event table ships.*

**T2 — Backfill from the blob is lossy and cannot be made otherwise. (data
migration)**
Legacy mistakes have no evidence and no concept ID;
`occurrences.evidence_id`/`concept_id` are `NOT NULL`.
`lib/mistakes/migrate-legacy.ts:8-18` states the problem exactly and refuses to
fabricate. Legacy `papersLog` rows have no per-question data, so no attempt-level
evidence can be reconstructed. **Consequence: the record has a visible seam.**
*Mitigation: mark the epoch explicitly — `RECOVERY_EPOCH_MS`
(`lib/ledger-score-v2.ts:75`) is the existing precedent — and never present
pre-epoch data as verified.*

**T3 — Score discontinuity at cutover. (scoring / trust)**
Every shipped score has `mistakeScore ≡ 0` and a streak-driven Momentum term.
The target deletes Momentum and makes Recovery reachable. **Some students will
move by hundreds of points in either direction**, and the score's credibility is
the product's credibility.
*Mitigation: `formula_version` on snapshots, an explicit restatement rather than
a silent recompute (O.4.3), and the existing shadow-mode cron as the measurement
tool.*

**T4 — AI-generated assessment questions are wrong. (AI reliability)**
A wrong answer key creates a false `occurrence`, a false pattern, a false
severity ranking, and a false score movement — and Mistake DNA's whole value is
that its diagnoses are trustworthy.
*Mitigation: the seven gates (F.4), closed-form-only in V1 (F.4.a), mandatory
provenance, and the retroactive revocation path (F.4.b).*

**T5 — The coverage guarantee fails open. (product / trust)**
If generation cannot fill a slot and the assessment silently shrinks, "every
confirmed concept is assessed" becomes false while the UI still says verified.
*Mitigation: F.2's four layers, of which the transition gate is the load-bearing
one; and F.2.a's explicit refusal to verify.*

**T6 — Event volume and projection cost. (performance)**
10⁵–10⁶ events per student-lifetime, with score, record, memory and Today all
projecting from it. Naive recompute-on-read will not hold.
*Mitigation: watermarked incremental projections, monthly partitioning,
compaction of attention events (D.5), and daily snapshots rather than on-demand
history aggregation. **UNVERIFIABLE:** actual production volumes.*

**T7 — Event duplication and multi-tab. (synchronisation)**
Largely designed out by `client_event_id` idempotency and append-only semantics,
but a client that regenerates `client_event_id` on retry defeats it entirely.
*Mitigation: `client_event_id` derived from stable content, generated once and
persisted in the client's outbox before the first attempt.*

**T8 — Historical integrity under correction. (data integrity)**
Corrections cascade into patterns, records and snapshots. A partial recompute
leaves the record internally inconsistent in a way no user can see.
*Mitigation: replay-from-checkpoint rather than patching (O.4), plus a
consistency job that verifies each projection's watermark against the stream.*

**T9 — Privacy: the parent boundary is currently breached in two places. (privacy)**
`weakTopics` in the parent API response and the miss-count table in
`lib/parent-digest.ts:118-122` are live §3.4 violations, reachable today by
anyone holding a `parentCode`, with no authentication.
*Mitigation: N.5's separate projection; remove the fields before parent identity
work, not after.*

**T10 — Two product shells, unreconciled. (product / technical)**
`/dashboard` and `/console` both import `computeLedgerScore`, `scoreTier`,
`loadUserData` and render a score plus a next-action surface. Building the event
layer under both doubles the integration surface and guarantees divergence.
*Mitigation: `PRODUCT_DECISIONS.md:181` has already decided — merge to `/home`.
Resolve before the event layer, not during.*

**T11 — Client-only route protection meets server-rendered student data. (technical)**
`components/auth-guard.tsx` + a `middleware.ts` that authenticates nothing is
survivable while everything is client-side and RLS-protected. It stops being
survivable the moment server components read student data.
*Mitigation: server/edge auth lands before the first server-rendered student
surface.*

**T12 — Dark code decays. (technical)**
`lib/mistakes/*`, `lib/ingest/*`, `lib/taxonomy/*` have **zero production
importers** and 361 passing tests. Assets in this state drift from the product's
reality even while green.
*Mitigation: wire them early; the tests are only meaningful once something calls
them.*

**T13 — Governance drift. (product) — partially retired 2026-08-10.**
This document and Parts A/B cite a numbered Constitution that does not exist in
the repository, while three ratified rules (streaks, the parent boundary,
onboarding ceiling) are violated by shipped code. Architecture built against the
wrong law is architecture that must be rebuilt.
*Mitigation: reconcile the citations and the three violations before
implementation begins.*
**Status:** the **product-law half is closed.** The four open decisions are
ratified (`PRODUCT_DECISIONS.md` §9.1–§9.4, `PRODUCT_PRINCIPLES.md` §3.5), so
this architecture is now built against stated law rather than inference. **The
code half is open and unchanged:** the streak dimension, the streak
notifications, the parent-email streak banner, `weakTopics` in the parent API,
the parent-digest miss-count table, and the eight-step onboarding are all still
shipped and all still violate ratified rules. They are carried as **P1 removals**
in Parts S and W, not as open questions.

---

## PART U — IMPLEMENTATION BOUNDARIES

### U.1 Ownership lines

| Layer | Owns | Explicitly does not own |
|---|---|---|
| **Client** | rendering; input capture; optimistic UI; the outbox that guarantees at-least-once event delivery; presentation state | any academic truth; the score; session state; grading; permissions |
| **Server (route handlers / server components)** | authentication; event ingest and validation; session transitions; assessment generation orchestration and grading; parent projection; export; the AI boundary | long-running work; anything that must survive a request |
| **Database** | storage; **invariants** (FKs, CHECKs, unique/partial indexes); RLS; immutability by policy omission; idempotency | business logic beyond invariants |
| **Background jobs** | daily snapshots; projection rebuilds; retest scheduling; digests; exports; compaction; consistency checks | anything a student is waiting on |
| **AI boundary** | model calls; typed capability schemas; moderation; metering; provenance logging | writes to L1; any gate |
| **Derived-state builders** | projections from L1, each with a watermark | writing to L1; being read as truth |
| **Event processing** | validation, dedup, session resolution, ordered fan-out | interpretation |
| **Notifications** | candidate generation, dedup, timing, channel, delivery ledger | inventing urgency |

### U.2 Can the current stack support this?

**Yes, with two qualifications, and no new infrastructure is prescribed.**

- **Postgres/Supabase** covers the event store (append-only, partitioned,
  unique-constrained), all projections, FTS, and `pgvector` for semantic concept
  search. The schema idiom needed already exists in `007`/`008`.
- **Next.js on Vercel** covers ingest, sessions, assessment, and the AI boundary.
- **Vercel cron + GitHub Actions** covers scheduled work; the split already
  exists and is documented (Vercel Hobby forbids sub-daily crons).
- **`lib/jobs.ts` + the `jobs` table** covers durable async work (exports,
  digests, rebuilds) with `MAX_ATTEMPTS = 3` and a partial index on pending.

**Qualification 1 — fan-out is not a queue.** Real-time projection updates on
every event, at scale, would want a message broker. The stack lacks one, and the
architecture is deliberately designed so it does not need one: projections are
**watermarked and incremental**, updated synchronously for the cheap ones
(session state, Today invalidation) and by scheduled catch-up for the expensive
ones (score, record, personal model). **If a future requirement demands
sub-second cross-projection consistency for every event, that is the point at
which a queue becomes necessary — and this document flags it in advance rather
than pretending the current stack scales indefinitely.**

**Qualification 2 — the migration runner is missing infrastructure, not a
library.** T1 is not solved by adding a dependency; it is solved by a ledger
table and a CI step. It is nonetheless a prerequisite, not a nice-to-have.

**Nothing else is prescribed.** In particular: no event-sourcing framework, no
separate search service, no analytics warehouse, no state-management library.
Each would add a second source of truth, which H.1.a forbids.

### U.3 Determinism boundary — the single test

> **If a value can differ between two runs over the same inputs, it may not be
> stored in L1 and may not move the score.**

That test places model output, wall-clock reads inside pure functions, and
`Math.random()` on the non-authoritative side, and it is why
`lib/mistakes/engine.ts`'s constraints (*"no I/O, no database, no framework, no
clock, no randomness"*, `:7-11`) are the house style for every domain module in
the target.

---

## PART V — ACCEPTANCE TESTS

Behavioural, and each one fails against the current codebase.

### V.1 Session lifecycle

1. Student opens `/home`. **No session exists.** `GET /session/current` → null.
2. Answers one practice question. **A session exists in `ACTIVE`**, containing
   `SESSION_STARTED` and `QUESTION_ATTEMPTED`, with `origin = 'tool_activity'`.
3. Opens a second tab and answers another. **Still exactly one session**; both
   events attached; the partial unique index prevents a second.
4. Closes both tabs for 50 minutes (> `IDLE_MINUTES`). **State is `DORMANT`**,
   not closed.
5. Returns and answers a question. **Back to `ACTIVE`, same `session_id`.**
6. Kills the browser mid-session and returns on a phone. `GET /session/current`
   returns the same session with all concepts.
7. Leaves for 25 hours (> `REAP_HOURS`). **`CLOSED_UNVERIFIED`**, with
   `reason = 'reaped'`. **The score does not fall.** No notification shames.
8. Presses "finish" instead → **`REVIEWING`**; presses it again from a stale tab
   → the second call affects zero rows and returns the current state, **not an
   error**.

### V.2 External study declaration

1. Student types *"I did Torque in coaching tonight."* → `EXTERNAL_STUDY_DECLARED`
   with `declared_text` verbatim; a session opens with `origin = 'declaration'`.
2. AI proposes `Torque` and `Moment of Inertia`. Both appear as
   `SessionConcept{detection_source: 'ai_proposed', confirmation_state: 'proposed'}`.
   **Neither is confirmed. Neither reaches the record.**
3. Student confirms Torque, rejects Moment of Inertia. Two `CONCEPT_CONFIRMED`
   events, one `accepted: true`, one `accepted: false`. **The rejection is
   retained.**
4. Student types *"and the thing about wobbling tops"* — no taxonomy match.
   **A `SessionConcept` exists with `concept_id = NULL` and `declared_text`
   preserved.** The system does **not** guess a match.
5. **Assertion: the score has not moved.** A declaration is not evidence.
6. The assessment contains at least one Torque question and at least one for the
   unresolved declaration.
7. The student passes both. **Now** Verified Performance and Proven Coverage
   move, and `AcademicRecord.coverage_state` for Torque becomes `proven`.

### V.3 Assessment coverage guarantee

1. Session with four confirmed concepts. `coverage_manifest` is frozen with all
   four **before any model call**.
2. Generation returns a question for a fifth concept. **Rejected at gate 1**
   (slot binding); it never reaches the student.
3. Generation fails N times for concept 3. The bank supplies a prior question for
   concept 3.
4. Bank is also empty for concept 3. **The session cannot become `VERIFIED`.**
   It goes `CLOSED_UNVERIFIED` with `reason = 'coverage_unfillable'`; concepts
   1, 2, 4 are `studied`, and **nothing is presented as verified.**
5. Attempt to force `ASSESSING → VERIFIED` via a direct API call with concept 3
   unanswered. **Refused server-side**, with a typed error.
6. A retest question for an unrelated open pattern is injected. **It counts
   toward that pattern and not toward session coverage.**

### V.4 Mistake DNA lifecycle

1. Wrong answer on Torque, classified `sign-error` (execution). **Before the
   next question renders**, an `occurrence` exists with a non-null `evidence_id`
   pointing at the attempt.
2. `mergeOccurrence` finds no leaf → `new-leaf`. A `concept`-tier pattern is
   created, plus `subject` and `global` parents. **Parent `severity` and
   `system_confidence` are NULL.**
3. Student immediately retries and gets it right. `MISTAKE_CORRECTED` with
   `immediate_retry_correct: true`. **The pattern is not resolved** — zero days
   have elapsed against `RESOLUTION_COOLING_DAYS = 7`.
4. Student clicks "I'm working on this" → `practising`. Directly POSTing
   `status: 'resolved'` from the client is **refused by RLS**
   (`007_mistakes.sql:369-376`) **and** by `applyTransition`
   (`engine.ts:508-513`) **and** by event ingest. Three refusals.
5. Two days later, one correct answer on Torque. **Still not resolved**
   (`insufficient-correct-answers` → then `cooling-period-not-elapsed`).
6. Day 9: a second correct answer, ≥7 days after `lastSeenAt`. **The system**
   applies `practising → resolved`, writes a `MistakeResolution` with both proof
   attempt IDs, and emits `MISTAKE_RESOLVED`. Recovery moves.
7. Day 40: another sign error on Torque. `resolved → recurred`. **The
   `MistakeResolution` row from day 9 still exists.** History shows fixed → lost
   → (later) fixed again.
8. A cognitive `misconception` on Torque creates a **separate leaf** — never
   merged across error class.
9. An occurrence with both a cognitive and an execution error returns
   `ambiguous-error-classification` and is **not silently assigned** to either.

### V.5 Personalisation override

1. No explicit preference. Ten signals favour `bullet-points`.
   `inferred_value = 'bullet-points'`, `confidence` rendered, `explicit_value`
   NULL, `effective_value = 'bullet-points'`.
2. Student sets `step-by-step`. `PREFERENCE_SET` appended;
   `explicit_value = 'step-by-step'`; `effective_value` changes on the very next
   read.
3. Twenty further signals favour `bullet-points`. `inferred_value` updates;
   `explicit_value` is untouched; **`effective_value` stays `step-by-step`.**
4. Attempt to write `explicit_value` from the aggregator. **Refused by
   column-level grant.**
5. All of L2 is truncated and rebuilt from L1. **`explicit_value` is restored
   exactly**, because it derives from an event.
6. The student clears the preference. `effective_value` falls back to
   `inferred_value` — and the fallback is disclosed, not silent.
7. No signals for 200 days. `decayed_confidence` drops below
   `CONFIDENCE_FLOOR`; the system uses the product default and **says so.**

### V.6 Ledger Score baseline and confidence

1. New account. **No score.** Not 0 — *"not enough evidence yet"*, with what is
   still required.
2. One assessment, four questions (< `MIN_SESSION_QUESTIONS`). **Still no
   score**; the assessment is not counted.
3. Baseline conditions met. A score appears **with `confidence`**, and a
   snapshot is written with `formula_version` and `input_watermark_event_id`.
4. Two students reach 640 — one with three assessments, one with forty. **The
   confidence values differ and are both displayed.**
5. Student records eight new mistakes. **No dimension falls.** Recovery uses
   counts with ceilings; Verified Performance counts assessed items only;
   Continuity's denominator excludes concepts where a mistake was recorded.
6. Student is inactive for three weeks. **The score does not rise** (decay is
   shift-invariant) and **does not fall from inactivity alone.** There is no
   streak to break.
7. Verified performance genuinely declines. **The score falls**, with a
   per-dimension explanation and one recovery action. No verdict.
8. Replay the whole event stream into an empty database. **Every snapshot
   reproduces**, given its `formula_version` and watermark.
9. A month-old question is successfully disputed. Intervening snapshots are
   **unchanged**; a new snapshot is appended with `restatement_of`.

### V.7 Today non-fabrication

1. Brand-new account, no evidence. `items = []`,
   `empty_reason = 'no_evidence_yet'`. **No motivational copy, no fake figure,
   no suggested topic.**
2. Everything current. `items = []`, `empty_reason = 'all_current'`.
3. The projection pipeline is behind. `empty_reason = 'insufficient_data'` and
   the surface says the record is still updating. **It does not say "all caught
   up."**
4. A recommendation reaches Today. It carries `evidence_refs`; following the
   refs reaches real records. **A recommendation with an empty `evidence_refs`
   cannot be inserted.**
5. An accomplishment is shown once, then moves to the record — it does not
   persist as a badge.
6. Grep the rendered payload for `Math.random`, hardcoded population figures, or
   peer comparisons. **None exist.**

### V.8 Parent sharing tiers

1. Student connects a parent. Default policy: **all `Shared` categories OFF.**
   The parent sees `System` only.
2. Student enables "score + trajectory". The parent sees the total, direction and
   confidence. **The dimension breakdown remains hidden** — categories are
   independent.
3. Parent requests raw mistakes by any means. **The parent projection has no
   column containing them.** Not filtered — absent.
4. Student enables every available category. **The parent still cannot see any
   topic name, miss count, wrong answer, marker note or evidence image.** The
   closest available is *"3 patterns being worked, 1 closed this month."*
5. A parent report is generated. It stores `policy_version`. The student later
   disables a category; **the old report still shows what it showed**, and its
   policy version explains why.
6. Student revokes. The next parent request 404s **immediately** — no cache TTL.
7. Every parent read appears in the student's access log with a timestamp.
8. The parent attempts any write. **No write path exists.**

### V.9 Memory natural-language search

Each of H.4's five queries returns a **deterministic** result with citations:

1. *"When did I first study Torque?"* → the earliest `CONCEPT_CONFIRMED` /
   `EXTERNAL_STUDY_DECLARED`, with its date and event ID. If none: *"no record
   found"* — **never a plausible date.**
2. *"What do I keep getting wrong in Physics?"* → ranked open leaves with
   severity and occurrence counts; each links to its occurrences and evidence.
3. *"Am I better at Organic Chemistry than in March?"* → both windows stated,
   both evidence counts stated, and **if `formula_version` differed, the
   comparison is labelled as spanning a formula change.**
4. *"What have I studied but never been tested on?"* → concepts at
   `coverage_state = 'studied'`. Zero results returns an empty list, not a
   consolation.
5. *"Show me every mistake behind my sign errors."* → global pattern → leaves →
   occurrences → evidence, with IDs at every hop.
6. Ask something unanswerable — *"will I pass?"* — **no `StructuredQuery` is
   producible; the system says so and offers filters. It does not predict.**
7. Take any narrated answer and follow its citations. **Every claim reaches a
   record.**

### V.10 Correction and dispute

1. Student disputes a graded question. `CorrectionRequest{target: question_id}`
   exists; the attempt is marked `disputed` **and excluded from every dimension
   in both directions.**
2. Upheld mechanically (the answer key was wrong): a superseding attempt is
   appended, a superseding occurrence is appended
   (`occurrences.supersedes`), the leaf's `recurrenceCount` and `lastSeenAt`
   recompute, **the original rows still exist**, and today's snapshot carries
   `restatement_of`.
3. A judgement dispute is not auto-resolved. The record shows *"the student
   disputes this"* in the record, in memory, and in the export.
4. Student corrects a declaration (*"that was Friday, not Thursday"*). Accepted
   automatically; a superseding record is appended; the original remains.
5. Student attempts to edit a graded attempt directly. **No path exists** — no
   UPDATE policy on the table.
6. Student deletes all evidence images. Binaries destroyed; `content_hash`
   tombstones retained; **occurrences remain valid and their patterns are
   unchanged.**
7. Student exports. The bundle contains L1, L3, L5, the manifest with L2
   derivation rules, the dispute markers, and the audit trail — including the
   deletion in (6).
8. Student deletes the account. Academic data is erased; a non-academic
   `AuditEntry` tombstone remains; parent connections revoke and outstanding
   reports invalidate.

### V.11 End-to-end (the brief's canonical scenario)

> Student studies Torque externally → declares it → confirms it → the assessment
> contains Torque → a wrong answer immediately creates a Mistake Vault entry →
> the session finishes → the accomplishment appears → the next action is
> generated → a future retest occurs.

**Assertions at each hop:** the declaration opens a session and moves no score
(V.2.5) · confirmation is an event, not a UI flag (V.2.3) · Torque is in the
frozen coverage manifest before any model call (V.3.1) · the wrong answer
creates an `occurrence` with real evidence **before the next question renders**
(V.4.1) · the session reaches `VERIFIED` only with full coverage (V.3.4) · the
completion payload is a set of figures with no `message` field (E.8.a) · the
next action carries `evidence_refs` and **cannot gate anything** (K.3) · a
retest is scheduled, injected into a later session, and **cannot resolve the
pattern before day 7** (V.4.5-6).

---

## PART W — CURRENT → TARGET GAP MATRIX

**Priority:** **P0** blocks everything downstream · **P1** required for the V1
loop · **P2** required for the product to be honest · **P3** required for the
product to be complete.

| System | Current | Target | Gap | Verdict | Pri |
|---|---|---|---|---|---|
| Academic events | none | append-only L1 spine (D) | **total** | **CREATE** | **P0** |
| Persistence | `user_data.blob`, 20 localStorage strings, 15s whole-blob upsert | relational L1–L5 | **total** | **REBUILD** | **P0** |
| Sync/merge | merge by string length (`sync.ts:67`) | append + union, idempotent | **total** | **DELETE** | **P0** |
| Schema deployment | manual paste; 004 header records prod drift | ledger + CI gate | **total** | **CREATE** | **P0** |
| Auth enforcement | client `useEffect` guard; middleware authenticates nothing | server/edge auth | **total** | **REBUILD** | **P0** |
| Two shells | `/dashboard` + `/console` | one `/home` | duplication | **REBUILD** | **P0** |
| Concepts / taxonomy | `concepts` table + CBSE Physics seed, **0 importers** | wired resolution + versioning | **wiring** | **KEEP + WIRE** | **P1** |
| Study sessions | none | 6-state machine (E) | **total** | **CREATE** | **P1** |
| Assessment | none | coverage-guaranteed engine (F) | **total** | **CREATE** | **P1** |
| Evidence | `evidence` table, **0 importers** | capture + assessment attempts | **capture path** | **KEEP + WIRE** | **P1** |
| Mistake domain logic | `engine.ts`/`types.ts`, pure, 361 tests, **0 importers** | unchanged | **wiring only** | **KEEP** | **P1** |
| Mistake persistence + evidence model | localStorage rows, client-set status, no `evidenceId` writer | event-derived occurrences with real evidence | **structural** | **REBUILD** | **P1** |
| External study | no path; nothing outside the product counts | declared → assessed → verified (E.5) | **total** | **CREATE** | **P1** |
| Streak as a scoring input | 15% of the score, notifications, parent banner | **none** — Continuity replaces it, computed differently | **remove, not rename** | **REMOVE FROM SCORING** | **P1** |
| Mistake severity factors | unspecified (`engine.ts:293-298`) | derived + versioned (G.6) | derivation | **CREATE** | **P1** |
| Mistake capture UI | `exam-practice` writes 6 fields to localStorage | `/capture` | **total** | **REBUILD** | **P1** |
| Mistake pillar | `≡ 0` for every user, permanently | evidence-backed Recovery; **no enum patch** (J.9.b) | **structural** | **REBUILD** | **P1** |
| Ledger Score | 4 pillars from the blob; streak = 15% | 4 dimensions from events; no streak | inputs + one dimension | **REBUILD** | **P1** |
| Score snapshots | `score_history`, correct RLS, no version/confidence | + `formula_version`, `confidence`, watermark | additive | **ADAPT** | **P1** |
| Onboarding | 8 steps, unreachable from signup | one screen, reached from signup | flow + scope | **REBUILD** | **P1** |
| Ingestion pipeline | `008` + `lib/ingest/*`, **0 importers** | syllabus/paper ingestion | **wiring** | **KEEP + WIRE** | **P1** |
| Tool registry | 46 presentation-only entries, duplicated | capability manifest (P.2) | capability fields | **ADAPT** | **P1** |
| 46 tools | 29 persist nothing; 5 feed the record | 5 at Level 2–4; rest routable, unlinked | integration | **WRAP** | **P2** |
| AI personalisation | client-supplied, 7 of 86 prompts | server context, all capabilities | source + coverage | **ADAPT** | **P1** |
| AI route structure | 2,726 lines, 86-arm switch, greedy JSON regex | typed capabilities, schema validation | structure | **REBUILD** | **P2** |
| AI security spine | auth, tier, meter, 2-layer moderation, strikes | unchanged | none | **KEEP** | — |
| Parent boundary | `weakTopics` + miss counts shipped to parents | structurally unshareable at every setting (N.4); **not a toggle** | **§3.4 breach** | **DELETE** | **P1** |
| Parent identity | unauthenticated `parentCode` | authenticated, revocable, logged | **total** | **REBUILD** | **P2** |
| Parent digest | pure functions, good structure | minus weak topics, minus streak banner | content | **ADAPT** | **P1** |
| Fabricated data | `awake-count` + `rank-whisper`; `catch → total: 100`; +120 promise | none | **Law 7 breach** | **DELETE** | **P1** |
| XSS | `reference-builder:287` renders AI output as HTML | never render model output as HTML | one vector | **DELETE** | **P1** |
| CSP | `unsafe-eval` for absent dependencies | tightened | stale permission | **ADAPT** | **P2** |
| Data ownership | none (one unconfirmed "Clear all") | export/correct/dispute/delete + audit | **total** | **CREATE** | **P2** |
| Academic memory + search | none | 5-layer, FTS + pgvector, NL→StructuredQuery | **total** | **CREATE** | **P3** |
| Personal model | 2 fields, client-supplied | typed dimensions, signals, decay, override | **near-total** | **REBUILD** | **P2** |
| Recommendations | `next-move.ts` promising unpayable points | evidence-backed, non-gating, outcome-tracked | **total** | **REBUILD** | **P2** |
| Today | none (a static dashboard) | derived, non-fabricating (L) | **total** | **CREATE** | **P2** |
| Home composition | 5 unsynced booleans | registry + server layout + 4 tiers | **near-total** | **REBUILD** | **P2** |
| Customisation | `workspace.ts` — excellent, `/console`-only, unsynced | generalised, synced, server-persisted | scope | **KEEP + GENERALISE** | **P3** |
| Notifications | good engine; streak + unpayable copy | same engine, honest copy, server ledger | content + storage | **ADAPT** | **P1** |
| Jobs / cron | `lib/jobs.ts` + 3 Vercel + 2 Actions crons | + rebuilds, exports, compaction, consistency | additive | **KEEP** | **P2** |
| Observability | Sentry, PostHog, Vercel | unchanged | none | **KEEP** | — |
| Design systems | 4 CSS systems; glassmorphism live vs a permanent ban | one | **noted, out of scope** | — | — |
| Animation runtimes | 3 concurrent | one | **noted, out of scope** | — | — |
| Tests | 361 passing, **all on unwired code** | coverage of shipped paths | inversion | **CREATE** | **P2** |

---

## ARCHITECTURAL NORTH STAR

> StudyLedger is an **append-only academic evidence system** with a thin,
> replaceable product surface on top.
>
> One table is the truth: every academically meaningful thing that happens,
> recorded once, immutably, in one canonical shape. Everything else — sessions,
> assessments, mistake patterns, memory, the score, recommendations, today, the
> parent view — is a **projection** of that stream, rebuildable by replay, and
> never a source of truth.
>
> **Determinism owns the record; AI only ever proposes.** Every AI output
> crosses into the record through a named deterministic gate — a rule or the
> student's own confirmation — and the record stores which gate it crossed.
>
> **Evidence is what makes a claim real.** A student may declare what they
> studied and may never declare what they learned. A concept becomes proven by
> being assessed; a mistake becomes resolved by being retested after time has
> passed. No self-awarded mastery, refused at the database, in the domain engine,
> and at the ingest boundary.
>
> **The student owns everything and may rewrite nothing.** They can see, search,
> export, correct, dispute and delete — and every one of those acts is itself
> recorded. Corrections append and history restates; nothing is edited in place.
>
> **Honesty is structural, not editorial.** Insufficient evidence is a state, not
> a zero. An empty surface is a valid surface. Capture can never lower a score.
> If the system cannot verify something, it says so.

---

## IMPLEMENTATION ORDER

*Dependency order only — what must exist before what can be built reliably. Not
a schedule, not effort, not a plan. Sequencing belongs to `EXECUTION_PLAN.md`.*

**0 — Preconditions.** A migration ledger and a CI gate (T1); the
`/dashboard` ÷ `/console` merge decision executed (T10); server/edge
authentication (T11); the three governance contradictions resolved (T13). *Every
one of these makes downstream work unreliable if deferred; none depends on
anything below.*

**1 — Identity and profile.** `students`, versioned `student_profiles`, and one
server-side `getStudentContext()`. *Everything partitions by student, and the AI
boundary cannot become server-authoritative without it.*

**2 — Concept model.** Wire `concepts` + `lib/taxonomy/*`; add `merged_into` and
`taxonomy_version`; build resolution (exact → alias → semantic) with a legal
unresolved state. *Events, sessions, assessments, mistakes, coverage and search
all address concepts. It is the leaf dependency for the entire graph.*

**3 — Academic Event layer.** The table, the ingest endpoint, validation, dedup,
the outbox contract, and the quarantine table. *Nothing below can be built
correctly on any other substrate; building sessions or scoring first would mean
building them twice.*

**4 — Evidence and capture.** Wire the `evidence` table; build `/capture`.
*`occurrences.evidence_id` is `NOT NULL`, so mistakes are unbuildable without
it. `PRODUCT_DECISIONS.md:216`: "If this doesn't ship, nothing else matters."*

**5 — Study sessions.** The state machine, the resolver, external declaration.
*Requires 2 + 3. Assessment needs a confirmed concept set, which only the session
produces.*

**6 — Assessment engine.** Blueprint, coverage manifest, the seven generation
gates, deterministic grading. *Requires 2 + 3 + 5. This is the first point at
which the product manufactures verified evidence.*

**7 — Mistake DNA wiring.** Data-access layer over `007`, severity-factor
derivation, retest scheduling. *Requires 4 + 6 — a mistake needs both evidence
and a graded wrong answer. The domain engine already exists and does not need
building.*

**8 — Academic record projection.** Coverage state, per-concept accuracy,
watermarks. *Requires 3 + 6 + 7.*

**9 — Ledger Score.** Four dimensions, baseline, confidence, snapshots with
`formula_version`. *Requires 8. Building the score before the record it measures
is what produced the current mistake pillar.*

**10 — Academic memory and search.** Indexes, `StructuredQuery`, NL translation
with citations. *Requires 3 + 7 + 8; richer with 9.*

**11 — Personal model.** Signal extraction, aggregation, decay, the two-column
override. *Requires 3; meaningfully useful only after 6 (assessment gives it
outcomes to learn from).*

**12 — Recommendations.** Candidates, priority, outcomes, decay. *Requires 7 + 8
+ 9 + 11 — it reads almost everything, which is why it is near the top.*

**13 — Today.** *Requires 12 (and 5, 9). Today without recommendations has
nothing honest to say.*

**14 — Home composition.** Registry, server-persisted layout, the four tiers.
*Requires 13 — composition needs typed items to compose.*

**15 — Parent space.** Identity, invitation, share policy, projection, reports,
audit. *Requires 8 + 9 for content; the §3.4 field removals (S.7) are **P1 and
must happen at step 0**, independently of the rest.*

**16 — Data ownership.** Export, correction, dispute, deletion, audit surfacing.
*Requires everything it exports — but `AuditEntry` itself must exist from step 3,
because an audit trail that starts late has a hole at exactly the point of
maximum change.*

**17 — Customisation generalisation.** `workspace.ts` beyond `/console`, synced
and server-persisted. *Independent of the record; last because it is the only
subsystem whose absence costs nothing academic.*

---

*End of specification.*
