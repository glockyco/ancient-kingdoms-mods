import json
import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.denormalizers.skills import fixups

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


def _linear(base: float, per_level: float) -> str:
    return json.dumps({"base_value": base, "bonus_per_level": per_level})


class SkillFixupTests(unittest.TestCase):
    """A LinearValue resolves to bonus_per_level * (level - 1) + base_value, so a
    single-level skill can never reach its per-level growth."""

    def _run(self, rows: list[tuple[str, int, str, str]]) -> dict[str, tuple[str, str]]:
        with tempfile.TemporaryDirectory() as tmp:
            conn = create_database(Path(tmp) / "test.db", SCHEMA_PATH)
            try:
                conn.executemany(
                    """
                    INSERT INTO skills (id, name, skill_type, max_level, stun_chance, damage)
                    VALUES (?, ?, 'target_damage', ?, ?, ?)
                    """,
                    [(id_, id_, level, stun, dmg) for id_, level, stun, dmg in rows],
                )
                fixups.run(conn)
                return {
                    row[0]: (row[1], row[2])
                    for row in conn.execute(
                        "SELECT id, stun_chance, damage FROM skills"
                    ).fetchall()
                }
            finally:
                conn.close()

    def test_zeroes_per_level_growth_a_single_level_skill_cannot_reach(self):
        result = self._run(
            [("ant_attack", 1, _linear(0.01, 0.003), _linear(2, 1))],
        )

        stun, damage = result["ant_attack"]
        self.assertEqual(json.loads(stun), {"base_value": 0.01, "bonus_per_level": 0})
        self.assertEqual(json.loads(damage), {"base_value": 2, "bonus_per_level": 0})

    def test_keeps_per_level_growth_a_multi_level_skill_reaches(self):
        result = self._run(
            [("crush_strike", 5, _linear(0.01, 0.003), _linear(25, 25))],
        )

        stun, damage = result["crush_strike"]
        self.assertEqual(
            json.loads(stun), {"base_value": 0.01, "bonus_per_level": 0.003}
        )
        self.assertEqual(json.loads(damage), {"base_value": 25, "bonus_per_level": 25})
