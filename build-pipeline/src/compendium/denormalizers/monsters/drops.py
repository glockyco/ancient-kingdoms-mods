"""Monster drop denormalizations.

This module denormalizes monster drops by:
1. Adding item names to existing drops
2. Adding fatecharmed fragment drops based on luck_tokens table
3. Expanding altar reward variants (common → magic/epic/legendary)
"""

import json
import sqlite3
from typing import TypedDict

from rich.console import Console

console = Console()


class AltarRewardInfo(TypedDict):
    common_id: str
    common_name: str
    magic_id: str
    magic_name: str
    epic_id: str
    epic_name: str
    legendary_id: str
    legendary_name: str


def _denormalize_drop_names(conn: sqlite3.Connection) -> int:
    """Add item names and quality to existing monster drops.

    The raw monster drops only contain item_id and rate. This adds
    item_name and quality for display and sorting purposes.

    Returns:
        Count of monsters updated
    """
    console.print("  Adding item names to monster drops...")
    cursor = conn.cursor()

    # Get all monsters with drops
    cursor.execute("SELECT id, drops FROM monsters WHERE drops IS NOT NULL")
    monsters = cursor.fetchall()

    # Build item lookup (name and quality)
    cursor.execute("SELECT id, name, quality FROM items")
    item_info = {
        row[0]: {"name": row[1], "quality": row[2]} for row in cursor.fetchall()
    }

    updated_count = 0

    for monster_id, drops_json in monsters:
        if not drops_json:
            continue

        drops = json.loads(drops_json)
        if not drops:
            continue

        # Add item names and quality to drops
        updated_drops = []
        for drop in drops:
            item_id = drop.get("item_id")
            info = item_info.get(item_id, {"name": "Unknown", "quality": 0})
            updated_drops.append(
                {
                    "item_id": item_id,
                    "item_name": info["name"],
                    "quality": info["quality"],
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
        SELECT lt.zone_id, lt.fragment_token_id, lt.fragment_drop_chance, i.name, i.quality
        FROM luck_tokens lt
        JOIN items i ON i.id = lt.fragment_token_id
        WHERE lt.fragment_token_id IS NOT NULL
    """)

    zone_fragments = {
        row[0]: {
            "item_id": row[1],
            "rate": row[2],
            "item_name": row[3],
            "quality": row[4],
        }
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
                    "quality": fragment_info["quality"],
                    "rate": fragment_info["rate"],
                }
            )

            cursor.execute(
                "UPDATE monsters SET drops = ? WHERE id = ?",
                (json.dumps(drops), monster_id),
            )
            updated_count += 1

    return updated_count


def _expand_altar_reward_variants(conn: sqlite3.Connection) -> int:
    """Expand altar reward drops to include all tier variants.

    When a monster drops an altar's common reward, add the magic/epic/legendary
    variants with notes indicating the level requirements:
    - Common: "Level 30-34"
    - Magic: "Level 35-44"
    - Epic: "Level 45-50, Veteran 0-99"
    - Legendary: "Level 50, Veteran 100+"

    Returns:
        Count of monsters updated with expanded altar drops
    """
    console.print("  Expanding altar reward variants...")
    cursor = conn.cursor()

    # Build item quality lookup
    cursor.execute("SELECT id, quality FROM items")
    item_quality = {row[0]: row[1] for row in cursor.fetchall()}

    # Get altar rewards and their final wave boss monsters from waves JSON
    cursor.execute("""
        SELECT
            reward_common_id, reward_common_name,
            reward_magic_id, reward_magic_name,
            reward_epic_id, reward_epic_name,
            reward_legendary_id, reward_legendary_name,
            waves
        FROM altars
        WHERE reward_common_id IS NOT NULL AND waves IS NOT NULL
    """)

    # Build mapping: monster_id -> altar reward info
    monster_to_altar: dict[str, AltarRewardInfo] = {}

    for row in cursor.fetchall():
        altar_info: AltarRewardInfo = {
            "common_id": row[0],
            "common_name": row[1],
            "magic_id": row[2],
            "magic_name": row[3],
            "epic_id": row[4],
            "epic_name": row[5],
            "legendary_id": row[6],
            "legendary_name": row[7],
        }
        waves_json = row[8]

        if not waves_json:
            continue

        waves = json.loads(waves_json)
        if not waves:
            continue

        # Get the final wave's monsters (the boss that drops the reward)
        final_wave = waves[-1]
        for monster in final_wave.get("monsters", []):
            monster_id = monster.get("monster_id")
            if monster_id:
                monster_to_altar[monster_id] = altar_info

    if not monster_to_altar:
        console.print("    No altar boss monsters found")
        return 0

    updated_count = 0

    # Only process monsters that are altar bosses
    for monster_id, altar in monster_to_altar.items():
        cursor.execute(
            "SELECT drops FROM monsters WHERE id = ?",
            (monster_id,),
        )
        result = cursor.fetchone()
        if not result or not result[0]:
            continue

        drops = json.loads(result[0])
        if not drops:
            continue

        # Find the common reward drop and expand it
        new_drops = []
        has_altar_drop = False

        for drop in drops:
            item_id = drop.get("item_id")
            rate = drop.get("rate", 0)

            if item_id == altar["common_id"]:
                has_altar_drop = True

                # Add all four variants with appropriate notes (legendary first for sorting)
                new_drops.append(
                    {
                        "item_id": altar["legendary_id"],
                        "item_name": altar["legendary_name"],
                        "quality": item_quality.get(altar["legendary_id"], 0),
                        "rate": rate,
                        "note": "Level 50, Veteran 100+",
                        "is_altar_reward": True,
                    }
                )
                new_drops.append(
                    {
                        "item_id": altar["epic_id"],
                        "item_name": altar["epic_name"],
                        "quality": item_quality.get(altar["epic_id"], 0),
                        "rate": rate,
                        "note": "Level 45-50, Veteran 0-99",
                        "is_altar_reward": True,
                    }
                )
                new_drops.append(
                    {
                        "item_id": altar["magic_id"],
                        "item_name": altar["magic_name"],
                        "quality": item_quality.get(altar["magic_id"], 0),
                        "rate": rate,
                        "note": "Level 35-44",
                        "is_altar_reward": True,
                    }
                )
                new_drops.append(
                    {
                        "item_id": altar["common_id"],
                        "item_name": altar["common_name"],
                        "quality": item_quality.get(altar["common_id"], 0),
                        "rate": rate,
                        "note": "Level 30-34",
                        "is_altar_reward": True,
                    }
                )
            else:
                # Keep original drop as-is
                new_drops.append(drop)

        if has_altar_drop:
            cursor.execute(
                "UPDATE monsters SET drops = ? WHERE id = ?",
                (json.dumps(new_drops), monster_id),
            )
            updated_count += 1

    return updated_count


def run(conn: sqlite3.Connection) -> None:
    """Run all monster drop denormalizations.

    Adds item names to existing drops, adds fatecharmed fragment drops,
    and expands altar reward variants with level requirement notes.
    """
    console.print("Denormalizing monster drops...")

    names_count = _denormalize_drop_names(conn)
    fragment_count = _add_fragment_drops(conn)
    altar_count = _expand_altar_reward_variants(conn)

    conn.commit()

    console.print(f"  [green]OK[/green] Added item names to {names_count} monsters")
    console.print(
        f"  [green]OK[/green] Added fragment drops to {fragment_count} monsters"
    )
    console.print(
        f"  [green]OK[/green] Expanded altar rewards for {altar_count} monsters"
    )
