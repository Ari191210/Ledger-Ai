#!/usr/bin/env python3
"""
Auto-Session Logger
Triggered by the git post-commit hook after every commit.
Reads the commit diff, calls Claude to generate a descriptive session note,
writes it to LedgerBrain/Sessions/ and links it in 00-Index.md.
"""

import os, sys, re, subprocess
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("[LedgerBrain] anthropic not installed — skipping session log")
    sys.exit(0)

VAULT      = Path(r"C:\Users\DELL\Documents\LedgerBrain")
SESSIONS   = VAULT / "Sessions"
INDEX      = VAULT / "00-Index.md"
LEDGER_DIR = Path(r"C:\Users\DELL\Downloads\design_handoff_ledger\ledger")
ENV_FILE   = LEDGER_DIR / ".env.local"


def read_env() -> dict:
    if not ENV_FILE.exists():
        return {}
    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def git(*args) -> str:
    return subprocess.check_output(
        ["git"] + list(args), text=True, cwd=str(LEDGER_DIR)
    ).strip()


def get_commit_info():
    msg   = git("log", "-1", "--format=%s")
    files = git("diff", "HEAD~1..HEAD", "--name-only")
    stat  = git("diff", "HEAD~1..HEAD", "--stat")
    return msg, files, stat


def sanitize_filename(title: str) -> str:
    safe = re.sub(r'[<>:"/\\|?*\n\r]', "", title).strip()
    return safe[:110] + ".md"


def generate_note(msg: str, files: str, stat: str, api_key: str) -> str:
    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""You are writing a dev-log session note for studyledger.in (a Next.js student OS) into an Obsidian vault.

A git commit was just made. Generate a concise session note.

Commit message: {msg}

Files changed:
{files[:2000]}

Diff stats:
{stat[:800]}

Return ONLY the note content — no preamble, no code fences:

# [Title]

## What changed
- [bullet]
- [bullet]

## Why
[one sentence]

Title rules:
- Format: "Build — [Feature Name]" or "Fix — [What was fixed]" or "Refactor — [What changed]"
- Specific: "Build — Silent Topic Finder" not "Build — New Tool"
- Max 80 chars total

Body rules:
- Bullets: factual, past tense, short
- Why: one sentence, the motivation
- Only add "## Patterns observed" if there is a genuinely reusable insight
- No fluff"""

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return resp.content[0].text.strip()


def extract_title(content: str) -> str:
    first = content.splitlines()[0]
    return first.replace("# ", "").strip()


def append_to_index(title: str) -> None:
    if not INDEX.exists():
        return
    text = INDEX.read_text(encoding="utf-8")
    if title in text:
        return
    # Append link to the Sessions line in 00-Index.md
    if "## Sessions" in text:
        idx = text.index("## Sessions")
        # Find the end of the sessions line (first blank line after)
        section_end = text.find("\n\n", idx)
        if section_end == -1:
            section_end = len(text)
        new_link = f" · [[{title}]]"
        text = text[:section_end] + new_link + text[section_end:]
        INDEX.write_text(text, encoding="utf-8")


def main():
    try:
        msg, files, stat = get_commit_info()

        # Skip merge commits and trivial/empty diffs
        if msg.startswith("Merge") or not files.strip():
            return

        # Get API key — env var first, then .env.local
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            api_key = read_env().get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            print("[LedgerBrain] ANTHROPIC_API_KEY not found — skipping session log")
            return

        SESSIONS.mkdir(parents=True, exist_ok=True)

        content = generate_note(msg, files, stat, api_key)
        title   = extract_title(content)
        fname   = sanitize_filename(title)
        fpath   = SESSIONS / fname

        # Don't overwrite an existing note
        if fpath.exists():
            base  = fname.replace(".md", "")
            fpath = SESSIONS / f"{base} (2).md"

        fpath.write_text(content, encoding="utf-8")
        append_to_index(title)
        print(f"[LedgerBrain] Session logged → Sessions/{fname}")

    except subprocess.CalledProcessError:
        # HEAD~1 doesn't exist (first commit) — nothing to diff
        pass
    except Exception as e:
        # Never block the commit
        print(f"[LedgerBrain] Session log failed: {e}")


if __name__ == "__main__":
    main()
