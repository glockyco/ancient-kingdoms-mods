import sqlite3
import tempfile
import unittest
from pathlib import Path

from compendium.denormalizers import _apply_monster_zone_exclusions
from compendium.redaction import RedactionConfig, load_redactions


class MonsterRedactionTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.executescript(
            """
            CREATE TABLE monsters (id TEXT PRIMARY KEY, name TEXT NOT NULL);
            CREATE TABLE monster_spawns (
                id TEXT PRIMARY KEY,
                monster_id TEXT NOT NULL,
                zone_id TEXT NOT NULL
            );
            CREATE TABLE monster_skills (monster_id TEXT NOT NULL);
            CREATE TABLE item_sources_monster (monster_id TEXT NOT NULL);
            CREATE TABLE summon_trigger_placeholders (spawn_id TEXT NOT NULL);
            """
        )

    def tearDown(self):
        self.conn.close()

    def test_excluded_zone_removes_spawns_and_only_orphaned_monsters(self):
        self.conn.executemany(
            "INSERT INTO monsters (id, name) VALUES (?, ?)",
            [
                ("unreleased", "Unreleased"),
                ("shared", "Shared"),
                ("public", "Public"),
            ],
        )
        self.conn.executemany(
            "INSERT INTO monster_spawns (id, monster_id, zone_id) VALUES (?, ?, ?)",
            [
                ("old-only", "unreleased", "old_valorath"),
                ("old-shared", "shared", "old_valorath"),
                ("public-shared", "shared", "released_zone"),
                ("public-only", "public", "released_zone"),
            ],
        )
        self.conn.execute(
            "INSERT INTO summon_trigger_placeholders (spawn_id) VALUES ('old-only')"
        )
        self.conn.execute(
            "INSERT INTO monster_skills (monster_id) VALUES ('unreleased')"
        )
        self.conn.execute(
            "INSERT INTO item_sources_monster (monster_id) VALUES ('unreleased')"
        )

        _apply_monster_zone_exclusions(
            self.conn,
            RedactionConfig(exclude_monster_zone_ids={"old_valorath"}),
        )

        self.assertEqual(
            self.conn.execute("SELECT id FROM monsters ORDER BY id").fetchall(),
            [("public",), ("shared",)],
        )
        self.assertEqual(
            self.conn.execute("SELECT id FROM monster_spawns ORDER BY id").fetchall(),
            [("public-only",), ("public-shared",)],
        )
        self.assertEqual(
            self.conn.execute(
                "SELECT COUNT(*) FROM summon_trigger_placeholders"
            ).fetchone()[0],
            0,
        )
        self.assertEqual(
            self.conn.execute("SELECT COUNT(*) FROM monster_skills").fetchone()[0],
            0,
        )
        self.assertEqual(
            self.conn.execute("SELECT COUNT(*) FROM item_sources_monster").fetchone()[
                0
            ],
            0,
        )

    def test_loads_excluded_monster_zone_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "redactions.toml"
            config_path.write_text('[monsters.exclude]\nzone_ids = ["old_valorath"]\n')

            config = load_redactions(config_path)

        self.assertEqual(config.exclude_monster_zone_ids, {"old_valorath"})


if __name__ == "__main__":
    unittest.main()
