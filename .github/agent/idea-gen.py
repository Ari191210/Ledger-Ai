#!/usr/bin/env python3
"""
Ledger Idea Engine
Runs daily â€” reads the vault, generates 5+ deeply niche tool ideas,
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

# â”€â”€ Paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
VAULT     = Path(r"C:\Users\DELL\Documents\LedgerBrain")
IDEAS_DIR = VAULT / "Ideas" / "Daily"
SESSIONS  = VAULT / "Sessions"
TOOLS_DIR = VAULT / "Tools"

# â”€â”€ What's already built â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
BUILT = """
PLAN (8): planner, focus-lab, habits, deadlines, exam-planner, debt-meter, circadian, circuit-breaker
LEARN (9): learn-lab (doubt+feynman+notes+mindmap+tutor), syllabus, formula, lang-analyzer, vocab
WRITE (8): writing-tools (essay+grammar), research-suite, presentation, debate, citation, lab-report, model-answer, reference-builder
PRACTISE (18): exam-practice (papers+triage+crunch+markscheme+formula+recall), flashcards, spaced-review,
  exam-sim, practice, dna, predict, memory-palace, analogy, exam-strategy, cremator, formula-recall,
  paper-autopsy, calibration, paper-pattern, marks-obituary, silent-topics
FUTURE (5): admissions, resume, interview, uni-match, gpa-sim
TRACK (14): grade-tracker (marks+score+heatmap+debrief), coach, rooms, compare, source, case-study,
  timeline, study-guide, concept-connect, personalise, silent-topics
GLOBAL UX BUILT: rank-whisper (11:47pm aspirant ticker), empty-chair (re-entry screen),
  floating-timer (popup), time-variant hero (morning/day/evening/late/dead copy),
  last-drop-off (landing page), 8 colour palettes, dark/light mode, glass buttons,
  command palette (Cmd+K), split-view tool mode, parent dashboard (/parent/[code])
FONTS: DM Sans (body), Orbitron (serif/display), Space Mono (mono)
INFRA: Supabase (auth + postgres), Anthropic Claude API, Resend (email), Vercel (deploy), PostHog (analytics)
"""

# â”€â”€ System prompt â€” forces niche thinking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
SYSTEM = """
You are the product intelligence behind Ledger â€” a niche student OS built for 14â€“18 year olds,
primarily Indian students (JEE / NEET / CBSE / IB / ICSE) but also international.

Ledger's design identity: editorial, typographic, Apple-level polish. Think Bloomberg terminal
meets a design magazine. Dark, sophisticated, not childish.

Your job: generate 6 brutally original ideas for Ledger. These can be ANYTHING â€” a new tool,
a UX pattern, a growth strategy, a positioning angle, a notification concept, a social feature,
a business model move, a design system idea, a student psychology insight, a partnership angle,
a landing page section, a community mechanic, an onboarding flow, a monetisation idea, anything.

The only rule: it must be so specific, so unusual, so psychologically precise that nobody else
has thought of it. NOT "add dark mode". NOT "gamification". NOT "leaderboard".
We need ideas where someone reads the name and thinks: "I've never seen this before, but I NEED it."

Every idea must have:
1. A SPECIFIC PSYCHOLOGICAL HOOK â€” the exact emotion, cognitive state, or social dynamic it targets
2. A UNIQUE MECHANISM â€” not just "add X feature", but WHY it works the way it does, what's novel about it
3. A MOMENT OF USE â€” the exact context or trigger (3 days before JEE, just got 64%, parents asking)
4. A NICHE ANGLE â€” why no competitor, no VC-backed startup, no edtech giant has built this
5. ACTIONABILITY â€” concrete enough that it could be built, designed, or shipped in a week

Idea types to rotate through (vary across the 5 ideas each day — pick different types each run):
- TOOL — a new page at /tools/[slug] students use directly
- UX — an interaction pattern, animation, micro-interaction, or flow improvement
- ANIMATION — a specific GSAP animation, page transition, or motion design idea (Ledger uses GSAP)
- THEME — a new colour palette, dark/light variant, seasonal skin, or design system extension
- GROWTH — an acquisition, retention, referral, or viral mechanic
- PRODUCT — a feature, system, or integration (not a standalone tool)
- INSIGHT — a student psychology observation that should drive design decisions
- POSITIONING — a marketing angle, copy direction, landing page section, or audience reframe
- BUSINESS — a monetisation idea, pricing strategy, partnership, or model move
- GOOGLE CLOUD — a feature powered by Google Cloud (Vision API, Speech-to-Text, Firebase, Vertex AI, BigQuery, Document AI, FCM push notifications, Firestore offline sync, Translate API, etc.)
- COMMUNITY — Discord, WhatsApp group mechanics, peer accountability systems, school ambassador programs
- EMAIL — transactional email, drip sequences, the no-body subject-line email, weekly digests
- INFRASTRUCTURE — backend performance, caching, real-time features, Supabase edge functions, CDN
- SCHOOL — B2B school licensing features, teacher dashboards, class management, bulk signup
- CONTENT — blog, SEO plays, student-written content, shareable outputs, viral moments

