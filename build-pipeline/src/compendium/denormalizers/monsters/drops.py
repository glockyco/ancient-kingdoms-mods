"""Monster drop denormalizations.

This module denormalizes monster drops by:
1. Adding item names to existing drops
2. Adding fatecharmed fragment drops based on luck_tokens table
"""

import json
import sqlite3

from rich.console import Console

console = Console()


def _denormalize_drop_names(conn: sqlite3.Connection) -> int:
    """Add item names to existing monster drops.

    The raw monster drops only contain item_id and rate. This adds
    item_name for display purposes.

    Returns:
        Count of monsters updated
    """
    console.print("  Adding item names to monster drops...")
    cursor = conn.cursor()

    # Get all monsters with drops
    cursor.execute("SELECT id, drops FROM monsters WHERE drops IS NOT NULL")
    monsters = cursor.fetchall()

    # Build item name lookup
    cursor.execute("SELECT id, name FROM items")
    item_names = {row[0]: row[1] for row in cursor.fetchall()}

    updated_count = 0

    for monster_id, drops_json in monsters:
        if not drops_json:
            continue

        drops = json.loads(drops_json)
        if not drops:
            continue

        # Add item names to drops
        updated_drops = []
        for drop in drops:
            item_id = drop.get("item_id")
            item_name = item_names.get(item_id, "Unknown")
            updated_drops.append(
                {
                    "item_id": item_id,
                    "item_name": item_name,
                    "rate": drop.get("rate", 0),
                }
            )

        cursor.execute(
            "UPDATE monsters SET drops = ? WHERE id = ?",
            (json.dumps(updated_drops), monster_id),
        )
        updated_count += 1

    return updated_count


def _add_fragment_drops(conn: sqlite3.Connection) -> int:
    """Add fatecharmed fragment drops to eligible monsters.

    Non-boss, non-elite monsters in zones with luck tokens should drop
    the zone's fatecharmed fragment at the configured drop rate.

    Returns:
        Count of monsters updated with fragment drops
    """
    console.print("  Adding fatecharmed fragment drops...")
    cursor = conn.cursor()

    # Get all luck token configurations with fragment info
    cursor.execute("""
        SELECT lt.zone_id, lt.fragment_token_id, lt.fragment_drop_chance, i.name
        FROM luck_tokens lt
        JOIN items i ON i.id = lt.fragment_token_id
        WHERE lt.fragment_token_id IS NOT NULL
    """)

    zone_fragments = {
        row[0]: {"item_id": row[1], "rate": row[2], "item_name": row[3]}
        for row in cursor.fetchall()
    }

    if not zone_fragments:
        console.print("    No luck token fragments found")
        return 0

    updated_count = 0

    # For each zone with fragments, update eligible monsters
    for zone_id, fragment_info in zone_fragments.items():
        # Get non-boss, non-elite monsters that spawn in this zone
        cursor.execute(
            """
            SELECT DISTINCT m.id, m.drops
            FROM monsters m
            JOIN monster_spawns ms ON m.id = ms.monster_id
            WHERE ms.zone_id = ? AND m.is_boss = 0 AND m.is_elite = 0
        """,
            (zone_id,),
        )

        monsters = cursor.fetchall()

        for monster_id, drops_json in monsters:
            # Parse existing drops
            drops = json.loads(drops_json) if drops_json else []

            # Check if fragment already in drops
            existing_ids = {d.get("item_id") for d in drops}
            if fragment_info["item_id"] in existing_ids:
                continue

            # Add fragment drop
            drops.append(
                {
                    "item_id": fragment_info["item_id"],
                    "item_name": fragment_info["item_name"],
                    "rate": fragment_info["rate"],
                }
            )

            cursor.execute(
                "UPDATE monsters SET drops = ? WHERE id = ?",
                (json.dumps(drops), monster_id),
            )
            updated_count += 1

    return updated_count


def run(conn: sqlite3.Connection) -> None:
    """Run all monster drop denormalizations.

    Adds item names to existing drops and adds fatecharmed fragment
    drops to eligible monsters based on luck_tokens configuration.
    """
    console.print("Denormalizing monster drops...")

    names_count = _denormalize_drop_names(conn)
    fragment_count = _add_fragment_drops(conn)

    conn.commit()

    console.print(f"  [green]OK[/green] Added item names to {names_count} monsters")
    console.print(
        f"  [green]OK[/green] Added fragment drops to {fragment_count} monsters"
    )
