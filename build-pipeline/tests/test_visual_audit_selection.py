import unittest

from compendium.visual_audit.models import ExpectedVisual, RuntimeReference, StaticAsset
from compendium.visual_audit.selection import select_visuals


class VisualSelectionTests(unittest.TestCase):
    def test_selects_runtime_image_without_static_assets(self):
        expected = [
            ExpectedVisual(
                domain="monster",
                entity_id="sabretooth",
                entity_name="Sabretooth",
                visual_kind="renderer",
            )
        ]
        runtime_refs = [
            RuntimeReference(
                domain="monster",
                entity_id="sabretooth",
                entity_name="Sabretooth",
                visual_kind="renderer",
                source_field="Monster.gameObject.SpriteRenderer",
                unity_object_type="UnityEngine.Sprite",
                unity_object_name="Sabretooth",
                sprite_name="sabretooth_1",
                texture_name="sabretooth",
                runtime_image_path="exported-data/visual-audit/runtime/images/monster/sabretooth/renderer.png",
                confidence="authoritative",
            )
        ]

        selections = select_visuals(expected, runtime_refs, [])

        self.assertEqual(len(selections), 1)
        selection = selections[0]
        self.assertEqual(selection.status, "selected")
        self.assertEqual(selection.confidence, "runtime_image")
        self.assertEqual(
            selection.runtime_image_path,
            "exported-data/visual-audit/runtime/images/monster/sabretooth/renderer.png",
        )
        self.assertEqual(selection.candidate_runtime_image_paths, [])
        self.assertEqual(
            selection.runtime_source_fields, ["Monster.gameObject.SpriteRenderer"]
        )

    def test_static_matches_do_not_select_when_runtime_image_is_absent(self):
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
        static_assets = [
            StaticAsset(
                asset_key="sharedassets0.assets:14382",
                asset_type="Sprite",
                name="TreasureMap1",
                container_path="sharedassets0.assets",
                path_id=14382,
            )
        ]

        selections = select_visuals(expected, runtime_refs, static_assets)

        self.assertEqual(selections[0].status, "runtime_only")
        self.assertIsNone(selections[0].runtime_image_path)
        self.assertEqual(selections[0].candidate_runtime_image_paths, [])
        self.assertEqual(selections[0].confidence, "authoritative_runtime_reference")
        self.assertIn("no runtime image was extracted", selections[0].reason)

    def test_multiple_runtime_images_are_ambiguous_without_static_disambiguation(self):
        expected = [
            ExpectedVisual(
                domain="monster",
                entity_id="fire_wyvern",
                entity_name="Fire Wyvern",
                visual_kind="renderer",
            )
        ]
        runtime_refs = [
            RuntimeReference(
                domain="monster",
                entity_id="fire_wyvern",
                entity_name="Fire Wyvern",
                visual_kind="renderer",
                source_field="Monster.gameObject.SpriteRenderer",
                unity_object_type="UnityEngine.SpriteRenderer",
                unity_object_name="Fire Wyvern",
                runtime_image_path="runtime/images/fire_wyvern/body.png",
                confidence="authoritative",
            ),
            RuntimeReference(
                domain="monster",
                entity_id="fire_wyvern",
                entity_name="Fire Wyvern",
                visual_kind="renderer",
                source_field="Monster.gameObject.SpriteRenderer",
                unity_object_type="UnityEngine.SpriteRenderer",
                unity_object_name="Fire Wyvern",
                runtime_image_path="runtime/images/fire_wyvern/alternate_pose.png",
                confidence="authoritative",
            ),
        ]

        selections = select_visuals(expected, runtime_refs, [])

        self.assertEqual(selections[0].status, "ambiguous")
        self.assertIsNone(selections[0].runtime_image_path)
        self.assertEqual(
            selections[0].candidate_runtime_image_paths,
            [
                "runtime/images/fire_wyvern/alternate_pose.png",
                "runtime/images/fire_wyvern/body.png",
            ],
        )

    def test_missing_when_no_runtime_reference_exists(self):
        expected = [
            ExpectedVisual(
                domain="monster",
                entity_id="sabretooth",
                entity_name="Sabretooth",
                visual_kind="renderer",
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
        self.assertIsNone(selections[0].runtime_image_path)
        self.assertEqual(selections[0].candidate_runtime_image_paths, [])
        self.assertEqual(
            selections[0].reason, "No authoritative runtime reference found"
        )


if __name__ == "__main__":
    unittest.main()
