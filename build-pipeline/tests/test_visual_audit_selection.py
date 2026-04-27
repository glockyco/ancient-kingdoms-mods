import unittest

from compendium.visual_audit.models import ExpectedVisual, RuntimeReference, StaticAsset
from compendium.visual_audit.selection import select_visuals


class VisualSelectionTests(unittest.TestCase):
    def test_selects_unique_static_asset_from_runtime_sprite_name(self):
        expected = [
            ExpectedVisual(
                domain="monster",
                entity_id="sabretooth",
                entity_name="Sabretooth",
                visual_kind="bestiary_image",
            )
        ]
        runtime_refs = [
            RuntimeReference(
                domain="monster",
                entity_id="sabretooth",
                entity_name="Sabretooth",
                visual_kind="bestiary_image",
                source_field="Monster.imageBossBestiary",
                unity_object_type="UnityEngine.Sprite",
                unity_object_name="image_sabretooth",
                sprite_name="image_sabretooth",
                texture_name="image_sabretooth",
                confidence="authoritative",
            )
        ]
        static_assets = [
            StaticAsset(
                asset_key="sharedassets1.assets:12345",
                asset_type="Sprite",
                name="image_sabretooth",
                container_path="sharedassets1.assets",
                path_id=12345,
                texture_name="image_sabretooth",
                width=128,
                height=128,
                extracted_path="exported-data/visual-audit/assets/images/sharedassets1_12345.png",
            )
        ]

        selections = select_visuals(expected, runtime_refs, static_assets)

        self.assertEqual(len(selections), 1)
        selection = selections[0]
        self.assertEqual(selection.status, "selected")
        self.assertEqual(selection.confidence, "runtime_static_match")
        self.assertEqual(selection.static_asset_key, "sharedassets1.assets:12345")
        self.assertIs(selection.name_match_only, False)
        self.assertEqual(selection.runtime_source_fields, ["Monster.imageBossBestiary"])

    def test_marks_runtime_reference_without_static_asset_as_runtime_only(self):
        expected = [
            ExpectedVisual(
                domain="item",
                entity_id="treasure_map_1",
                entity_name="Treasure Map 1",
                visual_kind="treasure_map_image",
            )
        ]
        runtime_refs = [
            RuntimeReference(
                domain="item",
                entity_id="treasure_map_1",
                entity_name="Treasure Map 1",
                visual_kind="treasure_map_image",
                source_field="TreasureMapItem.imageLocation",
                unity_object_type="UnityEngine.Sprite",
                unity_object_name="TreasureMap1",
                sprite_name="TreasureMap1",
                texture_name="TreasureMap1",
                confidence="authoritative",
            )
        ]

        selections = select_visuals(expected, runtime_refs, [])

        self.assertEqual(selections[0].status, "runtime_only")
        self.assertIsNone(selections[0].static_asset_key)
        self.assertEqual(selections[0].confidence, "authoritative_runtime_reference")
        self.assertIn(
            "No static asset matched runtime object names", selections[0].reason
        )

    def test_marks_duplicate_static_matches_as_ambiguous(self):
        expected = [
            ExpectedVisual(
                domain="skill",
                entity_id="fireball",
                entity_name="Fireball",
                visual_kind="icon",
            )
        ]
        runtime_refs = [
            RuntimeReference(
                domain="skill",
                entity_id="fireball",
                entity_name="Fireball",
                visual_kind="icon",
                source_field="ScriptableSkill.image",
                unity_object_type="UnityEngine.Sprite",
                unity_object_name="IconFire",
                sprite_name="IconFire",
                texture_name="IconFire",
                confidence="authoritative",
            )
        ]
        static_assets = [
            StaticAsset(
                asset_key="resources.assets:100",
                asset_type="Sprite",
                name="IconFire",
                container_path="resources.assets",
                path_id=100,
            ),
            StaticAsset(
                asset_key="sharedassets0.assets:200",
                asset_type="Sprite",
                name="IconFire",
                container_path="sharedassets0.assets",
                path_id=200,
            ),
        ]

        selections = select_visuals(expected, runtime_refs, static_assets)

        self.assertEqual(selections[0].status, "ambiguous")
        self.assertIsNone(selections[0].static_asset_key)
        self.assertEqual(
            selections[0].candidate_asset_keys,
            ["resources.assets:100", "sharedassets0.assets:200"],
        )
        self.assertIs(selections[0].name_match_only, False)

    def test_does_not_select_static_asset_by_entity_name_only(self):
        expected = [
            ExpectedVisual(
                domain="monster",
                entity_id="sabretooth",
                entity_name="Sabretooth",
                visual_kind="bestiary_image",
            )
        ]
        static_assets = [
            StaticAsset(
                asset_key="sharedassets1.assets:999",
                asset_type="Texture2D",
                name="Sabretooth",
                container_path="sharedassets1.assets",
                path_id=999,
            )
        ]

        selections = select_visuals(expected, [], static_assets)

        self.assertEqual(selections[0].status, "missing")
        self.assertIsNone(selections[0].static_asset_key)
        self.assertIs(selections[0].name_match_only, False)
        self.assertEqual(
            selections[0].reason, "No authoritative runtime reference found"
        )


if __name__ == "__main__":
    unittest.main()
