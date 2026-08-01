import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders import load_achievements, load_professions


SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class AchievementLoaderTests(unittest.TestCase):
    def test_loads_complete_catalog_and_copies_icons(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            self._write_achievements(export_dir)

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_achievements(conn, export_dir, static_dir)
                rows = conn.execute(
                    """
                    SELECT id, display_order, unlocked_icon_path, locked_icon_path
                    FROM achievements
                    ORDER BY display_order
                    """
                ).fetchall()
            finally:
                conn.close()

            self.assertEqual(len(rows), 38)
            self.assertEqual([row[1] for row in rows], list(range(38)))
            self.assertEqual(rows[0][0], "ACHIEVEMENT_00")
            self.assertEqual(
                rows[0][2],
                "/images/achievements/achievement_00/unlocked.jpg",
            )
            self.assertEqual(
                (static_dir / rows[0][2].removeprefix("/")).read_bytes(),
                b"unlocked-00",
            )
            self.assertEqual(
                (static_dir / rows[0][3].removeprefix("/")).read_bytes(),
                b"locked-00",
            )

    def test_rejects_incomplete_display_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            achievements = self._write_achievements(export_dir)
            achievements[-1]["display_order"] = 0
            (export_dir / "achievements.json").write_text(
                json.dumps(achievements), encoding="utf-8"
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                with self.assertRaisesRegex(ValueError, "display order"):
                    load_achievements(conn, export_dir, static_dir)
            finally:
                conn.close()

    def test_rejects_unknown_profession_achievement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            export_dir = root / "exported-data"
            static_dir = root / "website" / "static"
            self._write_achievements(export_dir)
            (export_dir / "professions.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "mining",
                            "name": "Mining",
                            "category": "gathering",
                            "achievement_id": "UNKNOWN_ACHIEVEMENT",
                            "tracking_type": "float_level",
                        }
                    ]
                ),
                encoding="utf-8",
            )

            conn = create_database(root / "test.db", SCHEMA_PATH)
            try:
                load_achievements(conn, export_dir, static_dir)
                with self.assertRaisesRegex(ValueError, "UNKNOWN_ACHIEVEMENT"):
                    load_professions(conn, export_dir)
            finally:
                conn.close()

    @staticmethod
    def _write_achievements(export_dir: Path) -> list[dict]:
        export_dir.mkdir(parents=True)
        achievements = []
        for index in range(38):
            achievement_id = f"ACHIEVEMENT_{index:02d}"
            image_dir = export_dir / "images" / "achievements" / achievement_id.lower()
            image_dir.mkdir(parents=True)
            (image_dir / "unlocked.jpg").write_bytes(f"unlocked-{index:02d}".encode())
            (image_dir / "locked.jpg").write_bytes(f"locked-{index:02d}".encode())
            achievements.append(
                {
                    "id": achievement_id,
                    "name": f"Achievement {index}",
                    "description": f"Complete achievement {index}",
                    "hidden": False,
                    "display_order": index,
                    "unlocked_icon_path": f"images/achievements/{achievement_id.lower()}/unlocked.jpg",
                    "locked_icon_path": f"images/achievements/{achievement_id.lower()}/locked.jpg",
                }
            )

        (export_dir / "achievements.json").write_text(
            json.dumps(achievements), encoding="utf-8"
        )
        return achievements
