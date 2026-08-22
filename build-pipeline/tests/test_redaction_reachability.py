import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.redactions import closure
from compendium.redactions.config import RedactionConfig

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

PUBLISHED = "northern_wastes"
REDACTED = "old_valorath"


class ReachabilityTestCase(unittest.TestCase):
    """Fixtures for deciding what a zone removal takes with it."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)
        self.conn.executemany(
            "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
            [(PUBLISHED, 22, "Northern Wastes"), (REDACTED, 25, "Old Valorath")],
        )
        self.conn.commit()

    def _monster(self, monster_id, *zones):
        self.conn.execute(
            "INSERT INTO monsters (id, name) VALUES (?, ?)", (monster_id, monster_id)
        )
        for zone in zones:
            self.conn.execute(
                "INSERT INTO monster_spawns (id, monster_id, zone_id) VALUES (?, ?, ?)",
                (f"{monster_id}_{zone}", monster_id, zone),
            )
        self.conn.commit()

    def _dropped_by(self, item_id, monster_id, zone):
        """Give an item a public source, so it is live rather than unconnected."""
        self._monster(monster_id, zone)
        self.conn.execute(
            "UPDATE monsters SET drops = ? WHERE id = ?",
            (f'[{{"item_id": "{item_id}", "rate": 0.5}}]', monster_id),
        )
        self.conn.commit()

    def _item(self, item_id, **columns):
        columns.setdefault("travel_zone_id", None)
        names = ", ".join(["id", "name", *columns])
        marks = ", ".join(["?"] * (2 + len(columns)))
        self.conn.execute(
            f"INSERT INTO items ({names}) VALUES ({marks})",
            (item_id, item_id, *columns.values()),
        )
        self.conn.commit()

    def _skill(self, skill_id):
        self.conn.execute(
            "INSERT INTO skills (id, name, skill_type) VALUES (?, ?, 'attack')",
            (skill_id, skill_id),
        )
        self.conn.commit()

    def _run(self, **kwargs):
        kwargs.setdefault("exclude_zone_ids", {REDACTED})
        return closure.run(self.conn, RedactionConfig(**kwargs))

    def _present(self, table, entity_id):
        return (
            self.conn.execute(
                f"SELECT COUNT(*) FROM {table} WHERE id = ?", (entity_id,)
            ).fetchone()[0]
            == 1
        )

    def _spawn_zones(self, monster_id):
        return {
            row[0]
            for row in self.conn.execute(
                "SELECT zone_id FROM monster_spawns WHERE monster_id = ?", (monster_id,)
            )
        }


class SharedSourceTests(ReachabilityTestCase):
    """An entity with a surviving public source stays published.

    This is what keeps Earth Elemental on the site: it spawns inside the
    excluded zone and in three released zones.
    """

    def test_a_monster_spawning_in_both_zones_survives(self):
        self._monster("shared", PUBLISHED, REDACTED)

        self._run()

        self.assertTrue(self._present("monsters", "shared"))

    def test_it_keeps_only_its_published_spawns(self):
        self._monster("shared", PUBLISHED, REDACTED)

        self._run()

        self.assertEqual(self._spawn_zones("shared"), {PUBLISHED})

    def test_a_monster_spawning_only_in_the_excluded_zone_is_removed(self):
        self._monster("private", REDACTED)

        self._run()

        self.assertFalse(self._present("monsters", "private"))


class DepthTests(ReachabilityTestCase):
    """Removal follows references beyond one step."""

    def test_removal_reaches_an_item_two_steps_away(self):
        # zone -> spawn -> monster -> drop -> item
        self._item("loot")
        self._monster("dropper", REDACTED)
        self.conn.execute(
            "UPDATE monsters SET drops = ? WHERE id = 'dropper'",
            ('[{"item_id": "loot", "rate": 0.1}]',),
        )
        self.conn.commit()

        removals = self._run()

        self.assertFalse(self._present("items", "loot"))
        depth = next(r.distance for r in removals if r.entity_id == "loot")
        self.assertGreater(depth, 1)

    def test_the_reason_chain_names_what_it_followed(self):
        self._item("loot")
        self._monster("dropper", REDACTED)
        self.conn.execute(
            "UPDATE monsters SET drops = ? WHERE id = 'dropper'",
            ('[{"item_id": "loot", "rate": 0.1}]',),
        )
        self.conn.commit()

        removals = self._run()

        followed = next(r.via for r in removals if r.entity_id == "loot")
        self.assertIn("monsters:dropper", followed)


class UnconnectedContentTests(ReachabilityTestCase):
    """Content reachable from nothing is untouched.

    Removal is the difference between two closures, not a hunt for orphans. The
    published database holds 94 items with no source, several on purpose.
    """

    def test_an_item_with_no_source_at_all_survives(self):
        self._item("unconnected")

        self._run()

        self.assertTrue(self._present("items", "unconnected"))

    def test_a_skill_with_no_user_at_all_survives(self):
        self._skill("unused")

        self._run()

        self.assertTrue(self._present("skills", "unused"))


class ReferenceKindTests(ReachabilityTestCase):
    """Reachability considers every kind of reference, not monster use alone."""

    def test_a_skill_used_only_as_a_weapon_proc_survives(self):
        # The weapon must be live. An item no zone can reach is untouched, and
        # it confers no reachability on the skill it names.
        self._skill("proc")
        self._item("blade", weapon_proc_effect_id="proc")
        self._dropped_by("blade", "seller", PUBLISHED)
        self._monster("carrier", REDACTED)
        self.conn.execute(
            "INSERT INTO monster_skills "
            "(monster_id, skill_id, skill_index, runtime_level) VALUES (?, ?, 0, 1)",
            ("carrier", "proc"),
        )
        self.conn.commit()

        self._run()

        self.assertFalse(self._present("monsters", "carrier"))
        self.assertTrue(self._present("skills", "proc"))
        self.assertTrue(self._present("items", "blade"))

    def test_a_skill_reaching_nothing_else_goes_with_its_monster(self):
        self._skill("private_proc")
        self._monster("carrier", REDACTED)
        self.conn.execute(
            "INSERT INTO monster_skills "
            "(monster_id, skill_id, skill_index, runtime_level) VALUES (?, ?, 0, 1)",
            ("carrier", "private_proc"),
        )
        self.conn.commit()

        self._run()

        self.assertFalse(self._present("skills", "private_proc"))

    def test_an_unreachable_weapon_does_not_keep_its_proc_alive(self):
        """The boundary the requirement turns on: the weapon must be live.

        An item no zone can reach is left published, because removal is a
        subtraction rather than a hunt for orphans. It is not a source, so it
        cannot save a skill whose only other user is removed.
        """
        self._skill("proc")
        self._item("unreachable_blade", weapon_proc_effect_id="proc")
        self._monster("carrier", REDACTED)
        self.conn.execute(
            "INSERT INTO monster_skills "
            "(monster_id, skill_id, skill_index, runtime_level) VALUES (?, ?, 0, 1)",
            ("carrier", "proc"),
        )
        self.conn.commit()

        self._run()

        self.assertTrue(self._present("items", "unreachable_blade"))
        self.assertFalse(self._present("skills", "proc"))

    def test_a_relic_buff_keeps_its_skill(self):
        self._skill("blessing")
        self._item("relic", relic_buff_id="blessing")
        self._dropped_by("relic", "keeper", PUBLISHED)
        self._monster("carrier", REDACTED)
        self.conn.execute(
            "INSERT INTO monster_skills "
            "(monster_id, skill_id, skill_index, runtime_level) VALUES (?, ?, 0, 1)",
            ("carrier", "blessing"),
        )
        self.conn.commit()

        self._run()

        self.assertTrue(self._present("skills", "blessing"))


class ProseTests(ReachabilityTestCase):
    """Prose that names an excluded zone is not a reference."""

    def test_a_name_holding_the_zone_name_does_not_cause_removal(self):
        self._item("key_to_old_valorath")
        self.conn.execute(
            "UPDATE items SET name = 'Key to Old Valorath' "
            "WHERE id = 'key_to_old_valorath'"
        )
        self.conn.commit()

        self._run()

        self.assertTrue(self._present("items", "key_to_old_valorath"))

    def test_a_description_naming_the_zone_does_not_cause_removal(self):
        self._item("tome", tooltip_html="Tales of Old Valorath and its fall")

        self._run()

        self.assertTrue(self._present("items", "tome"))


if __name__ == "__main__":
    unittest.main()
