"""Experience denormalizers - compute EXP reward values.

These denormalizers calculate and store pre-computed EXP values for:
- Monsters (base_exp from kill)
- Zones (discovery_exp)
- Gathering resources (gathering_exp)
"""

import sqlite3

from compendium.denormalizers.experience import calculations


def run_gathering(conn: sqlite3.Connection) -> None:
    """Capture native gathering XP before required reward targets are withheld."""
    calculations.run_gathering(conn)


def run_all(conn: sqlite3.Connection) -> None:
    """Update monster and discovery experience after redaction.

    Args:
        conn: Database connection with base data loaded
    """
    calculations.run(conn)
