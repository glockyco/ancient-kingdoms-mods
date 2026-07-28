from pathlib import Path
import tempfile
import unittest

from compendium.citations.parser import parse_block, parse_file


class ParserTests(unittest.TestCase):
    def test_canonical_file_and_range_forms(self):
        cases = [
            (
                "Source: server-scripts/Skills.cs:711-713 (cast reduction), Skills.cs:772 (flat cooldown), Combat.cs:332 (cap)",
                [("Skills.cs", "711-713"), ("Skills.cs", "772"), ("Combat.cs", "332")],
            ),
            (
                "Source: server-scripts/Combat.cs:1106-1119, 1328-1338; Player.cs:10564-10568",
                [
                    ("Combat.cs", "1106-1119"),
                    ("Combat.cs", "1328-1338"),
                    ("Player.cs", "10564-10568"),
                ],
            ),
            (
                "Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:13-15 — discount",
                [("uMMORPG.Scripts.PlayerAttributes/Charisma.cs", "13-15")],
            ),
            (
                "Source: server-scripts/Player.cs:HasDetectTraps and Trap.cs:143-209,",
                [("Player.cs", "HasDetectTraps"), ("Trap.cs", "143-209")],
            ),
            (
                "Source: server-scripts/Utils.cs:178 (priceResetVeteranSkills = 10000), Npc.cs:1769",
                [("Utils.cs", "178"), ("Npc.cs", "1769")],
            ),
        ]
        for source, expected in cases:
            with self.subTest(source=source):
                self.assertEqual(parse_block(source), expected)

    def test_parentheses_hide_numeric_prose(self):
        result = parse_block(
            "Source: server-scripts/Utils.cs:178 (priceResetVeteranSkills = 10000), Npc.cs:1769"
        )
        self.assertNotIn(("Utils.cs", "10000"), result)

    def test_file_only_and_symbol_references(self):
        self.assertEqual(
            parse_block("Source: server-scripts/AugmentItem.cs isDefensiveAugment"),
            [("AugmentItem.cs", None)],
        )
        self.assertEqual(
            parse_block("Source: server-scripts/Player.cs:HasDetectTraps"),
            [("Player.cs", "HasDetectTraps")],
        )

    def test_comma_locator_expands(self):
        self.assertEqual(
            parse_block("Source: server-scripts/BackpackItem.cs:7,9"),
            [("BackpackItem.cs", "7"), ("BackpackItem.cs", "9")],
        )

    def test_multiline_continuations_and_prose_stop(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "example.ts"
            text = """// Source: server-scripts/Monster.cs:494-520 (formula),
// 2677-2689 and 2713-2725 (party/solo reward application).
// This prose contains 2000 but is not a citation.
"""
            references = parse_file(path, text)
        self.assertEqual(
            [(reference.file, reference.locator) for reference in references],
            [
                ("Monster.cs", "494-520"),
                ("Monster.cs", "2677-2689"),
                ("Monster.cs", "2713-2725"),
            ],
        )

    def test_path_metadata_and_locator_column(self):
        reference = parse_file(
            Path("website/src/example.ts"),
            "// Source: server-scripts/Player.cs:298 — refractory\n",
        )[0]
        self.assertEqual(reference.source_path, "website/src/example.ts")
        self.assertEqual(reference.line, 1)
        self.assertGreaterEqual(reference.col, 0)


if __name__ == "__main__":
    unittest.main()
