import json
import tempfile
import unittest
from pathlib import Path

from compendium.commands.visual_audit import _load_expected_visuals
from compendium.visual_audit.models import RuntimeReference


class VisualAuditCommandHelperTests(unittest.TestCase):
    def test_load_expected_visuals_uses_applicable_exported_slots_and_runtime_slots(
        self,
    ):
        with tempfile.TemporaryDirectory() as tmp:
            export_dir = Path(tmp)
            (export_dir / "items.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "basic_sword",
                            "name": "Basic Sword",
                            "item_type": "weapon",
                        },
                        {
                            "id": "treasure_map_1",
                            "name": "Treasure Map 1",
                            "item_type": "treasure_map",
                        },
                        {"id": "apple", "name": "Apple", "item_type": "food"},
                    ]
                )
            )
            (export_dir / "skills.json").write_text(
                json.dumps([{"id": "fireball", "name": "Fireball"}])
            )
            (export_dir / "monsters.json").write_text(json.dumps([]))
            (export_dir / "pets.json").write_text(json.dumps([]))
            (export_dir / "npcs.json").write_text(json.dumps([]))

            runtime_refs = [
                RuntimeReference(
                    domain="skill",
                    entity_id="fireball",
                    entity_name="Fireball",
                    visual_kind="cast_effect",
                    source_field="ScriptableSkill.castEffect",
                    unity_object_type="OneTimeTargetSkillEffect",
                    unity_object_name="FireCast",
                    confidence="authoritative",
                )
            ]

            expected = _load_expected_visuals(export_dir, runtime_refs)

        slots = {(slot.domain, slot.entity_id, slot.visual_kind) for slot in expected}
        self.assertIn(("item", "basic_sword", "icon"), slots)
        self.assertIn(("item", "basic_sword", "equipment_path"), slots)
        self.assertIn(("item", "treasure_map_1", "treasure_map_image"), slots)
        self.assertIn(("item", "apple", "icon"), slots)
        self.assertNotIn(("item", "apple", "treasure_map_image"), slots)
        self.assertIn(("skill", "fireball", "icon"), slots)
        self.assertIn(("skill", "fireball", "cast_effect"), slots)


if __name__ == "__main__":
    unittest.main()
