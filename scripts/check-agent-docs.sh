#!/usr/bin/env bash
set -euo pipefail

python3 - "$(cd "$(dirname "$0")/.." && pwd)" "$@" <<'PY'
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
errors: list[str] = []
excluded = {".git", "node_modules", ".direnv"}


def included(path: Path) -> bool:
    rel = path.relative_to(root)
    return not any(part in excluded for part in rel.parts) and rel.parts[:3] != ("docs", "plans", "archive")


def walk() -> list[tuple[Path, list[str], list[str]]]:
    entries: list[tuple[Path, list[str], list[str]]] = []
    for directory, dirs, names in os.walk(root):
        current = Path(directory)
        dirs[:] = [name for name in dirs if name not in excluded and not (current == root / "docs" / "plans" and name == "archive")]
        entries.append((current, dirs.copy(), names))
    return entries

walk_entries = walk()

def files_named(name: str) -> list[Path]:
    return [directory / name for directory, _, names in walk_entries if name in names]

for path in files_named("CLAUDE.md"):
    errors.append(f"retired context file: {path.relative_to(root)}")
for directory, dirs, _ in walk_entries:
    if ".claude" in dirs:
        errors.append(f"retired provider directory: {(directory / '.claude').relative_to(root)}")

agents = files_named("AGENTS.md")
expected_agents = {
    Path("AGENTS.md"),
    Path("mods/AGENTS.md"),
    Path("build-pipeline/AGENTS.md"),
    Path("website/AGENTS.md"),
}
actual_agents = {path.relative_to(root) for path in agents}
for missing in sorted(expected_agents - actual_agents):
    errors.append(f"missing AGENTS.md registration: {missing}")
for unexpected in sorted(actual_agents - expected_agents):
    errors.append(f"unexpected AGENTS.md registration: {unexpected}")
for path in agents:
    count = len(path.read_text(encoding="utf-8").splitlines())
    if count >= 200:
        errors.append(f"oversized AGENTS.md: {path.relative_to(root)} ({count} lines; limit is 199)")

skills = sorted(path for path in (root / ".agent" / "skills").glob("*/SKILL.md") if path.is_file())
references = sorted(path for path in (root / ".agent" / "skills").glob("*/references/*.md") if path.is_file())
rules = sorted(path for path in (root / ".agent" / "rules").glob("*.md") if path.is_file())

# A skill body stays in context for the rest of a session once it loads, so detail belongs in a
# reference file, which loads only when a task needs it. Reference files carry no limit.
for path in skills:
    count = len(path.read_text(encoding="utf-8").splitlines())
    if count >= 200:
        errors.append(f"oversized SKILL.md: {path.relative_to(root)} ({count} lines; limit is 199)")
expected_skills = {"export-game-data", "game-defect-reports", "hotrepl-runtime-inspection", "ancient-kingdoms-save-files", "update-game-version"}
expected_rules = {
    "website-mechanics",
    "interactive-map",
    "mod-runtime-special-cases",
    "absence-needs-a-count",
    "generated-artifacts",
    "instruction-placement",
    "build-is-not-runtime-proof",
    "game-measurement-round-trips",
    "let-the-engine-drive",
    "mods-runtime",
    "monster-curve-columns",
    "pipeline-invariants",
    "website-boundaries",
}
actual_skills = {path.parent.name for path in skills}
actual_rules = {path.stem for path in rules}
for missing in sorted(expected_skills - actual_skills):
    errors.append(f"missing skill registration: {missing}")
for unexpected in sorted(actual_skills - expected_skills):
    errors.append(f"unexpected skill registration: {unexpected}")
for missing in sorted(expected_rules - actual_rules):
    errors.append(f"missing rule registration: {missing}")
for unexpected in sorted(actual_rules - expected_rules):
    errors.append(f"unexpected rule registration: {unexpected}")

