"""Registration invariants for the build pipeline.

A loader that never runs leaves its table empty rather than failing, and a
denormalizer that never runs leaves its output stale. These tests make a missing
registration fail loudly. Loaders register in `compendium.loaders.catalog`, and
denormalizers in `compendium.denormalizers.run_all`.
"""

import ast
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from pydantic import BaseModel, ValidationError

from compendium.db import create_database
from compendium.loaders import DATASETS, Dataset, LoadContext, load_dataset
from compendium.loaders.catalog import validate_catalog

SRC = Path(__file__).resolve().parents[1] / "src" / "compendium"
SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"
DENORMALIZERS = SRC / "denormalizers" / "__init__.py"

# Tables that only the denormalizers fill. Every other schema table needs a
# dataset in the catalog.
DERIVED_TABLES = frozenset(
    {
        "item_source_entries",
        "item_sources_altar",
        "item_sources_monster",
        "item_sources_quest",
        "item_sources_recipe",
        "item_sources_vendor",
        "item_usages_altar",
        "item_usages_chest",
        "item_usages_currency",
        "item_usages_portal",
        "item_usages_quest",
        "item_usages_recipe",
        "item_zones_obtainable",
    }
)


def _parse(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def _schema() -> tuple[set[str], dict[str, set[str]]]:
    """The schema's tables, and the tables each one's foreign keys reference."""
    with tempfile.TemporaryDirectory() as tmp:
        conn = create_database(Path(tmp) / "schema.db", SCHEMA_PATH)
        try:
            tables = {
                row[0]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master "
                    "WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
                )
            }
            references = {
                table: {
                    row[2]
                    for row in conn.execute(f'PRAGMA foreign_key_list("{table}")')
                }
                for table in tables
            }
        finally:
            conn.close()
    return tables, references


def _custom(
    dataset_id: str, tables: tuple[str, ...] = (), after: tuple[str, ...] = ()
) -> Dataset:
    return Dataset(dataset_id, (), tables, after=after, handler=lambda ctx: None)


class DatasetCatalogTests(unittest.TestCase):
    def test_every_schema_table_has_exactly_one_owner(self):
        tables, _ = _schema()
        owned = [table for dataset in DATASETS for table in dataset.tables]

        self.assertEqual(len(owned), len(set(owned)), "a table has two datasets")
        self.assertEqual(set(), set(owned) & DERIVED_TABLES)
        unowned = sorted(tables - set(owned) - DERIVED_TABLES)
        self.assertEqual(
            [],
            unowned,
            "these schema tables would stay empty. Declare a dataset for each in "
            "compendium.loaders.catalog, or list it in DERIVED_TABLES if a "
            f"denormalizer fills it: {unowned}",
        )
        unknown = sorted((set(owned) | DERIVED_TABLES) - tables)
        self.assertEqual([], unknown, f"not in schema.sql: {unknown}")

    def test_prerequisites_cover_every_foreign_key(self):
        _, references = _schema()
        owner = {table: dataset.id for dataset in DATASETS for table in dataset.tables}

        for dataset in DATASETS:
            needed = {
                owner[referenced]
                for table in dataset.tables
                for referenced in references[table]
                if referenced in owner
            } - {dataset.id}
            with self.subTest(dataset=dataset.id):
                self.assertEqual(set(), needed - set(dataset.after))

    def test_the_shipped_catalog_is_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            for dataset in DATASETS:
                for name in dataset.inputs:
                    (Path(tmp) / name).touch()
            validate_catalog(DATASETS, Path(tmp))

    def test_a_prerequisite_listed_after_its_dependent_fails(self):
        catalog = [_custom("monsters", after=("zones",)), _custom("zones")]
        with self.assertRaisesRegex(
            ValueError, "monsters needs zones, which is listed after it"
        ):
            validate_catalog(catalog, Path("."))

    def test_an_undeclared_prerequisite_fails(self):
        with self.assertRaisesRegex(
            ValueError, "monsters needs zones, which is not declared"
        ):
            validate_catalog([_custom("monsters", after=("zones",))], Path("."))

    def test_a_table_with_two_datasets_fails(self):
        catalog = [_custom("a", tables=("zones",)), _custom("b", tables=("zones",))]
        with self.assertRaisesRegex(ValueError, "zones is filled by both a and b"):
            validate_catalog(catalog, Path("."))

    def test_a_dataset_declared_twice_fails(self):
        with self.assertRaisesRegex(ValueError, "zones is declared twice"):
            validate_catalog([_custom("zones"), _custom("zones")], Path("."))

    def test_a_missing_input_fails_and_names_it(self):
        dataset = Dataset(
            "zones", ("zone_info.json",), ("zones",), handler=lambda ctx: None
        )
        with (
            tempfile.TemporaryDirectory() as tmp,
            self.assertRaisesRegex(FileNotFoundError, r"zone_info\.json \(zones\)"),
        ):
            validate_catalog([dataset], Path(tmp))


