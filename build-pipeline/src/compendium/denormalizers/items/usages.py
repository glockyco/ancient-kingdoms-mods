"""Item usage denormalizations - what items are used for.

This module handles all denormalizations that populate "usage" fields on items:
- used_in_recipes: Which recipes use this item as a material
- needed_for_quests: Which quests require this item
- used_as_currency_for: Which items can be purchased with this currency
- required_for_altars: Which altars require this item for activation
- required_for_portals: Which portals require this item
- opens_chests: Which chests this key opens
"""

from __future__ import annotations

import json
import sqlite3
from typing import TYPE_CHECKING

from rich.console import Console


if TYPE_CHECKING:
    from compendium.redaction import RedactionConfig

console = Console()


def _denormalize_used_in_recipes(
    conn: sqlite3.Connection,
    redactions: RedactionConfig | None = None,
) -> None:
    """Populate item_usages_recipe from crafting and alchemy recipe materials."""
    console.print("  Processing recipe materials...")
    cursor = conn.cursor()

    hide_crafting = redactions.hide_crafting_item_ids if redactions else set()

    # Process crafting recipes
    cursor.execute("""
        SELECT cr.id, cr.result_item_id, cr.materials
        FROM crafting_recipes cr
        WHERE cr.materials IS NOT NULL AND cr.materials != '[]'
    """)

    for recipe_id, result_item_id, materials_json in cursor.fetchall():
        # Skip if this recipe's result has hidden crafting
        if result_item_id in hide_crafting:
            continue

        materials = json.loads(materials_json)
        for material in materials:
            item_id = material.get("item_id")
            if item_id:
                cursor.execute(
                    """
                    INSERT INTO item_usages_recipe (item_id, recipe_id, recipe_type, amount)
                    VALUES (?, ?, 'crafting', ?)
                """,
                    (item_id, recipe_id, material.get("amount", 1)),
                )

    # Process alchemy recipes
    cursor.execute("""
        SELECT ar.id, ar.result_item_id, ar.materials
        FROM alchemy_recipes ar
        WHERE ar.materials IS NOT NULL AND ar.materials != '[]'
    """)

    for recipe_id, result_item_id, materials_json in cursor.fetchall():
        # Skip if this recipe's result has hidden crafting
        if result_item_id in hide_crafting:
            continue

        materials = json.loads(materials_json)
        for material in materials:
            item_id = material.get("item_id")
            if item_id:
                cursor.execute(
                    """
                    INSERT INTO item_usages_recipe (item_id, recipe_id, recipe_type, amount)
                    VALUES (?, ?, 'alchemy', ?)
                """,
                    (item_id, recipe_id, material.get("amount", 1)),
                )


def _denormalize_needed_for_quests(conn: sqlite3.Connection) -> None:
    """Populate item_usages_quest from quest objectives."""
    console.print("  Processing quest item requirements...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, gather_item_1_id, gather_amount_1, gather_item_2_id, gather_amount_2,
               gather_item_3_id, gather_amount_3, gather_items, required_items, equip_items,
               display_type
        FROM quests
    """)

    for row in cursor.fetchall():
        quest_id = row[0]
        display_type = row[10]

        # Process gather_item_1, 2, 3
        for i, (item_idx, amount_idx) in enumerate([(1, 2), (3, 4), (5, 6)]):
            item_id = row[item_idx]
            amount = row[amount_idx] or 1
            if item_id:
                cursor.execute(
                    """
                    INSERT INTO item_usages_quest (item_id, quest_id, purpose, amount)
                    VALUES (?, ?, ?, ?)
                """,
                    (item_id, quest_id, display_type, amount),
                )

        # Process gather_items (JSON array)
        if row[7]:  # gather_items
            gather_items_list = json.loads(row[7])
            for item_obj in gather_items_list:
                item_id = item_obj.get("item_id")
                if item_id:
                    cursor.execute(
                        """
                        INSERT INTO item_usages_quest (item_id, quest_id, purpose, amount)
                        VALUES (?, ?, ?, ?)
                    """,
                        (item_id, quest_id, display_type, item_obj.get("amount", 1)),
                    )

        # Process required_items (JSON array)
        if row[8]:  # required_items
            required_items_list = json.loads(row[8])
            for item_obj in required_items_list:
                item_id = item_obj.get("item_id")
                if item_id:
                    amount = item_obj.get("amount", 1)
                    # amount=0 means "must possess but not consumed" -> Have
                    purpose = "Have" if amount == 0 else display_type
                    cursor.execute(
                        """
                        INSERT INTO item_usages_quest (item_id, quest_id, purpose, amount)
                        VALUES (?, ?, ?, ?)
                    """,
                        (item_id, quest_id, purpose, amount),
                    )

        # Process equip_items (JSON array of item IDs)
        if row[9]:  # equip_items
            equip_items_list = json.loads(row[9])
            for item_id in equip_items_list:
                if item_id:
                    cursor.execute(
                        """
                        INSERT INTO item_usages_quest (item_id, quest_id, purpose, amount)
                        VALUES (?, ?, ?, ?)
                    """,
                        (item_id, quest_id, display_type, 1),
                    )


def _denormalize_used_as_currency_for(conn: sqlite3.Connection) -> None:
    """Populate item_usages_currency from items with buy_token_id."""
    console.print("  Processing currency usage...")
    cursor = conn.cursor()

    # Get items with currency requirements that are actually sold by vendors
    cursor.execute("""
        SELECT i.id, i.buy_token_id, i.buy_price, iv.npc_id
        FROM items i
        JOIN item_sources_vendor iv ON i.id = iv.item_id
        WHERE i.buy_token_id IS NOT NULL AND i.buy_token_id != ''
    """)

    for item_id, currency_id, price, npc_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_usages_currency (currency_item_id, purchasable_item_id, npc_id, price)
            VALUES (?, ?, ?, ?)
        """,
            (currency_id, item_id, npc_id, price),
        )


