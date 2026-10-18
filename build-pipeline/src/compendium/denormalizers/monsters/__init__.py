"""Monster denormalizations - updates to the monsters and monster_spawns tables."""

import sqlite3

from compendium.denormalizers.monsters import levels


def run_levels(conn: sqlite3.Connection) -> None:
    """Run monster level range denormalization.

    Populates level_min/level_max from monster_spawns.

    Args:
        conn: Database connection with monsters and monster_spawns loaded
    """
    levels.run(conn)
