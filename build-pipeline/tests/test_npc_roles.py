import json
import sqlite3
import unittest

from compendium.denormalizers.npcs import bitmask, relations
from compendium.denormalizers.search.keywords import _generate_npc_keywords
from compendium.models import NpcRoles


class NpcRoleTests(unittest.TestCase):
    def test_keeper_flag_survives_model_serialization(self):
        self.assertFalse(NpcRoles().is_chambers_of_chaos_keeper)
        roles = NpcRoles(is_chambers_of_chaos_keeper=True)
        self.assertTrue(
            json.loads(roles.model_dump_json())["is_chambers_of_chaos_keeper"]
        )

    def test_keeper_service_prevents_villager_classification_and_reaches_spawns(self):
        with sqlite3.connect(":memory:") as conn:
            conn.executescript("""
                CREATE TABLE npcs (id TEXT PRIMARY KEY, roles TEXT);
                CREATE TABLE npc_spawns (id TEXT PRIMARY KEY, npc_id TEXT, role_bitmask INTEGER);
            """)
            conn.executemany(
                "INSERT INTO npcs VALUES (?, ?)",
                [
                    (
                        "arbitrary_keeper",
                        json.dumps({"is_chambers_of_chaos_keeper": True}),
                    ),
                    ("mordrath_without_flag", "{}"),
                ],
            )
            conn.executemany(
                "INSERT INTO npc_spawns VALUES (?, ?, 0)",
                [
                    ("keeper_spawn", "arbitrary_keeper"),
                    ("villager_spawn", "mordrath_without_flag"),
                ],
            )
            self.assertEqual(relations._add_villager_role(conn), 1)
            roles = dict(conn.execute("SELECT id, roles FROM npcs"))
            self.assertFalse(json.loads(roles["arbitrary_keeper"])["is_villager"])
            self.assertTrue(json.loads(roles["mordrath_without_flag"])["is_villager"])
            bitmask.run(conn)
            self.assertEqual(
                dict(conn.execute("SELECT id, role_bitmask FROM npc_spawns")),
                {
                    "keeper_spawn": 1 << 22,
                    "villager_spawn": 1 << 19,
                },
            )

    def test_keeper_appends_bit_without_changing_existing_positions(self):
        existing = [
            "is_merchant",
            "is_quest_giver",
            "can_repair_equipment",
            "is_bank",
            "is_inkeeper",
            "is_soul_binder",
            "is_skill_master",
            "is_veteran_master",
            "is_reset_attributes",
            "is_faction_vendor",
            "is_essence_trader",
            "is_augmenter",
            "is_priestess",
            "is_renewal_sage",
            "is_taskgiver_adventurer",
            "is_merchant_adventurer",
            "is_recruiter_mercenaries",
            "is_guard",
            "is_teleporter",
            "is_villager",
            "is_guild_management",
            "is_barber",
        ]
        for position, key in enumerate(existing):
            self.assertEqual(bitmask.ROLE_BITS[key], position)
        self.assertEqual(
            bitmask._compute_role_bitmask(
                {
                    "is_chambers_of_chaos_keeper": True,
                    "is_merchant": True,
                }
            ),
            (1 << 22) | 1,
        )

    def test_keeper_search_uses_role_not_name(self):
        words = _generate_npc_keywords(
            json.dumps({"is_chambers_of_chaos_keeper": True}), False
        )
        self.assertTrue(
            {"chambers", "chaos", "keeper", "entry"}.issubset(words.split())
        )
        other = _generate_npc_keywords(json.dumps({"is_bank": True}), False)
        self.assertNotIn("chambers", other.split())


if __name__ == "__main__":
    unittest.main()
