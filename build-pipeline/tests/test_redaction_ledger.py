import json
import tempfile
import unittest
from pathlib import Path

from compendium.redactions.ledger import Entry, Ledger, compare

REPO_LEDGER = Path(__file__).resolve().parents[2] / "redactions.lock.json"


def _entry(key, mechanism="cascade", via=(), distance=1, reason="a reason"):
    return Entry(
        key=key, mechanism=mechanism, reason=reason, distance=distance, via=tuple(via)
    )


def _ledger(*entries, zones=None):
    return Ledger(
        game_version="0.0.0",
        removed={entry.key: entry for entry in entries},
        suppressed_zones=zones or {},
    )


class LedgerFormatTests(unittest.TestCase):
    def test_writing_the_same_decisions_twice_gives_identical_bytes(self):
        ledger = _ledger(_entry("items:b"), _entry("items:a"), zones={"z": 3})

        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "one.json"
            second = Path(directory) / "two.json"
            ledger.write(first)
            # Build the same decisions in another order.
            other = _ledger(_entry("items:a"), _entry("items:b"), zones={"z": 3})
            other.write(second)

            self.assertEqual(first.read_bytes(), second.read_bytes())

    def test_a_ledger_survives_a_round_trip(self):
        ledger = _ledger(
            _entry("items:a", via=("monsters:m",), distance=2),
            _entry("zones:z", mechanism="unreleased_zone", distance=0),
            zones={"temple": 885},
        )

        restored = Ledger.from_dict(json.loads(ledger.to_json()))

        self.assertEqual(restored.to_json(), ledger.to_json())

    def test_a_seed_records_no_pass_and_no_parents(self):
        ledger = _ledger(_entry("zones:z", mechanism="manual", distance=0))

        record = json.loads(ledger.to_json())["removed"]["zones:z"]

        self.assertNotIn("pass", record)
        self.assertNotIn("via", record)


class LedgerComparisonTests(unittest.TestCase):
    def test_an_unchanged_ledger_reports_nothing(self):
        recorded = _ledger(_entry("items:a"))

        self.assertEqual(compare(recorded, _ledger(_entry("items:a"))), [])

    def test_a_new_removal_is_reported_as_appeared(self):
        differences = compare(_ledger(), _ledger(_entry("items:a")))

        self.assertEqual([d.kind for d in differences], ["appeared"])
        self.assertEqual(differences[0].key, "items:a")

    def test_a_removal_that_stopped_is_reported_as_disappeared(self):
        differences = compare(_ledger(_entry("items:a")), _ledger())

        self.assertEqual([d.kind for d in differences], ["disappeared"])

    def test_a_changed_mechanism_is_reported(self):
        differences = compare(
            _ledger(_entry("items:a", mechanism="manual")),
            _ledger(_entry("items:a", mechanism="cascade")),
        )

        self.assertEqual([d.kind for d in differences], ["changed"])

    def test_a_changed_provenance_is_reported(self):
        differences = compare(
            _ledger(_entry("items:a", via=("monsters:one",))),
            _ledger(_entry("items:a", via=("monsters:two",))),
        )

        self.assertEqual([d.kind for d in differences], ["changed"])
        self.assertIn("monsters:two", differences[0].detail)

    def test_a_zone_gaining_suppression_is_reported(self):
        differences = compare(_ledger(), _ledger(zones={"temple": 1}))

        self.assertEqual([d.kind for d in differences], ["appeared"])


class CommittedLedgerTests(unittest.TestCase):
    """The committed ledger is the record the build is checked against."""

    def setUp(self):
        if not REPO_LEDGER.exists():
            self.skipTest("no committed ledger")
        self.ledger = Ledger.read(REPO_LEDGER)

    def test_the_committed_file_is_written_in_its_canonical_form(self):
        self.assertEqual(REPO_LEDGER.read_text(encoding="utf-8"), self.ledger.to_json())

    def test_every_cascade_entry_names_what_it_followed(self):
        for entry in self.ledger.removed.values():
            if entry.mechanism == "cascade":
                self.assertTrue(entry.via, f"{entry.key} followed nothing")

    def test_every_parent_is_itself_recorded_as_removed(self):
        for entry in self.ledger.removed.values():
            for parent in entry.via:
                self.assertIn(parent, self.ledger.removed, f"{entry.key} -> {parent}")


if __name__ == "__main__":
    unittest.main()
