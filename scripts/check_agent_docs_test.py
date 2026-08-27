#!/usr/bin/env python3
"""Prove each agent-docs check catches the violation it exists to catch.

Run with `python3 scripts/check_agent_docs_test.py`.

Every case builds a throwaway instruction surface in a temporary directory, so no case can damage the
repository. An earlier harness mutated real files and reverted them with `git checkout`, which twice
destroyed uncommitted work, and it matched violations by message text, so renaming a message made the
proof pass while proving nothing.

A case asserts that a fragment of the expected message is present or absent. Other violations from the
fixture, such as its missing registrations, are ignored: each case owns one claim.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

# A one-shot script gains nothing from a bytecode cache, and writing one would leave an untracked
# directory beside two files.
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from check_agent_docs import check

RULE_FRONTMATTER = """---
description: Use this fixture rule when editing a fixture path.
globs:
  - "mods/**"
---
"""

TRIGGER_FRONTMATTER = """---
description: Use this fixture rule when the output matches.
condition: "\\\\bfixture\\\\b"
scope: "tool"
interruptMode: "never"
---
"""


def build(files: dict[str, str]) -> Path:
    """Write a fixture surface and return its root."""
    root = Path(tempfile.mkdtemp(prefix="agent-docs-fixture-"))
    (root / "AGENTS.md").write_text("# Fixture\n\nA fixture root.\n")
    (root / "server-scripts").mkdir()
    (root / "server-scripts" / "Combat.cs").write_text(
        "public float blockChance\n{\n    return 0.0001f;\n}\n"
    )
    (root / "mods").mkdir()
    (root / "mods" / "Real.cs").write_text("var scale = 0.5f;\n")
    for name, text in files.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
    return root


def violations(files: dict[str, str]) -> list[str]:
    errors, _ = check(build(files))
    return errors


CASES: list[tuple[str, str, bool, dict[str, str]]] = [
    # --- a stated value needs an authority, in its own section ---
    (
        "a value with no authority anywhere",
        "value with no authority in its section",
        True,
        {".agent/rules/probe.md": RULE_FRONTMATTER + "# Probe\n\n## Why\n\nScale by `0.0001` each.\n"},
    ),
    (
        "a value whose authority sits in another section",
        "value with no authority in its section",
        True,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nScale by `0.0001` each.\n\n## Use\n\nRead `mods/Real.cs`.\n"
        },
    ),
    (
        "a value with its authority in the same section",
        "value with no authority in its section",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nScale by `0.5` as `mods/Real.cs` does.\n"
        },
    ),
    (
        "a formula of identifiers, which carries no number",
        "value with no authority in its section",
        True,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nTime is `NetworkTime.time + offsetNetworkTime`.\n"
        },
    ),
    (
        "a number in prose, which records a past measurement",
        "value with no authority in its section",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nIt was wrong by a factor of 2.6 for a month.\n"
        },
    ),
    (
        "a SQL star, which is not multiplication",
        "value with no authority in its section",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nRun `SELECT * FROM monsters` first.\n"
        },
    ),
    (
        "an array subscript, which is an index",
        "value with no authority in its section",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nRead `rows.fetchone()[0]` once.\n"
        },
    ),
    # --- a pointer must actually contain the value ---
    (
        "a number absent from the file cited beside it",
        "value absent from the file cited beside it",
        True,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nScale by `0.31337`, in `mods/Real.cs`.\n"
        },
    ),
    (
        "a number the cited file does contain",
        "value absent from the file cited beside it",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nScale by `0.5`, in `mods/Real.cs`.\n"
        },
    ),
    (
        "a value answered by a server-script symbol that holds it",
        "value absent from the file cited beside it",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n## Why\n\nThe term is `0.0001`, in `server-scripts/Combat.cs:blockChance`.\n"
        },
    ),
    # --- prose limits, which the repository's own policy states ---
    (
        "a semicolon in a paragraph",
        "semicolon in prose",
        True,
        {".agent/rules/probe.md": RULE_FRONTMATTER + "# Probe\n\nThe read worked; the value was wrong.\n"},
    ),
    (
        "a semicolon in a bullet",
        "semicolon in prose",
        True,
        {".agent/rules/probe.md": RULE_FRONTMATTER + "# Probe\n\n- The read worked; the value was wrong.\n"},
    ),
    (
        "a semicolon inside inline code",
        "semicolon in prose",
        False,
        {".agent/rules/probe.md": RULE_FRONTMATTER + "# Probe\n\nRun `PRAGMA quick_check;` first.\n"},
    ),
    (
        "a semicolon inside a fence",
        "semicolon in prose",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n```sh\necho one; echo two\n```\n"
        },
    ),
    (
        "a sentence over the limit",
        "sentence over 25 words",
        True,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\nThis sentence exists only to pass the limit by a margin that leaves no room at "
            "all for any doubt about whether the check counts words.\n"
        },
    ),
    (
        "two sentences where the first ends in a code span",
        "sentence over 25 words",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\nEvery later job is refused with `Maximum concurrent command jobs reached.` The "
            "failure looks like a broken endpoint rather than a broken command here.\n"
        },
    ),
    (
        "a long table row, which is protected text",
        "sentence over 25 words",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\n| a cell long enough to pass the limit if a table row were ever read as prose "
            "by this check, which it is not |\n| --- |\n"
        },
    ),
    # --- rule shape ---
    (
        "a rule gated by both globs and a condition",
        "rule carries both globs and a trigger condition",
        True,
        {
            ".agent/rules/probe.md": '---\ndescription: Use it when editing.\ncondition: "\\\\bfoo\\\\b"\n'
            'globs:\n  - "mods/**"\n---\n# Probe\n\nA directive.\n\n## Incident\n\nIt happened once.\n'
        },
    ),
    (
        "a triggered rule with no incident",
        "triggered rule without an incident",
        True,
        {".agent/rules/probe.md": TRIGGER_FRONTMATTER + "# Probe\n\nA directive with no incident.\n"},
    ),
    (
        "a condition that matches anything with no path gate",
        "rule matches anything and names no gate",
        True,
        {
            ".agent/rules/probe.md": '---\ndescription: Use it when writing.\ncondition: ".*"\n'
            'scope: "tool"\ninterruptMode: "never"\n---\n# Probe\n\nA directive.\n\n## Incident\n\nOnce.\n'
        },
    ),
    (
        "a condition that matches anything behind a path gate",
        "rule matches anything and names no gate",
        False,
        {
            ".agent/rules/probe.md": '---\ndescription: Use it when writing.\ncondition: ".*"\n'
            'scope: "tool:write(mods/**)"\ninterruptMode: "never"\n---\n# Probe\n\nA directive.\n\n'
            "## Incident\n\nOnce.\n"
        },
    ),
    # --- delivery and citation ---
    (
        "a constraint in a context file that does not load",
        "constraint in a context file that does not load",
        True,
        {"mods/AGENTS.md": "# Mods\n\nDo not deploy while the game runs.\n"},
    ),
    (
        "a retired provider file",
        "retired context file",
        True,
        {"CLAUDE.md": "# Retired\n"},
    ),
    (
        "a citation naming a symbol that is absent",
        "missing server-script symbol",
        True,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\nRead `server-scripts/Combat.cs:noSuchSymbol` first.\n"
        },
    ),
    (
        "a citation naming a symbol that exists",
        "missing server-script symbol",
        False,
        {
            ".agent/rules/probe.md": RULE_FRONTMATTER
            + "# Probe\n\nRead `server-scripts/Combat.cs:blockChance` first.\n"
        },
    ),
    (
        "a reference over 100 lines with no contents list",
        "long reference without a contents list",
        True,
        {
            ".agent/skills/probe/SKILL.md": "---\nname: probe\ndescription: Use it when probing.\n---\n# Probe\n",
            ".agent/skills/probe/references/long.md": "# Long\n" + "\nA line.\n" * 60,
        },
    ),
    (
        "an oversized skill body",
        "oversized SKILL.md",
        True,
        {
            ".agent/skills/probe/SKILL.md": "---\nname: probe\ndescription: Use it when probing.\n---\n"
            + "# Probe\n" * 210,
        },
    ),
]


def run() -> int:
    failures: list[str] = []
    for label, fragment, expected, files in CASES:
        found = any(fragment in error for error in violations(files))
        ok = found is expected
        verdict = ("CAUGHT" if found else "MISSED") if expected else ("FALSE+" if found else "SILENT")
        print(f"{verdict}   {label}")
        if not ok:
            failures.append(f"{label}: expected {'a' if expected else 'no'} '{fragment}' violation")

    print()
    print(f"{len(CASES) - len(failures)} correct, {len(failures)} wrong")
    for failure in failures:
        print(f"  {failure}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(run())
