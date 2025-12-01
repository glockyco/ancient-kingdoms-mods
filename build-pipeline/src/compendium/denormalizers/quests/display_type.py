"""Denormalize quest display_type based on quest_type and objective flags.

The game has base quest types (kill, gather, gather_inventory, location, equip_item, alchemy)
but the UI should show more specific types based on the objectives:
- gather: "Gather" (progress tracked externally, items never removed)
- gather_inventory + remove_items_on_complete: "Deliver" (items consumed)
- gather_inventory + !remove_items_on_complete: "Have" (keep items)
- location + is_find_npc_quest: "Find" (talk to NPC)
- location + !is_find_npc_quest: "Discover" (enter area)
- kill: "Kill"
- equip_item: "Equip"
- alchemy: "Brew"
"""

import sqlite3

from rich.console import Console

console = Console()


def run(conn: sqlite3.Connection) -> None:
    """Compute and store display_type for all quests."""
    console.print("Denormalizing quest display types...")
    cursor = conn.cursor()

    # Get all quests with fields needed to determine display type
    cursor.execute("""
        SELECT id, quest_type, remove_items_on_complete, is_find_npc_quest
        FROM quests
    """)
    quests = cursor.fetchall()

    updated = 0
    for quest_id, quest_type, remove_items, is_find_npc in quests:
        display_type = _compute_display_type(quest_type, remove_items, is_find_npc)

        cursor.execute(
            "UPDATE quests SET display_type = ? WHERE id = ?",
            (display_type, quest_id),
        )
        updated += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Updated {updated} quests with display_type")


def _compute_display_type(
    quest_type: str, remove_items_on_complete: bool, is_find_npc_quest: bool
) -> str:
    """Compute the display type based on quest_type and flags."""
    if quest_type == "kill":
        return "Kill"
    elif quest_type == "gather":
        return "Gather"
    elif quest_type == "gather_inventory":
        if remove_items_on_complete:
            return "Deliver"
        return "Have"
    elif quest_type == "location":
        if is_find_npc_quest:
            return "Find"
        return "Discover"
    elif quest_type == "equip_item":
        return "Equip"
    elif quest_type == "alchemy":
        return "Brew"
    else:
        return quest_type.replace("_", " ").title()
