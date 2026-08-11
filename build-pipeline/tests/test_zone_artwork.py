import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from compendium.db import create_database
from compendium.visual_assets import reconcile
from compendium.zone_artwork import (
    _thumbnail,
    _zone_crop_box,
    publish_zone_thumbnails,
)

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"
WORLD_BOUNDS = {"min_x": 0, "max_x": 100, "min_z": 0, "max_z": 100}


class ZoneArtworkTests(unittest.TestCase):
    def test_zone_crop_is_north_up_and_uses_game_xz_orientation(self):
        source = Image.new("RGB", (100, 100))
        for y in range(100):
            for x in range(100):
                source.putpixel((x, y), (y, 0, 0))

        crop_box = _zone_crop_box("north", (20, 20, 80, 80), WORLD_BOUNDS, source.size)
        self.assertEqual((20, 20, 80, 80), crop_box)
        crop = source.crop(crop_box)
        self.assertEqual((20, 0, 0), crop.getpixel((0, 0)))
        self.assertEqual((79, 0, 0), crop.getpixel((0, 59)))

    def test_thumbnail_downscales_without_distortion(self):
        thumbnail = _thumbnail(Image.new("RGB", (1000, 500), "white"))
        self.assertEqual((512, 256), thumbnail.size)

    def test_publishes_exactly_24_bounded_zone_thumbnails_and_skips_two_excluded_zones(
        self,
    ):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            stitched_dir = export_dir / "screenshots" / "stitched"
            stitched_dir.mkdir(parents=True)
            static_dir.mkdir(parents=True)
            (export_dir / "zone_info.json").write_text("[]", encoding="utf-8")
            (export_dir / "zone_triggers.json").write_text("[]", encoding="utf-8")
            (export_dir / "screenshots" / "metadata.json").write_text(
                json.dumps({"world_bounds": WORLD_BOUNDS}), encoding="utf-8"
            )
            Image.new("RGB", (1000, 500), "white").save(stitched_dir / "world.png")

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                for index in range(24):
                    conn.execute(
                        "INSERT INTO zones (id, zone_id, name, bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y) VALUES (?, ?, ?, 10, 10, 90, 90)",
                        (f"zone_{index}", index, f"Zone {index}"),
                    )
                conn.execute(
                    "INSERT INTO zones (id, zone_id, name) VALUES ('temple_of_valaark', 24, 'Temple')"
                )
                conn.execute(
                    "INSERT INTO zones (id, zone_id, name) VALUES ('old_valorath', 25, 'Valorath')"
                )

                count = publish_zone_thumbnails(conn, export_dir, static_dir)
                rows = conn.execute(
                    "SELECT domain, entity_id, kind, source_type, public_path, width, height FROM visual_assets ORDER BY entity_id"
                ).fetchall()
            finally:
                conn.close()

            self.assertEqual(24, count)
            self.assertEqual(24, len(rows))
            for (
                domain,
                entity_id,
                kind,
                source_type,
                public_path,
                width,
                height,
            ) in rows:
                self.assertEqual(
                    ("zone", "thumbnail", "DerivedZoneMapCrop"),
                    (domain, kind, source_type),
                )
                self.assertEqual(
                    f"images/zones/{entity_id}/thumbnail.webp", public_path
                )
                self.assertEqual((512, 256), (width, height))
                self.assertTrue((static_dir / public_path).is_file())

    def test_zone_assets_are_owned_by_zones_during_reconciliation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            stitched_dir = export_dir / "screenshots" / "stitched"
            stitched_dir.mkdir(parents=True)
            static_dir.mkdir(parents=True)
            (export_dir / "zone_info.json").write_text("[]", encoding="utf-8")
            (export_dir / "zone_triggers.json").write_text("[]", encoding="utf-8")
            (export_dir / "screenshots" / "metadata.json").write_text(
                json.dumps({"world_bounds": WORLD_BOUNDS}), encoding="utf-8"
            )
            Image.new("RGB", (100, 100), "white").save(stitched_dir / "world.png")

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                conn.execute(
                    "INSERT INTO zones (id, zone_id, name, bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y) VALUES ('visible', 1, 'Visible', 10, 10, 90, 90)"
                )
                publish_zone_thumbnails(conn, export_dir, static_dir)
                public_path = conn.execute(
                    "SELECT public_path FROM visual_assets WHERE domain = 'zone'"
                ).fetchone()[0]
                conn.execute("DELETE FROM zones WHERE id = 'visible'")
                removed = reconcile(conn, static_dir)
                remaining = conn.execute(
                    "SELECT COUNT(*) FROM visual_assets"
                ).fetchone()[0]
            finally:
                conn.close()

            self.assertEqual(1, removed)
            self.assertEqual(0, remaining)
            self.assertFalse((static_dir / public_path).exists())

    def test_missing_stitched_input_fails_clearly(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            (export_dir / "screenshots").mkdir(parents=True)
            static_dir.mkdir(parents=True)
            (export_dir / "screenshots" / "metadata.json").write_text(
                json.dumps({"world_bounds": WORLD_BOUNDS}), encoding="utf-8"
            )
            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                with self.assertRaisesRegex(FileNotFoundError, "stitched world image"):
                    publish_zone_thumbnails(conn, export_dir, static_dir)
            finally:
                conn.close()

    def test_out_of_world_zone_bounds_fail_clearly(self):
        with self.assertRaisesRegex(ValueError, "outside world X bounds"):
            _zone_crop_box("far_away", (101, 10, 120, 20), WORLD_BOUNDS, (100, 100))


if __name__ == "__main__":
    unittest.main()
