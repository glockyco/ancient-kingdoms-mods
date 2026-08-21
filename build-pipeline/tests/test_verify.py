import tempfile
import unittest
from pathlib import Path

from compendium.db import create_database
from compendium.redactions import verify
from compendium.redactions.references import resolve

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema.sql"

REMOVED_ZONE = "old_valorath"
REMOVED_ZONE_NUMBER = 25
REMOVED_ITEM = "drassari_lance"


class VerifyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.conn = create_database(Path(self.tmp.name) / "test.db", SCHEMA_PATH)
        self.addCleanup(self.conn.close)
        self.references = resolve(self.conn)

    def _subject(self, allowances=None):
        return verify.Subject(
            identifiers={REMOVED_ZONE, REMOVED_ITEM},
            zone_numbers={REMOVED_ZONE_NUMBER},
            allowances=allowances or [],
        )

    def _check(self, allowances=None):
        verify.check(self.conn, self._subject(allowances), self.references)

    def _add_item(self, item_id, name, **columns):
        columns.setdefault("travel_zone_id", None)
        names = ", ".join(["id", "name", *columns])
        marks = ", ".join(["?"] * (2 + len(columns)))
        self.conn.execute(
            f"INSERT INTO items ({names}) VALUES ({marks})",
            (item_id, name, *columns.values()),
        )
        self.conn.commit()

    def test_a_clean_database_passes(self):
        self._add_item("sword", "Sword")

        self._check()

    def test_a_surviving_reference_fails_the_build(self):
        self._add_item("bundle", "Bundle", tooltip_html=f"contains {REMOVED_ITEM}")

        with self.assertRaises(verify.SurvivingReference) as raised:
            self._check()

        message = str(raised.exception)
        self.assertIn("items", message)
        self.assertIn("tooltip_html", message)
        self.assertIn("bundle", message)
        self.assertIn(REMOVED_ITEM, message)

    def test_a_reference_inside_json_is_found(self):
        self._add_item(
            "chest", "Chest", chest_rewards=f'[{{"item_id": "{REMOVED_ITEM}"}}]'
        )

        with self.assertRaises(verify.SurvivingReference):
            self._check()

    def test_a_longer_identifier_containing_the_removed_one_passes(self):
        # `key_to_old_valorath` survives on purpose and contains `old_valorath`.
        self._add_item("key_to_old_valorath", "Key to Old Valorath")

        self._check()

    def test_prose_that_matches_an_underscore_wildcard_passes(self):
        # `LIKE '%drassari_lance%'` matches this text, because `_` is a
        # single-character wildcard. The scan must not.
        self._add_item("note", "Note", tooltip_html="a drassari lance, blunted")

        self._check()

    def test_a_display_name_that_names_the_zone_passes(self):
        self._add_item("tome", "Tome", tooltip_html="Tales of Old Valorath")

        self._check()

    def test_a_zone_reference_written_as_a_number_is_found(self):
        # `quests.zone_id_final_npc` uses -1 for "no zone", so it cannot carry a
        # foreign key. No constraint catches this value. The scan must.
        self.conn.execute(
            "INSERT INTO quests (id, name, quest_type, zone_id_final_npc) "
            "VALUES ('errand', 'Errand', 'normal', ?)",
            (REMOVED_ZONE_NUMBER,),
        )
        self.conn.commit()

        with self.assertRaises(verify.SurvivingReference) as raised:
            self._check()

        self.assertIn("zone_id_final_npc", str(raised.exception))

    def test_a_published_file_for_a_removed_entity_is_found(self):
        root = Path(self.tmp.name) / "images"
        (root / "items" / REMOVED_ITEM).mkdir(parents=True)
        (root / "items" / REMOVED_ITEM / "icon.webp").write_bytes(b"")

        found = verify.path_findings(root, {REMOVED_ITEM})

        self.assertEqual(len(found), 1)
        self.assertIn(REMOVED_ITEM, found[0].row)

    def test_a_published_file_for_a_surviving_entity_passes(self):
        root = Path(self.tmp.name) / "images"
        (root / "items" / "key_to_old_valorath").mkdir(parents=True)
        (root / "items" / "key_to_old_valorath" / "icon.webp").write_bytes(b"")

        self.assertEqual(verify.path_findings(root, {REMOVED_ZONE}), [])

    def test_an_allowance_covers_the_match_it_names(self):
        self._add_item("bundle", "Bundle", tooltip_html=f"contains {REMOVED_ITEM}")
        allowed = verify.Allowance(
            table="items",
            column="tooltip_html",
            identifier=REMOVED_ITEM,
            reason="a test fixture",
        )

        self._check([allowed])

    def test_an_allowance_does_not_cover_another_column(self):
        self._add_item("bundle", "Bundle", tooltip_html=f"contains {REMOVED_ITEM}")
        allowed = verify.Allowance(
            table="items",
            column="description",
            identifier=REMOVED_ITEM,
            reason="a different column",
        )

        with self.assertRaises(verify.SurvivingReference):
            self._check([allowed])


if __name__ == "__main__":
    unittest.main()
