"""Verify the published class and race pairing against the decompiled snapshot."""

from __future__ import annotations

import json

from rich.console import Console

from compendium.class_races import (
    PairingUnreadableError,
    compare,
    read_pairing_from,
)
from compendium.config import get_repo_root

console = Console()

SNAPSHOT_DIR = "server-scripts"
CURATED_FILE = "exported-data/classes.json"


def run(config) -> int:
    """Compare `compatible_races` in the curated class file against the game.

    Returns a process exit code. The check needs the decompiled snapshot, which is a
    local artifact, so a missing snapshot is an error rather than a pass.
    """
    repo_root = get_repo_root()
    snapshot_root = repo_root / SNAPSHOT_DIR
    curated_path = repo_root / CURATED_FILE

    if not curated_path.is_file():
        console.print(f"[red]ERROR[/red] {CURATED_FILE} does not exist")
        return 1

    try:
        pairing = read_pairing_from(snapshot_root)
    except PairingUnreadableError as error:
        console.print(f"[red]ERROR[/red] {error}")
        console.print(
            "  The check reads the character creator, so it needs a decompiled snapshot."
        )
        return 1

    with curated_path.open("r", encoding="utf-8") as handle:
        entries = json.load(handle)
    published = {
        entry["name"]: list(entry.get("compatible_races", []))
        for entry in entries
        if "name" in entry
    }

    problems = compare(published, pairing)
    if problems:
        console.print(
            f"[red]{len(problems)} class(es) disagree with the game[/red] "
            f"({CURATED_FILE})"
        )
        for problem in problems:
            console.print(f"  {problem}")
        console.print()
        console.print("  The game's own rule, one line per class:")
        for name, races in pairing.races_by_class.items():
            console.print(f"    {name}: {', '.join(races)}")
        return 1

    console.print(
        f"[green]OK[/green] {len(published)} classes agree with the character creator"
    )
    return 0
