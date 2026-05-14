#!/usr/bin/env python3
"""
Ledger Idea Engine
Runs daily — reads the vault, generates 5+ deeply niche tool ideas,
formats each one as a complete copy-paste agent prompt, writes to Obsidian.
"""

import os, sys, json, textwrap
from datetime import date
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("anthropic not installed. Run: pip install anthropic")
    sys.exit(1)

# ── Paths ────────────────────────────────────────────────────────────────────
VAULT     = Path(r"C:\Users\DELL\Documents\LedgerBrain")
IDEAS_DIR = VAULT / "Ideas" / "Daily"
SESSIONS  = VAULT / "Sessions"
TOOLS_DIR = VAULT / "Tools"

# ── What's already built ─────────────────────────────────────────────────────
BUILT = """
PLAN (8): planner, focus, habits, deadlines, exam-planner, debt-meter, circadian, circuit-breaker
LEARN (9): notes, doubt, tutor, syllabus, mindmap, concept-web, formula, lang-analyzer, vocab
WRITE (12): assignment, essay-grader, personal-statement, essay-blueprint, research, presentation,
  debate, citation, lab-report, argument, grammar, model-answer
PRACTISE (15): papers, flashcards, spaced-review, exam-sim, mark-scheme, paper-dissector, practice,
  crunch, dna, predict, memory-palace, analogy, exam-strategy, cremator, formula-recall
FUTURE (7): career, admissions, resume, interview, subject-picker, uni-match, gpa-sim
TRACK (13): marks, coach, rooms, peer-heatmap, compare, source, case-study, timeline, reading,
  study-guide, concept-connect, score, exam-debrief
"""

# ── System prompt — forces niche thinking ────────────────────────────────────
SYSTEM = """
You are the product intelligence behind Ledger — a niche student OS built for 14–18 year olds,
primarily Indian students (JEE / NEET / CBSE / IB / ICSE) but also international.

Ledger's design identity: editorial, typographic, Apple-level polish. Think Bloomberg terminal
meets a design magazine. Dark, sophisticated, not childish.

Your job: generate 5 brutally original ideas for Ledger. These can be ANYTHING — a new tool,
a UX pattern, a growth strategy, a positioning angle, a notification concept, a social feature,
a business model move, a design system idea, a student psychology insight, a partnership angle,
a landing page section, a community mechanic, an onboarding flow, a monetisation idea, anything.

The only rule: it must be so specific, so unusual, so psychologically precise that nobody else
has thought of it. NOT "add dark mode". NOT "gamification". NOT "leaderboard".
We need ideas where someone reads the name and thinks: "I've never seen this before, but I NEED it."

Every idea must have:
1. A SPECIFIC PSYCHOLOGICAL HOOK — the exact emotion, cognitive state, or social dynamic it targets
2. A UNIQUE MECHANISM — not just "add X feature", but WHY it works the way it does, what's novel about it
3. A MOMENT OF USE — the exact context or trigger (3 days before JEE, just got 64%, parents asking)
4. A NICHE ANGLE — why no competitor, no VC-backed startup, no edtech giant has built this
5. ACTIONABILITY — concrete enough that it could be built, designed, or shipped in a week

Idea types to rotate through (vary across the 5 ideas each day):
- TOOL — a new page at /tools/[slug] students use directly
- UX — an interaction pattern, animation, or flow improvement
- GROWTH — an acquisition, retention, or referral mechanic
- PRODUCT — a feature, system, or integration (not a standalone tool)
- INSIGHT — a student psychology observation that should drive design decisions
- POSITIONING — a marketing angle, copy direction, or audience reframe
- BUSINESS — a monetisation idea, partnership, or model move

The ideas should be embarrassingly specific. "Email reminders" is too broad.
"Send a 6-word email at 11 PM the night before a student's logged exam date —
subject line only, no body — that reads exactly what their future self would say"
is the level of specificity we want.
""".strip()


def read_recent_sessions(n: int = 4) -> str:
    if not SESSIONS.exists():
        return "No sessions yet."
    files = sorted(SESSIONS.glob("*.md"), key=lambda f: f.stat().st_mtime, reverse=True)[:n]
    snippets = []
    for f in files:
        text = f.read_text(encoding="utf-8", errors="ignore")[:600]
        snippets.append(f"**{f.stem}**\n{text}")
    return "\n\n---\n\n".join(snippets) if snippets else "No sessions yet."


