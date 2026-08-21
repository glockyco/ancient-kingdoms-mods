"""Denormalization functions for the compendium build pipeline.

Denormalizers transform normalized relational data into denormalized JSON
fields optimized for client-side querying. They are organized by target
entity (the table being updated).

Execution order matters - some denormalizers depend on others having run first.
"""

import json
import sqlite3

from rich.console import Console

from compendium.denormalizers import (
    altars,
    exclusions,
    experience,
    items,
    monsters,
    npcs,
    quests,
    recipes,
    search,
    skills,
    zones,
)
from compendium.denormalizers.items import crafting_source_level, source_entries
from compendium.redaction import RedactionConfig, load_redactions
from compendium.redactions import closure, verify

console = Console()


def _apply_quest_exclusions(
    conn: sqlite3.Connection, redactions: RedactionConfig
) -> None:
    """Delete excluded quests and remove references to them."""
    cursor = conn.cursor()

    for quest_id in redactions.exclude_quest_ids:
        cursor.execute("DELETE FROM quests WHERE id = ?", (quest_id,))
        if cursor.rowcount > 0:
            console.print(f"  [dim]Excluded quest: {quest_id}[/dim]")

    # Filter predecessor_ids on remaining quests to remove references to deleted quests
    cursor.execute(
        "SELECT id, predecessor_ids FROM quests WHERE predecessor_ids IS NOT NULL"
    )
    quests_with_predecessors = cursor.fetchall()

    for quest_id, pred_ids_json in quests_with_predecessors:
        if not pred_ids_json:
            continue

        pred_ids = json.loads(pred_ids_json)
        filtered_ids = [
            q_id for q_id in pred_ids if q_id not in redactions.exclude_quest_ids
        ]

        if filtered_ids != pred_ids:
            if filtered_ids:
                cursor.execute(
                    "UPDATE quests SET predecessor_ids = ? WHERE id = ?",
                    (json.dumps(filtered_ids), quest_id),
                )
            else:
                cursor.execute(
                    "UPDATE quests SET predecessor_ids = NULL WHERE id = ?",
                    (quest_id,),
                )

    conn.commit()


def _apply_crafting_exclusions(
    conn: sqlite3.Connection, redactions: RedactionConfig
) -> None:
    """Delete crafting/alchemy recipes for items with hidden crafting."""
    cursor = conn.cursor()

    for item_id in redactions.hide_crafting_item_ids:
        cursor.execute(
            "DELETE FROM crafting_recipes WHERE result_item_id = ?", (item_id,)
        )
        if cursor.rowcount > 0:
            console.print(f"  [dim]Excluded crafting recipe for: {item_id}[/dim]")

        cursor.execute(
            "DELETE FROM alchemy_recipes WHERE result_item_id = ?", (item_id,)
        )
        if cursor.rowcount > 0:
            console.print(f"  [dim]Excluded alchemy recipe for: {item_id}[/dim]")

    conn.commit()


def run_before_closure(
    conn: sqlite3.Connection,
) -> tuple[RedactionConfig, dict[str, int]]:
    """Run every step the unreleased-zone closure depends on.

    `redactions check` recomputes the removal decisions without writing a
    database, and it needs this state to reach the same answer as a build.

    Args:
        conn: Database connection with all base data loaded

    Returns:
        The redaction configuration, and the count of geometry values cleared
        for each zone under position suppression.
    """
    redactions = load_redactions()

    # Apply exclusions before any denormalizer reads the data
    if redactions.exclude_quest_ids:
        _apply_quest_exclusions(conn, redactions)
    if redactions.hide_crafting_item_ids:
        _apply_crafting_exclusions(conn, redactions)

    # Remove geometry for zones in which the game withholds it from the player
    suppressed = exclusions.run(conn, redactions)

    # Enrich altar waves with monster boss/elite info (before altar data is read)
    altars.run_waves(conn)

    # Monster drops (expand altar variants before item sources read drops)
    monsters.run_drops(conn)

    # Monster spawn inference (before levels and items so altar/placeholder
    # spawns exist for level range calculation and item zone association)
    monsters.run_spawns(conn)

    return redactions, suppressed


def run_all(conn: sqlite3.Connection) -> verify.Subject:
    """Run all denormalizations in dependency order.

    Args:
        conn: Database connection with all base data loaded

    Returns:
        What the verification must not find in the published database.
    """
    redactions, _ = run_before_closure(conn)

    # Unreleased-zone exclusion runs here for two reasons. The spawn set must be
    # complete, because a monster is reachable where it spawns and inference adds
    # the altar and placeholder spawns above. Item sources are not denormalized
    # yet, so nothing has copied a reference to removed content into another
    # table. Running it earlier judges reachability on a partial spawn set, and
    # running it later leaves those copies behind.
    # Read the numeric key of every zone before the closure deletes rows. A
    # removed zone cannot be looked up afterwards, and the verification needs
    # the number to check the columns written in the numeric zone space.
    zone_numbers = {
        row[0]: row[1] for row in conn.execute("SELECT id, zone_id FROM zones")
    }
    removals = closure.run(conn, redactions)

    # Monster level ranges (from spawns, needed before item sources)
    monsters.run_levels(conn)

    # Quest display_type (needed before item usages reads it)
    quests.run_display_type(conn)

    # Recipe materials enrichment (add item_name before consumers read materials)
    recipes.run_materials(conn)

    # Item denormalizations (reads monster drops for item_sources_monster)
    items.run_all(conn, redactions)

    # Skill denormalizations
    skills.run_all(conn)

    # Experience calculations (pre-compute EXP values)
    experience.run_all(conn)

    # NPC denormalizations (quest/item/skill names, quests_completed_here, role bitmasks)
    npcs.run_all(conn)

    # Zone bounds (computed from all entity positions for map rendering)
    zones.run_all(conn)

    # Crafting source levels (needs item sources + zone medians)
    crafting_source_level.run(conn)

    # Canonical item source summaries (needs recipe source levels)
    source_entries.run(conn)

    # Quest denormalizations (tooltips)
    quests.run_tooltips(conn)

    # Search keywords for FTS5 indexing
    search.run_all(conn)

    return verify.Subject(
        identifiers={removal.entity_id for removal in removals},
        zone_numbers={
            zone_numbers[removal.entity_id]
            for removal in removals
            if removal.table == "zones" and removal.entity_id in zone_numbers
        },
        allowances=redactions.allowances,
    )
