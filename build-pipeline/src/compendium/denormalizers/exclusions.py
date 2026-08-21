"""Remove the geometry of a zone that withholds positions from the player.

Some released zones withhold positional information by design. In such a zone
the client closes the live map, refuses teleport items, and returns the player
to the bind point. Published coordinates would disclose what the game denies.
Every entity of the zone stays published, and all of its geometry is removed.

The zones come from configuration and the columns come from the schema. A new
entity type with a position is therefore covered when it appears.

The ``locus`` attribute gives the geometry each reference governs. The closure
reads the same declaration. A portal into a suppressed zone loses its
destination coordinates and keeps its own position.
"""

import json
import sqlite3
from typing import Any

from rich.console import Console

from compendium.redaction import RedactionConfig
from compendium.redactions.discovery import (
    decode,
    geometry_columns,
    numeric_zone_ids,
    resolve_sub_zones,
    strip_geometry,
)
from compendium.redactions.references import Reference, resolve

console = Console()


def _governed(
    conn: sqlite3.Connection, reference: Reference, group: list[Reference]
) -> list[str]:
    """The geometry columns a single zone reference governs."""
    geometry = geometry_columns(conn, reference.table)
    claimed = {
        column
        for other in group
        for column in geometry
        if other.geometry_prefixes and column.startswith(other.geometry_prefixes)
    }
    if reference.locus == "destination":
        return [
            column
            for column in geometry
            if column.startswith(reference.geometry_prefixes)
        ]
    return [column for column in geometry if column not in claimed]


def _suppress_embedded(
    conn: sqlite3.Connection, reference: Reference, wanted: set[Any]
) -> int:
    """Remove coordinates from JSON entries that name a suppressed zone.

    A quest objective carries a zone identifier beside the position it happens
    at, in one value. Emptying the column would discard the objective, so only
    the entry naming the zone loses its position.
    """
    updated = 0
    rows = conn.execute(
        f"SELECT rowid, {reference.column} FROM {reference.table} "
        f"WHERE {reference.column} IS NOT NULL"
    ).fetchall()
    key = reference.json_keys[0]
    for rowid, raw in rows:
        value = decode(raw)
        if not isinstance(value, list):
            continue
        entries = [
            strip_geometry(entry)
            if isinstance(entry, dict) and entry.get(key) in wanted
            else entry
            for entry in value
        ]
        if entries != value:
            conn.execute(
                f"UPDATE {reference.table} SET {reference.column} = ? WHERE rowid = ?",
                (json.dumps(entries), rowid),
            )
            updated += 1
    return updated


def run(conn: sqlite3.Connection, redactions: RedactionConfig) -> None:
    """Remove geometry for every zone configured for position suppression."""
    zone_ids = redactions.suppress_position_zone_ids
    if not zone_ids:
        console.print("  [dim]No zones configured for position suppression[/dim]")
        return

    console.print(
        f"Suppressing positions in {len(zone_ids)} zones: "
        + ", ".join(sorted(zone_ids))
    )

    sub_zone_ids = resolve_sub_zones(conn, zone_ids)
    numeric_ids = numeric_zone_ids(conn, zone_ids)

    references = [r for r in resolve(conn) if r.to_zone]
    by_table: dict[str, list[Reference]] = {}
    for reference in references:
        by_table.setdefault(reference.table, []).append(reference)

    cursor = conn.cursor()
    updates = 0
    embedded = 0
    touched: list[str] = []

    for reference in references:
        if reference.numeric:
            wanted: set[Any] = set(numeric_ids)
        elif reference.to_sub_zone:
            wanted = set(sub_zone_ids)
        else:
            wanted = set(zone_ids)
        if not wanted:
            continue

        if reference.embedded:
            embedded += _suppress_embedded(conn, reference, wanted)
            continue

        governed = _governed(conn, reference, by_table[reference.table])
        if not governed:
            continue

        placeholders = ",".join("?" * len(wanted))
        assignments = ", ".join(f"{column} = NULL" for column in governed)
        cursor.execute(
            f"UPDATE {reference.table} SET {assignments} "
            f"WHERE {reference.column} IN ({placeholders})",
            tuple(sorted(wanted, key=str)),
        )
        if cursor.rowcount > 0:
            updates += cursor.rowcount
            touched.append(
                f"{reference.table} via {reference.column}: {cursor.rowcount}"
            )

    for line in touched:
        console.print(f"  [green]OK[/green] {line}")
    if embedded:
        console.print(f"  [green]OK[/green] embedded geometry: {embedded} values")

    conn.commit()
    console.print(
        f"  Removed geometry in {updates} column updates and {embedded} JSON values"
    )
