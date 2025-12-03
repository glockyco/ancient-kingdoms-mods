"""Monster level range denormalization.

Populates level_min and level_max on monsters from monster_spawns data.
"""

import sqlite3

from rich.console import Console

console = Console()


def run(conn: sqlite3.Connection) -> None:
    """Populate level_min/level_max from monster_spawns.

    For monsters with spawns, calculates the min/max level across all spawns.
    For monsters without spawns (templates only), uses the canonical level.

    Args:
        conn: Database connection with monsters and monster_spawns loaded
    """
    console.print("Denormalizing monster level ranges...")
    cursor = conn.cursor()

    # Get level ranges from spawns
    cursor.execute("""
        SELECT monster_id, MIN(level), MAX(level)
        FROM monster_spawns
        WHERE level IS NOT NULL AND level > 0
        GROUP BY monster_id
    """)
    spawn_levels = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

    # Update monsters with spawn data
    updated = 0
    for monster_id, (level_min, level_max) in spawn_levels.items():
        cursor.execute(
            """
            UPDATE monsters
            SET level_min = ?, level_max = ?
            WHERE id = ?
            """,
            (level_min, level_max, monster_id),
        )
        updated += cursor.rowcount

    # For monsters without spawns, use canonical level
    cursor.execute("""
        UPDATE monsters
        SET level_min = level, level_max = level
        WHERE level_min IS NULL AND level IS NOT NULL
    """)
    no_spawns = cursor.rowcount

    conn.commit()
    console.print(
        f"  [green]OK[/green] Updated {updated} monsters from spawns, {no_spawns} from canonical level"
    )
