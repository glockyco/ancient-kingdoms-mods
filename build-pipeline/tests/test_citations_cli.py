import unittest
from pathlib import Path

import typer.main

from compendium.citations.parser import iter_citation_files
from compendium.cli import app


class CitationsCliTests(unittest.TestCase):
    """Assert the citations command tree, not its rendered output.

    Typer renders help and usage errors through Rich: colorised, wrapped to the
    terminal width and passed through gettext. None of that is a contract, so
    substring assertions against it break for reasons unrelated to the CLI -
    colour turned on by GITHUB_ACTIONS interleaving escapes inside an option
    name, a narrow TERMINAL_WIDTH splitting one across lines, or a translated
    message. Asserting on rendered text also forces a real invocation, which
    runs the root callback and loads the gitignored config.toml, making the
    tests depend on local-only state.

    The declared command tree is the actual contract and is free of all of that.
    """

    def citations(self):
        return typer.main.get_command(app).commands["citations"]

    def test_citations_is_registered_on_the_root_command(self):
        self.assertIn("citations", typer.main.get_command(app).commands)

    def test_every_action_is_registered(self):
        self.assertLessEqual(
            {"check", "sync", "fix", "suggest"},
            set(self.citations().commands),
        )

    def test_sync_requires_game_version(self):
        params = self.citations().commands["sync"].params
        option = next(param for param in params if "--game-version" in param.opts)

        self.assertTrue(option.required)

    def test_gate_actions_are_runnable_without_arguments(self):
        # lefthook and `pnpm check:citations` invoke these bare, so a required
        # option added here would break the pre-commit gate rather than a test.
        for name in ("check", "fix", "suggest"):
            with self.subTest(action=name):
                required = [
                    param
                    for param in self.citations().commands[name].params
                    if param.required
                ]
                self.assertEqual(required, [])


class RedactionsCliTests(unittest.TestCase):
    """The redaction ledger stamps a game version, so a sync must be told it.

    Inheriting the recorded value stamped one export with the version of an
    older one, and no command reported the difference.
    """

    def redactions(self):
        return typer.main.get_command(app).commands["redactions"]

    def test_sync_requires_game_version(self):
        params = self.redactions().commands["sync"].params
        option = next(param for param in params if "--game-version" in param.opts)

        self.assertTrue(option.required)

    def test_gate_actions_are_runnable_without_arguments(self):
        # lefthook invokes check bare, so a required option would break the gate.
        for name in ("check", "verify"):
            with self.subTest(action=name):
                required = [
                    param
                    for param in self.redactions().commands[name].params
                    if param.required
                ]
                self.assertEqual(required, [])


class CitationDiscoveryTests(unittest.TestCase):
    def test_discovery_skips_tests_and_unsupported_extensions(self):
        repo_root = Path(__file__).resolve().parents[2]

        discovered = iter_citation_files(repo_root)

        self.assertTrue(discovered)
        self.assertFalse([path for path in discovered if "tests" in path.parts])
        self.assertFalse([path for path in discovered if path.suffix == ".md"])


if __name__ == "__main__":
    unittest.main()
