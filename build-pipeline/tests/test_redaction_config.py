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
    """Hidden crafting removes complete variants in every family, not items."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)

        self.conn.executemany(
            "INSERT INTO items (id, name, travel_zone_id) VALUES (?, ?, NULL)",
            [("secret_blade", "Secret Blade"), ("plain_blade", "Plain Blade")],
        )
        for family in crafting.RECIPE_TABLES:
            self.conn.executemany(
                f"INSERT INTO {family} (id, result_item_id) VALUES (?, ?)",
                [("secret_blade", "secret_blade"), ("plain_blade", "plain_blade")],
            )
            rule = family.removesuffix("_recipes")
            for item in ("secret_blade", "plain_blade"):
                method = f"{family}_{item}"
                self.conn.execute(
                    "INSERT INTO acquisition_methods(id,kind,rule_id) VALUES (?,'recipe',?)",
                    (method, rule),
                )
                route_column = f"{rule}_recipe_id"
                self.conn.execute(
                    f"INSERT INTO acquisition_recipe_details(id,{route_column},declared_result_item_id,result_amount,tier,display_kind) VALUES (?,?,?,1,0,?)",
                    (method, item, item, rule),
                )
                self.conn.execute(
                    "INSERT INTO acquisition_providers_items(id,method_id,item_id) VALUES (?,?,'plain_blade')",
                    (f"{method}_provider", method),
                )
                self.conn.execute(
                    "INSERT INTO acquisition_cost_groups(id,method_id,phase,quantity_rule,consumption_rule) VALUES (?,?,'attempt','fixed','on_success')",
                    (f"{method}_cost", method),
                )
                self.conn.execute(
                    "INSERT INTO acquisition_inputs(id,cost_group_id,ordinal,resource_kind,item_id,amount,role) VALUES (?,?,0,'item','plain_blade',2,'material')",
                    (f"{method}_input", f"{method}_cost"),
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
        self.assertEqual(self.removed, {"secret_blade": 3})

    def test_scanning_the_identifier_would_report_the_surviving_item(self):
        """Why the verification subject holds no identifier for this mechanism.

        The recipe and the item share one identifier, so a scan for the removed
        recipe reports the published item. That is a false positive, and it is
        the reason hidden crafting contributes nothing to the subject.
        """
        findings = verify.scan(self.conn, {"secret_blade"})

        self.assertIn("items", {finding.table for finding in findings})

    def test_all_hidden_variants_memberships_and_costs_disappear(self):
        self.assertEqual(
            self.conn.execute(
                "SELECT count(*) FROM acquisition_recipe_details WHERE declared_result_item_id='secret_blade'"
            ).fetchone()[0],
            0,
        )
        self.assertEqual(
            self.conn.execute("SELECT count(*) FROM acquisition_methods").fetchone()[0],
            3,
        )
        self.assertEqual(
            self.conn.execute(
                "SELECT count(*) FROM acquisition_providers_items"
            ).fetchone()[0],
            3,
        )
        self.assertEqual(
            self.conn.execute(
                "SELECT count(*) FROM acquisition_cost_groups"
            ).fetchone()[0],
            3,
        )
        self.assertEqual(
            self.conn.execute("SELECT count(*) FROM acquisition_inputs").fetchone()[0],
            3,
        )
        self.assertEqual(list(self.conn.execute("PRAGMA foreign_key_check")), [])


if __name__ == "__main__":
    unittest.main()
