"""Item calculation denormalizations - derived values.

This module handles calculations that derive new values from existing item data:
- item_level: Calculated from stats using the game's formula
- primal_essence: Calculated from sell_price for tradeable equipment
"""

import json
import math
import sqlite3

from rich.console import Console

console = Console()


def _calculate_item_levels(conn: sqlite3.Connection) -> int:
    """Calculate item levels for all equipment with stats.

    Uses the game's formula which considers all stats with different weights.

    Returns:
        Count of updated items
    """
    console.print("  Calculating item levels...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, stats, weapon_delay
        FROM items
        WHERE stats IS NOT NULL
    """)

    item_levels_updated = 0

    for item_id, stats_json, weapon_delay in cursor.fetchall():
        if not stats_json:
            continue

        stats = json.loads(stats_json)

        # Calculate weapon bonus if applicable
        weapon_bonus = 0
        if weapon_delay and weapon_delay > 0:
            d = -0.0365 * math.pow(weapon_delay - 15, 2)
            weapon_bonus_float = 38.017 * math.exp(d) - 0.1983 * (weapon_delay - 25)
            # C# casts to int (truncates toward zero)
            weapon_bonus = int(weapon_bonus_float)

        # Calculate item level using game formula
        item_level = round(
            stats.get("defense", 0)
            + (
                stats.get("strength", 0)
                + stats.get("constitution", 0)
                + stats.get("dexterity", 0)
                + stats.get("charisma", 0)
                + stats.get("intelligence", 0)
                + stats.get("wisdom", 0)
            )
            * 5
            + stats.get("health_bonus", 0) / 10
            + stats.get("hp_regen_bonus", 0) * 10
            + stats.get("mana_regen_bonus", 0) * 10
            + stats.get("mana_bonus", 0) / 10
            + stats.get("energy_bonus", 0) / 10
            + stats.get("damage", 0) * 0.7
            + stats.get("magic_damage", 0)
            + stats.get("magic_resist", 0)
            + stats.get("poison_resist", 0)
            + stats.get("fire_resist", 0)
            + stats.get("cold_resist", 0)
            + stats.get("disease_resist", 0)
            + stats.get("block_chance", 0) * 200
            + stats.get("accuracy", 0) * 200
            + stats.get("critical_chance", 0) * 200
            + stats.get("haste", 0) * 200
            + stats.get("spell_haste", 0) * 200
            + weapon_bonus
        )

        if item_level > 0:
            cursor.execute(
                "UPDATE items SET item_level = ? WHERE id = ?", (item_level, item_id)
            )
            item_levels_updated += 1

    return item_levels_updated


def _calculate_bestiary_drop(conn: sqlite3.Connection) -> int:
    """Calculate is_bestiary_drop for all items.

    Bestiary shows items that are:
    - NOT potions
    - NOT quest-only items
    - AND (quality > 0 OR is_key OR recipe OR equipment/weapon)

    Returns:
        Count of updated items
    """
    console.print("  Calculating bestiary drop flags...")
    cursor = conn.cursor()

    # Update items that SHOULD appear in bestiary
    cursor.execute("""
        UPDATE items
        SET is_bestiary_drop = 1
        WHERE item_type != 'potion'
          AND is_quest_item = 0
          AND (
            quality > 0
            OR is_key = 1
            OR item_type = 'recipe'
            OR item_type = 'equipment'
            OR item_type = 'weapon'
          )
    """)

    return cursor.rowcount


def _calculate_primal_essence(conn: sqlite3.Connection) -> int:
    """Calculate primal essence values for tradeable equipment.

    Primal essence = ceil(sell_price * 0.06) for sellable equipment.

    Returns:
        Count of updated items
    """
    console.print("  Calculating primal essence values...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, sell_price
        FROM items
        WHERE item_type = 'equipment'
          AND quality >= 1
          AND sellable = 1
          AND sell_price > 0
    """)

    primal_essence_updated = 0

    for item_id, sell_price in cursor.fetchall():
        primal_essence = math.ceil(sell_price * 0.06)

        cursor.execute(
            "UPDATE items SET primal_essence_value = ? WHERE id = ?",
            (primal_essence, item_id),
        )
        primal_essence_updated += 1

    return primal_essence_updated


def run(conn: sqlite3.Connection) -> None:
    """Run all item calculation denormalizations.

    Updates items table with:
    - item_level: Calculated from stats
    - primal_essence_value: Calculated from sell_price
    - is_bestiary_drop: Whether item appears in monster bestiary UI
    """
    console.print("Calculating derived item values...")

    item_levels_updated = _calculate_item_levels(conn)
    primal_essence_updated = _calculate_primal_essence(conn)
    bestiary_updated = _calculate_bestiary_drop(conn)

    conn.commit()

    console.print(
        f"  [green]OK[/green] Calculated item levels for {item_levels_updated} items"
    )
    console.print(
        f"  [green]OK[/green] Calculated primal essence for {primal_essence_updated} items"
    )
    console.print(
        f"  [green]OK[/green] Calculated bestiary flags for {bestiary_updated} items"
    )
