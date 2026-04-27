import unittest

from compendium.visual_audit.models import VisualSelection
from compendium.visual_audit.report import build_coverage_markdown


class VisualAuditReportTests(unittest.TestCase):
    def test_build_coverage_markdown_groups_status_counts_by_domain(self):
        selections = [
            VisualSelection(
                domain="monster",
                entity_id="sabretooth",
                entity_name="Sabretooth",
                visual_kind="bestiary_image",
                status="selected",
                confidence="runtime_static_match",
                static_asset_key="sharedassets1.assets:123",
                reason="Static asset matched authoritative runtime object names",
            ),
            VisualSelection(
                domain="monster",
                entity_id="wolf",
                entity_name="Wolf",
                visual_kind="renderer",
                status="runtime_only",
                confidence="authoritative_runtime_reference",
                reason="No static asset matched runtime object names",
            ),
            VisualSelection(
                domain="item",
                entity_id="treasure_map_1",
                entity_name="Treasure Map 1",
                visual_kind="treasure_map_image",
                status="missing",
                confidence="missing",
                reason="No authoritative runtime reference found",
            ),
        ]

        markdown = build_coverage_markdown(selections)

        self.assertIn("| item | 0 | 0 | 0 | 1 | 0 | 1 |", markdown)
        self.assertIn("| monster | 1 | 1 | 0 | 0 | 0 | 2 |", markdown)
        self.assertIn(
            "`item/treasure_map_1/treasure_map_image`: missing — No authoritative runtime reference found",
            markdown,
        )
        self.assertNotIn("`monster/sabretooth/bestiary_image`", markdown)


if __name__ == "__main__":
    unittest.main()