The ideas should be embarrassingly specific. "Email reminders" is too broad.
"Send a 6-word email at 11 PM the night before a student's logged exam date â€”
subject line only, no body â€” that reads exactly what their future self would say"
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
            if line.startswith("## ") and "Â·" in line:
                # Extract idea name from "## ðŸ”´ Top Pick Â· Name" or "## Idea N Â· Name"
                name = line.split("Â·", 1)[-1].strip()
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
MECHANISM: The specific interaction, system, or mechanic that makes it work â€” not just "AI does X".
DESIGN: What it looks like or how it reads â€” specific visual or copy direction.
{DELIM_PSTART}
Write a complete build brief here. For a TOOL: full Next.js build spec (route, inputs, AI case, UI phases, output schema, localStorage key, CSS vars). For a UX/PRODUCT: detailed implementation notes. For GROWTH/POSITIONING/BUSINESS: the exact copy, mechanic, or decision with rationale. Be concrete enough that someone can execute without asking questions.
{DELIM_PEND}
{DELIM_END}"""

    user_msg = f"""Generate exactly 5 niche ideas for Ledger. Be brutally original. Vary the types â€” do not give 5 tools.

Already built (63 tools â€” DO NOT duplicate):
{BUILT}

Recent builds (themes to avoid):
{recent[:800]}

Past ideas generated (must be completely different from these):
{past_ideas[:500]}

Use EXACTLY this delimiter format for each idea. No JSON. No XML. No markdown. Just the delimiters.

{format_example}

Now generate 6 completely different ideas â€” different types, different angles. Return ONLY the delimited blocks, nothing else."""

    resp = client.messages.create(
        model="claude-sonnet-4-6",
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


# â”€â”€ Formatting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def fmt_idea(idea: dict, rank: int) -> str:
    is_top  = rank == 1
    header  = "## ðŸ”´ Top Pick" if is_top else f"## Idea {rank}"
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

    return f"""{header} Â· {name}

> {tagline}

| | |
|---|---|
| **Type** | {itype} |
{route_row}| **Target** | {moment} |

**Hook:** {hook}

**Why nobody has built this:** {niche}

**The mechanism:** {mech}

**Design / copy direction:** {dn}

### Brief â€” copy and paste this

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

# Ideas Â· {today}

> {len(ideas)} niche concepts Â· Ledger Idea Engine Â· Claude Sonnet
> To build: copy the **Agent Prompt** from any idea and paste it to Claude Code.
> Once built, move this file to `Ideas/Implemented/` and log it in `Ideas/Inbox.md`.

---

{body}
---

*Ledger Idea Engine Â· auto-generated Â· {today}*
"""
    path.write_text(content, encoding="utf-8")
    return path


def update_inbox(ideas: list, today: str) -> None:
    inbox = VAULT / "Ideas" / "Inbox.md"
    inbox.parent.mkdir(parents=True, exist_ok=True)

    lines = [f"\n\n## {today}\n"]
    for i, idea in enumerate(ideas):
        marker = "ðŸ”´" if i == 0 else "â—‹"
        name   = idea.get("name", "?")
        tag    = idea.get("tagline", "")
        itype  = idea.get("type", "")
        lines.append(f"{marker} **[[Daily/{today}|{name}]]** `{itype}` â€” {tag}")

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
            ðŸ”´ = top pick Â· â—‹ = other ideas
            To build any idea: open the daily file, copy the Agent Prompt.

            ---
            {block}
            """)

    inbox.write_text(new, encoding="utf-8")


# â”€â”€ Entry point â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        # Task Scheduler doesn't inherit the bat's env reliably — read .env.local directly
        env_file = Path(__file__).parent.parent.parent / ".env.local"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not found in environment or .env.local")
        sys.exit(1)

    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=None, help="Override date (YYYY-MM-DD)")
    args = parser.parse_args()
    today = args.date if args.date else date.today().isoformat()
    print(f"Ledger Idea Engine Â· {today}")
    print("Reading vault context...")

    client = anthropic.Anthropic(api_key=api_key)

    # Skip if today's file already exists
    if (IDEAS_DIR / f"{today}.md").exists():
        print(f"Ideas for {today} already exist at {IDEAS_DIR / today}.md")
        print("Delete the file and re-run to regenerate.")
        sys.exit(0)

    print("Generating 5 niche ideas with Claude Sonnet...")
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
        print(f"  {ideas[0].get('name','?')} â€” {ideas[0].get('tagline','')}")
    print("\nDone. Open Obsidian to browse ideas.")


if __name__ == "__main__":
    main()

