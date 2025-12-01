"""Denormalization functions for the compendium build pipeline.

Denormalizers transform normalized relational data into denormalized JSON
fields optimized for client-side querying. They are organized by target
entity (the table being updated).

Execution order matters - some denormalizers depend on others having run first.
"""

import sqlite3

from compendium.denormalizers import experience, items, monsters, npcs, quests, skills


def run_all(conn: sqlite3.Connection) -> None:
    """Run all denormalizations in dependency order.

    Args:
        conn: Database connection with all base data loaded
    """
    # Phase 1: Monster drops (expand altar variants before item sources read drops)
    monsters.run_drops(conn)

    # Phase 2: Quest display_type (needed before item usages reads it)
    quests.run_display_type(conn)

    # Phase 3: Item denormalizations (reads monster drops for dropped_by)
    items.run_all(conn)

    # Phase 4: Skill denormalizations
    skills.run_all(conn)

    # Phase 5: Monster spawn inference
    monsters.run_spawns(conn)

    # Phase 6: Experience calculations (pre-compute EXP values)
    experience.run_all(conn)

    # Phase 7: NPC denormalizations (quest/item/skill names, quests_completed_here)
    npcs.run_all(conn)

    # Phase 8: Quest denormalizations (tooltips - display_type already done in Phase 2)
    quests.run_tooltips(conn)
