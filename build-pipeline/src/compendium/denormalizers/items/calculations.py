"""Item bestiary display flags."""

import sqlite3

from rich.console import Console

console = Console()


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

    # Boss and elite scroll discovery uses the original configured loot pools.
    cursor.execute("""
        UPDATE items
        SET is_bestiary_drop = 1
        WHERE item_type = 'scroll'
          AND is_quest_item = 0
          AND EXISTS (
            SELECT 1
            FROM monsters m
            JOIN loot_pool_entries e ON e.pool_id = m.loot_pool_id
            WHERE (m.is_boss = 1 OR m.is_elite = 1)
              AND e.item_id = items.id
          )
    """)
    updated += cursor.rowcount

    return updated


def run(conn: sqlite3.Connection) -> None:
    """Update whether each item appears in the monster bestiary."""
    console.print("Calculating derived item values...")

    bestiary_updated = _calculate_bestiary_drop(conn)

    conn.commit()

    console.print(
        f"  [green]OK[/green] Calculated bestiary flags for {bestiary_updated} items"
    )
