import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_items


SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


def seed_required_foreign_keys(conn):
    conn.execute(
        """
        INSERT INTO zones (id, zone_id, name)
        VALUES ('unknown', 0, 'Unknown')
        """
    )


class ItemCosmeticFieldTests(unittest.TestCase):
    def test_load_items_preserves_comments_without_indexing_them_for_search(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "items.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "soul_ember",
                            "name": "Soul Ember",
                            "item_type": "general",
                            "quality": 2,
                            "tooltip": "Glowing fragments from defeated bosses.",
                            "comments": "Used to buy skins in Skin Vendor",
                        }
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            seed_required_foreign_keys(conn)
            try:
                load_items(conn, export_dir)

                row = conn.execute(
                    "SELECT comments FROM items WHERE id = 'soul_ember'"
                ).fetchone()
                fts_rows = conn.execute(
                    "SELECT rowid FROM items_fts WHERE items_fts MATCH 'skins'"
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(row, ("Used to buy skins in Skin Vendor",))
        self.assertEqual(fts_rows, [])

    def test_load_items_preserves_authoritative_cosmetic_flags_and_costume_type(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "items.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "ornamentation_token",
                            "name": "Ornamentation Token",
                            "item_type": "relic",
                            "quality": 2,
                            "is_ornamentation_token": True,
                        },
                        {
                            "id": "chef_hat",
                            "name": "Chef Hat",
                            "item_type": "costume",
                            "quality": 0,
                            "slot": "Head",
                            "is_costume": True,
                        },
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            seed_required_foreign_keys(conn)
            try:
                load_items(conn, export_dir)

                rows = conn.execute(
                    """
                    SELECT id, item_type, is_costume, is_ornamentation_token
                    FROM items
                    ORDER BY id
                    """
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(
            rows,
            [
                ("chef_hat", "costume", 1, 0),
                ("ornamentation_token", "relic", 0, 1),
            ],
        )


if __name__ == "__main__":
    unittest.main()
