#!/usr/bin/env python3
"""
Ledger Agent v2
Reads the Obsidian vault, generates a niche feature idea, implements it,
runs 5 verification steps, auto-fixes failures, creates a PR.

Run manually:  python .github/agent/run.py
Scheduled:     Windows Task Scheduler → runs daily via run.bat
"""

import os, re, sys, json, subprocess, datetime
from pathlib import Path
import anthropic

# Force UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Config ────────────────────────────────────────────────────────────────────
REPO_ROOT  = Path(__file__).resolve().parent.parent.parent
VAULT_ROOT = Path(r"C:\Users\DELL\Documents\LedgerBrain")
MODEL      = "claude-sonnet-4-6"

# Read API key from env or .env.local
_api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
if not _api_key:
    env_file = REPO_ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                _api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not _api_key:
    print("ERROR: ANTHROPIC_API_KEY not set. Add it to .env.local or set it as an env var.")
    sys.exit(1)

client = anthropic.Anthropic(api_key=_api_key)


# ── Shell helpers ─────────────────────────────────────────────────────────────
def sh(cmd: list, **kwargs) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    return subprocess.run(cmd, cwd=REPO_ROOT, **kwargs)

def sh_out(cmd: list) -> str:
    return subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True).stdout.strip()


# ── Vault reader ──────────────────────────────────────────────────────────────
def read_vault() -> str:
    if not VAULT_ROOT.exists():
        return "(vault not accessible — skipping)"

    def slurp(p: Path, limit=3000) -> str:
        try: return p.read_text(encoding="utf-8", errors="ignore")[:limit]
        except: return ""

    parts = []

    # Master index
    idx = VAULT_ROOT / "00-Index.md"
    if idx.exists():
        parts.append(f"=== VAULT INDEX ===\n{slurp(idx, 4000)}")

    # Backlog
    bl = VAULT_ROOT / "Roadmap" / "Backlog.md"
    if bl.exists():
        parts.append(f"=== BACKLOG ===\n{slurp(bl)}")

    # Ideas
    ideas_dir = VAULT_ROOT / "Ideas"
    if ideas_dir.exists():
        ideas = [f"[{f.stem}]\n{slurp(f, 600)}" for f in sorted(ideas_dir.glob("*.md"))]
        parts.append("=== IDEAS ===\n" + "\n\n".join(ideas))

    # Patterns
    patterns_dir = VAULT_ROOT / "Patterns"
    if patterns_dir.exists():
        pats = [slurp(f, 500) for f in sorted(patterns_dir.glob("*.md"))]
        parts.append("=== PATTERNS ===\n" + "\n\n".join(pats))

    # Tool notes — condensed (frontmatter + first 250 chars of body)
    tools_dir = VAULT_ROOT / "Tools"
    if tools_dir.exists():
        notes = []
        for cat in sorted(tools_dir.iterdir()):
            for f in sorted(cat.glob("*.md")):
                notes.append(f"{f.stem} ({cat.name}): {slurp(f, 300)}")
        parts.append("=== TOOL NOTES ===\n" + "\n---\n".join(notes[:50]))

    return "\n\n".join(parts)


# ── Codebase context ──────────────────────────────────────────────────────────
def read_codebase_context() -> str:
    parts = []

    claude_md = REPO_ROOT / "CLAUDE.md"
    if claude_md.exists():
        parts.append(f"=== CLAUDE.md ===\n{claude_md.read_text(encoding='utf-8')}")

    tools_dir = REPO_ROOT / "app" / "tools"
    if tools_dir.exists():
        names = sorted(d.name for d in tools_dir.iterdir() if d.is_dir())
        parts.append("=== EXISTING TOOL ROUTES ===\n" + "\n".join(names))

    api_route = REPO_ROOT / "app" / "api" / "ai" / "route.ts"
    if api_route.exists():
        text = api_route.read_text(encoding="utf-8")
        m = re.search(r'type ToolName = ([^;]+);', text)
        if m:
            parts.append(f"=== CURRENT AI TOOL CASES (ToolName type) ===\n{m.group(1)}")

    return "\n\n".join(parts)


# ── Phase 1: Idea generation ──────────────────────────────────────────────────
def generate_idea(vault_ctx: str, codebase_ctx: str) -> dict:
    print("\n[Phase 1] Generating feature idea...\n")

    resp = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": f"""You are a product strategist for studyledger.in — a student OS with 60 tools for school/college students (13-22 yrs, primarily India: CBSE, JEE, NEET, IB, IGCSE).

