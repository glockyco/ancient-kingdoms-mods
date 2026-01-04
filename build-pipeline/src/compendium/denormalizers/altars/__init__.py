"""Altar denormalizers.

Enriches altar data with information from related tables.
"""

import json
import sqlite3

from rich.console import Console

console = Console()


def run_waves(conn: sqlite3.Connection) -> None:
    """Enrich altar wave monsters with is_boss and is_elite from monsters table."""
    console.print("Enriching altar wave monsters...")

    cursor = conn.cursor()

    # Get monster boss/elite status
    cursor.execute("SELECT id, is_boss, is_elite FROM monsters")
    monster_info = {
        row[0]: {"is_boss": bool(row[1]), "is_elite": bool(row[2])}
        for row in cursor.fetchall()
    }

    # Get all altars with waves
    cursor.execute("SELECT id, waves FROM altars WHERE waves IS NOT NULL")
    altars = cursor.fetchall()

    updated = 0
    for altar_id, waves_json in altars:
        if not waves_json:
            continue

        waves = json.loads(waves_json)
        modified = False

        for wave in waves:
            for monster in wave.get("monsters", []):
                monster_id = monster.get("monster_id")
                if monster_id and monster_id in monster_info:
                    info = monster_info[monster_id]
                    if "is_boss" not in monster or "is_elite" not in monster:
                        monster["is_boss"] = info["is_boss"]
                        monster["is_elite"] = info["is_elite"]
                        modified = True

        if modified:
            cursor.execute(
                "UPDATE altars SET waves = ? WHERE id = ?",
                (json.dumps(waves), altar_id),
            )
            updated += 1

    conn.commit()
    console.print(f"  [green]OK[/green] Enriched waves for {updated} altars")
