"""NPC relations denormalization.

This module denormalizes NPC data by:
1. Adding quest names/levels to quests_offered JSON
2. Adding item names to items_sold and drops JSON
3. Adding skill names to skill_ids JSON
4. Adding quests_completed_here (quests that end at this NPC)
"""

import json
import sqlite3

from rich.console import Console

console = Console()


def _denormalize_quests_offered(conn: sqlite3.Connection) -> int:
    """Add quest names and levels to quests_offered JSON.

    The raw quests_offered is just an array of quest IDs. This expands it to
    include quest names, required level, and recommended level for display.

    Returns:
        Count of NPCs updated
    """
    console.print("  Adding quest info to quests_offered...")
    cursor = conn.cursor()

    # Get all NPCs with quests_offered
    cursor.execute(
        "SELECT id, quests_offered FROM npcs WHERE quests_offered IS NOT NULL"
    )
    npcs = cursor.fetchall()

    # Build reputation tier lookup for faction requirements
    cursor.execute(
        "SELECT name, min_value FROM reputation_tiers ORDER BY min_value DESC"
    )
    rep_tiers = [(row[0], row[1]) for row in cursor.fetchall()]

    def get_tier_name(value: float) -> str:
        for name, min_val in rep_tiers:
            if min_val is not None and value >= min_val:
                return name
        return "Neutral"

    # Build quest lookup
    cursor.execute(
        """SELECT id, name, level_required, level_recommended,
                  is_adventurer_quest, is_main_quest, is_epic_quest,
                  display_type, race_requirements, class_requirements,
                  faction_requirements
           FROM quests"""
    )
    quest_info = {}
    for row in cursor.fetchall():
        info: dict = {
            "id": row[0],
            "name": row[1],
            "level_required": row[2],
            "level_recommended": row[3],
            "is_adventurer_quest": bool(row[4]),
            "is_main_quest": bool(row[5]),
            "is_epic_quest": bool(row[6]),
            "display_type": row[7],
        }
        # Only include non-empty requirements
        if row[8] and row[8] != "[]":
            info["race_requirements"] = json.loads(row[8])
        if row[9] and row[9] != "[]":
            info["class_requirements"] = json.loads(row[9])
        if row[10] and row[10] != "[]":
            faction_reqs = json.loads(row[10])
            # Add tier name to each faction requirement
            for fr in faction_reqs:
                fr["tier_name"] = get_tier_name(fr["faction_value"])
            info["faction_requirements"] = faction_reqs
        quest_info[row[0]] = info

    updated_count = 0

    for npc_id, quests_json in npcs:
        if not quests_json:
            continue

        quest_ids = json.loads(quests_json)
        if not quest_ids:
            continue

        # Expand quest IDs to full quest info (skip deleted quests)
        expanded_quests = []
        for quest_id in quest_ids:
            if quest_id in quest_info:
                expanded_quests.append(quest_info[quest_id])

        # Always update - set to expanded list or NULL if all quests were deleted
        if expanded_quests:
            cursor.execute(
                "UPDATE npcs SET quests_offered = ? WHERE id = ?",
                (json.dumps(expanded_quests), npc_id),
            )
            updated_count += 1
        else:
            cursor.execute(
                "UPDATE npcs SET quests_offered = NULL WHERE id = ?",
                (npc_id,),
            )

    return updated_count


