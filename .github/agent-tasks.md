# Agent Task Queue

The agent runs every Monday and Thursday at 3 AM UTC. Each run picks the first `[ ]` task,
implements it, and opens a PR. Merge the PR to ship — the task is marked `[x]` automatically.
The agent waits for you to merge before starting the next task.

To add a task: add a `- [ ]` line anywhere in the Queue section below.
To skip a task: change `[ ]` to `[~]`.
To reset an in-progress task: change `[x]` back to `[ ]`.

---

## Queue

- [ ] Fix: Peer Heatmap — remove the "Updated hourly" text from the header and replace the "Aggregated from weak-topic data across Ledger users" description with "Sample data · Representative distribution across boards" since the data is hardcoded, not live
- [ ] Fix: GPA Simulator — the page header reads "Score Needed Calculator" but the dashboard card says "GPA Simulator" — rename the h1/header in app/tools/gpa-sim/page.tsx to "GPA Simulator" to match
- [ ] Fix: Debt Meter formula — app/tools/debt-meter/page.tsx and app/tools/planner/page.tsx both compute a debt score but use different formulas — read both, pick the better one, and apply it consistently in both places
- [ ] Feature: Coach empty state — in app/tools/coach/page.tsx, when gatherContext() returns all-zero data (user has no localStorage study history), show a small notice above the generate button: "No study data yet — use Past Papers and Habits first to get a personalised briefing." Currently the coach generates a blank briefing with no warning
- [ ] Feature: Spaced Review auto-import — in app/tools/spaced-review/page.tsx, add a useEffect on mount that reads ledger-mistakes from localStorage (written by the Past Papers tool) and adds any items not already in the review queue, then shows a dismissable notice "Imported N items from Past Papers"
- [ ] Feature: Past Papers AI explain — in app/tools/papers/page.tsx, after a user marks a question wrong, add an "Explain this answer" button that calls callAI with tool "papers_explain" passing the question and correct answer, and shows the explanation inline; also add case "papers_explain" to app/api/ai/route.ts
- [ ] Feature: Citation Generator AI check — in app/tools/citation/page.tsx, add an "AI check" button next to each formatted citation that calls callAI with tool "citation_check" passing the citation text and style, returns a corrected version with a note on what was wrong; also add case "citation_check" to app/api/ai/route.ts
- [ ] Feature: Resume Builder AI bullets — in app/tools/resume/page.tsx, add an "Improve" button next to each experience bullet point input that calls callAI with tool "resume_bullet" passing the rough bullet and job title, returns a polished action-verb resume line; also add case "resume_bullet" to app/api/ai/route.ts
- [ ] Fix: Rate limit prep — in lib/ai-fetch.ts, after every successful AI call increment a counter in localStorage (key: ai_calls_today, reset key: ai_calls_reset_at) — no blocking yet, just counting — so the October 2026 rate limit enforcement only needs to add the comparison check
- [ ] Feature: Error boundary for AI tools — pick 5 tools that lack try/catch around their callAI() call (read the files to find them), add a try/catch that sets an error state string, and render a styled error div with "Something went wrong. Try again." when error is set
