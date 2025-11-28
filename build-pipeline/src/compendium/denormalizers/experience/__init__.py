"""Experience denormalizers - compute EXP reward values.

These denormalizers calculate and store pre-computed EXP values for:
- Monsters (base_exp from kill)
- Zones (discovery_exp)
- Gathering resources (gathering_exp)
- Crafting recipes (crafting_exp)
- Alchemy recipes (alchemy_exp)
"""

import sqlite3

from compendium.denormalizers.experience import calculations


def run_all(conn: sqlite3.Connection) -> None:
    """Run all experience denormalizations.

    Args:
        conn: Database connection with base data loaded
    """
    calculations.run(conn)
