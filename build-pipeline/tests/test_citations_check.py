import tempfile
import unittest
from pathlib import Path

from compendium.citations import LockEntry, Reference, Snapshot, digest
from compendium.citations.lockfile import Lockfile
from compendium.commands.citations import Target, _compare, _shift, _tool_mismatch


def make_target(rel: str, locator: str) -> Target:
    reference = Reference(rel, locator, "website/src/example.ts", 1, 3)
    return Target(
        key=f"{rel}:{locator}",
        rel=rel,
        locator=locator,
        references=[reference],
    )


class ShiftTests(unittest.TestCase):
    def test_shift_preserves_span(self):
        self.assertEqual(_shift("298", 343), "343")
        self.assertEqual(_shift("162-171", 200), "200-209")


class ToolMismatchTests(unittest.TestCase):
    def make_snapshot(self, directory: str, version: str | None) -> Snapshot:
        root = Path(directory) / "server-scripts"
        root.mkdir()
        if version is not None:
            (root / "SNAPSHOT.toml").write_text(
                f'ilspycmd_version = "{version}"\n', encoding="utf-8"
            )
        return Snapshot(root)

    def test_matching_versions_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.make_snapshot(directory, "10.1.1.8388")
            lock = Lockfile(ilspycmd_version="10.1.1.8388")
            self.assertIsNone(_tool_mismatch(snapshot, lock))

    def test_differing_versions_are_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.make_snapshot(directory, "9.1.0.7988")
            lock = Lockfile(ilspycmd_version="10.1.1.8388")
            message = _tool_mismatch(snapshot, lock)
            self.assertIsNotNone(message)
            assert message is not None
            self.assertIn("9.1.0.7988", message)
            self.assertIn("10.1.1.8388", message)

    def test_unknown_snapshot_version_does_not_trip_the_guard(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.make_snapshot(directory, None)
            lock = Lockfile(ilspycmd_version="10.1.1.8388")
            self.assertIsNone(_tool_mismatch(snapshot, lock))


class CompareTests(unittest.TestCase):
    def build(self, directory: str, body: str) -> Snapshot:
        root = Path(directory) / "server-scripts"
        root.mkdir()
        (root / "Player.cs").write_text(body, encoding="utf-8")
        return Snapshot(root)

    def test_unchanged_region_is_ok(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "alpha\nbeta\ngamma\n")
            target = make_target("Player.cs", "2")
            target.sha256 = snapshot.digest(["beta"])
            target.span = 1
            _compare(snapshot, target, LockEntry(digest(["beta"]), 1, None))
            self.assertEqual(target.status, "ok")

    def test_shifted_region_is_moved_with_a_new_locator(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "inserted\nalpha\nbeta\ngamma\n")
            target = make_target("Player.cs", "2")
            target.sha256 = snapshot.digest(["alpha"])
            target.span = 1
            _compare(snapshot, target, LockEntry(digest(["beta"]), 1, None))
            self.assertEqual(target.status, "moved")
            self.assertEqual(target.moved_to, "3")

    def test_rewritten_region_is_changed(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "alpha\nrewritten\ngamma\n")
            target = make_target("Player.cs", "2")
            target.sha256 = snapshot.digest(["rewritten"])
            target.span = 1
            _compare(snapshot, target, LockEntry(digest(["beta"]), 1, None))
            self.assertEqual(target.status, "changed")

    def test_repeated_region_is_ambiguous_and_never_guessed(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "alpha\nchanged\nbeta\nbeta\n")
            target = make_target("Player.cs", "2")
            target.sha256 = snapshot.digest(["changed"])
            target.span = 1
            _compare(snapshot, target, LockEntry(digest(["beta"]), 1, None))
            self.assertEqual(target.status, "ambiguous")
            self.assertIsNone(target.moved_to)

    def test_missing_lockfile_entry_is_changed(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "alpha\nbeta\n")
            target = make_target("Player.cs", "2")
            _compare(snapshot, target, None)
            self.assertEqual(target.status, "changed")

    def test_recorded_suspect_note_survives(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "alpha\nbeta\n")
            target = make_target("Player.cs", "2")
            _compare(snapshot, target, LockEntry(None, 0, "cited line is a brace"))
            self.assertEqual(target.status, "suspect")
            self.assertEqual(target.suspect, "cited line is a brace")


if __name__ == "__main__":
    unittest.main()
