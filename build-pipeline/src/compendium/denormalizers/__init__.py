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
    # Phase 1: Monster drops (expand altar variants before item sources read drops)
    monsters.run_drops(conn)

    # Phase 2: Item denormalizations (reads monster drops for dropped_by)
    items.run_all(conn)

    # Phase 3: Skill denormalizations
    skills.run_all(conn)

    # Phase 4: Monster spawn inference
    monsters.run_spawns(conn)

    # Phase 5: Experience calculations (pre-compute EXP values)
    experience.run_all(conn)