def _denormalize_items_sold(conn: sqlite3.Connection) -> int:
    """Add item names to items_sold JSON.

    The raw items_sold contains item_id, price, currency_item_id. This adds
    item_name, quality, tooltip_html, currency_item_name, and faction requirements.

    Returns:
        Count of NPCs updated
    """
    console.print("  Adding item info to items_sold...")
    cursor = conn.cursor()

    # Get all NPCs with items_sold
    cursor.execute("SELECT id, items_sold FROM npcs WHERE items_sold IS NOT NULL")
    npcs = cursor.fetchall()

    # Build item lookup
    cursor.execute("""
        SELECT id, name, quality, tooltip_html,
               faction_required_to_buy, faction_required_tier_name
        FROM items
    """)
    item_info = {
        row[0]: {
            "name": row[1],
            "quality": row[2],
            "tooltip_html": row[3],
            "faction_required": row[4],
            "faction_tier_name": row[5],
        }
        for row in cursor.fetchall()
    }

    updated_count = 0

    for npc_id, items_json in npcs:
        if not items_json:
            continue

        items = json.loads(items_json)
        if not items:
            continue

        # Expand item info
        expanded_items = []
        for item in items:
            item_id = item.get("item_id")
            currency_id = item.get("currency_item_id")

            info = item_info.get(item_id, {})
            currency_info = item_info.get(currency_id, {}) if currency_id else {}

            expanded_items.append(
                {
                    "item_id": item_id,
                    "item_name": info.get("name", "Unknown"),
                    "quality": info.get("quality", 0),
                    "tooltip_html": info.get("tooltip_html"),
                    "price": item.get("price", 0),
                    "currency_item_id": currency_id,
                    "currency_item_name": currency_info.get("name")
                    if currency_id
                    else None,
                    "faction_required": info.get("faction_required", 0),
                    "faction_tier_name": info.get("faction_tier_name"),
                }
            )

        cursor.execute(
            "UPDATE npcs SET items_sold = ? WHERE id = ?",
            (json.dumps(expanded_items), npc_id),
        )
        updated_count += 1

    return updated_count


def _denormalize_drops(conn: sqlite3.Connection) -> int:
    """Add item names to NPC drops JSON.

    Returns:
        Count of NPCs updated
    """
    console.print("  Adding item info to NPC drops...")
    cursor = conn.cursor()

    # Get all NPCs with drops
    cursor.execute("SELECT id, drops FROM npcs WHERE drops IS NOT NULL")
    npcs = cursor.fetchall()

    # Build item lookup
    cursor.execute("SELECT id, name, quality, tooltip_html FROM items")
    item_info = {
        row[0]: {"name": row[1], "quality": row[2], "tooltip_html": row[3]}
        for row in cursor.fetchall()
    }

    updated_count = 0

    for npc_id, drops_json in npcs:
        if not drops_json:
            continue

        drops = json.loads(drops_json)
        if not drops:
            continue

        # Expand drop info
        expanded_drops = []
        for drop in drops:
            item_id = drop.get("item_id")
            info = item_info.get(item_id, {})

            expanded_drops.append(
                {
                    "item_id": item_id,
                    "item_name": info.get("name", "Unknown"),
                    "quality": info.get("quality", 0),
                    "tooltip_html": info.get("tooltip_html"),
                    "rate": drop.get("rate", 0),
                }
            )

        cursor.execute(
            "UPDATE npcs SET drops = ? WHERE id = ?",
            (json.dumps(expanded_drops), npc_id),
        )
        updated_count += 1

    return updated_count


def _denormalize_skills(conn: sqlite3.Connection) -> int:
    """Add skill names to skill_ids, converting to skills JSON.

    The raw skill_ids is just an array of skill IDs. This expands it to
    include skill names for display.

    Returns:
        Count of NPCs updated
    """
    console.print("  Adding skill info to NPC skills...")
    cursor = conn.cursor()

    # Get all NPCs with skill_ids
    cursor.execute("SELECT id, skill_ids FROM npcs WHERE skill_ids IS NOT NULL")
    npcs = cursor.fetchall()

    # Build skill lookup
    cursor.execute("SELECT id, name FROM skills")
    skill_info = {row[0]: {"id": row[0], "name": row[1]} for row in cursor.fetchall()}

    updated_count = 0

    for npc_id, skills_json in npcs:
        if not skills_json:
            continue

        skill_ids = json.loads(skills_json)
        if not skill_ids:
            continue

        # Expand skill IDs to full skill info
        expanded_skills = []
        for skill_id in skill_ids:
            info = skill_info.get(skill_id)
            if info:
                expanded_skills.append(info)

        if expanded_skills:
            cursor.execute(
                "UPDATE npcs SET skill_ids = ? WHERE id = ?",
                (json.dumps(expanded_skills), npc_id),
            )
            updated_count += 1

    return updated_count


