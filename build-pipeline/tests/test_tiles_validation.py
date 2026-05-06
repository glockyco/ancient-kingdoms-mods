import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from compendium.commands.tiles import find_blank_boss_spawn_samples


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


if __name__ == "__main__":
    unittest.main()