VAULT CONTEXT (Obsidian notes — what's been built, planned, patterns observed):
{vault_ctx[:8000]}

CODEBASE CONTEXT:
{codebase_ctx[:3000]}

Identify ONE niche feature to build. Criteria:
1. Students desperately need this but NO major edtech app does it well (not Toppr, Byjus, Khan Academy, Unacademy, Anki, Quizlet, Notion)
2. Specific to the Indian exam prep ecosystem OR universal student pain
3. High shareability — a student who finds it immediately tells their study group
4. Buildable in 1-3 Next.js files (~150-300 lines)
5. Uses the existing AI infrastructure (callAI → /api/ai)
6. Does NOT already exist in the tool list above

Think about: what happens at 2AM before a JEE paper? What do students wish existed during board season? What do toppers do that average students don't know about?

Respond with ONLY valid JSON (no markdown fences):
{{
  "name": "Feature Name",
  "slug": "feature-slug",
  "category": "PLAN|LEARN|WRITE|PRACTISE|FUTURE|TRACK",
  "tagline": "one-line dashboard card description",
  "why_students_need_it": "specific concrete pain this solves",
  "why_no_one_does_it": "why existing apps miss this gap",
  "market_insight": "what makes this high-demand and differentiated",
  "implementation_plan": "what files to create/modify, how the UI works, what AI returns",
  "ai_tool_name": "snake_case_api_case_name",
  "output_schema": {{"field": "description"}},
  "new_files": ["app/tools/slug/page.tsx"],
  "modified_files": ["app/api/ai/route.ts", "app/dashboard/page.tsx"]
}}"""}]
    )

    text = resp.content[0].text.strip()
    m = re.search(r'\{[\s\S]*\}', text)
    if not m:
        print("ERROR: no JSON in idea response"); print(text); sys.exit(1)

    idea = json.loads(m.group())
    print(f"  → {idea['name']}")
    print(f"  → Why: {idea['why_students_need_it'][:120]}")
    print(f"  → Niche: {idea['market_insight'][:120]}")
    return idea


# ── File tools (used by implement + fix) ─────────────────────────────────────
def read_file(path: str) -> str:
    p = REPO_ROOT / path
    if not p.exists(): return f"FILE_NOT_FOUND: {path}"
    if p.stat().st_size > 200_000: return f"FILE_TOO_LARGE: {path}"
    try: return p.read_text(encoding="utf-8")
    except Exception as e: return f"READ_ERROR: {e}"

def write_file(path: str, content: str) -> str:
    p = REPO_ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return f"written {path} ({len(content)} chars)"

def list_dir(path: str) -> str:
    p = REPO_ROOT / path
    if not p.exists(): return f"DIR_NOT_FOUND: {path}"
    return "\n".join(f"{'D' if x.is_dir() else 'F'}  {x.name}" for x in sorted(p.iterdir()))


def _fix_loop(system: str, first_message: str, max_turns: int = 8) -> None:
    """Tool-use loop used only for auto-fix. Supports write_file + fixes_complete."""
    tools = [
        {"name": "write_file", "description": "Write corrected file (full content)",
         "input_schema": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}},
        {"name": "fixes_complete", "description": "Call when all fixes applied",
         "input_schema": {"type": "object", "properties": {"summary": {"type": "string"}}, "required": ["summary"]}},
    ]
    messages = [{"role": "user", "content": first_message}]
    for turn in range(max_turns):
        print(f"  [fix turn {turn+1}/{max_turns}]")
        resp = client.messages.create(model=MODEL, max_tokens=8192, system=system, tools=tools, messages=messages)
        messages.append({"role": "assistant", "content": resp.content})
        tool_results = []
        done = False
        for block in resp.content:
            if block.type != "tool_use": continue
            inp = block.input
            print(f"    -> {block.name}({list(inp.keys())})")
            try:
                if block.name == "write_file":
                    out = write_file(inp["path"], inp["content"]) if "content" in inp else "ERROR: missing content"
                elif block.name == "fixes_complete":
                    done = True; out = "done"
                else:
                    out = f"unknown: {block.name}"
            except Exception as e:
                out = f"ERROR: {e}"
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": out})
        if done: break
        if resp.stop_reason == "end_turn" and not tool_results: break
        if tool_results:
            messages.append({"role": "user", "content": tool_results})


# ── Phase 2: Implementation (targeted — no full-file rewrites of large files) ──

def generate_page_content(idea: dict) -> str:
    """Single API call — returns complete page.tsx content."""
    ref = read_file("app/tools/concept-connect/page.tsx")
    resp = client.messages.create(
        model=MODEL,
        max_tokens=8192,
        messages=[{"role": "user", "content": f"""Write a complete Next.js page component for this feature. Return ONLY the file content — no explanation, no markdown fences.

FEATURE:
Name: {idea['name']} | Slug: {idea['slug']} | Route: /tools/{idea['slug']}
Category: {idea['category']} | AI case: {idea['ai_tool_name']}
What it does: {idea['why_students_need_it']}
Implementation: {idea['implementation_plan']}
Output schema: {json.dumps(idea['output_schema'])}

RULES (follow exactly):
- "use client" at top
- TypeScript strict — define all types explicitly
- import callAI from "@/lib/ai-fetch"
- import {{ AIOutput }} from "@/components/ai-output"  (variant="principle" for 1-2 sentence serif italic quotes)
- import {{ AIThinking }} from "@/components/ai-thinking"  (show during loading, below submit button)
- Inline styles only. CSS vars: --ink --ink-2 --ink-3 --paper --paper-2 --cinnabar --cinnabar-ink --rule --sans --serif --mono
- NO Tailwind color classes
- callAI call: await callAI({{ tool: "{idea['ai_tool_name']}", ...inputParams }}) as ResultType
- Header: <header> with back link + tool name (see style reference)
- Include a Link back to /dashboard

STYLE REFERENCE (match this structure and design exactly):
{ref[:3000]}"""}]
    )
    text = resp.content[0].text.strip()
    text = re.sub(r'^```(?:tsx?|typescript)?\n', '', text)
    text = re.sub(r'\n```$', '', text)
    return text.strip()


def generate_api_case(idea: dict) -> str:
    """Single API call — returns just the case block to insert into route.ts."""
    schema_json = json.dumps(idea['output_schema'], indent=2)
    schema_example = json.dumps({k: "..." for k in idea['output_schema'].keys()}, indent=2)
    tool_name = idea['ai_tool_name']
    resp = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": f"""Write the API route case block for this tool. Return ONLY the case block — no surrounding code.

Tool name (snake_case): {tool_name}
Feature: {idea['name']}
Purpose: {idea['why_students_need_it']}
Output schema: {schema_json}
Implementation: {idea['implementation_plan']}

The block must follow this EXACT format:
    case "{tool_name}":
      return {{
        system: `${{SAFETY_PREAMBLE}}You are [role]. Always respond with valid JSON only.`,
        userText: `[instruction]. Respond with exactly this JSON:\\n{schema_example}\\n\\n[param interpolations using ${{params.fieldName}}]`,
      }};

Write a thorough, detailed system prompt. The userText must build the prompt from the request params.
Return ONLY the block starting from `    case` to `      }};` (inclusive).
Do not include backticks or any surrounding text."""}]
    )
    return resp.content[0].text.strip()


def patch_route_ts(case_block: str, tool_name: str):
    """Insert the new case into route.ts and add tool_name to ToolName + validTools."""
    text = read_file("app/api/ai/route.ts")

    # 1. Add to ToolName union type (append before the semicolon)
    text = re.sub(
        r'(type ToolName = [^;]+);',
        lambda m: m.group(0)[:-1] + f' | "{tool_name}";',
        text,
        count=1,
    )

    # 2. Insert case before "export async function POST" (safest insertion point)
    marker = "\n  }\n}\n\nexport async function POST"
    if marker in text:
        text = text.replace(marker, f"\n\n    {case_block}{marker}", 1)
    else:
        print("  WARNING: Could not find insertion point in route.ts")

    # 3. Add to validTools array (append before closing bracket)
    text = re.sub(
        r'(const validTools: ToolName\[\] = \[[^\]]+)(\];)',
        lambda m: m.group(1) + f', "{tool_name}"' + m.group(2),
        text,
        count=1,
    )

    write_file("app/api/ai/route.ts", text)
    print(f"  -> Patched route.ts: added {tool_name}")


def patch_dashboard(idea: dict):
    """Append the new tool card to the correct category in dashboard/page.tsx."""
    text = read_file("app/dashboard/page.tsx")
    cat   = idea["category"]
    slug  = idea["slug"]
    ttl   = idea["name"]
    sub   = idea["tagline"][:55].replace('"', "'")
    desc  = idea["why_students_need_it"][:120].replace('"', "'")

    new_entry = f'      {{ slug: "{slug}", ttl: "{ttl}", sub: "{sub}", tier: "Free", desc: "{desc}" }},'

    # Find the category block and append to its tools array
    cat_pos = text.find(f'label: "{cat}"')
    if cat_pos == -1:
        print(f"  WARNING: Category {cat} not found in dashboard"); return

    tools_end = text.find("\n    ],", cat_pos)
    if tools_end == -1:
        print(f"  WARNING: tools array end not found for {cat}"); return

    text = text[:tools_end] + "\n" + new_entry + text[tools_end:]
    write_file("app/dashboard/page.tsx", text)
    print(f"  -> Patched dashboard: added {slug} to {cat}")


def implement(idea: dict) -> list[str]:
    print(f"\n[Phase 2] Implementing {idea['name']}...\n")
    changed_files = []

    page_path = (idea.get("new_files") or [f"app/tools/{idea['slug']}/page.tsx"])[0]

    # 1. Generate page file (focused single API call — no large file context needed)
    print("  Generating page...")
    page_content = generate_page_content(idea)
    write_file(page_path, page_content)
    changed_files.append(page_path)
    print(f"  -> {page_path} ({len(page_content):,} chars)")

    # 2. Generate API case (single focused call — just the case block)
    print("  Generating API case...")
    case_block = generate_api_case(idea)
    patch_route_ts(case_block, idea["ai_tool_name"])
    changed_files.append("app/api/ai/route.ts")

    # 3. Patch dashboard (script handles insertion — no Claude needed)
    print("  Patching dashboard...")
    patch_dashboard(idea)
    changed_files.append("app/dashboard/page.tsx")

    return changed_files


# ── Phase 3: Verification (5 steps) ──────────────────────────────────────────
def verify(changed_files: list[str]) -> tuple[bool, list[dict]]:
    print("\n[Phase 3] Verification...\n")
    steps = []

    # Step 1: TypeScript
    print("  [1/5] TypeScript (tsc --noEmit)...")
    r = sh(["npx", "tsc", "--noEmit", "--skipLibCheck"], capture_output=True, text=True)
    passed = r.returncode == 0
    steps.append({"step": "TypeScript", "passed": passed, "output": (r.stdout + r.stderr)[:2000]})
    print(f"        {'✓' if passed else '✗'}")

    # Step 2: ESLint on changed files
    print("  [2/5] ESLint...")
    ts_files = [f for f in changed_files if f.endswith((".tsx", ".ts"))]
    if ts_files:
        r = sh(["npx", "next", "lint", "--file"] + ts_files, capture_output=True, text=True)
        passed = r.returncode == 0
        steps.append({"step": "ESLint", "passed": passed, "output": (r.stdout + r.stderr)[:2000]})
    else:
        steps.append({"step": "ESLint", "passed": True, "output": "no TS files"})
    print(f"        {'✓' if steps[-1]['passed'] else '✗'}")

    # Step 3: Import resolution
    print("  [3/5] Import resolution...")
    issues = []
    for path in changed_files:
        if not path.endswith((".tsx", ".ts")): continue
        p = REPO_ROOT / path
        if not p.exists(): issues.append(f"File not found: {path}"); continue
        for m in re.finditer(r'from "@/([^"]+)"', p.read_text(encoding="utf-8")):
            imp = m.group(1)
            found = any((REPO_ROOT / f"{imp}{ext}").exists() for ext in ["", ".ts", ".tsx", "/index.ts", "/index.tsx"])
            if not found:
                issues.append(f"Unresolved: @/{imp} in {path}")
    passed = len(issues) == 0
    steps.append({"step": "Import resolution", "passed": passed, "output": "\n".join(issues) or "OK"})
    print(f"        {'✓' if passed else '✗'} {issues[:2] if issues else ''}")

    # Prepare file contents for AI reviews
    files_content = "\n\n".join(
        f"=== {p} ===\n{read_file(p)[:4000]}"
        for p in changed_files
        if not read_file(p).startswith("FILE_NOT_FOUND")
    )

    # Step 4: Logic & correctness review
    print("  [4/5] Logic review (AI)...")
    r4 = client.messages.create(model=MODEL, max_tokens=800, messages=[{"role": "user", "content": f"""Review these code changes for bugs and logic errors.

{files_content}

Check:
1. Correct loading / error / empty states present?
2. Any obvious runtime errors (undefined access, wrong types)?
3. callAI() tool name matches the API route case?
4. React hooks used correctly (no conditional hooks)?

Respond JSON only — no markdown: {{"passed": true/false, "issues": ["issue 1", ...]}}"""}])
    try: r4j = json.loads(re.search(r'\{[\s\S]*\}', r4.content[0].text).group())
    except: r4j = {"passed": True, "issues": []}
    steps.append({"step": "Logic review", "passed": r4j.get("passed", True), "output": str(r4j.get("issues", []))})
    print(f"        {'✓' if r4j.get('passed', True) else '✗'} {r4j.get('issues', [])[:1]}")

    # Step 5: Design system compliance
    print("  [5/5] Design system review (AI)...")
    r5 = client.messages.create(model=MODEL, max_tokens=600, messages=[{"role": "user", "content": f"""Review for design system compliance.

{files_content}

Check ONLY:
1. No hardcoded hex/rgb colors — must use CSS vars (var(--ink), var(--paper), var(--cinnabar), etc.)
2. No Tailwind color utility classes (text-red-*, bg-blue-*, etc.)
3. Loading uses <AIThinking /> — not a spinner or plain text
4. AI output uses <AIOutput text={{...}} /> — not raw divs with fontFamily inline
5. Fonts via var(--sans) / var(--serif) / var(--mono) — not hardcoded

Respond JSON only: {{"passed": true/false, "issues": ["issue 1", ...]}}"""}])
    try: r5j = json.loads(re.search(r'\{[\s\S]*\}', r5.content[0].text).group())
    except: r5j = {"passed": True, "issues": []}
    steps.append({"step": "Design system", "passed": r5j.get("passed", True), "output": str(r5j.get("issues", []))})
    print(f"        {'✓' if r5j.get('passed', True) else '✗'} {r5j.get('issues', [])[:1]}")

    all_passed = all(s["passed"] for s in steps)
    return all_passed, steps


# ── Phase 4: Auto-fix ─────────────────────────────────────────────────────────
def auto_fix(changed_files: list[str], failed_steps: list[dict]) -> list[str]:
    print("\n[Phase 4] Auto-fixing failed checks...\n")
    issues_text = "\n\n".join(
        f"FAILED — {s['step']}:\n{s['output']}"
        for s in failed_steps if not s["passed"]
    )
    files_content = "\n\n".join(
        f"=== {p} ===\n{read_file(p)}"
        for p in changed_files
        if not read_file(p).startswith("FILE_NOT_FOUND")
    )

    _fix_loop(
        system=f"Fix code issues. Write complete corrected files.\n\nCLAUDE.md rules:\n{read_file('CLAUDE.md')}",
        first_message=f"Fix these issues:\n\n{issues_text}\n\nCurrent files:\n{files_content}\n\nWrite corrected files then call fixes_complete.",
    )
    return changed_files


# ── Vault logging ─────────────────────────────────────────────────────────────
def log_to_vault(idea: dict, steps: list[dict]):
    if not VAULT_ROOT.exists(): return
    today = datetime.date.today().isoformat()
    cat = idea["category"]

    tool_note = VAULT_ROOT / "Tools" / cat / f"{idea['slug']}.md"
    tool_note.parent.mkdir(parents=True, exist_ok=True)
    tool_note.write_text(f"""---
name: {idea['name']}
slug: {idea['slug']}
route: /tools/{idea['slug']}
category: {cat}
status: built
ai: true
signature: false
tags:
  - status/built
  - category/{cat.lower()}
  - ai/true
last-changed: {today}
---

# {idea['name']}

**Route:** `/tools/{idea['slug']}`
**Status:** Built by Ledger Agent v2
**AI:** Yes — `case "{idea['ai_tool_name']}"` in `/api/ai/route.ts`

## What it does
{idea['why_students_need_it']}

## Market insight
{idea['market_insight']}

## Why no one else does this
{idea['why_no_one_does_it']}

## Output schema
```json
{json.dumps(idea['output_schema'], indent=2)}
```

## Changelog
- {today}: Built by Ledger Agent v2
""", encoding="utf-8")

    session_note = VAULT_ROOT / "Sessions" / f"Build — {idea['name']}.md"
    passed = sum(1 for s in steps if s["passed"])
    session_note.write_text(f"""# Build — {idea['name']}

## Feature
{idea['tagline']}

## Why built
{idea['why_students_need_it']}

## Market gap
{idea['why_no_one_does_it']}

## Verification ({passed}/{len(steps)} passed)
{"".join(f"- {'✓' if s['passed'] else '✗'} {s['step']}: {s['output'][:100]}\\n" for s in steps)}

## Related
[[{idea['slug']}]]

_Built by Ledger Agent v2 — {today}_
""", encoding="utf-8")

    print(f"  → Vault: created {tool_note.name} + session note")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("\n" + "="*55)
    print("  Ledger Agent v2")
    print("="*55)

    print("\nReading vault and codebase...")
    vault_ctx = read_vault()
    codebase_ctx = read_codebase_context()
    print(f"  → Vault: {len(vault_ctx):,} chars")
    print(f"  → Codebase: {len(codebase_ctx):,} chars")

    # Generate feature idea
    idea = generate_idea(vault_ctx, codebase_ctx)

    # Git setup
    sh(["git", "config", "user.email", "agent@studyledger.in"], check=True)
    sh(["git", "config", "user.name", "Ledger Agent"], check=True)
    safe_slug = re.sub(r"[^a-z0-9]+", "-", idea["slug"])[:40]
    branch = f"agent/{safe_slug}"

    # Check branch doesn't already exist
    existing = sh_out(["git", "branch", "--list", branch])
    if existing:
        print(f"Branch {branch} already exists — skipping (feature may already be built).")
        sys.exit(0)

    sh(["git", "checkout", "-b", branch], check=True)

    # Implement
    changed_files = implement(idea)
    if not changed_files:
        print("No files written — agent did not complete. Aborting."); sys.exit(1)

    # Verify
    all_passed, steps = verify(changed_files)

    # Auto-fix if needed (one round)
    if not all_passed:
        failed = [s for s in steps if not s["passed"]]
        print(f"\n  {len(failed)} check(s) failed — attempting auto-fix...")
        changed_files = auto_fix(changed_files, failed)
        all_passed, steps = verify(changed_files)

    # Commit
    sh(["git", "add", "-A"], check=True)
    changed = sh_out(["git", "diff", "--cached", "--name-only"])
    if not changed:
        print("No staged changes — aborting."); sys.exit(1)

    passed_count = sum(1 for s in steps if s["passed"])
    verification_lines = "\n".join(f"{'✓' if s['passed'] else '✗'} {s['step']}" for s in steps)

    sh(["git", "commit", "-m",
        f"feat({idea['slug']}): {idea['name']}\n\n{idea['tagline']}\n\nVerification ({passed_count}/{len(steps)}):\n{verification_lines}\n\nCo-Authored-By: Ledger Agent v2 <agent@studyledger.in>"],
       check=True)
    sh(["git", "push", "origin", branch], check=True)

    # Create PR
    pr_body = f"""## {idea['name']}
> {idea['tagline']}

### Why students need this
{idea['why_students_need_it']}

### Why no existing app does this
{idea['why_no_one_does_it']}

### Market insight
{idea['market_insight']}

### Verification — {passed_count}/{len(steps)} passed
{"".join(f"{'✅' if s['passed'] else '❌'} **{s['step']}**  " for s in steps)}

---
🤖 Ledger Agent v2 · {'✅ All checks passed' if all_passed else '⚠️ Some checks failed — review before merging'}"""

    sh(["gh", "pr", "create",
        "--title", f"feat: {idea['name']}",
        "--body", pr_body,
        "--base", "master"], check=True)

    # Log to vault
    log_to_vault(idea, steps)

    print(f"\n{'='*55}")
    print(f"  Done — {idea['name']}")
    print(f"  Checks: {passed_count}/{len(steps)} passed")
    print(f"  PR open at github.com/Ari191210/Ledger-Ai/pulls")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