def _denormalize_required_for_altars(conn: sqlite3.Connection) -> None:
    """Populate item_usages_altar from altars.required_activation_item_id."""
    console.print("  Processing altar activation items...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, required_activation_item_id
        FROM altars
        WHERE required_activation_item_id IS NOT NULL
    """)

    for altar_id, activation_item_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_usages_altar (item_id, altar_id)
            VALUES (?, ?)
        """,
            (activation_item_id, altar_id),
        )


def _denormalize_required_for_portals(conn: sqlite3.Connection) -> None:
    """Populate item_usages_portal from portals.required_item_id."""
    console.print("  Processing portal requirements...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, required_item_id
        FROM portals
        WHERE required_item_id IS NOT NULL
    """)

    for portal_id, required_item_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_usages_portal (item_id, portal_id)
            VALUES (?, ?)
        """,
            (required_item_id, portal_id),
        )


def _denormalize_opens_chests(conn: sqlite3.Connection) -> None:
    """Populate item_usages_chest from chests.key_required_id."""
    console.print("  Processing key-chest relationships...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT key_required_id, id
        FROM chests
        WHERE key_required_id IS NOT NULL AND key_required_id != ''
    """)

    for key_id, chest_id in cursor.fetchall():
        cursor.execute(
            """
            INSERT INTO item_usages_chest (item_id, chest_id)
            VALUES (?, ?)
        """,
            (key_id, chest_id),
        )


def run(conn: sqlite3.Connection, redactions: RedactionConfig | None = None) -> None:
    """Run all item usage denormalizations.

    Populates junction tables instead of JSON columns:
    - item_usages_recipe: Items used as recipe materials
    - item_usages_quest: Items required for quests
    - item_usages_currency: Items used as currency for purchases
    - item_usages_altar: Items required for altar activation
    - item_usages_portal: Items required for portal access
    - item_usages_chest: Items that open chests (keys)

    Args:
        conn: Database connection
        redactions: Optional redaction config for filtering recipes
    """
    console.print("Denormalizing item usages...")

    cursor = conn.cursor()

    # Clear all junction tables first
    console.print("  Clearing junction tables...")
    usage_tables = [
        "item_usages_recipe",
        "item_usages_quest",
        "item_usages_currency",
        "item_usages_altar",
        "item_usages_portal",
        "item_usages_chest",
    ]
    for table in usage_tables:
        cursor.execute(f"DELETE FROM {table}")

    # Populate junction tables
    _denormalize_used_in_recipes(conn, redactions)
    _denormalize_needed_for_quests(conn)
    _denormalize_used_as_currency_for(conn)
    _denormalize_required_for_altars(conn)
    _denormalize_required_for_portals(conn)
    _denormalize_opens_chests(conn)

    conn.commit()

    console.print("  [green]OK[/green] Item usage junction tables populated")
