"""Null out coordinates for entities in excluded zones.

Some zones have no in-game map. For these zones, we null out all
coordinate data so we don't expose map-like information.
"""

import sqlite3

from rich.console import Console

console = Console()

# Zones without in-game maps - coordinates should not be exposed
# Use parent zone IDs (from zones table), not subzone/trigger IDs
EXCLUDED_ZONE_IDS = ["temple_of_valaark"]


def run(conn: sqlite3.Connection) -> None:
    """Null coordinates for all entities in excluded zones."""
    console.print("Nulling coordinates for excluded zones...")
    cursor = conn.cursor()

    placeholders = ",".join("?" * len(EXCLUDED_ZONE_IDS))

    # Tables with zone_id column
    tables: list[tuple[str, list[str]]] = [
        ("monster_spawns", ["position_x", "position_y", "position_z"]),
        (
            "npc_spawns",
            [
                "position_x",
                "position_y",
                "position_z",
                "origin_follow_position_x",
                "origin_follow_position_y",
                "origin_follow_position_z",
            ],
        ),
        ("chests", ["position_x", "position_y", "position_z"]),
        ("altars", ["position_x", "position_y", "position_z"]),
        ("gathering_resource_spawns", ["position_x", "position_y", "position_z"]),
        ("crafting_stations", ["position_x", "position_y", "position_z"]),
        ("alchemy_tables", ["position_x", "position_y", "position_z"]),
        ("treasure_locations", ["position_x", "position_y", "position_z"]),
        (
            "zone_triggers",
            [
                "position_x",
                "position_y",
                "position_z",
                "bounds_min_x",
                "bounds_min_y",
                "bounds_max_x",
                "bounds_max_y",
            ],
        ),
    ]

    total_rows = 0
    for table, columns in tables:
        set_clause = ", ".join(f"{col} = NULL" for col in columns)
        cursor.execute(
            f"UPDATE {table} SET {set_clause} WHERE zone_id IN ({placeholders})",
            EXCLUDED_ZONE_IDS,
        )
        if cursor.rowcount > 0:
            console.print(f"  [green]OK[/green] {table}: {cursor.rowcount} rows")
            total_rows += cursor.rowcount

    # Portals FROM excluded zones - null all coordinates
    cursor.execute(
        f"""
        UPDATE portals
        SET position_x = NULL, position_y = NULL, position_z = NULL,
            destination_x = NULL, destination_y = NULL, destination_z = NULL,
            orientation_x = NULL, orientation_y = NULL, orientation_z = NULL
        WHERE from_zone_id IN ({placeholders})
    """,
        EXCLUDED_ZONE_IDS,
    )
    if cursor.rowcount > 0:
        console.print(f"  [green]OK[/green] portals (from): {cursor.rowcount} rows")
        total_rows += cursor.rowcount

    # Portals TO excluded zones - null only destination coordinates
    cursor.execute(
        f"""
        UPDATE portals
        SET destination_x = NULL, destination_y = NULL, destination_z = NULL
        WHERE to_zone_id IN ({placeholders})
    """,
        EXCLUDED_ZONE_IDS,
    )
    if cursor.rowcount > 0:
        console.print(f"  [green]OK[/green] portals (to): {cursor.rowcount} rows")
        total_rows += cursor.rowcount

    conn.commit()
    console.print(f"  Nulled coordinates for {total_rows} total rows")
