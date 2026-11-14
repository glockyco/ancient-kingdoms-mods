import hashlib
import json
import struct
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from compendium.db import create_database
from compendium.redactions.config import load_redactions
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
        self.conn.execute(
            "INSERT INTO zones (id, zone_id, name) VALUES ('old_valorath', 3, 'Old Valorath')"
        )
        # The tests define their own unreleased zone rather than reading the
        # repository's configuration, which changes as zones are released.
        config = self.root / "redactions.toml"
        config.write_text(
            '[zones.suppress_positions]\nzone_ids = ["temple_of_valaark"]\n'
            '[zones.exclude_unreleased]\nzone_ids = ["old_valorath"]\n',
            encoding="utf-8",
        )
        redactions = patch(
            "compendium.zone_shots.load_redactions",
            lambda: load_redactions(config),
        )
        redactions.start()
        self.addCleanup(redactions.stop)
        self.focal = [{"zone_id": "forest", "x": 50, "y": 50, "comment": "Clearing"}]
        self.frame_scale = 1
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
        for rows in (self.focal, self.manifest):
            for row in rows:
                row.setdefault("capture_id", row["zone_id"])
                row.setdefault("artwork_kind", "shot")
                row.setdefault(
                    "mode",
                    "suppressed_anchor"
                    if row["zone_id"] == "temple_of_valaark"
                    else "authored_world",
                )
        for row in self.manifest:
            row.setdefault("image", f"{row['capture_id']}.png")
            image = self.shots / row["image"]
            if image.is_file() and "sha256" not in row:
                row["sha256"] = hashlib.sha256(image.read_bytes()).hexdigest()
        self.focal_path.write_text(
            json.dumps(
                {
                    "schema_version": 2,
                    "frame_scale": self.frame_scale,
                    "zones": self.focal,
                }
            ),
            encoding="utf-8",
        )
        (self.shots / "manifest.json").write_text(
            json.dumps({"schema_version": 2, "captures": self.manifest}),
            encoding="utf-8",
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

    def add_anchored_temple(self):
        self.conn.execute(
            "INSERT INTO zones (id, zone_id, name) VALUES ('temple_of_valaark', 2, 'Temple of Valaark')"
        )
        self.focal.append(
            {
                "zone_id": "temple_of_valaark",
                "anchor": {"monster": "temple_guardian"},
                "comment": "Guardian chamber",
            }
        )
        self.manifest.append(
            {
                key: value
                for key, value in {
                    **self.manifest[0],
                    "zone_id": "temple_of_valaark",
                    "anchor": {"monster": "temple_guardian"},
                    "offset": [0, 0],
                }.items()
                if key not in ("x", "y")
            }
        )
        Image.new("RGB", (1920, 1080), "blue").save(
            self.shots / "temple_of_valaark.png"
        )

    def test_publishes_anchored_suppressed_zone_without_coordinates_or_bounds(self):
        self.add_anchored_temple()
        self.assertEqual(2, self.publish())
        self.assertEqual(
            (960, 540),
            self.conn.execute(
                "SELECT width, height FROM visual_assets WHERE entity_id = 'temple_of_valaark'"
            ).fetchone(),
        )

    def test_rejects_absolute_suppressed_focal_coordinates(self):
        self.add_anchored_temple()
        for key in ("x", "y"):
            with self.subTest(key=key):
                self.focal[1][key] = 0
                with self.assertRaisesRegex(ValueError, "forbids absolute coordinates"):
                    self.publish()
                del self.focal[1][key]

    def test_rejects_absolute_suppressed_manifest_coordinates_even_null(self):
        self.add_anchored_temple()
        for key in ("x", "y"):
            for value in (0, None):
                with self.subTest(key=key, value=value):
                    self.manifest[1][key] = value
                    with self.assertRaisesRegex(
                        ValueError, "forbids absolute coordinates"
                    ):
                        self.publish()
                    del self.manifest[1][key]

    def test_rejects_anchor_on_normal_zone_in_focal_or_manifest(self):
        for row in (self.focal[0], self.manifest[0]):
            row["anchor"] = {"monster": "forest_guardian"}
            with self.assertRaisesRegex(ValueError, "Normal zone .* forbids anchor"):
                self.publish()
            del row["anchor"]

    def test_rejects_unanchored_suppressed_zone(self):
        self.add_anchored_temple()
        del self.focal[1]["anchor"]
        with self.assertRaisesRegex(ValueError, "requires one monster anchor"):
            self.publish()

    def test_rejects_invalid_anchor_and_offset(self):
        self.add_anchored_temple()
        for anchor in (
            None,
            {},
            {"npc": "guardian"},
            {"monster": "../guardian"},
            {"monster": 1},
        ):
            with self.subTest(anchor=anchor):
                self.focal[1]["anchor"] = anchor
                with self.assertRaises((TypeError, ValueError)):
                    self.publish()
        self.focal[1]["anchor"] = {"monster": "temple_guardian"}
        for offset in (None, [], [0], [0, 0, 0], [True, 0], [float("nan"), 0]):
            with self.subTest(offset=offset):
                self.focal[1]["offset"] = offset
                with self.assertRaises((TypeError, ValueError)):
                    self.publish()

    def test_rejects_stale_anchor_or_offset(self):
        self.add_anchored_temple()
        self.manifest[1]["anchor"] = {"monster": "other_guardian"}
        with self.assertRaisesRegex(ValueError, "anchor or offset differs"):
            self.publish()
        self.manifest[1]["anchor"] = self.focal[1]["anchor"]
        self.manifest[1]["offset"] = [1, 0]
        with self.assertRaisesRegex(ValueError, "anchor or offset differs"):
            self.publish()

    def test_rejects_unreleased_zone_even_anchored(self):
        self.focal.append(
            {
                "zone_id": "old_valorath",
                "anchor": {"monster": "guardian"},
                "comment": "Unreleased",
            }
        )
        with self.assertRaisesRegex(ValueError, "Excluded zone"):
            self.publish()

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

    def set_scale(self, scale, size):
        self.frame_scale = scale
        self.manifest[0].update(
            camera_size=11.25 * scale, width=size[0], height=size[1]
        )
        Image.new("RGB", size, "green").save(self.shots / "forest.png")
        self.manifest[0].pop("sha256", None)

    def set_mixed_scales(self):
        self.set_scale(2, (3840, 2160))
        self.frame_scale = 1
        self.focal[0]["frame_scale"] = 2
        self.conn.execute(
            "INSERT INTO zones (id, zone_id, name, is_dungeon, bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y) "
            "VALUES ('dungeon', 4, 'Dungeon', 1, 0, 0, 100, 100)"
        )
        self.focal.append(
            {
                "zone_id": "dungeon",
                "x": 50,
                "y": 50,
                "comment": "Dungeon chamber",
                "frame_scale": 1.5,
            }
        )
        self.manifest.append(
            {
                **self.manifest[0],
                "zone_id": "dungeon",
                "camera_size": 16.875,
                "width": 2880,
                "height": 1620,
            }
        )
        Image.new("RGB", (2880, 1620), "blue").save(self.shots / "dungeon.png")

    def test_publishes_mixed_overworld_and_dungeon_scales(self):
        self.set_mixed_scales()
        self.assertEqual(2, self.publish())
        self.assertEqual(
            [("dungeon", 960, 540), ("forest", 960, 540)],
            self.conn.execute(
                "SELECT entity_id, width, height FROM visual_assets ORDER BY entity_id"
            ).fetchall(),
        )
        for zone_id in ("forest", "dungeon"):
            with Image.open(self.static / f"images/zones/{zone_id}/shot.webp") as image:
                self.assertEqual("WEBP", image.format)
                self.assertEqual((960, 540), image.size)

    def test_inherits_default_one_with_unchanged_capture_metadata(self):
        self.assertNotIn("frame_scale", self.focal[0])
        self.assertEqual(
            {
                "zone_id": "forest",
                "x": 50,
                "y": 50,
                "camera_size": 11.25,
                "width": 1920,
                "height": 1080,
                "captured_at": "2026-10-10T12:00:00Z",
            },
            self.manifest[0],
        )
        self.assertEqual(1, self.publish())

    def test_mixed_scales_inherit_default_for_unoverridden_zone(self):
        self.set_mixed_scales()
        self.frame_scale = 2
        del self.focal[0]["frame_scale"]
        self.assertEqual(2, self.publish())

    def test_rejects_invalid_per_zone_scale(self):
        for scale in (
            0,
            -1,
            float("nan"),
            float("inf"),
            float("-inf"),
            True,
            False,
            "1",
            None,
            [],
            {},
        ):
            with self.subTest(scale=scale):
                self.focal[0]["frame_scale"] = scale
                with self.assertRaisesRegex(
                    (TypeError, ValueError), "Zone 'forest' requires .*frame_scale"
                ):
                    self.publish()

    def test_rejects_camera_mismatched_to_one_zone_override(self):
        self.set_mixed_scales()
        self.manifest[0]["camera_size"] = 11.25
        with self.assertRaisesRegex(
            ValueError, "Zone 'forest' capture camera_size must be 22.5"
        ):
            self.publish()
        self.assertEqual(
            0,
            self.conn.execute("SELECT COUNT(*) FROM visual_assets").fetchone()[0],
        )

    def test_rejects_manifest_pixels_mismatched_to_one_zone_override(self):
        self.set_mixed_scales()
        self.manifest[1].update(width=1920, height=1080)
        with self.assertRaisesRegex(
            ValueError, "Zone 'dungeon' manifest framing must be 2880x1620"
        ):
            self.publish()

    def test_rejects_image_pixels_mismatched_to_one_zone_override(self):
        self.set_mixed_scales()
        Image.new("RGB", (1920, 1080)).save(self.shots / "forest.png")
        with self.assertRaisesRegex(
            ValueError, "Zone 'forest' source framing must be a 3840x2160 PNG"
        ):
            self.publish()

    def test_rounds_per_zone_dimensions_with_midpoint_ties_away_from_zero(self):
        self.set_scale(1.03125, (1980, 1114))
        self.focal[0]["frame_scale"] = self.frame_scale
        self.frame_scale = 1
        self.assertEqual(1, self.publish())

    def test_accepts_per_zone_camera_unity_float_precision(self):
        self.set_scale(1.1, (2112, 1188))
        self.focal[0]["frame_scale"] = self.frame_scale
        self.frame_scale = 1
        self.manifest[0]["camera_size"] = struct.unpack(
            "f", struct.pack("f", 11.25 * 1.1)
        )[0]
        self.assertEqual(1, self.publish())

    def test_publishes_scaled_native_captures_at_unchanged_size(self):
        for scale, size in ((1, (1920, 1080)), (1.5, (2880, 1620)), (2, (3840, 2160))):
            with self.subTest(scale=scale):
                self.set_scale(scale, size)
                self.assertEqual(1, self.publish())
                with Image.open(self.static / "images/zones/forest/shot.webp") as image:
                    self.assertEqual((960, 540), image.size)
                self.conn.execute("DELETE FROM visual_assets")

    def test_rounds_native_dimensions_with_midpoint_ties_away_from_zero(self):
        self.set_scale(1.03125, (1980, 1114))
        self.assertEqual(1, self.publish())

    def test_accepts_camera_float_precision_for_non_binary_scale(self):
        self.set_scale(1.1, (2112, 1188))
        self.manifest[0]["camera_size"] = struct.unpack(
            "f", struct.pack("f", 11.25 * 1.1)
        )[0]
        self.assertEqual(1, self.publish())

    def test_rejects_camera_mismatched_to_global_scale(self):
        self.set_scale(1.5, (2880, 1620))
        self.manifest[0]["camera_size"] = 11.25
        with self.assertRaisesRegex(ValueError, "camera_size must be 16.875"):
            self.publish()

    def test_rejects_manifest_pixels_mismatched_to_global_scale(self):
        self.set_scale(2, (3840, 2160))
        self.manifest[0]["width"] = 1920
        with self.assertRaisesRegex(ValueError, "manifest framing must be 3840x2160"):
            self.publish()

    def test_rejects_image_pixels_mismatched_to_global_scale(self):
        self.set_scale(1.5, (2880, 1620))
        Image.new("RGB", (1920, 1080)).save(self.shots / "forest.png")
        with self.assertRaisesRegex(
            ValueError, "source framing must be a 2880x1620 PNG"
        ):
            self.publish()

    def test_rejects_invalid_global_scale(self):
        for scale in (
            0,
            -1,
            float("nan"),
            float("inf"),
            float("-inf"),
            True,
            False,
            "1",
            None,
        ):
            with self.subTest(scale=scale):
                self.frame_scale = scale
                with self.assertRaisesRegex((TypeError, ValueError), "frame_scale"):
                    self.publish()

    def test_rejects_invalid_focal_object_without_legacy_array_support(self):
        for data in (
            self.focal,
            None,
            {},
            {"zones": self.focal},
            {"frame_scale": 1},
            {"frame_scale": 1, "zones": {}},
            {"frame_scale": 1, "zones": [None]},
        ):
            with self.subTest(data=data):
                self.focal_path.write_text(json.dumps(data), encoding="utf-8")
                with self.assertRaises((TypeError, ValueError)):
                    publish_zone_shots(
                        self.conn, self.export_dir, self.static, self.focal_path
                    )

    def add_procedural(self):
        self.conn.execute(
            "INSERT INTO zones (id, zone_id, name, is_dungeon) VALUES ('chambers_of_chaos', 26, 'Chambers of Chaos', 1)"
        )
        for index, kind in enumerate(("shot", "illustration_2", "illustration_3")):
            capture_id = f"chambers_layout_{index}"
            point = {
                "zone_id": "chambers_of_chaos",
                "capture_id": capture_id,
                "mode": "procedural_run",
                "artwork_kind": kind,
                "chamber_index": 0,
                "room_camera": [0, 2],
                "comment": "Entered live room",
            }
            self.focal.append(point)
            self.manifest.append(
                {
                    **point,
                    "run_seed": 100 + index,
                    "trial_kind": "Battle",
                    "width": 1920,
                    "height": 1080,
                    "camera_size": 11.25,
                    "captured_at": "2026-11-14T12:00:00Z",
                }
            )
            Image.new("RGB", (1920, 1080), ("red", "blue", "yellow")[index]).save(
                self.shots / f"{capture_id}.png"
            )

    def test_publishes_primary_and_separate_procedural_illustrations_without_geometry(
        self,
    ):
        self.add_procedural()
        self.assertEqual(4, self.publish())
        self.assertEqual(
            [
                ("illustration_2", 960, 540),
                ("illustration_3", 960, 540),
                ("shot", 960, 540),
            ],
            self.conn.execute(
                "SELECT kind, width, height FROM visual_assets WHERE entity_id = 'chambers_of_chaos' ORDER BY kind"
            ).fetchall(),
        )

    def test_rejects_missing_or_malformed_procedural_provenance_before_publication(
        self,
    ):
        self.add_procedural()
        receipt = self.manifest[1]
        for key, values in {
            "run_seed": [None, True, 0, -1, 2147483647, 1.5, "100"],
            "chamber_index": [None, True, -1, 3, 0.5, "0"],
            "trial_kind": [None, "", "unknown", "Guardian"],
            "room_camera": [None, [], [0], [0, 1, 2], [True, 0], [float("inf"), 0]],
        }.items():
            original = receipt[key]
            del receipt[key]
            with (
                self.subTest(key=key, missing=True),
                self.assertRaises((TypeError, ValueError)),
            ):
                self.publish()
            for value in values:
                receipt[key] = value
                with (
                    self.subTest(key=key, value=value),
                    self.assertRaises((TypeError, ValueError)),
                ):
                    self.publish()
            receipt[key] = original
        self.assertEqual(
            0, self.conn.execute("SELECT COUNT(*) FROM visual_assets").fetchone()[0]
        )
        self.assertFalse(self.static.exists())

    def test_rejects_procedural_world_coordinates_and_stale_relative_framing(self):
        self.add_procedural()
        for row in (self.focal[1], self.manifest[1]):
            for key in ("x", "y", "anchor", "offset"):
                row[key] = None
                with self.assertRaisesRegex(ValueError, "forbids world coordinates"):
                    self.publish()
                del row[key]
        self.manifest[1]["room_camera"] = [1, 2]
        with self.assertRaisesRegex(ValueError, "framing differs"):
            self.publish()

    def test_rejects_authored_zone_using_procedural_mode(self):
        self.focal[0]["mode"] = "procedural_run"
        with self.assertRaisesRegex(ValueError, "capture mode must be authored_world"):
            self.publish()

    def test_rejects_procedural_capture_with_authored_mode(self):
        self.add_procedural()
        self.manifest[1]["mode"] = "authored_world"
        with self.assertRaisesRegex(ValueError, "capture mode must be procedural_run"):
            self.publish()

    def test_rejects_altered_png_with_matching_dimensions_before_publication(self):
        self.manifest[0]["sha256"] = hashlib.sha256(
            (self.shots / "forest.png").read_bytes()
        ).hexdigest()
        Image.new("RGB", (1920, 1080), "red").save(self.shots / "forest.png")
        with self.assertRaisesRegex(ValueError, "image digest differs"):
            self.publish()
        self.assertFalse(self.static.exists())

    def test_rejects_malformed_digest_and_timestamp(self):
        for digest in (None, "", "a" * 63, "A" * 64, 1):
            self.manifest[0]["sha256"] = digest
            with (
                self.subTest(digest=digest),
                self.assertRaisesRegex(ValueError, "SHA-256"),
            ):
                self.publish()
        del self.manifest[0]["sha256"]
        for stamp in ("invalid", "2026-11-14T12:00:00"):
            self.manifest[0]["captured_at"] = stamp
            with (
                self.subTest(stamp=stamp),
                self.assertRaisesRegex(ValueError, "timestamp|timezone"),
            ):
                self.publish()

    def test_rejects_duplicate_capture_ids_and_artwork_identities(self):
        self.add_procedural()
        self.focal[2]["capture_id"] = self.focal[1]["capture_id"]
        with self.assertRaisesRegex(ValueError, "Duplicate zone shot capture ID"):
            self.publish()
        self.focal[2]["capture_id"] = "other"
        self.focal[2]["artwork_kind"] = "shot"
        with self.assertRaisesRegex(ValueError, "Duplicate zone shot artwork identity"):
            self.publish()

    def test_rejects_missing_illustration_or_mismatched_artwork_identity(self):
        self.add_procedural()
        missing = self.manifest.pop()
        with self.assertRaisesRegex(ValueError, "capture IDs"):
            self.publish()
        self.manifest.append(missing)
        self.manifest[-1]["artwork_kind"] = "other_illustration"
        with self.assertRaisesRegex(ValueError, "identity differs"):
            self.publish()

    def test_entity_redaction_rejects_every_owned_illustration(self):
        self.add_procedural()
        config = self.root / "exclude-chambers.toml"
        config.write_text(
            '[zones.exclude_unreleased]\nzone_ids = ["old_valorath", "chambers_of_chaos"]\n'
        )
        with (
            patch(
                "compendium.zone_shots.load_redactions", lambda: load_redactions(config)
            ),
            self.assertRaisesRegex(ValueError, "Excluded zone"),
        ):
            self.publish()

    def test_rejects_unsafe_image_filename(self):
        for image in (
            "../forest.png",
            "/forest.png",
            "forest.jpg",
            "sub/forest.png",
            "sub\\\\forest.png",
        ):
            self.manifest[0]["image"] = image
            with (
                self.subTest(image=image),
                self.assertRaisesRegex(ValueError, "safe PNG"),
            ):
                self.publish()

    def test_reads_legacy_world_and_temple_captures_without_rewriting_or_recapture(
        self,
    ):
        self.add_anchored_temple()
        self.focal_path.write_text(
            json.dumps(
                {
                    "schema_version": 2,
                    "frame_scale": 1,
                    "zones": [
                        {
                            **row,
                            "capture_id": row["zone_id"],
                            "artwork_kind": "shot",
                            "mode": "suppressed_anchor"
                            if "anchor" in row
                            else "authored_world",
                        }
                        for row in self.focal
                    ],
                }
            )
        )
        path = self.shots / "manifest.json"
        original = json.dumps(self.manifest)
        path.write_text(original)
        images = {
            name: (self.shots / name).read_bytes()
            for name in ("forest.png", "temple_of_valaark.png")
        }
        self.assertEqual(
            2,
            publish_zone_shots(
                self.conn, self.export_dir, self.static, self.focal_path
            ),
        )
        self.assertEqual(original, path.read_text())
        for name, content in images.items():
            self.assertEqual(content, (self.shots / name).read_bytes())

    def test_legacy_array_cannot_bypass_procedural_receipt_requirements(self):
        from compendium.zone_shots import _capture_records

        for row in (
            {"zone_id": "chambers_of_chaos", "x": 0, "y": 0},
            {"zone_id": "forest", "mode": "procedural_run"},
            {"zone_id": "forest", "run_seed": 12},
        ):
            with (
                self.subTest(row=row),
                self.assertRaisesRegex(ValueError, "Only legacy"),
            ):
                _capture_records([row], self.shots / "manifest.json")
