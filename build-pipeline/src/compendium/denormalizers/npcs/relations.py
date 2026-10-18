"""NPC service-role enrichment."""

import json
import sqlite3

from rich.console import Console

console = Console()


def _add_teleporter_role(conn: sqlite3.Connection) -> int:
    """Add is_teleporter to roles JSON for NPCs that can teleport players.

    NPCs with any spawn that has teleport_zone_id set are teleporters.

    Returns:
        Count of Teleporter NPCs
    """
    console.print("  Adding is_teleporter to roles...")
    cursor = conn.cursor()

    # Get NPCs that have at least one spawn with teleport data
    cursor.execute(
        """
        SELECT DISTINCT npc_id
        FROM npc_spawns
        WHERE teleport_zone_id IS NOT NULL
        """
    )
    teleporter_npc_ids = {row[0] for row in cursor.fetchall()}

    cursor.execute("SELECT id, roles FROM npcs")
    npcs = cursor.fetchall()

    teleporter_count = 0
    for npc_id, roles_json in npcs:
        roles = json.loads(roles_json) if roles_json else {}
        is_teleporter = npc_id in teleporter_npc_ids
        roles["is_teleporter"] = is_teleporter

        cursor.execute(
            "UPDATE npcs SET roles = ? WHERE id = ?",
            (json.dumps(roles), npc_id),
        )

        if is_teleporter:
            teleporter_count += 1

    return teleporter_count


def _add_renewal_sage_role(conn: sqlite3.Connection) -> int:
    """Add is_renewal_sage to roles JSON for all NPCs.

    NPCs with respawn_dungeon_id > 0 are "Renewal Sages" that can reset all
    monster and boss spawns in their associated dungeon for a gold fee.
    All other NPCs get is_renewal_sage: false for consistency.

    Also nulls out respawn_dungeon_id and gold_required_respawn_dungeon for
    non-sages to keep data clean.

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

    # Null out dungeon fields for non-sages
    cursor.execute("""
        UPDATE npcs
        SET respawn_dungeon_id = NULL, gold_required_respawn_dungeon = NULL
        WHERE respawn_dungeon_id = 0 OR respawn_dungeon_id IS NULL
    """)

    return renewal_sage_count


def _add_villager_role(conn: sqlite3.Connection) -> int:
    """Add is_villager to roles JSON for NPCs with no other roles.

    This must run AFTER all other role denormalizations. NPCs with no service
    roles (all role flags false except is_villager itself) are villagers.

    Returns:
        Count of Villager NPCs
    """
    console.print("  Adding is_villager to roles...")
    cursor = conn.cursor()

    # All role keys that indicate a "service" (excludes is_villager itself)
    service_roles = [
        "is_merchant",
        "is_quest_giver",
        "can_repair_equipment",
        "is_bank",
        "is_skill_master",
        "is_veteran_master",
        "is_reset_attributes",
        "is_soul_binder",
        "is_inkeeper",
        "is_taskgiver_adventurer",
        "is_merchant_adventurer",
        "is_recruiter_mercenaries",
        "is_guard",
        "is_faction_vendor",
        "is_essence_trader",
        "is_priestess",
        "is_augmenter",
        "is_guild_management",
        "is_renewal_sage",
        "is_teleporter",
    ]

    cursor.execute("SELECT id, roles FROM npcs")
    npcs = cursor.fetchall()

    villager_count = 0
    for npc_id, roles_json in npcs:
        roles = json.loads(roles_json) if roles_json else {}

        # Check if NPC has any service role
        has_service_role = any(roles.get(role, False) for role in service_roles)
        is_villager = not has_service_role
        roles["is_villager"] = is_villager

        cursor.execute(
            "UPDATE npcs SET roles = ? WHERE id = ?",
            (json.dumps(roles), npc_id),
        )

        if is_villager:
            villager_count += 1

    return villager_count


def run(conn: sqlite3.Connection) -> None:
    """Run all NPC relations denormalizations."""
    console.print("Denormalizing NPC relations...")

    teleporter_count = _add_teleporter_role(conn)
    renewal_sage_count = _add_renewal_sage_role(conn)
    # Must run last - checks if NPC has any other roles
    villager_count = _add_villager_role(conn)

    conn.commit()

    console.print(
        f"  [green]OK[/green] Added is_teleporter role to {teleporter_count} NPCs"
    )
    console.print(
        f"  [green]OK[/green] Added is_renewal_sage role to {renewal_sage_count} NPCs"
    )
    console.print(
        f"  [green]OK[/green] Added is_villager role to {villager_count} NPCs"
    )
