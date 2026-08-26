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
    Path("website/src/lib/map/AGENTS.md"),
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
rules = sorted(path for path in (root / ".agent" / "rules").glob("*.md") if path.is_file())
expected_skills = {"export-game-data", "game-defect-reports", "hotrepl-runtime-inspection", "ancient-kingdoms-save-files", "update-game-version"}
expected_rules = {"website-mechanics", "interactive-map", "mod-runtime-special-cases"}
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

skill_names = {path.parent.name for path in skills}
rule_names = {path.stem for path in rules}
surfaces = agents + skills + rules
uri_re = re.compile(r"\b(skill|rule)://([a-z0-9][a-z0-9-]*)")
code_re = re.compile(r"`([^`\n]+)`")
server_ref_re = re.compile(r"server-scripts/([A-Za-z0-9_.-]+\.cs):([A-Za-z_][A-Za-z0-9_.]*|\d+(?:-\d+)?)")
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
print(f"agent-docs check passed: {len(agents)} AGENTS.md, {len(skills)} skills, {len(rules)} rules")
PY
