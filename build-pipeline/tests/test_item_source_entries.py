import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.denormalizers.items import source_entries


SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class ItemSourceEntriesTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)

    def tearDown(self):
        self.conn.close()
        self.tmp.cleanup()

    def insert_item(self, item_id: str, name: str) -> None:
        self.conn.execute(
            "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
            (item_id, name),
        )

    def rows_for(self, item_id: str):
        return self.conn.execute(
            """
            SELECT source_type, source_id, source_name, source_level
            FROM item_source_entries
            WHERE item_id = ?
            ORDER BY source_type, source_id
            """,
            (item_id,),
        ).fetchall()

    def test_vendor_entries_assign_regular_and_adventurer_levels(self):
        self.insert_item("basic_bag", "Basic Bag")
        self.insert_item("adventurer_bag", "Adventurer Bag")
        self.conn.execute(
            "INSERT INTO npcs (id, name, roles) VALUES (?, ?, ?)",
            ("town_vendor", "Town Vendor", json.dumps({"is_merchant": True})),
        )
        self.conn.execute(
            "INSERT INTO npcs (id, name, roles) VALUES (?, ?, ?)",
            (
                "adventurer_vendor",
                "Adventurer Vendor",
                json.dumps({"is_merchant_adventurer": True}),
            ),
        )
        self.conn.execute(
            "INSERT INTO item_sources_vendor (item_id, npc_id) VALUES ('basic_bag', 'town_vendor')"
        )
        self.conn.execute(
            "INSERT INTO item_sources_vendor (item_id, npc_id) VALUES ('adventurer_bag', 'adventurer_vendor')"
        )

        source_entries.run(self.conn)

        self.assertEqual(
            self.rows_for("basic_bag"), [("vendor", "town_vendor", "Town Vendor", 1)]
        )
        self.assertEqual(
            self.rows_for("adventurer_bag"),
            [("vendor", "adventurer_vendor", "Adventurer Vendor", 40)],
        )

    def test_recipe_entries_preserve_computed_recipe_source_level(self):
        self.insert_item("crafted_bag", "Crafted Bag")
        self.conn.execute(
            """
            INSERT INTO item_sources_recipe (item_id, recipe_id, recipe_type, source_level)
            VALUES ('crafted_bag', 'crafted_bag_recipe', 'crafting', 18)
            """
        )

        source_entries.run(self.conn)

        self.assertEqual(
            self.rows_for("crafted_bag"),
            [("crafting", "crafted_bag_recipe", "Crafting", 18)],
        )

    def test_gather_entries_use_minimum_spawn_zone_median_level(self):
        self.insert_item("moonleaf", "Moonleaf")
        self.conn.execute(
            "INSERT INTO zones (id, zone_id, name, level_median) VALUES ('lowland', 1, 'Lowland', 7)"
        )
        self.conn.execute(
            "INSERT INTO zones (id, zone_id, name, level_median) VALUES ('highland', 2, 'Highland', 21)"
        )
        self.conn.execute(
            "INSERT INTO gathering_resources (id, name) VALUES ('moonleaf_node', 'Moonleaf')"
        )
        self.conn.execute(
            "INSERT INTO gathering_resource_spawns (id, resource_id, zone_id) VALUES ('spawn_low', 'moonleaf_node', 'lowland')"
        )
        self.conn.execute(
            "INSERT INTO gathering_resource_spawns (id, resource_id, zone_id) VALUES ('spawn_high', 'moonleaf_node', 'highland')"
        )
        self.conn.execute(
            "INSERT INTO item_sources_gather (item_id, resource_id, drop_rate) VALUES ('moonleaf', 'moonleaf_node', 1)"
        )

        source_entries.run(self.conn)

        self.assertEqual(
            self.rows_for("moonleaf"), [("gather", "moonleaf_node", "Moonleaf", 7)]
        )

    def test_container_entries_use_container_minimum_known_source_level(self):
        self.insert_item("satchel", "Satchel")
        self.insert_item("rare_gem", "Rare Gem")
        self.conn.execute(
            "INSERT INTO npcs (id, name, roles) VALUES ('town_vendor', 'Town Vendor', '{}')"
        )
        self.conn.execute(
            "INSERT INTO item_sources_vendor (item_id, npc_id) VALUES ('satchel', 'town_vendor')"
        )
        self.conn.execute(
            "INSERT INTO item_sources_pack (item_id, pack_item_id) VALUES ('rare_gem', 'satchel')"
        )

        source_entries.run(self.conn)

        self.assertEqual(self.rows_for("rare_gem"), [("pack", "satchel", "Satchel", 1)])


if __name__ == "__main__":
    unittest.main()
