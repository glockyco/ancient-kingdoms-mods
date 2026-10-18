"""Item denormalizations - updates to the items table."""

import sqlite3

from compendium.denormalizers.items import (
    calculations,
    equipment,
    special_types,
    tooltips,
)


def run_all(conn: sqlite3.Connection) -> None:
    """Update item display fields from published canonical facts."""
    # Equipment-specific display metadata is independent of acquisition.
    equipment.run(conn)

    # Fatecharm display metadata.
    special_types.run(conn)

    # Phase 6: Calculated values (depends on other data)
    calculations.run(conn)

    # Phase 7: Tooltips (must be last - needs item_level from calculations)
    tooltips.run(conn)
