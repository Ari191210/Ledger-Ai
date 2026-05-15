#!/usr/bin/env python3
"""
Auto-Session Logger — v2
Triggered by git post-commit hook after every commit.

Per commit:
  1. Writes a session note  → LedgerBrain/Sessions/
  2. Updates tool vault     → LedgerBrain/Tools/[CAT]/[slug].md   (if app/tools/[slug] changed)
  3. Updates component vault → LedgerBrain/Components/[name].md   (if components/ changed)
  4. Links session in 00-Index.md
"""

import os, sys, re, subprocess
from pathlib import Path
from datetime import date

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    import anthropic
except ImportError:
    print("[LedgerBrain] anthropic not installed — skipping")
    sys.exit(0)

# ── Paths ──────────────────────────────────────────────────────────────────────
VAULT      = Path(r"C:\Users\DELL\Documents\LedgerBrain")
SESSIONS   = VAULT / "Sessions"
TOOLS_DIR  = VAULT / "Tools"
COMPS_DIR  = VAULT / "Components"
INDEX      = VAULT / "00-Index.md"
LEDGER_DIR = Path(r"C:\Users\DELL\Downloads\design_handoff_ledger\ledger")
ENV_FILE   = LEDGER_DIR / ".env.local"
TODAY      = date.today().isoformat()

# ── Slug → category map (update when tools are added/renamed) ─────────────────
SLUG_TO_CAT: dict[str, str] = {
    # PLAN
    "planner": "PLAN", "focus": "PLAN", "habits": "PLAN",
    "deadlines": "PLAN", "debt-meter": "PLAN", "circadian": "PLAN",
    "circuit-breaker": "PLAN",
    # LEARN
    "notes": "LEARN", "doubt": "LEARN", "syllabus": "LEARN",
    "mindmap": "LEARN", "formula": "LEARN", "lang-analyzer": "LEARN",
    "vocab": "LEARN",
    # WRITE
    "essay-blueprint": "WRITE", "research": "WRITE", "grammar": "WRITE",
    "presentation": "WRITE", "debate": "WRITE", "citation": "WRITE",
    "lab-report": "WRITE", "model-answer": "WRITE",
    # PRACTISE
    "papers": "PRACTISE", "flashcards": "PRACTISE", "exam-planner": "PRACTISE",
    "mark-scheme": "PRACTISE", "practice": "PRACTISE", "crunch": "PRACTISE",
    "dna": "PRACTISE", "predict": "PRACTISE", "memory-palace": "PRACTISE",
    "analogy": "PRACTISE", "exam-strategy": "PRACTISE", "cremator": "PRACTISE",
    "formula-recall": "PRACTISE",
    # FUTURE
    "uni-match": "FUTURE", "admissions": "FUTURE", "resume": "FUTURE",
    "interview": "FUTURE", "gpa-sim": "FUTURE",
    # TRACK
    "marks": "TRACK", "coach": "TRACK", "rooms": "TRACK",
    "peer-heatmap": "TRACK", "compare": "TRACK", "source": "TRACK",
    "case-study": "TRACK", "timeline": "TRACK", "study-guide": "TRACK",
    "concept-connect": "TRACK", "score": "TRACK", "exam-debrief": "TRACK",
}


# ── Helpers ────────────────────────────────────────────────────────────────────
def read_env() -> dict:
    if not ENV_FILE.exists():
        return {}
    env: dict[str, str] = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def git(*args: str) -> str:
    return subprocess.check_output(
        ["git", *args], text=True, cwd=str(LEDGER_DIR),
        encoding="utf-8", errors="replace",
    ).strip()


def get_commit_info() -> tuple[str, str, str]:
    msg   = git("log", "-1", "--format=%s")
    files = git("diff", "HEAD~1..HEAD", "--name-only")
    stat  = git("diff", "HEAD~1..HEAD", "--stat")
    return msg, files, stat


