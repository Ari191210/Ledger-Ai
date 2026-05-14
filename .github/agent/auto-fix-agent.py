#!/usr/bin/env python3
"""
Ledger Auto-Fix Agent
Runs nightly via Task Scheduler.

1. Fetches new errors from Supabase error_logs table
2. Deduplicates by (route, message) — one fix per unique bug
3. Maps route → source file, reads it
4. Calls Claude to analyze and generate a fix
5. If high confidence + safe: applies fix, runs TypeScript check, commits
6. Writes full analysis to LedgerBrain/Bugs/Analysis/YYYY-MM-DD.md
7. Marks processed error IDs in .bugs-processed.json
"""

import os, sys, json, re, subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests not installed. Run: pip install requests")
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("anthropic not installed. Run: pip install anthropic")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
VAULT      = Path(r"C:\Users\DELL\Documents\LedgerBrain")
BUGS_DIR   = VAULT / "Bugs"
ANALYSIS   = BUGS_DIR / "Analysis"
PROCESSED  = BUGS_DIR / ".bugs-processed.json"
LEDGER_DIR = Path(r"C:\Users\DELL\Downloads\design_handoff_ledger\ledger")
APP_DIR    = LEDGER_DIR / "app"
ENV_FILE   = LEDGER_DIR / ".env.local"
LOG_FILE   = LEDGER_DIR / ".github" / "agent" / "auto-fix.log"

# Error types that are safe for auto-fix (low blast radius)
SAFE_TYPES = {"js_error", "unhandled_rejection", "react_crash", "blank_screen"}

# Routes that are off-limits for auto-fix (too sensitive)
PROTECTED_ROUTES = {"/api/errors", "/auth", "/admin", "/api/ai"}


