import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.denormalizers.acquisition import STAGING_FAMILIES
from compendium.redactions import closure, rekey, validate_semantics
from compendium.redactions.config import RedactionConfig
from compendium.redactions.references import resolve

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
        for family in STAGING_FAMILIES:
            self.conn.execute(f'DROP TABLE "_acquisition_input_{family}"')

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
        spawn_id = f"{trigger_id}_configured_target"
        table, entity_column, target_column = (
            ("monster_spawns", "monster_id", "summoned_monster_spawn_id")
            if kind == "Monster"
            else ("npc_spawns", "npc_id", "summoned_npc_spawn_id")
        )
        self.conn.execute(
            f"INSERT INTO {table}(id,{entity_column},zone_id) VALUES (?,?,?)",
            (spawn_id, entity_id, zone_id),
        )
        self.conn.execute(
            "INSERT INTO summon_triggers "
            "(id, summoned_entity_type, summoned_entity_id, "
            "summoned_entity_name, zone_id, summoned_is_summonable, "
            f"summoned_respawn_time, summoned_respawn_probability, {target_column}) "
            "VALUES (?, ?, ?, ?, ?, 1, 60, 1, ?)",
            (trigger_id, kind, entity_id, "Summoned", zone_id, spawn_id),
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

    def test_removed_guard_remains_an_unknown_ordered_operand(self):
        self._summon("public_trigger", PUBLISHED, "Monster", "twin")
        self.conn.execute("INSERT INTO monsters(id,name) VALUES ('guard','Guard')")
        self.conn.execute(
            "INSERT INTO monster_spawns(id,monster_id,zone_id) VALUES ('private_guard','guard',?)",
            (REDACTED,),
        )
        self.conn.execute(
            "INSERT INTO summon_trigger_placeholders(id,trigger_id,spawn_id,placeholder_order) VALUES ('private_guard_link','public_trigger','private_guard',3)"
        )
        self._run()
        self.assertEqual(
            self.conn.execute(
                "SELECT spawn_id,withheld,placeholder_order FROM summon_trigger_placeholders"
            ).fetchone(),
            (None, 1, 3),
        )
        self.assertTrue(self._present("summon_triggers", "public_trigger"))
        rekey(self.conn)
        validate_semantics(self.conn)

    def test_exact_target_removal_never_retargets_same_template(self):
        self._summon("public_trigger", PUBLISHED, "Monster", "twin")
        self.conn.execute(
            "INSERT INTO monster_spawns(id,monster_id,zone_id) VALUES ('another_twin','twin',?)",
            (PUBLISHED,),
        )
        self.conn.execute(
            "UPDATE summon_triggers SET spawn_position_x=12,spawn_position_y=34 WHERE id='public_trigger'"
        )
        removed = [
            closure.Removal(
                "monster_spawns",
                "public_trigger_configured_target",
                "manual",
                "withheld exact target",
            )
        ]
        closure.apply(self.conn, removed, resolve(self.conn))
        self.assertEqual(
            self.conn.execute(
                "SELECT summoned_entity_type,summoned_monster_spawn_id,summoned_target_withheld,spawn_position_x,spawn_position_y FROM summon_triggers"
            ).fetchone(),
            ("Monster", None, 1, None, None),
        )
        self.assertTrue(self._present("monster_spawns", "another_twin"))


if __name__ == "__main__":
    unittest.main()
