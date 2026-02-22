"""Null out coordinates for entities in excluded zones.

Some zones have no in-game map. For these zones, we null out all
coordinate data so we don't expose map-like information.

Two levels of exclusion:
- EXCLUDED_ZONE_IDS: entire parent zones (matched via zone_id column)
- EXCLUDED_ZONE_TRIGGER_IDS: individual sub-zones (matched via sub_zone_id column)
"""

import sqlite3

from rich.console import Console

console = Console()

# Entire zones without in-game maps - coordinates should not be exposed
# Use parent zone IDs (from zones table), not subzone/trigger IDs
EXCLUDED_ZONE_IDS = ["temple_of_valaark"]

# Individual sub-zones to exclude within otherwise-visible parent zones
EXCLUDED_ZONE_TRIGGER_IDS = ["zone_trigger_the_ember_citadel"]


def _null_by_column(
    cursor: sqlite3.Cursor,
    tables: list[tuple[str, list[str]]],
    id_column: str,
    ids: list[str],
) -> int:
    """Null coordinate columns in tables where id_column matches ids. Returns row count."""
    placeholders = ",".join("?" * len(ids))
    total = 0
    for table, columns in tables:
        set_clause = ", ".join(f"{col} = NULL" for col in columns)
        cursor.execute(
            f"UPDATE {table} SET {set_clause} WHERE {id_column} IN ({placeholders})",
            ids,
        )
        if cursor.rowcount > 0:
            console.print(f"  [green]OK[/green] {table}: {cursor.rowcount} rows")
            total += cursor.rowcount
    return total


# Tables with position columns, keyed by zone_id or sub_zone_id
SPAWN_TABLES: list[tuple[str, list[str]]] = [
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


def run(conn: sqlite3.Connection) -> None:
    """Null coordinates for all entities in excluded zones and sub-zones."""
    console.print("Nulling coordinates for excluded zones...")
    cursor = conn.cursor()
    total_rows = 0

    # --- Zone-level exclusions (by zone_id) ---
    if EXCLUDED_ZONE_IDS:
        total_rows += _null_by_column(
            cursor, SPAWN_TABLES, "zone_id", EXCLUDED_ZONE_IDS
        )

        placeholders = ",".join("?" * len(EXCLUDED_ZONE_IDS))

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

    # --- Sub-zone-level exclusions (by sub_zone_id / from_sub_zone_id / to_sub_zone_id) ---
    if EXCLUDED_ZONE_TRIGGER_IDS:
        # Spawn tables use sub_zone_id (excludes zone_triggers which uses its own id)
        spawn_tables = [t for t in SPAWN_TABLES if t[0] != "zone_triggers"]
        total_rows += _null_by_column(
            cursor, spawn_tables, "sub_zone_id", EXCLUDED_ZONE_TRIGGER_IDS
        )

        # zone_triggers row itself is matched by its own id
        total_rows += _null_by_column(
            cursor,
            [
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
                )
            ],
            "id",
            EXCLUDED_ZONE_TRIGGER_IDS,
        )

        placeholders = ",".join("?" * len(EXCLUDED_ZONE_TRIGGER_IDS))

        # Portals FROM excluded sub-zones - null all coordinates
        cursor.execute(
            f"""
            UPDATE portals
            SET position_x = NULL, position_y = NULL, position_z = NULL,
                destination_x = NULL, destination_y = NULL, destination_z = NULL,
                orientation_x = NULL, orientation_y = NULL, orientation_z = NULL
            WHERE from_sub_zone_id IN ({placeholders})
            """,
            EXCLUDED_ZONE_TRIGGER_IDS,
        )
        if cursor.rowcount > 0:
            console.print(
                f"  [green]OK[/green] portals (from sub-zone): {cursor.rowcount} rows"
            )
            total_rows += cursor.rowcount

        # Portals TO excluded sub-zones - null only destination coordinates
        cursor.execute(
            f"""
            UPDATE portals
            SET destination_x = NULL, destination_y = NULL, destination_z = NULL
            WHERE to_sub_zone_id IN ({placeholders})
            """,
            EXCLUDED_ZONE_TRIGGER_IDS,
        )
        if cursor.rowcount > 0:
            console.print(
                f"  [green]OK[/green] portals (to sub-zone): {cursor.rowcount} rows"
            )
            total_rows += cursor.rowcount

    conn.commit()
    console.print(f"  Nulled coordinates for {total_rows} total rows")
