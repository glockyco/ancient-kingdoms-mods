"""Equipment denormalizations - armor sets and buff names.

This module handles equipment-specific denormalizations:
- Armor set data propagation from augments to armor pieces
- Skill and member name lookups for armor sets
- Buff names for potions, food, relics, scrolls, weapon procs
- Faction tier names
- Fragment and pack result names
"""

import json
import sqlite3

from rich.console import Console

console = Console()


def _denormalize_armor_sets(conn: sqlite3.Connection) -> tuple[int, int]:
    """Denormalize armor set data from augment items to armor pieces.

    Returns:
        Tuple of (augment_items_updated, armor_pieces_updated)
    """
    console.print("  Denormalizing armor set data...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, augment_skill_bonuses, augment_armor_set_item_ids, augment_armor_set_name, stats
        FROM items
        WHERE item_type = 'augment' AND augment_skill_bonuses IS NOT NULL
    """)

    # Build mapping of augment item name -> (augment_id, skill bonuses, set item IDs, set name, attribute bonuses)
    # Armor pieces reference augments by their name field, not ID
    set_data: dict[str, tuple[str, str, str, str, str | None]] = {}
    augment_items_updated = 0

    for (
        augment_id,
        augment_name,
        skill_bonuses_json,
        set_item_ids_json,
        set_name,
        stats_json,
    ) in cursor.fetchall():
        # Extract attribute bonuses from stats
        attribute_bonuses = []
        if stats_json:
            try:
                stats = json.loads(stats_json)
                attributes = {
                    "strength": "Strength",
                    "dexterity": "Dexterity",
                    "constitution": "Constitution",
                    "intelligence": "Intelligence",
                    "wisdom": "Wisdom",
                    "charisma": "Charisma",
                }
                for attr_key, attr_name in attributes.items():
                    value = stats.get(attr_key, 0)
                    if value > 0:
                        attribute_bonuses.append(
                            {"attribute": attr_name, "bonus": value}
                        )
            except json.JSONDecodeError:
                pass

        attribute_bonuses_json = (
            json.dumps(attribute_bonuses) if attribute_bonuses else None
        )
        set_data[augment_name] = (
            augment_id,
            skill_bonuses_json,
            set_item_ids_json,
            set_name,
            attribute_bonuses_json,
        )

        # Also update the augment item itself with attribute bonuses
        if attribute_bonuses_json:
            cursor.execute(
                """UPDATE items
                   SET augment_attribute_bonuses = ?
                   WHERE id = ?""",
                (attribute_bonuses_json, augment_id),
            )
            augment_items_updated += 1

    # Find all items with augment_bonus_set in stats and copy the set data
    cursor.execute("SELECT id, stats FROM items WHERE stats IS NOT NULL")
    update_count = 0

    for item_id, stats_json in cursor.fetchall():
        try:
            stats = json.loads(stats_json)
            augment_set_name = stats.get("augment_bonus_set")

            if augment_set_name and augment_set_name in set_data:
                (
                    augment_id,
                    skill_bonuses,
                    set_item_ids,
                    set_name,
                    attribute_bonuses_json_data,
                ) = set_data[augment_set_name]
                # Copy augment ID, skill bonuses, set member IDs, set name, and attribute bonuses to this item
                cursor.execute(
                    """UPDATE items
                       SET augment_armor_set_id = ?,
                           augment_skill_bonuses = ?,
                           augment_armor_set_item_ids = ?,
                           augment_armor_set_name = ?,
                           augment_attribute_bonuses = ?
                       WHERE id = ?""",
                    (
                        augment_id,
                        skill_bonuses,
                        set_item_ids,
                        set_name,
                        attribute_bonuses_json_data,
                        item_id,
                    ),
                )
                update_count += 1
        except (json.JSONDecodeError, KeyError):
            pass

    return augment_items_updated, update_count


def _denormalize_armor_set_names(conn: sqlite3.Connection) -> tuple[int, int]:
    """Denormalize skill names and item names in armor sets.

    Returns:
        Tuple of (skill_bonuses_updated, set_members_updated)
    """
    console.print("  Denormalizing armor set skill and item names...")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, augment_skill_bonuses, augment_armor_set_item_ids
        FROM items
        WHERE augment_skill_bonuses IS NOT NULL OR augment_armor_set_item_ids IS NOT NULL
    """)

    skill_bonuses_updated = 0
    set_members_updated = 0

    for item_id, skill_bonuses_json, set_item_ids_json in cursor.fetchall():
        # Denormalize skill bonuses with skill names
        if skill_bonuses_json:
            try:
                skill_bonuses = json.loads(skill_bonuses_json)
                skill_bonuses_with_names = []

                for bonus in skill_bonuses:
                    skill_id = bonus.get("skill_id")
                    level_bonus = bonus.get("level_bonus", 0)

                    if skill_id:
                        skill_name_cursor = conn.cursor()
                        skill_result = skill_name_cursor.execute(
                            "SELECT name FROM skills WHERE id = ?", (skill_id,)
                        ).fetchone()
                        skill_name = (
                            skill_result[0]
                            if skill_result
                            else skill_id.replace("_", " ").title()
                        )

                        skill_bonuses_with_names.append(
                            {
                                "skill_id": skill_id,
                                "skill_name": skill_name,
                                "level_bonus": level_bonus,
                            }
                        )

                if skill_bonuses_with_names:
                    update_skill_cursor = conn.cursor()
                    update_skill_cursor.execute(
                        """
                        UPDATE items
                        SET augment_skill_bonuses_with_names = ?
                        WHERE id = ?
                    """,
                        (json.dumps(skill_bonuses_with_names), item_id),
                    )
                    if update_skill_cursor.rowcount > 0:
                        skill_bonuses_updated += 1
            except (json.JSONDecodeError, KeyError):
                pass

        # Denormalize armor set members with item names
        if set_item_ids_json:
            try:
                set_item_ids = json.loads(set_item_ids_json)
                set_members_with_names = []

                for member_id in set_item_ids:
                    if member_id:
                        member_name_cursor = conn.cursor()
                        member_result = member_name_cursor.execute(
                            "SELECT name FROM items WHERE id = ?", (member_id,)
                        ).fetchone()
                        member_name = (
                            member_result[0]
                            if member_result
                            else member_id.replace("_", " ").title()
                        )

                        set_members_with_names.append(
                            {"item_id": member_id, "item_name": member_name}
                        )

                if set_members_with_names:
                    update_members_cursor = conn.cursor()
                    update_members_cursor.execute(
                        """
                        UPDATE items
                        SET augment_armor_set_members = ?
                        WHERE id = ?
                    """,
                        (json.dumps(set_members_with_names), item_id),
                    )
                    if update_members_cursor.rowcount > 0:
                        set_members_updated += 1
            except (json.JSONDecodeError, KeyError):
                pass

    return skill_bonuses_updated, set_members_updated


