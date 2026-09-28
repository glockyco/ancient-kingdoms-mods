import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from compendium.commands import build as build_command


class BuildFailureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        export_dir = self.root / "exported-data"
        export_dir.mkdir()
        (export_dir / "game_config.json").write_text(
            json.dumps({"game_version": "0.9.34.0"}), encoding="utf-8"
        )
        snapshot_dir = self.root / "server-scripts"
        snapshot_dir.mkdir()
        (snapshot_dir / "SNAPSHOT.toml").write_text(
            'game_version = "0.9.34.0"\n'
            'steam_build_id = "25548782"\n'
            'assembly_sha256 = "test-digest"\n',
            encoding="utf-8",
        )
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
        for name in ("planner-data.json", "planner-data.json.gz"):
            (data_dir / name).write_bytes(b"old-payload")
        return data_dir, db_path, image

    def test_missing_required_input_stops_build_and_names_file(self):
        with (
            patch.object(build_command, "verify_planner_inputs"),
            patch.object(build_command, "verify_export_locale"),
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
            patch.object(build_command, "verify_planner_inputs"),
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
        for name in ("planner-data.json", "planner-data.json.gz"):
            self.assertEqual((data_dir / name).read_bytes(), b"old-payload")
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

        def stage_payload(conn, export_dir, output_dir, snapshot_path, subject):
            (output_dir / "planner-data.json").write_bytes(b"new-payload")
            (output_dir / "planner-data.json.gz").write_bytes(b"new-payload")
            return SimpleNamespace(raw_size=11, compressed_size=11)

        with (
            patch.object(build_command, "verify_planner_inputs"),
            patch.object(build_command, "load_all", side_effect=stage_image),
            patch.object(build_command, "denormalize_all", return_value=object()),
            patch.object(build_command, "publish_zone_thumbnails"),
            patch.object(build_command, "reconcile"),
            patch.object(build_command, "resolve"),
            patch.object(build_command.verify, "check"),
            patch.object(
                build_command, "write_planner_payload", side_effect=stage_payload
            ),
            patch.object(Path, "replace", new=fail_database_promotion),
            self.assertRaisesRegex(OSError, "database rename failed"),
        ):
            build_command.run(self.config)

        self.assertEqual(db_path.read_bytes(), original_bytes)
        self.assertEqual(image.read_bytes(), b"old-image")
        self.assertFalse((image.parents[1] / "new/icon.webp").exists())
        for name in ("planner-data.json", "planner-data.json.gz"):
            self.assertEqual((data_dir / name).read_bytes(), b"old-payload")
        self.assertEqual(list(data_dir.glob(".compendium-build-*")), [])

    def test_successful_promotion_replaces_complete_output_set(self):
        data_dir, db_path, image = self._published_outputs()
        with tempfile.TemporaryDirectory(dir=data_dir) as temp:
            stage = Path(temp)
            new_image = stage / "static/images/items/new/icon.webp"
            new_image.parent.mkdir(parents=True)
            new_image.write_bytes(b"new-image")
            staged_data = stage / "data"
            staged_data.mkdir()
            for name in ("planner-data.json", "planner-data.json.gz"):
                (staged_data / name).write_bytes(b"new-payload")
            with sqlite3.connect(stage / "compendium.db") as conn:
                conn.execute("CREATE TABLE markers (value TEXT NOT NULL)")
                conn.execute("INSERT INTO markers VALUES ('new')")

            build_command._publish_staged_outputs(
                stage, self.root / "website/static", data_dir, db_path
            )

        self.assertFalse(image.exists())
        self.assertEqual(
            (self.root / "website/static/images/items/new/icon.webp").read_bytes(),
            b"new-image",
        )
        for name in ("planner-data.json", "planner-data.json.gz"):
            self.assertEqual((data_dir / name).read_bytes(), b"new-payload")
        with sqlite3.connect(db_path) as conn:
            self.assertEqual(
                conn.execute("SELECT value FROM markers").fetchall(), [("new",)]
            )

    def test_missing_snapshot_fails_before_touching_output(self):
        (self.root / "server-scripts/SNAPSHOT.toml").unlink()
        with self.assertRaisesRegex(FileNotFoundError, "SNAPSHOT.toml.*Generate"):
            build_command.run(self.config)
        self.assertFalse((self.root / "website").exists())
