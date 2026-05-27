import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_fish

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class FishLoaderTests(unittest.TestCase):
    def test_load_fish_preserves_journal_and_trash_flags(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "fish.json").write_text(
                json.dumps(
                    [
                        {"item_id": "golden_stripe_eel", "is_trash": False},
                        {"item_id": "old_boot", "is_trash": True},
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            conn.execute(
                "INSERT INTO items (id, name, travel_zone_id) VALUES ('golden_stripe_eel', 'Golden Stripe Eel', NULL)"
            )
            conn.execute(
                "INSERT INTO items (id, name, travel_zone_id) VALUES ('old_boot', 'Old Boot', NULL)"
            )
            try:
                load_fish(conn, export_dir)
                rows = conn.execute(
                    "SELECT item_id, is_trash FROM fish ORDER BY item_id"
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(rows, [("golden_stripe_eel", 0), ("old_boot", 1)])


if __name__ == "__main__":
    unittest.main()
