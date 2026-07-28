from pathlib import Path
import tempfile
import unittest

from compendium.citations.snapshot import (
    AmbiguousCitationError,
    Snapshot,
    digest,
    is_substantive,
)


class SnapshotTests(unittest.TestCase):
    def make_snapshot(self, directory: str) -> Path:
        root = Path(directory) / "server-scripts"
        (root / "nested").mkdir(parents=True)
        (root / "Player.cs").write_text(
            "alpha  \n\npublic void Method()\n{\n    return;\n}\nomega\n",
            encoding="utf-8",
        )
        (root / "nested" / "Other.cs").write_text("one\ntwo\nthree\n", encoding="utf-8")
        (root / "SNAPSHOT.toml").write_text(
            'game_version = "0.9.26.0"\nilspycmd_version = "10.1.1.8388"\n',
            encoding="utf-8",
        )
        return root

    def test_identity_and_literal_resolution(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = Snapshot(self.make_snapshot(directory))
            self.assertEqual(snapshot.identity.game_version, "0.9.26.0")
            self.assertEqual(snapshot.resolve("Player.cs"), "Player.cs")
            self.assertEqual(snapshot.resolve("nested/Other.cs"), "nested/Other.cs")

    def test_basename_ambiguity_is_explicit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = self.make_snapshot(directory)
            (root / "other").mkdir()
            (root / "nested" / "Widget.cs").write_text("one\n", encoding="utf-8")
            (root / "other" / "Widget.cs").write_text("two\n", encoding="utf-8")
            with self.assertRaises(AmbiguousCitationError) as context:
                Snapshot(root).resolve("Widget.cs")
            self.assertEqual(
                context.exception.candidates,
                ("nested/Widget.cs", "other/Widget.cs"),
            )

    def test_literal_path_wins_over_ambiguous_basename(self):
        with tempfile.TemporaryDirectory() as directory:
            root = self.make_snapshot(directory)
            (root / "nested" / "Player.cs").write_text("duplicate\n", encoding="utf-8")
            self.assertEqual(Snapshot(root).resolve("Player.cs"), "Player.cs")
            self.assertEqual(
                Snapshot(root).resolve("nested/Player.cs"), "nested/Player.cs"
            )

    def test_regions_and_digest_relocate_content(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = Snapshot(self.make_snapshot(directory))
            lines = snapshot.region("Player.cs", "3-5")
            self.assertEqual(lines, ["public void Method()", "{", "    return;"])
            sha = snapshot.digest(["alpha  ", "beta"])
            self.assertEqual(sha, digest(["alpha  ", "beta"]))
            self.assertEqual(snapshot.locate("Player.cs", digest(lines), 3), [3])

    def test_out_of_range_and_unknown_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = self.make_snapshot(directory)
            (root / "SNAPSHOT.toml").unlink()
            snapshot = Snapshot(root)
            self.assertIsNone(snapshot.identity.game_version)
            self.assertEqual(snapshot.region("Player.cs", "100-110"), [])

    def test_substantive_detection(self):
        self.assertFalse(is_substantive(["", "  }", "{"]))
        self.assertTrue(is_substantive(["  // comment"]))


if __name__ == "__main__":
    unittest.main()
