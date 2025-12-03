"""Denormalization functions for the compendium build pipeline.

Denormalizers transform normalized relational data into denormalized JSON
fields optimized for client-side querying. They are organized by target
entity (the table being updated).

Execution order matters - some denormalizers depend on others having run first.
"""

import json
import sqlite3

from rich.console import Console

from compendium.denormalizers import experience, items, monsters, npcs, quests, skills
from compendium.redaction import RedactionConfig, load_redactions

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


def _apply_ignore_journal_exclusions(conn: sqlite3.Connection) -> None:
    """Delete items with ignore_journal=true and clean up references."""
    cursor = conn.cursor()

    # Get IDs of items to exclude
    cursor.execute("SELECT id FROM items WHERE ignore_journal = 1")
    excluded_ids = {row[0] for row in cursor.fetchall()}

    if not excluded_ids:
        return

    # Delete the items
    cursor.execute("DELETE FROM items WHERE ignore_journal = 1")
    console.print(
        f"  [dim]Excluded {cursor.rowcount} items with ignore_journal=true[/dim]"
    )

    # Filter monster drops JSON to remove references to deleted items
    cursor.execute("SELECT id, drops FROM monsters WHERE drops IS NOT NULL")
    monsters_with_drops = cursor.fetchall()

    drops_updated = 0
    for monster_id, drops_json in monsters_with_drops:
        if not drops_json:
            continue
        drops = json.loads(drops_json)
        filtered_drops = [d for d in drops if d.get("item_id") not in excluded_ids]
        if len(filtered_drops) != len(drops):
            cursor.execute(
                "UPDATE monsters SET drops = ? WHERE id = ?",
                (json.dumps(filtered_drops) if filtered_drops else None, monster_id),
            )
            drops_updated += 1

    if drops_updated > 0:
        console.print(f"  [dim]Updated drops on {drops_updated} monsters[/dim]")

    # Delete crafting recipes where result item is excluded
    placeholders = ",".join("?" * len(excluded_ids))
    cursor.execute(
        f"DELETE FROM crafting_recipes WHERE result_item_id IN ({placeholders})",
        tuple(excluded_ids),
    )
    if cursor.rowcount > 0:
        console.print(
            f"  [dim]Excluded {cursor.rowcount} crafting recipes for ignore_journal items[/dim]"
        )

    # Delete alchemy recipes where result item is excluded
    cursor.execute(
        f"DELETE FROM alchemy_recipes WHERE result_item_id IN ({placeholders})",
        tuple(excluded_ids),
    )
    if cursor.rowcount > 0:
        console.print(
            f"  [dim]Excluded {cursor.rowcount} alchemy recipes for ignore_journal items[/dim]"
        )

    conn.commit()


def run_all(conn: sqlite3.Connection) -> None:
    """Run all denormalizations in dependency order.

    Args:
        conn: Database connection with all base data loaded
    """
    # Load redaction config
    redactions = load_redactions()

    # Apply exclusions before any denormalizer reads the data
    if redactions.exclude_quest_ids:
        _apply_quest_exclusions(conn, redactions)
    if redactions.hide_crafting_item_ids:
        _apply_crafting_exclusions(conn, redactions)
    if redactions.exclude_ignore_journal:
        _apply_ignore_journal_exclusions(conn)

    # Phase 1: Monster drops (expand altar variants before item sources read drops)
    monsters.run_drops(conn)

    # Phase 1b: Monster level ranges (from spawns, needed before dropped_by)
    monsters.run_levels(conn)

    # Phase 2: Quest display_type (needed before item usages reads it)
    quests.run_display_type(conn)

    # Phase 3: Item denormalizations (reads monster drops for dropped_by)
    items.run_all(conn, redactions)

    # Phase 4: Skill denormalizations
    skills.run_all(conn)

    # Phase 5: Monster spawn inference
    monsters.run_spawns(conn)

    # Phase 6: Experience calculations (pre-compute EXP values)
    experience.run_all(conn)

    # Phase 7: NPC denormalizations (quest/item/skill names, quests_completed_here)
    npcs.run_all(conn)

    # Phase 8: Quest denormalizations (tooltips - display_type already done in Phase 2)
    quests.run_tooltips(conn)
