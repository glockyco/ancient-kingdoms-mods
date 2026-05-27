import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_gather_items

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class GatherItemsLoaderTests(unittest.TestCase):
    def test_load_gather_items_preserves_fishing_spot_flag_and_spawns(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "gather_items.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "lake_fishing_spot_elven_1",
                            "name": "Lake Fishing Spot",
                            "zone_id": "elven_kingdom",
                            "sub_zone_id": "elven_lake",
                            "position": {"x": 10, "y": 20, "z": 0},
                            "is_fishing_spot": True,
                            "level": 2,
                            "tool_required_id": "basic_fishing_rod",
                            "spawn_ready": True,
                            "random_drops": [
                                {"item_id": "golden_stripe_eel", "rate": 0.25},
                                {"item_id": "river_carp", "rate": 0.75},
                            ],
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
                "INSERT INTO zone_triggers (id, name, zone_id) VALUES ('elven_lake', 'Lake', 1)"
            )
            conn.execute(
                "INSERT INTO items (id, name, travel_zone_id) VALUES ('golden_stripe_eel', 'Golden Stripe Eel', NULL)"
            )
            conn.execute(
                "INSERT INTO items (id, name, travel_zone_id) VALUES ('river_carp', 'River Carp', NULL)"
            )
            conn.execute(
                "INSERT INTO items (id, name, travel_zone_id) VALUES ('basic_fishing_rod', 'Basic Fishing Rod', NULL)"
            )
            try:
                load_gather_items(conn, export_dir)
                resource = conn.execute(
                    """
                    SELECT id, name, is_fishing_spot, level, tool_required_id
                    FROM gathering_resources
                    WHERE id = 'lake_fishing_spot'
                    """
                ).fetchone()
                spawn = conn.execute(
                    """
                    SELECT resource_id, zone_id, sub_zone_id, position_x, position_y
                    FROM gathering_resource_spawns
                    WHERE id = 'lake_fishing_spot_elven_1'
                    """
                ).fetchone()
                drops = conn.execute(
                    """
                    SELECT item_id, drop_rate, actual_drop_chance
                    FROM item_sources_gather
                    WHERE resource_id = 'lake_fishing_spot'
                    ORDER BY item_id
                    """
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(
            resource,
            ("lake_fishing_spot", "Lake Fishing Spot", 1, 2, "basic_fishing_rod"),
        )
        self.assertEqual(
            spawn,
            ("lake_fishing_spot", "elven_kingdom", "elven_lake", 10, 20),
        )
        self.assertEqual(
            drops,
            [("golden_stripe_eel", 0.25, 0.125), ("river_carp", 0.75, 0.375)],
        )

    def test_load_gather_items_keeps_fishing_spots_with_different_drop_pools_separate(
        self,
    ):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            export_dir.mkdir(parents=True)
            (export_dir / "gather_items.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "calm_fishing_spot_lone_lands_1",
                            "name": "Calm Fishing Spot",
                            "zone_id": "the_lone-lands",
                            "position": {"x": 10, "y": 20, "z": 0},
                            "is_fishing_spot": True,
                            "level": 0,
                            "random_drops": [
                                {"item_id": "ironjaw_catfish", "rate": 0.5},
                                {"item_id": "driftscale_catfish", "rate": 0.25},
                                {"item_id": "silverplate_stingray", "rate": 0.1},
                            ],
                        },
                        {
                            "id": "calm_fishing_spot_crescent_coast_1",
                            "name": "Calm Fishing Spot",
                            "zone_id": "crescent_coast",
                            "position": {"x": 30, "y": 40, "z": 0},
                            "is_fishing_spot": True,
                            "level": 0,
                            "random_drops": [
                                {"item_id": "blue_dartfish", "rate": 0.5},
                                {"item_id": "rosefin_guppy", "rate": 0.25},
                                {"item_id": "sandstripe_loach", "rate": 0.1},
                            ],
                        },
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            for zone_index, zone_id in enumerate(
                ("the_lone-lands", "crescent_coast"), start=1
            ):
                conn.execute(
                    "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
                    (zone_id, zone_index, zone_id),
                )
            for item_id in (
                "ironjaw_catfish",
                "driftscale_catfish",
                "silverplate_stingray",
                "blue_dartfish",
                "rosefin_guppy",
                "sandstripe_loach",
            ):
                conn.execute(
                    "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
                    (item_id, item_id),
                )
            try:
                load_gather_items(conn, export_dir)
                resources = conn.execute(
                    """
                    SELECT id, name
                    FROM gathering_resources
                    WHERE name = 'Calm Fishing Spot'
                    ORDER BY id
                    """
                ).fetchall()
                ironjaw_sources = conn.execute(
                    """
                    SELECT gr.name, grs.zone_id
                    FROM item_sources_gather isg
                    JOIN gathering_resources gr ON gr.id = isg.resource_id
                    JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
                    WHERE isg.item_id = 'ironjaw_catfish'
                    """
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual(len(resources), 2)
        self.assertEqual(ironjaw_sources, [("Calm Fishing Spot", "the_lone-lands")])


if __name__ == "__main__":
    unittest.main()
