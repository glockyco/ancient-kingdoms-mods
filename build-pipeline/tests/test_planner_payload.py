import gzip
import hashlib
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from compendium.planner_payload import (
    COMPRESSED_PAYLOAD_NAME,
    RAW_PAYLOAD_NAME,
    PlannerPayloadError,
    assert_planner_payload_outputs,
    write_planner_payload,
)
from compendium.redactions.verify import Subject, SurvivingReference


class PlannerPayloadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.exports = self.root / "exports"
        self.output = self.root / "output"
        self.exports.mkdir()
        self.snapshot = self.root / "SNAPSHOT.toml"
        self.snapshot.write_text(
            'game_version = "0.9.31.1"\n'
            'steam_build_id = "24986533"\n'
            'assembly_sha256 = "abc123"\n',
            encoding="utf-8",
        )
        self.conn = sqlite3.connect(":memory:")
        for table in ("items", "skills", "pets", "classes"):
            self.conn.execute(f"CREATE TABLE {table} (id TEXT PRIMARY KEY)")
        self.conn.execute("INSERT INTO items VALUES ('sword')")
        self.conn.execute("INSERT INTO skills VALUES ('strike')")
        self.conn.execute("INSERT INTO pets VALUES ('warrior_mercenary')")
        self.conn.execute("INSERT INTO classes VALUES ('warrior')")
        self._write_exports()

    def tearDown(self):
        self.conn.close()
        self.temp.cleanup()

    def _write_exports(self, *, skill_type="target_damage", extra_skill=None):
        values = {
            "game_config.json": {"game_version": "0.9.31.1"},
            "items.json": [
                {
                    "id": "sword",
                    "name": "Sword",
                    "item_type": "weapon",
                    "stats": {"damage": 2},
                }
            ],
            "skills.json": [
                {
                    "id": "strike",
                    "skill_type": skill_type,
                    "player_classes": ["Warrior"],
                    "is_spell": True,
                    **(extra_skill or {}),
                }
            ],
            "pets.json": [
                {
                    "id": "warrior_mercenary",
                    "name": "Warrior Mercenary",
                    "is_mercenary": True,
                }
            ],
            "classes.json": [
                {
                    "id": "warrior",
                    "name": "Warrior",
                    "game_version": "0.9.31.1",
                }
            ],
            "classes_combat.json": [{"id": "warrior", "resource_type": "energy"}],
            "equipment_slots.json": [
                {
                    "owner_type": owner_type,
                    "owner_id": "warrior",
                    "slot_index": 12,
                    "accepted_category": "Weapon",
                }
                for owner_type in ("player", "mercenary")
            ],
            "progression.json": {
                "max_level": 50,
                "max_veteran_points": 200,
                "attribute_points_per_veteran": 1,
                "veteran_skill_points_per_veteran": 1,
                "races": [],
                "class_levels": [{"class_id": "warrior", "level": 1}],
                "level_budgets": [],
            },
        }
        for name, value in values.items():
            (self.exports / name).write_text(json.dumps(value), encoding="utf-8")

    def _write(self, subject=None):
        return write_planner_payload(
            self.conn,
            self.exports,
            self.output,
            self.snapshot,
            subject or Subject(set(), set(), []),
        )

    def test_raw_gzip_and_hash_are_reproducible(self):
        first = self._write()
        first_raw = first.raw_path.read_bytes()
        first_compressed = first.compressed_path.read_bytes()
        payload = json.loads(first_raw)
        self.assertEqual(2, len(payload["equipmentSlots"]))

        second = self._write()

        self.assertEqual(first_raw, second.raw_path.read_bytes())
        self.assertEqual(first_compressed, second.compressed_path.read_bytes())
        self.assertEqual(first_raw, gzip.decompress(first_compressed))
        self.assertEqual(
            hashlib.sha256(first_compressed).hexdigest(), second.content_sha256
        )

    def test_failure_deletes_stale_and_partial_outputs(self):
        self.output.mkdir()
        for name in (RAW_PAYLOAD_NAME, COMPRESSED_PAYLOAD_NAME):
            (self.output / name).write_bytes(b"stale")
        self._write_exports(skill_type="unknown_effect")

        with self.assertRaisesRegex(PlannerPayloadError, "unclassified type"):
            self._write()

        self.assertFalse((self.output / RAW_PAYLOAD_NAME).exists())
        self.assertFalse((self.output / COMPRESSED_PAYLOAD_NAME).exists())

    def test_unclassified_active_skill_field_fails_publication(self):
        self._write_exports(extra_skill={"new_damage_rule": True})

        with self.assertRaisesRegex(PlannerPayloadError, "unclassified fields"):
            self._write()

    def test_redacted_identifier_is_checked_in_raw_and_gzip_outputs(self):
        with self.assertRaises(SurvivingReference):
            self._write(Subject({"sword"}, set(), []))

        self.assertFalse((self.output / RAW_PAYLOAD_NAME).exists())
        self.assertFalse((self.output / COMPRESSED_PAYLOAD_NAME).exists())

    def test_required_output_assertion_names_a_missing_file(self):
        self.output.mkdir()
        (self.output / RAW_PAYLOAD_NAME).write_bytes(b"{}")

        with self.assertRaisesRegex(PlannerPayloadError, COMPRESSED_PAYLOAD_NAME):
            assert_planner_payload_outputs(self.output)


if __name__ == "__main__":
    unittest.main()
