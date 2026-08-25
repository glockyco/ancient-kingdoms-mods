"""Identify a removed placement by where it stands.

The identifier the exporter writes for a placement ends in the Unity instance
identifier of the object it read. That number is stable for one game build and
different in the next, so recording it makes a patch that edits a zone renumber
every placement in it. Between 0.9.30.0 and 0.9.31.0 the Old Valorath spawn
population gained one row while ninety-eight of ninety-nine keys changed.

A placement is a position. The recorded identity is therefore the identifier
without its runtime number, followed by the position rounded to whole units.
Whole units are unique in the current data: 4572 spawns give 4572 keys, and
they still do at a hundredth of a unit.

Rounding covers the float artefacts of the export, whose coordinates carry up
to eight decimals. It does not cover a monster that walks: the exporter reads
the live actor, so two exports of one build put twelve spawns up to 2.4 units
apart. No recorded placement moves, because Old Valorath holds no wandering
monster, but a redacted zone that gained one would report a difference the
data did not make.

Two rows keep their own identifier. One whose identifier carries no runtime
number already survives a build, as an authored name does. One with no position
has nothing to stand on, which is also what keeps a zone under position
suppression out of this: its coordinates are already gone when the closure
runs, so no suppressed coordinate can reach the ledger.

The identifiers the compendium publishes are untouched. Only the ledger adopts
this identity.
"""

import re
import sqlite3

from compendium.redactions.discovery import geometry_columns

RUNTIME_NUMBER = re.compile(r"_\d+$")

# The columns that hold a row's own point position. Both are declared as
# geometry by the schema, so a new positioned table is covered when it appears.
POSITION = ("position_x", "position_y")


def stem(entity_id: str) -> str:
    """The part of a placement identifier that survives a game build."""
    return RUNTIME_NUMBER.sub("", entity_id)


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
