"""Item source denormalizations - where items come from.

This module handles all denormalizations that populate "source" fields on items:
- dropped_by: Which monsters drop this item
- gathered_from: Which gathering resources/chests yield this item
- sold_by: Which NPCs sell this item
- rewarded_by: Which quests reward this item
- rewarded_by_altars: Which altars reward this item
- crafted_from: Which recipes create this item
"""

import json
import sqlite3

from rich.console import Console

from compendium.types.denormalized import (
    CraftedFromInfo,
    DropInfo,
    GatherDropInfo,
    MaterialInfo,
    RewardedByInfo,
    SoldByInfo,
)

console = Console()


def _denormalize_dropped_by(conn: sqlite3.Connection) -> dict[str, list[DropInfo]]:
    """Build dropped_by from monsters.drops.

    Returns:
        Dict mapping item_id to list of monster drop info
    """
    console.print("  Processing monster drops...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, level, drops
        FROM monsters
        WHERE drops IS NOT NULL AND drops != '[]'
    """)

    dropped_by: dict[str, list[DropInfo]] = {}

    for monster_id, monster_name, monster_level, drops_json in cursor.fetchall():
        drops = json.loads(drops_json)
        for drop in drops:
            item_id = drop.get("item_id")
            if item_id:
                if item_id not in dropped_by:
                    dropped_by[item_id] = []
                dropped_by[item_id].append(
                    {
                        "monster_id": monster_id,
                        "monster_name": monster_name,
                        "monster_level": monster_level,
                        "rate": drop.get("rate", 0.0),
                    }
                )

    return dropped_by


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

        # Radiant Sparks have special drop logic: radiantSekeerLevel * 0.05
        # At max level (100%), this gives 5% chance. Show as variable rate.
        if is_radiant_spark:
            rate = 0.05  # Max rate at 100% Radiant Seeker
            rate_note = "0-5% based on Radiant Seeker level"
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


def _denormalize_sold_by(conn: sqlite3.Connection) -> dict[str, list[SoldByInfo]]:
    """Build sold_by from npcs.items_sold.

    Returns:
        Dict mapping item_id to list of vendor info
    """
    console.print("  Processing NPC vendors...")
    cursor = conn.cursor()

    # Build a lookup for item names
    cursor.execute("SELECT id, name FROM items")
    item_name_lookup = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT id, name, faction, roles, items_sold
        FROM npcs
        WHERE items_sold IS NOT NULL AND items_sold != '[]'
    """)

    sold_by: dict[str, list[SoldByInfo]] = {}

    for npc_id, npc_name, npc_faction, roles_json, items_sold_json in cursor.fetchall():
        items_sold = json.loads(items_sold_json)
        roles = json.loads(roles_json) if roles_json else {}
        is_faction_vendor = roles.get("is_faction_vendor", False)
        for item_sale in items_sold:
            item_id = item_sale.get("item_id")
            if item_id:
                if item_id not in sold_by:
                    sold_by[item_id] = []
                currency_id = item_sale.get("currency_item_id")
                sold_by[item_id].append(
                    {
                        "npc_id": npc_id,
                        "npc_name": npc_name,
                        "npc_faction": npc_faction,
                        "is_faction_vendor": is_faction_vendor,
                        "price": item_sale.get("price", 0),
                        "currency_item_id": currency_id,
                        "currency_item_name": item_name_lookup.get(currency_id)
                        if currency_id
                        else None,
                    }
                )

    return sold_by


