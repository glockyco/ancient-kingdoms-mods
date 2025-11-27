"""Item denormalizations - updates to the items table."""

import sqlite3

from compendium.denormalizers.items import (
    calculations,
    equipment,
    sources,
    special_types,
    tooltips,
    usages,
)


def run_all(conn: sqlite3.Connection) -> None:
    """Run all item denormalizations in dependency order.

    Args:
        conn: Database connection with all base data loaded
    """
    # Phase 1: Where items come from
    sources.run(conn)

    # Phase 2: What items are used for
    usages.run(conn)

    # Phase 3: Equipment-specific (armor sets, buff names)
    equipment.run(conn)

    # Phase 4: Special item types (packs, random, merge, treasure maps, luck tokens)
    special_types.run(conn)

    # Phase 5: Calculated values (depends on other data)
    calculations.run(conn)

    # Phase 6: Tooltips (must be last - needs item_level from calculations)
    tooltips.run(conn)
