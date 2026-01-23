"""Item source denormalizations - where items come from.

This module handles all denormalizations that populate "source" fields on items:
- dropped_by: Which monsters drop this item
- gathered_from: Which gathering resources/chests yield this item
- sold_by: Which NPCs sell this item
- rewarded_by: Which quests reward this item
- provided_by_quests: Which quests give this item on start
- rewarded_by_altars: Which altars reward this item
- crafted_from: Which recipes create this item
"""

from __future__ import annotations

import json
import sqlite3
from typing import TYPE_CHECKING

from rich.console import Console

from compendium.types.denormalized import (
    GatherDropInfo,
    MaterialInfo,
)

if TYPE_CHECKING:
    from compendium.redaction import RedactionConfig

console = Console()


def _denormalize_dropped_by(conn: sqlite3.Connection) -> None:
    """Populate item_sources_monster from monsters.drops.

    Skips drops with is_altar_reward=True since those are shown in
    rewarded_by_altars instead.
    """
    console.print("  Processing monster drops...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, drops
        FROM monsters
        WHERE drops IS NOT NULL AND drops != '[]'
    """)

    for monster_id, drops_json in cursor.fetchall():
        drops = json.loads(drops_json)
        for drop in drops:
            item_id = drop.get("item_id")
            # Skip altar reward variants (shown in rewarded_by_altars)
            if item_id and not drop.get("is_altar_reward"):
                cursor.execute(
                    """
                    INSERT INTO item_sources_monster (item_id, monster_id, drop_rate)
                    VALUES (?, ?, ?)
                """,
                    (item_id, monster_id, drop.get("rate", 0.0)),
                )


def _denormalize_gathered_from(
    conn: sqlite3.Connection,
) -> dict[str, list[GatherDropInfo]]:
    """Build gathered_from from gathering resources and world chests.

    Returns:
        Dict mapping item_id to list of gather source info
    """
    cursor = conn.cursor()
    gathered_from: dict[str, list[GatherDropInfo]] = {}

    # Process gathering resource random drops
    console.print("  Processing gathering resource drops...")
    cursor.execute("""
        SELECT gr.id, gr.name, grd.item_id, grd.actual_drop_chance
        FROM gathering_resources gr
        JOIN gathering_resource_drops grd ON gr.id = grd.resource_id
        ORDER BY grd.actual_drop_chance DESC
    """)

    for resource_id, resource_name, item_id, actual_drop_chance in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []
        gathered_from[item_id].append(
            {
                "gather_item_id": resource_id,
                "gather_item_name": resource_name,
                "rate": actual_drop_chance,
                "type": "resource",
            }
        )

    # Process guaranteed resource rewards
    console.print("  Processing guaranteed resource rewards...")
    cursor.execute("""
        SELECT id, name, item_reward_id, item_reward_amount, is_radiant_spark
        FROM gathering_resources
        WHERE item_reward_id IS NOT NULL
    """)

    for (
        resource_id,
        resource_name,
        item_id,
        item_reward_amount,
        is_radiant_spark,
    ) in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []

        # Radiant Sparks have special drop logic: radiantSekeerLevel * 0.10 (v0.9.5.4+)
        # At max level (100%), this gives 10% chance. Show as variable rate.
        if is_radiant_spark:
            rate = 0.10  # Max rate at 100% Radiant Seeker
            rate_note = "0.0% – 10.0%"
        else:
            rate = 1.0
            rate_note = None

        gather_info: GatherDropInfo = {
            "gather_item_id": resource_id,
            "gather_item_name": resource_name,
            "rate": rate,
            "type": "resource",
        }

        if rate_note:
            gather_info["rate_note"] = rate_note

        # Add amount range if variable
        if item_reward_amount > 1:
            gather_info["amount_min"] = 1
            gather_info["amount_max"] = item_reward_amount

        gathered_from[item_id].append(gather_info)

    # Process guaranteed chest rewards (item_reward_id)
    console.print("  Processing guaranteed chest rewards...")
    cursor.execute("""
        SELECT c.id, c.name, c.item_reward_id, c.item_reward_amount,
               c.zone_id, z.name as zone_name,
               c.key_required_id, k.name as key_name,
               c.position_x, c.position_y
        FROM chests c
        LEFT JOIN zones z ON c.zone_id = z.id
        LEFT JOIN items k ON c.key_required_id = k.id
        WHERE c.item_reward_id IS NOT NULL
        ORDER BY z.name, k.name
    """)

    for (
        chest_id,
        chest_name,
        item_id,
        item_reward_amount,
        zone_id,
        zone_name,
        key_id,
        key_name,
        position_x,
        position_y,
    ) in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []

        chest_info: GatherDropInfo = {
            "gather_item_id": chest_id,
            "gather_item_name": chest_name,
            "rate": 1.0,  # Guaranteed reward
            "type": "chest",
            "position_x": position_x,
            "position_y": position_y,
        }

        # Add chest-specific fields
        if zone_id:
            chest_info["zone_id"] = zone_id
        if zone_name:
            chest_info["zone_name"] = zone_name
        if key_id:
            chest_info["key_required_id"] = key_id
        if key_name:
            chest_info["key_name"] = key_name

        # Add amount range if variable
        if item_reward_amount > 1:
            chest_info["amount_min"] = 1
            chest_info["amount_max"] = item_reward_amount

        gathered_from[item_id].append(chest_info)

    # Process random chest drops (chest_drops table)
    console.print("  Processing random chest drops...")
    cursor.execute("""
        SELECT c.id, c.name, cd.item_id, cd.actual_drop_chance,
               c.zone_id, z.name as zone_name,
               c.key_required_id, k.name as key_name,
               c.position_x, c.position_y
        FROM chests c
        JOIN chest_drops cd ON c.id = cd.chest_id
        LEFT JOIN zones z ON c.zone_id = z.id
        LEFT JOIN items k ON c.key_required_id = k.id
        ORDER BY cd.actual_drop_chance DESC, z.name, k.name
    """)

    for (
        chest_id,
        chest_name,
        item_id,
        actual_drop_chance,
        zone_id,
        zone_name,
        key_id,
        key_name,
        position_x,
        position_y,
    ) in cursor.fetchall():
        if item_id not in gathered_from:
            gathered_from[item_id] = []

        random_chest_info: GatherDropInfo = {
            "gather_item_id": chest_id,
            "gather_item_name": chest_name,
            "rate": actual_drop_chance,
            "type": "chest",
            "position_x": position_x,
            "position_y": position_y,
        }

        # Add chest-specific fields
        if zone_id:
            random_chest_info["zone_id"] = zone_id
        if zone_name:
            random_chest_info["zone_name"] = zone_name
        if key_id:
            random_chest_info["key_required_id"] = key_id
        if key_name:
            random_chest_info["key_name"] = key_name

        gathered_from[item_id].append(random_chest_info)

    return gathered_from


def _denormalize_sold_by(conn: sqlite3.Connection) -> None:
    """Populate item_sources_vendor from npcs.items_sold."""
    console.print("  Processing NPC vendors...")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, faction, roles, items_sold
        FROM npcs
        WHERE items_sold IS NOT NULL AND items_sold != '[]'
    """)

    for npc_id, npc_faction, roles_json, items_sold_json in cursor.fetchall():
        items_sold = json.loads(items_sold_json)
        roles = json.loads(roles_json) if roles_json else {}
        required_faction = (
            npc_faction if roles.get("is_faction_vendor", False) else None
        )

        for item_sale in items_sold:
            item_id = item_sale.get("item_id")
            if item_id:
                cursor.execute(
                    """
                    INSERT INTO item_sources_vendor (
                        item_id, npc_id, price, currency_item_id,
                        required_faction, required_reputation_tier
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                    (
                        item_id,
                        npc_id,
                        item_sale.get("price", 0),
                        item_sale.get("currency_item_id"),
                        required_faction,
                        None,  # required_reputation_tier - not available in current data
                    ),
                )


def _denormalize_rewarded_by(conn: sqlite3.Connection) -> None:
    """Populate item_sources_quest (reward) from quests.rewards."""
    console.print("  Processing quest rewards...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, rewards, class_requirements
        FROM quests
        WHERE rewards IS NOT NULL
    """)

    for quest_id, rewards_json, quest_class_requirements_json in cursor.fetchall():
        rewards = json.loads(rewards_json)
        items = rewards.get("items", [])

        # Parse quest-level class requirements
        if quest_class_requirements_json:
            parsed_quest_class_req = json.loads(quest_class_requirements_json)
            quest_class_requirements = (
                sorted(parsed_quest_class_req) if parsed_quest_class_req else None
            )
        else:
            quest_class_requirements = None

        # Group items by item_id to collect class restrictions
        item_groups: dict[str, list[str | None]] = {}
        for item in items:
            item_id = item.get("item_id")
            class_specific = item.get("class_specific")
            if item_id:
                if item_id not in item_groups:
                    item_groups[item_id] = []
                item_groups[item_id].append(class_specific)

        # Create one entry per unique item_id
        for item_id, class_list in item_groups.items():
            # Determine class restrictions by combining quest-level and reward-level
            class_restrictions = None

            if quest_class_requirements:
                # Quest has class requirements - all rewards inherit them
                class_restrictions = sorted(quest_class_requirements)
            elif None not in class_list:
                # No quest-level restrictions, but reward has class-specific variants
                class_restrictions = sorted(set(c for c in class_list if c is not None))

            cursor.execute(
                """
                INSERT INTO item_sources_quest (item_id, quest_id, source_type, class_restriction)
                VALUES (?, ?, 'reward', ?)
            """,
                (
                    item_id,
                    quest_id,
                    json.dumps(class_restrictions) if class_restrictions else None,
                ),
            )