def _denormalize_rewarded_by(
    conn: sqlite3.Connection,
) -> dict[str, list[RewardedByInfo]]:
    """Build rewarded_by from quests.rewards.

    Returns:
        Dict mapping item_id to list of quest reward info
    """
    console.print("  Processing quest rewards...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, level_required, level_recommended, rewards, is_adventurer_quest, class_requirements
        FROM quests
        WHERE rewards IS NOT NULL
    """)

    rewarded_by: dict[str, list[RewardedByInfo]] = {}

    for (
        quest_id,
        quest_name,
        level_required,
        level_recommended,
        rewards_json,
        is_adventurer_quest,
        quest_class_requirements_json,
    ) in cursor.fetchall():
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
            if item_id not in rewarded_by:
                rewarded_by[item_id] = []

            # Determine class restrictions by combining quest-level and reward-level
            class_restrictions = None

            if quest_class_requirements:
                # Quest has class requirements - all rewards inherit them
                class_restrictions = sorted(quest_class_requirements)
            elif None not in class_list:
                # No quest-level restrictions, but reward has class-specific variants
                class_restrictions = sorted(set(c for c in class_list if c is not None))

            rewarded_by[item_id].append(
                {
                    "quest_id": quest_id,
                    "quest_name": quest_name,
                    "level_required": level_required,
                    "level_recommended": level_recommended,
                    "is_repeatable": bool(is_adventurer_quest),
                    "class_restrictions": class_restrictions,
                }
            )

    return rewarded_by


def _denormalize_rewarded_by_altars(conn: sqlite3.Connection) -> dict[str, list[dict]]:
    """Build rewarded_by_altars from altars reward tiers.

    Returns:
        Dict mapping item_id to list of altar reward info
    """
    console.print("  Processing altar rewards...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.name, a.type, a.zone_id, z.name,
               a.reward_normal_id, a.reward_magic_id, a.reward_epic_id, a.reward_legendary_id
        FROM altars a
        LEFT JOIN zones z ON a.zone_id = z.id
        WHERE a.reward_normal_id IS NOT NULL OR a.reward_magic_id IS NOT NULL
           OR a.reward_epic_id IS NOT NULL OR a.reward_legendary_id IS NOT NULL
    """)

    rewarded_by_altars: dict[str, list[dict]] = {}

    for (
        altar_id,
        altar_name,
        altar_type,
        zone_id,
        zone_name,
        normal_id,
        magic_id,
        epic_id,
        legendary_id,
    ) in cursor.fetchall():
        # Normal tier (effective level < 35)
        if normal_id:
            if normal_id not in rewarded_by_altars:
                rewarded_by_altars[normal_id] = []
            rewarded_by_altars[normal_id].append(
                {
                    "altar_id": altar_id,
                    "altar_name": altar_name,
                    "reward_tier": "normal",
                    "min_effective_level": 0,
                    "zone_id": zone_id,
                    "zone_name": zone_name if zone_name else zone_id,
                }
            )

        # Magic tier (effective level 35-44)
        if magic_id:
            if magic_id not in rewarded_by_altars:
                rewarded_by_altars[magic_id] = []
            rewarded_by_altars[magic_id].append(
                {
                    "altar_id": altar_id,
                    "altar_name": altar_name,
                    "reward_tier": "magic",
                    "min_effective_level": 35,
                    "zone_id": zone_id,
                    "zone_name": zone_name if zone_name else zone_id,
                }
            )

        # Epic tier (effective level 45-54)
        if epic_id:
            if epic_id not in rewarded_by_altars:
                rewarded_by_altars[epic_id] = []
            rewarded_by_altars[epic_id].append(
                {
                    "altar_id": altar_id,
                    "altar_name": altar_name,
                    "reward_tier": "epic",
                    "min_effective_level": 45,
                    "zone_id": zone_id,
                    "zone_name": zone_name if zone_name else zone_id,
                }
            )

        # Legendary tier (effective level >= 55)
        if legendary_id:
            if legendary_id not in rewarded_by_altars:
                rewarded_by_altars[legendary_id] = []
            rewarded_by_altars[legendary_id].append(
                {
                    "altar_id": altar_id,
                    "altar_name": altar_name,
                    "reward_tier": "legendary",
                    "min_effective_level": 55,
                    "zone_id": zone_id,
                    "zone_name": zone_name if zone_name else zone_id,
                }
            )

    return rewarded_by_altars


