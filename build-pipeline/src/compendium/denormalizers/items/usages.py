"""Item usage denormalizations - what items are used for.

This module handles all denormalizations that populate "usage" fields on items:
- used_in_recipes: Which recipes use this item as a material
- needed_for_quests: Which quests require this item
- used_as_currency_for: Which items can be purchased with this currency
- required_for_altars: Which altars require this item for activation
- required_for_portals: Which portals require this item
- opens_chests: Which chests this key opens
"""

import json
import sqlite3

from rich.console import Console

from compendium.types.denormalized import NeededForQuestInfo, UsedInRecipeInfo

console = Console()


def _denormalize_used_in_recipes(
    conn: sqlite3.Connection,
) -> dict[str, list[UsedInRecipeInfo]]:
    """Build used_in_recipes from crafting and alchemy recipe materials.

    Returns:
        Dict mapping item_id to list of recipe usage info
    """
    console.print("  Processing recipe materials...")
    cursor = conn.cursor()

    used_in_recipes: dict[str, list[UsedInRecipeInfo]] = {}

    # Process crafting recipes
    cursor.execute("""
        SELECT cr.id, cr.result_item_id, i.name, cr.materials
        FROM crafting_recipes cr
        LEFT JOIN items i ON cr.result_item_id = i.id
        WHERE cr.materials IS NOT NULL AND cr.materials != '[]'
    """)

    for (
        recipe_id,
        result_item_id,
        result_item_name,
        materials_json,
    ) in cursor.fetchall():
        materials = json.loads(materials_json)
        for material in materials:
            item_id = material.get("item_id")
            if item_id:
                if item_id not in used_in_recipes:
                    used_in_recipes[item_id] = []
                used_in_recipes[item_id].append(
                    {
                        "recipe_id": recipe_id,
                        "result_item_id": result_item_id,
                        "result_item_name": result_item_name or "Unknown",
                        "amount": material.get("amount", 1),
                    }
                )

    # Process alchemy recipes
    cursor.execute("""
        SELECT ar.id, ar.result_item_id, i.name, ar.materials
        FROM alchemy_recipes ar
        LEFT JOIN items i ON ar.result_item_id = i.id
        WHERE ar.materials IS NOT NULL AND ar.materials != '[]'
    """)

    for (
        recipe_id,
        result_item_id,
        result_item_name,
        materials_json,
    ) in cursor.fetchall():
        materials = json.loads(materials_json)
        for material in materials:
            item_id = material.get("item_id")
            if item_id:
                if item_id not in used_in_recipes:
                    used_in_recipes[item_id] = []
                used_in_recipes[item_id].append(
                    {
                        "recipe_id": recipe_id,
                        "result_item_id": result_item_id,
                        "result_item_name": result_item_name or "Unknown",
                        "amount": material.get("amount", 1),
                    }
                )

    return used_in_recipes