def log(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


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


def load_processed() -> set:
    if PROCESSED.exists():
        try:
            return set(json.loads(PROCESSED.read_text(encoding="utf-8")))
        except Exception:
            return set()
    return set()


def save_processed(ids: set) -> None:
    BUGS_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED.write_text(json.dumps(sorted(ids), indent=2), encoding="utf-8")


def fetch_errors(url: str, key: str) -> list:
    """Fetch errors from the last 24 hours."""
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime(
        "%Y-%m-%dT%H:%M:%S+00:00"
    )
    endpoint = f"{url}/rest/v1/error_logs"
    headers  = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    params = {
        "select": "*",
        "created_at": f"gte.{since}",
        "order": "created_at.desc",
        "limit": "200",
    }
    r = requests.get(endpoint, params=params, headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


def route_to_file(route: str) -> Path | None:
    """Map a URL route to its source file in the Next.js app."""
    route = route.split("?")[0].rstrip("/") or "/"

    if route.startswith("/tools/"):
        slug = route.replace("/tools/", "").split("/")[0]
        if slug:
            p = APP_DIR / "tools" / slug / "page.tsx"
            return p if p.exists() else None

    if route == "/dashboard":
        return APP_DIR / "dashboard" / "page.tsx"

    if route.startswith("/dashboard/"):
        sub = route.replace("/dashboard/", "").split("/")[0]
        p = APP_DIR / "dashboard" / sub / "page.tsx"
        return p if p.exists() else None

    if route.startswith("/api/"):
        parts = route.replace("/api/", "").split("/")
        p = APP_DIR / "api" / "/".join(parts) / "route.ts"
        return p if p.exists() else None

    mapping = {
        "/":        APP_DIR / "page.tsx",
        "/auth":    APP_DIR / "auth" / "page.tsx",
        "/onboard": APP_DIR / "onboard" / "page.tsx",
        "/admin":   APP_DIR / "admin" / "page.tsx",
    }
    return mapping.get(route)


def read_source(filepath: Path) -> str:
    try:
        content = filepath.read_text(encoding="utf-8")
        # Truncate very large files — send first 300 lines
        lines = content.splitlines()
        if len(lines) > 300:
            content = "\n".join(lines[:300]) + f"\n\n... ({len(lines) - 300} more lines truncated)"
        return content
    except Exception:
        return ""


def analyze_with_claude(error: dict, source: str, api_key: str) -> dict:
    """Call Claude to analyze the error. Returns structured dict."""
    client = anthropic.Anthropic(api_key=api_key)

    error_type = error.get("type", "unknown")
    route      = error.get("route") or error.get("url", "unknown")
    message    = error.get("message", "no message")
    stack      = (error.get("stack") or "")[:2000]
    context    = json.dumps(error.get("context") or {})

    source_section = f"""Source file ({route_to_file_name(route)}):
```tsx
{source[:3000]}
```""" if source else "Source file: not found / not mappable"

    prompt = f"""You are a Next.js bug analyst for studyledger.in (a React 18 + Next.js 14 student OS).

A production error was captured. Analyze it and return a JSON object.

ERROR:
- Type: {error_type}
- Route: {route}
- Message: {message}
- Stack trace:
```
{stack}
```
- Context: {context}

{source_section}

Return this JSON (and only this JSON — no markdown, no explanation):
{{
  "root_cause": "one clear sentence",
  "confidence": "high | medium | low",
  "safe_to_auto_fix": true | false,
  "reasoning": "why this confidence and safety rating",
  "fix": {{
    "old_code": "exact string to find in the file (must be unique enough to locate)",
    "new_code": "replacement string",
    "explanation": "what this changes and why it fixes the error"
  }}
}}

Rules:
- Include "fix" ONLY if confidence=high AND safe_to_auto_fix=true
- safe_to_auto_fix=false if: fix involves auth logic, payment code, database schema, env vars, or you are not certain
- safe_to_auto_fix=false for blank_screen errors unless you can clearly see the rendering bug
- old_code must be a substring that exists exactly once in the source — include enough surrounding context
- If you cannot find the fix with high confidence, omit the "fix" key entirely"""

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = resp.content[0].text.strip()

    # Strip markdown code fences if Claude wrapped it
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*",     "", raw)
    raw = re.sub(r"\s*```$",     "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"root_cause": raw[:200], "confidence": "low", "safe_to_auto_fix": False}


def route_to_file_name(route: str) -> str:
    f = route_to_file(route)
    return str(f.relative_to(LEDGER_DIR)) if f else "unknown"


def apply_fix(filepath: Path, old_code: str, new_code: str) -> bool:
    """Apply the fix to the file. Returns True if the replacement was made."""
    content = filepath.read_text(encoding="utf-8")
    if old_code not in content:
        log(f"  Fix not applied: old_code not found in {filepath.name}")
        return False
    if content.count(old_code) > 1:
        log(f"  Fix not applied: old_code appears {content.count(old_code)}x — ambiguous")
        return False
    new_content = content.replace(old_code, new_code, 1)
    filepath.write_text(new_content, encoding="utf-8")
    return True


def typescript_check() -> bool:
    """Run tsc --noEmit. Returns True if no errors."""
    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit"],
            cwd=str(LEDGER_DIR),
            capture_output=True,
            text=True,
            timeout=60,
        )
        return result.returncode == 0
    except Exception as e:
        log(f"  TypeScript check failed to run: {e}")
        return False


def revert_file(filepath: Path, original: str) -> None:
    filepath.write_text(original, encoding="utf-8")


def git_commit(route: str, explanation: str) -> str:
    """Commit the fix. Returns the short commit hash."""
    short_route = route.replace("/tools/", "").replace("/", "-")[:30]
    msg = f"fix(auto): {explanation[:60]} on {short_route}"
    subprocess.run(
        ["git", "add", "-A"],
        cwd=str(LEDGER_DIR), check=True, capture_output=True
    )
    subprocess.run(
        ["git", "commit", "-m", msg, "--no-verify"],
        cwd=str(LEDGER_DIR), check=True, capture_output=True
    )
    sha = subprocess.check_output(
        ["git", "log", "-1", "--format=%h"],
        cwd=str(LEDGER_DIR), text=True
    ).strip()
    return sha


def write_analysis_report(today: str, results: list) -> None:
    """Write today's fix agent report to LedgerBrain/Bugs/Analysis/."""
    ANALYSIS.mkdir(parents=True, exist_ok=True)
    path = ANALYSIS / f"{today}.md"

    fixed        = [r for r in results if r["status"] == "auto-fixed"]
    needs_review = [r for r in results if r["status"] == "needs-review"]
    skipped      = [r for r in results if r["status"] == "skipped"]

    lines = [
        f"---",
        f"date: {today}",
        f"errors_analyzed: {len(results)}",
        f"auto_fixed: {len(fixed)}",
        f"needs_review: {len(needs_review)}",
        f"skipped: {len(skipped)}",
        f"---",
        f"",
        f"# Fix Agent Report · {today}",
        f"",
    ]

    if fixed:
        lines += ["## Auto-fixed", ""]
        for r in fixed:
            lines += [
                f"### [{r['type'].upper()}] {r['route']}",
                f"**Root cause:** {r['root_cause']}",
                f"**Fix:** {r.get('fix_explanation', '')}",
                f"**Commit:** `{r.get('commit', '')}`",
                "",
                "---",
                "",
            ]

    if needs_review:
        lines += ["## Needs Human Review", ""]
        for r in needs_review:
            lines += [
                f"### [{r['type'].upper()}] {r['route']}",
                f"**Root cause:** {r['root_cause']}",
                f"**Confidence:** {r['confidence']}",
                f"**Reasoning:** {r.get('reasoning', '')}",
                "",
                "---",
                "",
            ]

    if skipped:
        lines += ["## Skipped (protected route or no source file)", ""]
        for r in skipped:
            lines += [f"- `{r['route']}` — {r.get('reason', '')}"]
        lines.append("")

    content = "\n".join(lines)

    if path.exists():
        existing = path.read_text(encoding="utf-8")
        path.write_text(existing.rstrip() + "\n\n---\n\n" + content, encoding="utf-8")
    else:
        path.write_text(content, encoding="utf-8")

    log(f"Analysis written → Bugs/Analysis/{today}.md")


def main():
    log("=== Ledger Auto-Fix Agent starting ===")

    env = read_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip() or env.get("ANTHROPIC_API_KEY", "").strip()

    if not sb_url or not sb_key:
        log("ERROR: Supabase credentials not found in .env.local")
        sys.exit(1)
    if not api_key:
        log("ERROR: ANTHROPIC_API_KEY not found")
        sys.exit(1)

    # Load already-processed error IDs
    processed = load_processed()

    # Fetch recent errors
    log("Fetching errors from Supabase (last 24h)…")
    try:
        all_errors = fetch_errors(sb_url, sb_key)
    except Exception as e:
        log(f"ERROR fetching errors: {e}")
        sys.exit(1)

    # Filter already-processed
    new_errors = [e for e in all_errors if str(e.get("id", "")) not in processed]
    log(f"Found {len(all_errors)} total, {len(new_errors)} new errors")

    if not new_errors:
        log("Nothing to analyze. Done.")
        return

    # Deduplicate by (route, message) — fix each unique bug once
    seen: dict[tuple, dict] = {}
    for e in new_errors:
        key = (e.get("route") or "", (e.get("message") or "")[:100])
        if key not in seen:
            seen[key] = e

    unique_errors = list(seen.values())
    log(f"Analyzing {len(unique_errors)} unique error(s)…")

    today   = datetime.now().strftime("%Y-%m-%d")
    results = []

    for error in unique_errors:
        route = error.get("route") or error.get("url", "unknown")
        etype = error.get("type", "unknown")
        msg   = error.get("message", "no message")[:80]
        eid   = str(error.get("id", ""))

        log(f"  [{etype}] {route} — {msg}")

        # Skip protected routes
        if any(route.startswith(p) for p in PROTECTED_ROUTES):
            log(f"  Skipped (protected route)")
            results.append({"route": route, "type": etype, "status": "skipped",
                            "reason": "protected route"})
            processed.add(eid)
            continue

        # Map route to source file
        source_file = route_to_file(route)
        if not source_file:
            log(f"  Skipped (no source file found for route)")
            results.append({"route": route, "type": etype, "status": "skipped",
                            "reason": "source file not found"})
            processed.add(eid)
            continue

        source = read_source(source_file)

        # Analyze with Claude
        try:
            analysis = analyze_with_claude(error, source, api_key)
        except Exception as e:
            log(f"  Claude analysis failed: {e}")
            processed.add(eid)
            continue

        root_cause = analysis.get("root_cause", "unknown")
        confidence = analysis.get("confidence", "low")
        safe       = analysis.get("safe_to_auto_fix", False)
        reasoning  = analysis.get("reasoning", "")
        fix        = analysis.get("fix")

        log(f"  Root cause: {root_cause}")
        log(f"  Confidence: {confidence} | Safe to fix: {safe}")

        # Attempt auto-fix
        if confidence == "high" and safe and fix:
            old_code = fix.get("old_code", "")
            new_code = fix.get("new_code", "")
            expl     = fix.get("explanation", "")

            if old_code and new_code and old_code != new_code:
                original_content = source_file.read_text(encoding="utf-8")
                applied = apply_fix(source_file, old_code, new_code)

                if applied:
                    log(f"  Fix applied — running TypeScript check…")
                    if typescript_check():
                        try:
                            sha = git_commit(route, expl)
                            log(f"  Committed: {sha}")
                            results.append({
                                "route": route, "type": etype,
                                "status": "auto-fixed",
                                "root_cause": root_cause,
                                "fix_explanation": expl,
                                "commit": sha,
                                "confidence": confidence,
                            })
                        except Exception as e:
                            log(f"  Git commit failed: {e} — reverting")
                            revert_file(source_file, original_content)
                            results.append({
                                "route": route, "type": etype,
                                "status": "needs-review",
                                "root_cause": root_cause,
                                "confidence": confidence,
                                "reasoning": f"Fix applied but git commit failed: {e}",
                            })
                    else:
                        log(f"  TypeScript check failed — reverting fix")
                        revert_file(source_file, original_content)
                        results.append({
                            "route": route, "type": etype,
                            "status": "needs-review",
                            "root_cause": root_cause,
                            "confidence": confidence,
                            "reasoning": "Fix was applied but caused TypeScript errors — reverted. Human review needed.",
                        })
                else:
                    results.append({
                        "route": route, "type": etype,
                        "status": "needs-review",
                        "root_cause": root_cause,
                        "confidence": confidence,
                        "reasoning": "old_code not found uniquely in source — manual fix needed",
                    })
            else:
                results.append({
                    "route": route, "type": etype,
                    "status": "needs-review",
                    "root_cause": root_cause,
                    "confidence": confidence,
                    "reasoning": reasoning,
                })
        else:
            results.append({
                "route": route, "type": etype,
                "status": "needs-review",
                "root_cause": root_cause,
                "confidence": confidence,
                "reasoning": reasoning,
            })

        processed.add(eid)

    # Mark all new errors as processed (even ones we skipped)
    for e in new_errors:
        processed.add(str(e.get("id", "")))

    save_processed(processed)

    if results:
        write_analysis_report(today, results)

    fixed_count  = len([r for r in results if r["status"] == "auto-fixed"])
    review_count = len([r for r in results if r["status"] == "needs-review"])
    log(f"=== Done: {fixed_count} auto-fixed, {review_count} needs review ===")


if __name__ == "__main__":
    main()
