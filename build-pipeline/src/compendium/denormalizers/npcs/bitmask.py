"""NPC role bitmask denormalization.

Computes a bitmask of NPC roles for each spawn, enabling GPU-based filtering
on the map without JSON parsing or conditional chains.
"""

import json
import sqlite3

from rich.console import Console

console = Console()

# Bit positions for each role (must match website NPC_ROLE_BITS constants)
ROLE_BITS = {
    "is_merchant": 0,
    "is_quest_giver": 1,
    "can_repair_equipment": 2,
    "is_bank": 3,
    "is_inkeeper": 4,
    "is_soul_binder": 5,
    "is_skill_master": 6,
    "is_veteran_master": 7,
    "is_reset_attributes": 8,
    "is_faction_vendor": 9,
    "is_essence_trader": 10,
    "is_augmenter": 11,
    "is_priestess": 12,
    "is_renewal_sage": 13,
    "is_taskgiver_adventurer": 14,
    "is_merchant_adventurer": 15,
    "is_recruiter_mercenaries": 16,
    "is_guard": 17,
}


def _compute_role_bitmask(roles: dict) -> int:
    """Compute bitmask from roles JSON object."""
    bitmask = 0
    for role_name, bit_position in ROLE_BITS.items():
        if roles.get(role_name, False):
            bitmask |= 1 << bit_position
    return bitmask


def run(conn: sqlite3.Connection) -> None:
    """Compute role bitmasks for all NPC spawns.

    Reads the roles JSON from the parent NPC and computes a bitmask for each
    spawn, enabling efficient GPU-based filtering on the map.

    Args:
        conn: Database connection with npcs and npc_spawns loaded
    """
    console.print("Denormalizing NPC role bitmasks...")
    cursor = conn.cursor()

    cursor.execute("""
        SELECT ns.id, n.roles
        FROM npc_spawns ns
        JOIN npcs n ON n.id = ns.npc_id
    """)
    spawns = cursor.fetchall()

    updated_count = 0
    nonzero_count = 0
    for spawn_id, roles_json in spawns:
        roles = json.loads(roles_json) if roles_json else {}
        bitmask = _compute_role_bitmask(roles)

        cursor.execute(
            "UPDATE npc_spawns SET role_bitmask = ? WHERE id = ?",
            (bitmask, spawn_id),
        )
        updated_count += 1
        if bitmask > 0:
            nonzero_count += 1

    conn.commit()
    console.print(
        f"  [green]OK[/green] Computed role bitmasks for {updated_count} NPC spawns "
        f"({nonzero_count} with roles)"
    )
