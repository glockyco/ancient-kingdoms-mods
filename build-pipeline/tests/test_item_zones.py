import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.denormalizers.items import zones

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class ItemZoneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.conn = create_database(Path(self.tmp.name) / "zones.db", SCHEMA_PATH)
        self.conn.executescript("""
            INSERT INTO zones (id, zone_id, name) VALUES
                ('forest', 1, 'Forest'), ('town', 2, 'Town'),
                ('coast', 3, 'Coast'), ('mountain', 4, 'Mountain');
            INSERT INTO items (id, name, travel_zone_id) VALUES
                ('monster_loot', 'Monster Loot', NULL), ('vendor_good', 'Vendor Good', NULL),
                ('altar_reward', 'Altar Reward', NULL), ('map_reward', 'Map Reward', NULL),
                ('map_item', 'Map Item', NULL), ('gathered', 'Gathered', NULL),
                ('chest_loot', 'Chest Loot', NULL), ('forged', 'Forged', NULL),
                ('cooked', 'Cooked', NULL), ('potion', 'Potion', NULL),
                ('scroll', 'Scroll', NULL);
            INSERT INTO monsters (id, name) VALUES ('wolf', 'Wolf');
            INSERT INTO monster_spawns (id, monster_id, zone_id) VALUES
                ('wolf_one', 'wolf', 'forest'), ('wolf_two', 'wolf', 'forest');
            INSERT INTO item_sources_monster (item_id, monster_id, drop_rate)
                VALUES ('monster_loot', 'wolf', 1);
            INSERT INTO npcs (id, name) VALUES ('merchant', 'Merchant');
            INSERT INTO npc_spawns (id, npc_id, zone_id)
                VALUES ('merchant_spawn', 'merchant', 'town');
            INSERT INTO item_sources_vendor (item_id, npc_id)
                VALUES ('vendor_good', 'merchant');
            INSERT INTO altars (id, name, type, zone_id)
                VALUES ('altar', 'Altar', 'forgotten', 'coast');
            INSERT INTO item_sources_altar
                (item_id, altar_id, reward_tier, drop_rate, min_effective_level)
                VALUES ('altar_reward', 'altar', 'common', 1, 1);
            INSERT INTO treasure_locations (id, zone_id, required_map_id, reward_id) VALUES
                ('dig_one', 'coast', 'map_item', 'map_reward'),
                ('dig_two', 'coast', 'map_item', 'map_reward');
            INSERT INTO item_sources_treasure_map
                (item_id, map_item_id, treasure_location_id) VALUES
                ('map_reward', 'map_item', 'dig_one'),
                ('map_reward', 'map_item', 'dig_two');
            INSERT INTO gathering_resources (id, name) VALUES ('ore', 'Ore');
            INSERT INTO gathering_resource_spawns (id, resource_id, zone_id)
                VALUES ('ore_spawn', 'ore', 'mountain');
            INSERT INTO item_sources_gather (item_id, resource_id, drop_rate)
                VALUES ('gathered', 'ore', 1);
            INSERT INTO chests (id, name, zone_id)
                VALUES ('chest', 'Chest', 'forest');
            INSERT INTO item_sources_chest (item_id, chest_id, drop_rate)
                VALUES ('chest_loot', 'chest', 1);
            INSERT INTO crafting_stations (id, name, zone_id, is_cooking_oven) VALUES
                ('forge', 'Forge', 'forest', 0),
                ('oven', 'Oven', 'town', 1);
            INSERT INTO alchemy_tables (id, name, zone_id)
                VALUES ('alchemy', 'Alchemy Table', 'coast');
            INSERT INTO scribing_tables (id, name, zone_id)
                VALUES ('scribing', 'Scribing Table', 'mountain');
            INSERT INTO crafting_recipes (id, result_item_id, station_type) VALUES
                ('forge_recipe', 'forged', 'unknown'),
                ('oven_recipe', 'cooked', 'cooking');
            INSERT INTO alchemy_recipes (id, result_item_id)
                VALUES ('potion_recipe', 'potion');
            INSERT INTO scribing_recipes (id, result_item_id)
                VALUES ('scroll_recipe', 'scroll');
            INSERT INTO item_sources_recipe (item_id, recipe_id, recipe_type) VALUES
                ('forged', 'forge_recipe', 'crafting'),
                ('cooked', 'oven_recipe', 'crafting'),
                ('potion', 'potion_recipe', 'alchemy'),
                ('scroll', 'scroll_recipe', 'scribing');
        """)

    def tearDown(self) -> None:
        self.conn.close()
        self.tmp.cleanup()

    def rows(self) -> list[tuple[str, str, str]]:
        return self.conn.execute(
            "SELECT item_id, zone_id, source_type FROM item_zones_obtainable "
            "ORDER BY item_id, zone_id, source_type"
        ).fetchall()

    def test_every_source_is_obtainable_in_its_location(self) -> None:
        zones.run(self.conn)

        self.assertEqual(
            self.rows(),
            [
                ("altar_reward", "coast", "altar"),
                ("chest_loot", "forest", "chest"),
                ("cooked", "town", "recipe"),
                ("forged", "forest", "recipe"),
                ("gathered", "mountain", "gather"),
                ("map_reward", "coast", "treasure_map"),
                ("monster_loot", "forest", "monster"),
                ("potion", "coast", "recipe"),
                ("scroll", "mountain", "recipe"),
                ("vendor_good", "town", "vendor"),
            ],
        )
        self.assertEqual(
            self.conn.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' "
                "AND name IN ('item_zones_obtainable', 'item_zones_usable')"
            ).fetchone()[0],
            1,
        )

    def test_rerun_replaces_old_zone_assignments(self) -> None:
        zones.run(self.conn)
        self.conn.execute(
            "INSERT INTO item_zones_obtainable (item_id, zone_id, source_type) "
            "VALUES ('forged', 'mountain', 'recipe')"
        )

        zones.run(self.conn)

        self.assertEqual(len(self.rows()), 10)
        self.assertNotIn(("forged", "mountain", "recipe"), self.rows())


if __name__ == "__main__":
    unittest.main()
