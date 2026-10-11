"""Identify a removed placement by where it stands.

Placement identifiers end in their whole-unit world coordinates, rounded away
from zero at midpoints with negative zero normalized. The ledger records the
prefix followed by the row's position using its own existing whole-unit
rounding, independent of the published identifier's representation.

Rounding covers float artefacts in exported positions. Monster and NPC
placements use the actor's captured start position rather than its live position.

Rows with authored identifiers keep them. Rows with no position also keep
their identifiers: coordinates suppressed before closure cannot reach the
ledger.
"""

import re
import sqlite3

from compendium.redactions.discovery import geometry_columns

POSITION_SUFFIX = re.compile(r"_-?\d+_-?\d+$")

# The columns that hold a row's own point position. Both are declared as
# geometry by the schema, so a new positioned table is covered when it appears.
POSITION = ("position_x", "position_y")


def stem(entity_id: str) -> str:
    """The prefix before a placement identifier's whole-unit coordinates."""
    return POSITION_SUFFIX.sub("", entity_id)


def _stands_somewhere(conn: sqlite3.Connection, table: str) -> bool:
    """Whether the rows of a table carry their own point position."""
    geometry = geometry_columns(conn, table)
    return all(column in geometry for column in POSITION)


def placements(
    conn: sqlite3.Connection, wanted: dict[str, set[str]]
) -> dict[tuple[str, str], str]:
    """Where each wanted row stands, for the rows that stand anywhere.

    Read before anything deletes the rows. A deleted row has no position.
    """
    found: dict[tuple[str, str], str] = {}
    for table, identifiers in sorted(wanted.items()):
        if not identifiers or not _stands_somewhere(conn, table):
            continue
        placeholders = ",".join("?" * len(identifiers))
        rows = conn.execute(
            f"SELECT id, {POSITION[0]}, {POSITION[1]} FROM {table} "
            f"WHERE id IN ({placeholders})",
            tuple(sorted(identifiers)),
        )
        for entity_id, x, y in rows:
            if x is None or y is None:
                continue
            stable = stem(entity_id)
            if stable == entity_id:
                # An authored identifier already survives a build. Recording
                # where it stands would make moving it churn for no gain.
                continue
            found[(table, entity_id)] = f"{stable}@{round(x)},{round(y)}"
    return found
