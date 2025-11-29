"""Monster denormalizations - updates to the monsters and monster_spawns tables."""

import sqlite3

from compendium.denormalizers.monsters import drops, spawns


def run_drops(conn: sqlite3.Connection) -> None:
    """Run monster drop denormalizations.

    Must run before item source denormalization since it expands altar
    reward variants that items.sources needs to read.

    Args:
        conn: Database connection with all base data loaded
    """
    drops.run(conn)


def run_spawns(conn: sqlite3.Connection) -> None:
    """Run monster spawn inference.

    Args:
        conn: Database connection with all base data loaded
    """
    spawns.run(conn)
