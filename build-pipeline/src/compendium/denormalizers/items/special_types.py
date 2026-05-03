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

        # First pass: add item names while preserving game roll order
        for roll_order, reward in enumerate(chest_rewards):
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
                        "roll_order": roll_order,
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
    - Luck token data

    Note: Pack/random/merge/treasure_map data now populated by loader into junction tables.
    """
    console.print("Denormalizing special item types...")

    # Chest-type items (keep chest_rewards JSON - complex display data)
    # Also populate item_sources_random for the reverse relationship
    chest_rewards_updated, found_in_chests = _denormalize_chest_rewards(conn)

    # Populate item_sources_random for items found in chest-type items
    # (Chest-type items are random containers - they go in item_sources_random)
    cursor = conn.cursor()
    chest_source_count = 0
    for item_id, chest_sources in found_in_chests.items():
        for source in chest_sources:
            cursor.execute(
                """
                INSERT INTO item_sources_random (item_id, random_item_id, probability)
                VALUES (?, ?, ?)
                """,
                (item_id, source["chest_id"], source["rate"]),
            )
            chest_source_count += 1

    # Luck tokens
    fragment_count, boss_token_count = _denormalize_luck_tokens(conn)

    conn.commit()

    # Print summary
    console.print(
        f"  [green]OK[/green] Denormalized item names in {chest_rewards_updated} chest reward lists"
    )
    console.print(
        f"  [green]OK[/green] Added {chest_source_count} item_sources_random entries from chest-type items"
    )
    console.print(
        f"  [green]OK[/green] Updated {fragment_count} fragment luck tokens, "
        f"{boss_token_count} boss luck tokens with zone data"
    )