def _denormalize_buff_names(conn: sqlite3.Connection) -> dict[str, int]:
    """Denormalize buff names from skills table.

    Returns:
        Dict mapping buff type to count of updated items
    """
    console.print("  Denormalizing buff names...")
    cursor = conn.cursor()
    counts = {}

    cursor.execute("""
        UPDATE items
        SET potion_buff_name = (SELECT name FROM skills WHERE skills.id = items.potion_buff_id)
        WHERE potion_buff_id IS NOT NULL
    """)
    counts["potion"] = cursor.rowcount

    cursor.execute("""
        UPDATE items
        SET food_buff_name = (SELECT name FROM skills WHERE skills.id = items.food_buff_id)
        WHERE food_buff_id IS NOT NULL
    """)
    counts["food"] = cursor.rowcount

    cursor.execute("""
        UPDATE items
        SET relic_buff_name = (SELECT name FROM skills WHERE skills.id = items.relic_buff_id)
        WHERE relic_buff_id IS NOT NULL
    """)
    counts["relic"] = cursor.rowcount

    cursor.execute("""
        UPDATE items
        SET scroll_skill_name = (SELECT name FROM skills WHERE skills.id = items.scroll_skill_id)
        WHERE scroll_skill_id IS NOT NULL
    """)
    counts["scroll"] = cursor.rowcount

    cursor.execute("""
        UPDATE items
        SET weapon_proc_effect_name = (SELECT name FROM skills WHERE skills.id = items.weapon_proc_effect_id)
        WHERE weapon_proc_effect_id IS NOT NULL
    """)
    counts["weapon_proc"] = cursor.rowcount

    return counts