def frontmatter(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        errors.append(f"missing frontmatter: {path.relative_to(root)}")
        return {}, text
    raw, body = text[4:].split("\n---\n", 1)
    values: dict[str, str] = {}
    for line in raw.splitlines():
        match = re.match(r"^([a-z][a-z-]*):\s*(.*)$", line)
        if match:
            values[match.group(1)] = match.group(2).strip().strip('"\'')
    return values, body

trigger_words = re.compile(r"\b(use|when|while|before|after|editing|adding|changing|inspecting|updating|repairing|working)\b", re.I)
for path in skills:
    values, _ = frontmatter(path)
    for key in ("name", "description"):
        if not values.get(key):
            errors.append(f"skill missing {key}: {path.relative_to(root)}")
    if values.get("name") and values["name"] != path.parent.name:
        errors.append(f"skill name/path mismatch: {path.relative_to(root)}")
    if values.get("description") and not trigger_words.search(values["description"]):
        errors.append(f"skill description has no usage trigger: {path.relative_to(root)}")
for path in rules:
    values, _ = frontmatter(path)
    if not values.get("description"):
        errors.append(f"rule missing description: {path.relative_to(root)}")
    elif not trigger_words.search(values["description"]):
        errors.append(f"rule description has no usage trigger: {path.relative_to(root)}")

def raw_frontmatter(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        return ""
    return text[4:].split("\n---\n", 1)[0]


def body_of(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        return text
    return text[4:].split("\n---\n", 1)[1]


# The description is the only text the runtime uses to select a skill, and it is capped.
for path in skills:
    values, _ = frontmatter(path)
    description = values.get("description", "")
    if len(description) > 1024:
        errors.append(f"oversized skill description: {path.relative_to(root)} ({len(description)} characters; limit is 1024)")

# A reader who opens a long reference part way must be able to see its scope.
for path in references:
    lines = path.read_text(encoding="utf-8").splitlines()
    if len(lines) > 100 and not any(line.strip() == "## Contents" for line in lines[:30]):
        errors.append(f"long reference without a contents list: {path.relative_to(root)} ({len(lines)} lines)")

# Only a context file at or above the repository root has its content injected, so a constraint in a
# deeper one never reaches the agent. Command guidance under Verification is allowed to stay.
prohibition = re.compile(r"\b(do not|don't|never|must not|shall not)\b", re.I)
for path in agents:
    rel = path.relative_to(root)
    if rel == Path("AGENTS.md"):
        continue
    section = ""
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if line.startswith("## "):
            section = line[3:].strip()
        if section == "Verification":
            continue
        if prohibition.search(line):
            errors.append(f"constraint in a context file that does not load: {rel}:{number} (move it to a rule with globs)")

for path in rules:
    raw = raw_frontmatter(path)
    triggered = bool(re.search(r"^\s*(condition|astCondition):", raw, re.M))
    path_scoped = bool(re.search(r"^\s*globs:", raw, re.M))
    body = body_of(path)
    # A rule about a mistake nobody has made is a guess, and a guess is not evidence that it fires.
    if triggered and "## Incident" not in body:
        errors.append(f"triggered rule without an incident: {path.relative_to(root)} (state the failure that motivated it)")
    # A trigger rule carrying globs is gated on a matching file path, so a trigger that names no file
    # never fires.
    if triggered and path_scoped:
        errors.append(f"rule carries both globs and a trigger condition: {path.relative_to(root)} (the path gate suppresses the trigger)")
    # A condition that matches anything is not a trigger, so something else has to be the gate. A
    # path-qualified scope is one; nothing is not, and a rule with neither fires on every tool call.
    vacuous = re.search(r'^\s*condition:\s*["\']?\.\*["\']?\s*$', raw, re.M)
    if vacuous and not re.search(r"^\s*scope:.*\(.+\)", raw, re.M):
        errors.append(f"rule matches anything and names no gate: {path.relative_to(root)} (qualify the scope with paths, or write a real condition)")

# Research reports are destroyed by a structured channel unless the agent writes them to a file.
agent_defs = sorted(path for path in (root / ".omp" / "agents").glob("*.md") if path.is_file())
expected_agent_defs = {"repo-researcher"}
actual_agent_defs = {path.stem for path in agent_defs}
for missing in sorted(expected_agent_defs - actual_agent_defs):
    errors.append(f"missing task agent registration: .omp/agents/{missing}.md")
for unexpected in sorted(actual_agent_defs - expected_agent_defs):
    errors.append(f"unexpected task agent registration: {unexpected}")
for path in agent_defs:
    values, _ = frontmatter(path)
    for key in ("name", "description"):
        if not values.get(key):
            errors.append(f"task agent missing {key}: {path.relative_to(root)}")
    if values.get("name") and values["name"] != path.stem:
        errors.append(f"task agent name/path mismatch: {path.relative_to(root)}")

skill_names = {path.parent.name for path in skills}
rule_names = {path.stem for path in rules}
surfaces = agents + skills + references + rules
uri_re = re.compile(r"\b(skill|rule)://([a-z0-9][a-z0-9-]*)")
code_re = re.compile(r"`([^`\n]+)`")
server_ref_re = re.compile(r"server-scripts/((?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+\.cs):([A-Za-z_][A-Za-z0-9_.]*|\d+(?:-\d+)?)")
path_prefixes = (".agent/", "build-pipeline/", "docs/", "mods/", "openspec/", "scripts/", "tests/", "website/", "README.md", "AGENTS.md", "lefthook.yml", "citations.lock.json", "redactions.lock.json", "config.toml")
generated_outputs = {
    "website/data",
    "website/data/compendium.db",
    "website/static/images",
    "website/static/tiles",
}
generated_output_owner = root / "build-pipeline" / "src" / "compendium" / "commands" / "build.py"
if generated_outputs and not generated_output_owner.is_file():
    errors.append(f"missing generated-output owner: {generated_output_owner.relative_to(root)}")

# A value copied out of the game rots silently: nothing hashes a number written in an instruction file,
# while a pointer is resolved below and survives a change to the thing it names. So a rule that states
# arithmetic has to name the file it came from. Only code is scanned, because a number in prose records
# a past measurement, which cannot rot. Subscripts and the integers 0, 1 and 2 are indices and arities
# far more often than they are game values.
fence_re = re.compile(r"```[a-z]*\n(.*?)```", re.S)
numeric_re = re.compile(r"(?<![A-Za-z0-9_.\[])\d+(?:\.\d+)?f?(?![A-Za-z0-9_.]|\])")
# A formula of identifiers carries no number and escapes the scan above, so arithmetic is matched too.
# The operator must be spaced, which a path separator never is.
formula_re = re.compile(r"[A-Za-z0-9_.)\]]\s[-+*/]\s[A-Za-z0-9_.(\[]")
authority_prefixes = ("mods/", "website/", "build-pipeline/", "scripts/", "tests/")
for path in rules:
    body = body_of(path)
    code = " ".join(fence_re.findall(body)) + " " + " ".join(code_re.findall(fence_re.sub(" ", body)))
    stated = sorted({value for value in numeric_re.findall(code) if value not in {"0", "1", "2"}})
    # A query is not an arithmetic claim about the game, and `SELECT *` reads as multiplication.
    spans = [
        span
        for span in fence_re.findall(body) + code_re.findall(fence_re.sub(" ", body))
        if not re.search(r"(?i)\b(select|from|where)\b", span)
    ]
    stated += sorted({span.strip() for span in spans if formula_re.search(span)})
    if not stated:
        continue
    # Another instruction file is not an authority: it is the same unchecked prose one step away.
    owners = [
        token.rstrip("/.,:;")
        for token in code_re.findall(body)
        if token.startswith(authority_prefixes) and (root / token.split(":", 1)[0]).is_file()
    ]
    if not owners and not server_ref_re.search(body):
        errors.append(
            f"rule states a value with no authority: {path.relative_to(root)} "
            f"({', '.join(stated[:6])}; name the file that owns it or drop the value)"
        )

for path in surfaces:
    text = path.read_text(encoding="utf-8")
    rel = path.relative_to(root)
    for kind, name in uri_re.findall(text):
        names = skill_names if kind == "skill" else rule_names
        if name not in names and name not in {"commit-policy", "simplified-technical-english"}:
            errors.append(f"unknown {kind} reference in {rel}: {name}")
    for token in code_re.findall(text):
        candidate = token.rstrip("/.,:;")
        if any(ch in candidate for ch in "*{}<>|$") or " " in candidate or candidate.startswith(("http://", "https://")):
            continue
        if candidate.startswith(path_prefixes):
            base = root / candidate.split(":", 1)[0]
            if candidate not in generated_outputs and not base.exists() and not base.is_symlink():
                errors.append(f"missing path in {rel}: {candidate}")
    for file_name, selector in server_ref_re.findall(text):
        source = root / "server-scripts" / file_name
        if not source.exists():
            errors.append(f"missing server-script citation in {rel}: {file_name}:{selector}")
            continue
        source_text = source.read_text(encoding="utf-8", errors="replace")
        if selector[0].isdigit():
            start, _, end = selector.partition("-")
            line_count = len(source_text.splitlines())
            if int(start) < 1 or int(end or start) > line_count:
                errors.append(f"out-of-range server-script citation in {rel}: {file_name}:{selector} ({line_count} lines)")
        elif selector not in source_text:
            errors.append(f"missing server-script symbol in {rel}: {file_name}:{selector}")

if errors:
    print("agent-docs check failed:", file=sys.stderr)
    for error in sorted(set(errors)):
        print(f"- {error}", file=sys.stderr)
    raise SystemExit(1)
print(f"agent-docs check passed: {len(agents)} AGENTS.md, {len(skills)} skills, {len(references)} skill references, {len(rules)} rules")
PY
