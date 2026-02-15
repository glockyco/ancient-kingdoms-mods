"""Zone level range denormalization.

Computes level_min, level_max, and level_median from monster spawns for each zone.
Excludes critters from level calculations unless the zone only has critters.
"""

import sqlite3

from rich.console import Console

console = Console()


def run(conn: sqlite3.Connection) -> None:
    """Compute zone level ranges and median from monster spawn levels.

    For each zone, calculates the min/max/median level across all spawns.
    Excludes critters (type_name='Critter') from the calculation,
    falling back to include critters only if no other monsters exist.

    The median is computed using window functions: ROW_NUMBER partitioned
    by zone, then averaging the two middle rows (for even counts) or
    taking the single middle row (for odd counts).

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

    # Compute median level per zone using window functions
    # Excludes critters, falls back to all spawns if zone has only critters
    console.print("Denormalizing zone median levels...")

    cursor.execute("""
        WITH spawn_levels AS (
            SELECT
                ms.zone_id,
                ms.level,
                ROW_NUMBER() OVER (PARTITION BY ms.zone_id ORDER BY ms.level) as rn,
                COUNT(*) OVER (PARTITION BY ms.zone_id) as cnt
            FROM monster_spawns ms
            JOIN monsters m ON m.id = ms.monster_id
            WHERE ms.level IS NOT NULL
              AND ms.level > 0
              AND m.type_name != 'Critter'
        ),
        non_critter_medians AS (
            SELECT zone_id, CAST(ROUND(AVG(level), 0) AS INTEGER) as median_level
            FROM spawn_levels
            WHERE rn IN (cnt / 2, cnt / 2 + 1)
            GROUP BY zone_id
        ),
        critter_fallback AS (
            SELECT
                ms.zone_id,
                ms.level,
                ROW_NUMBER() OVER (PARTITION BY ms.zone_id ORDER BY ms.level) as rn,
                COUNT(*) OVER (PARTITION BY ms.zone_id) as cnt
            FROM monster_spawns ms
            WHERE ms.level IS NOT NULL
              AND ms.level > 0
              AND ms.zone_id NOT IN (SELECT zone_id FROM non_critter_medians)
        ),
        critter_medians AS (
            SELECT zone_id, CAST(ROUND(AVG(level), 0) AS INTEGER) as median_level
            FROM critter_fallback
            WHERE rn IN (cnt / 2, cnt / 2 + 1)
            GROUP BY zone_id
        )
        SELECT zone_id, median_level FROM non_critter_medians
        UNION ALL
        SELECT zone_id, median_level FROM critter_medians
    """)

    median_rows = cursor.fetchall()
    median_count = 0
    for zone_id, median_level in median_rows:
        cursor.execute(
            "UPDATE zones SET level_median = ? WHERE id = ?",
            (median_level, zone_id),
        )
        if cursor.rowcount > 0:
            median_count += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Updated median levels for {median_count} zones")
