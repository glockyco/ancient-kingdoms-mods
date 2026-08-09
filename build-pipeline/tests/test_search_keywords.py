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

                barber_matches = conn.execute(
                    """
                    SELECT n.id
                    FROM npcs_fts
                    JOIN npcs n ON n.rowid = npcs_fts.rowid
                    WHERE npcs_fts MATCH '"barber"*'
                    """
                ).fetchall()
                appearance_matches = conn.execute(
                    """
                    SELECT n.id
                    FROM npcs_fts
                    JOIN npcs n ON n.rowid = npcs_fts.rowid
                    WHERE npcs_fts MATCH '"appearance"*'
                    """
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(barber_matches, [("borin_ironbeard",)])
        self.assertEqual(appearance_matches, [("borin_ironbeard",)])


if __name__ == "__main__":
    unittest.main()
