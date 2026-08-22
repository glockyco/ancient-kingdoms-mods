import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.redactions import closure
from compendium.redactions.config import RedactionConfig

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

PUBLISHED = "northern_wastes"
REDACTED = "old_valorath"


class PolymorphicSummonTests(unittest.TestCase):
    """`summon_triggers.summoned_entity_id` names a monster or an NPC, and a
    second column on the row says which."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)

        self.conn.executemany(
            "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
            [(PUBLISHED, 22, "Northern Wastes"), (REDACTED, 25, "Old Valorath")],
        )
        # One identifier, used by a monster and by an NPC. Only the
        # discriminator distinguishes them.
        self.conn.execute(
            "INSERT INTO monsters (id, name) VALUES ('twin', 'Twin Monster')"
        )
        self.conn.executemany(
            "INSERT INTO npcs (id, name) VALUES (?, ?)",
            [("twin", "Twin NPC"), ("projection", "Astral Projection")],
        )
        self.conn.commit()

    def _summon(self, trigger_id, zone_id, kind, entity_id):
        self.conn.execute(
            "INSERT INTO summon_triggers "
            "(id, summoned_entity_type, summoned_entity_id, "
            "summoned_entity_name, zone_id) VALUES (?, ?, ?, ?, ?)",
            (trigger_id, kind, entity_id, "Summoned", zone_id),
        )
        self.conn.commit()

    def _run(self):
        return closure.run(self.conn, RedactionConfig(exclude_zone_ids={REDACTED}))

    def _present(self, table, entity_id):
        return (
            self.conn.execute(
                f"SELECT COUNT(*) FROM {table} WHERE id = ?", (entity_id,)
            ).fetchone()[0]
            == 1
        )

    def test_an_npc_summoned_in_a_published_zone_survives(self):
        self._summon("t1", PUBLISHED, "Npc", "projection")

        self._run()

        self.assertTrue(self._present("npcs", "projection"))
        self.assertTrue(self._present("summon_triggers", "t1"))

    def test_an_npc_summoned_only_in_a_redacted_zone_is_removed(self):
        self._summon("t1", REDACTED, "Npc", "projection")

        self._run()

        self.assertFalse(self._present("npcs", "projection"))
        self.assertFalse(self._present("summon_triggers", "t1"))

    def _spawn_npc_in_redacted_zone(self):
        self.conn.execute(
            "INSERT INTO npc_spawns (id, npc_id, zone_id) VALUES ('s1', 'twin', ?)",
            (REDACTED,),
        )
        self.conn.commit()

    def test_a_monster_summon_does_not_reach_the_npc_of_the_same_name(self):
        # The NPC lives only in the redacted zone. A trigger in a published zone
        # names the same identifier, but says Monster, so it reaches the monster
        # and leaves the NPC unreachable.
        self._spawn_npc_in_redacted_zone()
        self._summon("t1", PUBLISHED, "Monster", "twin")

        self._run()

        self.assertFalse(self._present("npcs", "twin"))
        self.assertTrue(self._present("monsters", "twin"))
        self.assertTrue(self._present("summon_triggers", "t1"))

    def test_an_npc_summon_reaches_the_npc_and_keeps_it(self):
        # The same shape, with the discriminator naming the other kind. Now the
        # trigger does reach the NPC, so the NPC survives losing its only spawn.
        self._spawn_npc_in_redacted_zone()
        self._summon("t1", PUBLISHED, "Npc", "twin")

        self._run()

        self.assertTrue(self._present("npcs", "twin"))

    def test_a_summon_of_one_kind_does_not_delete_the_row_of_the_other(self):
        # The monster is removed with its zone. The NPC trigger names the same
        # identifier and must survive, because it speaks about the NPC.
        self._summon("monster_trigger", REDACTED, "Monster", "twin")
        self._summon("npc_trigger", PUBLISHED, "Npc", "twin")

        self._run()

        self.assertFalse(self._present("monsters", "twin"))
        self.assertFalse(self._present("summon_triggers", "monster_trigger"))
        self.assertTrue(self._present("npcs", "twin"))
        self.assertTrue(self._present("summon_triggers", "npc_trigger"))


if __name__ == "__main__":
    unittest.main()
