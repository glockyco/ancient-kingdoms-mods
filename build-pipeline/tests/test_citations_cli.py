import unittest
from pathlib import Path

from typer.testing import CliRunner

from compendium.citations.parser import iter_citation_files
from compendium.cli import app


class CitationsCliTests(unittest.TestCase):
    def test_citations_appears_in_root_help(self):
        result = CliRunner().invoke(app, ["--help"])

        self.assertEqual(result.exit_code, 0)
        self.assertIn("citations", result.output)

    def test_citations_help_lists_every_action(self):
        result = CliRunner().invoke(app, ["citations", "--help"])

        self.assertEqual(result.exit_code, 0)
        for action in ("check", "sync", "fix", "suggest"):
            self.assertIn(action, result.output)

    def test_sync_requires_game_version(self):
        result = CliRunner().invoke(app, ["citations", "sync"])

        self.assertNotEqual(result.exit_code, 0)


class CitationDiscoveryTests(unittest.TestCase):
    def test_discovery_skips_tests_and_unsupported_extensions(self):
        repo_root = Path(__file__).resolve().parents[2]

        discovered = iter_citation_files(repo_root)

        self.assertTrue(discovered)
        self.assertFalse([path for path in discovered if "tests" in path.parts])
        self.assertFalse([path for path in discovered if path.suffix == ".md"])


if __name__ == "__main__":
    unittest.main()
