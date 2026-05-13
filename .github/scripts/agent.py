#!/usr/bin/env python3
"""
Ledger Agent — autonomous improvement agent for studyledger.in.
Picks the next uncompleted task from .github/agent-tasks.md, implements it
using Claude with file read/write tools, marks it done, and opens a PR.
"""

import os
import re
import subprocess
import sys
from pathlib import Path

import anthropic

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
TASKS_FILE = REPO_ROOT / ".github" / "agent-tasks.md"
MODEL = "claude-sonnet-4-6"


_api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
if not _api_key:
    print("ERROR: ANTHROPIC_API_KEY secret is not set or is empty.")
    print("Go to GitHub → Settings → Secrets and variables → Actions → New repository secret")
    sys.exit(1)

client = anthropic.Anthropic(api_key=_api_key)


def sh(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=REPO_ROOT, check=True, **kwargs)


def sh_out(cmd: list[str]) -> str:
    return subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True).stdout.strip()


# ── Task queue ────────────────────────────────────────────────────────────────

def get_next_task() -> tuple[int, str] | None:
    lines = TASKS_FILE.read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        # Only match lines that START with "- [ ]" — skip instruction text containing the pattern
        if line.strip().startswith("- [ ]"):
            text = line.strip()[5:].strip()
            return i, text
    return None


def mark_task_done(line_index: int):
    text = TASKS_FILE.read_text(encoding="utf-8")
    lines = text.splitlines()
    stripped = lines[line_index].strip()
    if stripped.startswith("- [ ]"):
        lines[line_index] = lines[line_index].replace("- [ ]", "- [x]", 1)
    TASKS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def has_open_agent_pr() -> bool:
    result = subprocess.run(
        ["gh", "pr", "list", "--state", "open", "--json", "headRefName"],
        cwd=REPO_ROOT, capture_output=True, text=True,
    )
    return '"agent/' in result.stdout


# ── File tools ────────────────────────────────────────────────────────────────

def read_file(path: str) -> str:
    p = REPO_ROOT / path
    if not p.exists():
        return f"FILE_NOT_FOUND: {path}"
    if p.stat().st_size > 150_000:
        return f"FILE_TOO_LARGE: {path} ({p.stat().st_size} bytes) — read a smaller slice"
    try:
        return p.read_text(encoding="utf-8")
    except Exception as e:
        return f"READ_ERROR: {e}"


def write_file(path: str, content: str) -> str:
    p = REPO_ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return f"OK: wrote {path} ({len(content)} chars)"


def list_dir(path: str) -> str:
    p = REPO_ROOT / path
    if not p.exists():
        return f"DIR_NOT_FOUND: {path}"
    items = sorted(p.iterdir())
    return "\n".join(f"{'D' if x.is_dir() else 'F'}  {x.name}" for x in items)


# ── Agent loop ────────────────────────────────────────────────────────────────

