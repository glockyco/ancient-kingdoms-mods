import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_pets, load_skills

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class PetsLoaderTests(unittest.TestCase):
    def test_summon_pet_references(self):
        for missing in (None, "player", "archer", "reaper"):
            with self.subTest(missing=missing), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "skills.json").write_text(
                    json.dumps(
                        [
                            {
                                "id": "raise_player_pet",
                                "name": "Raise Player Pet",
                                "skill_type": "summon",
                                "area_projectile": False,
                                "pet_id": "player",
                            },
                            {
                                "id": "raise_companion",
                                "name": "Raise Companion",
                                "skill_type": "mercenary_summon",
                                "area_projectile": False,
                                "archer_pet_id": "archer",
                                "reaper_pet_id": "reaper",
                            },
                        ]
                    ),
                    encoding="utf-8",
                )
                pets = [
                    {
                        "id": pet_id,
                        "name": pet_id,
                        "type_monster": "Creature",
                        "level": 1,
                        "level_max": 100,
                        "health_multiplier": 1.0,
                        "icon_path": "companion_icon",
                    }
                    for pet_id in ("player", "archer", "reaper")
                    if pet_id != missing
                ]
                (root / "pets.json").write_text(json.dumps(pets), encoding="utf-8")
                conn = create_database(root / "test.db", SCHEMA_PATH)
                try:
                    load_skills(conn, root)
                    if missing is not None:
                        with self.assertRaises(ValueError):
                            load_pets(conn, root)
                    else:
                        load_pets(conn, root)
                        self.assertEqual(
                            ("mercenary_summon", "archer", "reaper"),
                            conn.execute(
                                "SELECT skill_type, archer_pet_id, reaper_pet_id "
                                "FROM skills WHERE id = 'raise_companion'"
                            ).fetchone(),
                        )
                        self.assertEqual(
                            ("player",),
                            conn.execute(
                                "SELECT pet_id FROM skills WHERE id = 'raise_player_pet'"
                            ).fetchone(),
                        )
                finally:
                    conn.close()

    def test_load_pets_persists_mana_curve(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "pets.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "wizard_mercenary",
                            "name": "Wizard Mercenary",
                            "is_mercenary": True,
                            "type_monster": "Wizard",
                            "level": 42,
                            "level_max": 50,
                            "health_multiplier": 1.0,
                            "health": 2100,
                            "mana": 5040,
                            "icon_path": "icon_wizard",
                            "health_base": 50,
                            "health_per_level": 50,
                            "mana_base": 120,
                            "mana_per_level": 120,
                        }
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_pets(conn, export_dir)
                row = conn.execute(
                    "SELECT mana, mana_base, mana_per_level FROM pets "
                    "WHERE id = 'wizard_mercenary'"
                ).fetchone()
            finally:
                conn.close()

        self.assertEqual(row, (5040, 120, 120))

    def test_load_pets_defaults_mana_when_absent(self):
        # Pre-mana exports must still load; mana columns default to 0.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "pets.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "warrior_mercenary",
                            "name": "Warrior Mercenary",
                            "is_mercenary": True,
                            "type_monster": "Warrior",
                            "level": 42,
                            "level_max": 50,
                            "health_multiplier": 1.0,
                            "icon_path": "icon_warrior",
                            "health_base": 110,
                            "health_per_level": 110,
                        }
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_pets(conn, export_dir)
                row = conn.execute(
                    "SELECT mana, mana_base, mana_per_level FROM pets "
                    "WHERE id = 'warrior_mercenary'"
                ).fetchone()
            finally:
                conn.close()

        self.assertEqual(row, (0, 0, 0))


if __name__ == "__main__":
    unittest.main()
