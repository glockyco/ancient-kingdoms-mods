import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.redactions import discovery, references

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

# Every table the current schema gives a zone or sub-zone reference. Discovery
# replaced a maintained list covering eleven of them, so the set is the property
# worth asserting: a table added later must arrive here on its own.
ZONE_REFERENCING_TABLES = {
    "alchemy_tables",
    "altars",
    "chests",
    "crafting_stations",
    "gathering_resource_spawns",
    "houses",
    "item_zones_obtainable",
    "item_zones_usable",
    "items",
    "luck_tokens",
    "monster_spawns",
    "npc_spawns",
    "portals",
    "quests",
    "scribing_tables",
    "summon_triggers",
    "traps",
    "treasure_locations",
    "zone_triggers",
}


class ReferenceDeclarationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def test_every_reference_in_the_schema_is_declared(self):
        # The declaration cannot be complete by construction, so the suite is
        # what makes a schema addition visible instead of silently defaulted.
        resolved = references.resolve(self.conn)

        self.assertGreater(len(resolved), 100)

    def test_an_undeclared_reference_stops_the_build(self):
        self.conn.executescript(
            """
            CREATE TABLE widgets (
                id TEXT PRIMARY KEY,
                item_id TEXT REFERENCES items(id)
            );
            """
        )

        with self.assertRaises(references.UndeclaredReference) as raised:
            references.resolve(self.conn)

        self.assertIn("widgets.item_id", str(raised.exception))

    def test_discovery_covers_every_zone_referencing_table(self):
        resolved = references.resolve(self.conn)

        found = {r.table for r in resolved if r.to_zone and r.table != "zones"}
        self.assertEqual(found, ZONE_REFERENCING_TABLES)

    def test_both_identifier_spaces_are_recognised(self):
        resolved = {(r.table, r.column): r for r in references.resolve(self.conn)}

        self.assertTrue(resolved[("items", "travel_zone_id")].numeric)
        self.assertTrue(resolved[("quests", "zone_id_quest_action")].numeric)
        self.assertFalse(resolved[("chests", "zone_id")].numeric)

    def test_a_destination_reaches_nothing(self):
        resolved = {(r.table, r.column): r for r in references.resolve(self.conn)}

        outbound = resolved[("portals", "to_zone_id")]
        inbound = resolved[("portals", "from_zone_id")]

        self.assertFalse(outbound.reaches)
        self.assertEqual(outbound.locus, "destination")
        self.assertTrue(inbound.reaches)
        self.assertEqual(inbound.locus, "own")

    def test_summoning_reaches(self):
        resolved = {(r.table, r.column): r for r in references.resolve(self.conn)}

        self.assertTrue(resolved[("summon_triggers", "summoned_entity_id")].reaches)

    def test_a_reference_a_row_merely_needs_reaches_nothing(self):
        resolved = {(r.table, r.column): r for r in references.resolve(self.conn)}

        self.assertFalse(resolved[("portals", "required_item_id")].reaches)
        self.assertFalse(resolved[("quests", "kill_target_1_id")].reaches)


class SubZoneResolutionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.conn.executemany(
            "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
            [
                ("northern_wastes", 22, "Northern Wastes"),
                ("temple_of_valaark", 23, "Temple of Valaark"),
                ("old_valorath", 25, "Old Valorath"),
            ],
        )
        self.conn.executemany(
            "INSERT INTO zone_triggers (id, zone_id, name) VALUES (?, ?, ?)",
            [
                ("zone_trigger_northern_wastes", 22, "Northern Wastes"),
                ("zone_trigger_upper_old_valorath", 25, "Upper Old Valorath"),
            ],
        )
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def test_a_sub_zone_resolves_to_its_parent_zone(self):
        self.assertEqual(
            discovery.resolve_sub_zones(self.conn, {"old_valorath"}),
            {"zone_trigger_upper_old_valorath"},
        )

    def test_resolution_does_not_reach_another_zone(self):
        self.assertEqual(
            discovery.resolve_sub_zones(self.conn, {"temple_of_valaark"}), set()
        )

    def test_numeric_identifiers_resolve(self):
        self.assertEqual(discovery.numeric_zone_ids(self.conn, {"old_valorath"}), {25})

    def test_a_required_column_cannot_be_emptied(self):
        self.assertTrue(discovery.is_required(self.conn, "monster_spawns", "zone_id"))
        self.assertFalse(discovery.is_required(self.conn, "portals", "to_zone_id"))


if __name__ == "__main__":
    unittest.main()