def read_past_ideas(n: int = 7) -> str:
    if not IDEAS_DIR.exists():
        return "None yet."
    files = sorted(IDEAS_DIR.glob("*.md"), reverse=True)[:n]
    titles = []
    for f in files:
        text = f.read_text(encoding="utf-8", errors="ignore")
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("## ") and "·" in line:
                # Extract idea name from "## 🔴 Top Pick · Name" or "## Idea N · Name"
                name = line.split("·", 1)[-1].strip()
                titles.append(name)
    return "\n".join(f"- {t}" for t in titles) if titles else "None yet."


DELIM_IDEA  = "===IDEA==="
DELIM_END   = "===END==="
DELIM_PSTART= "===PROMPT==="
DELIM_PEND  = "===PROMPT_END==="


def parse_field(block: str, key: str) -> str:
    """Extract 'KEY: value' from a block of lines."""
    for line in block.splitlines():
        if line.startswith(key + ":"):
            return line[len(key)+1:].strip()
    return ""


def parse_delimited(raw: str) -> list:
    ideas = []
    chunks = raw.split(DELIM_IDEA)
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk or DELIM_END not in chunk:
            continue
        chunk = chunk.split(DELIM_END)[0].strip()

        # Split agent_prompt from metadata
        if DELIM_PSTART in chunk and DELIM_PEND in chunk:
            meta_part   = chunk.split(DELIM_PSTART)[0]
            prompt_part = chunk.split(DELIM_PSTART)[1].split(DELIM_PEND)[0].strip()
        else:
            meta_part   = chunk
            prompt_part = ""

        ideas.append({
            "name":               parse_field(meta_part, "NAME"),
            "type":               parse_field(meta_part, "TYPE") or parse_field(meta_part, "CATEGORY"),
            "slug":               parse_field(meta_part, "SLUG"),
            "tagline":            parse_field(meta_part, "TAGLINE"),
            "target_moment":      parse_field(meta_part, "TARGET"),
            "psychological_hook": parse_field(meta_part, "HOOK"),
            "why_niche":          parse_field(meta_part, "NICHE"),
            "mechanism":          parse_field(meta_part, "MECHANISM"),
            "design_note":        parse_field(meta_part, "DESIGN"),
            "agent_prompt":       prompt_part,
        })

    return ideas


def generate_ideas(client) -> list:
    recent     = read_recent_sessions()
    past_ideas = read_past_ideas()

    format_example = f"""{DELIM_IDEA}
NAME: The Idea Name
TYPE: TOOL | UX | GROWTH | PRODUCT | INSIGHT | POSITIONING | BUSINESS
SLUG: idea-slug
TAGLINE: One sentence so specific it could only apply to Ledger.
TARGET: The exact person, exact moment, exact emotional state this hits.
HOOK: The psychological or social dynamic this exploits or solves.
NICHE: Why no edtech company, VC startup, or existing product has done this.
MECHANISM: The specific interaction, system, or mechanic that makes it work — not just "AI does X".
DESIGN: What it looks like or how it reads — specific visual or copy direction.
{DELIM_PSTART}
Write a complete build brief here. For a TOOL: full Next.js build spec (route, inputs, AI case, UI phases, output schema, localStorage key, CSS vars). For a UX/PRODUCT: detailed implementation notes. For GROWTH/POSITIONING/BUSINESS: the exact copy, mechanic, or decision with rationale. Be concrete enough that someone can execute without asking questions.
{DELIM_PEND}
{DELIM_END}"""

    user_msg = f"""Generate exactly 5 niche ideas for Ledger. Be brutally original. Vary the types — do not give 5 tools.

Already built (63 tools — DO NOT duplicate):
{BUILT}

Recent builds (themes to avoid):
{recent[:800]}

Past ideas generated (must be completely different from these):
{past_ideas[:500]}

Use EXACTLY this delimiter format for each idea. No JSON. No XML. No markdown. Just the delimiters.

{format_example}

Now generate 5 completely different ideas — different types, different angles. Return ONLY the delimited blocks, nothing else."""

    resp = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=7000,
        system=SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw   = resp.content[0].text.strip()
    ideas = parse_delimited(raw)

    if not ideas:
        # Save raw for debugging
        debug = Path("idea-gen-debug.txt")
        debug.write_text(raw, encoding="utf-8")
        raise ValueError(f"No ideas parsed. Raw output saved to {debug}")

    return ideas


