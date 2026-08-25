import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from compendium.citations import LockEntry, Reference, Snapshot, digest
from compendium.citations.lockfile import Lockfile
from compendium.commands.citations import (
    Target,
    _compare,
    _pending_relocations,
    _shift,
    _sync,
    _tool_mismatch,
)


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


class PendingRelocationTests(unittest.TestCase):
    """A locator the source has left must be relocated before it is anchored.

    Anchoring it records whatever region now sits at the old position, and a
    later check compares content only, so the wrong anchor reads as verified
    from then on.
    """

    def build(self, directory: str, body: str) -> Snapshot:
        root = Path(directory) / "server-scripts"
        root.mkdir()
        (root / "Player.cs").write_text(body, encoding="utf-8")
        return Snapshot(root)

    def test_a_moved_target_is_reported_as_pending(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "inserted\nalpha\nbeta\ngamma\n")
            target = make_target("Player.cs", "2")
            target.sha256 = snapshot.digest(["alpha"])
            target.span = 1
            lock = Lockfile(targets={target.key: LockEntry(digest(["beta"]), 1, None)})

            pending = _pending_relocations(snapshot, [target], lock)

            self.assertEqual([entry.moved_to for entry in pending], ["3"])

    def test_an_unchanged_target_is_not_pending(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "alpha\nbeta\ngamma\n")
            target = make_target("Player.cs", "2")
            target.sha256 = snapshot.digest(["beta"])
            target.span = 1
            lock = Lockfile(targets={target.key: LockEntry(digest(["beta"]), 1, None)})

            self.assertEqual(_pending_relocations(snapshot, [target], lock), [])

    def test_the_caller_targets_keep_their_loaded_status(self):
        # A sync that proceeds reports what it anchored. Comparing in place would
        # make it report what it found instead.
        with tempfile.TemporaryDirectory() as directory:
            snapshot = self.build(directory, "inserted\nalpha\nbeta\ngamma\n")
            target = make_target("Player.cs", "2")
            target.sha256 = snapshot.digest(["alpha"])
            target.span = 1
            lock = Lockfile(targets={target.key: LockEntry(digest(["beta"]), 1, None)})

            _pending_relocations(snapshot, [target], lock)

            self.assertEqual(target.status, "ok")
            self.assertIsNone(target.moved_to)


class SyncGuardTests(unittest.TestCase):
    """`sync` refuses a tree with a pending relocation and leaves the ledger."""

    CITED_FILE = Path("website/src/lib/example.ts")

    def build(self, root: Path, body: str, locator: str) -> None:
        scripts = root / "server-scripts"
        scripts.mkdir()
        (scripts / "SNAPSHOT.toml").write_text(
            'game_version = "1.2.3"\nilspycmd_version = "10.1.1.8388"\n',
            encoding="utf-8",
        )
        (scripts / "Player.cs").write_text(body, encoding="utf-8")
        source = root / self.CITED_FILE
        source.parent.mkdir(parents=True)
        source.write_text(
            f"// Source: server-scripts/Player.cs:{locator} — beta is the anchor\n",
            encoding="utf-8",
        )

    def anchor(self, root: Path, locator: str) -> None:
        Lockfile(
            game_version="1.2.3",
            ilspycmd_version="10.1.1.8388",
            targets={f"Player.cs:{locator}": LockEntry(digest(["beta"]), 1, None)},
        ).save(root / "citations.lock.json")

    def test_sync_refuses_and_leaves_the_ledger_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            # The cited line still says 2, but "beta" now sits on line 3.
            self.build(root, "inserted\nalpha\nbeta\ngamma\n", "2")
            self.anchor(root, "2")
            lock_path = root / "citations.lock.json"
            before = lock_path.read_bytes()

            with patch(
                "compendium.commands.citations.iter_citation_files",
                return_value=[self.CITED_FILE],
            ):
                code = _sync(root, "1.2.3")

            self.assertEqual(code, 1)
            self.assertEqual(lock_path.read_bytes(), before)

    def test_sync_writes_once_the_locator_names_its_code(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.build(root, "inserted\nalpha\nbeta\ngamma\n", "3")
            self.anchor(root, "2")
            lock_path = root / "citations.lock.json"

            with patch(
                "compendium.commands.citations.iter_citation_files",
                return_value=[self.CITED_FILE],
            ):
                code = _sync(root, "1.2.3")

            self.assertEqual(code, 0)
            self.assertIn("Player.cs:3", Lockfile.load(lock_path).targets)


if __name__ == "__main__":
    unittest.main()
