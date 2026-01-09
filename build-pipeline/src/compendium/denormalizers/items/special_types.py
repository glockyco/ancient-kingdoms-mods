"""Special item type denormalizations.

This module handles denormalizations for special item types:
- Chest-type items (with Monte Carlo probability calculation)
- Pack items (found_in_packs)
- Random items (found_in_random_items, random_items_with_names)
- Merge items
- Treasure maps
- Luck tokens
"""

import json
import random
import sqlite3

from rich.console import Console

from compendium.types.denormalized import ChestSourceInfo

console = Console()


def _calculate_exact_chest_probabilities(
    rewards: list[dict], num_items: int
) -> dict[str, float]:
    """Calculate drop probabilities using Monte Carlo simulation.

    Fast and accurate - matches actual game behavior exactly.

    Args:
        rewards: List of reward dicts with item_id and probability
        num_items: Number of items the chest drops

    Returns:
        Dict mapping item_id to probability of being selected
    """
    num_simulations = 100000
    max_passes = 10

    # Track how many times each item was selected
    item_counts = {r["item_id"]: 0 for r in rewards}

    for _ in range(num_simulations):
        selected_ids: set[str] = set()
        num_passes = 0

        while len(selected_ids) < num_items and num_passes < max_passes:
            for reward in rewards:
                # Skip if already selected
                if reward["item_id"] in selected_ids:
                    continue

                # Roll for this item
                if random.random() < reward["probability"]:
                    selected_ids.add(reward["item_id"])
                    item_counts[reward["item_id"]] += 1

                # Check if we have enough items
                if len(selected_ids) >= num_items:
                    break

            num_passes += 1

    # Convert counts to probabilities
    item_probs = {}
    for item_id, count in item_counts.items():
        item_probs[item_id] = count / num_simulations

    return item_probs