def run_agent(task: str) -> dict:
    claude_md = read_file("CLAUDE.md")

    system = f"""You are Ledger Agent, an autonomous coding agent for studyledger.in — a Next.js 14 student OS.

PROJECT INSTRUCTIONS (CLAUDE.md):
{claude_md}

YOUR TASK:
{task}

HOW TO WORK:
1. Use list_dir and read_file to understand the current code before editing.
2. Make targeted, minimal changes that implement exactly the task — nothing more.
3. Write the COMPLETE file content when using write_file (not diffs).
4. Follow project style: TypeScript strict, inline styles, OKLCH CSS vars, no Tailwind color classes.
5. AI tools use callAI() from lib/ai-fetch.ts, with a tool field matching a case in app/api/ai/route.ts.
6. Loading states use <AIThinking />. AI responses use <AIOutput text={{...}} /> or variant="principle".
7. When all edits are done, call task_complete with a short PR title and bullet-point summary."""

    tools = [
        {
            "name": "read_file",
            "description": "Read a file. Path is relative to the repo root (e.g. 'app/tools/planner/page.tsx').",
            "input_schema": {
                "type": "object",
                "properties": {"path": {"type": "string"}},
                "required": ["path"],
            },
        },
        {
            "name": "write_file",
            "description": "Write complete file content. Creates directories as needed. Always write the FULL file.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string", "description": "Complete file content"},
                },
                "required": ["path", "content"],
            },
        },
        {
            "name": "list_dir",
            "description": "List files and subdirectories in a directory.",
            "input_schema": {
                "type": "object",
                "properties": {"path": {"type": "string"}},
                "required": ["path"],
            },
        },
        {
            "name": "task_complete",
            "description": "Call this when all file edits are done. Triggers commit and PR creation.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "pr_title": {"type": "string", "description": "PR title, under 70 characters"},
                    "summary": {"type": "string", "description": "2-4 bullet points of what changed and why"},
                },
                "required": ["pr_title", "summary"],
            },
        },
    ]

    messages = [{"role": "user", "content": "Start by reading the relevant files, then implement the task."}]
    result = None

    for turn in range(30):
        resp = client.messages.create(
            model=MODEL,
            max_tokens=8192,
            system=system,
            tools=tools,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": resp.content})

        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            inp = block.input
            try:
                if block.name == "read_file":
                    out = read_file(inp["path"])
                elif block.name == "write_file":
                    if "content" not in inp:
                        out = "ERROR: write_file requires both 'path' and 'content'. Call again with the full file content in the 'content' parameter."
                    else:
                        out = write_file(inp["path"], inp["content"])
                elif block.name == "list_dir":
                    out = list_dir(inp["path"])
                elif block.name == "task_complete":
                    result = inp
                    out = "Task complete. Committing."
                else:
                    out = f"UNKNOWN_TOOL: {block.name}"
            except Exception as e:
                out = f"TOOL_ERROR: {e}"

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": out,
            })

        if result:
            break
        if resp.stop_reason == "end_turn" and not tool_results:
            break
        if tool_results:
            messages.append({"role": "user", "content": tool_results})

    return result or {"pr_title": task[:69], "summary": "Implemented task."}


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # One PR at a time — wait for the user to merge before starting next task
    if has_open_agent_pr():
        print("An agent PR is already open. Merge it first, then the agent will pick up the next task.")
        sys.exit(0)

    task_info = get_next_task()
    if not task_info:
        print("No pending tasks in .github/agent-tasks.md — all done!")
        sys.exit(0)

    line_index, task = task_info
    print(f"\n→ Task: {task}\n")

    sh(["git", "config", "user.email", "agent@studyledger.in"])
    sh(["git", "config", "user.name", "Ledger Agent"])

    safe = re.sub(r"[^a-z0-9]+", "-", task[:40].lower()).strip("-")
    branch = f"agent/{line_index + 1}-{safe}"
    sh(["git", "checkout", "-b", branch])

    print("\nRunning agent...\n")
    result = run_agent(task)
    print(f"\nAgent done: {result['pr_title']}")

    # Mark task done in the tasks file (included in this PR's diff)
    mark_task_done(line_index)

    sh(["git", "add", "-A"])
    changed = sh_out(["git", "diff", "--cached", "--name-only"])
    if not changed:
        print("Agent made no file changes — skipping PR.")
        sys.exit(1)

    print(f"\nChanged files:\n{changed}\n")

    sh(["git", "commit", "-m", f"{result['pr_title']}\n\nCo-Authored-By: Ledger Agent <agent@studyledger.in>"])
    sh(["git", "push", "origin", branch])

    body = f"""## Summary
{result['summary']}

## Task
> {task}

---
🤖 Implemented by Ledger Agent · Merge to ship · Close to skip"""

    sh(["gh", "pr", "create",
        "--title", result["pr_title"],
        "--body", body,
        "--base", "master"])

    print("\nDone! PR is open and ready to review.")


if __name__ == "__main__":
    main()
