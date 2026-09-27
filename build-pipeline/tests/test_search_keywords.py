import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.denormalizers.search import keywords

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class SearchKeywordTests(unittest.TestCase):
    def test_barber_role_is_searchable_without_matching_other_npcs(self):
        with tempfile.TemporaryDirectory() as tmp:
            conn = create_database(Path(tmp) / "test.db", SCHEMA_PATH)
            try:
                conn.executemany(
                    "INSERT INTO npcs (id, name, roles) VALUES (?, ?, ?)",
                    [
                        (
                            "borin_ironbeard",
                            "Borin Ironbeard",
                            json.dumps({"is_barber": True}),
                        ),
                        (
                            "banker",
                            "Vault Keeper",
                            json.dumps({"is_bank": True, "is_barber": False}),
                        ),
                    ],
                )

                keywords.run(conn)

                rows = dict(conn.execute("SELECT id, keywords FROM npcs").fetchall())
            finally:
                conn.close()

        # The website search index reads these keywords.
        self.assertIn("barber", rows["borin_ironbeard"].split())
        self.assertIn("appearance", rows["borin_ironbeard"].split())
        self.assertNotIn("barber", rows["banker"].split())
        self.assertNotIn("appearance", rows["banker"].split())

    def test_notable_classification_is_searchable_without_a_service_role(self):
        with tempfile.TemporaryDirectory() as tmp:
            conn = create_database(Path(tmp) / "test.db", SCHEMA_PATH)
            try:
                conn.executemany(
                    "INSERT INTO npcs (id, name, is_notable) VALUES (?, ?, ?)",
                    [
                        ("king_darin", "King Darin", True),
                        ("villager", "Ordinary Villager", False),
                    ],
                )

                keywords.run(conn)

                rows = dict(conn.execute("SELECT id, keywords FROM npcs").fetchall())
            finally:
                conn.close()

        self.assertIn("notable", rows["king_darin"].split())
        self.assertNotIn("notable", (rows["villager"] or "").split())


if __name__ == "__main__":
    unittest.main()