def _denormalize_needed_for_quests(
    conn: sqlite3.Connection,
) -> dict[str, list[NeededForQuestInfo]]:
    """Build needed_for_quests from quest objectives.

    Returns:
        Dict mapping item_id to list of quest requirement info
    """
    console.print("  Processing quest item requirements...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, level_required, level_recommended,
               gather_item_1_id, gather_amount_1, gather_item_2_id, gather_amount_2,
               gather_item_3_id, gather_amount_3, gather_items, required_items, equip_items,
               is_adventurer_quest, class_requirements
        FROM quests
    """)

    needed_for_quests: dict[str, list[NeededForQuestInfo]] = {}

    for row in cursor.fetchall():
        quest_id = row[0]
        quest_name = row[1]
        level_required = row[2]
        level_recommended = row[3]
        is_adventurer_quest = row[13]
        class_requirements_json = row[14]

        # Parse class requirements
        if class_requirements_json:
            parsed_class_req = json.loads(class_requirements_json)
            class_restrictions = sorted(parsed_class_req) if parsed_class_req else None
        else:
            class_restrictions = None

        # Process gather_item_1, 2, 3
        if row[4]:  # gather_item_1_id
            item_id = row[4]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "quest_name": quest_name,
                    "level_required": level_required,
                    "level_recommended": level_recommended,
                    "purpose": "gather",
                    "amount": row[5] or 1,  # gather_amount_1
                    "is_repeatable": bool(is_adventurer_quest),
                    "class_restrictions": class_restrictions,
                }
            )

        if row[6]:  # gather_item_2_id
            item_id = row[6]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "quest_name": quest_name,
                    "level_required": level_required,
                    "level_recommended": level_recommended,
                    "purpose": "gather",
                    "amount": row[7] or 1,  # gather_amount_2
                    "is_repeatable": bool(is_adventurer_quest),
                    "class_restrictions": class_restrictions,
                }
            )

        if row[8]:  # gather_item_3_id
            item_id = row[8]
            if item_id not in needed_for_quests:
                needed_for_quests[item_id] = []
            needed_for_quests[item_id].append(
                {
                    "quest_id": quest_id,
                    "quest_name": quest_name,
                    "level_required": level_required,
                    "level_recommended": level_recommended,
                    "purpose": "gather",
                    "amount": row[9] or 1,  # gather_amount_3
                    "is_repeatable": bool(is_adventurer_quest),
                    "class_restrictions": class_restrictions,
                }
            )

        # Process gather_items (JSON array)
        if row[10]:  # gather_items
            gather_items_list = json.loads(row[10])
            for item_obj in gather_items_list:
                item_id = item_obj.get("item_id")
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {
                            "quest_id": quest_id,
                            "quest_name": quest_name,
                            "level_required": level_required,
                            "level_recommended": level_recommended,
                            "purpose": "gather",
                            "amount": item_obj.get("amount", 1),
                            "is_repeatable": bool(is_adventurer_quest),
                            "class_restrictions": class_restrictions,
                        }
                    )

        # Process required_items (JSON array)
        if row[11]:  # required_items
            required_items_list = json.loads(row[11])
            for item_obj in required_items_list:
                item_id = item_obj.get("item_id")
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {
                            "quest_id": quest_id,
                            "quest_name": quest_name,
                            "level_required": level_required,
                            "level_recommended": level_recommended,
                            "purpose": "required",
                            "amount": item_obj.get("amount", 1),
                            "is_repeatable": bool(is_adventurer_quest),
                            "class_restrictions": class_restrictions,
                        }
                    )

        # Process equip_items (JSON array of item IDs)
        if row[12]:  # equip_items
            equip_items_list = json.loads(row[12])
            for item_id in equip_items_list:
                if item_id:
                    if item_id not in needed_for_quests:
                        needed_for_quests[item_id] = []
                    needed_for_quests[item_id].append(
                        {
                            "quest_id": quest_id,
                            "quest_name": quest_name,
                            "level_required": level_required,
                            "level_recommended": level_recommended,
                            "purpose": "equip",
                            "amount": 1,
                            "is_repeatable": bool(is_adventurer_quest),
                            "class_restrictions": class_restrictions,
                        }
                    )

    return needed_for_quests


def _denormalize_used_as_currency_for(
    conn: sqlite3.Connection,
) -> dict[str, list[dict]]:
    """Build used_as_currency_for from items with buy_token_id.

    Only includes items that are actually sold by vendors.

    Returns:
        Dict mapping currency_item_id to list of purchasable items
    """
    console.print("  Processing currency usage...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, buy_token_id, buy_price
        FROM items
        WHERE buy_token_id IS NOT NULL AND buy_token_id != ''
          AND sold_by IS NOT NULL AND sold_by != '[]'
    """)

    used_as_currency_for: dict[str, list[dict]] = {}

    for item_id, item_name, currency_id, price in cursor.fetchall():
        if currency_id not in used_as_currency_for:
            used_as_currency_for[currency_id] = []
        used_as_currency_for[currency_id].append(
            {"item_id": item_id, "item_name": item_name, "price": price}
        )

    return used_as_currency_for


def _denormalize_required_for_altars(conn: sqlite3.Connection) -> dict[str, list[dict]]:
    """Build required_for_altars from altars.required_activation_item_id.

    Returns:
        Dict mapping item_id to list of altar info
    """
    console.print("  Processing altar activation items...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.name, a.required_activation_item_id, a.min_level_required, a.zone_id, z.name
        FROM altars a
        LEFT JOIN zones z ON a.zone_id = z.id
        WHERE a.required_activation_item_id IS NOT NULL
    """)

    required_for_altars: dict[str, list[dict]] = {}

    for (
        altar_id,
        altar_name,
        activation_item_id,
        min_level_required,
        zone_id,
        zone_name,
    ) in cursor.fetchall():
        if activation_item_id not in required_for_altars:
            required_for_altars[activation_item_id] = []
        required_for_altars[activation_item_id].append(
            {
                "altar_id": altar_id,
                "altar_name": altar_name,
                "min_level_required": min_level_required,
                "zone_id": zone_id,
                "zone_name": zone_name if zone_name else zone_id,
            }
        )

    return required_for_altars


def _denormalize_required_for_portals(
    conn: sqlite3.Connection,
) -> dict[str, list[dict]]:
    """Build required_for_portals from portals.required_item_id.

    Returns:
        Dict mapping item_id to list of portal info
    """
    console.print("  Processing portal requirements...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.id, p.required_item_id, p.from_zone_id, z1.name, p.to_zone_id, z2.name,
               p.position_x, p.position_y, p.destination_x, p.destination_y
        FROM portals p
        LEFT JOIN zones z1 ON p.from_zone_id = z1.id
        LEFT JOIN zones z2 ON p.to_zone_id = z2.id
        WHERE p.required_item_id IS NOT NULL
    """)

    required_for_portals: dict[str, list[dict]] = {}

    for (
        portal_id,
        required_item_id,
        from_zone_id,
        from_zone_name,
        to_zone_id,
        to_zone_name,
        position_x,
        position_y,
        destination_x,
        destination_y,
    ) in cursor.fetchall():
        if required_item_id not in required_for_portals:
            required_for_portals[required_item_id] = []
        required_for_portals[required_item_id].append(
            {
                "portal_id": portal_id,
                "from_zone_id": from_zone_id,
                "from_zone_name": from_zone_name if from_zone_name else from_zone_id,
                "to_zone_id": to_zone_id,
                "to_zone_name": to_zone_name if to_zone_name else to_zone_id,
                "position_x": position_x,
                "position_y": position_y,
                "destination_x": destination_x,
                "destination_y": destination_y,
            }
        )

    return required_for_portals


