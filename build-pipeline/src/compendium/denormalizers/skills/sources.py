"""Skill source denormalizations - where skills come from.

This module handles denormalizations that populate source fields on skills:
- granted_by_items: Which items grant this skill (potions, food, scrolls, etc.)
"""

import json
import sqlite3

from rich.console import Console

from compendium.types.denormalized import GrantedByItemInfo

console = Console()


def _denormalize_granted_by_items(
    conn: sqlite3.Connection,
) -> dict[str, list[GrantedByItemInfo]]:
    """Build granted_by_items from items that grant skills.

    Returns:
        Dict mapping skill_id to list of item sources
    """
    console.print("  Processing items that grant skills...")
    cursor = conn.cursor()

    granted_by_items: dict[str, list[GrantedByItemInfo]] = {}

    # Potion buffs
    cursor.execute("""
        SELECT id, name, potion_buff_id, potion_buff_level
        FROM items
        WHERE potion_buff_id IS NOT NULL
    """)
    for item_id, item_name, skill_id, level in cursor.fetchall():
        if skill_id not in granted_by_items:
            granted_by_items[skill_id] = []
        granted_by_items[skill_id].append(
            {
                "item_id": item_id,
                "item_name": item_name,
                "type": "potion_buff",
                "level": level,
            }
        )

    # Food buffs
    cursor.execute("""
        SELECT id, name, food_buff_id, food_buff_level
        FROM items
        WHERE food_buff_id IS NOT NULL
    """)
    for item_id, item_name, skill_id, level in cursor.fetchall():
        if skill_id not in granted_by_items:
            granted_by_items[skill_id] = []
        granted_by_items[skill_id].append(
            {
                "item_id": item_id,
                "item_name": item_name,
                "type": "food_buff",
                "level": level,
            }
        )

    # Relic buffs
    cursor.execute("""
        SELECT id, name, relic_buff_id
        FROM items
        WHERE relic_buff_id IS NOT NULL
    """)
    for item_id, item_name, skill_id in cursor.fetchall():
        if skill_id not in granted_by_items:
            granted_by_items[skill_id] = []
        granted_by_items[skill_id].append(
            {"item_id": item_id, "item_name": item_name, "type": "relic_buff"}
        )

    # Scroll skills
    cursor.execute("""
        SELECT id, name, scroll_skill_id
        FROM items
        WHERE scroll_skill_id IS NOT NULL
    """)
    for item_id, item_name, skill_id in cursor.fetchall():
        if skill_id not in granted_by_items:
            granted_by_items[skill_id] = []
        granted_by_items[skill_id].append(
            {"item_id": item_id, "item_name": item_name, "type": "scroll"}
        )

    # Weapon proc effects
    cursor.execute("""
        SELECT id, name, weapon_proc_effect_id, weapon_proc_effect_probability
        FROM items
        WHERE weapon_proc_effect_id IS NOT NULL
    """)
    for item_id, item_name, skill_id, probability in cursor.fetchall():
        if skill_id not in granted_by_items:
            granted_by_items[skill_id] = []
        granted_by_items[skill_id].append(
            {
                "item_id": item_id,
                "item_name": item_name,
                "type": "weapon_proc",
                "probability": probability,
            }
        )

    return granted_by_items


def run(conn: sqlite3.Connection) -> None:
    """Run all skill source denormalizations.

    Updates skills table with:
    - granted_by_items: Which items grant this skill
    """
    console.print("Denormalizing skill sources...")

    cursor = conn.cursor()

    granted_by_items = _denormalize_granted_by_items(conn)

    # Update skills table
    for skill_id, items in granted_by_items.items():
        # Sort by item name alphabetically
        items_sorted = sorted(items, key=lambda x: x["item_name"])
        cursor.execute(
            "UPDATE skills SET granted_by_items = ? WHERE id = ?",
            (json.dumps(items_sorted), skill_id),
        )

    conn.commit()

    console.print(
        f"  [green]OK[/green] Updated {len(granted_by_items)} skills with item sources"
    )
