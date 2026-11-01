import copy
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.loaders.core import load_virtues

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

THRESHOLDS = [0, 100, 500]


def _virtue(virtue_id: str, titles: list[str]) -> dict:
    return {
        "id": virtue_id,
        "name": virtue_id.title(),
        "summary": f"{virtue_id} summary",
        "blessing_skill_id": f"blessing_of_{virtue_id}",
        "ranks": [
            {"rank": rank, "points": points, "title": title, "effect": f"+{rank}%."}
            for rank, (points, title) in enumerate(zip(THRESHOLDS, titles, strict=True))
        ],
    }


EXPORT = {
    "rank_thresholds": THRESHOLDS,
    "rank_zero_label": "Apprentice",
    "humility_multipliers": [0.5, 0.6, 1.05],
    "escort_points": 75,
    "return_points": 30,
    "virtues": [
        _virtue("compassion", ["", "Kind", "Caring"]),
        _virtue("humility", ["", "Modest", "Humble"]),
    ],
}


class VirtuesLoaderTests(unittest.TestCase):
    def _load(self, export: dict) -> sqlite3.Connection:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        (root / "virtues.json").write_text(json.dumps(export), encoding="utf-8")
        conn = create_database(root / "test.db", SCHEMA_PATH)
        self.addCleanup(conn.close)
        for virtue_id in ("compassion", "humility"):
            conn.execute(
                "INSERT INTO skills (id, name, skill_type) VALUES (?, ?, 'buff')",
                (f"blessing_of_{virtue_id}", f"Blessing of {virtue_id}"),
            )
        load_virtues(conn, root)
        return conn

    def test_ranks_keep_titles_and_rank_zero_shows_the_shared_label(self):
        conn = self._load(EXPORT)
        rows = conn.execute(
            "SELECT rank, title FROM virtue_ranks WHERE virtue_id = 'humility' ORDER BY rank"
        ).fetchall()
        self.assertEqual(rows, [(0, None), (1, "Modest"), (2, "Humble")])
        self.assertEqual(
            conn.execute("SELECT rank_zero_label FROM virtue_rules").fetchone(),
            ("Apprentice",),
        )

    def test_each_rank_keeps_its_points_and_humility_multiplier(self):
        conn = self._load(EXPORT)
        rows = conn.execute(
            "SELECT rank, points, humility_multiplier FROM virtue_rank_rules ORDER BY rank"
        ).fetchall()
        self.assertEqual(rows, [(0, 0, 0.5), (1, 100, 0.6), (2, 500, 1.05)])

    def test_virtues_keep_the_game_order(self):
        conn = self._load(EXPORT)
        rows = conn.execute("SELECT id FROM virtues ORDER BY sort_order").fetchall()
        self.assertEqual(rows, [("compassion",), ("humility",)])

    def test_rank_points_that_leave_the_thresholds_fail(self):
        export = copy.deepcopy(EXPORT)
        export["virtues"][1]["ranks"][2]["points"] = 400
        with self.assertRaisesRegex(ValueError, "humility ranks"):
            self._load(export)

    def test_a_missing_title_fails(self):
        export = copy.deepcopy(EXPORT)
        export["virtues"][0]["ranks"][1]["title"] = ""
        with self.assertRaisesRegex(ValueError, "compassion needs a title"):
            self._load(export)

    def test_an_unknown_blessing_skill_fails(self):
        export = copy.deepcopy(EXPORT)
        export["virtues"][0]["blessing_skill_id"] = "blessing_of_nothing"
        with self.assertRaisesRegex(ValueError, "unknown skill blessing_of_nothing"):
            self._load(export)


if __name__ == "__main__":
    unittest.main()
