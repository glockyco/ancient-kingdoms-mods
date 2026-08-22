import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.redactions import closure
from compendium.redactions.config import RedactionConfig

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

PUBLISHED = "northern_wastes"
EXCLUDED = "old_valorath"


class BoundaryScrubTests(unittest.TestCase):
    """A portal into an excluded zone keeps its row and discloses nothing."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.conn.executemany(
            "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
            [(PUBLISHED, 22, "Northern Wastes"), (EXCLUDED, 25, "Old Valorath")],
        )
        self.conn.executemany(
            "INSERT INTO zone_triggers (id, zone_id, name) VALUES (?, ?, ?)",
            [
                ("zone_trigger_northern_wastes", 22, "Northern Wastes"),
                ("zone_trigger_upper_old_valorath", 25, "Upper Old Valorath"),
            ],
        )
        self.conn.execute(
            "INSERT INTO items (id, name, item_type, travel_zone_id) "
            "VALUES ('key', 'Key', 'quest', NULL)"
        )
        self.conn.execute(
            """
            INSERT INTO portals (
                id, from_zone_id, from_sub_zone_id, to_zone_id, to_sub_zone_id,
                position_x, position_y, destination_x, destination_y,
                required_item_id, level_required, item_level_required, keywords
            ) VALUES (
                'gate', ?, 'zone_trigger_northern_wastes', ?,
                'zone_trigger_upper_old_valorath',
                620.43, 1272.11, -792.87, 144.10,
                'key', 50, 25000, 'portal teleport'
            )
            """,
            (PUBLISHED, EXCLUDED),
        )
        self.conn.commit()
        self.config = RedactionConfig(exclude_zone_ids={EXCLUDED})

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def _apply(self):
        removals, references = closure.decide(self.conn, self.config)
        closure.apply(self.conn, removals, references)

    def test_the_portal_remains_published_with_its_requirements(self):
        self._apply()

        row = self.conn.execute(
            "SELECT from_zone_id, required_item_id, level_required, "
            "item_level_required FROM portals WHERE id = 'gate'"
        ).fetchone()
        self.assertEqual(row, (PUBLISHED, "key", 50, 25000))

    def test_the_portal_keeps_its_own_position(self):
        self._apply()

        self.assertEqual(
            self.conn.execute(
                "SELECT position_x, position_y FROM portals WHERE id = 'gate'"
            ).fetchone(),
            (620.43, 1272.11),
        )

    def test_the_destination_identity_is_absent(self):
        self._apply()

        self.assertEqual(
            self.conn.execute(
                "SELECT to_zone_id, to_sub_zone_id FROM portals WHERE id = 'gate'"
            ).fetchone(),
            (None, None),
        )

    def test_the_destination_coordinates_are_absent(self):
        # The map draws a line from the portal to these coordinates. Clearing
        # the destination identifier alone leaves the position of the excluded
        # zone visible on the map.
        self._apply()

        self.assertEqual(
            self.conn.execute(
                "SELECT destination_x, destination_y FROM portals WHERE id = 'gate'"
            ).fetchone(),
            (None, None),
        )

    def test_a_portal_between_published_zones_is_untouched(self):
        self.conn.execute(
            """
            INSERT INTO portals (
                id, from_zone_id, to_zone_id, position_x, position_y,
                destination_x, destination_y
            ) VALUES ('inner', ?, ?, 1.0, 2.0, 3.0, 4.0)
            """,
            (PUBLISHED, PUBLISHED),
        )
        self.conn.commit()

        self._apply()

        self.assertEqual(
            self.conn.execute(
                "SELECT to_zone_id, destination_x, destination_y "
                "FROM portals WHERE id = 'inner'"
            ).fetchone(),
            (PUBLISHED, 3.0, 4.0),
        )


if __name__ == "__main__":
    unittest.main()