def get_file_diff(filepath: str) -> str:
    try:
        return git("diff", "HEAD~1..HEAD", "--", filepath)[:1600]
    except Exception:
        return ""


def parse_changed_tools(files: str) -> list[str]:
    slugs = []
    for f in files.splitlines():
        m = re.match(r"app/tools/([^/]+)/page\.tsx", f)
        if m and m.group(1) in SLUG_TO_CAT:
            slugs.append(m.group(1))
    return slugs


def parse_changed_components(files: str) -> list[str]:
    names = []
    for f in files.splitlines():
        m = re.match(r"components/(?:ui/)?([^/]+)\.(tsx|ts)$", f)
        if m:
            names.append(m.group(1))
    return names


def sanitize_filename(title: str) -> str:
    safe = re.sub(r'[<>:"/\\|?*\n\r]', "", title).strip()
    return safe[:110] + ".md"


# ── Claude call ────────────────────────────────────────────────────────────────
def generate_all(
    msg: str, files: str, stat: str,
    tool_slugs: list[str], comp_names: list[str],
    api_key: str,
) -> str:
    client = anthropic.Anthropic(api_key=api_key)

    tool_diffs = ""
    for slug in tool_slugs:
        diff = get_file_diff(f"app/tools/{slug}/page.tsx")
        if diff:
            tool_diffs += f"\n--- {slug} ---\n{diff}\n"

    tool_block = ""
    if tool_slugs:
        tool_block = f"""
Changed tool pages: {', '.join(tool_slugs)}

Tool diffs (truncated):
{tool_diffs[:2200]}

For each changed tool, write a one-line changelog entry (past tense, ≤ 100 chars).
"""

    comp_block = f"\nChanged components: {', '.join(comp_names)}" if comp_names else ""

    prompt = f"""You are writing dev-log entries for studyledger.in (a Next.js student OS) into an Obsidian vault.

A git commit was just made.

Commit message: {msg}
Files changed:
{files[:1500]}
Diff stats: {stat[:600]}
{tool_block}{comp_block}

Return your response in EXACTLY this format — keep the === separators on their own lines:

===SESSION===
# [Title]

## What changed
- [bullet]
- [bullet]

## Why
[one sentence]

===TOOLS===
[one TOOL: line per changed tool, or leave blank if no tools changed]
TOOL: slug | one-line changelog entry

Title rules: "Build — X", "Fix — X", or "Refactor — X". Max 80 chars. Be specific.
Bullets: factual, past tense, concise.
Tool entries: past tense, ≤ 100 chars, describe what changed in that specific file."""

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=700,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text.strip()


def parse_response(raw: str) -> tuple[str, dict[str, str]]:
    session_note = ""
    tool_entries: dict[str, str] = {}

    parts = re.split(r"===(\w+)===", raw)
    for i, part in enumerate(parts):
        if part == "SESSION" and i + 1 < len(parts):
            session_note = parts[i + 1].strip()
        elif part == "TOOLS" and i + 1 < len(parts):
            for line in parts[i + 1].strip().splitlines():
                m = re.match(r"TOOL:\s*([^\|]+)\s*\|\s*(.+)", line)
                if m:
                    tool_entries[m.group(1).strip()] = m.group(2).strip()

    return session_note or raw, tool_entries


def extract_title(content: str) -> str:
    for line in content.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return "Session"