def _denormalize_provided_by_quests(conn: sqlite3.Connection) -> None:
    """Populate item_sources_quest (provided) from quests.given_item_on_start_id."""
    console.print("  Processing quest provided items...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, given_item_on_start_id, class_requirements
        FROM quests
        WHERE given_item_on_start_id IS NOT NULL
    """)

    for quest_id, given_item_id, class_requirements_json in cursor.fetchall():
        # Parse class requirements
        class_restrictions = None
        if class_requirements_json:
            parsed = json.loads(class_requirements_json)
            if parsed:
                class_restrictions = sorted(parsed)

        cursor.execute(
            """
            INSERT INTO item_sources_quest (item_id, quest_id, source_type, class_restriction)
            VALUES (?, ?, 'provided', ?)
        """,
            (
                given_item_id,
                quest_id,
                json.dumps(class_restrictions) if class_restrictions else None,
            ),
        )


def _denormalize_rewarded_by_altars(conn: sqlite3.Connection) -> None:
    """Populate item_sources_altar from altars reward tiers."""
    console.print("  Processing altar rewards...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.reward_common_id, a.reward_magic_id, a.reward_epic_id, a.reward_legendary_id, a.waves
        FROM altars a
        WHERE a.reward_common_id IS NOT NULL OR a.reward_magic_id IS NOT NULL
           OR a.reward_epic_id IS NOT NULL OR a.reward_legendary_id IS NOT NULL
    """)

    # Build monster drops lookup for drop rates
    cursor2 = conn.cursor()
    cursor2.execute("SELECT id, drops FROM monsters WHERE drops IS NOT NULL")
    monster_drops: dict[str, list] = {}
    for monster_id, drops_json in cursor2.fetchall():
        monster_drops[monster_id] = json.loads(drops_json)

    for (
        altar_id,
        common_id,
        magic_id,
        epic_id,
        legendary_id,
        waves_json,
    ) in cursor.fetchall():
        # Extract final wave boss monster and drop rate
        drop_rate = 1.0  # Default to 100%
        if waves_json and common_id:
            waves = json.loads(waves_json)
            if waves:
                final_wave = waves[-1]
                monsters = final_wave.get("monsters", [])
                if monsters:
                    boss_monster_id = monsters[0].get("monster_id")
                    boss_drops = monster_drops.get(boss_monster_id, [])
                    # Get drop rate from boss's drops (altar rewards have is_altar_reward flag)
                    for drop in boss_drops:
                        if (
                            drop.get("is_altar_reward")
                            and drop.get("item_id") == common_id
                        ):
                            drop_rate = drop.get("rate", 1.0)
                            break

        # Common tier (effective level < 35)
        if common_id:
            cursor.execute(
                """
                INSERT INTO item_sources_altar (item_id, altar_id, reward_tier, drop_rate, min_effective_level)
                VALUES (?, ?, 'common', ?, 0)
            """,
                (common_id, altar_id, drop_rate),
            )

        # Magic tier (effective level 35-44)
        if magic_id:
            cursor.execute(
                """
                INSERT INTO item_sources_altar (item_id, altar_id, reward_tier, drop_rate, min_effective_level)
                VALUES (?, ?, 'magic', ?, 35)
            """,
                (magic_id, altar_id, drop_rate),
            )

        # Epic tier (effective level 45-54)
        if epic_id:
            cursor.execute(
                """
                INSERT INTO item_sources_altar (item_id, altar_id, reward_tier, drop_rate, min_effective_level)
                VALUES (?, ?, 'epic', ?, 45)
            """,
                (epic_id, altar_id, drop_rate),
            )

        # Legendary tier (effective level >= 55)
        if legendary_id:
            cursor.execute(
                """
                INSERT INTO item_sources_altar (item_id, altar_id, reward_tier, drop_rate, min_effective_level)
                VALUES (?, ?, 'legendary', ?, 55)
            """,
                (legendary_id, altar_id, drop_rate),
            )


