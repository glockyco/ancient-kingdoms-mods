"""Configured event levels survive without invented world placements."""

import json
from pathlib import Path

from compendium.db import create_database
from compendium.denormalizers.monsters import levels

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


def test_altar_and_authored_levels_share_range_without_creating_spawn_rows(tmp_path):
    conn = create_database(tmp_path / "levels.db", SCHEMA_PATH)
    try:
        conn.executescript("""
            INSERT INTO zones (id, zone_id, name) VALUES ('world', 1, 'World');
            INSERT INTO monsters (id, name, level) VALUES
                ('boss', 'Boss', 20), ('template', 'Template', 12);
            INSERT INTO monster_spawns (id, monster_id, zone_id, level)
            VALUES ('authored', 'boss', 'world', 25);
        """)
        conn.execute(
            "INSERT INTO altars (id, name, type, zone_id, waves) VALUES ('altar', 'Altar', 'forgotten', 'world', ?)",
            (
                json.dumps(
                    [
                        {
                            "wave_number": 1,
                            "monsters": [{"monster_id": "boss", "base_level": 40}],
                        },
                        {
                            "wave_number": 2,
                            "monsters": [{"monster_id": "boss", "base_level": 60}],
                        },
                    ]
                ),
            ),
        )

        levels.run(conn)

        assert conn.execute(
            "SELECT id, level_min, level_max FROM monsters ORDER BY id"
        ).fetchall() == [("boss", 25, 60), ("template", 12, 12)]
        assert conn.execute("SELECT id FROM monster_spawns").fetchall() == [
            ("authored",)
        ]
    finally:
        conn.close()
