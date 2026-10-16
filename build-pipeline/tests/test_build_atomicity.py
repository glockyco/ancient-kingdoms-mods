import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from compendium.commands import build as build_command
from compendium.loaders import catalog


class BuildFailureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        export_dir = self.root / "exported-data"
        export_dir.mkdir()
        schema_dir = self.root / "build-pipeline"
        schema_dir.mkdir()
        (schema_dir / "schema.sql").write_text(
            "CREATE TABLE markers (value TEXT NOT NULL);", encoding="utf-8"
        )
        self.config = {
            "paths": {"export_dir": "exported-data", "website_dir": "website"},
            "build_pipeline": {"db_name": "compendium.db"},
        }
        self.root_patch = patch.object(
            build_command, "get_repo_root", return_value=self.root
        )
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)

    def _published_outputs(self):
        data_dir = self.root / "website/data"
        data_dir.mkdir(parents=True)
        db_path = data_dir / "compendium.db"
        with sqlite3.connect(db_path) as conn:
            conn.execute("CREATE TABLE markers (value TEXT NOT NULL)")
            conn.execute("INSERT INTO markers VALUES ('published')")
        image = self.root / "website/static/images/items/old/icon.webp"
        image.parent.mkdir(parents=True)
        image.write_bytes(b"old-image")
        return data_dir, db_path, image

    def test_missing_required_input_stops_build_and_names_file(self):
        with (
            patch.object(catalog, "verify_export_locale"),
            self.assertRaisesRegex(
                FileNotFoundError, "static_data.json.*hand-maintained"
            ),
        ):
            build_command.run(self.config)

        self.assertFalse((self.root / "website/data/compendium.db").exists())

    def test_failed_load_keeps_previous_outputs_intact(self):
        data_dir, db_path, image = self._published_outputs()
        original_bytes = db_path.read_bytes()

        def fail_after_commit(conn, export_dir, static_dir):
            conn.execute("INSERT INTO markers VALUES ('incomplete')")
            conn.commit()
            new_image = static_dir / "images/items/new/icon.webp"
            new_image.parent.mkdir(parents=True)
            new_image.write_bytes(b"new-image")
            raise RuntimeError("loader failed after commit")

        with (
            patch.object(build_command, "load_all", side_effect=fail_after_commit),
            self.assertRaisesRegex(RuntimeError, "loader failed after commit"),
        ):
            build_command.run(self.config)

        self.assertEqual(db_path.read_bytes(), original_bytes)
        with sqlite3.connect(db_path) as conn:
            self.assertEqual(
                conn.execute("SELECT value FROM markers").fetchall(), [("published",)]
            )
        self.assertEqual(image.read_bytes(), b"old-image")
        self.assertFalse((image.parents[1] / "new/icon.webp").exists())
        self.assertEqual(list(data_dir.glob(".compendium-build-*")), [])

    def test_failed_promotion_restores_all_previous_outputs(self):
        data_dir, db_path, image = self._published_outputs()
        original_bytes = db_path.read_bytes()
        original_replace = Path.replace

        def fail_database_promotion(source, target):
            if source.name == "compendium.db" and source.parent.name.startswith(
                ".compendium-build-"
            ):
                raise OSError("database rename failed")
            return original_replace(source, target)

        def stage_image(conn, export_dir, static_dir):
            new_image = static_dir / "images/items/new/icon.webp"
            new_image.parent.mkdir(parents=True)
            new_image.write_bytes(b"new-image")

        with (
            patch.object(build_command, "load_all", side_effect=stage_image),
            patch.object(build_command, "denormalize_all", return_value=object()),
            patch.object(build_command, "publish_zone_thumbnails"),
            patch.object(build_command, "publish_zone_shots"),
            patch.object(build_command, "reconcile"),
            patch.object(build_command, "resolve"),
            patch.object(build_command.verify, "check"),
            patch.object(Path, "replace", new=fail_database_promotion),
            self.assertRaisesRegex(OSError, "database rename failed"),
        ):
            build_command.run(self.config)

        self.assertEqual(db_path.read_bytes(), original_bytes)
        self.assertEqual(image.read_bytes(), b"old-image")
        self.assertFalse((image.parents[1] / "new/icon.webp").exists())
        self.assertEqual(list(data_dir.glob(".compendium-build-*")), [])

    def test_successful_promotion_replaces_complete_output_set(self):
        data_dir, db_path, image = self._published_outputs()
        with tempfile.TemporaryDirectory(dir=data_dir) as temp:
            stage = Path(temp)
            new_image = stage / "static/images/items/new/icon.webp"
            new_image.parent.mkdir(parents=True)
            new_image.write_bytes(b"new-image")
            with sqlite3.connect(stage / "compendium.db") as conn:
                conn.execute("CREATE TABLE markers (value TEXT NOT NULL)")
                conn.execute("INSERT INTO markers VALUES ('new')")

            build_command._publish_staged_outputs(
                stage, self.root / "website/static", db_path
            )

        self.assertFalse(image.exists())
        self.assertEqual(
            (self.root / "website/static/images/items/new/icon.webp").read_bytes(),
            b"new-image",
        )
        with sqlite3.connect(db_path) as conn:
            self.assertEqual(
                conn.execute("SELECT value FROM markers").fetchall(), [("new",)]
            )

    def test_build_without_decompiled_snapshot_publishes_database_and_images(self):
        self.assertFalse((self.root / "server-scripts").exists())

        def stage_outputs(conn, export_dir, static_dir):
            conn.execute("INSERT INTO markers VALUES ('new')")
            image = static_dir / "images/items/new/icon.webp"
            image.parent.mkdir(parents=True)
            image.write_bytes(b"new-image")

        with (
            patch.object(build_command, "load_all", side_effect=stage_outputs),
            patch.object(build_command, "denormalize_all", return_value=object()),
            patch.object(build_command, "publish_zone_thumbnails"),
            patch.object(build_command, "publish_zone_shots"),
            patch.object(build_command, "reconcile"),
            patch.object(build_command, "resolve"),
            patch.object(build_command.verify, "check"),
        ):
            build_command.run(self.config)

        with sqlite3.connect(self.root / "website/data/compendium.db") as conn:
            self.assertEqual(
                conn.execute("SELECT value FROM markers").fetchall(), [("new",)]
            )
        self.assertEqual(
            (self.root / "website/static/images/items/new/icon.webp").read_bytes(),
            b"new-image",
        )