def _denormalize_result_names(conn: sqlite3.Connection) -> dict[str, int]:
    """Denormalize fragment and pack result item names.

    Returns:
        Dict mapping result type to count of updated items
    """
    console.print("  Denormalizing result item names...")
    cursor = conn.cursor()
    counts = {}

    cursor.execute("""
        UPDATE items
        SET fragment_result_item_name = (SELECT name FROM items AS i WHERE i.id = items.fragment_result_item_id)
        WHERE fragment_result_item_id IS NOT NULL
    """)
    counts["fragment"] = cursor.rowcount

    cursor.execute("""
        UPDATE items
        SET pack_final_item_name = (SELECT name FROM items AS i WHERE i.id = items.pack_final_item_id)
        WHERE pack_final_item_id IS NOT NULL
    """)
    counts["pack"] = cursor.rowcount

    return counts


def _denormalize_faction_tier_names(conn: sqlite3.Connection) -> int:
    """Denormalize faction required tier name from reputation_tiers.

    Returns:
        Count of updated items
    """
    console.print("  Denormalizing faction reputation tier names...")
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE items
        SET faction_required_tier_name = (
            SELECT name FROM reputation_tiers
            WHERE reputation_tiers.min_value <= items.faction_required_to_buy
            ORDER BY reputation_tiers.min_value DESC
            LIMIT 1
        )
        WHERE faction_required_to_buy > 0
    """)
    return cursor.rowcount


def run(conn: sqlite3.Connection) -> None:
    """Run all equipment denormalizations.

    Updates items table with:
    - Armor set data (augment_armor_set_id, augment_skill_bonuses, etc.)
    - Skill and member names for armor sets
    - Buff names (potion, food, relic, scroll, weapon proc)
    - Fragment and pack result names
    - Faction tier names
    """
    console.print("Denormalizing equipment data...")

    # Armor sets
    augment_updated, armor_updated = _denormalize_armor_sets(conn)
    skill_names_updated, member_names_updated = _denormalize_armor_set_names(conn)

    # Buff names
    buff_counts = _denormalize_buff_names(conn)

    # Result names
    result_counts = _denormalize_result_names(conn)

    # Faction tiers
    faction_updated = _denormalize_faction_tier_names(conn)

    conn.commit()

    # Print summary
    console.print(
        f"  [green]OK[/green] Updated {augment_updated} augment items with attribute bonuses"
    )
    console.print(
        f"  [green]OK[/green] Updated {armor_updated} armor pieces with set data"
    )
    console.print(
        f"  [green]OK[/green] Denormalized {skill_names_updated} armor sets with skill names, "
        f"{member_names_updated} armor sets with member names"
    )
    console.print(
        f"  [green]OK[/green] Updated {buff_counts['potion']} potion buffs, "
        f"{buff_counts['food']} food buffs, {buff_counts['relic']} relic buffs, "
        f"{buff_counts['scroll']} scroll skills, {buff_counts['weapon_proc']} weapon procs"
    )
    console.print(
        f"  [green]OK[/green] Updated {result_counts['fragment']} fragment results, "
        f"{result_counts['pack']} pack results"
    )
    console.print(
        f"  [green]OK[/green] Updated {faction_updated} items with faction tier names"
    )
