import json
import tempfile
import unittest
from pathlib import Path

from compendium.planner_inputs import CLASS_COMBAT_FIELDS, verify_planner_inputs


class PlannerInputTests(unittest.TestCase):
    def _valid_exports(self) -> dict[str, object]:
        class_combat: dict[str, object] = {field: 0 for field in CLASS_COMBAT_FIELDS}
        class_combat.update({"id": "warrior", "resource_type": "energy"})
        skill = {
            "id": "strike",
            "skill_type": "target_damage",
            "player_classes": ["warrior"],
            "tier": 0,
            "max_level": 1,
            "level_required": 1,
            "required_skill_points": 1,
            "required_spent_points": 0,
            "prerequisite_level": 0,
            "prerequisite2_level": 0,
            "required_weapon_category": "Weapon",
            "required_weapon_category2": "",
            "is_veteran": False,
            "learn_default": True,
            "mana_cost": {"base_value": 0, "bonus_per_level": 0},
            "energy_cost": {"base_value": 0, "bonus_per_level": 0},
            "cooldown": {"base_value": 0, "bonus_per_level": 0},
            "cast_time": {"base_value": 0, "bonus_per_level": 0},
            "cast_range": {"base_value": 1, "bonus_per_level": 0},
        }
        slots = [
            {
                "owner_type": owner_type,
                "owner_id": "warrior",
                "slot_index": slot_index,
                "accepted_category": "Weapon" if slot_index == 12 else "Head",
            }
            for owner_type in ("player", "mercenary")
            for slot_index in range(16)
        ]
        return {
            "classes.json": [{"id": "warrior", "compatible_races": ["human"]}],
            "classes_combat.json": [class_combat],
            "equipment_slots.json": slots,
            "progression.json": {
                "max_level": 1,
                "max_veteran_points": 200,
                "attribute_points_per_veteran": 1,
                "veteran_skill_points_per_veteran": 1,
                "races": [{"id": "human"}],
                "class_levels": [{"class_id": "warrior", "level": 1}],
                "level_budgets": [{"level": 1}],
            },
            "skills.json": [skill],
            "pets.json": [
                {
                    "id": "warrior_mercenary",
                    "is_mercenary": True,
                    "type_monster": "Warrior",
                    "skill_ids": ["strike"],
                    "innate_skill_ids": [],
                    "damage_base": 1,
                    "damage_per_level": 1,
                    "magic_damage_base": 0,
                    "magic_damage_per_level": 0,
                }
            ],
            "items.json": [
                {
                    "id": "meal",
                    "item_type": "food",
                    "max_stack": 10,
                    "food_buff_id": "meal_buff",
                    "food_buff_level": 1,
                    "food_type": "Meal",
                },
                {
                    "id": "potion",
                    "item_type": "potion",
                    "max_stack": 10,
                    "potion_buff_level": 1,
                    "usage_health": 10,
                    "usage_mana": 0,
                    "usage_pet_health": 0,
                },
                {"id": "arrow", "item_type": "ammo", "max_stack": 999},
                {
                    "id": "bow",
                    "item_type": "weapon",
                    "max_stack": 1,
                    "weapon_required_ammo_id": "arrow",
                },
            ],
        }

    def _write(self, root: Path, exports: dict[str, object]) -> Path:
        export_dir = root / "exported-data"
        export_dir.mkdir()
        for filename, value in exports.items():
            (export_dir / filename).write_text(json.dumps(value), encoding="utf-8")
        return export_dir

    def test_complete_planner_inputs_are_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            export_dir = self._write(Path(tmp), self._valid_exports())
            verify_planner_inputs(export_dir)

    def test_missing_required_domains_and_fields_are_refused(self):
        mutations = {
            "progression": lambda data: data.pop("progression.json"),
            "slot": lambda data: data["equipment_slots.json"].pop(),
            "skill tree": lambda data: data["skills.json"][0].pop(
                "required_spent_points"
            ),
            "mercenary": lambda data: data.__setitem__("pets.json", []),
            "consumable": lambda data: data.__setitem__(
                "items.json",
                [row for row in data["items.json"] if row["item_type"] != "food"],
            ),
            "ammunition": lambda data: data.__setitem__(
                "items.json",
                [row for row in data["items.json"] if row["item_type"] != "ammo"],
            ),
            "effect classification": lambda data: data["skills.json"][0].__setitem__(
                "skill_type", ""
            ),
        }

        for domain, mutate in mutations.items():
            with self.subTest(domain=domain), tempfile.TemporaryDirectory() as tmp:
                exports = self._valid_exports()
                mutate(exports)
                export_dir = self._write(Path(tmp), exports)
                with self.assertRaises(ValueError, msg=domain):
                    verify_planner_inputs(export_dir)


if __name__ == "__main__":
    unittest.main()
