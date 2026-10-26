"""Altar denormalizers.

Enriches altar data with information from related tables.
"""

import json
import sqlite3

from rich.console import Console

console = Console()


def run_waves(conn: sqlite3.Connection) -> None:
    """Enrich altar wave monsters and move their spawn points into a geometry column.

    Each monster carries its authored spawn location. The distinct locations go
    to `event_spawn_positions`, whose name marks it as geometry, so position
    suppression clears it with the altar's other coordinates. The waves keep no
    copy because suppression does not reach coordinates inside them.
    """
    console.print("Enriching altar wave monsters...")

    cursor = conn.cursor()

    # Get monster boss/elite status
    cursor.execute("SELECT id, is_boss, is_elite FROM monsters")
    monster_info = {
        row[0]: {"is_boss": bool(row[1]), "is_elite": bool(row[2])}
        for row in cursor.fetchall()
    }

    cursor.execute("SELECT id, waves FROM altars WHERE waves IS NOT NULL")
    altars = cursor.fetchall()

    for altar_id, waves_json in altars:
        waves = json.loads(waves_json)
        spawn_points: set[tuple[float, float]] = set()

        for wave in waves:
            for monster in wave.get("monsters", []):
                location = monster.pop("spawn_location")
                spawn_points.add((location["x"], location["y"]))
                info = monster_info.get(monster.get("monster_id"))
                if info is not None:
                    monster["is_boss"] = info["is_boss"]
                    monster["is_elite"] = info["is_elite"]

        cursor.execute(
            "UPDATE altars SET waves = ?, event_spawn_positions = ? WHERE id = ?",
            (
                json.dumps(waves),
                json.dumps([list(point) for point in sorted(spawn_points)]),
                altar_id,
            ),
        )

    conn.commit()
    console.print(f"  [green]OK[/green] Enriched waves for {len(altars)} altars")
