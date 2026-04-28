import unittest

from compendium.visual_audit.models import VisualSelection
from compendium.visual_audit.report import build_coverage_markdown


class VisualAuditReportTests(unittest.TestCase):
    def test_build_coverage_markdown_groups_runtime_status_counts_by_domain(self):
        selections = [
            VisualSelection(
                domain="monster",
                entity_id="sabretooth",
                entity_name="Sabretooth",
                visual_kind="renderer",
                status="selected",
                confidence="runtime_image",
                runtime_image_path="runtime/images/sabretooth.png",
                reason="Runtime image extracted from authoritative runtime reference",
            ),
            VisualSelection(
                domain="monster",
                entity_id="wolf",
                entity_name="Wolf",
                visual_kind="renderer",
                status="runtime_only",
                confidence="authoritative_runtime_reference",
                reason="Runtime reference found, but no runtime image was extracted",
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

        self.assertIn(
            "| Domain | Selected | Runtime only | Ambiguous | Missing | Total |",
            markdown,
        )
        self.assertIn("| item | 0 | 0 | 0 | 1 | 1 |", markdown)
        self.assertIn("| monster | 1 | 1 | 0 | 0 | 2 |", markdown)
        self.assertIn(
            "`item/treasure_map_1/treasure_map_image`: missing — No authoritative runtime reference found",
            markdown,
        )
        self.assertNotIn("Static only", markdown)
        self.assertNotIn("`monster/sabretooth/renderer`", markdown)


if __name__ == "__main__":
    unittest.main()
