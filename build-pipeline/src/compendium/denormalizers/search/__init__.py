"""Search-related denormalizers."""

import sqlite3

from compendium.denormalizers.search import keywords


def run_all(conn: sqlite3.Connection) -> None:
    """Run all search denormalizers."""
    keywords.run(conn)
