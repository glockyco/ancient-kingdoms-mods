import unittest

from typer.testing import CliRunner

from compendium.cli import app


class CliTests(unittest.TestCase):
    def test_cli_help_excludes_removed_visual_audit_command(self):
        runner = CliRunner()

        result = runner.invoke(app, ["--help"])

        self.assertEqual(result.exit_code, 0)
        self.assertNotIn("visual-audit", result.output)
        self.assertNotIn("UnityPy", result.output)
        self.assertIn("build", result.output)

    def test_visual_audit_command_is_not_registered(self):
        runner = CliRunner()

        result = runner.invoke(app, ["visual-audit", "--help"])

        self.assertNotEqual(result.exit_code, 0)
        self.assertIn("No such command", result.output)
