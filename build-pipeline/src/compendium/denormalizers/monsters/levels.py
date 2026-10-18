"""Monster level ranges from configured placements and altar wave definitions."""

import sqlite3

from rich.console import Console

console = Console()


def run(conn: sqlite3.Connection) -> None:
    """Retain configured event levels without inventing authored placements.

    A template without any configured placement or wave uses its own level.
    """
    console.print("Denormalizing monster level ranges...")
    cursor = conn.cursor()

    cursor.execute("""
        WITH configured_levels AS (
            SELECT monster_id, level FROM monster_spawns
            UNION ALL
            SELECT json_extract(member.value, '$.monster_id'),
                   json_extract(member.value, '$.base_level')
            FROM altars a, json_each(a.waves) wave,
                 json_each(wave.value, '$.monsters') member
        )
        SELECT monster_id, MIN(level), MAX(level)
        FROM configured_levels
        WHERE monster_id IS NOT NULL AND level IS NOT NULL AND level > 0
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
