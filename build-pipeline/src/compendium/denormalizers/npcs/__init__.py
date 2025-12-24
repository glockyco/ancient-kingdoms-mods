"""NPC denormalizations.

This module denormalizes NPC data by:
1. Adding item/quest/skill names to JSON fields
2. Adding quests_completed_here (quests that end at this NPC)
3. Computing role bitmasks for NPC spawns (GPU filtering)
"""

import sqlite3

from compendium.denormalizers.npcs import bitmask, relations


def run_all(conn: sqlite3.Connection) -> None:
    """Run all NPC denormalizations."""
    relations.run(conn)
    bitmask.run(conn)
