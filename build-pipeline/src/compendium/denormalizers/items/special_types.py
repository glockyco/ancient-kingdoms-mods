"""Special item type denormalizations.

This module handles denormalizations for special item types:
- Chest-type reward display names
- Pack items
- Random items (including random_items_with_names)
- Merge items
- Treasure maps
- Luck tokens
"""

import json
import sqlite3

from rich.console import Console

console = Console()


def _denormalize_chest_rewards(conn: sqlite3.Connection) -> int:
    """Attach item names to the exported chest roll inputs."""
    cursor = conn.cursor()
    rows = cursor.execute("""
        SELECT r.chest_item_id, r.item_id, i.name, r.roll_order,
               r.roll_chance, r.scales_with_treasure_hunter
        FROM chest_item_rewards r
        JOIN items i ON i.id = r.item_id
        ORDER BY r.chest_item_id, r.roll_order
    """).fetchall()
    rewards_by_chest: dict[str, list[dict]] = {}
    for chest_id, item_id, name, order, chance, scales in rows:
        rewards_by_chest.setdefault(chest_id, []).append(
            {
                "item_id": item_id,
                "item_name": name,
                "roll_order": order,
                "probability": chance,
                "scales_with_treasure_hunter": bool(scales),
            }
        )
    for chest_id, rewards in rewards_by_chest.items():
        cursor.execute(
            "UPDATE items SET chest_rewards = ? WHERE id = ?",
            (json.dumps(rewards), chest_id),
        )
    return len(rewards_by_chest)


def _denormalize_luck_tokens(conn: sqlite3.Connection) -> tuple[int, int]:
    """Denormalize luck token data.

    Returns:
        Tuple of (fragment_count, boss_token_count)
    """
    console.print("  Denormalizing luck token data...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT zone_id, zone_name, boss_luck_token_id, fragment_token_id,
               fragment_amount_needed, fragment_drop_chance, boss_luck_bonus
        FROM luck_tokens
    """)

    fragment_count = 0
    boss_token_count = 0

    for (
        zone_id,
        zone_name,
        boss_token_id,
        fragment_token_id,
        fragment_amount,
        fragment_drop_chance,
        boss_bonus,
    ) in cursor.fetchall():
        if fragment_token_id:
            # Update luck token metadata only - the drop relationship is handled
            # by monsters/drops.py adding fragments to monster drops, then
            # items/sources.py building item_sources_monster from those drops
            update_fragment_cursor = conn.cursor()
            update_fragment_cursor.execute(
                """
                UPDATE items
                SET luck_token_zone_id = ?,
                    luck_token_zone_name = ?,
                    luck_token_drop_chance = ?
                WHERE id = ?
            """,
                (
                    zone_id,
                    zone_name,
                    fragment_drop_chance,
                    fragment_token_id,
                ),
            )
            if update_fragment_cursor.rowcount > 0:
                fragment_count += 1

        if boss_token_id:
            fragment_name = None
            if fragment_token_id:
                fragment_name_cursor = conn.cursor()
                fragment_result = fragment_name_cursor.execute(
                    "SELECT name FROM items WHERE id = ?", (fragment_token_id,)
                ).fetchone()
                if fragment_result:
                    fragment_name = fragment_result[0]

            update_boss_cursor = conn.cursor()
            update_boss_cursor.execute(
                """
                UPDATE items
                SET luck_token_zone_id = ?,
                    luck_token_zone_name = ?,
                    luck_token_bonus = ?,
                    luck_token_fragment_id = ?,
                    luck_token_fragment_name = ?,
                    luck_token_fragments_needed = ?
                WHERE id = ?
            """,
                (
                    zone_id,
                    zone_name,
                    boss_bonus,
                    fragment_token_id,
                    fragment_name,
                    fragment_amount,
                    boss_token_id,
                ),
            )
            if update_boss_cursor.rowcount > 0:
                boss_token_count += 1

    return fragment_count, boss_token_count


def run(conn: sqlite3.Connection) -> None:
    """Run all special item type denormalizations.

    Updates items table with:
    - Chest reward inputs with item names
    - Luck token data

    Note: Pack/random/merge/treasure_map data now populated by loader into junction tables.
    """
    console.print("Denormalizing special item types...")

    chest_rewards_updated = _denormalize_chest_rewards(conn)

    # Luck tokens
    fragment_count, boss_token_count = _denormalize_luck_tokens(conn)

    conn.commit()

    # Print summary
    console.print(
        f"  [green]OK[/green] Denormalized item names in {chest_rewards_updated} chest reward lists"
    )
    console.print(
        f"  [green]OK[/green] Updated {fragment_count} fragment luck tokens, "
        f"{boss_token_count} boss luck tokens with zone data"
    )
