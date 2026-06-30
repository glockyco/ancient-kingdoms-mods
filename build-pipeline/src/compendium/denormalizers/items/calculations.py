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


def _num(stats: dict[str, object], key: str) -> float:
    value = stats.get(key, 0)
    return float(value) if isinstance(value, int | float) else 0.0


def _weapon_delay_bonus(weapon_delay: int | float | None) -> int:
    if not weapon_delay or weapon_delay <= 0:
        return 0
    d = -0.0365 * math.pow(float(weapon_delay) - 15, 2)
    weapon_bonus_float = 38.017 * math.exp(d) - 0.1983 * (float(weapon_delay) - 25)
    return int(weapon_bonus_float)


def equipment_item_level(
    stats: dict[str, object], weapon_delay: int | float | None = None
) -> int:
    return round(
        _num(stats, "defense")
        + (
            _num(stats, "strength")
            + _num(stats, "constitution")
            + _num(stats, "dexterity")
            + _num(stats, "charisma")
            + _num(stats, "intelligence")
            + _num(stats, "wisdom")
        )
        * 5
        + _num(stats, "health_bonus") / 10
        + _num(stats, "hp_regen_bonus") * 10
        + _num(stats, "mana_regen_bonus") * 10
        + _num(stats, "mana_bonus") / 10
        + _num(stats, "energy_bonus") / 10
        + _num(stats, "damage") * 0.7
        + _num(stats, "magic_damage")
        + _num(stats, "magic_resist")
        + _num(stats, "poison_resist")
        + _num(stats, "fire_resist")
        + _num(stats, "cold_resist")
        + _num(stats, "disease_resist")
        + _num(stats, "block_chance") * 500
        + _num(stats, "accuracy") * 500
        + _num(stats, "critical_chance") * 500
        + _num(stats, "haste") * 500
        + _num(stats, "speed_bonus") * 100
        + _num(stats, "spell_haste") * 500
        + _num(stats, "resist_fear_chance") * 500
        + _num(stats, "critical_resist") * 500
        + _weapon_delay_bonus(weapon_delay)
    )


def augment_item_level(stats: dict[str, object]) -> int:
    return round(
        _num(stats, "defense")
        + (
            _num(stats, "strength")
            + _num(stats, "constitution")
            + _num(stats, "dexterity")
            + _num(stats, "charisma")
            + _num(stats, "intelligence")
            + _num(stats, "wisdom")
        )
        * 5
        + _num(stats, "health_bonus") / 10
        + _num(stats, "hp_regen_bonus") * 10
        + _num(stats, "mana_regen_bonus") * 10
        + _num(stats, "mana_bonus") / 10
        + _num(stats, "energy_bonus") / 10
        + _num(stats, "damage") * 0.7
        + _num(stats, "magic_damage")
        + _num(stats, "magic_resist")
        + _num(stats, "poison_resist")
        + _num(stats, "fire_resist")
        + _num(stats, "cold_resist")
        + _num(stats, "disease_resist")
        + _num(stats, "block_chance") * 200
        + _num(stats, "accuracy") * 200
        + _num(stats, "critical_chance") * 200
        + _num(stats, "haste") * 200
        + _num(stats, "spell_haste") * 200
        + _num(stats, "critical_resist") * 200
    )


def _calculate_item_levels(conn: sqlite3.Connection) -> int:
    """Calculate item levels for all equipment with stats.

    Uses the game's formula which considers all stats with different weights.

    Returns:
        Count of updated items
    """
    console.print("  Calculating item levels...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, item_type, stats, weapon_delay
        FROM items
        WHERE stats IS NOT NULL
    """)

    item_levels_updated = 0

    for item_id, item_type, stats_json, weapon_delay in cursor.fetchall():
        if not stats_json:
            continue

        stats = json.loads(stats_json)
        if item_type == "augment":
            item_level = augment_item_level(stats)
        else:
            item_level = equipment_item_level(stats, weapon_delay)

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
    - OR scrolls dropped by bosses/elites

    Returns:
        Count of updated items
    """
    console.print("  Calculating bestiary drop flags...")
    cursor = conn.cursor()

    # Update items that SHOULD appear in bestiary.
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
    updated = cursor.rowcount

    # Source: server-scripts/Monster.cs:3615-3621 — boss/elite scroll drops update bestiary discovery.
    cursor.execute("""
        UPDATE items
        SET is_bestiary_drop = 1
        WHERE item_type = 'scroll'
          AND is_quest_item = 0
          AND EXISTS (
            SELECT 1
            FROM monsters m, json_each(m.drops) d
            WHERE (m.is_boss = 1 OR m.is_elite = 1)
              AND json_extract(d.value, '$.item_id') = items.id
          )
    """)
    updated += cursor.rowcount

    return updated


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
