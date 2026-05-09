import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_houses


SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class HousesLoaderTests(unittest.TestCase):
    def test_load_houses_preserves_price_location_and_search_keywords(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "houses.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "elven_lake_house",
                            "name": "Elven Lake House",
                            "description": "Elven Lake House",
                            "base_price": 90000,
                            "faction_id": "Elven Kingdom",
                            "faction_required": 0,
                            "zone_id": "elven_kingdom",
                            "sub_zone_id": "zone_trigger_lake",
                            "position": {"x": 10, "y": 20, "z": 0},
                        }
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            conn.execute(
                "INSERT INTO zones (id, zone_id, name) VALUES ('elven_kingdom', 1, 'Elven Kingdom')"
            )
            conn.execute(
                """
                INSERT INTO zone_triggers (id, name, zone_id)
                VALUES ('zone_trigger_lake', 'Lake', 1)
                """
            )
            try:
                load_houses(conn, export_dir)
                row = conn.execute(
                    """
                    SELECT id, name, base_price, faction_id, zone_name, sub_zone_name, position_x, position_y
                    FROM houses
                    WHERE id = 'elven_lake_house'
                    """
                ).fetchone()
                fts_rows = conn.execute(
                    "SELECT rowid FROM houses_fts WHERE houses_fts MATCH 'housing'"
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(
            row,
            (
                "elven_lake_house",
                "Elven Lake House",
                90000,
                "Elven Kingdom",
                "Elven Kingdom",
                "Lake",
                10,
                20,
            ),
        )
        self.assertEqual(len(fts_rows), 1)


if __name__ == "__main__":
    unittest.main()