# ── Formatting ────────────────────────────────────────────────────────────────

def fmt_idea(idea: dict, rank: int) -> str:
    is_top  = rank == 1
    header  = "## 🔴 Top Pick" if is_top else f"## Idea {rank}"
    name    = idea.get("name", "Unnamed")
    tagline = idea.get("tagline", "")
    moment  = idea.get("target_moment", "")
    hook    = idea.get("psychological_hook", "")
    niche   = idea.get("why_niche", "")
    mech    = idea.get("mechanism", "")
    itype   = idea.get("type", "TOOL")
    slug    = idea.get("slug", "")
    prompt  = idea.get("agent_prompt", "")
    dn      = idea.get("design_note", "")

    route_row = f"| **Route** | `/tools/{slug}` |\n" if slug else ""

    return f"""{header} · {name}

> {tagline}

| | |
|---|---|
| **Type** | {itype} |
{route_row}| **Target** | {moment} |

**Hook:** {hook}

**Why nobody has built this:** {niche}

**The mechanism:** {mech}

**Design / copy direction:** {dn}

### Brief — copy and paste this

```
{prompt}
```

---
"""


def write_daily(ideas: list, today: str) -> Path:
    IDEAS_DIR.mkdir(parents=True, exist_ok=True)
    path = IDEAS_DIR / f"{today}.md"

    body = "\n".join(fmt_idea(idea, i + 1) for i, idea in enumerate(ideas))

    content = f"""---
date: {today}
count: {len(ideas)}
status: fresh
---

# Ideas · {today}

> {len(ideas)} niche concepts · Ledger Idea Engine · Claude Opus
> To build: copy the **Agent Prompt** from any idea and paste it to Claude Code.
> Once built, move this file to `Ideas/Implemented/` and log it in `Ideas/Inbox.md`.

---

{body}
---

*Ledger Idea Engine · auto-generated · {today}*
"""
    path.write_text(content, encoding="utf-8")
    return path


def update_inbox(ideas: list, today: str) -> None:
    inbox = VAULT / "Ideas" / "Inbox.md"
    inbox.parent.mkdir(parents=True, exist_ok=True)

    lines = [f"\n\n## {today}\n"]
    for i, idea in enumerate(ideas):
        marker = "🔴" if i == 0 else "○"
        name   = idea.get("name", "?")
        tag    = idea.get("tagline", "")
        itype  = idea.get("type", "")
        lines.append(f"{marker} **[[Daily/{today}|{name}]]** `{itype}` — {tag}")

    block = "\n".join(lines)

    if inbox.exists():
        existing = inbox.read_text(encoding="utf-8")
        if "---\n" in existing:
            head, rest = existing.split("---\n", 1)
            new = head + "---\n" + block.lstrip("\n") + "\n\n" + rest
        else:
            new = existing + block
    else:
        new = textwrap.dedent(f"""\
            # Idea Inbox

            All daily ideas, most recent first.
            🔴 = top pick · ○ = other ideas
            To build any idea: open the daily file, copy the Agent Prompt.

            ---
            {block}
            """)

    inbox.write_text(new, encoding="utf-8")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set.")
        print("Set it in idea-gen.bat or in System Environment Variables.")
        sys.exit(1)

    today = date.today().isoformat()
    print(f"Ledger Idea Engine · {today}")
    print("Reading vault context...")

    client = anthropic.Anthropic(api_key=api_key)

    # Skip if today's file already exists
    if (IDEAS_DIR / f"{today}.md").exists():
        print(f"Ideas for {today} already exist at {IDEAS_DIR / today}.md")
        print("Delete the file and re-run to regenerate.")
        sys.exit(0)

    print("Generating 5 niche ideas with Claude Opus...")
    try:
        ideas = generate_ideas(client)
    except Exception as e:
        print(f"ERROR generating ideas: {e}")
        sys.exit(1)

    print(f"Generated {len(ideas)} ideas")

    path = write_daily(ideas, today)
    update_inbox(ideas, today)

    print(f"\nSaved  -> {path}")
    print(f"Inbox  -> {VAULT / 'Ideas' / 'Inbox.md'}")
    print(f"\nTop pick today:")
    if ideas:
        print(f"  {ideas[0].get('name','?')} — {ideas[0].get('tagline','')}")
    print("\nDone. Open Obsidian to browse ideas.")


if __name__ == "__main__":
    main()
