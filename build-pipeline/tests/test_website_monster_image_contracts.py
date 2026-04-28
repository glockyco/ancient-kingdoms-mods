import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
POPUP_QUERY = REPO_ROOT / "website" / "src" / "lib" / "queries" / "popup.ts"
ENTITY_POPUP = (
    REPO_ROOT / "website" / "src" / "lib" / "components" / "map" / "EntityPopup.svelte"
)


class WebsiteMonsterImageContractTests(unittest.TestCase):
    def test_map_popup_has_composite_monster_image_sizing_contract(self):
        popup_query = POPUP_QUERY.read_text(encoding="utf-8")
        entity_popup = ENTITY_POPUP.read_text(encoding="utf-8")

        self.assertIn("sourceType: string;", popup_query)
        self.assertIn("va.source_type as visual_source_type", popup_query)
        self.assertIn("sourceType: stats.visual_source_type", popup_query)
        self.assertIn(
            'monsterDetails?.visualAsset?.sourceType === "UnityEngine.SpriteRenderer[]"',
            entity_popup,
        )
        self.assertIn("h-auto w-auto", entity_popup)
        self.assertIn("? 'max-h-24'", entity_popup)
        self.assertIn(": 'max-h-28'", entity_popup)


if __name__ == "__main__":
    unittest.main()
