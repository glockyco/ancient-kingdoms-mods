import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from compendium.commands.tiles import (
    blank_excluded_zones,
    find_blank_boss_spawn_samples,
    load_excluded_zones,
)


class TileValidationTests(unittest.TestCase):
    def write_export_files(
        self, export_dir: Path, monsters: list[dict], spawns: list[dict]
    ) -> None:
        (export_dir / "monsters.json").write_text(json.dumps(monsters))
        (export_dir / "monster_spawns.json").write_text(json.dumps(spawns))

    def test_find_blank_boss_spawn_samples_reports_boss_on_black_terrain(self):
        with tempfile.TemporaryDirectory() as tmp:
            export_dir = Path(tmp)
            self.write_export_files(
                export_dir,
                monsters=[
                    {
                        "id": "boss",
                        "name": "Black Boss",
                        "is_boss": True,
                        "is_world_boss": False,
                    },
                    {
                        "id": "mob",
                        "name": "Black Mob",
                        "is_boss": False,
                        "is_world_boss": False,
                    },
                ],
                spawns=[
                    {
                        "monster_id": "boss",
                        "zone_id": "winterforge",
                        "position": {"x": 50, "y": 50, "z": 0},
                    },
                    {
                        "monster_id": "mob",
                        "zone_id": "winterforge",
                        "position": {"x": 20, "y": 20, "z": 0},
                    },
                ],
            )
            image = Image.new("RGB", (100, 100), "white")
            draw = ImageDraw.Draw(image)
            draw.rectangle([48, 48, 52, 52], fill="black")

            failures = find_blank_boss_spawn_samples(
                image,
                export_dir,
                {"min_x": 0, "max_x": 100, "min_z": 0, "max_z": 100},
                sample_radius=2,
                black_threshold=8,
                blank_ratio_threshold=0.9,
            )

            self.assertEqual(1, len(failures))
            self.assertEqual("boss", failures[0]["monster_id"])
            self.assertEqual("Black Boss", failures[0]["monster_name"])
            self.assertEqual("winterforge", failures[0]["zone_id"])
            self.assertEqual(1.0, failures[0]["blank_ratio"])

    def test_find_blank_boss_spawn_samples_ignores_nonblank_and_excluded_zones(self):
        with tempfile.TemporaryDirectory() as tmp:
            export_dir = Path(tmp)
            self.write_export_files(
                export_dir,
                monsters=[
                    {
                        "id": "visible_boss",
                        "name": "Visible Boss",
                        "is_boss": True,
                        "is_world_boss": False,
                    },
                    {
                        "id": "excluded_boss",
                        "name": "Excluded Boss",
                        "is_boss": True,
                        "is_world_boss": False,
                    },
                ],
                spawns=[
                    {
                        "monster_id": "visible_boss",
                        "zone_id": "winterforge",
                        "position": {"x": 50, "y": 50, "z": 0},
                    },
                    {
                        "monster_id": "excluded_boss",
                        "zone_id": "temple_of_valaark",
                        "position": {"x": 10, "y": 10, "z": 0},
                    },
                ],
            )
            image = Image.new("RGB", (100, 100), "white")
            draw = ImageDraw.Draw(image)
            draw.rectangle([88, 88, 92, 92], fill="black")

            failures = find_blank_boss_spawn_samples(
                image,
                export_dir,
                {"min_x": 0, "max_x": 100, "min_z": 0, "max_z": 100},
                sample_radius=2,
                black_threshold=8,
                blank_ratio_threshold=0.9,
            )

            self.assertEqual([], failures)

    def test_load_excluded_zones_fallback_never_spans_between_parent_zones(self):
        with tempfile.TemporaryDirectory() as tmp:
            export_dir = Path(tmp)
            (export_dir / "zone_info.json").write_text(
                json.dumps(
                    [
                        {"id": "temple_of_valaark", "name": "Temple", "zone_id": 23},
                        {"id": "old_valorath", "name": "Valorath", "zone_id": 25},
                    ]
                )
            )
            (export_dir / "zone_triggers.json").write_text(
                json.dumps(
                    [
                        {
                            "zone_id": 23,
                            "bounds_min_x": 0,
                            "bounds_min_y": 0,
                            "bounds_max_x": 10,
                            "bounds_max_y": 10,
                        },
                        {
                            "zone_id": 25,
                            "bounds_min_x": 100,
                            "bounds_min_y": 100,
                            "bounds_max_x": 110,
                            "bounds_max_y": 110,
                        },
                    ]
                )
            )

            zones = load_excluded_zones(export_dir)

            self.assertEqual(2, len(zones))
            self.assertEqual((0, 0, 10, 10), self._bounds(zones[0]))
            self.assertEqual((100, 100, 110, 110), self._bounds(zones[1]))

    def test_blank_excluded_zones_covers_tilemap_art_beyond_trigger_bounds(self):
        image = Image.new("RGB", (100, 100), "white")

        blank_excluded_zones(
            image,
            [
                {
                    "bounds_min_x": 20,
                    "bounds_min_y": 20,
                    "bounds_max_x": 40,
                    "bounds_max_y": 40,
                }
            ],
            {"min_x": 0, "max_x": 100, "min_z": 0, "max_z": 100},
            (0, 0, 0),
        )

        self.assertEqual((0, 0, 0), image.getpixel((12, 88)))
        self.assertEqual((255, 255, 255), image.getpixel((11, 88)))

    @staticmethod
    def _bounds(zone: dict) -> tuple[float, float, float, float]:
        return (
            zone["bounds_min_x"],
            zone["bounds_min_y"],
            zone["bounds_max_x"],
            zone["bounds_max_y"],
        )


if __name__ == "__main__":
    unittest.main()
