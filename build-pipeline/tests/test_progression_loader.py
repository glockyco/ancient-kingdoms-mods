import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_progression

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"
CLASSES = ("warrior", "ranger", "cleric", "rogue", "wizard", "druid")
RACES = ("human", "elf", "dark_elf", "dwarf", "fire_goblin", "felarii", "drassar")


def _attributes(value: int = 0) -> dict[str, int]:
    return {
        "strength": value,
        "constitution": value,
        "dexterity": value,
        "intelligence": value,
        "wisdom": value,
        "charisma": value,
    }


def _progression() -> dict[str, object]:
    return {
        "max_level": 2,
        "max_veteran_points": 200,
        "attribute_points_per_veteran": 1,
        "veteran_skill_points_per_veteran": 1,
        "races": [
            {
                "id": race,
                "name": race.replace("_", " ").title(),
                "starting_attributes": _attributes(1),
            }
            for race in RACES
        ],
        "class_levels": [
            {
                "class_id": class_id,
                "level": level,
                "automatic_attributes": _attributes(),
            }
            for class_id in CLASSES
            for level in (1, 2)
        ],
        "level_budgets": [
            {"level": 1, "normal_skill_points": 0, "attribute_points": 0},
            {"level": 2, "normal_skill_points": 1, "attribute_points": 1},
        ],
    }


def _insert_classes(conn) -> None:
    races = json.dumps(list(RACES))
    for class_id in CLASSES:
        conn.execute(
            "INSERT INTO classes "
            "(id, name, description, primary_role, difficulty, resource_type, "
            "compatible_races, game_version) VALUES (?, ?, '', 'DPS', 1, 'mana', ?, 'test')",
            (class_id, class_id.title(), races),
        )
    conn.commit()


class ProgressionLoaderTests(unittest.TestCase):
    def test_load_progression_persists_curves_and_budgets(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir()
            (export_dir / "progression.json").write_text(
                json.dumps(_progression()), encoding="utf-8"
            )
            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                _insert_classes(conn)
                load_progression(conn, export_dir)
                rules = conn.execute(
                    "SELECT max_level, max_veteran_points, "
                    "attribute_points_per_veteran, veteran_skill_points_per_veteran "
                    "FROM progression_rules"
                ).fetchone()
                counts = (
                    conn.execute("SELECT COUNT(*) FROM race_progression").fetchone()[0],
                    conn.execute(
                        "SELECT COUNT(*) FROM class_level_progression"
                    ).fetchone()[0],
                    conn.execute("SELECT COUNT(*) FROM level_budgets").fetchone()[0],
                )
            finally:
                conn.close()

        self.assertEqual(rules, (2, 200, 1, 1))
        self.assertEqual(counts, (7, 12, 2))

    def test_load_progression_rejects_a_missing_class_level(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir()
            progression = _progression()
            progression["class_levels"].pop()
            (export_dir / "progression.json").write_text(
                json.dumps(progression), encoding="utf-8"
            )
            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                _insert_classes(conn)
                with self.assertRaisesRegex(ValueError, "class-level rows"):
                    load_progression(conn, export_dir)
            finally:
                conn.close()


if __name__ == "__main__":
    unittest.main()
