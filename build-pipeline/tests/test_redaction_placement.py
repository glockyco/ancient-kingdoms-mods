"""What identity the ledger records a removed row under.

A placement identifier the exporter writes ends in the runtime number of the
object it read, which differs in the next game build. These tests hold the
ledger to recording where a placement stands instead.
"""

import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from compendium.commands import redactions as redactions_cmd
from compendium.db import create_database
from compendium.redactions import closure, verify
from compendium.redactions.config import RedactionConfig
from compendium.redactions.ledger import Entry, Ledger, UnknownKeySpace, compare
from compendium.redactions.placement import stem

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

PUBLISHED = "northern_wastes"
REDACTED = "old_valorath"


class PlacementTestCase(unittest.TestCase):
    """A redacted zone holding one monster with placed spawns."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)
        self.conn.executemany(
            "INSERT INTO zones (id, zone_id, name) VALUES (?, ?, ?)",
            [(PUBLISHED, 22, "Northern Wastes"), (REDACTED, 25, "Old Valorath")],
        )
        self.conn.execute(
            "INSERT INTO monsters (id, name) VALUES ('plague_rat', 'Plague Rat')"
        )
        self.conn.commit()

    def _spawn(self, entity_id, x, y, zone=REDACTED):
        self.conn.execute(
            "INSERT INTO monster_spawns (id, monster_id, zone_id, position_x, "
            "position_y) VALUES (?, 'plague_rat', ?, ?, ?)",
            (entity_id, zone, x, y),
        )
        self.conn.commit()

    def _trigger(self, entity_id, x, y):
        """A positioned row whose identifier is authored rather than numbered."""
        self.conn.execute(
            "INSERT INTO zone_triggers (id, name, zone_id, position_x, position_y) "
            "VALUES (?, ?, ?, ?, ?)",
            (entity_id, entity_id, 25, x, y),
        )
        self.conn.commit()

    def _ledger(self):
        removals, _ = closure.decide(
            self.conn, RedactionConfig(exclude_zone_ids={REDACTED})
        )
        return Ledger(
            removed={
                removal.key: Entry(
                    key=removal.key,
                    mechanism=removal.mechanism,
                    reason=removal.reason,
                    distance=removal.distance,
                    via=tuple(removal.via),
                )
                for removal in removals
            },
        )

    def _keys(self, table):
        return sorted(
            key for key in self._ledger().removed if key.startswith(f"{table}:")
        )


class RecordedIdentityTests(PlacementTestCase):
    def test_a_removed_placement_is_recorded_where_it_stands(self):
        self._spawn("plague_rat_old_valorath_1838820", 807.57, 746.67)

        self.assertEqual(
            self._keys("monster_spawns"),
            ["monster_spawns:plague_rat_old_valorath@808,747"],
        )

    def test_the_recorded_identity_still_names_the_placed_entity(self):
        self._spawn("plague_rat_old_valorath_1838820", 807.57, 746.67)

        key = self._keys("monster_spawns")[0]

        self.assertIn("plague_rat", key)

    def test_an_authored_identifier_is_kept(self):
        self._trigger("zone_trigger_upper_old_valorath", 12.0, 34.0)

        self.assertEqual(
            self._keys("zone_triggers"),
            ["zone_triggers:zone_trigger_upper_old_valorath"],
        )

    def test_a_row_with_no_position_keeps_its_identifier(self):
        self.conn.execute(
            "INSERT INTO monster_spawns (id, monster_id, zone_id) "
            "VALUES ('plague_rat_old_valorath_1838820', 'plague_rat', ?)",
            (REDACTED,),
        )
        self.conn.commit()

        self.assertEqual(
            self._keys("monster_spawns"),
            ["monster_spawns:plague_rat_old_valorath_1838820"],
        )

    def test_a_parent_is_named_by_the_identity_it_is_recorded_under(self):
        self._spawn("plague_rat_old_valorath_1838820", 807.57, 746.67)

        ledger = self._ledger()

        for entry in ledger.removed.values():
            for parent in entry.via:
                self.assertIn(parent, ledger.removed, f"{entry.key} -> {parent}")


class BuildStabilityTests(PlacementTestCase):
    def test_renumbering_a_placement_leaves_the_ledger_unchanged(self):
        self._spawn("plague_rat_old_valorath_1838820", 807.57, 746.67)
        before = self._ledger()

        self.conn.execute(
            "UPDATE monster_spawns SET id = 'plague_rat_old_valorath_2447901'"
        )
        self.conn.commit()

        self.assertEqual(compare(before, self._ledger()), [])

    def test_moving_a_placement_beyond_the_rounding_changes_its_entry(self):
        self._spawn("plague_rat_old_valorath_1838820", 807.57, 746.67)
        before = self._ledger()

        self.conn.execute("UPDATE monster_spawns SET position_x = 812.31")
        self.conn.commit()

        differences = compare(before, self._ledger())
        moved = [d for d in differences if d.key.startswith("monster_spawns:")]
        # The monster's own removal followed its spawn, so the chain it records
        # names the identity that changed.
        chained = [d for d in differences if d.key == "monsters:plague_rat"]

        self.assertEqual(sorted(d.kind for d in moved), ["appeared", "disappeared"])
        self.assertEqual([d.kind for d in chained], ["changed"])

    def test_a_nudge_below_the_rounding_does_not(self):
        self._spawn("plague_rat_old_valorath_1838820", 807.57, 746.67)
        before = self._ledger()

        self.conn.execute("UPDATE monster_spawns SET position_x = 807.61")
        self.conn.commit()

        self.assertEqual(compare(before, self._ledger()), [])

    def test_two_placements_of_one_entity_are_recorded_apart(self):
        self._spawn("plague_rat_old_valorath_1838820", 807.57, 746.67)
        self._spawn("plague_rat_old_valorath_1838821", 120.0, 44.4)

        self.assertEqual(len(self._keys("monster_spawns")), 2)


class KeySpaceTests(unittest.TestCase):
    """A ledger keyed by the previous identity is refused, not compared."""

    def test_a_ledger_without_the_marker_is_refused(self):
        with self.assertRaises(UnknownKeySpace):
            Ledger.from_dict(
                {
                    "snapshot": {"game_version": "0.9.31.0"},
                    "removed": {
                        "monster_spawns:plague_rat_old_valorath_1838820": {
                            "mechanism": "cascade",
                            "reason": "a reason",
                        }
                    },
                }
            )

    def test_an_empty_ledger_needs_no_marker(self):
        self.assertEqual(Ledger.from_dict({"removed": {}}).removed, {})

    def test_a_written_ledger_reads_back(self):
        ledger = Ledger(
            game_version="0.9.31.0",
            removed={
                "monster_spawns:plague_rat_old_valorath@808,747": Entry(
                    key="monster_spawns:plague_rat_old_valorath@808,747",
                    mechanism="cascade",
                    reason="a reason",
                    distance=1,
                    via=("zones:old_valorath",),
                )
            },
        )

        restored = Ledger.from_dict(ledger.to_dict())

        self.assertEqual(restored.to_json(), ledger.to_json())


class StemTests(unittest.TestCase):
    def test_a_runtime_number_is_dropped(self):
        self.assertEqual(
            stem("plague_rat_old_valorath_1838820"), "plague_rat_old_valorath"
        )

    def test_an_authored_name_is_kept(self):
        self.assertEqual(stem("bonebreachhouseeast"), "bonebreachhouseeast")

    def test_a_name_holding_a_number_keeps_it(self):
        self.assertEqual(
            stem("chest_rf_greendungeon1_1_crescent_coast_1694614"),
            "chest_rf_greendungeon1_1_crescent_coast",
        )


class ScanSetTests(unittest.TestCase):
    """What the surviving-reference check scans for."""

    def _removal(self, table, entity_id):
        return closure.Removal(
            table=table,
            entity_id=entity_id,
            mechanism="cascade",
            reason="a reason",
        )

    def test_the_scan_set_comes_from_the_current_removals(self):
        current = [self._removal("items", "gloomwarden_armor_bonus_set")]

        with patch.object(redactions_cmd, "_removals", return_value=(current, {}, {})):
            identifiers = redactions_cmd._scan_identifiers(Path("."), {})

        self.assertEqual(identifiers, {"gloomwarden_armor_bonus_set"})

    def test_a_stale_ledger_does_not_narrow_the_scan_set(self):
        """The 0.9.31.0 defect: the check passed on a set that predated the data."""
        recorded = Ledger(
            removed={
                "items:old_valorath_token": Entry(
                    key="items:old_valorath_token",
                    mechanism="manual",
                    reason="a reason",
                    distance=0,
                    via=(),
                )
            },
        )
        with tempfile.TemporaryDirectory() as directory:
            repo_root = Path(directory)
            recorded.write(repo_root / "redactions.lock.json")
            current = [self._removal("items", "gloomwarden_armor_bonus_set")]

            with patch.object(
                redactions_cmd, "_removals", return_value=(current, {}, {})
            ):
                identifiers = redactions_cmd._scan_identifiers(repo_root, {})

        self.assertIn("gloomwarden_armor_bonus_set", identifiers)
        self.assertNotIn("old_valorath_token", identifiers)

    def test_a_published_value_naming_an_unrecorded_removal_is_found(self):
        conn = sqlite3.connect(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE pages (id TEXT PRIMARY KEY, body TEXT)")
        conn.execute(
            "INSERT INTO pages VALUES ('a', 'grants gloomwarden_armor_bonus_set')"
        )
        conn.commit()
        current = [self._removal("items", "gloomwarden_armor_bonus_set")]

        with patch.object(redactions_cmd, "_removals", return_value=(current, {}, {})):
            identifiers = redactions_cmd._scan_identifiers(Path("."), {})

        findings = verify.scan(conn, identifiers)

        self.assertEqual(
            [f.identifier for f in findings], ["gloomwarden_armor_bonus_set"]
        )


if __name__ == "__main__":
    unittest.main()
