"""Redaction configuration loading and application."""

import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from rich.console import Console

console = Console()


@dataclass
class RedactionConfig:
    """Redaction rules loaded from redactions.toml."""

    hide_crafting_item_ids: set[str] = field(default_factory=set)
    exclude_quest_ids: set[str] = field(default_factory=set)


def load_redactions(config_path: Path | None = None) -> RedactionConfig:
    """Load redaction rules from redactions.toml.

    Returns empty config if file doesn't exist (no redactions applied).
    """
    if config_path is None:
        config_path = Path(__file__).parent.parent.parent.parent / "redactions.toml"

    if not config_path.exists():
        console.print("  [dim]No redactions.toml found, skipping redactions[/dim]")
        return RedactionConfig()

    with open(config_path, "rb") as f:
        data = tomllib.load(f)

    config = RedactionConfig(
        hide_crafting_item_ids=set(
            data.get("items", {}).get("hide_crafting", {}).get("ids", [])
        ),
        exclude_quest_ids=set(data.get("quests", {}).get("exclude", {}).get("ids", [])),
    )

    if config.hide_crafting_item_ids:
        console.print(
            f"  Hiding crafting for {len(config.hide_crafting_item_ids)} items"
        )
    if config.exclude_quest_ids:
        console.print(f"  Excluding {len(config.exclude_quest_ids)} quests")

    return config
