import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.redactions import closure
from compendium.redactions.config import RedactionConfig

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

PUBLISHED = "northern_wastes"
REDACTED = "old_valorath"


class EmbeddedScrubTests(unittest.TestCase):
    """Remaining embedded armor-set references scrub removed members."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)

        self.conn.executemany(
            "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
            [(PUBLISHED, 22, "Northern Wastes"), (REDACTED, 25, "Old Valorath")],
        )
        self.conn.executemany(
            "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
            [("common_ore", "Common Ore"), ("secret_ore", "Secret Ore")],
        )
        self.conn.execute(
            "INSERT INTO items(id,name,travel_zone_id,augment_armor_set_members) VALUES ('set_bonus','Set Bonus',NULL,?)",
            (
                json.dumps(
                    [
                        {"item_id": "common_ore", "required": 2},
                        {"item_id": "secret_ore", "required": 3},
                    ]
                ),
            ),
        )
        self.conn.commit()

        closure.run(
            self.conn,
            RedactionConfig(
                exclude_zone_ids={REDACTED}, exclude_entity_ids={"secret_ore"}
            ),
        )

    def _members(self):
        raw = self.conn.execute(
            "SELECT augment_armor_set_members FROM items WHERE id='set_bonus'"
        ).fetchone()[0]
        return json.loads(raw)

    def test_the_surviving_set_keeps_its_published_member(self):
        self.assertEqual(
            [member["item_id"] for member in self._members()], ["common_ore"]
        )

    def test_the_removed_member_is_absent_from_the_json_value(self):
        self.assertNotIn("secret_ore", json.dumps(self._members()))

    def test_the_rest_of_the_entry_survives(self):
        self.assertEqual(self._members()[0]["required"], 2)


if __name__ == "__main__":
    unittest.main()
