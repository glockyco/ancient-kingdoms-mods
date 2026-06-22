import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_pets

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class PetsLoaderTests(unittest.TestCase):
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
