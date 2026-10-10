import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from compendium.db import create_database
from compendium.zone_shots import publish_zone_shots

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class ZoneShotTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.export_dir = self.root / "exported-data"
        self.shots = self.export_dir / "screenshots" / "zones"
        self.shots.mkdir(parents=True)
        self.static = self.root / "static"
        self.focal_path = self.root / "focal.json"
        self.conn = create_database(self.root / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)
        self.conn.execute(
            "INSERT INTO zones (id, zone_id, name, bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y) "
            "VALUES ('forest', 1, 'Forest', 0, 0, 100, 100)"
        )
        for index, zone_id in enumerate(("temple_of_valaark", "old_valorath"), 2):
            self.conn.execute(
                "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
                (zone_id, index, zone_id),
            )
        self.focal = [{"zone_id": "forest", "x": 50, "y": 50, "comment": "Clearing"}]
        self.manifest = [
            {
                "zone_id": "forest",
                "x": 50,
                "y": 50,
                "camera_size": 11.25,
                "width": 1920,
                "height": 1080,
                "captured_at": "2026-10-10T12:00:00Z",
            }
        ]
        Image.new("RGB", (1920, 1080), "green").save(self.shots / "forest.png")

    def publish(self):
        self.focal_path.write_text(json.dumps(self.focal), encoding="utf-8")
        (self.shots / "manifest.json").write_text(
            json.dumps(self.manifest), encoding="utf-8"
        )
        return publish_zone_shots(
            self.conn, self.export_dir, self.static, self.focal_path
        )

    def test_publishes_half_size_photo_with_provenance_and_excludes_unreleased_zones(
        self,
    ):
        self.assertEqual(1, self.publish())
        row = self.conn.execute(
            "SELECT domain, entity_id, kind, width, height, export_path, public_path, source_type FROM visual_assets"
        ).fetchone()
        self.assertEqual(
            (
                "zone",
                "forest",
                "shot",
                960,
                540,
                "screenshots/zones/forest.png",
                "images/zones/forest/shot.webp",
                "LiveZoneCameraCapture",
            ),
            row,
        )
        with Image.open(self.static / row[6]) as image:
            self.assertEqual("WEBP", image.format)
            self.assertEqual((960, 540), image.size)

    def test_rejects_unknown_zone(self):
        self.focal[0]["zone_id"] = "unknown"
        with self.assertRaisesRegex(ValueError, "Unknown zone"):
            self.publish()

    def test_rejects_missing_released_zone_focal_point(self):
        self.focal.clear()
        with self.assertRaisesRegex(
            ValueError, "Missing zone shot focal points: forest"
        ):
            self.publish()

    def test_rejects_missing_capture_manifest_row(self):
        self.manifest.clear()
        with self.assertRaisesRegex(ValueError, "Missing zone shot capture manifest"):
            self.publish()

    def test_rejects_missing_png(self):
        (self.shots / "forest.png").unlink()
        with self.assertRaisesRegex(FileNotFoundError, "Missing zone shot PNG"):
            self.publish()

    def test_rejects_out_of_bounds_focal_point(self):
        self.focal[0]["x"] = 101
        with self.assertRaisesRegex(ValueError, "outside zone bounds"):
            self.publish()

    def test_accepts_trigger_bounds_beyond_entity_derived_bounds(self):
        self.conn.execute(
            "INSERT INTO zone_triggers (id, name, zone_id, bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y) "
            "VALUES ('forest_trigger', 'Forest', 1, 0, 0, 200, 100)"
        )
        self.focal[0]["x"] = self.manifest[0]["x"] = 150
        self.assertEqual(1, self.publish())

    def test_rejects_stale_capture_position(self):
        self.manifest[0]["x"] = 51
        with self.assertRaisesRegex(ValueError, "differs from focal point"):
            self.publish()

    def test_rejects_wrong_camera_framing(self):
        self.manifest[0]["camera_size"] = 12
        with self.assertRaisesRegex(ValueError, "camera_size must be 11.25"):
            self.publish()

    def test_rejects_non_native_source_dimensions(self):
        Image.new("RGB", (960, 540)).save(self.shots / "forest.png")
        with self.assertRaisesRegex(ValueError, "source framing"):
            self.publish()

    def test_rejects_manifest_dimensions(self):
        self.manifest[0]["width"] = 960
        with self.assertRaisesRegex(ValueError, "manifest framing"):
            self.publish()

    def test_rejects_duplicate_focal_zone(self):
        self.focal.append(dict(self.focal[0]))
        with self.assertRaisesRegex(ValueError, "Duplicate zone shot"):
            self.publish()

    def test_rejects_non_finite_coordinates(self):
        self.focal[0]["x"] = float("nan")
        with self.assertRaisesRegex(ValueError, "requires finite x"):
            self.publish()

    def test_rejects_missing_capture_timestamp(self):
        del self.manifest[0]["captured_at"]
        with self.assertRaisesRegex(TypeError, "requires captured_at"):
            self.publish()

    def test_rejects_excluded_capture(self):
        self.manifest.append({**self.manifest[0], "zone_id": "old_valorath"})
        with self.assertRaisesRegex(ValueError, "Excluded zone"):
            self.publish()
