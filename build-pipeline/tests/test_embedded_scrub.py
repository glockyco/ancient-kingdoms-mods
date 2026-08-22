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
    """A surviving row can name a removed entity inside a JSON value.

    Reachability alone cannot produce this case. An item that a surviving
    monster drops is reachable, so the closure keeps it. The case needs a
    mechanism that removes an entity for another reason, such as a manual
    exclusion or the ignore_journal flag.

    Today's export contains no such row, so disabling the scrub changes no
    published byte. These tests hold the behaviour for the case that reaches it.
    """

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
        # The monster survives in a published zone and drops both items. A
        # reachable item stays published, so the removal must come from another
        # mechanism. `secret_ore` is named for manual exclusion below.
        self.conn.execute(
            "INSERT INTO monsters (id, name, drops) VALUES ('wolf', 'Wolf', ?)",
            (
                json.dumps(
                    [
                        {"item_id": "common_ore", "rate": 0.5},
                        {"item_id": "secret_ore", "rate": 0.1},
                    ]
                ),
            ),
        )
        self.conn.execute(
            "INSERT INTO monster_spawns (id, monster_id, zone_id) "
            "VALUES ('s1', 'wolf', ?)",
            (PUBLISHED,),
        )
        self.conn.commit()

        closure.run(
            self.conn,
            RedactionConfig(
                exclude_zone_ids={REDACTED}, exclude_entity_ids={"secret_ore"}
            ),
        )

    def _drops(self):
        raw = self.conn.execute(
            "SELECT drops FROM monsters WHERE id = 'wolf'"
        ).fetchone()[0]
        return json.loads(raw)

    def test_the_surviving_monster_keeps_its_published_drop(self):
        self.assertEqual([drop["item_id"] for drop in self._drops()], ["common_ore"])

    def test_the_removed_item_is_absent_from_the_json_value(self):
        self.assertNotIn("secret_ore", json.dumps(self._drops()))

    def test_the_rest_of_the_entry_survives(self):
        self.assertEqual(self._drops()[0]["rate"], 0.5)


if __name__ == "__main__":
    unittest.main()
