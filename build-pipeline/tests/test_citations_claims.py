import unittest
from pathlib import Path

from compendium.citations import claim_supported, claim_tokens, parse_block, parse_file


class ClaimTokenTests(unittest.TestCase):
    def test_identifiers_need_a_code_shape(self):
        identifiers, _ = claim_tokens("the caster loses one durability on a hit")
        self.assertEqual(identifiers, frozenset())

    def test_camel_case_and_underscores_are_identifiers(self):
        identifiers, _ = claim_tokens("GenerateRageOnHit feeds is_boss and speedMount")
        self.assertEqual(identifiers, {"GenerateRageOnHit", "is_boss", "speedMount"})

    def test_cited_file_names_are_not_claims(self):
        identifiers, _ = claim_tokens("Combat.cs and NetworkManagerMMO.cs agree")
        self.assertEqual(identifiers, frozenset())

    def test_numbers_need_three_digits(self):
        _, numbers = claim_tokens("a 10% bonus at 721,000 reputation and 20 charges")
        self.assertEqual(numbers, {"721000"})


class ClaimSupportTests(unittest.TestCase):
    def test_plain_english_claims_are_left_alone(self):
        self.assertTrue(claim_supported("the pet follows you", ["int num = 3;"]))

    def test_named_identifier_must_appear(self):
        region = ["\t\t\tint num22 = GenerateRageOnHit(num);"]
        self.assertTrue(claim_supported("GenerateRageOnHit: rage on hit", region))
        self.assertFalse(claim_supported("GenerateRageOnHit: rage on hit", ["return;"]))

    def test_generated_rpc_wrappers_count_as_the_named_member(self):
        # The decompiler renames a command body to UserCode_<name>, and an
        # underscore is a word character, so a naive boundary would miss it.
        region = ["\tprotected void UserCode_CmdResurrect__Boolean(bool accept)"]
        self.assertTrue(claim_supported("CmdResurrect halves lost experience", region))

    def test_thousands_separators_match_bare_literals(self):
        region = ["\t\t\tsliderFaction.value = valueFaction / 1279000f;"]
        self.assertTrue(claim_supported("Revered spans 1,279,000 points", region))

    def test_one_matching_token_is_enough(self):
        region = ["\t\tNetworkscrollMasteryLevel = 1f;"]
        self.assertTrue(
            claim_supported("scrollMasteryLevel caps at 100 via someOtherThing", region)
        )

    def test_unrelated_region_fails(self):
        region = ['\t\tcase "King Thrym":', '\t\t\tSteamManager.SetAchievement("X");']
        self.assertFalse(claim_supported("CmdResurrect: 0.75f * lossExp", region))


class ClaimParsingTests(unittest.TestCase):
    def test_prose_after_the_dash_is_the_claim(self):
        references = parse_file(
            Path("website/src/example.ts"),
            "// Source: server-scripts/Combat.cs:120-130 — stun uses one roll.\n",
        )
        self.assertEqual(len(references), 1)
        self.assertEqual(references[0].claim, "stun uses one roll.")

    def test_html_comment_terminator_is_not_part_of_the_claim(self):
        references = parse_file(
            Path("website/src/example.svelte"),
            "<!-- Source: server-scripts/Monster.cs:10-20 — loot rolls merges. -->\n",
        )
        self.assertEqual(references[0].claim, "loot rolls merges.")

    def test_a_citation_without_prose_claims_nothing(self):
        references = parse_file(
            Path("website/src/example.ts"),
            "// Source: server-scripts/Combat.cs:120-130\n",
        )
        self.assertEqual(references[0].claim, "")

    def test_parse_block_still_returns_locators(self):
        self.assertEqual(
            parse_block("Source: server-scripts/Combat.cs:120-130 — prose"),
            [("Combat.cs", "120-130")],
        )


if __name__ == "__main__":
    unittest.main()