def _add_quests_completed_here(conn: sqlite3.Connection) -> int:
    """Add quests_completed_here field with quests that end at each NPC.

    Returns:
        Count of NPCs updated
    """
    console.print("  Adding quests_completed_here...")
    cursor = conn.cursor()

    # Get all quests grouped by their end NPC
    cursor.execute("""
        SELECT end_npc_id, id, name, level_required, level_recommended,
               is_adventurer_quest, is_main_quest, is_epic_quest, display_type,
               race_requirements, class_requirements
        FROM quests
        WHERE end_npc_id IS NOT NULL
        ORDER BY end_npc_id, level_recommended
    """)

    # Group quests by NPC
    npc_quests: dict[str, list[dict]] = {}
    for row in cursor.fetchall():
        npc_id = row[0]
        if npc_id not in npc_quests:
            npc_quests[npc_id] = []
        quest_info: dict = {
            "id": row[1],
            "name": row[2],
            "level_required": row[3],
            "level_recommended": row[4],
            "is_adventurer_quest": bool(row[5]),
            "is_main_quest": bool(row[6]),
            "is_epic_quest": bool(row[7]),
            "display_type": row[8],
        }
        # Only include non-empty requirements
        if row[9] and row[9] != "[]":
            quest_info["race_requirements"] = json.loads(row[9])
        if row[10] and row[10] != "[]":
            quest_info["class_requirements"] = json.loads(row[10])
        npc_quests[npc_id].append(quest_info)

    # Update each NPC
    for npc_id, quests in npc_quests.items():
        cursor.execute(
            "UPDATE npcs SET quests_completed_here = ? WHERE id = ?",
            (json.dumps(quests), npc_id),
        )

    return len(npc_quests)


def _add_renewal_sage_role(conn: sqlite3.Connection) -> int:
    """Add is_renewal_sage to roles JSON for all NPCs.

    NPCs with respawn_dungeon_id > 0 are "Renewal Sages" that can reset all
    monster and boss spawns in their associated dungeon for a gold fee.
    All other NPCs get is_renewal_sage: false for consistency.

    Returns:
        Count of Renewal Sage NPCs
    """
    console.print("  Adding is_renewal_sage to roles...")
    cursor = conn.cursor()

    # Get all NPCs with their respawn_dungeon_id
    cursor.execute("SELECT id, roles, respawn_dungeon_id FROM npcs")
    npcs = cursor.fetchall()

    renewal_sage_count = 0
    for npc_id, roles_json, respawn_dungeon_id in npcs:
        roles = json.loads(roles_json) if roles_json else {}
        is_renewal_sage = respawn_dungeon_id is not None and respawn_dungeon_id > 0
        roles["is_renewal_sage"] = is_renewal_sage

        cursor.execute(
            "UPDATE npcs SET roles = ? WHERE id = ?",
            (json.dumps(roles), npc_id),
        )

        if is_renewal_sage:
            renewal_sage_count += 1

    return renewal_sage_count


def run(conn: sqlite3.Connection) -> None:
    """Run all NPC relations denormalizations."""
    console.print("Denormalizing NPC relations...")

    quests_offered_count = _denormalize_quests_offered(conn)
    items_sold_count = _denormalize_items_sold(conn)
    drops_count = _denormalize_drops(conn)
    skills_count = _denormalize_skills(conn)
    quests_completed_count = _add_quests_completed_here(conn)
    renewal_sage_count = _add_renewal_sage_role(conn)

    conn.commit()

    console.print(
        f"  [green]OK[/green] Expanded quests_offered for {quests_offered_count} NPCs"
    )
    console.print(
        f"  [green]OK[/green] Expanded items_sold for {items_sold_count} NPCs"
    )
    console.print(f"  [green]OK[/green] Expanded drops for {drops_count} NPCs")
    console.print(f"  [green]OK[/green] Expanded skills for {skills_count} NPCs")
    console.print(
        f"  [green]OK[/green] Added quests_completed_here for {quests_completed_count} NPCs"
    )
    console.print(
        f"  [green]OK[/green] Added is_renewal_sage role to {renewal_sage_count} NPCs"
    )