def _denormalize_opens_chests(conn: sqlite3.Connection) -> dict[str, list[dict]]:
    """Build opens_chests from chests.key_required_id.

    Returns:
        Dict mapping key_item_id to list of chest info
    """
    console.print("  Processing key-chest relationships...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.key_required_id, c.id, c.name, c.zone_id, z.name as zone_name,
               c.position_x, c.position_y
        FROM chests c
        LEFT JOIN zones z ON c.zone_id = z.id
        WHERE c.key_required_id IS NOT NULL AND c.key_required_id != ''
        ORDER BY z.name, c.name
    """)

    opens_chests: dict[str, list[dict]] = {}

    for (
        key_id,
        chest_id,
        chest_name,
        zone_id,
        zone_name,
        position_x,
        position_y,
    ) in cursor.fetchall():
        if key_id not in opens_chests:
            opens_chests[key_id] = []

        chest_info = {
            "chest_id": chest_id,
            "chest_name": chest_name,
            "position_x": position_x,
            "position_y": position_y,
        }

        if zone_id:
            chest_info["zone_id"] = zone_id
        if zone_name:
            chest_info["zone_name"] = zone_name

        opens_chests[key_id].append(chest_info)

    return opens_chests


def run(conn: sqlite3.Connection) -> None:
    """Run all item usage denormalizations.

    Updates items table with:
    - used_in_recipes
    - needed_for_quests
    - used_as_currency_for
    - required_for_altars
    - required_for_portals
    - opens_chests
    """
    console.print("Denormalizing item usages...")

    cursor = conn.cursor()

    # Build all usage dictionaries
    used_in_recipes = _denormalize_used_in_recipes(conn)
    needed_for_quests = _denormalize_needed_for_quests(conn)
    used_as_currency_for = _denormalize_used_as_currency_for(conn)
    required_for_altars = _denormalize_required_for_altars(conn)
    required_for_portals = _denormalize_required_for_portals(conn)
    opens_chests = _denormalize_opens_chests(conn)

    # Update items table
    console.print("  Updating items table with usage data...")

    for item_id, recipe_list in used_in_recipes.items():
        # Sort by result item name alphabetically
        recipe_list_sorted = sorted(recipe_list, key=lambda x: x["result_item_name"])
        cursor.execute(
            "UPDATE items SET used_in_recipes = ? WHERE id = ?",
            (json.dumps(recipe_list_sorted), item_id),
        )

    for item_id, quest_list in needed_for_quests.items():
        # Sort by quest name alphabetically
        quest_list_sorted = sorted(quest_list, key=lambda x: x["quest_name"])
        cursor.execute(
            "UPDATE items SET needed_for_quests = ? WHERE id = ?",
            (json.dumps(quest_list_sorted), item_id),
        )

    for currency_id, item_list in used_as_currency_for.items():
        # Sort by item name alphabetically
        item_list_sorted = sorted(item_list, key=lambda x: x["item_name"])
        cursor.execute(
            "UPDATE items SET used_as_currency_for = ? WHERE id = ?",
            (json.dumps(item_list_sorted), currency_id),
        )

    for item_id, altars in required_for_altars.items():
        # Sort by altar name, then by zone name
        altars_sorted = sorted(altars, key=lambda x: (x["altar_name"], x["zone_name"]))
        cursor.execute(
            "UPDATE items SET required_for_altars = ? WHERE id = ?",
            (json.dumps(altars_sorted), item_id),
        )

    for item_id, portals in required_for_portals.items():
        # Sort by from zone name, then to zone name
        portals_sorted = sorted(
            portals, key=lambda x: (x["from_zone_name"], x["to_zone_name"])
        )
        cursor.execute(
            "UPDATE items SET required_for_portals = ? WHERE id = ?",
            (json.dumps(portals_sorted), item_id),
        )

    for key_id, chests in opens_chests.items():
        # Already sorted by zone_name, chest_name in query
        cursor.execute(
            "UPDATE items SET opens_chests = ? WHERE id = ?",
            (json.dumps(chests), key_id),
        )

    conn.commit()

    # Print summary
    console.print(
        f"  [green]OK[/green] Updated {len(used_in_recipes)} items used in recipes"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(needed_for_quests)} items needed for quests"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(used_as_currency_for)} currency items"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(required_for_altars)} items required for altars"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(required_for_portals)} items required for portals"
    )
    console.print(
        f"  [green]OK[/green] Updated {len(opens_chests)} keys with chest info"
    )
