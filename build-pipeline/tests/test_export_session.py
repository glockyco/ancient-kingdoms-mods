"""The build refuses an export whose session state it cannot vouch for."""

import json
import tempfile
import unittest
from pathlib import Path

from compendium.session import (
    MANIFEST_NAME,
    PUBLISHED_LOCALE,
    WrongExportSession,
    verify_export_locale,
)


class ExportLocaleTests(unittest.TestCase):
    def _export(self, manifest: dict | None) -> Path:
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        export_dir = Path(directory.name)
        if manifest is not None:
            (export_dir / MANIFEST_NAME).write_text(
                json.dumps(manifest), encoding="utf-8"
            )
        return export_dir

    def test_the_published_locale_passes(self):
        export_dir = self._export({"export_locale": PUBLISHED_LOCALE})

        verify_export_locale(export_dir)

    def test_another_locale_fails_and_names_both(self):
        export_dir = self._export({"export_locale": "ja"})

        with self.assertRaises(WrongExportSession) as refused:
            verify_export_locale(export_dir)

        self.assertIn("'ja'", str(refused.exception))
        self.assertIn(f"'{PUBLISHED_LOCALE}'", str(refused.exception))

    def test_a_missing_declaration_fails(self):
        export_dir = self._export({"bestiary_monsters": []})

        with self.assertRaises(WrongExportSession):
            verify_export_locale(export_dir)

    def test_an_empty_declaration_fails(self):
        export_dir = self._export({"export_locale": ""})

        with self.assertRaises(WrongExportSession):
            verify_export_locale(export_dir)

    def test_a_missing_manifest_fails(self):
        export_dir = self._export(None)

        with self.assertRaises(WrongExportSession):
            verify_export_locale(export_dir)


if __name__ == "__main__":
    unittest.main()
