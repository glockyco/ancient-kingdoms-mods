"""Verify the published class and race pairing against the decompiled snapshot."""

from __future__ import annotations

import json

from rich.console import Console

from compendium.class_races import (
    PairingUnreadableError,
    compare,
    read_pairing_from,
)
from compendium.config import get_curated_dir, get_repo_root

console = Console()

SNAPSHOT_DIR = "server-scripts"


def run(config) -> int:
    """Compare curated `compatible_races` against the decompiled character creator."""
    repo_root = get_repo_root()
    snapshot_root = repo_root / SNAPSHOT_DIR
    curated_path = get_curated_dir(repo_root) / "classes.json"

    if not curated_path.is_file():
        console.print(f"[red]ERROR[/red] {curated_path} does not exist")
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
            f"({curated_path})"
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
