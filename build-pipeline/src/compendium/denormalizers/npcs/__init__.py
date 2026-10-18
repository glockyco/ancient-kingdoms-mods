"""NPC service flags and map role bitmasks."""

import sqlite3

from compendium.denormalizers.npcs import bitmask, relations


def run_all(conn: sqlite3.Connection) -> None:
    """Run all NPC denormalizations."""
    relations.run(conn)
    bitmask.run(conn)
