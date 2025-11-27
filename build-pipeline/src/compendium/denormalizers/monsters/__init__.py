"""Monster denormalizations - updates to the monsters and monster_spawns tables."""

import sqlite3

from compendium.denormalizers.monsters import drops, spawns


def run_all(conn: sqlite3.Connection) -> None:
    """Run all monster denormalizations in dependency order.

    Args:
        conn: Database connection with all base data loaded
    """
    # Infer spawn entries for placeholder monsters
    spawns.run(conn)

    # Denormalize monster drops (add item names, fragment drops)
    drops.run(conn)
