"""Skill denormalizations - updates to the skills table."""

import sqlite3

from compendium.denormalizers.skills import sources


def run_all(conn: sqlite3.Connection) -> None:
    """Run all skill denormalizations.

    Args:
        conn: Database connection with all base data loaded
    """
    sources.run(conn)