def _denormalize_chest_rewards(
    conn: sqlite3.Connection,
) -> tuple[int, dict[str, list[ChestSourceInfo]]]:
    """Denormalize chest reward item names and calculate exact drop chances.

    Returns:
        Tuple of (chest_rewards_updated, found_in_chests dict)
    """
    console.print(
        "  Denormalizing chest reward item names and calculating drop chances..."
    )
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, chest_rewards, chest_num_items
        FROM items
        WHERE chest_rewards IS NOT NULL AND chest_rewards != '[]'
    """)

    chest_rewards_updated = 0
    found_in_chests: dict[str, list[ChestSourceInfo]] = {}

    for chest_id, chest_rewards_json, num_items in cursor.fetchall():
        chest_rewards = json.loads(chest_rewards_json)
        updated_rewards = []

        # First pass: add item names
        for reward in chest_rewards:
            item_id = reward.get("item_id")
            probability = reward.get("probability", 0.0)

            if item_id:
                item_name_cursor = conn.cursor()
                item_result = item_name_cursor.execute(
                    "SELECT name FROM items WHERE id = ?", (item_id,)
                ).fetchone()
                item_name = item_result[0] if item_result else "Unknown"

                updated_rewards.append(
                    {
                        "item_id": item_id,
                        "item_name": item_name,
                        "probability": probability,
                    }
                )

        # Calculate exact drop chances
        if updated_rewards and num_items > 0:
            exact_probs = _calculate_exact_chest_probabilities(
                updated_rewards, num_items
            )

            for reward in updated_rewards:
                reward["actual_drop_chance"] = exact_probs.get(reward["item_id"], 0.0)

        # Build found_in_chests using actual drop chances
        chest_name_cursor = conn.cursor()
        chest_name_result = chest_name_cursor.execute(
            "SELECT name FROM items WHERE id = ?", (chest_id,)
        ).fetchone()
        chest_name = chest_name_result[0] if chest_name_result else "Unknown"

        for reward in updated_rewards:
            item_id = reward["item_id"]
            actual_chance = reward.get("actual_drop_chance", reward["probability"])

            if item_id not in found_in_chests:
                found_in_chests[item_id] = []

            found_in_chests[item_id].append(
                {
                    "chest_id": chest_id,
                    "chest_name": chest_name,
                    "rate": actual_chance,
                }
            )

        if updated_rewards:
            rewards_sorted = sorted(
                updated_rewards,
                key=lambda x: (
                    -x.get("actual_drop_chance", x["probability"]),
                    x["item_name"],
                ),
            )
            update_cursor = conn.cursor()
            update_cursor.execute(
                "UPDATE items SET chest_rewards = ? WHERE id = ?",
                (json.dumps(rewards_sorted), chest_id),
            )
            if update_cursor.rowcount > 0:
                chest_rewards_updated += 1

    return chest_rewards_updated, found_in_chests


def _denormalize_pack_sources(conn: sqlite3.Connection) -> dict[str, list[dict]]:
    """Build found_in_packs from pack items.

    Returns:
        Dict mapping item_id to list of pack sources
    """
    console.print("  Denormalizing pack item sources...")
    cursor = conn.cursor()

    found_in_packs: dict[str, list[dict]] = {}

    cursor.execute("""
        SELECT id, name, pack_final_item_id, pack_final_amount
        FROM items
        WHERE pack_final_item_id IS NOT NULL
    """)

    for pack_id, pack_name, item_id, amount in cursor.fetchall():
        if item_id not in found_in_packs:
            found_in_packs[item_id] = []

        found_in_packs[item_id].append(
            {
                "pack_id": pack_id,
                "pack_name": pack_name,
                "amount": amount,
            }
        )

    return found_in_packs


def _denormalize_random_items(
    conn: sqlite3.Connection,
) -> tuple[int, dict[str, list[dict]]]:
    """Denormalize random item data.

    Updates random items with item names and builds reverse relationship.

    Returns:
        Tuple of (random_items_updated, found_in_random dict)
    """
    console.print("  Denormalizing random item data...")
    cursor = conn.cursor()

    random_items_updated = 0
    found_in_random: dict[str, list[dict]] = {}

    # Update random items with full item names
    cursor.execute("""
        SELECT id, random_items
        FROM items
        WHERE random_items IS NOT NULL AND length(random_items) > 2
    """)

    for item_id, random_items_json in cursor.fetchall():
        if not random_items_json:
            continue

        random_item_ids = json.loads(random_items_json)
        if not random_item_ids:
            continue

        item_count = len(random_item_ids)
        probability = 1.0 / item_count if item_count > 0 else 0.0

        # Fetch names for all random items
        random_items_with_names = []
        for random_id in random_item_ids:
            name_cursor = conn.cursor()
            name_result = name_cursor.execute(
                "SELECT name FROM items WHERE id = ?", (random_id,)
            ).fetchone()
            if name_result:
                random_items_with_names.append(
                    {
                        "item_id": random_id,
                        "item_name": name_result[0],
                        "probability": probability,
                    }
                )

        # Sort alphabetically by name
        random_items_with_names_sorted = sorted(
            random_items_with_names, key=lambda x: x["item_name"]
        )

        # Update the random item
        update_cursor = conn.cursor()
        update_cursor.execute(
            """
            UPDATE items
            SET random_items_with_names = ?
            WHERE id = ?
        """,
            (json.dumps(random_items_with_names_sorted), item_id),
        )

        if update_cursor.rowcount > 0:
            random_items_updated += 1

    # Build reverse relationship
    cursor.execute("""
        SELECT DISTINCT id, name, random_items
        FROM items
        WHERE random_items IS NOT NULL AND length(random_items) > 2
    """)

    for random_item_id, random_item_name, random_items_json in cursor.fetchall():
        if not random_items_json:
            continue

        random_item_ids = json.loads(random_items_json)
        item_count = len(random_item_ids)
        probability = 1.0 / item_count if item_count > 0 else 0.0

        for outcome_id in random_item_ids:
            if outcome_id not in found_in_random:
                found_in_random[outcome_id] = []

            found_in_random[outcome_id].append(
                {
                    "random_item_id": random_item_id,
                    "random_item_name": random_item_name,
                    "probability": probability,
                }
            )

    return random_items_updated, found_in_random


def _denormalize_merge_items(conn: sqlite3.Connection) -> tuple[int, int]:
    """Denormalize merge item data.

    Returns:
        Tuple of (merge_items_updated, created_from_merge_updated)
    """
    console.print("  Denormalizing merge item data...")
    cursor = conn.cursor()

    merge_items_updated = 0
    created_from_merge_updated = 0

    # Update merge items with full item data (items needed + result item name)
    cursor.execute("""
        SELECT id, merge_items_needed_ids, merge_result_item_id
        FROM items
        WHERE merge_items_needed_ids IS NOT NULL
    """)

    for item_id, items_needed_json, result_item_id in cursor.fetchall():
        if not items_needed_json:
            continue

        items_needed_ids = json.loads(items_needed_json)
        if not items_needed_ids:
            continue

        # Fetch names for all needed items
        merge_items_needed = []
        for needed_id in items_needed_ids:
            name_cursor = conn.cursor()
            name_result = name_cursor.execute(
                "SELECT name FROM items WHERE id = ?", (needed_id,)
            ).fetchone()
            if name_result:
                merge_items_needed.append(
                    {"item_id": needed_id, "item_name": name_result[0]}
                )

        # Fetch result item name
        result_item_name = None
        if result_item_id:
            result_cursor = conn.cursor()
            result = result_cursor.execute(
                "SELECT name FROM items WHERE id = ?", (result_item_id,)
            ).fetchone()
            if result:
                result_item_name = result[0]

        # Update the merge item
        update_cursor = conn.cursor()
        update_cursor.execute(
            """
            UPDATE items
            SET merge_items_needed = ?,
                merge_result_item_name = ?
            WHERE id = ?
        """,
            (json.dumps(merge_items_needed), result_item_name, item_id),
        )

        if update_cursor.rowcount > 0:
            merge_items_updated += 1

    # Update result items with source merge items (reverse relationship)
    cursor.execute("""
        SELECT DISTINCT merge_result_item_id
        FROM items
        WHERE merge_result_item_id IS NOT NULL
    """)

    for (result_item_id,) in cursor.fetchall():
        # Find all merge items that create this result
        sources_cursor = conn.cursor()
        sources_cursor.execute(
            """
            SELECT id, name
            FROM items
            WHERE merge_result_item_id = ?
        """,
            (result_item_id,),
        )

        created_from = []
        for merge_item_id, merge_item_name in sources_cursor.fetchall():
            created_from.append(
                {"item_id": merge_item_id, "item_name": merge_item_name}
            )

        if created_from:
            update_cursor = conn.cursor()
            update_cursor.execute(
                """
                UPDATE items
                SET created_from_merge = ?
                WHERE id = ?
            """,
                (json.dumps(created_from), result_item_id),
            )

            if update_cursor.rowcount > 0:
                created_from_merge_updated += 1

    return merge_items_updated, created_from_merge_updated


def _denormalize_treasure_maps(conn: sqlite3.Connection) -> tuple[int, int]:
    """Denormalize treasure map location and reward data.

    Returns:
        Tuple of (treasure_maps_updated, rewarded_by_maps_updated)
    """
    console.print("  Denormalizing treasure map locations...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT tl.id, tl.required_map_id, tl.zone_id, z.name, tl.position_x, tl.position_y, tl.position_z
        FROM treasure_locations tl
        LEFT JOIN zones z ON z.id = tl.zone_id
    """)

    treasure_maps_updated = 0
    for (
        location_id,
        map_id,
        zone_id,
        zone_name,
        pos_x,
        pos_y,
        pos_z,
    ) in cursor.fetchall():
        cursor.execute(
            """
            UPDATE items
            SET treasure_map_zone_id = ?,
                treasure_map_zone_name = ?,
                treasure_map_position_x = ?,
                treasure_map_position_y = ?,
                treasure_map_position_z = ?,
                treasure_location_id = ?
            WHERE id = ?
        """,
            (zone_id, zone_name, pos_x, pos_y, pos_z, location_id, map_id),
        )
        if cursor.rowcount > 0:
            treasure_maps_updated += 1

    # Denormalize treasure map reward names
    cursor.execute("""
        UPDATE items
        SET treasure_map_reward_name = (
            SELECT reward.name FROM items reward
            WHERE reward.id = items.treasure_map_reward_id
        )
        WHERE treasure_map_reward_id IS NOT NULL
    """)

    # Denormalize reverse relationship: which maps reward each item
    console.print("  Denormalizing treasure map rewards (reverse)...")
    cursor.execute("""
        SELECT
            i.treasure_map_reward_id,
            i.id as map_id,
            i.name as map_name,
            i.treasure_map_zone_id,
            i.treasure_map_zone_name
        FROM items i
        WHERE i.treasure_map_reward_id IS NOT NULL
        ORDER BY i.treasure_map_reward_id, i.name
    """)

    rewarded_by_maps: dict[str, list[dict]] = {}
    for reward_id, map_id, map_name, zone_id, zone_name in cursor.fetchall():
        if reward_id not in rewarded_by_maps:
            rewarded_by_maps[reward_id] = []
        rewarded_by_maps[reward_id].append(
            {
                "map_id": map_id,
                "map_name": map_name,
                "zone_id": zone_id,
                "zone_name": zone_name,
            }
        )

    for reward_id, maps in rewarded_by_maps.items():
        cursor.execute(
            "UPDATE items SET rewarded_by_treasure_maps = ? WHERE id = ?",
            (json.dumps(maps), reward_id),
        )

    return treasure_maps_updated, len(rewarded_by_maps)


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
            # Update luck token metadata only - dropped_by is handled by
            # monsters/drops.py adding fragments to monster drops, then
            # items/sources.py building dropped_by from all monster drops
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
    - Chest rewards with item names and Monte Carlo probabilities
    - found_in_chests
    - found_in_packs
    - random_items_with_names
    - found_in_random_items
    - Merge item data
    - Treasure map locations and rewards
    - Luck token data
    """
    console.print("Denormalizing special item types...")

    # Chest-type items
    chest_rewards_updated, found_in_chests = _denormalize_chest_rewards(conn)

    # Update found_in_chests
    console.print("  Updating found_in_chests...")
    for item_id, chests in found_in_chests.items():
        chests_sorted = sorted(chests, key=lambda x: (-x["rate"], x["chest_name"]))
        update_found_cursor = conn.cursor()
        update_found_cursor.execute(
            "UPDATE items SET found_in_chests = ? WHERE id = ?",
            (json.dumps(chests_sorted), item_id),
        )

    # Pack items
    found_in_packs = _denormalize_pack_sources(conn)
    for item_id, packs in found_in_packs.items():
        packs_sorted = sorted(packs, key=lambda x: x["pack_name"])
        update_pack_cursor = conn.cursor()
        update_pack_cursor.execute(
            "UPDATE items SET found_in_packs = ? WHERE id = ?",
            (json.dumps(packs_sorted), item_id),
        )

    # Random items
    random_items_updated, found_in_random = _denormalize_random_items(conn)
    found_in_random_updated = 0
    for outcome_id, random_sources in found_in_random.items():
        random_sources_sorted = sorted(
            random_sources, key=lambda x: (-x["probability"], x["random_item_name"])
        )
        update_cursor = conn.cursor()
        update_cursor.execute(
            """
            UPDATE items
            SET found_in_random_items = ?
            WHERE id = ?
        """,
            (json.dumps(random_sources_sorted), outcome_id),
        )
        if update_cursor.rowcount > 0:
            found_in_random_updated += 1

    # Merge items
    merge_items_updated, created_from_merge_updated = _denormalize_merge_items(conn)

    # Treasure maps
    treasure_maps_updated, rewarded_by_maps_updated = _denormalize_treasure_maps(conn)

    # Luck tokens
    fragment_count, boss_token_count = _denormalize_luck_tokens(conn)

    conn.commit()

    # Print summary
    console.print(
        f"  [green]OK[/green] Denormalized item names in {chest_rewards_updated} chest reward lists"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(found_in_chests)} items with chest sources"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(found_in_packs)} items with pack sources"
    )
    console.print(
        f"  [green]OK[/green] Denormalized {random_items_updated} random items with names, "
        f"{found_in_random_updated} items with random sources"
    )
    console.print(
        f"  [green]OK[/green] Updated {merge_items_updated} merge items, "
        f"{created_from_merge_updated} result items with merge sources"
    )
    console.print(
        f"  [green]OK[/green] Updated {treasure_maps_updated} treasure maps with dig locations, "
        f"{rewarded_by_maps_updated} items with treasure map sources"
    )
    console.print(
        f"  [green]OK[/green] Updated {fragment_count} fragment luck tokens, "
        f"{boss_token_count} boss luck tokens with zone data"
    )