# ── Vault writers ──────────────────────────────────────────────────────────────
def update_tool_vault(slug: str, changelog_entry: str) -> None:
    cat = SLUG_TO_CAT.get(slug)
    if not cat:
        return

    cat_dir = TOOLS_DIR / cat
    cat_dir.mkdir(parents=True, exist_ok=True)
    vault_file = cat_dir / f"{slug}.md"

    if vault_file.exists():
        content = vault_file.read_text(encoding="utf-8")

        # Bump last-changed in frontmatter
        content = re.sub(
            r"(last-changed:\s*)\d{4}-\d{2}-\d{2}",
            rf"\g<1>{TODAY}",
            content,
        )

        # Append changelog entry
        entry_line = f"- {TODAY}: {changelog_entry}"
        if "## Changelog" in content:
            content = content.rstrip() + f"\n{entry_line}\n"
        else:
            content = content.rstrip() + f"\n\n## Changelog\n{entry_line}\n"

        vault_file.write_text(content, encoding="utf-8")
        print(f"[LedgerBrain] Tool updated   → Tools/{cat}/{slug}.md")
    else:
        # Create a minimal vault stub
        display_name = " ".join(w.capitalize() for w in slug.replace("-", " ").split())
        content = f"""---
name: {display_name}
slug: {slug}
route: /tools/{slug}
category: {cat}
status: built
ai: true
signature: false
tags:
  - status/built
  - category/{cat.lower()}
  - ai/true
last-changed: {TODAY}
---

## Changelog
- {TODAY}: {changelog_entry}
"""
        vault_file.write_text(content, encoding="utf-8")
        print(f"[LedgerBrain] Tool created   → Tools/{cat}/{slug}.md")


def update_component_vault(name: str) -> None:
    COMPS_DIR.mkdir(parents=True, exist_ok=True)
    vault_file = COMPS_DIR / f"{name}.md"
    entry_line = f"- {TODAY}: component file updated"

    if vault_file.exists():
        content = vault_file.read_text(encoding="utf-8")
        if "## Changelog" in content:
            content = content.rstrip() + f"\n{entry_line}\n"
        else:
            content = content.rstrip() + f"\n\n## Changelog\n{entry_line}\n"
        vault_file.write_text(content, encoding="utf-8")
    else:
        display = " ".join(w.capitalize() for w in re.sub(r"[-_]", " ", name).split())
        vault_file.write_text(
            f"# {display}\n\n## Changelog\n{entry_line}\n",
            encoding="utf-8",
        )
    print(f"[LedgerBrain] Component noted → Components/{name}.md")


def append_to_index(title: str) -> None:
    if not INDEX.exists():
        return
    text = INDEX.read_text(encoding="utf-8")
    if title in text:
        return
    if "## Sessions" in text:
        idx = text.index("## Sessions")
        section_end = text.find("\n\n", idx)
        if section_end == -1:
            section_end = len(text)
        text = text[:section_end] + f" · [[{title}]]" + text[section_end:]
        INDEX.write_text(text, encoding="utf-8")


# ── Entry point ────────────────────────────────────────────────────────────────
def main() -> None:
    try:
        msg, files, stat = get_commit_info()

        if msg.startswith("Merge") or not files.strip():
            return

        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            api_key = read_env().get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            print("[LedgerBrain] ANTHROPIC_API_KEY not found — skipping")
            return

        tool_slugs = parse_changed_tools(files)
        comp_names = parse_changed_components(files)

        SESSIONS.mkdir(parents=True, exist_ok=True)

        raw = generate_all(msg, files, stat, tool_slugs, comp_names, api_key)
        session_note, tool_entries = parse_response(raw)

        # Write session note
        title = extract_title(session_note)
        fname = sanitize_filename(title)
        fpath = SESSIONS / fname
        if fpath.exists():
            fpath = SESSIONS / fname.replace(".md", " (2).md")
        fpath.write_text(session_note, encoding="utf-8")
        print(f"[LedgerBrain] Session logged → Sessions/{fname}")

        # Update tool vault files
        for slug in tool_slugs:
            entry = tool_entries.get(slug, f"page.tsx updated — {msg}")
            update_tool_vault(slug, entry)

        # Note component changes
        for name in comp_names:
            update_component_vault(name)

        append_to_index(title)

    except subprocess.CalledProcessError:
        # HEAD~1 doesn't exist (first commit) — nothing to diff
        pass
    except Exception as e:
        # Never block the commit
        print(f"[LedgerBrain] Hook failed: {e}")


if __name__ == "__main__":
    main()
