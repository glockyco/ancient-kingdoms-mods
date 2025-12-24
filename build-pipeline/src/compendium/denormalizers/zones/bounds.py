"""Zone bounds denormalization.

Computes bounding boxes for each zone from entity positions.
This mirrors the runtime calculation in layers.ts calculateParentZoneBounds().
"""

import sqlite3
from collections import defaultdict

from rich.console import Console

console = Console()

# Padding around entity positions (matches website constant in layers.ts)
BOUNDS_PADDING = 20.0


def run(conn: sqlite3.Connection) -> None:
    """Compute parent zone bounds from all entity positions.

    Aggregates positions from monsters, npcs, portals, chests, altars,
    gathering nodes, and crafting stations to calculate bounding boxes
    for each zone. This eliminates the need for runtime calculation
    in the browser.

    Args:
        conn: Database connection with all entity tables loaded
    """
    console.print("Denormalizing zone bounds from entity positions...")
    cursor = conn.cursor()

    # Collect positions from all entity sources
    # Y coordinates are stored as-is; website negates during rendering
    position_queries = [
        (
            "monster_spawns",
            """
            SELECT zone_id, position_x, position_y
            FROM monster_spawns
            WHERE position_x IS NOT NULL AND position_y IS NOT NULL
        """,
        ),
        (
            "npc_spawns",
            """
            SELECT zone_id, position_x, position_y
            FROM npc_spawns
            WHERE position_x IS NOT NULL AND position_y IS NOT NULL
        """,
        ),
        (
            "portals",
            """
            SELECT from_zone_id, position_x, position_y
            FROM portals
            WHERE position_x IS NOT NULL AND position_y IS NOT NULL
              AND is_template = 0
        """,
        ),
        (
            "chests",
            """
            SELECT zone_id, position_x, position_y
            FROM chests
            WHERE position_x IS NOT NULL AND position_y IS NOT NULL
        """,
        ),
        (
            "altars",
            """
            SELECT zone_id, position_x, position_y
            FROM altars
            WHERE position_x IS NOT NULL AND position_y IS NOT NULL
        """,
        ),
        (
            "gathering_resource_spawns",
            """
            SELECT zone_id, position_x, position_y
            FROM gathering_resource_spawns
            WHERE position_x IS NOT NULL AND position_y IS NOT NULL
        """,
        ),
        (
            "alchemy_tables",
            """
            SELECT zone_id, position_x, position_y
            FROM alchemy_tables
            WHERE position_x IS NOT NULL AND position_y IS NOT NULL
        """,
        ),
        (
            "crafting_stations",
            """
            SELECT zone_id, position_x, position_y
            FROM crafting_stations
            WHERE position_x IS NOT NULL AND position_y IS NOT NULL
        """,
        ),
    ]

    # Aggregate positions by zone_id
    zone_positions: dict[str, list[tuple[float, float]]] = defaultdict(list)
    total_positions = 0

    for table_name, query in position_queries:
        cursor.execute(query)
        for zone_id, x, y in cursor.fetchall():
            zone_positions[zone_id].append((x, y))
            total_positions += 1

    # Compute bounds for each zone
    updated_count = 0
    for zone_id, positions in zone_positions.items():
        if not positions:
            continue

        xs = [p[0] for p in positions]
        ys = [p[1] for p in positions]

        min_x = min(xs) - BOUNDS_PADDING
        max_x = max(xs) + BOUNDS_PADDING
        min_y = min(ys) - BOUNDS_PADDING
        max_y = max(ys) + BOUNDS_PADDING

        cursor.execute(
            """
            UPDATE zones
            SET bounds_min_x = ?, bounds_min_y = ?, bounds_max_x = ?, bounds_max_y = ?
            WHERE id = ?
            """,
            (min_x, min_y, max_x, max_y, zone_id),
        )
        if cursor.rowcount > 0:
            updated_count += 1

    conn.commit()
    console.print(
        f"  [green]OK[/green] Computed bounds for {updated_count} zones "
        f"(from {total_positions:,} entity positions)"
    )
