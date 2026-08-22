import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.redactions import geometry
from compendium.redactions.config import RedactionConfig

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

SUPPRESSED = "temple_of_valaark"
PUBLISHED = "northern_wastes"


class PositionSuppressionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.conn.executemany(
            "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
            [(PUBLISHED, 22, "Northern Wastes"), (SUPPRESSED, 23, "Temple of Valaark")],
        )
        self.conn.executemany(
            "INSERT INTO zone_triggers (id, zone_id, name, position_x, position_y) "
            "VALUES (?, ?, ?, ?, ?)",
            [
                ("zone_trigger_northern_wastes", 22, "Northern Wastes", 1.0, 2.0),
                ("zone_trigger_valaark", 23, "Temple of Valaark", 3.0, 4.0),
            ],
        )
        self.conn.executemany(
            "INSERT INTO monsters (id, name) VALUES (?, ?)",
            [("guardian", "Guardian"), ("wolf", "Wolf")],
        )
        self.conn.executemany(
            "INSERT INTO monster_spawns (id, monster_id, zone_id, sub_zone_id, "
            "position_x, position_y, position_z) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                ("s1", "guardian", SUPPRESSED, "zone_trigger_valaark", 10.0, 20.0, 0.0),
                (
                    "s2",
                    "wolf",
                    PUBLISHED,
                    "zone_trigger_northern_wastes",
                    30.0,
                    40.0,
                    0.0,
                ),
            ],
        )
        self.conn.commit()
        self.config = RedactionConfig(suppress_position_zone_ids={SUPPRESSED})

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def test_entities_of_a_suppressed_zone_survive_without_coordinates(self):
        geometry.run(self.conn, self.config)

        row = self.conn.execute(
            "SELECT monster_id, position_x, position_y FROM monster_spawns WHERE id = 's1'"
        ).fetchone()
        self.assertEqual(row, ("guardian", None, None))
        self.assertEqual(
            self.conn.execute("SELECT COUNT(*) FROM monsters").fetchone()[0], 2
        )

    def test_a_published_zone_keeps_its_coordinates(self):
        geometry.run(self.conn, self.config)

        self.assertEqual(
            self.conn.execute(
                "SELECT position_x, position_y FROM monster_spawns WHERE id = 's2'"
            ).fetchone(),
            (30.0, 40.0),
        )

    def test_a_portal_leading_in_keeps_its_own_position(self):
        self.conn.execute(
            "INSERT INTO portals (id, from_zone_id, to_zone_id, position_x, position_y, "
            "destination_x, destination_y) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("p1", PUBLISHED, SUPPRESSED, 5.0, 6.0, 7.0, 8.0),
        )
        self.conn.commit()

        geometry.run(self.conn, self.config)

        row = self.conn.execute(
            "SELECT position_x, position_y, destination_x, destination_y "
            "FROM portals WHERE id = 'p1'"
        ).fetchone()
        self.assertEqual(row, (5.0, 6.0, None, None))

    def test_a_portal_leading_out_loses_its_own_position(self):
        self.conn.execute(
            "INSERT INTO portals (id, from_zone_id, to_zone_id, position_x, position_y, "
            "destination_x, destination_y) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("p2", SUPPRESSED, PUBLISHED, 5.0, 6.0, 7.0, 8.0),
        )
        self.conn.commit()

        geometry.run(self.conn, self.config)

        row = self.conn.execute(
            "SELECT position_x, position_y, destination_x, destination_y "
            "FROM portals WHERE id = 'p2'"
        ).fetchone()
        self.assertEqual(row, (None, None, 7.0, 8.0))

    def test_a_position_inside_json_is_removed_and_the_entry_survives(self):
        objectives = [
            {
                "type": "location",
                "zone_id": SUPPRESSED,
                "amount": 1,
                "position": {"x": 1.0, "y": 2.0, "z": 0.0},
            },
            {
                "type": "location",
                "zone_id": PUBLISHED,
                "amount": 1,
                "position": {"x": 3.0, "y": 4.0, "z": 0.0},
            },
        ]
        self.conn.execute(
            "INSERT INTO quests (id, name, quest_type, objectives) "
            "VALUES ('q1', 'Quest', 'normal', ?)",
            (json.dumps(objectives),),
        )
        self.conn.commit()

        geometry.run(self.conn, self.config)

        stored = json.loads(
            self.conn.execute(
                "SELECT objectives FROM quests WHERE id = 'q1'"
            ).fetchone()[0]
        )
        self.assertIsNone(stored[0]["position"])
        self.assertEqual(stored[0]["zone_id"], SUPPRESSED)
        self.assertEqual(stored[0]["amount"], 1)
        self.assertEqual(stored[1]["position"], {"x": 3.0, "y": 4.0, "z": 0.0})

    def test_a_position_inside_json_keyed_numerically_is_removed(self):
        locations = [
            {"zone_id": 23, "position": {"x": 1.0, "y": 2.0, "z": 0.0}},
            {"zone_id": 22, "position": {"x": 3.0, "y": 4.0, "z": 0.0}},
        ]
        self.conn.execute(
            "INSERT INTO quests (id, name, quest_type, finish_quest_locations) "
            "VALUES ('q2', 'Quest', 'normal', ?)",
            (json.dumps(locations),),
        )
        self.conn.commit()

        geometry.run(self.conn, self.config)

        stored = json.loads(
            self.conn.execute(
                "SELECT finish_quest_locations FROM quests WHERE id = 'q2'"
            ).fetchone()[0]
        )
        self.assertIsNone(stored[0]["position"])
        self.assertEqual(stored[1]["position"], {"x": 3.0, "y": 4.0, "z": 0.0})

    def test_no_configured_zone_changes_nothing(self):
        geometry.run(self.conn, RedactionConfig())

        self.assertEqual(
            self.conn.execute(
                "SELECT position_x FROM monster_spawns WHERE id = 's1'"
            ).fetchone()[0],
            10.0,
        )


if __name__ == "__main__":
    unittest.main()
