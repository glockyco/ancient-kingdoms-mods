"""Quest denormalizations."""

import sqlite3

from compendium.denormalizers.quests import display_type, tooltips


def run_display_type(conn: sqlite3.Connection) -> None:
    """Run display_type denormalization only."""
    display_type.run(conn)


def run_tooltips(conn: sqlite3.Connection) -> None:
    """Run tooltip denormalization only."""
    tooltips.run(conn)


def run_all(conn: sqlite3.Connection) -> None:
    """Run all quest denormalizations."""
    display_type.run(conn)
    tooltips.run(conn)
