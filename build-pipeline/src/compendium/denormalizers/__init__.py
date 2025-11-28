"""Denormalization functions for the compendium build pipeline.

Denormalizers transform normalized relational data into denormalized JSON
fields optimized for client-side querying. They are organized by target
entity (the table being updated).

Execution order matters - some denormalizers depend on others having run first.
"""

import sqlite3

from compendium.denormalizers import experience, items, monsters, skills


def run_all(conn: sqlite3.Connection) -> None:
    """Run all denormalizations in dependency order.

    Args:
        conn: Database connection with all base data loaded
    """
    # Phase 1: Item denormalizations
    items.run_all(conn)

    # Phase 2: Skill denormalizations
    skills.run_all(conn)

    # Phase 3: Monster denormalizations (spawn inference)
    monsters.run_all(conn)

    # Phase 4: Experience calculations (pre-compute EXP values)
    experience.run_all(conn)
