"""Zone denormalizations.

This module denormalizes zone data by:
1. Computing bounding boxes from entity positions
"""

import sqlite3

from compendium.denormalizers.zones import bounds


def run_all(conn: sqlite3.Connection) -> None:
    """Run all zone denormalizations."""
    bounds.run(conn)