def _denormalize_crafted_from(
    conn: sqlite3.Connection,
    redactions: RedactionConfig | None = None,
) -> None:
    """Populate item_sources_recipe from crafting_recipes and alchemy_recipes."""
    console.print("  Processing crafting recipes...")
    cursor = conn.cursor()

    hide_crafting = redactions.hide_crafting_item_ids if redactions else set()

    # Query both crafting and alchemy recipes
    cursor.execute("""
        SELECT id, result_item_id, result_amount, 'crafting' as recipe_type
        FROM crafting_recipes
        WHERE result_item_id IS NOT NULL
        UNION ALL
        SELECT id, result_item_id, 1 as result_amount, 'alchemy' as recipe_type
        FROM alchemy_recipes
        WHERE result_item_id IS NOT NULL
    """)

    for recipe_id, result_item_id, result_amount, recipe_type in cursor.fetchall():
        # Skip if this item's crafting should be hidden
        if result_item_id in hide_crafting:
            continue

        cursor.execute(
            """
            INSERT INTO item_sources_recipe (item_id, recipe_id, recipe_type, result_amount)
            VALUES (?, ?, ?, ?)
        """,
            (result_item_id, recipe_id, recipe_type, result_amount),
        )


def _denormalize_alchemy_recipes(conn: sqlite3.Connection) -> None:
    """Denormalize alchemy recipe data onto recipe items and potion items."""
    console.print("  Processing alchemy recipes...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT result_item_id, level_required, materials
        FROM alchemy_recipes
        WHERE result_item_id IS NOT NULL
    """)

    for result_item_id, level_required, materials_json in cursor.fetchall():
        # Get the potion name
        cursor.execute("SELECT name FROM items WHERE id = ?", (result_item_id,))
        potion_result = cursor.fetchone()
        potion_name = potion_result[0] if potion_result else "Unknown"

        # Parse materials and add item names
        materials = json.loads(materials_json) if materials_json else []
        alchemy_materials_with_names: list[MaterialInfo] = []
        for material in materials:
            material_id = material.get("item_id")
            amount = material.get("amount", 1)

            # Get material item name
            cursor.execute("SELECT name FROM items WHERE id = ?", (material_id,))
            result = cursor.fetchone()
            material_name = result[0] if result else "Unknown"

            alchemy_materials_with_names.append(
                {"item_id": material_id, "item_name": material_name, "amount": amount}
            )

        # Update the recipe item with denormalized alchemy recipe data
        cursor.execute(
            "SELECT id, name FROM items WHERE recipe_potion_learned_id = ?",
            (result_item_id,),
        )
        recipe_result = cursor.fetchone()

        if recipe_result:
            recipe_id, recipe_name = recipe_result

            # Update recipe item with potion info
            cursor.execute(
                """
                UPDATE items
                SET recipe_potion_learned_name = ?,
                    alchemy_recipe_level_required = ?,
                    alchemy_recipe_materials = ?
                WHERE id = ?
            """,
                (
                    potion_name,
                    level_required,
                    json.dumps(alchemy_materials_with_names),
                    recipe_id,
                ),
            )

            # Update potion item with recipe info (reverse relationship)
            cursor.execute(
                """
                UPDATE items
                SET taught_by_recipe_id = ?,
                    taught_by_recipe_name = ?,
                    alchemy_recipe_level_required = ?,
                    alchemy_recipe_materials = ?
                WHERE id = ?
            """,
                (
                    recipe_id,
                    recipe_name,
                    level_required,
                    json.dumps(alchemy_materials_with_names),
                    result_item_id,
                ),
            )


def _populate_item_sources_pack(conn: sqlite3.Connection) -> None:
    """Populate item_sources_pack from items.found_in_packs JSON."""
    console.print("  Processing pack contents...")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, found_in_packs FROM items WHERE found_in_packs IS NOT NULL AND found_in_packs != '[]'"
    )

    for item_id, found_in_packs_json in cursor.fetchall():
        found_in_packs = json.loads(found_in_packs_json)
        for pack_info in found_in_packs:
            pack_item_id = pack_info.get("pack_id")
            amount = pack_info.get("amount", 1)
            if pack_item_id:
                cursor.execute(
                    """
                    INSERT INTO item_sources_pack (item_id, pack_item_id, amount)
                    VALUES (?, ?, ?)
                """,
                    (item_id, pack_item_id, amount),
                )


def _populate_item_sources_random(conn: sqlite3.Connection) -> None:
    """Populate item_sources_random from items.found_in_random_items JSON."""
    console.print("  Processing random item containers...")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, found_in_random_items FROM items WHERE found_in_random_items IS NOT NULL AND found_in_random_items != '[]'"
    )

    for item_id, found_in_random_items_json in cursor.fetchall():
        found_in_random_items = json.loads(found_in_random_items_json)
        for random_info in found_in_random_items:
            random_item_id = random_info.get("random_item_id")
            probability = random_info.get("probability", 0.0)
            if random_item_id:
                cursor.execute(
                    """
                    INSERT INTO item_sources_random (item_id, random_item_id, probability)
                    VALUES (?, ?, ?)
                """,
                    (item_id, random_item_id, probability),
                )


def _populate_item_sources_merge(conn: sqlite3.Connection) -> None:
    """Populate item_sources_merge from items.created_from_merge JSON."""
    console.print("  Processing merge recipes...")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, created_from_merge FROM items WHERE created_from_merge IS NOT NULL AND created_from_merge != '[]'"
    )

    for item_id, created_from_merge_json in cursor.fetchall():
        created_from_merge = json.loads(created_from_merge_json)
        for component_info in created_from_merge:
            component_item_id = component_info.get("item_id")
            if component_item_id:
                cursor.execute(
                    """
                    INSERT INTO item_sources_merge (item_id, component_item_id)
                    VALUES (?, ?)
                """,
                    (item_id, component_item_id),
                )


def _populate_item_sources_treasure_map(conn: sqlite3.Connection) -> None:
    """Populate item_sources_treasure_map from items.rewarded_by_treasure_maps JSON."""
    console.print("  Processing treasure map rewards...")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, rewarded_by_treasure_maps FROM items WHERE rewarded_by_treasure_maps IS NOT NULL AND rewarded_by_treasure_maps != '[]'"
    )

    for item_id, rewarded_by_treasure_maps_json in cursor.fetchall():
        rewarded_by_treasure_maps = json.loads(rewarded_by_treasure_maps_json)
        for map_info in rewarded_by_treasure_maps:
            map_item_id = map_info.get("map_id")
            treasure_location_id = map_info.get("treasure_location_id")
            if map_item_id:
                cursor.execute(
                    """
                    INSERT INTO item_sources_treasure_map (item_id, map_item_id, treasure_location_id)
                    VALUES (?, ?, ?)
                """,
                    (item_id, map_item_id, treasure_location_id),
                )


def run(conn: sqlite3.Connection, redactions: RedactionConfig | None = None) -> None:
    """Run all item source denormalizations.

    Populates junction tables instead of JSON columns:
    - item_sources_monster, item_sources_vendor, item_sources_quest
    - item_sources_altar, item_sources_recipe, item_sources_gather
    - item_sources_chest, item_sources_pack, item_sources_random
    - item_sources_merge, item_sources_treasure_map

    Args:
        conn: Database connection
        redactions: Optional redaction config for filtering crafting info
    """
    console.print("Denormalizing item sources...")

    cursor = conn.cursor()

    # Clear all junction tables first
    console.print("  Clearing junction tables...")
    junction_tables = [
        "item_sources_monster",
        "item_sources_vendor",
        "item_sources_quest",
        "item_sources_altar",
        "item_sources_recipe",
        "item_sources_gather",
        "item_sources_chest",
        "item_sources_pack",
        "item_sources_random",
        "item_sources_merge",
        "item_sources_treasure_map",
    ]
    for table in junction_tables:
        cursor.execute(f"DELETE FROM {table}")

    # Populate junction tables
    _denormalize_dropped_by(conn)
    _denormalize_gathered_from(conn)
    _denormalize_sold_by(conn)
    _denormalize_rewarded_by(conn)
    _denormalize_provided_by_quests(conn)
    _denormalize_rewarded_by_altars(conn)
    _denormalize_crafted_from(conn, redactions)

    # New functions for additional sources
    _populate_item_sources_pack(conn)
    _populate_item_sources_random(conn)
    _populate_item_sources_merge(conn)
    _populate_item_sources_treasure_map(conn)

    # Legacy alchemy recipe processing (updates JSON columns on recipe/potion items)
    _denormalize_alchemy_recipes(conn)

    conn.commit()

    console.print("  [green]OK[/green] Item source junction tables populated")
