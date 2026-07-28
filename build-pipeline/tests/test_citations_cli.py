import tempfile
import unittest
from pathlib import Path

from typer.testing import CliRunner

from compendium.citations.parser import iter_citation_files
from compendium.cli import app


class CitationsCliTests(unittest.TestCase):
    """Tests for the citations sub-app registration.

    Every invocation passes an explicit --config. The repository's own
    config.toml is gitignored, and Click runs the root callback - which loads
    config - before descending into a sub-group, so a test that relied on the
    ambient file would pass locally and fail on a clean checkout.
    """

    def invoke(self, *args: str):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "config.toml"
            config.write_text("", encoding="utf-8")
            return CliRunner().invoke(app, ["--config", str(config), *args])

    def test_citations_appears_in_root_help(self):
        result = CliRunner().invoke(app, ["--help"])

        self.assertEqual(result.exit_code, 0)
        self.assertIn("citations", result.output)

    def test_citations_help_lists_every_action(self):
        result = self.invoke("citations", "--help")

        self.assertEqual(result.exit_code, 0)
        for action in ("check", "sync", "fix", "suggest"):
            self.assertIn(action, result.output)

    def test_sync_requires_game_version(self):
        result = self.invoke("citations", "sync")

        self.assertNotEqual(result.exit_code, 0)
        self.assertIn("game-version", result.output)


class CitationDiscoveryTests(unittest.TestCase):
    def test_discovery_skips_tests_and_unsupported_extensions(self):
        repo_root = Path(__file__).resolve().parents[2]

        discovered = iter_citation_files(repo_root)

        self.assertTrue(discovered)
        self.assertFalse([path for path in discovered if "tests" in path.parts])
        self.assertFalse([path for path in discovered if path.suffix == ".md"])


if __name__ == "__main__":
    unittest.main()
