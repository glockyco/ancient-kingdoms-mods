"""Registration invariants for the build pipeline.

Adding a loader or a denormalizer takes two steps: write it, then wire it into
the stage that runs it. Copying an existing one shows you the first step and
hides the second, and a loader that is never called produces an empty table
rather than an error. These tests assert the wiring so the failure is loud and
immediate, which prose in a contributor guide cannot achieve.
"""

import ast
import unittest
from pathlib import Path

from compendium import loaders

SRC = Path(__file__).resolve().parents[1] / "src" / "compendium"
BUILD_COMMAND = SRC / "commands" / "build.py"
DENORMALIZERS = SRC / "denormalizers" / "__init__.py"


def _parse(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


class LoaderRegistrationTests(unittest.TestCase):
    def test_every_exported_loader_is_called_by_the_build_command(self):
        exported = {name for name in loaders.__all__ if name.startswith("load_")}
        self.assertTrue(exported, "compendium.loaders exports no load_* functions")

        called = {
            node.func.id
            for node in ast.walk(_parse(BUILD_COMMAND))
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
        }

        missing = sorted(exported - called)
        self.assertEqual(
            [],
            missing,
            "exported by compendium.loaders but never called in commands/build.py, "
            f"so their tables stay empty: {missing}",
        )


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

        run_all = next(
            (
                node
                for node in ast.walk(tree)
                if isinstance(node, ast.FunctionDef) and node.name == "run_all"
            ),
            None,
        )
        self.assertIsNotNone(
            run_all, "run_all is missing from denormalizers/__init__.py"
        )

        used = {
            node.func.value.id
            for node in ast.walk(run_all)
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
