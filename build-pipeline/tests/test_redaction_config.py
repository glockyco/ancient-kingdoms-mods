import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.redactions import crafting, verify
from compendium.redactions.config import RedactionConfig, load_redactions

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"


class ConfigurationTests(unittest.TestCase):
    def test_an_absent_configuration_stops_the_build(self):
        """An empty configuration publishes everything redaction removes."""
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "redactions.toml"

            with self.assertRaises(FileNotFoundError) as raised:
                load_redactions(missing)

            self.assertIn("redactions.toml", str(raised.exception))

    def test_a_present_configuration_loads(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "redactions.toml"
            path.write_text('[entities.exclude]\nids = ["a_thing"]\n')

            self.assertEqual(load_redactions(path).exclude_entity_ids, {"a_thing"})


class HiddenCraftingTests(unittest.TestCase):
    """Hidden crafting removes the recipes and keeps the item.

    A recipe carries the identifier of the item it produces, and nothing in the
    schema references a recipe table. So the removal can dangle nothing, and the
    verification must not scan for these identifiers: every hit would name the
    item, which is published on purpose.
    """

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)

        self.conn.executemany(
            "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
            [("secret_blade", "Secret Blade"), ("plain_blade", "Plain Blade")],
        )
        self.conn.executemany(
            "INSERT INTO crafting_recipes (id, result_item_id, result_amount) "
            "VALUES (?, ?, 1)",
            [("secret_blade", "secret_blade"), ("plain_blade", "plain_blade")],
        )
        self.conn.commit()
        self.removed = crafting.run(
            self.conn, RedactionConfig(hide_crafting_item_ids={"secret_blade"})
        )

    def test_the_recipe_is_removed(self):
        self.assertEqual(
            self.conn.execute(
                "SELECT COUNT(*) FROM crafting_recipes WHERE result_item_id = ?",
                ("secret_blade",),
            ).fetchone()[0],
            0,
        )

    def test_the_item_stays_published(self):
        self.assertEqual(
            self.conn.execute(
                "SELECT COUNT(*) FROM items WHERE id = 'secret_blade'"
            ).fetchone()[0],
            1,
        )

    def test_another_item_keeps_its_recipe(self):
        self.assertEqual(
            self.conn.execute(
                "SELECT COUNT(*) FROM crafting_recipes WHERE result_item_id = ?",
                ("plain_blade",),
            ).fetchone()[0],
            1,
        )

    def test_the_removal_is_counted_for_the_ledger(self):
        self.assertEqual(self.removed, {"secret_blade": 1})

    def test_scanning_the_identifier_would_report_the_surviving_item(self):
        """Why the verification subject holds no identifier for this mechanism.

        The recipe and the item share one identifier, so a scan for the removed
        recipe reports the published item. That is a false positive, and it is
        the reason hidden crafting contributes nothing to the subject.
        """
        findings = verify.scan(self.conn, {"secret_blade"})

        self.assertIn("items", {finding.table for finding in findings})


if __name__ == "__main__":
    unittest.main()
