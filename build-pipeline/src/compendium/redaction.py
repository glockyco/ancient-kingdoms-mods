"""Redaction configuration loading and application."""

import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from rich.console import Console

console = Console()


@dataclass
class RedactionConfig:
    """Redaction rules loaded from redactions.toml.

    Two zone mechanisms act independently, and a zone is subject only to the
    mechanisms that name it:

    - ``suppress_position_zone_ids`` keeps every entity of the zone and removes
      its geometry, for a released zone in which the game itself withholds
      positional information from the player.
    - ``exclude_zone_ids`` removes the zone and everything related to it, for a
      zone that has not shipped.

    ``exclude_entity_ids`` names unreleased content that holds no reference edge
    at all, which no rule over the data can select.
    """

    hide_crafting_item_ids: set[str] = field(default_factory=set)
    exclude_quest_ids: set[str] = field(default_factory=set)
    suppress_position_zone_ids: set[str] = field(default_factory=set)
    exclude_zone_ids: set[str] = field(default_factory=set)
    exclude_entity_ids: set[str] = field(default_factory=set)


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

    zones = data.get("zones", {})
    config = RedactionConfig(
        hide_crafting_item_ids=set(
            data.get("items", {}).get("hide_crafting", {}).get("ids", [])
        ),
        exclude_quest_ids=set(data.get("quests", {}).get("exclude", {}).get("ids", [])),
        suppress_position_zone_ids=set(
            zones.get("suppress_positions", {}).get("zone_ids", [])
        ),
        exclude_zone_ids=set(zones.get("exclude_unreleased", {}).get("zone_ids", [])),
        exclude_entity_ids=set(
            data.get("entities", {}).get("exclude", {}).get("ids", [])
        ),
    )

    if config.hide_crafting_item_ids:
        console.print(
            f"  Hiding crafting for {len(config.hide_crafting_item_ids)} items"
        )
    if config.exclude_quest_ids:
        console.print(f"  Excluding {len(config.exclude_quest_ids)} quests")
    if config.suppress_position_zone_ids:
        console.print(
            "  Suppressing positions in "
            f"{len(config.suppress_position_zone_ids)} zones: "
            + ", ".join(sorted(config.suppress_position_zone_ids))
        )
    if config.exclude_zone_ids:
        console.print(
            f"  Excluding {len(config.exclude_zone_ids)} unreleased zones: "
            + ", ".join(sorted(config.exclude_zone_ids))
        )
    if config.exclude_entity_ids:
        console.print(
            f"  Excluding {len(config.exclude_entity_ids)} named entities: "
            + ", ".join(sorted(config.exclude_entity_ids))
        )

    return config