def _denormalize_crafted_from(
    conn: sqlite3.Connection,
) -> dict[str, list[CraftedFromInfo]]:
    """Build crafted_from from crafting_recipes.

    Returns:
        Dict mapping item_id to list of recipe info
    """
    console.print("  Processing crafting recipes...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, result_item_id, result_amount, materials
        FROM crafting_recipes
        WHERE result_item_id IS NOT NULL
    """)

    crafted_from: dict[str, list[CraftedFromInfo]] = {}

    for recipe_id, result_item_id, result_amount, materials_json in cursor.fetchall():
        if result_item_id:
            if result_item_id not in crafted_from:
                crafted_from[result_item_id] = []

            # Parse materials and add item names
            materials = json.loads(materials_json) if materials_json else []
            materials_with_names: list[MaterialInfo] = []
            for material in materials:
                material_id = material.get("item_id")
                amount = material.get("amount", 1)

                # Get item name
                cursor.execute("SELECT name FROM items WHERE id = ?", (material_id,))
                result = cursor.fetchone()
                material_name = result[0] if result else "Unknown"

                materials_with_names.append(
                    {
                        "item_id": material_id,
                        "item_name": material_name,
                        "amount": amount,
                    }
                )

            crafted_from[result_item_id].append(
                {
                    "recipe_id": recipe_id,
                    "result_amount": result_amount,
                    "materials": materials_with_names,
                }
            )

    return crafted_from


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


def run(conn: sqlite3.Connection) -> None:
    """Run all item source denormalizations.

    Updates items table with:
    - dropped_by
    - gathered_from
    - sold_by
    - rewarded_by
    - rewarded_by_altars
    - crafted_from
    - alchemy recipe data
    """
    console.print("Denormalizing item sources...")

    cursor = conn.cursor()

    # Build all source dictionaries
    dropped_by = _denormalize_dropped_by(conn)
    gathered_from = _denormalize_gathered_from(conn)
    sold_by = _denormalize_sold_by(conn)
    rewarded_by = _denormalize_rewarded_by(conn)
    rewarded_by_altars = _denormalize_rewarded_by_altars(conn)
    crafted_from = _denormalize_crafted_from(conn)

    # Update items table
    console.print("  Updating items table with source data...")

    for item_id, drops in dropped_by.items():
        # Sort by drop rate descending (highest first), then by monster name
        drops_sorted = sorted(drops, key=lambda x: (-x["rate"], x["monster_name"]))
        cursor.execute(
            "UPDATE items SET dropped_by = ? WHERE id = ?",
            (json.dumps(drops_sorted), item_id),
        )

    for item_id, gathers in gathered_from.items():
        # Sort by drop rate descending (highest first), then by name
        gathers_sorted = sorted(
            gathers, key=lambda x: (-x["rate"], x["gather_item_name"])
        )
        cursor.execute(
            "UPDATE items SET gathered_from = ? WHERE id = ?",
            (json.dumps(gathers_sorted), item_id),
        )

    for item_id, vendors in sold_by.items():
        # Sort by NPC name alphabetically
        vendors_sorted = sorted(vendors, key=lambda x: x["npc_name"])
        cursor.execute(
            "UPDATE items SET sold_by = ? WHERE id = ?",
            (json.dumps(vendors_sorted), item_id),
        )

    for item_id, quests in rewarded_by.items():
        # Sort by quest name alphabetically
        quests_sorted = sorted(quests, key=lambda x: x["quest_name"])
        cursor.execute(
            "UPDATE items SET rewarded_by = ? WHERE id = ?",
            (json.dumps(quests_sorted), item_id),
        )

    for item_id, altars in rewarded_by_altars.items():
        # Sort by altar name alphabetically
        altars_sorted = sorted(altars, key=lambda x: x["altar_name"])
        cursor.execute(
            "UPDATE items SET rewarded_by_altars = ? WHERE id = ?",
            (json.dumps(altars_sorted), item_id),
        )

    for item_id, recipes in crafted_from.items():
        cursor.execute(
            "UPDATE items SET crafted_from = ? WHERE id = ?",
            (json.dumps(recipes), item_id),
        )

    # Process alchemy recipes (updates both recipe items and potion items)
    _denormalize_alchemy_recipes(conn)

    conn.commit()

    # Print summary
    console.print(
        f"  [green]OK[/green] Updated {len(dropped_by)} items with monster drops"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(gathered_from)} items with gather sources"
    )
    console.print(f"  [green]OK[/green] Updated {len(sold_by)} items with vendor info")
    console.print(
        f"  [green]OK[/green] Updated {len(rewarded_by)} items as quest rewards"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(rewarded_by_altars)} items rewarded by altars"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(crafted_from)} items with crafting recipes"
    )