class _Row(BaseModel):
    id: str
    weight: int


class SimpleDatasetTests(unittest.TestCase):
    def _load(self, elements: list) -> list[tuple]:
        with tempfile.TemporaryDirectory() as tmp:
            export_dir = Path(tmp)
            (export_dir / "rows.json").write_text(
                json.dumps(elements), encoding="utf-8"
            )
            conn = sqlite3.connect(":memory:")
            try:
                conn.execute(
                    "CREATE TABLE rows (id TEXT PRIMARY KEY, weight INTEGER NOT NULL)"
                )
                dataset = Dataset("rows", ("rows.json",), ("rows",), model=_Row)
                load_dataset(LoadContext(conn, export_dir), dataset)
                return conn.execute(
                    "SELECT id, weight FROM rows ORDER BY id"
                ).fetchall()
            finally:
                conn.close()

    def test_a_descriptor_alone_loads_each_element_once(self):
        rows = self._load([{"id": "b", "weight": 2}, {"id": "a", "weight": 1}])
        self.assertEqual([("a", 1), ("b", 2)], rows)

    def test_a_dataset_with_several_inputs_needs_a_handler(self):
        with self.assertRaisesRegex(ValueError, "exactly one input and one table"):
            Dataset("rows", ("a.json", "b.json"), ("rows",), model=_Row)

    def test_an_invalid_element_fails_validation(self):
        with self.assertRaises(ValidationError):
            self._load([{"id": "a", "weight": "heavy"}])

    def test_an_empty_export_fails(self):
        with self.assertRaisesRegex(ValueError, "non-empty JSON array"):
            self._load([])


class DenormalizerRegistrationTests(unittest.TestCase):
    def test_every_imported_denormalizer_runs_in_run_all(self):
        tree = _parse(DENORMALIZERS)

        imported = {
            alias.asname or alias.name
            for node in ast.walk(tree)
            if isinstance(node, ast.ImportFrom)
            and node.module == "compendium.denormalizers"
            for alias in node.names
        }
        self.assertTrue(imported, "no denormalizer modules imported")

        defined = {
            node.name: node
            for node in ast.walk(tree)
            if isinstance(node, ast.FunctionDef)
        }
        self.assertIn("run_all", defined, "run_all is missing from denormalizers")

        # `run_all` delegates part of the order to helpers in the same module,
        # so follow every local call it makes.
        reached: set[str] = set()
        pending = ["run_all"]
        while pending:
            name = pending.pop()
            if name in reached:
                continue
            reached.add(name)
            pending.extend(
                node.func.id
                for node in ast.walk(defined[name])
                if isinstance(node, ast.Call)
                and isinstance(node.func, ast.Name)
                and node.func.id in defined
            )

        used = {
            node.func.value.id
            for name in reached
            for node in ast.walk(defined[name])
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
        }

        missing = sorted(imported - used)
        self.assertEqual(
            [],
            missing,
            f"imported into compendium.denormalizers but never run by run_all: {missing}",
        )


if __name__ == "__main__":
    unittest.main()
