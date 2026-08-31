import json
import tempfile
import unittest
from pathlib import Path

from pydantic import ValidationError

from compendium.db import create_database
from compendium.loaders.core import load_equipment_slots

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class EquipmentSlotsLoaderTests(unittest.TestCase):
    def test_load_equipment_slots_persists_owner_specific_categories(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "equipment_slots.json").write_text(
                json.dumps(
                    [
                        {
                            "owner_type": "player",
                            "owner_id": "ranger",
                            "slot_index": 13,
                            "accepted_category": "Bow",
                        },
                        {
                            "owner_type": "mercenary",
                            "owner_id": "rogue",
                            "slot_index": 13,
                            "accepted_category": "Weapon",
                        },
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_equipment_slots(conn, export_dir)
                rows = conn.execute(
                    "SELECT owner_type, owner_id, slot_index, accepted_category "
                    "FROM equipment_slots ORDER BY owner_type, owner_id"
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(
            rows,
            [
                ("mercenary", "rogue", 13, "Weapon"),
                ("player", "ranger", 13, "Bow"),
            ],
        )

    def test_load_equipment_slots_rejects_unknown_category(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "equipment_slots.json").write_text(
                json.dumps(
                    [
                        {
                            "owner_type": "player",
                            "owner_id": "ranger",
                            "slot_index": 13,
                            "accepted_category": "Offhand",
                        }
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                with self.assertRaises(ValidationError):
                    load_equipment_slots(conn, export_dir)
            finally:
                conn.close()


if __name__ == "__main__":
    unittest.main()
