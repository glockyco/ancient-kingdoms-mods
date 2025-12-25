"""Zone level range denormalization.

Computes level_min and level_max from monster spawns for each zone.
Excludes critters from level calculations unless the zone only has critters.
"""

import sqlite3

from rich.console import Console

console = Console()


def run(conn: sqlite3.Connection) -> None:
    """Compute zone level ranges from monster spawn levels.

    For each zone, calculates the min/max level across all spawns.
    Excludes critters (type_name='Critter') from the calculation,
    falling back to include critters only if no other monsters exist.

    Args:
        conn: Database connection with monster_spawns and monsters loaded
    """
    console.print("Denormalizing zone level ranges...")
    cursor = conn.cursor()

    # Get level ranges from spawns, excluding critters where possible
    cursor.execute("""
        SELECT
            z.id,
            -- Try non-critter min first, fall back to any monster min
            COALESCE(
                (SELECT MIN(ms.level)
                 FROM monster_spawns ms
                 JOIN monsters m ON m.id = ms.monster_id
                 WHERE ms.zone_id = z.id
                   AND ms.level > 0
                   AND m.type_name != 'Critter'),
                (SELECT MIN(ms.level)
                 FROM monster_spawns ms
                 WHERE ms.zone_id = z.id AND ms.level > 0)
            ) as level_min,
            -- Try non-critter max first, fall back to any monster max
            COALESCE(
                (SELECT MAX(ms.level)
                 FROM monster_spawns ms
                 JOIN monsters m ON m.id = ms.monster_id
                 WHERE ms.zone_id = z.id
                   AND m.type_name != 'Critter'),
                (SELECT MAX(ms.level)
                 FROM monster_spawns ms
                 WHERE ms.zone_id = z.id)
            ) as level_max
        FROM zones z
    """)

    zone_levels = cursor.fetchall()

    # Update zones with computed level ranges
    # Zones with no monsters will have NULL values
    updated_count = 0
    for zone_id, level_min, level_max in zone_levels:
        cursor.execute(
            """
            UPDATE zones
            SET level_min = ?, level_max = ?
            WHERE id = ?
            """,
            (level_min, level_max, zone_id),
        )
        if cursor.rowcount > 0 and level_min is not None:
            updated_count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Updated level ranges for {updated_count} zones")
